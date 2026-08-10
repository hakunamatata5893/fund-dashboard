import {formatPercent, valueTone} from '@/lib/format'
import type {MarketOverviewPayload} from '@/lib/api'
import {Panel, PanelHeader} from '@/components/ui/panel'

export function MarketOverview({
  data,
  loading,
  error,
}: {
  data: MarketOverviewPayload | null
  loading: boolean
  error: string
}) {
  const up = data?.upDown.up || 0
  const down = data?.upDown.down || 0
  const flat = data?.upDown.flat || 0
  const total = up + down + flat
  const upPct = total ? (up / total) * 100 : 0
  const downPct = total ? (down / total) * 100 : 0
  const flatPct = total ? (flat / total) * 100 : 0

  return (
    <section id="market" className="scroll-mt-24" aria-labelledby="market-title">
      <Panel>
        <PanelHeader
          title="A股大盘"
          desc="涨跌家数占比 · 概念板块涨跌前十"
          titleId="market-title"
        />

        {error ? <div className="m-5 error-banner">{error}</div> : null}
        {loading && !data ? (
          <div className="grid gap-4 p-5">
            <div className="h-32 animate-pulse rounded-2xl bg-paper-deep" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-80 animate-pulse rounded-2xl bg-paper-deep" />
              <div className="h-80 animate-pulse rounded-2xl bg-paper-deep" />
            </div>
          </div>
        ) : data ? (
          <div className="market-body">
            <div className="breadth-card">
              <div className="text-sm text-muted">今日涨跌家数</div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-8 gap-y-2">
                <div className="font-mono text-lg text-rise">
                  涨 <strong className="ml-2 text-3xl">{up}</strong>
                  <span className="ml-2">({upPct.toFixed(1)}%)</span>
                </div>
                <div className="font-mono text-lg text-fall">
                  跌 <strong className="ml-2 text-3xl">{down}</strong>
                  <span className="ml-2">({downPct.toFixed(1)}%)</span>
                </div>
                <div className="font-mono text-sm text-muted">平 {flat}</div>
              </div>
              <div className="breadth-bar mt-5" aria-label={`上涨 ${upPct.toFixed(1)}%，下跌 ${downPct.toFixed(1)}%，平盘 ${flatPct.toFixed(1)}%`}>
                <span className="bg-rise" style={{width: `${upPct}%`}} />
                <span className="bg-fall/25" style={{width: `${downPct}%`}} />
                <span className="bg-line" style={{width: `${flatPct}%`}} />
              </div>
              <div className="mt-2 text-right text-[11px] text-muted">
                数据时间 {data.upDown.time || '未知'}
              </div>
            </div>

            <div className="market-ranking-grid">
              <BoardRanking title="涨幅前十板块" rows={data.topGainers} tone="rise" />
              <BoardRanking title="跌幅前十板块" rows={data.topLosers} tone="fall" />
            </div>
          </div>
        ) : null}
      </Panel>
    </section>
  )
}

function BoardRanking({
  title,
  rows,
  tone,
}: {
  title: string
  rows: MarketOverviewPayload['topGainers']
  tone: 'rise' | 'fall'
}) {
  return (
    <div className="ranking-card">
      <h3 className={`font-display text-lg font-semibold ${tone}`}>{title}</h3>
      <ol className="mt-3 grid gap-1">
        {rows.map((row, index) => (
          <li key={row.code} className="ranking-row">
            <span className="w-6 font-mono text-xs text-muted">{index + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{row.name}</span>
            <span className={`font-mono text-sm tabular-nums ${valueTone(row.percent)}`}>
              {formatPercent(row.percent)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
