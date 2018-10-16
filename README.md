# Vault ORM
[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fgerard2p%2Fnode-mce.svg?type=shield)](https://app.fossa.io/projects/git%2Bgithub.com%2Fgerard2p%2Fnode-mce?ref=badge_shield)

[![Build Status](https://img.shields.io/travis/gerard2p/vault-orm/master.svg?style=flat-square)](https://travis-ci.org/gerard2p/vault-orm)[![Dependency Status](https://david-dm.org/gerard2p/vault-orm.svg?style=flat-square)](https://david-dm.org/gerard2p/vault-orm)![PRs Welcome](https://img.shields.io/badge/PRs%20🔀-Welcome-brightgreen.svg?style=flat-square)

[![Code Climate](https://codeclimate.com/github/gerard2p/vault-orm/badges/gpa.svg?style=flat-square)](https://codeclimate.com/github/gerard2p/vault-orm?style=flat-square) [![Test Coverage](https://codeclimate.com/github/gerard2p/vault-orm/badges/coverage.svg?style=flat-square)](https://codeclimate.com/github/gerard2p/vault-orm/coverage) [![Issue Count](https://codeclimate.com/github/gerard2p/vault-orm/badges/issue_count.svg?style=flat-square)](https://codeclimate.com/github/gerard2p/vault-orm)


![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square)![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg?style=flat-square)[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.png?v=101&style=flat-square)](https://github.com/ellerbrock/typescript-badges/)

# Installation
```sh
npm install @bitsun/vault-orm
```

## About
Vault ORM is part of the Kane framework and evolution of Koaton. but rigth now it's only for private usage; but you can use vault-orm

# Models

This sample shows how to create a model
```typescript
// database/posts.ts
import { Model } from '@bitsun/vault-orm/adapters/mongo';
import { Related, List, Property, HasMany, HasOne, BelongsTo } from '@bitsun/vault-orm/types';
import { User } from './user';
import { Comment } from './comment';
export class Post extends Model {
	@Property title:string
	@Property description:string
	@BelongsTo(o=>User, 'myOwnerKey') user:Related<User>
	@HasMany(o=>Comment, 'commentRelationKey') comments: List<Comment>
}
```
Vault ORM will auto detect the types from typescript and aditionaly it has some tpes to manage relations.

# Database
```typescript
import { Collection, VaultORM, collection, RelationMode } from '@bitsun/vault-orm/adapters/mongo';
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
    port: 27017,
    host: 'localhost'
}, {
    poolSize: 2
});
export { Context, Context as TestContext };

```
The export at the end of the line is required when using Kaen Framework.
> You can wait for the databse to initialize using the ready() promise that is available ```await TestContext.ready(); ```
