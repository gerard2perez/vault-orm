import { Collection, ObjectId } from "mongodb";
import { VaultCollection } from "./collection";
import * as inflector from 'inflection';
import { Relathionships, RelathionshipsSingle } from "./related";
import { SSL_OP_CIPHER_SERVER_PREFERENCE } from "constants";
import { VaultORM, RelationMode } from ".";
import {inspect} from 'util';
export interface IVaultField<T> {
	kind:any
	defaults?:T
	unic?:boolean
}
export interface IValultConfiguration {
	[p:string]:IVaultField<any>
}

enum IEntityState {
	created,
	modified,
	unchanged,
	deleted,
	detached
}
export abstract class VaultModel  {
	private state:IEntityState
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
	private static createProxy(un_proxy:any, OwnRelations) {
		let Relations = Object.getPrototypeOf(un_proxy).relations;
		let Schema = Object.getPrototypeOf(un_proxy).schema;
		let proxied = new Proxy(un_proxy, {
			get (target:any, property:any) {
				if (Object.getOwnPropertyNames(Relations).includes(property)) {
					if ( Relations[property].kind instanceof RelathionshipsSingle) {
						return OwnRelations[property];
					} else {
						return target[Relations[property]];
					}
				} else {
					return un_proxy[property];
				}

			},
			set(obj, property, value) {
				if(Relations[property] && Relations[property].kind instanceof RelathionshipsSingle) {
					Relations[property].kind(value);
				} else if (Schema[property]) {
					obj[property] = value;
				} else {
					throw new Error(`That property '${property.toString()}' does not exist in ${un_proxy.constructor.name}`);
				}
				return true;
			}
		});
		return proxied;
	}
	constructor(information:any={}){
		let un_proxy = this;
		let Schema = Object.getPrototypeOf(this).schema;
		let Relations = Object.getPrototypeOf(this).relations;
		let own_properties = Object.keys(Schema).concat(Object.keys(Relations));
		let OwnRelations = {};
		for(const property of own_properties ) {
			this[property] = information[property] || undefined;
			// if(information[property]) {
			// 	this[property] = information[property];
			// } else if(Schema[property] && Schema[property].defaults) {
			// 	this[property] = Schema[property].defaults;
			// }
			//  else if (Schema[property]) {
			// 	this[property] = undefined;
			// }
			if(Relations[property] && Relations[property].kind instanceof RelathionshipsSingle) {
				OwnRelations[property] = (id) => Relations[property].kind(un_proxy, id);
			}
		}
		if(un_proxy._id)un_proxy.state = IEntityState.unchanged;
		return VaultModel.createProxy(un_proxy, OwnRelations);
	}
	protected async loadRelation() {
		for(const key of Object.getOwnPropertyNames(this)) {
			if(this[key] instanceof Relathionships) {
				await this[key].relateds;
			}
		}
	}
	async json () {
		let Schema = Object.getPrototypeOf(this).maskedSchema;
		let jsoned = {};
		for(const property of Object.keys(Schema)) {
			jsoned[property] = await this[property] || null;
			if(jsoned[property] instanceof Function) {
				let ijson = await jsoned[property](true);
				if(ijson && ijson.json)ijson = await ijson.json();
				jsoned[property] = !ijson ? null : (VaultORM.RelationsMode === RelationMode.id ? ijson.id : ijson);
			}
		}
		return jsoned;
	}
	protected toJSON() {
		throw new Error('You must first convert the object to json object using .json(), please note this is an async function');
		// let Schema = Object.getPrototypeOf(this).maskedSchema;
		// let own_properties = Object.keys(Schema);
		// let jsoned = {};
		// for(const property of own_properties ) {
		// 	jsoned[property] = this[property];
		// }
		// return jsoned;
	}
	[inspect.custom](depth) {
		let Schema = Object.getPrototypeOf(this).maskedSchema;
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
		console.log(this.state.toString());
		let Schema = Object.getPrototypeOf(this).schema;
		if(!this.updated)this.created = new Date();
		this.updated = new Date();
		let collection = (Object.getPrototypeOf(this).collection() as Collection);
		let update_object = {};
		for(const key of Object.keys(Schema)) {
			if(key === '_id')continue;
			update_object[key] = this[key] || Schema[key].defaults;
		}
		if(this.id === null) {
			return collection.insertOne(update_object).then((inserted)=>{
				//@ts-ignore
				this._id = inserted.insertedId;
				return true;
			});
		} else {
			return collection.findOneAndUpdate({_id:this.id},update_object).then(error=>{
				if(!error.lastErrorObject.updatedExisting) {
					console.log(error, {_id:this.id},update_object);
					throw new Error(error.lastErrorObject);
				}
				return true;
			});
		}
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
