import { Model } from '../../src/adapters/mysql-x';
import { Related, _String, _Boolean, _Number, _Json, belongsTo, hasOne } from '../../src/types';
import { Rol } from './rol';
export class Rigth extends Model {
	name:string
	rol:Related<Rol>
	static configuration = {
		name:_String(),
		rol:belongsTo('Rol')
	}
}
