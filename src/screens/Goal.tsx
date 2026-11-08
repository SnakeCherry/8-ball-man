import { useEffect, useMemo, useRef } from 'react'
import { PixelArt } from '../components/PixelArt'
import { CoinJar } from '../components/CoinJar'
import { CountUp } from '../components/CountUp'
import { TwoYous } from '../components/TwoYous'
import { buildRace, pickRival } from '../lib/race'
import { PixelButton, PixelCard, PixelIcon, Label } from '../components/ui'
import { VERDICT_LINE } from '../data/copy'
import { getDecision } from '../data/decisions'
import { badgeById } from '../lib/badges'
import { burstAtElement } from '../lib/fx'
import { play } from '../lib/sound'
import { gbp, mins, plural, round1 } from '../lib/format'
import { daysLeft, progress } from '../lib/goal'
import { useAppStore } from '../store/useAppStore'

function effectText(goalName: string, days: number, delta: number, extra: number | null, minutesSaved: number | null): string {
  if (Math.abs(delta) < 0.005) return `Same as your usual, so ${goalName} stays where it is.`
  const d = round1(Math.abs(days))
  if (delta > 0) return `${goalName}: ${d} ${plural(d, 'day')} closer (${gbp(delta)} saved).`
  const why =
    extra !== null && minutesSaved !== null
      ? `You spent ${gbp(extra)} to save ${mins(minutesSaved)}.`
      : `This costs ${gbp(Math.abs(delta))} more than your usual.`
  return `${goalName}: ${d} ${plural(d, 'day')} further. ${why}`
}

function BadgeCard({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const b = badgeById(id)
  // confetti once the card has popped in
  useEffect(() => {
    const t = window.setTimeout(() => {
      burstAtElement(ref.current, { icon: 'star', count: 12, spread: 88 })
      play('badge')
    }, 500)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div ref={ref}>
      <PixelCard className="anim-pop flex items-center gap-3">
        <PixelIcon name={b.icon} size={5} color="#16b77d" className="anim-hop" />
        <div>
          <Label>New badge</Label>
          <p className="text-[19px] leading-tight">{b.name}</p>
          <p className="text-[14px]">{b.line}</p>
        </div>
      </PixelCard>
    </div>
  )
}

export function GoalScreen() {
  const goal = useAppStore((s) => s.goal)
  const result = useAppStore((s) => s.lastResult)
  const timeRate = useAppStore((s) => s.timeRate)
  const usual = useAppStore((s) => s.usual)
  const go = useAppStore((s) => s.go)
  const cardRef = useRef<HTMLDivElement>(null)

  const days = result?.days ?? 0
  // moving closer: a rising burst of £ from the result card
  useEffect(() => {
    if (days <= 0) return
    const t = window.setTimeout(() => burstAtElement(cardRef.current, { icon: 'pound', count: 10, spread: 84 }), 450)
    return () => window.clearTimeout(t)
  }, [days])

  const race = useMemo(() => {
    if (!goal || !result) return null
    const d = getDecision(result.decisionId)
    const chosen = d.options.find((o) => o.id === result.optionId)!
    const usualId = usual[d.id] ?? d.usualId
    const usualOpt = d.options.find((o) => o.id === usualId)!
    const savedBefore = Math.max(0, goal.saved - result.deltaGBP)
    return { savedBefore, race: buildRace(goal, savedBefore, d, chosen, pickRival(d, chosen.id, usualId), usualOpt) }
    // recomputed only when a new result lands, not when the goal re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  if (!goal) return null
  const now = progress(goal)
  const before = result ? Math.min(1, Math.max(0, (goal.saved - result.deltaGBP) / goal.target)) : now
  const remaining = Math.max(0, goal.target - goal.saved)
  const moved = result && Math.abs(result.days) >= 0.05

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
      <div className="space-y-6">
      {race && <TwoYous race={race.race} goal={goal} savedBefore={race.savedBefore} />}
      {result?.newBadges.map((id) => <BadgeCard key={id} id={id} />)}

      </div>
      <div className="space-y-6">
      {result && (
        <div ref={cardRef} className={days < 0 ? 'anim-shake' : ''} style={{ animationDelay: '0.5s' }}>
          <PixelCard className="anim-pop">
            <Label>You chose {getDecision(result.decisionId).options.find((o) => o.id === result.optionId)?.name}</Label>
            {moved && (
              <p className="num mt-3 text-[44px] font-semibold leading-none">
                {days > 0 ? '+' : ''}
                <CountUp value={Math.abs(days)} format={(n) => n.toFixed(1)} delayMs={300} />
                <span className="ml-2 text-[22px]">
                  {round1(Math.abs(days)) === 1 ? 'day' : 'days'} {days > 0 ? 'closer' : 'further'}
                </span>
              </p>
            )}
            <p className="mt-3 text-[19px] leading-snug">
              {effectText(
                goal.name,
                result.days,
                result.deltaGBP,
                result.purchase?.extraGBP ?? null,
                result.purchase?.minutesSaved ?? null,
              )}
            </p>
            {result.purchase && (
              <p className="mt-3 text-[16px]">
                {VERDICT_LINE[result.purchase.verdict](gbp(result.purchase.perHour), gbp(timeRate))}
              </p>
            )}
          </PixelCard>
        </div>
      )}

      <PixelCard>
        <Label>
          <PixelArt name={goal.icon} size={2} /> {goal.name}
        </Label>
        <CoinJar from={before} to={now} deltaGBP={result?.deltaGBP ?? 0} goalIcon={goal.icon} />
        <p className="num mt-3 text-[17px]">
          {gbp(goal.saved)} of {gbp(goal.target)} · {daysLeft(goal)} days left
        </p>
        <p className="num text-[15px] text-ink/70">{gbp(remaining)} to go</p>
      </PixelCard>

      </div>
      <div className="grid gap-3 lg:col-span-2 lg:grid-cols-2">
        <PixelButton onClick={() => go('home')}>Pick another decision</PixelButton>
        <PixelButton variant="white" onClick={() => go('recap')}>
          See my recap
        </PixelButton>
      </div>
    </div>
  )
}
