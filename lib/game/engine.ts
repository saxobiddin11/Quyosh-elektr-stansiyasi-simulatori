import {
  ANNUITY_FACTOR,
  BANKRUPT_LIMIT,
  BUILD_OPTIONS,
  CABLE_MW,
  CLEAN_COST_PER_MW,
  DIESEL_START_FEE,
  DIFFICULTY,
  FAIR_TARIFF,
  FUEL_COST,
  INV_MW,
  INVERTER_MAINT_COST,
  INVERTER_REPAIR_COST,
  MAX_DEBT,
  OBJECTIVES,
  PANEL_REPAIR_PER_MW,
  SHED_PENALTY,
  createNeighbors,
} from './config'
import type {
  BatteryMode,
  BuildType,
  CloudPoint,
  DayStats,
  Difficulty,
  EventType,
  GameState,
  LogLevel,
  Neighbor,
  NeighborId,
  Snapshot,
  Speed,
} from './types'

const rnd = Math.random
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const hourOf = (minute: number) => (minute % 1440) / 60
export const dayOf = (minute: number) => Math.floor(minute / 1440) + 1

const gauss = (x: number, m: number, sd: number) => Math.exp(-((x - m) ** 2) / (2 * sd * sd))

export function demandShape(h: number) {
  return (
    0.55 +
    0.2 * gauss(h, 8, 1.5) +
    0.13 * gauss(h, 13, 2.5) +
    0.42 * gauss(h, 20, 1.8) +
    0.42 * gauss(h, -4, 1.8)
  )
}

export function clearSky(h: number) {
  if (h <= 6 || h >= 18.5) return 0
  const e = Math.sin((Math.PI * (h - 6)) / 12.5)
  return 1050 * Math.pow(e, 1.15)
}

export const cloudFactor = (c: number) => 1 - 0.78 * Math.pow(c, 1.4)

function emptyStats(): DayStats {
  return {
    revenue: 0,
    exportRevenue: 0,
    importCost: 0,
    fuelCost: 0,
    omCost: 0,
    debtCost: 0,
    penalties: 0,
    solarMWh: 0,
    dieselMWh: 0,
    importMWh: 0,
    exportMWh: 0,
    shedMWh: 0,
    loadMWh: 0,
    curtailedMWh: 0,
    batteryOutMWh: 0,
  }
}

function emptySnap(): Snapshot {
  return {
    irradiance: 0,
    ambient: 27,
    cellTemp: 27,
    tempFactor: 1,
    solarDC: 0,
    solarAC: 0,
    clipping: 0,
    demand: 0,
    load: 0,
    batteryMW: 0,
    dieselMW: 0,
    importMW: 0,
    exportMW: 0,
    curtailMW: 0,
    shedMW: 0,
    invCapacity: 0,
    cashPerHour: 0,
  }
}

function randomCloud() {
  const r = rnd()
  if (r < 0.55) return rnd() * 0.25
  if (r < 0.85) return 0.25 + rnd() * 0.4
  return 0.65 + rnd() * 0.35
}

function ensureSchedule(s: GameState) {
  while (s.cloudSchedule.length < 2 || s.cloudSchedule[s.cloudSchedule.length - 1].minute < s.minute + 1800) {
    const last = s.cloudSchedule[s.cloudSchedule.length - 1]
    const start = last ? last.minute : s.minute - 60
    s.cloudSchedule.push({ minute: start + 120 + rnd() * 240, cloud: randomCloud() })
  }
  while (s.cloudSchedule.length > 2 && s.cloudSchedule[1].minute < s.minute) s.cloudSchedule.shift()
}

export function cloudAt(schedule: CloudPoint[], minute: number) {
  if (schedule.length === 0) return 0.2
  for (let i = 0; i < schedule.length - 1; i++) {
    const a = schedule[i]
    const b = schedule[i + 1]
    if (minute >= a.minute && minute <= b.minute) {
      const t = (minute - a.minute) / (b.minute - a.minute)
      return a.cloud + (b.cloud - a.cloud) * t
    }
  }
  return schedule[schedule.length - 1].cloud
}

function peakFactor(h: number) {
  return clamp((demandShape(h) - 0.55) / 0.45, 0, 1)
}

