import { clock, dayLabel } from '@/lib/game/format'
import type { GameState } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

export function Annunciator({ s }: { s: GameState }) {
  const n = s.snap
  const socFrac = s.batteryMWh > 0 ? s.soc / s.batteryMWh : 0
  const ev = (t: string) => s.events.some((e) => e.type === t)
  const alarms: { label: string; on: boolean; level: 'alarm' | 'warn' }[] = [
    { label: 'YUK O’CHIRILDI', on: n.shedMW > 0.05, level: 'alarm' },
    { label: 'INVERTOR NOSOZ', on: s.inverters.some((i) => i.status === 'fault' || i.status === 'tripped'), level: 'alarm' },
    { label: 'PANEL SHIKAST', on: s.damagedMW > 0, level: 'alarm' },
    { label: 'MABLAG’ PAST', on: s.cash < 500_000, level: 'alarm' },
    { label: 'DIZEL ISHLAMOQDA', on: n.dieselMW > 0.05, level: 'warn' },
    { label: 'BATAREYA PAST', on: socFrac < 0.15 && s.batteryMWh > 0, level: 'warn' },
    { label: 'BATAREYA TO’LA', on: socFrac > 0.97, level: 'warn' },
    { label: 'CHANG YUQORI', on: s.dust > 0.08, level: 'warn' },
    { label: 'QIRQISH', on: n.clipping > 0.3, level: 'warn' },
    { label: 'CHEKLASH', on: n.curtailMW > 0.1, level: 'warn' },
    { label: 'IMPORT', on: n.importMW > 0.05, level: 'warn' },
    { label: 'BO’RON', on: ev('storm'), level: 'alarm' },
    { label: 'JAZIRAMA', on: ev('heatwave'), level: 'warn' },
    { label: 'NARX URUSHI', on: s.neighbors.some((x) => x.offerCut > 0), level: 'alarm' },
    { label: 'OBRO’ PAST', on: s.reputation < 50, level: 'alarm' },
    { label: 'PANEL QIZISH', on: n.cellTemp > 55, level: 'warn' },
  ]
  return (
    <Panel title="Signal paneli">
      <ul className="grid grid-cols-2 gap-1 sm:grid-cols-4">
        {alarms.map((a) => (
          <li
            key={a.label}
            className={cn(
              'flex min-h-9 items-center justify-center rounded-sm border px-1 text-center font-mono text-[9px] font-semibold leading-tight',
              !a.on && 'border-border bg-background text-muted-foreground/50',
              a.on && a.level === 'alarm' && 'animate-pulse border-destructive bg-destructive/20 text-destructive',
              a.on && a.level === 'warn' && 'border-warning bg-warning/15 text-warning',
            )}
          >
            {a.label}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function EventLog({ s }: { s: GameState }) {
  return (
    <Panel title="Hodisalar jurnali" className="min-h-0">
      <ol className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1" aria-live="polite">
        {s.log.map((l) => (
          <li key={l.id} className="flex gap-2 text-[11px] leading-snug">
            <span className="shrink-0 font-mono text-muted-foreground">
              {dayLabel(l.minute).replace('-kun', 'K')} {clock(l.minute)}
            </span>
            <span
              className={cn(
                l.level === 'alarm' && 'text-destructive',
                l.level === 'warn' && 'text-warning',
                l.level === 'good' && 'text-success',
                l.level === 'info' && 'text-foreground/85',
              )}
            >
              {l.text}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}
