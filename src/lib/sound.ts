/**
 * Tiny chiptune blips made with WebAudio: no audio files. The context is created lazily on the
 * first sound (which always follows a tap, so autoplay rules are met). Mute is remembered.
 */
export type SoundName = 'click' | 'tick' | 'urgent' | 'lock' | 'bullseye' | 'miss' | 'badge' | 'nudge' | 'magic' | 'sparkle' | 'grow'

interface Note {
  /** frequency in Hz; 0 is a rest */
  f: number
  /** seconds */
  d: number
}

const WAVE: Record<SoundName, OscillatorType> = {
  click: 'square',
  tick: 'square',
  urgent: 'square',
  lock: 'square',
  bullseye: 'square',
  miss: 'triangle',
  badge: 'square',
  nudge: 'triangle',
  magic: 'triangle',
  sparkle: 'triangle',
  grow: 'triangle',
}

const NOTES: Record<SoundName, Note[]> = {
  click: [{ f: 880, d: 0.04 }, { f: 1175, d: 0.05 }],
  tick: [{ f: 660, d: 0.04 }],
  urgent: [{ f: 988, d: 0.06 }, { f: 740, d: 0.06 }],
  lock: [{ f: 523, d: 0.07 }, { f: 784, d: 0.1 }],
  bullseye: [{ f: 523, d: 0.08 }, { f: 659, d: 0.08 }, { f: 784, d: 0.08 }, { f: 1047, d: 0.2 }],
  miss: [{ f: 330, d: 0.12 }, { f: 262, d: 0.12 }, { f: 196, d: 0.22 }],
  badge: [{ f: 784, d: 0.08 }, { f: 988, d: 0.08 }, { f: 1175, d: 0.08 }, { f: 1568, d: 0.22 }],
  nudge: [{ f: 440, d: 0.03 }],
  // a little rising blip for a bar or a line that is growing; `pitch` makes each step a bit higher
  grow: [{ f: 330, d: 0.05 }, { f: 440, d: 0.05 }, { f: 587, d: 0.09 }],
  sparkle: [{ f: 1568, d: 0.05 }, { f: 1976, d: 0.05 }, { f: 2349, d: 0.05 }, { f: 2637, d: 0.05 }, { f: 3136, d: 0.06 }, { f: 3951, d: 0.07 }, { f: 3136, d: 0.05 }, { f: 3951, d: 0.05 }, { f: 4699, d: 0.2 }],
  magic: [{ f: 659, d: 0.07 }, { f: 880, d: 0.07 }, { f: 1319, d: 0.07 }, { f: 1760, d: 0.07 }, { f: 2093, d: 0.25 }],
}

const KEY = 'trade-off-muted'
let ctx: AudioContext | null = null
let muted = readMuted()
const listeners = new Set<() => void>()

function readMuted(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export const isMuted = (): boolean => muted

export function setMuted(v: boolean): void {
  muted = v
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch {
    /* private mode: the choice just lasts this session */
  }
  if (v && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  listeners.forEach((l) => l())
}

/** For useSyncExternalStore. */
export function subscribeMuted(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function play(name: SoundName, pitch = 1): void {
  // reduced motion calms the animation; it does not mute sound (the mute button does that)
  if (muted || typeof window === 'undefined') return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    let t = ctx.currentTime
    for (const n of NOTES[name]) {
      if (n.f > 0) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = WAVE[name]
        osc.frequency.value = n.f * pitch
        // short attack and release so the blips never click or pop
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(0.08, t + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d)
        osc.connect(gain).connect(ctx.destination)
        osc.start(t)
        osc.stop(t + n.d + 0.02)
      }
      t += n.d
    }
  } catch {
    /* audio is a nicety: never break the app over it */
  }
}
