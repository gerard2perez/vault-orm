import { Repository } from '../../src/adapters/mysql-x';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '../../src/types';
import { User } from './user';
import { Comment } from './comment';
export class Post extends Repository {
	@Property title:string
	@Property description:string
	@HasMany(o=>Comment, 'commentRelationKey') comments: List<Comment>
	@BelongsTo(o=>User, 'myOwnerKey') user:Related<User>
}
