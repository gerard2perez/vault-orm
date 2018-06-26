import { VaultModel } from '../../src/adapters/mongo';
import { String, Boolean, Number, Json, belongsTo, hasOne } from '../../src/relations';
import { Related } from '../../src/related';
import { Rol } from './rol';
export class Rigth extends VaultModel {
	name:string
	rol:Related<Rol>
	static configuration = {
		name:String(),
		rol:belongsTo('Rol')
	}
}
