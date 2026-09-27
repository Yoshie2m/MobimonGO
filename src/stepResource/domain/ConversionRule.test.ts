import { energyForDailySteps } from './ConversionRule.ts'
import { stepCount } from './quantities.ts'

describe('energyForDailySteps', () => {
  it.each([
    [0, 0],
    [99, 0],
    [100, 1],
    [8_000, 80],
    [20_000, 200],
    [25_000, 200],
  ])('%i 歩 → %i エネルギー', (steps, expected) => {
    expect(energyForDailySteps(stepCount(steps))).toBe(expected)
  })
})
