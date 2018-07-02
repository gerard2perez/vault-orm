import "reflect-metadata";
import { VaultModel, IVaultField } from "./model";
import { RelationShipMode, RelationSingle, HasManyRelation } from "./relationships";
import { MODELATTRIBUTES } from ".";
type retmodel = (o:any) => any;
type model = string | retmodel;
function hasMany (model:model, relation?:string) : IVaultField<List<VaultModel<any>>> {
	return {
		unic:false,
		//@ts-ignore
		kind: new HasManyRelation('_id',relation, null, model, RelationShipMode.hasMany),
		defaults: undefined
	};
}
function hasOne (model:model, relation?:string) : IVaultField<Related<VaultModel<any>>> {

	return {
		unic:false,
		// @ts-ignore
		kind: new RelationSingle('_id',relation, null, model, RelationShipMode.hasOne), // new RelationHasOne(model,relation, RelationShipMode.hasOne),
		defaults: undefined
	};
}
function belongsTo(model:model, relation?:string) : IVaultField<Related<VaultModel<any>>> {
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
function makeField<T>(kind:string):IVaultField<T>
function makeField<T>(kind:string, unic:boolean):IVaultField<T>
function makeField<T>(kind:string, defaults:T):IVaultField<T>
function makeField<T>(kind:string, unic:boolean, defaults:T):IVaultField<T>
function makeField<T>(...args:any[]) {
	let [kind, unic, defaults] = args;
	if(unic !==undefined && typeof unic !== 'boolean' ) {
		defaults = unic;
		unic = false;
	}
	unic = unic || false;
	return { kind, unic, defaults };
}
export interface Related<T> {
	():Promise<T>
	/**
	 * Set an object to match the relation
	 */
	(target:T):void
	/**
	 * Removes a relation
	 */
	(target:null):void
}
export interface List<T> {
	():Promise<T[]>
	Add(T):void
	Remove(T):void
}
function getType(type:any) {
	switch(type) {
		case String:
			return makeField('string');
		case Number:
			return makeField('number');
		case Boolean:
			return makeField('boolean');
		case Object:
		return makeField('json');
		default:
			console.log(type, '------------------');
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
export function HasMany(modelResolver:(o:any)=>any) {
	return (target: any, property: string, descriptor?: PropertyDescriptor) : void => {
		extendModel(target, property, descriptor, hasMany(modelResolver));
	}
}
