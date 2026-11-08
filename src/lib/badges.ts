import type { BadgeDef, ChoiceRecord } from './types'

export const BADGES: BadgeDef[] = [
  { id: 'penny', name: 'Penny Pincher', line: 'You put money first on 2 or more choices.', icon: 'pound' },
  { id: 'timesaver', name: 'Time Saver', line: 'You put your time first on 2 or more choices.', icon: 'clock' },
  { id: 'health', name: 'Health Kick', line: 'You put your health first on 2 or more choices.', icon: 'heart' },
  { id: 'sharp', name: 'Sharp Eye', line: 'You guessed a monthly cost to within 10%.', icon: 'eye' },
  { id: 'worth', name: 'Worth It', line: 'You paid more for time back, and it was good value.', icon: 'star' },
  { id: 'balanced', name: 'Balanced Mover', line: 'You have given money, time and health a turn.', icon: 'scale' },
  { id: 'streak', name: 'Hot Streak', line: '5 close guesses in a row.', icon: 'star' },
]

export function badgeById(id: string): BadgeDef {
  const b = BADGES.find((x) => x.id === id)
  if (!b) throw new Error(`Unknown badge ${id}`)
  return b
}

/** Badges describe how someone decides, never how little they spent. */
export function evaluateBadges(history: ChoiceRecord[], bestStreak = 0): string[] {
  const count = (p: ChoiceRecord['priority']) => history.filter((h) => h.priority === p).length
  const earned: string[] = []
  if (count('money') >= 2) earned.push('penny')
  if (count('time') >= 2) earned.push('timesaver')
  if (count('health') >= 2) earned.push('health')
  if (history.some((h) => h.guessErr <= 0.1)) earned.push('sharp')
  if (history.some((h) => h.verdict === 'good')) earned.push('worth')
  if (count('money') >= 1 && count('time') >= 1 && count('health') >= 1) earned.push('balanced')
  if (bestStreak >= 5) earned.push('streak')
  return earned
}
