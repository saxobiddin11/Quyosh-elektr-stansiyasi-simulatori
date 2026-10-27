'use client'

import { Sun, X } from 'lucide-react'
import { useState } from 'react'
import type { GameDispatch } from '@/hooks/use-game'
import { DIFFICULTY } from '@/lib/game/config'
import { netWorth } from '@/lib/game/engine'
import { dayLabel, usd } from '@/lib/game/format'
import type { Difficulty, GameState } from '@/lib/game/types'
import { cn } from '@/lib/utils'

export function StartScreen({ dispatch }: { dispatch: GameDispatch }) {
  const [diff, setDiff] = useState<Difficulty>('realistik')
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-md border border-border bg-card">
        <div className="flex items-center gap-3 border-b border-border p-5">
          <div className="flex size-11 items-center justify-center rounded bg-primary text-primary-foreground">
            <Sun className="size-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-balance text-xl font-semibold">Quyosh Oroli Energiya</h1>
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Quyosh elektr stansiyasi simulyatori</p>
          </div>
        </div>
        <div className="flex flex-col gap-5 p-5">
          <p className="text-pretty text-sm leading-relaxed text-foreground/90">
            Siz okeandagi kichik orolning <span className="text-primary">yagona elektr ta’minotchisisiz</span>. 20 MWp quyosh maydoni, 20 MWh batareya
            va eski dizel generator sizga meros qoldi. Shahar talabi har soniyada qoplanishi shart — aks holda chiroqlar o’chadi.
          </p>
          <ul className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <li className="rounded border border-border bg-background p-3">Quyosh, bulut, harorat va chang ishlab chiqarishga realistik ta’sir qiladi.</li>
            <li className="rounded border border-border bg-background p-3">Batareya bilan kunduzgi energiyani kechqurunga o’tkazing, dizelni kamaytiring.</li>
            <li className="rounded border border-border bg-background p-3">Shamol, Marjon va Tosh orollari bilan kabel orqali savdo qiling.</li>
            <li className="rounded border border-border bg-background p-3">Ehtiyot bo’ling: raqobatchilar qimmat tarifda mijozlaringizni tortib oladi.</li>
          </ul>
          <fieldset>
            <legend className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Qiyinlik darajasi</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={diff === d}
                  onClick={() => setDiff(d)}
                  className={cn('rounded border p-3 text-left', diff === d ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary')}
                >
                  <span className={cn('block text-sm font-semibold', diff === d && 'text-primary')}>{DIFFICULTY[d].label}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">Boshlang’ich: {usd(DIFFICULTY[d].cash)}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">{DIFFICULTY[d].description}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            onClick={() => dispatch({ type: 'start', difficulty: diff })}
            className="rounded bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Smenani boshlash
          </button>
          <p className="text-center font-mono text-[10px] text-muted-foreground">Probel — pauza · 1/2/3/4 — tezlik</p>
        </div>
      </div>
    </main>
  )
}

export function RestartDialog({
  open,
  currentDifficulty,
  onClose,
  onRestart,
}: {
  open: boolean
  currentDifficulty: Difficulty
  onClose: () => void
  onRestart: (difficulty: Difficulty) => void
}) {
  const [diff, setDiff] = useState<Difficulty>(currentDifficulty)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-labelledby="restart-title" onClick={onClose}>
      <div className="w-full max-w-xl rounded-md border border-border bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="restart-title" className="text-lg font-semibold">O’yinni qayta boshlash</h2>
            <p className="text-sm text-muted-foreground">Joriy progress tozalanadi. Qaysi qiyinchilik darajasidan boshlamoqchisiz?</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Yopish" className="rounded p-1 hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDiff(d)
                onRestart(d)
              }}
              className={cn(
                'rounded border p-3 text-left transition-colors',
                diff === d ? 'border-primary bg-primary/10' : 'border-border hover:bg-secondary',
              )}
            >
              <span className={cn('block text-sm font-semibold', diff === d && 'text-primary')}>{DIFFICULTY[d].label}</span>
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">Boshlang’ich: {usd(DIFFICULTY[d].cash)}</span>
              <span className="mt-2 block text-[11px] leading-snug text-muted-foreground">{DIFFICULTY[d].description}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-between gap-3">
          <button type="button" onClick={onClose} className="rounded border border-border px-4 py-2 text-sm hover:bg-secondary">
            Bekor qilish
          </button>
          <button type="button" onClick={() => onRestart(diff)} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            Boshlash
          </button>
        </div>
      </div>
    </div>
  )
}

