import { VaultORM, CollectionOfType, RelationMode, DatabaseDriver } from '../../src';
import { Collection } from '../../src/adapters/mongo';
import { Rigth } from './rigth';
import { Rol } from './rol';
import { User } from './user';
import { Post } from './post';

VaultORM.RelationsMode = RelationMode.id;
class TestContext extends VaultORM {
	// @ts-ignore
	@CollectionOfType(Rigth) rigths: Collection<Rigth>
	// @ts-ignore
	@CollectionOfType(Rol) rols: Collection<Rol>
	// @ts-ignore
	@CollectionOfType(User) users: Collection<User>
	// @ts-ignore
	@CollectionOfType(Post) posts: Collection<Post>
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
