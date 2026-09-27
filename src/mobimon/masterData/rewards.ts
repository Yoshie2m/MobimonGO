import type { Milestone, MobidexScope } from '../domain/events.ts'
import type { ItemId, TitleId } from '../domain/ids.ts'
import { ITEM_IDS } from './items.ts'
import { TITLES } from './titles.ts'

export interface Reward {
  items: { itemId: ItemId; quantity: number }[]
  titleId: TitleId | null
}

const titleFor = (predicate: (t: (typeof TITLES)[number]) => boolean): TitleId => {
  const title = TITLES.find(predicate)
  if (!title) throw new Error('称号が見つかりません')
  return title.id
}

/**
 * 図鑑のコンプリート・節目の報酬。報酬はアイテムと称号だけ
 * (エネルギーは歩数から、ポイントは目標歩数の達成でのみ得る方針のため)。
 */
export function rewardForCompletion(scope: MobidexScope): Reward {
  if (scope.kind === 'full') {
    return {
      items: [
        { itemId: ITEM_IDS.aromaPlus, quantity: 3 },
        { itemId: ITEM_IDS.foodPlus, quantity: 3 },
      ],
      titleId: titleFor((t) => t.source.kind === 'fullCompletion'),
    }
  }
  return {
    items: [
      { itemId: ITEM_IDS.aromaPlus, quantity: 1 },
      { itemId: ITEM_IDS.foodPlus, quantity: 1 },
    ],
    titleId: titleFor((t) => t.source.kind === 'fieldCompletion' && t.source.field === scope.field),
  }
}

export function rewardForMilestone(milestone: Milestone): Reward {
  if (milestone.kind === 'specialSpecies') {
    return { items: [], titleId: titleFor((t) => t.source.kind === 'specialSpecies') }
  }
  return {
    items: [{ itemId: milestone.count >= 100 ? ITEM_IDS.aromaPlus : ITEM_IDS.aroma, quantity: 1 }],
    titleId: null,
  }
}
