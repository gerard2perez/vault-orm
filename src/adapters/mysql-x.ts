/**
 * @module @bitsun/vault-orm/adapters/mysql-x
 */
export { collection, RelationMode } from '../index';
import * as mysqlx from '@mysql/xdevapi';
import { MongoClientOptions } from 'mongodb';
import { basename } from 'path';
import { isBoolean, isNumber } from 'util';
import { DatabaseConfiguration, Sorting } from '..';
import { VaultCollection } from '../collection';
import { Database } from '../database';
import { VaultORM as VORM } from '../index';
import { VaultModel } from '../model';
import { UUID, uuidv4 } from './uuid';
import { FilterQuery, Projection } from '../query';
interface Result {
	getAffectedItemsCount(): number
	getAffectedRowsCount(): number
	getAutoIncrementValue(): number
	getGeneratedIds(): string[]
	getWarnings(): any[]
	getWarningsCount(): number
}
// istanbul ignore next
class InspectMy {
	static error(err) {
		console.error(err);
		return null;
	}
	static result(res) {
		for (const key of Object.keys(res)) {
			console.error(key, res[key]());
		}
		return Promise.resolve(res);
	}
}
interface MysqlXCollection<T> {
	add(expr?: string): any
	find(expr?: string): any
	modify(expr?: string): any
	remove(expr?: string): any
	addOrReplaceOne(id: uuidv4, data: Partial<T>): Promise<Result>
	createIndex(name: string, data: any): Promise<boolean>
	dropIndex(name: string): Promise<boolean>
	existsInDatabase(): Promise<boolean>
	getOne(id: uuidv4): Promise<T>
	removeOne(id: uuidv4): Promise<Result>
	replaceOne(id: uuidv4, data: Partial<T>): Promise<Result>
}
export class DataBase implements Database<any> {
	database: any
	ready: Promise<any>
	constructor(private orm: any, configuration: DatabaseConfiguration) {
		this.ready = mysqlx.getSession(configuration).then(session => {
			return session.getSchemas().then(schemas => {
				// istanbul ignore next
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
		//@ts-ignore
		const collectionName = collection.collectionName || collection.constructor.name;
		//@ts-ignore
		let indexes = collection.BaseClass.configuration.__indexes__ || [];
		return this.database.createCollection(collectionName, { ReuseExistingObject: true }).then(async col => {
			//@ts-ignore
			collection.collection = col;
			// istanbul ignore next
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
function toSQLSelect(query: Projection<any> ) {
	let fields:string[] = [];
	if(query) {
		for(const key  of Object.keys(query)) {
			if(query[key]) {
				fields.push(key);
			}
		}
	}
	return fields;
}
export class Model extends VaultModel<uuidv4> {
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
}
export class Repository extends Model {
	static findOne<T extends Model>(this:new()=>T): Promise<T>
	static findOne<T extends Model>(this:new()=>T,Id: uuidv4): Promise<T>
	/**
	 * String that respresnents an uuidv4
	 */
	static findOne<T extends Model>(this:new()=>T,StringId: string): Promise<T>
	static findOne<T extends Model>(this:new()=>T, query: FilterQuery<T>): Promise<T>
	/**@alias firstOrDefault */
	static findOne<T extends Model>(this:new()=>T,queryOrId?: any) {
		return (this as any).objects.findOne(queryOrId);
	}
	static firstOrDefault<T extends Model>(this:new()=>T): Promise<T>
	static firstOrDefault<T extends Model>(this:new()=>T,Id: uuidv4): Promise<T>
	/**
	 * String that respresnents an uuidv4
	 */
	static firstOrDefault<T extends Model>(this:new()=>T,StringId: string): Promise<T>
	static firstOrDefault<T extends Model>(this:new()=>T,query: FilterQuery<T>): Promise<T>
	static firstOrDefault<T extends Model>(this:new()=>T, queryOrId?: any) {
		return (this as any).objects.firstOrDefault(queryOrId);
	}
	static findOrCreate<T extends Model>(this:new()=>T, query: FilterQuery<T>, keys: Partial<T> = {}):Promise<T> {
		return (this as any).objects.findOrCreate(query, keys);
	}
	static find<T extends Model>(this:new()=>T) :Promise<T> {
		return (this as any).objects.find();
	}
	static findAll<T extends Model>(this:new()=>T):Promise<T[]> {
		return (this as any).objects.findAll();
	}
	static remove<T extends Model>(this:new()=>T, query: FilterQuery<T>):Promise<boolean> {
		return (this as any).objects.remove(query);
	}
	static update<T extends Model>(this:new()=>T, query: FilterQuery<T>, keys?: Partial<T>) : Promise<boolean> {
		return (this as any).objects.update(query, keys);
	}
	static count(applySkipLimit: boolean = false) : Promise<number> {
		return (this as any).objects.count(applySkipLimit);

	}
	static fields<T extends Model>(this:new()=>T, query: Projection<T>) : MySQLXCollection<T> {
		return (this as any).objects.fields(query);
	}
	static where<T extends Model>(this:new()=>T,query: FilterQuery<T> = {}) : MySQLXCollection<T> {
		return (this as any).objects.where(query);
	}
	static orWhere<T extends Model>(this:new()=>T, query: FilterQuery<T>) : MySQLXCollection<T> {
		return (this as any).objects.orWhere();
	}
	static limit<T extends Model>(this:new()=>T,n: number) : MySQLXCollection<T> {
		return (this as any).objects.limit(n);
	}
	static take<T extends Model>(this:new()=>T, n: number) : MySQLXCollection<T> {
		return (this as any).objects.limit(n);
	}
	static sort<T extends Model>(this:new()=>T, key: string, order: Sorting = Sorting.asc) : MySQLXCollection<T> {
		return (this as any).objects.sort(key, order);
	}
	static skip<T extends Model>(this:new()=>T, n: number) : MySQLXCollection<T> {
		return (this as any).objects.skip(n);
	}

	static toId(id: any): uuidv4 {
		return (this as any).objects.toId(id);
	}
	static explain() {
		return (this as any).objects.explain();
	}
}
class MySQLXCollection<T extends VaultModel<uuidv4>> extends VaultCollection<T> {
	protected cursor: any
	// @ts-ignore
	protected collection: MysqlXCollection<T>
	// @ts-ignore
	protected __where__: any
	protected __limit__: number = 0
	protected __skip__: number = 0
	protected __sort__:string[] = []
	where(query: Partial<T> | any = {}) {
		const { executionContext } = this;
		executionContext.__where__['$and'] = this.__where__['$and'] || [];
		executionContext.__where__['$and'].push(query);
		return executionContext;
	}
	orWhere(query: Partial<T>) {
		const { executionContext } = this;
		executionContext.__where__['$or'] = executionContext.__where__['$or'] || [];
		executionContext.__where__['$or'].push(query);
		if (executionContext.__where__['$and']) {
			executionContext.__where__['$or'].push({ '$and': executionContext.__where__['$and'] });
			delete executionContext.__where__['$and'];
		}
		return executionContext;
	}
	public fields(query: Projection<T>) {
		const { executionContext } = this;
		executionContext.__projection__ = query;
		return executionContext;
	}
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
		const { executionContext } = this;
		let item = await executionContext.firstOrDefault(query);
		if (!item) {
			for (const key of Object.keys(keys)) {
				query[key] = keys[key];
			}
			item = Reflect.construct(executionContext.BaseClass, [query]) as T;
			await item.save();
		}
		return item;
	}
	protected toArray(cursor: any): Promise<T[]> {
		const { executionContext } = this;
		let results: T[] = [];
		return new Promise(resolve => {
			cursor.execute(doc => {
				let created = Reflect.construct(executionContext.BaseClass, [doc]) as T;
				results.push(created);
			}).then(() => {
				executionContext.__where__ = {};
				executionContext.__limit__ = 0;
				executionContext.__skip__ = 0;
				executionContext.__projection__ = {};
				executionContext.__sort__ = [];

				resolve(results);
			}).catch(err => {
				resolve([]);
			});
		});
	}
	remove(query: Partial<T>) {
		const { executionContext } = this;
		// executionContext.where(query);
		// @ts-ignore
		return executionContext.collection.remove(toSQLQuery(query)).execute().then(res => res.getAffectedRowsCount() === 1);
	}
	findAll() {
		const { executionContext } = this;
		return executionContext.toArray(executionContext.collection.find());
	}
	findOne(): Promise<T>
	findOne(StringId: uuidv4): Promise<T>
	findOne(query: Partial<T>): Promise<T>
	/**@alias firstOrDefault */
	findOne(queryOrId?: any) {
		const { executionContext } = this;
		return executionContext.firstOrDefault(queryOrId);
	}
	firstOrDefault(): Promise<T>
	firstOrDefault(Id: uuidv4): Promise<T>
	firstOrDefault(query: Partial<T>): Promise<T>
	firstOrDefault(queryOrId?: any) {
		const { executionContext } = this;
		if (typeof (queryOrId) === 'string' && queryOrId.length === 32) queryOrId = { _id: queryOrId };
		if (queryOrId && typeof (queryOrId) === 'object') {
			executionContext.where(queryOrId);
		}
		executionContext.__limit__ = 1;
		return executionContext.execute().then(results => results[0]);
	}
	toId(id: any) {
		return id.replace(/-/gm,'');
	}
	protected execute() {
		const { executionContext } = this;
		let query = toSQLQuery(executionContext.__where__);
		let find = executionContext.collection.find(query);
		if(executionContext.__sort__.length) {
			find = find.sort(...executionContext.__sort__);
		}
		find = find.limit(executionContext.__limit__ || 1000);
		if( executionContext.__skip__) {
			find = find.offset(executionContext.__skip__);
		}
		let fields = toSQLSelect(executionContext.__projection__ as any);
		if(fields.length) {
			fields.splice(0,0,'_id');
			find = find.fields(fields);
		}
		return executionContext.toArray(find);
	}
	sort(key: string, order: Sorting = Sorting.asc) {
		const { executionContext } = this;
		executionContext.__sort__.push(`${key} ${Sorting[order]}`);
		console.log(executionContext.__sort__)
		// executionContext.__sort__ = [key, order];
		return executionContext;
	}
	limit(n: number) {
		const { executionContext } = this;
		executionContext.__limit__ = n;
		return executionContext;
	}
	skip(n: number) {
		const { executionContext } = this;
		executionContext.__skip__ = n;
		return executionContext;
	}
	find() {
		const { executionContext } = this;
		return executionContext.execute();
	}
	count(applySkipLimit: boolean = false) {
		const { executionContext } = this;
		let find = executionContext.collection.find(toSQLQuery(executionContext.__where__));
		if (applySkipLimit) {
			find = find.limit(executionContext.__limit__ || 1000, executionContext.__skip__);
		}
		executionContext.__skip__ = 0;
		executionContext.__where__ = {};
		executionContext.__projection__ = {};
		executionContext.__limit__ = 0;
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
export class VaultORM extends VORM {
	public static set RelationsMode (value) {
		VORM.RelationsMode = value;
	}
	public static get RelationsMode () {
		return VORM.RelationsMode;
	}
	driver: string = basename(__filename).split('.')[0]
	constructor(configuration: DatabaseConfiguration, driver_options?:MongoClientOptions | any) {
		super();
		return this.after_constructor(configuration, driver_options);
	}
}


export {MySQLXCollection as Collection};
