/** 成功の確率の計算に使う、受注したチームの状態。 */
export interface TeamStrength {
  leaderLevel: number
  subLeaders: number
  /** サブリーダー以外のメンバー(リーダーの直属と、サブリーダーの下の両方)。 */
  members: number
}

/** 成功の確率の上乗せ(たたき台)。 */
export const SUCCESS_RATE_BONUS = {
  /** リーダーの Lv10 ごとに(最大 +6%)。 */
  perLeaderTenLevels: 2,
  maxLeaderBonus: 6,
  perSubLeader: 4,
  perMember: 1,
} as const

/**
 * 成功の確率(%)。ランクの基本値に、リーダーのレベル・サブリーダー・メンバーの数で上乗せし、上限で頭打ちにする。
 * 休養中のモビモンは数えない(段階3)。
 */
export function successRate(
  rule: { baseSuccessRate: number; maxSuccessRate: number },
  team: TeamStrength,
): number {
  const leader = Math.min(
    SUCCESS_RATE_BONUS.maxLeaderBonus,
    Math.floor(team.leaderLevel / 10) * SUCCESS_RATE_BONUS.perLeaderTenLevels,
  )
  const bonus =
    leader +
    team.subLeaders * SUCCESS_RATE_BONUS.perSubLeader +
    team.members * SUCCESS_RATE_BONUS.perMember
  return Math.min(rule.maxSuccessRate, rule.baseSuccessRate + bonus)
}
