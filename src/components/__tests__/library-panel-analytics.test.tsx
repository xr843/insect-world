/**
 * @vitest-environment jsdom
 *
 * 左栏名录两处埋点：点条目（species_switch, source:'list'）与滚动深度
 * （library_scroll_depth，节流 + 兜底补报）。选中项跟随滚动的契约已有
 * library-scroll.test.tsx 专门盯着，这里不重复那部分。
 *
 * jsdom 没有真实布局，scrollTop/clientHeight/scrollHeight 一律是 0 —— 用
 * Object.defineProperty 在触发 scroll 事件前把这几个只读属性改写成想要
 * 的值，这是 jsdom 测滚动行为的标准做法。
 */
import { act, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { LibraryPanel } from '../LibraryPanel'
import { INSECTS } from '../../data/insects.zh'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../../analytics'

const trackMock = vi.mocked(track)

beforeEach(() => {
  // jsdom 不实现 scrollIntoView，组件内部换选中项时会调用它，装个空桩
  Element.prototype.scrollIntoView = function () {}
})

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

const props = {
  insects: INSECTS,
  activeId: INSECTS[0].id,
  onSelect: vi.fn(),
  onViewAll: vi.fn(),
  totalCount: INSECTS.length,
  filterLabel: null,
  onClearFilter: vi.fn(),
  notedOnly: false,
  onToggleNotedOnly: vi.fn(),
  noteCount: 0,
}

describe('点击条目 —— species_switch(source: list)', () => {
  it('点第二只：既调用 onSelect，也带物种 id 与目上报', () => {
    const onSelect = vi.fn()
    const { container } = renderZh(<LibraryPanel {...props} onSelect={onSelect} />)
    const second = INSECTS[1]
    const btn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(second.name),
    )
    expect(btn, `没找到「${second.name}」这一行`).toBeTruthy()
    fireEvent.click(btn!)

    expect(onSelect).toHaveBeenCalledWith(second.id)
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, {
      source: 'list',
      species_id: second.id,
      order: second.order,
    })
  })
})

/** 把 `.list` 滚动容器的几个只读几何属性改成想要的值，再真的触发一次 scroll */
function fireScroll(
  el: Element,
  vals: { scrollTop: number; clientHeight: number; scrollHeight: number },
) {
  for (const [key, value] of Object.entries(vals)) {
    Object.defineProperty(el, key, { value, configurable: true })
  }
  fireEvent.scroll(el)
}

describe('滚动深度埋点', () => {
  const total = INSECTS.length
  const perItem = 100
  const scrollHeight = total * perItem
  const clientHeight = perItem

  function getList(container: HTMLElement) {
    const list = container.querySelector('[class*=list]')
    expect(list, '找不到 .list 滚动容器').toBeTruthy()
    return list as HTMLElement
  }

  it('第一次滚动立即上报，index 按滚动比例折算', () => {
    const { container } = renderZh(<LibraryPanel {...props} />)
    const list = getList(container)
    // (0 + clientHeight) / scrollHeight = 1/total，折算回第 1 只
    fireScroll(list, { scrollTop: 0, clientHeight, scrollHeight })
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LIBRARY_SCROLL_DEPTH, { index: 1, total })
  })

  it('一屏放得下（没有溢出量）时不报 —— 谈不上「滚动深度」', () => {
    const { container } = renderZh(<LibraryPanel {...props} />)
    const list = getList(container)
    fireScroll(list, { scrollTop: 0, clientHeight: scrollHeight, scrollHeight })
    expect(trackMock).not.toHaveBeenCalled()
  })

  it('节流窗口内快速滚到底不会立刻再报，但窗口过后会补报最深的那次', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderZh(<LibraryPanel {...props} />)
      const list = getList(container)
      fireScroll(list, { scrollTop: 0, clientHeight, scrollHeight })
      expect(trackMock).toHaveBeenCalledTimes(1)
      trackMock.mockClear()

      // 紧接着（同一节流窗口内）一口气滚到最底
      fireScroll(list, { scrollTop: scrollHeight - clientHeight, clientHeight, scrollHeight })
      expect(trackMock, '节流窗口内不该立刻再发').not.toHaveBeenCalled()

      act(() => vi.advanceTimersByTime(1200))
      expect(trackMock).toHaveBeenCalledWith(EVENTS.LIBRARY_SCROLL_DEPTH, { index: total, total })
    } finally {
      vi.useRealTimers()
    }
  })

  it('往回滚不倒退已经到过的深度 —— 只关心滚到过的最深处', () => {
    const { container } = renderZh(<LibraryPanel {...props} />)
    const list = getList(container)
    fireScroll(list, { scrollTop: scrollHeight - clientHeight, clientHeight, scrollHeight })
    trackMock.mockClear()
    fireScroll(list, { scrollTop: 0, clientHeight, scrollHeight })
    expect(trackMock).not.toHaveBeenCalled()
  })

  it('换一份新列表（比如切换分类筛选）后，深度记录清零重新算', () => {
    const { container, rerender } = renderZh(<LibraryPanel {...props} />)
    const list = getList(container)
    fireScroll(list, { scrollTop: scrollHeight - clientHeight, clientHeight, scrollHeight })
    trackMock.mockClear()

    const filtered = INSECTS.slice(0, 5)
    rerender(<LibraryPanel {...props} insects={filtered} totalCount={filtered.length} />)
    const list2 = getList(container)
    const smallScrollHeight = filtered.length * perItem
    fireScroll(list2, { scrollTop: 0, clientHeight: perItem, scrollHeight: smallScrollHeight })
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LIBRARY_SCROLL_DEPTH, {
      index: 1,
      total: filtered.length,
    })
  })
})
