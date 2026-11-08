import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDecision, registerDecision } from '../data/decisions'
import { badgeLevels, badgeStats, newMedals, tiersById } from '../lib/badges'
import type { BadgeLevel } from '../lib/badges'
import { resolveHistory } from '../lib/recap'
import { timePurchase } from '../lib/explain'
import type { TimePurchase } from '../lib/explain'
import { DEFAULT_HEALTH_RATE, DEFAULT_TIME_RATE } from '../lib/exchangeRates'
import { CLOSE, closeness, guessError, monthlyCost } from '../lib/guess'
import { creditBasis, creditFor, isOneOff } from '../lib/habit'
import { EMPTY_GUT, addGuess, nextStreak } from '../lib/gut'
import type { GutTally } from '../lib/gut'
import { nearestPriority } from '../lib/mix'
import { nextInQueue } from '../lib/queue'
import type { ChoiceRecord, Decision, Priority, Weights } from '../lib/types'

export type Screen = 'onboarding' | 'home' | 'predict' | 'reveal' | 'priority' | 'result' | 'recap'

/** A typical student's weekly spending money, used to judge how tight "money left" is. */
export const WEEKLY_BASE = 50
export const moneyRatio = (left: number): number => Math.min(1, Math.max(0, left / WEEKLY_BASE))

export interface LastResult {
  decisionId: string
  optionId: string
  deltaGBP: number
  /** minutes saved (positive) or extra (negative), counted the same way as the money */
  minutes: number
  /** health points gained (positive) or given up against the usual */
  healthDelta: number
  /** how the saving was counted: "over a week of Walk" or "once" */
  basis: string
  purchase: TimePurchase | null
  /** medals earned or levelled up by this choice, e.g. Penny Pincher reaching silver (tier 2) */
  newBadges: { id: string; tier: number }[]
}


interface Persisted {
  onboarded: boolean
  timeRate: number
  healthRate: number
  moneyLeft: number
  priority: Priority
  vibeHistory: Priority[]
  history: ChoiceRecord[]
  usual: Record<string, string>
  gut: GutTally
  /** badge id to medal level (0 locked, 1 bronze, 2 silver, 3 gold), to know what has already been celebrated */
  badgeTiers: Record<string, number>
  /** runs of several habits you finished */
  chains: number
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
  /** weights set with the priority sliders; null until the student moves them (then the history blend applies) */
  weights: Weights | null
  lastResult: LastResult | null
  /** habits still to go after this one, when several came from one sentence */
  queue: string[]
  /** what was chosen so far in this run of habits, for the summary */
  session: LastResult[]
}

interface Actions {
  go: (screen: Screen) => void
  startDecision: (id: string) => void
  /** begin from a decision made from speech: no guess round, straight to the results */
  startCustom: (d: Decision) => void
  /** keep decisions made from speech (several can come from one sentence) so they wait on the belt */
  addCustoms: (ds: Decision[]) => void
  /** start several habits one after another: the first now, the rest chained after it */
  startQueue: (ds: Decision[]) => void
  setGuess: (n: number) => void
  setPriority: (p: Priority) => void
  setWeights: (w: Weights) => void
  setMoneyLeft: (n: number) => void
  setUsual: (decisionId: string, optionId: string) => void
  finishOnboarding: (v: { timeRate: number; healthRate: number; moneyLeft: number }) => void
  commitChoice: (optionId: string) => void
  loadDemo: () => void
  reset: () => void
}

export type AppState = Persisted & Flow & Actions

const fresh = (): Persisted => ({
  onboarded: false,
  timeRate: DEFAULT_TIME_RATE,
  healthRate: DEFAULT_HEALTH_RATE,
  moneyLeft: 40,
  priority: 'balanced',
  vibeHistory: [],
  history: [],
  usual: {},
  gut: { ...EMPTY_GUT },
  badgeTiers: {},
  chains: 0,
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
  queue: [],
  session: [],
})

const levelsFor = (history: ChoiceRecord[], usual: Record<string, string>, chains: number): BadgeLevel[] =>
  badgeLevels(badgeStats(history, resolveHistory(history, usual), chains))
const computeTiers = (history: ChoiceRecord[], usual: Record<string, string>, chains: number): Record<string, number> =>
  tiersById(levelsFor(history, usual, chains))

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
    moneyLeft: 25,
    priority: 'time',
    vibeHistory: history.map((h) => h.priority),
    history,
    gut: { points: 3.4, weight: 6, n: 4, close: 2 },
    badgeTiers: computeTiers(history, {}, 0),
    streak: 2,
    bestStreak: 3,
  }
}

/**
 * Combine saved data with the fresh state. If the saved data has no medal levels yet (it came from before they
 * existed), work them out from the history now, so medals you already earned are not announced as new.
 */
export function mergePersisted(persisted: unknown, current: AppState): AppState {
  const p = (persisted ?? {}) as Partial<Persisted>
  p.customDecisions?.forEach(registerDecision)
  const merged = { ...current, ...p } as AppState
  if (!p.badgeTiers) merged.badgeTiers = computeTiers(merged.history ?? [], merged.usual ?? {}, merged.chains ?? 0)
  return merged
}

