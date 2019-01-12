import { Repository } from '../../src/adapters/mongo';
import { Property } from '../../src/types';
export class Comment extends Repository {
	@Property content:string
}
