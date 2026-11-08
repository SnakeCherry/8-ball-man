import { gbp, plural, round1 } from './format'
import { dailyRate } from './goal'
import { monthlyCost } from './guess'
import type { Decision, Goal, Option } from './types'

/** The real number behind a habit, in money and in days of your goal. */
export function habitLine(d: Decision, usual: Option, goal: Goal | null, now = Date.now()): string {
  const monthly = monthlyCost(usual, d)
  if (monthly < 0.5) return `Your usual ${usual.name} costs nothing, so this one is about time and health.`
  const money = `Your usual ${usual.name} costs ${gbp(monthly)} a month.`
  if (!goal) return money
  const remaining = Math.max(0, goal.target - goal.saved)
  if (remaining > 0 && monthly >= remaining) return `${money} That is more than the ${gbp(remaining)} you still need for ${goal.name}.`
  const rate = dailyRate(goal, now)
  if (rate <= 0) return money
  const days = round1(monthly / rate)
  if (days < 1) return money
  return `${money} That is ${days} ${plural(days, 'day')} of saving for ${goal.name}.`
}

/** The alternative that would save the most a month against the usual option, or null if none saves anything. */
export function bestSwitch(d: Decision, usualId = d.usualId): { option: Option; monthlyGBP: number } | null {
  const usual = d.options.find((o) => o.id === usualId)
  if (!usual) return null
  const best = d.options
    .filter((o) => o.id !== usualId)
    .map((o) => ({ option: o, monthlyGBP: (usual.costGBP - o.costGBP) * d.timesPerMonth }))
    .sort((a, b) => b.monthlyGBP - a.monthlyGBP)[0]
  return best && best.monthlyGBP >= 0.5 ? best : null
}
