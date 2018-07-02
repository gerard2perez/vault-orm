import { Model } from '../../src/adapters/mysql-x';
import { Related, hasMany, _String, _Boolean, _Number, _Json, belongsTo, hasOne, BelongsTo, Property, HasOne } from '../../src/types';
import { Rigth } from './rigth';
import { User } from './user';
export class Rol extends Model {
	@Property name:string
	@Property rdn:number
	@HasOne(o=>Rigth) rigth:Related<Rigth>
	@BelongsTo(o=>User) user:Related<User>
}
