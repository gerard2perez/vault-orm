import { Model } from '../../src/adapters/mysql-x';
import { Related, hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/types';
import { Rigth } from './rigth';
import { User } from './user';
export class Rol extends Model {
	name:string
	rdn:number
	rigth:Related<Rigth>
	user:Related<User>
	static configuration = {
		name:String(),
		rdn:Number(),
		rigth: hasOne('Rigth'),
		user:belongsTo('User')
	}
}
