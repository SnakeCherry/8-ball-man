import { describe, expect, it } from 'vitest'
import { DECISIONS, getDecision, registerDecision } from '../data/decisions'
import { matchPreset, parseEstimate, parseGroups, sanitiseDecision } from './estimate'
import { bestSwitch } from './hook'
import { forSpeech } from './speech'
import { creditBasis, creditFor, isOneOff, perMonth, usesPerWeek } from './habit'
import { gbp, mins, timeSavedText } from './format'
import { CHOOSABLE } from './pixelart'
import { monthlyCost } from './guess'
import { ago, personality, resolveHistory, totals, wrappedText } from './recap'
import type { ChoiceRecord } from './types'
import { ICON_NAMES, PALETTE, artBox, dims, frameCount, framesOf, iconForText, naturalSize } from './pixelart'
import { parseSpokenAmount } from './speech'
import { suggestFor } from './suggest'
import { contributions, nearestPriority, valuesToWeights, weightsToValues } from './mix'
import { rank } from './scoring'

describe('priority mixer', () => {
  const walkBus = DECISIONS.find((x) => x.id === 'commute')!.options

  it('turns slider values into weights that sum to 1, with no priority ignored', () => {
    const w = valuesToWeights({ cost: 10, time: 0, health: 0 })
    expect(w.cost + w.time + w.health).toBeCloseTo(1, 6)
    expect(w.cost).toBeGreaterThan(0.85)
    expect(Math.min(w.time, w.health)).toBeGreaterThanOrEqual(0.05)
  })
  it('all-zero sliders mean an even split, not a divide by zero', () => {
    expect(valuesToWeights({ cost: 0, time: 0, health: 0 })).toEqual({ cost: 1 / 3, time: 1 / 3, health: 1 / 3 })
  })
  it('weights go back to sensible slider positions', () => {
    expect(weightsToValues({ cost: 0.6, time: 0.3, health: 0.1 })).toEqual({ cost: 10, time: 5, health: 2 })
    expect(weightsToValues({ cost: 1 / 3, time: 1 / 3, health: 1 / 3 })).toEqual({ cost: 10, time: 10, health: 10 })
  })
  it('names the nearest priority, balanced when about even', () => {
    expect(nearestPriority({ cost: 1 / 3, time: 1 / 3, health: 1 / 3 })).toBe('balanced')
    expect(nearestPriority({ cost: 0.7, time: 0.15, health: 0.15 })).toBe('money')
    expect(nearestPriority({ cost: 0.15, time: 0.7, health: 0.15 })).toBe('time')
    expect(nearestPriority({ cost: 0.15, time: 0.15, health: 0.7 })).toBe('health')
  })
  it('leaderboard order matches the ranking and the parts add up to the fit', () => {
    for (const w of [valuesToWeights({ cost: 10, time: 0, health: 0 }), valuesToWeights({ cost: 0, time: 10, health: 0 }), valuesToWeights({ cost: 0, time: 0, health: 10 })]) {
      const board = contributions(walkBus, w)
      expect(board.map((c) => c.option.id)).toEqual(rank(walkBus, w).ranked.map((r) => r.option.id))
      for (const c of board) expect(c.parts.cost + c.parts.time + c.parts.health).toBeCloseTo(c.fit, 8)
    }
  })
  it('money first puts the free walk on top, time first the quick taxi', () => {
    expect(contributions(walkBus, valuesToWeights({ cost: 10, time: 0, health: 0 }))[0].option.id).toBe('walk')
    expect(contributions(walkBus, valuesToWeights({ cost: 0, time: 10, health: 0 }))[0].option.id).toBe('uber')
  })
  it('suggestFor uses slider weights over the blend', () => {
    const d = DECISIONS.find((x) => x.id === 'commute')!
    expect(suggestFor(d, 'time', [], 1, valuesToWeights({ cost: 10, time: 0, health: 0 })).suggested.id).toBe('walk')
    expect(suggestFor(d, 'money', [], 1, valuesToWeights({ cost: 0, time: 10, health: 0 })).suggested.id).toBe('uber')
  })
})

describe('spoken amounts', () => {
  const cases: [string, number | null][] = [
    ['52', 52], ['£40', 40], ['40 pounds', 40], ['about 60 quid', 60], ['1,200', 1200],
    ['forty quid', 40], ['about sixty', 60], ['fifty-two', 52], ['fifty two pounds', 52],
    ['a hundred and twenty', 120], ['one hundred', 100], ['two fifty', 250], ['nineteen', 19],
    ['three hundred and five', 305], ['zero', 0], ['hello there', null], ['', null],
  ]
  it.each(cases)('%s -> %s', (text, want) => expect(parseSpokenAmount(text)).toBe(want))
})

