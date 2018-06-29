import * as mysqlx from '@mysql/xdevapi';
import { DatabaseConfiguration } from '..';
import { VaultCollection } from '../collection';
import { VaultModel, IVaultModel } from '../model';
import { Database } from '../database';
import { UUID, uuid } from './uuid';
import { resolve } from 'dns';
import { isNumber, isBoolean } from 'util';
interface Result {
	getAffectedItemsCount(): number
	getAffectedRowsCount(): number
	getAutoIncrementValue(): number
	getGeneratedIds(): uuid[]
	getWarnings(): any[]
	getWarningsCount(): number
}
function inspectResult(res) {
	for (const key of Object.keys(res)) {
		console.log(key, res[key]());
	}
	return Promise.resolve(res);
}
interface MysqlXCollection<T> {
	add(expr?: string): any
	find(expr?: string): any
	modify(expr?: string): any
	remove(expr?: string): any
	addOrReplaceOne(id: uuid, data: Partial<T>): Promise<Result>
	createIndex(name: string, data: any): Promise<boolean>
	dropIndex(name: string): Promise<boolean>
	existsInDatabase(): Promise<boolean>
	getOne(id: uuid): Promise<T>
	removeOne(id: uuid): Promise<Result>
	replaceOne(id: uuid, data: Partial<T>): Promise<Result>
}
export class DataBase implements Database<any> {
	database: any
	ready: Promise<any>
	constructor(private orm: any, configuration: DatabaseConfiguration) {
		this.ready = mysqlx.getSession(configuration).then(session => {
			return session.getSchemas().then(schemas => {
				if (schemas.map(s => s.getName()).includes(configuration.database)) {
					return session.getSchema(configuration.database);
				} else {
					return session.createSchema(configuration.database);
				}
			}).then(schema => {
				this.database = schema;
				return schema;
			});
		});
	}
	register(collection: VaultCollection<any>) {
		const collectionName = collection.collectionName || collection.constructor.name;
		//@ts-ignore
		let indexes = collection.BaseClass.configuration.__indexes__ || [];
		return this.database.createCollection(collectionName, { ReuseExistingObject: true }).then(async col => {
			//@ts-ignore
			collection.collection = col;
			for (const index of indexes) {
				await col.createIndex(index);
			}
			return col;
		});
	}
}
function toQuery(obj: any = {}) {
	let {
		$and,
		$or,
		$eq,
		$gt,
		$gte,
		$in,
		$lt,
		$lte,
		$ne,
		$nin,
		$not,
		$expr,
		$jsonSchema,
		$mod,
		$regex,
		$options,
		$text,
		$geoIntersects,
		$geoWithin,
		$near,
		$nearSphere,
		$elemMatch,
		$size,
		$bitsAllClear,
		$bitsAllSet,
		$bitsAnyClear,
		$bitsAnySet
	} = obj;
	let query: string[] = [];
	if ($or) {
		for (const $or_def of $or) {
			// @ts-ignore
			let trans = toQuery($or_def).join(' AND ');
			query.push(trans);
		}
		if(query.length > 1) {
			return '(' + query.join(') or (') + ')';
		} else {
			return query.join(' OR ');
		}
		delete obj.$or;
	} else if ($and) {
		let pre = [];
		for (const $and_def of $and) {
			let trans = toQuery($and_def);
			if($and_def.$or)pre.push('__OR__');
			pre = pre.concat(trans);
		}
		delete obj.$and;
		query.push(`( ${pre.join(' AND ')} )`.replace('AND __OR__ AND', ') OR ('));
		return query;
	}
	if($ne) {
		if ( isNumber($ne) || isBoolean($ne) ) {
			query.push(`!= ${$ne}`);
		} else {
			query.push(`!= '${$ne}'`);
		}
		delete obj.$ne;
	}
	if($eq) {
		if ( isNumber($eq) || isBoolean($eq) ) {
			query.push(`= ${$eq}`);
		} else {
			query.push(`= '${$eq}'`);
		}
		delete obj.$eq;
	}
	if($regex) {
		delete obj.$regex;
		query.push(`REGEXP_LIKE($property$, '${$regex.toString().replace(/\//g, '')}')`);
	}
	if($in) {
		delete obj.$in;
		query.push(`IN ('${$in.join("', '")}')`);
	}
	if($nin) {
		delete obj.$nin;
		query.push(`NOT IN ('${$nin.join("', '")}')`);
	}
	if ( isNumber($gte)) {
		delete obj.$gte;
		query.push(`>= ${$gte}`);
	}
	if ( isNumber($lte)) {
		delete obj.$lte;
		query.push(`<= ${$lte}`);
	}
	if ( isNumber($gt)) {
		delete obj.$gt;
		query.push(`> ${$gt}`);
	}
	if ( isNumber($lt)) {
		delete obj.$lt;
		query.push(`< ${$lt}`);
	}
	if(obj instanceof Object) {
		for(const key of Object.keys(obj)) {
			if(!obj[key]){ query.push(`${key} = ''`); continue; };
			if( isNumber(obj[key].$gte) && isNumber(obj[key].$lte)) {
				query.push(`${key} BETWEEN ${obj[key].$gte} AND ${obj[key].$lte}`);
				delete obj[key].$lte;
				delete obj[key].$gte;
			}
			// @ts-ignore
			query.push(toQuery(obj[key]).map(q => {
				if(q.includes('$property$')) {
					return q.replace('$property$', key);
				} else {
					return `${key} ${q}`;
				}
			}).join(' and '));
		}
	} else {
		if(isNumber(obj) || isBoolean(obj)) {
			query.push(`= ${obj}`);
		} else {
			query.push(`= '${obj}'`);
		}
	}
	return query.filter(f=>f);
}
function toSQLQuery (obj:any = {}):string {
	let res = toQuery(obj);
	let final = (res instanceof Array ? res[0] : res);
	final = (final || '').replace('(  )', '') || 'true';
	return final;
}
export class Model extends VaultModel {
	constructor(model:any) {
		if(model.created && !(model.created instanceof Date))model.created = new Date(model.created);
		if(model.updated && !(model.updated instanceof Date))model.updated = new Date(model.updated);
		super(model);
	}
	protected async persist(connection: MysqlXCollection<Model>, update_object: any) {
		update_object.created = (update_object.created as Date).toUTCString();
		update_object.updated = (update_object.updated as Date).toUTCString();
		if (this._id) {
			let modify = connection.modify(`_id = '${this._id}'`);
			for (const key of Object.keys(update_object)) {
				modify = modify.set(key, update_object[key]);
			}
			return modify.execute().then(res => {
				if (res.getAffectedRowsCount() === 1) return update_object._id;
				return false;
			});
		} else {
			update_object._id = UUID();
			return connection.add(update_object).execute().then(res => {
				if (res.getAffectedItemsCount() === 1) return update_object._id;
				return false;
			});
		}
	}
	protected async destroy(connection: MysqlXCollection<Model>) {
		// @ts-ignore
		return connection.removeOne(this._id).then(res => res.getAffectedRowsCount() === 1);
	}
	protected async save_relation(update_object) {
		return Promise.resolve(false);
	}
}
export class MySqlXCollection<T extends VaultModel> extends VaultCollection<T> {
	protected cursor: any
	// @ts-ignore
	protected collection: MysqlXCollection<T>
	// @ts-ignore
	protected __where__: any
	protected __limit__: number = 0
	protected __skip__: number = 0
	where(query: Partial<T> = {}) {
		this.__where__['$and'] = this.__where__['$and'] || [];
		this.__where__['$and'].push(query);
		return this;
	}
	orWhere(query: Partial<T>) {
		this.__where__['$or'] = this.__where__['$or'] || [];
		this.__where__['$or'].push(query);
		if (this.__where__['$and']) {
			this.__where__['$or'].push({ '$and': this.__where__['$and'] });
			delete this.__where__['$and'];
		}
		return this;
	}
	// public fields(query: object) {
	// 	this.__projection__ = query;
	// 	return this;
	// }
	// async update(query: Partial<T>, keys?: Object) {
	// 	return (await this.collection.update(query, keys)).result;
	// }
	update(query: Partial<T>, update_object?: Object) {
		let modify = this.collection.modify(toSQLQuery(query));
		for (const key of Object.keys(update_object)) {
			if(update_object[key]){
				modify = modify.set(key, update_object[key]);
			} else {
				modify = modify.unset(key);
			}
		}
		return modify.execute().then(res => {
			if (res.getAffectedRowsCount() === 1) return true;
			return false;
		});
	}
	async findOrCreate(query: Partial<T>, keys: Object={}) {
		let item = await this.firstOrDefault((toSQLQuery(query)));
		if (!item) {
			for (const key of Object.keys(keys)) {
				query[key] = keys[key];
			}
			item = Reflect.construct(this.BaseClass, [query]) as T;
			await item.save();
		}
		return item;
	}
	protected toArray(cursor: any): Promise<T[]> {
		let results: T[] = [];
		return new Promise(resolve => {
			cursor.execute(doc => {
				let created = Reflect.construct(this.BaseClass, [doc]) as T;
				results.push(created);
			}).then(() => {
				this.__where__ = {};
				this.__limit__ = 0;
				this.__skip__ = 0;
				this.__projection__ = {};
				resolve(results);
			}).catch(err => {
				resolve([]);
			});
		});
	}
	remove(query: Partial<T>) {
		this.where(query);
		// @ts-ignore
		return this.collection.remove(toSQLQuery(this.__where__)).execute().then(res => res.getAffectedRowsCount() === 1);
	}
	findAll() {
		return this.toArray(this.collection.find());
	}
	findOne(): Promise<T>
	findOne(StringId: string): Promise<T>
	findOne(query: Partial<T>): Promise<T>
	/**@alias firstOrDefault */
	findOne(queryOrId?: any) {
		return this.firstOrDefault(queryOrId);
	}
	firstOrDefault(): Promise<T>
	firstOrDefault(Id: uuid): Promise<T>
	firstOrDefault(query: Partial<T>): Promise<T>
	firstOrDefault(queryOrId?: any) {
		if (typeof (queryOrId) === 'string' && queryOrId.length === 32) queryOrId = { _id: queryOrId };
		if (queryOrId && typeof (queryOrId) === 'object') {
			this.where(queryOrId);
		}
		this.__limit__ = 1;
		return this.execute().then(results => results[0]);
	}
	protected execute() {
		let query = toSQLQuery(this.__where__);
		let find = this.collection.find(query);
		find = find.limit(this.__limit__, this.__skip__);
		return this.toArray(find);
	}
	limit(n: number) {
		this.__limit__ = n;
		return this;
	}
	skip(n: number) {
		this.__skip__ = n;
		return this;
	}
	find() {
		return this.execute();
	}
	count(applySkipLimit: boolean = false) {
		let find = this.collection.find(toSQLQuery(this.__where__));
		if (applySkipLimit) {
			find = find.limit(this.__limit__, this.__skip__);
		}
		this.__skip__ = 0;
		this.__where__ = {};
		this.__projection__ = {};
		this.__limit__ = 0;
		let count = () => {
			// @ts-ignore
			count.count++;
		};
		// @ts-ignore
		count.count = 0;
		// @ts-ignore
		return find.execute(count).then(() => count.count);
	}
}
