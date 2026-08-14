/**
 * @vitest-environment jsdom
 *
 * 展台的 WebGL 兜底 —— 三条路各走一遍：
 * 建不起上下文（换剪影）、建的时候才炸（错误边界接住换剪影）、
 * 建好之后半路丢失（盖提示层，恢复即撤）。
 *
 * InsectCanvas 打了桩：r3f 的 Canvas 在 jsdom 里根本转不起来，而这里
 * 要测的是 Stage 在各状态下**摆什么**，桩只要能交出 onContextLoss 就够。
 */
import { act, cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { Stage } from '../Stage'

const h = vi.hoisted(() => ({
  webglOk: false,
  throwOnRender: false,
  lossCb: undefined as ((lost: boolean) => void) | undefined,
}))

vi.mock('../../three/webgl', () => ({
  webglAvailable: () => h.webglOk,
  bindContextLoss: () => () => {},
}))

vi.mock('../../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return {
    InsectCanvas: (props: { onContextLoss?: (lost: boolean) => void }) => {
      if (h.throwOnRender) throw new Error('boom')
      h.lossCb = props.onContextLoss
      return createElement('div', { 'data-testid': 'canvas-stub' })
    },
  }
})

const ladybird = INSECTS.find((i) => i.id === 'ladybird')!

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
  h.webglOk = false
  h.throwOnRender = false
  h.lossCb = undefined
})

function mount() {
  renderZh(
    <Stage insect={ladybird} compareWith={null} onCompareToggle={vi.fn()} onCompareCycle={vi.fn()} />,
  )
}

describe('WebGL 建不起来：剪影兜底', () => {
  it('摆物种剪影和一句说明，不挂 canvas', () => {
    h.webglOk = false
    mount()
    expect(screen.getByText(/WebGL 不可用/)).toBeTruthy()
    expect(document.querySelector('svg'), '剪影该在场').toBeTruthy()
    expect(screen.queryByTestId('canvas-stub')).toBeNull()
  })

  it('工具条与操作提示一起撤 —— 不留只有样子的按钮', () => {
    h.webglOk = false
    mount()
    expect(screen.queryByText('旋转')).toBeNull()
    expect(screen.queryByText(/拖动旋转/)).toBeNull()
    // 学名与门牌照留：这一页讲哪只虫的信息不能丢
    expect(screen.getByText(ladybird.latin)).toBeTruthy()
  })

  it('不转加载圈 —— canvas 没挂载，loading 永远等不来', () => {
    h.webglOk = false
    mount()
    expect(screen.queryByText(/正在生成/)).toBeNull()
  })
})

describe('WebGL 可用：正常挂 canvas', () => {
  it('canvas 在场，剪影兜底不在', () => {
    h.webglOk = true
    mount()
    expect(screen.getByTestId('canvas-stub')).toBeTruthy()
    expect(screen.queryByText(/WebGL 不可用/)).toBeNull()
    expect(screen.getByText('旋转')).toBeTruthy()
  })
})

describe('探测通过、真建才炸：错误边界接住', () => {
  it('降到剪影兜底，而不是整页白屏', () => {
    h.webglOk = true
    h.throwOnRender = true
    // React 会把边界接住的错误打到 console.error，压掉别吓着看输出的人
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      mount()
      expect(screen.getByText(/WebGL 不可用/)).toBeTruthy()
      expect(screen.queryByTestId('canvas-stub')).toBeNull()
    } finally {
      quiet.mockRestore()
    }
  })
})

describe('半路丢上下文：盖提示层，恢复即撤', () => {
  it('丢失时出提示与重载按钮，canvas 保持挂载等恢复', () => {
    h.webglOk = true
    mount()
    act(() => h.lossCb?.(true))
    expect(screen.getByText(/图形上下文丢失/)).toBeTruthy()
    expect(screen.getByText('重新加载')).toBeTruthy()
    expect(screen.getByTestId('canvas-stub'), 'canvas 不能卸 —— 恢复事件靠它').toBeTruthy()
  })

  it('恢复事件到了就撤提示', () => {
    h.webglOk = true
    mount()
    act(() => h.lossCb?.(true))
    act(() => h.lossCb?.(false))
    expect(screen.queryByText(/图形上下文丢失/)).toBeNull()
  })
})