export function GameOver({ s, dispatch }: { s: GameState; dispatch: GameDispatch }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur" role="alertdialog" aria-labelledby="go-title">
      <div className="w-full max-w-md rounded-md border border-destructive/60 bg-card p-6 text-center">
        <h2 id="go-title" className="text-xl font-semibold text-destructive">O’yin tugadi</h2>
        <p className="mt-2 text-sm text-muted-foreground">{s.gameOverReason}</p>
        <p className="mt-4 font-mono text-xs">
          Ishlagan muddat: {dayLabel(s.minute)} · Sof qiymat: {usd(netWorth(s))}
        </p>
        <button type="button" onClick={() => dispatch({ type: 'menu' })} className="mt-6 w-full rounded bg-primary py-2.5 text-sm font-semibold text-primary-foreground">
          Yangi o’yin
        </button>
      </div>
    </div>
  )
}

const GUIDE: { title: string; items: string[] }[] = [
  {
    title: '1 · Asosiy vazifa',
    items: [
      'Har lahzada ishlab chiqarish talabga teng bo’lishi kerak. Yetmasa — yuk o’chiriladi: $2,000/MWh jarima va obro’ pasayadi.',
      'Navbat: quyosh → batareya → eng arzon manba (dizel $270/MWh yoki import) → o’chirish.',
      'Ortiqcha energiya avval batareyaga, keyin eng qimmat to’laydigan qo’shniga sotiladi, qolgani cheklanadi (isrof).',
    ],
  },
  {
    title: '2 · Quyosh fizikasi',
    items: [
      'Quyosh 06:00 da chiqib 18:30 da botadi. Tushda nurlanish ~1000 W/m² ga yetadi.',
      'Bulutlar ishlab chiqarishni 78% gacha kamaytiradi. 12 soatlik prognozni trend grafigida kuzating.',
      'Panel harorati har 1°C oshganda samaradorlik ~0.38% pasayadi — jazirama kunlar zararli.',
      'Chang asta-sekin yig’iladi (yomg’ir uni yuvadi). 5–8% dan oshsa panellarni yuving.',
      'Invertor quvvati DC quvvatdan kam bo’lsa — tushda “qirqish” bo’ladi. DC/AC nisbati ~1.2 optimal.',
    ],
  },
  {
    title: '3 · Batareya',
    items: [
      'AVTO rejim: ortiqchani zaryadlaydi, tanqislikda beradi. Samaradorlik ~90% (har yo’nalishda 95%).',
      'Quvvat sig’imning yarmi (10 MWh → 5 MW). Kechki cho’qqi (19:00–21:00) uchun zaxira qoldiring.',
      'Bo’ron oldidan ZARYAD rejimi foydali bo’lishi mumkin.',
    ],
  },
  {
    title: '4 · Bozor va raqobat',
    items: [
      'Har kecha yarim tunda hukumat tarifingizni raqobatchilar taklifi bilan solishtiradi. 8% dan qimmat bo’lsangiz yoki obro’ 55 dan past bo’lsa — mijozlar ketadi.',
      'Arzon tarif + yuqori obro’ = mijozlar qaytadi. Yashil ulush ham obro’ni oshiradi.',
      'Shamol oroli shamolli kechalarda arzon import beradi; Marjon oroli kunduzgi quyoshingizni qimmat sotib oladi.',
      'Narx urushi: raqobatchi 3 kun davomida 20% arzon taklif beradi — tarifni vaqtincha tushiring.',
    ],
  },
  {
    title: '5 · Pul va investitsiya',
    items: [
      'Har bir qurilish naqd yoki kredit (8%, 10 yil) bilan. Kunlik kredit to’lovi avtomatik yechiladi.',
      'Quyosh paneli dizelni almashtirsa, kredit to’lovidan bir necha barobar ko’p tejaydi.',
      'Kassa −$3M dan pastga tushsa — bankrot. Kunduzgi quyosh ulushi 60% dan oshsa hukumat grant beradi.',
    ],
  },
]

export function GuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={onClose}>
      <div className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-md border border-border bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-5 py-3">
          <h2 id="guide-title" className="font-semibold">Operator qo’llanmasi</h2>
          <button type="button" onClick={onClose} aria-label="Yopish" className="rounded p-1 hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-5 p-5">
          {GUIDE.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-primary">{g.title}</h3>
              <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-foreground/85">
                {g.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
