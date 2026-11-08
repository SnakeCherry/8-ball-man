import { describe, expect, it } from 'vitest'
import { DECISIONS, getDecision } from '../data/decisions'
import { allowedNumbers, buildFacts, factsText, plainAdvice, validateAdvice } from './advice'
import { sanitiseDecision } from './estimate'
import { brandFor, buildLinks, defaultInfo, isSafeUrl, parseInfo, toOptionInfos } from './info'
import { valuesToWeights } from './mix'
import { nextInQueue } from './queue'
import { migrateState, useAppStore } from '../store/useAppStore'
import { EVEN_MIX, EVEN_WEIGHTS } from './mix'
import { suggestWith } from './suggest'

const commute = DECISIONS.find((d) => d.id === 'commute')!
const money = valuesToWeights({ cost: 10, time: 0, health: 0 })

describe('useful info links', () => {
  it('only ever produces https links to listed hosts', () => {
    expect(isSafeUrl('https://www.lidl.co.uk/')).toBe(true)
    expect(isSafeUrl('https://www.bbcgoodfood.com/search?q=pasta')).toBe(true)
    expect(isSafeUrl('http://www.lidl.co.uk/')).toBe(false) // not https
    expect(isSafeUrl('https://evil.example.com/lidl')).toBe(false)
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('not a url')).toBe(false)
  })
  it('a brand gets its own website', () => {
    expect(brandFor('Lidl meal deal')?.url).toBe('https://www.lidl.co.uk/')
    expect(buildLinks('site', ['Lidl'], 'Lidl')[0]).toEqual({ title: 'Lidl website', url: 'https://www.lidl.co.uk/' })
    expect(buildLinks('transit', ['Bruntsfield to George Square'], 'Lothian Bus').map((l) => l.title)).toEqual(['Directions: Bruntsfield to George Square', 'Lothian Buses website'])
  })
  it('a site line links every known brand it names', () => {
    const links = buildLinks('site', ['Too Good To Go', 'Lidl', 'Iceland', 'Made Up Shop'], 'Clearance haul')
    expect(links.map((l) => l.title)).toEqual(['Too Good To Go website', 'Lidl website', 'Iceland website'])
    // no brand named: the option's own name, then a search
    expect(buildLinks('site', ['the shop'], 'Tesco Express')[0].title).toBe('Tesco website')
  })
  it('three recipe names become three recipe searches', () => {
    const links = buildLinks('recipes', ['one pan pasta', 'veg chilli', 'egg fried rice', 'a fourth'], 'Cook from scratch')
    expect(links).toHaveLength(3)
    expect(links.every((l) => l.url.startsWith('https://www.bbcgoodfood.com/search?q='))).toBe(true)
    expect(links[0].url).toContain('one%20pan%20pasta')
  })
  it('an unknown name falls back to a web search, never to a made-up host', () => {
    const [l] = buildLinks('site', ['Tiny Corner Shop'], 'Tiny Corner Shop')
    expect(l.url.startsWith('https://duckduckgo.com/?q=')).toBe(true)
    expect(isSafeUrl(l.url)).toBe(true)
  })
  it('text from the model cannot become a link host', () => {
    const links = buildLinks('site', ['https://evil.example.com/steal'], 'Shop')
    expect(links.every((l) => isSafeUrl(l.url))).toBe(true)
    expect(links.some((l) => l.url.includes('evil.example.com/steal') && !l.url.startsWith('https://duckduckgo.com/'))).toBe(false)
  })
  it('shopping gives three real shops to search', () => {
    expect(buildLinks('shop', ['games console'], 'Used console').map((l) => new URL(l.url).hostname)).toEqual(['www.argos.co.uk', 'www.currys.co.uk', 'www.ebay.co.uk'])
  })
  it('reads the model lines and matches them to options', () => {
    const raws = parseInfo('Bus|transit|Bus route|Bruntsfield to George Square\nWalk|transit|Walk it|Bruntsfield to George Square\nUber|site|Uber website|Uber\nnot a line')
    expect(raws).toHaveLength(3)
    const infos = toOptionInfos(raws, commute)
    expect(infos.map((i) => i.optionId)).toEqual(commute.options.map((o) => o.id))
    expect(infos[0].links.length).toBeGreaterThan(0)
    expect(infos[2].links[0].url).toContain('travelmode=walking') // options are Bus, Uber, Walk
  })
  it('accepts a line that came without its label', () => {
    const raws = parseInfo('Cook from pantry|recipes|Pantry pasta bake;Tinned tomato soup;Egg fried rice\nFull price shop|site|Tesco;Aldi')
    expect(raws).toHaveLength(2)
    expect(raws[0].queries).toEqual(['Pantry pasta bake', 'Tinned tomato soup', 'Egg fried rice'])
    const infos = toOptionInfos(raws, { ...commute, options: [{ id: 'a', name: 'Cook from pantry', icon: 'cook', costGBP: 0, timeMin: 30, health: 8 }, { id: 'b', name: 'Full price shop', icon: 'cart', costGBP: 25, timeMin: 45, health: 6 }, commute.options[2]] })
    expect(infos[0].label).toBe('3 cheap recipes')
    expect(infos[0].links).toHaveLength(3)
    expect(infos[1].label).toBe('Tesco website') // a known brand gets its own label
  })
  it('missing lines and broken kinds fall back to a sensible default', () => {
    const infos = toOptionInfos(parseInfo('Bus|banana|x|y'), commute)
    expect(infos).toHaveLength(3)
    infos.forEach((i) => expect(i.links.length + (i.tip ? 1 : 0)).toBeGreaterThan(0))
    expect(defaultInfo({ id: 'c', name: 'Cook from scratch', icon: 'cook', costGBP: 2, timeMin: 30, health: 8 }).links).toHaveLength(3)
  })
})

