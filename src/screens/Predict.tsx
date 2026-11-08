import { useCallback, useRef, useState } from 'react'
import { PixelArt } from '../components/PixelArt'
import { PixelButton, Label } from '../components/ui'
import { VoiceGuess } from '../components/VoiceGuess'
import { getDecision } from '../data/decisions'
import { gbp } from '../lib/format'
import { sliderMax, sliderStep } from '../lib/guess'
import { play } from '../lib/sound'
import { useAppStore } from '../store/useAppStore'

/** Guess your usual habit's monthly cost: drag or say a number, then lock it in. No clock. */
export function Predict() {
  const decisionId = useAppStore((s) => s.decisionId)
  const usual = useAppStore((s) => s.usual)
  const setGuess = useAppStore((s) => s.setGuess)
  const go = useAppStore((s) => s.go)

  const d = decisionId ? getDecision(decisionId) : null
  const max = d ? sliderMax(d) : 100
  const step = sliderStep(max)
  const [value, setValue] = useState(() => Math.round(max / 2 / step) * step)
  const valueRef = useRef(value)
  const lockedRef = useRef(false)
  valueRef.current = value

  // locks whatever the slider shows, once
  const lock = useCallback(() => {
    if (lockedRef.current) return
    lockedRef.current = true
    play('lock')
    setGuess(valueRef.current)
    go('reveal')
  }, [setGuess, go])

  // a spoken number moves the slider and gives the big £ a pop
  const [pop, setPop] = useState(0)
  const spoken = useCallback(
    (n: number) => {
      setValue(Math.min(max, Math.max(0, Math.round(n / step) * step)))
      setPop((k) => k + 1)
    },
    [max, step],
  )

  if (!d) return null
  const usualOpt = d.options.find((o) => o.id === (usual[d.id] ?? d.usualId))!

  return (
    <div className="mx-auto max-w-6xl space-y-6 lg:grid lg:min-h-[calc(100dvh-var(--chrome))] lg:grid-cols-2 lg:items-center lg:gap-16 lg:space-y-0">
      <div className="space-y-6">
      <div>
        <Label>
          <PixelArt name={d.icon} size={2} /> {d.title}
        </Label>
        <h2 id="guess-q" className="mt-3 text-[22px] leading-snug lg:text-[30px]">
          How much does your usual <b>{usualOpt.name}</b> cost you a month?
        </h2>
        <p className="mt-1 text-[15px] text-muted">About {d.timesPerMonth} times a month. Drag the slider or say a number, then lock it in.</p>
      </div>

      </div>

      <div className="space-y-6">
      <section aria-labelledby="guess-q" className="space-y-4">
        <p key={pop} className={`num text-center text-[56px] font-semibold leading-none lg:text-[84px] ${pop ? 'anim-pop' : ''}`} aria-live="off">
          {gbp(value)}
        </p>
        <div>
          <input
            type="range"
            className="pslider"
            min={0}
            max={max}
            step={step}
            value={value}
            aria-label={`Monthly cost of your usual ${usualOpt.name}, in pounds`}
            onChange={(e) => setValue(Number(e.target.value))}
          />
          <div className="num mt-1 flex justify-between text-[15px] text-muted">
            <span>{gbp(0)}</span>
            <span>{gbp(max)}</span>
          </div>
        </div>
      </section>

      <VoiceGuess onAmount={spoken} />
      <PixelButton className="w-full" data-fx="pound" onClick={lock}>
        Lock in now
      </PixelButton>
      </div>
    </div>
  )
}
