import { findItem, ITEM_IDS } from '../masterData/items.ts'
import { SPECIES } from '../masterData/species.ts'
import { DailyStepLog } from '../domain/DailyStepLog.ts'
import { Encounter } from '../domain/Encounter.ts'
import { Organization } from '../domain/Organization.ts'
import { encounterId, grantId, ownedMobimonId, playerId, titleId } from '../domain/ids.ts'
import { Inventory } from '../domain/Inventory.ts'
import { headhuntingRightId } from '../domain/Headhunting.ts'
import { Job, jobId } from '../domain/Job.ts'
import { Mobidex } from '../domain/Mobidex.ts'
import { OwnedMobimon } from '../domain/OwnedMobimon.ts'
import { Player } from '../domain/Player.ts'
import { energy, point } from '../domain/quantities.ts'
import { Wallet } from '../domain/Wallet.ts'
import {
  LocalStorageMobimonRepository,
  MOBIMON_STORAGE_KEY,
} from './LocalStorageMobimonRepository.ts'

describe('LocalStorageMobimonRepository', () => {
  beforeEach(() => localStorage.clear())

  it('すべての集約を1つのキーに保存し、読み戻せる', () => {
    const p = playerId('user-1')
    const aroma = findItem(ITEM_IDS.aroma)
    const repository = new LocalStorageMobimonRepository(localStorage)
    repository.save({
      players: [Player.create(p).updateCumulativeSteps(1234).grantTitle(titleId('d-world'))],
      wallets: [
        Wallet.create(p)
          .receiveEnergy(grantId('g1'), energy(80))
          .receivePoints(grantId('g2'), point(10)),
      ],
      inventories: [Inventory.create(p).add(aroma.id, 2).use(aroma).inventory.receive(aroma.id, 1)],
      mobidexes: [Mobidex.create(p).register(SPECIES[0], SPECIES).mobidex],
      encounters: [Encounter.appear(encounterId('e1'), p, SPECIES[0].id).encounter],
      ownedMobimons: [
        OwnedMobimon.reconstruct(ownedMobimonId('o1'), p, SPECIES[0].id, 250).rest('2026-10-01'),
      ],
      organizations: [
        Organization.create(p).addDirectReport('パワートレインシステム', {
          id: ownedMobimonId('o1'),
          rarity: 'コモン',
          businessField: SPECIES[0].businessField,
        }),
      ],
      dailyStepLogs: [DailyStepLog.create(p).record('2026-09-28', 12_000)],
      jobs: [
        Job.accept({
          id: jobId('j1'),
          playerId: p,
          offer: {
            key: '2026-09-28/パワートレインシステム/C',
            date: '2026-09-28',
            field: 'パワートレインシステム',
            rank: 'C',
            title: '燃料ポンプの調子を確かめる',
          },
          now: new Date(2026, 8, 28, 12),
          today: '2026-09-28',
          log: DailyStepLog.create(p),
          team: { leader: ownedMobimonId('o1'), subLeaders: [], members: [] },
          successRate: 85,
        }).decline(new Date(2026, 8, 28, 13), 0),
      ],
      headhuntingRights: [
        {
          id: headhuntingRightId('h1'),
          playerId: p,
          field: 'パワートレインシステム',
          rank: 'A',
          grantedAt: '2026-09-28T03:00:00.000Z',
        },
      ],
    })

    const loaded = new LocalStorageMobimonRepository(localStorage).load()
    expect(loaded.players[0]).toMatchObject({ cumulativeSteps: 1234, titles: ['d-world'] })
    expect(loaded.wallets[0]).toMatchObject({ energy: 80, points: 10 })
    expect([...loaded.wallets[0].processedGrantIds]).toEqual(['g1', 'g2'])
    expect(loaded.inventories[0].countOf(aroma.id)).toBe(2)
    expect(loaded.inventories[0].activeEffects.get('encounterBoost')).toEqual({
      itemId: aroma.id,
      multiplier: 2,
      remainingUses: 3,
    })
    expect([...loaded.mobidexes[0].registered]).toEqual([SPECIES[0].id])
    expect(loaded.encounters[0].state).toBe('出現中')
    expect(loaded.ownedMobimons[0].level).toBe(3)
    expect(loaded.ownedMobimons[0].isResting('2026-09-30')).toBe(true)
    expect(JSON.parse(localStorage.getItem(MOBIMON_STORAGE_KEY)!).version).toBe(4)
    expect(loaded.organizations[0].positionOf(ownedMobimonId('o1'))).toEqual({
      field: 'パワートレインシステム',
      role: 'メンバー',
    })
    expect(loaded.dailyStepLogs[0].stepsOn('2026-09-28')).toBe(12_000)
    expect(loaded.jobs[0]).toMatchObject({
      id: 'j1',
      field: 'パワートレインシステム',
      rank: 'C',
      countStartDate: '2026-09-28',
      deadlineDate: '2026-09-30',
      requiredSteps: 20_000,
      successRate: 85,
      team: { leader: 'o1', subLeaders: [], members: [] },
      status: '辞退',
      judgedAt: null,
    })
    expect(loaded.headhuntingRights).toEqual([
      {
        id: 'h1',
        playerId: 'user-1',
        field: 'パワートレインシステム',
        rank: 'A',
        grantedAt: '2026-09-28T03:00:00.000Z',
      },
    ])
  })
})
