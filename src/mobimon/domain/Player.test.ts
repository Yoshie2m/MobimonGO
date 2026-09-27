import { titleId } from './ids.ts'
import { Player } from './Player.ts'
import { PLAYER } from './testHelpers.ts'

describe('Player', () => {
  it('累計歩数は増える方向にだけ更新する(古い値は無視)', () => {
    const player = Player.create(PLAYER).updateCumulativeSteps(20_000)
    expect(player.updateCumulativeSteps(15_000).cumulativeSteps).toBe(20_000)
    expect(player.updateCumulativeSteps(25_000).cumulativeSteps).toBe(25_000)
  })

  it('同じ称号は重複しない', () => {
    const t = titleId('d-world')
    expect(Player.create(PLAYER).grantTitle(t).grantTitle(t).titles).toEqual([t])
  })
})
