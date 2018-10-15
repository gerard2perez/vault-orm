import { VaultORM, RelationMode } from ".";
import { VaultCollection } from "./collection";
import { VaultModel, IEntityState } from "./model";
import { isBoolean } from "util";
export enum RelationShipMode {
	hasMany = 'hasmany',
	hasOne = 'hasone',
	belongsTo = 'belongsto'
}
export class ExtensibleFunction {
	//@ts-ignore
	constructor(f) {
	  return Object.setPrototypeOf(f, new.target.prototype);
	}
}
export class RelationSingle extends ExtensibleFunction {
	private connection: VaultCollection<VaultModel<any>>
	constructor(public childKey:string, public parentKey:string, private sourceModel: VaultModel<any>, private parentModel: VaultModel<any>, public mode:RelationShipMode) {
		super(  (host:VaultModel<any>, data:boolean|null|VaultModel<any>) => {
			if( (data instanceof VaultModel || data === null) && !isBoolean(data)) {
				return this.set(host, data);
			} else {
				return this.get(host, data);
			}
		});
	}
	init(key:string, sourceModel: VaultModel<any>, parentModel: VaultModel<any>) {
		if(this.mode === RelationShipMode.hasOne) {
			if(!this.parentKey)
				this.parentKey = key;
		} else {
			if(!this.childKey)
				this.childKey = key;
		}
		this.sourceModel = sourceModel;
		this.parentModel = parentModel;
		this.connection = this.getConnection(sourceModel) || this.getConnection(parentModel);
		return this;
	}
	set(host:VaultModel<any>, target:VaultModel<any>) {
		switch(this.mode) {
			case RelationShipMode.belongsTo:
				let id = target ? target.id : undefined;
				if (host[this.childKey] !== id)VaultModel.storage.get(host).state = IEntityState.modified;
				host[this.childKey] = id;
				break;
			case RelationShipMode.hasOne:
				VaultModel.storage.get(host).save_hooks.push(()=>{
					if(!target) {
						return this.connection.update({[this.parentKey]: host[this.childKey]}, {[this.parentKey]: undefined});
					} else {
						target[this.parentKey] = host.id;
						return this.connection.update({_id: target.id}, {[this.parentKey]: host.id});
					}
				});
				break;
		}
	}
	get (host:any, skipload:boolean = false) {
		if(skipload && this.mode === RelationShipMode.belongsTo && VaultORM.RelationsMode == RelationMode.id)  {
			return Promise.resolve({id: host[this.childKey]});
		} else {
			return this.connection.findOne({[this.parentKey]: host[this.childKey]});
		}
	}
	getConnection(model:any) {
		if(model)return model.prototype.vaultCollection();
	}
}
export class HasManyRelation extends ExtensibleFunction {
	private connection: VaultCollection<VaultModel<any>>
	constructor(public childKey:string, private parentKey:string, private sourceModel: VaultModel<any>, private parentModel: VaultModel<any>, public mode:RelationShipMode) {
		super(  (host:VaultModel<any>, data:boolean|null|VaultModel<any>) => {
			let act = ()=> this.get(host);
			//@ts-ignore
			act.Add = (data) => this.Add(host,data);
			//@ts-ignore
			act.Remove = (data) => this.Remove(host,data);
			return act;

		});
	}
	get(host:any, skipload:boolean = false){
		return this.connection.where({[this.parentKey]: host[this.childKey]}).find();
	}
	Add(host:VaultModel<any>, target:VaultModel<any>){
		if(target.id) {
			VaultModel.storage.get(host).save_hooks.push(()=>{
				target[this.parentKey] = host.id;
				return this.connection.update({_id: target.id}, {[this.parentKey]: host.id});
			});
		}
	}
	Remove(host:any, target:VaultModel<any>){
		if(target.id) {
			VaultModel.storage.get(host).save_hooks.push(()=>{
				// console.log(`${this.connection.collectionName}.update({_id:${target.id}},{${this.parentKey}: undefined})`);
				target[this.parentKey] = host.id;
				return this.connection.update({_id: target.id}, {[this.parentKey]: undefined});
			});
		}
	}
	init(key:string, sourceModel: VaultModel<any>, parentModel: VaultModel<any>) {
		if(this.mode === RelationShipMode.hasMany) {
			if(!this.parentKey)
				this.parentKey = this.parentKey || key;
		}
		this.sourceModel = sourceModel;
		this.parentModel = parentModel;
		this.connection = this.getConnection(sourceModel) || this.getConnection(parentModel);
		return this;
	}
	getConnection(model:any) {
		if(model)return model.prototype.vaultCollection();
	}
}
