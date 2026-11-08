import { useEffect, useMemo, useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelButton, PixelCard, Label } from './ui'
import { gbp, timeSavedText } from '../lib/format'
import { lifeFromPoints, signedSpan } from '../lib/life'
import { buildPlan, plainHeadline, planHeadline } from '../lib/plan'
import { useAppStore } from '../store/useAppStore'

/** Up to three swaps that would beat what you chose last time, with what each could save a week. Tap one to try it. */
export function NextWeekPlan() {
  const history = useAppStore((s) => s.history)
  const usual = useAppStore((s) => s.usual)
  const customDecisions = useAppStore((s) => s.customDecisions)
  const startCustom = useAppStore((s) => s.startCustom)
  const startDecision = useAppStore((s) => s.startDecision)

  const items = useMemo(() => buildPlan(history, usual), [history, usual])
  const [headline, setHeadline] = useState(() => plainHeadline(items.length))
  useEffect(() => {
    setHeadline(plainHeadline(items.length))
    let live = true
    void planHeadline(items).then((t) => live && setHeadline(t))
    return () => {
      live = false
    }
  }, [items])

  const tryIt = (id: string) => {
    const mine = customDecisions.find((d) => d.id === id)
    if (mine) startCustom(mine)
    else startDecision(id)
  }

  return (
    <PixelCard className="space-y-4">
      <Label>What you could try next week</Label>
      {items.length === 0 ? (
        <p className="text-[17px] leading-snug">Make a few more choices and we'll suggest swaps that could save you more.</p>
      ) : (
        <>
          <p className="text-[20px] leading-snug">{headline}</p>
          <ul className="space-y-5">
            {items.map((it) => (
              <li key={it.decision.id} className="pbox-deep grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4">
                <span className="grid h-[52px] w-[52px] place-items-center border-4 border-ink bg-white" aria-hidden="true">
                  <PixelArt name={it.option.icon} size={3} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[19px] leading-tight">
                    <b>{it.option.name}</b> instead of {it.last.name}
                  </span>
                  <span className="num mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[16px]">
                    <b className="border-2 border-ink bg-lime px-1">about {gbp(it.weeklyGBP)} a week</b>
                    <span>{it.healthDelta === 0 ? 'same health' : `${signedSpan(lifeFromPoints(it.healthDelta))} of life`}</span>
                    <span>{timeSavedText(it.minutes)}</span>
                  </span>
                  <span className="mt-1 block text-[16px] text-muted">{it.decision.title}</span>
                </span>
                <PixelButton variant="white" className="!min-h-[44px] !px-3 !py-1 text-[14px]" data-fx="star" onClick={() => tryIt(it.decision.id)}>
                  Try it
                </PixelButton>
              </li>
            ))}
          </ul>
          <p className="text-[16px] text-muted">Counted against your usual, for a week of each habit.</p>
        </>
      )}
    </PixelCard>
  )
}
