import type { BadgeDef, ChoiceRecord } from './types'

export const BADGES: BadgeDef[] = [
  { id: 'penny', name: 'Penny Pincher', line: 'You put money first on 2 or more choices.', icon: 'pound' },
  { id: 'timesaver', name: 'Time Saver', line: 'You put your time first on 2 or more choices.', icon: 'clock' },
  { id: 'green', name: 'Green Mover', line: 'You put your footprint first on 2 or more choices.', icon: 'leaf' },
  { id: 'sharp', name: 'Sharp Eye', line: 'Three out of three. You know your costs well.', icon: 'eye' },
  { id: 'worth', name: 'Worth It', line: 'You paid more for time back, and it was good value.', icon: 'star' },
  { id: 'balanced', name: 'Balanced Mover', line: 'You have given money, time and footprint a turn.', icon: 'scale' },
]

export function badgeById(id: string): BadgeDef {
  const b = BADGES.find((x) => x.id === id)
  if (!b) throw new Error(`Unknown badge ${id}`)
  return b
}

/** Badges describe how someone decides, never how little they spent. */
export function evaluateBadges(history: ChoiceRecord[]): string[] {
  const count = (p: ChoiceRecord['priority']) => history.filter((h) => h.priority === p).length
  const earned: string[] = []
  if (count('money') >= 2) earned.push('penny')
  if (count('time') >= 2) earned.push('timesaver')
  if (count('footprint') >= 2) earned.push('green')
  if (history.some((h) => h.correctGuesses === 3)) earned.push('sharp')
  if (history.some((h) => h.verdict === 'good')) earned.push('worth')
  if (count('money') >= 1 && count('time') >= 1 && count('footprint') >= 1) earned.push('balanced')
  return earned
}
