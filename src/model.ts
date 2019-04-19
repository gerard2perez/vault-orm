/**
 * @module @gerard2p/vault-orm/model
 */
import { RelationSingle, RelationShipMode } from "./relationships";
import { VaultORM, RelationMode, DatabaseConfiguration, NotInmplemented } from "./";
import { inspect } from 'util';
import { IValultConfiguration, IEntityState } from "./types";
export class IVaultModel {
	protected static objects:any;
	// istanbul ignore next
	private static Warning(caller:any, func:string, ...args:any[]) {
		console.warn('Method for this reposity is not implemented.')
		return caller.objects[func](...args);
		// throw new NotInmplemented('Method for this reposity is not implemented.');
	}
	// istanbul ignore next
	static findOne(...args:any[]) {
		return IVaultModel.Warning(this, 'findOne', ...args);
	}
	// istanbul ignore next
	static firstOrDefault(...args:any[]) {
		return IVaultModel.Warning(this, 'firstOrDefault', ...args);
	}
	// istanbul ignore next
	static findOrCreate(...args:any[]) {
		return IVaultModel.Warning(this, 'findOrCreate', ...args);
	}
	// istanbul ignore next
	static find(...args:any[]) {
		return IVaultModel.Warning(this, 'find', ...args);
	}
	// istanbul ignore next
	static findAll(...args:any[]) {
		return IVaultModel.Warning(this, 'findAll', ...args);
	}
	// istanbul ignore next
	static remove(...args:any[]) {
		return IVaultModel.Warning(this, 'remove', ...args);
	}
	// istanbul ignore next
	static update(...args:any[]) {
		return IVaultModel.Warning(this, 'update', ...args);
	}
	// istanbul ignore next
	static count(...args:any[]) {
		return IVaultModel.Warning(this, 'count', ...args);
	}
	// istanbul ignore next
	static fields(...args:any[]) {
		return IVaultModel.Warning(this, 'fields', ...args);
	}
	// istanbul ignore next
	static where(...args:any[]) {
		return IVaultModel.Warning(this, 'where', ...args);
	}
	// istanbul ignore next
	static orWhere(...args:any[]) {
		return IVaultModel.Warning(this, 'orWhere', ...args);
	}
	// istanbul ignore next
	static limit(...args:any[]) {
		return IVaultModel.Warning(this, 'limit', ...args);
	}
	// istanbul ignore next
	static take(...args:any[]) {
		return IVaultModel.Warning(this, 'take', ...args);
	}
	// istanbul ignore next
	static sort(...args:any[]) {
		return IVaultModel.Warning(this, 'sort', ...args);
	}
	// istanbul ignore next
	static skip(...args:any[]) {
		return IVaultModel.Warning(this, 'skip', ...args);
	}
	// istanbul ignore next
	static toId(...args:any[]) {
		return IVaultModel.Warning(this, 'toId', ...args);
	}
	// istanbul ignore next
	static explain(...args:any[]) {
		return IVaultModel.Warning(this, 'explain', ...args);
	}
	// istanbul ignore next
	protected persist(connection:any, update_object:any): Promise<boolean> { throw new NotInmplemented(); }
	// istanbul ignore next
	protected destroy(connection:any): Promise<boolean> { throw new NotInmplemented(); }
}
export class VaultModel<ID> extends IVaultModel {
	public isVaultORM: boolean = true
	protected static storage: WeakMap<VaultModel<any>, any> = new WeakMap();
	protected static configuration: IValultConfiguration
	protected static collectionName?: string
	protected static schema?: any
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
		let proxied:VaultModel<any> = VaultModel.getProxyObject(un_proxy, relations, raw);
		VaultModel.storage.set(proxied, data);
		function make(id:any, model:any) {
			let core = new model();
			core._id = id;
			return core;
		}
		for(const relation of Object.keys(OwnRelations)) {
			if(OwnRelations[relation] instanceof Array) {
				for(const rel of OwnRelations[relation]) {
					proxied[relation].Add( make(rel, relations[relation].parentModel) );
				}
			} else {
				proxied[relation]( make(OwnRelations[relation], relations[relation].sourceModel) );
			}
		}
		return proxied;
	}
	constructor(information: any) {
		super();
		let un_proxy = this;
		let data = {
			save_hooks: [],
			state: IEntityState.unchanged
		};
		const collection = Object.getPrototypeOf(this).vaultCollection();
		let {raw, relations} = Object.getPrototypeOf(this).newSchema;
		let own_properties = Object.keys(raw);
		let own_relations = Object.keys(relations);
		let OwnRelations = {};
		if(information.id) {
			information._id = collection.toId(information.id);
			delete information.id;
		}
		for (const property of own_properties) {
			this[property] = information[property] || undefined;
		}
		if(!(information instanceof VaultModel))
		for(const relation of own_relations) {
			if(information[relation]) {
				if(relations[relation].mode === RelationShipMode.belongsTo || relations[relation].mode === RelationShipMode.hasOne) {
					OwnRelations[relation] = collection.toId(information[relation].id ? information[relation].id:information[relation]);
				} else if (relations[relation].mode === RelationShipMode.hasMany) {
					OwnRelations[relation] = information[relation].map(r=>collection.toId(r));
				}

			}
		}
		return VaultModel.createProxy(un_proxy, OwnRelations, data);
	}
	private static getProxyObject(un_proxy: any, relations: any, raw: any): VaultModel<any> {
		let proxied;
		proxied = new Proxy(un_proxy, {
			get(target: any, property: any) {
				if (Object.getOwnPropertyNames(relations).includes(property)) {
					if (relations[property] instanceof RelationSingle) {
						return (id) => {
							return relations[property](proxied, id);
						};
					}
					else {
						return relations[property](proxied);
					}
				}
				else {
					if (target[property] && target[property]._id && target[property]._id._bsontype) {
						throw new Error('MAMA');
					}
					return target[property];
				}
			},
			set(target, property, value) {
				if (relations[property] && relations[property] instanceof RelationSingle) {
					return false;
				}
				else if (raw[property]) {
					target[property] = value;
				}
				else {
					// istanbul ignore next
					throw new Error(`That property '${property.toString()}' does not exist in ${un_proxy.constructor.name}`);
				}
				return true;
			}
		});
		return proxied;
	}

	async json(loaddep:boolean=true, avoid_recursive:any=null) {
		let { mask, raw, own, relations } = Object.getPrototypeOf(this).newSchema;
		if(avoid_recursive === null) {
			avoid_recursive = relations;
		}
		let jsoned = {};
		let dep_relations_name = [];
		let dep_relations = [];
		for (const property of Object.keys(mask)) {
			if(property === 'isVaultORM')continue;
			jsoned[property] = await this[property] || null;
			if (jsoned[property] instanceof Function && loaddep) {
				dep_relations_name.push(property);
				dep_relations.push( jsoned[property](true).then(ijson=>{
					function load(ijson) {
						return ijson.json(false).then(ijson=>{
							return !ijson ? null : (VaultORM.RelationsMode === RelationMode.id ? ( typeof ijson.id === 'object' ? ijson.id.toString() : ijson.id) : ijson);
						});
					}
					if(ijson && ijson instanceof Array && ijson[0] && ijson[0].isVaultORM) {
						return Promise.all(ijson.map(json=>load(json)));
					} else if (ijson && ijson.isVaultORM) {
						return load(ijson);
					} else {
						return ijson || null;
					}
				}));
			} else if (jsoned[property] instanceof Function) {
				jsoned[property] = (await jsoned[property](avoid_recursive !== relations)).id;
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
	// istanbul ignore next
	protected toJSON() {
		throw new Error('You must first convert the object to json object using .json(), please note this is an async function');
	}
	// istanbul ignore next
	[inspect.custom](depth) {
		let Schema = Object.getPrototypeOf(this).newSchema.mask;
		let own_properties = Object.keys(Schema);
		let jsoned = {};
		for (const property of own_properties) {
			jsoned[property] = this[property];
		}
		return `${this.constructor.name} ` + JSON.stringify(jsoned, null, 2);
	}
	// istanbul ignore next
	protected inspect(...args) {
		return this[inspect.custom](args[0]);
	}
	async save() {
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
			if(r[0])this._id = r[0];
			for (const key of Object.keys(update_object)) {
				if (['_id', 'updated', 'created'].includes(key)) continue;
				this[key] = update_object[key];
			}
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
