/**
 * The "8-BALL MAN" wordmark, drawn by hand from a 5 x 7 pixel grid instead of set in a font: chunky white letters
 * with a stepped extrusion behind them. No glow, no gradient.
 */
const GLYPHS: Record<string, string[]> = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10101', '10011', '10001', '10001'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
}
const WORD = '8-BALL MAN'
const ROOM = 1 // empty columns between letters

interface Cell {
  x: number
  y: number
  fill: string
}

function layout(): { cells: Cell[]; w: number } {
  const cells: Cell[] = []
  let x = 0
  for (const ch of WORD) {
    if (ch === ' ') {
      x += 3
      continue
    }
    GLYPHS[ch].forEach((row, y) => [...row].forEach((c, i) => c === '1' && cells.push({ x: x + i, y, fill: y === 0 ? 'var(--tt-top, #e6e1ff)' : 'var(--tt-main, #ffffff)' })))
    x += 5 + ROOM
  }
  return { cells, w: x - ROOM }
}

const { cells, w } = layout()
const DEPTH = 3

export function PixelTitle({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${w + DEPTH} ${7 + DEPTH}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label="8-Ball Man"
    >
      {/* the extrusion: the letters repeated down and to the right, darker each step */}
      {[3, 2, 1].map((d) =>
        cells.map((c, i) => (
          <rect key={`${d}-${i}`} x={c.x + d} y={c.y + d} width={1} height={1} fill={d === 3 ? 'var(--tt-e3, #2a1470)' : d === 2 ? 'var(--tt-e2, #3b1d8f)' : 'var(--tt-e1, #5230b8)'} />
        )),
      )}
      {cells.map((c, i) => (
        <rect key={`c${i}`} x={c.x} y={c.y} width={1} height={1} fill={c.fill} />
      ))}
    </svg>
  )
}
