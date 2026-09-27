import { useState, type FormEvent } from 'react'
import {
  parseManualEntry,
  parseStepText,
  stepValueError,
  toStepReadings,
  type StepImportResult,
  type StepImportUseCases,
  type StepReading,
  type StepSource,
} from '../stepResource/application/stepImport.ts'

interface Props {
  useCases: StepImportUseCases
}

/** 確認画面の1行。歩数は修正できるよう文字列で持つ。 */
interface DraftRow {
  key: number
  date: string
  stepsText: string
  source: StepSource
}

type Mode = 'manual' | 'screenCapture'

let nextKey = 1

function StepImportPage({ useCases }: Props) {
  const [status, setStatus] = useState(() => useCases.getStatus())
  const [mode, setMode] = useState<Mode>('manual')
  const [rows, setRows] = useState<DraftRow[]>([])
  const [notice, setNotice] = useState<string[]>([])
  const [recognizing, setRecognizing] = useState(false)
  const [result, setResult] = useState<StepImportResult>()

  const addRows = (readings: StepReading[], source: StepSource) => {
    setRows((current) => {
      const byDate = new Map(current.map((row) => [row.date, row]))
      for (const r of readings) {
        byDate.set(r.date, { key: nextKey++, date: r.date, stepsText: String(r.steps), source })
      }
      return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
    })
    setResult(undefined)
  }

  const rowError = (row: DraftRow): string | undefined => {
    const steps = parseStepText(row.stepsText)
    return steps === undefined ? '歩数を数字で入力してください' : stepValueError(steps)
  }

  const rowNote = (row: DraftRow): string | undefined => {
    if (row.date < status.startDate) return '利用開始日より前のため取り込まれません'
    if (row.date > status.today) return '今日より後のため取り込まれません'
    return undefined
  }

  const hasErrors = rows.some((row) => rowError(row))

  const handleImport = () => {
    const bySource = new Map<StepSource, StepReading[]>()
    for (const row of rows) {
      const list = bySource.get(row.source) ?? []
      list.push({ date: row.date, steps: parseStepText(row.stepsText)! })
      bySource.set(row.source, list)
    }
    const merged: StepImportResult = { imported: [], skipped: [], rejected: [], cumulativeSteps: 0 }
    for (const [source, readings] of bySource) {
      const r = useCases.importSteps(readings, source)
      merged.imported.push(...r.imported)
      merged.skipped.push(...r.skipped)
      merged.rejected.push(...r.rejected)
      merged.cumulativeSteps = r.cumulativeSteps
    }
    setResult(merged)
    setRows([])
    setNotice([])
    setStatus(useCases.getStatus())
  }

  const handleImage = async (file: File | undefined) => {
    if (!file) return
    setRecognizing(true)
    setNotice([])
    try {
      const recognized = await useCases.recognizeStepCalendar(file)
      if (!recognized.ok) {
        setNotice([recognized.error])
        return
      }
      const readings = toStepReadings(recognized.calendar)
      const { year, month, warnings } = recognized.calendar
      setNotice([`${year}年${month}月: ${readings.length}日分の歩数を読み取りました`, ...warnings])
      addRows(readings, 'screenCapture')
    } finally {
      setRecognizing(false)
    }
  }

  return (
    <section className="step-import">
      <h2>歩数の取り込み</h2>
      <dl className="status">
        <dt>利用開始日</dt>
        <dd>{status.startDate}</dd>
        <dt>今日の歩数</dt>
        <dd>{status.todaySteps.toLocaleString()}歩</dd>
        <dt>累計歩数</dt>
        <dd>{status.cumulativeSteps.toLocaleString()}歩</dd>
      </dl>

      <div role="tablist" className="tabs">
        <button role="tab" aria-selected={mode === 'manual'} onClick={() => setMode('manual')}>
          手入力
        </button>
        <button
          role="tab"
          aria-selected={mode === 'screenCapture'}
          onClick={() => setMode('screenCapture')}
        >
          画面キャプチャ
        </button>
      </div>

      {mode === 'manual' ? (
        <ManualEntryForm today={status.today} onAdd={(r) => addRows([r], 'manual')} />
      ) : (
        <div className="capture">
          <label>
            歩数画面のキャプチャ画像
            <input
              type="file"
              accept="image/*"
              disabled={recognizing}
              onChange={(e) => void handleImage(e.target.files?.[0])}
            />
          </label>
          <p className="hint">
            カレンダーに日々の歩数が表示された画面を選んでください。画像はこの端末の中で読み取り、外部には送りません。
          </p>
          {recognizing && <p role="status">読み取り中…</p>}
        </div>
      )}

      {notice.length > 0 && (
        <ul className="notice">
          {notice.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="confirm">
          <h3>取り込む内容の確認</h3>
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>歩数</th>
                <th>取り込み元</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const error = rowError(row)
                const note = rowNote(row)
                return (
                  <tr key={row.key}>
                    <td>{row.date}</td>
                    <td>
                      <input
                        aria-label={`${row.date} の歩数`}
                        inputMode="numeric"
                        value={row.stepsText}
                        aria-invalid={error ? true : undefined}
                        onChange={(e) =>
                          setRows((current) =>
                            current.map((r) =>
                              r.key === row.key ? { ...r, stepsText: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      {error && <p className="error">{error}</p>}
                      {!error && note && <p className="note">{note}</p>}
                    </td>
                    <td>{row.source === 'manual' ? '手入力' : '画面キャプチャ'}</td>
                    <td>
                      <button
                        aria-label={`${row.date} を削除`}
                        onClick={() =>
                          setRows((current) => current.filter((r) => r.key !== row.key))
                        }
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button className="primary" disabled={hasErrors} onClick={handleImport}>
            取り込む
          </button>
          {hasErrors && <p className="error">誤りのある行を修正してください</p>}
        </div>
      )}

      {result && <ImportResultView result={result} />}
    </section>
  )
}

function ManualEntryForm({ today, onAdd }: { today: string; onAdd: (r: StepReading) => void }) {
  const [date, setDate] = useState(today)
  const [steps, setSteps] = useState('')
  const [error, setError] = useState<string>()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseManualEntry(date, steps)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    setError(undefined)
    setSteps('')
    onAdd(parsed.reading)
  }

  return (
    <form className="manual" onSubmit={handleSubmit}>
      <label>
        日付
        <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        歩数
        <input inputMode="numeric" value={steps} onChange={(e) => setSteps(e.target.value)} />
      </label>
      <button type="submit">確認リストに追加</button>
      {error && <p className="error">{error}</p>}
    </form>
  )
}

function ImportResultView({ result }: { result: StepImportResult }) {
  const energy = result.imported.reduce((s, d) => s + d.energy, 0)
  const points = result.imported.reduce((s, d) => s + d.points, 0)
  return (
    <div className="result" role="status">
      <h3>取り込み結果</h3>
      <p>
        {result.imported.length}日分を取り込みました。エネルギー +{energy}、ポイント +{points}pt
      </p>
      {result.imported.length > 0 && (
        <ul>
          {result.imported.map((d) => (
            <li key={d.date}>
              {d.date}: {d.steps.toLocaleString()}歩(エネルギー +{d.energy}、ポイント +{d.points}
              pt)
            </li>
          ))}
        </ul>
      )}
      {[...result.skipped, ...result.rejected].length > 0 && (
        <>
          <h4>取り込まなかった日</h4>
          <ul>
            {[...result.skipped, ...result.rejected].map((d) => (
              <li key={d.date}>
                {d.date}: {d.reason}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default StepImportPage
