import {afterEach, describe, expect, it, vi} from 'vitest'
import {loadConfig, STORAGE_KEY} from '@/lib/portfolioStore'

const LEGACY_KEY = atob('bGVtby1mdW5kLWNvbmZpZy12MQ==')

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('loadConfig storage migration', () => {
  it('moves an existing legacy config to the current storage key', () => {
    const values = new Map<string, string>([
      [
        LEGACY_KEY,
        JSON.stringify({
          schemaVersion: 1,
          settings: {},
          funds: {},
          watchlist: [{code: '000001', name: '测试基金', sectors: []}],
        }),
      ],
    ])
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })

    const config = loadConfig()

    expect(config.watchlist.map((item) => item.code)).toEqual(['000001'])
    expect(values.has(STORAGE_KEY)).toBe(true)
    expect(values.has(LEGACY_KEY)).toBe(false)
  })
})
