import { RelationSingle } from "../related";
import { VaultORM, RelationMode, DatabaseConfiguration } from "../";
import {inspect} from 'util';
import { MongoClientOptions, Db, Collection, MongoClient, ObjectId } from "mongodb";
import { VaultCollection } from "../collection";

export function connect(configuration:DatabaseConfiguration, options?:MongoClientOptions)  {
	return MongoClient.connect(`mongodb://${configuration.host}:${configuration.port}`,options).then(client => {
		return client.db(configuration.database);
	});
}
export interface IVaultField<T> {
	kind:any
	defaults?:T
	unic?:boolean
}
export interface IValultConfiguration {
	[p:string]:IVaultField<any>
}

export enum IEntityState {
	created = <any>'created',
	modified= <any>'modified',
	unchanged= <any>'unchanged',
	deleted= <any>'deleted',
	detached= <any>'detached',
}
export abstract class VaultModel  {
	static storage:WeakMap<VaultModel, any> = new WeakMap();
	static configuration: IValultConfiguration
	static collectionName?:string
	static schema?:any
	/**
	 * Read Only Please
	 */
	private _id: ObjectId = null
	public get id () {
		//@ts-ignore
		return this._id as ObjectId;
	}
	updated: Date
	created: Date
	private static createProxy(un_proxy:any, OwnRelations:any, data:any) {
		// let Relations = Object.getPrototypeOf(un_proxy).relations;
		// let Schema = Object.getPrototypeOf(un_proxy).schema;
		let {mask, raw, own, relations} = Object.getPrototypeOf(un_proxy).newSchema;
		let proxied = new Proxy(un_proxy, {
			get (target:any, property:any) {
				if (Object.getOwnPropertyNames(relations).includes(property)) {
					if ( relations[property] instanceof RelationSingle) {
						return (id) => relations[property](proxied, id);
					} else {
						return relations[property](proxied);
					}
				} else {
					return target[property];
				}

			},
			set (target, property, value) {
				if(relations[property] && relations[property] instanceof RelationSingle) {
					// relations[property].kind(value);
					return false;
				} else if (raw[property]) {
					target[property] = value;
				} else {
					throw new Error(`That property '${property.toString()}' does not exist in ${un_proxy.constructor.name}`);
				}
				return true;
			}
		});
		VaultModel.storage.set(proxied, data);
		return proxied;
	}
	constructor(information:any={}){
		let un_proxy = this;
		let data = {
			save_hooks: [],
			state: IEntityState.unchanged
		};
		// let Schema = Object.getPrototypeOf(this).schema;
		// let Relations = Object.getPrototypeOf(this).relations;
		// let own_properties = Object.keys(Schema).concat(Object.keys(Relations));
		let own_properties = Object.keys(Object.getPrototypeOf(this).newSchema.raw);
		let OwnRelations = {};
		for(const property of own_properties ) {
			this[property] = information[property] || undefined;
			// if(Relations[property] && Relations[property].kind instanceof RelationOneToOne) {
			// 	OwnRelations[property] = (id) => Relations[property].kind(un_proxy, id);
			// }
		}
		return VaultModel.createProxy(un_proxy, OwnRelations, data);
	}
	async json () {
		let {mask, raw, own, relations} = Object.getPrototypeOf(this).newSchema;
		let jsoned = {};
		for(const property of Object.keys(mask)) {
			// console.log(property, this[property], this[property] instanceof RelationSingle);
			jsoned[property] = await this[property] || null;
			if(jsoned[property] instanceof Function) {
				let ijson = await jsoned[property](true);
				if(ijson && ijson.json)ijson = await ijson.json();
				jsoned[property] = !ijson ? null : (VaultORM.RelationsMode === RelationMode.id ? ijson.id : ijson);
				jsoned[property] = jsoned[property] || null;
			}
		}
		return jsoned;
	}
	protected toJSON() {
		throw new Error('You must first convert the object to json object using .json(), please note this is an async function');
	}
	[inspect.custom](depth) {
		let Schema = Object.getPrototypeOf(this).newSchema.mask;
		let own_properties = Object.keys(Schema);
		let jsoned = {};
		for(const property of own_properties ) {
			jsoned[property] = this[property];
		}
        return `${this.constructor.name} ` + JSON.stringify(jsoned, null, 2);
	}
	protected inspect(...args) {
		return this[inspect.custom](...args);
    }
	async save(){
		// console.log(VaultModel.storage.get(this).save_hooks);
		// if ( VaultModel.storage.get(this).state === IEntityState.unchanged )return false;
		let {mask, raw, own, relations} = Object.getPrototypeOf(this).newSchema;
		if(!this.updated)this.created = new Date();
		this.updated = new Date();
		let collection = (Object.getPrototypeOf(this).collection() as Collection);
		let update_object = {};
		for(const key of Object.keys(raw)) {
			if(key === '_id')continue;
			update_object[key] = this[key] || raw[key].defaults;
		}
		let hooks = VaultModel.storage.get(this).save_hooks.map(h=>h());
		// for(const relation of Object.keys(Relations)) {
		// 	if(Relations[relation].kind instanceof RelationHasOne) {
		// 		console.log('proced save');
		// 	}
		// }
		let result = Promise.resolve(false);
		if(!this.id) {
			result = collection.insertOne(update_object).then((inserted)=>{
				//@ts-ignore
				this._id = inserted.insertedId;
				return true;
			});
		} else {
			result = collection.findOneAndUpdate({_id:this.id},update_object).then(error=>{
				if(!error.lastErrorObject.updatedExisting) {
					console.log(error, {_id:this.id},update_object);
					throw new Error(error.lastErrorObject);
				}
				return true;
			});
		}
		// console.log('-----------');
		// console.log(hooks);
		return Promise.all([result, ...hooks]).then(r=>{
			VaultModel.storage.get(this).save_hooks = [];
			return r[0];
		});
	}
	async delete() {
		let collection = (Object.getPrototypeOf(this).collection() as Collection);
		return collection.deleteOne({_id:this._id}).then(result=>{
			if (result.deletedCount === 1) {
				//@ts-ignore
				this._id = null;
				return true;
			} else {
				throw new Error(JSON.stringify(result, null, 2));
			}
		});
	}
}
