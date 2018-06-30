import { Model } from '../../src/adapters/mongo';
import { hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/types';
import { Related, List } from '../../src/related';
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
