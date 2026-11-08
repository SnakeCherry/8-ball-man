import type { IconName } from './pixelart'

export type Axis = 'cost' | 'time' | 'health'
export type Priority = 'money' | 'time' | 'health' | 'balanced'
export type Weights = Record<Axis, number>
export type Verdict = 'good' | 'fair' | 'steep'

export interface Option {
  id: string
  name: string
  icon: IconName
  costGBP: number
  timeMin: number
  /** how good this is for your body and mind, 1 (poor) to 10 (great) */
  health: number
}

export interface Decision {
  id: string
  title: string
  icon: IconName
  blurb: string
  /** how many times a typical student does this per month, used for "per month" figures */
  timesPerMonth: number
  options: [Option, Option, Option]
  /** the option a student typically defaults to; the goal measures savings against it */
  usualId: string
}

export interface Goal {
  name: string
  icon: IconName
  target: number
  saved: number
  dueISO: string
}

export interface ChoiceRecord {
  decisionId: string
  optionId: string
  priority: Priority
  /** how far the monthly-cost guess was from the truth, as a fraction (0.1 = 10% off) */
  guessErr: number
  savedGBP: number
  minutesSaved: number
  verdict: Verdict | null
  at: number
}

export interface BadgeDef {
  id: string
  name: string
  line: string
  icon: 'pound' | 'clock' | 'heart' | 'eye' | 'star' | 'scale'
}
