/**
 * @vitest-environment jsdom
 *
 * 主题引导脚本与 React 侧的契约。
 *
 * 默认主题写在两个地方：`src/theme.ts` 的 resolveTheme（React 用）和
 * `public/theme-boot.js`（首帧前的裸脚本，没法 import 前者）。两边不一致
 * 的症状是首屏闪一下另一个主题——**肉眼一闪而过、单测全绿、每个访客
 * 每次打开都会遇到**，是最典型的「没人守就一直坏着」的缺陷。
 *
 * 所以这里不读源码字符串做匹配（那种断言换个写法就失效），而是把
 * theme-boot.js **真的在 jsdom 里执行一遍**，再拿它写进 <html> 的结果
 * 与 resolveTheme 对答案。改任何一边，这条都会红。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { THEME_COLOR, THEME_KEY, resolveTheme } from '../theme'

// jsdom 环境下 import.meta.url 不是 file: 协议（fileURLToPath 会抛），
// 用工作目录定位 —— vitest 从仓库根跑
const fromRoot = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')
const bootSource = fromRoot('public/theme-boot.js')

/** 在当前 jsdom 文档里跑一遍引导脚本，返回它设进 <html> 的主题 */
function runBoot(): string | undefined {
  // eslint-disable-next-line no-new-func
  new Function(bootSource)()
  return document.documentElement.dataset.theme
}

describe('theme-boot.js 与 resolveTheme 的契约', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  /** 覆盖真实会遇到的四种存储状态：没存过、两个合法值、脏值 */
  it.each([
    ['没存过（首次访问）', null],
    ['存过 dark', 'dark'],
    ['存过 light', 'light'],
    ['脏值 / 旧版本残留', 'sepia'],
  ])('%s → 引导脚本与 React 侧判定一致', (_label, saved) => {
    if (saved !== null) localStorage.setItem(THEME_KEY, saved)
    expect(runBoot()).toBe(resolveTheme(saved))
  })

  it('默认是浅色（纸感图鉴）—— 改默认值必须两边一起改', () => {
    expect(resolveTheme(null)).toBe('light')
    expect(runBoot()).toBe('light')
  })

  it('引导脚本读的是同一个 localStorage 键', () => {
    expect(bootSource).toContain(THEME_KEY)
  })

  it('localStorage 抛异常时（隐私模式）不炸，仍落到默认主题', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('SecurityError: localStorage is disabled')
      },
    })
    try {
      expect(runBoot()).toBe('light')
    } finally {
      if (original) Object.defineProperty(window, 'localStorage', original)
    }
  })

  it('index.html 的静态 theme-color 与默认主题的色值一致（首帧不跳色）', () => {
    const html = fromRoot('index.html')
    const m = /<meta name="theme-color" content="([^"]+)"/.exec(html)
    expect(m, 'index.html 里没有 theme-color').not.toBeNull()
    expect(m![1]).toBe(THEME_COLOR[resolveTheme(null)])
  })

  it('index.html 同步加载引导脚本（异步就来不及，会闪变）', () => {
    const html = fromRoot('index.html')
    const tag = /<script[^>]*theme-boot\.js[^>]*>/.exec(html)
    expect(tag, 'index.html 没有引入 theme-boot.js').not.toBeNull()
    expect(tag![0], '引导脚本不能带 defer/async').not.toMatch(/\b(defer|async)\b/)
  })
})
