import type { Axis, Priority, Verdict } from '../lib/types'

/** All voice strings live here: calm, warm, light. Numbers first, no moralising. */

export const APP_NAME = 'Trade-Off Check'
export const TAGLINE = 'See what each choice really costs you.'

export const AXIS_LABEL: Record<Axis, { ask: string; word: string; short: string }> = {
  cost: { ask: 'Which is cheapest?', word: 'cheapest', short: 'Cost' },
  time: { ask: 'Which is fastest?', word: 'fastest', short: 'Time' },
  co2: { ask: 'Which is greenest?', word: 'greenest', short: 'CO₂' },
}

export const PRIORITY_CHIPS: { id: Priority; label: string }[] = [
  { id: 'money', label: "Money's tight this week" },
  { id: 'time', label: 'Short on time' },
  { id: 'footprint', label: 'Thinking about my footprint' },
  { id: 'balanced', label: 'A bit of everything' },
]

export const PRIORITY_NAME: Record<Priority, string> = {
  money: 'money',
  time: 'time',
  footprint: 'footprint',
  balanced: 'a bit of everything',
}

export const PREDICT_PROMPT = 'Go with your gut. There are no wrong answers, just a quick guess.'

export const GUESS_RIGHT = 'You got it.'
export const ALL_RIGHT = 'Three out of three. You know your costs well.'

export const VERDICT_LINE: Record<Verdict, (perHour: string, userRate: string) => string> = {
  good: (perHour, userRate) => `That works out at ${perHour} an hour, below the ${userRate} an hour your time is worth to you. Good value.`,
  fair: (perHour, userRate) => `That works out at ${perHour} an hour, close to the ${userRate} an hour your time is worth to you.`,
  steep: (perHour, userRate) => `That works out at ${perHour} an hour, above the ${userRate} an hour your time is worth to you. Might not be worth it, but it's your call.`,
}

export const EMPTY_HISTORY = 'Nothing here yet. Your first choice will show up in this space.'

export const GOAL_PRESETS = [
  { name: 'Festival ticket', emoji: '🎪', target: 120, days: 60 },
  { name: 'Interrail trip', emoji: '🚆', target: 400, days: 120 },
  { name: 'Rent buffer', emoji: '🏠', target: 250, days: 75 },
  { name: 'Treat fund', emoji: '🎁', target: 60, days: 30 },
]
