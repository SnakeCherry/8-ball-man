import { CountUp } from './CountUp'
import { PixelArt } from './PixelArt'
import { axisFormat } from './parts'
import { PixelIcon } from './ui'
import { AXIS_ICON } from './parts'
import { PODIUM_TITLE } from '../data/copy'
import { axisShown, podiumOrder } from '../lib/scoring'
import type { Axis, Option } from '../lib/types'

const HEIGHT = { 1: 96, 2: 72, 3: 56 } as const

/** Olympic colours: gold, silver, bronze, each with a lighter top band and a darker bottom band for a pixel-metal look. */
const MEDAL = {
  1: { name: 'Gold', fill: '#f7c948' },
  2: { name: 'Silver', fill: '#c9d0d8' },
  3: { name: 'Bronze', fill: '#d28a4c' },
} as const
const SHADE = 'inset 0 6px 0 rgba(255,255,255,0.38), inset 0 -8px 0 rgba(0,0,0,0.16)'

/** A three-step podium for one axis: 2nd on the left, 1st in the middle, 3rd on the right. */
export function Podium({ options, axis, delay = 0 }: { options: Option[]; axis: Axis; delay?: number }) {
  const [first, second, third] = podiumOrder(options, axis)
  const cols = [
    { o: second, rank: 2 as const, at: 0.3 },
    { o: first, rank: 1 as const, at: 0.6 },
    { o: third, rank: 3 as const, at: 0 },
  ]
  return (
    <section aria-label={`${PODIUM_TITLE[axis].title}: ${PODIUM_TITLE[axis].sub}`}>
      <p className="mb-2 flex items-center gap-2 font-pixel text-[11px] uppercase">
        <PixelIcon name={AXIS_ICON[axis]} size={3} />
        {PODIUM_TITLE[axis].title}: {PODIUM_TITLE[axis].sub}
      </p>
      <ol className="grid grid-cols-3 items-end gap-2">
        {cols.map(({ o, rank, at }) => (
          <li key={o.id} className="flex flex-col items-center text-center">
            <span className="anim-slide mb-1 text-[26px] leading-none" style={{ animationDelay: `${delay + at + 0.3}s` }} aria-hidden="true">
              <PixelArt name={o.icon} size={3} />
            </span>
            <div
              className="anim-rise flex w-full flex-col items-center justify-center border-4 border-ink"
              style={{ height: HEIGHT[rank], animationDelay: `${delay + at}s`, background: MEDAL[rank].fill, boxShadow: SHADE }}
            >
              <span className="sr-only">{MEDAL[rank].name}</span>
              <span className="font-pixel text-[10px]">{rank}</span>
              <span className="num text-[20px] font-semibold leading-none">
                <CountUp value={axisShown(o, axis)} format={axisFormat[axis]} delayMs={(delay + at) * 1000 + 250} />
              </span>
            </div>
            <span className="mt-1 text-[13px] leading-tight">{o.name}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
