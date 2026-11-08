import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { SPRITES } from '../lib/sprites'
import type { SpriteName } from '../lib/sprites'

export type { SpriteName }

export function PixelIcon({
  name,
  size = 4,
  color = 'currentColor',
  className = '',
}: {
  name: SpriteName
  size?: number
  color?: string
  className?: string
}) {
  const rows = SPRITES[name]
  return (
    <svg
      className={`sprite inline-block shrink-0 ${className}`}
      width={8 * size}
      height={8 * size}
      viewBox="0 0 8 8"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} /> : null)),
      )}
    </svg>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'lime' | 'white' | 'ink' | 'danger' }

export function PixelButton({ variant = 'lime', className = '', ...rest }: BtnProps) {
  const v =
    variant === 'white' ? 'pbtn-white' : variant === 'ink' ? 'pbtn-ink' : variant === 'danger' ? 'pbtn-danger' : ''
  return <button type="button" {...rest} className={`pbtn ${v} ${className}`} />
}

export function PixelCard({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`pcard p-4 ${className}`} style={style}>
      {children}
    </div>
  )
}

export function PixelBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div className={`pbar ${className}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Title({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h1 className={`font-pixel text-[15px] leading-6 ${className}`}>{children}</h1>
}

export function Label({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={className}>
      <span className="inline-block bg-lime px-1.5 font-pixel text-[12px] uppercase leading-5">{children}</span>
    </p>
  )
}
