import { Model } from '../../src/adapters/mysql-x';
import { Related, hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/types';
import { User } from './user';
export class Post extends Model {
	title:string
	description:string
	user:Related<User>
	static configuration = {
		name:String(),
		rdn:Number(),
		user:belongsTo('User')
	}
}
