import "reflect-metadata";
import { MongoClientOptions } from "mongodb";
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
export enum Sorting {
	asc = 1,
	desc = -1
}
export enum RelationMode {
	id,
	record
}
export enum DatabaseDriver {
	mongo = 'mongo',
	mysqlX = 'mysql-x'
}
export interface DatabaseConfiguration {
	driver:DatabaseDriver
	host:string
	port:number
	database:string
	user?:string
	password?:string
	ssl?:boolean
}
// export function makeString(defautls?:string) {
// 	console.log(...arguments);
// 	throw new Error();
// 	// return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
// 	// 	console.log(target);
// 	// 	throw new Error();
//     // };
// }
export const MODELATTRIBUTES = 'vault-orm:design';
export function collection(Model:any, collectionName?: string) {
	return function (target: any, key: string) {
		Object.defineProperty(target, key, {
			configurable: true,
			writable: true,
			value: (driver:DatabaseDriver) => {
				let collection =new (require(`./adapters/${driver.toString()}`)).Collection;
				return collection.Initialize(Model, collectionName);
			}
		});
	}
}

export class VaultORM {
	public static RelationsMode: RelationMode = RelationMode.record
	private database: any
	// @ts-ignore
	ready():Promise<any>{return Promise.resolve(false);}
	constructor(configuration: DatabaseConfiguration, driver_options?:MongoClientOptions | any) {
		let DBBuilder:Database<any> = new (require(`./adapters/${configuration.driver.toString()}`)).DataBase(this, configuration, driver_options) as Database<any>;
		let ready:Promise<any> = new Promise( async resolve => {
			this.database = await DBBuilder.ready;
			let collections = [];
			let properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(p=>p!=='constructor');
			let BaseClasses = {};
			for(const property of properties) {
				this[property] = this[property](configuration.driver);
				if(this[property] instanceof VaultCollection) {
					BaseClasses[this[property].BaseClass.name] = this[property].BaseClass;
					let attributes = Reflect.getMetadata(MODELATTRIBUTES, this[property].BaseClass);
					this[property].BaseClass.configuration = this[property].BaseClass.configuration || attributes;
					collections.push(DBBuilder.register(this[property]));
				}
			}
			for(const property of properties) {
				if(this[property] instanceof VaultCollection) {
					(this[property] as VaultCollection<VaultModel<any>>).setUpSchema(BaseClasses);
				}
			}
			Promise.all(collections).then(() => resolve(this));
		});
		this.ready = () => ready;
		return this as any;
	}
}
