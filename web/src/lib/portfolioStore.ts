import type {AppConfig, FundRecord, WatchFundRecord} from '@/lib/api'

export const STORAGE_KEY = 'fund-dashboard-config-v1'
const LEGACY_STORAGE_KEY = atob('bGVtby1mdW5kLWNvbmZpZy12MQ==')
export const SCHEMA_VERSION = 1

export const DEFAULT_CONFIG: AppConfig = {
  schemaVersion: SCHEMA_VERSION,
  settings: {},
  funds: {},
  watchlist: [],
}

function cloneDefault(): AppConfig {
  return {schemaVersion: SCHEMA_VERSION, settings: {}, funds: {}, watchlist: []}
}

function normalizeFund(
  raw: Partial<FundRecord> & {code: string},
  prev?: FundRecord,
): FundRecord {
  const code = String(raw.code || '').padStart(6, '0')
  const now = new Date().toISOString()
  return {
    code,
    name: String(raw.name ?? prev?.name ?? code),
    fundKey: String(raw.fundKey ?? prev?.fundKey ?? ''),
    shares: Number(raw.shares ?? prev?.shares ?? 0) || 0,
    totalCost: Number(raw.totalCost ?? prev?.totalCost ?? 0) || 0,
    sectors: Array.isArray(raw.sectors)
      ? raw.sectors.map(String).filter(Boolean)
      : prev?.sectors || [],
    createdAt: prev?.createdAt || raw.createdAt || now,
    updatedAt: now,
  }
}

function normalizeWatchFund(raw: Partial<WatchFundRecord> & {code: string}): WatchFundRecord {
  const code = String(raw.code || '').padStart(6, '0')
  const now = new Date().toISOString()
  return {
    code,
    name: String(raw.name || code),
    fundKey: String(raw.fundKey || ''),
    sectors: Array.isArray(raw.sectors)
      ? raw.sectors.map(String).filter(Boolean)
      : [],
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  }
}

export function normalizeConfig(payload: Partial<AppConfig> | null | undefined): AppConfig {
  const fundsIn = payload?.funds && typeof payload.funds === 'object' ? payload.funds : {}
  const funds: Record<string, FundRecord> = {}
  for (const [key, raw] of Object.entries(fundsIn)) {
    const code = String(raw?.code || key).padStart(6, '0')
    if (!/^\d{6}$/.test(code)) continue
    const normalized = normalizeFund({...raw, code})
    if (normalized.shares <= 0 || normalized.totalCost < 0) continue
    funds[code] = normalized
  }
  const watchlistIn = Array.isArray(payload?.watchlist) ? payload.watchlist : []
  const watchlist: WatchFundRecord[] = []
  const seen = new Set<string>()
  for (const raw of watchlistIn) {
    const code = String(raw?.code || '').padStart(6, '0')
    if (!/^\d{6}$/.test(code) || seen.has(code)) continue
    seen.add(code)
    watchlist.push(normalizeWatchFund({...raw, code}))
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {},
    funds,
    watchlist,
  }
}

export function loadConfig(): AppConfig {
  try {
    const current = localStorage.getItem(STORAGE_KEY)
    const legacy = current ? null : localStorage.getItem(LEGACY_STORAGE_KEY)
    const raw = current || legacy
    if (!raw) return cloneDefault()
    const config = normalizeConfig(JSON.parse(raw) as AppConfig)
    if (legacy) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
    return config
  } catch {
    return cloneDefault()
  }
}

