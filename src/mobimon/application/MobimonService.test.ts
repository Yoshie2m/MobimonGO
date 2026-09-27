import { ownedMobimonId, playerId } from '../domain/ids.ts'
import {
  emptyMobimonState,
  type MobimonRepository,
  type MobimonState,
} from '../domain/MobimonRepository.ts'
import { OwnedMobimon } from '../domain/OwnedMobimon.ts'
import { SPECIES } from '../masterData/species.ts'
import { MobimonService } from './MobimonService.ts'

class InMemoryRepository implements MobimonRepository {
  state: MobimonState = emptyMobimonState()
  saved = 0
  load(): MobimonState {
    // 集約は不変なので、配列だけを複製すればよい
    return Object.fromEntries(
      Object.entries(this.state).map(([key, list]) => [key, [...list]]),
    ) as unknown as MobimonState
  }
  save(state: MobimonState): void {
    this.state = state
    this.saved++
  }
}

describe('MobimonService.registerPlayer', () => {
  it('Player・Wallet・Inventory・Mobidex を1回の保存でそろえて作る', () => {
    const repository = new InMemoryRepository()
    new MobimonService(repository).registerPlayer('user-1')
    const { players, wallets, inventories, mobidexes } = repository.state
    expect([players, wallets, inventories, mobidexes].map((list) => list.length)).toEqual([
      1, 1, 1, 1,
    ])
    expect(wallets[0]).toMatchObject({ playerId: 'user-1', energy: 0, points: 0 })
    expect(repository.saved).toBe(1)
  })

  it('同じユーザーで二重に作らない', () => {
    const repository = new InMemoryRepository()
    const service = new MobimonService(repository)
    service.registerPlayer('user-1')
    service.registerPlayer('user-1')
    expect(repository.state.players).toHaveLength(1)
    expect(repository.saved).toBe(1)
  })
})

describe('MobimonService.listOwnedMobimon', () => {
  it('PlayerId で検索して所持モビモンを返す', () => {
    const repository = new InMemoryRepository()
    repository.state.ownedMobimons = [
      OwnedMobimon.reconstruct(ownedMobimonId('o1'), playerId('user-1'), SPECIES[0].id, 100),
      OwnedMobimon.reconstruct(ownedMobimonId('o2'), playerId('user-2'), SPECIES[1].id, 0),
    ]
    expect(new MobimonService(repository).listOwnedMobimon('user-1')).toEqual([
      {
        id: 'o1',
        speciesId: SPECIES[0].id,
        name: SPECIES[0].name,
        rarity: SPECIES[0].rarity,
        level: 2,
        experience: 100,
      },
    ])
  })
})
