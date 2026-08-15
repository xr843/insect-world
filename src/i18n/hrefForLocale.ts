import type { Locale } from './types'

/**
 * 物种深链的规范路径：中文 `/s/<id>/`，英文 `/en/s/<id>/`。
 *
 * 用路径而不是 `?s=` 查询参数，是为了让构建期能为每个物种生成静态壳页
 * （自己的 title / og / canonical）—— 查询参数在静态托管上没法分页出壳。
 * 带结尾斜杠与壳页的目录形式（`/s/<id>/index.html`）保持一致，
 * 免得线上多一次 301。
 */
export function canonicalPath(locale: Locale, speciesId: string): string {
  const base = locale === 'en' ? '/en' : ''
  return `${base}/s/${encodeURIComponent(speciesId)}/`
}

/**
 * 切语言时的目标地址，带上当前正在看的物种。
 *
 * 不带物种的话，读到第 40 种切个语言就回到第一种了 —— 而切语言的人
 * 恰恰是最想接着看同一只虫的人。顺带让物种链接可以分享出去。
 */
export function hrefForLocale(target: Locale, speciesId: string): string {
  return canonicalPath(target, speciesId)
}

/**
 * 这个地址是不是旧格式 `?s=<id>`（改用路径 `/s/<id>/` 之前转发出去的链接）。
 *
 * 用途只有一个：首帧要不要动地址栏。规范路径与不带物种的首页都**不该**在首帧改写
 * —— 那会让统计把入口页记成默认物种（见 App.tsx 里的说明）；只有旧格式值得归一。
 */
export function isLegacySpeciesUrl(search: string): boolean {
  return new URLSearchParams(search).has('s')
}

/** 解码失败（畸形 %xx）不抛错 —— 宽容策略同下：烂链接回落，不搞坏页面 */
function tryDecode(raw: string): string | null {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

/**
 * 从地址栏读出初始物种。两个入口都用它，不只英文版。
 *
 * 先认规范路径 `/s/<id>/`（`/en/` 前缀与结尾斜杠都可有可无 ——
 * 手敲、代理改写都会产生这些变体），再退回旧的 `?s=` 查询参数：
 * 改成路径形式之前别人已经转发过 `?s=` 链接，它们不能坏。
 *
 * 认不出来就返回 null 让调用方回落到首个物种 —— 不抛错、不清地址栏。
 * 别人转发来的旧链接（物种被改名或删了）不该把整个页面搞坏。
 */
export function speciesFromUrl(
  pathname: string,
  search: string,
  knownIds: readonly string[],
): string | null {
  const m = pathname.match(/^\/(?:en\/)?s\/([^/]+)\/?$/)
  if (m) {
    const id = tryDecode(m[1])
    if (id && knownIds.includes(id)) return id
  }
  const want = new URLSearchParams(search).get('s')
  return want && knownIds.includes(want) ? want : null
}
