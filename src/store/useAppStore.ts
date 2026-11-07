import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDecision } from '../data/decisions'
import { evaluateBadges } from '../lib/badges'
import { countCorrect, timePurchase } from '../lib/explain'
import type { TimePurchase } from '../lib/explain'
import { DEFAULT_CARBON_RATE, DEFAULT_TIME_RATE } from '../lib/exchangeRates'
import { applySaving, goalEffect, isoInDays } from '../lib/goal'
import { bestOn } from '../lib/scoring'
import type { Axis, ChoiceRecord, Goal, Guesses, Priority } from '../lib/types'

export type Screen = 'onboarding' | 'home' | 'predict' | 'reveal' | 'goal' | 'recap'

/** A typical student's weekly spending money, used to judge how tight "money left" is. */
export const WEEKLY_BASE = 50
export const moneyRatio = (left: number): number => Math.min(1, Math.max(0, left / WEEKLY_BASE))

export interface LastResult {
  decisionId: string
  optionId: string
  deltaGBP: number
  days: number
  purchase: TimePurchase | null
  newBadges: string[]
}

const EMPTY_GUESSES: Guesses = { cost: null, time: null, co2: null }
const EMPTY_GUT: Record<Axis, { right: number; total: number }> = {
  cost: { right: 0, total: 0 },
  time: { right: 0, total: 0 },
  co2: { right: 0, total: 0 },
}

interface Persisted {
  onboarded: boolean
  timeRate: number
  carbonRate: number
  goal: Goal | null
  moneyLeft: number
  priority: Priority
  vibeHistory: Priority[]
  history: ChoiceRecord[]
  usual: Record<string, string>
  gut: Record<Axis, { right: number; total: number }>
  badges: string[]
}

interface Flow {
  screen: Screen
  /** which of the three guess questions is showing (0 cheapest, 1 fastest, 2 greenest) */
  guessStep: number
  decisionId: string | null
  guesses: Guesses
  lastResult: LastResult | null
}

interface Actions {
  go: (screen: Screen) => void
  setGuessStep: (n: number) => void
  startDecision: (id: string) => void
  setGuess: (axis: Axis, optionId: string) => void
  setPriority: (p: Priority) => void
  setMoneyLeft: (n: number) => void
  setUsual: (decisionId: string, optionId: string) => void
  finishOnboarding: (v: { timeRate: number; carbonRate: number; goal: Goal; moneyLeft: number }) => void
  commitChoice: (optionId: string) => void
  loadDemo: () => void
  reset: () => void
}

export type AppState = Persisted & Flow & Actions

const fresh = (): Persisted => ({
  onboarded: false,
  timeRate: DEFAULT_TIME_RATE,
  carbonRate: DEFAULT_CARBON_RATE,
  goal: null,
  moneyLeft: 40,
  priority: 'balanced',
  vibeHistory: [],
  history: [],
  usual: {},
  gut: structuredClone(EMPTY_GUT),
  badges: [],
})

const freshFlow = (screen: Screen): Flow => ({
  screen,
  guessStep: 0,
  decisionId: null,
  guesses: { ...EMPTY_GUESSES },
  lastResult: null,
})

