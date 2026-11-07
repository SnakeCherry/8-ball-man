import { useEffect, useState } from 'react'
import { stepValue } from '../lib/countUp'
import { reducedMotion } from '../lib/fx'

/** Counts from 0 to `value` in a handful of visible ticks (odometer feel, not a smooth tween). */
export function CountUp({
  value,
  format,
  delayMs = 0,
  steps = 8,
  stepMs = 70,
}: {
  value: number
  format: (n: number) => string
  delayMs?: number
  steps?: number
  stepMs?: number
}) {
  const [shown, setShown] = useState(reducedMotion() ? value : 0)

  useEffect(() => {
    if (reducedMotion()) {
      setShown(value)
      return
    }
    let i = 0
    let timer: number
    const tick = () => {
      i += 1
      setShown(stepValue(0, value, i, steps))
      if (i < steps) timer = window.setTimeout(tick, stepMs)
    }
    setShown(0)
    timer = window.setTimeout(tick, delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs, steps, stepMs])

  return <>{format(shown)}</>
}
