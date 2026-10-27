'use client'

import { hourOf } from '@/lib/game/engine'
import { mw } from '@/lib/game/format'
import type { GameState } from '@/lib/game/types'

function skyColors(h: number, cloud: number) {
  const day = h > 6.5 && h < 18
  const dawn = (h >= 5.5 && h <= 6.5) || (h >= 18 && h <= 19)
  let top = '#050a16'
  let bottom = '#0d1830'
  if (day) {
    top = cloud > 0.6 ? '#4b5a70' : '#2f6fb3'
    bottom = cloud > 0.6 ? '#8796aa' : '#9cc7ea'
  } else if (dawn) {
    top = '#1f2b55'
    bottom = '#e58a4a'
  }
  return { top, bottom }
}

export function PlantScene({ s }: { s: GameState }) {
  const h = hourOf(s.minute)
  const { top, bottom } = skyColors(h, s.cloud)
  const night = h < 6 || h > 18.6
  const sunT = (h - 6) / 12.5
  const sunX = 60 + sunT * 680
  const sunY = 150 - Math.sin(Math.PI * sunT) * 120
  const rows = Math.min(12, Math.ceil(s.solarMW / 5))
  const damagedRows = Math.min(rows, Math.round(s.damagedMW / 5))
  const dustTint = Math.min(0.7, s.dust * 3)
  const socFrac = s.batteryMWh > 0 ? s.soc / s.batteryMWh : 0
  const snap = s.snap
  const storm = s.events.some((e) => e.type === 'storm')

  return (
    <div className="relative overflow-hidden rounded-md border border-border">
      <svg viewBox="0 0 800 280" className="block h-auto w-full" role="img" aria-label="Quyosh elektr stansiyasi va orol ko’rinishi">
        <defs>
          <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={top} />
            <stop offset="1" stopColor={bottom} />
          </linearGradient>
          <linearGradient id="sea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={night ? '#0b2238' : '#1d5f8a'} />
            <stop offset="1" stopColor={night ? '#050f1c' : '#0d3554'} />
          </linearGradient>
          <linearGradient id="panel" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#2b4f8a" />
            <stop offset="1" stopColor="#13284d" />
          </linearGradient>
        </defs>
        <rect width="800" height="280" fill="url(#sky)" />

        {night ? (
          <g>
            {Array.from({ length: 30 }, (_, i) => (
              <circle key={i} cx={(i * 137) % 800} cy={(i * 53) % 130} r={i % 3 === 0 ? 1.2 : 0.7} fill="#dbe6ff" opacity={0.7 - s.cloud * 0.6} />
            ))}
            <circle cx="680" cy="50" r="14" fill="#e8edf5" opacity={0.85 - s.cloud * 0.5} />
          </g>
        ) : (
          <g>
            <circle cx={sunX} cy={sunY} r="34" fill="#f5b301" opacity={0.18 * (1 - s.cloud)} />
            <circle cx={sunX} cy={sunY} r="18" fill="#ffd34d" opacity={1 - s.cloud * 0.7} />
          </g>
        )}

        <g opacity={Math.min(0.95, s.cloud * 1.1)}>
          {[
            [120, 60, 70],
            [330, 40, 90],
            [540, 70, 80],
            [700, 45, 60],
            [230, 95, 55],
          ].map(([x, y, w], i) => (
            <g key={i} fill={storm ? '#3f4757' : night ? '#2a3448' : '#e9eef5'}>
              <ellipse cx={x} cy={y} rx={w} ry={w * 0.28} />
              <ellipse cx={x - w * 0.35} cy={y + 6} rx={w * 0.5} ry={w * 0.22} />
              <ellipse cx={x + w * 0.4} cy={y + 4} rx={w * 0.45} ry={w * 0.2} />
            </g>
          ))}
        </g>

        <rect y="200" width="800" height="80" fill="url(#sea)" />
        <path d="M20 215 Q 80 180 220 182 L 560 182 Q 640 184 690 215 Z" fill="#c9b27a" />
        <path d="M40 212 Q 100 188 230 190 L 550 190 Q 620 192 670 212 Z" fill="#5f7a3e" />

        <g>
          {Array.from({ length: rows }, (_, i) => {
            const col = i % 6
            const row = Math.floor(i / 6)
            const x = 90 + col * 46
            const y = 168 + row * 16
            const broken = i < damagedRows
            return (
              <g key={i} transform={`translate(${x} ${y})`}>
                <polygon points="0,10 40,10 36,0 4,0" fill={broken ? '#5a2a2a' : 'url(#panel)'} stroke="#7aa0d8" strokeWidth="0.5" />
                <polygon points="0,10 40,10 36,0 4,0" fill="#a88a56" opacity={broken ? 0 : dustTint} />
                <line x1="20" y1="10" x2="20" y2="15" stroke="#6b7a8f" strokeWidth="1.5" />
              </g>
            )
          })}
        </g>

        <g transform="translate(395 150)">
          <rect width="48" height="30" fill="#22324a" stroke="#38bdf8" strokeWidth="1" />
          <rect x="4" y={4 + 22 * (1 - socFrac)} width="40" height={22 * socFrac} fill="#38bdf8" opacity="0.85" />
          <text x="24" y="-4" textAnchor="middle" className="fill-[#cfe8f7] font-mono text-[9px]">
            BAT {Math.round(socFrac * 100)}%
          </text>
        </g>

        <g transform="translate(460 156)">
          <rect width="34" height="24" fill="#3a3f48" stroke="#fb923c" strokeWidth="1" />
          <rect x="24" y="-12" width="5" height="12" fill="#3a3f48" />
          {snap.dieselMW > 0.01 && (
            <g fill="#6b7280" opacity="0.7">
              <circle cx="27" cy="-18" r="5" />
              <circle cx="32" cy="-27" r="7" />
              <circle cx="38" cy="-38" r="9" />
            </g>
          )}
          <text x="17" y="36" textAnchor="middle" className="fill-[#fbc79a] font-mono text-[8px]">
            DIZEL
          </text>
        </g>

        <g transform="translate(520 130)">
          {[
            [0, 30, 50],
            [26, 22, 58],
            [52, 34, 46],
            [78, 26, 54],
            [104, 20, 40],
          ].map(([x, w, ht], i) => (
            <g key={i}>
              <rect x={x} y={52 - ht} width={w} height={ht} fill="#2d3a50" />
              {Array.from({ length: Math.floor(ht / 10) }, (_, j) => (
                <rect
                  key={j}
                  x={x + 4}
                  y={52 - ht + 4 + j * 10}
                  width={w - 8}
                  height="4"
                  fill={snap.shedMW > 0.05 && j % 2 === 0 ? '#111827' : night ? '#ffd34d' : '#9fb3cc'}
                  opacity={night ? 0.9 : 0.4}
                />
              ))}
            </g>
          ))}
          <text x="62" y="66" textAnchor="middle" className="fill-[#e3eaf4] font-mono text-[9px]">
            SHAHAR · {mw(snap.load)}
          </text>
        </g>

        {s.neighbors.map((n, i) => {
          const y = 222 + i * 18
          const active = n.cableMW > 0
          const flow = n.exportMW > 0.05 ? 'exp' : n.importMW > 0.05 ? 'imp' : null
          return (
            <g key={n.id}>
              <line
                x1="680"
                y1="212"
                x2="745"
                y2={y}
                stroke={active ? (flow === 'exp' ? '#34d399' : flow === 'imp' ? '#fb923c' : '#5b6b84') : '#1f2c42'}
                strokeWidth={active ? 2 : 1}
                strokeDasharray={active ? undefined : '3 3'}
              />
              <ellipse cx="770" cy={y} rx="26" ry="6" fill={active ? '#5f7a3e' : '#2b3a2a'} />
              <text x="770" y={y + 3} textAnchor="middle" className="fill-[#e3eaf4] font-mono text-[7px]">
                {n.name.split(' ')[0].toUpperCase()}
              </text>
            </g>
          )
        })}

        <g className="font-mono text-[10px]">
          <rect x="10" y="10" width="190" height="52" rx="3" fill="#0a111e" opacity="0.75" />
          <text x="20" y="27" className="fill-[#f5b301]">
            QUYOSH {mw(snap.solarAC)}
          </text>
          <text x="20" y="41" className="fill-[#e3eaf4]">
            NURLANISH {Math.round(snap.irradiance)} W/m²
          </text>
          <text x="20" y="55" className="fill-[#8597b0]">
            BULUT {Math.round(s.cloud * 100)}% · {snap.ambient.toFixed(1)}°C
          </text>
        </g>
      </svg>
    </div>
  )
}
