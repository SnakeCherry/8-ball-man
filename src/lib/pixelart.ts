/**
 * Pixel art for options, decisions and goals: 12x12 grids, a handful of colours, drawn by hand.
 * One character per pixel; '.' is see-through. Things that move are drawn facing RIGHT, the way they travel.
 */

/** Small icons are 12 pixels wide; the detailed vehicles are wider. */
export const SIZE = 12

export const PALETTE: Record<string, string> = {
  k: '#0a0a0a', // ink outline
  w: '#ffffff',
  g: '#16b77d', // jade
  l: '#6ef07f', // lime
  y: '#ffd54a',
  o: '#ff9f43',
  r: '#ff6b6b',
  b: '#5aa9ff',
  c: '#cdeeff', // light blue (windows, water)
  n: '#a8703a', // brown
  e: '#9aa0a6', // grey
  m: '#dcdcdc', // light grey
  p: '#ff8fc7',
  s: '#f5c9a0', // skin
  d: '#5b3a1e', // dark brown (hair)
  h: '#0a0a0a', // black hair
  S: '#8d5524', // brown skin
  t: '#1b1b1b', // black trousers
  // richer tones for the detailed vehicles
  K: '#05050d', // near-black outline
  A: '#2c2c2c', // charcoal
  X: '#454b54', // slate
  V: '#8c8cae', // lavender highlight
  R: '#cc0000', // red
  D: '#a00000', // dark red
  F: '#d03030', // light red
  L: '#ff2a2a', // tail light
  H: '#d8e8f0', // headlight
  Q: '#58504c', // tyre
  W: '#e0c8d8', // rim
  Y: '#ffb400', // school-bus yellow
  U: '#ffd24c', // light yellow
  O: '#ff8a00', // orange
  T: '#f06a00', // dark orange
  B: '#1478e6', // window blue
  C: '#10b4ff', // window sky
  Z: '#4a4a4a', // dark grey
  G: '#7a7a7a', // grey
  M: '#c8c8c8', // light grey
  z: '#d9d9d9', // roof vent
  u: '#fff3b0', // lamp
}

type Frames = readonly (readonly string[])[]

