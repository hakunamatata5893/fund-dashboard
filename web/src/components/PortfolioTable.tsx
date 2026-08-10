import {useState} from 'react'
import {Pencil, Plus, Trash2} from 'lucide-react'
import {
  createHolding,
  removeHolding,
  updateHolding,
  type FundQuoteRow,
  type HoldingInput,
  type HoldingsPayload,
} from '@/lib/api'
import {formatCurrency, formatPercent, valueTone} from '@/lib/format'
import {shouldShowIntradayEstimate} from '@/lib/tradingCalendar'
import {Button} from '@/components/ui/button'
import {Panel, PanelHeader} from '@/components/ui/panel'
import {FundFormDialog} from '@/components/FundFormDialog'
import {FundTrendDialog} from '@/components/FundTrendDialog'

export function PortfolioTable({
  data,
  loading,
  onChanged,
}: {
  data: HoldingsPayload | null
  loading: boolean
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FundQuoteRow | null>(null)
  const [trendRow, setTrendRow] = useState<FundQuoteRow | null>(null)
  const rows = data?.list || []

  async function submit(payload: HoldingInput) {
    if (editing) {
      await updateHolding(editing.code, {
        totalCost: payload.totalCost,
        amount: payload.amount,
        amountBasis: payload.amountBasis,
      })
    } else {
      await createHolding(payload)
    }
    onChanged()
  }

  return (
    <section id="funds" className="scroll-mt-20" aria-labelledby="funds-title">
      <Panel>
        <PanelHeader
          title="持仓基金"
          desc="累计持仓与当日收益"
          titleId="funds-title"
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              添加持仓
            </Button>
          }
        />

        <div className="portfolio-table-wrap">
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>名称</th>
                <th className="text-right">持仓成本</th>
                <th className="text-right">当前市值</th>
                <th className="text-right">持仓收益率</th>
                <th className="text-right">资产占比</th>
                <th>板块</th>
                <th className="text-right">实时收益</th>
                <th className="text-right">当日预估涨跌</th>
                <th className="text-right">预估回本还需上涨</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && !data ? (
                Array.from({length: 4}).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={10}>
                      <div className="h-12 animate-pulse rounded-lg bg-paper-deep" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="font-display text-xl text-ink">还没有基金持仓</div>
                    <p className="mt-2 text-sm text-muted">添加第一只基金后即可开始计算。</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.code}>
                    <td>
                      <button
                        type="button"
                        className="max-w-full text-left font-medium text-ink underline decoration-line underline-offset-4 transition-colors hover:text-accent"
                        title={`查看 ${row.name} 走势`}
                        onClick={() => setTrendRow(row)}
                      >
                        {row.name}
                      </button>
                      <div className="mt-1 flex items-center gap-2 font-mono text-xs text-muted">
                        <span>{row.code}</span>
                        {row.netValueDate ? <span>净值 {row.netValueDate.slice(5)}</span> : null}
                      </div>
                      {row.quoteError ? (
                        <div className="mt-1 text-xs text-rise">行情暂不可用</div>
                      ) : null}
                    </td>
                    <NumericCell value={row.totalCost} type="currency" />
                    <NumericCell value={row.currentValue} type="currency" />
                    <NumericCell value={row.holdingReturnPct} type="percent" tone />
                    <NumericCell value={row.weight} type="weight" />
                    <td>
                      <SectorTags sectors={row.sectors} />
                    </td>
                    <NumericCell
                      value={row.dayPnl}
                      type="signed-currency"
                      tone
                      emptyText="-"
                    />
                    <NumericCell
                      value={
                        shouldShowIntradayEstimate(row) ? row.estimateGrowth : null
                      }
                      type="percent"
                      tone
                      emptyText="-"
                    />
                    <RecoveryCell value={row.estimatedRecoveryPct} />
                    <td>
                      <div className="flex justify-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`编辑 ${row.name}`}
                          onClick={() => {
                            setEditing(row)
                            setOpen(true)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`删除 ${row.name}`}
                          onClick={() => {
                            if (!window.confirm(`确认删除 ${row.name}（${row.code}）？`)) return
                            removeHolding(row.code)
                            onChanged()
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-rise" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <FundFormDialog
          open={open}
          onOpenChange={setOpen}
          initial={editing}
          onSubmit={submit}
        />
        {trendRow ? (
          <FundTrendDialog
            open
            onOpenChange={(value) => {
              if (!value) setTrendRow(null)
            }}
            code={trendRow.code}
            name={trendRow.name}
            badgePercent={trendRow.estimateGrowth ?? trendRow.percent}
            intradayPoints={(trendRow.trend || [])
              .filter((point) => point.growth != null)
              .map((point) => ({time: point.time, value: point.growth as number}))}
          />
        ) : null}
      </Panel>
    </section>
  )
}

function RecoveryCell({value}: {value: number | null | undefined}) {
  const text = value == null ? '--' : value === 0 ? '已回本' : formatPercent(value)
  return <td className="text-right font-mono tabular-nums text-ink">{text}</td>
}

function NumericCell({
  value,
  type,
  tone,
  emptyText,
}: {
  value: number | null | undefined
  type: 'currency' | 'signed-currency' | 'percent' | 'weight'
  tone?: boolean
  emptyText?: string
}) {
  const missing = value == null || !Number.isFinite(value)
  const text = missing && emptyText != null
    ? emptyText
    : type === 'currency'
      ? formatCurrency(value)
      : type === 'signed-currency'
        ? formatCurrency(value, {signed: true})
        : formatPercent(value, type === 'weight' ? 1 : 2, type !== 'weight')
  return (
    <td className={`text-right font-mono tabular-nums ${tone ? valueTone(value) : ''}`}>
      {text}
    </td>
  )
}

function SectorTags({sectors}: {sectors: string[]}) {
  if (!sectors.length) return <span className="text-xs text-muted">--</span>
  return (
    <div className="flex max-w-[190px] flex-wrap gap-1">
      {sectors.map((sector) => (
        <span key={sector} className="sector-tag">
          {sector}
        </span>
      ))}
    </div>
  )
}
