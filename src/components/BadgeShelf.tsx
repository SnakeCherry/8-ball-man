import { PixelIcon } from './ui'
import { TIER_COLOR, TIER_NAME } from '../lib/badges'
import type { BadgeLevel } from '../lib/badges'
import { gbp } from '../lib/format'

const show = (l: BadgeLevel, n: number): string => (l.def.gbp ? gbp(n) : `${Math.round(n)}`)

/** Medals for what you do. Each badge shows bronze, silver and gold, and how far you are from the next one. */
export function BadgeShelf({ levels }: { levels: BadgeLevel[] }) {
  const earned = levels.filter((l) => l.tier > 0).length
  return (
    <section aria-label="Badges">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="font-pixel text-[14px] uppercase leading-5">Badges</h2>
        <p className="num text-[15px]">
          {earned} of {levels.length}
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {levels.map((l) => (
          <li
            key={l.def.id}
            className={`pcard p-3 ${l.tier === 0 ? 'opacity-70' : ''}`}
            style={{ background: TIER_COLOR[l.tier], boxShadow: l.tier ? 'inset 0 6px 0 rgba(255,255,255,0.38), inset 0 -8px 0 rgba(0,0,0,0.16)' : undefined }}
          >
            <div className="flex items-center justify-between gap-2">
              <PixelIcon name={l.tier ? l.def.icon : 'lock'} size={4} color={l.tier ? '#0a0a0a' : '#555'} />
              <span className="flex gap-1" role="img" aria-label={`${TIER_NAME[l.tier]} level`}>
                {[1, 2, 3].map((t) => (
                  <i key={t} className="block h-4 w-4 border-2 border-ink" style={{ background: l.tier >= t ? TIER_COLOR[t] : '#fff' }} aria-hidden="true" />
                ))}
              </span>
            </div>
            <p className="mt-2 text-[17px] leading-tight">{l.def.name}</p>
            <p className="mt-1 text-[13px] leading-tight">{l.def.line}</p>
            <div className="mt-2 h-3 border-2 border-ink bg-white" aria-hidden="true">
              <div className="h-full bg-ink" style={{ width: `${l.next === null ? 100 : Math.min(100, (l.value / l.next) * 100)}%`, transition: 'width 0.5s steps(8)' }} />
            </div>
            <p className="num mt-1 text-[13px] leading-tight">
              {l.next === null ? `Gold reached: ${show(l, l.value)}` : `${TIER_NAME[l.tier + 1]} at ${show(l, l.next)}. You have ${show(l, l.value)}.`}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