const goodRaw = {
  activity: 'Commute to Uni',
  icon: 'car',
  timesPerMonth: 20,
  usualIndex: 0,
  options: [
    { name: 'Uber to Uni', icon: 'car', costGBP: 12.5, timeMin: 25, health: 2 },
    { name: 'Lothian Bus', icon: 'bus', costGBP: 2, timeMin: 40, health: 5 },
    { name: 'Walk to Uni', icon: 'walk', costGBP: 0, timeMin: 50, health: 9 },
  ],
}

describe('estimate from speech', () => {
  it('builds a decision from a good reply', () => {
    const d = sanitiseDecision(goodRaw, 'Uber to uni every morning')!
    expect(d.options).toHaveLength(3)
    expect(d.usualId).toBe('o1')
    expect(d.timesPerMonth).toBe(20)
    expect(d.blurb).toContain('Uber to uni')
    expect(d.id.startsWith('custom-commute-to-uni')).toBe(true)
  })
  it('clamps silly numbers instead of trusting them', () => {
    const d = sanitiseDecision({ ...goodRaw, timesPerMonth: 9999, options: goodRaw.options.map((o) => ({ ...o, costGBP: 1e9, timeMin: -5, health: 99 })) })!
    expect(d.timesPerMonth).toBe(60)
    expect(d.options[0].costGBP).toBe(1000)
    expect(d.options[0].timeMin).toBe(0)
    expect(d.options[0].health).toBe(10)
  })
  it('rejects shapes it cannot use', () => {
    expect(sanitiseDecision(null)).toBeNull()
    expect(sanitiseDecision({ ...goodRaw, options: goodRaw.options.slice(0, 2) })).toBeNull()
    expect(sanitiseDecision({ ...goodRaw, activity: '' })).toBeNull()
    expect(sanitiseDecision({ ...goodRaw, options: [{ name: 'x', icon: 'bus', costGBP: 'free', timeMin: 1, health: 5 }, ...goodRaw.options.slice(1)] })).toBeNull()
  })
  it('falls back to a sensible usual index and an icon from the name', () => {
    const d = sanitiseDecision({ ...goodRaw, usualIndex: 7, icon: 'nonsense', options: goodRaw.options.map((o) => ({ ...o, icon: 'nonsense' })) })!
    expect(d.usualId).toBe('o1')
    expect(d.options.map((o) => o.icon)).toEqual(['car', 'bus', 'walk'])
    expect(d.icon).toBe('car')
  })
  it('a registered custom decision can be found by id', () => {
    const d = sanitiseDecision(goodRaw)!
    registerDecision(d)
    expect(getDecision(d.id)).toBe(d)
    expect(() => getDecision('nope')).toThrow()
  })
  it('matches words to a preset, or to nothing', () => {
    expect(matchPreset('I get an Uber to uni every morning')?.id).toBe('commute')
    expect(matchPreset('Greggs for lunch most days')?.id).toBe('lunch')
    expect(matchPreset('my latte habit')?.id).toBe('coffee')
    expect(matchPreset('quantum chromodynamics')).toBeNull()
  })
  it('finds the biggest monthly saving against the usual', () => {
    const d = sanitiseDecision(goodRaw)!
    const s = bestSwitch(d)!
    expect(s.option.name).toBe('Walk to Uni')
    expect(s.monthlyGBP).toBe(250)
    expect(bestSwitch({ ...d, options: [d.options[2], d.options[1], d.options[0]] as typeof d.options, usualId: 'o3' })).toBeNull()
  })
})

