import { PixelCard, Label } from './ui'
import { gbp, mins } from '../lib/format'
import type { Entry } from '../lib/recap'
import type { Priority } from '../lib/types'

const W = 440
const H = 250
const X0 = 52
const X1 = 424
const Y0 = 18
const Y1 = 208

export const PRIORITY_COLOR: Record<Priority, string> = {
  money: '#ffd54a',
  time: '#5aa9ff',
  health: '#ff6b6b',
  balanced: '#6ef07f',
}

const square = (health: number): number => 8 + health * 1.8

/**
 * Every choice you made on one chart: across is time, up is cost, and the size is how healthy it is.
 * A hollow square is your usual; a filled one is what you picked instead, joined by a line so you can
 * see which way each choice moved you.
 */
export function HabitMap({ entries, limit = 12 }: { entries: Entry[]; limit?: number }) {
  const shown = entries.slice(-limit)
  const maxT = Math.max(10, ...shown.flatMap((e) => [e.chosen.timeMin, e.usual.timeMin])) * 1.15
  const maxC = Math.max(1, ...shown.flatMap((e) => [e.chosen.costGBP, e.usual.costGBP])) * 1.15
  const sx = (t: number) => X0 + (t / maxT) * (X1 - X0)
  const sy = (c: number) => Y1 - (c / maxC) * (Y1 - Y0)
  const xTicks = [0, 0.5, 1].map((f) => Math.round(maxT * f))
  const yTicks = [0, 0.5, 1].map((f) => maxC * f)

  return (
    <PixelCard className="space-y-3">
      <Label>Your habit map</Label>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Chart of ${shown.length} choices: time across, cost up, size is health. Hollow squares are your usual, filled are what you chose.`}
      >
        {/* grid and axes */}
        {yTicks.map((c, i) => (
          <g key={`y${i}`} aria-hidden="true">
            <line x1={X0} x2={X1} y1={sy(c)} y2={sy(c)} stroke="#0a0a0a" strokeOpacity={i === 0 ? 1 : 0.15} strokeWidth={i === 0 ? 3 : 2} strokeDasharray={i === 0 ? undefined : '4 6'} />
            <text x={X0 - 6} y={sy(c) + 4} textAnchor="end" fontSize={11} className="num" fill="#0a0a0a">
              {gbp(c)}
            </text>
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text key={`x${i}`} x={sx(t)} y={Y1 + 18} textAnchor="middle" fontSize={11} className="num" fill="#0a0a0a" aria-hidden="true">
            {mins(t)}
          </text>
        ))}
        <line x1={X0} x2={X0} y1={Y0} y2={Y1} stroke="#0a0a0a" strokeWidth={3} aria-hidden="true" />
        <text x={X1} y={H - 6} textAnchor="end" className="font-pixel" fontSize={8} fill="#0a0a0a" aria-hidden="true">
          TIME TAKEN
        </text>
        <text x={8} y={12} className="font-pixel" fontSize={8} fill="#0a0a0a" aria-hidden="true">
          £ PER USE
        </text>

        {/* the shifts, then the squares */}
        {shown.map((e, i) =>
          e.chosen.id !== e.usual.id ? (
            <line key={`l${i}`} x1={sx(e.usual.timeMin)} y1={sy(e.usual.costGBP)} x2={sx(e.chosen.timeMin)} y2={sy(e.chosen.costGBP)} stroke="#0a0a0a" strokeWidth={2} strokeDasharray="3 3" aria-hidden="true" />
          ) : null,
        )}
        {shown.map((e, i) => {
          const us = square(e.usual.health)
          const cs = square(e.chosen.health)
          const ux = sx(e.usual.timeMin)
          const uy = sy(e.usual.costGBP)
          const cx = sx(e.chosen.timeMin)
          const cy = sy(e.chosen.costGBP)
          return (
            <g key={`p${i}`}>
              {e.chosen.id !== e.usual.id && (
                <rect x={ux - us / 2} y={uy - us / 2} width={us} height={us} fill="#ffffff" fillOpacity={0.9} stroke="#0a0a0a" strokeWidth={2}>
                  <title>{`Usual: ${e.usual.name}, ${gbp(e.usual.costGBP)}, ${mins(e.usual.timeMin)}, health ${e.usual.health}/10`}</title>
                </rect>
              )}
              <rect x={cx - cs / 2} y={cy - cs / 2} width={cs} height={cs} fill={PRIORITY_COLOR[e.record.priority]} stroke="#0a0a0a" strokeWidth={3}>
                <title>{`Chose: ${e.chosen.name}, ${gbp(e.chosen.costGBP)}, ${mins(e.chosen.timeMin)}, health ${e.chosen.health}/10`}</title>
              </rect>
            </g>
          )
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]" aria-label="Colour key">
        {(['money', 'time', 'health'] as const).map((p) => (
          <li key={p} className="flex items-center gap-2">
            <i className="block h-3 w-3 border-2 border-ink" style={{ background: PRIORITY_COLOR[p] }} aria-hidden="true" />
            {p === 'money' ? 'Money first' : p === 'time' ? 'Time first' : 'Health first'}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <i className="block h-3 w-3 border-2 border-ink bg-white" aria-hidden="true" />
          Your usual
        </li>
      </ul>
    </PixelCard>
  )
}
