import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDecision, registerDecision } from '../data/decisions'
import { evaluateBadges } from '../lib/badges'
import { timePurchase } from '../lib/explain'
import type { TimePurchase } from '../lib/explain'
import { DEFAULT_HEALTH_RATE, DEFAULT_TIME_RATE } from '../lib/exchangeRates'
import { CLOSE, closeness, guessError, monthlyCost } from '../lib/guess'
import { creditBasis, creditFor, isOneOff } from '../lib/habit'
import { EMPTY_GUT, addGuess, nextStreak } from '../lib/gut'
import type { GutTally } from '../lib/gut'
import { applySaving, goalEffect, isoInDays } from '../lib/goal'
import { EMOJI_TO_ICON } from '../lib/pixelart'
import { nearestPriority } from '../lib/triangle'
import type { ChoiceRecord, Decision, Goal, Priority, Weights } from '../lib/types'

export type Screen = 'onboarding' | 'home' | 'predict' | 'reveal' | 'priority' | 'goal' | 'recap'

/** A typical student's weekly spending money, used to judge how tight "money left" is. */
export const WEEKLY_BASE = 50
export const moneyRatio = (left: number): number => Math.min(1, Math.max(0, left / WEEKLY_BASE))

export interface LastResult {
  decisionId: string
  optionId: string
  deltaGBP: number
  days: number
  /** how the saving was counted: "over a week of Walk" or "once" */
  basis: string
  purchase: TimePurchase | null
  newBadges: string[]
}


interface Persisted {
  onboarded: boolean
  timeRate: number
  healthRate: number
  goal: Goal | null
  moneyLeft: number
  priority: Priority
  vibeHistory: Priority[]
  history: ChoiceRecord[]
  usual: Record<string, string>
  gut: GutTally
  badges: string[]
  /** close guesses in a row, and the best run so far */
  streak: number
  bestStreak: number
  /** decisions made from what the student said, kept so their history still resolves after a reload */
  customDecisions: Decision[]
}

interface Flow {
  screen: Screen
  decisionId: string | null
  /** the student's guess at their usual option's monthly cost, in £ */
  guess: number | null
  /** weights dragged on the trade-off triangle; null until the student drags (then the chips/history blend applies) */
  weights: Weights | null
  lastResult: LastResult | null
}

interface Actions {
  go: (screen: Screen) => void
  startDecision: (id: string) => void
  /** begin from a decision made from speech: no guess round, straight to the results */
  startCustom: (d: Decision) => void
  /** keep decisions made from speech (several can come from one sentence) so they wait on the belt */
  addCustoms: (ds: Decision[]) => void
  setGuess: (n: number) => void
  setPriority: (p: Priority) => void
  /** change what you are saving for; what you have saved so far carries over */
  setGoal: (g: Goal) => void
  setWeights: (w: Weights) => void
  setMoneyLeft: (n: number) => void
  setUsual: (decisionId: string, optionId: string) => void
  finishOnboarding: (v: { timeRate: number; healthRate: number; goal: Goal; moneyLeft: number }) => void
  commitChoice: (optionId: string) => void
  loadDemo: () => void
  reset: () => void
}

export type AppState = Persisted & Flow & Actions

const fresh = (): Persisted => ({
  onboarded: false,
  timeRate: DEFAULT_TIME_RATE,
  healthRate: DEFAULT_HEALTH_RATE,
  goal: null,
  moneyLeft: 40,
  priority: 'balanced',
  vibeHistory: [],
  history: [],
  usual: {},
  gut: { ...EMPTY_GUT },
  badges: [],
  streak: 0,
  bestStreak: 0,
  customDecisions: [],
})

const freshFlow = (screen: Screen): Flow => ({
  screen,
  decisionId: null,
  guess: null,
  weights: null,
  lastResult: null,
})

