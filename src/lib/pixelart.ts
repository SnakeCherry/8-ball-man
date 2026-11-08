/**
 * Pixel art for options, decisions and goals: 12x12 grids, a handful of colours, drawn by hand.
 * One character per pixel; '.' is see-through. Things that move are drawn facing RIGHT, the way they travel.
 */

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
}

type Frames = readonly (readonly string[])[]

const ART_DATA = {
  // ---- a person walking, facing right: two frames ----
  walk: [
    [
      '............',
      '...dddddd...',
      '...dsssks...',
      '...dsssss...',
      '....ssss....',
      '....gggg....',
      '..sggggggs..',
      '....gggg....',
      '....bbbb....',
      '...bb..bb...',
      '..bb....bb..',
      '..ww....www.',
    ],
    [
      '............',
      '...dddddd...',
      '...dsssks...',
      '...dsssss...',
      '....ssss....',
      '....gggg....',
      '...gggggg...',
      '....gggg....',
      '....bbbb....',
      '....bbbb....',
      '....bbbb....',
      '....wwwww...',
    ],
  ],

  // ---- getting about ----
  bus: [
    [
      '............',
      '.kkkkkkkkkk.',
      '.kyyyyyyyyyk',
      '.kccyccyccyk',
      '.kccyccyccyk',
      '.kyyyyyyyyyk',
      '.kyyyyyyyyyk',
      '.krrrrrrrrrk',
      '.kkkkkkkkkkk',
      '..kkk..kkk..',
      '..kek..kek..',
      '..kkk..kkk..',
    ],
  ],
  car: [
    [
      '............',
      '....kyyk....',
      '...kkkkkk...',
      '..kcccyccck.',
      '.kkkkkkkkkkk',
      '.kyyyyyyyyok',
      '.kyyyyyyyyyk',
      '.kkkkkkkkkkk',
      '..kkk..kkk..',
      '..kek..kek..',
      '..kkk..kkk..',
      '............',
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
export const CHOOSABLE: IconName[] = ICON_NAMES.filter((n) => n !== 'flag' && n !== 'heart')

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

/** SVG markup, for places outside React (the click-burst overlay). */
export function artSvg(name: IconName, px = 3, frame = 0): string {
  const body = rects(name, frame)
    .map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1" fill="${r.fill}"/>`)
    .join('')
  return `<svg class="sprite" width="${SIZE * px}" height="${SIZE * px}" viewBox="0 0 ${SIZE} ${SIZE}" aria-hidden="true">${body}</svg>`
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
