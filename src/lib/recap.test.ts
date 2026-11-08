import { describe, expect, it } from 'vitest'
import { getDecision } from '../data/decisions'
import { BADGES, badgeLevels, badgeStats, newMedals, tierOf, tiersById } from './badges'
import { sanitiseDecision } from './estimate'
import { buildPlan, plainHeadline, validHeadline } from './plan'
import { quadrantPoints, resolveHistory, winWin, winWinScore, wrappedText } from './recap'
import type { ChoiceRecord, Decision } from './types'
import { mergePersisted, migrateState, useAppStore } from '../store/useAppStore'

const rec = (over: Partial<ChoiceRecord> = {}): ChoiceRecord => ({
  decisionId: 'commute', optionId: 'walk', priority: 'money', guessErr: 1, savedGBP: 1.8, minutesSaved: -12, verdict: null, at: 1_700_000_000_000, ...over,
})
// commute: usual bus (£1.80, 28 min, health 5); walk (£0, 40 min, health 9); uber (£7.40, 14 min, health 2)
const entriesOf = (...r: ChoiceRecord[]) => resolveHistory(r)

describe('better than usual score', () => {
  it('a choice is a win-win when it beats the usual on two or more of money, time and health', () => {
    expect(winWin(entriesOf(rec({ optionId: 'walk' }))[0])).toEqual({ axes: 2, win: true }) // cheaper and healthier, slower
    expect(winWin(entriesOf(rec({ optionId: 'uber' }))[0])).toEqual({ axes: 1, win: false }) // quicker only
    expect(winWin(entriesOf(rec({ optionId: 'bus' }))[0])).toEqual({ axes: 0, win: false }) // the usual itself
  })
  it('needs three choices before it scores', () => {
    expect(winWinScore(entriesOf(rec(), rec())).pct).toBeNull()
    expect(winWinScore(entriesOf(rec(), rec())).tier).toBe('Keep going')
  })
  it('scores the share of wins and names the tier', () => {
    const w = rec({ optionId: 'walk' })
    const u = rec({ optionId: 'uber' })
    expect(winWinScore(entriesOf(w, u, u, u))).toMatchObject({ pct: 25, wins: 1, of: 4, tier: 'Switcher' })
    expect(winWinScore(entriesOf(u, u, u, u)).tier).toBe('Rookie')
    expect(winWinScore(entriesOf(w, w, u, u)).tier).toBe('Optimiser')
    expect(winWinScore(entriesOf(w, w, w, u))).toMatchObject({ pct: 75, tier: 'Ball Master' })
  })
  it('goes into the share text once it has a score', () => {
    const e = entriesOf(rec(), rec(), rec())
    const text = wrappedText('App', null, { savedGBP: 5, minutes: 10, health: 3, choices: 3 }, winWinScore(e))
    expect(text).toContain('100% of my choices were better than my usual')
    expect(wrappedText('App', null, { savedGBP: 5, minutes: 10, health: 3, choices: 3 })).not.toContain('better than my usual')
  })
})

