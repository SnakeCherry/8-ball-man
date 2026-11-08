import { streamChat } from './llm'
import type { Decision, Option } from './types'

/**
 * "Useful info" for each option: a real website, three recipes, a route, where to shop, or a tip.
 * Qwen only says WHAT to look up (a brand name, recipe names, a journey); it never writes a link.
 * Every link is built here, from search pages and brand sites on a fixed list of real hosts.
 */

export type InfoKind = 'site' | 'recipes' | 'transit' | 'shop' | 'tip'
const KINDS: InfoKind[] = ['site', 'recipes', 'transit', 'shop', 'tip']

export interface InfoLink {
  title: string
  url: string
}
export interface OptionInfo {
  optionId: string
  kind: InfoKind
  /** "Lidl website", "3 cheap recipes" */
  label: string
  links: InfoLink[]
  /** for kind 'tip' */
  tip?: string
}

/** Brand sites we know. The first match in the text wins. */
const BRANDS: [RegExp, string, string][] = [
  [/\blidl\b/i, 'Lidl', 'https://www.lidl.co.uk/'],
  [/\baldi\b/i, 'Aldi', 'https://www.aldi.co.uk/'],
  [/\btesco\b/i, 'Tesco', 'https://www.tesco.com/'],
  [/\bsainsbury/i, "Sainsbury's", 'https://www.sainsburys.co.uk/'],
  [/\basda\b/i, 'Asda', 'https://www.asda.com/'],
  [/\bmorrisons\b/i, 'Morrisons', 'https://www.morrisons.com/'],
  [/\bwaitrose\b/i, 'Waitrose', 'https://www.waitrose.com/'],
  [/\bco-?op\b/i, 'Co-op', 'https://www.coop.co.uk/'],
  [/\bmarks (and|&) spencer|\bm&s\b/i, 'M&S', 'https://www.marksandspencer.com/'],
  [/\bgreggs\b/i, 'Greggs', 'https://www.greggs.co.uk/'],
  [/\bpret\b/i, 'Pret', 'https://www.pret.co.uk/'],
  [/\bcosta\b/i, 'Costa', 'https://www.costa.co.uk/'],
  [/\bstarbucks\b/i, 'Starbucks', 'https://www.starbucks.co.uk/'],
  [/\bdeliveroo\b/i, 'Deliveroo', 'https://deliveroo.co.uk/'],
  [/\bjust ?eat\b/i, 'Just Eat', 'https://www.just-eat.co.uk/'],
  [/\buber ?eats\b/i, 'Uber Eats', 'https://www.ubereats.com/gb'],
  [/\buber\b/i, 'Uber', 'https://www.uber.com/gb/en/'],
  [/\bbolt\b/i, 'Bolt', 'https://bolt.eu/en-gb/'],
  [/\blothian\b|\bnight ?bus\b/i, 'Lothian Buses', 'https://www.lothianbuses.com/'],
  [/\btram\b/i, 'Edinburgh Trams', 'https://edinburghtrams.com/'],
  [/\bscotrail\b/i, 'ScotRail', 'https://www.scotrail.co.uk/'],
  [/\blner\b/i, 'LNER', 'https://www.lner.co.uk/'],
  [/\bmegabus\b/i, 'Megabus', 'https://uk.megabus.com/'],
  [/\bnational express\b/i, 'National Express', 'https://www.nationalexpress.com/'],
  [/\bargos\b/i, 'Argos', 'https://www.argos.co.uk/'],
  [/\bcurrys\b/i, 'Currys', 'https://www.currys.co.uk/'],
  [/\bamazon\b/i, 'Amazon', 'https://www.amazon.co.uk/'],
  [/\bebay\b/i, 'eBay', 'https://www.ebay.co.uk/'],
  [/\bcex\b/i, 'CeX', 'https://uk.webuy.com/'],
  [/\bgumtree\b/i, 'Gumtree', 'https://www.gumtree.com/'],
  [/\bvinted\b/i, 'Vinted', 'https://www.vinted.co.uk/'],
  [/\btoo good to go\b/i, 'Too Good To Go', 'https://www.toogoodtogo.com/en-gb'],
  [/\biceland\b/i, 'Iceland', 'https://www.iceland.co.uk/'],
  [/\bfacebook marketplace\b|\bmarketplace\b/i, 'Facebook Marketplace', 'https://www.facebook.com/marketplace/'],
  [/\bnintendo\b|\bswitch\b/i, 'Nintendo', 'https://www.nintendo.com/en-gb/'],
  [/\bplaystation\b|\bps5\b/i, 'PlayStation', 'https://www.playstation.com/en-gb/'],
]