export function neighborPrice(n: Neighbor, h: number, wind: number) {
  const peak = peakFactor(h)
  let p: number
  if (n.id === 'shamol') p = n.basePrice * (1.5 - 1.0 * wind) * (0.85 + 0.3 * peak)
  else if (n.id === 'marjon') p = n.basePrice * (0.88 + 0.25 * peak)
  else p = n.basePrice * (0.8 + 0.4 * peak)
  if (n.spikeMin > 0) p *= 1.8
  return p
}

function appetite(n: Neighbor, h: number, wind: number) {
  if (n.id === 'shamol') return 0.4 + 0.6 * (1 - wind)
  if (n.id === 'marjon') return 0.85
  return 0.5 + 0.4 * peakFactor(h)
}

export function offerPrice(n: Neighbor) {
  return n.basePrice * n.offerMult * (1 - n.offerCut)
}

export const importPrice = (n: Neighbor) => n.price * 1.12

export function netWorth(s: GameState) {
  return s.cash + s.assetBook - s.debt
}

function pushLog(s: GameState, level: LogLevel, text: string) {
  s.log.unshift({ id: s.nextId++, minute: s.minute, level, text })
  if (s.log.length > 80) s.log.length = 80
}

function hasEvent(s: GameState, t: EventType) {
  return s.events.some((e) => e.type === t)
}

function startEvent(s: GameState, type: EventType, label: string, minutes: number) {
  s.events.push({ id: s.nextId++, type, label, minutesLeft: minutes })
}

export function createGame(difficulty: Difficulty): GameState {
  const d = DIFFICULTY[difficulty]
  const s: GameState = {
    status: 'running',
    difficulty,
    paused: false,
    speed: 1,
    minute: 360,
    cash: d.cash,
    debt: 14_000_000,
    dailyDebtPayment: 14_000_000 * ANNUITY_FACTOR,
    assetBook: 28_400_000,
    reputation: 72,
    marketShare: 1,
    solarMW: 20,
    damagedMW: 0,
    dust: 0.03,
    degradation: 0.02,
    inverters: Array.from({ length: 7 }, (_, i) => ({ id: i + 1, status: 'online' as const, wear: 0.05 + rnd() * 0.15, busyMin: 0 })),
    batteryMWh: 20,
    soc: 8,
    batteryMode: 'auto',
    batteryReserve: 0.1,
    dieselMW: 30,
    dieselEnabled: true,
    dieselRunning: false,
    shedActive: false,
    tariff: 210,
    peakDemand: 28,
    cloud: 0.2,
    wind: 0.5,
    cloudSchedule: [],
    events: [],
    neighbors: createNeighbors(),
    projects: [],
    history: [],
    log: [],
    today: emptyStats(),
    yesterday: null,
    snap: emptySnap(),
    noShedStreak: 0,
    bestGreenShare: 0,
    objectivesDone: {},
    nextId: 1,
    gameOverReason: '',
  }
  ensureSchedule(s)
  pushLog(s, 'info', 'Smena boshlandi. Siz — Quyosh orolining yagona elektr ta’minotchisisiz.')
  pushLog(s, 'warn', 'Hozircha kechasi dizel ishlaydi — yoqilg’i qimmat. Quyosh va batareyani kengaytiring.')
  step(s, 0)
  return s
}

