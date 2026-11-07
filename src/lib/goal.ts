import type { Goal } from './types'

const DAY_MS = 86_400_000

export function daysLeft(goal: Goal, now = Date.now()): number {
  return Math.max(1, Math.ceil((new Date(goal.dueISO).getTime() - now) / DAY_MS))
}

/** £ per day the student needs to put aside to hit the goal on time. */
export function dailyRate(goal: Goal, now = Date.now()): number {
  const remaining = Math.max(0, goal.target - goal.saved)
  return remaining / daysLeft(goal, now)
}

export interface GoalEffect {
  deltaGBP: number
  /** positive = closer, negative = further */
  days: number
}

/** What a £ change does to the goal, expressed in days. */
export function goalEffect(goal: Goal, deltaGBP: number, now = Date.now()): GoalEffect {
  const rate = dailyRate(goal, now)
  return { deltaGBP, days: rate > 0 ? deltaGBP / rate : 0 }
}

export function applySaving(goal: Goal, deltaGBP: number): Goal {
  const saved = Math.min(goal.target, Math.max(0, goal.saved + deltaGBP))
  return { ...goal, saved }
}

export function progress(goal: Goal): number {
  return goal.target <= 0 ? 0 : Math.min(1, goal.saved / goal.target)
}

export function isoInDays(days: number, now = Date.now()): string {
  return new Date(now + days * DAY_MS).toISOString()
}
