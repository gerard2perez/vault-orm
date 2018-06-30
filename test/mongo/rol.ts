import { Model } from '../../src/adapters/mongo';
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
		rigth: hasOne(o=>Rigth),
		user:belongsTo(o=>User)
	}
}
