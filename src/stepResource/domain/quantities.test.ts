import { DomainError } from '../../shared/DomainError.ts'
import { energy, stepCount } from './quantities.ts'

describe('quantities', () => {
  it('0 以上の整数を受け付ける', () => {
    expect(stepCount(0)).toBe(0)
    expect(energy(12)).toBe(12)
  })

  it.each([-1, 1.5, Number.NaN])('%s は受け付けない', (value) => {
    expect(() => stepCount(value)).toThrow(DomainError)
  })
})
