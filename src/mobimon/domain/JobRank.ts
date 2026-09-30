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
  /** 成功したときに得るヘッドハンティングの権利の数。 */
  headhunts: number
  /** 失敗したときに、メンバーが休養に入る確率(%)。納期に間に合わなかった / 歩き切ったが判定で失敗。 */
  restRate: { missed: number; failed: number }
  /** 休養の日数。 */
  restDays: number
  /** 成功したときに、チームの全員が得る経験値。 */
  experience: number
}

export const RANK_RULES: Readonly<Record<JobRank, RankRule>> = {
  C: {
    days: 3,
    requiredSteps: 20_000,
    baseSuccessRate: 85,
    maxSuccessRate: 98,
    headhunts: 1,
    restRate: { missed: 5, failed: 3 },
    restDays: 3,
    experience: 100,
  },
  B: {
    days: 5,
    requiredSteps: 45_000,
    baseSuccessRate: 75,
    maxSuccessRate: 95,
    headhunts: 1,
    restRate: { missed: 10, failed: 5 },
    restDays: 4,
    experience: 200,
  },
  A: {
    days: 7,
    requiredSteps: 70_000,
    baseSuccessRate: 65,
    maxSuccessRate: 90,
    headhunts: 2,
    restRate: { missed: 20, failed: 10 },
    restDays: 5,
    experience: 300,
  },
  S: {
    days: 7,
    requiredSteps: 91_000,
    baseSuccessRate: 50,
    maxSuccessRate: 85,
    headhunts: 2,
    restRate: { missed: 30, failed: 15 },
    restDays: 7,
    experience: 500,
  },
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
