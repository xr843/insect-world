/**
 * @vitest-environment jsdom
 *
 * SEO 静态正文不许闪。
 *
 * 构建期往 `#root` 里注入了整篇可爬正文（`scripts/make-species-pages.mjs`），
 * 那是给不执行 JS 的爬虫看的。但 `createRoot().render()` 首次渲染会清空容器，
 * 于是真人看到的是**一整屏文字闪一下就没了** —— 线上实测热缓存只闪 87ms、
 * 冷缓存 736ms，快到读不出内容、只读得出「这页有毛病」。用户是这么报的：
 * 「瞬间弹出文本内容信息，然后再回到正常界面」。
 *
 * 修法在 `public/theme-boot.js`：先用一条 CSS 把它藏起来，2 秒后撤掉规则。
 * 应用正常挂载（0.3~1.5 秒）时容器早被清空，规则从头到尾没匹配到东西；
 * 只有网络很慢或主包挂了，正文才会露出来当兜底。
 *
 * 这里钉三件事，每一件失守都是**页面照常能用、没有任何常规断言会红**的那一类：
 *
 * 1. **一开始必须是藏的。** 不藏就是回到了这个 bug 本身。
 * 2. **到点必须放出来，而且是淡入不是硬切。** 忘了放的话，慢网/主包挂掉时用户
 *    看到的是纯白页——比闪一下更糟，而且更难发现（正常网速下永远复现不出来）。
 *    而硬切放出来则等于把这个 bug 挪到阈值附近：挂载落在 2.0~2.5 秒的那些访问
 *    照样一闪。这段坏区间挪不掉（阈值抬到 3 秒，Fast 3G 的 3.8 秒就掉进去），
 *    所以只能让它不难看 —— 450ms 淡入，被抹掉时最多瞥见一层影子。
 * 3. **藏这件事必须由 JS 做，不能写死在 CSS 里。** 写进样式表的话，不执行 JS 的
 *    爬虫拿到的就是一篇 `display:none` 的正文 —— 那才是真的作弊，
 *    上一轮做壳页正文的全部意义也就没了。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BOOT = readFileSync(path.resolve(__dirname, '../../public/theme-boot.js'), 'utf8')

/** 按线上产物的形状搭台：`#root` 里直接躺着注入的 `<article>` */
function stage() {
  document.head.innerHTML = ''
  document.body.innerHTML = '<div id="root"><article id="seo">正文</article></div>'
}

/** 跑一遍引导脚本（它是普通脚本、不是模块，只能这么执行） */
function runBoot() {
  new Function(BOOT)()
}

const article = () => document.querySelector('#root > article') as HTMLElement
const hidden = () =>
  [...document.head.querySelectorAll('style')].some((s) =>
    /#root\s*>\s*article\s*\{[^}]*display:\s*none/.test(s.textContent ?? ''),
  )

beforeEach(() => {
  vi.useFakeTimers()
  stage()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('一开始藏着', () => {
  it('引导脚本一跑完，就有一条把 #root > article 藏起来的规则', () => {
    expect(hidden()).toBe(false)
    runBoot()
    expect(hidden(), '没有藏 —— 静态正文会闪一下再被 React 清掉').toBe(true)
  })

  it('选择器必须真的命中注入进来的那篇正文', () => {
    runBoot()
    // jsdom 不做样式表层叠，直接验选择器与产物形状对得上
    expect(article()).not.toBeNull()
    expect(article().matches('#root > article')).toBe(true)
  })

  it('用 display 而不是 visibility —— visibility 仍占位，会先撑出几屏滚动条再缩回去', () => {
    runBoot()
    const css = [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('')
    expect(css).toMatch(/display:\s*none/)
    expect(css).not.toMatch(/visibility:\s*hidden/)
  })
})

const css = () =>
  [...document.head.querySelectorAll('style')].map((s) => s.textContent).join('')

describe('到点放出来（慢网与主包挂掉时的兜底）', () => {
  it('2 秒后不再藏着', () => {
    runBoot()
    expect(hidden()).toBe(true)
    vi.advanceTimersByTime(1999)
    expect(hidden(), '不到 2 秒就放出来 —— 正常网速下又会闪').toBe(true)
    vi.advanceTimersByTime(2)
    expect(hidden(), '一直藏着 —— 慢网或主包挂掉时用户看到的是纯白页').toBe(false)
  })

  it('放出来走的是淡入，不是硬切', () => {
    runBoot()
    vi.advanceTimersByTime(2000)
    expect(css(), '硬切放出来等于把这个 bug 挪到阈值附近，挂载 2.0~2.5 秒的访问照样闪')
      .toMatch(/animation:\s*\S+\s+\.?\d/)
    expect(css()).toMatch(/@keyframes/)
    expect(css(), '淡入必须从透明开始，否则动画等于没有').toMatch(/opacity:\s*0/)
  })

  it('应用已经接管（容器被清空）时撤规则不抛异常', () => {
    runBoot()
    document.getElementById('root')!.innerHTML = ''
    expect(() => vi.advanceTimersByTime(2500)).not.toThrow()
  })
})

describe('藏起来这件事只对能执行 JS 的客户端成立', () => {
  it('规则是运行时插进 <head> 的，不在任何静态样式表里', () => {
    // 跑之前 head 是空的：说明这条规则不可能来自构建产物里的 CSS，
    // 只能由这段脚本产生 —— 爬虫不跑 JS，拿到的就是可见的正文
    expect(document.head.querySelectorAll('style')).toHaveLength(0)
    runBoot()
    expect(document.head.querySelectorAll('style').length).toBeGreaterThan(0)
  })

  it('引导脚本没有改动正文本身 —— 不删、不改文字、不加 hidden 属性', () => {
    runBoot()
    vi.advanceTimersByTime(3000)
    expect(article()).not.toBeNull()
    expect(article().textContent).toBe('正文')
    expect(article().hasAttribute('hidden')).toBe(false)
    expect(article().style.display).toBe('')
  })
})
