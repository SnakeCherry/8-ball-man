import { useEffect, useState } from 'react'
import { PixelArt } from './PixelArt'
import { gbp } from '../lib/format'
import { progress } from '../lib/goal'
import { milestones } from '../lib/recap'
import type { Goal } from '../lib/types'

const CELLS = 20

/**
 * A road to your goal: a walker travels from `from` to where you are now, past quarter-way flags
 * (greyed until you reach them) to the prize at the end.
 */
export function GoalPath({ goal, from }: { goal: Goal; from: number }) {
  const to = progress(goal)
  const [shown, setShown] = useState(from)
  const [walking, setWalking] = useState(false)

  useEffect(() => {
    const go = window.setTimeout(() => {
      setShown(to)
      setWalking(from !== to)
    }, 350)
    const stop = window.setTimeout(() => setWalking(false), 1900)
    return () => {
      window.clearTimeout(go)
      window.clearTimeout(stop)
    }
  }, [from, to])

  const stations = milestones(goal).slice(0, 3)
  const filled = Math.round(shown * CELLS)

  return (
    <div className="relative mx-3 mt-4 h-[124px]" role="img" aria-label={`${Math.round(to * 100)} percent of the way to ${goal.name}`}>
      <div className="absolute inset-x-0 bottom-5 flex h-6 border-4 border-ink bg-white" aria-hidden="true">
        {Array.from({ length: CELLS }, (_, i) => (
          <i
            key={i}
            className={`h-full flex-1 border-r-2 border-ink/20 ${i < filled ? (i % 2 ? 'bg-lime' : 'bg-jade') : ''}`}
            style={{ transition: 'background-color 0.2s steps(2)' }}
          />
        ))}
      </div>

      {stations.map((m) => (
        <div key={m.at} className="absolute bottom-[44px] -translate-x-1/2" style={{ left: `${m.at * 100}%`, opacity: m.reached ? 1 : 0.35 }} aria-hidden="true">
          <PixelArt name="flag" size={2} />
        </div>
      ))}
      {stations.map((m) => (
        <span key={`l${m.at}`} className="num absolute bottom-0 -translate-x-1/2 text-[13px]" style={{ left: `${m.at * 100}%` }} aria-hidden="true">
          {gbp(m.gbp)}
        </span>
      ))}

      <div className="absolute bottom-[44px] right-0" aria-hidden="true">
        <PixelArt name={goal.icon} size={4} className={to >= 1 ? 'anim-hop' : ''} />
      </div>
      <span className="num absolute bottom-0 right-0 text-[13px] font-semibold" aria-hidden="true">
        {gbp(goal.target)}
      </span>

      <div
        className="absolute bottom-[44px]"
        style={{ left: `calc(${shown} * (100% - 84px))`, transition: 'left 1.4s steps(14)' }}
        aria-hidden="true"
      >
        <PixelArt name="walk" size={3} animate={walking} />
      </div>
    </div>
  )
}
