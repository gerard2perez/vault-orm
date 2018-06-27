import { RelationSingle } from "../related";
import { VaultORM, RelationMode, DatabaseConfiguration } from "../";
import { inspect } from 'util';
import { MongoClientOptions, Db, Collection, MongoClient, ObjectId } from "mongodb";
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
export class Model extends VaultModel {
	constructor(information: any = {}) {
		super(information);
		// let un_proxy = this;
		// let data = {
		// 	save_hooks: [],
		// 	state: IEntityState.unchanged
		// };
		// let own_properties = Object.keys(Object.getPrototypeOf(this).newSchema.raw);
		// let OwnRelations = {};
		// for(const property of own_properties ) {
		// 	this[property] = information[property] || undefined;
		// }
		// return VaultModel.createProxy(un_proxy, OwnRelations, data);
	}
	protected async persist(connection: any, update_object: any) {
		if (!this.id) {
			return connection.insertOne(update_object).then((inserted) => {
				return inserted.insertedId;
			});
		} else {
			return connection.findOneAndUpdate({ _id: this.id }, update_object).then(error => {
				if (!error.lastErrorObject.updatedExisting) {
					console.log(error, { _id: this.id }, update_object);
					throw new Error(error.lastErrorObject);
				}
				return this.id;
			});
		}
	}
	protected async save_relation(update_object) {
		return Promise.resolve(false);
	}
	protected async destroy(connection: any) {
		return connection.deleteOne({ _id: this._id }).then(result => result.deletedCount === 1);
	}
}
