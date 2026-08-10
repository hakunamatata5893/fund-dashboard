import type {HoldingsSummary} from '@/lib/api'
import {formatCurrency, formatPercent, valueTone} from '@/lib/format'

export function Overview({
  summary,
  loading,
}: {
  summary: HoldingsSummary | null
  loading: boolean
}) {
  const missing = (summary?.missingCount || 0) > 0
  const recovery =
    summary?.recoveryPct == null
      ? '--'
      : summary.recoveryPct === 0
        ? '已回本'
        : `+${summary.recoveryPct.toFixed(2)}%`

  const metrics = [
    {
      label: '持仓总市值',
      value: formatCurrency(summary?.totalCurrentValue),
      tone: 'flat',
    },
    {label: '持仓总成本', value: formatCurrency(summary?.totalCost), tone: 'flat'},
    {
      label: '浮动盈亏',
      value: formatCurrency(summary?.floatingPnl, {signed: true}),
      tone: valueTone(summary?.floatingPnl),
    },
    {
      label: '持仓总收益率',
      value: formatPercent(summary?.holdingReturnPct),
      tone: valueTone(summary?.holdingReturnPct),
    },
    {
      label: '当日收益',
      value:
        summary?.dayPnl == null
          ? '-'
          : formatCurrency(summary.dayPnl, {signed: true}),
      tone: valueTone(summary?.dayPnl),
    },
    {
      label: '当日总收益率',
      value:
        summary?.dayReturnPct == null
          ? '-'
          : formatPercent(summary.dayReturnPct),
      tone: valueTone(summary?.dayReturnPct),
    },
    {
      label: '距离回本还需要上涨',
      value: recovery,
      tone:
        summary?.recoveryPct == null || summary.recoveryPct === 0 ? 'flat' : 'rise',
    },
  ]

  return (
    <section id="overview" aria-labelledby="overview-title" className="scroll-mt-20">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Portfolio overview</p>
          <h1 id="overview-title" className="section-title">
            组合总览
          </h1>
        </div>
        {missing ? (
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs text-accent">
            部分数据缺失
          </span>
        ) : null}
      </div>
      <div className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <div className="text-xs text-muted">{metric.label}</div>
            <div className={`mt-2 font-mono text-xl font-semibold tabular-nums ${metric.tone}`}>
              {loading && !summary ? '…' : metric.value}
            </div>
          </article>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted">
        持仓市值、浮动盈亏和持仓收益率仅按已确认净值计算；当日收益按当天预估或当天确认净值计算，盘前及非交易日显示“-”。
      </p>
    </section>
  )
}
