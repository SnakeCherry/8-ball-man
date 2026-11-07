import { useEffect, useState } from 'react'
import { PRIORITY_CHIPS } from '../data/copy'
import { gbp, kg, mins } from '../lib/format'
import type { Axis, Option, Priority } from '../lib/types'
import { PixelIcon } from './ui'
import type { SpriteName } from './ui'

export const AXIS_ICON: Record<Axis, SpriteName> = { cost: 'pound', time: 'clock', co2: 'leaf' }

export function axisText(o: Option, axis: Axis): string {
  return axis === 'cost' ? gbp(o.costGBP) : axis === 'time' ? mins(o.timeMin) : kg(o.co2Kg)
}

export const axisFormat: Record<Axis, (n: number) => string> = { cost: gbp, time: mins, co2: kg }

/** The three numbers for an option, each with a labelled icon (never colour alone). */
export function OptionStats({ option, best }: { option: Option; best?: Partial<Record<Axis, boolean>> }) {
  return (
    <ul className="num mt-2 grid grid-cols-3 gap-1 text-[18px]">
      {(['cost', 'time', 'co2'] as Axis[]).map((a) => (
        <li key={a} className={`flex items-center gap-1 ${best?.[a] ? 'font-semibold' : ''}`}>
          <PixelIcon name={AXIS_ICON[a]} size={2} />
          <span>{axisText(option, a)}</span>
        </li>
      ))}
    </ul>
  )
}

export function VibeChips({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2" role="group" aria-label="What matters this week">
      {PRIORITY_CHIPS.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={value === c.id}
          onClick={() => onChange(c.id)}
          className="pbox-flat pselect px-3 py-2 text-[15px] leading-tight"
        >
          {c.label}
        </button>
      ))}
    </div>
  )
}

/** A block track with a marker that hops in steps, and a ghost showing where you were. */
export function GoalPath({ from, to }: { from: number; to: number }) {
  const [shown, setShown] = useState(from)
  useEffect(() => {
    const t = setTimeout(() => setShown(to), 250)
    return () => clearTimeout(t)
  }, [to])

  const cells = 20
  const filled = Math.round(shown * cells)
  const pos = (p: number) => `${Math.min(100, Math.max(0, p * 100))}%`

  return (
    <div className="relative mx-3 mt-6 h-20" aria-hidden="true">
      <div className="absolute inset-x-0 top-10 flex h-6 border-4 border-ink bg-white">
        {Array.from({ length: cells }, (_, i) => (
          <i
            key={i}
            className={`h-full flex-1 border-r-2 border-ink/20 ${i < filled ? (i % 2 ? 'bg-lime' : 'bg-jade') : ''}`}
            style={{ transition: 'background-color 0.2s steps(2)' }}
          />
        ))}
      </div>
      {from !== to && (
        <div className="absolute top-0 opacity-50" style={{ left: pos(from), transform: 'translateX(-50%)' }}>
          <PixelIcon name="sparkle" size={4} color="#0a0a0a" />
        </div>
      )}
      <div
        className="anim-bob absolute top-0"
        style={{ left: pos(shown), transform: 'translateX(-50%)', transition: 'left 0.8s steps(8)' }}
      >
        <PixelIcon name="star" size={4} color="#16b77d" />
      </div>
      <div className="absolute right-0 top-0 font-pixel text-[9px]">GOAL</div>
    </div>
  )
}
