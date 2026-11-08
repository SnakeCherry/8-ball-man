import { gbp } from './format'
import { monthlyCost } from './guess'
import { isOneOff } from './habit'
import { bestSwitch } from './hook'
import { formatSpan, lifeEach, projectLife } from './life'
import type { Decision } from './types'

/** The ball's answer in the ball's voice, built from the numbers so it is instant and always right. */
export function fortuneLine(plans: Decision[]): string {
  if (!plans.length) return 'The mist is cloudy. Try again.'
  if (plans.length > 1) {
    const total = savingSummary(plans)
    return total ? `Save about ${gbp(total.amount)}${total.once ? '' : ' a month'}${total.count === plans.length ? ` by switching ${plans.length === 2 ? 'both' : 'all'}` : ''}.` : "Let's look at them one by one."
  }
  const d = plans[0]
  const sw = bestSwitch(d)
  const usual = d.options.find((o) => o.id === d.usualId) ?? d.options[0]
  if (!sw) {
    // nothing beats the usual on price: say so, and be honest if it is poor for your health
    const gain = Math.max(0, ...d.options.map((o) => lifeEach(o, usual)))
    if (usual.health <= 4 && gain >= 1) return `Nothing here is cheaper than ${usual.name}, but a healthier choice could add ${formatSpan(gain)} of life${isOneOff(d) ? '' : ' each time'}.`
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

/** HOW the saving happens, in two short pieces: "Walk instead of Uber" and "free instead of £12 a go, about 20 times a month". */
export function savingParts(d: Decision): { title: string; detail: string } | null {
  const sw = bestSwitch(d)
  if (!sw) return null
  const usual = d.options.find((o) => o.id === d.usualId) ?? d.options[0]
  const each = (o: { costGBP: number }, per: boolean) => (o.costGBP === 0 ? 'free' : `${gbp(o.costGBP)}${per ? ' a go' : ''}`)
  if (isOneOff(d)) return { title: `${sw.option.name} instead of ${usual.name}`, detail: `${each(sw.option, false)} instead of ${each(usual, false)}` }
  return { title: `${sw.option.name} instead of ${usual.name}`, detail: `${each(sw.option, true)} instead of ${each(usual, true)}, about ${d.timesPerMonth} times a month` }
}

/** One plain sentence on HOW the saving happens. */
export function savingExplain(d: Decision): string | null {
  const p = savingParts(d)
  if (!p) return null
  return isOneOff(d) ? `Buy the ${p.title.replace(' instead of ', ' instead of the ')}: ${p.detail}.` : `Take ${p.title}: ${p.detail}.`
}

/** Minutes of life the best switch could add over `years` of keeping it up (negative if it costs life), or null when there is no switch. */
export function switchLife(d: Decision, years = 10): number | null {
  const sw = bestSwitch(d)
  if (!sw || isOneOff(d)) return null
  const usual = d.options.find((o) => o.id === d.usualId) ?? d.options[0]
  const p = projectLife([{ decision: d, usual, chosen: sw.option }], years)
  const m = p.life[p.life.length - 1]
  return Math.abs(m) >= 1 ? m : null
}