export function step(s: GameState, dt: number) {
  const prev = s.minute
  s.minute += dt
  const h = hourOf(s.minute)
  const dtH = dt / 60
  const d = DIFFICULTY[s.difficulty]

  s.events = s.events.filter((e) => {
    e.minutesLeft -= dt
    if (e.minutesLeft <= 0) {
      pushLog(s, 'info', `${e.label} tugadi.`)
      return false
    }
    return true
  })

  if (dt > 0 && Math.floor(prev / 60) !== Math.floor(s.minute / 60)) hourlyEvents(s)

  ensureSchedule(s)
  let cloud = cloudAt(s.cloudSchedule, s.minute)
  if (hasEvent(s, 'storm')) cloud = Math.max(cloud, 0.93)
  if (hasEvent(s, 'dust')) cloud = Math.max(cloud, 0.45)
  const edge = cloud > 0.2 && cloud < 0.8 ? 0.12 : 0.03
  cloud = clamp(cloud + (rnd() - 0.5) * edge, 0, 1)
  s.cloud = cloud
  s.wind = clamp(s.wind + (rnd() - 0.5) * 0.03 * Math.max(dt, 1) + (hasEvent(s, 'storm') ? 0.05 : 0), 0, 1)

  const ambient = 27 + 5 * Math.sin((Math.PI * (h - 9)) / 12) - cloud * 3 + (hasEvent(s, 'heatwave') ? 5 : 0)
  const irr = clearSky(h) * cloudFactor(cloud)
  const cellTemp = ambient + (irr / 1000) * 28
  const tempFactor = 1 - 0.0038 * (cellTemp - 25)
  const availMW = Math.max(0, s.solarMW - s.damagedMW)
  const dc = availMW * (irr / 1000) * tempFactor * (1 - s.dust) * (1 - s.degradation) * 0.96
  const invCap = s.inverters.filter((i) => i.status === 'online').length * INV_MW
  const acPotential = dc * 0.975
  const solarAC = Math.min(acPotential, invCap)
  const clipping = Math.max(0, acPotential - invCap)

  let demand = s.peakDemand * demandShape(h)
  if ((dayOf(s.minute) - 1) % 7 >= 5) demand *= 0.93
  if (hasEvent(s, 'heatwave')) demand *= 1 + 0.12 * clamp((ambient - 28) / 6, 0.3, 1)
  if (hasEvent(s, 'festival')) demand *= 1.15
  demand *= 1 + (rnd() - 0.5) * 0.02
  const load = demand * s.marketShare

  const pMax = s.batteryMWh * 0.5
  const safeDtH = Math.max(dtH, 1 / 60)
  const reserve = s.batteryMWh * (s.batteryMode === 'discharge' ? 0.05 : s.batteryReserve)
  const maxCharge = Math.max(0, Math.min(pMax, (s.batteryMWh - s.soc) / (0.95 * safeDtH)))
  const maxDis = Math.max(0, Math.min(pMax, ((s.soc - reserve) * 0.95) / safeDtH))
  const net = solarAC - load
  let batt = 0
  const mode: BatteryMode = s.batteryMode
  if (mode === 'auto') batt = net > 0 ? -Math.min(net, maxCharge) : Math.min(-net, maxDis)
  else if (mode === 'charge') batt = -maxCharge
  else if (mode === 'discharge') batt = maxDis

  const net2 = net + batt
  for (const n of s.neighbors) {
    n.exportMW = 0
    n.importMW = 0
    n.price = neighborPrice(n, h, s.wind)
  }

  let surplus = Math.max(0, net2)
  const buyers = s.neighbors.filter((n) => n.cableMW > 0 && n.exportLimit > 0).sort((a, b) => b.price - a.price)
  for (const n of buyers) {
    const e = Math.min(surplus, n.exportLimit, n.cableMW * appetite(n, h, s.wind))
    n.exportMW = e
    surplus -= e
  }
  const curtail = surplus

  let deficit = Math.max(0, -net2)
  const sources: { cost: number; cap: number; apply: (v: number) => void }[] = []
  let dieselOut = 0
  if (s.dieselEnabled && s.dieselMW > 0) sources.push({ cost: FUEL_COST, cap: s.dieselMW, apply: (v) => (dieselOut = v) })
  for (const n of s.neighbors) {
    if (n.cableMW > 0 && n.importEnabled) sources.push({ cost: importPrice(n), cap: n.cableMW, apply: (v) => (n.importMW = v) })
  }
  sources.sort((a, b) => a.cost - b.cost)
  for (const src of sources) {
    const v = Math.min(deficit, src.cap)
    src.apply(v)
    deficit -= v
  }
  let shed = deficit
  if (shed > 0 && batt < 0) {
    const reduce = Math.min(shed, -batt)
    batt += reduce
    shed -= reduce
  }

  if (batt < 0) s.soc += -batt * 0.95 * dtH
  else s.soc -= (batt / 0.95) * dtH
  s.soc = clamp(s.soc, 0, s.batteryMWh)

  let startFee = 0
  const running = dieselOut > 0.01
  if (running && !s.dieselRunning && dt > 0) {
    startFee = DIESEL_START_FEE
    pushLog(s, 'warn', 'Dizel generator ishga tushdi — yoqilg’i sarfi boshlandi.')
  }
  s.dieselRunning = running

  if (shed > 0.05 && !s.shedActive && dt > 0) {
    pushLog(s, 'alarm', `Yuk o’chirildi! ${shed.toFixed(1)} MW iste’molchi elektrsiz qoldi.`)
  }
  s.shedActive = shed > 0.05

  const exportMW = s.neighbors.reduce((a, n) => a + n.exportMW, 0)
  const importMW = s.neighbors.reduce((a, n) => a + n.importMW, 0)
  const served = load - shed
  const revenue = served * s.tariff * dtH
  const expRev = s.neighbors.reduce((a, n) => a + n.exportMW * n.price, 0) * dtH
  const impCost = s.neighbors.reduce((a, n) => a + n.importMW * importPrice(n), 0) * dtH
  const fuel = dieselOut * FUEL_COST * dtH
  const om = ((s.solarMW * 28 + s.batteryMWh * 12 + s.dieselMW * 18 + s.inverters.length * 30 + 2600) / 1440) * dt
  let pay = 0
  if (s.debt > 0) {
    pay = (s.dailyDebtPayment / 1440) * dt
    const interest = ((s.debt * 0.08) / 365 / 1440) * dt
    s.debt = Math.max(0, s.debt - (pay - interest))
    if (s.debt === 0) {
      s.dailyDebtPayment = 0
      pushLog(s, 'good', 'Barcha kreditlar to’liq qaytarildi!')
    }
  }
  const overdraft = s.cash < 0 ? ((-s.cash * 0.15) / 365 / 1440) * dt : 0
  const penalty = shed * SHED_PENALTY * dtH
  const delta = revenue + expRev - impCost - fuel - om - pay - penalty - startFee - overdraft
  s.cash += delta

  const t = s.today
  t.revenue += revenue
  t.exportRevenue += expRev
  t.importCost += impCost
  t.fuelCost += fuel + startFee
  t.omCost += om
  t.debtCost += pay + overdraft
  t.penalties += penalty
  t.solarMWh += solarAC * dtH
  t.dieselMWh += dieselOut * dtH
  t.importMWh += importMW * dtH
  t.exportMWh += exportMW * dtH
  t.shedMWh += shed * dtH
  t.loadMWh += load * dtH
  t.curtailedMWh += curtail * dtH
  t.batteryOutMWh += Math.max(0, batt) * dtH

  const greenToday = t.loadMWh > 1 ? clamp((t.loadMWh - t.dieselMWh - t.importMWh - t.shedMWh) / t.loadMWh, 0, 1) : 0.3
  let target = 92 - Math.max(0, s.tariff - FAIR_TARIFF) * 0.45 + Math.max(0, FAIR_TARIFF - s.tariff) * 0.08
  target += (greenToday - 0.3) * 15
  target = clamp(target, 0, 100)
  s.reputation += (target - s.reputation) * 0.0008 * dt
  if (shed > 0.05) s.reputation -= (shed / Math.max(load, 1)) * 0.15 * dt
  s.reputation = clamp(s.reputation, 0, 100)

  s.dust = clamp(s.dust + 4.5e-6 * dt * (hasEvent(s, 'dust') ? 6 : 1), 0, 0.4)
  if (cloud > 0.85) s.dust *= 1 - 0.0015 * dt
  s.degradation += (0.006 / 525600) * dt

  const loadFrac = invCap > 0 ? solarAC / invCap : 0
  for (const inv of s.inverters) {
    if (inv.status === 'online') {
      inv.wear = clamp(inv.wear + 0.000006 * loadFrac * dt * (cellTemp > 45 ? 1.5 : 1), 0, 1)
      const prob = 0.000018 * d.fault * (1 + inv.wear * 5) * (loadFrac > 0.1 ? 1.5 : 0.3) * dt
      if (rnd() < prob) {
        if (rnd() < 0.55) {
          inv.status = 'tripped'
          pushLog(s, 'alarm', `INV-${inv.id} himoya rele tomonidan o’chirildi. Qayta yoqing (RESET).`)
        } else {
          inv.status = 'fault'
          pushLog(s, 'alarm', `INV-${inv.id} nosoz — ta’mirlash brigadasi kerak.`)
        }
      }
    } else if (inv.status === 'repair' || inv.status === 'maintenance') {
      inv.busyMin -= dt
      if (inv.busyMin <= 0) {
        if (inv.status === 'maintenance') inv.wear = 0
        else inv.wear = Math.max(0, inv.wear - 0.1)
        inv.status = 'online'
        pushLog(s, 'good', `INV-${inv.id} yana tarmoqqa ulandi.`)
      }
    }
  }

  s.projects = s.projects.filter((p) => {
    p.minutesLeft -= dt
    if (p.minutesLeft > 0) return true
    completeProject(s, p.type, p.amount, p.neighborId)
    pushLog(s, 'good', `Qurilish yakunlandi: ${p.label}.`)
    return false
  })

  for (const n of s.neighbors) {
    if (n.spikeMin > 0) n.spikeMin -= dt
    if (n.offerCutMin > 0) {
      n.offerCutMin -= dt
      if (n.offerCutMin <= 0) {
        n.offerCut = 0
        pushLog(s, 'info', `${n.name} narx urushini to’xtatdi.`)
      }
    }
  }

  s.snap = {
    irradiance: irr,
    ambient,
    cellTemp,
    tempFactor,
    solarDC: dc,
    solarAC,
    clipping,
    demand,
    load,
    batteryMW: batt,
    dieselMW: dieselOut,
    importMW,
    exportMW,
    curtailMW: curtail,
    shedMW: shed,
    invCapacity: invCap,
    cashPerHour: dt > 0 ? delta / dtH : 0,
  }

  if (dt === 0 || Math.floor(prev / 15) !== Math.floor(s.minute / 15)) {
    s.history.push({
      minute: s.minute,
      solar: solarAC,
      load,
      battery: batt,
      diesel: dieselOut,
      imp: importMW,
      exp: exportMW,
      soc: s.batteryMWh > 0 ? s.soc / s.batteryMWh : 0,
    })
    if (s.history.length > 192) s.history.shift()
  }

  if (dt > 0 && Math.floor(prev / 1440) !== Math.floor(s.minute / 1440)) endOfDay(s)

  if (s.cash < BANKRUPT_LIMIT) {
    s.status = 'over'
    s.gameOverReason = 'Kompaniya bankrot bo’ldi: qarz chegarasidan oshib ketdingiz va bank hisobingizni muzlatdi.'
  }
}

