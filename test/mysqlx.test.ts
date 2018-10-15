import { TestContext } from './mysql-x';
import { Comment } from './mysql-x/comment';
import { Post } from './mysql-x/post';
import { Rol } from './mysql-x/rol';
import { prepare } from './test.spect';

prepare('MySQl XDevAPI', TestContext, Rol, Post, Comment);
