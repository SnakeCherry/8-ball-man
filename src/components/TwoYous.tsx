import { useEffect, useRef, useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelButton, PixelCard, PixelIcon, Label } from './ui'
import { reducedMotion } from '../lib/fx'
import { gbp, timeSavedText } from '../lib/format'
import { progressAt, raceSentence, shortDate } from '../lib/race'
import type { Lane, Race } from '../lib/race'
import type { Goal } from '../lib/types'

const TICKS = 60 // frames in the race
const TICK_MS = 85 // about 12 frames a second: chunky, not smooth
const RUNNER = 5 // sprite scale, 40px

function LaneRow({
  lane,
  goal,
  savedBefore,
  week,
  frame,
  done,
  winner,
  color,
  p: pOverride,
  running: runningProp,
  winLabel = 'First',
}: {
  lane: Lane
  goal: Goal
  savedBefore: number
  week: number
  frame: number
  done: boolean
  winner: boolean
  color: string
  /** game mode drives progress itself */
  p?: number
  running?: boolean
  winLabel?: string
}) {
  const p = pOverride ?? progressAt(lane, savedBefore, goal.target, week)
  const arrived = p >= 1
  const running = runningProp ?? (!done && !arrived)
  return (
    <div>
      <p className="flex items-center gap-2 text-[17px] leading-tight">
        <PixelArt name={lane.option.icon} size={2} />
        <span>{lane.option.name}</span>
        {done && winner && (
          <span className="border-4 border-ink bg-lime px-1 font-pixel text-[9px] uppercase anim-pop">{winLabel}</span>
        )}
      </p>
      <div className="relative mt-1 h-[68px]" aria-hidden="true">
        {/* the runner */}
        <div className="absolute top-0" style={{ left: `calc(${p} * (100% - ${RUNNER * 8}px))` }}>
          <PixelIcon name={running && frame % 2 ? 'runB' : 'runA'} size={RUNNER} color={color} className={arrived ? 'anim-hop' : ''} />
        </div>
        {/* the track */}
        <div className="absolute inset-x-0 bottom-0 flex h-5 border-4 border-ink bg-white">
          {Array.from({ length: 20 }, (_, i) => (
            <i key={i} className="h-full flex-1 border-r-2 border-ink/20" style={{ background: i < Math.round(p * 20) ? color : undefined }} />
          ))}
        </div>
        {/* the finish flag sits above the track end */}
        <div className="absolute right-0 top-3">
          <PixelIcon name="flag" size={3} color={arrived ? '#16b77d' : '#0a0a0a'} className={arrived ? 'anim-hop' : ''} />
        </div>
      </div>
      <p className="num mt-1 flex justify-between text-[15px]">
        <span>
          {lane.weeklyGBP >= 0 ? '' : '−'}
          {gbp(lane.weeklyGBP)} a week
        </span>
        <span>
          {done || arrived
            ? lane.finishISO
              ? shortDate(lane.finishISO)
              : 'Over 2 years'
            : '…'}
        </span>
      </p>
    </div>
  )
}


const TAPS_TO_WIN = 30

/**
 * Game mode, just for fun: mash the button to run your lane against the other you.
 * It never changes your real dates. The rival's speed follows the real gap, so a
 * faster habit is a faster rival.
 */
