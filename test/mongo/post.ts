import { Repository } from '../../src/adapters/mongo';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '../../src/types';
import { User } from './user';
import { Comment } from './comment';
export class Post extends Repository {
	@Property title:string
	@Property description:string
	@BelongsTo(o=>User, 'myOwnerKey') user:Related<User>
	@HasMany(o=>Comment, 'commentRelationKey') comments: List<Comment>
}
