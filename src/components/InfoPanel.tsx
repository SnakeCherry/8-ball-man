import { useEffect, useState } from 'react'
import { PixelArt } from './PixelArt'
import { PixelCard, PixelIcon, Label } from './ui'
import { defaultInfo, fetchInfo, isSafeUrl } from '../lib/info'
import type { OptionInfo } from '../lib/info'
import type { Decision } from '../lib/types'

/**
 * Useful info for each option instead of a race: the shop's own website, three recipes, a route, where to look,
 * or a tip. Qwen picks what to look up; the links themselves are built in lib/info.ts from real, listed sites.
 */
export function InfoPanel({ decision, focusId }: { decision: Decision; focusId?: string }) {
  const [others, setOthers] = useState(false)
  const [infos, setInfos] = useState<OptionInfo[]>(() => decision.options.map(defaultInfo))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let live = true
    setLoading(true)
    setInfos(decision.options.map(defaultInfo))
    void fetchInfo(decision, (i) => live && setInfos(i)).then((i) => {
      if (live) {
        setInfos(i)
        setLoading(false)
      }
    })
    return () => {
      live = false
    }
  }, [decision])

  return (
    <PixelCard className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Label>Useful info</Label>
        {loading && <span className="anim-blink font-pixel text-[9px] uppercase">Looking it up…</span>}
      </div>
      {(() => {
        const row = (o: Decision['options'][number], big: boolean) => {
          const info = infos[decision.options.indexOf(o)] ?? defaultInfo(o)
          const links = info.links.filter((l) => isSafeUrl(l.url))
          return (
            <li key={o.id} className="space-y-2 border-b-2 border-ink/15 pb-4 last:border-b-0 last:pb-0">
              <p className={`flex flex-wrap items-center gap-2 leading-tight ${big ? 'text-[22px]' : 'text-[18px]'}`}>
                <PixelArt name={o.icon} size={2} />
                <b>{o.name}</b>
                <span className="border-4 border-ink bg-white px-1 font-pixel text-[9px] uppercase">{info.label}</span>
              </p>
              {info.tip && <p className="text-[16px] leading-snug">{info.tip}</p>}
              {links.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {links.map((l) => (
                    <li key={l.url}>
                      <a
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`pbox pselect inline-flex items-center gap-2 leading-tight ${big ? 'px-3 py-2 text-[17px]' : 'px-2 py-1 text-[15px]'}`}
                      >
                        {l.title}
                        <PixelIcon name="arrow" size={2} />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        }
        const focus = decision.options.find((o) => o.id === focusId)
        if (!focus) return <ul className="space-y-4">{decision.options.map((o) => row(o, false))}</ul>
        const rest = decision.options.filter((o) => o.id !== focus.id)
        return (
          <>
            <ul>{row(focus, true)}</ul>
            <button type="button" aria-expanded={others} onClick={() => setOthers((v) => !v)} className="font-pixel text-[11px] uppercase underline">
              {others ? 'Hide other options' : `Other options (${rest.length})`}
            </button>
            {others && <ul className="space-y-4">{rest.map((o) => row(o, false))}</ul>}
          </>
        )
      })()}
      <p className="text-[13px] text-ink/60">Links open in a new tab. Prices and times can change, so check before you go.</p>
    </PixelCard>
  )
}