function hourlyEvents(s: GameState) {
  const p = DIFFICULTY[s.difficulty].event
  if (!hasEvent(s, 'storm') && rnd() < 0.006 * p) {
    const dur = 360 + rnd() * 360
    startEvent(s, 'storm', 'Tropik bo’ron', dur)
    const dmg = Math.max(0, s.solarMW - s.damagedMW) * (0.02 + rnd() * 0.05)
    s.damagedMW += dmg
    pushLog(s, 'alarm', `Tropik bo’ron! Kuchli bulut va shamol. ${dmg.toFixed(1)} MWp panel shikastlandi.`)
  }
  if (!hasEvent(s, 'heatwave') && rnd() < 0.006 * p) {
    startEvent(s, 'heatwave', 'Jazirama', 1440 + rnd() * 1440)
    pushLog(s, 'warn', 'Jazirama boshlandi: konditsionerlar talabni oshiradi, panel samaradorligi pasayadi.')
  }
  if (!hasEvent(s, 'dust') && rnd() < 0.005 * p) {
    startEvent(s, 'dust', 'Chang bo’roni', 360)
    s.dust = clamp(s.dust + 0.1, 0, 0.4)
    pushLog(s, 'warn', 'Chang bo’roni panellarni qopladi. Tozalashni rejalashtiring.')
  }
  if (!hasEvent(s, 'festival') && rnd() < 0.004) {
    startEvent(s, 'festival', 'Orol bayrami', 480)
    pushLog(s, 'info', 'Orolda bayram! Kechki talab 15% ga oshadi.')
  }
  for (const n of s.neighbors) {
    if (n.spikeMin <= 0 && rnd() < 0.02) {
      n.spikeMin = 90 + rnd() * 150
      pushLog(s, 'info', `${n.name}da generator ishdan chiqdi — u yerda elektr narxi keskin oshdi.`)
    }
  }
  const tosh = s.neighbors[2]
  const rival = rnd() < 0.6 ? tosh : s.neighbors[0]
  if (rival.offerCutMin <= 0 && rnd() < 0.003 * DIFFICULTY[s.difficulty].comp) {
    rival.offerCut = 0.2
    rival.offerCutMin = 4320
    pushLog(s, 'alarm', `${rival.name} narx urushini boshladi: hukumatingizga 20% arzon taklif berdi!`)
  }
}

