import { BUSINESS_FIELDS } from './BusinessField.ts'
import { drawHeadhunting, drawRest, HEADHUNT_RARITY_RATES } from './Headhunting.ts'
import { ownedMobimonId } from './ids.ts'
import { JOB_RANKS } from './JobRank.ts'
import { SPECIES } from '../masterData/species.ts'
import { RARITIES } from './Rarity.ts'
import { species } from './testHelpers.ts'

const THERMAL = 'サーマルマネジメント&エアコンシステム'

/** 決まった値を順に返す乱数(0 以上 1 未満)。 */
const sequence = (...values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('drawHeadhunting', () => {
  const pool = BUSINESS_FIELDS.flatMap((field) =>
    RARITIES.map((rarity) => species(`${field}-${rarity}`, { field, rarity })),
  )

  it('分野: 50% は仕事の分野、30% はチームのあるほかの2分野、20% はチームのない5分野', () => {
    const draw = (r: number, pick = 0) =>
      drawHeadhunting({ field: THERMAL, rank: 'C' }, pool, sequence(r, pick, 0, 0)).businessField
    expect(draw(0.49)).toBe(THERMAL)
    expect(draw(0.5, 0)).toBe('パワートレインシステム')
    expect(draw(0.79, 0.99)).toBe('セーフティ&コックピットシステム')
    expect(draw(0.8, 0)).toBe('半導体・先進デバイス')
    expect(draw(0.99, 0.99)).toBe('ホーム')
  })

  it('レア度: ランクごとの比率で決まる', () => {
    const draw = (rank: 'C' | 'A' | 'S', r: number) =>
      drawHeadhunting({ field: THERMAL, rank }, pool, sequence(0, r, 0)).rarity
    expect(draw('C', 0.69)).toBe('コモン')
    expect(draw('C', 0.7)).toBe('アンコモン')
    expect(draw('A', 0.49)).toBe('アンコモン')
    expect(draw('A', 0.94)).toBe('レア')
    expect(draw('A', 0.95)).toBe('超レア')
    expect(draw('S', 0.99)).toBe('超レア')
  })

  it('ランクごとのレア度の比率は合計 100%', () => {
    for (const rank of JOB_RANKS) {
      const total = Object.values(HEADHUNT_RARITY_RATES[rank]).reduce((a, b) => a + b, 0)
      expect(total).toBe(100)
    }
  })

  it('該当する種がなければ、1つ下のレア度から選ぶ', () => {
    const noSuperRare = pool.filter((s) => s.rarity !== '超レア')
    const s = drawHeadhunting({ field: THERMAL, rank: 'S' }, noSuperRare, sequence(0, 0.99, 0))
    expect(s.rarity).toBe('レア')
  })

  it('出現しない種・まだ解放されていない種も対象。事業分野を持たない種(デンまる)は対象外', () => {
    const only = [
      species('retired', { field: THERMAL, retired: true }),
      species('locked', { field: THERMAL, unlockSteps: 1_000_000 }),
      species('denmaru', { field: null, rarity: '超レア' }),
    ]
    const drawn = new Set(
      [0, 0.6].map(
        (r) => drawHeadhunting({ field: THERMAL, rank: 'C' }, only, sequence(0, 0, r)).id,
      ),
    )
    expect(drawn).toEqual(new Set(['retired', 'locked']))
  })

  it('マスターデータのすべての分野・ランクで、迎えられる種がある', () => {
    const random = sequence(0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8)
    for (const rank of JOB_RANKS) {
      for (let n = 0; n < 50; n++) {
        const s = drawHeadhunting({ field: THERMAL, rank }, SPECIES, random)
        expect(s.businessField).not.toBeNull()
      }
    }
  })
})

describe('drawRest', () => {
  const team = {
    leader: ownedMobimonId('leader'),
    subLeaders: [ownedMobimonId('sub')],
    members: [ownedMobimonId('m1'), ownedMobimonId('m2')],
  }
  const base = { rank: 'A' as const, team, today: '2026-09-28', canRest: () => true }

  it('納期に間に合わなかったときは 20%、判定で失敗したときは 10%(A ランク)で、休養の日数は5日', () => {
    const missed = { success: false, reason: '納期に間に合わなかった' } as const
    const failed = { success: false, reason: '判定で失敗した' } as const
    expect(drawRest({ ...base, outcome: missed }, sequence(0.19, 0))).toEqual({
      id: 'm1',
      until: '2026-10-03',
    })
    expect(drawRest({ ...base, outcome: missed }, sequence(0.2, 0))).toBeUndefined()
    expect(drawRest({ ...base, outcome: failed }, sequence(0.09, 0.99))?.id).toBe('m2')
    expect(drawRest({ ...base, outcome: failed }, sequence(0.1, 0))).toBeUndefined()
  })

  it('成功したら休養しない', () => {
    expect(drawRest({ ...base, outcome: { success: true } }, sequence(0))).toBeUndefined()
  })

  it('リーダー・サブリーダーは対象外。すでに休養中のメンバーも除く', () => {
    const outcome = { success: false, reason: '納期に間に合わなかった' } as const
    const onlyM2 = { ...base, outcome, canRest: (id: string) => id === 'm2' }
    expect(drawRest(onlyM2, sequence(0, 0))?.id).toBe('m2')
    const nobody = { ...base, outcome, canRest: () => false }
    expect(drawRest(nobody, sequence(0, 0))).toBeUndefined()
  })
})