const ART_DATA = {
  // ---- a person walking, facing right: two frames ----
  walk: [
    [
      '............',
      '...hhhhhh...',
      '...hSSSkS...',
      '...hSSSSS...',
      '....SSSS....',
      '....pppp....',
      '..SppppppS..',
      '....pppp....',
      '....tttt....',
      '...tt..tt...',
      '..tt....tt..',
      '..ww....www.',
    ],
    [
      '............',
      '...hhhhhh...',
      '...hSSSkS...',
      '...hSSSSS...',
      '....SSSS....',
      '....pppp....',
      '...pppppp...',
      '....pppp....',
      '....tttt....',
      '....tttt....',
      '....tttt....',
      '....wwwww...',
    ],
  ],

  // ---- getting about ----
  bus: [
    [
      '.....KKKKKK.......KKKKKK............',
      '.....zzzzzz.......zzzzzz............',
      '.KKKKKKKKKKKKKKKKKKKKKKKKKKKK.......',
      '.KUUUUUUUUUUUUUUUUUUUUOOOOOOK.......',
      '.KYYYYYYYYYYYYYYYYYYYYTTTTTTK.......',
      '.KYKKKKKYKKKKKYKKKKKYKKKKKKKK.......',
      '.KYKCCCKYKCCCKYKCCCKYKwwCCCKK.......',
      '.KYKBBBKYKBBBKYKBBBKYKCBBBBKK.......',
      '.KYKBBBKYKBBBKYKBBBKYKBBBBBKK.......',
      '.KYKKKKKYKKKKKYKKKKKYKKKKKKKKKKKKKKK',
      '.KYYYYYYYYYYYRRRYYYYYYYYYYYYKYYYYYYK',
      '.KYKKKKKKKYYRwwwRYYKKKKKKKKYKOOOOuuK',
      '.KYYYYYYYYYYYRRRYYYYYYYYYYYYKOZZZZOK',
      '.KTKKKKKKKKTTTTTTTTTTKKKKKKKKOZZZZOK',
      '.KKKZGGGGZKKKKKKKKKKKKZGGGGZKKKKKKKK',
      '....ZGMMGZ............ZGMMGZ........',
      '....KKKKKK............KKKKKK........',
    ],
  ],
  car: [
    [
      '.........KKKKKKKK.............',
      '........KXXXVXXXXVK...........',
      '......KVAAAAAAAAAVVKKK........',
      '....KVAAAAAAAAAAAAAVVXXXKK....',
      '..KKKKKKKKKKKKKKVVVVVVVVKKKKKK',
      '.KAAAAAAAAKRRRRRRRRRRKRRRRFFRK',
      'KLKQQQQKAAKDFFFFFFFFDKQQQQKRHK',
      'KLQWWWWQAAKDRRRRRRRRDQWWWWQRRK',
      'KAQWAAWQAAKDFFFFFFFFDQWAAWQRRK',
      'KAQWWWWQAAKDVVVVVVVVDQWWWWQDDK',
      '.KKQQQQKKKKKKKKKKKKKKKQQQQKKK.',
    ],
  ],
  bike: [
    [
      '............',
      '...kkk...kk.',
      '....r....r..',
      '....rrrrrr..',
      '....r...r.r.',
      '.....r..r.r.',
      '.kkk.r..kkk.',
      'k...krrk...k',
      'k.e.krrk.e.k',
      'k...k..k...k',
      '.kkk....kkk.',
      '............',
    ],
  ],
  train: [
    [
      '............',
      '.kkkkkkkkkk.',
      '.kbbbbbbbbbk',
      '.kccbccbccbk',
      '.kccbccbccbk',
      '.kbbbbbbbbbk',
      '.kwwwwwwwwwk',
      '.kbbbbbbbbbk',
      '.kkkkkkkkkkk',
      '..kk.kk.kk..',
      '..ee.ee.ee..',
      '............',
    ],
  ],
  tram: [
    [
      '...kkkkkk...',
      '.....k......',
      '.kkkkkkkkkk.',
      '.kgggggggggk',
      '.kccgccgccgk',
      '.kccgccgccgk',
      '.kgggggggggk',
      '.kkkkkkkkkkk',
      '..kk....kk..',
      '..ee....ee..',
      '............',
      '............',
    ],
  ],
  plane: [
    [
      '...........k',
      '..........kk',
      '.........kwk',
      '........kwwk',
      '.......kwwk.',
      '.kk...kwwk..',
      '.kwkkkwwk...',
      '..kwwwwwk...',
      '...kwwwk....',
      '..kwwkwk....',
      '.kwk..kk....',
      '.kk.........',
    ],
  ],

  // ---- food and drink ----
  cook: [
    [
      '............',
      '....e..e....',
      '.....e..e...',
      '............',
      '..kkkkkkkk..',
      '.kmmmmmmmmk.',
      '.kkkkkkkkkk.',
      'kkeeeeeeeekk',
      '.keeeeeeeek.',
      '.keeeeeeeek.',
      '.kkkkkkkkkk.',
      '............',
    ],
  ],
  bag: [
    [
      '............',
      '....kkkk....',
      '...k....k...',
      '..kkkkkkkk..',
      '..knnnnnnk..',
      '..knnnnnnk..',
      '..knnrrnnk..',
      '..knnrrnnk..',
      '..knnnnnnk..',
      '..knnnnnnk..',
      '..kkkkkkkk..',
      '............',
    ],
  ],
  sandwich: [
    [
      '............',
      '............',
      '.....kk.....',
      '...kkyykk...',
      '..kyyyyyyk..',
      '.kyyyyyyyyk.',
      '.kllllllllk.',
      '.krrrrrrrrk.',
      '.kwwwwwwwwk.',
      '.kyyyyyyyyk.',
      '..kkkkkkkk..',
      '............',
    ],
  ],
  plate: [
    [
      '............',
      '............',
      '...kkkkkk...',
      '..kwwwwwwk..',
      '.kwwrrllwwk.',
      '.kwwrroowwk.',
      '.kwwwooowwk.',
      '.kwwwwwwwwk.',
      '..kwwwwwwk..',
      '...kkkkkk...',
      '............',
      '............',
    ],
  ],
  lunchbox: [
    [
      '............',
      '............',
      '...kkkkkk...',
      '...k....k...',
      '.kkkkkkkkkk.',
      '.kbbbbbbbbk.',
      '.kbbbbbbbbk.',
      '.kkkkyykkkk.',
      '.kcccccccck.',
      '.kcccccccck.',
      '.kkkkkkkkkk.',
      '............',
    ],
  ],
  coffee: [
    [
      '............',
      '....e..e....',
      '.....e..e...',
      '............',
      '..kkkkkkkk..',
      '..knnnnnnk..',
      '..kwwwwwwkk.',
      '..kwwwwwwk.k',
      '..kwwwwwwkk.',
      '...kwwwwk...',
      '....kkkk....',
      '............',
    ],
  ],
  mug: [
    [
      '............',
      '....e..e....',
      '.....e..e...',
      '............',
      '..kkkkkkkk..',
      '..krrrrrrk..',
      '..krrrrrrkk.',
      '..krrrrrrk.k',
      '..krrrrrrkk.',
      '..krrrrrrk..',
      '..kkkkkkkk..',
      '............',
    ],
  ],

  // ---- shopping and chores ----
  cart: [
    [
      '............',
      'kk..........',
      '.kkkkkkkkkk.',
      '..kggggggk..',
      '..kggggggk..',
      '...kggggk...',
      '...kkkkkk...',
      '...k....k...',
      '..kek..kek..',
      '..kkk..kkk..',
      '............',
      '............',
    ],
  ],
  store: [
    [
      '............',
      '.rwrwrwrwrw.',
      '.rwrwrwrwrw.',
      '.kkkkkkkkkk.',
      '.kyyyyyyyyk.',
      '.kyccyyyyyk.',
      '.kyccykkkyk.',
      '.kyyyykekyk.',
      '.kyyyykkkyk.',
      '.kkkkkkkkkk.',
      '............',
      '............',
    ],
  ],
  parcel: [
    [
      '............',
      '............',
      '............',
      '..kkkkkkkk..',
      '.knnnwwnnnk.',
      '.knnnwwnnnk.',
      '.knnnwwnnnk.',
      '.knnnwwnnnk.',
      '.knnnwwnnnk.',
      '.kkkkkkkkkk.',
      '............',
      '............',
    ],
  ],
  shirt: [
    [
      '............',
      '..kkk..kkk..',
      '.kbbbkkbbbk.',
      'kbbbbbbbbbbk',
      'kbbbbbbbbbbk',
      '.kkbbbbbbkk.',
      '...kbbbbk...',
      '...kbbbbk...',
      '...kbbbbk...',
      '...kkkkkk...',
      '............',
      '............',
    ],
  ],
  washer: [
    [
      '............',
      '.kkkkkkkkkk.',
      '.kwwwwwwwwk.',
      '.kwkwwwwwwk.',
      '.kkkkkkkkkk.',
      '.kwwkkkkwwk.',
      '.kwkccccwwk.',
      '.kwkccccwwk.',
      '.kwwkkkkwwk.',
      '.kwwwwwwwwk.',
      '.kkkkkkkkkk.',
      '............',
    ],
  ],

  // ---- places and goals ----
  home: [
    [
      '.....kk.....',
      '....krrk....',
      '...krrrrk...',
      '..krrrrrrk..',
      '.krrrrrrrrk.',
      '.kkkkkkkkkk.',
      '..kyyyyyyk..',
      '..kyykkyyk..',
      '..kyykkyyk..',
      '..kkkkkkkk..',
      '............',
      '............',
    ],
  ],
  moon: [
    [
      '............',
      '....kkkk....',
      '..kkyyyyk...',
      '.kyyyykkk...',
      '.kyyyk....w.',
      'kyyyk.......',
      'kyyyk..w....',
      '.kyyyk......',
      '.kyyyykkk...',
      '..kkyyyyk...',
      '....kkkk....',
      '............',
    ],
  ],
  ticket: [
    [
      '............',
      '............',
      '.kkkkkkkkkk.',
      'koooooowoook',
      'kooooooooook',
      'kooyyoowoook',
      'kooyyooooook',
      'koooooowoook',
      'kooooooooook',
      '.kkkkkkkkkk.',
      '............',
      '............',
    ],
  ],
  gift: [
    [
      '............',
      '....kk.kk...',
      '...krrkrrk..',
      '.kkkkkkkkkk.',
      '.kgggrrgggk.',
      '.kgggrrgggk.',
      '.kgggrrgggk.',
      '.kgggrrgggk.',
      '.kgggrrgggk.',
      '.kkkkkkkkkk.',
      '............',
      '............',
    ],
  ],
  dumbbell: [
    [
      '............',
      '............',
      '............',
      '.kk......kk.',
      'kbbk....kbbk',
      'kbbkkkkkkbbk',
      'kbbk....kbbk',
      '.kk......kk.',
      '............',
      '............',
      '............',
      '............',
    ],
  ],
  book: [
    [
      '............',
      '..kkkkkkkk..',
      '.krrrrrrrrk.',
      '.krrrkkrrrk.',
      '.krrrrrrrrk.',
      '.krrrrrrrrk.',
      '.krrrrrrrrk.',
      '.kwwwwwwwwk.',
      '.kkkkkkkkkk.',
      '............',
      '............',
      '............',
    ],
  ],
  coin: [
    [
      '............',
      '...kkkkkk...',
      '..kyyyyyyk..',
      '.kyyyyyyyyk.',
      '.kyyyoooyyk.',
      '.kyyyoyyyyk.',
      '.kyyoooyyyk.',
      '.kyyyoyyyyk.',
      '.kyyoooooyk.',
      '..kyyyyyyk..',
      '...kkkkkk...',
      '............',
    ],
  ],
  flag: [
    [
      '............',
      '.kkkkkkkk...',
      '.krrrrrrk...',
      '.krrrrrrrk..',
      '.krrrrrrk...',
      '.kkkkkkkk...',
      '.k..........',
      '.k..........',
      '.k..........',
      '.k..........',
      '.k..........',
      'kkk.........',
    ],
  ],
  logo: [
    [
      '.....KKKKKK.....',
      '....KVVKKKKK....',
      '...KVVwwwwKKK...',
      '..KVKwKKKKwKKK..',
      '..KKKwKwwKwKKK..',
      '..KKKwKKKKwKKK..',
      '..KKKwKwwKwKKK..',
      '..KKKwKKKKwKKK..',
      '..KKKKwwwwKKKK..',
      '...KKKKKKKKKK...',
      '....KKKKKKKK....',
      '.....KKKKKK.....',
      '.....pppppp.....',
      '...SSppppppSS...',
      '.....pppppp.....',
      '.....tttttt.....',
      '....ttt..ttt....',
      '...www....www...',
    ],
    [
      '.....KKKKKK.....',
      '....KVVKKKKK....',
      '...KVVwwwwKKK...',
      '..KVKwKKKKwKKK..',
      '..KKKwKwwKwKKK..',
      '..KKKwKKKKwKKK..',
      '..KKKwKwwKwKKK..',
      '..KKKwKKKKwKKK..',
      '..KKKKwwwwKKKK..',
      '...KKKKKKKKKK...',
      '....KKKKKKKK....',
      '.....KKKKKK.....',
      '.....pppppp.....',
      '....SppppppS....',
      '....SppppppS....',
      '.....tttttt.....',
      '.....tt..tt.....',
      '....www..www....',
    ],
  ],
  heart: [
    [
      '............',
      '..kkk..kkk..',
      '.krrrkkrrrk.',
      'krrrrrrrrrrk',
      'krrwrrrrrrrk',
      'krrrrrrrrrrk',
      '.krrrrrrrrk.',
      '..krrrrrrk..',
      '...krrrrk...',
      '....krrk....',
      '.....kk.....',
      '............',
    ],
  ],
} as const satisfies Record<string, readonly (readonly string[])[]>