describe('quadrant map points', () => {
  it('puts a cheaper and healthier choice in the top right, with time as a percentage', () => {
    const [p] = quadrantPoints(entriesOf(rec({ optionId: 'walk' })))
    expect(p.x).toBe(100) // free against £1.80
    expect(p.y).toBe(4)
    expect(p.quadrant).toBe('win')
    expect(p.timePct).toBeCloseTo(((28 - 40) / 28) * 100, 5) // slower: negative
  })
  it('puts a dearer, quicker, less healthy choice bottom left', () => {
    const [p] = quadrantPoints(entriesOf(rec({ optionId: 'uber' })))
    expect(p.x).toBeLessThan(0)
    expect(p.y).toBe(-3)
    expect(p.quadrant).toBe('neither')
    expect(p.timePct).toBeGreaterThan(0)
  })
  it('keeps points off the edges: big wins get close but never reach them', () => {
    const [free] = quadrantPoints(entriesOf(rec({ optionId: 'walk' }))) // free vs £1.80: +100%, +4 health
    expect(free.x).toBe(100)
    expect(free.xn).toBeGreaterThan(0.6)
    expect(free.xn).toBeLessThan(0.9)
    expect(free.yn).toBeLessThan(0.9)
    const all = quadrantPoints(entriesOf(...(['walk', 'uber', 'bus'] as const).map((o) => rec({ optionId: o }))))
    for (const p of all) {
      expect(Math.abs(p.xn)).toBeLessThan(0.9)
      expect(Math.abs(p.yn)).toBeLessThan(0.9)
    }
  })
  it('the soft curve keeps order and sign, and small changes still move a fair way', () => {
    const cheap = quadrantPoints(entriesOf(rec({ decisionId: 'coffee', optionId: 'union' })))[0] // £1.90 vs £3.20: about +41%
    const free = quadrantPoints(entriesOf(rec({ decisionId: 'coffee', optionId: 'home' })))[0] // £0.30: about +91%
    expect(cheap.x).toBeLessThan(free.x)
    expect(cheap.xn).toBeLessThan(free.xn)
    expect(cheap.xn).toBeGreaterThan(0.3)
    expect(quadrantPoints(entriesOf(rec({ optionId: 'uber' })))[0].xn).toBeLessThan(0) // dearer is left
    expect(quadrantPoints(entriesOf(rec({ optionId: 'uber' })))[0].yn).toBeLessThan(0) // less healthy is down
  })
  it('puts the usual in the middle', () => {
    expect(quadrantPoints(entriesOf(rec({ optionId: 'bus' })))[0]).toMatchObject({ x: 0, y: 0, xn: 0, yn: 0, quadrant: 'same' })
  })
  it('a £450 console and a £1.80 coffee share one scale', () => {
    const console_ = sanitiseDecision({
      activity: 'Console', icon: 'plate', timesPerMonth: 0, usualIndex: 0,
      options: [
        { name: 'New PS5', icon: 'parcel', costGBP: 450, timeMin: 1440, health: 4 },
        { name: 'Used', icon: 'store', costGBP: 200, timeMin: 4320, health: 4 },
        { name: 'Lite', icon: 'parcel', costGBP: 180, timeMin: 2880, health: 5 },
      ],
    }) as Decision
    const big = { record: rec(), decision: console_, usual: console_.options[0], chosen: console_.options[1], healthDelta: 0 }
    const [p] = quadrantPoints([big])
    expect(p.x).toBeCloseTo(((450 - 200) / 450) * 100, 5)
    expect(Math.abs(p.x)).toBeLessThanOrEqual(100)
  })
  it('keeps only the latest few', () => {
    expect(quadrantPoints(entriesOf(...Array.from({ length: 20 }, () => rec())), 12)).toHaveLength(12)
  })
})

describe('medal badges', () => {
  it('the old Win-Win badge is now called Better Swaps, with the same id so saved data still works', () => {
    const b = BADGES.find((x) => x.id === 'winwin')!
    expect(b.name).toBe('Better Swaps')
    expect(b.line).toContain('beat your usual')
  })
  it('reaches each level at its edge', () => {
    expect(tierOf(2, [3, 8, 20])).toBe(0)
    expect(tierOf(3, [3, 8, 20])).toBe(1)
    expect(tierOf(8, [3, 8, 20])).toBe(2)
    expect(tierOf(19, [3, 8, 20])).toBe(2)
    expect(tierOf(20, [3, 8, 20])).toBe(3)
  })
  it('works the stats out from your history', () => {
    const h = [rec({ priority: 'money' }), rec({ priority: 'time', optionId: 'uber', savedGBP: -5.6 }), rec({ decisionId: 'coffee', optionId: 'union', priority: 'health', savedGBP: 1.3 })]
    const stats = badgeStats(h, resolveHistory(h), 2)
    expect(stats).toMatchObject({ money: 1, time: 1, health: 1, tried: 2, chains: 2 })
    expect(stats.saved).toBeCloseTo(3.1, 5) // a costly choice never takes pounds away
    expect(stats.switch).toBe(3)
    expect(stats.winwin).toBe(2) // walk and the union coffee
  })
  it('shows progress to the next medal and stops at gold', () => {
    const levels = badgeLevels({ money: 5, time: 0, health: 30, winwin: 0, switch: 0, saved: 0, tried: 0, chains: 0 })
    const penny = levels.find((l) => l.def.id === 'penny')!
    expect(penny).toMatchObject({ tier: 1, value: 5, next: 8 })
    expect(levels.find((l) => l.def.id === 'health')).toMatchObject({ tier: 3, next: null })
    expect(levels).toHaveLength(BADGES.length)
  })
  it('only announces medals that went up', () => {
    const before = { penny: 1, health: 3 }
    const after = badgeLevels({ money: 8, time: 3, health: 30, winwin: 0, switch: 0, saved: 0, tried: 0, chains: 0 })
    expect(newMedals(before, after)).toEqual([
      { id: 'penny', tier: 2 }, // levelled up
      { id: 'timesaver', tier: 1 }, // brand new
    ])
    expect(newMedals(tiersById(after), after)).toEqual([])
  })
})

