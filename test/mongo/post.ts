import { Model } from '../../src/adapters/mongo';
import { Related, List, hasMany, _String, _Boolean, _Number, _Json, belongsTo, hasOne, Property, BelongsTo } from '../../src/types';
import { User } from './user';
export class Post extends Model {
	@Property title:string
	@Property description:string
	@BelongsTo(o=>User) user:Related<User>
}
