import { useEffect, useState } from 'react'
import { PixelButton, PixelCard, PixelIcon, Label } from './ui'
import { reducedMotion } from '../lib/fx'
import { gbp, mins } from '../lib/format'
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
}: {
  lane: Lane
  goal: Goal
  savedBefore: number
  week: number
  frame: number
  done: boolean
  winner: boolean
  color: string
}) {
  const p = progressAt(lane, savedBefore, goal.target, week)
  const arrived = p >= 1
  const running = !done && !arrived
  return (
    <div>
      <p className="flex items-center gap-2 text-[17px] leading-tight">
        <span aria-hidden="true">{lane.option.emoji}</span>
        <span>{lane.option.name}</span>
        {done && winner && (
          <span className="border-4 border-ink bg-lime px-1 font-pixel text-[9px] uppercase anim-pop">First</span>
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

/** Two timelines of you: the same goal, two habits, racing in discrete frames. */
export function TwoYous({ race, goal, savedBefore }: { race: Race; goal: Goal; savedBefore: number }) {
  const [frame, setFrame] = useState(reducedMotion() ? TICKS : 0)
  const [run, setRun] = useState(0)

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
    .map((l) => `${l.option.name}: ${l.minutesPerMonth > 0 ? mins(l.minutesPerMonth) + ' back' : mins(l.minutesPerMonth) + ' extra'} a month`)

  return (
    <PixelCard className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Label>Two yous</Label>
        <span className="num font-pixel text-[10px] uppercase" aria-hidden="true">
          Week {Math.round(week)}
        </span>
      </div>
      <p className="text-[15px] text-ink/70">Same goal, same pace, if you did this every time.</p>

      <div onClick={done ? undefined : skip} className="space-y-4">
        <LaneRow lane={a} goal={goal} savedBefore={savedBefore} week={week} frame={frame} done={done} winner={aFirst} color="#16b77d" />
        <LaneRow lane={b} goal={goal} savedBefore={savedBefore} week={week} frame={frame} done={done} winner={bFirst} color="#6b7280" />
      </div>

      <p className="sr-only">{sentence}</p>
      {done ? (
        <div className="anim-slide space-y-2">
          <p className="text-[19px] leading-snug">{sentence}</p>
          {trade.length > 0 && <p className="num text-[14px] text-ink/70">Time: {trade.join(' · ')}.</p>}
          <PixelButton variant="white" className="!min-h-[44px] !px-3 !py-2" onClick={() => setRun((r) => r + 1)}>
            Replay
          </PixelButton>
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
