import * as mysqlx from '@mysql/xdevapi';
import { DatabaseConfiguration } from '..';
export function connect(configuration:DatabaseConfiguration)  {
	return mysqlx.getSession(configuration).then(session=>session.createSchema(configuration.database));
}
