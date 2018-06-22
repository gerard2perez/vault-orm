import { VaultORM, RelationMode } from ".";
import { VaultCollection } from "./collection";
import { VaultModel } from "./model";
export enum RelationKind {
	hasMany,
	hasOne,
	belongsTo
}
export abstract class Related {
	protected relateds:any
	protected collection: VaultCollection<VaultModel>
	constructor(private target:typeof VaultModel, private relationMode:RelationKind, protected relation:string) {
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
export class HasManyRelation extends Related {
	constructor (target:typeof VaultModel, relation:string) {
		super(target,RelationKind.hasMany,relation);

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

export class HasOneRelation extends Related {
	constructor (target:typeof VaultModel, relation:string) {
		super(target,RelationKind.hasMany,relation);

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
