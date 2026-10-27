'use client'

import { BookOpen, Pause, Play, RotateCcw, Sun } from 'lucide-react'
import type { GameDispatch } from '@/hooks/use-game'
import { netWorth } from '@/lib/game/engine'
import { clock, dayLabel, pct, usd } from '@/lib/game/format'
import type { GameState, Speed } from '@/lib/game/types'
import { cn } from '@/lib/utils'

const SPEEDS: Speed[] = [1, 2, 5, 10]

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-sm font-semibold tabular-nums', tone)}>{value}</span>
    </div>
  )
}

export function TopBar({ s, dispatch, onGuide }: { s: GameState; dispatch: GameDispatch; onGuide: () => void }) {
  const nw = netWorth(s)
  const cph = s.snap.cashPerHour

  // <-- YANGI: Restart tugmasi bosilganda tasdiqlash va dispatch qilish
  const handleRestartClick = () => {
    if (window.confirm("Haqiqatan ham stansiyani qayta ishga tushirmoqchimisiz? Barcha progress va joriy o'yin tozalanadi!")) {
      dispatch({ type: 'restart' })
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <Sun className="size-5" aria-hidden />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Quyosh Oroli Energiya</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Dispetcherlik pulti</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded border border-border bg-card px-3 py-1">
          <Metric label={dayLabel(s.minute)} value={clock(s.minute)} tone="text-primary" />
          <div className="flex items-center gap-1" role="group" aria-label="Simulyatsiya tezligi">
            <button
              type="button"
              onClick={() => dispatch({ type: 'togglePause' })}
              className={cn(
                'flex size-7 items-center justify-center rounded border border-border',
                s.paused ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
              )}
              aria-label={s.paused ? 'Davom ettirish' : 'Pauza'}
            >
              {s.paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            </button>
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => dispatch({ type: 'setSpeed', speed: sp })}
                aria-pressed={!s.paused && s.speed === sp}
                className={cn(
                  'h-7 rounded border border-border px-2 font-mono text-xs',
                  !s.paused && s.speed === sp ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {sp}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          <Metric label="Kassa" value={usd(s.cash)} tone={s.cash < 0 ? 'text-destructive' : 'text-foreground'} />
          <Metric label="Pul oqimi / soat" value={`${cph >= 0 ? '+' : ''}${usd(cph)}`} tone={cph >= 0 ? 'text-success' : 'text-destructive'} />
          <Metric label="Sof qiymat" value={usd(nw)} />
          <Metric label="Qarz" value={usd(s.debt)} tone="text-muted-foreground" />
          <Metric
            label="Obro’"
            value={`${Math.round(s.reputation)}/100`}
            tone={s.reputation >= 70 ? 'text-success' : s.reputation >= 50 ? 'text-warning' : 'text-destructive'}
          />
          <Metric
            label="Bozor ulushi"
            value={pct(s.marketShare)}
            tone={s.marketShare >= 0.98 ? 'text-success' : s.marketShare >= 0.8 ? 'text-warning' : 'text-destructive'}
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* <-- YANGI: Restart tugmasi */}
          <button
            type="button"
            onClick={handleRestartClick}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs text-destructive hover:bg-secondary"
            title="O'yinni boshidan boshlash"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Restart
          </button>

          <button
            type="button"
            onClick={onGuide}
            className="flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <BookOpen className="size-3.5" aria-hidden />
            Qo’llanma
          </button>
        </div>
      </div>
    </header>
  )
}