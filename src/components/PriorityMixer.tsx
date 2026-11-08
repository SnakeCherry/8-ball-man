import { useEffect, useRef, useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelIcon } from './ui'
import type { SpriteName } from './ui'
import { gbp, mins, score } from '../lib/format'
import { MIX_MAX, contributions, valuesToWeights, weightsText, weightsToValues } from '../lib/mix'
import type { Mix } from '../lib/mix'
import type { Axis, Option, Weights } from '../lib/types'

export const AXIS_COLOR: Record<Axis, string> = { cost: '#ffd54a', time: '#5aa9ff', health: '#ff6b6b' }
const AXIS_NAME: Record<Axis, string> = { cost: 'Money', time: 'Time', health: 'Health' }
const AXIS_ICON: Record<Axis, SpriteName> = { cost: 'pound', time: 'clock', health: 'heart' }
const AXES: Axis[] = ['cost', 'time', 'health']

const MEDAL = ['#f7c948', '#c9d0d8', '#d28a4c']
const ROW_H = 84
const ROW_GAP = 10

const word = (v: number): string => (v === 0 ? 'Not at all' : v <= 3 ? 'A little' : v <= 6 ? 'Some' : v <= 8 ? 'A lot' : 'Most of all')

/**
 * Say how much money, time and health matter with three sliders. Underneath, every option is a row with a bar made
 * of three coloured parts (how much each priority adds to it), and the rows re-order live as you drag, so you can
 * see why one wins. Click a row to pick that option.
 */
export function PriorityMixer({
  options,
  weights,
  onChange,
  selectedId,
  onSelect,
}: {
  options: Option[]
  weights: Weights
  onChange: (w: Weights) => void
  selectedId: string
  onSelect: (id: string) => void
}) {
  // the sliders start where the current weights are, then belong to the student
  const [mix, setMix] = useState<Mix>(() => weightsToValues(weights))
  const live = valuesToWeights(mix)
  const board = contributions(options, weights)
  const bestFit = Math.max(board[0].fit, 0.0001)
  const rankOf = new Map(board.map((c, i) => [c.option.id, i]))

  const set = (axis: Axis, v: number) => {
    const next = { ...mix, [axis]: v }
    setMix(next)
    onChange(valuesToWeights(next))
  }

  // a tick when a different option takes the lead
  const lead = useRef(board[0].option.id)
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    if (lead.current !== board[0].option.id) {
      lead.current = board[0].option.id
      setPulse((p) => p + 1)
    }
  }, [board])

  return (
    <div className="space-y-5">
      <div className="space-y-3" role="group" aria-label="What matters to you">
        {AXES.map((a) => (
          <label key={a} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 sm:grid-cols-[110px_1fr_110px]">
            <span className="flex items-center gap-2 text-[18px]">
              <span className="grid h-[34px] w-[34px] place-items-center border-4 border-ink" style={{ background: AXIS_COLOR[a] }} aria-hidden="true">
                <PixelIcon name={AXIS_ICON[a]} size={2} color="#0a0a0a" />
              </span>
              {AXIS_NAME[a]}
            </span>
            <input
              type="range"
              className="pslider"
              min={0}
              max={MIX_MAX}
              step={1}
              value={mix[a]}
              aria-label={`How much ${AXIS_NAME[a].toLowerCase()} matters`}
              aria-valuetext={`${AXIS_NAME[a]}: ${word(mix[a])}`}
              onChange={(e) => set(a, Number(e.target.value))}
            />
            <span className="col-span-2 text-[14px] text-ink/70 sm:col-span-1 sm:text-right">{word(mix[a])}</span>
          </label>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="num text-[14px] text-ink/70" aria-live="off">
            {weightsText(live)}
          </p>
          <button
            type="button"
            className="pbtn pbtn-white !min-h-[36px] !px-3 !py-1 text-[13px]"
            onClick={() => {
              const even = { cost: 5, time: 5, health: 5 }
              setMix(even)
              onChange(valuesToWeights(even))
            }}
          >
            Even mix
          </button>
        </div>
      </div>

      <div>
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px]" aria-label="Colour key">
          {AXES.map((a) => (
            <li key={a} className="flex items-center gap-2">
              <i className="block h-3 w-3 border-2 border-ink" style={{ background: AXIS_COLOR[a] }} aria-hidden="true" />
              {AXIS_NAME[a]} adds
            </li>
          ))}
        </ul>
        <ol className="relative" style={{ height: options.length * (ROW_H + ROW_GAP) - ROW_GAP }} aria-label="Options, best fit first">
          {options.map((o) => {
            const i = rankOf.get(o.id) ?? 0
            const c = board[i]
            const picked = selectedId === o.id
            return (
              <li
                key={o.id}
                className="absolute inset-x-0"
                style={{ top: 0, height: ROW_H, transform: `translateY(${i * (ROW_H + ROW_GAP)}px)`, transition: 'transform 0.4s steps(8)' }}
              >
                <button
                  type="button"
                  aria-pressed={picked}
                  data-art={o.icon}
                  onClick={() => onSelect(o.id)}
                  className={`pbox pselect flex h-full w-full items-center gap-3 px-3 text-left ${picked ? 'bg-lime' : ''}`}
                >
                  <span
                    key={i === 0 ? pulse : 'x'}
                    className={`grid h-[40px] w-[40px] shrink-0 place-items-center border-4 border-ink font-pixel text-[12px] ${i === 0 ? 'anim-pop' : ''}`}
                    style={{ background: MEDAL[i] ?? '#fff' }}
                    aria-label={`Place ${i + 1}`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 truncate text-[18px] leading-tight">
                        <PixelArt name={o.icon} size={2} />
                        <span className="truncate">{o.name}</span>
                      </span>
                      {i === 0 && <span className="shrink-0 border-4 border-ink bg-white px-1 font-pixel text-[9px] uppercase">Best fit</span>}
                    </span>
                    <span className="mt-1 flex h-5 border-4 border-ink bg-white" aria-hidden="true">
                      {AXES.map((a) => (
                        <span key={a} className="block h-full" style={{ width: `${(c.parts[a] / bestFit) * 100}%`, background: AXIS_COLOR[a], transition: 'width 0.3s steps(6)' }} />
                      ))}
                    </span>
                    <span className="num mt-1 flex items-center gap-3 text-[13px]">
                      <span>{gbp(o.costGBP)}</span>
                      <span>{mins(o.timeMin)}</span>
                      <span className="flex items-center gap-1">
                        <PixelArt name="heart" size={1} /> {score(o.health)}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
