'use client'

import { forecast } from '@/lib/game/engine'
import { clock } from '@/lib/game/format'
import type { GameState } from '@/lib/game/types'
import { Panel } from './panel'

const W = 760
const H = 200
const PAD = { l: 34, r: 8, t: 10, b: 22 }

export function TrendChart({ s }: { s: GameState }) {
  const pts = s.history.slice(-96)
  const fc = forecast(s, 12)
  const start = s.minute - 24 * 60
  const end = s.minute + 12 * 60
  const maxY = Math.max(10, ...pts.map((p) => Math.max(p.solar, p.load)), ...fc.map((f) => Math.max(f.solar, f.demand))) * 1.1
  const x = (m: number) => PAD.l + ((m - start) / (end - start)) * (W - PAD.l - PAD.r)
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b)
  const line = (key: 'solar' | 'load' | 'diesel') => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.minute).toFixed(1)},${y(p[key]).toFixed(1)}`).join(' ')
  const area =
    pts.length > 1
      ? `${line('solar')} L${x(pts[pts.length - 1].minute)},${y(0)} L${x(pts[0].minute)},${y(0)} Z`
      : ''
  const fcLine = (key: 'solar' | 'demand') =>
    [{ minute: s.minute, solar: s.snap.solarAC, demand: s.snap.load }, ...fc]
      .map((p, i) => `${i ? 'L' : 'M'}${x(p.minute).toFixed(1)},${y(p[key]).toFixed(1)}`)
      .join(' ')
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY)
  const timeTicks = Array.from({ length: 7 }, (_, i) => start + i * 360)

  return (
    <Panel
      title="Trend · so’nggi 24 soat + 12 soatlik prognoz"
      right={
        <div className="flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-primary" /> Quyosh
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-foreground" /> Talab
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-warning" /> Dizel
          </span>
          <span className="flex items-center gap-1">
            <span className="h-0.5 w-3 bg-accent" /> Batareya %
          </span>
        </div>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Ishlab chiqarish va talab grafigi">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#1f2c42" />
            <text x={PAD.l - 4} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[9px]">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {timeTicks.map((m) => (
          <text key={m} x={x(m)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
            {clock(((m % 1440) + 1440) % 1440)}
          </text>
        ))}
        <rect x={x(s.minute)} y={PAD.t} width={W - PAD.r - x(s.minute)} height={H - PAD.t - PAD.b} fill="#ffffff" opacity="0.025" />
        <line x1={x(s.minute)} x2={x(s.minute)} y1={PAD.t} y2={H - PAD.b} stroke="#8597b0" strokeDasharray="2 3" />
        <text x={x(s.minute) + 4} y={PAD.t + 9} className="fill-muted-foreground font-mono text-[9px]">
          HOZIR · PROGNOZ
        </text>
        {area && <path d={area} fill="#f5b301" opacity="0.15" />}
        {pts.length > 1 && (
          <>
            <path
              d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.minute).toFixed(1)},${(H - PAD.b - p.soc * (H - PAD.t - PAD.b)).toFixed(1)}`).join(' ')}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1"
              opacity="0.7"
            />
            <path d={line('diesel')} fill="none" stroke="#fb923c" strokeWidth="1.5" />
            <path d={line('load')} fill="none" stroke="#e3eaf4" strokeWidth="1.5" />
            <path d={line('solar')} fill="none" stroke="#f5b301" strokeWidth="2" />
          </>
        )}
        <path d={fcLine('demand')} fill="none" stroke="#e3eaf4" strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
        <path d={fcLine('solar')} fill="none" stroke="#f5b301" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
        <text x={4} y={PAD.t + 4} className="fill-muted-foreground font-mono text-[9px]">
          MW
        </text>
      </svg>
    </Panel>
  )
}
