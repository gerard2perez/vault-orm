import * as mysqlx from '@mysql/xdevapi';
import { DatabaseConfiguration } from '..';
import { VaultCollection } from '../collection';
import { VaultModel } from './mongo';
import * as crypto from 'crypto';
import { performance } from 'perf_hooks';
import { UUID } from './uuid';



export class DataBase {
	database:any;
	constructor (private orm:any, configuration:DatabaseConfiguration) {
		this.database = mysqlx.getSession(configuration).then(session=>{
			return session.getSchemas().then(schemas=>{
				if ( schemas.map(s=>s.getName()).includes(configuration.database) ) {
					return session.getSchema(configuration.database);
				} else {
					return session.createSchema(configuration.database);
				}
			});
		});
	}
	async ready() {
		this.database = await this.database;
		return this.database;
	}
	register (collection:VaultCollection<any>) {
		const collectionName = collection.collectionName || collection.constructor.name;
		//@ts-ignore
		let indexes = collection.BaseClass.configuration.__indexes__ || [];
		return this.database.createCollection(collectionName, {ReuseExistingObject:true}).then(async col =>{
			//@ts-ignore
			collection.collection = col;
			for(const index of indexes) {
				await col.createIndex(index);
			}
			return col;
		});
	}
}
export function connect(configuration:DatabaseConfiguration)  {
	return mysqlx.getSession(configuration).then(session=>session.createSchema(configuration.database));
}

function toQuery(obj:any) {
	let query = '';
	for(const key of Object.keys(obj)) {
		query += `${key} = '${obj[key]}'`;
	}
	return query || 'true';
}
export class MySqlXCollection<T extends VaultModel> extends VaultCollection<T> {
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
	// async remove(query: FilterQuery<T>) {
	// 	return (await this.collection.remove(query)).result;
	// }
	// async update(query: FilterQuery<T>, keys?: Object) {
	// 	return (await this.collection.update(query, keys)).result;
	// }
	// async findOrCreate(query: FilterQuery<T>, keys: Object={}) {
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
	protected toArray(cursor:any) : Promise<T[]> {
		let results: T[] = [];
		return new Promise(resolve => {
			cursor.execute(doc => {
				let created = Reflect.construct(this.BaseClass, [doc]) as T;
				results.push(created);
			}).then(() => resolve(results));
		});
	}
	async remove(query: Partial<T>) {
		// @ts-ignore
		return this.collection.remove(toQuery(query)).execute();
		// return (await this.collection.remove(query)).result;
	}
	findAll() {
		return this.toArray(this.collection.find());
		// @ts-ignore
		// return this.collection.find().execute(console.log, console.log);
		// @ts-ignore
		// return this.collection.find().execute(function (doc) {
			// Print document
			// console.log(new Date(), doc);
			// return doc;
		//   }, console.log);
		// return this.toArray(this.collection.find<T>({}));
	}
	// where(query: FilterQuery<T> = {}) {
	// 	this.__where__['$and'] = this.__where__['$and'] || [];
	// 	this.__where__['$and'].push(query);
	// 	return this;
	// }
	// orWhere(query: FilterQuery<T>) {
	// 	this.__where__['$or'] = this.__where__['$or'] || [];
	// 	this.__where__['$or'].push(query);
	// 	if (this.__where__['$and']) {
	// 		this.__where__['$or'].push({ '$and': this.__where__['$and'] });
	// 		delete this.__where__['$and'];
	// 	}
	// 	return this;
	// }
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
	// findOne(Id: ObjectId): Promise<T>
	// /**
	//  * String that respresnents an ObjectId
	//  */
	// findOne(StringId: string): Promise<T>
	// findOne(query: FilterQuery<T>): Promise<T>
	// /**@alias firstOrDefault */
	// findOne(queryOrId?: any) {
	// 	return this.firstOrDefault(queryOrId);
	// }
	// firstOrDefault(): Promise<T>
	// firstOrDefault(Id: ObjectId): Promise<T>
	// /**
	//  * String that respresnents an ObjectId
	//  */
	// firstOrDefault(StringId: string): Promise<T>
	// firstOrDefault(query: FilterQuery<T>): Promise<T>
	// firstOrDefault(queryOrId?: any) {
	// 	if (!this.cursor) this.cursor = this.collection.find<T>();
	// 	if (typeof (queryOrId) === 'string' && queryOrId.length === 24) queryOrId = new ObjectId(queryOrId);
	// 	if (queryOrId instanceof ObjectId) {
	// 		queryOrId = { _id: queryOrId }
	// 	}
	// 	if (queryOrId && typeof (queryOrId) === 'object') {
	// 		this.where(queryOrId);
	// 		this.cursor.filter(this.__where__);
	// 	}
	// 	this.cursor.limit(1);
	// 	return this.execute(this.__where__).then(results => results[0]);
	// }
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
	// count(applySkipLimit: boolean = false) {
	// 	let count:Promise<number>;
	// 	if (this.cursor) {
	// 		count = this.cursor.filter(this.__where__).count(applySkipLimit);
	// 	} else {
	// 		count = this.collection.find(this.__where__).count(applySkipLimit);
	// 	}
	// 	return count.finally(()=>{
	// 		this.cursor = null;
	// 		this.__where__ = {};
	// 	});

	// }
}
