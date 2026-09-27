import { timeOfDayAt, type TimeOfDay } from './TimeOfDay.ts'

const at = (hour: number, minute: number) => new Date(2026, 8, 28, hour, minute)

describe('timeOfDayAt', () => {
  it.each<[number, number, TimeOfDay]>([
    [4, 59, '夜'],
    [5, 0, '朝'],
    [9, 59, '朝'],
    [10, 0, '昼'],
    [15, 59, '昼'],
    [16, 0, '夕'],
    [18, 59, '夕'],
    [19, 0, '夜'],
    [0, 0, '夜'],
  ])('%i:%i は %s', (hour, minute, expected) => {
    expect(timeOfDayAt(at(hour, minute))).toBe(expected)
  })
})
