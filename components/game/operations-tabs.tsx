'use client'

import { useState } from 'react'
import type { GameDispatch } from '@/hooks/use-game'
import { ANNUITY_FACTOR, BUILD_OPTIONS, INVERTER_MAINT_COST, INVERTER_REPAIR_COST, MAX_DEBT, OBJECTIVES } from '@/lib/game/config'
import { buildCost, canAfford, netWorth } from '@/lib/game/engine'
import { duration, pct, usd } from '@/lib/game/format'
import type { DayStats, GameState, InverterStatus } from '@/lib/game/types'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'inv', label: 'Invertorlar' },
  { id: 'build', label: 'Qurilish' },
  { id: 'fin', label: 'Moliya' },
  { id: 'goals', label: 'Maqsadlar va reyting' },
] as const

type TabId = (typeof TABS)[number]['id']

const STATUS: Record<InverterStatus, { label: string; cls: string }> = {
  online: { label: 'ISHLAMOQDA', cls: 'text-success' },
  tripped: { label: 'RELE O’CHIRDI', cls: 'text-destructive' },
  fault: { label: 'NOSOZ', cls: 'text-destructive' },
  repair: { label: 'TA’MIRDA', cls: 'text-warning' },
  maintenance: { label: 'XIZMATDA', cls: 'text-accent' },
}

export function OperationsTabs({ s, dispatch }: { s: GameState; dispatch: GameDispatch }) {
  const [tab, setTab] = useState<TabId>('inv')
  return (
    <section className="rounded-md border border-border bg-card" aria-label="Operatsiyalar">
      <div role="tablist" className="flex overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'whitespace-nowrap border-b-2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider',
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.id === 'inv' && s.inverters.some((i) => i.status === 'fault' || i.status === 'tripped') && (
              <span className="ml-1.5 inline-block size-1.5 rounded-full bg-destructive align-middle" aria-label="diqqat" />
            )}
            {t.id === 'build' && s.projects.length > 0 && <span className="ml-1.5 text-primary">{s.projects.length}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="p-3">
        {tab === 'inv' && <Inverters s={s} dispatch={dispatch} />}
        {tab === 'build' && <Build s={s} dispatch={dispatch} />}
        {tab === 'fin' && <Finance s={s} dispatch={dispatch} />}
        {tab === 'goals' && <Goals s={s} />}
      </div>
    </section>
  )
}

