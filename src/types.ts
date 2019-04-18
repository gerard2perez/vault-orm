/**
 * @module @bitsun/vault-orm/types
 */
import "reflect-metadata";
import { VaultModel } from "./model";
import { RelationShipMode, RelationSingle, HasManyRelation, ExtensibleFunction } from "./relationships";
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
function makeField(kind:string) {
	return { kind };
}
export interface Related<T> {
	/**
	 * Get the Relation
	 */
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
	Add(entity:T):void
	Remove(entity:T):void
}
function getType(type:any):IProperty {
	switch(type) {
		case String:
			return makeField('string');
		case Number:
			return makeField('number');
		case Boolean:
			return makeField('boolean');
		case Object:
			if(type instanceof ExtensibleFunction	) {
				return undefined;
			} else {
				return makeField('json');
			}
		case Date:
			return makeField('date');
		case Array:
			return makeField('array');
		default:
			console.log(type, '------------------0');
			console.log('rrr');
			return void 0;
	}
}
function extendModel(target:any, property:string, descriptor:PropertyDescriptor, options:IProperty={}) {
	let attributes = Reflect.getMetadata(MODELATTRIBUTES, target.constructor) || {};
	let type = Reflect.getMetadata("design:type", target, property);
	attributes[property] = Object.assign({}, getType(type), options);
	Reflect.defineMetadata(MODELATTRIBUTES, attributes, target.constructor);
}
export interface IProperty<T=any> {
	kind?:string;
	unic?:boolean;
	defaults?:T;
}
export function Property(target: any, propertyName: string, propertyDescriptor?: PropertyDescriptor):void;
export function Property(propety:IProperty) : (target: any, propertyName: string, propertyDescriptor?: PropertyDescriptor) => void;
export function Property(...args:any[]) : any {
	let [target, property, descriptor] = args;
	if (args.length>=2 && target instanceof Object && typeof property === 'string' && (descriptor === undefined || descriptor instanceof Object)) {
		extendModel(target, property, descriptor);
		return;
	}
	return (target: any, propertyName: string, propertyDescriptor?: PropertyDescriptor) : void => {
		extendModel(target, propertyName, propertyDescriptor, args[0] as IProperty);
	};
}
/**
 *
 * @param modelResolver - A function that return the target model
 * @param foreingKey - A key to be created
 *
 * Appends the foreingKey to the target model
 */
export function HasOne(modelResolver:(o:any)=>any, foreingKey?:string) {
	return (target: any, property: string, descriptor?: PropertyDescriptor) : void => {
		extendModel(target, property, descriptor, hasOne(modelResolver, foreingKey));
	}
}
/**
 *
 * @param modelResolver - A function that return the target model
 * @param foreingKey - A key to be created
 *
 * Appends the foreingKey to the current model
 */
export function BelongsTo(modelResolver:(o:any)=>any, foreingKey?:string) {
	return (target: any, property: string, descriptor?: PropertyDescriptor) : void => {
		extendModel(target, property, descriptor, belongsTo(modelResolver, foreingKey));
	}
}
export function HasMany(modelResolver:(o:any)=>any, foreingKey?:string) {
	return (target: any, property: string, descriptor?: PropertyDescriptor) : void => {
		extendModel(target, property, descriptor, hasMany(modelResolver, foreingKey));
	}
}
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
