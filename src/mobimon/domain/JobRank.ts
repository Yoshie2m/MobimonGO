import type { Rarity } from './Rarity.ts'

/** 業務ランク。 */
export type JobRank = 'C' | 'B' | 'A' | 'S'

export const JOB_RANKS: readonly JobRank[] = ['C', 'B', 'A', 'S']

/** リーダーのレア度で受注できるランク。 */
export function acceptableRanks(leaderRarity: Rarity | null): JobRank[] {
  switch (leaderRarity) {
    case 'アンコモン':
      return ['C', 'B']
    case 'レア':
      return ['B', 'A']
    case '超レア':
      return ['A', 'S']
    default:
      return []
  }
}

/** ランクごとの条件(たたき台。遊んで調整する。受注済みの仕事は受注したときの値のまま)。 */
export interface RankRule {
  /** 納期(数え始める日から数えた日数)。 */
  days: number
  /** 業務達成歩数。 */
  requiredSteps: number
  /** 成功の確率の基本値(%)。 */
  baseSuccessRate: number
  /** 成功の確率の上限(%)。 */
  maxSuccessRate: number
}

export const RANK_RULES: Readonly<Record<JobRank, RankRule>> = {
  C: { days: 3, requiredSteps: 20_000, baseSuccessRate: 85, maxSuccessRate: 98 },
  B: { days: 5, requiredSteps: 45_000, baseSuccessRate: 75, maxSuccessRate: 95 },
  A: { days: 7, requiredSteps: 70_000, baseSuccessRate: 65, maxSuccessRate: 90 },
  S: { days: 7, requiredSteps: 91_000, baseSuccessRate: 50, maxSuccessRate: 85 },
}

/**
 * その日の仕事の掲示板(チームのある3分野 × 4ランク = 12件)。日付から決まり、同じ日なら何度作っても同じになる。
 * titlesFor はその分野・ランクの仕事の名前の候補(マスターデータ)。
 */
export function generateJobBoard<F extends string>(
  date: string,
  fields: readonly F[],
  titlesFor: (field: F, rank: JobRank) => readonly string[],
): { key: string; date: string; field: F; rank: JobRank; title: string }[] {
  return fields.flatMap((field) =>
    JOB_RANKS.map((rank) => {
      const titles = titlesFor(field, rank)
      return {
        key: `${date}/${field}/${rank}`,
        date,
        field,
        rank,
        title: titles[hash(`${date}/${field}/${rank}`) % titles.length],
      }
    }),
  )
}

/** 文字列から決まる、0 以上の整数(掲示板の仕事の名前を日付ごとに入れ替えるため)。 */
function hash(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return h
}
