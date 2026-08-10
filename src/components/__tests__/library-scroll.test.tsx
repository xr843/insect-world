/**
 * @vitest-environment jsdom
 *
 * 左栏名录：选中项必须留在视野里。
 *
 * 这条 bug 的形态很有欺骗性 —— 方向键**是**生效的，activeId 一路在变，
 * 3D 展台也跟着换标本；只有左栏那个高亮悄悄滑出了可视区。实测按 9 下
 * 之后选中项在列表下边缘之外 143px 处，用户看到的是「列表纹丝不动」，
 * 于是以为方向键坏了。
 *
 * jsdom 没有布局，量不了「滚没滚到」，所以这里守的是**契约**：
 * 选中项换了就得调 scrollIntoView，且参数必须是 nearest。
 * nearest 不是风格偏好 —— 它是「已经可见就别动」的唯一取值，换成
 * center/start 会让每一次点击都把列表（乃至整页）拽一下。
 */
import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LibraryPanel } from '../LibraryPanel'
import { INSECTS } from '../../data/insects'

afterEach(cleanup)

/**
 * jsdom 不实现 scrollIntoView，装个探针把调用录下来。
 * 记的是元素本身而不是它的文字 —— jsdom 同样不实现 innerText（取到的是
 * 空串），拿文字断言会得到一条「实现明明对了却红着」的假失败。
 */
let calls: { el: HTMLElement; opts: ScrollIntoViewOptions | undefined }[]

beforeEach(() => {
  calls = []
  Element.prototype.scrollIntoView = function (opts?: boolean | ScrollIntoViewOptions) {
    calls.push({ el: this as HTMLElement, opts: typeof opts === 'object' ? opts : undefined })
  }
})

const props = {
  insects: INSECTS,
  onSelect: vi.fn(),
  onViewAll: vi.fn(),
  totalCount: INSECTS.length,
  filterLabel: null,
  onClearFilter: vi.fn(),
  notedOnly: false,
  onToggleNotedOnly: vi.fn(),
  noteCount: 0,
}

describe('左栏名录的选中项跟随', () => {
  it('选中项换到列表深处时，把它滚进视野', () => {
    const { rerender } = render(<LibraryPanel {...props} activeId={INSECTS[0].id} />)
    calls = []
    // 方向键连按的效果：activeId 一路往下
    rerender(<LibraryPanel {...props} activeId={INSECTS[11].id} />)
    expect(calls.length, '选中项变了却没滚').toBeGreaterThan(0)
  })

  it('滚的是新的选中项本身，不是别的行', () => {
    const { rerender } = render(<LibraryPanel {...props} activeId={INSECTS[0].id} />)
    calls = []
    rerender(<LibraryPanel {...props} activeId={INSECTS[11].id} />)
    const el = calls.at(-1)?.el
    expect(el?.dataset.active, '滚到的不是选中行').toBe('true')
    expect(el?.textContent).toContain(INSECTS[11].name)
  })

  /**
   * 两个轴都要给：桌面端这个列表竖着滚，手机上被 CSS 改成横向滑条
   * （LibraryPanel.module.css 的 max-width:900px 分支），只给 block
   * 的话手机上选中项照样看不见。
   */
  it('block 与 inline 都用 nearest —— 已经可见时不许动', () => {
    const { rerender } = render(<LibraryPanel {...props} activeId={INSECTS[0].id} />)
    calls = []
    rerender(<LibraryPanel {...props} activeId={INSECTS[11].id} />)
    expect(calls.at(-1)?.opts?.block).toBe('nearest')
    expect(calls.at(-1)?.opts?.inline).toBe('nearest')
  })

  /**
   * 别改回 smooth。实测：平滑滚动由 rAF 驱动，后台标签页里 1.5 秒纹丝不动，
   * 同一刻 auto 立刻到位；连按方向键时动画还会被反复打断重启，列表追不上
   * 高亮 —— 那正是这条 bug 的原始症状。「选中项可见」是正确性属性，
   * 不该架在动画上。
   */
  it('用瞬时滚动，不依赖动画', () => {
    const { rerender } = render(<LibraryPanel {...props} activeId={INSECTS[0].id} />)
    calls = []
    rerender(<LibraryPanel {...props} activeId={INSECTS[11].id} />)
    expect(calls.at(-1)?.opts?.behavior).not.toBe('smooth')
  })
})
