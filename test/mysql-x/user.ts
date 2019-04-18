import { Repository } from '../../src/adapters/mysql-x';
import { Related, List, Property, HasMany } from '../../src/types';
import { Post } from './post';
export class User extends Repository {
	@Property name:string
	@HasMany(o=>Post) posts:List<Post>
}
