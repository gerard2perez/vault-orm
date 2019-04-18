import { Repository } from '../../src/adapters/mongo';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '../../src/types';
import { Post } from './post';
export class User extends Repository {
	@Property name:string
	@Property({
		kind: 'number',
		defaults:25
	}) age:number
	@HasMany(o=>Post) posts:List<Post>
}
