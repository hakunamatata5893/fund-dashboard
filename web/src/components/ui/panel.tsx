import {cn} from '@/lib/utils'

export function Panel({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        'panel-shadow rounded-2xl border border-line bg-panel',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function PanelHeader({
  title,
  desc,
  action,
  titleId,
}: {
  title: string
  desc?: string
  action?: React.ReactNode
  titleId?: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line/70 px-3 py-2.5 sm:px-5 sm:py-3">
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <h2
          id={titleId}
          className="shrink-0 font-display text-lg font-semibold tracking-tight text-ink"
        >
          {title}
        </h2>
        {desc ? (
          <p className="min-w-0 truncate text-xs text-muted sm:text-[13px]">{desc}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
