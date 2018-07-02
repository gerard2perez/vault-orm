import { Model } from '../../src/adapters/mysql-x';
import { Related, _String, _Boolean, _Number, _Json, belongsTo, hasOne, Property, BelongsTo } from '../../src/types';
import { Rol } from './rol';
export class Rigth extends Model {
	@Property name:string
	@BelongsTo(o=>Rol) rol:Related<Rol>
}
