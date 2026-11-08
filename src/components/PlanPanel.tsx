import type { ReactNode } from 'react'
import { PixelArt } from './PixelArt'
import { gbp, mins } from '../lib/format'
import { lifeEachText } from '../lib/life'
import type { IconName } from '../lib/pixelart'

interface PanelOption {
  name: string
  icon: IconName
  costGBP: number
  timeMin: number
  health: number
}

/** One habit: its title, its (up to three) options, and whatever goes underneath. Missing options show as placeholders. */
export function PlanPanel({
  title,
  icon,
  options,
  usualId,
  footer,
}: {
  title: string | null
  icon?: IconName
  options: (PanelOption & { id?: string })[]
  usualId?: string
  footer?: ReactNode
}) {
  const usualOpt = options.find((o) => o.id === usualId) ?? options[0]
  // when every option has the same health there is nothing to say about it
  const healthMatters = options.some((o) => o.health !== options[0].health)
  return (
    <div className="space-y-3 border-4 border-ink bg-white p-3">
      <p className="flex items-center gap-2 text-[19px] leading-tight">
        {icon ? <PixelArt name={icon} size={2} /> : <PixelArt name="coin" size={2} className="anim-blink" />}
        <b>{title ?? '…'}</b>
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => {
          const o = options[i]
          const usual = o ? (usualId ? o.id === usualId : i === 0) : false
          return o ? (
            <div key={i} className={`anim-pop border-4 border-ink p-3 ${usual ? 'bg-lime' : 'bg-white'}`}>
              <p className="text-[17px] leading-tight">
                <PixelArt name={o.icon} size={2} /> {o.name}
              </p>
              <p className="num mt-1 text-[15px]">
                {gbp(o.costGBP)} · {mins(o.timeMin)}
                {healthMatters && (
                  <>
                    {' · '}
                    <PixelArt name="heart" size={1} /> {usual ? 'Your usual' : lifeEachText(o, usualOpt)}
                  </>
                )}
              </p>
              {usual && <p className="mt-1 font-pixel text-[12px] uppercase">Your usual</p>}
            </div>
          ) : (
            <div key={i} className="anim-blink flex h-[72px] items-center justify-center border-4 border-dashed border-ink/40" aria-hidden="true">
              <PixelArt name={(['coin', 'dumbbell', 'heart'] as const)[i]} size={3} />
            </div>
          )
        })}
      </div>
      {footer}
    </div>
  )
}
