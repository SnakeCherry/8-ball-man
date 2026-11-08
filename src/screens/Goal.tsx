import { useEffect, useMemo, useRef } from 'react'
import { CoinJar } from '../components/CoinJar'
import { CountUp } from '../components/CountUp'
import { GoalEditor } from '../components/GoalEditor'
import { GoalPath } from '../components/GoalPath'
import { PixelArt } from '../components/PixelArt'
import { SavingsLog } from '../components/SavingsLog'
import { TwoYous } from '../components/TwoYous'
import { PixelButton, PixelCard, PixelIcon, Label } from '../components/ui'
import { VERDICT_LINE } from '../data/copy'
import { getDecision } from '../data/decisions'
import { badgeById } from '../lib/badges'
import { isOneOff } from '../lib/habit'
import { burstAtElement } from '../lib/fx'
import { gbp, mins, plural, round1 } from '../lib/format'
import { daysLeft, progress } from '../lib/goal'
import { buildRace, pickRival, shortDate } from '../lib/race'
import { paceInfo, resolveHistory } from '../lib/recap'
import type { Pace } from '../lib/recap'
import { play } from '../lib/sound'
import { useAppStore } from '../store/useAppStore'

function effectText(goalName: string, days: number, delta: number, basis: string, extra: number | null, minutesSaved: number | null): string {
  if (Math.abs(delta) < 0.005) return `Same as your usual, so ${goalName} stays where it is.`
  const d = round1(Math.abs(days))
  if (delta > 0) return `${goalName}: ${d} ${plural(d, 'day')} closer (${gbp(delta)} saved ${basis}).`
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
      <PixelCard className="anim-pop flex items-center gap-3 bg-lime">
        <PixelIcon name={b.icon} size={5} color="#0a0a0a" className="anim-hop" />
        <div>
          <Label className="[&>span]:bg-white">New badge</Label>
          <p className="text-[19px] leading-tight">{b.name}</p>
          <p className="text-[14px]">{b.line}</p>
        </div>
      </PixelCard>
    </div>
  )
}

const PACE_NOTE: Record<Pace['status'], (p: Pace) => string> = {
  done: () => 'Goal reached. Time to pick the next one.',
  unknown: () => "Make two or more choices and we'll show your pace.",
  ahead: (p) => `On track to finish ${p.daysDelta} ${plural(p.daysDelta, 'day')} early.`,
  on: () => 'Right on track for your date.',
  behind: (p) =>
    p.projectedISO
      ? `${-p.daysDelta} ${plural(-p.daysDelta, 'day')} behind. A cheaper choice or two would catch you up.`
      : 'Your recent choices cost more than your usual, so the goal is slipping.',
}

function PaceCard({ pace }: { pace: Pace }) {
  const tone = pace.status === 'ahead' || pace.status === 'done' ? 'bg-lime' : pace.status === 'behind' ? 'bg-red' : 'bg-white'
  const top = Math.max(pace.weeklyGBP, pace.neededWeeklyGBP, 1)
  const bar = (v: number, fill: string) => (
    <div className="h-4 border-2 border-ink bg-white">
      <div className="h-full" style={{ width: `${Math.min(100, (Math.max(0, v) / top) * 100)}%`, background: fill }} />
    </div>
  )
  return (
    <PixelCard className="space-y-3">
      <Label>Your pace</Label>
      <p className={`border-4 border-ink px-2 py-2 text-[17px] leading-snug ${tone}`} role="status">
        {PACE_NOTE[pace.status](pace)}
      </p>
      {pace.status !== 'unknown' && pace.status !== 'done' && (
        <div className="space-y-2 text-[14px]">
          <div>
            <p className="num flex justify-between">
              <span>Your choices</span>
              <b>{gbp(Math.max(0, pace.weeklyGBP))} a week</b>
            </p>
            {bar(pace.weeklyGBP, '#16b77d')}
          </div>
          <div>
            <p className="num flex justify-between">
              <span>Needed for your date</span>
              <b>{gbp(pace.neededWeeklyGBP)} a week</b>
            </p>
            {bar(pace.neededWeeklyGBP, '#0a0a0a')}
          </div>
          {pace.projectedISO && <p className="num pt-1">At this pace you finish on <b>{shortDate(pace.projectedISO)}</b>.</p>}
        </div>
      )}
    </PixelCard>
  )
}

