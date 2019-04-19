/**
 * @module @gerard2p/vault-orm/adapters/uuid
 */
import * as uuid from 'uuid/v4';
import { type } from 'os';
export interface UUIDOptions {
	random?: Int8Array[16]
	rng?: ()=> Int8Array[16]
}
export function UUID(options?:any) : uuidv4 {
	return uuid(options).replace(/-/gm,'');

}

export type uuidv4 = string
