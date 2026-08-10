export function formatCurrency(
  value: number | null | undefined,
  {signed = false}: {signed?: boolean} = {},
) {
  if (value == null || !Number.isFinite(value)) return '--'
  const formatted = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value))
  if (value < 0) return `-${formatted}`
  if (signed && value > 0) return `+${formatted}`
  return formatted
}

export function formatPercent(
  value: number | null | undefined,
  digits = 2,
  signed = true,
) {
  if (value == null || !Number.isFinite(value)) return '--'
  const prefix = signed && value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(digits)}%`
}

export function valueTone(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value === 0) return 'flat'
  return value > 0 ? 'rise' : 'fall'
}

export function formatSourceTime(value?: string | null) {
  if (!value) return '时间未知'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
