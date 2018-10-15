import { VaultModel } from '../src/model';
import { TestContext } from './mongo';
import { Rol } from './mongo/rol';
import { Post } from './mongo/post';
import { prepare } from './test.spect';
import { Comment } from './mongo/comment';

prepare('Mongo', TestContext, Rol, Post, Comment);
