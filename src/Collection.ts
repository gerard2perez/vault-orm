import { Collection, Cursor, FilterQuery, ObjectId } from "mongodb";
import { VaultModel } from "./model";
import * as inflector from 'inflection';
import debug from "./debug";
import { RelathionshipsSingle, RelationShipMode } from "./related";

export class VaultCollection<T extends VaultModel> {
	collectionName?:string
	private collection: Collection<T>
	private BaseClass:any
	private cursor:Cursor<T>
	private __where__:FilterQuery<T> = {}
	private __projection__:Object = {}
	constructor(classname:typeof VaultModel, colname?:string ) {
		this.collectionName = colname || classname.collectionName;
		if(!this.collectionName) {
			let name = inflector.pluralize(classname.name.toLowerCase());
			debug(`Using '${name}' as collectionName for model ${classname.name}`);
			this.collectionName = name;
		}
		//@ts-ignore
		classname.prototype.schema = { _id:{}, created:{}, updated:{}};
		//@ts-ignore
		classname.prototype.maskedSchema = { id:{}, created:{}, updated:{}};
		//@ts-ignore
		classname.prototype.relations = {};
		//@ts-ignore
		classname.prototype.collection = () => this.collection;
		//@ts-ignore
		classname.prototype.vaultCollection = () => this;
		this.BaseClass = classname;
	}
	public setUpSchema(Schemas:any) {
		let classname = this.BaseClass;
		let rawSchema = classname.prototype.schema;
		let maskedSchema = classname.prototype.maskedSchema;
		let relations = classname.prototype.relations;
		for(const prop of Object.keys(classname.configuration)) {
			let property = classname.configuration[prop];
			if ( property.kind instanceof RelathionshipsSingle  ) {
				if ( property.kind.mode === RelationShipMode.belongsTo) {
					property.kind.init('id', `${prop.toLowerCase()}Id`, property.kind.target);
					// property.kind.initialize(classname, property.kind.target, `${prop.toLowerCase()}Id`);
					rawSchema[property.kind.link] = property;
				} else {
					property.kind.init(`${classname.name.toLowerCase()}Id`, 'id', property.kind.target);
					let proto = Schemas[property.kind.model.name].prototype;
					proto.schema[property.kind.source] = property;
					// property.kind.initialize(property.kind.target, classname, `${property.kind.target.constructor.name.toLowerCase()}Id`);
				}
				relations[prop] = property;
			} else if(!rawSchema[prop]) {
				rawSchema[prop] = property;
			}
			maskedSchema[prop] = property;
		}
		// //@ts-ignore
		// classname.prototype.schema = rawSchema;
		// //@ts-ignore
		// classname.prototype.maskedSchema = maskedSchema;
		// //@ts-ignore
		// classname.prototype.relations = relations;
	}
	public fields (query: object) {
		this.__projection__ = query;
		return this;
	}
	private toArray(cursor: Cursor<T>) {
		if(this.__projection__) {
			cursor.project(this.__projection__);
			this.__projection__ = undefined;
		}
		let rdn = Math.floor(Math.random()*1000);
		let id = `toArray${rdn}`;
		let results:T[] = [];
		return new Promise(async (resolve, reject)=>{
			let item = await cursor.next();
			while(item) {
				let created = Reflect.construct(this.BaseClass, [item]) as T;
				// // @ts-ignore
				// await created.loadRelation();
				results.push(created);
				item = await cursor.next();
			}
			resolve(results);
		}) as Promise<T[]>;
	}
	async remove(query:FilterQuery<T>) {
		return (await this.collection.remove(query)).result;
	}
	async update(query:FilterQuery<T>, keys?:Object) {
		return (await this.collection.updateMany(query,keys)).result;
	}
	async findOrCreate(query:FilterQuery<T>, keys?:Object) {
		let item = await this.collection.findOne(query);
		if(!item) {
			for(const key of Object.keys(keys)) {
				query[key] = keys[key];
			}
			item = Reflect.construct(this.BaseClass, [query]) as T;
			await item.save();
		} else {
            item = Reflect.construct(this.BaseClass, [item]);
        }
		return item;
	}
	findAll(){
		return this.toArray(this.collection.find<T>({}));
	}
	where(query:FilterQuery<T>={}) {
		this.__where__['$and'] = this.__where__['$and'] || [];
		this.__where__['$and'].push(query);
		return this;
	}
	orWhere(query:FilterQuery<T>) {
		this.__where__['$or'] = this.__where__['$or'] || [];
		this.__where__['$or'].push(query);
		if(this.__where__['$and']) {
			this.__where__['$or'].push({'$and':this.__where__['$and']});
			delete this.__where__['$and'];
		}
		return this;
	}
	limit(n:number) {
		if(!this.cursor) this.cursor = this.collection.find<T>();
		this.cursor = this.cursor.limit(n);
		return this;
	}
	/**
	 * @alias take
	 * @param n
	 */
	take (n:number) {
		return this.limit(n);
	}
	skip(n:number) {
		if(!this.cursor) this.cursor = this.collection.find<T>();
		this.cursor = this.cursor.skip(n);
		return this;
	}
	findOne() : Promise<T>
	findOne(queryOrId: ObjectId) : Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	findOne(queryOrId: string) : Promise<T>
	findOne(queryOrId: FilterQuery<T>) : Promise<T>
	findOne(queryOrId?:any) {
		return this.firstOrDefault(queryOrId);
	}
	firstOrDefault() : Promise<T>
	firstOrDefault(queryOrId: ObjectId) : Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	firstOrDefault(queryOrId: string) : Promise<T>
	firstOrDefault(queryOrId: FilterQuery<T>) : Promise<T>
	firstOrDefault(queryOrId?:any) {
		if(!this.cursor) this.cursor = this.collection.find<T>();
		if( typeof(queryOrId) === 'string' && queryOrId.length === 24) queryOrId = new ObjectId(queryOrId);
		if(queryOrId instanceof ObjectId) {
			queryOrId = {_id:queryOrId}
		}
		if(queryOrId && typeof(queryOrId) === 'object') {
			this.where(queryOrId);
			this.cursor.filter(this.__where__);
		}
		this.cursor.limit(1);
		return this.execute(this.__where__).then(results=>results[0]);
	}
	find() {
		return this.execute(this.__where__);
	}
	explain() {
		this.cursor = this.collection.find<T>(this.__where__);
		const execution_cursor = this.cursor;
		this.cursor = null;
		this.__where__ = {};
		return execution_cursor.explain();
	}
	private execute(query:any) {
		if(this.cursor) {
			this.cursor = this.cursor.filter(query);
		} else {
			this.cursor = this.collection.find<T>(this.__where__);
		}
		const execution_cursor = this.cursor;
		this.cursor = null;
		this.__where__ = {};
		return this.toArray(execution_cursor);
	}
	count(applySkipLimit:boolean = false) {
		if(this.cursor) {
			return this.cursor.filter(this.__where__).count(applySkipLimit);
		}
		return this.collection.find().count(applySkipLimit);
	}
}
