import { Model } from '../../src/adapters/mongo';
import { Property } from '../../src/types';
export class Comment extends Model {
	@Property content:string
}