export type IconName = keyof typeof ART_DATA
export const ICON_NAMES = Object.keys(ART_DATA) as IconName[]
export const isIconName = (s: unknown): s is IconName => typeof s === 'string' && s in ART_DATA

/** The frames for an icon (most have one; the walker has two). */
export const framesOf = (name: IconName): readonly (readonly string[])[] => (ART_DATA as Record<string, Frames>)[name]
export const frameCount = (name: IconName): number => framesOf(name).length

/** Icons Qwen may choose from, kept short so the prompt stays small. */
export const CHOOSABLE: IconName[] = ICON_NAMES.filter((n) => n !== 'flag' && n !== 'heart' && n !== 'logo')

/** Rectangles for one frame, run-length merged per row and colour. */
export function rects(name: IconName, frame = 0): { x: number; y: number; w: number; fill: string }[] {
  const frames = framesOf(name)
  const rows = frames[((frame % frames.length) + frames.length) % frames.length]
  const out: { x: number; y: number; w: number; fill: string }[] = []
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      let end = x + 1
      while (end < row.length && row[end] === ch) end++
      if (ch !== '.' && PALETTE[ch]) out.push({ x, y, w: end - x, fill: PALETTE[ch] })
      x = end
    }
  })
  return out
}

/** Width and height of an icon in art pixels. */
export function dims(name: IconName): { w: number; h: number } {
  const rows = framesOf(name)[0]
  return { w: rows[0].length, h: rows.length }
}

