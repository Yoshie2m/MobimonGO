import { DomainError } from '../../shared/DomainError.ts'

export type Energy = number & { readonly __brand: 'Energy' }
export type Point = number & { readonly __brand: 'Point' }
export type CumulativeSteps = number & { readonly __brand: 'CumulativeSteps' }
export type Experience = number & { readonly __brand: 'Experience' }
/** レベル。1〜30。 */
export type Level = number & { readonly __brand: 'Level' }

export const MAX_LEVEL = 30

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainError(`${name}は 0 以上の整数です: ${value}`)
  }
  return value
}

export const energy = (v: number) => nonNegativeInteger(v, 'エネルギー') as Energy
export const point = (v: number) => nonNegativeInteger(v, 'ポイント') as Point
export const cumulativeSteps = (v: number) => nonNegativeInteger(v, '累計歩数') as CumulativeSteps
export const experience = (v: number) => nonNegativeInteger(v, '経験値') as Experience
export const level = (v: number) => {
  if (!Number.isInteger(v) || v < 1 || v > MAX_LEVEL) {
    throw new DomainError(`レベルは 1〜${MAX_LEVEL} です: ${v}`)
  }
  return v as Level
}

/** 出現1回のエネルギー消費量。ゲームの調整値。 */
export const EncounterCost = energy(10)
/** 育成1回のエネルギー消費量。ゲームの調整値。 */
export const TrainingCost = energy(10)
