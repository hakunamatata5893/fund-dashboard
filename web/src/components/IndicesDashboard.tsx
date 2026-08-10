import {useState} from 'react'
import type {IndexGroup, IndexItem} from '@/lib/api'
import {formatPercent, formatSourceTime, valueTone} from '@/lib/format'
import {IndexTrendDialog} from '@/components/IndexTrendDialog'
import {Panel, PanelHeader} from '@/components/ui/panel'

const GROUPS: IndexGroup[] = ['A股', '港股', '美股', '日韩']

export function IndicesDashboard({
  items,
  loading,
  error,
}: {
  items: IndexItem[]
  loading: boolean
  error?: string
}) {
  const [active, setActive] = useState<IndexItem | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <section id="indices" className="scroll-mt-20" aria-labelledby="indices-title">
      <Panel>
        <PanelHeader title="指数看板" desc="点击指数查看历史走势" titleId="indices-title" />
        <div className="space-y-5 p-4 lg:p-5">
          {GROUPS.map((group) => {
            const groupItems = items.filter((item) => item.group === group)
            return (
              <div key={group}>
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="font-sans text-sm font-semibold text-ink">{group}</h3>
                  <div className="h-px flex-1 bg-line" />
                </div>
                <div className="index-grid">
                  {loading && !items.length
                    ? Array.from({length: group === 'A股' ? 8 : 2}).map((_, index) => (
                        <div key={index} className="h-56 animate-pulse rounded-xl bg-paper-deep" />
                      ))
                    : groupItems.map((item) => (
                        <button
                          key={item.code}
                          type="button"
                          className="index-card"
                          onClick={() => {
                            setActive(item)
                            setOpen(true)
                          }}
                        >
                          <span className="index-card-head">
                            <span>
                              <span className="index-title-row">
                                <strong className="index-name">{item.name}</strong>
                                <span className="index-updated">
                                  {formatSourceTime(item.updatedAt)}
                                </span>
                              </span>
                              <span className="index-code">{item.code}</span>
                            </span>
                            <span className="index-group-tag">{item.group}</span>
                          </span>

                          <strong className={`index-price ${valueTone(item.percent)}`}>
                            {formatIndexValue(item.price)}
                          </strong>
                          <span className="index-change-row">
                            <span className={`index-change ${valueTone(item.change)}`}>
                              {formatSignedValue(item.change)}
                            </span>
                            <span className={`index-percent ${valueTone(item.percent)}`}>
                              {formatPercent(item.percent)}
                            </span>
                          </span>

                          <span className="index-detail-grid">
                            <IndexDetail label="今开" value={formatIndexValue(item.open)} />
                            <IndexDetail label="最高" value={formatIndexValue(item.high)} />
                            <IndexDetail label="最低" value={formatIndexValue(item.low)} />
                            <IndexDetail label="昨收" value={formatIndexValue(item.previousClose)} />
                            <IndexDetail
                              label="成交量"
                              value={formatVolume(item.volume, item.group)}
                            />
                            <IndexDetail label="成交额" value={formatAmount(item.amount)} />
                          </span>
                        </button>
                      ))}
                  {!loading && !groupItems.length ? (
                    <div className="col-span-full py-6 text-sm text-muted">暂无{group}指数数据</div>
                  ) : null}
                </div>
              </div>
            )
          })}
          {error ? <p className="text-sm text-rise">{error}</p> : null}
        </div>
        <IndexTrendDialog item={active} open={open} onOpenChange={setOpen} />
      </Panel>
    </section>
  )
}

function IndexDetail({label, value}: {label: string; value: string}) {
  return (
    <span>
      <span className="index-detail-label">{label}</span>
      <span className="index-detail-value">{value}</span>
    </span>
  )
}

function formatIndexValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatSignedValue(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${value > 0 ? '+' : ''}${formatIndexValue(value)}`
}

function formatVolume(value: number | null | undefined, group: IndexGroup) {
  if (value == null || !Number.isFinite(value) || value === 0) return '—'
  const unit = group === 'A股' ? '手' : '股'
  if (Math.abs(value) >= 10_000) return `${formatCompact(value / 10_000)}万${unit}`
  return `${formatCompact(value)}${unit}`
}

function formatAmount(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value === 0) return '—'
  if (Math.abs(value) >= 100_000_000) return `${formatCompact(value / 100_000_000)}亿`
  if (Math.abs(value) >= 10_000) return `${formatCompact(value / 10_000)}万`
  return formatCompact(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('zh-CN', {maximumFractionDigits: 2}).format(value)
}