export function GoalScreen() {
  const goal = useAppStore((s) => s.goal)
  const result = useAppStore((s) => s.lastResult)
  const timeRate = useAppStore((s) => s.timeRate)
  const usual = useAppStore((s) => s.usual)
  const history = useAppStore((s) => s.history)
  const setGoal = useAppStore((s) => s.setGoal)
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
    if (isOneOff(d)) return null // a one-off has no weekly pace to race
    const chosen = d.options.find((o) => o.id === result.optionId)!
    const usualId = usual[d.id] ?? d.usualId
    const usualOpt = d.options.find((o) => o.id === usualId)!
    const savedBefore = Math.max(0, goal.saved - result.deltaGBP)
    return { savedBefore, race: buildRace(goal, savedBefore, d, chosen, pickRival(d, chosen.id, usualId), usualOpt) }
    // recomputed only when a new result lands, not when the goal re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result])

  const entries = useMemo(() => resolveHistory(history, usual), [history, usual])

  if (!goal) return null
  const now = progress(goal)
  const before = result ? Math.min(1, Math.max(0, (goal.saved - result.deltaGBP) / goal.target)) : now
  const remaining = Math.max(0, goal.target - goal.saved)
  const moved = result && Math.abs(result.days) >= 0.05
  const pace = paceInfo(goal, history)
  const chosen = result ? getDecision(result.decisionId).options.find((o) => o.id === result.optionId) : undefined

  const stat = (label: string, value: string) => (
    <li className="border-4 border-ink bg-white px-2 py-2 text-center leading-tight">
      <span className="block text-[13px] text-ink/70">{label}</span>
      <span className="num block text-[20px] font-semibold">{value}</span>
    </li>
  )

  return (
    <div className="page-fill">
      {result && chosen && (
        <div ref={cardRef} className={days < 0 ? 'anim-shake' : ''} style={{ animationDelay: '0.5s' }}>
          <PixelCard className={`anim-pop grid items-center gap-4 sm:grid-cols-[auto_1fr] ${days >= 0 ? 'bg-lime' : 'bg-white'}`}>
            <div className="grid h-[88px] w-[88px] place-items-center border-4 border-ink bg-white">
              <PixelArt name={chosen.icon} size={5} animate={days >= 0} />
            </div>
            <div>
              <Label className="[&>span]:bg-white">You chose {chosen.name}</Label>
              {moved && (
                <p className="num mt-2 text-[44px] font-semibold leading-none">
                  {days > 0 ? '+' : ''}
                  <CountUp value={Math.abs(days)} format={(n) => n.toFixed(1)} delayMs={300} />
                  <span className="ml-2 text-[22px]">
                    {round1(Math.abs(days)) === 1 ? 'day' : 'days'} {days > 0 ? 'closer' : 'further'}
                  </span>
                </p>
              )}
              <p className="mt-2 text-[18px] leading-snug">
                {effectText(goal.name, result.days, result.deltaGBP, result.basis, result.purchase?.extraGBP ?? null, result.purchase?.minutesSaved ?? null)}
              </p>
              {result.purchase && (
                <p className="mt-2 text-[15px]">{VERDICT_LINE[result.purchase.verdict](gbp(result.purchase.perHour), gbp(timeRate))}</p>
              )}
            </div>
          </PixelCard>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-6 [&>:last-child]:flex-1">
          <PixelCard className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="grid h-[64px] w-[64px] place-items-center border-4 border-ink bg-white">
                <PixelArt name={goal.icon} size={4} />
              </span>
              <div className="min-w-0 flex-1">
                <Label>Saving for</Label>
                <p className="truncate text-[24px] leading-tight">{goal.name}</p>
              </div>
              <p className="num text-right leading-none">
                <span className="block text-[34px] font-semibold">
                  <CountUp value={goal.saved} format={gbp} delayMs={200} />
                </span>
                <span className="block text-[15px] text-ink/70">of {gbp(goal.target)}</span>
              </p>
            </div>

            <GoalPath goal={goal} from={before} />

            <ul className="num grid grid-cols-3 gap-2">
              {stat('To go', gbp(remaining))}
              {stat('Days left', `${daysLeft(goal)}`)}
              {stat('Needed a week', gbp(pace.neededWeeklyGBP))}
            </ul>
          </PixelCard>

          {race && <TwoYous race={race.race} goal={goal} savedBefore={race.savedBefore} />}
          <SavingsLog entries={entries} />
        </div>

        <div className="flex min-w-0 flex-col gap-6 [&>:last-child]:flex-1">
          <PixelCard>
            <Label>The jar</Label>
            <CoinJar from={before} to={now} deltaGBP={result?.deltaGBP ?? 0} goalIcon={goal.icon} />
          </PixelCard>
          {result?.newBadges.map((id) => <BadgeCard key={id} id={id} />)}
          <PaceCard pace={pace} />
          <GoalEditor key={`${goal.name}-${goal.target}`} goal={goal} onSave={setGoal} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <PixelButton onClick={() => go('home')}>Pick another decision</PixelButton>
        <PixelButton variant="white" onClick={() => go('recap')}>
          See my recap
        </PixelButton>
      </div>
    </div>
  )
}
