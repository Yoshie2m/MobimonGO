import { parseLocalDate } from '../../shared/LocalDate.ts'
import { Walker, walkerId } from './Walker.ts'

export const d = parseLocalDate
export const WALKER_ID = walkerId('user-1')
export const walker = (startDate = '2026-09-04') => Walker.register(WALKER_ID, d(startDate))
