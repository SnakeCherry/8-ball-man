import { useState } from 'react'
import { PixelBar, PixelButton, PixelCard, PixelIcon, Label, Title } from '../components/ui'
import { PRIORITY_NAME } from '../data/copy'
import { DECISIONS, SOURCE_NOTE } from '../data/decisions'
import { gbp } from '../lib/format'
import { daysLeft, progress } from '../lib/goal'
import type { Decision } from '../lib/types'
import { useAppStore } from '../store/useAppStore'

const PICKS = 3

export function Home() {
  const { goal, moneyLeft, vibeHistory, history } = useAppStore()
  const startDecision = useAppStore((s) => s.startDecision)
  const setMoneyLeft = useAppStore((s) => s.setMoneyLeft)
  const loadDemo = useAppStore((s) => s.loadDemo)
  const reset = useAppStore((s) => s.reset)
  const [showAll, setShowAll] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const last = vibeHistory.at(-1)

  const tried = (d: Decision) => history.filter((h) => h.decisionId === d.id).length
  // today's picks: the ones you've tried least (stable in data order for ties)
  const sorted = [...DECISIONS].sort((a, b) => tried(a) - tried(b))
  const picks = sorted.slice(0, PICKS)
  const rest = sorted.slice(PICKS)

  const card = (d: Decision) => {
    const costs = d.options.map((o) => o.costGBP)
    const spread = (Math.max(...costs) - Math.min(...costs)) * d.timesPerMonth
    const done = tried(d)
    return (
      <button
        key={d.id}
        type="button"
        data-emoji={d.emoji}
        onClick={() => startDecision(d.id)}
        className="pbox pselect flex items-center gap-3 p-3"
      >
        <span className="text-[30px] leading-none" aria-hidden="true">
          {d.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[19px] leading-tight">{d.title}</span>
          <span className="block text-[15px] text-ink/70">{d.blurb}</span>
          <span className="num mt-1 block text-[14px]">
            Up to {gbp(spread)} a month between options
            {done > 0 ? ` · Tried ${done}×` : ''}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-center gap-1 font-pixel text-[9px] uppercase" aria-hidden="true">
          <PixelIcon name="arrow" size={4} />
          Start
        </span>
      </button>
    )
  }

  return (
    <div className="space-y-6">
      {goal && (
        <PixelCard>
          <Label>Saving for</Label>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <p className="text-[20px]">
              {goal.emoji} {goal.name}
            </p>
            <p className="num text-[24px] font-semibold leading-none">
              {gbp(goal.saved)} / {gbp(goal.target)}
            </p>
          </div>
          <PixelBar value={progress(goal)} className="mt-3" />
          <p className="mt-2 text-[15px]">{daysLeft(goal)} days left</p>
        </PixelCard>
      )}

      {last && (
        <p className="pcard px-3 py-2 text-[16px]">
          Last time you chose <b>{PRIORITY_NAME[last]}</b>. We'll start from there.
        </p>
      )}

      <div>
        <Title className="mb-1">Today's picks</Title>
        <p className="mb-3 text-[15px] text-ink/70">Tap one to guess, then see the real numbers.</p>
        <div className="grid gap-3">{picks.map(card)}</div>
        {showAll && <div className="mt-3 grid gap-3">{rest.map(card)}</div>}
        <PixelButton variant="white" className="mt-4 w-full" aria-expanded={showAll} onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer' : `Show all ${DECISIONS.length}`}
        </PixelButton>
      </div>

      <div>
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore((v) => !v)}
          className="inline-flex min-h-[44px] items-center gap-2 font-pixel text-[11px] uppercase underline"
        >
          {showMore ? 'Hide more' : 'More: money left, sources, data'}
        </button>

        {showMore && (
          <div className="mt-3 space-y-5">
            <PixelCard>
              <Label>Money left this week</Label>
              <div className="mt-4 grid grid-cols-4 gap-3" role="group" aria-label="Money left this week">
                {[10, 25, 50, 100].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={moneyLeft === n}
                    data-fx="pound"
                    onClick={() => setMoneyLeft(n)}
                    className="pbox-flat pselect py-3 text-center font-pixel text-[11px]"
                  >
                    {n === 100 ? '£100+' : `£${n}`}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[14px] text-ink/70">When this is low, cost counts for a bit more in our suggestions.</p>
            </PixelCard>

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
