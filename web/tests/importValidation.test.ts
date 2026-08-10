import {describe, expect, it} from 'vitest'
import {normalizeConfig, validateImportConfig} from '@/lib/portfolioStore'

describe('validateImportConfig', () => {
  it('accepts a valid versioned backup', () => {
    const summary = validateImportConfig({
      schemaVersion: 1,
      exportedAt: '2026-08-06T00:00:00.000Z',
      settings: {},
      funds: {
        '000001': {
          code: '000001',
          name: '测试基金',
          shares: 100,
          totalCost: 100,
          sectors: [],
        },
      },
    })
    expect(summary.count).toBe(1)
    expect(summary.watchCount).toBe(0)
  })

  it('rejects unsupported versions and invalid shares', () => {
    expect(() => validateImportConfig({schemaVersion: 2, funds: {}})).toThrow(
      '不支持的备份版本',
    )
    expect(() =>
      validateImportConfig({
        schemaVersion: 1,
        funds: {
          '000001': {code: '000001', shares: 0, totalCost: 10, sectors: []},
        },
      }),
    ).toThrow('份额必须大于 0')
  })

  it('keeps watchlist insertion order and removes duplicate codes', () => {
    const config = normalizeConfig({
      schemaVersion: 1,
      settings: {},
      funds: {},
      watchlist: [
        {code: '000002', name: '第二只', sectors: []},
        {code: '000001', name: '第一只', sectors: []},
        {code: '000002', name: '重复项', sectors: []},
      ],
    })

    expect(config.watchlist.map((item) => item.code)).toEqual(['000002', '000001'])
  })
})