describe('advice in plain English', () => {
  const facts = buildFacts(commute, money)
  it('builds the facts and picks the best fit for what the person weighted', () => {
    expect(facts.best.id).toBe('walk')
    expect(facts.priority).toBe('money')
    expect(factsText(facts)).toContain('puts money first')
    expect(factsText(facts)).toContain('Best fit: Walk')
  })
  it('allows the options own numbers and the gaps between them', () => {
    const ok = allowedNumbers(facts)
    expect(ok.gbp).toContain(7.4)
    expect(ok.gbp.some((n) => Math.abs(n - 5.6) < 0.001)).toBe(true) // uber minus bus
    expect(ok.minutes).toContain(12) // bus minus walk
    expect(ok.health).toContain(9)
    expect(ok.healthGaps).toContain(3) // a gap, not a score
    expect(ok.health).not.toContain(3)
  })
  it('accepts a sentence whose numbers all check out', () => {
    expect(validateAdvice('Walk fits best because you put money first: it is free, takes 40 minutes and scores 9 out of 10 for health. Taxi would be 26 minutes quicker.', facts)).toBe(true)
    expect(validateAdvice('Walk is £1.80 cheaper than the bus and 4 points healthier.', facts)).toBe(true)
  })
  it('rejects invented numbers, a missing best option and nonsense lengths', () => {
    expect(validateAdvice('Walk saves you £99 every time.', facts)).toBe(false)
    expect(validateAdvice('Walk takes 3 minutes door to door, which is brilliant for you.', facts)).toBe(false)
    expect(validateAdvice('Walk scores 3 out of 10 for health, which is not great for you.', facts)).toBe(false)
    expect(validateAdvice('The bus is a fine choice for most days of the week.', facts)).toBe(false) // never says Walk
    expect(validateAdvice('Walk.', facts)).toBe(false)
  })
  it('writes a plain template from the facts alone', () => {
    const text = plainAdvice(facts)
    expect(text).toContain('Walk fits best because you put money first')
    expect(text).toContain('free')
    expect(text).toMatch(/of life each time compared with/)
    expect(text).toContain('The catch:')
    expect(validateAdvice(text, facts)).toBe(true) // the fallback always passes its own check
  })
  it('says "a bit of everything" for a balanced mix and "arrives in" for one-offs', () => {
    expect(plainAdvice(buildFacts(commute, valuesToWeights({ cost: 5, time: 5, health: 5 })))).toContain('all-round')
    const oneOff = sanitiseDecision({
      activity: 'Console', icon: 'plate', timesPerMonth: 0, usualIndex: 0,
      options: [
        { name: 'New PS5', icon: 'parcel', costGBP: 450, timeMin: 1440, health: 4 },
        { name: 'Used console', icon: 'store', costGBP: 200, timeMin: 4320, health: 4 },
        { name: 'Switch lite', icon: 'parcel', costGBP: 180, timeMin: 2880, health: 5 },
      ],
    })!
    const text = plainAdvice(buildFacts(oneOff, money))
    expect(text).toContain('arrives in')
    expect(text).not.toContain('a time')
    expect(validateAdvice(text, buildFacts(oneOff, money))).toBe(true)
  })
})

