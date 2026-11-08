import { gbp } from './format'
import { monthlyCost } from './guess'
import { isOneOff } from './habit'
import type { Decision, Option } from './types'

/** The real number behind a habit, said plainly: a month, and what that adds up to in a year. */
export function habitLine(d: Decision, usual: Option): string {
  const monthly = monthlyCost(usual, d)
  if (monthly < 0.5) return `Your usual ${usual.name} costs nothing, so this one is about time and health.`
  if (isOneOff(d)) return `Your usual ${usual.name} costs ${gbp(monthly)}.`
  return `Your usual ${usual.name} costs ${gbp(monthly)} a month, about ${gbp(monthly * 12)} a year.`
}

/** The alternative that would save the most a month against the usual option, or null if none saves anything. */
export function bestSwitch(d: Decision, usualId = d.usualId): { option: Option; monthlyGBP: number } | null {
  const usual = d.options.find((o) => o.id === usualId)
  if (!usual) return null
  const best = d.options
    .filter((o) => o.id !== usualId)
    .map((o) => ({ option: o, monthlyGBP: (usual.costGBP - o.costGBP) * (isOneOff(d) ? 1 : d.timesPerMonth) }))
    .sort((a, b) => b.monthlyGBP - a.monthlyGBP)[0]
  return best && best.monthlyGBP >= 0.5 ? best : null
}
