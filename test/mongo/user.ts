import { Model } from '../../src/adapters/mongo';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '../../src/types';
import { Post } from './post';
export class User extends Model {
	@Property name:string
	@HasMany(o=>Post) posts:List<Post>
}
