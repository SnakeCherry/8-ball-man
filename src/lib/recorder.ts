import { encodeWav, resample } from './wav'

export const WHISPER_RATE = 16_000

export interface Recording {
  /** stop and get a 16 kHz mono WAV, or null if nothing usable was captured */
  stop: () => Promise<Blob | null>
  /** abandon without a result */
  cancel: () => void
}

/**
 * Record the microphone. `onLevel` gets 0..1 loudness about 20 times a second for the pixel meter.
 * Capture is raw PCM through the audio graph, so no audio-format decoding is needed later.
 */
export async function startRecording(onLevel: (level: number) => void): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
  const ctx = new AudioContext()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  const proc = ctx.createScriptProcessor(4096, 1, 1) // old API but works everywhere and needs no worklet file
  const chunks: Float32Array[] = []
  proc.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
  source.connect(analyser)
  source.connect(proc)
  proc.connect(ctx.destination) // outputs silence; some browsers need it connected to keep firing

  const buf = new Uint8Array(analyser.fftSize)
  const timer = window.setInterval(() => {
    analyser.getByteTimeDomainData(buf)
    let peak = 0
    for (const b of buf) peak = Math.max(peak, Math.abs(b - 128))
    onLevel(Math.min(1, peak / 64))
  }, 50)

  const release = () => {
    window.clearInterval(timer)
    proc.disconnect()
    source.disconnect()
    stream.getTracks().forEach((t) => t.stop())
    void ctx.close()
    onLevel(0)
  }

  return {
    stop: async () => {
      const rate = ctx.sampleRate
      release()
      const total = chunks.reduce((n, c) => n + c.length, 0)
      if (total < rate * 0.3) return null // under 0.3 s is a mis-tap
      const all = new Float32Array(total)
      let o = 0
      for (const c of chunks) {
        all.set(c, o)
        o += c.length
      }
      return encodeWav(resample(all, rate, WHISPER_RATE), WHISPER_RATE)
    },
    cancel: release,
  }
}
