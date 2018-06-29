import * as mongo from "./adapters/mongo";
import * as mysqlX from './adapters/mysql-x';
import { MongoClientOptions, Db, MongoClient, ObjectId } from "mongodb";
import { VaultCollection } from "./collection";
import { VaultModel } from "./model";
import { Database } from "./database";

export class NotInmplemented extends Error {
	constructor(msg:string = 'This method is not yet implemented.', ...args) {
		super(...[msg, ...args]);
		this.name = 'NotImplemented';
        Error.captureStackTrace(this, NotInmplemented);
    }
}
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
export function CollectionOfType(Model:typeof VaultModel, collectionName?: string) {
	return function (target: any, key: string) {
		Object.defineProperty(target, key, {
			configurable: true,
			writable: true,
			value: (driver:DatabaseDriver) => {
				switch(driver) {
					case DatabaseDriver.mysqlX:
						return new mysqlX.MySqlXCollection<mysqlX.Model>(Model, collectionName);
					case DatabaseDriver.mongo:
						return new mongo.MongoCollection<mongo.Model>(Model, collectionName)
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
		let DBBuilder:Database<any>;
		switch(configuration.driver) {
			case DatabaseDriver.mongo:
				DBBuilder = new mongo.DataBase(this, configuration, options);
				break;
			case DatabaseDriver.mysqlX:
				DBBuilder = new mysqlX.DataBase(this, configuration);
				break;
		}
		let ready:Promise<any> = new Promise( async resolve => {
			this.database = await DBBuilder.ready;
			let collections = [];
			let properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(p=>p!=='constructor');
			let BaseClasses = {};
			for(const property of properties) {
				this[property] = this[property](configuration.driver);
				if(this[property] instanceof VaultCollection) {
					BaseClasses[this[property].BaseClass.name] = this[property].BaseClass;
					collections.push(DBBuilder.register(this[property]));
				}
			}
			for(const property of properties) {
				if(this[property] instanceof VaultCollection) {
					(this[property] as VaultCollection<VaultModel>).setUpSchema(BaseClasses);
				}
			}
			Promise.all(collections).then(() => resolve(this));
		});
		this.ready = () => ready;
	}
}
