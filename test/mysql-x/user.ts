import { Model } from '../../src/adapters/mysql-x';
import { Related, List, Property, HasMany } from '../../src/types';
import { Post } from './post';
export class User extends Model {
	@Property name:string
	@HasMany(o=>Post) posts:List<Post>
}
