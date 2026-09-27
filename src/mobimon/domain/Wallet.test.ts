import { DomainError } from '../../shared/DomainError.ts'
import { grantId } from './ids.ts'
import { energy, point } from './quantities.ts'
import { PLAYER } from './testHelpers.ts'
import { Wallet } from './Wallet.ts'

describe('Wallet', () => {
  it('付与を受け取り、同じ GrantId は二度加算しない', () => {
    const wallet = Wallet.create(PLAYER)
      .receiveEnergy(grantId('g1'), energy(80))
      .receiveEnergy(grantId('g1'), energy(80))
      .receivePoints(grantId('g2'), point(10))
      .receivePoints(grantId('g2'), point(10))
    expect(wallet).toMatchObject({ energy: 80, points: 10 })
  })

  it('残高を超えて消費できない', () => {
    const wallet = Wallet.create(PLAYER).receiveEnergy(grantId('g1'), energy(10))
    expect(wallet.spendEnergy(energy(10)).energy).toBe(0)
    expect(() => wallet.spendEnergy(energy(11))).toThrow(DomainError)
    expect(() => wallet.spendPoints(point(1))).toThrow(DomainError)
  })
})