describe('try next week plan', () => {
  it('suggests an option that beats what you chose, best saving first', () => {
    const plan = buildPlan([rec({ decisionId: 'dinner', optionId: 'delivery' })])
    expect(plan).toHaveLength(1)
    expect(plan[0].decision.id).toBe('dinner')
    expect(plan[0].option.id).toBe('cook') // usual is delivery (£11.50); cooking (£1.90) saves the most
    expect(plan[0].weeklyGBP).toBeCloseTo((11.5 - 1.9) * ((12 * 12) / 52), 1)
    expect(plan[0].last.id).toBe('delivery')
  })
  it('does not suggest what you already chose, or something no better', () => {
    expect(buildPlan([rec({ decisionId: 'dinner', optionId: 'cook' })])).toEqual([]) // already the best saver
    expect(buildPlan([])).toEqual([])
  })
  it('keeps the latest choice per habit and limits to three', () => {
    const habits = ['commute', 'dinner', 'lunch', 'coffee'].map((id) => rec({ decisionId: id, optionId: getDecision(id).usualId }))
    expect(buildPlan(habits).length).toBeLessThanOrEqual(3)
    const twice = buildPlan([rec({ decisionId: 'dinner', optionId: 'cook' }), rec({ decisionId: 'dinner', optionId: 'delivery' })])
    expect(twice[0].last.id).toBe('delivery') // the latest one counts
  })
  it('only lets a headline through if it has no numbers or money in it', () => {
    expect(validHeadline('Small swaps, big wins next week.')).toBe(true)
    expect(validHeadline('Save £14 next week.')).toBe(false)
    expect(validHeadline('Try 3 swaps next week.')).toBe(false)
    expect(validHeadline('Hi')).toBe(false)
    expect(plainHeadline(2)).not.toMatch(/[0-9£]/)
  })
})

describe('badges and chains in the store', () => {
  it('drops old badge ids and starts a chain count when upgrading', () => {
    const old = migrateState({ badges: ['penny', 'sharp'], goal: { name: 'x' }, history: [] }, 6)
    expect('badges' in old).toBe(false)
    expect('badgeTiers' in old).toBe(false)
    expect(old.chains).toBe(0)
  })
  it('works out medal levels already earned when upgrading, so they are not announced again', () => {
    const h = [rec({ priority: 'money' }), rec({ priority: 'money' }), rec({ priority: 'money' })]
    const upgraded = mergePersisted({ history: h, usual: {}, chains: 0 }, useAppStore.getState())
    expect(upgraded.badgeTiers.penny).toBe(1) // three money-first choices is already bronze
    // saved data that has its own levels keeps them
    expect(mergePersisted({ history: h, badgeTiers: { penny: 2 } }, useAppStore.getState()).badgeTiers).toEqual({ penny: 2 })
  })
  it('counts a chain only when a run of two or more habits finishes', () => {
    const make = (title: string) =>
      sanitiseDecision({
        activity: title, icon: 'bus', timesPerMonth: 20, usualIndex: 0,
        options: [
          { name: 'Usual', icon: 'car', costGBP: 10, timeMin: 20, health: 3 },
          { name: 'Cheaper', icon: 'bus', costGBP: 2, timeMin: 30, health: 6 },
          { name: 'Free', icon: 'walk', costGBP: 0, timeMin: 50, health: 9 },
        ],
      })!
    const s = useAppStore
    s.getState().reset()
    s.getState().startCustom(make('Solo'))
    s.getState().commitChoice('o2')
    expect(s.getState().chains).toBe(0) // one habit is not a chain

    const [a, b] = [make('One'), make('Two')]
    s.getState().startQueue([a, b])
    s.getState().commitChoice(a.options[1].id)
    expect(s.getState().chains).toBe(0) // not finished yet
    s.getState().commitChoice(b.options[1].id)
    expect(s.getState().chains).toBe(1)
    expect(s.getState().lastResult?.newBadges.some((m) => m.id === 'chain' && m.tier === 1)).toBe(true)
    expect(s.getState().badgeTiers.chain).toBe(1)
  })
})
