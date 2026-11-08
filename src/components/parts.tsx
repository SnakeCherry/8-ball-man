import { PRIORITY_CHIPS } from '../data/copy'
import { gbp, mins, score } from '../lib/format'
import type { Axis, Option, Priority } from '../lib/types'
import { PixelIcon } from './ui'
import type { SpriteName } from './ui'

export const AXIS_ICON: Record<Axis, SpriteName> = { cost: 'pound', time: 'clock', health: 'heart' }

export function axisText(o: Option, axis: Axis): string {
  return axis === 'cost' ? gbp(o.costGBP) : axis === 'time' ? mins(o.timeMin) : score(o.health)
}

export const axisFormat: Record<Axis, (n: number) => string> = { cost: gbp, time: mins, health: score }

/** The three numbers for an option, each with a labelled icon (never colour alone). */
export function OptionStats({ option, best }: { option: Option; best?: Partial<Record<Axis, boolean>> }) {
  return (
    <ul className="num mt-2 grid grid-cols-3 gap-1 text-[18px]">
      {(['cost', 'time', 'health'] as Axis[]).map((a) => (
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
