import { Model } from '../../src/adapters/mongo';
import { hasMany, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/relations';
import { Related, Collection } from '../../src/related';
import { Post } from './post';
export class User extends Model {
	name:string
	posts:Collection<Post>
	static configuration = {
		name:String(),
		posts:hasMany('Post')
	}
}
