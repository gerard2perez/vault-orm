/**
 * @module @gerard2p/vault-orm
 */
import "reflect-metadata";
import { MongoClientOptions } from "mongodb";
import { VaultCollection } from "./collection";
import { VaultModel } from "./model";
import { Database } from "./database";
import { writeFileSync } from "fs";
import { ensureDirSync } from "fs-extra";

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
export interface DatabaseConfiguration {
	host:string
	port:number
	database:string
	user?:string
	password?:string
	ssl?:boolean
}
export const MODELATTRIBUTES = 'vault-orm:design';
export function collection(Model:any, collectionName?: string) {
	return function (target: any, key: string) {
		Object.defineProperty(target, key, {
			configurable: true,
			writable: true,
			value: (driver:string) => {
				let collection =new (require(`./adapters/${driver}`)).Collection;
				return collection.Initialize(Model, collectionName);
			}
		});
	}
}
export class VaultORM {
	public static RelationsMode: RelationMode = RelationMode.record
	private database: any
	protected driver:string
	// @ts-ignore
	ready():Promise<any>{return Promise.resolve(false);}
	after_constructor(configuration: DatabaseConfiguration, driver_options?:MongoClientOptions | any) {
		let DBBuilder:Database<any> = new (require(`./adapters/${this.driver}/database`)).DataBase(this, configuration, driver_options) as Database<any>;
		let ready:Promise<any> = new Promise( async resolve => {
			this.database = await DBBuilder.ready;
			let collections = [];
			let properties = Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(p=>p!=='constructor');
			let BaseClasses = {};
			let METADATABASE = {};
			for(const property of properties) {
				this[property] = this[property](this.driver);
				if(this[property] instanceof VaultCollection) {
					BaseClasses[this[property].BaseClass.name] = this[property].BaseClass;
					let attributes = Reflect.getMetadata(MODELATTRIBUTES, this[property].BaseClass);
					METADATABASE[property] = attributes;
					this[property].BaseClass.configuration = this[property].BaseClass.configuration || attributes;
					collections.push(DBBuilder.register(this[property]));
				}
			}
			ensureDirSync('./migrations/');
			writeFileSync(`./migrations/${configuration.database}.${this.driver}.json`, JSON.stringify(METADATABASE, null, 2));
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
