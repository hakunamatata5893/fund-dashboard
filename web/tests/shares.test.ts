import {describe, expect, it} from 'vitest'
import {deriveHoldShares, type ResolveFundResult} from '@/lib/api'

const meta: ResolveFundResult = {
  code: '000001',
  name: '测试基金',
  fundKey: '',
  sectors: [],
  netValue: 1.2,
  prevNetValue: 1.1,
  confirmedSession: false,
}

describe('deriveHoldShares', () => {
  it('uses latest confirmed NAV as the previous settlement during intraday trading', () => {
    expect(deriveHoldShares(1200, 'prev', meta)).toBe(1000)
  })

  it('uses the prior NAV after today has been confirmed', () => {
    expect(deriveHoldShares(1100, 'prev', {...meta, confirmedSession: true})).toBe(1000)
    expect(deriveHoldShares(1200, 'today', {...meta, confirmedSession: true})).toBe(1000)
  })
})
