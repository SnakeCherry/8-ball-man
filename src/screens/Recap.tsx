import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BadgeShelf } from '../components/BadgeShelf'
import { CountUp } from '../components/CountUp'
import { LifeView } from '../components/LifeView'
import { NextWeekPlan } from '../components/NextWeekPlan'
import { PixelArt } from '../components/PixelArt'
import { QuadrantMap } from '../components/QuadrantMap'
import { PixelButton, PixelCard, Label } from '../components/ui'
import { APP_NAME, EMPTY_HISTORY } from '../data/copy'
import { badgeLevels, badgeStats } from '../lib/badges'
import { gbp, mins } from '../lib/format'
import { personality, quadrantPoints, resolveHistory, totals, winWinScore, wrappedText } from '../lib/recap'
import { shareText } from '../lib/share'
import { useAppStore } from '../store/useAppStore'

function Tile({ label, tone, children, sub }: { label: string; tone: string; children: ReactNode; sub: string }) {
  return (
    <div className={`pcard p-3 ${tone}`}>
      <p className="font-pixel text-[9px] uppercase">{label}</p>
      <p className="num mt-2 text-[34px] font-semibold leading-none">{children}</p>
      <p className="mt-1 text-[14px] leading-tight">{sub}</p>
    </div>
  )
}

export function Recap() {
  const history = useAppStore((s) => s.history)
  const chains = useAppStore((s) => s.chains)
  const usual = useAppStore((s) => s.usual)
  const go = useAppStore((s) => s.go)
  const [note, setNote] = useState('')

  const entries = useMemo(() => resolveHistory(history, usual), [history, usual])
  const t = totals(history, entries)
  const who = personality(history)
  const score = winWinScore(entries)
  const levels = badgeLevels(badgeStats(history, entries, chains))
  // your latest choice on each habit, kept up week after week, for the time vs life chart
  const lifeItems = [...new Map(entries.map((e) => [e.decision.id, { decision: e.decision, usual: e.usual, chosen: e.chosen }])).values()]

  if (!history.length) {
    return (
      <PixelCard className="mx-auto max-w-xl space-y-4 text-center">
        <div className="flex justify-center">
          <PixelArt name="walk" size={8} animate />
        </div>
        <h1 className="font-pixel text-[14px] uppercase">Your recap</h1>
        <p>{EMPTY_HISTORY}</p>
        <PixelButton onClick={() => go('home')}>Pick a decision</PixelButton>
      </PixelCard>
    )
  }

  const share = async () => {
    const r = await shareText(wrappedText(APP_NAME, who, t, score))
    setNote(r === 'copied' ? 'Copied. Paste it anywhere.' : '')
  }

  const money = t.savedGBP >= 0
  const time = t.minutes >= 0
  const health = t.health >= 0
  const earned = levels.filter((l) => l.tier > 0).length

  return (
    <div className="space-y-6">
      {/* hero */}
      <PixelCard className="grid items-center gap-4 bg-lime sm:grid-cols-[auto_1fr_auto]">
        <div className="mx-auto grid h-[132px] w-[132px] place-items-center border-4 border-ink bg-white">
          <PixelArt name="walk" size={9} animate />
        </div>
        <div>
          <Label className="[&>span]:bg-white">Your wrapped</Label>
          <h1 className="mt-2 flex items-center gap-3 text-[32px] leading-tight">
            {who && <PixelArt name={who.icon} size={3} />}
            {who?.title}
          </h1>
          <p className="mt-1 text-[17px] leading-snug">{who?.line}</p>
          <p className="num mt-2 text-[15px]">
            {t.choices} {t.choices === 1 ? 'choice' : 'choices'} · {earned} of {levels.length} badges
          </p>
        </div>
        <div className="space-y-2">
          <PixelButton variant="white" data-fx="star" className="w-full" onClick={share}>
            Share my wrapped
          </PixelButton>
          {note && (
            <p role="status" className="text-[14px]">
              {note}
            </p>
          )}
        </div>
      </PixelCard>

      {/* the numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Money vs your usual" tone={money ? 'bg-white' : 'bg-red'} sub={money ? 'kept in your pocket' : 'spent over your usual'}>
          {money ? '+' : '−'}
          <CountUp value={Math.abs(t.savedGBP)} format={gbp} delayMs={150} />
        </Tile>
        <Tile label="Time" tone="bg-white" sub={time ? 'saved' : 'extra'}>
          <CountUp value={Math.abs(t.minutes)} format={mins} delayMs={250} />
        </Tile>
        <Tile label="Health" tone={health ? 'bg-white' : 'bg-red'} sub={health ? 'points gained' : 'points given up'}>
          {health ? '+' : '−'}
          <CountUp value={Math.abs(t.health)} format={(n) => `${Math.round(n)}`} delayMs={350} />
        </Tile>
        <Tile
          label="Better than usual"
          tone={score.pct !== null && score.pct >= 50 ? 'bg-lime' : 'bg-white'}
          sub={
            score.pct === null
              ? `Make ${3 - score.of} more ${3 - score.of === 1 ? 'choice' : 'choices'} to see this`
              : `${score.wins} of ${score.of} choices beat your usual on at least two things (money, time, health)`
          }
        >
          {score.pct === null ? (
            `${score.wins}/${score.of}`
          ) : (
            <CountUp value={score.pct} format={(n) => `${Math.round(n)}%`} delayMs={450} />
          )}
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <QuadrantMap points={quadrantPoints(entries)} />
        <NextWeekPlan />
      </div>

      <LifeView items={lifeItems} />

      <BadgeShelf levels={levels} />

      <PixelButton className="w-full" onClick={() => go('home')}>
        Pick a decision
      </PixelButton>
    </div>
  )
}
