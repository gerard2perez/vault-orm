import { Repository } from '../../src/adapters/mongo';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '../../src/types';
import { Rigth } from './rigth';
import { User } from './user';
export class Rol extends Repository {
	@Property name:string
	@Property rdn:number
	@HasOne(o=>Rigth) rigth:Related<Rigth>
	@BelongsTo(o=>User) user:Related<User>
}
