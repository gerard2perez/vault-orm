import { VaultModel } from "./model";
import { MongoClientOptions, Db, MongoClient } from "mongodb";
import { VaultCollection } from "./collection";

export interface DatabaseConfiguration {
	host:string
	port:number
	database:string
}

export function CollectionOfType(Model:typeof VaultModel) {
	return function (target: any, key: string) {
	  Object.defineProperty(target, key, {
		configurable: false,
		value: new VaultCollection<VaultModel>(Model)
	  });
	}
  }
export class VaultORM {
	private database: Db
	ready: Promise<any>
	constructor(configuration: DatabaseConfiguration, options?:MongoClientOptions) {
		let ownproperties;
		this.ready = new Promise((resolve)=>{
			MongoClient.connect(`mongodb://${configuration.host}:${configuration.port}`,options).then(client => {
				this.database = client.db(configuration.database);
				let collections = [];
				let prototype = Object.getPrototypeOf(this);
				let properties = Object.getOwnPropertyNames(prototype);
				properties = properties.concat(Object.getOwnPropertyNames(this));
				for(const property of properties) {
					if(this[property] instanceof VaultCollection) {
						collections.push(this.register(this.database, this[property]));
					}
				}
				Promise.all(collections).then( ()=>{
					resolve(this);
				});

			});
		});
	}
	private async register(db:Db, collection:VaultCollection<any>) {
		const collectionName = collection.collectionName || collection.constructor.name;
		//@ts-ignore
		let indexes = collection.BaseClass.configuration.__indexes__ || [];
		return new Promise((resolve, reject)=>{
			db.createCollection(collectionName, async function(err, col) {
				if(err)reject(err);
				// @ts-ignore
				collection.collection = col;
				for(const index of indexes) {
					await col.createIndex(index);
				}
				resolve(col);
			});
		})

	}
}
let Schemas = {};

