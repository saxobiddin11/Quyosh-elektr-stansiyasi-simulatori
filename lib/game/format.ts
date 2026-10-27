export function usd(n: number, compact = true) {
  const sign = n < 0 ? '−' : ''
  const a = Math.abs(n)
  if (!compact) return `${sign}$${Math.round(a).toLocaleString('en-US')}`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(2)}M`
  if (a >= 1e4) return `${sign}$${(a / 1e3).toFixed(1)}k`
  return `${sign}$${Math.round(a).toLocaleString('en-US')}`
}

export function mw(n: number, digits = 1) {
  return `${n.toFixed(digits)} MW`
}

export function clock(minute: number) {
  const m = Math.floor(minute % 1440)
  const hh = String(Math.floor(m / 60)).padStart(2, '0')
  const mm = String(m % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export function dayLabel(minute: number) {
  return `${Math.floor(minute / 1440) + 1}-kun`
}

export function duration(minutes: number) {
  const h = Math.ceil(minutes / 60)
  if (h >= 24) return `${Math.floor(h / 24)} kun ${h % 24} soat`
  return `${h} soat`
}

export function pct(n: number, digits = 0) {
  return `${(n * 100).toFixed(digits)}%`
}
