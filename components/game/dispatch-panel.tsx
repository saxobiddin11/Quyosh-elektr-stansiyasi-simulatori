'use client'

import type { GameDispatch } from '@/hooks/use-game'
import { CLEAN_COST_PER_MW, FAIR_TARIFF } from '@/lib/game/config'
import { offerPrice } from '@/lib/game/engine'
import { pct, usd } from '@/lib/game/format'
import type { BatteryMode, GameState } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

const MODES: { id: BatteryMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'AVTO', hint: 'Ortiqchani zaryadlaydi, tanqislikda beradi' },
  { id: 'charge', label: 'ZARYAD', hint: 'To’liq quvvat bilan zaryadlash (dizel/importdan ham)' },
  { id: 'hold', label: 'USHLASH', hint: 'Zaryadni saqlab turish' },
  { id: 'discharge', label: 'BERISH', hint: 'Maksimal quvvat bilan razryad' },
]

export function DispatchPanel({ s, dispatch }: { s: GameState; dispatch: GameDispatch }) {
  const bestOffer = Math.min(...s.neighbors.map(offerPrice))
  const cleanCost = Math.round(s.solarMW * CLEAN_COST_PER_MW)
  const tariffTone = s.tariff > bestOffer * 1.08 ? 'text-destructive' : s.tariff > FAIR_TARIFF ? 'text-warning' : 'text-success'

  return (
    <Panel title="Dispetcher boshqaruvi">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="tariff" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Aholi tarifi
            </label>
            <span className={cn('font-mono text-sm font-semibold tabular-nums', tariffTone)}>
              ${s.tariff}/MWh <span className="text-muted-foreground">(${(s.tariff / 1000).toFixed(3)}/kWh)</span>
            </span>
          </div>
          <input
            id="tariff"
            type="range"
            min={120}
            max={320}
            step={1}
            value={s.tariff}
            onChange={(e) => dispatch({ type: 'setTariff', value: Number(e.target.value) })}
            className="mt-2 w-full"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Adolatli tarif ~${FAIR_TARIFF}. Raqobatchilarning eng arzon taklifi: <span className="text-foreground">${Math.round(bestOffer)}</span>.
            Undan 8% dan qimmat bo’lsa — mijozlarni yo’qotasiz.
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Batareya rejimi</p>
          <div className="mt-2 grid grid-cols-4 gap-1" role="radiogroup" aria-label="Batareya rejimi">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={s.batteryMode === m.id}
                title={m.hint}
                onClick={() => dispatch({ type: 'setBatteryMode', mode: m.id })}
                className={cn(
                  'rounded border border-border py-1.5 font-mono text-[10px]',
                  s.batteryMode === m.id ? 'border-accent bg-accent/15 text-accent' : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">{MODES.find((m) => m.id === s.batteryMode)?.hint}</p>
          <div className="mt-2 flex items-baseline justify-between">
            <label htmlFor="reserve" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Minimal zaxira
            </label>
            <span className="font-mono text-xs text-accent">{pct(s.batteryReserve)}</span>
          </div>
          <input
            id="reserve"
            type="range"
            min={0}
            max={0.5}
            step={0.05}
            value={s.batteryReserve}
            onChange={(e) => dispatch({ type: 'setReserve', value: Number(e.target.value) })}
            className="mt-1 w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'toggleDiesel' })}
            aria-pressed={s.dieselEnabled}
            className={cn(
              'rounded border px-2 py-2 text-left',
              s.dieselEnabled ? 'border-warning/60 bg-warning/10' : 'border-destructive/60 bg-destructive/10',
            )}
          >
            <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Dizel zaxira</span>
            <span className={cn('font-mono text-xs font-semibold', s.dieselEnabled ? 'text-warning' : 'text-destructive')}>
              {s.dieselEnabled ? `YOQIQ · ${s.dieselMW} MW` : 'BLOKLANGAN'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'cleanPanels' })}
            disabled={s.cash < cleanCost}
            className="rounded border border-border px-2 py-2 text-left hover:bg-secondary disabled:opacity-50"
          >
            <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Panellarni yuvish</span>
            <span className="font-mono text-xs font-semibold text-primary">{usd(cleanCost)}</span>
          </button>
        </div>
      </div>
    </Panel>
  )
}
