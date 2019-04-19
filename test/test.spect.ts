import { expect } from 'chai';
import { Model } from '../src/adapters/mongo';
import { VaultModel } from '../src/model';
import { Repository } from '../src/adapters/mysql-x';
import { Sorting } from '../src';
// type RR = (constructor:VaultModel<any>)=> {}
class rol extends Model {
	rdn:number
	name:string
}
export function prepare (title:string, TestContext:any, Rol:typeof rol, Post:any, Comment) {
	function rdn() {
		return [3,5,1][Math.floor(Math.random()*3)];
	}
	describe(`${title} Adapter`, () => {
		it('waits database to initialize', async () => {
			await TestContext.ready();
			await Promise.all([
				TestContext.rols.remove({}),
				TestContext.rigths.remove({}),
				TestContext.users.remove({}),
				TestContext.posts.remove({}),
				TestContext.comments.remove({})
			]);
		});
		it('Appends Properties to Prototype', async() => {
			// Rol.findOne()
			let schema = expect(Rol.prototype).to.have.property('newSchema');
			schema.does.have.property('mask').that.has.all.keys('id', 'created', 'updated', 'name', 'user', 'rigth', 'rdn');
			schema.does.have.property('raw').that.has.all.keys('_id', 'created', 'updated', 'name', 'userId', 'rdn');
			schema.does.have.property('own').that.has.all.keys('name', 'rdn');
			schema.does.have.property('relations').that.has.all.keys('user', 'rigth');
		});
		it('Creates a Model', async () => {
			let rol = new Rol({name:'r1', rdn:3});
			expect(rol).to.have.property('id').equals(undefined);
			expect(await rol.save()).equals(true);
			expect(rol).to.have.property('id').to.be.not.empty;
			expect(rol).to.have.property('name').eq('r1');
		});
		it('Creates multiple models', async ()=>{
			for(let i =2; i <= 20; i++) {
				expect(await (new Rol({name:`r${i}`, rdn:rdn()})).save()).equals(true);
			}
			expect(await TestContext.rols.findAll(), 'Check length').to.have.lengthOf(20);
		});
		it('CRUD operations', async () => {
			let rol = new Rol({name:'rol1'});
			await rol.save();
			expect(rol).to.have.property('rdn').undefined;
			rol.rdn = 10;
			expect(await TestContext.rols.firstOrDefault({rdn: 10}), 'Update not yet persist').to.be.undefined;
			await rol.save();
			expect(await TestContext.rols.firstOrDefault({rdn: 10}), 'update persist').to.have.property('name').eq('rol1');
			expect(await rol.delete()).equals(true);
			expect(await TestContext.rols.firstOrDefault({rdn: 10}), 'record removed').to.be.undefined;

			expect(await new Rol({name:'r21'}).save()).eq(true);
			expect(await TestContext.rols.remove({name: 'r21'})).eq(true);
			expect(await TestContext.rols.count()).eq(20);

		});
		it('Query Engine', async () => {
			expect(await TestContext.rols.where({name:'r20'}).find(), 'Check length 1').to.have.lengthOf(1);
			expect(await TestContext.rols.where({name:{$regex:/r20/}}).find(), 'Check length 1').to.have.lengthOf(1);
			expect(await TestContext.rols.where({name:{$regex:/r.*/}}).find(), 'Check length 20').to.have.lengthOf(20);
			expect(await TestContext.rols.where({name:{$ne:'r20'}}).find(), 'Check length 19').to.have.lengthOf(19);
			expect(await TestContext.rols.where({rdn:{$ne:3}}).find(), 'Check length bigger 1').to.have.lengthOf.above(1);
			expect(await TestContext.rols.where({rdn:{$in:[3,5,1]}}).find(), 'Check length 20').to.have.lengthOf(20);
			expect(await TestContext.rols.where({rdn:{$nin:[3,5,1]}}).find(), 'Check length 0').to.have.lengthOf(0);
			expect(await TestContext.rols.where({rdn:3}).find(), 'Check length 2').to.have.lengthOf.above(1);
			expect(await TestContext.rols.where({rdn:3}).orWhere({rdn:1}).orWhere({rdn:5}).find(), 'Check length').to.have.lengthOf(20);
			// expect(await TestContext.rols.where({rdn:{$regex:/3/}}).orWhere({rdn:1}).orWhere({rdn:5}).find(), 'Regex Check length').to.have.lengthOf(20);
		});
		it('Skip Limit', async () => {
			expect(await TestContext.rols.skip(10).find()).to.have.lengthOf(10);
			expect(await TestContext.rols.skip(10).limit(5).find()).to.have.lengthOf(5);
			expect(await TestContext.rols.where({rdn:3}).limit(1).find()).to.have.lengthOf(1);
		});
		it('Count', async () => {
			expect(await TestContext.rols.count()).eq(20);
			expect(await TestContext.rols.where({name:'r20'}).count()).eq(1);

			expect(await TestContext.rols.skip(10).count(), 'skip and count').eq(20);
			expect(await TestContext.rols.skip(10).count(true)).eq(10);

			expect(await TestContext.rols.skip(10).limit(5).count()).eq(20);
			expect(await TestContext.rols.skip(10).limit(5).count(true)).eq(5);

			expect(await TestContext.rols.where({rdn:3}).limit(1).count()).above(1);
			expect(await TestContext.rols.where({rdn:3}).limit(1).count(true)).eq(1);
		});
		it('Finds One', async () => {
			let rol = await TestContext.rols.findOne();
			expect(rol).to.have.property('id');
			expect(await TestContext.rols.findOne(rol.id)).to.have.property('id');
			if(rol.id.toHexString)
				expect(await TestContext.rols.findOne(rol.id.toHexString())).to.have.property('id');
			expect(await TestContext.rols.findOne({name:'r20'})).to.have.property('name').eq('r20');

			expect(await TestContext.rols.firstOrDefault()).to.have.property('id');
			expect(await TestContext.rols.firstOrDefault(rol.id)).to.have.property('id');
			if(rol.id.toHexString)
				expect(await TestContext.rols.firstOrDefault(rol.id.toHexString())).to.have.property('id');
			expect(await TestContext.rols.firstOrDefault({name:'r20'})).to.have.property('name').eq('r20');

		});


	});
	describe(`${title} Relations`, () => {
		it('hasOne', async () => {
			let rigth = await TestContext.rigths.findOrCreate({name:'rigth1'});
			expect(rigth).to.have.property('name').equals('rigth1');
			let rol = await TestContext.rols.firstOrDefault();

			expect(await rol.rigth()).to.equals(undefined);
			expect(await rol.user()).to.equals(undefined);
			// @ts-ignore
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(0);
			rol.rigth(rigth);
			// @ts-ignore
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(1);
			expect(rigth.rolId).to.be.undefined;

			expect(await rol.save()).eq(true);
			expect(rigth.rolId).to.be.equal(rol.id);

			expect(await rol.rigth()).to.have.property('id').to.be.deep.equal(rigth.id);

			rol = await TestContext.rols.firstOrDefault();
			expect(await rol.rigth()).to.have.property('id').to.be.deep.equal(rigth.id);

			rol.rigth(null);
			expect(await rol.save()).eq(true);
			expect(await rol.rigth()).to.be.undefined;
		});
		it('belongsTo', async () => {
			let user = await TestContext.users.findOrCreate({name:'user1'});
			expect(user).to.have.property('name').equals('user1');
			expect(user).to.have.property('age').equals(25);
			let rol = await TestContext.rols.firstOrDefault();
			expect(await rol.user()).to.equals(undefined, 'relation bT is empty');
			// @ts-ignore
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(0);
			rol.user(user);
			// @ts-ignore
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(0);
			//@ts-ignore
			expect(rol.userId).to.be.equal(user.id);

			expect(await rol.save()).eq(true);
			//@ts-ignore
			expect(rol.userId).to.be.equal(user.id);
			expect(await rol.user()).to.have.property('id').to.be.deep.equal(user.id);

			rol = await TestContext.rols.firstOrDefault();
			expect(await rol.user()).to.have.property('id').to.be.deep.equal(user.id);
			expect(await rol.user(true)).to.have.all.keys(['id']);

			rol.user(null);
			expect(await rol.save()).eq(true);
			expect(await rol.user()).to.be.undefined;
		});
		it('hasMany', async() => {
			let user = await TestContext.users.findOrCreate({name: 'user1'});
			let post1 = new Post({title:'title1', desc:'desc1'});
			let post2 = new Post({title:'title2', desc:'desc2'});

			expect(await TestContext.posts.where({userId:user.id}).find(), 'check no relations').to.have.lengthOf(0);
			expect(await user.posts(), 'no related objects').to.have.lengthOf(0);

			user.posts.Add(post1);
			user.posts.Add(post2);

			expect(await user.save(), 'save 1').eq(true);
			expect(await TestContext.posts.where({userId:user.id}).find(), 'does not add objects since they are not saved').to.have.lengthOf(0);
			expect(await post1.save(), 'save 2').eq(true);
			expect(await post2.save(), 'save 3').eq(true);
			user.posts.Add(post1);
			user.posts.Add(post2);
			// @ts-ignore
			expect(VaultModel.storage.get(user).save_hooks).to.have.lengthOf(2);
			expect(await user.save(), 'save 4').eq(true);
			expect(await TestContext.posts.findOne(post1.id)).to.have.property('title').equal('title1');
			expect(await TestContext.posts.where({userId:user.id}).find(), 'two object match query').to.have.lengthOf(2);

			user.posts.Remove(post1);
			expect(await user.save(), 'save 5').eq(true);
			expect(await TestContext.posts.where({userId:user.id}).find(), 'one object remove from relation').to.have.lengthOf(1);
			expect(await TestContext.posts.count(), 'two objects in the table').eq(2);
			expect(await user.posts(), 'one object in the related array').to.have.lengthOf(1);

			await post2.delete();
			expect(await TestContext.posts.where({userId:user.id}).find(), 'Object remove in the table').to.have.lengthOf(0);
			expect(await user.posts(), 'object remove from related array').to.have.lengthOf(0);
		});
		it('Can create custom named foreign keys', async () => {
			let user = await TestContext.users.findOrCreate({name: 'user1'});
			let post = await TestContext.posts.findOrCreate({title: 'title1'});
			let comment1 = new Comment({content: 'Comment 1'});
			let comment2 = new Comment({content: 'Comment 2'});
			await Promise.all([comment1.save(), comment2.save()]);
			post.comments.Add(comment1);
			post.comments.Add(comment2);
			post.user(user);
			await post.save();
			expect(await TestContext.comments.where({commentRelationKey: post.id}).count()).to.be.equal(2);
			expect(await TestContext.posts.where({myOwnerKey: user.id}).count()).to.be.equal(1);
		});
		it('Parallel Queries', async () => {
			let res = await Promise.all([
				TestContext.rols.skip(2).limit(1).count(true),
				TestContext.rols.skip(8).limit(3).count(true)
			]);
			expect(res).to.be.deep.equal([1, 3]);
		})
	});
	describe(`${title} Repository Pattern`, () => {
		it('findOne', async () => {
			let one = await Rol.findOne();
			expect(one).to.exist;
			expect(await Rol.findOne(one.id)).to.have.property('name').equals(one.name);
			let id = one.id.toHexString ? one.id.toHexString() : one.id.toString();
			expect(await Rol.findOne(id)).to.have.property('name').equals(one.name);
			expect(await Rol.findOne({name:one.name})).to.have.property('name').equals(one.name);
		});
		it('firstOrDefault', async () => {
			let one = await Rol.firstOrDefault();
			expect(one).to.exist;
			expect(await Rol.firstOrDefault(one.id)).to.have.property('name').equals(one.name);
			let id = one.id.toHexString ? one.id.toHexString() : one.id.toString();
			expect(await Rol.firstOrDefault(id)).to.have.property('name').equals(one.name);
			expect(await Rol.firstOrDefault({name:one.name})).to.have.property('name').equals(one.name);
		});
		it('findOrCreate', async () => {
			let model = await Rol.findOrCreate({name: 'rx100'}, {rdn:100});
			expect(model).to.have.property('name').equals('rx100');
			expect(model).to.have.property('rdn').equals(100);
			expect(model).to.have.property('updated').that.exist;
			expect(model).to.have.property('created').that.exist;
			expect(model).to.have.property('id').that.exist;
		});
		it('update', async () => {
			expect(await Rol.update({name: 'rx100'}, {rdn:10})).to.be.true;
			expect(await Rol.firstOrDefault({name: 'rx100'})).to.have.property('rdn').equals(10);
		});
		it('fields', async () => {
			let projected = await Rol.fields({name:1}).where({name:'rx100'}).find();
			expect(projected).to.not.have.property('rdn');
		});
		it('findAll', async () =>{
			expect(await Rol.findAll()).to.have.lengthOf(21);
		});
		it('sort', async ()=>{
			let items = await Rol.sort('rdn').find();
			expect(items[0].rdn).to.be.below(items[items.length-1].rdn);
			items = await Rol.sort('rdn', Sorting.desc).find();
			expect(items[0].rdn).to.be.above(items[items.length-1].rdn);
		});
		it('orWhere', async () => {
			expect(await Rol.where({name:'rx100'}).orWhere({rdn:{$gt:0}}).find()).to.have.lengthOf(21);
		});
		it('limit', async ()=>{
			let take = Math.floor(Math.random()*3) + 1;
			expect(await Rol.sort('rnd', Sorting.asc).limit(take).find()).to.have.lengthOf(take);
			expect(await Rol.limit(take).find()).to.have.lengthOf(take);
		});

		it('take', async ()=>{
			let take = Math.floor(Math.random()*10) + 1;
			expect(await Rol.sort('rnd', Sorting.asc).take(take).find()).to.have.lengthOf(take);
			expect(await Rol.take(take).find()).to.have.lengthOf(take);
		});
		it('skip', async ()=>{
			let take = Math.floor(Math.random()*10) + 1;
			expect(await Rol.skip(20).limit(take).find()).to.have.lengthOf(1);
		});
		it('remove', async ()=>{
			expect(await Rol.remove({name: 'rx100'})).to.be.true;
		});
		it('count', async ()=>{
			expect(await Rol.count()).to.be.equals(20);
			expect(await Rol.skip(10).count(true)).to.be.equals(10);
			expect(await Rol.skip(10).count(false)).to.be.equals(20);
		});
		it('toId', async ()=>{
			console.log(Rol.toId('hola'));
		});
	});
}
