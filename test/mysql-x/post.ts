import { Model } from '../../src/adapters/mysql-x';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '../../src/types';
import { User } from './user';
export class Post extends Model {
	@Property title:string
	@Property description:string
	@BelongsTo(o=>User) user:Related<User>
}
