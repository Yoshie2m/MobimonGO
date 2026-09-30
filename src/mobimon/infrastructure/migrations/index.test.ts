import { migrate } from '../../../shared/VersionedStorage.ts'
import { playerId } from '../../domain/ids.ts'
import { SPECIES } from '../../masterData/species.ts'
import {
  LocalStorageMobimonRepository,
  MOBIMON_STORAGE_KEY,
} from '../LocalStorageMobimonRepository.ts'
import { CURRENT_VERSION, MIGRATIONS } from './index.ts'

describe('v4 → v5: 事業分野を名前から ID に置き換える', () => {
  beforeEach(() => localStorage.clear())

  const v4 = {
    players: [{ id: 'u', cumulativeSteps: 0, titles: ['field-home'] }],
    wallets: [],
    inventories: [],
    mobidexes: [
      {
        playerId: 'u',
        registered: [],
        achievements: ['milestone:10', 'completed:field:ホーム'],
      },
    ],
    encounters: [],
    ownedMobimons: [],
    organizations: [
      {
        playerId: 'u',
        teams: [
          { field: 'サーマルマネジメント&エアコンシステム', leader: null, directReports: [] },
          { field: 'パワートレインシステム', leader: null, directReports: [] },
          { field: 'セーフティ&コックピットシステム', leader: null, directReports: [] },
        ],
      },
    ],
    dailyStepLogs: [],
    jobs: [],
    headhuntingRights: [
      {
        id: 'h1',
        playerId: 'u',
        field: 'セーフティ&コックピットシステム',
        rank: 'A',
        grantedAt: '2026-09-28T03:00:00.000Z',
      },
    ],
  }

  it('チーム・権利・分野コンプリートの記録を、新しい名前の分野として読み込める', () => {
    const migrated = migrate({ version: 4, data: v4 }, CURRENT_VERSION, MIGRATIONS)
    expect(migrated).toMatchObject({
      organizations: [
        { teams: [{ field: 'thermal' }, { field: 'powertrain' }, { field: 'safety' }] },
      ],
      headhuntingRights: [{ field: 'safety' }],
      mobidexes: [{ achievements: ['milestone:10', 'completed:field:home'] }],
    })

    localStorage.setItem(MOBIMON_STORAGE_KEY, JSON.stringify({ version: 4, data: v4 }))
    const state = new LocalStorageMobimonRepository(localStorage).load()
    expect(state.organizations[0].teams.map((t) => t.field)).toEqual([
      'サーマルマネジメント',
      'パワートレイン',
      'インフォテイメント',
    ])
    expect(state.headhuntingRights[0].field).toBe('インフォテイメント')
    expect([...state.mobidexes[0].achievements]).toEqual([
      'milestone:10',
      'completed:field:スマートホーム',
    ])
  })

  it('移行した分野コンプリートの報酬は、もう一度は受け取らない', () => {
    localStorage.setItem(MOBIMON_STORAGE_KEY, JSON.stringify({ version: 4, data: v4 }))
    const mobidex = new LocalStorageMobimonRepository(localStorage).load().mobidexes[0]
    let current = mobidex
    const events = []
    for (const s of SPECIES.filter((s) => s.businessField === 'スマートホーム')) {
      const result = current.register(s, SPECIES)
      current = result.mobidex
      events.push(...result.events)
    }
    expect(current.playerId).toBe(playerId('u'))
    expect(events.filter((e) => e.type === 'MobidexCompleted')).toEqual([])
  })

  it('保存し直すと、分野は ID のまま書かれる', () => {
    localStorage.setItem(MOBIMON_STORAGE_KEY, JSON.stringify({ version: 4, data: v4 }))
    const repository = new LocalStorageMobimonRepository(localStorage)
    repository.save(repository.load())
    const saved = JSON.parse(localStorage.getItem(MOBIMON_STORAGE_KEY)!)
    expect(saved.version).toBe(5)
    expect(saved.data.organizations[0].teams[2].field).toBe('safety')
    expect(saved.data.mobidexes[0].achievements).toContain('completed:field:home')
  })
})
