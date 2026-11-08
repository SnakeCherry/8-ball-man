import { useEffect, useRef } from 'react'
import { PixelCard, PixelIcon, Label } from './ui'
import { TIER_COLOR, TIER_NAME, badgeById } from '../lib/badges'
import { burstAtElement } from '../lib/fx'
import { play } from '../lib/sound'

/** A medal you just earned (or moved up a level on), in the medal's colour, with a burst of stars once it has popped in. */
export function BadgeCard({ id, tier }: { id: string; tier: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const b = badgeById(id)
  useEffect(() => {
    const t = window.setTimeout(() => {
      burstAtElement(ref.current, { icon: 'star', count: 12, spread: 88 })
      play('badge')
    }, 500)
    return () => window.clearTimeout(t)
  }, [])
  return (
    <div ref={ref}>
      <PixelCard className="anim-pop flex items-center gap-3" style={{ background: TIER_COLOR[tier] }}>
        <PixelIcon name={b.icon} size={5} color="#0a0a0a" className="anim-hop" />
        <div>
          <Label className="[&>span]:bg-white">{tier === 1 ? 'New badge' : 'Level up'}</Label>
          <p className="text-[19px] leading-tight">
            {b.name}: {TIER_NAME[tier]}
          </p>
          <p className="text-[14px]">{b.line}</p>
        </div>
      </PixelCard>
    </div>
  )
}
