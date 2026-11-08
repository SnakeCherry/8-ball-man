import { useEffect, useState } from 'react'
import { NextBar } from '../components/NextBar'
import { PixelArt } from '../components/PixelArt'
import { PriorityMixer } from '../components/PriorityMixer'
import { PixelButton, PixelCard, PixelIcon, Label, Title } from '../components/ui'
import { getDecision } from '../data/decisions'
import { adviceFor, buildFacts, plainAdvice } from '../lib/advice'
import { isMuted, setMuted } from '../lib/sound'
import { speak, stopSpeaking } from '../lib/speech'
import { suggestWith } from '../lib/suggest'
import { useAppStore } from '../store/useAppStore'

/** The priority screen: slide money, time and health to say what matters, watch the options re-rank, then take one. */
export function Choose() {
  const decisionId = useAppStore((s) => s.decisionId)
  const weights = useAppStore((s) => s.weights)
  const usual = useAppStore((s) => s.usual)
  const session = useAppStore((s) => s.session)
  const setWeights = useAppStore((s) => s.setWeights)
  const setUsual = useAppStore((s) => s.setUsual)
  const commit = useAppStore((s) => s.commitChoice)
  const [manual, setManual] = useState<string | null>(null)
  const [showUsual, setShowUsual] = useState(false)
  const [advice, setAdvice] = useState('')

  const d = decisionId ? getDecision(decisionId) : null
  const sug = d ? suggestWith(d, weights) : null
  const effective = sug?.weights ?? null
  const adviceKey = d && effective ? `${d.id}|${effective.cost.toFixed(2)}|${effective.time.toFixed(2)}|${effective.health.toFixed(2)}` : ''

  // leaving the screen stops the voice
  useEffect(() => () => stopSpeaking(), [])

  // the plain-English line is instant and always right; Qwen's wording replaces it a moment after you stop sliding
  useEffect(() => {
    if (!d || !effective) return
    const facts = buildFacts(d, effective, usual[d.id] ?? d.usualId)
    setAdvice(plainAdvice(facts))
    let live = true
    const t = window.setTimeout(() => void adviceFor(facts).then((text) => live && setAdvice(text)), 650)
    return () => {
      live = false
      window.clearTimeout(t)
    }
    // adviceKey captures everything the facts depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adviceKey])

  if (!d || !sug || !effective) return null
  const { suggested } = sug
  const usualId = usual[d.id] ?? d.usualId
  const usualOpt = d.options.find((o) => o.id === usualId)!
  // the best fit is preselected until the student picks something else themselves
  const selected = d.options.find((o) => o.id === (manual ?? suggested.id)) ?? suggested

  return (
    <div className="page-fill-flow lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-12">
      <section aria-labelledby="step-priority" className="min-w-0">
        <Title className="mb-1">
          <span id="step-priority">What matters most to you this week?</span>
        </Title>
        {weights !== null && session.length > 0 && <p className="mb-2 text-[15px] font-semibold">Using what you picked for the last habit. Change it if this one is different.</p>}
        <p className="mb-4 text-[15px] text-muted">Tap money, time and health from most to least important and the options re-rank. Prefer sliders? Switch below.</p>
        <PriorityMixer
          key={d.id}
          options={d.options}
          usual={usualOpt}
          weights={effective}
          chosen={weights !== null}
          selectedId={selected.id}
          onSelect={setManual}
          onChange={(w) => {
            setWeights(w)
            setManual(null)
          }}
        />
      </section>

      <div className="min-w-0 space-y-6 lg:sticky lg:top-6">
        <PixelCard className="space-y-3 bg-white">
          <div className="flex items-center justify-between gap-2">
            <Label>Our suggestion</Label>
            <PixelButton
              variant="white"
              className="!min-h-[44px] !px-3 !py-1 text-[14px]"
              aria-label="Hear our suggestion"
              onClick={() => {
                if (isMuted()) setMuted(false)
                void speak(`We suggest ${suggested.name}. ${advice}`)
              }}
            >
              <span className="flex items-center gap-2">
                <PixelIcon name="volume" size={2} />
                Hear it
              </span>
            </PixelButton>
          </div>
          <p className="flex items-center gap-3 text-[24px] leading-tight">
            <PixelArt name={suggested.icon} size={3} />
            {suggested.name}
          </p>
          <p className="text-[18px] leading-snug" aria-live="polite">
            {advice}
          </p>
        </PixelCard>

        <div>
          <button type="button" aria-expanded={showUsual} onClick={() => setShowUsual((v) => !v)} className="pbtn pbtn-white w-full">
            {showUsual ? 'Hide usual' : `Your usual: ${usualOpt.name}`}
          </button>
          {showUsual && (
            <div className="mt-3 text-[15px]">
              <p>We measure your savings against your usual. Change it if it isn't right.</p>
              <div className="mt-2 grid grid-cols-3 gap-3" role="group" aria-label="Change your usual option">
                {d.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={usualId === o.id}
                    onClick={() => setUsual(d.id, o.id)}
                    className="pbox-flat pselect px-1 py-2 text-center text-[14px] leading-tight"
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <NextBar>
        <PixelButton className="w-full" data-fx="pound" onClick={() => commit(selected.id)}>
          {selected.id === suggested.id ? `Take ${selected.name}` : `Choose ${selected.name}`}
        </PixelButton>
      </NextBar>
    </div>
  )
}