/** Bring saved data from an older version up to date. */
export function migrateState(persisted: unknown, version: number): Record<string, unknown> {
  const s = (persisted ?? {}) as Record<string, unknown>
  // v4: the third axis became health instead of CO2 (footprint priority, green badge, carbon rate)
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
  if (version < 5) s.customDecisions = [] // v5: pixel icons replaced emoji in decisions
  if (version < 6) delete s.goal // v6: the savings goal was removed
  if (version < 7) {
    // v7: badges became medal levels worked out from your history
    delete s.badges
    delete s.badgeTiers
    s.chains = 0
  }
  return s
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
          queue: [],
          session: [],
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
          queue: [],
          session: [],
          priority: s.vibeHistory.at(-1) ?? s.priority,
          screen: 'reveal',
        }))
      },

      startQueue: (ds) => {
        if (!ds.length) return
        ds.forEach(registerDecision)
        const [first, ...rest] = ds
        set((s) => ({
          customDecisions: [...s.customDecisions.filter((x) => !ds.some((d) => d.id === x.id)), ...ds].slice(-12),
          decisionId: first.id,
          usual: { ...s.usual, ...Object.fromEntries(ds.map((d) => [d.id, d.usualId])) },
          guess: null,
          weights: null,
          lastResult: null,
          queue: rest.map((d) => d.id),
          session: [],
          priority: s.vibeHistory.at(-1) ?? s.priority,
          screen: 'reveal',
        }))
      },

      setGuess: (guess) => set({ guess }),
      setPriority: (priority) => set({ priority, weights: null }),
      setWeights: (weights) => set({ weights, priority: nearestPriority(weights) }),
      setMoneyLeft: (moneyLeft) => set({ moneyLeft }),
      setUsual: (decisionId, optionId) => set((s) => ({ usual: { ...s.usual, [decisionId]: optionId } })),

      finishOnboarding: ({ timeRate, healthRate, moneyLeft }) => set({ onboarded: true, timeRate, healthRate, moneyLeft, screen: 'home' }),

      commitChoice: (optionId) => {
        const s = get()
        if (!s.decisionId) return
        const d = getDecision(s.decisionId)
        const chosen = d.options.find((o) => o.id === optionId)
        const usual = d.options.find((o) => o.id === (s.usual[d.id] ?? d.usualId))
        if (!chosen || !usual) return

        // a habit counts a week of itself; a one-off counts the whole difference once
        const delta = Math.round(creditFor(d, usual.costGBP - chosen.costGBP) * 100) / 100
        const minutes = Math.round(creditFor(d, usual.timeMin - chosen.timeMin))
        const purchase = isOneOff(d) ? null : timePurchase(chosen, usual, s.timeRate)

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
        // finishing a run of two or more habits counts as a chain
        const ending = !nextInQueue(s.queue).next
        const chains = s.chains + (ending && s.session.length >= 1 ? 1 : 0)
        const levels = levelsFor(history, s.usual, chains)
        const newBadges = newMedals(s.badgeTiers, levels)

        const gut = s.guess === null ? s.gut : addGuess(s.gut, closeness(err), isClose)

        const result: LastResult = {
          decisionId: d.id,
          optionId,
          deltaGBP: delta,
          minutes,
          healthDelta: chosen.health - usual.health,
          basis: creditBasis(d, chosen.name),
          purchase,
          newBadges,
        }
        const session = [...s.session, result]
        const { next, rest } = nextInQueue(s.queue)

        set({
          history,
          badgeTiers: tiersById(levels),
          chains,
          gut,
          streak,
          bestStreak,
          vibeHistory: [...s.vibeHistory, s.priority],
          lastResult: result,
          session,
          weights: null,
          // another habit from the same sentence: go straight to its results; otherwise the summary
          ...(next ? { decisionId: next, guess: null, queue: rest, screen: 'reveal' as Screen } : { queue: [], screen: 'result' as Screen }),
        })
      },

      loadDemo: () => set({ ...demoProfile(), ...freshFlow('home') }),
      reset: () => set({ ...fresh(), ...freshFlow('onboarding') }),
    }),
    {
      name: 'trade-off-check-v3',
      version: 7,
      // after loading, work out the medal levels already earned so they are not announced again as new
      merge: (persisted, current) => mergePersisted(persisted, current),
      migrate: (persisted, version) => migrateState(persisted, version) as unknown as AppState,
      partialize: (s): Persisted => ({
        onboarded: s.onboarded,
        timeRate: s.timeRate,
        healthRate: s.healthRate,
        moneyLeft: s.moneyLeft,
        priority: s.priority,
        vibeHistory: s.vibeHistory,
        history: s.history,
        usual: s.usual,
        gut: s.gut,
        badgeTiers: s.badgeTiers,
        chains: s.chains,
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