/** The only hosts we ever link to. */
const ALLOWED_HOSTS = new Set<string>([
  ...BRANDS.map(([, , url]) => new URL(url).hostname),
  'www.bbcgoodfood.com',
  'www.google.com',
  'duckduckgo.com',
])

/** True for an https link to a host on the list. Anything else is never shown. */
export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && ALLOWED_HOSTS.has(u.hostname)
  } catch {
    return false
  }
}

const enc = encodeURIComponent
export const brandFor = (text: string): { name: string; url: string } | null => {
  const hit = BRANDS.find(([re]) => re.test(text))
  return hit ? { name: hit[1], url: hit[2] } : null
}

const search = (q: string): InfoLink => ({ title: `Search: ${q}`, url: `https://duckduckgo.com/?q=${enc(`${q} UK`)}` })
const recipe = (q: string): InfoLink => ({ title: q, url: `https://www.bbcgoodfood.com/search?q=${enc(q)}` })
const route = (q: string, optionName = ''): InfoLink => {
  const how = `${q} ${optionName}`
  const mode = /\bwalk/i.test(how) ? 'walking' : /\b(cycl|bike)/i.test(how) ? 'bicycling' : 'transit'
  return { title: `Directions: ${q}`, url: `https://www.google.com/maps/dir/?api=1&destination=${enc(q)}&travelmode=${mode}` }
}

/** Turn "what to look up" into real links. Nothing the model wrote is ever used as a host. */
export function buildLinks(kind: InfoKind, queries: string[], optionName: string): InfoLink[] {
  const qs = queries.map((q) => q.trim()).filter(Boolean)
  const first = qs[0] ?? optionName
  let links: InfoLink[] = []
  if (kind === 'site') {
    // a link for every known brand it names (up to three), otherwise the option's own brand, otherwise a search
    const named = qs.flatMap((q) => {
      const b = brandFor(q)
      return b ? [{ title: `${b.name} website`, url: b.url }] : []
    })
    const own = brandFor(optionName)
    links = named.length ? named : own ? [{ title: `${own.name} website`, url: own.url }] : [search(`${first} official site`)]
    links = links.filter((l, i) => links.findIndex((x) => x.url === l.url) === i)
  } else if (kind === 'recipes') {
    links = (qs.length ? qs : [`${optionName} recipe`]).slice(0, 3).map(recipe)
  } else if (kind === 'transit') {
    const b = brandFor(`${first} ${optionName}`)
    links = [route(first, optionName), ...(b ? [{ title: `${b.name} website`, url: b.url }] : [])]
  } else if (kind === 'shop') {
    links = [
      { title: 'Argos', url: `https://www.argos.co.uk/search/${enc(first)}/` },
      { title: 'Currys', url: `https://www.currys.co.uk/search?q=${enc(first)}` },
      { title: 'eBay (used)', url: `https://www.ebay.co.uk/sch/i.html?_nkw=${enc(first)}` },
    ]
  }
  return links.filter((l) => isSafeUrl(l.url)).slice(0, 3)
}

/** What we show when Qwen is not available or skipped an option, chosen from the option's icon. */
export function defaultInfo(option: Option): OptionInfo {
  const make = (kind: InfoKind, label: string, queries: string[], tip?: string): OptionInfo => ({
    optionId: option.id,
    kind,
    label,
    links: buildLinks(kind, queries, option.name),
    tip,
  })
  switch (option.icon) {
    case 'cook':
      return make('recipes', '3 cheap recipes', [`cheap student ${option.name}`, 'easy one pan dinner', 'budget batch cooking'])
    case 'lunchbox':
    case 'sandwich':
      return make('recipes', 'Packed lunch ideas', ['packed lunch ideas', 'easy lunchbox sandwiches', 'student lunch prep'])
    case 'bus':
    case 'tram':
    case 'train':
    case 'plane':
    case 'walk':
    case 'bike':
      return make('transit', 'Plan the journey', [option.name])
    case 'coffee':
    case 'mug':
      return make('tip', 'A tip', [], 'Bring your own cup. Many cafes knock something off a refill.')
    default:
      return make('site', brandFor(option.name) ? `${brandFor(option.name)!.name} website` : 'Look it up', [option.name])
  }
}

