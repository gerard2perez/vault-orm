/**
 * @module @bitsun/vault-orm/collection
 */
import { VaultModel } from "./model";
import * as inflector from 'inflection';
import debug from "./debug";
import { RelationShipMode, RelationSingle, HasManyRelation } from "./relationships";
import { NotInmplemented, Sorting } from ".";
export class VaultCollection<T extends VaultModel<any>> {
	protected get executionContext ():this {
		if(!this.cloned) {
			//@ts-ignore
			let cloned = new this.constructor();
			// for(const key of Object.getOwnPropertyNames(this)) {
			// 	cloned[key] = this[key];
			// }
			cloned.BaseClass = this.BaseClass;
			cloned.collection = this.collection;
			cloned.cloned = true;
			return cloned;
		}
		return this;
	}
	private cloned:boolean = false
	protected collectionName?: string
	protected collection: any
	protected BaseClass: any
	protected cursor: any
	protected __where__: any = {}
	protected __projection__: Object
	protected Initialize(classname: typeof VaultModel, colname?: string) {
		//@ts-ignore
		this.collectionName = colname || classname.collectionName;
		if (!this.collectionName) {
			let name = inflector.pluralize(classname.name.toLowerCase());
			debug(`Using '${name}' as collectionName for model ${classname.name}`);
			this.collectionName = name;
		}
		//@ts-ignore
		classname.prototype.newSchema = {
			mask: { id: {}, created: {}, updated: {} },
			raw: { _id: {}, created: {}, updated: {} },
			own: {},
			relations: {}
		};
		//@ts-ignore
		classname.prototype.collection = () => this.collection;
		//@ts-ignore
		classname.prototype.vaultCollection = () => this;
		this.BaseClass = classname;
		this.BaseClass.objects = this;
		return this;
	}
	public setUpSchema(Schemas: any) {

		let classname = this.BaseClass;
		let { mask, raw, own, relations } = classname.prototype.newSchema;
		for (const prop of Object.keys(classname.configuration)) {
			let property = classname.configuration[prop];
			if (property.kind instanceof RelationSingle) {
				let model;
				if ( property.kind.parentModel instanceof Function) {
					model = property.kind.parentModel();
				} else {
					model = Schemas[property.kind.parentModel];
				}
				if (property.kind.mode === RelationShipMode.belongsTo) {
					let rprop: RelationSingle = property.kind.init(`${prop.toLowerCase()}Id`, model, null) as RelationSingle;
					raw[rprop.childKey] = rprop;
					mask[prop] = rprop;
				} else {
					let rprop: RelationSingle = property.kind.init(`${classname.name.toLowerCase()}Id`, null, model) as RelationSingle;
					let proto = model.prototype;
					proto.newSchema.raw[rprop.parentKey] = rprop;
					mask[prop] = rprop;
				}
				relations[prop] = mask[prop];
			} else if (property.kind instanceof HasManyRelation) {
				let model;
				//  = Schemas[property.kind.parentModel];
				if ( property.kind.parentModel instanceof Function) {
					model = property.kind.parentModel();
				} else {
					model = Schemas[property.kind.parentModel];
				}
				let rprop: RelationSingle = property.kind.init(`${classname.name.toLowerCase()}Id`, null, model) as RelationSingle;
				let proto = model.prototype;
				proto.newSchema.raw[rprop.parentKey] = rprop;
				mask[prop] = rprop;
				relations[prop] = mask[prop];
			} else {
				if (!raw[prop]) raw[prop] = property;
				mask[prop] = property;
				own[prop] = property;
			}
		}
	}
	protected toArray(cursor: any): Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	fields(query: object) : this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	remove(query: any): Promise<any> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	sort(key:string, order:Sorting = Sorting.asc):this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	update(query: any, keys?: Object):Promise<any> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	findOrCreate(query: any, keys: Partial<T> = {}):Promise<T> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	findAll() : Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	toId(id:any): any {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	where(query: any = {}): this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	orWhere(query: any): this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	limit(n: number) : this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	/**
	 * @alias take
	 * @param n
	 */
	take(n: number) {
		return this.limit(n);
	}
	skip(n: number): this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	findOne(): Promise<T>
	findOne(Id: any): Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	findOne(StringId: string): Promise<T>
	findOne(query: any): Promise<T>
	/**@alias firstOrDefault */
	findOne(queryOrId?: any):Promise<T> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	firstOrDefault(): Promise<T>
	firstOrDefault(Id: any): Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	firstOrDefault(StringId: string): Promise<T>
	firstOrDefault(query: any): Promise<T>
	firstOrDefault(queryOrId?: any) : Promise<T> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	find() : Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	explain():Promise<any> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	protected execute(query: any):Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	count(applySkipLimit: boolean = false): Promise<number> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
}
