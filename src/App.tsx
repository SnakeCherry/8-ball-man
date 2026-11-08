import { useEffect, useSyncExternalStore } from 'react'
import { FlowBar } from './components/FlowBar'
import { IconGallery } from './components/IconGallery'
import { PixelIcon } from './components/ui'
import type { SpriteName } from './components/ui'
import { APP_NAME } from './data/copy'
import { installFx } from './lib/fx'
import { isMuted, setMuted, subscribeMuted } from './lib/sound'
import { GoalScreen } from './screens/Goal'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
import { Choose } from './screens/Choose'
import { Predict } from './screens/Predict'
import { Recap } from './screens/Recap'
import { Reveal } from './screens/Reveal'
import { useAppStore } from './store/useAppStore'
import type { Screen } from './store/useAppStore'

const TABS: { id: Screen; label: string; icon: SpriteName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'goal', label: 'Goal', icon: 'star' },
  { id: 'recap', label: 'Recap', icon: 'chart' },
]

const FLOW: Partial<Record<Screen, { step: 0 | 1 | 2 }>> = {
  predict: { step: 0 },
  reveal: { step: 1 },
  priority: { step: 2 },
}

export default function App() {
  const screen = useAppStore((s) => s.screen)
  const onboarded = useAppStore((s) => s.onboarded)
  const streak = useAppStore((s) => s.streak)
  const go = useAppStore((s) => s.go)

  useEffect(() => installFx(), [])
  const muted = useSyncExternalStore(subscribeMuted, isMuted)

  const flow = FLOW[screen]
  const showTabs = onboarded && !flow && screen !== 'onboarding'

  const back = () => {
    // Results goes home, not back to the clock: a new round is a new guess
    if (screen === 'predict' || screen === 'reveal') go('home')
    else if (screen === 'priority') go('reveal')
  }
  const backLabel =
    screen === 'priority' ? 'the results' : 'decisions'

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-ink bg-lime">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
          <PixelIcon name="sparkle" size={3} />
          <span className="font-pixel text-[12px] uppercase leading-4">{APP_NAME}</span>
          <button
            type="button"
            aria-pressed={muted}
            aria-label={muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
            onClick={() => setMuted(!muted)}
            className="ml-auto border-4 border-ink bg-white p-1"
          >
            <PixelIcon name={muted ? 'mute' : 'volume'} size={3} />
          </button>
          {onboarded && streak > 0 && (
            <span
              className="num flex items-center gap-1 border-4 border-ink bg-white px-2 py-0.5 text-[16px] leading-tight"
              aria-label={`${streak} close guesses in a row`}
              title="Close guesses in a row"
            >
              <PixelIcon name="star" size={2} color="#16b77d" className="anim-bob" />
              {streak}
            </span>
          )}
        </div>
      </header>

      <main className={`mx-auto max-w-6xl px-6 pt-6 ${screen === 'priority' ? 'pb-32' : 'pb-28'}`}>
        {flow && <FlowBar step={flow.step} onBack={back} backLabel={backLabel} />}
        {/* keyed so each screen (and each guess question) snaps in with a stepped slide */}
        {location.hash === '#icons' ? (
          <IconGallery />
        ) : (
        <div key={screen} className="anim-slide">
          {screen === 'onboarding' && (
            <div className="mx-auto max-w-md">
              <Onboarding />
            </div>
          )}
          {screen === 'home' && <Home />}
          {screen === 'predict' && <Predict />}
          {screen === 'reveal' && <Reveal />}
          {screen === 'priority' && <Choose />}
          {screen === 'goal' && <GoalScreen />}
          {screen === 'recap' && <Recap />}
        </div>
        )}
      </main>

      {showTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t-4 border-ink bg-white" aria-label="Main">
          <div className="mx-auto grid max-w-xl grid-cols-3">
            {TABS.map((t) => {
              const on = screen === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go(t.id)}
                  aria-current={on ? 'page' : undefined}
                  data-fx={t.icon}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 border-r-4 border-ink font-pixel text-[11px] uppercase last:border-r-0 ${
                    on ? 'bg-ink text-white' : 'bg-white hover:bg-mint'
                  }`}
                >
                  <PixelIcon name={t.icon} size={3} className={on ? 'anim-hop' : ''} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
