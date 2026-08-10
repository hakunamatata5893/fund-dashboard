import {useEffect, useState} from 'react'
import {Plus, Trash2} from 'lucide-react'
import {
  createWatchFund,
  removeWatchFund,
  type WatchQuoteRow,
} from '@/lib/api'
import {formatPercent, valueTone} from '@/lib/format'
import {shouldShowIntradayEstimate} from '@/lib/tradingCalendar'
import {Button} from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Panel, PanelHeader} from '@/components/ui/panel'
import {SparkTrend} from '@/components/SparkTrend'

export function Watchlist({
  rows,
  loading,
  error,
  onChanged,
}: {
  rows: WatchQuoteRow[]
  loading: boolean
  error: string
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const now = new Date()

  return (
    <section id="watchlist" className="scroll-mt-24" aria-labelledby="watchlist-title">
      <Panel>
        <PanelHeader
          title="自选基金"
          desc="按添加顺序固定排列"
          titleId="watchlist-title"
          action={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              添加自选
            </Button>
          }
        />

        {error ? <div className="m-5 error-banner">{error}</div> : null}
        <div className="watch-table-wrap">
          <table className="watch-table">
            <thead>
              <tr>
                <th>基金</th>
                <th>关联板块</th>
                <th>当日预估涨跌</th>
                <th className="text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && !rows.length ? (
                Array.from({length: 2}).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={4}><div className="h-12 animate-pulse rounded-lg bg-paper-deep" /></td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="font-display text-xl text-ink">暂无自选基金</div>
                    <p className="mt-2 text-sm text-muted">添加后将按顺序固定排列，不受涨跌变化影响。</p>
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const estimate = shouldShowIntradayEstimate(row, now)
                    ? row.estimateGrowth
                    : null
                  return (
                    <tr key={row.code}>
                      <td>
                        <div className="font-medium text-ink">{row.name}</div>
                        <div className="mt-1 font-mono text-xs text-muted">
                          {row.code}
                        </div>
                        {row.error ? (
                          <div className="mt-1 text-xs text-rise">行情暂不可用</div>
                        ) : null}
                      </td>
                      <td><SectorTags sectors={row.sectors} /></td>
                      <td>
                        <div className="flex items-center gap-4">
                          <span className={`w-20 text-right font-mono text-sm tabular-nums ${valueTone(estimate)}`}>
                            {estimate == null ? '-' : formatPercent(estimate)}
                          </span>
                          <SparkTrend
                            className="min-w-0 flex-1"
                            height={56}
                            title={row.name}
                            fundCode={row.code}
                            badgePercent={estimate}
                            points={estimate == null
                              ? []
                              : (row.trend || [])
                                  .filter((point) => point.growth != null)
                                  .map((point) => ({
                                    time: point.time,
                                    value: point.growth as number,
                                  }))}
                          />
                        </div>
                      </td>
                      <td className="text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`删除自选 ${row.name}`}
                          onClick={() => {
                            if (!window.confirm(`确认从自选中删除 ${row.name}（${row.code}）？`)) return
                            removeWatchFund(row.code)
                            onChanged()
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-rise" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <AddWatchDialog
          open={open}
          onOpenChange={setOpen}
          onAdded={onChanged}
        />
      </Panel>
    </section>
  )
}

function AddWatchDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean
  onOpenChange: (value: boolean) => void
  onAdded: () => void
}) {
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setCode('')
    setError('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>添加自选基金</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            if (!/^\d{6}$/.test(code.trim())) {
              setError('请输入 6 位基金代码')
              return
            }
            setSaving(true)
            setError('')
            try {
              await createWatchFund(code.trim())
              onOpenChange(false)
              onAdded()
            } catch (err: unknown) {
              setError((err as Error).message || '添加失败')
            } finally {
              setSaving(false)
            }
          }}
        >
          <Label htmlFor="watch-code">基金代码</Label>
          <Input
            id="watch-code"
            className="mt-2 font-mono"
            value={code}
            maxLength={6}
            inputMode="numeric"
            autoFocus
            placeholder="例如 000001"
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error ? <p className="mt-3 text-sm text-rise">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? '识别中' : '添加自选'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SectorTags({sectors}: {sectors: string[]}) {
  if (!sectors.length) return <span className="text-xs text-muted">--</span>
  return (
    <div className="flex flex-wrap gap-1">
      {sectors.map((sector) => <span key={sector} className="sector-tag">{sector}</span>)}
    </div>
  )
}
