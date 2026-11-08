import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CountUp } from '../components/CountUp'
import { GutCard } from '../components/GutCard'
import { HabitMap, PRIORITY_COLOR } from '../components/HabitMap'
import { PixelArt } from '../components/PixelArt'
import { VibeChips } from '../components/parts'
import { PixelButton, PixelCard, PixelIcon, Label } from '../components/ui'
import { APP_NAME, EMPTY_HISTORY } from '../data/copy'
import { BADGES } from '../lib/badges'
import { gbp, mins } from '../lib/format'
import { personality, resolveHistory, totals, wrappedText } from '../lib/recap'
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
  const badges = useAppStore((s) => s.badges)
  const gut = useAppStore((s) => s.gut)
  const priority = useAppStore((s) => s.priority)
  const streak = useAppStore((s) => s.streak)
  const bestStreak = useAppStore((s) => s.bestStreak)
  const usual = useAppStore((s) => s.usual)
  const setPriority = useAppStore((s) => s.setPriority)
  const go = useAppStore((s) => s.go)
  const [note, setNote] = useState('')

  const entries = useMemo(() => resolveHistory(history, usual), [history, usual])
  const t = totals(history, entries)
  const who = personality(history)

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

  const first = (['money', 'time', 'health'] as const).map((p) => ({ p, n: history.filter((h) => h.priority === p).length }))
  const maxFirst = Math.max(1, ...first.map((f) => f.n))
  const share = async () => {
    const r = await shareText(wrappedText(APP_NAME, who, t))
    setNote(r === 'copied' ? 'Copied. Paste it anywhere.' : '')
  }

  const money = t.savedGBP >= 0
  const time = t.minutes >= 0
  const health = t.health >= 0

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
            {t.choices} {t.choices === 1 ? 'choice' : 'choices'} · {badges.length} of {BADGES.length} badges
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
        <Tile label="Close-guess streak" tone="bg-white" sub={`best run ${bestStreak}`}>
          <span className="inline-flex items-center gap-2">
            <PixelIcon name="star" size={3} color="#16b77d" />
            {streak}
          </span>
        </Tile>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <HabitMap entries={entries} />

        <div className="space-y-6">
          <PixelCard>
            <Label>What you put first</Label>
            <ul className="mt-3 space-y-3">
              {first.map(({ p, n }) => (
                <li key={p} className="flex items-center gap-3">
                  <span className="grid h-[36px] w-[36px] shrink-0 place-items-center border-4 border-ink bg-white">
                    <PixelIcon name={p === 'money' ? 'pound' : p === 'time' ? 'clock' : 'heart'} size={2} />
                  </span>
                  <span className="w-16 shrink-0 text-[15px]">{p === 'money' ? 'Money' : p === 'time' ? 'Time' : 'Health'}</span>
                  <span className="h-6 flex-1 border-4 border-ink bg-white">
                    <span className="block h-full" style={{ width: `${(n / maxFirst) * 100}%`, background: PRIORITY_COLOR[p], transition: 'width 0.6s steps(8)' }} />
                  </span>
                  <span className="num w-6 text-right text-[16px]">{n}</span>
                </li>
              ))}
            </ul>
          </PixelCard>
          <GutCard gut={gut} streak={streak} bestStreak={bestStreak} />
        </div>
      </div>

      {/* badges */}
      <section aria-label="Badges">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-pixel text-[14px] uppercase leading-5">Badges</h2>
          <p className="num text-[15px]">
            {badges.length} of {BADGES.length}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BADGES.map((b) => {
            const got = badges.includes(b.id)
            return (
              <li
                key={b.id}
                className={`pcard p-3 ${got ? '' : 'opacity-60'}`}
                style={got ? { background: '#f7c948', boxShadow: 'inset 0 6px 0 rgba(255,255,255,0.38), inset 0 -8px 0 rgba(0,0,0,0.16)' } : undefined}
              >
                <PixelIcon name={got ? b.icon : 'lock'} size={4} color={got ? '#0a0a0a' : '#555'} />
                <p className="mt-2 text-[16px] leading-tight">{b.name}</p>
                <p className="mt-1 text-[13px] leading-tight">{b.line}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-center">
        <PixelCard>
          <Label className="mb-2">Next week's vibe</Label>
          <p className="mb-4 text-[14px] text-ink/70">Your next decision starts with this selected. You can still change it.</p>
          <VibeChips value={priority} onChange={setPriority} />
        </PixelCard>
        <PixelButton className="w-full" onClick={() => go('home')}>
          Pick a decision
        </PixelButton>
      </div>
    </div>
  )
}
