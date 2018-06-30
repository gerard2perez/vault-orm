import { Model } from '../../src/adapters/mysql-x';
import { Related, String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/types';
import { Rol } from './rol';
export class Rigth extends Model {
	name:string
	rol:Related<Rol>
	static configuration = {
		name:String(),
		rol:belongsTo('Rol')
	}
}
