import track from '../../music/A_lonely_cherry_tree_by_Pix.mp3'
import { isMuted, subscribeMuted } from './sound'

/**
 * Background pixel music, looping quietly. Browsers only allow sound after a tap, so it starts on the first one.
 * It follows the mute button, drops to a murmur while the ball talks, and stops while the microphone is open so
 * the mic never hears it.
 */
const LOUD = 0.22
const QUIET = 0.06

let audio: HTMLAudioElement | null = null
let started = false
let installed = false
const holds = new Set<'voice' | 'mic'>()

function apply(): void {
  if (!audio) return
  audio.volume = holds.has('voice') ? QUIET : LOUD
  const shouldPlay = started && !isMuted() && !holds.has('mic')
  if (shouldPlay && audio.paused) void audio.play().catch(() => undefined)
  else if (!shouldPlay && !audio.paused) audio.pause()
}

/** Tell the music something else wants the airwaves ('voice': the ball talking, 'mic': you talking). */
export function musicHold(reason: 'voice' | 'mic', on: boolean): void {
  if (on) holds.add(reason)
  else holds.delete(reason)
  apply()
}

/** Set it up once: the track starts on the first tap or key press. */
export function installMusic(): () => void {
  if (installed || typeof window === 'undefined') return () => undefined
  installed = true
  audio = new Audio(track)
  audio.loop = true
  audio.preload = 'auto'
  const begin = () => {
    started = true
    apply()
    window.removeEventListener('pointerdown', begin)
    window.removeEventListener('keydown', begin)
  }
  window.addEventListener('pointerdown', begin)
  window.addEventListener('keydown', begin)
  const off = subscribeMuted(apply)
  return () => {
    window.removeEventListener('pointerdown', begin)
    window.removeEventListener('keydown', begin)
    off()
    audio?.pause()
    audio = null
    started = false
    installed = false
  }
}
