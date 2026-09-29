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
