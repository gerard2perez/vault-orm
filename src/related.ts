import { VaultORM, RelationMode } from ".";
import { VaultCollection } from "./collection";
import { VaultModel } from "./model";
export enum RelationShipMode {
	hasMany,
	hasOne,
	belongsTo
}
export class ExtensibleFunction<T> {
	//@ts-ignore
	constructor(f) {
	  return Object.setPrototypeOf(f, new.target.prototype);
	}
}
// export class inter
export class RelathionshipsSingle<T extends VaultModel> extends ExtensibleFunction<T> {
	protected relateds:any
	protected collection: VaultCollection<VaultModel>
	private source: any;
	model: any;
	set(source:any, id:any) {
		switch(this.mode) {
			case RelationShipMode.belongsTo:
				if(id instanceof VaultModel) {
					if (source[this.target] !== id.id)source.state = 1;
					source[this.target] = id.id;
				} else {
					if (source[this.target] !== id)source.state = 1;
					source[this.target] = id;
				}
				break;
			case RelationShipMode.hasOne:
				if(id instanceof VaultModel) {
					id[this.source] = source.id;
				} else {
				// 	source[this.source] = id;
					console.log('add to targt');
				}
				break;
		}
	}
	find(source:any) {
		// if(this.relateds)return this.relateds;
		// return `${this.model.name}.find(${this.source}: ${this.target})`
		// @ts-ignore
		this.collection = this.model.prototype.vaultCollection() as VaultCollection<VaultModel>;
		let query = {[this.source]:source[this.target] || ''};
		// console.log(`${this.model.name}.find(${this.source}: ${this.target})`, query);
		this.relateds = this.collection.where(query);
		if( VaultORM.RelationsMode === RelationMode.id) {
			this.relateds.fields({_id:1});
		}
		return  this.relateds.findOne();
		// return this.relateds;
	}
	get (source:any, skipload:boolean=false) {
		if(skipload && VaultORM.RelationsMode === RelationMode.id && this.mode === RelationShipMode.belongsTo) {
			return {id: source[this.source]};
		} else {
			return this.find(source);
		}
	}
	public init(source:string, target:string, model:any) {
		this.source = source;
		this.target = this.link || target;
		this.model = model;
		this.link = this.link || target;
		if(this.source === 'id')this.source = '_id';
	}
	constructor(public target:any, public link:string, public mode:RelationShipMode) {
		//@ts-ignore
		super( (source:any, data:any=undefined)=>{
			if( (data || data === null) && typeof data !== 'boolean')this.set(source, data);
			else return this.get(source, data);
		});
	}
}
export abstract class Relathionships  {
	protected relateds:any
	protected collection: VaultCollection<VaultModel>
	constructor(private target:typeof VaultModel, private relationMode:RelationShipMode, protected relation:string) {
	}
	load(source:any, relation:string) {
		//@ts-ignore
		this.collection = this.target.prototype.vaultCollection() as VaultCollection<VaultModel>;
		this.relation = this.relation || relation;
		this.relateds = this.collection.where({[this.relation]:source});
		if ( VaultORM.RelationsMode === RelationMode.id)
			this.relateds = this.relateds.fields({_id:1});
		return this;
	}
	protected toJSON() {
		return this.relateds;
	}
}
export class HasManyRelation extends Relathionships {
	constructor (target:typeof VaultModel, relation:string) {
		super(target,RelationShipMode.hasMany,relation);

	}
	load(source:any, relation:string) {
		super.load(source, relation);
		this.relateds = this.relateds.find().then(res => {
			if(VaultORM.RelationsMode === RelationMode.id) {
				this.relateds = res.map(r=>r._id);
			} else {
				this.relateds = res;
			}
		});
		return this;
	}
}

export interface Related<T extends VaultModel> {
	():Promise<T>
	/**
	 * Set an object to match the relation
	 */
	(target:T):void
}
// export class Related<T extends VaultModel> extends RelathionshipsSingle<T> {
// 	constructor(target:T, link:string, mode:RelationShipMode) {
// 		//@ts-ignore
// 		super(target,mode, link);
// 	}
// }
export class HasOneRelation extends Relathionships {
	constructor (target:typeof VaultModel, relation:string) {
		super(target,RelationShipMode.hasMany,relation);

	}
	load(source:any, relation:string) {
		super.load(source, relation);
		this.relateds = this.relateds.findOne().then(res => {
			if(VaultORM.RelationsMode === RelationMode.id) {
				this.relateds = res._id;
			} else {
				this.relateds = res;
			}
		});
		return this;
	}
}
