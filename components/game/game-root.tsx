import { useEffect, useState } from 'react'
import { useGame } from '@/hooks/use-game'
import { Annunciator, EventLog } from './annunciator'
import { DispatchPanel } from './dispatch-panel'
import { NeighborsPanel } from './neighbors-panel'
import { OperationsTabs } from './operations-tabs'
import { PlantScene } from './plant-scene'
import { Readouts } from './readouts'
import { GameOver, GuideDialog, RestartDialog, StartScreen } from './screens'
import { TopBar } from './top-bar'
import { TrendChart } from './trend-chart'

export function GameRoot() {
  const { state: s, dispatch } = useGame()
  const [guide, setGuide] = useState(false)
  const [restartOpen, setRestartOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Hydration xatosining oldini olish uchun faqat klientda mount bo'lgandan keyin render qilamiz
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background font-mono text-xs text-muted-foreground">
        Yuklanmoqda...
      </div>
    )
  }

  if (s.status === 'menu') return <StartScreen dispatch={dispatch} />

  return (
    <div className="min-h-dvh">
      <TopBar s={s} dispatch={dispatch} onGuide={() => setGuide(true)} onRestartRequest={() => setRestartOpen(true)} />
      {s.events.length > 0 && (
        <div className="border-b border-warning/40 bg-warning/10">
          <p className="mx-auto max-w-[1600px] px-4 py-1.5 font-mono text-[11px] text-warning">
            FAOL HODISALAR: {s.events.map((e) => `${e.label} (${Math.ceil(e.minutesLeft / 60)} soat)`).join(' · ')}
          </p>
        </div>
      )}
      <main className="mx-auto grid max-w-[1600px] gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-3">
          <PlantScene s={s} />
          <TrendChart s={s} />
          <NeighborsPanel s={s} dispatch={dispatch} />
          <OperationsTabs s={s} dispatch={dispatch} />
        </div>
        <aside className="flex min-w-0 flex-col gap-3">
          <DispatchPanel s={s} dispatch={dispatch} />
          <Annunciator s={s} />
          <Readouts s={s} />
          <EventLog s={s} />
        </aside>
      </main>
      <GuideDialog open={guide} onClose={() => setGuide(false)} />
      <RestartDialog
        open={restartOpen}
        currentDifficulty={s.difficulty}
        onClose={() => setRestartOpen(false)}
        onRestart={(difficulty) => {
          setRestartOpen(false)
          dispatch({ type: 'restart', difficulty })
        }}
      />
      {s.status === 'over' && <GameOver s={s} dispatch={dispatch} />}
    </div>
  )
}
