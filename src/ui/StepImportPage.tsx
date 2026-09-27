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
import { Notice } from './components/parts.tsx'
import { formatNumber, messageOf } from './components/format.ts'
import { Button, Card } from './design-system/index.ts'

interface Props {
  useCases: StepImportUseCases
  onImported?: () => void
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

function StepImportPage({ useCases, onImported }: Props) {
  const [status, setStatus] = useState(() => useCases.getStatus())
  const [mode, setMode] = useState<Mode>('manual')
  const [rows, setRows] = useState<DraftRow[]>([])
  const [notice, setNotice] = useState<string[]>([])
  const [error, setError] = useState<string>()
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
    setError(undefined)
    try {
      const bySource = new Map<StepSource, StepReading[]>()
      for (const row of rows) {
        const list = bySource.get(row.source) ?? []
        list.push({ date: row.date, steps: parseStepText(row.stepsText)! })
        bySource.set(row.source, list)
      }
      const merged: StepImportResult = {
        imported: [],
        skipped: [],
        rejected: [],
        cumulativeSteps: 0,
      }
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
      onImported?.()
    } catch (e) {
      setError(messageOf(e))
    }
  }

  const handleImage = async (file: File | undefined) => {
    if (!file) return
    setRecognizing(true)
    setNotice([])
    setError(undefined)
    try {
      const recognized = await useCases.recognizeStepCalendar(file)
      if (!recognized.ok) {
        setError(recognized.error)
        return
      }
      const readings = toStepReadings(recognized.calendar)
      const { year, month, warnings } = recognized.calendar
      setNotice([`${year}年${month}月: ${readings.length}日分の歩数を読み取りました`, ...warnings])
      addRows(readings, 'screenCapture')
    } catch (e) {
      setError(messageOf(e))
    } finally {
      setRecognizing(false)
    }
  }

  return (
    <section className="page" aria-labelledby="steps-title">
      <div className="page__head">
        <h2 id="steps-title" className="heading">
          歩数の取り込み
        </h2>
        <p className="caption muted">
          100歩でエネルギー 1、目標 {formatNumber(status.stepGoal)}歩の達成で 10pt
          を受け取れます(1日 20,000歩まで)。
        </p>
      </div>

      <div className="grid">
        <Card
          title="今日の歩数"
          meta={status.today}
          value={`${formatNumber(status.todaySteps)}歩`}
        />
        <Card
          title="累計歩数"
          meta={`利用開始日 ${status.startDate}`}
          value={`${formatNumber(status.cumulativeSteps)}歩`}
        />
      </div>

      <div className="nav" role="tablist" aria-label="取り込み方法">
        <button
          role="tab"
          className="nav__item label"
          aria-selected={mode === 'manual'}
          aria-current={mode === 'manual' ? 'page' : undefined}
          onClick={() => setMode('manual')}
        >
          手入力
        </button>
        <button
          role="tab"
          className="nav__item label"
          aria-selected={mode === 'screenCapture'}
          aria-current={mode === 'screenCapture' ? 'page' : undefined}
          onClick={() => setMode('screenCapture')}
        >
          画面キャプチャ
        </button>
      </div>

      <Card
        title={mode === 'manual' ? '日付と歩数を入力' : '歩数画面のキャプチャを読み込む'}
        meta={
          mode === 'manual'
            ? '確認リストに追加してから取り込みます'
            : '画像はこの端末の中で読み取り、外部には送りません'
        }
      >
        {mode === 'manual' ? (
          <ManualEntryForm today={status.today} onAdd={(r) => addRows([r], 'manual')} />
        ) : (
          <div className="stack">
            <label className="field">
              <span className="label">歩数画面のキャプチャ画像</span>
              <input
                type="file"
                accept="image/*"
                disabled={recognizing}
                onChange={(e) => void handleImage(e.target.files?.[0])}
              />
            </label>
            <p className="caption muted">
              カレンダーに日々の歩数が表示された画面を選んでください。
            </p>
            {recognizing && (
              <p role="status" className="body">
                読み取り中です
              </p>
            )}
          </div>
        )}
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}
      {notice.length > 0 && (
        <Notice tone="success">
          <span className="stack">
            {notice.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </span>
        </Notice>
      )}

      {rows.length > 0 && (
        <Card title="取り込む内容の確認" meta={`${rows.length}日分`}>
          <table className="table">
            <thead>
              <tr>
                <th className="label">日付</th>
                <th className="label">歩数</th>
                <th className="label">取り込み元</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowErr = rowError(row)
                const note = rowNote(row)
                return (
                  <tr key={row.key}>
                    <td className="body">{row.date}</td>
                    <td>
                      <input
                        className="input"
                        aria-label={`${row.date} の歩数`}
                        inputMode="numeric"
                        value={row.stepsText}
                        aria-invalid={rowErr ? true : undefined}
                        onChange={(e) =>
                          setRows((current) =>
                            current.map((r) =>
                              r.key === row.key ? { ...r, stepsText: e.target.value } : r,
                            ),
                          )
                        }
                      />
                      {rowErr && <p className="caption status-danger">{rowErr}</p>}
                      {!rowErr && note && <p className="caption muted">{note}</p>}
                    </td>
                    <td className="body">
                      {row.source === 'manual' ? '手入力' : '画面キャプチャ'}
                    </td>
                    <td>
                      <Button
                        size="small"
                        variant="secondary"
                        aria-label={`${row.date} を削除`}
                        onClick={() =>
                          setRows((current) => current.filter((r) => r.key !== row.key))
                        }
                      >
                        削除
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="actions">
            <Button disabled={hasErrors} onClick={handleImport}>
              取り込む
            </Button>
          </div>
          {hasErrors && (
            <p className="caption status-danger">誤りのある行を修正してから取り込んでください</p>
          )}
        </Card>
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
    <form className="stack" onSubmit={handleSubmit}>
      <div className="row">
        <label className="field">
          <span className="label">日付</span>
          <input
            className="input"
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">歩数</span>
          <input
            className="input"
            inputMode="numeric"
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
        </label>
      </div>
      <div className="actions">
        <Button type="submit" variant="secondary">
          確認リストに追加
        </Button>
      </div>
      {error && <p className="caption status-danger">{error}</p>}
    </form>
  )
}

function ImportResultView({ result }: { result: StepImportResult }) {
  const energy = result.imported.reduce((s, d) => s + d.energy, 0)
  const points = result.imported.reduce((s, d) => s + d.points, 0)
  const notImported = [...result.skipped, ...result.rejected]
  return (
    <Card
      title="取り込み結果"
      meta={`${result.imported.length}日分を取り込みました`}
      value={`+${formatNumber(energy)}`}
      delta={`ポイント +${points}pt`}
      deltaTone="positive"
    >
      <div className="stack" role="status">
        <p className="caption muted">
          エネルギー +{formatNumber(energy)}、ポイント +{points}pt
        </p>
        {result.imported.length > 0 && (
          <ul className="list">
            {result.imported.map((d) => (
              <li key={d.date} className="body">
                {d.date}: {formatNumber(d.steps)}歩(エネルギー +{d.energy}、ポイント +{d.points}pt)
              </li>
            ))}
          </ul>
        )}
        {notImported.length > 0 && (
          <>
            <p className="body-strong">取り込まなかった日</p>
            <ul className="list">
              {notImported.map((d) => (
                <li key={d.date} className="body">
                  {d.date}: {d.reason}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  )
}

export default StepImportPage
