export type Difficulty = 'oson' | 'realistik' | 'qiyin'
export type Speed = 1 | 2 | 5 | 10
export type InverterStatus = 'online' | 'tripped' | 'fault' | 'repair' | 'maintenance'
export type BatteryMode = 'auto' | 'charge' | 'hold' | 'discharge'
export type BuildType = 'solar' | 'inverter' | 'battery' | 'diesel' | 'repairPanels' | 'cable'
export type NeighborId = 'shamol' | 'marjon' | 'tosh'
export type EventType = 'storm' | 'heatwave' | 'dust' | 'festival'
export type LogLevel = 'info' | 'good' | 'warn' | 'alarm'

export interface Inverter {
  id: number
  status: InverterStatus
  wear: number
  busyMin: number
}

export interface Project {
  id: number
  type: BuildType
  label: string
  minutesLeft: number
  totalMinutes: number
  amount: number
  neighborId?: NeighborId
}

export interface Neighbor {
  id: NeighborId
  name: string
  source: string
  description: string
  basePrice: number
  offerMult: number
  price: number
  spikeMin: number
  offerCut: number
  offerCutMin: number
  cableMW: number
  cableCost: number
  cableBuilding: boolean
  exportLimit: number
  importEnabled: boolean
  exportMW: number
  importMW: number
  netWorth: number
  capacityMW: number
  takenShare: number
}

export interface ActiveEvent {
  id: number
  type: EventType
  label: string
  minutesLeft: number
}

export interface LogEntry {
  id: number
  minute: number
  level: LogLevel
  text: string
}

export interface HistoryPoint {
  minute: number
  solar: number
  load: number
  battery: number
  diesel: number
  imp: number
  exp: number
  soc: number
}

export interface DayStats {
  revenue: number
  exportRevenue: number
  importCost: number
  fuelCost: number
  omCost: number
  debtCost: number
  penalties: number
  solarMWh: number
  dieselMWh: number
  importMWh: number
  exportMWh: number
  shedMWh: number
  loadMWh: number
  curtailedMWh: number
  batteryOutMWh: number
}

export interface Snapshot {
  irradiance: number
  ambient: number
  cellTemp: number
  tempFactor: number
  solarDC: number
  solarAC: number
  clipping: number
  demand: number
  load: number
  batteryMW: number
  dieselMW: number
  importMW: number
  exportMW: number
  curtailMW: number
  shedMW: number
  invCapacity: number
  cashPerHour: number
}

export interface CloudPoint {
  minute: number
  cloud: number
}

export interface GameState {
  status: 'menu' | 'running' | 'over'
  difficulty: Difficulty
  paused: boolean
  speed: Speed
  minute: number
  cash: number
  debt: number
  dailyDebtPayment: number
  assetBook: number
  reputation: number
  marketShare: number
  solarMW: number
  damagedMW: number
  dust: number
  degradation: number
  inverters: Inverter[]
  batteryMWh: number
  soc: number
  batteryMode: BatteryMode
  batteryReserve: number
  dieselMW: number
  dieselEnabled: boolean
  dieselRunning: boolean
  shedActive: boolean
  tariff: number
  peakDemand: number
  cloud: number
  wind: number
  cloudSchedule: CloudPoint[]
  events: ActiveEvent[]
  neighbors: Neighbor[]
  projects: Project[]
  history: HistoryPoint[]
  log: LogEntry[]
  today: DayStats
  yesterday: DayStats | null
  snap: Snapshot
  noShedStreak: number
  bestGreenShare: number
  objectivesDone: Record<string, number>
  nextId: number
  gameOverReason: string
}
