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
	driver: DatabaseDriver.mongo,
    database: 'test_vault_orm',
    port: 27017,
    host: 'localhost'
}, {
    poolSize: 2
});
export { Context, Context as TestContext };
