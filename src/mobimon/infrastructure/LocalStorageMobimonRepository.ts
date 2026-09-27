import { VersionedStorage, type KeyValueStorage } from '../../shared/VersionedStorage.ts'
import { Encounter, type EncounterState } from '../domain/Encounter.ts'
import {
  encounterId,
  grantId,
  itemId,
  mobimonSpeciesId,
  ownedMobimonId,
  playerId,
  titleId,
} from '../domain/ids.ts'
import { Inventory, type ActiveEffect } from '../domain/Inventory.ts'
import type { ItemEffectKind } from '../domain/Item.ts'
import { Mobidex } from '../domain/Mobidex.ts'
import {
  emptyMobimonState,
  type MobimonRepository,
  type MobimonState,
} from '../domain/MobimonRepository.ts'
import { OwnedMobimon } from '../domain/OwnedMobimon.ts'
import { Player } from '../domain/Player.ts'
import { Wallet } from '../domain/Wallet.ts'

export const MOBIMON_STORAGE_KEY = 'mobimongo:mobimon'
const VERSION = 1

interface Stored {
  players: { id: string; cumulativeSteps: number; titles: string[] }[]
  wallets: { playerId: string; energy: number; points: number; processedGrantIds: string[] }[]
  inventories: {
    playerId: string
    counts: [string, number][]
    activeEffects: [ItemEffectKind, { itemId: string; multiplier: number; remainingUses: number }][]
    pending: [string, number][]
  }[]
  mobidexes: { playerId: string; registered: string[]; achievements: string[] }[]
  encounters: { id: string; playerId: string; speciesId: string; state: EncounterState }[]
  ownedMobimons: { id: string; playerId: string; speciesId: string; experience: number }[]
}

/** Mobimon コンテキストの状態を、localStorage の1つのキーにまとめて保存する。 */
export class LocalStorageMobimonRepository implements MobimonRepository {
  private readonly storage: VersionedStorage<Stored>

  constructor(storage: KeyValueStorage) {
    this.storage = new VersionedStorage<Stored>(storage, MOBIMON_STORAGE_KEY, VERSION)
  }

  load(): MobimonState {
    const s = this.storage.load()
    if (!s) return emptyMobimonState()
    return {
      players: s.players.map((p) =>
        Player.reconstruct(playerId(p.id), p.cumulativeSteps, p.titles.map(titleId)),
      ),
      wallets: s.wallets.map((w) =>
        Wallet.reconstruct(
          playerId(w.playerId),
          w.energy,
          w.points,
          w.processedGrantIds.map(grantId),
        ),
      ),
      inventories: s.inventories.map((i) =>
        Inventory.reconstruct(
          playerId(i.playerId),
          i.counts.map(([id, n]) => [itemId(id), n]),
          i.activeEffects.map(([kind, e]): [ItemEffectKind, ActiveEffect] => [
            kind,
            { ...e, itemId: itemId(e.itemId) },
          ]),
          i.pending.map(([id, n]) => [itemId(id), n]),
        ),
      ),
      mobidexes: s.mobidexes.map((m) =>
        Mobidex.reconstruct(
          playerId(m.playerId),
          m.registered.map(mobimonSpeciesId),
          m.achievements,
        ),
      ),
      encounters: s.encounters.map((e) =>
        Encounter.reconstruct(
          encounterId(e.id),
          playerId(e.playerId),
          mobimonSpeciesId(e.speciesId),
          e.state,
        ),
      ),
      ownedMobimons: s.ownedMobimons.map((o) =>
        OwnedMobimon.reconstruct(
          ownedMobimonId(o.id),
          playerId(o.playerId),
          mobimonSpeciesId(o.speciesId),
          o.experience,
        ),
      ),
    }
  }

  save(state: MobimonState): void {
    this.storage.save({
      players: state.players.map((p) => ({
        id: p.id,
        cumulativeSteps: p.cumulativeSteps,
        titles: [...p.titles],
      })),
      wallets: state.wallets.map((w) => ({
        playerId: w.playerId,
        energy: w.energy,
        points: w.points,
        processedGrantIds: [...w.processedGrantIds],
      })),
      inventories: state.inventories.map((i) => ({
        playerId: i.playerId,
        counts: [...i.counts],
        activeEffects: [...i.activeEffects],
        pending: [...i.pending],
      })),
      mobidexes: state.mobidexes.map((m) => ({
        playerId: m.playerId,
        registered: [...m.registered],
        achievements: [...m.achievements],
      })),
      encounters: state.encounters.map((e) => ({
        id: e.id,
        playerId: e.playerId,
        speciesId: e.speciesId,
        state: e.state,
      })),
      ownedMobimons: state.ownedMobimons.map((o) => ({
        id: o.id,
        playerId: o.playerId,
        speciesId: o.speciesId,
        experience: o.experience,
      })),
    })
  }
}