describe('parsing the streamed reply', () => {
  const reply = '20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|45|5\nWalk|walk|0.00|35|9'
  it('reads a full reply', () => {
    const p = parseEstimate(reply)
    expect(p.timesPerMonth).toBe(20)
    expect(p.activity).toBe('Uber to Uni')
    expect(p.options).toHaveLength(3)
    expect(p.options[1]).toEqual({ name: 'Bus', icon: 'bus', costGBP: 1.7, timeMin: 45, health: 5 })
  })
  it('while streaming only finished lines count', () => {
    const p = parseEstimate('20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|4', false)
    expect(p.activity).toBe('Uber to Uni')
    expect(p.options).toHaveLength(1)
    // even at the end, a cut-off line without all three numbers is dropped
    expect(parseEstimate('20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|4', true).options).toHaveLength(1)
    expect(parseEstimate('20|Uber to Uni\nUber|car|12.00|25|2\nBus|bus|1.70|45|5', true).options).toHaveLength(2)
  })
  it('copes with bullets, units, a missing icon and a stray header line', () => {
    const p = parseEstimate('```\n1. 4|Dinner out\n- Pub meal | £16.50 | 60 min | 1.5 kg\n* Cook|cook|£3|40|0.7\nTakeaway|bag|11|30|2.6\n```')
    expect(p.timesPerMonth).toBe(4)
    expect(p.options.map((o) => [o.name, o.icon, o.costGBP])).toEqual([['Pub meal', 'plate', 16.5], ['Cook', 'cook', 3], ['Takeaway', 'bag', 11]])
  })
  it('turns a full reply into a usable decision', () => {
    const p = parseEstimate(reply)
    const d = sanitiseDecision({ activity: p.activity, icon: p.options[0].icon, timesPerMonth: p.timesPerMonth, usualIndex: 0, options: p.options })!
    expect(d.options[0].costGBP).toBe(12)
    expect(d.usualId).toBe('o1')
  })
  it('gives nothing for chatter', () => {
    expect(parseEstimate('Sure! Here are some options.').options).toHaveLength(0)
  })
})

describe('pixel art', () => {
  it('every sprite has one consistent size across its rows and frames, and only uses palette colours', () => {
    for (const name of ICON_NAMES) {
      const { w, h } = dims(name)
      expect(w, `${name} width`).toBeGreaterThanOrEqual(12)
      framesOf(name).forEach((rows, f) => {
        expect(rows, `${name} frame ${f} rows`).toHaveLength(h)
        rows.forEach((row, y) => {
          expect(row.length, `${name} frame ${f} row ${y}: "${row}"`).toBe(w)
          for (const ch of row) expect(ch === '.' || ch in PALETTE, `${name} uses unknown colour "${ch}"`).toBe(true)
        })
      })
    }
  })
  it('the detailed vehicles are bigger than the small icons', () => {
    expect(dims('bus').w).toBeGreaterThan(12)
    expect(dims('car').w).toBeGreaterThan(12)
    expect(naturalSize('bus')).toBe(2)
    expect(naturalSize('walk')).toBe(3)
    // wide icons are shown 1.5x the width of a small one at the same size; small ones are unchanged
    expect(artBox('walk', 3).w).toBe(36)
    expect(artBox('bus', 3).w).toBeCloseTo(54, 5)
    expect(artBox('bus', 2, true).w).toBe(72)
  })
  it('the walker has two frames', () => {
    expect(frameCount('walk')).toBe(2)
  })
  it('picks icons from words', () => {
    expect(iconForText('Walk to Uni')).toBe('walk')
    expect(iconForText('Lothian Bus')).toBe('bus')
    expect(iconForText('Uber')).toBe('car')
    expect(iconForText('Deliveroo')).toBe('bag')
    expect(iconForText('Greggs sausage roll')).toBe('sandwich')
    expect(iconForText('Home brew')).toBe('mug')
    expect(iconForText('quantum chromodynamics')).toBe('coin')
  })
})

describe('reading amounts aloud', () => {
  it('says pounds, pence, minutes and scores the way a person would', () => {
    expect(forSpeech('£7.50')).toBe('7 pounds 50')
    expect(forSpeech('£12')).toBe('12 pounds')
    expect(forSpeech('£1')).toBe('1 pound')
    expect(forSpeech('£0.40')).toBe('40 pence')
    expect(forSpeech('14 min faster')).toBe('14 minutes faster')
    expect(forSpeech('1 min')).toBe('1 minute')
    expect(forSpeech('1 h 20 min')).toBe('1 hour 20 minutes')
    expect(forSpeech('2 h')).toBe('2 hours')
    expect(forSpeech('8/10')).toBe('8 out of 10')
  })
  it('reads a whole suggestion sentence', () => {
    expect(forSpeech('Walk is £1.85 less, 10 min faster and 5 points healthier than Bus.')).toBe(
      'Walk is 1 pound 85 less, 10 minutes faster and 5 points healthier than Bus.',
    )
  })
})

