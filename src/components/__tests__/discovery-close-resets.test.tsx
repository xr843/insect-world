/**
 * @vitest-environment jsdom
 *
 * **收起讲解弹窗时，展台必须一起回位。**
 *
 * 由来（2026-09-06，PR #41 的评审）：复位只写在 `Discovery.close()` 里，
 * 而 `close()` 只有弹窗**自己**那个关闭按钮会调。App 这一侧有好几处直接
 * `setDiscovery(null)` 把组件卸载掉 —— 卸载不经过 `close()`，于是
 * `onLifeStage(null)` 一次也没跑。
 *
 * 后果不是「显示得不对」而是**卡死**：生活史停在「卵」那一步时，展台上摆的是
 * 一颗卵；这时候弹窗被卸载，卵就一直摆在那儿，而唯一能把它换回成虫的那个弹窗
 * 已经没了。换别的虫能解（`[activeId]` 那个 effect 会复位），但点**当前这只**
 * 不行 —— `setActiveId(同一个 id)` 是空操作，effect 不会重跑。
 *
 * 三个入口都要守：顶栏「探索」（master 上就漏着）、名录里点当前这只（PR #41
 * 新开的那道门）、部位跳转。守的判据是 InsectCanvas 真正收到的 `lifeStage`，
 * 不是弹窗还在不在 —— 弹窗关掉而展台没回位，正是这个 bug 的形状。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import App from '../../App'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../../analytics'

const trackMock = vi.mocked(track)

const h = vi.hoisted(() => ({
  lifeStage: undefined as string | null | undefined,
  speciesId: undefined as string | undefined,
}))

vi.mock('../../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return {
    InsectCanvas: (props: { lifeStage?: string | null; insect?: { id: string } }) => {
      h.lifeStage = props.lifeStage
      h.speciesId = props.insect?.id
      return createElement('div', { 'data-testid': 'canvas-stub' })
    },
  }
})

vi.mock('../../three/webgl', () => ({
  webglAvailable: () => true,
  bindContextLoss: () => () => {},
}))

afterEach(() => {
  cleanup()
  trackMock.mockClear()
  h.lifeStage = undefined
  h.speciesId = undefined
})

beforeAll(() => {
  Element.prototype.scrollIntoView = function () {}
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    })
  }
})

/** 首个物种就是打开页面时展台上那只，且它有卵/幼虫/蛹三个阶段模型 */
const FIRST = INSECTS[0]

/** 打开生活史（展台右上角那个入口）—— 一打开就会把展台换成第一步的标本 */
function openLifecycle() {
  fireEvent.click(screen.getByText(/看它的\s*\d+\s*个阶段/))
}

/** 名录里那一行（是 <a href>，不是按钮） */
function libraryRow(id: string): HTMLElement {
  const a = document.querySelector<HTMLElement>(`a[href="/s/${id}/"]`)
  if (!a) throw new Error(`名录里找不到 ${id} 这一行`)
  return a
}

describe('收起讲解弹窗时展台一起回位', () => {
  it('生活史停在卵上时点名录里的当前这只 —— 展台要回到成虫', () => {
    renderZh(<App />)
    openLifecycle()
    expect(h.lifeStage, '生活史一打开就该把展台换成第一步的标本').toBe('egg')

    fireEvent.click(libraryRow(FIRST.id))

    expect(h.speciesId, '点的是当前这只，物种不该变').toBe(FIRST.id)
    expect(h.lifeStage, '弹窗没了，展台却还摆着那颗卵 —— 没有任何入口能把它换回来').toBe(null)
  })

  it('顶栏「探索」同样要把展台换回成虫', () => {
    renderZh(<App />)
    openLifecycle()
    expect(h.lifeStage).toBe('egg')

    fireEvent.click(screen.getByText('探索'))

    expect(screen.queryByText(new RegExp(`${FIRST.name}的一生`)), '「探索」该收起弹窗').toBeNull()
    expect(h.lifeStage, '「探索」收起了弹窗，展台却还停在卵上').toBe(null)
  })

  it('换到别的物种时，讲解关掉、物种真的换了', () => {
    renderZh(<App />)
    fireEvent.click(screen.getByText('课程'))
    expect(screen.getByText('跟着看'), '讲解没打开').toBeTruthy()

    const second = INSECTS[1]
    fireEvent.click(libraryRow(second.id))

    expect(screen.queryByText('跟着看'), '换物种该收起讲解').toBeNull()
    expect(h.speciesId, '换物种这一步本身没生效').toBe(second.id)
  })
})

describe('同一种讲解从不同入口再打开，要算作新的一次打开', () => {
  it('先从展台开生活史，再从底部卡片开 —— 两次都要上报', () => {
    renderZh(<App />)
    openLifecycle()

    const opens = () =>
      trackMock.mock.calls.filter(
        (c) => c[0] === EVENTS.DISCOVERY_OPEN && (c[1] as { kind?: string }).kind === 'lifecycle',
      )
    expect(opens()).toHaveLength(1)
    expect(opens()[0][1]).toEqual({ kind: 'lifecycle', source: 'stage' })

    // 弹窗的遮罩是 pointer-events:none 且靠左停靠，底部卡片一直点得到
    fireEvent.click(screen.getByText('播放发育动画'))

    expect(opens(), '同一个 kind 换入口再打开，没有重新挂载就一次也不会上报').toHaveLength(2)
    expect(opens()[1][1]).toEqual({ kind: 'lifecycle', source: 'card' })
  })
})
