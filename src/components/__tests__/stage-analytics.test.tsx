/**
 * @vitest-environment jsdom
 *
 * 展台工具条六个按钮与标注点点击的埋点。InsectCanvas 打桩 —— r3f 的
 * Canvas 在 jsdom 里根本转不起来，桩只要能交出 onToggleHotspot 就够，
 * 和 stage-fallback.test.tsx 是同一套打桩策略（webglOk 恒为真，这里不
 * 需要再测兜底路径，那部分已经被那个文件盯住了）。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { Stage } from '../Stage'

const h = vi.hoisted(() => ({
  toggleHotspot: undefined as ((id: string | null) => void) | undefined,
}))

vi.mock('../../three/webgl', () => ({
  webglAvailable: () => true,
  bindContextLoss: () => () => {},
}))

vi.mock('../../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return {
    InsectCanvas: (props: { onToggleHotspot: (id: string | null) => void }) => {
      h.toggleHotspot = props.onToggleHotspot
      return createElement('div', { 'data-testid': 'canvas-stub' })
    },
  }
})

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../../analytics'

const trackMock = vi.mocked(track)
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
  trackMock.mockClear()
  h.toggleHotspot = undefined
})

function mount() {
  renderZh(
    <Stage insect={ladybird} compareWith={null} onCompareToggle={vi.fn()} onCompareCycle={vi.fn()} />,
  )
}

describe('工具条六个按钮 —— stage_tool(tool)', () => {
  it.each([
    ['旋转', 'rotate'],
    ['放大', 'zoom'],
    ['聚焦', 'focus'],
    ['剖切', 'section'],
    ['分层', 'layers'],
    ['复位', 'reset'],
  ] as const)('点「%s」上报 tool: %s', (label, tool) => {
    mount()
    fireEvent.click(screen.getByText(label))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.STAGE_TOOL, { tool })
  })

  it('「对比」按钮不算在这六个里面 —— 它换的是物种，走 species_switch(source: compare)', () => {
    mount()
    fireEvent.click(screen.getByText('对比'))
    expect(trackMock).not.toHaveBeenCalledWith(EVENTS.STAGE_TOOL, expect.anything())
  })
})

describe('标注点点击 —— hotspot_click(anchor)', () => {
  it('打开一个标注点：上报它对应的 anchor key，不是 hotspot 自己的 id', () => {
    mount()
    const hotspot = ladybird.hotspots[0]
    expect(hotspot.id).not.toBe(hotspot.anchor) // 前提：两者不同名，这条测试才有意义
    h.toggleHotspot?.(hotspot.id)
    expect(trackMock).toHaveBeenCalledWith(EVENTS.HOTSPOT_CLICK, { anchor: hotspot.anchor })
  })

  it('关掉标注点（回传 null）不上报 —— 只有真的打开才算一次点击', () => {
    mount()
    const hotspot = ladybird.hotspots[0]
    h.toggleHotspot?.(hotspot.id)
    trackMock.mockClear()
    h.toggleHotspot?.(null)
    expect(trackMock).not.toHaveBeenCalled()
  })
})
