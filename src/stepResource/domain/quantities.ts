import { DomainError } from '../../shared/DomainError.ts'

/** 歩数。0 以上の整数。 */
export type StepCount = number & { readonly __brand: 'StepCount' }
/** 累計歩数。0 以上の整数。 */
export type CumulativeSteps = number & { readonly __brand: 'CumulativeSteps' }
/** エネルギー。0 以上の整数。 */
export type Energy = number & { readonly __brand: 'Energy' }
/** ポイント。0 以上の整数。 */
export type Point = number & { readonly __brand: 'Point' }

function nonNegativeInteger(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainError(`${name}は 0 以上の整数です: ${value}`)
  }
  return value
}

export const stepCount = (value: number) => nonNegativeInteger(value, '歩数') as StepCount
export const cumulativeSteps = (value: number) =>
  nonNegativeInteger(value, '累計歩数') as CumulativeSteps
export const energy = (value: number) => nonNegativeInteger(value, 'エネルギー') as Energy
export const point = (value: number) => nonNegativeInteger(value, 'ポイント') as Point
