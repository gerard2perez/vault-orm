import "reflect-metadata";
import { VaultModel, IVaultField } from "./model";
import { RelationShipMode, RelationSingle, HasManyRelation } from "./relationships";
import { MODELATTRIBUTES } from ".";
type retmodel = (o:any) => any;
type model = string | retmodel;
export function hasMany (model:model, relation?:string) : IVaultField<List<VaultModel<any>>> {
	return {
		unic:false,
		//@ts-ignore
		kind: new HasManyRelation('_id',relation, null, model, RelationShipMode.hasMany),
		defaults: undefined
	};
}
export function hasOne (model:model, relation?:string) : IVaultField<Related<VaultModel<any>>> {

	return {
		unic:false,
		// @ts-ignore
		kind: new RelationSingle('_id',relation, null, model, RelationShipMode.hasOne), // new RelationHasOne(model,relation, RelationShipMode.hasOne),
		defaults: undefined
	};
}
export function belongsTo(model:model, relation?:string) : IVaultField<Related<VaultModel<any>>> {
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
export let _Boolean:IIField<boolean> = makeField.bind(null, 'boolean');
export let _String:IIField<string> = makeField.bind(null, 'string');
export let _Number:IIField<number> = makeField.bind(null, 'number');
export let _Json:IIField<object> = makeField.bind(null, 'json');
export interface Related<T> {
	():Promise<T>
	/**
	 * Set an object to match the relation
	 */
	(target:T):void
}
export interface List<T> {
	():Promise<T[]>
	Add(T):void
	Remove(T):void
}
function getType(type:any) {
	switch(type) {
		case String:
			return _String();
		case Number:
			return _Number();
		default:
			return void 0;
	}
}
function extendModel(target:any, property:string, descriptor:PropertyDescriptor, options?:any) {
	let attributes = Reflect.getMetadata(MODELATTRIBUTES, target.constructor) || {};
	let type = Reflect.getMetadata("design:type", target, property);
	attributes[property] = options || getType(type);
	Reflect.defineMetadata(MODELATTRIBUTES, attributes, target.constructor);
}
export function Property(...args:any[]) : void | any {
	let [target, property, descriptor] = args;
	if (args.length>=2 && target instanceof Object && typeof property === 'string' && (descriptor === undefined || descriptor instanceof Object)) {
		extendModel(target, property, descriptor);
		return;
	}
	return (target: any, propertyName: string, propertyDescriptor?: PropertyDescriptor) : void => {
		extendModel(target, property, descriptor, args[0]);
	};
}

export function HasOne(modelResolver:(o:any)=>any) {
	return (target: any, property: string, descriptor?: PropertyDescriptor) : void => {
		extendModel(target, property, descriptor, hasOne(modelResolver));
	}
}
export function BelongsTo(modelResolver:(o:any)=>any) {
	return (target: any, property: string, descriptor?: PropertyDescriptor) : void => {
		extendModel(target, property, descriptor, belongsTo(modelResolver));
	}
}
