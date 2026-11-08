import { useCallback, useEffect, useRef, useState } from 'react'
import { startRecording } from '../lib/recorder'
import type { Recording } from '../lib/recorder'
import { play } from '../lib/sound'
import { listen, parseSpokenAmount, supportsListening, transcribe, whisperAvailable } from '../lib/speech'
import { PixelButton, PixelIcon } from './ui'
import { BARS, Equaliser, Typed } from './VoiceBits'

type Engine = 'checking' | 'whisper' | 'browser' | 'none'
type Phase = 'idle' | 'recording' | 'decoding' | 'listening'

/**
 * Say your guess. With the Whisper service up it is hold-to-talk with a live pixel equaliser; otherwise it
 * falls back to the browser's own recogniser, and with neither the button is hidden.
 */
export function VoiceGuess({ onAmount }: { onAmount: (pounds: number) => void }) {
  const [engine, setEngine] = useState<Engine>('checking')
  const [phase, setPhase] = useState<Phase>('idle')
  const [levels, setLevels] = useState<number[]>([])
  const [heard, setHeard] = useState('')
  const [msg, setMsg] = useState('')
  const rec = useRef<Recording | null>(null)
  const stopBrowser = useRef<(() => void) | null>(null)
  const pressing = useRef(false)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    void whisperAvailable().then((ok) => {
      if (alive.current) setEngine(ok ? 'whisper' : supportsListening() ? 'browser' : 'none')
    })
    return () => {
      alive.current = false
      rec.current?.cancel()
      stopBrowser.current?.()
    }
  }, [])

  const handleText = useCallback(
    (text: string) => {
      setHeard(text)
      const n = parseSpokenAmount(text)
      if (n !== null) onAmount(n)
      return n !== null
    },
    [onAmount],
  )

  /* ---- Whisper: hold to talk ---- */
  const begin = async () => {
    if (phase !== 'idle') return
    pressing.current = true
    setMsg('')
    setHeard('')
    setLevels([])
    play('click')
    try {
      const r = await startRecording((l) => setLevels((prev) => [...prev.slice(-(BARS - 1)), l]))
      if (!pressing.current || !alive.current) {
        r.cancel() // let go before the mic opened
        return
      }
      rec.current = r
      setPhase('recording')
    } catch {
      setMsg('Mic is blocked. Allow it in your browser, or use the slider.')
    }
  }
  const finish = async () => {
    pressing.current = false
    const r = rec.current
    if (!r) return
    rec.current = null
    setPhase('decoding')
    try {
      const wav = await r.stop()
      if (!wav) throw new Error('too short')
      const ok = handleText(await transcribe(wav))
      if (!ok) setMsg("Didn't catch a number. Hold and try again, or use the slider.")
      else play('lock')
    } catch {
      setMsg("Couldn't hear that. Hold and try again, or use the slider.")
    }
    if (alive.current) setPhase('idle')
  }

  /* ---- browser fallback: tap to start ---- */
  const toggleBrowser = () => {
    if (phase === 'listening') {
      stopBrowser.current?.()
      return
    }
    setMsg('')
    setHeard('')
    setPhase('listening')
    play('click')
    stopBrowser.current = listen(handleText, (error) => {
      setPhase('idle')
      if (error === 'not-allowed' || error === 'service-not-allowed') setMsg('Mic is blocked. Allow it in your browser, or use the slider.')
      else if (error === 'no-speech') setMsg("Didn't catch that. Try again, or use the slider.")
    })
  }

  if (engine === 'checking' || engine === 'none') return null

  const whisper = engine === 'whisper'
  const busy = phase === 'recording' || phase === 'listening'
  const label =
    phase === 'recording' ? 'Listening… let go when done' : phase === 'decoding' ? 'Decoding…' : phase === 'listening' ? 'Listening… say a number' : whisper ? 'Hold to shout your guess' : 'Shout your guess'

  return (
    <div className="space-y-2 text-center">
      <PixelButton
        variant="white"
        className="w-full touch-none select-none"
        data-fx="sparkle"
        aria-pressed={busy}
        disabled={phase === 'decoding'}
        {...(whisper
          ? {
              onPointerDown: (e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                void begin()
              },
              onPointerUp: () => void finish(),
              onPointerCancel: () => void finish(),
              onKeyDown: (e) => {
                if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                  e.preventDefault()
                  void begin()
                }
              },
              onKeyUp: (e) => {
                if (e.key === ' ' || e.key === 'Enter') void finish()
              },
            }
          : { onClick: toggleBrowser })}
      >
        <span className="flex items-center justify-center gap-2">
          <PixelIcon name="mic" size={3} className={busy ? 'anim-blink' : ''} />
          {label}
        </span>
      </PixelButton>
      {whisper && (phase === 'recording' || phase === 'decoding') && <Equaliser levels={levels} active={phase === 'recording'} />}
      <p className="min-h-[1.5em] text-[15px] text-ink/70" aria-live="polite">
        {heard ? (
          <>
            Heard: "<Typed text={heard} />"
          </>
        ) : (
          msg
        )}
        {heard && msg}
      </p>
    </div>
  )
}
