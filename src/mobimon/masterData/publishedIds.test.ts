/**
 * 公開済みの ID が消えたり、別のものに使い回されたりしていないかを確かめる。
 * tests/fixtures/master/published-ids.json は「一度公開した ID と名前」の記録。
 * - 種・アイテム・称号を追加したら、この記録にも追加する。
 * - 名前を変えた場合は記録の名前も直す(ID は変えない)。
 * - ID を消す・番号を振り直すことはしない。種をなくすときは MOBIMON_LIST.md で「出現しない」にする。
 */
import published from '../../../tests/fixtures/master/published-ids.json'
import { ITEMS } from './items.ts'
import { SPECIES } from './species.ts'
import { TITLES } from './titles.ts'

const current = {
  species: new Map<string, string>(SPECIES.map((s) => [s.id, s.name])),
  items: new Map<string, string>(ITEMS.map((i) => [i.id, i.name])),
  titles: new Map<string, string>(TITLES.map((t) => [t.id, t.name])),
}

describe('公開済みの ID', () => {
  it.each(['species', 'items', 'titles'] as const)(
    '%s: 公開済みの ID がすべて残り、同じものを指している',
    (kind) => {
      const missing: string[] = []
      const renamed: string[] = []
      for (const [id, name] of Object.entries(published[kind] as Record<string, string>)) {
        const now = current[kind].get(id)
        if (now === undefined) missing.push(id)
        else if (now !== name) renamed.push(`${id}: ${name} → ${now}`)
      }
      expect(missing, '公開済みの ID は消さない(種は「出現しない」にする)').toEqual([])
      expect(
        renamed,
        '名前を変えたなら published-ids.json も直す。別の種に使い回してはいけない',
      ).toEqual([])
    },
  )

  it.each(['species', 'items', 'titles'] as const)(
    '%s: 新しい ID は記録に追加されている',
    (kind) => {
      const recorded = new Set(Object.keys(published[kind]))
      expect([...current[kind].keys()].filter((id) => !recorded.has(id))).toEqual([])
    },
  )

  it('種の ID は M001 からの連番(新しい種は末尾に追加する)', () => {
    expect(SPECIES.map((s) => s.id)).toEqual(
      SPECIES.map((_, i) => `M${String(i + 1).padStart(3, '0')}`),
    )
  })
})
