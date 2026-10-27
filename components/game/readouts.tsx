import { mw, pct } from '@/lib/game/format'
import type { GameState } from '@/lib/game/types'
import { Panel, Stat } from './panel'

export function Readouts({ s }: { s: GameState }) {
  const n = s.snap
  const balance = n.solarAC + n.batteryMW + n.dieselMW + n.importMW - n.exportMW - n.load
  const online = s.inverters.filter((i) => i.status === 'online').length
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Panel title="Quyosh maydoni">
        <Stat label="O’rnatilgan" value={`${s.solarMW.toFixed(1)} MWp`} />
        <Stat label="Nurlanish" value={`${Math.round(n.irradiance)} W/m²`} tone="primary" />
        <Stat label="Panel harorati" value={`${n.cellTemp.toFixed(1)}°C`} tone={n.cellTemp > 50 ? 'warn' : 'default'} />
        <Stat label="Harorat koeff." value={pct(n.tempFactor, 1)} tone={n.tempFactor < 0.92 ? 'warn' : 'default'} />
        <Stat label="Chang yo’qotish" value={pct(s.dust, 1)} tone={s.dust > 0.08 ? 'bad' : s.dust > 0.04 ? 'warn' : 'good'} />
        <Stat label="Degradatsiya" value={pct(s.degradation, 2)} />
        <Stat label="Shikastlangan" value={`${s.damagedMW.toFixed(1)} MWp`} tone={s.damagedMW > 0 ? 'bad' : 'default'} />
        <Stat label="DC quvvat" value={mw(n.solarDC)} />
        <Stat label="AC chiqish" value={mw(n.solarAC)} tone="primary" />
        <Stat label="Qirqish (clipping)" value={mw(n.clipping)} tone={n.clipping > 0.3 ? 'warn' : 'default'} />
        <Stat label="Invertorlar" value={`${online}/${s.inverters.length} · ${mw(n.invCapacity)}`} />
      </Panel>
      <Panel title="Elektr tarmog’i">
        <Stat label="Orol talabi" value={mw(n.demand)} />
        <Stat label="Sizning yuk" value={mw(n.load)} />
        <Stat label="Batareya" value={`${n.batteryMW >= 0 ? '+' : ''}${mw(n.batteryMW)}`} tone="accent" />
        <Stat label="Zaryad (SOC)" value={`${s.soc.toFixed(1)}/${s.batteryMWh} MWh`} tone="accent" />
        <Stat label="Dizel" value={mw(n.dieselMW)} tone={n.dieselMW > 0.05 ? 'warn' : 'default'} />
        <Stat label="Import" value={mw(n.importMW)} tone={n.importMW > 0.05 ? 'warn' : 'default'} />
        <Stat label="Eksport" value={mw(n.exportMW)} tone={n.exportMW > 0.05 ? 'good' : 'default'} />
        <Stat label="Cheklangan" value={mw(n.curtailMW)} tone={n.curtailMW > 0.1 ? 'warn' : 'default'} />
        <Stat label="O’chirilgan yuk" value={mw(n.shedMW)} tone={n.shedMW > 0.05 ? 'bad' : 'good'} />
        <Stat label="Balans" value={mw(balance, 2)} tone={Math.abs(balance) < 0.1 ? 'good' : 'bad'} />
        <Stat label="Chastota" value={`${(50 + (n.shedMW > 0.05 ? -0.6 : 0) + (Math.random() - 0.5) * 0.04).toFixed(2)} Hz`} tone={n.shedMW > 0.05 ? 'bad' : 'good'} />
      </Panel>
    </div>
  )
}
