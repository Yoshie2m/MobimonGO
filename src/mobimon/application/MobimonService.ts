import { playerId as toPlayerId } from '../domain/ids.ts'
import { Inventory } from '../domain/Inventory.ts'
import { Mobidex } from '../domain/Mobidex.ts'
import type { MobimonRepository } from '../domain/MobimonRepository.ts'
import { Player } from '../domain/Player.ts'
import { Wallet } from '../domain/Wallet.ts'
import { findSpecies } from '../masterData/species.ts'

export interface OwnedMobimonView {
  id: string
  speciesId: string
  name: string
  rarity: string
  level: number
  experience: number
}

/** Mobimon コンテキストのユースケース。 */
export class MobimonService {
  private readonly repository: MobimonRepository

  constructor(repository: MobimonRepository) {
    this.repository = repository
  }

  /**
   * プレイヤーを登録する(登録済みなら何もしない)。
   * Player と一緒に Wallet(残高 0)・Inventory(空)・Mobidex(空)を1回の保存で作る。
   * id はウォーカーと同じユーザーの ID を使う。
   */
  registerPlayer(id: string): void {
    const state = this.repository.load()
    const pid = toPlayerId(id)
    if (state.players.some((p) => p.id === pid)) return
    state.players.push(Player.create(pid))
    state.wallets.push(Wallet.create(pid))
    state.inventories.push(Inventory.create(pid))
    state.mobidexes.push(Mobidex.create(pid))
    this.repository.save(state)
  }

  /** プレイヤーの所持モビモン一覧(OwnedMobimon を PlayerId で検索する)。 */
  listOwnedMobimon(id: string): OwnedMobimonView[] {
    const pid = toPlayerId(id)
    return this.repository
      .load()
      .ownedMobimons.filter((m) => m.playerId === pid)
      .map((m) => {
        const species = findSpecies(m.speciesId)
        return {
          id: m.id,
          speciesId: m.speciesId,
          name: species.name,
          rarity: species.rarity,
          level: m.level,
          experience: m.experience,
        }
      })
  }
}
