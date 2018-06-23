import { VaultModel, IVaultField } from "./model";
import { Relathionships, HasManyRelation, HasOneRelation, Related, RelationShipMode, RelathionshipsSingle } from "./related";

export function HasMany (model:typeof VaultModel, relation?:string) : IVaultField<Relathionships> {
	return {
		unic:false,
		kind: new HasManyRelation(model, relation),
		defaults: undefined
	};
}

export function hasOne (model:typeof VaultModel, relation?:string) : IVaultField<Relathionships> {
	return {
		unic:false,
		kind: new RelathionshipsSingle(model,relation, RelationShipMode.hasOne),
		defaults: undefined
	};
}
export function belongsTo(model:typeof VaultModel, relation?:string) : IVaultField<Related<VaultModel>> {
	return {
		unic: false,

		kind: new RelathionshipsSingle(model,relation, RelationShipMode.belongsTo),
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
