import { RelationSingle } from "../related";
import { VaultORM, RelationMode, DatabaseConfiguration } from "../";
import { MongoClientOptions, Db, Collection, MongoClient, ObjectId, FilterQuery, Cursor } from "mongodb";
import { VaultCollection } from "../collection";
import { Database } from "../database";
import { VaultModel, IVaultModel } from "../model";
export class DataBase implements Database<Db> {
	database: Db
	ready: Promise<Db>
	constructor(private orm: any, configuration: DatabaseConfiguration, options: MongoClientOptions) {
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
	fields(query: object) {
		this.__projection__ = query;
		return this;
	}
	protected toArray(cursor: Cursor<T>) {
		if (this.__projection__) {
			cursor.project(this.__projection__);
			this.__projection__ = undefined;
		}
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
		return this.toArray(this.collection.find<T>({}));
	}
	where(query: FilterQuery<T> = {}) {
		this.__where__['$and'] = this.__where__['$and'] || [];
		this.__where__['$and'].push(query);
		return this;
	}
	orWhere(query: FilterQuery<T>) {
		this.__where__['$or'] = this.__where__['$or'] || [];
		this.__where__['$or'].push(query);
		if (this.__where__['$and']) {
			this.__where__['$or'].push({ '$and': this.__where__['$and'] });
			delete this.__where__['$and'];
		}
		return this;
	}
	limit(n: number) {
		if (!this.cursor) this.cursor = this.collection.find<T>();
		this.cursor = this.cursor.limit(n);
		return this;
	}
	/**
	 * @alias take
	 * @param n
	 */
	take(n: number) {
		return this.limit(n);
	}
	skip(n: number) {
		if (!this.cursor) this.cursor = this.collection.find<T>();
		this.cursor = this.cursor.skip(n);
		return this;
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
		return this.firstOrDefault(queryOrId);
	}
	firstOrDefault(): Promise<T>
	firstOrDefault(Id: ObjectId): Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	firstOrDefault(StringId: string): Promise<T>
	firstOrDefault(query: FilterQuery<T>): Promise<T>
	firstOrDefault(queryOrId?: any) {
		if (!this.cursor) this.cursor = this.collection.find<T>();
		if (typeof (queryOrId) === 'string' && queryOrId.length === 24) queryOrId = new ObjectId(queryOrId);
		if (queryOrId instanceof ObjectId) {
			queryOrId = { _id: queryOrId }
		}
		if (queryOrId && typeof (queryOrId) === 'object') {
			this.where(queryOrId);
			this.cursor.filter(this.__where__);
		}
		this.cursor.limit(1);
		return this.execute(this.__where__).then(results => results[0]);
	}
	find() {
		return this.execute(this.__where__);
	}
	explain() {
		this.cursor = this.collection.find<T>(this.__where__);
		const execution_cursor = this.cursor;
		this.cursor = null;
		this.__where__ = {};
		return execution_cursor.explain();
	}
	protected execute(query: any) {
		if (this.cursor) {
			this.cursor = this.cursor.filter(query);
		} else {
			this.cursor = this.collection.find<T>(this.__where__);
		}
		const execution_cursor = this.cursor;
		this.cursor = null;
		this.__where__ = {};
		return this.toArray(execution_cursor);
	}
	count(applySkipLimit: boolean = false) {
		let count: Promise<number>;
		if (this.cursor) {
			count = this.cursor.filter(this.__where__).count(applySkipLimit);
		} else {
			count = this.collection.find(this.__where__).count(applySkipLimit);
		}
		return count.finally(() => {
			this.cursor = null;
			this.__where__ = {};
		});

	}
}
export { MongoCollection as Collection };
