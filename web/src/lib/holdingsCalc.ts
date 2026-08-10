import type {FundQuoteRow, FundRecord, HoldingsPayload} from '@/lib/api'
import {Decimal, amountFromShares, pnlFromShares, round2} from '@/lib/money'
import {
  normalizeNetValueDate,
  shouldShowIntradayEstimate,
  todayDateStr,
} from '@/lib/tradingCalendar'

export type QuoteLike = {
  code: string
  name?: string
  fundKey?: string
  percent?: number | null
  percentSource?: 'estimate' | 'confirmed' | null
  estimateGrowth?: number | null
  dayGrowth?: number | null
  netValueDate?: string
  netValue?: number | null
  estimateNetValue?: number | null
  prevNetValue?: number | null
  time?: string | null
  trend?: {time: string; growth: number | null; netValue?: number | null}[]
  sectors?: string[]
  error?: string
}

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null
}

function latestEstimateNav(quote: QuoteLike): number | null {
  const direct = positive(quote.estimateNetValue)
  if (direct != null) return direct
  for (let i = (quote.trend || []).length - 1; i >= 0; i -= 1) {
    const value = positive(quote.trend?.[i]?.netValue)
    if (value != null) return value
  }
  return null
}

export function resolveNavPair(quote: QuoteLike) {
  const confirmed = positive(quote.netValue)
  const previous = positive(quote.prevNetValue)
  const estimate = latestEstimateNav(quote)
  if (quote.percentSource === 'confirmed' && confirmed != null && previous != null) {
    return {prevNav: previous, projectedNav: confirmed, settledNav: confirmed}
  }
  if (estimate != null) {
    return {prevNav: previous ?? confirmed, projectedNav: estimate, settledNav: confirmed}
  }
  if (confirmed != null) {
    return {prevNav: previous ?? confirmed, projectedNav: confirmed, settledNav: confirmed}
  }
  return {prevNav: null, projectedNav: null, settledNav: null}
}

export function resolveDayPnlNavPair(quote: QuoteLike, now = new Date()) {
  const confirmed = positive(quote.netValue)
  const previous = positive(quote.prevNetValue)
  const navDay = normalizeNetValueDate(quote.netValueDate, now)

  if (
    quote.percentSource === 'confirmed' &&
    navDay === todayDateStr(now) &&
    confirmed != null &&
    previous != null
  ) {
    return {prevNav: previous, dayNav: confirmed}
  }

  const estimate = latestEstimateNav(quote)
  if (shouldShowIntradayEstimate(quote, now) && estimate != null) {
    return {prevNav: previous ?? confirmed, dayNav: estimate}
  }

  return {prevNav: null, dayNav: null}
}

