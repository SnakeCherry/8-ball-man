import { getDecision } from '../data/decisions'
import { plural, timeSavedText } from './format'
import type { IconName } from './pixelart'
import type { ChoiceRecord, Decision, Goal, Option, Priority } from './types'

const DAY = 86_400_000
const WEEK = 7 * DAY

/** A past choice joined up with what was chosen and what the usual was. */
export interface Entry {
  record: ChoiceRecord
  decision: Decision
  chosen: Option
  usual: Option
  /** health points gained (or lost) against your usual */
  healthDelta: number
}

/** Pair every record with its decision and options. Records whose decision is no longer known are skipped. */
export function resolveHistory(history: ChoiceRecord[], usualByDecision: Record<string, string> = {}): Entry[] {
  const out: Entry[] = []
  for (const record of history) {
    let decision: Decision
    try {
      decision = getDecision(record.decisionId)
    } catch {
      continue
    }
    const chosen = decision.options.find((o) => o.id === record.optionId)
    const usual = decision.options.find((o) => o.id === (usualByDecision[decision.id] ?? decision.usualId))
    if (!chosen || !usual) continue
    out.push({ record, decision, chosen, usual, healthDelta: chosen.health - usual.health })
  }
  return out
}

export interface Totals {
  savedGBP: number
  minutes: number
  health: number
  choices: number
}

export function totals(history: ChoiceRecord[], entries: Entry[]): Totals {
  return {
    savedGBP: history.reduce((s, h) => s + h.savedGBP, 0),
    minutes: history.reduce((s, h) => s + h.minutesSaved, 0),
    health: entries.reduce((s, e) => s + e.healthDelta, 0),
    choices: history.length,
  }
}

export interface Personality {
  title: string
  line: string
  icon: IconName
}

const PERSONALITY: Record<Priority, Personality> = {
  money: { title: 'The Penny Pincher', line: 'You keep a close eye on every pound.', icon: 'coin' },
  time: { title: 'The Time Saver', line: 'Your minutes matter more than your money.', icon: 'bus' },
  health: { title: 'The Health Kicker', line: 'You look after your body first.', icon: 'dumbbell' },
  balanced: { title: 'The Balancer', line: 'You give money, time and health a turn.', icon: 'cart' },
}

/** Who you are, from what you put first most often. A tie, or an even spread, is the Balancer. */
export function personality(history: ChoiceRecord[]): Personality | null {
  if (!history.length) return null
  const count = (p: Priority) => history.filter((h) => h.priority === p).length
  const ranked = (['money', 'time', 'health'] as const).map((p) => ({ p, n: count(p) })).sort((a, b) => b.n - a.n)
  const top = ranked[0]
  if (top.n === 0 || top.n === ranked[1].n) return PERSONALITY.balanced
  return PERSONALITY[top.p]
}

export type PaceStatus = 'done' | 'ahead' | 'on' | 'behind' | 'unknown'
export interface Pace {
  status: PaceStatus
  /** £ a week from your choices over the last four weeks */
  weeklyGBP: number
  /** £ a week needed to finish on the due date */
  neededWeeklyGBP: number
  /** when you would finish at your recent pace, or null if you are not saving */
  projectedISO: string | null
  /** days ahead (+) or behind (-) the due date at your recent pace */
  daysDelta: number
}

/** How the recent run of choices compares with what the goal needs. Needs two choices in four weeks to judge. */
export function paceInfo(goal: Goal, history: ChoiceRecord[], now = Date.now()): Pace {
  const remaining = Math.max(0, goal.target - goal.saved)
  const daysToDue = Math.max(1, (new Date(goal.dueISO).getTime() - now) / DAY)
  const neededWeeklyGBP = remaining / (daysToDue / 7)
  const base = { weeklyGBP: 0, neededWeeklyGBP, projectedISO: null, daysDelta: 0 }
  if (remaining === 0) return { ...base, status: 'done' }

  const recent = history.filter((h) => now - h.at <= 4 * WEEK)
  if (recent.length < 2) return { ...base, status: 'unknown' }
  const weeks = Math.max(1, (now - Math.min(...recent.map((h) => h.at))) / WEEK)
  const weeklyGBP = recent.reduce((s, h) => s + h.savedGBP, 0) / weeks
  if (weeklyGBP <= 0) return { ...base, weeklyGBP, status: 'behind' }

  const projected = now + (remaining / weeklyGBP) * WEEK
  const daysDelta = Math.round((new Date(goal.dueISO).getTime() - projected) / DAY)
  return {
    status: daysDelta >= 3 ? 'ahead' : daysDelta >= -3 ? 'on' : 'behind',
    weeklyGBP,
    neededWeeklyGBP,
    projectedISO: new Date(projected).toISOString(),
    daysDelta,
  }
}

export interface Milestone {
  /** 0.25, 0.5, 0.75 or 1 */
  at: number
  gbp: number
  reached: boolean
}

export function milestones(goal: Goal): Milestone[] {
  return [0.25, 0.5, 0.75, 1].map((at) => ({ at, gbp: Math.round(goal.target * at), reached: goal.saved >= goal.target * at - 0.005 }))
}

/** "today", "yesterday", "3 days ago", "2 weeks ago". */
export function ago(ts: number, now = Date.now()): string {
  const d = Math.floor((now - ts) / DAY)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 14) return `${d} days ago`
  const w = Math.floor(d / 7)
  return `${w} ${plural(w, 'week')} ago`
}

/** What the "Share" button copies. */
export function wrappedText(appName: string, p: Personality | null, t: Totals): string {
  const bits = [
    `${t.savedGBP >= 0 ? 'saved' : 'spent'} £${Math.abs(t.savedGBP).toFixed(2)} vs my usual`,
    timeSavedText(t.minutes),
    `${t.health >= 0 ? '+' : '-'}${Math.abs(t.health)} health points`,
  ]
  return `My ${appName} wrapped${p ? `: ${p.title}` : ''}. ${bits.join(', ')} over ${t.choices} ${plural(t.choices, 'choice')}.`
}
