import { VaultModel } from '../../src/model';
import { hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/relations';
import { Related, Collection } from '../../src/related';
import { User } from './user';
export class Post extends VaultModel {
	title:string
	description:string
	user:Related<User>
	static configuration = {
		name:String(),
		rdn:Number(),
		user:belongsTo('User')
	}
}
