import { VaultModel } from '../../src/model';
import { hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/relations';
import { Related } from '../../src/related';
import { Rigth } from './rigth';
import { User } from './user';
export class Rol extends VaultModel {
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
