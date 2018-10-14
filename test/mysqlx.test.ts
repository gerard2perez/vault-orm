import { TestContext } from './mysql-x';
import { VaultModel } from '../src/model';
import { User } from './mysql-x/user';
import { Rol } from './mysql-x/rol';
import { expect } from 'chai';
import { Post } from './mysql-x/post';
import { prepare } from './test.spect';

prepare('MySQl XDevAPI', TestContext, Rol, Post);