function Inverters({ s, dispatch }: { s: GameState; dispatch: GameDispatch }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {s.inverters.map((inv) => {
        const st = STATUS[inv.status]
        return (
          <div key={inv.id} className="flex flex-col gap-1.5 rounded border border-border bg-background p-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold">INV-{inv.id}</span>
              <span className={cn('font-mono text-[9px]', st.cls)}>{st.label}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
              <span>Eskirish</span>
              <span className={inv.wear > 0.6 ? 'text-destructive' : inv.wear > 0.35 ? 'text-warning' : ''}>{pct(inv.wear)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded bg-secondary">
              <div className={cn('h-full', inv.wear > 0.6 ? 'bg-destructive' : inv.wear > 0.35 ? 'bg-warning' : 'bg-success')} style={{ width: pct(inv.wear) }} />
            </div>
            {inv.status === 'tripped' && (
              <button type="button" onClick={() => dispatch({ type: 'resetInverter', id: inv.id })} className="rounded border border-destructive/60 py-1 font-mono text-[10px] text-destructive hover:bg-destructive/10">
                RESET
              </button>
            )}
            {inv.status === 'fault' && (
              <button
                type="button"
                disabled={s.cash < INVERTER_REPAIR_COST}
                onClick={() => dispatch({ type: 'repairInverter', id: inv.id })}
                className="rounded border border-warning/60 py-1 font-mono text-[10px] text-warning hover:bg-warning/10 disabled:opacity-40"
              >
                TA’MIRLASH {usd(INVERTER_REPAIR_COST)}
              </button>
            )}
            {inv.status === 'online' && (
              <button
                type="button"
                disabled={s.cash < INVERTER_MAINT_COST}
                onClick={() => dispatch({ type: 'maintainInverter', id: inv.id })}
                className="rounded border border-border py-1 font-mono text-[10px] text-muted-foreground hover:bg-secondary disabled:opacity-40"
              >
                XIZMAT {usd(INVERTER_MAINT_COST)}
              </button>
            )}
            {(inv.status === 'repair' || inv.status === 'maintenance') && (
              <span className="py-1 text-center font-mono text-[10px] text-muted-foreground">{duration(inv.busyMin)} qoldi</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Build({ s, dispatch }: { s: GameState; dispatch: GameDispatch }) {
  const repairCost = buildCost(s, 'repairPanels')
  const repairing = s.projects.some((p) => p.type === 'repairPanels')
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-muted-foreground">
        Kredit: yillik 8%, 10 yil. Har $1M uchun kunlik to’lov ≈ {usd(1_000_000 * ANNUITY_FACTOR)}. Qarz limiti {usd(MAX_DEBT)} (hozir {usd(s.debt)}).
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {BUILD_OPTIONS.map((b) => (
          <article key={b.type} className="flex flex-col gap-2 rounded border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{b.label}</h3>
                <p className="font-mono text-[10px] text-primary">
                  {b.short} · {duration(b.minutes)}
                </p>
              </div>
              <span className="font-mono text-sm font-semibold">{usd(b.cost)}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">{b.description}</p>
            <div className="mt-auto grid grid-cols-2 gap-1">
              <button
                type="button"
                disabled={!canAfford(s, b.cost, 'cash')}
                onClick={() => dispatch({ type: 'build', build: b.type, payment: 'cash' })}
                className="rounded border border-border py-1.5 font-mono text-[10px] hover:bg-secondary disabled:opacity-40"
              >
                NAQD
              </button>
              <button
                type="button"
                disabled={!canAfford(s, b.cost, 'loan')}
                onClick={() => dispatch({ type: 'build', build: b.type, payment: 'loan' })}
                className="rounded border border-primary/50 py-1.5 font-mono text-[10px] text-primary hover:bg-primary/10 disabled:opacity-40"
              >
                KREDIT · {usd(b.cost * ANNUITY_FACTOR)}/kun
              </button>
            </div>
          </article>
        ))}
      </div>
      {s.damagedMW > 0.01 && !repairing && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-xs text-destructive">
            {s.damagedMW.toFixed(1)} MWp panel shikastlangan. Ta’mirlash: {usd(repairCost)}, 1 kun.
          </p>
          <div className="flex gap-1">
            <button type="button" disabled={!canAfford(s, repairCost, 'cash')} onClick={() => dispatch({ type: 'build', build: 'repairPanels', payment: 'cash' })} className="rounded border border-border px-3 py-1.5 font-mono text-[10px] hover:bg-secondary disabled:opacity-40">
              NAQD
            </button>
            <button type="button" disabled={!canAfford(s, repairCost, 'loan')} onClick={() => dispatch({ type: 'build', build: 'repairPanels', payment: 'loan' })} className="rounded border border-primary/50 px-3 py-1.5 font-mono text-[10px] text-primary disabled:opacity-40">
              KREDIT
            </button>
          </div>
        </div>
      )}
      {s.projects.length > 0 && (
        <div>
          <h3 className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Qurilish navbati</h3>
          <ul className="flex flex-col gap-1.5">
            {s.projects.map((p) => (
              <li key={p.id} className="rounded border border-border bg-background p-2">
                <div className="flex justify-between text-xs">
                  <span>{p.label}</span>
                  <span className="font-mono text-muted-foreground">{duration(p.minutesLeft)}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${((p.totalMinutes - p.minutesLeft) / p.totalMinutes) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function StatsColumn({ title, t }: { title: string; t: DayStats | null }) {
  if (!t) return (
    <div className="rounded border border-border bg-background p-3">
      <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="mt-2 text-xs text-muted-foreground">Hali ma’lumot yo’q — birinchi kun tugashini kuting.</p>
    </div>
  )
  const income = t.revenue + t.exportRevenue
  const costs = t.importCost + t.fuelCost + t.omCost + t.debtCost + t.penalties
  const green = t.loadMWh > 0 ? Math.max(0, (t.loadMWh - t.dieselMWh - t.importMWh - t.shedMWh) / t.loadMWh) : 0
  const rows: [string, string, string?][] = [
    ['Aholidan tushum', usd(t.revenue), 'text-success'],
    ['Eksport tushumi', usd(t.exportRevenue), 'text-success'],
    ['Dizel yoqilg’i', `−${usd(t.fuelCost)}`, 'text-destructive'],
    ['Import xaridi', `−${usd(t.importCost)}`, 'text-destructive'],
    ['Ekspluatatsiya', `−${usd(t.omCost)}`, 'text-destructive'],
    ['Kredit / foiz', `−${usd(t.debtCost)}`, 'text-destructive'],
    ['Jarimalar', `−${usd(t.penalties)}`, 'text-destructive'],
  ]
  return (
    <div className="rounded border border-border bg-background p-3">
      <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{title}</h3>
      <dl className="mt-2 flex flex-col gap-0.5 font-mono text-[11px]">
        {rows.map(([k, v, c]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className={c}>{v}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
          <dt>Sof foyda</dt>
          <dd className={income - costs >= 0 ? 'text-success' : 'text-destructive'}>{usd(income - costs)}</dd>
        </div>
        <div className="mt-2 flex justify-between">
          <dt className="text-muted-foreground">Quyosh</dt>
          <dd>{t.solarMWh.toFixed(0)} MWh</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Dizel / Import</dt>
          <dd>
            {t.dieselMWh.toFixed(0)} / {t.importMWh.toFixed(0)} MWh
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Eksport / Cheklangan</dt>
          <dd>
            {t.exportMWh.toFixed(0)} / {t.curtailedMWh.toFixed(0)} MWh
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">O’chirilgan</dt>
          <dd className={t.shedMWh > 0.1 ? 'text-destructive' : ''}>{t.shedMWh.toFixed(1)} MWh</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Yashil ulush</dt>
          <dd className="text-primary">{pct(green)}</dd>
        </div>
      </dl>
    </div>
  )
}

// <-- YANGI: Finance komponentida Kredit To'lash paneli qo'shildi
function Finance({ s, dispatch }: { s: GameState; dispatch: GameDispatch }) {
  const [payAmount, setPayAmount] = useState('')

  const handlePayLoan = () => {
    const val = parseFloat(payAmount)
    if (isNaN(val) || val <= 0) {
      alert("Iltimos, to'g'ri summa kiriting!")
      return
    }
    if (val > s.cash) {
      alert("Kassada yetarli mablag' mavjud emas!")
      return
    }
    dispatch({ type: 'payLoan', amount: val })
    setPayAmount('')
  }

  const handlePayMax = () => {
    if (s.cash <= 0) {
      alert("Kassada pul yo'q!")
      return
    }
    const maxVal = Math.min(s.cash, s.debt)
    dispatch({ type: 'payLoan', amount: maxVal })
    setPayAmount('')
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <StatsColumn title="Bugun (hozirgacha)" t={s.today} />
        <StatsColumn title="Kecha" t={s.yesterday} />
      </div>

      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
        {[
          ['Kassa', usd(s.cash)],
          ['Aktivlar', usd(s.assetBook)],
          ['Qarz', usd(s.debt)],
          ['Kunlik to’lov', usd(s.dailyDebtPayment)],
        ].map(([k, v]) => (
          <div key={k} className="rounded border border-border bg-background p-2">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k}</p>
            <p className="font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {/* <-- YANGI: Mustaqil Kredit To'lash Moduli */}
      {s.debt > 0 && (
        <div className="rounded border border-primary/40 bg-primary/5 p-3">
          <h3 className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
            Kreditni muddatidan oldin to'lash
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[150px]">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">$</span>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Summani kiriting"
                className="w-full rounded border border-border bg-background py-1.5 pl-6 pr-3 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <button
              type="button"
              onClick={handlePayLoan}
              disabled={!payAmount || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > s.cash}
              className="rounded bg-primary px-3 py-1.5 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              To'lash
            </button>
            <button
              type="button"
              onClick={handlePayMax}
              disabled={s.cash <= 0}
              className="rounded border border-primary/50 px-3 py-1.5 font-mono text-xs text-primary hover:bg-primary/10 disabled:opacity-40"
            >
              MAX (Barchasi)
            </button>
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
            Mavjud kassa: {usd(s.cash)} · Umumiy qarz: {usd(s.debt)}
          </p>
        </div>
      )}
    </div>
  )
}

function Goals({ s }: { s: GameState }) {
  const board = [
    { name: 'Quyosh oroli (siz)', nw: netWorth(s), you: true },
    ...s.neighbors.map((n) => ({ name: n.name, nw: n.netWorth, you: false })),
  ].sort((a, b) => b.nw - a.nw)
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Maqsadlar (har biri +$150k bonus)</h3>
        <ul className="flex flex-col gap-1.5">
          {OBJECTIVES.map((o) => {
            const done = s.objectivesDone[o.id]
            return (
              <li key={o.id} className={cn('flex items-start gap-2 rounded border p-2 text-xs', done ? 'border-success/50 bg-success/10' : 'border-border bg-background')}>
                <span className={cn('mt-0.5 font-mono text-[10px]', done ? 'text-success' : 'text-muted-foreground')}>{done ? 'BAJARILDI' : 'KUTILMOQDA'}</span>
                <span className="flex-1">{o.label}</span>
                {done ? <span className="font-mono text-[10px] text-muted-foreground">{done}-kun</span> : null}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground">
          O’chirishsiz seriya: {s.noShedStreak} kun · Eng yaxshi yashil ulush: {pct(s.bestGreenShare)}
        </p>
      </div>
      <div>
        <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mintaqa reytingi · sof qiymat</h3>
        <ol className="flex flex-col gap-1.5">
          {board.map((b, i) => (
            <li key={b.name} className={cn('flex items-center justify-between rounded border p-2 text-xs', b.you ? 'border-primary/60 bg-primary/10' : 'border-border bg-background')}>
              <span className="flex items-center gap-2">
                <span className="w-5 font-mono text-muted-foreground">{i + 1}.</span>
                <span className={b.you ? 'font-semibold text-primary' : ''}>{b.name}</span>
              </span>
              <span className="font-mono font-semibold">{usd(b.nw)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}