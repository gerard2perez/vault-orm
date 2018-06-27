import { VaultORM, CollectionOfType, RelationMode, DatabaseDriver } from '../../src';
import { VaultCollection } from '../../src/collection';
import { Rigth } from './rigth';
import { Rol } from './rol';
import { User } from './user';
import { Post } from './post';
VaultORM.RelationsMode = RelationMode.id;
class TestContext extends VaultORM {
	// @ts-ignore
	@CollectionOfType(Rigth) rigths: VaultCollection<Rigth>
	// @ts-ignore
	@CollectionOfType(Rol) rols: VaultCollection<Rol>
	// @ts-ignore
	@CollectionOfType(User) users: VaultCollection<User>
	// @ts-ignore
	@CollectionOfType(Post) posts: VaultCollection<Post>
}
const Context =  new TestContext({
	driver: DatabaseDriver.mysqlX,
    database: 'test_vault_orm',
    port: 33060,
	host: 'localhost',
	user: 'root',
	password: '5s%83kg78Op34%b5X@$!',
	ssl:false
});
export { Context, Context as TestContext };
