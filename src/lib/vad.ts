/** Decides when someone has finished talking, from the microphone's loudness (0..1) over time. */
export interface VadOptions {
  /** loudness that counts as speech */
  speechLevel: number
  /** quiet for this long after speech means they are done */
  silenceMs: number
  /** give up if nothing is said for this long */
  noSpeechMs: number
  /** never listen longer than this */
  maxMs: number
}

export const VAD_DEFAULTS: VadOptions = { speechLevel: 0.15, silenceMs: 1200, noSpeechMs: 6000, maxMs: 15000 }

/** Feed it `push(level, nowMs)`; it returns true once recording should stop. */
export function createSilenceTracker(opts: VadOptions = VAD_DEFAULTS) {
  let start: number | null = null
  let lastLoud = 0
  let spoke = false
  return {
    push(level: number, now: number): boolean {
      if (start === null) start = now
      if (level >= opts.speechLevel) {
        spoke = true
        lastLoud = now
      }
      if (now - start >= opts.maxMs) return true
      if (!spoke) return now - start >= opts.noSpeechMs
      return now - lastLoud >= opts.silenceMs
    },
  }
}
