import { describe, expect, it } from 'vitest'
import { DECISIONS, getDecision } from '../data/decisions'
import { evaluateBadges } from './badges'
import { stepValue } from './countUp'
import { HEALTH_START, TIME_START, midpoint, refine, timeDuelPrice } from './exchangeRates'
import { recommendationSentence, timePurchase } from './explain'
import { BAND_LABEL, band, closeness, guessError, monthlyCost, sliderMax, sliderStep } from './guess'
import { EMPTY_GUT, addGuess, gutScore, gutShareText, nextStreak } from './gut'
import { habitLine } from './hook'
import { applySaving, daysLeft, goalEffect, isoInDays } from './goal'
import { buildRace, pickRival, progressAt, raceSentence } from './race'
import { PRIORITY_WEIGHTS, bestOn, blendWeights, normalise, podiumOrder, rank } from './scoring'
import { suggestFor } from './suggest'
import type { ChoiceRecord, Goal } from './types'

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
    expect(weights.cost + weights.time + weights.health).toBeCloseTo(1)
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
    expect(midpoint(HEALTH_START)).toBeGreaterThan(0)
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

describe('recommendation sentence', () => {
  it('states the trade-off plainly', () => {
    const s = recommendationSentence(rank(commute.options, PRIORITY_WEIGHTS.money))
    expect(s).toMatch(/Walk is/)
    expect(s).toMatch(/than/)
  })
})

describe('goal', () => {
  const now = Date.now()
  const goal: Goal = { name: 'Festival', icon: 'ticket', target: 120, saved: 0, dueISO: isoInDays(60, now) }

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
    guessErr: 0.5,
    savedGBP: 0,
    minutesSaved: 0,
    verdict: null,
    at: 0,
    ...over,
  })

  it('awards pattern badges, not spending badges', () => {
    const ids = evaluateBadges([rec({}), rec({}), rec({ priority: 'time' }), rec({ priority: 'health' })])
    expect(ids).toContain('penny')
    expect(ids).toContain('balanced')
    expect(ids).not.toContain('timesaver')
  })

  it('awards Sharp Eye and Worth It', () => {
    const ids = evaluateBadges([rec({ guessErr: 0.05, verdict: 'good' })])
    expect(ids).toEqual(expect.arrayContaining(['sharp', 'worth']))
  })
})

describe('two yous race', () => {
  const now = Date.UTC(2026, 0, 1)
  const goal: Goal = { name: 'Festival', icon: 'ticket', target: 120, saved: 20, dueISO: new Date(now + 60 * 86_400_000).toISOString() }
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
  const goal: Goal = { name: 'Festival', icon: 'ticket', target: 120, saved: 20, dueISO: new Date(now + 60 * 86_400_000).toISOString() }
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

describe('monthly-cost guess', () => {
  const bus = commute.options.find((o) => o.id === 'bus')!
  it('monthly cost is cost times how often', () => {
    expect(monthlyCost(bus, commute)).toBeCloseTo(1.8 * 20)
  })
  it('error is a fraction of the truth, with a floor for free habits', () => {
    expect(guessError(45, 36)).toBeCloseTo(0.25)
    expect(guessError(10, 0)).toBeCloseTo(2)
    expect(closeness(0.3)).toBeCloseTo(0.7)
    expect(closeness(2)).toBe(0)
  })
  it('bands the miss', () => {
    expect(band(0.05)).toBe('bullseye')
    expect(band(0.2)).toBe('close')
    expect(band(0.4)).toBe('near')
    expect(BAND_LABEL[band(0.9)]).toBe('Way off')
  })
  it('slider range goes past the dearest option without giving the answer', () => {
    const max = sliderMax(commute)
    const dearest = Math.max(...commute.options.map((o) => monthlyCost(o, commute)))
    expect(max).toBeGreaterThan(dearest)
    expect(sliderStep(max)).toBeGreaterThan(0)
  })
})

describe('gut score, streak, badges and habit line', () => {
  it('is null before any guess and tiered after', () => {
    expect(gutScore(EMPTY_GUT).pct).toBeNull()
    let g = addGuess(EMPTY_GUT, 0.9, true)
    g = addGuess(g, 0.3, false)
    expect(gutScore(g).pct).toBe(60)
    expect(gutScore(g).tier).toBe('Sharp eye')
    expect(g.close).toBe(1)
    expect(gutShareText('App', gutScore(g), g, 3)).toContain('60%')
  })
  it('streak grows on close guesses and resets on a miss', () => {
    expect(nextStreak(2, [true])).toBe(3)
    expect(nextStreak(4, [false])).toBe(0)
  })
  it('badges for bullseyes and streaks', () => {
    const rec = (o: Partial<ChoiceRecord>): ChoiceRecord => ({
      decisionId: 'commute', optionId: 'bus', priority: 'money', guessErr: 0.5, savedGBP: 0, minutesSaved: 0, verdict: null, at: 0, ...o,
    })
    expect(evaluateBadges([rec({ guessErr: 0.08 })])).toContain('sharp')
    expect(evaluateBadges([rec({ guessErr: 0.2 })])).not.toContain('sharp')
    expect(evaluateBadges([rec({})], 5)).toContain('streak')
    expect(evaluateBadges([rec({})], 4)).not.toContain('streak')
  })
  it('habit line states the monthly cost in goal days, or just money with no goal', () => {
    const now = Date.UTC(2026, 0, 1)
    const g: Goal = { name: 'Festival ticket', icon: 'ticket', target: 120, saved: 20, dueISO: new Date(now + 50 * 86_400_000).toISOString() }
    const bus = commute.options.find((o) => o.id === 'bus')!
    const walk = commute.options.find((o) => o.id === 'walk')!
    expect(habitLine(commute, bus, g, now)).toContain('days of saving for Festival ticket')
    expect(habitLine(commute, bus, null, now)).not.toContain('days of')
    expect(habitLine(commute, walk, g, now)).toContain('costs nothing')
    const big = getDecision('foodshop')
    expect(habitLine(big, big.options[0], g, now)).toContain('more than the')
  })
})

describe('podium and suggestion', () => {
  it('orders options best first, ties keeping data order', () => {
    expect(podiumOrder(commute.options, 'cost').map((o) => o.id)).toEqual(['walk', 'bus', 'uber'])
    expect(podiumOrder(commute.options, 'time').map((o) => o.id)).toEqual(['uber', 'bus', 'walk'])
    const tie = [commute.options[0], { ...commute.options[1], costGBP: commute.options[0].costGBP }, commute.options[2]]
    expect(podiumOrder(tie, 'cost').map((o) => o.id)).toEqual([tie[2].id, tie[0].id, tie[1].id])
  })
  it('suggestion follows the priority', () => {
    expect(suggestFor(commute, 'money', [], 1).suggested.id).toBe('walk')
    expect(suggestFor(commute, 'time', [], 1).suggested.id).toBe('uber')
    expect(suggestFor(commute, 'time', [], 1).others).toHaveLength(2)
  })
})
