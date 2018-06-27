import * as mongo from "./adapters/mongo";
import * as mysqlX from './adapters/mysql-x';
import { MongoClientOptions, Db, MongoClient, ObjectId } from "mongodb";
import { VaultCollection } from "./collection";
export enum RelationMode {
	id,
	record
}
export enum DatabaseDriver {
	mongo,
	mysqlX
}
export declare type Id = ObjectId | string | number;
export interface DatabaseConfiguration {
	driver:DatabaseDriver
	host:string
	port:number
	database:string
	user?:string
	password?:string
	ssl?:boolean
}
export function CollectionOfType(Model:typeof mongo.VaultModel, collectionName?: string) {
	return function (target: any, key: string) {
		console.log(key, 'create function');
		Object.defineProperty(target, key, {
			configurable: true,
			writable: true,
			value: (driver:DatabaseDriver) => {
				switch(driver) {
					case DatabaseDriver.mysqlX:
						return new mysqlX.MySqlXCollection<any>(Model, collectionName);
					case DatabaseDriver.mongo:
						return new VaultCollection<mongo.VaultModel>(Model, collectionName)
				}
			}
		});
	}
}
export class VaultORM {
	public static RelationsMode: RelationMode = RelationMode.record
	private database: any
	ready():Promise<any>{return Promise.resolve(false);}
	constructor(configuration: DatabaseConfiguration, options?:MongoClientOptions) {
		let ready:Promise<any> = Promise.resolve(false);
		let DBBuilder:any;
		switch(configuration.driver) {
			case DatabaseDriver.mongo:
				ready = mongo.connect(configuration, options);
				break;
			case DatabaseDriver.mysqlX:
				DBBuilder = new mysqlX.DataBase(this, configuration);
				ready = DBBuilder.ready();
				break;
		}
		ready = new Promise( async resolve => {
			this.database = await ready;
			let collections = [];
			let properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(p=>p!=='constructor');
			let BaseClasses = {};
			for(const property of properties) {
				this[property] = this[property](configuration.driver);
				if(this[property] instanceof VaultCollection) {
					BaseClasses[this[property].BaseClass.name] = this[property].BaseClass;
					if( DBBuilder) {
						collections.push(DBBuilder.register(this[property]));
					} else {
						collections.push(this.register(this.database, this[property]));
					}
				}
			}
			for(const property of properties) {
				if(this[property] instanceof VaultCollection) {
					(this[property] as VaultCollection<mongo.VaultModel>).setUpSchema(BaseClasses);
				}
			}
			Promise.all(collections).then(() => resolve(this));
		});
		this.ready = () => ready;
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
