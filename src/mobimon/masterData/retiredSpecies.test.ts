import { encounterCandidates } from '../domain/EncounterGenerator.ts'
import { mobimonSpeciesId } from '../domain/ids.ts'
import { Mobidex } from '../domain/Mobidex.ts'
import { cumulativeSteps } from '../domain/quantities.ts'
import { PLAYER } from '../domain/testHelpers.ts'
import { parseMobimonList } from './parseMobimonList.ts'
import { findSpeciesOrUnknown } from './species.ts'

const markdown = `
### スマートホーム

| No. | 名前 | 主力製品 | 部品・機能 | レア度 | 出現時間帯 | 解放に必要な累計歩数 | 進化元 | 進化先 | 解説 |
|---|---|---|---|---|---|---|---|---|---|
| M001 | アリ | 製品 | 部品 | コモン | 朝 | 0歩 | — | — | 出現する種 |
| M002 | ナシ | 製品 | 部品 | コモン | 出現しない | 0歩 | — | — | 引退した種 |
`

describe('出現しない種(引退した種)', () => {
  const catalog = parseMobimonList(markdown)
  const [alive, retired] = catalog

  it('出現時間帯が「出現しない」の種は retired になる', () => {
    expect(alive.retired).toBe(false)
    expect(retired).toMatchObject({ retired: true, name: 'ナシ' })
    expect(retired.condition.timesOfDay.size).toBe(0)
  })

  it('出現候補には入らない', () => {
    expect(
      encounterCandidates(catalog, '朝', cumulativeSteps(0)).map((c) => c.species.name),
    ).toEqual(['アリ'])
  })

  it('図鑑の総数・コンプリートの範囲には含める(登録済みなら残る)', () => {
    const onlyAlive = Mobidex.create(PLAYER).register(alive, catalog).mobidex
    expect(onlyAlive.isCompleted({ kind: 'full' }, catalog)).toBe(false)
    const both = onlyAlive.register(retired, catalog).mobidex
    expect(both.isCompleted({ kind: 'full' }, catalog)).toBe(true)
  })
})

describe('マスターデータにない種 ID', () => {
  it('「不明なモビモン」として扱い、画面を止めない', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(findSpeciesOrUnknown(mobimonSpeciesId('M999'))).toMatchObject({
      id: 'M999',
      name: '不明なモビモン',
      retired: true,
      evolvesTo: [],
    })
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
