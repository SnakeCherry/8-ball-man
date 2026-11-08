import { pulseLevel, trackPlaybackLevel } from './level'
import { musicHold } from './music'
import { isMuted } from './sound'

const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

/**
 * Turn what someone said into a whole-pound amount: "£40", "52 pounds", "about sixty",
 * "forty quid", "fifty-two", "a hundred and twenty", "two fifty" (250). Null when there is no number.
 */
export function parseSpokenAmount(text: string): number | null {
  const s = text.toLowerCase().replace(/,/g, '').replace(/-/g, ' ')
  const digits = s.match(/\d+(?:\.\d+)?/)
  if (digits) return Math.round(Number(digits[0]))

  const words = s.split(/\s+/).filter(Boolean)
  let total = 0
  let cur = 0
  let seen = false
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (w in UNITS) {
      seen = true
      // "two fifty": a bare unit straight before a tens word reads as hundreds
      if (cur === 0 && w !== 'zero' && UNITS[w] < 10 && words[i + 1] in TENS) cur = UNITS[w] * 100
      else cur += UNITS[w]
    } else if (w in TENS) {
      seen = true
      cur += TENS[w]
    } else if (w === 'hundred') {
      seen = true
      cur = (cur || 1) * 100
    } else if (w === 'thousand') {
      seen = true
      total += (cur || 1) * 1000
      cur = 0
    }
  }
  return seen ? total + cur : null
}

/* ---- browser speech: recognition (Chromium, Safari) and synthesis ---- */

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const supportsListening = (): boolean => recognitionCtor() !== null

/**
 * Start listening. `onText` gets the whole transcript so far (interim included).
 * Returns a stop function; `onEnd` fires once, with an error code if there was one.
 */
export function listen(onText: (text: string) => void, onEnd: (error?: string) => void): () => void {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    onEnd('unsupported')
    return () => {}
  }
  const rec = new Ctor()
  rec.lang = 'en-GB'
  rec.interimResults = true
  rec.continuous = false
  let error: string | undefined
  let done = false
  rec.onresult = (e) => {
    const text = Array.from(e.results, (r) => r[0].transcript).join(' ')
    onText(text)
  }
  rec.onerror = (e) => {
    error = e.error
  }
  rec.onend = () => {
    if (done) return
    done = true
    onEnd(error)
  }
  try {
    rec.start()
  } catch {
    done = true
    onEnd('failed')
  }
  return () => {
    try {
      rec.stop()
    } catch {
      /* already stopped */
    }
  }
}

/**
 * Make written amounts sound right: "£7.50" is "7 pounds 50", "1 h 20 min" is "1 hour 20 minutes",
 * "8/10" is "8 out of 10". Speech models read the raw symbols badly.
 */
export function forSpeech(text: string): string {
  const unit = (n: string, one: string, many: string) => `${n} ${n === '1' ? one : many}`
  return text
    .replace(/£(\d+)\.(\d{2})/g, (_m, p: string, pence: string) => {
      if (pence === '00') return unit(p, 'pound', 'pounds')
      return p === '0' ? unit(String(Number(pence)), 'pence', 'pence') : `${unit(p, 'pound', 'pounds')} ${Number(pence)}`
    })
    .replace(/£(\d+)/g, (_m, p: string) => unit(p, 'pound', 'pounds'))
    .replace(/(\d+) h (\d+) min/g, (_m, h: string, m: string) => `${unit(h, 'hour', 'hours')} ${unit(m, 'minute', 'minutes')}`)
    .replace(/(\d+) h\b/g, (_m, h: string) => unit(h, 'hour', 'hours'))
    .replace(/(\d+) min\b/g, (_m, m: string) => unit(m, 'minute', 'minutes'))
    .replace(/(\d+)\/10/g, '$1 out of 10')
}

/* ---- speaking: Piper on the Spark first (scripts/tts_server.py), the browser's own voice as the fallback ---- */

let playing: HTMLAudioElement | null = null
let speakToken = 0
let remoteDownUntil = 0
let elevenDownUntil = 0
/** ElevenLabs is a cloud service, so it stays off unless VITE_USE_ELEVENLABS=1 is set in .env.local (everything else runs on our own hardware). */
const ELEVEN_ON = import.meta.env.VITE_USE_ELEVENLABS === '1'
const audioCache = new Map<string, string>()

