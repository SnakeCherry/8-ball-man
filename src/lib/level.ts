/**
 * The loudness (0..1) of whatever is being heard or said right now: your microphone while you talk, the ball's
 * voice while it talks. The orb reads it every animation frame, so nothing re-renders for it.
 */
let current = 0

export const setLevel = (n: number): void => {
  current = Math.max(0, Math.min(1, n))
}
export const getLevel = (): number => current

let ctx: AudioContext | null = null
const hooked = new WeakSet<HTMLMediaElement>()

/** Follow an <audio> element's loudness into the level store until it stops. Silent no-op if the browser refuses. */
export function trackPlaybackLevel(audio: HTMLMediaElement): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    if (!hooked.has(audio)) {
      hooked.add(audio)
      const src = ctx.createMediaElementSource(audio)
      const an = ctx.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      an.connect(ctx.destination)
      ;(audio as HTMLMediaElement & { _an?: AnalyserNode })._an = an
    }
    const an = (audio as HTMLMediaElement & { _an?: AnalyserNode })._an
    if (!an) return
    const buf = new Uint8Array(an.fftSize)
    const tick = () => {
      if (audio.paused || audio.ended) {
        setLevel(0)
        return
      }
      an.getByteTimeDomainData(buf)
      let peak = 0
      for (const b of buf) peak = Math.max(peak, Math.abs(b - 128))
      setLevel(Math.min(1, peak / 70))
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  } catch {
    /* the orb falls back to its own gentle pulse */
  }
}

/** A made-up gentle pulse for voices we cannot measure (the browser's own speech). Returns a stop function. */
export function pulseLevel(): () => void {
  let on = true
  const t0 = performance.now()
  const tick = () => {
    if (!on) return
    const t = (performance.now() - t0) / 1000
    setLevel(0.35 + 0.3 * Math.abs(Math.sin(t * 7)) * Math.abs(Math.sin(t * 2.3)))
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  return () => {
    on = false
    setLevel(0)
  }
}