function TapRace({ race, goal, savedBefore, onExit }: { race: Race; goal: Goal; savedBefore: number; onExit: () => void }) {
  const { a, b } = race
  const rivalCanFinish = b.weeksToGoal !== null
  const rivalMs =
    rivalCanFinish && a.weeksToGoal !== null && a.weeksToGoal > 0
      ? Math.min(12000, Math.max(3500, (6000 * b.weeksToGoal!) / a.weeksToGoal))
      : 12000
  const [phase, setPhase] = useState<'ready' | 'count' | 'go' | 'done'>('ready')
  const [count, setCount] = useState(3)
  const [taps, setTaps] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [outcome, setOutcome] = useState<{ win: boolean; ms: number } | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const phaseRef = useRef(phase)
  const startRef = useRef(0)
  const tapsRef = useRef(0)
  phaseRef.current = phase

  const finish = (win: boolean, ms: number) => {
    if (phaseRef.current !== 'go') return
    phaseRef.current = 'done'
    setPhase('done')
    setOutcome({ win, ms })
    if (win) setBest((b0) => (b0 === null ? ms : Math.min(b0, ms)))
  }

  // 3, 2, 1, then go
  useEffect(() => {
    if (phase !== 'count') return
    setCount(3)
    let c = 3
    const id = window.setInterval(() => {
      c -= 1
      if (c <= 0) {
        window.clearInterval(id)
        startRef.current = performance.now()
        setPhase('go')
      } else setCount(c)
    }, 650)
    return () => window.clearInterval(id)
  }, [phase])

  // the other you runs on a clock while you tap
  useEffect(() => {
    if (phase !== 'go') return
    const id = window.setInterval(() => {
      const ms = performance.now() - startRef.current
      setElapsed(ms)
      if (rivalCanFinish && ms >= rivalMs) finish(false, ms)
    }, 50)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const begin = () => {
    tapsRef.current = 0
    setTaps(0)
    setElapsed(0)
    setOutcome(null)
    setPhase('count')
  }
  const tap = () => {
    if (phaseRef.current !== 'go') return
    tapsRef.current += 1
    setTaps(tapsRef.current)
    if (tapsRef.current >= TAPS_TO_WIN) finish(true, performance.now() - startRef.current)
  }

  const pYou = Math.min(1, taps / TAPS_TO_WIN)
  const pThem = rivalCanFinish ? Math.min(1, elapsed / rivalMs) : Math.min(0.5, elapsed / rivalMs)
  const over = phase === 'done'

  return (
    <div className="space-y-4">
      <LaneRow lane={a} goal={goal} savedBefore={savedBefore} week={0} frame={taps} done={over} winner={!!outcome?.win} color="#16b77d" p={pYou} running={phase === 'go'} winLabel="Won" />
      <LaneRow lane={b} goal={goal} savedBefore={savedBefore} week={0} frame={Math.floor(elapsed / 120)} done={over} winner={!!outcome && !outcome.win} color="#6b7280" p={pThem} running={phase === 'go'} winLabel="Won" />

      {phase === 'ready' && (
        <div className="space-y-3">
          <p className="text-[16px] leading-snug">Tap as fast as you can. {TAPS_TO_WIN} taps gets you to the flag first.</p>
          <PixelButton className="w-full" data-fx="star" onClick={begin}>
            Start
          </PixelButton>
        </div>
      )}
      {phase === 'count' && (
        <p className="num text-center font-pixel text-[40px] leading-none anim-pop" role="status" key={count}>
          {count}
        </p>
      )}
      {phase === 'go' && (
        <div className="space-y-2">
          <PixelButton className="w-full !min-h-[88px] !text-[20px]" data-fx="pound" onClick={tap}>
            Run!
          </PixelButton>
          <p className="num text-center text-[15px]">
            {taps} / {TAPS_TO_WIN} taps
          </p>
        </div>
      )}
      {over && outcome && (
        <div className="anim-slide space-y-3">
          <p className="text-[19px] leading-snug" role="status">
            {outcome.win
              ? `You got there first in ${(outcome.ms / 1000).toFixed(1)} s.`
              : `The other you got there first. You made it ${taps} of ${TAPS_TO_WIN}.`}
            {best !== null && outcome.win ? ` Best: ${(best / 1000).toFixed(1)} s.` : ''}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <PixelButton data-fx="star" onClick={begin}>
              Race again
            </PixelButton>
            <PixelButton variant="white" onClick={onExit}>
              Real dates
            </PixelButton>
          </div>
        </div>
      )}
      <p className="text-[14px] text-ink/70">Just for fun. Your real dates don't change.</p>
      {phase === 'ready' && (
        <button type="button" onClick={onExit} className="min-h-[44px] font-pixel text-[11px] uppercase underline">
          Back to the real race
        </button>
      )}
    </div>
  )
}

/** Two timelines of you: the same goal, two habits, racing in discrete frames. */
export function TwoYous({ race, goal, savedBefore }: { race: Race; goal: Goal; savedBefore: number }) {
  const [frame, setFrame] = useState(reducedMotion() ? TICKS : 0)
  const [run, setRun] = useState(0)
  const [game, setGame] = useState(false)

  useEffect(() => {
    if (reducedMotion()) {
      setFrame(TICKS)
      return
    }
    setFrame(0)
    let f = 0
    const id = window.setInterval(() => {
      f += 1
      setFrame(f)
      if (f >= TICKS) window.clearInterval(id)
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [run])

  const done = frame >= TICKS
  const week = (race.horizonWeeks * frame) / TICKS
  const { a, b } = race
  const aFirst = a.finishISO !== null && (b.finishISO === null || a.weeksToGoal! < b.weeksToGoal!)
  const bFirst = b.finishISO !== null && (a.finishISO === null || b.weeksToGoal! < a.weeksToGoal!)
  const sentence = raceSentence(goal.name, race)
  const skip = () => setFrame(TICKS)

  // what the slower road may buy you back, said without judgement
  const trade = [a, b]
    .filter((l) => Math.abs(l.minutesPerMonth) >= 30)
    .map((l) => `${l.option.name}: ${timeSavedText(l.minutesPerMonth)} a month`)

  return (
    <PixelCard className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Label>Two yous</Label>
        <span className="num font-pixel text-[10px] uppercase" aria-hidden="true">
          {game ? 'Game mode' : `Week ${Math.round(week)}`}
        </span>
      </div>
      <p className="text-[15px] text-ink/70">Same goal, same pace, if you did this every time.</p>

      {game ? (
        <TapRace race={race} goal={goal} savedBefore={savedBefore} onExit={() => setGame(false)} />
      ) : (
        <div onClick={done ? undefined : skip} className="space-y-4">
          <LaneRow lane={a} goal={goal} savedBefore={savedBefore} week={week} frame={frame} done={done} winner={aFirst} color="#16b77d" />
          <LaneRow lane={b} goal={goal} savedBefore={savedBefore} week={week} frame={frame} done={done} winner={bFirst} color="#6b7280" />
        </div>
      )}

      <p className="sr-only">{sentence}</p>
      {game ? null : done ? (
        <div className="anim-slide space-y-2">
          <p className="text-[19px] leading-snug">{sentence}</p>
          {trade.length > 0 && <p className="num text-[14px] text-ink/70">Time: {trade.join(' · ')}.</p>}
          <div className="grid grid-cols-2 gap-3">
            <PixelButton variant="white" className="!min-h-[44px] !px-3 !py-2" onClick={() => setRun((r) => r + 1)}>
              Replay
            </PixelButton>
            <PixelButton className="!min-h-[44px] !px-3 !py-2" data-fx="star" onClick={() => setGame(true)}>
              Race it yourself
            </PixelButton>
          </div>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[14px] text-ink/70">
          <PixelIcon name="clock" size={2} />
          Tap the race to skip ahead.
        </p>
      )}
    </PixelCard>
  )
}
