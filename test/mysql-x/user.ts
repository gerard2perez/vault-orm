import { Model } from '../../src/adapters/mysql-x';
import { Related, List, hasMany, _String, _Boolean, _Number, _Json, belongsTo, hasOne, Property, HasMany } from '../../src/types';
import { Post } from './post';
export class User extends Model {
	@Property name:string
	@HasMany(o=>Post) posts:List<Post>
}
