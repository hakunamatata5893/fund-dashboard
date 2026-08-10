/**
 * 全局涨跌色（A 股：红涨绿跌）
 * Web 端统一使用这组颜色，保证行情与收益展示一致。
 * 跌绿取「玉青」——深、哑、偏墨。
 */
export const PALETTE = {
  light: {
    rise: '#D7263D',
    fall: '#0B6B4F',
    flat: '#6B7C8A',
  },
  dark: {
    rise: '#FF6B7A',
    fall: '#4BB892',
    flat: '#8A9BAB',
  },
} as const

export function getTone(theme?: string | null) {
  return theme === 'dark' ? PALETTE.dark : PALETTE.light
}

export function toneByDelta(delta: number | null | undefined, theme?: string | null) {
  const {rise, fall, flat} = getTone(theme)
  if (delta == null || Number.isNaN(Number(delta))) return flat
  if (Number(delta) > 0) return rise
  if (Number(delta) < 0) return fall
  return flat
}
