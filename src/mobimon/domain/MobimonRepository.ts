import type { Encounter } from './Encounter.ts'
import type { Inventory } from './Inventory.ts'
import type { Mobidex } from './Mobidex.ts'
import type { OwnedMobimon } from './OwnedMobimon.ts'
import type { Player } from './Player.ts'
import type { Wallet } from './Wallet.ts'

/** Mobimon コンテキストの状態。まとめて読み込み、まとめて保存する(同じ保存単位)。 */
export interface MobimonState {
  players: Player[]
  wallets: Wallet[]
  inventories: Inventory[]
  mobidexes: Mobidex[]
  encounters: Encounter[]
  ownedMobimons: OwnedMobimon[]
}

export interface MobimonRepository {
  load(): MobimonState
  save(state: MobimonState): void
}

export const emptyMobimonState = (): MobimonState => ({
  players: [],
  wallets: [],
  inventories: [],
  mobidexes: [],
  encounters: [],
  ownedMobimons: [],
})
