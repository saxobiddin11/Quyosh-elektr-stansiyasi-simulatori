import type { BuildType, Difficulty, GameState, Neighbor } from './types'

export const INV_MW = 2.5
export const FUEL_COST = 270
export const SHED_PENALTY = 2000
export const FAIR_TARIFF = 215
export const MAX_DEBT = 45_000_000
export const LOAN_RATE = 0.08
export const LOAN_YEARS = 10
export const CLEAN_COST_PER_MW = 1500
export const PANEL_REPAIR_PER_MW = 220_000
export const INVERTER_REPAIR_COST = 18_000
export const INVERTER_MAINT_COST = 25_000
export const DIESEL_START_FEE = 800
export const BANKRUPT_LIMIT = -3_000_000
export const CABLE_MW = 15

const dailyRate = LOAN_RATE / 365
const periods = LOAN_YEARS * 365
export const ANNUITY_FACTOR = dailyRate / (1 - Math.pow(1 + dailyRate, -periods))

export const DIFFICULTY: Record<
  Difficulty,
  { label: string; cash: number; fault: number; event: number; comp: number; description: string }
> = {
  oson: {
    label: 'Oson',
    cash: 7_000_000,
    fault: 0.5,
    event: 0.6,
    comp: 0.6,
    description: 'Ko’proq boshlang’ich mablag’, kam nosozlik, yumshoq raqobat.',
  },
  realistik: {
    label: 'Realistik',
    cash: 4_000_000,
    fault: 1,
    event: 1,
    comp: 1,
    description: 'Haqiqiy orol energetikasiga yaqin iqtisod va ob-havo.',
  },
  qiyin: {
    label: 'Qiyin',
    cash: 2_000_000,
    fault: 1.6,
    event: 1.4,
    comp: 1.5,
    description: 'Kam pul, tez-tez bo’ronlar, agressiv qo’shnilar.',
  },
}

export interface BuildOption {
  type: Exclude<BuildType, 'repairPanels' | 'cable'>
  label: string
  short: string
  cost: number
  minutes: number
  amount: number
  unit: string
  description: string
}

export const BUILD_OPTIONS: BuildOption[] = [
  {
    type: 'solar',
    label: 'Quyosh paneli bloki',
    short: '+5 MWp',
    cost: 4_000_000,
    minutes: 2880,
    amount: 5,
    unit: 'MWp',
    description: 'Monokristall panellar, ~$0.80/Wp. Invertor quvvatisiz to’liq ishlamaydi.',
  },
  {
    type: 'inverter',
    label: 'Markaziy invertor',
    short: '+2.5 MW',
    cost: 260_000,
    minutes: 720,
    amount: 2.5,
    unit: 'MW AC',
    description: 'DC ni AC ga aylantiradi. Kam bo’lsa — tush paytida “qirqish” yuz beradi.',
  },
  {
    type: 'battery',
    label: 'Litiy batareya tizimi',
    short: '+10 MWh',
    cost: 3_200_000,
    minutes: 2160,
    amount: 10,
    unit: 'MWh',
    description: 'LFP, 2 soatlik (5 MW). Kunduzgi ortiqchani kechqurunga o’tkazadi.',
  },
  {
    type: 'diesel',
    label: 'Zaxira dizel generator',
    short: '+5 MW',
    cost: 2_600_000,
    minutes: 2880,
    amount: 5,
    unit: 'MW',
    description: `Ishonchli, lekin yoqilg’i ~$${FUEL_COST}/MWh. Faqat zaxira uchun.`,
  },
]

export function createNeighbors(): Neighbor[] {
  return [
    {
      id: 'shamol',
      name: 'Shamol oroli',
      source: 'Shamol fermasi',
      description: 'Shamolli kechalarda arzon, sokin kunlarda qimmat. Ishonchsiz, lekin arzon taklif beradi.',
      basePrice: 105,
      offerMult: 1.95,
      price: 105,
      spikeMin: 0,
      offerCut: 0,
      offerCutMin: 0,
      cableMW: 0,
      cableCost: 6_500_000,
      cableBuilding: false,
      exportLimit: 0,
      importEnabled: false,
      exportMW: 0,
      importMW: 0,
      netWorth: 21_000_000,
      capacityMW: 38,
      takenShare: 0,
    },
    {
      id: 'marjon',
      name: 'Marjon oroli',
      source: 'Dizel elektrostansiya',
      description: 'Dizelga bog’liq, elektr qimmat. Kunduzgi quyosh energiyangizni yaxshi narxda sotib oladi.',
      basePrice: 240,
      offerMult: 1.4,
      price: 240,
      spikeMin: 0,
      offerCut: 0,
      offerCutMin: 0,
      cableMW: 0,
      cableCost: 8_000_000,
      cableBuilding: false,
      exportLimit: 0,
      importEnabled: false,
      exportMW: 0,
      importMW: 0,
      netWorth: 14_000_000,
      capacityMW: 26,
      takenShare: 0,
    },
    {
      id: 'tosh',
      name: 'Tosh oroli',
      source: 'Gaz turbinasi',
      description: 'Eng kuchli raqobatchi. Barqaror narx va oroliningiz bozorini egallashga intiladi.',
      basePrice: 150,
      offerMult: 1.45,
      price: 150,
      spikeMin: 0,
      offerCut: 0,
      offerCutMin: 0,
      cableMW: 0,
      cableCost: 7_000_000,
      cableBuilding: false,
      exportLimit: 0,
      importEnabled: false,
      exportMW: 0,
      importMW: 0,
      netWorth: 32_000_000,
      capacityMW: 60,
      takenShare: 0,
    },
  ]
}

export interface Objective {
  id: string
  label: string
  check: (s: GameState, greenShare: number) => boolean
}

export const OBJECTIVES: Objective[] = [
  { id: 'green50', label: 'Bir kunda talabning 50% ini quyoshdan qoplang', check: (_s, g) => g >= 0.5 },
  { id: 'green80', label: 'Bir kunda talabning 80% ini quyoshdan qoplang', check: (_s, g) => g >= 0.8 },
  { id: 'noShed7', label: '7 kun ketma-ket elektr o’chirishsiz ishlang', check: (s) => s.noShedStreak >= 7 },
  { id: 'cable2', label: 'Kamida 2 ta qo’shni orolga kabel torting', check: (s) => s.neighbors.filter((n) => n.cableMW > 0).length >= 2 },
  { id: 'share100', label: 'Bozor ulushini 100% ga qaytaring (reputatsiya 80+)', check: (s) => s.marketShare >= 0.999 && s.reputation >= 80 },
  { id: 'nw50', label: 'Sof qiymatni $50M ga yetkazing', check: (s) => s.cash + s.assetBook - s.debt >= 50_000_000 },
  {
    id: 'leader',
    label: 'Sof qiymat bo’yicha mintaqada 1-o’ringa chiqing',
    check: (s) => {
      const nw = s.cash + s.assetBook - s.debt
      return s.neighbors.every((n) => nw > n.netWorth)
    },
  },
]