function demoProfile(): Persisted {
  const now = Date.now()
  const rec = (r: Omit<ChoiceRecord, 'at'>, ago: number): ChoiceRecord => ({ ...r, at: now - ago * 86_400_000 })
  const history: ChoiceRecord[] = [
    rec({ decisionId: 'commute', optionId: 'uber', priority: 'time', guessErr: 0.3, savedGBP: -5.6, minutesSaved: 14, verdict: 'steep' }, 6),
    rec({ decisionId: 'dinner', optionId: 'mealdeal', priority: 'time', guessErr: 0.05, savedGBP: 7.9, minutesSaved: 25, verdict: null }, 5),
    rec({ decisionId: 'lunch', optionId: 'packed', priority: 'money', guessErr: 0.6, savedGBP: 4.2, minutesSaved: 3, verdict: null }, 3),
    rec({ decisionId: 'coffee', optionId: 'union', priority: 'time', guessErr: 0.2, savedGBP: 1.3, minutesSaved: 4, verdict: null }, 2),
  ]
  return {
    ...fresh(),
    onboarded: true,
    timeRate: 14,
    healthRate: 0.4,
    goal: { name: 'Festival ticket', icon: 'ticket', target: 120, saved: 34, dueISO: isoInDays(45) },
    moneyLeft: 25,
    priority: 'time',
    vibeHistory: history.map((h) => h.priority),
    history,
    gut: { points: 3.4, weight: 6, n: 4, close: 2 },
    badges: evaluateBadges(history, 3),
    streak: 2,
    bestStreak: 3,
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...fresh(),
      ...freshFlow('onboarding'),

      go: (screen) => set({ screen }),

      startDecision: (id) =>
        set((s) => ({
          decisionId: id,
          guess: null,
          weights: null,
          lastResult: null,
          priority: s.vibeHistory.at(-1) ?? s.priority,
          screen: 'predict',
        })),

      addCustoms: (ds) => {
        ds.forEach(registerDecision)
        set((s) => ({ customDecisions: [...s.customDecisions.filter((x) => !ds.some((d) => d.id === x.id)), ...ds].slice(-12) }))
      },

      startCustom: (d) => {
        registerDecision(d)
        set((s) => ({
          customDecisions: [...s.customDecisions.filter((x) => x.id !== d.id), d].slice(-12),
          decisionId: d.id,
          usual: { ...s.usual, [d.id]: d.usualId },
          guess: null,
          weights: null,
          lastResult: null,
          priority: s.vibeHistory.at(-1) ?? s.priority,
          screen: 'reveal',
        }))
      },

      setGuess: (guess) => set({ guess }),
      setPriority: (priority) => set({ priority, weights: null }),
      setGoal: (goal) => set({ goal: { ...goal, saved: Math.min(goal.saved, goal.target) } }),
      setWeights: (weights) => set({ weights, priority: nearestPriority(weights) }),
      setMoneyLeft: (moneyLeft) => set({ moneyLeft }),
      setUsual: (decisionId, optionId) => set((s) => ({ usual: { ...s.usual, [decisionId]: optionId } })),

      finishOnboarding: ({ timeRate, healthRate, goal, moneyLeft }) =>
        set({ onboarded: true, timeRate, healthRate, goal, moneyLeft, screen: 'home' }),

      commitChoice: (optionId) => {
        const s = get()
        if (!s.decisionId) return
        const d = getDecision(s.decisionId)
        const chosen = d.options.find((o) => o.id === optionId)
        const usual = d.options.find((o) => o.id === (s.usual[d.id] ?? d.usualId))
        if (!chosen || !usual) return

        // a habit counts a week of itself towards the goal; a one-off counts the whole difference once
        const delta = Math.round(creditFor(d, usual.costGBP - chosen.costGBP) * 100) / 100
        const minutes = Math.round(creditFor(d, usual.timeMin - chosen.timeMin))
        const purchase = isOneOff(d) ? null : timePurchase(chosen, usual, s.timeRate)
        const effect = s.goal ? goalEffect(s.goal, delta) : { deltaGBP: delta, days: 0 }

        // how close the monthly-cost guess was, for the streak and the Gut Score
        const err = s.guess === null ? 1 : guessError(s.guess, monthlyCost(usual, d))
        const isClose = s.guess !== null && err <= CLOSE
        // no guess (a decision made from speech) neither earns nor breaks a streak
        const streak = s.guess === null ? s.streak : nextStreak(s.streak, [isClose])

        const record: ChoiceRecord = {
          decisionId: d.id,
          optionId,
          priority: s.priority,
          guessErr: err,
          savedGBP: delta,
          minutesSaved: minutes,
          verdict: purchase?.verdict ?? null,
          at: Date.now(),
        }
        const history = [...s.history, record]
        const bestStreak = Math.max(s.bestStreak, streak)
        const earned = evaluateBadges(history, bestStreak)
        const newBadges = earned.filter((b) => !s.badges.includes(b))

        const gut = s.guess === null ? s.gut : addGuess(s.gut, closeness(err), isClose)

        set({
          history,
          badges: earned,
          gut,
          streak,
          bestStreak,
          vibeHistory: [...s.vibeHistory, s.priority],
          goal: s.goal ? applySaving(s.goal, delta) : null,
          lastResult: {
            decisionId: d.id,
            optionId,
            deltaGBP: delta,
            days: effect.days,
            basis: creditBasis(d, chosen.name),
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
      name: 'trade-off-check-v3',
      version: 5,
      // v4: the third axis became health instead of CO2 (footprint priority, green badge, carbon rate)
      migrate: (persisted, version) => {
        const s = (persisted ?? {}) as Record<string, unknown>
        if (version < 4) {
          const fix = (p: unknown) => (p === 'footprint' ? 'health' : p)
          s.priority = fix(s.priority)
          s.vibeHistory = ((s.vibeHistory as unknown[] | undefined) ?? []).map(fix)
          s.history = ((s.history as Record<string, unknown>[] | undefined) ?? []).map((h) => ({ ...h, priority: fix(h.priority) }))
          s.badges = ((s.badges as string[] | undefined) ?? []).map((b) => (b === 'green' ? 'health' : b))
          s.healthRate = s.carbonRate ?? 0.4
          delete s.carbonRate
          s.customDecisions = [] // those carried CO2 figures, not health scores
        }
        if (version < 5) {
          // v5: pixel icons replaced emoji for goals and decisions
          const g = s.goal as Record<string, unknown> | null | undefined
          if (g) {
            g.icon = EMOJI_TO_ICON[String(g.emoji)] ?? 'flag'
            delete g.emoji
          }
          s.customDecisions = []
        }
        return s as unknown as AppState
      },
      partialize: (s): Persisted => ({
        onboarded: s.onboarded,
        timeRate: s.timeRate,
        healthRate: s.healthRate,
        goal: s.goal,
        moneyLeft: s.moneyLeft,
        priority: s.priority,
        vibeHistory: s.vibeHistory,
        history: s.history,
        usual: s.usual,
        gut: s.gut,
        badges: s.badges,
        streak: s.streak,
        bestStreak: s.bestStreak,
        customDecisions: s.customDecisions,
      }),
      // returning visitors land on Home, not onboarding
      onRehydrateStorage: () => (state) => {
        state?.customDecisions?.forEach(registerDecision)
        if (state?.onboarded) state.go('home')
      },
    },
  ),
)