/** Stop whatever is being said (both voices). */
export function stopSpeaking(): void {
  speakToken++
  playing?.pause()
  playing = null
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

function speakInBrowser(text: string): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve()
  return new Promise((resolve) => {
    try {
      speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-GB'
      u.rate = 1.05
      const voice = speechSynthesis.getVoices().find((v) => v.lang === 'en-GB')
      if (voice) u.voice = voice
      const stopPulse = pulseLevel()
      musicHold('voice', true)
      const done = () => {
        stopPulse()
        musicHold('voice', false)
        resolve()
      }
      u.onend = done
      u.onerror = done
      window.setTimeout(done, 8000) // some browsers never fire onend
      speechSynthesis.speak(u)
    } catch {
      resolve() // speech is a nicety
    }
  })
}

/** Say something and wait until it has finished (straight away when muted or when nothing can speak). */
export const speakAndWait = (text: string): Promise<void> => speak(text, true)

/** Say something out loud. Quiet when muted. A newer call cuts off an older one. */
export async function speak(text: string, untilDone = false): Promise<void> {
  if (isMuted()) return
  stopSpeaking()
  const mine = speakToken
  const said = forSpeech(text)
  try {
    let url = audioCache.get(said)
    if (!url && ELEVEN_ON && Date.now() >= elevenDownUntil) {
      // ElevenLabs first (the key stays in the dev server, see vite.config.ts); on any failure we leave it alone for a minute
      try {
        const r = await fetch('/api/eleven/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: said, model_id: 'eleven_flash_v2_5' }),
          signal: AbortSignal.timeout(8000),
        })
        if (!r.ok) throw new Error(`eleven ${r.status}`)
        url = URL.createObjectURL(await r.blob())
        audioCache.set(said, url)
      } catch {
        elevenDownUntil = Date.now() + 60_000
      }
    }
    if (!url) {
      if (Date.now() < remoteDownUntil) throw new Error('tts recently down')
      const r = await fetch('/api/tts/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: said }),
        signal: AbortSignal.timeout(6000),
      })
      if (!r.ok) throw new Error(`tts ${r.status}`)
      url = URL.createObjectURL(await r.blob())
      audioCache.set(said, url)
    }
    if (mine !== speakToken || isMuted()) return // something newer started, or it was muted meanwhile
    const audio = new Audio(url)
    playing = audio
    await audio.play()
    trackPlaybackLevel(audio)
    musicHold('voice', true)
    ;['ended', 'pause', 'error'].forEach((ev) => audio.addEventListener(ev, () => musicHold('voice', false), { once: true }))
    if (untilDone) await new Promise<void>((done) => ['ended', 'pause', 'error'].forEach((ev) => audio.addEventListener(ev, () => done(), { once: true })))
  } catch {
    remoteDownUntil = Date.now() + 20_000
    if (mine === speakToken && !isMuted()) await speakInBrowser(said)
  }
}

/* ---- Whisper service (scripts/whisper_server.py), reached through the Vite proxy ---- */

const timeout = (ms: number): AbortSignal => AbortSignal.timeout(ms)

/** True when the Whisper service answers; the app falls back to the browser recogniser otherwise. */
export async function whisperAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/asr/health', { signal: timeout(1500) })
    if (!r.ok) return false
    const j = (await r.json()) as { ok?: boolean }
    return j.ok === true
  } catch {
    return false
  }
}

/** Send a WAV clip to Whisper. Throws on any failure so the caller can fall back. */
export async function transcribe(wav: Blob, mode: 'guess' | 'speech' = 'guess'): Promise<string> {
  const r = await fetch(`/api/asr/transcribe?mode=${mode}`, { method: 'POST', body: wav, headers: { 'Content-Type': 'audio/wav' }, signal: timeout(6000) })
  if (!r.ok) throw new Error(`transcribe ${r.status}`)
  const j = (await r.json()) as { text?: string }
  return j.text ?? ''
}
