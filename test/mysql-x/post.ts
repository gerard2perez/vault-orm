import { Model } from '../../src/adapters/mysql-x';
import { Related, hasMany, _String, _Boolean, _Number, _Json, belongsTo, hasOne } from '../../src/types';
import { User } from './user';
export class Post extends Model {
	title:string
	description:string
	user:Related<User>
	static configuration = {
		name:_String(),
		rdn:_Number(),
		user:belongsTo('User')
	}
}
