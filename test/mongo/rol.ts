import { Model } from '../../src/adapters/mongo';
import { Related, BelongsTo, hasMany, _String, _Boolean, _Number, _Json, belongsTo, hasOne, HasOne } from '../../src/types';
import { Rigth } from './rigth';
import { User } from './user';
import { Property } from '../../src/types';
export class Rol extends Model {
	@Property name:string
	@Property rdn:number
	@HasOne(o=>Rigth) rigth:Related<Rigth>
	@BelongsTo(o=>User) user:Related<User>
}
