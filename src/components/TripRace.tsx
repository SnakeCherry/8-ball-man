import { useCallback, useEffect, useRef, useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelButton, PixelIcon } from './ui'
import { AXIS_ICON } from './parts'
import { reducedMotion } from '../lib/fx'
import { gbp, mins, score } from '../lib/format'
import { play } from '../lib/sound'
import type { IconName } from '../lib/pixelart'
import { OPTION_COLORS } from '../lib/triangle'
import { TRIP_TICK_MS, maxMinutes, medals, minutesPerTick, heartChance, tripProgress } from '../lib/trip'
import type { Option } from '../lib/types'

interface Puff {
  id: number
  lane: number
  at: number
  age: number
}

const PUFF_LIFE = 9
const MEDAL_LABEL = { fastest: 'Fastest', cheapest: 'Cheapest', healthiest: 'Healthiest' } as const

/**
 * The three ways of doing it, racing across a pixel street at their true relative speeds.
 * Money ticks up as each one goes, and healthy ways of doing it leave little hearts behind.
 */
export function TripRace({ options, destination, autoStart = false }: { options: Option[]; destination: IconName; autoStart?: boolean }) {
  const total = maxMinutes(options)
  const [t, setT] = useState(0)
  const [running, setRunning] = useState(false)
  const [puffs, setPuffs] = useState<Puff[]>([])
  const puffId = useRef(0)
  const arrived = useRef<Set<string>>(new Set())
  const started = useRef(false)
  // the clock lives in a ref so the interval can read and advance it without side effects inside a state updater
  const clock = useRef(0)
  const puffList = useRef<Puff[]>([])

  const start = useCallback(() => {
    arrived.current = new Set()
    puffList.current = []
    setPuffs([])
    if (reducedMotion()) {
      clock.current = total
      setT(total)
      setRunning(false)
      return
    }
    clock.current = 0
    setT(0)
    setRunning(true)
    play('tick')
  }, [total])

  useEffect(() => {
    if (autoStart && !started.current) {
      started.current = true
      const id = window.setTimeout(start, 600)
      return () => window.clearTimeout(id)
    }
  }, [autoStart, start])

  useEffect(() => {
    if (!running) return
    const step = minutesPerTick(options)
    const id = window.setInterval(() => {
      const next = Math.min(total, clock.current + step)
      clock.current = next
      setT(next)
      for (const o of options) {
        if (tripProgress(o, next) >= 1 && !arrived.current.has(o.id)) {
          arrived.current.add(o.id)
          play('tick')
        }
      }
      if (next >= total) {
        setRunning(false)
        play('lock')
      }
      const aged = puffList.current.map((p) => ({ ...p, age: p.age + 1 })).filter((p) => p.age < PUFF_LIFE)
      options.forEach((o, lane) => {
        if (tripProgress(o, next) < 1 && Math.random() < heartChance(o)) aged.push({ id: puffId.current++, lane, at: tripProgress(o, next), age: 0 })
      })
      puffList.current = aged.slice(-40)
      setPuffs(puffList.current)
    }, TRIP_TICK_MS)
    return () => window.clearInterval(id)
  }, [running, options, total])

  const done = !running && t >= total
  const idle = !running && t === 0
  const win = medals(options)
  const frame = Math.floor(t / (total / 40)) % 2

  return (
    <section aria-label="Race the options" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-pixel text-[11px] uppercase">Race the options</p>
        <PixelButton variant="white" className="!min-h-[36px] !px-3 !py-1 text-[13px]" data-fx="star" onClick={start} disabled={running}>
          {idle ? 'Go' : 'Again'}
        </PixelButton>
      </div>

      <ul className="space-y-3">
        {options.map((o, lane) => {
          const p = tripProgress(o, t)
          return (
            <li key={o.id}>
              <div className="relative h-[56px] border-4 border-ink bg-white" aria-hidden="true">
                {/* road: dashed centre line */}
                <div className="absolute inset-x-0 top-1/2 border-t-4 border-dashed border-ink/15" />
                <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: OPTION_COLORS[lane] }} />
                <span className="absolute right-1 top-1/2 -translate-y-1/2 leading-none"><PixelArt name={destination} size={2} /></span>
                {puffs
                  .filter((pf) => pf.lane === lane)
                  .map((pf) => (
                    <span
                      key={pf.id}
                      className="absolute block leading-none"
                      style={{
                        left: `calc(${pf.at} * (100% - 64px) + 2px)`,
                        bottom: 10 + pf.age * 3,
                        opacity: 1 - pf.age * 0.1,
                      }}
                    >
                      <PixelArt name="heart" size={1} />
                    </span>
                  ))}
                <span
                  className="absolute top-1/2 leading-none"
                  style={{
                    left: `calc(${p} * (100% - 64px) + 8px)`,
                    transform: `translateY(${-50 + (running && p < 1 && frame ? -8 : 0)}%)`,
                  }}
                >
                  <PixelArt name={o.icon} size={3} frame={running && p < 1 ? frame : 0} />
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px]">
                <span className="min-w-[96px] leading-tight">{o.name}</span>
                <span className="num flex items-center gap-1">
                  <PixelIcon name={AXIS_ICON.time} size={2} />
                  {mins(Math.min(o.timeMin, t))}
                </span>
                <span className="num flex items-center gap-1">
                  <PixelIcon name={AXIS_ICON.cost} size={2} />
                  {gbp(o.costGBP * p)}
                </span>
                <span className="num flex items-center gap-1">
                  <PixelIcon name={AXIS_ICON.health} size={2} />
                  {score(o.health * p)}
                </span>
                {done &&
                  (Object.keys(MEDAL_LABEL) as (keyof typeof MEDAL_LABEL)[])
                    .filter((m) => win[m] === o.id)
                    .map((m) => (
                      <span key={m} className="anim-pop border-4 border-ink bg-lime px-1 font-pixel text-[9px] uppercase">
                        {MEDAL_LABEL[m]}
                      </span>
                    ))}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="sr-only">
        {options.map((o) => `${o.name}: ${mins(o.timeMin)}, ${gbp(o.costGBP)}, ${score(o.health)} health.`).join(' ')}
      </p>
    </section>
  )
}
