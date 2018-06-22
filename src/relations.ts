import { VaultModel, IVaultField } from "./model";
import { Related, HasManyRelation, HasOneRelation } from "./related";

export function HasMany (model:typeof VaultModel, relation?:string) : IVaultField<Related> {
	return {
		unic:false,
		kind: new HasManyRelation(model, relation),
		defaults: undefined
	};
}

export function HasOne (model:typeof VaultModel, relation?:string) : IVaultField<Related> {
	return {
		unic:false,
		kind: new HasOneRelation(model, relation),
		defaults: undefined
	};
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
