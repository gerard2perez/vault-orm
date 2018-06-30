import { Model } from '../../src/adapters/mysql-x';
import { Related, hasMany, _String, _Boolean, _Number, _Json, belongsTo, hasOne } from '../../src/types';
import { Rigth } from './rigth';
import { User } from './user';
export class Rol extends Model {
	name:string
	rdn:number
	rigth:Related<Rigth>
	user:Related<User>
	static configuration = {
		name:_String(),
		rdn:_Number(),
		rigth: hasOne(o=>Rigth),
		user:belongsTo(o=>User)
	}
}