interface RawInfo {
  name: string
  kind: InfoKind
  label: string
  queries: string[]
}

const DEFAULT_LABEL: Record<InfoKind, string> = {
  site: 'Look it up',
  recipes: '3 cheap recipes',
  transit: 'Plan the journey',
  shop: 'Where to look',
  tip: 'A tip',
}

/**
 * Read `option name|kind|label|query1;query2;query3` lines (a line missing its label is fine too). While streaming
 * only finished lines count.
 */
export function parseInfo(text: string, final = true): RawInfo[] {
  const raw = text.split('\n')
  const strip = (l: string) => l.replace(/^[\s`>*-]+/, '').replace(/^\d+[.)]\s+/, '').trim()
  const out: RawInfo[] = []
  for (const line of (final ? raw : raw.slice(0, -1)).map(strip)) {
    const parts = line.split('|').map((x) => x.trim())
    const kind = parts[1]?.toLowerCase() as InfoKind
    if (parts.length < 3 || !KINDS.includes(kind)) continue
    const withLabel = parts.length >= 4
    const queries = (withLabel ? parts[3] : parts[2]).split(';').map((q) => q.trim()).filter(Boolean).slice(0, 3)
    out.push({ name: parts[0], kind, label: withLabel ? parts[2].slice(0, 40) : '', queries })
  }
  return out
}

/** A label for a line that came without one: the brand's name for a site, otherwise a plain word for the kind. */
function labelFor(r: RawInfo, option: Option): string {
  if (r.kind === 'site') {
    const b = brandFor(`${r.queries[0] ?? ''} ${option.name}`)
    return b ? `${b.name} website` : DEFAULT_LABEL.site
  }
  return DEFAULT_LABEL[r.kind]
}

/** Match the lines to the options (by name, then by position); anything missing gets the default. */
export function toOptionInfos(raws: RawInfo[], decision: Decision): OptionInfo[] {
  return decision.options.map((option, i) => {
    const r =
      raws.find((x) => x.name.toLowerCase() === option.name.toLowerCase()) ??
      raws.find((x) => option.name.toLowerCase().includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(option.name.toLowerCase())) ??
      raws[i]
    if (!r) return defaultInfo(option)
    return {
      optionId: option.id,
      kind: r.kind,
      label: r.label || labelFor(r, option),
      links: buildLinks(r.kind, r.queries, option.name),
      tip: r.kind === 'tip' ? r.queries[0] : undefined,
    }
  })
}

const SYSTEM = `You give practical extra info for a UK student in Edinburgh comparing options. For EACH option listed, reply with exactly one line of four fields separated by |
option name|kind|label|query1;query2;query3
kind is one of:
- site: a shop, brand or service. query1 is its name (Lidl, Tesco, Lothian Buses, Uber, Too Good To Go).
- recipes: the three queries are three specific cheap student recipe names.
- transit: walking, cycling or a journey. query1 is a route such as "Bruntsfield to George Square".
- shop: a product to buy (a console, a laptop). query1 is the product.
- tip: one short, specific, practical tip, written in query1.
label is 2 to 4 words describing the link, like "Lidl website" or "3 cheap recipes".
Use site for supermarkets, buses, taxis and delivery apps. Use recipes for cooking. Use transit for walking and cycling.
Never write a URL. Reply with nothing else.
Example line: Cook at home|recipes|3 cheap recipes|Veg chilli;One pan pasta;Egg fried rice`

const cache = new Map<string, OptionInfo[]>()

/** Ask Qwen what to look up for each option. `onPartial` fires as lines arrive. Falls back to defaults on any failure. */
export async function fetchInfo(decision: Decision, onPartial?: (infos: OptionInfo[]) => void): Promise<OptionInfo[]> {
  const hit = cache.get(decision.id)
  if (hit) return hit
  const defaults = decision.options.map(defaultInfo)
  onPartial?.(defaults)
  try {
    const text = await streamChat(SYSTEM, `Decision: ${decision.title}. Options: ${decision.options.map((o) => o.name).join('; ')}`, {
      maxTokens: 260,
      onText: (t) => onPartial?.(toOptionInfos(parseInfo(t, false), decision)),
    })
    const infos = toOptionInfos(parseInfo(text, true), decision)
    cache.set(decision.id, infos)
    return infos
  } catch {
    return defaults
  }
}

