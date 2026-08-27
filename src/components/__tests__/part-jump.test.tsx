/**
 * @vitest-environment jsdom
 *
 * 部位跳转的接线 —— 从展台把 anchor 交上去，App 换虫并把镜头对到同一个部位。
 *
 * 3D 子树在 jsdom 里转不起来，所以 InsectCanvas 打桩、只把它收到的
 * `onPartJump` 回调暴露出来 —— 与 stage-fallback.test.tsx 同一套办法。
 * 这里测的是**接线**：点了之后换的是不是同一部位的下一只、镜头有没有跟着走。
 * 「下一只是谁」的逻辑归 data/__tests__/parts.test.ts 管，不在这里重复。
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { LocaleProvider } from '../../i18n/LocaleProvider'
import { zh } from '../../i18n/zh'
import { getGuide } from '../../data/guides.zh'
import { INSECTS } from '../../data/insects.zh'
import { nextPeerWithPart, partOfAnchor } from '../../data/parts'
import App from '../../App'

const h = vi.hoisted(() => ({
  jump: undefined as ((anchor: string) => void) | undefined,
  // 镜头有没有跟着走，只能从 InsectCanvas 实际收到的 focusAnchor 上看出来 ——
  // 光看换没换物种测不出「setFocusAnchor 排在 select 前面」这种顺序错误
  // （select 自己会把 focusAnchor 清成 null，见 App.tsx 里 jumpToPart 的注释）。
  focusAnchor: undefined as string | null | undefined,
  // partJumps 该不该收下某个 anchor，同样得从 InsectCanvas 实际收到的值上看 ——
  // 63 种虫的真实数据里每个已分组的部位都至少有 4 个物种（Task 1 的设计约束），
  // 「有没有下一只可跳」这道判断在全量数据下永远为真，删掉它也测不出来。
  partJumps: undefined as Record<string, string> | undefined,
}))

vi.mock('../../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return {
    InsectCanvas: (props: {
      onPartJump?: (anchor: string) => void
      focusAnchor?: string | null
      partJumps?: Record<string, string>
    }) => {
      h.jump = props.onPartJump
      h.focusAnchor = props.focusAnchor
      h.partJumps = props.partJumps
      return createElement('div', { 'data-testid': 'canvas-stub' })
    },
  }
})

// jsdom 没有真 WebGL：不打桩的话 webglAvailable() 照实测就是 false，
// Stage 会转去摆 SVG 剪影兜底，上面那个 InsectCanvas 桩根本不会挂载、
// onPartJump 永远收不到。与 stage-fallback.test.tsx 同一套办法，
// 但反过来用：那边测的是兜底本身，这里要绕开兜底才测得到接线。
vi.mock('../../three/webgl', () => ({
  webglAvailable: () => true,
  bindContextLoss: () => () => {},
}))

afterEach(cleanup)

beforeAll(() => {
  Element.prototype.scrollIntoView = function () {}
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    })
  }
})

describe('部位跳转的接线', () => {
  it('回调交上去了', () => {
    renderZh(<App />)
    expect(h.jump, 'InsectCanvas 没收到 onPartJump').toBeTypeOf('function')
  })

  it('跳到同一部位组的下一只虫', () => {
    renderZh(<App />)
    const first = INSECTS[0]
    const anchor = first.hotspots.find((x) => partOfAnchor(x.anchor))!.anchor
    const group = partOfAnchor(anchor)!
    const expected = nextPeerWithPart(INSECTS, first.id, group)!

    act(() => h.jump!(anchor))

    // 展台标题（右栏 h1）换成了目标物种
    expect(screen.getAllByText(INSECTS.find((i) => i.id === expected.id)!.name).length).toBeGreaterThan(0)
    // 镜头对准了目标物种同一个部位的标注点，不是停在换虫前的旧位置或被 select 清空
    expect(h.focusAnchor).toBe(expected.anchor)
  })

  it('没有同类的部位不跳、也不炸', () => {
    renderZh(<App />)
    const before = screen.getAllByText(INSECTS[0].name).length
    expect(() => act(() => h.jump!('forceps'))).not.toThrow()
    // 「不炸」不够 —— partOfAnchor('forceps') 是 null，如果漏判就直接拿 null
    // 去问 nextPeerWithPart，它会当成「凑巧也是 null」把某只带其它一次性
    // 构造（尾铗/发光器/……）的虫错认成同伴，静默跳过去而不报错。
    // 镜头目标必须仍是初始值 null，物种也不能变。
    expect(h.focusAnchor).toBeNull()
    expect(screen.getAllByText(INSECTS[0].name).length).toBe(before)
  })

  it('列表里只有一只虫时，没有任何部位能跳 —— partJumps 是空对象', () => {
    // 独角仙的 6 个标注点全部落在已分组的部位（角/翅/眼/触角/足），
    // 换成全量 63 种时每一个都跳得动；这里把物种表整个换成只含它自己的
    // 单条列表，逼 nextPeerWithPart 对每一组都找不到同伴。
    const solo = [INSECTS[0]]
    render(
      <LocaleProvider value={{ locale: 'zh', dict: zh, insects: solo, getGuide }}>
        <App />
      </LocaleProvider>,
    )
    expect(h.partJumps).toEqual({})
  })
})
