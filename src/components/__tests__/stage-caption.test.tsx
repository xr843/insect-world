/**
 * @vitest-environment jsdom
 *
 * 展台铭牌 —— 手机首屏必须答得出「这是什么虫」。
 *
 * 2026-08-26 无头 iPhone 13 实测：物种页的 `<h1>` 落在 y=1034，而视口只有
 * 664px；展台上原来只有目/变态类型的小徽章与工具条，铭牌整块被 CSS 的
 * `display: none` 关掉了（它原在左下角，会与底部工具条撞上）。也就是说
 * 从分享链接进来的人，第一屏看到的是**一只没有名字的虫**。物种页占本站
 * 入口约 15%，而手机占 26% 的访问。
 *
 * 两半各守一边，缺一不可：
 * - DOM 这半守「名字确实渲染了」；
 * - CSS 这半守「手机上确实看得见」—— jsdom 不做布局也不解析媒体查询，
 *   光看 DOM 会对着一个 `display:none` 的元素报绿。
 */
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderZh } from '../../i18n/testing'
import { Stage } from '../Stage'
import { INSECTS } from '../../data/insects.zh'

// r3f 的 Canvas 在 jsdom 里转不起来，而这里只看它周围的 DOM 外壳（同 stage-fallback）
vi.mock('../../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return { InsectCanvas: () => createElement('div', { 'data-testid': 'canvas-stub' }) }
})

afterEach(cleanup)

beforeAll(() => {
  // Stage 初始化要问一次 prefers-reduced-motion；老 jsdom 没有 matchMedia
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    })
  }
})

const insect = INSECTS.find((i) => i.id === 'mantis')!

const props = {
  insect,
  compareWith: null,
  onCompareToggle: vi.fn(),
  onCompareCycle: vi.fn(),
  focusAnchor: null,
  lifeStage: 'adult' as const,
  theme: 'light' as const,
}

describe('展台铭牌 · DOM', () => {
  it('渲染物种的中文名与学名', () => {
    const { container } = renderZh(<Stage {...props} />)
    const name = container.querySelector('[class*=captionName]')
    expect(name, '展台上没有中文名那一行').toBeTruthy()
    expect(name!.textContent).toBe(insect.name)
    expect(container.querySelector('[class*=captionLatin]')?.textContent).toBe(insect.latin)
  })
})

// jsdom 环境下 import.meta.url 不是 file: 协议（fileURLToPath 会抛），从仓库根解析。
// 先剥注释：注释里写着 .caption / .captionName 这些串，不剥会拿注释当规则匹配。
const css = readFileSync(resolve(process.cwd(), 'src/components/Stage.module.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

/** 取 ≤640px 媒体块的整段正文 */
const mobile = /@media\s*\(\s*max-width:\s*640px\s*\)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/.exec(css)?.[1] ?? ''

/** 在一段 CSS 里找某个选择器的声明块 */
function block(selector: string, source: string): string | null {
  // 选择器里有 . 与 > 这些正则元字符（`.identity > *`），逐字转义再用
  const pattern = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*')
  const m = new RegExp(`${pattern}\\s*\\{([^}]*)\\}`).exec(source)
  return m ? m[1] : null
}

describe('展台铭牌 · 手机上的可见性', () => {
  it('解析器确实抓到了 640px 那一段（抓不到就是解析器坏了）', () => {
    expect(mobile.length, '没解析到 640px 媒体块').toBeGreaterThan(0)
    expect(block('.identity', mobile), '640px 段里没有 .identity 规则').toBeTruthy()
  })

  /**
   * 这一条是整改本身：铭牌此前在手机上是 `display: none`。
   * 谁要是把它加回来，第一屏就又没有名字了。
   */
  it('手机上不许把铭牌关掉', () => {
    expect(block('.caption', mobile) ?? '').not.toMatch(/display:\s*none/)
    expect(block('.identity', mobile)).not.toMatch(/display:\s*none/)
  })

  it('中文名默认藏着（桌面右栏已有大标题），手机上放出来', () => {
    expect(block('.captionName', css), '没有 .captionName 基础规则').toMatch(/display:\s*none/)
    expect(block('.captionName', mobile), '手机段里没把中文名放出来').toMatch(/display:\s*block/)
  })

  /**
   * 桌面上身份区必须是 `display: contents` —— 两个子块各自绝对定位，
   * 位置与包装层出现之前完全一致。写成别的值就会平白多出一个盒子，
   * 把左下角的铭牌拽到左上角去。
   */
  it('桌面上身份区不占盒子', () => {
    expect(block('.identity', css), '没有 .identity 基础规则').toMatch(/display:\s*contents/)
  })

  /**
   * 手机上靠 flex 一列排下来，**不许给铭牌写死一个 top**：
   * 门牌的高度不是常数 —— 英文的「Butterflies & Moths (Lepidoptera)」在 390px
   * 下折成三行，固定偏移当场撞上，而中文版一切正常。这条断言守的就是
   * 「间距交给布局，不靠数像素」。
   */
  it('手机上靠布局排布，铭牌不带写死的偏移', () => {
    const id = block('.identity', mobile)!
    expect(id, '身份区在手机上没变成真盒子').toMatch(/display:\s*flex/)
    expect(id).toMatch(/flex-direction:\s*column/)
    expect(id, '身份区没定位到左上角').toMatch(/position:\s*absolute/)
    // 子块交给 flex 排，各自的绝对定位必须撤掉
    expect(block('.identity > *', mobile), '子块还各自绝对定位着').toMatch(/position:\s*static/)
    // 铭牌自己不许再有纵向偏移
    expect(block('.caption', mobile) ?? '').not.toMatch(/top:\s*\d/)
  })

  /** 右上角是生活史入口，身份区要给它让出位置，否则窄屏上两者会挤在一起 */
  it('身份区给右上角的生活史入口留出余地', () => {
    expect(block('.identity', mobile), '没给右边留空').toMatch(/right:\s*\d+px/)
  })
})
