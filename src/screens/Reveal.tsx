import { useEffect, useState } from 'react'
import { AXIS_ICON, axisFormat } from '../components/parts'
import { CountUp } from '../components/CountUp'
import { PixelCard, PixelIcon, Label } from '../components/ui'
import { ALL_RIGHT, AXIS_LABEL, GUESS_RIGHT } from '../data/copy'
import { getDecision } from '../data/decisions'
import { biggestSurprise, countCorrect } from '../lib/explain'
import { AXES, axisValue, bestOn } from '../lib/scoring'
import { Choose } from './Choose'
import { useAppStore } from '../store/useAppStore'

const STEP = 0.7 // seconds between axes

export function Reveal() {
  const decisionId = useAppStore((s) => s.decisionId)
  const guesses = useAppStore((s) => s.guesses)
  // tap anywhere to skip the staged reveal: every delay drops to zero
  const [skipped, setSkipped] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), (AXES.length * STEP + 0.4) * 1000)
    return () => window.clearTimeout(t)
  }, [])
  if (!decisionId) return null
  const d = getDecision(decisionId)
  const surprise = biggestSurprise(d, guesses)
  const correct = countCorrect(d, guesses)
  const step = skipped ? 0 : STEP
  const after = AXES.length * step

  return (
    <div className="space-y-5" onClick={skipped ? undefined : () => setSkipped(true)}>
      <PixelCard>
        <Label>The real numbers</Label>
        <p className="mt-2 text-[20px]">
          {d.emoji} {d.title}
        </p>
      </PixelCard>

      {AXES.map((axis, i) => {
        const best = bestOn(d.options, axis)
        const right = guesses[axis] === best.id
        return (
          <section key={axis} className="anim-flip" style={{ animationDelay: `${i * step}s` }}>
            <p className="mb-2 flex items-center gap-2 font-pixel text-[11px] uppercase">
              <PixelIcon name={AXIS_ICON[axis]} size={3} />
              {AXIS_LABEL[axis].short}: {AXIS_LABEL[axis].word}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {d.options.map((o) => {
                const isBest = o.id === best.id
                const guessed = guesses[axis] === o.id
                return (
                  <div
                    key={o.id}
                    data-on={isBest}
                    className="pcard relative flex flex-col items-center gap-1 px-1 py-3 text-center data-[on=true]:bg-lime"
                  >
                    <span className="text-[22px] leading-none" aria-hidden="true">
                      {o.emoji}
                    </span>
                    <span className="text-[13px] leading-tight">{o.name}</span>
                    <span className="num text-[24px] font-semibold leading-none">
                      <CountUp value={axisValue(o, axis)} format={axisFormat[axis]} delayMs={i * step * 1000 + (skipped ? 0 : 250)} />
                    </span>
                    {isBest && <span className="font-pixel text-[8px] uppercase">best</span>}
                    {guessed && (
                      <span
                        className={`absolute -right-2 -top-3 flex items-center gap-1 border-4 border-ink px-1 font-pixel text-[8px] uppercase ${right ? 'anim-hop bg-white' : 'anim-shake bg-red'}`}
                        style={{ animationDelay: `${i * step + (skipped ? 0 : 0.5)}s` }}
                      >
                        <PixelIcon name={right ? 'check' : 'cross'} size={2} />
                        You
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            {right && <p className="mt-2 text-[15px]">{GUESS_RIGHT}</p>}
          </section>
        )
      })}

      <div className="anim-slide" style={{ animationDelay: `${after}s` }}>
        <PixelCard className="bg-white">
          <Label>{surprise ? 'Worth knowing' : 'Nicely done'}</Label>
          <p className="mt-2 text-[18px] leading-snug">{surprise ? surprise.text : ALL_RIGHT}</p>
          <p className="mt-2 text-[14px] text-ink/70">
            You got {correct} out of 3. Numbers are illustrative estimates.
          </p>
        </PixelCard>
      </div>

      <div className="anim-slide" style={{ animationDelay: `${after + (skipped ? 0 : 0.4)}s` }}>
        <Choose delay={after + (skipped ? 0 : 0.4)} ready={skipped || timedOut} />
      </div>
    </div>
  )
}
