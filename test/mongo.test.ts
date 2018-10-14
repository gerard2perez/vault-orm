import { VaultModel } from '../src/model';
import { TestContext } from './mongo';
import { Rol } from './mongo/rol';
import { Post } from './mongo/post';
import { expect } from 'chai';
import { prepare } from './test.spect';



prepare('Mongo', TestContext, Rol, Post);
