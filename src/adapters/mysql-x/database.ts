import * as mysqlx from '@mysql/xdevapi';
import { DatabaseConfiguration } from '../..';
import { VaultCollection } from '../../collection';
import { Database } from '../../database';
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
