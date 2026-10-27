'use client'

import { Minus, Plus } from 'lucide-react'
import type { GameDispatch } from '@/hooks/use-game'
import { canAfford, importPrice, netWorth, offerPrice } from '@/lib/game/engine'
import { mw, pct, usd } from '@/lib/game/format'
import type { GameState } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { Panel } from './panel'

export function NeighborsPanel({ s, dispatch }: { s: GameState; dispatch: GameDispatch }) {
  const connected = s.neighbors.filter((n) => n.cableMW > 0)
  const bestId = connected.length ? connected.reduce((a, b) => (a.price > b.price ? a : b)).id : null
  const cableProject = (id: string) => s.projects.find((p) => p.type === 'cable' && p.neighborId === id)

  return (
    <Panel
      title="Podstansiya · qo’shni orollar bozori"
      right={<span className="font-mono text-[10px] text-muted-foreground">Ortiqcha → eng qimmat xaridorga</span>}
    >
      <div className="grid gap-3 md:grid-cols-3">
        {s.neighbors.map((n) => {
          const proj = cableProject(n.id)
          return (
            <article key={n.id} className="flex flex-col gap-2 rounded border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{n.name}</h3>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{n.source}</p>
                </div>
                <div className="text-right">
                  <p className={cn('font-mono text-lg font-semibold tabular-nums', n.spikeMin > 0 ? 'text-destructive' : 'text-primary')}>
                    ${Math.round(n.price)}
                  </p>
                  <p className="font-mono text-[9px] text-muted-foreground">/MWh spot</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {bestId === n.id && <span className="rounded-sm bg-success/15 px-1.5 py-0.5 font-mono text-[9px] text-success">ENG YAXSHI XARIDOR</span>}
                {n.spikeMin > 0 && <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5 font-mono text-[9px] text-destructive">NARX SAKRASHI</span>}
                {n.offerCut > 0 && <span className="rounded-sm bg-destructive/15 px-1.5 py-0.5 font-mono text-[9px] text-destructive">NARX URUSHI −20%</span>}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">{n.description}</p>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px]">
                <dt className="text-muted-foreground">Sof qiymat</dt>
                <dd className="text-right">{usd(n.netWorth)}</dd>
                <dt className="text-muted-foreground">Quvvat</dt>
                <dd className="text-right">{n.capacityMW.toFixed(0)} MW</dd>
                <dt className="text-muted-foreground">Sizga taklifi</dt>
                <dd className="text-right text-warning">${Math.round(offerPrice(n))}</dd>
                <dt className="text-muted-foreground">Olgan ulushi</dt>
                <dd className={cn('text-right', n.takenShare > 0 ? 'text-destructive' : '')}>{pct(n.takenShare, 1)}</dd>
              </dl>

              {n.cableMW > 0 ? (
                <div className="mt-auto flex flex-col gap-2 border-t border-border pt-2">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-success">KABEL ULANGAN · {n.cableMW} MW</span>
                    <span className={n.exportMW > 0.05 ? 'text-success' : n.importMW > 0.05 ? 'text-warning' : 'text-muted-foreground'}>
                      {n.exportMW > 0.05 ? `→ ${mw(n.exportMW)}` : n.importMW > 0.05 ? `← ${mw(n.importMW)}` : 'oqim yo’q'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">Sotish limiti</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Limitni kamaytirish"
                        onClick={() => dispatch({ type: 'setExportLimit', id: n.id, value: n.exportLimit - 2.5 })}
                        className="flex size-6 items-center justify-center rounded border border-border hover:bg-secondary"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-14 text-center font-mono text-xs tabular-nums">{n.exportLimit.toFixed(1)} MW</span>
                      <button
                        type="button"
                        aria-label="Limitni oshirish"
                        onClick={() => dispatch({ type: 'setExportLimit', id: n.id, value: n.exportLimit + 2.5 })}
                        className="flex size-6 items-center justify-center rounded border border-border hover:bg-secondary"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch({ type: 'toggleImport', id: n.id })}
                    aria-pressed={n.importEnabled}
                    className={cn(
                      'rounded border py-1.5 font-mono text-[10px]',
                      n.importEnabled ? 'border-warning/60 bg-warning/10 text-warning' : 'border-border text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    {n.importEnabled ? `IMPORT YOQIQ · $${Math.round(importPrice(n))}/MWh` : `IMPORTGA RUXSAT · $${Math.round(importPrice(n))}`}
                  </button>
                </div>
              ) : proj ? (
                <div className="mt-auto border-t border-border pt-2">
                  <p className="font-mono text-[10px] text-primary">KABEL QURILMOQDA</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${(1 - proj.minutesLeft / proj.totalMinutes) * 100}%` }} />
                  </div>
                </div>
              ) : (
                <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2">
                  <p className="font-mono text-[10px] text-muted-foreground">15 MW suv osti kabeli · {usd(n.cableCost)} · 4 kun</p>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      disabled={!canAfford(s, n.cableCost, 'cash')}
                      onClick={() => dispatch({ type: 'build', build: 'cable', payment: 'cash', neighborId: n.id })}
                      className="rounded border border-border py-1.5 font-mono text-[10px] hover:bg-secondary disabled:opacity-40"
                    >
                      NAQD
                    </button>
                    <button
                      type="button"
                      disabled={!canAfford(s, n.cableCost, 'loan')}
                      onClick={() => dispatch({ type: 'build', build: 'cable', payment: 'loan', neighborId: n.id })}
                      className="rounded border border-primary/50 py-1.5 font-mono text-[10px] text-primary hover:bg-primary/10 disabled:opacity-40"
                    >
                      KREDIT
                    </button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Sizning sof qiymatingiz: <span className="text-foreground">{usd(netWorth(s))}</span>. Eksport faqat ortiqcha energiyadan — shahar har doim birinchi
        ta’minlanadi. Import narxiga 12% tranzit to’lovi qo’shiladi.
      </p>
    </Panel>
  )
}
