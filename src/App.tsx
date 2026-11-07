import { useEffect } from 'react'
import { FlowBar } from './components/FlowBar'
import { PixelIcon } from './components/ui'
import type { SpriteName } from './components/ui'
import { APP_NAME } from './data/copy'
import { installFx } from './lib/fx'
import { GoalScreen } from './screens/Goal'
import { Home } from './screens/Home'
import { Onboarding } from './screens/Onboarding'
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

const FLOW: Partial<Record<Screen, { step: 0 | 1 }>> = {
  predict: { step: 0 },
  reveal: { step: 1 },
}

export default function App() {
  const screen = useAppStore((s) => s.screen)
  const guessStep = useAppStore((s) => s.guessStep)
  const onboarded = useAppStore((s) => s.onboarded)
  const go = useAppStore((s) => s.go)
  const setGuessStep = useAppStore((s) => s.setGuessStep)

  useEffect(() => installFx(), [])

  const flow = FLOW[screen]
  const showTabs = onboarded && !flow && screen !== 'onboarding'

  const back = () => {
    if (screen === 'predict') {
      if (guessStep > 0) setGuessStep(guessStep - 1)
      else go('home')
    } else if (screen === 'reveal') go('predict')
  }
  const backLabel =
    screen === 'predict' ? (guessStep > 0 ? 'the previous question' : 'decisions') : 'your guesses'

  return (
    <div className="min-h-screen">
      <header className="border-b-4 border-ink bg-lime">
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <PixelIcon name="sparkle" size={3} />
          <span className="font-pixel text-[12px] uppercase leading-4">{APP_NAME}</span>
        </div>
      </header>

      <main className={`mx-auto max-w-md px-4 pt-6 ${screen === 'reveal' ? 'pb-32' : 'pb-28'}`}>
        {flow && <FlowBar step={flow.step} onBack={back} backLabel={backLabel} />}
        {/* keyed so each screen (and each guess question) snaps in with a stepped slide */}
        <div key={`${screen}-${screen === 'predict' ? guessStep : ''}`} className="anim-slide">
          {screen === 'onboarding' && <Onboarding />}
          {screen === 'home' && <Home />}
          {screen === 'predict' && <Predict />}
          {screen === 'reveal' && <Reveal />}
          {screen === 'goal' && <GoalScreen />}
          {screen === 'recap' && <Recap />}
        </div>
      </main>

      {showTabs && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t-4 border-ink bg-white" aria-label="Main">
          <div className="mx-auto grid max-w-md grid-cols-3">
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
