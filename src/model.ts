import { RelationSingle } from "./relationships";
import { VaultORM, RelationMode, DatabaseConfiguration, NotInmplemented } from "./";
import { inspect } from 'util';
export interface IVaultField<T> {
	kind: any
	defaults?: T
	unic?: boolean
}
export interface IValultConfiguration {
	[p: string]: IVaultField<any>
}
export enum IEntityState {
	created = <any>'created',
	modified = <any>'modified',
	unchanged = <any>'unchanged',
	deleted = <any>'deleted',
	detached = <any>'detached',
}
export class IVaultModel {
	protected persist(connection:any, update_object:any): Promise<boolean> { throw new NotInmplemented(); }
	protected destroy(connection:any): Promise<boolean> { throw new NotInmplemented(); }
}
export abstract class VaultModel<ID> extends IVaultModel {
	static storage: WeakMap<VaultModel<any>, any> = new WeakMap();
	static configuration: IValultConfiguration
	static collectionName?: string
	static schema?: any
	/**
	 * Read Only Please
	 */
	protected _id: ID = null
	public get id(): ID {
		return this._id;
	}
	updated: Date
	created: Date
	private static createProxy(un_proxy: any, OwnRelations: any, data: any) {
		let { mask, raw, own, relations } = Object.getPrototypeOf(un_proxy).newSchema;
		let proxied = new Proxy(un_proxy, {
			get(target: any, property: any) {
				if (Object.getOwnPropertyNames(relations).includes(property)) {
					if (relations[property] instanceof RelationSingle) {
						return (id) => {
							return relations[property](proxied, id);
						};
					} else {
						return relations[property](proxied);
					}
				} else {
					if (target[property] && target[property]._id && target[property]._id._bsontype) {
						throw new Error('MAMA');
					}
					return target[property];
				}

			},
			set(target, property, value) {
				if (relations[property] && relations[property] instanceof RelationSingle) {
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
	constructor(information: any = {}) {
		super();
		let un_proxy = this;
		let data = {
			save_hooks: [],
			state: IEntityState.unchanged
		};
		let own_properties = Object.keys(Object.getPrototypeOf(this).newSchema.raw);
		let OwnRelations = {};
		for (const property of own_properties) {
			this[property] = information[property] || undefined;
		}
		return VaultModel.createProxy(un_proxy, OwnRelations, data);
	}
	async json(loaddep:boolean=true) {
		let { mask, raw, own, relations } = Object.getPrototypeOf(this).newSchema;
		let jsoned = {};
		let dep_relations_name = [];
		let dep_relations = [];
		for (const property of Object.keys(mask)) {
			jsoned[property] = await this[property] || null;
			if (jsoned[property] instanceof Function && loaddep) {
				dep_relations_name.push(property);
				dep_relations.push( jsoned[property](true).then(ijson=>{
					if (ijson && ijson.json) {
						return ijson.json(false).then(ijson=>{
							return !ijson ? null : (VaultORM.RelationsMode === RelationMode.id ? ( typeof ijson.id === 'object' ? ijson.id.toString() : ijson.id) : ijson);
						});
					}
					return ijson || null;
				}));
			} else if (jsoned[property] instanceof Function) {
				delete jsoned[property];
			}
			let dep_props = await Promise.all(dep_relations)
			for(let i =0; i< dep_props.length; i ++) {
				jsoned[dep_relations_name[i]] = dep_props[i];
			}
			if(property === 'id' && typeof jsoned[property] === 'object')jsoned[property] = jsoned[property].toString();
			if(jsoned[property] instanceof Date)jsoned[property]=jsoned[property].toISOString();
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
		for (const property of own_properties) {
			jsoned[property] = this[property];
		}
		return `${this.constructor.name} ` + JSON.stringify(jsoned, null, 2);
	}
	protected inspect(...args) {
		return this[inspect.custom](...args);
	}
	async save() {
		// console.log(VaultModel.storage.get(this).save_hooks);
		// if ( VaultModel.storage.get(this).state === IEntityState.unchanged )return false;
		let { mask, raw, own, relations } = Object.getPrototypeOf(this).newSchema;
		if (!this.updated) this.created = new Date();
		this.updated = new Date();
		let update_object = {};
		for (const key of Object.keys(raw)) {
			if (key === '_id') continue;
			let value = this[key] || raw[key].defaults;
			if(value) {
				update_object[key] = value;
			}
		}
		let hooks = VaultModel.storage.get(this).save_hooks.map(h => h());
		let result = this.persist(Object.getPrototypeOf(this).collection(), update_object);
		return Promise.all([result, ...hooks]).then(r => {
			VaultModel.storage.get(this).save_hooks = [];
			if(r[0])
				this._id = r[0];
			return 	!!this._id;
		});
	}
	delete() {
		return this.destroy(Object.getPrototypeOf(this).collection()).then(success => {
			if(success)this._id = null;
			return success;
		}).catch(res => { throw new Error(JSON.stringify(res, null, 2)); });;
	}
}
