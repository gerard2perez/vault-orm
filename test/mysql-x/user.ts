import { Model } from '../../src/adapters/mysql-x';
import { Related, List, hasMany, _String, _Boolean, _Number, _Json, belongsTo, hasOne } from '../../src/types';
import { Post } from './post';
export class User extends Model {
	name:string
	posts:List<Post>
	static configuration = {
		name:_String(),
		posts:hasMany('Post')
	}
}
