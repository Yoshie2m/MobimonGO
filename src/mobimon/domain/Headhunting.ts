import { BUSINESS_FIELDS, type BusinessField } from './BusinessField.ts'
import type { PlayerId } from './ids.ts'
import type { JobRank } from './JobRank.ts'
import { addDays, type JudgeOutcome } from './Job.ts'
import { RANK_RULES } from './JobRank.ts'
import type { MobimonSpecies } from './MobimonSpecies.ts'
import { TEAM_FIELDS, type TeamField, type TeamSnapshotLike } from './Organization.ts'
import { RARITIES, type Rarity } from './Rarity.ts'
import type { OwnedMobimonId } from './ids.ts'

export type HeadhuntingRightId = string & { readonly __brand: 'HeadhuntingRightId' }
export const headhuntingRightId = (v: string) => v as HeadhuntingRightId

/** 仕事の成功で得る、モビモンを1体迎える権利。好きなときに使う。 */
export interface HeadhuntingRight {
  readonly id: HeadhuntingRightId
  readonly playerId: PlayerId
  /** 由来の仕事の事業分野とランク(抽選の比率が決まる)。 */
  readonly field: TeamField
  readonly rank: JobRank
  readonly grantedAt: string
}

/** 分野の抽選: 仕事の分野 / チームのあるほかの2分野 / チームのない5分野(%)。 */
export const HEADHUNT_FIELD_RATES = { jobField: 50, otherTeamFields: 30, otherFields: 20 } as const

/** ランクごとの、迎えるモビモンのレア度の比率(%)。 */
export const HEADHUNT_RARITY_RATES: Readonly<Record<JobRank, Partial<Record<Rarity, number>>>> = {
  C: { コモン: 70, アンコモン: 30 },
  B: { コモン: 30, アンコモン: 55, レア: 15 },
  A: { アンコモン: 50, レア: 45, 超レア: 5 },
  S: { アンコモン: 20, レア: 60, 超レア: 20 },
}

/**
 * ヘッドハンティングの抽選(HeadhuntingDraw)。分野 → レア度 → 種の順に決める。
 * 種は、その分野・レア度から等確率で1種(なければ1つ下のレア度)。
 * まだ解放されていない種・出現しない種も対象。事業分野を持たない種(デンまる)は対象外。
 */
export function drawHeadhunting(
  right: Pick<HeadhuntingRight, 'field' | 'rank'>,
  species: readonly MobimonSpecies[],
  random: () => number,
): MobimonSpecies {
  const field = drawField(right.field, random)
  let rarity = drawRarity(right.rank, random)
  for (;;) {
    const candidates = species.filter((s) => s.businessField === field && s.rarity === rarity)
    if (candidates.length > 0) return candidates[Math.floor(random() * candidates.length)]
    const lower = RARITIES.indexOf(rarity) - 1
    if (lower < 0) throw new Error(`ヘッドハンティングできる種がありません: ${field}`)
    rarity = RARITIES[lower]
  }
}

function drawField(jobField: TeamField, random: () => number): BusinessField {
  const r = random() * 100
  if (r < HEADHUNT_FIELD_RATES.jobField) return jobField
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]
  if (r < HEADHUNT_FIELD_RATES.jobField + HEADHUNT_FIELD_RATES.otherTeamFields) {
    return pick(TEAM_FIELDS.filter((f) => f !== jobField))
  }
  return pick(BUSINESS_FIELDS.filter((f) => !(TEAM_FIELDS as readonly string[]).includes(f)))
}

function drawRarity(rank: JobRank, random: () => number): Rarity {
  const rates = HEADHUNT_RARITY_RATES[rank]
  let r = random() * 100
  for (const rarity of RARITIES) {
    const rate = rates[rarity] ?? 0
    if (r < rate) return rarity
    r -= rate
  }
  // 端数の誤差で抜けたときは、いちばん高いレア度にする
  return RARITIES.filter((x) => (rates[x] ?? 0) > 0).at(-1)!
}

/**
 * 失敗したときの休養の抽選。リーダー・サブリーダーは対象外で、メンバー(サブリーダーの下を含む)から1体。
 * canRest はいま休養に入れるか(すでに休養中・いなくなった個体を除く)。
 */
export function drawRest(
  p: {
    rank: JobRank
    outcome: JudgeOutcome
    team: TeamSnapshotLike
    today: string
    canRest: (id: OwnedMobimonId) => boolean
  },
  random: () => number,
): { id: OwnedMobimonId; until: string } | undefined {
  if (p.outcome.success) return undefined
  const rule = RANK_RULES[p.rank]
  const rate =
    p.outcome.reason === '納期に間に合わなかった' ? rule.restRate.missed : rule.restRate.failed
  const candidates = p.team.members.filter(p.canRest)
  if (candidates.length === 0 || random() * 100 >= rate) return undefined
  return {
    id: candidates[Math.floor(random() * candidates.length)],
    until: addDays(p.today, rule.restDays),
  }
}
