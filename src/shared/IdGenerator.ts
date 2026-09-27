/** 一意な ID の発行元。テストでは連番に差し替える。 */
export interface IdGenerator {
  next(): string
}

export const randomIdGenerator: IdGenerator = { next: () => crypto.randomUUID() }

export function sequentialIdGenerator(prefix = 'id'): IdGenerator {
  let count = 0
  return { next: () => `${prefix}-${++count}` }
}
