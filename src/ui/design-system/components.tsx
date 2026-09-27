import type { ButtonHTMLAttributes, ReactNode } from 'react'

/*
 * デザインシステム「Mobimon」の Button / Card を React(TypeScript)に移したもの。
 * 見た目は bundle.css(デザインシステムからそのまま複製)のクラスに従い、
 * props はデザインシステムの components/index.d.ts と同じにしている。
 */

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ')

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 主要な操作は primary(1つの画面・カードにつき1つまで)。それ以外は secondary。 @default "primary" */
  variant?: 'primary' | 'secondary'
  /** カードの中の軽い操作は small。 @default "default" */
  size?: 'default' | 'small'
}

export function Button({
  variant = 'primary',
  size = 'default',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'mm-btn',
        `mm-btn--${variant}`,
        size === 'small' && 'mm-btn--sm',
        'label',
        className,
      )}
      {...rest}
    />
  )
}

export interface CardProps {
  /** 指標名やセクション名。 */
  title?: ReactNode
  /** 「今日」「過去7日間」などの補足。 */
  meta?: ReactNode
  /** 主要な数値(大きく表示する)。 */
  value?: ReactNode
  /** 前期間との差分。必ず矢印と一緒に表示される。 */
  delta?: ReactNode
  /** positive は success の▲、negative は danger の▼。 */
  deltaTone?: 'positive' | 'negative'
  /** 常に目立たせたいカード(重要なお知らせなど)。 */
  elevated?: boolean
  className?: string
  children?: ReactNode
}

export function Card({
  title,
  meta,
  value,
  delta,
  deltaTone,
  elevated,
  className,
  children,
}: CardProps) {
  const arrow = deltaTone === 'negative' ? '▼' : deltaTone === 'positive' ? '▲' : ''
  return (
    <div className={cx('mm-card', elevated && 'mm-card--elevated', className)}>
      {(title || meta) && (
        <div className="mm-card__head">
          {title && <div className="mm-card__title heading">{title}</div>}
          {meta && <div className="mm-card__meta caption">{meta}</div>}
        </div>
      )}
      {value != null && (
        <div className="mm-card__stat">
          <div className="mm-card__value display">{value}</div>
          {delta && (
            <span
              className={cx('mm-card__delta', deltaTone && `mm-card__delta--${deltaTone}`, 'label')}
            >
              {arrow ? `${arrow} ` : ''}
              {delta}
            </span>
          )}
        </div>
      )}
      {children && <div className="mm-card__body body">{children}</div>}
    </div>
  )
}
