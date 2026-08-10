import {describe, expect, it} from 'vitest'
import {calcHoldings} from '@/lib/holdingsCalc'
import type {FundRecord} from '@/lib/api'

const holding: FundRecord = {
  code: '000001',
  name: '测试基金',
  shares: 100,
  totalCost: 120,
  sectors: [],
}

const tradingNow = new Date(2026, 7, 7, 10, 0)

describe('calcHoldings', () => {
  it('reconciles current value, daily return and recovery distance', () => {
    const result = calcHoldings([holding], [
      {
        code: '000001',
        name: '测试基金',
        percentSource: 'confirmed',
        netValueDate: '2026-08-07',
        netValue: 1,
        prevNetValue: 0.9,
      },
    ], tradingNow)

    expect(result.summary).toMatchObject({
      totalCurrentValue: 100,
      totalCost: 120,
      floatingPnl: -20,
      holdingReturnPct: -16.67,
      dayPnl: 10,
      dayReturnPct: 11.11,
      recoveryPct: 20,
      missingCount: 0,
    })
    expect(result.list[0]).toMatchObject({
      currentValue: 100,
      dayPnl: 10,
      holdingReturnPct: -16.67,
      weight: 100,
    })
  })

  it('excludes intraday estimates from confirmed holding aggregates', () => {
    const result = calcHoldings([{...holding, totalCost: 100}], [
      {
        code: '000001',
        percent: 4.99,
        percentSource: 'estimate',
        estimateGrowth: 5,
        netValue: 1,
        prevNetValue: 1,
        estimateNetValue: 1.05,
        trend: [{time: '10:00', growth: 5, netValue: 1.05}],
      },
    ], tradingNow)

    expect(result.summary.totalCurrentValue).toBe(100)
    expect(result.summary.dayPnl).toBe(5)
    expect(result.summary.floatingPnl).toBe(0)
    expect(result.summary.holdingReturnPct).toBe(0)
    expect(result.list[0].estimatedRecoveryPct).toBe(0)
  })

  it('includes intraday estimates only in estimated recovery distance', () => {
    const result = calcHoldings([holding], [
      {
        code: '000001',
        percentSource: 'estimate',
        estimateGrowth: 10,
        netValue: 1,
        prevNetValue: 1,
        estimateNetValue: 1.1,
        trend: [{time: '10:00', growth: 10, netValue: 1.1}],
      },
    ], tradingNow)

    expect(result.summary.totalCurrentValue).toBe(100)
    expect(result.summary.floatingPnl).toBe(-20)
    expect(result.summary.holdingReturnPct).toBe(-16.67)
    expect(result.summary.recoveryPct).toBe(20)
    expect(result.summary.dayPnl).toBe(10)
    expect(result.list[0].estimatedRecoveryPct).toBe(9.09)
  })

  it('marks aggregates incomplete instead of treating a missing quote as zero', () => {
    const result = calcHoldings([holding], [])

    expect(result.summary.totalCost).toBe(120)
    expect(result.summary.totalCurrentValue).toBeNull()
    expect(result.summary.dayPnl).toBeNull()
    expect(result.summary.missingCount).toBe(1)
  })

  it('does not report a zero-cost holding return as zero percent', () => {
    const result = calcHoldings([{...holding, totalCost: 0}], [
      {
        code: '000001',
        percentSource: 'confirmed',
        netValue: 1,
        prevNetValue: 0.9,
      },
    ])
    expect(result.summary.holdingReturnPct).toBeNull()
    expect(result.list[0].holdingReturnPct).toBeNull()
  })

  it('hides real-time returns before the market opens', () => {
    const result = calcHoldings(
      [holding],
      [
        {
          code: '000001',
          percentSource: 'estimate',
          estimateGrowth: 5,
          netValue: 1,
          prevNetValue: 1,
          estimateNetValue: 1.05,
          trend: [{time: '09:20', growth: 5, netValue: 1.05}],
        },
      ],
      new Date(2026, 7, 7, 9, 29),
    )

    expect(result.list[0].dayPnl).toBeNull()
    expect(result.summary.dayPnl).toBeNull()
    expect(result.summary.dayReturnPct).toBeNull()
    expect(result.summary.missingCount).toBe(0)
  })

  it('hides the previous trading day return on weekends', () => {
    const result = calcHoldings(
      [holding],
      [
        {
          code: '000001',
          percentSource: 'confirmed',
          netValueDate: '2026-08-07',
          netValue: 1,
          prevNetValue: 0.9,
        },
      ],
      new Date(2026, 7, 8, 10, 0),
    )

    expect(result.list[0].dayPnl).toBeNull()
    expect(result.summary.dayPnl).toBeNull()
    expect(result.summary.dayReturnPct).toBeNull()
  })
})
