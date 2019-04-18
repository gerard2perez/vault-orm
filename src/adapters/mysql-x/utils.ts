import { isBoolean, isNumber } from 'util';
import { Projection } from '../../query';
import { uuidv4 } from '../uuid';
function toQuery(obj: any = {}) {
	let {
		$and,
		$or,
		$eq,
		$gt,
		$gte,
		$in,
		$lt,
		$lte,
		$ne,
		$nin,
		$not,
		$expr,
		$jsonSchema,
		$mod,
		$regex,
		$options,
		$text,
		$geoIntersects,
		$geoWithin,
		$near,
		$nearSphere,
		$elemMatch,
		$size,
		$bitsAllClear,
		$bitsAllSet,
		$bitsAnyClear,
		$bitsAnySet
	} = obj;
	let query: string[] = [];
	if ($or) {
		for (const $or_def of $or) {
			// @ts-ignore
			let trans = toQuery($or_def).join(' AND ');
			query.push(trans);
		}
		if(query.length > 1) {
			return '(' + query.join(') or (') + ')';
		} else {
			return query.join(' OR ');
		}
		delete obj.$or;
	} else if ($and) {
		let pre = [];
		for (const $and_def of $and) {
			let trans = toQuery($and_def);
			if($and_def.$or)pre.push('__OR__');
			pre = pre.concat(trans);
		}
		delete obj.$and;
		query.push(`( ${pre.join(' AND ')} )`.replace('AND __OR__ AND', ') OR ('));
		return query;
	}
	if($ne) {
		if ( isNumber($ne) || isBoolean($ne) ) {
			query.push(`!= ${$ne}`);
		} else {
			query.push(`!= '${$ne}'`);
		}
		delete obj.$ne;
	}
	if($eq) {
		if ( isNumber($eq) || isBoolean($eq) ) {
			query.push(`= ${$eq}`);
		} else {
			query.push(`= '${$eq}'`);
		}
		delete obj.$eq;
	}
	if($regex) {
		delete obj.$regex;
		query.push(`REGEXP_LIKE($property$, '${$regex.toString().replace(/\//g, '')}')`);
	}
	if($in) {
		delete obj.$in;
		query.push(`IN ('${$in.join("', '")}')`);
	}
	if($nin) {
		delete obj.$nin;
		query.push(`NOT IN ('${$nin.join("', '")}')`);
	}
	if ( isNumber($gte)) {
		delete obj.$gte;
		query.push(`>= ${$gte}`);
	}
	if ( isNumber($lte)) {
		delete obj.$lte;
		query.push(`<= ${$lte}`);
	}
	if ( isNumber($gt)) {
		delete obj.$gt;
		query.push(`> ${$gt}`);
	}
	if ( isNumber($lt)) {
		delete obj.$lt;
		query.push(`< ${$lt}`);
	}
	if(obj instanceof Object) {
		for(const key of Object.keys(obj)) {
			if(!obj[key]){ query.push(`${key} = ''`); continue; };
			if( isNumber(obj[key].$gte) && isNumber(obj[key].$lte)) {
				query.push(`${key} BETWEEN ${obj[key].$gte} AND ${obj[key].$lte}`);
				delete obj[key].$lte;
				delete obj[key].$gte;
			}
			// @ts-ignore
			query.push(toQuery(obj[key]).map(q => {
				if(q.includes('$property$')) {
					return q.replace('$property$', key);
				} else {
					return `${key} ${q}`;
				}
			}).join(' and '));
		}
	} else {
		if(isNumber(obj) || isBoolean(obj)) {
			query.push(`= ${obj}`);
		} else {
			query.push(`= '${obj}'`);
		}
	}
	return query.filter(f=>f);
}
export function toSQLSelect(query: Projection<any> ) {
	let fields:string[] = [];
	if(query) {
		for(const key  of Object.keys(query)) {
			if(query[key]) {
				fields.push(key);
			}
		}
	}
	return fields;
}
export function toSQLQuery (obj:any = {}):string {
	let res = toQuery(obj);
	let final = (res instanceof Array ? res[0] : res);
	final = (final || '').replace('(  )', '') || 'true';
	return final;
}
export interface Result {
	getAffectedItemsCount(): number
	getAffectedRowsCount(): number
	getAutoIncrementValue(): number
	getGeneratedIds(): string[]
	getWarnings(): any[]
	getWarningsCount(): number
}
export interface MysqlXCollection<T> {
	add(expr?: string): any
	find(expr?: string): any
	modify(expr?: string): any
	remove(expr?: string): any
	addOrReplaceOne(id: uuidv4, data: Partial<T>): Promise<Result>
	createIndex(name: string, data: any): Promise<boolean>
	dropIndex(name: string): Promise<boolean>
	existsInDatabase(): Promise<boolean>
	getOne(id: uuidv4): Promise<T>
	removeOne(id: uuidv4): Promise<Result>
	replaceOne(id: uuidv4, data: Partial<T>): Promise<Result>
}
