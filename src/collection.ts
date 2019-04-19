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
			let model;
			if(property.kind instanceof RelationSingle || property.kind instanceof HasManyRelation) {
				// istanbul ignore else
				if ( property.kind.parentModel instanceof Function) {
					model = property.kind.parentModel();
				} else {
					model = Schemas[property.kind.parentModel];
				}
			}
			if (property.kind instanceof RelationSingle) {
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
				let rprop: RelationSingle = property.kind.init(`${classname.name.toLowerCase()}Id`, null, model) as RelationSingle;
				let proto = model.prototype;
				proto.newSchema.raw[rprop.parentKey] = rprop;
				mask[prop] = rprop;
				relations[prop] = mask[prop];
			} else {
				// istanbul ignore else
				if (!raw[prop]) raw[prop] = property;
				mask[prop] = property;
				own[prop] = property;
			}
		}
	}
	// istanbul ignore next
	protected toArray(cursor: any): Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	fields(query: object) : this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	remove(query: any): Promise<any> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	sort(key:string, order:Sorting = Sorting.asc):this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	update(query: any, keys?: Object):Promise<any> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	async findOrCreate(query: any, keys: Partial<T> = {}):Promise<T> {
		const { executionContext } = this;
        let item = await executionContext.firstOrDefault(query);
        if (!item) {
            for (const key of Object.keys(keys)) {
                query[key] = keys[key];
            }
            item = Reflect.construct(executionContext.BaseClass, [query]) as T;
            await item.save();
        }
        return item;
	}
	// istanbul ignore next
	findAll() : Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	toId(id:any): any {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	where(query: any): this {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	orWhere(query: any): this {
		const { executionContext } = this;
		executionContext.__where__['$or'] = executionContext.__where__['$or'] || [];
		executionContext.__where__['$or'].push(query);
		if (executionContext.__where__['$and']) {
			executionContext.__where__['$or'].push({ '$and': executionContext.__where__['$and'] });
			delete executionContext.__where__['$and'];
		}
		return executionContext;
	}
	// istanbul ignore next
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
	// istanbul ignore next
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
	// istanbul ignore next
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
	// istanbul ignore next
	firstOrDefault(queryOrId?: any) : Promise<T> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	find() : Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	explain():Promise<any> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	protected execute(query: any):Promise<T[]> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
	// istanbul ignore next
	count(applySkipLimit: boolean = false): Promise<number> {
		throw new NotInmplemented('Please implement this method in your Collection class adapter.');
	}
}
