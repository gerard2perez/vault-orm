import * as mysqlx from '@mysql/xdevapi';
import { DatabaseConfiguration } from '..';
import { VaultCollection } from '../collection';
import { VaultModel, IVaultModel } from '../model';
import { Database } from '../database';
import { UUID, uuid } from './uuid';
interface Result {
	getAffectedItemsCount(): number
	getAffectedRowsCount(): number
	getAutoIncrementValue(): number
	getGeneratedIds(): uuid[]
	getWarnings(): any[]
	getWarningsCount(): number
}
function inspectResult(res) {
	for(const key of Object.keys(res)) {
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
	let { $and = [], $or = [] } = obj;
	let query = [
		$and.map($a => {
			let pre = [];
			for (const key of Object.keys($a)) {
				switch (typeof $a[key]) {
					case 'string':
						pre.push(`${key} = '${$a[key]}'`);
						break;
					default:
						pre.push(`${key} = ${$a[key]}`);
						break;
				}
			}
			return `(${pre.join(' and ')})`;
		}).join(' and '),
		$or.map($o => {
			let pre = [];
			for (const key of Object.keys($o)) {
				pre.push(`${key} = '${$o[key]}'`);
			}
			return `(${pre.join(' and ')})`;
		}).join(' or '),
	].filter(f => f);
	let res = query.join(' or ') || 'true';
	return res === '()' ? 'true' : res;
}
export class Model extends VaultModel {
	protected async persist(connection: MysqlXCollection<Model>, update_object: any) {
		update_object.created = (update_object.created as Date).toUTCString();
		update_object.updated = (update_object.updated as Date).toUTCString();
		if (this._id) {
			let modify = connection.modify(`_id = '${this._id}'`);
			for (const key of Object.keys(update_object)) {
				modify = modify.set(key, update_object[key]);
			}
			return modify.execute(console.log).then(res => {
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
	protected __limit__: number
	protected __skip__: number
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
	// private toArray(cursor: Cursor<T>) {
	// 	if (this.__projection__) {
	// 		cursor.project(this.__projection__);
	// 		this.__projection__ = undefined;
	// 	}
	// 	let rdn = Math.floor(Math.random() * 1000);
	// 	let id = `toArray${rdn}`;
	// 	let results: T[] = [];
	// 	return new Promise(async (resolve, reject) => {
	// 		let item = await cursor.next();
	// 		while (item) {
	// 			let created = Reflect.construct(this.BaseClass, [item]) as T;
	// 			// // @ts-ignore
	// 			// await created.loadRelation();
	// 			results.push(created);
	// 			item = await cursor.next();
	// 		}
	// 		resolve(results);
	// 	}) as Promise<T[]>;
	// }
	// async remove(query: Partial<T>) {
	// 	return (await this.collection.remove(query)).result;
	// }
	// async update(query: Partial<T>, keys?: Object) {
	// 	return (await this.collection.update(query, keys)).result;
	// }
	// async findOrCreate(query: Partial<T>, keys: Object={}) {
	// 	let item = await this.collection.findOne(query);
	// 	if (!item) {
	// 		for (const key of Object.keys(keys)) {
	// 			query[key] = keys[key];
	// 		}
	// 		item = Reflect.construct(this.BaseClass, [query]) as T;
	// 		await item.save();
	// 	} else {
	// 		item = Reflect.construct(this.BaseClass, [item]);
	// 	}
	// 	return item;
	// }
	protected toArray(cursor: any): Promise<T[]> {
		let results: T[] = [];
		return new Promise(resolve => {
			cursor.execute(doc => {
				let created = Reflect.construct(this.BaseClass, [doc]) as T;
				results.push(created);
			}).then(() => {
				this.__where__ = {};
				this.__limit__ = undefined;
				this.__skip__ = undefined;
				this.__projection__ = {};
				resolve(results);
			});
		});
	}
	remove(query: Partial<T>) {
		this.where(query);
		// @ts-ignore
		return this.collection.remove(toQuery(this.__where__)).execute().then(res=>res.getAffectedRowsCount() === 1);
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
		// if (!this.cursor) this.cursor = this.collection.find();
		if (typeof (queryOrId) === 'string' && queryOrId.length === 32) queryOrId = { _id: queryOrId };
		if (queryOrId && typeof (queryOrId) === 'object') {
			this.where(queryOrId);
			// this.cursor.find(this.__where__);
		}
		this.__limit__ = 1;
		// this.cursor.limit(1);
		return this.execute(this.__where__).then(results => results[0]);
	}
	protected execute(where: any) {
		return this.toArray(this.collection.find(toQuery(this.__where__)).limit(this.__limit__));
	}
	// limit(n: number) {
	// 	if (!this.cursor) this.cursor = this.collection.find<T>();
	// 	this.cursor = this.cursor.limit(n);
	// 	return this;
	// }
	// /**
	//  * @alias take
	//  * @param n
	//  */
	// take(n: number) {
	// 	return this.limit(n);
	// }
	// skip(n: number) {
	// 	if (!this.cursor) this.cursor = this.collection.find<T>();
	// 	this.cursor = this.cursor.skip(n);
	// 	return this;
	// }
	// findOne(): Promise<T>
	// findOne(Id: uuid): Promise<T>
	// /**
	//  * String that respresnents an uuid
	//  */
	// find() {
	// 	return this.execute(this.__where__);
	// }
	// explain() {
	// 	this.cursor = this.collection.find<T>(this.__where__);
	// 	const execution_cursor = this.cursor;
	// 	this.cursor = null;
	// 	this.__where__ = {};
	// 	return execution_cursor.explain();
	// }
	// private execute(query: any) {
	// 	if (this.cursor) {
	// 		this.cursor = this.cursor.filter(query);
	// 	} else {
	// 		this.cursor = this.collection.find<T>(this.__where__);
	// 	}
	// 	const execution_cursor = this.cursor;
	// 	this.cursor = null;
	// 	this.__where__ = {};
	// 	return this.toArray(execution_cursor);
	// }
	count(applySkipLimit: boolean = false) {
		let find = this.collection.find();
		if(applySkipLimit) {
			if(this.__limit__) {
				find = find.limit(this.__limit__, this.__skip__);
			}
		}
		this.__limit__ = undefined;
		this.__skip__ = undefined;
		this.__where__ = {};
		this.__projection__ = undefined;
		this.__limit__ = undefined;
		let count = () => {
			// @ts-ignore
			count.count++;
		};
		// @ts-ignore
		count.count = 0;
		// @ts-ignore
		return find.execute(count).then(()=>count.count);
		// let count: Promise<number>;
		// if (this.cursor) {
		// 	count = this.cursor.filter(this.__where__).count(applySkipLimit);
		// } else {
		// 	count = this.collection.find(this.__where__).count(applySkipLimit);
		// }
		// return count.finally(() => {
		// 	this.cursor = null;
		// 	this.__where__ = {};
		// });

	}
}
