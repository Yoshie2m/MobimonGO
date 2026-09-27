import type { ReactNode } from 'react'
import { fieldIcon } from '../design-system/index.ts'

/*
 * デザインシステムのトークンで組んだ、このアプリ用の小さな部品。
 * (デザインシステム自体には含まれていないため ui/ 側に置く)
 */

/** タグ・チップ。accent-soft の地に ink の文字。 */
export function Tag({ children }: { children: ReactNode }) {
  return <span className="tag label">{children}</span>
}

/** 進み具合のバー。値は必ず文字でも添える。 */
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(value, max)}
    >
      <div className="progress__fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  )
}

/** 操作の結果やエラーを伝える。色だけに頼らず、先頭に言葉を添える。 */
export function Notice({ tone, children }: { tone: 'success' | 'danger'; children: ReactNode }) {
  return (
    <div className={`notice notice--${tone} body`} role={tone === 'danger' ? 'alert' : 'status'}>
      <span className="body-strong">{tone === 'success' ? '完了' : 'ご確認ください'}</span>
      <span>{children}</span>
    </div>
  )
}

/** 事業分野のアイコン(対応するアイコンがない分野は何も表示しない)。 */
export function FieldIcon({ field, size = 24 }: { field: string | null; size?: number }) {
  const src = fieldIcon(field)
  if (!src) return null
  return <img src={src} width={size} height={size} alt="" className="field-icon" />
}
