/**
 * @module @bitsun/vault-orm/database
 */
import { VaultCollection } from "./collection";

export interface Database<T> {
	database:T
	ready: Promise<T>
	register (collection:VaultCollection<any>) : Promise<any>
}