/**
 * How big to draw an icon. `size` is CSS pixels per art pixel for a small 12-wide icon (3 makes it 36px wide).
 * Wider icons are shown 1.5x wider than that so their extra detail is visible, unless `natural` is set, in
 * which case `size` is literally CSS pixels per art pixel.
 */
export function artBox(name: IconName, size: number, natural = false): { w: number; h: number; px: number } {
  const { w, h } = dims(name)
  const px = natural || w <= SIZE ? size : (SIZE * size * 1.5) / w
  return { w: w * px, h: h * px, px }
}

/** A good literal pixel size for a vehicle on the race road: small icons 3, big detailed ones 2. */
export const naturalSize = (name: IconName): number => (dims(name).w > SIZE ? 2 : 3)

/** SVG markup, for places outside React (the click-burst overlay). */
export function artSvg(name: IconName, size = 3, frame = 0): string {
  const { w, h } = dims(name)
  const box = artBox(name, size)
  const body = rects(name, frame)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`)
    .join('')
  return `<svg class="sprite" width="${box.w}" height="${box.h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">${body}</svg>`
}

/** The best icon for some words (an option name, a habit). Falls back to a coin. */
const KEYWORDS: [RegExp, IconName][] = [
  [/\b(walk|walking|on foot|stroll|hike)\b/i, 'walk'],
  [/\b(bike|cycle|cycling|bicycle|lime bike)\b/i, 'bike'],
  [/\b(tram)\b/i, 'tram'],
  [/\b(train|rail|interrail|eurostar|lner|scotrail)\b/i, 'train'],
  [/\b(plane|flight|fly|flying|airport|ryanair|easyjet)\b/i, 'plane'],
  [/\b(bus|coach|lothian|stagecoach|night bus|megabus)\b/i, 'bus'],
  [/\b(uber|taxi|cab|car|drive|driving|lift|bolt)\b/i, 'car'],
  [/\b(deliveroo|delivery|takeaway|take-away|just eat|uber eats|ubereats|fast food|mcdonald)\b/i, 'bag'],
  [/\b(cook|cooking|cooked|home-cooked|from scratch|pasta|stir)\b/i, 'cook'],
  [/\b(sandwich|meal deal|greggs|sub|wrap|sausage roll|pret)\b/i, 'sandwich'],
  [/\b(packed|lunchbox|lunch box)\b/i, 'lunchbox'],
  [/\b(canteen|restaurant|pub|plate|dinner|meal|food)\b/i, 'plate'],
  [/\b(coffee|latte|cafe|café|starbucks|costa|espresso|cappuccino|flat white)\b/i, 'coffee'],
  [/\b(mug|brew|tea|kettle)\b/i, 'mug'],
  [/\b(washing machine|dryer|laundrette|laundromat|wash)\b/i, 'washer'],
  [/\b(shirt|clothes|clothing|air dry|laundry|drop-off)\b/i, 'shirt'],
  [/\b(online|parcel|amazon|package|post|order)\b/i, 'parcel'],
  [/\b(cart|supermarket|tesco|aldi|lidl|asda|sainsbury|grocer|groceries|shopping)\b/i, 'cart'],
  [/\b(shop|shops|store|market|local)\b/i, 'store'],
  [/\b(home|house|flat|rent|room)\b/i, 'home'],
  [/\b(night|late|moon|sleep)\b/i, 'moon'],
  [/\b(ticket|festival|gig|concert|cinema|event)\b/i, 'ticket'],
  [/\b(gift|present|treat)\b/i, 'gift'],
  [/\b(gym|workout|run|running|exercise|sport|dumbbell)\b/i, 'dumbbell'],
  [/\b(book|study|library|course|textbook)\b/i, 'book'],
]
export function iconForText(text: string): IconName {
  return KEYWORDS.find(([re]) => re.test(text))?.[1] ?? 'coin'
}

/** Old saved data used emoji for goals; map them to the new icons. */
export const EMOJI_TO_ICON: Record<string, IconName> = {
  '🎪': 'ticket',
  '🚆': 'train',
  '🏠': 'home',
  '🎁': 'gift',
}
