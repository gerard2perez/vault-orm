import { Collection, Cursor, ObjectId } from "mongodb";
import { Sorting } from "../..";
import { VaultCollection } from "../../collection";
import { VaultModel } from "../../model";
import { FilterQuery, Projection } from "../../query";

export class MongoCollection<T extends VaultModel<ObjectId>> extends VaultCollection<T> {
	protected collection:Collection<T>
	protected __count__: boolean = false
	protected __limit__: number = 0
	protected __skip__: number = 0
	protected __sort__: any[] = undefined
	protected execute() {
		let cursor;
		// let cursor = this.collection.find(this.__where__);
		let stages:any[] = [{ $match: this.__where__ }];
		// if (this.count)
		// if (this.__skip__) cursor = cursor.skip(this.__skip__);
		// if (this.__limit__) cursor = cursor.limit(this.__limit__);
		if (this.__sort__) {
			stages.push({
					$addFields: { _sort_: { $toLower: `$${this.__sort__[0]}` } }
				});
			stages.push({ $sort: { _sort_: this.__sort__[1] } });
		}
		if (this.__skip__) stages.push({ $skip: this.__skip__ });
		if (this.__limit__) stages.push({ $limit: this.__limit__ });
		if (this.__projection__) stages.push({ $project: this.__projection__ });
		//@ts-ignore
		return this.toArray(this.collection.aggregate(stages));
	}
	protected toArray(cursor: Cursor<T>) {
		let rdn = Math.floor(Math.random() * 1000);
		let id = `toArray${rdn}`;
		let results: T[] = [];
		return new Promise(async (resolve, reject) => {
			let item = await cursor.next();
			while (item) {
				let created = Reflect.construct(this.BaseClass, [item]) as T;
				results.push(created);
				item = await cursor.next();
			}
			resolve(results);
		}) as Promise<T[]>;
	}
	fields(query: Projection<T>) {
		const { executionContext } = this;
		executionContext.__projection__ = query;
		return executionContext;
	}
	async remove(query: FilterQuery<T>) {
		return (await this.collection.deleteMany(query)).result.n === 1;
	}
	async update(query: FilterQuery<T>, keys: Partial<T>) {
		keys.updated = new Date();
		let schema = Reflect.getMetadata('vault-orm:design', this.BaseClass);
		let relations = Object.keys(schema).filter(key=>(typeof schema[key].kind==='function'));
		let work = Object.keys(keys).filter(k=>relations.includes(k));
		for(const prop of work) {
			let {kind} = schema[prop];
			switch (kind.mode) {
				case 'belongsto':
					throw new Error('Unimplemented');
					break;
				case 'hasmany':
					keys[prop] = keys[prop].map(k=>this.toId(k));
					let collection = kind.parentModel.prototype.vaultCollection();
					await collection.update({_id:{$in:keys[prop]}}, {[kind.parentKey]: query[kind.childKey] });
					delete keys[prop];
					break;
				default:
					break;
			}
		}
		let {result: {n, nModified}} = await this.collection.updateMany(query, {$set: keys});
		return n>= nModified && nModified > 0;
	}
	// async findOrCreate(query: FilterQuery<T>, keys: Partial<T> = {}) {
	// 	const { executionContext } = this;
	// 	let item = await executionContext.firstOrDefault(query);
	// 	if (!item) {
	// 		for (const key of Object.keys(keys)) {
	// 			query[key] = keys[key];
	// 		}
	// 		item = Reflect.construct(executionContext.BaseClass, [query]) as T;
	// 		await item.save();
	// 	} else {
	// 		item = Reflect.construct(executionContext.BaseClass, [item]);
	// 	}
	// 	return item;
	// }
	findAll() {
		const { executionContext } = this;
		return executionContext.toArray(executionContext.collection.find<T>({}));
	}
	where(query: FilterQuery<T> ) {
		const { executionContext } = this;
		executionContext.__where__['$and'] = executionContext.__where__['$and'] || [];
		executionContext.__where__['$and'].push(query);
		return executionContext;
	}
	// orWhere(query: FilterQuery<T>) {
	// 	const { executionContext } = this;
	// 	executionContext.__where__['$or'] = executionContext.__where__['$or'] || [];
	// 	executionContext.__where__['$or'].push(query);
	// 	if (executionContext.__where__['$and']) {
	// 		executionContext.__where__['$or'].push({ '$and': executionContext.__where__['$and'] });
	// 		delete executionContext.__where__['$and'];
	// 	}
	// 	return executionContext;
	// }
	limit(n: number) {
		const { executionContext } = this;
		executionContext.__limit__ = n;
		return executionContext;
	}
	/**
	 * @alias take
	 * @param n
	 */
	take(n: number) {
		return this.limit(n);
	}
	sort(key: string, order: Sorting = Sorting.asc) {
		const { executionContext } = this;
		executionContext.__sort__ = [key, order];
		return executionContext;
	}
	skip(n: number) {
		const { executionContext } = this;
		executionContext.__skip__ = n;
		return executionContext;
	}
	findOne(): Promise<T>
	findOne(Id: ObjectId): Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	findOne(StringId: string): Promise<T>
	findOne(query: FilterQuery<T>): Promise<T>
	/**@alias firstOrDefault */
	findOne(queryOrId?: any) {
		const { executionContext } = this;
		return executionContext.firstOrDefault(queryOrId);
	}
	firstOrDefault(): Promise<T>
	firstOrDefault(Id: ObjectId): Promise<T>
	/**
	 * String that respresnents an ObjectId
	 */
	firstOrDefault(StringId: string): Promise<T>
	firstOrDefault(query: FilterQuery<T>): Promise<T>
	firstOrDefault(queryOrId?: any) {
		const { executionContext } = this;
		if (typeof (queryOrId) === 'string' && queryOrId.length === 24) queryOrId = new ObjectId(queryOrId);
		if (queryOrId instanceof ObjectId) {
			queryOrId = { _id: queryOrId }
		}
		if (queryOrId && typeof (queryOrId) === 'object') {
			executionContext.where(queryOrId);
		}
		executionContext.limit(1);
		return executionContext.execute().then(results => results[0]);
	}
	toId(id: any) {
		if (typeof (id) === 'string' && id.length === 24) id = new ObjectId(id);
		return id;
	}
	find() {
		const { executionContext } = this;
		return executionContext.execute();
	}
	explain() {
		const { executionContext } = this;
		executionContext.cursor = executionContext.collection.find<T>(executionContext.__where__);
		const execution_cursor = executionContext.cursor;
		this.cursor = null;
		this.__where__ = {};
		return execution_cursor.explain();
	}
	count(applySkipLimit: boolean = false) {
		const { executionContext } = this;
		let count: Promise<number>;
		// if (executionContext.cursor) {
		// 	count = executionContext.cursor.filter(executionContext.__where__).count(applySkipLimit);
		// } else {
			if(applySkipLimit) {
				let cursor = executionContext.collection.find(executionContext.__where__);
				cursor.skip(this.__skip__);
				cursor.limit(this.__limit__);
				count = cursor.count(true);
				// executionContext.limit(this.__limit__);
			} else {
				count = executionContext.collection.find(executionContext.__where__).count();
			}

		// }
		return count;

	}
}
