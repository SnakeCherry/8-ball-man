import { useCallback, useEffect, useRef, useState } from 'react'
import { BARS } from '../components/VoiceBits'
import { startRecording } from './recorder'
import type { Recording } from './recorder'
import { setLevel } from './level'
import { play } from './sound'
import { createSilenceTracker } from './vad'
import { listen, supportsListening, transcribe, whisperAvailable } from './speech'

export type SpeechEngine = 'checking' | 'whisper' | 'browser' | 'none'
export type SpeechPhase = 'idle' | 'recording' | 'decoding' | 'listening'

/**
 * Speech to text for a whole sentence. Tap to talk through Whisper on the Spark when it is up (it stops when you pause),
 * otherwise through the browser's recogniser. `onText` gets the final sentence.
 */
export function useSpeechInput(onText: (text: string) => void) {
  const [engine, setEngine] = useState<SpeechEngine>('checking')
  const [phase, setPhase] = useState<SpeechPhase>('idle')
  const [levels, setLevels] = useState<number[]>([])
  const [msg, setMsg] = useState('')
  const rec = useRef<Recording | null>(null)
  const stopBrowser = useRef<(() => void) | null>(null)
  const pressing = useRef(false)
  const alive = useRef(true)
  const finishRef = useRef<() => void>(() => undefined)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

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

  const begin = useCallback(async () => {
    if (phase !== 'idle') return
    pressing.current = true
    setMsg('')
    setLevels([])
    play('click')
    try {
      const quiet = createSilenceTracker()
      const r = await startRecording((l) => {
        setLevels((prev) => [...prev.slice(-(BARS - 1)), l])
        setLevel(l)
        // tapped to start: stop by itself once they pause
        if (rec.current && quiet.push(l, performance.now())) finishRef.current()
      })
      if (!pressing.current || !alive.current) {
        r.cancel() // let go before the mic opened
        return
      }
      rec.current = r
      setPhase('recording')
    } catch {
      setMsg('Mic is blocked. Allow it in your browser, or type instead.')
    }
  }, [phase])

  const finish = useCallback(async () => {
    pressing.current = false
    const r = rec.current
    if (!r) return
    rec.current = null
    setPhase('decoding')
    try {
      const wav = await r.stop()
      if (!wav) throw new Error('too short')
      const text = (await transcribe(wav)).trim()
      if (!text) throw new Error('nothing heard')
      if (alive.current) onTextRef.current(text)
    } catch {
      setMsg("Couldn't hear that. Hold and try again, or type it.")
    }
    if (alive.current) setPhase('idle')
  }, [])

  finishRef.current = () => void finish()

  const toggleBrowser = useCallback(() => {
    if (phase === 'listening') {
      stopBrowser.current?.()
      return
    }
    setMsg('')
    setPhase('listening')
    play('click')
    let last = ''
    stopBrowser.current = listen(
      (t) => (last = t),
      (error) => {
        setPhase('idle')
        if (error === 'not-allowed' || error === 'service-not-allowed') setMsg('Mic is blocked. Allow it in your browser, or type instead.')
        else if (last.trim() && alive.current) onTextRef.current(last.trim())
        else setMsg("Didn't catch that. Try again, or type it.")
      },
    )
  }, [phase])

  return { engine, phase, levels, msg, begin, finish, toggleBrowser }
}
