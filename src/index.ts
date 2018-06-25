import { VaultModel } from "./model";
import { MongoClientOptions, Db, MongoClient, ObjectId } from "mongodb";
import { VaultCollection } from "./collection";

export enum RelationMode {
	id,
	record
}
export declare type Id = ObjectId | string | number;
export interface DatabaseConfiguration {
	host:string
	port:number
	database:string
}
export function CollectionOfType(Model:typeof VaultModel, collectionName?: string) {
	return function (target: any, key: string) {
	  Object.defineProperty(target, key, {
		configurable: false,
		value: new VaultCollection<VaultModel>(Model, collectionName)
	  });
	}
  }
export class VaultORM {
	public static RelationsMode: RelationMode = RelationMode.record
	private database: Db
	ready: Promise<any>
	constructor(configuration: DatabaseConfiguration, options?:MongoClientOptions) {
		this.ready = new Promise((resolve)=>{
			MongoClient.connect(`mongodb://${configuration.host}:${configuration.port}`,options).then(client => {
				this.database = client.db(configuration.database);
				let collections = [];
				let properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
				let BaseClasses = {};
				for(const property of properties) {
					if(this[property] instanceof VaultCollection) {
						BaseClasses[this[property].BaseClass.name] = this[property].BaseClass;
						collections.push(this.register(this.database, this[property]));
					}
				}
				for(const property of properties) {
					if(this[property] instanceof VaultCollection) {
						(this[property] as VaultCollection<VaultModel>).setUpSchema(BaseClasses);
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