function demoProfile(): Persisted {
  const now = Date.now()
  const rec = (r: Omit<ChoiceRecord, 'at'>, ago: number): ChoiceRecord => ({ ...r, at: now - ago * 86_400_000 })
  const history: ChoiceRecord[] = [
    rec({ decisionId: 'commute', optionId: 'uber', priority: 'time', correctGuesses: 2, savedGBP: -5.6, minutesSaved: 14, verdict: 'steep' }, 6),
    rec({ decisionId: 'dinner', optionId: 'mealdeal', priority: 'time', correctGuesses: 3, savedGBP: 7.9, minutesSaved: 25, verdict: null }, 5),
    rec({ decisionId: 'lunch', optionId: 'packed', priority: 'money', correctGuesses: 1, savedGBP: 4.2, minutesSaved: 3, verdict: null }, 3),
    rec({ decisionId: 'coffee', optionId: 'union', priority: 'time', correctGuesses: 2, savedGBP: 1.3, minutesSaved: 4, verdict: null }, 2),
  ]
  return {
    ...fresh(),
    onboarded: true,
    timeRate: 14,
    carbonRate: 0.4,
    goal: { name: 'Festival ticket', emoji: '🎪', target: 120, saved: 34, dueISO: isoInDays(45) },
    moneyLeft: 25,
    priority: 'time',
    vibeHistory: history.map((h) => h.priority),
    history,
    gut: { cost: { right: 2, total: 4 }, time: { right: 3, total: 4 }, co2: { right: 1, total: 4 } },
    badges: evaluateBadges(history),
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...fresh(),
      ...freshFlow('onboarding'),

      go: (screen) => set({ screen }),
      setGuessStep: (guessStep) => set({ guessStep }),

      startDecision: (id) =>
        set((s) => ({
          decisionId: id,
          guessStep: 0,
          guesses: { ...EMPTY_GUESSES },
          lastResult: null,
          priority: s.vibeHistory.at(-1) ?? s.priority,
          screen: 'predict',
        })),

      setGuess: (axis, optionId) => set((s) => ({ guesses: { ...s.guesses, [axis]: optionId } })),
      setPriority: (priority) => set({ priority }),
      setMoneyLeft: (moneyLeft) => set({ moneyLeft }),
      setUsual: (decisionId, optionId) => set((s) => ({ usual: { ...s.usual, [decisionId]: optionId } })),

      finishOnboarding: ({ timeRate, carbonRate, goal, moneyLeft }) =>
        set({ onboarded: true, timeRate, carbonRate, goal, moneyLeft, screen: 'home' }),

      commitChoice: (optionId) => {
        const s = get()
        if (!s.decisionId) return
        const d = getDecision(s.decisionId)
        const chosen = d.options.find((o) => o.id === optionId)
        const usual = d.options.find((o) => o.id === (s.usual[d.id] ?? d.usualId))
        if (!chosen || !usual) return

        const delta = usual.costGBP - chosen.costGBP
        const purchase = timePurchase(chosen, usual, s.timeRate)
        const effect = s.goal ? goalEffect(s.goal, delta) : { deltaGBP: delta, days: 0 }

        const record: ChoiceRecord = {
          decisionId: d.id,
          optionId,
          priority: s.priority,
          correctGuesses: countCorrect(d, s.guesses),
          savedGBP: delta,
          minutesSaved: usual.timeMin - chosen.timeMin,
          verdict: purchase?.verdict ?? null,
          at: Date.now(),
        }
        const history = [...s.history, record]
        const earned = evaluateBadges(history)
        const newBadges = earned.filter((b) => !s.badges.includes(b))

        const gut = structuredClone(s.gut)
        for (const axis of ['cost', 'time', 'co2'] as Axis[]) {
          gut[axis].total += 1
          if (s.guesses[axis] === bestOn(d.options, axis).id) gut[axis].right += 1
        }

        set({
          history,
          badges: earned,
          gut,
          vibeHistory: [...s.vibeHistory, s.priority],
          goal: s.goal ? applySaving(s.goal, delta) : null,
          lastResult: {
            decisionId: d.id,
            optionId,
            deltaGBP: delta,
            days: effect.days,
            purchase,
            newBadges,
          },
          screen: 'goal',
        })
      },

      loadDemo: () => set({ ...demoProfile(), ...freshFlow('home') }),
      reset: () => set({ ...fresh(), ...freshFlow('onboarding') }),
    }),
    {
      name: 'trade-off-check-v1',
      version: 1,
      partialize: (s): Persisted => ({
        onboarded: s.onboarded,
        timeRate: s.timeRate,
        carbonRate: s.carbonRate,
        goal: s.goal,
        moneyLeft: s.moneyLeft,
        priority: s.priority,
        vibeHistory: s.vibeHistory,
        history: s.history,
        usual: s.usual,
        gut: s.gut,
        badges: s.badges,
      }),
      // returning visitors land on Home, not onboarding
      onRehydrateStorage: () => (state) => {
        if (state?.onboarded) state.go('home')
      },
    },
  ),
)
