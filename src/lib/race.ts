import { plural } from './format'
import type { Decision, Goal, Option } from './types'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS
/** Past this many weeks we say "not within two years" instead of a date. */
const MAX_WEEKS = 104

export interface Lane {
  option: Option
  /** £ per week going towards the goal if this choice becomes the habit */
  weeklyGBP: number
  /** minutes per month saved (positive) or spent (negative) against the usual option */
  minutesPerMonth: number
  /** null when the goal isn't reached within two years */
  weeksToGoal: number | null
  finishISO: string | null
}

export interface Race {
  a: Lane
  b: Lane
  /** how many weeks the animation covers */
  horizonWeeks: number
  /** days between the two finish dates (b minus a); null if either never finishes */
  gapDays: number | null
}

const timesPerWeek = (d: Decision): number => (d.timesPerMonth * 12) / 52

/**
 * The other road to race against. If you picked something other than your usual, it is your
 * usual. If you picked your usual, it is the option furthest from it on cost.
 */
export function pickRival(d: Decision, chosenId: string, usualId: string): Option {
  const chosen = d.options.find((o) => o.id === chosenId)!
  if (chosenId !== usualId) return d.options.find((o) => o.id === usualId)!
  const others = d.options.filter((o) => o.id !== chosenId)
  return others.reduce((far, o) => (Math.abs(o.costGBP - chosen.costGBP) > Math.abs(far.costGBP - chosen.costGBP) ? o : far))
}

function lane(goal: Goal, savedBefore: number, d: Decision, o: Option, usual: Option, now: number): Lane {
  const remaining = Math.max(0, goal.target - savedBefore)
  const weeksLeft = Math.max(1 / 7, (new Date(goal.dueISO).getTime() - now) / WEEK_MS)
  // your pace now would land exactly on the due date; each choice speeds it up or slows it down
  const base = remaining / weeksLeft
  const weeklyGBP = base + (usual.costGBP - o.costGBP) * timesPerWeek(d)
  const weeks = remaining === 0 ? 0 : weeklyGBP > 0 ? remaining / weeklyGBP : Infinity
  const reached = weeks <= MAX_WEEKS
  return {
    option: o,
    weeklyGBP,
    minutesPerMonth: (usual.timeMin - o.timeMin) * d.timesPerMonth,
    weeksToGoal: reached ? weeks : null,
    finishISO: reached ? new Date(now + weeks * WEEK_MS).toISOString() : null,
  }
}

export function buildRace(
  goal: Goal,
  savedBefore: number,
  d: Decision,
  chosen: Option,
  rival: Option,
  usual: Option,
  now = Date.now(),
): Race {
  const a = lane(goal, savedBefore, d, chosen, usual, now)
  const b = lane(goal, savedBefore, d, rival, usual, now)
  const finite = [a.weeksToGoal, b.weeksToGoal].filter((w): w is number => w !== null)
  const horizonWeeks = Math.min(MAX_WEEKS, Math.max(4, Math.ceil(finite.length ? Math.max(...finite) * 1.15 : 12)))
  const gapDays = a.weeksToGoal !== null && b.weeksToGoal !== null ? Math.round((b.weeksToGoal - a.weeksToGoal) * 7) : null
  return { a, b, horizonWeeks, gapDays }
}

/** 0..1 progress of a lane after `week` weeks. */
export function progressAt(l: Lane, savedBefore: number, target: number, week: number): number {
  if (target <= 0) return 1
  return Math.min(1, Math.max(0, (savedBefore + l.weeklyGBP * week) / target))
}

export const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

/** The line you'd screenshot. Neutral wording: both roads are valid, the dates just differ. */
export function raceSentence(goalName: string, race: Race): string {
  const { a, b, gapDays } = race
  if (a.finishISO && b.finishISO && gapDays !== null) {
    if (Math.abs(gapDays) < 1) return `Either way you reach ${goalName} on about ${shortDate(a.finishISO)}.`
    const [first, second, gap] = gapDays > 0 ? [a, b, gapDays] : [b, a, -gapDays]
    return `With ${first.option.name} you reach ${goalName} on ${shortDate(first.finishISO!)}. With ${second.option.name} it's ${shortDate(second.finishISO!)}, ${gap} ${plural(gap, 'day')} later.`
  }
  if (a.finishISO) return `With ${a.option.name} you reach ${goalName} on ${shortDate(a.finishISO)}. With ${b.option.name} every time, it takes over two years.`
  if (b.finishISO) return `With ${b.option.name} you reach ${goalName} on ${shortDate(b.finishISO)}. With ${a.option.name} every time, it takes over two years.`
  return `At this pace neither habit reaches ${goalName} within two years.`
}