describe('recap', () => {
  const now = Date.UTC(2026, 10, 8)
  const rec = (over: Partial<ChoiceRecord> = {}): ChoiceRecord => ({
    decisionId: 'commute', optionId: 'walk', priority: 'money', guessErr: 0.1, savedGBP: 1.8, minutesSaved: -12, verdict: null, at: now - 2 * 86_400_000, ...over,
  })

  it('pairs records with options and works out health against the usual', () => {
    const e = resolveHistory([rec(), rec({ optionId: 'uber' }), rec({ decisionId: 'ghost' })])
    expect(e).toHaveLength(2) // the unknown decision is skipped
    expect(e[0].chosen.id).toBe('walk')
    expect(e[0].usual.id).toBe('bus')
    expect(e[0].healthDelta).toBe(9 - 5)
    expect(e[1].healthDelta).toBe(2 - 5)
  })
  it('adds up money, time and health', () => {
    const h = [rec(), rec({ savedGBP: -5.6, minutesSaved: 14, optionId: 'uber' })]
    const t = totals(h, resolveHistory(h))
    expect(t.savedGBP).toBeCloseTo(-3.8, 5)
    expect(t.minutes).toBe(2)
    expect(t.health).toBe(4 - 3)
    expect(t.choices).toBe(2)
  })
  it('names a personality from what you put first', () => {
    expect(personality([])).toBeNull()
    expect(personality([rec(), rec(), rec({ priority: 'time' })])?.title).toBe('The Penny Pincher')
    expect(personality([rec({ priority: 'health' }), rec({ priority: 'health' })])?.title).toBe('The Health Kicker')
    expect(personality([rec({ priority: 'time' }), rec({ priority: 'money' })])?.title).toBe('The Balancer') // a tie
  })
  it('says when something happened', () => {
    expect(ago(now, now)).toBe('today')
    expect(ago(now - 86_400_000, now)).toBe('yesterday')
    expect(ago(now - 5 * 86_400_000, now)).toBe('5 days ago')
    expect(ago(now - 15 * 86_400_000, now)).toBe('2 weeks ago')
  })
  it('writes the share text', () => {
    const text = wrappedText('Trade-Off Check', personality([rec()]), { savedGBP: 12.5, minutes: -30, health: 6, choices: 3 })
    expect(text).toContain('The Penny Pincher')
    expect(text).toContain('saved £12.50')
    expect(text).toContain('30 min extra')
    expect(text).toContain('+6 health points')
  })
})

describe('time wording, days and one-off purchases', () => {
  it('says saved or extra, never a minus', () => {
    expect(timeSavedText(12)).toBe('12 min saved')
    expect(timeSavedText(-12)).toBe('12 min extra')
    expect(timeSavedText(0)).toBe('0 min saved')
    expect(timeSavedText(-95)).toBe('1 h 35 min extra')
    expect(timeSavedText(-95)).not.toContain('-')
  })
  it('shows long waits in days', () => {
    expect(mins(30)).toBe('30 min')
    expect(mins(120)).toBe('2 h')
    expect(mins(1440)).toBe('1 day')
    expect(mins(4320)).toBe('3 days')
    expect(mins(2160)).toBe('1.5 days')
  })

  const habit = DECISIONS.find((x) => x.id === 'commute')! // 20 times a month
  const oneOff = sanitiseDecision({
    activity: 'Games console', icon: 'plate', timesPerMonth: 0, usualIndex: 0,
    options: [
      { name: 'New PS5', icon: 'parcel', costGBP: 450, timeMin: 1440, health: 4 },
      { name: 'Used console', icon: 'store', costGBP: 200, timeMin: 4320, health: 4 },
      { name: 'Switch lite', icon: 'parcel', costGBP: 180, timeMin: 2880, health: 5 },
    ],
  })!

  it('knows a one-off from a habit', () => {
    expect(isOneOff(habit)).toBe(false)
    expect(isOneOff(oneOff)).toBe(true)
    expect(oneOff.timesPerMonth).toBe(0)
    expect(perMonth(habit)).toBe(' a month')
    expect(perMonth(oneOff)).toBe('')
  })
  it('a one-off costs its price once, a habit costs per month', () => {
    expect(monthlyCost(oneOff.options[0], oneOff)).toBe(450)
    expect(monthlyCost(habit.options[0], habit)).toBeCloseTo(1.8 * 20, 5)
  })
  it('credits a week of a habit but the whole difference of a one-off', () => {
    expect(usesPerWeek(habit)).toBeCloseTo((20 * 12) / 52, 5)
    expect(creditFor(habit, 5.6)).toBeCloseTo(5.6 * ((20 * 12) / 52), 5)
    expect(usesPerWeek(oneOff)).toBe(1)
    expect(creditFor(oneOff, 250)).toBe(250)
    expect(creditBasis(oneOff, 'Used console')).toBe('once')
    expect(creditBasis(habit, 'Walk')).toBe('over a week of Walk')
  })
  it('a weekly credit is a visible amount of money', () => {
    // walk instead of Uber: £7.40 a use, about 4.6 uses a week
    expect(creditFor(habit, 7.4)).toBeGreaterThan(30)
  })
  it('finds the saving on a one-off as a single difference', () => {
    const s = bestSwitch(oneOff)!
    expect(s.option.name).toBe('Switch lite')
    expect(s.monthlyGBP).toBe(270)
  })
  it('reads a one-off header from Qwen', () => {
    const p = parseEstimate('0|Games console\nNew PS5|parcel|450|1440|4\nUsed console|store|200|4320|4\nSwitch lite|parcel|180|2880|5')
    expect(p.timesPerMonth).toBe(0)
    expect(parseEstimate('once|Games console\nA|parcel|1|1|1').timesPerMonth).toBe(0)
    expect(parseEstimate('one-off|Laptop\nA|parcel|1|1|1').timesPerMonth).toBe(0)
    const d = sanitiseDecision({ activity: p.activity, icon: p.options[0].icon, timesPerMonth: p.timesPerMonth, usualIndex: 0, options: p.options })!
    expect(isOneOff(d)).toBe(true)
    expect(d.options[1].timeMin).toBe(4320) // days are no longer clamped away
  })
  it('the logo is a sprite but never something Qwen can choose', () => {
    expect(CHOOSABLE).not.toContain('logo')
    expect(gbp(450)).toBe('£450')
  })
})

