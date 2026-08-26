/**
 * @vitest-environment jsdom
 *
 * 左栏名录：选中项必须留在**名录的**视野里 —— 而且只能动名录。
 *
 * 这条 bug 的形态很有欺骗性 —— 方向键**是**生效的，activeId 一路在变，
 * 3D 展台也跟着换标本；只有左栏那个高亮悄悄滑出了可视区。实测按 9 下
 * 之后选中项在列表下边缘之外 143px 处，用户看到的是「列表纹丝不动」，
 * 于是以为方向键坏了。
 *
 * ⚠️ **这个文件的第一版守错了东西，值得记一笔。** 它断言的是
 * 「调了 scrollIntoView，且 block/inline 都是 nearest」—— 那是**机制**。
 * 机制一直是对的，结果却是错的：`scrollIntoView` 会把每一个可滚动祖先
 * 都调一遍，最外面那个是页面本身。手机上名录被 CSS 改成贴在展台下方的
 * 横向滑条、落在首屏之外，于是「让选中项可见」被执行成「把整页往下拽」。
 * 2026-08-26 无头 iPhone 13 实测：首页与物种页一加载就自动滚到
 * scrollY=179，135px 高的页头整个滚出屏外，每换一次物种再拽一次。
 * 三年不变的绿灯，量的是调用参数，不是用户看见的东西。
 *
 * 所以现在断言的是结果：**名录容器滚了、页面没滚、scrollIntoView 一次
 * 都没调**。jsdom 没有布局，几何量全是 0，因此矩形与 scroll 位置都由
 * 下面的桩喂进去 —— 这是 jsdom 里测滚动行为的标准做法（同
 * library-panel-analytics.test.tsx 对 clientHeight/scrollHeight 的处理）。
 */
import { cleanup } from '@testing-library/react'
import { renderZh } from '../../i18n/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LibraryPanel } from '../LibraryPanel'
import { INSECTS } from '../../data/insects.zh'

afterEach(cleanup)

/** scrollIntoView 的探针：这里录到任何一次调用都说明退回了会拽页面的老写法 */
let intoViewCalls: number

beforeEach(() => {
  intoViewCalls = 0
  Element.prototype.scrollIntoView = function () {
    intoViewCalls += 1
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

type Rect = { top: number; bottom: number; left: number; right: number }

function stubRect(el: Element, r: Rect) {
  el.getBoundingClientRect = () =>
    ({ ...r, width: r.right - r.left, height: r.bottom - r.top, x: r.left, y: r.top }) as DOMRect
}

/**
 * jsdom 的 scrollTop/scrollLeft 没有滚动盒撑腰，写进去未必读得回来 ——
 * 换成自带存储的访问器，组件写了什么就录下什么（顺带就是断言的取值处）。
 */
function instrumentScroll(el: Element) {
  const state = { top: 0, left: 0 }
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => state.top,
    set: (v: number) => void (state.top = v),
  })
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    get: () => state.left,
    set: (v: number) => void (state.left = v),
  })
  return state
}

/**
 * 摆一份可控的布局：名录容器占视口 y∈[100,500]、x∈[0,200]，
 * 第 i 个条目排在它下面 40px 一格 —— 第 11 个（top=540）就落在容器之外了。
 */
function setUp(layout: (i: number) => Rect = (i) => ({ top: 100 + i * 40, bottom: 140 + i * 40, left: 0, right: 200 })) {
  const view = renderZh(<LibraryPanel {...props} activeId={INSECTS[0].id} />)
  const list = view.container.querySelector('[class*=list]')!
  stubRect(list, { top: 100, bottom: 500, left: 0, right: 200 })
  const scroll = instrumentScroll(list)
  view.container.querySelectorAll('a[href]').forEach((a, i) => stubRect(a, layout(i)))
  intoViewCalls = 0
  return { ...view, list, scroll }
}

describe('左栏名录的选中项跟随', () => {
  it('选中项落到容器之外时，把名录滚到刚好看见它', () => {
    const { rerender, scroll } = setUp()
    // 方向键连按的效果：activeId 一路往下
    rerender(<LibraryPanel {...props} activeId={INSECTS[11].id} />)
    // 第 11 项的下沿 540+40=580，容器下沿 500 —— 差 80，nearest 只滚这 80
    expect(scroll.top, '选中项跑到容器外了却没滚').toBe(80)
  })

  it('选中项已经可见时一动不动', () => {
    const { rerender, scroll } = setUp()
    rerender(<LibraryPanel {...props} activeId={INSECTS[3].id} />)
    expect(scroll.top).toBe(0)
    expect(scroll.left).toBe(0)
  })

  /**
   * 手机上这个容器被 CSS 改成横向滑条（LibraryPanel.module.css 的
   * max-width:900px 分支），条目左右排开 —— 只管纵轴的话手机上选中项照样看不见。
   */
  it('横向滑条上滚的是横轴', () => {
    const { rerender, scroll } = setUp((i) => ({
      top: 100,
      bottom: 200,
      left: i * 90,
      right: i * 90 + 86,
    }))
    rerender(<LibraryPanel {...props} activeId={INSECTS[5].id} />)
    expect(scroll.left, '横滑条上没跟着滚').toBe(336) // 右沿 5*90+86=536，容器右沿 200
    expect(scroll.top).toBe(0)
  })

  /**
   * 这一条是整改的目的，也是最容易被"顺手改回去"的一条：
   * scrollIntoView 用起来更短，但它会连页面一起滚。
   */
  it('绝不调用 scrollIntoView —— 它会把页面一起拽走', () => {
    const { rerender } = setUp()
    rerender(<LibraryPanel {...props} activeId={INSECTS[11].id} />)
    expect(intoViewCalls, 'scrollIntoView 会滚动每一个可滚动祖先，含页面本身').toBe(0)
  })

  it('页面自身不许被动到', () => {
    const { rerender } = setUp()
    rerender(<LibraryPanel {...props} activeId={INSECTS[62].id} />)
    expect(window.scrollY).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
    expect(document.body.scrollTop).toBe(0)
  })

  it('选中项被筛掉时（列表里没有它）不动也不炸', () => {
    const { rerender, scroll } = setUp()
    const onlyBeetles = INSECTS.filter((i) => i.order === 'coleoptera')
    expect(() =>
      rerender(
        <LibraryPanel {...props} insects={onlyBeetles} activeId={INSECTS.find((i) => i.order !== 'coleoptera')!.id} />,
      ),
    ).not.toThrow()
    expect(scroll.top).toBe(0)
  })
})
