import { useEffect, useSyncExternalStore } from 'react'
import { FlowBar } from './components/FlowBar'
import { IconGallery } from './components/IconGallery'
import { Logo } from './components/Logo'
import { PixelIcon } from './components/ui'
import type { SpriteName } from './components/ui'
import { installFx } from './lib/fx'
import { installMusic } from './lib/music'
import { isMuted, setMuted, subscribeMuted } from './lib/sound'
import { Oracle } from './screens/Oracle'
import { Result } from './screens/Result'
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
  const guess = useAppStore((s) => s.guess)
  const queueLen = useAppStore((s) => s.queue.length)
  const sessionLen = useAppStore((s) => s.session.length)
  const go = useAppStore((s) => s.go)

  useEffect(() => installFx(), [])
  useEffect(() => installMusic(), [])
  // every new screen starts at the top (otherwise "See my recap" opened the recap scrolled halfway down)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])
  const muted = useSyncExternalStore(subscribeMuted, isMuted)

  if (screen === 'ball') return <Oracle />

  const flow = FLOW[screen]
  const showTabs = onboarded && !flow && screen !== 'onboarding' && screen !== 'result'

  const back = () => {
    // Results goes home, not back to the clock: a new round is a new guess
    if (screen === 'predict' || screen === 'reveal') go('home')
    else if (screen === 'priority') go('reveal')
  }
  const backLabel =
    screen === 'priority' ? 'the results' : 'decisions'

  return (
    <div className={`min-h-screen ${screen === 'home' ? 'home-night' : ''}`}>
      <header className="relative z-[2] border-b-4 border-ink bg-lime">
        <div className="mx-auto flex max-w-[1760px] items-center gap-2 px-6 py-2 xl:px-12">
          <Logo onClick={onboarded ? () => go('home') : undefined} />
          <button
            type="button"
            aria-pressed={muted}
            aria-label={muted ? 'Sound off. Turn sound on' : 'Sound on. Turn sound off'}
            onClick={() => setMuted(!muted)}
            className="ml-auto grid min-h-[44px] min-w-[44px] place-items-center border-4 border-ink bg-white p-1"
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

      <main
        className={`relative z-[1] mx-auto max-w-[1760px] px-6 pt-6 xl:px-12 ${screen === 'priority' || screen === 'reveal' || screen === 'result' ? 'pb-32' : flow ? 'pb-8' : 'pb-28'}`}
        // how much of the window is taken by the header, padding, bar and nav, so pages can fill the rest (see .page-fill)
        style={{ ['--chrome' as string]: screen === 'priority' ? '290px' : flow ? '195px' : '205px' }}
      >
        {flow && (
          <FlowBar
            // a habit made from speech has no guess round, so its bar starts at Results
            step={guess === null && screen !== 'predict' ? flow.step - 1 : flow.step}
            steps={guess === null && screen !== 'predict' ? ['Results', 'Pick'] : undefined}
            habit={sessionLen + queueLen > 0 ? { n: sessionLen + 1, of: sessionLen + 1 + queueLen } : undefined}
            onBack={back}
            backLabel={backLabel}
          />
        )}
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
          {screen === 'result' && <Result />}
          {screen === 'recap' && <Recap />}
        </div>
        )}
      </main>

      {showTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t-4 border-ink bg-white" aria-label="Main">
          <div className="mx-auto grid max-w-md grid-cols-2">
            {TABS.map((t) => {
              const on = screen === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => go(t.id)}
                  aria-current={on ? 'page' : undefined}
                  data-fx={t.icon}
                  className={`flex min-h-[60px] flex-col items-center justify-center gap-1 border-r-4 border-ink font-pixel text-[12px] uppercase last:border-r-0 ${
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
