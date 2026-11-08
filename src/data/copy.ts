import type { Axis, Priority, Verdict } from '../lib/types'

/** All voice strings live here: calm, warm, light. Numbers first, no moralising. */

export const APP_NAME = '8-Ball Man'
export const TAGLINE = 'Ask 8-Ball Man what each choice really costs you.'

export const AXIS_LABEL: Record<Axis, { ask: string; word: string; short: string }> = {
  cost: { ask: 'Which is cheapest?', word: 'cheapest', short: 'Cost' },
  time: { ask: 'Which is fastest?', word: 'fastest', short: 'Time' },
  health: { ask: 'Which is healthiest?', word: 'healthiest', short: 'Health' },
}

export const PODIUM_TITLE: Record<Axis, { title: string; sub: string }> = {
  cost: { title: 'Cheapest', sub: 'how much' },
  time: { title: 'Fastest', sub: 'how fast' },
  health: { title: 'Healthiest', sub: 'life each time' },
}

export const PRIORITY_CHIPS: { id: Priority; label: string }[] = [
  { id: 'money', label: "Money's tight this week" },
  { id: 'time', label: 'Short on time' },
  { id: 'health', label: 'Looking after my health' },
  { id: 'balanced', label: 'A bit of everything' },
]

export const PRIORITY_NAME: Record<Priority, string> = {
  money: 'money',
  time: 'time',
  health: 'health',
  balanced: 'a bit of everything',
}


export const VERDICT_LINE: Record<Verdict, (perHour: string, userRate: string) => string> = {
  good: (perHour, userRate) => `That works out at ${perHour} an hour, below the ${userRate} an hour your time is worth to you. Good value.`,
  fair: (perHour, userRate) => `That works out at ${perHour} an hour, close to the ${userRate} an hour your time is worth to you.`,
  steep: (perHour, userRate) => `That works out at ${perHour} an hour, above the ${userRate} an hour your time is worth to you. Might not be worth it, but it's your call.`,
}

export const EMPTY_HISTORY = 'Nothing here yet. Your first choice will show up in this space.'

/** Game-show host lines read aloud on the reveal (when sound is on). */
export const HOST_LINE: Record<'bullseye' | 'close' | 'near' | 'off', (real: string) => string> = {
  bullseye: (real) => `Bullseye! It really is ${real} a month.`,
  close: (real) => `Close! It's ${real} a month.`,
  near: (real) => `Not far off. It's ${real} a month.`,
  off: (real) => `Ooh, way off. It's ${real} a month.`,
}
