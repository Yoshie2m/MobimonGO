import { ITEM_IDS } from './items.ts'
import { rewardForCompletion, rewardForMilestone } from './rewards.ts'
import { TITLES } from './titles.ts'

const titleName = (id: string | null) => TITLES.find((t) => t.id === id)?.name

describe('図鑑の報酬', () => {
  it('デンまるの初登録で称号「Dワールドの覇者」(アイテムなし)', () => {
    const reward = rewardForMilestone({ kind: 'specialSpecies' })
    expect(titleName(reward.titleId)).toBe('Dワールドの覇者')
    expect(reward.items).toEqual([])
  })

  it('登録数の節目: 10〜50種はアロマ、100種はアロマ+', () => {
    expect(rewardForMilestone({ kind: 'count', count: 30 }).items).toEqual([
      { itemId: ITEM_IDS.aroma, quantity: 1 },
    ])
    expect(rewardForMilestone({ kind: 'count', count: 100 }).items).toEqual([
      { itemId: ITEM_IDS.aromaPlus, quantity: 1 },
    ])
  })

  it('事業分野コンプリート: その分野の称号 + アロマ+ ×1 + フード+ ×1', () => {
    const reward = rewardForCompletion({ kind: 'field', field: 'ホーム' })
    expect(titleName(reward.titleId)).toBe('暮らしの達人')
    expect(reward.items).toEqual([
      { itemId: ITEM_IDS.aromaPlus, quantity: 1 },
      { itemId: ITEM_IDS.foodPlus, quantity: 1 },
    ])
  })

  it('全体コンプリート: モビモンマスター + アロマ+ ×3 + フード+ ×3', () => {
    const reward = rewardForCompletion({ kind: 'full' })
    expect(titleName(reward.titleId)).toBe('モビモンマスター')
    expect(reward.items.map((i) => i.quantity)).toEqual([3, 3])
  })
})