describe('several habits in one sentence', () => {
  const two =
    '20|Going on walks\nWalk in Edinburgh|walk|0|45|9\nBus to park|bus|2|30|7\nCar to park|car|5|20|4\n\n' +
    '4|Clearance food shopping\nClearance haul|cart|15|60|6\nFull price shop|store|30|60|6\nCook from pantry|home|0|45|8'

  it('splits a reply into one group per habit', () => {
    const g = parseGroups(two)
    expect(g).toHaveLength(2)
    expect(g[0].activity).toBe('Going on walks')
    expect(g[0].timesPerMonth).toBe(20)
    expect(g[0].options.map((o) => o.name)).toEqual(['Walk in Edinburgh', 'Bus to park', 'Car to park'])
    expect(g[1].activity).toBe('Clearance food shopping')
    expect(g[1].timesPerMonth).toBe(4) // "only when it's on clearance" happens less often
    expect(g[1].options[0].icon).toBe('cart')
  })
  it('turns each group into its own decision with its own frequency', () => {
    const decisions = parseGroups(two).map((p) => sanitiseDecision({ activity: p.activity, icon: p.options[0].icon, timesPerMonth: p.timesPerMonth, usualIndex: 0, options: p.options }, 'x'))
    expect(decisions.every((d) => d !== null)).toBe(true)
    expect(decisions.map((d) => d!.timesPerMonth)).toEqual([20, 4])
    expect(new Set(decisions.map((d) => d!.id)).size).toBe(2) // different ids
  })
  it('a mix of habits and a one-off keeps the one-off marked', () => {
    const g = parseGroups(two + '\n\n0|Buying a laptop\nNew laptop|parcel|800|4320|1\nRefurbished|parcel|450|1440|1\nLibrary loan|book|0|10|1')
    expect(g).toHaveLength(3)
    expect(g[2].timesPerMonth).toBe(0)
  })
  it('never makes more than three groups', () => {
    const block = (n: number) => `${n}|Thing ${n}\nA|bus|1|1|1\nB|walk|2|2|2\nC|car|3|3|3`
    expect(parseGroups([1, 2, 3, 4, 5].map(block).join('\n\n'))).toHaveLength(3)
  })
  it('while streaming a half-finished second group only shows what has finished', () => {
    const streaming = two.slice(0, two.indexOf('Full price shop') + 10)
    const g = parseGroups(streaming, false)
    expect(g).toHaveLength(2)
    expect(g[1].options).toHaveLength(1) // only "Clearance haul" is a complete line
  })
  it('ignores a cut-off line instead of starting a bogus group', () => {
    const g = parseGroups('20|Walks\nWalk|walk|0|45|9\nBus|bus|2', true)
    expect(g).toHaveLength(1)
    expect(g[0].options).toHaveLength(1)
  })
  it('options with no header still make a group, and nonsense makes none', () => {
    expect(parseGroups('Walk|walk|0|45|9\nBus|bus|2|30|7')).toHaveLength(1)
    expect(parseGroups('Sure! Here you go.')).toHaveLength(0)
  })
  it('parseEstimate still reads the first block', () => {
    expect(parseEstimate(two).activity).toBe('Going on walks')
  })
})

describe('sound', () => {
  it('has a sparkle for good news and plays whatever the motion setting', async () => {
    const { play } = await import('./sound')
    // no AudioContext in node: it must simply do nothing, never throw
    expect(() => play('sparkle')).not.toThrow()
    expect(() => play('magic')).not.toThrow()
  })
})
