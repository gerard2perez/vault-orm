import { TestContext } from './context';
import { Rol } from './context/rol';
import { expect } from 'chai';
import { VaultModel } from '../src/model';
import { Post } from './context/post';
function rdn() {
	return [3,5,1][Math.floor(Math.random()*3)];
}
describe('Mongo Adapter', () =>{
	it('waits database to initialize', async () => {
		await TestContext.ready();
		await Promise.all([
			TestContext.rols.remove({}),
			TestContext.rigths.remove({}),
			TestContext.users.remove({}),
			TestContext.posts.remove({})
		]);
	});
	it('Appends Properties to Prototype', async() => {
		let schema = expect(Rol.prototype).to.have.property('newSchema');
		schema.does.have.property('mask').that.has.all.keys('id', 'created', 'updated', 'name', 'user', 'rigth', 'rdn');
		schema.does.have.property('raw').that.has.all.keys('_id', 'created', 'updated', 'name', 'userId', 'rdn');
		schema.does.have.property('own').that.has.all.keys('name', 'rdn');
		schema.does.have.property('relations').that.has.all.keys('user', 'rigth');
	});
	it('Creates a Model', async ()=>{
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
		await TestContext.rols.remove({name: 'r21'});
		expect(await TestContext.rols.count()).eq(20);

	});
	it('Query Engine', async () => {
		expect(await TestContext.rols.where({name:'r20'}).find(), 'Check length').to.have.lengthOf(1);
		expect(await TestContext.rols.where({rdn:3}).find(), 'Check length').to.have.lengthOf.above(1);
		expect(await TestContext.rols.where({rdn:3}).orWhere({rdn:1}).orWhere({rdn:5}).find(), 'Check length').to.have.lengthOf(20);
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
		expect(await TestContext.rols.findOne(rol.id.toHexString())).to.have.property('id');
		expect(await TestContext.rols.findOne({name:'r20'})).to.have.property('name').eq('r20');

		expect(await TestContext.rols.firstOrDefault()).to.have.property('id');
		expect(await TestContext.rols.firstOrDefault(rol.id)).to.have.property('id');
		expect(await TestContext.rols.firstOrDefault(rol.id.toHexString())).to.have.property('id');
		expect(await TestContext.rols.firstOrDefault({name:'r20'})).to.have.property('name').eq('r20');

	});
	describe('Relations', () => {
		it('hasOne', async () => {
			let rigth = await TestContext.rigths.findOrCreate({name:'rigth1'});
			let rol = await TestContext.rols.firstOrDefault();

			expect(await rol.rigth()).to.equals(undefined);
			expect(await rol.user()).to.equals(undefined);
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(0);
			rol.rigth(rigth);
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(1);
			//@ts-ignore
			expect(rigth.rolId).to.be.undefined;

			expect(await rol.save()).eq(true);
			//@ts-ignore
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
			let rol = await TestContext.rols.firstOrDefault();

			expect(await rol.user()).to.equals(undefined);
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(0);
			rol.user(user);
			expect(VaultModel.storage.get(rol).save_hooks).to.have.lengthOf(0);
			//@ts-ignore
			expect(rol.userId).to.be.equal(user.id);

			expect(await rol.save()).eq(true);
			//@ts-ignore
			expect(rol.userId).to.be.equal(user.id);
			expect(await rol.user()).to.have.property('id').to.be.deep.equal(user.id);

			rol = await TestContext.rols.firstOrDefault();
			expect(await rol.user()).to.have.property('id').to.be.deep.equal(user.id);
			//@ts-ignore
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
			expect(VaultModel.storage.get(user).save_hooks).to.have.lengthOf(2);
			expect(await user.save(), 'save 4').eq(true);
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
	});
});
