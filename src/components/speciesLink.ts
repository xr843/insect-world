import type { MouseEvent } from 'react'

/**
 * 名录里的每一只虫为什么必须是 `<a href>` 而不是 `<button onClick>`。
 *
 * ## 起因：渲染之后，这个站在爬虫眼里没有任何出站链接
 *
 * 构建期往 `#root` 注入了通往全部 63 种的静态链接
 * （`scripts/make-species-pages.mjs`），不跑 JS 的爬虫因此走得到每一页。
 * 但 Google 对 JS 站点是**两波抓取**：先看原始 HTML，再看渲染后的 DOM，
 * 而**链接发现主要依据后者**。React 一挂载就清空 `#root`，那 63 条链接
 * 随之消失，渲染后的页面里一条 `<a href>` 都不剩 —— 全是 `<button>`。
 *
 * 2026-08-24 在 Search Console 里量到的后果：**已编入索引 4 页、
 * 未编入索引 0 页**。零未收录说明没有任何一页被抓取后判定不合格，
 * Google 只是**不知道另外 124 页存在**。
 *
 * ## 顺带修好的另一件事
 *
 * `<button>` 中键点不开新标签、右键没有「复制链接地址」、Ctrl/Cmd 点
 * 也只是原地换一只。图鉴恰恰是「想并排开几只对比」的场景。
 *
 * ## 契约
 *
 * 带修饰键的点击与中键**必须放行给浏览器**（不 preventDefault、不换物种、
 * 不上报埋点）—— 用户要的是新标签页里那一只，当前这只不该跟着变；
 * 上报了也是假的，新标签自己会记一次落地。
 */
export function isPlainLeftClick(e: MouseEvent): boolean {
  // 中键在 React 里走的是 auxclick，本来就到不了 onClick；这里按住的是
  // 修饰键那几种（新标签 / 新窗口 / 下载）。
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}
