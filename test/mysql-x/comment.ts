import { Repository } from '../../src/adapters/mysql-x';
import { HasMany, List, Property } from '../../src/types';
import { Post } from './post';
export class Comment extends Repository {
	@Property name:string
}
