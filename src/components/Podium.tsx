import { useEffect } from 'react'
import { CountUp } from './CountUp'
import { play } from '../lib/sound'
import { PixelArt } from './PixelArt'
import { axisFormat } from './parts'
import { lifeEach, signedSpan } from '../lib/life'
import { PixelIcon } from './ui'
import { AXIS_ICON } from './parts'
import { PODIUM_TITLE } from '../data/copy'
import { axisShown, podiumOrder } from '../lib/scoring'
import type { Axis, Option } from '../lib/types'

/** Step heights grow with the window height (in dvh) so the podiums fill a tall screen. */
const HEIGHT = { 1: 'clamp(96px, 11dvh, 150px)', 2: 'clamp(72px, 8.25dvh, 112px)', 3: 'clamp(56px, 6.4dvh, 86px)' } as const

/** Olympic colours: gold, silver, bronze, each with a lighter top band and a darker bottom band for a pixel-metal look. */
const MEDAL = {
  1: { name: 'Gold', fill: '#f7c948' },
  2: { name: 'Silver', fill: '#c9d0d8' },
  3: { name: 'Bronze', fill: '#d28a4c' },
} as const
const SHADE = 'inset 0 6px 0 rgba(255,255,255,0.38), inset 0 -8px 0 rgba(0,0,0,0.16)'

/** A three-step podium for one axis: 2nd on the left, 1st in the middle, 3rd on the right. */
export function Podium({ options, axis, usual, delay = 0, oneOff = false }: { options: Option[]; axis: Axis; usual: Option; delay?: number; oneOff?: boolean }) {
  // for a one-off buy the time axis is how long until you have it
  const title = oneOff && axis === 'time' ? { title: 'Soonest', sub: 'how soon' } : PODIUM_TITLE[axis]
  const [first, second, third] = podiumOrder(options, axis)
  const cols = [
    { o: second, rank: 2 as const, at: 0.3 },
    { o: first, rank: 1 as const, at: 0.6 },
    { o: third, rank: 3 as const, at: 0 },
  ]
  // each step makes a rising blip as it grows (3rd, then 2nd, then 1st), a little higher each time
  useEffect(() => {
    const ids = cols.map(({ at, rank }) => window.setTimeout(() => play('grow', rank === 3 ? 1 : rank === 2 ? 1.26 : 1.5), (delay + at) * 1000 + 150))
    return () => ids.forEach((id) => window.clearTimeout(id))
    // plays once when the podium appears
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <section aria-label={`${title.title}: ${title.sub}`}>
      <p className="mb-2 flex items-center gap-2 font-pixel text-[12px] uppercase">
        <PixelIcon name={AXIS_ICON[axis]} size={3} />
        {title.title}: {title.sub}
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
              <span className="font-pixel text-[12px]">{rank}</span>
              <span className="num text-[20px] font-semibold leading-none">
                {axis === 'health' ? (
                  <span>{o.id === usual.id ? 'Usual' : <CountUp value={lifeEach(o, usual)} format={signedSpan} delayMs={(delay + at) * 1000 + 250} />}</span>
                ) : (
                  <CountUp value={axisShown(o, axis)} format={axisFormat[axis]} delayMs={(delay + at) * 1000 + 250} />
                )}
              </span>
            </div>
            <span className="mt-1 text-[14px] leading-tight">{o.name}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
