import { DomainError } from '../../shared/DomainError.ts'
import { canAppear, type MobimonSpecies } from './MobimonSpecies.ts'
import type { CumulativeSteps } from './quantities.ts'
import { isBoostedRarity, RARITY_WEIGHT } from './Rarity.ts'
import type { TimeOfDay } from './TimeOfDay.ts'

export interface WeightedCandidate {
  species: MobimonSpecies
  weight: number
}

/**
 * 出現候補と、それぞれの抽選の重み。
 * 1. 時間帯と累計歩数で、出現条件を満たす種に絞る。
 * 2. 各候補にレア度の重み(10 / 5 / 2 / 1)を付け、出現率アップ中はレア・超レアに倍率を掛ける。
 */
export function encounterCandidates(
  catalog: readonly MobimonSpecies[],
  timeOfDay: TimeOfDay,
  steps: CumulativeSteps,
  boostMultiplier = 1,
): WeightedCandidate[] {
  return catalog
    .filter((species) => canAppear(species, timeOfDay, steps))
    .map((species) => ({
      species,
      weight:
        RARITY_WEIGHT[species.rarity] * (isBoostedRarity(species.rarity) ? boostMultiplier : 1),
    }))
}

/** 重みに比例して1種を選ぶ。random は 0 以上 1 未満の値を返す関数。 */
export function pickCandidate(
  candidates: readonly WeightedCandidate[],
  random: () => number,
): MobimonSpecies {
  const total = candidates.reduce((sum, c) => sum + c.weight, 0)
  if (candidates.length === 0 || total <= 0) throw new DomainError('出現できるモビモンがいません')
  let point = random() * total
  for (const candidate of candidates) {
    point -= candidate.weight
    if (point < 0) return candidate.species
  }
  return candidates[candidates.length - 1].species
}

/**
 * 出現させるモビモン種を決める(サービスの差別化の中心となるロジック)。
 * エネルギーを消費すると必ず1体出現する。
 */
export function generateEncounter(
  catalog: readonly MobimonSpecies[],
  timeOfDay: TimeOfDay,
  steps: CumulativeSteps,
  boostMultiplier: number,
  random: () => number,
): MobimonSpecies {
  return pickCandidate(encounterCandidates(catalog, timeOfDay, steps, boostMultiplier), random)
}
