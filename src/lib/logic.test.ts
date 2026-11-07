import { describe, expect, it } from 'vitest'
import { DECISIONS, getDecision } from '../data/decisions'
import { evaluateBadges } from './badges'
import { stepValue } from './countUp'
import { CARBON_START, TIME_START, midpoint, refine, timeDuelPrice } from './exchangeRates'
import { biggestSurprise, countCorrect, recommendationSentence, timePurchase } from './explain'
import { gutScore, gutShareText } from './gut'
import { applySaving, daysLeft, goalEffect, isoInDays } from './goal'
import { buildRace, pickRival, progressAt, raceSentence } from './race'
import { PRIORITY_WEIGHTS, bestOn, blendWeights, normalise, rank } from './scoring'
import type { ChoiceRecord, Goal, Guesses } from './types'

const commute = getDecision('commute')

describe('scoring', () => {
  it('normalises to 0 for the best and higher for worse', () => {
    const n = normalise(commute.options, 'cost')
    expect(n[2]).toBe(0) // walk is free
    expect(n[1]).toBeGreaterThan(n[0])
  })

  it('money priority picks the cheapest, time priority the fastest', () => {
    const money = rank(commute.options, PRIORITY_WEIGHTS.money)
    const time = rank(commute.options, PRIORITY_WEIGHTS.time)
    expect(money.ranked[0].option.id).toBe('walk')
    expect(time.ranked[0].option.id).toBe('uber')
  })

  it('never gives a zero weight and weights sum to 1', () => {
    const { weights } = blendWeights('money', ['money', 'money'], 1)
    expect(weights.time).toBeGreaterThan(0)
    expect(weights.cost + weights.time + weights.co2).toBeCloseTo(1)
  })

  it('history shifts weights toward past priorities', () => {
    const fresh = blendWeights('money', [], 1).weights
    const withHistory = blendWeights('money', ['time', 'time', 'time'], 1)
    expect(withHistory.weights.time).toBeGreaterThan(fresh.time)
    expect(withHistory.historyShifted).toBe(true)
  })

  it('a tight budget nudges the cost weight up', () => {
    const loose = blendWeights('balanced', [], 1).weights.cost
    const tight = blendWeights('balanced', [], 0.1)
    expect(tight.weights.cost).toBeGreaterThan(loose)
    expect(tight.moneyNudged).toBe(true)
  })

  it('reports a close call when the top two are within 0.05', () => {
    const [a] = commute.options
    const twin = { ...a, id: 'twin', name: 'Twin' }
    const r = rank([a, twin, commute.options[1]], PRIORITY_WEIGHTS.balanced)
    expect(r.close).toBe(true)
  })

  it('every decision has a real trade-off: cheapest is not the fastest', () => {
    for (const d of DECISIONS) {
      expect(bestOn(d.options, 'cost').id).not.toBe(bestOn(d.options, 'time').id)
    }
  })
})

describe('exchange rates', () => {
  it('bisection narrows toward the answer', () => {
    let b = TIME_START
    b = refine(b, midpoint(b), false)
    expect(b.hi).toBe(midpoint(TIME_START))
    b = refine(b, midpoint(b), true)
    expect(b.lo).toBeGreaterThan(TIME_START.lo)
  })

  it('duel price is half the hourly rate for a 30 minute saving', () => {
    expect(timeDuelPrice(TIME_START)).toBeCloseTo(midpoint(TIME_START) / 2)
    expect(midpoint(CARBON_START)).toBeGreaterThan(0)
  })
})

describe('time purchase', () => {
  const [bus, uber] = commute.options
  it('is null when nothing extra is paid', () => {
    expect(timePurchase(bus, uber, 10)).toBeNull()
  })
  it('judges against the user rate', () => {
    // bus -> uber: £5.60 for 14 min = £24/h
    const steep = timePurchase(uber, bus, 10)
    expect(steep?.verdict).toBe('steep')
    expect(timePurchase(uber, bus, 40)?.verdict).toBe('good')
    expect(timePurchase(uber, bus, 22)?.verdict).toBe('fair')
  })
})

describe('surprise', () => {
  it('finds the wrong guess with the largest gap, in monthly terms', () => {
    const g: Guesses = { cost: 'uber', time: 'uber', co2: 'walk' }
    const s = biggestSurprise(commute, g)
    expect(s?.axis).toBe('cost')
    expect(s?.perMonth).toBeCloseTo(7.4 * 20)
    expect(countCorrect(commute, g)).toBe(2)
  })
  it('returns null when all guesses are right', () => {
    expect(biggestSurprise(commute, { cost: 'walk', time: 'uber', co2: 'walk' })).toBeNull()
  })
})

describe('recommendation sentence', () => {
  it('states the trade-off plainly', () => {
    const s = recommendationSentence(rank(commute.options, PRIORITY_WEIGHTS.money))
    expect(s).toMatch(/Walk is/)
    expect(s).toMatch(/than/)
  })
})

describe('goal', () => {
  const now = Date.now()
  const goal: Goal = { name: 'Festival', emoji: '🎪', target: 120, saved: 0, dueISO: isoInDays(60, now) }

  it('turns pounds into days', () => {
    expect(daysLeft(goal, now)).toBe(60)
    expect(goalEffect(goal, 2, now).days).toBeCloseTo(1) // £2/day needed
    expect(goalEffect(goal, -4, now).days).toBeCloseTo(-2)
  })

  it('clamps saved between 0 and target', () => {
    expect(applySaving(goal, -50).saved).toBe(0)
    expect(applySaving(goal, 500).saved).toBe(120)
  })
})

