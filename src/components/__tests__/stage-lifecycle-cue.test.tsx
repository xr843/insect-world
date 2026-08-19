/**
 * @vitest-environment jsdom
 *
 * 展台右上角的生活史入口。
 *
 * 这个入口是 2026-08-19 一次埋点复盘的产物：生活史此前唯一的入口是展台**下方**
 * 那张卡片，而它在 1440×900 与 1280×720 上都落在折叠线以下（y=993 / y=823）。
 * 结果是有阶段模型的 8 种加上首页落地约 1975 次浏览里，生活史只被打开 5 次 ——
 * 约 1/400。**不是没人想看，是没人看得见。**
 *
 * 所以这里钉的三件事，全是「按钮还在、还能点、事件照发，但改动已经失效」
 * 那一类 —— 没有一件是常规断言会红的：
 *
 * 1. **只对做了阶段模型的物种出现。** 出现在没做的那 55 种身上，点开只有
 *    一句「这一阶段没有立体标本」，比不给入口更糟。
 * 2. **WebGL 兜底时不出现。** 点开它展台要换成卵/幼虫的立体标本，兜底页做不到；
 *    本站的规矩是不留只有样子的按钮（工具条整条在兜底时撤掉，同一条规矩）。
 * 3. **必须报 source: 'stage'。** 展台入口与卡片入口混在一起，打开数涨了也说
 *    不清是这次改动起了作用还是那几天流量本来就高 —— 改动会**看起来有效而
 *    实际无法证伪**。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { metamorphosisOf } from '../../three/stages'
import { Stage } from '../Stage'

const webgl = vi.hoisted(() => ({ ok: true }))

vi.mock('../../three/webgl', () => ({
  webglAvailable: () => webgl.ok,
  bindContextLoss: () => () => {},
}))

vi.mock('../../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return { InsectCanvas: () => createElement('div', { 'data-testid': 'canvas-stub' }) }
})

/** 一只做了阶段模型的（完全变态，四阶段）与一只没做的 */
const WITH_STAGES = 'rhinoceros-beetle'
const WITHOUT_STAGES = 'ladybird'
const insectOf = (id: string) => INSECTS.find((i) => i.id === id)!

beforeAll(() => {
  // Stage 初始化要问一次 prefers-reduced-motion；老 jsdom 没有 matchMedia
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    })
  }
})

afterEach(() => {
  cleanup()
  webgl.ok = true
})

function mount(id: string, onLifecycle = vi.fn()) {
  renderZh(
    <Stage
      insect={insectOf(id)}
      compareWith={null}
      onCompareToggle={vi.fn()}
      onCompareCycle={vi.fn()}
      onLifecycle={onLifecycle}
    />,
  )
  return onLifecycle
}

const cue = () => screen.queryByRole('button', { name: /生活史/ })

describe('只对做了阶段模型的物种出现', () => {
  it('双叉犀金龟（有卵/幼虫/蛹三个模型）给入口', () => {
    mount(WITH_STAGES)
    expect(cue()).not.toBeNull()
  })

  it('七星瓢虫（没做阶段模型）不给 —— 点开只有一句「没有立体标本」，比不给更糟', () => {
    mount(WITHOUT_STAGES)
    expect(cue()).toBeNull()
  })

  it('阶段数取自注册表而不是写死：完全变态数出 4 个阶段', () => {
    mount(WITH_STAGES)
    const route = metamorphosisOf(WITH_STAGES)!
    expect(route).toHaveLength(4)
    expect(screen.getByText(new RegExp(`${route.length} 个阶段`))).toBeTruthy()
  })
})

describe('WebGL 兜底时撤掉', () => {
  it('开不了 3D 就不留这个按钮 —— 它承诺的是展台换标本，兜底页做不到', () => {
    webgl.ok = false
    mount(WITH_STAGES)
    expect(cue()).toBeNull()
  })
})

describe('点击只是「说出这件事」，弹窗由上层打开', () => {
  it('点一下调用 onLifecycle 一次', () => {
    const onLifecycle = mount(WITH_STAGES)
    fireEvent.click(cue()!)
    expect(onLifecycle).toHaveBeenCalledTimes(1)
  })

  it('没给 onLifecycle 时不渲染 —— 不留点了没反应的按钮', () => {
    renderZh(
      <Stage
        insect={insectOf(WITH_STAGES)}
        compareWith={null}
        onCompareToggle={vi.fn()}
        onCompareCycle={vi.fn()}
      />,
    )
    expect(cue()).toBeNull()
  })
})

describe('位置：必须在展台里，不能被挪回折叠线以下', () => {
  it('入口是展台 section 的后代，不是展台下方那片卡片区', () => {
    mount(WITH_STAGES)
    const stage = document.querySelector('section')!
    expect(stage.contains(cue())).toBe(true)
  })

  it('排在工具条之前 —— 工具条贴展台底边，入口贴顶边，顺序反了说明挪了位', () => {
    mount(WITH_STAGES)
    const rail = screen.getByRole('button', { name: '旋转' })
    const pos = cue()!.compareDocumentPosition(rail)
    // jsdom 没有排版，量不了 y 坐标（全是 0），只能钉文档顺序
    expect(pos & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
