import type { Locale } from './types'

/**
 * 切语言时的目标地址，带上当前正在看的物种。
 *
 * 不带物种的话，读到第 40 种切个语言就回到第一种了 —— 而切语言的人
 * 恰恰是最想接着看同一只虫的人。顺带让物种链接可以分享出去。
 */
export function hrefForLocale(target: Locale, speciesId: string): string {
  const base = target === 'en' ? '/en/' : '/'
  return `${base}?s=${encodeURIComponent(speciesId)}`
}

/**
 * 从地址栏读出初始物种。两个入口都用它，不只英文版。
 *
 * 认不出来就返回 null 让调用方回落到首个物种 —— 不抛错、不清地址栏。
 * 别人转发来的旧链接（物种被改名或删了）不该把整个页面搞坏。
 */
export function speciesFromSearch(search: string, knownIds: readonly string[]): string | null {
  const want = new URLSearchParams(search).get('s')
  return want && knownIds.includes(want) ? want : null
}
