import { spriteSvg } from './sprites'
import type { SpriteName } from './sprites'

/**
 * Click effects: chunky square particles plus one icon that pops and floats up,
 * all in stepped frames. Nodes live in one fixed overlay and clean themselves up.
 */
const COLORS = ['#6ef07f', '#16b77d', '#0a0a0a', '#ffffff']
const MAX_NODES = 40
const LIFETIME_MS = 800
let layer: HTMLDivElement | null = null

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function getLayer(): HTMLDivElement {
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div')
    layer.className = 'fx-layer'
    layer.setAttribute('aria-hidden', 'true')
    document.body.appendChild(layer)
  }
  return layer
}

/** Snap to the 4px grid so motion stays blocky. */
const snap = (n: number) => Math.round(n / 4) * 4

export interface BurstOptions {
  icon?: SpriteName
  emoji?: string
  count?: number
  spread?: number
}

export function burst(x: number, y: number, opts: BurstOptions = {}): void {
  if (reducedMotion()) return
  const root = getLayer()
  const room = MAX_NODES - root.childElementCount
  if (room <= 1) return

  const count = Math.min(opts.count ?? 7, room - 1)
  const spread = opts.spread ?? 48
  const made: HTMLElement[] = []

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6
    const dist = spread * (0.6 + Math.random() * 0.7)
    const p = document.createElement('i')
    p.className = 'fx-particle'
    p.style.left = `${x}px`
    p.style.top = `${y}px`
    p.style.background = COLORS[i % COLORS.length]
    p.style.setProperty('--dx', `${snap(Math.cos(angle) * dist)}px`)
    p.style.setProperty('--dy', `${snap(Math.sin(angle) * dist)}px`)
    made.push(p)
  }

  const icon = document.createElement('span')
  icon.className = 'fx-icon'
  icon.style.left = `${x}px`
  icon.style.top = `${y}px`
  if (opts.emoji) icon.textContent = opts.emoji
  else icon.innerHTML = spriteSvg(opts.icon ?? 'sparkle', 5, '#0a0a0a')
  made.push(icon)

  made.forEach((n) => root.appendChild(n))
  window.setTimeout(() => made.forEach((n) => n.remove()), LIFETIME_MS)
}

export function burstAtElement(el: Element | null, opts: BurstOptions = {}): void {
  if (!el) return
  const r = el.getBoundingClientRect()
  burst(r.left + r.width / 2, r.top + r.height / 2, opts)
}

/** One delegated listener: every button click throws a burst. Returns a cleanup. */
export function installFx(): () => void {
  const onClick = (e: MouseEvent) => {
    const btn = (e.target as Element | null)?.closest?.('button')
    if (!btn || btn.disabled) return
    const r = btn.getBoundingClientRect()
    // keyboard activation reports 0,0: use the button's centre instead
    const keyboard = e.clientX === 0 && e.clientY === 0
    const x = keyboard ? r.left + r.width / 2 : e.clientX
    const y = keyboard ? r.top + r.height / 2 : e.clientY
    const emoji = btn.dataset.emoji
    const icon = btn.dataset.fx as SpriteName | undefined
    burst(x, y, { emoji, icon: emoji ? undefined : (icon ?? 'sparkle') })
  }
  document.addEventListener('click', onClick, true)
  return () => document.removeEventListener('click', onClick, true)
}
