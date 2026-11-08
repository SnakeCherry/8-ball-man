import { useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelButton, PixelCard, Label } from './ui'
import { GOAL_PRESETS } from '../data/copy'
import { gbp } from '../lib/format'
import { daysLeft, isoInDays } from '../lib/goal'
import type { IconName } from '../lib/pixelart'
import type { Goal } from '../lib/types'

/** Switch what you are saving for, how much, and by when. The money you have saved so far stays. */
export function GoalEditor({ goal, onSave }: { goal: Goal; onSave: (g: Goal) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(goal.name)
  const [icon, setIcon] = useState<IconName>(goal.icon)
  const [target, setTarget] = useState(goal.target)
  const [days, setDays] = useState(daysLeft(goal))

  const weekly = Math.max(0, target - goal.saved) / (days / 7)

  return (
    <PixelCard className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Your goal</Label>
        <PixelButton variant="white" className="!min-h-[36px] !px-3 !py-1 text-[13px]" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Change goal'}
        </PixelButton>
      </div>

      {open && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Pick a goal">
            {GOAL_PRESETS.map((g) => (
              <button
                key={g.name}
                type="button"
                aria-pressed={name === g.name}
                onClick={() => {
                  setName(g.name)
                  setIcon(g.icon)
                  setTarget(g.target)
                  setDays(g.days)
                }}
                className="pbox-flat pselect flex items-center gap-2 px-2 py-2 text-[15px] leading-tight"
              >
                <PixelArt name={g.icon} size={2} /> {g.name}
              </button>
            ))}
          </div>

          <label className="block text-[15px]">
            How much: <b className="num">{gbp(target)}</b>
            <input type="range" className="pslider mt-2" min={20} max={1000} step={10} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </label>
          <label className="block text-[15px]">
            By when: <b className="num">{days} days from now</b>
            <input type="range" className="pslider mt-2" min={7} max={180} step={1} value={days} onChange={(e) => setDays(Number(e.target.value))} />
          </label>
          <p className="num text-[15px]">
            That is about <b>{gbp(weekly)}</b> a week from here.
          </p>
          <PixelButton
            className="w-full"
            data-fx="star"
            onClick={() => {
              onSave({ name, icon, target, saved: Math.min(goal.saved, target), dueISO: isoInDays(days) })
              setOpen(false)
            }}
          >
            Save goal
          </PixelButton>
        </div>
      )}
    </PixelCard>
  )
}
