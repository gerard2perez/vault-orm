import { isBoolean, isNumber } from 'util';
import { Sorting } from '../..';
import { VaultCollection } from '../../collection';
import { VaultModel } from '../../model';
import { Projection } from '../../query';
import { uuidv4 } from '../uuid';
import { MysqlXCollection, toSQLQuery, toSQLSelect } from './utils';

export class MySQLXCollection<T extends VaultModel<uuidv4>> extends VaultCollection<T> {
	protected cursor: any
	// @ts-ignore
	protected collection: MysqlXCollection<T>
	// @ts-ignore
	protected __where__: any
	protected __limit__: number = 0
	protected __skip__: number = 0
	protected __sort__:string[] = []
	where(query: Partial<T> | any) {
		const { executionContext } = this;
		executionContext.__where__['$and'] = this.__where__['$and'] || [];
		executionContext.__where__['$and'].push(query);
		return executionContext;
	}
	// orWhere(query: Partial<T>) {
	// 	const { executionContext } = this;
	// 	executionContext.__where__['$or'] = executionContext.__where__['$or'] || [];
	// 	executionContext.__where__['$or'].push(query);
	// 	if (executionContext.__where__['$and']) {
	// 		executionContext.__where__['$or'].push({ '$and': executionContext.__where__['$and'] });
	// 		delete executionContext.__where__['$and'];
	// 	}
	// 	return executionContext;
	// }
	public fields(query: Projection<T>) {
		const { executionContext } = this;
		executionContext.__projection__ = query;
		return executionContext;
	}
	// async update(query: Partial<T>, keys?: Object) {
	// 	return (await this.collection.update(query, keys)).result;
	// }
	update(query: Partial<T>, update_object?: Object) {
		let modify = this.collection.modify(toSQLQuery(query));
		for (const key of Object.keys(update_object)) {
			if(update_object[key]){
				modify = modify.set(key, update_object[key]);
			} else {
				modify = modify.unset(key);
			}
		}
		return modify.execute().then(res => {
			if (res.getAffectedRowsCount() === 1) return true;
			return false;
		});
	}
	// async findOrCreate(query: Partial<T>, keys: Object={}) {
	// 	const { executionContext } = this;
	// 	let item = await executionContext.firstOrDefault(query);
	// 	if (!item) {
	// 		for (const key of Object.keys(keys)) {
	// 			query[key] = keys[key];
	// 		}
	// 		item = Reflect.construct(executionContext.BaseClass, [query]) as T;
	// 		await item.save();
	// 	}
	// 	return item;
	// }
	protected toArray(cursor: any): Promise<T[]> {
		const { executionContext } = this;
		let results: T[] = [];
		return new Promise(resolve => {
			cursor.execute(doc => {
				let created = Reflect.construct(executionContext.BaseClass, [doc]) as T;
				results.push(created);
			}).then(() => {
				executionContext.__where__ = {};
				executionContext.__limit__ = 0;
				executionContext.__skip__ = 0;
				executionContext.__projection__ = {};
				executionContext.__sort__ = [];

				resolve(results);
			}).catch(err => {
				resolve([]);
			});
		});
	}
	remove(query: Partial<T>) {
		const { executionContext } = this;
		// executionContext.where(query);
		// @ts-ignore
		return executionContext.collection.remove(toSQLQuery(query)).execute().then(res => res.getAffectedRowsCount() === 1);
	}
	findAll() {
		const { executionContext } = this;
		return executionContext.toArray(executionContext.collection.find());
	}
	findOne(): Promise<T>
	findOne(StringId: uuidv4): Promise<T>
	findOne(query: Partial<T>): Promise<T>
	/**@alias firstOrDefault */
	findOne(queryOrId?: any) {
		const { executionContext } = this;
		return executionContext.firstOrDefault(queryOrId);
	}
	firstOrDefault(): Promise<T>
	firstOrDefault(Id: uuidv4): Promise<T>
	firstOrDefault(query: Partial<T>): Promise<T>
	firstOrDefault(queryOrId?: any) {
		const { executionContext } = this;
		if (typeof (queryOrId) === 'string' && queryOrId.length === 32) queryOrId = { _id: queryOrId };
		if (queryOrId && typeof (queryOrId) === 'object') {
			executionContext.where(queryOrId);
		}
		executionContext.__limit__ = 1;
		return executionContext.execute().then(results => results[0]);
	}
	toId(id: any) {
		return id.replace(/-/gm,'');
	}
	protected execute() {
		const { executionContext } = this;
		let query = toSQLQuery(executionContext.__where__);
		let find = executionContext.collection.find(query);
		if(executionContext.__sort__.length) {
			find = find.sort(...executionContext.__sort__);
		}
		find = find.limit(executionContext.__limit__ || 1000);
		if( executionContext.__skip__) {
			find = find.offset(executionContext.__skip__);
		}
		let fields = toSQLSelect(executionContext.__projection__ as any);
		if(fields.length) {
			fields.splice(0,0,'_id');
			find = find.fields(fields);
		}
		return executionContext.toArray(find);
	}
	sort(key: string, order: Sorting = Sorting.asc) {
		const { executionContext } = this;
		executionContext.__sort__.push(`${key} ${Sorting[order]}`);
		return executionContext;
	}
	limit(n: number) {
		const { executionContext } = this;
		executionContext.__limit__ = n;
		return executionContext;
	}
	skip(n: number) {
		const { executionContext } = this;
		executionContext.__skip__ = n;
		return executionContext;
	}
	find() {
		const { executionContext } = this;
		return executionContext.execute();
	}
	count(applySkipLimit: boolean = false) {
		const { executionContext } = this;
		let find = executionContext.collection.find(toSQLQuery(executionContext.__where__));
		if (applySkipLimit) {
			find = find.limit(executionContext.__limit__ || 1000, executionContext.__skip__);
		}
		executionContext.__skip__ = 0;
		executionContext.__where__ = {};
		executionContext.__projection__ = {};
		executionContext.__limit__ = 0;
		let count = () => {
			// @ts-ignore
			count.count++;
		};
		// @ts-ignore
		count.count = 0;
		// @ts-ignore
		return find.execute(count).then(() => count.count);
	}
}
