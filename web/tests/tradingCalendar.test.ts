import {describe, expect, it} from 'vitest'
import {shouldShowIntradayEstimate} from '@/lib/tradingCalendar'

const quote = {
  estimateGrowth: 1.23,
  trend: [{time: '09:31', growth: 1.23}],
}

describe('shouldShowIntradayEstimate', () => {
  it('hides the estimate before the A-share market opens', () => {
    expect(
      shouldShowIntradayEstimate(quote, new Date(2026, 7, 7, 9, 29)),
    ).toBe(false)
  })

  it('shows an estimate after opening when today has intraday points', () => {
    expect(
      shouldShowIntradayEstimate(quote, new Date(2026, 7, 7, 9, 30)),
    ).toBe(true)
  })

  it('hides the estimate on weekends', () => {
    expect(
      shouldShowIntradayEstimate(quote, new Date(2026, 7, 8, 10, 0)),
    ).toBe(false)
  })

  it('hides the estimate when a weekday has no intraday points', () => {
    expect(
      shouldShowIntradayEstimate(
        {...quote, trend: []},
        new Date(2026, 7, 7, 10, 0),
      ),
    ).toBe(false)
  })
})
