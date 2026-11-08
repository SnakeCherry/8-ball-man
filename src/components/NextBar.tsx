import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * The one obvious next step, pinned to the bottom of the screen. Portalled because the screen wrapper animates a
 * transform, which would trap a fixed child. Every step of the flow ends with this same bar.
 */
export function NextBar({ children, above = false }: { children: ReactNode; /** sit above full-screen overlays (the ball page) */ above?: boolean }) {
  return createPortal(
    <div className={`fixed inset-x-0 bottom-0 ${above ? 'z-[60]' : 'z-10'} border-t-4 border-ink bg-white p-3`}>
      <div className="mx-auto max-w-md">{children}</div>
    </div>,
    document.body,
  )
}