export function calcHoldings(
  localFunds: FundRecord[],
  quotes: QuoteLike[],
  now = new Date(),
): HoldingsPayload & {
  persistPatches: Array<{code: string; name?: string; fundKey?: string; sectors?: string[]}>
} {
  const quoteMap = new Map(quotes.map((quote) => [quote.code, quote]))
  const rows: FundQuoteRow[] = []
  const persistPatches: Array<{
    code: string
    name?: string
    fundKey?: string
    sectors?: string[]
  }> = []
  let totalCost = new Decimal(0)
  let totalCurrentValue = new Decimal(0)
  let totalDayPnl = new Decimal(0)
  let previousTotalValue = new Decimal(0)
  let missingCurrent = 0
  let missingDay = 0

  for (const local of localFunds) {
    const quote = quoteMap.get(local.code) || ({code: local.code} as QuoteLike)
    const {prevNav, projectedNav, settledNav} = resolveNavPair(quote)
    const {prevNav: dayPrevNav, dayNav} = resolveDayPnlNavPair(quote, now)
    const currentValue =
      settledNav != null ? amountFromShares(local.shares, settledNav) : null
    const settledValue = currentValue
    const projectedValue =
      projectedNav != null ? amountFromShares(local.shares, projectedNav) : currentValue
    const dayPnl =
      dayPrevNav != null && dayNav != null
        ? pnlFromShares(local.shares, dayNav, dayPrevNav)
        : null
    const holdingPnl =
      currentValue != null ? round2(new Decimal(currentValue).minus(local.totalCost)) : null
    const holdingReturnPct =
      holdingPnl != null && local.totalCost > 0
        ? round2(new Decimal(holdingPnl).div(local.totalCost).mul(100))
        : null
    const estimatedRecoveryPct =
      projectedValue != null && projectedValue > 0 && projectedValue < local.totalCost
        ? round2(
            new Decimal(local.totalCost)
              .minus(projectedValue)
              .div(projectedValue)
              .mul(100),
          )
        : projectedValue != null && projectedValue >= local.totalCost
          ? 0
          : null
    const sectors = local.sectors.length ? local.sectors : quote.sectors || []

    totalCost = totalCost.plus(local.totalCost)
    if (currentValue == null) missingCurrent += 1
    else totalCurrentValue = totalCurrentValue.plus(currentValue)
    if (dayPnl == null || dayPrevNav == null) missingDay += 1
    else {
      totalDayPnl = totalDayPnl.plus(dayPnl)
      previousTotalValue = previousTotalValue.plus(
        amountFromShares(local.shares, dayPrevNav),
      )
    }

    const patch = {code: local.code} as {
      code: string
      name?: string
      fundKey?: string
      sectors?: string[]
    }
    if (quote.name && quote.name !== local.name) patch.name = quote.name
    if (quote.fundKey && quote.fundKey !== local.fundKey) patch.fundKey = quote.fundKey
    if (!local.sectors.length && sectors.length) patch.sectors = sectors
    if (Object.keys(patch).length > 1) persistPatches.push(patch)

    rows.push({
      ...local,
      name: quote.name || local.name,
      fundKey: quote.fundKey || local.fundKey,
      sectors,
      percent: quote.percent ?? quote.estimateGrowth ?? quote.dayGrowth ?? null,
      percentSource: quote.percentSource || null,
      estimateGrowth: quote.estimateGrowth,
      dayGrowth: quote.dayGrowth,
      netValueDate: quote.netValueDate || '',
      netValue: quote.netValue ?? null,
      estimateNetValue: latestEstimateNav(quote),
      prevNetValue: prevNav,
      time: quote.time,
      trend: quote.trend || [],
      currentValue,
      settledValue,
      dayPnl,
      holdingPnl,
      holdingReturnPct,
      estimatedRecoveryPct,
      weight: null,
      quoteError: quote.error || '',
    })
  }

  const totalCostNumber = round2(totalCost)
  const currentValueNumber = missingCurrent ? null : round2(totalCurrentValue)
  const dayPnlNumber = missingDay ? null : round2(totalDayPnl)
  const previousTotalNumber = missingDay ? null : round2(previousTotalValue)
  const floatingPnl =
    currentValueNumber == null
      ? null
      : round2(new Decimal(currentValueNumber).minus(totalCostNumber))
  const holdingReturnPct =
    floatingPnl != null && totalCostNumber > 0
      ? round2(new Decimal(floatingPnl).div(totalCostNumber).mul(100))
      : localFunds.length === 0
        ? 0
        : null
  const dayReturnPct =
    dayPnlNumber != null && previousTotalNumber != null && previousTotalNumber > 0
      ? round2(new Decimal(dayPnlNumber).div(previousTotalNumber).mul(100))
      : localFunds.length === 0
        ? 0
        : null
  const recoveryPct =
    currentValueNumber != null && currentValueNumber > 0 && currentValueNumber < totalCostNumber
      ? round2(
          new Decimal(totalCostNumber)
            .minus(currentValueNumber)
            .div(currentValueNumber)
            .mul(100),
        )
      : currentValueNumber != null && currentValueNumber >= totalCostNumber && localFunds.length
        ? 0
        : null
  const hasAnyDayValue = rows.some((row) => row.dayPnl != null)

  if (currentValueNumber != null && currentValueNumber > 0) {
    for (const row of rows) {
      row.weight =
        row.currentValue == null
          ? null
          : round2(new Decimal(row.currentValue).div(currentValueNumber).mul(100))
    }
  }

  return {
    summary: {
      totalCurrentValue: currentValueNumber ?? (localFunds.length ? null : 0),
      totalCost: totalCostNumber,
      floatingPnl,
      holdingReturnPct,
      dayPnl: dayPnlNumber ?? (localFunds.length ? null : 0),
      dayReturnPct,
      recoveryPct,
      missingCount: Math.max(missingCurrent, hasAnyDayValue ? missingDay : 0),
    },
    list: rows.sort((a, b) => (b.currentValue ?? -1) - (a.currentValue ?? -1)),
    persistPatches,
  }
}
