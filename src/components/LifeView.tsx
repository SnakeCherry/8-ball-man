import { useMemo, useState } from 'react'
import { PixelButton, PixelCard, PixelIcon, Label } from './ui'
import { MAX_YEARS, exchangeLine, formatSpan, lifeHeadline, projectLife, signedSpan, totalWeekly } from '../lib/life'
import type { LifeItem } from '../lib/life'

const W = 560
const H = 270
const X0 = 54
const X1 = 530
const Y0 = 20
const Y1 = 232
const TIME = '#5aa9ff'
const LIFE = '#ff6b6b'
const CHIPS = [1, 5, 10, 25, 50]
const DAY = 1440

/** A stepped path through yearly values: across a year, then up. */
function steps(xs: number[], ys: number[]): string {
  return xs.map((x, i) => (i === 0 ? `M ${x} ${ys[0]}` : `H ${x} V ${ys[i]}`)).join(' ')
}

/**
 * Keep these habits up and where do free time and life end up? Two lines over the years: free time banked or given up
 * (blue) and a rough estimate of life gained or lost (red). Illustrative only: see the note under the chart.
 */
export function LifeView({ items }: { items: LifeItem[] }) {
  const [years, setYears] = useState(10)
  const proj = useMemo(() => projectLife(items, years), [items, years])
  const weekly = useMemo(() => totalWeekly(items), [items])

  const lastTime = proj.time[proj.time.length - 1]
  const lastLife = proj.life[proj.life.length - 1]
  const hi = Math.max(0, ...proj.time, ...proj.life) / DAY
  const lo = Math.min(0, ...proj.time, ...proj.life) / DAY
  const span = Math.max(hi - lo, 1) * 1.12
  const top = hi + (span - (hi - lo)) / 2
  const sx = (y: number) => X0 + (y / years) * (X1 - X0)
  const sy = (days: number) => Y0 + ((top - days) / span) * (Y1 - Y0)
  const xs = proj.years.map(sx)
  const timePath = steps(xs, proj.time.map((m) => sy(m / DAY)))
  const lifePath = steps(xs, proj.life.map((m) => sy(m / DAY)))
  const ticks = [top - span * 0.05, (top + (top - span)) / 2, top - span * 0.95]
  const exchange = exchangeLine(weekly)

  return (
    <PixelCard className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Time vs life</Label>
        <span className="border-4 border-ink bg-white px-1 font-pixel text-[9px] uppercase">Rough estimate</span>
      </div>

      {items.length === 0 || (Math.abs(weekly.timeMin) < 1 && Math.abs(weekly.lifeMin) < 1) ? (
        <p className="text-[17px] leading-snug">
          {items.length === 0
            ? 'Pick a repeating habit and we will show what it adds up to over the years.'
            : 'These choices come out the same as your usual, so over the years nothing changes.'}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="border-4 border-ink p-3" style={{ background: '#e4f1ff' }}>
              <p className="flex items-center gap-2 font-pixel text-[9px] uppercase">
                <PixelIcon name="clock" size={2} color={TIME} /> Free time
              </p>
              <p className="num mt-2 text-[30px] font-semibold leading-none">{signedSpan(lastTime)}</p>
              <p className="mt-1 text-[13px]">{lastTime >= 0 ? 'banked' : 'given up'}</p>
            </div>
            <div className="border-4 border-ink p-3" style={{ background: '#ffe6e6' }}>
              <p className="flex items-center gap-2 font-pixel text-[9px] uppercase">
                <PixelIcon name="heart" size={2} color={LIFE} /> Life
              </p>
              <p className="num mt-2 text-[30px] font-semibold leading-none">{signedSpan(lastLife)}</p>
              <p className="mt-1 text-[13px]">{lastLife >= 0 ? 'could be gained' : 'could be lost'}</p>
            </div>
          </div>

          <p className="text-[19px] leading-snug">{lifeHeadline(lastTime, lastLife, years)}</p>

          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={lifeHeadline(lastTime, lastLife, years)}>
            {ticks.map((t, i) => (
              <g key={i} aria-hidden="true">
                <line x1={X0} x2={X1} y1={sy(t)} y2={sy(t)} stroke="#0a0a0a" strokeOpacity={0.15} strokeWidth={2} strokeDasharray="4 6" />
                <text x={X0 - 6} y={sy(t) + 4} textAnchor="end" fontSize={10} className="num" fill="#0a0a0a">
                  {t >= 0 ? '' : '−'}
                  {formatSpan(Math.abs(t) * DAY)}
                </text>
              </g>
            ))}
            <line x1={X0} x2={X1} y1={sy(0)} y2={sy(0)} stroke="#0a0a0a" strokeWidth={3} aria-hidden="true" />
            <line x1={X0} x2={X0} y1={Y0} y2={Y1} stroke="#0a0a0a" strokeWidth={3} aria-hidden="true" />
            {[0, 0.5, 1].map((f) => (
              <text key={f} x={X0 + f * (X1 - X0)} y={Y1 + 22} textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'} className="font-pixel" fontSize={8} fill="#0a0a0a" aria-hidden="true">
                {f === 0 ? 'NOW' : `${Math.round(years * f)} YR`}
              </text>
            ))}
            {/* the lines draw themselves in stepped frames; the key restarts them when the years change */}
            <path key={`t${years}`} d={timePath} pathLength={1} fill="none" stroke={TIME} strokeWidth={5} strokeLinejoin="miter" className="life-line" />
            <path key={`l${years}`} d={lifePath} pathLength={1} fill="none" stroke={LIFE} strokeWidth={5} strokeLinejoin="miter" className="life-line" style={{ animationDelay: '0.25s' }} />
            <rect x={X1 - 7} y={sy(lastTime / DAY) - 7} width={14} height={14} fill={TIME} stroke="#0a0a0a" strokeWidth={3} aria-hidden="true" />
            <rect x={X1 - 7} y={sy(lastLife / DAY) - 7} width={14} height={14} fill={LIFE} stroke="#0a0a0a" strokeWidth={3} aria-hidden="true" />
          </svg>

          {exchange && <p className="text-[17px] leading-snug">{exchange}</p>}
        </>
      )}

      <div className="space-y-2">
        <label className="block text-[15px]">
          Keep it up for <b className="num">{years} {years === 1 ? 'year' : 'years'}</b>
          <input type="range" className="pslider mt-2" min={1} max={MAX_YEARS} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick years">
          {CHIPS.map((c) => (
            <PixelButton key={c} variant={years === c ? 'lime' : 'white'} className="!min-h-[36px] !px-3 !py-1 text-[13px]" aria-pressed={years === c} onClick={() => setYears(c)}>
              {c} {c === 1 ? 'year' : 'years'}
            </PixelButton>
          ))}
        </div>
      </div>

      <p className="text-[13px] leading-snug text-ink/70">
        A rough, illustrative estimate, not medical advice. It assumes one of our 1 to 10 health points is worth about 30 minutes of life each time,
        based on the idea that average effects on a whole population can be counted in minutes. Our health scores are our own judgement.
      </p>
    </PixelCard>
  )
}
