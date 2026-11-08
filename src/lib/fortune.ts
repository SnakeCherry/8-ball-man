import { gbp } from './format'
import { monthlyCost } from './guess'
import { isOneOff } from './habit'
import { bestSwitch } from './hook'
import type { Decision } from './types'

/** The ball's answer in the ball's voice, built from the numbers so it is instant and always right. */
export function fortuneLine(plans: Decision[]): string {
  if (!plans.length) return 'The mist is cloudy. Try again.'
  if (plans.length > 1) return `I see ${plans.length} things in your future. We shall take them one by one.`
  const d = plans[0]
  const sw = bestSwitch(d)
  const usual = d.options.find((o) => o.id === d.usualId) ?? d.options[0]
  if (!sw) {
    // nothing beats the usual on price: say so, and be honest if it is poor for your health
    if (usual.health <= 4) return `Nothing here is cheaper than ${usual.name}, but it scores ${usual.health} out of 10 for health.`
    return `${usual.name} is already a good call, about ${gbp(monthlyCost(usual, d))}${isOneOff(d) ? '' : ' a month'}.`
  }
  return `The signs say: ${sw.option.name}. About ${gbp(sw.monthlyGBP)} ${isOneOff(d) ? 'saved' : 'saved a month'}.`
}

/** How much switching to the best alternative would save across what was found, or null when nothing saves anything. */
export function savingSummary(plans: Decision[]): { amount: number; once: boolean; count: number } | null {
  const allOneOff = plans.length > 0 && plans.every(isOneOff)
  // one-offs are a single price, habits are a monthly one: when they are mixed only the monthly ones are added up
  const counted = plans.filter((p) => isOneOff(p) === allOneOff)
  const saves = counted.map((p) => bestSwitch(p)?.monthlyGBP ?? 0).filter((n) => n > 0)
  const amount = saves.reduce((a, b) => a + b, 0)
  return amount >= 0.5 ? { amount, once: allOneOff, count: saves.length } : null
}
