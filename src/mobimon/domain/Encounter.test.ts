import { DomainError } from '../../shared/DomainError.ts'
import { Encounter } from './Encounter.ts'
import { encounterId, mobimonSpeciesId } from './ids.ts'
import { PLAYER } from './testHelpers.ts'

const appear = () => Encounter.appear(encounterId('e1'), PLAYER, mobimonSpeciesId('M001')).encounter

describe('Encounter', () => {
  it('出現中なら捕獲でき、MobimonCaptured を返す', () => {
    const { encounter, event } = appear().capture()
    expect(encounter.state).toBe('捕獲済み')
    expect(event).toMatchObject({ type: 'MobimonCaptured', speciesId: 'M001' })
  })

  it('捕獲済み・逃走済みの出現は再度捕獲できない', () => {
    expect(() => appear().capture().encounter.capture()).toThrow(DomainError)
    expect(() => appear().flee().capture()).toThrow(DomainError)
  })
})
