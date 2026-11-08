import { useState } from 'react'
import { ConveyorBelt } from '../components/ConveyorBelt'
import { BallCard } from '../components/BallCard'
import { PixelButton } from '../components/ui'
import { DECISIONS, SOURCE_NOTE } from '../data/decisions'
import { gbp, mins } from '../lib/format'
import { projectLife, signedSpan } from '../lib/life'
import { resolveHistory, totals } from '../lib/recap'
import type { Decision } from '../lib/types'
import { useAppStore } from '../store/useAppStore'

const PICKS = 3

/** Green when it is going your way, red when it is not, white when it is level. */
const tone = (n: number): string => (n > 0 ? 'bg-lime' : n < 0 ? 'bg-red' : 'bg-white')

export function Home() {
  const { history, usual } = useAppStore()
  const startDecision = useAppStore((s) => s.startDecision)
  const startCustom = useAppStore((s) => s.startCustom)
  const customDecisions = useAppStore((s) => s.customDecisions)
  const loadDemo = useAppStore((s) => s.loadDemo)
  const reset = useAppStore((s) => s.reset)
  const [showMore, setShowMore] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const entries = resolveHistory(history, usual)
  const totalsNow = totals(history, entries)
  // life added if you keep your latest choice on each habit up for a year (rough estimate, see the Time vs life chart)
  const lifeItems = [...new Map(entries.map((e) => [e.decision.id, { decision: e.decision, usual: e.usual, chosen: e.chosen }])).values()]
  const lifeYear = projectLife(lifeItems, 1).life[1] ?? 0

  const tried = (d: Decision) => history.filter((h) => h.decisionId === d.id).length
  // the belt carries every decision, the ones you've tried least first (stable in data order for ties)
  const sorted = [...DECISIONS].sort((a, b) => tried(a) - tried(b))
  const beltItems = [
    // habits you described yourself come first, newest first
    ...[...customDecisions].reverse().map((d) => ({ decision: d, tried: tried(d), pick: false, mine: true })),
    ...sorted.map((d, i) => ({ decision: d, tried: tried(d), pick: i < PICKS })),
  ]
  const pickFromBelt = (id: string) => {
    const mine = customDecisions.find((d) => d.id === id)
    if (mine) startCustom(mine)
    else startDecision(id)
  }

  return (
    <div className="page-fill">
      <BallCard />

      {history.length > 0 && (
        <ul className="num grid grid-cols-3 gap-3 text-center" aria-label="Your week so far">
          <li className={`border-4 border-ink px-1 py-2 leading-tight ${tone(totalsNow.savedGBP)}`}>
            <span className="block text-[14px] text-muted">Money this week</span>
            <span className="block text-[22px] font-semibold">
              {totalsNow.savedGBP >= 0 ? '+' : '−'}
              {gbp(totalsNow.savedGBP)}
            </span>
          </li>
          <li className={`border-4 border-ink px-1 py-2 leading-tight ${tone(totalsNow.minutes)}`}>
            <span className="block text-[14px] text-muted">Free time</span>
            <span className="block text-[22px] font-semibold">
              {totalsNow.minutes >= 0 ? '+' : '−'}
              {mins(totalsNow.minutes)}
            </span>
          </li>
          <li className={`border-4 border-ink px-1 py-2 leading-tight ${tone(lifeYear)}`} title="A rough, illustrative estimate if you keep your choices up for a year. Not medical advice.">
            <span className="block text-[14px] text-muted">Life {lifeYear >= 0 ? 'added' : 'lost'}</span>
            <span className="block text-[22px] font-semibold">{signedSpan(lifeYear)}</span>
          </li>
        </ul>
      )}

      <div className="flex flex-1 flex-col justify-center">
        <ConveyorBelt items={beltItems} onPick={pickFromBelt} />
      </div>

      <div>
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-2 font-pixel text-[12px] uppercase underline"
        >
          {showMore ? 'Hide more' : 'More: sources and data'}
        </button>

        {showMore && (
          <div className="mt-3 space-y-5">
            <p className="text-[15px]">
              <b>How we got these numbers.</b> {SOURCE_NOTE}
            </p>

            <section className="space-y-3 border-t-4 border-dashed border-ink/40 pt-5" aria-label="Demo and data">
              <PixelButton variant="white" className="w-full" onClick={loadDemo}>
                Load demo profile
              </PixelButton>
              {confirming ? (
                <div className="pcard space-y-3 p-3">
                  <p className="text-[16px]">This clears your goal, history and badges. Erase everything?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <PixelButton variant="danger" onClick={reset}>
                      Yes, erase
                    </PixelButton>
                    <PixelButton variant="white" onClick={() => setConfirming(false)}>
                      Cancel
                    </PixelButton>
                  </div>
                </div>
              ) : (
                <PixelButton variant="danger" className="w-full" onClick={() => setConfirming(true)}>
                  Erase my data and start over
                </PixelButton>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
