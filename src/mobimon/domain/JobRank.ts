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

/**
 * ランクの中の候補(納期・業務達成歩数・成功時の経験値)。同じランクでも複数あってよく、
 * 期間・歩数(=1日あたりの歩数平均)が多い候補ほど経験値を高くする。
 */
export interface JobVariant {
  /** 納期(数え始める日から数えた日数)。 */
  days: number
  /** 業務達成歩数。 */
  requiredSteps: number
  /** 成功したときに、チームの全員が得る経験値。 */
  experience: number
}

/** ランクごとの条件(たたき台。遊んで調整する。受注済みの仕事は受注したときの値のまま)。 */
export interface RankRule {
  /** 納期・業務達成歩数・経験値の候補。どれになるかは日付・分野・ランクから決まる(`pickVariant`)。 */
  variants: readonly JobVariant[]
  /** 成功の確率の基本値(%)。 */
  baseSuccessRate: number
  /** 成功の確率の上限(%)。 */
  maxSuccessRate: number
  /** 成功したときに得るヘッドハンティングの権利の数(候補によらずランクで決まる)。 */
  headhunts: number
  /** 失敗したときに、メンバーが休養に入る確率(%)。納期に間に合わなかった / 歩き切ったが判定で失敗。 */
  restRate: { missed: number; failed: number }
  /** 休養の日数。 */
  restDays: number
}

export const RANK_RULES: Readonly<Record<JobRank, RankRule>> = {
  C: {
    variants: [{ days: 1, requiredSteps: 8_000, experience: 100 }],
    baseSuccessRate: 85,
    maxSuccessRate: 98,
    headhunts: 1,
    restRate: { missed: 5, failed: 3 },
    restDays: 3,
  },
  B: {
    variants: [
      { days: 1, requiredSteps: 9_000, experience: 200 },
      { days: 2, requiredSteps: 18_000, experience: 400 },
    ],
    baseSuccessRate: 75,
    maxSuccessRate: 95,
    headhunts: 1,
    restRate: { missed: 10, failed: 5 },
    restDays: 4,
  },
  A: {
    variants: [
      { days: 2, requiredSteps: 20_000, experience: 300 },
      { days: 3, requiredSteps: 30_000, experience: 450 },
    ],
    baseSuccessRate: 65,
    maxSuccessRate: 90,
    headhunts: 2,
    restRate: { missed: 20, failed: 10 },
    restDays: 5,
  },
  S: {
    variants: [
      { days: 3, requiredSteps: 36_000, experience: 500 },
      { days: 4, requiredSteps: 52_000, experience: 720 },
    ],
    baseSuccessRate: 50,
    maxSuccessRate: 85,
    headhunts: 2,
    restRate: { missed: 30, failed: 15 },
    restDays: 7,
  },
}

/** その日・分野・ランクで選ばれる候補。日付から決まる(同じ日なら同じ候補になる)。 */
export function pickVariant(date: string, field: string, rank: JobRank): JobVariant {
  const variants = RANK_RULES[rank].variants
  return variants[hash(`${date}/${field}/${rank}/variant`) % variants.length]
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
