import { Model } from '../../src/adapters/mysql-x';
import { HasMany, List, Property } from '../../src/types';
import { Post } from './post';
export class Comment extends Model {
	@Property name:string
}
