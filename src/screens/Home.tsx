import { useState } from 'react'
import { ConveyorBelt } from '../components/ConveyorBelt'
import { VoiceTell } from '../components/VoiceTell'
import { PixelButton, PixelCard, Label } from '../components/ui'
import { PRIORITY_NAME } from '../data/copy'
import { DECISIONS, SOURCE_NOTE } from '../data/decisions'
import { gbp, mins } from '../lib/format'
import { resolveHistory, totals } from '../lib/recap'
import type { Decision } from '../lib/types'
import { useAppStore } from '../store/useAppStore'

const PICKS = 3

export function Home() {
  const { moneyLeft, vibeHistory, history, usual } = useAppStore()
  const startDecision = useAppStore((s) => s.startDecision)
  const startCustom = useAppStore((s) => s.startCustom)
  const customDecisions = useAppStore((s) => s.customDecisions)
  const setMoneyLeft = useAppStore((s) => s.setMoneyLeft)
  const loadDemo = useAppStore((s) => s.loadDemo)
  const reset = useAppStore((s) => s.reset)
  const [showMore, setShowMore] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const last = vibeHistory.at(-1)
  const totalsNow = totals(history, resolveHistory(history, usual))

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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr] xl:items-start">
        <VoiceTell />
        <div className="min-w-0 space-y-6">
          {history.length > 0 && (
            <PixelCard>
              <Label>Your week so far</Label>
              <ul className="num mt-3 grid grid-cols-3 gap-2 text-center">
                <li className="border-4 border-ink bg-white px-1 py-2 leading-tight">
                  <span className="block text-[13px] text-ink/70">Money</span>
                  <span className="block text-[20px] font-semibold">
                    {totalsNow.savedGBP >= 0 ? '+' : '−'}
                    {gbp(totalsNow.savedGBP)}
                  </span>
                </li>
                <li className="border-4 border-ink bg-white px-1 py-2 leading-tight">
                  <span className="block text-[13px] text-ink/70">Time</span>
                  <span className="block text-[20px] font-semibold">{mins(totalsNow.minutes)}</span>
                  <span className="block text-[12px] text-ink/70">{totalsNow.minutes >= 0 ? 'saved' : 'extra'}</span>
                </li>
                <li className="border-4 border-ink bg-white px-1 py-2 leading-tight">
                  <span className="block text-[13px] text-ink/70">Health</span>
                  <span className="block text-[20px] font-semibold">
                    {totalsNow.health >= 0 ? '+' : '−'}
                    {Math.abs(totalsNow.health)}
                  </span>
                </li>
              </ul>
            </PixelCard>
          )}

          {last && (
            <p className="pcard px-3 py-2 text-[16px]">
              Last time you chose <b>{PRIORITY_NAME[last]}</b>. We'll start from there.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center">
        <ConveyorBelt items={beltItems} onPick={pickFromBelt} />
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
