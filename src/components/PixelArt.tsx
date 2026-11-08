import { useEffect, useState } from 'react'
import { SIZE, frameCount, rects } from '../lib/pixelart'
import type { IconName } from '../lib/pixelart'

const reducedMotion = (): boolean => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A hand-drawn pixel icon. `size` is the width of one art pixel in CSS pixels (3 makes a 36px icon).
 * Icons with more than one frame (the walker) can be told which frame to show, or `animate` to cycle.
 */
export function PixelArt({
  name,
  size = 3,
  frame = 0,
  animate = false,
  flip = false,
  className = '',
}: {
  name: IconName
  size?: number
  frame?: number
  animate?: boolean
  flip?: boolean
  className?: string
}) {
  const frames = frameCount(name)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!animate || frames < 2 || reducedMotion()) return
    const id = window.setInterval(() => setTick((t) => t + 1), 240)
    return () => window.clearInterval(id)
  }, [animate, frames])

  const f = animate ? tick : frame
  return (
    <svg
      className={`sprite inline-block shrink-0 align-middle ${className}`}
      width={SIZE * size}
      height={SIZE * size}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      {rects(name, f).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
}
