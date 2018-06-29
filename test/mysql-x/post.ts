import { Model } from '../../src/adapters/mysql-x';
import { hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/relations';
import { Related } from '../../src/related';
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