function completeProject(s: GameState, type: BuildType, amount: number, neighborId?: NeighborId) {
  if (type === 'solar') s.solarMW += amount
  else if (type === 'inverter') {
    const id = s.inverters.reduce((m, i) => Math.max(m, i.id), 0) + 1
    s.inverters.push({ id, status: 'online', wear: 0, busyMin: 0 })
  } else if (type === 'battery') s.batteryMWh += amount
  else if (type === 'diesel') s.dieselMW += amount
  else if (type === 'repairPanels') s.damagedMW = Math.max(0, s.damagedMW - amount)
  else if (type === 'cable' && neighborId) {
    const n = s.neighbors.find((x) => x.id === neighborId)
    if (n) {
      n.cableMW = amount
      n.cableBuilding = false
      n.exportLimit = amount
    }
  }
}

function endOfDay(s: GameState) {
  const d = DIFFICULTY[s.difficulty]
  const t = s.today
  const green = t.loadMWh > 1 ? clamp((t.loadMWh - t.dieselMWh - t.importMWh - t.shedMWh) / t.loadMWh, 0, 1) : 0
  const income = t.revenue + t.exportRevenue
  const costs = t.importCost + t.fuelCost + t.omCost + t.debtCost + t.penalties
  const day = dayOf(s.minute) - 1
  pushLog(
    s,
    income - costs >= 0 ? 'good' : 'warn',
    `${day}-kun yakuni: foyda ${income - costs >= 0 ? '+' : '−'}$${Math.round(Math.abs(income - costs)).toLocaleString('en-US')}, quyosh ulushi ${Math.round(green * 100)}%.`,
  )

  const best = s.neighbors.reduce((a, b) => (offerPrice(a) < offerPrice(b) ? a : b))
  const ratio = s.tariff / offerPrice(best)
  let change = 0
  if (ratio > 1.08) change -= (0.015 + (ratio - 1.08) * 0.12) * d.comp
  if (s.reputation < 55) change -= 0.02 * d.comp
  if (t.loadMWh > 0 && t.shedMWh > 0.5) change -= Math.min(0.05, (t.shedMWh / t.loadMWh) * 0.5)
  if (change === 0 && ratio < 1.0 && s.reputation > 70) change += 0.02
  else if (change === 0 && s.reputation > 75) change += 0.01
  change = clamp(change, -0.12, 0.05)
  if (change < 0) {
    const lost = Math.min(-change, s.marketShare - 0.3)
    if (lost > 0.001) {
      best.takenShare += lost
      s.marketShare -= lost
      pushLog(s, 'alarm', `${best.name} shahar iste’molchilarining ${(lost * 100).toFixed(1)}% ini o’ziga oqdirdi!`)
    }
  } else if (change > 0 && s.marketShare < 1) {
    const gain = Math.min(change, 1 - s.marketShare)
    const from = s.neighbors.reduce((a, b) => (a.takenShare > b.takenShare ? a : b))
    from.takenShare = Math.max(0, from.takenShare - gain)
    s.marketShare += gain
    pushLog(s, 'good', `Mijozlar qaytmoqda: bozor ulushi +${(gain * 100).toFixed(1)}%.`)
  }

  s.peakDemand *= 1.0015
  for (const n of s.neighbors) {
    n.netWorth *= 1 + 0.0015 * d.comp + rnd() * 0.004
    n.netWorth += n.takenShare * s.peakDemand * 14 * 40
    n.capacityMW *= 1.001 + rnd() * 0.002
    n.basePrice *= 1 + (rnd() - 0.5) * 0.02
  }

  if (green > 0.6) {
    const grant = Math.round(40_000 + (green - 0.6) * 200_000)
    s.cash += grant
    pushLog(s, 'good', `Hukumat “yashil energiya” granti berdi: +$${grant.toLocaleString('en-US')}.`)
  }

  s.noShedStreak = t.shedMWh < 0.1 ? s.noShedStreak + 1 : 0
  s.bestGreenShare = Math.max(s.bestGreenShare, green)
  s.assetBook *= 0.9997
  s.yesterday = t
  s.today = emptyStats()

  for (const o of OBJECTIVES) {
    if (!s.objectivesDone[o.id] && o.check(s, green)) {
      s.objectivesDone[o.id] = day
      const bonus = 150_000
      s.cash += bonus
      pushLog(s, 'good', `Maqsad bajarildi: “${o.label}”. Bonus +$${bonus.toLocaleString('en-US')}.`)
    }
  }
}

