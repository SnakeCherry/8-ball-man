import { PixelCard, Label } from './ui'
import { gbp, mins } from '../lib/format'
import { dims, rects } from '../lib/pixelart'
import type { QuadPoint } from '../lib/recap'

const W = 460
const H = 330
const X0 = 36
const X1 = 444
const Y0 = 30
const Y1 = 298
const CX = (X0 + X1) / 2
const CY = (Y0 + Y1) / 2
const HALF_W = (X1 - X0) / 2 // a position of 1 would be the very edge; points stay inside 0.9
const HALF_H = (Y1 - Y0) / 2

const QUADRANTS = [
  { label: 'CHEAPER AND HEALTHIER', x: X1 - 6, y: Y0 + 14, anchor: 'end' as const, fill: 'rgba(110,240,127,0.28)', rx: CX, ry: Y0 },
  { label: 'HEALTHIER, COSTS MORE', x: X0 + 6, y: Y0 + 14, anchor: 'start' as const, fill: 'rgba(255,213,74,0.16)', rx: X0, ry: Y0 },
  { label: 'CHEAPER, LESS HEALTHY', x: X1 - 6, y: Y1 - 8, anchor: 'end' as const, fill: 'rgba(255,213,74,0.16)', rx: CX, ry: CY },
  { label: 'COSTS MORE, LESS HEALTHY', x: X0 + 6, y: Y1 - 8, anchor: 'start' as const, fill: 'rgba(255,107,107,0.14)', rx: X0, ry: CY },
]

const squareFor = (timePct: number): number => 24 + (Math.min(100, Math.abs(timePct)) / 100) * 16

/**
 * Every choice, measured against your usual. Across is money (right = cheaper), up is health (up = healthier), and
 * the top right corner, cheaper and healthier, is the sweet spot. Each choice is its pixel icon in a square: blue and
 * bigger when it saved a lot of time, grey when it took longer. The centre is "same as your usual".
 */
export function QuadrantMap({ points }: { points: QuadPoint[] }) {
  // choices on the same spot would hide each other, so nudge repeats sideways
  const placed = points.map((p, i) => {
    const px = CX + p.xn * HALF_W
    const py = CY - p.yn * HALF_H
    const clash = points.slice(0, i).filter((q) => Math.abs(CX + q.xn * HALF_W - px) < 22 && Math.abs(CY - q.yn * HALF_H - py) < 22).length
    return { p, px: px + clash * 14, py: py - clash * 6 }
  })
  const wins = points.filter((p) => p.quadrant === 'win').length

  return (
    <PixelCard className="space-y-3">
      <Label>Your trade-off map</Label>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={`Chart of ${points.length} choices against your usual: money across, health up. ${wins} landed in the cheaper and healthier corner.`}
      >
        {QUADRANTS.map((q) => (
          <rect key={q.label} x={q.rx} y={q.ry} width={CX - X0} height={CY - Y0} fill={q.fill} aria-hidden="true" />
        ))}
        <rect x={X0} y={Y0} width={X1 - X0} height={Y1 - Y0} fill="none" stroke="#0a0a0a" strokeWidth={4} aria-hidden="true" />
        <line x1={CX} x2={CX} y1={Y0} y2={Y1} stroke="#0a0a0a" strokeWidth={2} strokeDasharray="4 5" aria-hidden="true" />
        <line x1={X0} x2={X1} y1={CY} y2={CY} stroke="#0a0a0a" strokeWidth={2} strokeDasharray="4 5" aria-hidden="true" />
        {/* tick marks along the zero lines: a bit (0.35) and a lot (0.7) each way */}
        {[-0.7, -0.35, 0.35, 0.7].map((t) => (
          <g key={`tx${t}`} aria-hidden="true">
            <line x1={CX + t * HALF_W} x2={CX + t * HALF_W} y1={CY - 4} y2={CY + 4} stroke="#0a0a0a" strokeWidth={2} />
            <text x={CX + t * HALF_W} y={CY + 16} textAnchor="middle" className="font-pixel" fontSize={6} fill="#0a0a0a" fillOpacity={0.55}>
              {Math.abs(t) > 0.5 ? 'A LOT' : 'A BIT'}
            </text>
          </g>
        ))}
        {[-0.7, -0.35, 0.35, 0.7].map((t) => (
          <g key={`ty${t}`} aria-hidden="true">
            <line x1={CX - 4} x2={CX + 4} y1={CY - t * HALF_H} y2={CY - t * HALF_H} stroke="#0a0a0a" strokeWidth={2} />
          </g>
        ))}
        {QUADRANTS.map((q) => (
          <text key={q.label} x={q.x} y={q.y} textAnchor={q.anchor} className="font-pixel" fontSize={8} fill="#0a0a0a" fillOpacity={0.7} aria-hidden="true">
            {q.label}
          </text>
        ))}
        <text x={CX} y={H - 6} textAnchor="middle" className="font-pixel" fontSize={8} fill="#0a0a0a" aria-hidden="true">
          MONEY: COSTS MORE ← SAME → SAVES
        </text>
        <text x={8} y={CY + 3} className="font-pixel" fontSize={8} fill="#0a0a0a" transform={`rotate(-90 8 ${CY})`} textAnchor="middle" aria-hidden="true">
          HEALTH
        </text>

        {placed.map(({ p, px, py }, i) => {
          const size = squareFor(p.timePct)
          const { w, h } = dims(p.entry.chosen.icon)
          const scale = (size - 8) / Math.max(w, h)
          const saved = p.timePct > 0
          return (
            <g key={i} transform={`translate(${px - size / 2} ${py - size / 2})`}>
              <rect width={size} height={size} fill={saved ? '#9fd0ff' : '#d8d8d8'} stroke="#0a0a0a" strokeWidth={3}>
                <title>
                  {`${p.entry.decision.title}: ${p.entry.chosen.name} instead of ${p.entry.usual.name}. ${p.x >= 0 ? 'Saves' : 'Costs'} ${Math.abs(Math.round(p.x))}% ${p.x >= 0 ? '' : 'more '}(${gbp(Math.abs(p.entry.usual.costGBP - p.entry.chosen.costGBP))} a use), health ${p.y >= 0 ? '+' : '-'}${Math.abs(p.y)}, ${mins(Math.abs(p.entry.usual.timeMin - p.entry.chosen.timeMin))} ${saved ? 'quicker' : 'slower'}.`}
                </title>
              </rect>
              <g transform={`translate(${(size - w * scale) / 2} ${(size - h * scale) / 2}) scale(${scale})`} aria-hidden="true">
                {rects(p.entry.chosen.icon).map((r, k) => (
                  <rect key={k} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
                ))}
              </g>
            </g>
          )
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[14px]" aria-label="Key">
        <li className="flex items-center gap-2">
          <i className="block h-3 w-3 border-2 border-ink" style={{ background: '#9fd0ff' }} aria-hidden="true" />
          Saved time
        </li>
        <li className="flex items-center gap-2">
          <i className="block h-3 w-3 border-2 border-ink" style={{ background: '#d8d8d8' }} aria-hidden="true" />
          Took longer
        </li>
        <li>Bigger square = bigger time change</li>
      </ul>
      <p className="text-[16px] leading-snug">
        {points.length === 0
          ? 'Your choices will appear here.'
          : `${wins} of ${points.length} ${points.length === 1 ? 'choice' : 'choices'} landed in the cheaper and healthier corner.`}
      </p>
    </PixelCard>
  )
}
