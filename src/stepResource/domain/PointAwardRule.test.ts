import { pointsForDailySteps } from './PointAwardRule.ts'
import { stepCount } from './quantities.ts'

describe('pointsForDailySteps', () => {
  it.each([
    [7_999, 0],
    [8_000, 10],
    [8_499, 10],
    [8_500, 15],
    [9_200, 20],
    [20_000, 130],
    [25_000, 130],
  ])('%i 歩 → %i pt', (steps, expected) => {
    expect(pointsForDailySteps(stepCount(steps))).toBe(expected)
  })
})