export function saveConfig(config: AppConfig): AppConfig {
  const next = normalizeConfig(config)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function listFunds(): FundRecord[] {
  return Object.values(loadConfig().funds)
}

export function listWatchFunds(): WatchFundRecord[] {
  return loadConfig().watchlist
}

export function createWatchFund(payload: WatchFundRecord): WatchFundRecord {
  const config = loadConfig()
  const code = String(payload.code).padStart(6, '0')
  if (!/^\d{6}$/.test(code)) throw new Error('基金代码须为 6 位数字')
  if (config.watchlist.some((item) => item.code === code)) {
    throw new Error('该基金已在自选列表中')
  }
  const next = normalizeWatchFund({...payload, code})
  config.watchlist.push(next)
  saveConfig(config)
  return next
}

export function removeWatchFund(code: string) {
  const config = loadConfig()
  const key = String(code).padStart(6, '0')
  const index = config.watchlist.findIndex((item) => item.code === key)
  if (index < 0) throw new Error('自选基金不存在')
  config.watchlist.splice(index, 1)
  saveConfig(config)
}

export function patchWatchFunds(
  patches: Array<{code: string; name?: string; fundKey?: string; sectors?: string[]}>,
) {
  if (!patches.length) return
  const config = loadConfig()
  let changed = false
  config.watchlist = config.watchlist.map((item) => {
    const patch = patches.find((entry) => entry.code === item.code)
    if (!patch) return item
    const next = {...item}
    let itemChanged = false
    if (patch.name && patch.name !== item.name) {
      next.name = patch.name
      itemChanged = true
    }
    if (patch.fundKey && patch.fundKey !== item.fundKey) {
      next.fundKey = patch.fundKey
      itemChanged = true
    }
    if (patch.sectors?.length && patch.sectors.join() !== item.sectors.join()) {
      next.sectors = patch.sectors
      itemChanged = true
    }
    if (itemChanged) changed = true
    return itemChanged ? {...next, updatedAt: new Date().toISOString()} : item
  })
  if (changed) saveConfig(config)
}

export function getFund(code: string): FundRecord | null {
  return loadConfig().funds[String(code).padStart(6, '0')] || null
}

export function createFund(payload: FundRecord): FundRecord {
  const config = loadConfig()
  const code = String(payload.code).padStart(6, '0')
  if (!/^\d{6}$/.test(code)) throw new Error('基金代码须为 6 位数字')
  if (config.funds[code]) throw new Error('该基金已在持仓列表中')
  const next = normalizeFund({...payload, code})
  if (!(next.shares > 0)) throw new Error('持有份额必须大于 0')
  if (next.totalCost < 0) throw new Error('持仓成本不能小于 0')
  config.funds[code] = next
  saveConfig(config)
  return next
}

export function updateFund(code: string, patch: Partial<FundRecord>): FundRecord {
  const config = loadConfig()
  const key = String(code).padStart(6, '0')
  const prev = config.funds[key]
  if (!prev) throw new Error('基金不存在')
  const next = normalizeFund({...prev, ...patch, code: key}, prev)
  if (!(next.shares > 0)) throw new Error('持有份额必须大于 0')
  if (next.totalCost < 0) throw new Error('持仓成本不能小于 0')
  config.funds[key] = next
  saveConfig(config)
  return next
}

export function removeFund(code: string) {
  const config = loadConfig()
  const key = String(code).padStart(6, '0')
  if (!config.funds[key]) throw new Error('基金不存在')
  delete config.funds[key]
  saveConfig(config)
}

export function patchFunds(
  patches: Array<{code: string; name?: string; fundKey?: string; sectors?: string[]}>,
) {
  if (!patches.length) return
  const config = loadConfig()
  let changed = false
  for (const patch of patches) {
    const key = String(patch.code).padStart(6, '0')
    const prev = config.funds[key]
    if (!prev) continue
    const next = {...prev}
    if (patch.name && patch.name !== prev.name) {
      next.name = patch.name
      changed = true
    }
    if (patch.fundKey && patch.fundKey !== prev.fundKey) {
      next.fundKey = patch.fundKey
      changed = true
    }
    if (patch.sectors?.length && patch.sectors.join() !== prev.sectors.join()) {
      next.sectors = patch.sectors
      changed = true
    }
    config.funds[key] = next
  }
  if (changed) saveConfig(config)
}

function assertImportPayload(payload: unknown): asserts payload is AppConfig {
  if (!payload || typeof payload !== 'object') throw new Error('备份文件不是有效对象')
  const value = payload as Partial<AppConfig>
  if (value.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`不支持的备份版本，仅支持版本 ${SCHEMA_VERSION}`)
  }
  if (!value.funds || typeof value.funds !== 'object' || Array.isArray(value.funds)) {
    throw new Error('备份文件缺少 funds 对象')
  }
  for (const [key, raw] of Object.entries(value.funds)) {
    if (!raw || typeof raw !== 'object') throw new Error(`基金 ${key} 的数据无效`)
    const code = String(raw.code || key)
    if (!/^\d{6}$/.test(code)) throw new Error(`基金代码 ${code} 无效`)
    if (!(Number(raw.shares) > 0)) throw new Error(`基金 ${code} 的份额必须大于 0`)
    if (!(Number(raw.totalCost) >= 0)) throw new Error(`基金 ${code} 的持仓成本无效`)
    if (raw.sectors != null && !Array.isArray(raw.sectors)) {
      throw new Error(`基金 ${code} 的板块字段无效`)
    }
  }
  if (value.watchlist != null && !Array.isArray(value.watchlist)) {
    throw new Error('备份文件的 watchlist 字段无效')
  }
  for (const raw of value.watchlist || []) {
    if (!raw || typeof raw !== 'object' || !/^\d{6}$/.test(String(raw.code || ''))) {
      throw new Error('自选基金数据无效')
    }
    if (raw.sectors != null && !Array.isArray(raw.sectors)) {
      throw new Error(`自选基金 ${raw.code} 的板块字段无效`)
    }
  }
}

export function validateImportConfig(payload: unknown) {
  assertImportPayload(payload)
  return {
    count: Object.keys(payload.funds).length,
    watchCount: payload.watchlist?.length || 0,
    exportedAt: payload.exportedAt || '',
    schemaVersion: payload.schemaVersion,
  }
}

export function importLocalConfig(payload: unknown): AppConfig {
  assertImportPayload(payload)
  return saveConfig(normalizeConfig(payload))
}