describe('chaining habits', () => {
  it('knows what comes next', () => {
    expect(nextInQueue(['a', 'b'])).toEqual({ next: 'a', rest: ['b'] })
    expect(nextInQueue([])).toEqual({ next: null, rest: [] })
  })

  const make = (title: string, perMonth: number) =>
    sanitiseDecision({
      activity: title, icon: 'bus', timesPerMonth: perMonth, usualIndex: 0,
      options: [
        { name: 'Usual', icon: 'car', costGBP: 10, timeMin: 20, health: 3 },
        { name: 'Cheaper', icon: 'bus', costGBP: 2, timeMin: 30, health: 6 },
        { name: 'Free', icon: 'walk', costGBP: 0, timeMin: 50, health: 9 },
      ],
    })!

  it('goes through two habits and then lands on the summary', () => {
    const [a, b] = [make('First habit', 20), make('Second habit', 4)]
    const s = useAppStore
    s.getState().loadDemo()
    s.getState().startQueue([a, b])
    expect(s.getState()).toMatchObject({ decisionId: a.id, queue: [b.id], session: [], screen: 'reveal', guess: null })

    s.getState().commitChoice(a.options[1].id)
    expect(s.getState()).toMatchObject({ decisionId: b.id, queue: [], screen: 'reveal' })
    expect(s.getState().session).toHaveLength(1)

    s.getState().commitChoice(b.options[2].id)
    const end = s.getState()
    expect(end.screen).toBe('result')
    expect(end.session.map((r) => r.decisionId)).toEqual([a.id, b.id])
    // a habit counts a week of itself: 8 saved per use x 20 a month x 12 / 52
    expect(end.session[0].deltaGBP).toBeCloseTo(8 * ((20 * 12) / 52), 1)
    expect(end.session[0].healthDelta).toBe(3)
    expect(end.session[1].basis).toContain('week')
  })
  it('starting a single habit clears any chain', () => {
    const s = useAppStore
    s.getState().startQueue([make('One', 20), make('Two', 4)])
    s.getState().startCustom(make('Solo', 20))
    expect(s.getState()).toMatchObject({ queue: [], session: [] })
  })
  it('the saved goal from an older version is dropped on upgrade', () => {
    const old = migrateState({ onboarded: true, goal: { name: 'Festival', target: 120, saved: 30 }, history: [], vibeHistory: [], badges: [], priority: 'health' }, 5)
    expect('goal' in old).toBe(false)
    expect(old.onboarded).toBe(true)
    expect(getDecision('commute').id).toBe('commute')
  })
})

describe('sliders start in the middle', () => {
  it('every slider starts at the same middle value, and that is an even split', () => {
    expect(EVEN_MIX).toEqual({ cost: 5, time: 5, health: 5 })
    const w = valuesToWeights(EVEN_MIX)
    expect(w.cost).toBeCloseTo(w.time, 10)
    expect(w.time).toBeCloseTo(w.health, 10)
    expect(EVEN_WEIGHTS).toEqual(w)
  })
  it('until the student moves a slider our suggestion counts everything equally', () => {
    const s = suggestWith(commute, null)
    expect(s.weights).toEqual(EVEN_WEIGHTS)
    expect(s.suggested.id).toBe(suggestWith(commute, EVEN_WEIGHTS).suggested.id)
    // moving a slider does change it
    expect(suggestWith(commute, valuesToWeights({ cost: 10, time: 0, health: 0 })).suggested.id).toBe('walk')
    expect(suggestWith(commute, valuesToWeights({ cost: 0, time: 10, health: 0 })).suggested.id).toBe('uber')
  })
})

describe('easy rank', () => {
  it('turns an order into slider values, most important highest', async () => {
    const { rankToMix } = await import('./mix')
    expect(rankToMix(['health', 'cost', 'time'])).toEqual({ health: 9, cost: 5, time: 2 })
    expect(rankToMix(['time', 'health', 'cost'])).toEqual({ time: 9, health: 5, cost: 2 })
  })
  it('a partial order shares the remaining places out evenly', async () => {
    const { rankToMix } = await import('./mix')
    const m = rankToMix(['cost'])
    expect(m.cost).toBe(9)
    expect(m.time).toBe(m.health)
    expect(m.time).toBeLessThan(9)
  })
})