describe('count up', () => {
  it('moves in discrete steps and lands exactly on the target', () => {
    expect(stepValue(0, 10, 0, 5)).toBe(0)
    expect(stepValue(0, 10, 1, 5)).toBe(2)
    expect(stepValue(0, 10, 3, 5)).toBe(6)
    expect(stepValue(0, 10, 5, 5)).toBe(10)
    expect(stepValue(0, 10, 9, 5)).toBe(10)
  })
})

describe('badges', () => {
  const rec = (over: Partial<ChoiceRecord>): ChoiceRecord => ({
    decisionId: 'commute',
    optionId: 'bus',
    priority: 'money',
    correctGuesses: 1,
    savedGBP: 0,
    minutesSaved: 0,
    verdict: null,
    at: 0,
    ...over,
  })

  it('awards pattern badges, not spending badges', () => {
    const ids = evaluateBadges([rec({}), rec({}), rec({ priority: 'time' }), rec({ priority: 'footprint' })])
    expect(ids).toContain('penny')
    expect(ids).toContain('balanced')
    expect(ids).not.toContain('timesaver')
  })

  it('awards Sharp Eye and Worth It', () => {
    const ids = evaluateBadges([rec({ correctGuesses: 3, verdict: 'good' })])
    expect(ids).toEqual(expect.arrayContaining(['sharp', 'worth']))
  })
})

describe('two yous race', () => {
  const now = Date.UTC(2026, 0, 1)
  const goal: Goal = { name: 'Festival', emoji: '🎪', target: 120, saved: 20, dueISO: new Date(now + 60 * 86_400_000).toISOString() }
  const bus = commute.options.find((o) => o.id === 'bus')!
  const uber = commute.options.find((o) => o.id === 'uber')!
  const walk = commute.options.find((o) => o.id === 'walk')!

  it('your usual lands exactly on the due date', () => {
    const r = buildRace(goal, goal.saved, commute, bus, uber, bus, now)
    expect(r.a.weeksToGoal! * 7).toBeCloseTo(60, 5)
  })

  it('a cheaper habit finishes earlier than a pricier one', () => {
    const r = buildRace(goal, goal.saved, commute, walk, uber, bus, now)
    // a daily Uber habit outspends the whole saving pace, so that lane never gets there
    expect(r.b.weeksToGoal).toBeNull()
    expect(r.gapDays).toBeNull()
    const fin = buildRace(goal, goal.saved, commute, walk, bus, bus, now)
    expect(fin.a.weeksToGoal!).toBeLessThan(fin.b.weeksToGoal!)
    expect(fin.gapDays!).toBeGreaterThan(0)
  })

  it('a habit that stops saving never reaches the goal', () => {
    const r = buildRace(goal, goal.saved, commute, bus, uber, walk, now)
    expect(r.b.weeksToGoal === null || r.b.weeksToGoal > r.a.weeksToGoal!).toBe(true)
  })

  it('progress is clamped between 0 and 1', () => {
    const r = buildRace(goal, goal.saved, commute, walk, uber, bus, now)
    expect(progressAt(r.a, goal.saved, goal.target, 0)).toBeCloseTo(20 / 120)
    expect(progressAt(r.a, goal.saved, goal.target, 999)).toBe(1)
  })

  it('races your usual when you chose something else, else the furthest option on cost', () => {
    expect(pickRival(commute, 'uber', 'bus').id).toBe('bus')
    expect(pickRival(commute, 'bus', 'bus').id).toBe('uber')
  })
})

describe('race sentence', () => {
  const now = Date.UTC(2026, 0, 1)
  const goal: Goal = { name: 'Festival', emoji: '🎪', target: 120, saved: 20, dueISO: new Date(now + 60 * 86_400_000).toISOString() }
  const o = (id: string) => commute.options.find((x) => x.id === id)!
  it('names the earlier lane first and the gap in days', () => {
    const r = buildRace(goal, goal.saved, commute, o('walk'), o('bus'), o('bus'), now)
    const s = raceSentence('Festival', r)
    expect(s.startsWith('With Walk')).toBe(true)
    expect(s).toContain('days later')
  })
  it('says so plainly when a habit never gets there', () => {
    const r = buildRace(goal, goal.saved, commute, o('bus'), o('uber'), o('bus'), now)
    expect(raceSentence('Festival', r)).toContain('over two years')
  })
})

describe('gut score', () => {
  it('is null before any guess and a tiered percentage after', () => {
    const none = { cost: { right: 0, total: 0 }, time: { right: 0, total: 0 }, co2: { right: 0, total: 0 } }
    expect(gutScore(none).pct).toBeNull()
    const some = { cost: { right: 2, total: 4 }, time: { right: 3, total: 4 }, co2: { right: 1, total: 4 } }
    const s = gutScore(some)
    expect(s.pct).toBe(50)
    expect(s.tier).toBe('Getting warm')
    expect(gutShareText('App', s, some)).toContain('50%')
  })
})
