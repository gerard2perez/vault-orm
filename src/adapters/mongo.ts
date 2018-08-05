import "reflect-metadata";
export { VaultORM, collection, RelationMode, DatabaseDriver } from '../';
import { MongoClientOptions, Db, Collection, MongoClient, ObjectId, FilterQuery, Cursor } from "mongodb";
import { VaultCollection } from "../collection";
import { Database } from "../database";
import { VaultModel } from "../model";
import { DatabaseConfiguration, MODELATTRIBUTES, Sorting } from '..';
export class DataBase implements Database<Db> {
	database: Db
	ready: Promise<Db>
	constructor(private orm: any, configuration: DatabaseConfiguration, options: MongoClientOptions) {
		options = Object.assign({}, { useNewUrlParser: true }, options);
		this.ready = MongoClient.connect(`mongodb://${configuration.host}:${configuration.port}`, options).then(client => {
			this.database = client.db(configuration.database);
			return this.database
		});
	}
	register(collection: VaultCollection<any>) {
		const collectionName = collection.collectionName || collection.constructor.name;
		//@ts-ignore
		let indexes = collection.BaseClass.configuration.__indexes__ || [];
		return new Promise((resolve, reject) => {
			this.database.createCollection(collectionName, async function (err, col) {
				if (err) reject(err);
				// @ts-ignore
				collection.collection = col;
				for (const index of indexes) {
					await col.createIndex(index);
				}
				resolve(col);
			});
		})
	}
}
export class Model extends VaultModel<ObjectId> {
	constructor(information: any = {}) {
		super(information);
	}
	protected async persist(connection: any, update_object: any) {
		if (!this.id) {
			return connection.insertOne(update_object).then((inserted) => {
				return inserted.insertedId;
			});
		} else {
			return connection.findOneAndUpdate({ _id: this.id }, update_object).then(error => {
				if (!error.lastErrorObject.updatedExisting) {
					console.error(error, { _id: this.id }, update_object);
					throw new Error(error.lastErrorObject);
				}
				return this.id;
			});
		}
	}
	protected async destroy(connection: any) {
		return connection.deleteOne({ _id: this._id }).then(result => result.deletedCount === 1);
	}
}
class MongoCollection<T extends VaultModel<ObjectId>> extends VaultCollection<T> {
	protected __limit__: number = 0
	protected __skip__: number = 0
	protected __sort__: any[] = undefined
	fields(query: object) {
		this.__projection__ = query;
		return this;
	}
	async remove(query: FilterQuery<T>) {
		return (await this.collection.remove(query)).result;
	}
	async update(query: FilterQuery<T>, keys?: Object) {
		return (await this.collection.update(query, keys)).result;
	}
	async findOrCreate(query: FilterQuery<T>, keys: Object = {}) {
		let item = await this.collection.findOne(query);
		if (!item) {
			for (const key of Object.keys(keys)) {
				query[key] = keys[key];
			}
			item = Reflect.construct(this.BaseClass, [query]) as T;
			await item.save();
		} else {
			item = Reflect.construct(this.BaseClass, [item]);
		}
		return item;
	}
	findAll() {
		const { executionContext } = this;
		return executionContext.toArray(executionContext.collection.find<T>({}));
	}
	where(query: FilterQuery<T> = {}) {
		const { executionContext } = this;
		executionContext.__where__['$and'] = executionContext.__where__['$and'] || [];
		executionContext.__where__['$and'].push(query);
		return executionContext;
	}
	orWhere(query: FilterQuery<T>) {
		const { executionContext } = this;
		executionContext.__where__['$or'] = executionContext.__where__['$or'] || [];
		executionContext.__where__['$or'].push(query);
		if (executionContext.__where__['$and']) {
			executionContext.__where__['$or'].push({ '$and': executionContext.__where__['$and'] });
			delete executionContext.__where__['$and'];
		}
		return executionContext;
	}
	limit(n: number) {
		const { executionContext } = this;
		executionContext.__limit__ = n;
		return executionContext;
	}
	/**
	 * @alias take
	 * @param n
	 */
	take(n: number) {
		return this.limit(n);
	}
	sort(key: string, order: Sorting = Sorting.asc) {
		const { executionContext } = this;
		executionContext.__sort__ = [key, order];
		return executionContext;
	}
	skip(n: number) {
		const { executionContext } = this;
		executionContext.__skip__ = n;
		return executionContext;
	}
	findOne(): Promise<T>
	findOne(Id: ObjectId): Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	findOne(StringId: string): Promise<T>
	findOne(query: FilterQuery<T>): Promise<T>
	/**@alias firstOrDefault */
	findOne(queryOrId?: any) {
		const { executionContext } = this;
		return executionContext.firstOrDefault(queryOrId);
	}
	firstOrDefault(): Promise<T>
	firstOrDefault(Id: ObjectId): Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	firstOrDefault(StringId: string): Promise<T>
	firstOrDefault(query: FilterQuery<T>): Promise<T>
	firstOrDefault(queryOrId?: any) {
		const { executionContext } = this;
		if (typeof (queryOrId) === 'string' && queryOrId.length === 24) queryOrId = new ObjectId(queryOrId);
		if (queryOrId instanceof ObjectId) {
			queryOrId = { _id: queryOrId }
		}
		if (queryOrId && typeof (queryOrId) === 'object') {
			executionContext.where(queryOrId);
		}
		executionContext.limit(1);
		return executionContext.execute().then(results => results[0]);
	}
	find() {
		const { executionContext } = this;
		return executionContext.execute();
	}
	explain() {
		const { executionContext } = this;
		executionContext.cursor = executionContext.collection.find<T>(executionContext.__where__);
		const execution_cursor = executionContext.cursor;
		this.cursor = null;
		this.__where__ = {};
		return execution_cursor.explain();
	}
	protected execute() {
		let cursor = this.collection.find(this.__where__);
		if (this.__skip__) cursor = cursor.skip(this.__skip__);
		if (this.__limit__) cursor = cursor.limit(this.__limit__);
		if (this.__sort__) {
			let stages: any[] = [
				{
					$addFields: {
						_sort_: { $toLower: `$${this.__sort__[0]}` }
					}
				},
				{ $match: this.__where__ },
				{ $sort: { _sort_: this.__sort__[1] } },
			];
			if (this.__skip__) stages.push({ $skip: this.__skip__ });
			if (this.__limit__) stages.push({ $limit: this.__limit__ });
			if (this.__projection__) stages.push({ $project: this.__projection__ });
			// @ts-ignore
			cursor = this.collection.aggregate(stages);
		}
		const execution_cursor = cursor;
		return this.toArray(execution_cursor).finally(() => {
			// this.cursor = null;
			// this.__skip__ = undefined;
			// this.__limit__ = undefined;
			// this.__sort__ = undefined;
			// this.__where__ = {};
		});
	}
	protected toArray(cursor: Cursor<T>) {
		let rdn = Math.floor(Math.random() * 1000);
		let id = `toArray${rdn}`;
		let results: T[] = [];
		return new Promise(async (resolve, reject) => {
			let item = await cursor.next();
			while (item) {
				let created = Reflect.construct(this.BaseClass, [item]) as T;
				// // @ts-ignore
				// await created.loadRelation();
				results.push(created);
				item = await cursor.next();
			}
			resolve(results);
		}) as Promise<T[]>;
	}
	count(applySkipLimit: boolean = false) {
		const { executionContext } = this;
		let count: Promise<number>;
		if (executionContext.cursor) {
			count = executionContext.cursor.filter(executionContext.__where__).count(applySkipLimit);
		} else {
			count = executionContext.collection.find(executionContext.__where__).count(applySkipLimit);
		}
		return count.finally(() => {
			// this.cursor = null;
			// this.__where__ = {};
		});

	}
}
export { MongoCollection as Collection };
