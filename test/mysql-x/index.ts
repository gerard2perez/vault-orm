import { Collection, VaultORM, collection, RelationMode } from '../../src/adapters/mysql-x';
import { Rigth } from './rigth';
import { Rol } from './rol';
import { User } from './user';
import { Post } from './post';
import { Comment } from './comment';
VaultORM.RelationsMode = RelationMode.id;
class TestContext extends VaultORM {
	@collection(Rigth) rigths: Collection<Rigth>
	@collection(Rol) rols: Collection<Rol>
	@collection(User) users: Collection<User>
	@collection(Post) posts: Collection<Post>
	@collection(Comment) comments: Collection<Comment>
}
const Context =  new TestContext({
    database: 'test_vault_orm',
    port: 33060,
	host: 'localhost',
	user: 'root',
	password: '5s%83kg78Op34%b5X@$!',
	ssl:false
});
export { Context, Context as TestContext };