export type Payment = 'cash' | 'loan'

export type GameAction =
  | { type: 'start'; difficulty: Difficulty }
  | { type: 'menu' }
  | { type: 'tick' }
  | { type: 'togglePause' }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'setTariff'; value: number }
  | { type: 'setBatteryMode'; mode: BatteryMode }
  | { type: 'setReserve'; value: number }
  | { type: 'toggleDiesel' }
  | { type: 'cleanPanels' }
  | { type: 'resetInverter'; id: number }
  | { type: 'repairInverter'; id: number }
  | { type: 'maintainInverter'; id: number }
  | { type: 'build'; build: BuildType; payment: Payment; neighborId?: NeighborId }
  | { type: 'setExportLimit'; id: NeighborId; value: number }
  | { type: 'toggleImport'; id: NeighborId }
  | { type: 'restart' }                 // <-- YANGI: Qayta boshlash action'i
  | { type: 'payLoan'; amount: number }  // <-- YANGI: Kreditni mustaqil to'lash action'i

export function buildCost(s: GameState, build: BuildType, neighborId?: NeighborId) {
  if (build === 'repairPanels') return Math.round(s.damagedMW * PANEL_REPAIR_PER_MW)
  if (build === 'cable') return s.neighbors.find((n) => n.id === neighborId)?.cableCost ?? 0
  return BUILD_OPTIONS.find((b) => b.type === build)?.cost ?? 0
}

