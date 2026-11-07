export type Axis = 'cost' | 'time' | 'co2'
export type Priority = 'money' | 'time' | 'footprint' | 'balanced'
export type Weights = Record<Axis, number>
export type Verdict = 'good' | 'fair' | 'steep'

export interface Option {
  id: string
  name: string
  emoji: string
  costGBP: number
  timeMin: number
  co2Kg: number
}

export interface Decision {
  id: string
  title: string
  emoji: string
  blurb: string
  /** how many times a typical student does this per month, used for "per month" figures */
  timesPerMonth: number
  options: [Option, Option, Option]
  /** the option a student typically defaults to; the goal measures savings against it */
  usualId: string
}

export interface Goal {
  name: string
  emoji: string
  target: number
  saved: number
  dueISO: string
}

export interface ChoiceRecord {
  decisionId: string
  optionId: string
  priority: Priority
  correctGuesses: number
  savedGBP: number
  minutesSaved: number
  verdict: Verdict | null
  at: number
}

export type Guesses = Record<Axis, string | null>

export interface BadgeDef {
  id: string
  name: string
  line: string
  icon: 'pound' | 'clock' | 'leaf' | 'eye' | 'star' | 'scale'
}
