
import { Db, MongoClient, MongoClientOptions } from "mongodb";
import { DatabaseConfiguration } from '../..';
import { VaultCollection } from "../../collection";
import { Database } from "../../database";
export { collection, RelationMode } from '../..';
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
		//@ts-ignore
		const collectionName = collection.collectionName || collection.constructor.name;
		//@ts-ignore
		let indexes = collection.BaseClass.configuration.__indexes__ || [];
		return new Promise((resolve, reject) => {
			this.database.createCollection(collectionName, async function (err, col) {
				// istanbul ignore next
				if (err) reject(err);
				// @ts-ignore
				collection.collection = col;
				// istanbul ignore next
				for (const index of indexes) {
					await col.createIndex(index);
				}
				resolve(col);
			});
		})
	}
}
