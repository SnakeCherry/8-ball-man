import { useEffect, useState } from 'react'
import { artBox, dims, frameCount, rects } from '../lib/pixelart'
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
  natural = false,
  className = '',
}: {
  name: IconName
  size?: number
  frame?: number
  animate?: boolean
  flip?: boolean
  /** treat `size` as literal CSS pixels per art pixel (see artBox) */
  natural?: boolean
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
  const box = artBox(name, size, natural)
  const { w, h } = dims(name)
  return (
    <svg
      className={`sprite inline-block shrink-0 align-middle ${className}`}
      width={box.w}
      height={box.h}
      viewBox={`0 0 ${w} ${h}`}
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      aria-hidden="true"
    >
      {rects(name, f).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  )
}