export function canAfford(s: GameState, cost: number, payment: Payment) {
  return payment === 'cash' ? s.cash >= cost : s.debt + cost <= MAX_DEBT
}

function handleBuild(s: GameState, build: BuildType, payment: Payment, neighborId?: NeighborId) {
  const cost = buildCost(s, build, neighborId)
  if (cost <= 0 || !canAfford(s, cost, payment)) return
  let label = ''
  let minutes = 0
  let amount = 0
  if (build === 'repairPanels') {
    if (s.projects.some((p) => p.type === 'repairPanels')) return
    label = `Panel ta’miri (${s.damagedMW.toFixed(1)} MWp)`
    minutes = 1440
    amount = s.damagedMW
  } else if (build === 'cable') {
    const n = s.neighbors.find((x) => x.id === neighborId)
    if (!n || n.cableMW > 0 || n.cableBuilding) return
    n.cableBuilding = true
    label = `${n.name}ga suv osti kabeli`
    minutes = 5760
    amount = CABLE_MW
  } else {
    const opt = BUILD_OPTIONS.find((b) => b.type === build)!
    label = `${opt.label} (${opt.short})`
    minutes = opt.minutes
    amount = opt.amount
  }
  if (payment === 'cash') s.cash -= cost
  else {
    s.debt += cost
    s.dailyDebtPayment = s.debt * ANNUITY_FACTOR
  }
  if (build !== 'repairPanels') s.assetBook += cost * (build === 'diesel' ? 0.5 : 0.85)
  s.projects.push({ id: s.nextId++, type: build, label, minutesLeft: minutes, totalMinutes: minutes, amount, neighborId })
  pushLog(s, 'info', `Qurilish boshlandi: ${label} — $${cost.toLocaleString('en-US')} (${payment === 'cash' ? 'naqd' : 'kredit'}).`)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'start') return createGame(action.difficulty)
  if (action.type === 'menu') return { ...state, status: 'menu' }
  
  // <-- YANGI: Restart amali (joriy qiyinchilik darajasini saqlagan holda boshidan boshlaydi)
  if (action.type === 'restart') {
    return createGame(state.difficulty)
  }

  if (state.status !== 'running') return state

  const s = structuredClone(state)
  switch (action.type) {
    case 'tick':
      if (s.paused) return state
      for (let i = 0; i < s.speed && s.status === 'running'; i++) step(s, 1)
      break
    case 'togglePause':
      s.paused = !s.paused
      break
    case 'setSpeed':
      s.speed = action.speed
      s.paused = false
      break
    case 'setTariff':
      s.tariff = clamp(Math.round(action.value), 120, 320)
      break
    case 'setBatteryMode':
      s.batteryMode = action.mode
      break
    case 'setReserve':
      s.batteryReserve = clamp(action.value, 0, 0.5)
      break
    case 'toggleDiesel':
      s.dieselEnabled = !s.dieselEnabled
      pushLog(s, s.dieselEnabled ? 'info' : 'warn', s.dieselEnabled ? 'Dizel zaxira rejimiga qo’yildi.' : 'Dizel bloklandi — tanqislikda yuk o’chirilishi mumkin!')
      break
    case 'cleanPanels': {
      const cost = Math.round(s.solarMW * CLEAN_COST_PER_MW)
      if (s.cash < cost) return state
      s.cash -= cost
      s.today.omCost += cost
      s.dust = 0.005
      pushLog(s, 'good', `Panellar yuvildi — $${cost.toLocaleString('en-US')}. Chang yo’qotishi bartaraf etildi.`)
      break
    }
    case 'resetInverter': {
      const inv = s.inverters.find((i) => i.id === action.id)
      if (!inv || inv.status !== 'tripped') return state
      if (rnd() < 0.15 + inv.wear * 0.3) {
        inv.status = 'fault'
        pushLog(s, 'alarm', `INV-${inv.id} qayta yoqilmadi — ichki nosozlik topildi.`)
      } else {
        inv.status = 'online'
        pushLog(s, 'good', `INV-${inv.id} qayta tarmoqqa ulandi.`)
      }
      break
    }
    case 'repairInverter': {
      const inv = s.inverters.find((i) => i.id === action.id)
      if (!inv || inv.status !== 'fault' || s.cash < INVERTER_REPAIR_COST) return state
      s.cash -= INVERTER_REPAIR_COST
      s.today.omCost += INVERTER_REPAIR_COST
      inv.status = 'repair'
      inv.busyMin = 180
      pushLog(s, 'info', `INV-${inv.id}ga ta’mirlash brigadasi yuborildi (3 soat).`)
      break
    }
    case 'maintainInverter': {
      const inv = s.inverters.find((i) => i.id === action.id)
      if (!inv || inv.status !== 'online' || s.cash < INVERTER_MAINT_COST) return state
      s.cash -= INVERTER_MAINT_COST
      s.today.omCost += INVERTER_MAINT_COST
      inv.status = 'maintenance'
      inv.busyMin = 240
      pushLog(s, 'info', `INV-${inv.id} rejali texnik xizmatga olindi (4 soat).`)
      break
    }
    case 'build':
      handleBuild(s, action.build, action.payment, action.neighborId)
      break
    case 'setExportLimit': {
      const n = s.neighbors.find((x) => x.id === action.id)
      if (!n) return state
      n.exportLimit = clamp(action.value, 0, n.cableMW)
      break
    }
    case 'toggleImport': {
      const n = s.neighbors.find((x) => x.id === action.id)
      if (!n || n.cableMW <= 0) return state
      n.importEnabled = !n.importEnabled
      break
    }
    // <-- YANGI: Kreditni mustaqil ravishda to'lash amali
    case 'payLoan': {
      const payAmount = Math.round(action.amount)
      if (payAmount <= 0 || payAmount > s.cash || s.debt <= 0) return state
      
      const actualPayment = Math.min(payAmount, s.debt)
      s.cash -= actualPayment
      s.debt -= actualPayment
      s.dailyDebtPayment = s.debt * ANNUITY_FACTOR
      
      pushLog(s, 'good', `Kredit qisman yopildi: -$${actualPayment.toLocaleString('en-US')}. Qolgan qarz: $${Math.round(s.debt).toLocaleString('en-US')}.`)
      break
    }
  }
  return s
}

export function forecast(s: GameState, hours: number) {
  const out: { minute: number; cloud: number; solar: number; demand: number }[] = []
  const startHour = Math.floor(s.minute / 60) + 1
  const avail = Math.max(0, s.solarMW - s.damagedMW) * (1 - s.dust) * (1 - s.degradation) * 0.96 * 0.975
  const invCap = s.inverters.filter((i) => i.status === 'online').length * INV_MW
  for (let i = 0; i < hours; i++) {
    const m = (startHour + i) * 60
    const h = hourOf(m)
    const c = cloudAt(s.cloudSchedule, m)
    out.push({
      minute: m,
      cloud: c,
      solar: Math.min(invCap, (avail * clearSky(h) * cloudFactor(c) * 0.93) / 1000),
      demand: s.peakDemand * demandShape(h) * s.marketShare,
    })
  }
  return out
}