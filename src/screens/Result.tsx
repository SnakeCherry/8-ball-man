import { useEffect, useRef } from 'react'
import { BadgeCard } from '../components/BadgeCard'
import { LifeView } from '../components/LifeView'
import { NextBar } from '../components/NextBar'
import { CountUp } from '../components/CountUp'
import { PixelArt } from '../components/PixelArt'
import { PixelButton, PixelCard, Label } from '../components/ui'
import { VERDICT_LINE } from '../data/copy'
import { getDecision } from '../data/decisions'
import { burstAtElement } from '../lib/fx'
import { gbp, timeSavedText } from '../lib/format'
import { lifeFromPoints, signedSpan } from '../lib/life'
import { play } from '../lib/sound'
import { useAppStore } from '../store/useAppStore'
import type { LastResult } from '../store/useAppStore'

const money = (n: number): string => (Math.abs(n) < 0.005 ? 'Same as your usual' : n > 0 ? `${gbp(n)} saved` : `${gbp(n)} extra`)
const health = (n: number): string => (n === 0 ? 'Same health' : `${signedSpan(lifeFromPoints(n))} of life`)

/** What you picked and what it is worth: one card per habit from this run, plus the total when there were several. */
export function Result() {
  const session = useAppStore((s) => s.session)
  const lastResult = useAppStore((s) => s.lastResult)
  const timeRate = useAppStore((s) => s.timeRate)
  const usual = useAppStore((s) => s.usual)
  const go = useAppStore((s) => s.go)
  const openMedals = useAppStore((s) => s.openMedals)
  const ref = useRef<HTMLDivElement>(null)

  const results: LastResult[] = session.length ? session : lastResult ? [lastResult] : []
  const total = results.reduce((s, r) => s + r.deltaGBP, 0)
  const minutes = results.reduce((s, r) => s + r.minutes, 0)
  const healthTotal = results.reduce((s, r) => s + r.healthDelta, 0)

  useEffect(() => {
    if (total <= 0) return
    const t = window.setTimeout(() => {
      play('sparkle')
      burstAtElement(ref.current, { icon: 'pound', count: 10, spread: 84 })
    }, 450)
    return () => window.clearTimeout(t)
  }, [total])

  if (!results.length) return null
  // the habits you just chose, for the time vs life chart
  const lifeItems = results.flatMap((r) => {
    const d = getDecision(r.decisionId)
    const u = d.options.find((o) => o.id === (usual[d.id] ?? d.usualId))
    const c = d.options.find((o) => o.id === r.optionId)
    return u && c ? [{ decision: d, usual: u, chosen: c }] : []
  })
  // the highest new medal level for each badge across the run
  const medals = new Map<string, number>()
  for (const m of results.flatMap((r) => r.newBadges)) medals.set(m.id, Math.max(medals.get(m.id) ?? 0, m.tier))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div ref={ref}>
        <PixelCard className={`anim-pop space-y-3 ${total >= 0 ? 'bg-lime' : 'bg-white'}`}>
          <Label className="[&>span]:bg-white">{results.length > 1 ? `Your ${results.length} choices` : 'Your choice'}</Label>
          <p className="num text-[44px] font-semibold leading-none">
            {total >= 0 ? '+' : '−'}
            <CountUp value={Math.abs(total)} format={gbp} delayMs={250} />
            <span className="ml-2 text-[20px] font-normal">{total >= 0 ? 'saved against your usual' : 'more than your usual'}</span>
          </p>
          <p className="num text-[18px]">
            {timeSavedText(minutes)} · {health(healthTotal)}
          </p>
        </PixelCard>
      </div>

      <ul className="space-y-4">
        {results.map((r) => {
          const d = getDecision(r.decisionId)
          const chosen = d.options.find((o) => o.id === r.optionId)!
          return (
            <li key={`${r.decisionId}-${r.optionId}`}>
              <PixelCard className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
                <div className="grid h-[88px] w-[88px] place-items-center border-4 border-ink bg-white">
                  <PixelArt name={chosen.icon} size={5} animate />
                </div>
                <div>
                  <p className="font-pixel text-[12px] uppercase text-muted">{d.title}</p>
                  <p className="text-[24px] leading-tight">{chosen.name}</p>
                  <p className="num mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[16px]">
                    <b>{money(r.deltaGBP)}</b>
                    <span>{timeSavedText(r.minutes)}</span>
                    <span>{health(r.healthDelta)}</span>
                  </p>
                  <p className="mt-1 text-[14px] text-muted">Counted {r.basis}.</p>
                  {r.purchase && <p className="mt-2 text-[15px] leading-snug">{VERDICT_LINE[r.purchase.verdict](gbp(r.purchase.perHour), gbp(timeRate))}</p>}
                </div>
              </PixelCard>
            </li>
          )
        })}
      </ul>

      <LifeView items={lifeItems} />

      {[...medals].map(([id, tier]) => (
        <BadgeCard key={id} id={id} tier={tier} />
      ))}

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <PixelButton variant="white" onClick={openMedals}>
            See all my medals
          </PixelButton>
          <PixelButton variant="white" onClick={() => go('home')}>
            Ask 8-Ball Man again
          </PixelButton>
        </div>
      </div>
      <NextBar>
        <PixelButton className="w-full" data-fx="star" onClick={() => go('recap')}>
          See my recap
        </PixelButton>
      </NextBar>
    </div>
  )
}
