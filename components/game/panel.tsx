import { cn } from '@/lib/utils'

export function Panel({
  title,
  right,
  children,
  className,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('flex flex-col rounded-md border border-border bg-card', className)} aria-label={title}>
      <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</h2>
        {right}
      </header>
      <div className="flex-1 p-3">{children}</div>
    </section>
  )
}

export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'good' | 'warn' | 'bad' | 'primary' | 'accent'
}) {
  const toneClass = {
    default: 'text-foreground',
    good: 'text-success',
    warn: 'text-warning',
    bad: 'text-destructive',
    primary: 'text-primary',
    accent: 'text-accent',
  }[tone]
  return (
    <div className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1 last:border-0">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={cn('font-mono text-xs font-semibold tabular-nums', toneClass)}>{value}</span>
    </div>
  )
}
