import { Model } from '../../src/adapters/mysql-x';
import { Related, List, hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/types';
import { Post } from './post';
export class User extends Model {
	name:string
	posts:List<Post>
	static configuration = {
		name:String(),
		posts:hasMany('Post')
	}
}
