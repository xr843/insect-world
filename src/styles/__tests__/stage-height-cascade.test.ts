/**
 * 展台高度的级联闸门 —— 手机分支必须真的赢。
 *
 * ## 为什么要有这道闸门
 *
 * `.stage-height` 在窄屏媒体查询里写了一份更矮的高度，但**媒体查询不增加
 * 特异性**：两条都是 0-1-0，谁排在后面谁生效。基础那条原先排在 900px 分支
 * 之后，于是整个手机分支是死代码 —— 展台在 390px 宽的屏幕上仍按基础规则算成
 * 520px，配上 135px 的页头正好铺满 664px 的视口，名录、物种名、正文全被顶到
 * 第二屏。2026-08-26 无头 iPhone 13 实测确认（手机占 26% 访问，跳出率 38.4%
 * 对笔记本 25.5%）。
 *
 * 这个 bug 逃过了所有既有检查：CSS 语法合法、构建不报警、4000 多个测试全绿 ——
 * 因为没有一条断言"在 390px 宽下这个元素多高"。jsdom 同样答不了（它不做布局，
 * 也不解析媒体查询），所以这里的做法是**照定义把级联算一遍**：把所有给
 * `.stage-height` 设 height 的规则连同它们的媒体条件取出来，筛掉不匹配当前
 * 宽度的，剩下的按源码顺序取最后一条（同特异性，后来者胜）。
 *
 * ⚠️ 解析前先剥注释：上面这段注释里就写着 `.stage-height` 这串字。
 * contrast.test.ts 的头注释记着同一个坑 —— 它首版 indexOf 命中的是注释，
 * 于是对着已知的坏值一路绿灯。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('../global.css', import.meta.url)), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

type Rule = { maxWidth: number | null; height: string }

/**
 * 取出所有「给 .stage-height 设 height」的规则，按源码顺序，附上它所在媒体
 * 查询的 max-width（不在媒体查询里就是 null）。
 *
 * 只认 `@media (max-width: N)` 这一种条件 —— 本文件里的窄屏分支全长这样；
 * 出现别的写法时下面的自检会红，提醒来改这个解析器，而不是静默漏掉一条。
 */
function rulesForStageHeight(): Rule[] {
  const out: Rule[] = []
  // 媒体块：@media (...) { ... }，本文件不存在嵌套媒体查询
  const media = /@media\s*\(([^)]*)\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g
  const spans: { start: number; end: number; maxWidth: number }[] = []
  for (let m = media.exec(css); m; m = media.exec(css)) {
    const px = /max-width:\s*(\d+)px/.exec(m[1])
    if (px) spans.push({ start: m.index, end: m.index + m[0].length, maxWidth: Number(px[1]) })
  }

  const rule = /\.stage-height\s*\{([^}]*)\}/g
  for (let m = rule.exec(css); m; m = rule.exec(css)) {
    // 同一条规则里可以有多行 height（渐进增强），取最后一行 —— 浏览器也这么办
    const heights = [...m[1].matchAll(/height:\s*([^;]+);/g)].map((h) => h[1].trim())
    if (heights.length === 0) continue
    const inside = spans.find((s) => m!.index > s.start && m!.index < s.end)
    out.push({ maxWidth: inside ? inside.maxWidth : null, height: heights.at(-1)! })
  }
  return out
}

/** 按级联算出某个视口宽度下最终生效的 height（全部同特异性，故后来者胜） */
function winnerAt(width: number): Rule | undefined {
  return rulesForStageHeight()
    .filter((r) => r.maxWidth === null || width <= r.maxWidth)
    .at(-1)
}

describe('展台高度的级联', () => {
  it('解析器确实抓到了两条以上的规则（抓不到就是解析器坏了，不是代码对了）', () => {
    const rules = rulesForStageHeight()
    expect(rules.length).toBeGreaterThanOrEqual(2)
    expect(rules.some((r) => r.maxWidth === null), '没有一条无条件的基础规则').toBe(true)
    expect(rules.some((r) => r.maxWidth !== null), '没有一条窄屏规则').toBe(true)
  })

  it('390px（iPhone 13）下生效的是手机那条矮高度', () => {
    const win = winnerAt(390)
    expect(win?.maxWidth, '手机宽度下赢的却是无条件那条 —— 基础规则又排到媒体查询后面去了').not.toBeNull()
    expect(win!.height).toContain('340px')
  })

  /**
   * 手机上的实际后果：页头约 135px，展台再高就把名录和物种名全顶出首屏。
   * 这里只卡它的**下限与理想值**都留得下余地，具体数字见规则旁的注释。
   */
  it('手机高度的下限与视口占比都不许再涨回半屏以上', () => {
    const h = winnerAt(390)!.height
    const clamp = /clamp\(\s*(\d+)px\s*,\s*(\d+)(vh|svh)\s*,\s*(\d+)px\s*\)/.exec(h)
    expect(clamp, `手机高度不是预期的 clamp 写法：${h}`).toBeTruthy()
    expect(Number(clamp![1]), '下限太高，664px 的视口会被页头+展台占满').toBeLessThanOrEqual(360)
    expect(Number(clamp![2]), '视口占比太大，名录露不出头').toBeLessThanOrEqual(60)
  })

  /**
   * iOS Safari 的 vh 按收起地址栏后的大视口算（iPhone 13 上 100vh≈812，
   * 实际可见 664），56vh 会膨胀成 455px。svh 量的是小视口，两边一致。
   * 保留 vh 那一行是给不认识 svh 的旧浏览器兜底，两行都得在。
   */
  it('手机高度用 svh，并保留 vh 兜底', () => {
    const mobile = /@media[^{]*max-width:\s*900px[^{]*\{[\s\S]*?\.stage-height\s*\{([^}]*)\}/.exec(css)
    expect(mobile, '没找到 900px 分支里的 .stage-height').toBeTruthy()
    // \b 卡在数字与字母之间不成立（`56svh` 里 6 与 s 都是词字符），得连数字一起匹配
    expect(mobile![1], '没有 svh 那一行，iOS 上会按大视口算高').toMatch(/height:[^;]*\d+svh\b/)
    expect(mobile![1], 'vh 兜底那一行被删了，旧浏览器会退回桌面高度').toMatch(/height:[^;]*\d+vh\b/)
  })

  it('桌面宽度下仍然是那条高展台', () => {
    const win = winnerAt(1440)
    expect(win?.maxWidth).toBeNull()
    expect(win!.height).toContain('520px')
  })
})
