import { Repository } from '../../src/adapters/mysql-x';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '../../src/types';
import { Rol } from './rol';
export class Rigth extends Repository {
	@Property name:string
	@BelongsTo(o=>Rol) rol:Related<Rol>
}
