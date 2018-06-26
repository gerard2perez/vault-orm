import { VaultModel, IVaultField } from "./adapters/mongo";
import { Related, RelationShipMode, Collection, RelationSingle, HasManyRelation } from "./related";

export function hasMany (model:string, relation?:string) : IVaultField<Collection<VaultModel>> {
	return {
		unic:false,
		//@ts-ignore
		kind: new HasManyRelation('_id',relation, null, model, RelationShipMode.hasMany),
		defaults: undefined
	};
}

export function hasOne (model:string, relation?:string) : IVaultField<Related<VaultModel>> {

	return {
		unic:false,
		// @ts-ignore
		kind: new RelationSingle('_id',relation, null, model, RelationShipMode.hasOne), // new RelationHasOne(model,relation, RelationShipMode.hasOne),
		defaults: undefined
	};
}
export function belongsTo(model:string, relation?:string) : IVaultField<Related<VaultModel>> {
	return {
		unic: false,
		// @ts-ignore
		kind: new RelationSingle(relation, '_id', null, model, RelationShipMode.belongsTo),
		defaults: undefined
	}
}
export interface IIField<T> {
	() : IVaultField<T>;
	(defaults:T) : IVaultField<T>;
	(unic:boolean, defaults?:T) : IVaultField<T>;
}
function makeField<T>(kind:string, unic?:boolean | T, defaults?:T) {
	if(unic !==undefined && typeof unic !== 'boolean' ) {
		defaults = unic;
		unic = false;
	}
	unic = unic || false;
	return {
		kind,
		unic,
		defaults
	};
}
export let Boolean:IIField<boolean> = makeField.bind(null, 'boolean');
export let String:IIField<string> = makeField.bind(null, 'string');
export let Number:IIField<number> = makeField.bind(null, 'number');
export let Json:IIField<object> = makeField.bind(null, 'json');
