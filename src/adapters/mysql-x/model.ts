import { VaultModel } from '../../model';
import { UUID, uuidv4 } from '../uuid';
import { MysqlXCollection } from './utils';
export class Model extends VaultModel<uuidv4> {
	constructor(model:any) {
		if(model.created && !(model.created instanceof Date))model.created = new Date(model.created);
		if(model.updated && !(model.updated instanceof Date))model.updated = new Date(model.updated);
		super(model);
	}
	protected async persist(connection: MysqlXCollection<Model>, update_object: any) {
		update_object.created = (update_object.created as Date).toUTCString();
		update_object.updated = (update_object.updated as Date).toUTCString();
		if (this._id) {
			let modify = connection.modify(`_id = '${this._id}'`);
			for (const key of Object.keys(update_object)) {
				modify = modify.set(key, update_object[key]);
			}
			return modify.execute().then(res => {
				if (res.getAffectedRowsCount() === 1) return update_object._id;
				return false;
			});
		} else {
			update_object._id = UUID();
			return connection.add(update_object).execute().then(res => {
				if (res.getAffectedItemsCount() === 1) return update_object._id;
				return false;
			});
		}
	}
	protected async destroy(connection: MysqlXCollection<Model>) {
		// @ts-ignore
		return connection.removeOne(this._id).then(res => res.getAffectedRowsCount() === 1);
	}
}
