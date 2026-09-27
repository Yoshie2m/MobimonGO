import { isBusinessField, type BusinessField } from '../domain/BusinessField.ts'
import { encounterCondition } from '../domain/EncounterCondition.ts'
import { mobimonSpeciesId, type MobimonSpeciesId } from '../domain/ids.ts'
import type { MobimonSpecies } from '../domain/MobimonSpecies.ts'
import { RARITIES, type Rarity } from '../domain/Rarity.ts'
import { TIMES_OF_DAY, type TimeOfDay } from '../domain/TimeOfDay.ts'

/** 進化に必要なレベル。系統の1段階目 → 2段階目は Lv10、2段階目 → 3段階目は Lv20。 */
const EVOLUTION_LEVEL_FROM_FIRST_STAGE = 10
const EVOLUTION_LEVEL_FROM_SECOND_STAGE = 20

interface Row {
  id: MobimonSpeciesId
  name: string
  field: BusinessField | null
  product: string | null
  component: string | null
  rarity: Rarity
  times: TimeOfDay[]
  unlockSteps: number
  evolvesFromName: string | null
  evolvesToNames: string[]
  description: string
}

/**
 * MOBIMON_LIST.md(確定版)の「3. 種リスト」の表から、モビモン種のマスターデータを作る。
 * 事業分野は表の直前の見出し(### 事業分野名)から読む。
 */
export function parseMobimonList(markdown: string): MobimonSpecies[] {
  const rows: Row[] = []
  let heading: string | null = null
  for (const line of markdown.split('\n')) {
    if (line.startsWith('### ')) heading = line.slice(4).trim()
    if (!/^\| M\d{3} \|/.test(line)) continue
    rows.push(parseRow(line, heading))
  }

  const byName = new Map(rows.map((r) => [r.name, r]))
  const idOf = (name: string) => {
    const row = byName.get(name)
    if (!row) throw new Error(`MOBIMON_LIST.md: 進化元・進化先の種が見つかりません: ${name}`)
    return row.id
  }

  return rows.map((row) => {
    const evolvesTo = row.evolvesToNames.map(idOf)
    const evolutionLevel =
      evolvesTo.length === 0
        ? null
        : row.evolvesFromName === null
          ? EVOLUTION_LEVEL_FROM_FIRST_STAGE
          : EVOLUTION_LEVEL_FROM_SECOND_STAGE
    return {
      id: row.id,
      name: row.name,
      rarity: row.rarity,
      condition: encounterCondition(row.times, row.unlockSteps),
      businessField: row.field,
      product: row.product,
      component: row.component,
      evolvesTo,
      evolutionLevel,
      description: row.description,
    }
  })
}

function parseRow(line: string, heading: string | null): Row {
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
  const [no, name, product, component, rarity, times, unlock, from, to, description] = cells
  const none = (v: string) => (v === '—' ? null : v)

  if (!(RARITIES as readonly string[]).includes(rarity)) {
    throw new Error(`MOBIMON_LIST.md: ${no} のレア度が不正です: ${rarity}`)
  }
  const timesOfDay: TimeOfDay[] =
    times === '全時間帯'
      ? [...TIMES_OF_DAY]
      : times.split(/[・、]/).map((t) => {
          if (!(TIMES_OF_DAY as readonly string[]).includes(t)) {
            throw new Error(`MOBIMON_LIST.md: ${no} の出現時間帯が不正です: ${times}`)
          }
          return t as TimeOfDay
        })
  const unlockSteps = Number(unlock.replace(/[,歩]/g, ''))
  if (!Number.isInteger(unlockSteps)) {
    throw new Error(`MOBIMON_LIST.md: ${no} の解放歩数が不正です: ${unlock}`)
  }

  return {
    id: mobimonSpeciesId(no),
    name,
    field: heading && isBusinessField(heading) ? heading : null,
    product: none(product),
    component: none(component),
    rarity: rarity as Rarity,
    times: timesOfDay,
    unlockSteps,
    evolvesFromName: none(from),
    evolvesToNames: none(to)?.split('、') ?? [],
    description,
  }
}
