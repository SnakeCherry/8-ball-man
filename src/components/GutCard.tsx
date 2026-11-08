import { useState } from 'react'
import { PixelButton, PixelCard, Label } from './ui'
import { APP_NAME } from '../data/copy'
import { gutScore, gutShareText } from '../lib/gut'
import type { GutTally } from '../lib/gut'
import { CountUp } from './CountUp'

/** The share-worthy stat: how close your gut gets to the real monthly cost of your habits. */
export function GutCard({
  gut,
  streak,
  bestStreak,
}: {
  gut: GutTally
  streak: number
  bestStreak: number
}) {
  const score = gutScore(gut)
  const [note, setNote] = useState('')
  if (score.pct === null) return null

  const share = async () => {
    const text = gutShareText(APP_NAME, score, gut, bestStreak)
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        setNote('Copied. Paste it anywhere.')
      }
    } catch {
      // the share sheet was dismissed or clipboard blocked: nothing to do
    }
  }

  const boxes = [
    { label: 'Guesses', value: `${gut.n}` },
    { label: 'Close', value: `${gut.close}/${gut.n}` },
    { label: 'Best run', value: `${bestStreak}` },
  ]

  return (
    <PixelCard className="space-y-3 bg-lime">
      <Label className="[&>span]:bg-white">Your gut score</Label>
      <p className="num text-[56px] font-semibold leading-none">
        <CountUp value={score.pct} format={(n) => `${Math.round(n)}%`} delayMs={200} />
      </p>
      <p className="font-pixel text-[12px] uppercase">{score.tier}</p>
      <ul className="num grid grid-cols-3 gap-2 text-[15px]">
        {boxes.map((b) => (
          <li key={b.label} className="border-4 border-ink bg-white px-1 py-1 text-center leading-tight">
            {b.label}
            <br />
            <b>{b.value}</b>
          </li>
        ))}
      </ul>
      <p className="num text-[15px]">
        Close guesses in a row: <b>{streak}</b> · best <b>{bestStreak}</b>
      </p>
      <p className="text-[14px]">
        Scored on how close you get to the real monthly cost. Within 25% is close.
      </p>
      <PixelButton variant="white" data-fx="star" className="w-full" onClick={share}>
        Share my score
      </PixelButton>
      {note && (
        <p role="status" className="text-[14px]">
          {note}
        </p>
      )}
    </PixelCard>
  )
}
