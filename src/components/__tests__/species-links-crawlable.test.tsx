/**
 * @vitest-environment jsdom
 *
 * 渲染之后，名录里的每一只虫都必须是一条真链接。
 *
 * 这是那种**功能全对、测试全绿、只有爬虫受害**的缺陷，所以要单独钉死：
 * 构建期注入的静态正文带着通往 63 页的 `<a href>`，可 React 一挂载就把
 * `#root` 清空，渲染后的 DOM 里如果全是 `<button onClick>`，那么 Google
 * 的第二波抓取（渲染版）看到的就是一个没有任何出站链接的孤岛。
 *
 * 2026-08-24 在 Search Console 量到的后果：已编入索引 4 页、**未编入索引 0 页**。
 * 零未收录 = 没有一页被抓取后判定不合格，Google 只是不知道另外 124 页存在。
 *
 * 三条契约，每条失守都不会有别的断言变红：
 *
 * 1. **每一只都有 href，且指向它自己的规范路径**（英文站要带 /en 前缀，
 *    否则跨语言互链，壳页的 hreflang 与之打架）。
 * 2. **普通左键点击不真跳转** —— 那会整页重载，白等一次 3D 重建。
 * 3. **带修饰键的点击放行给浏览器** —— 不 preventDefault、不换物种、不上报。
 *    这条最容易在重构里被顺手"简化"掉：Ctrl 点开新标签的人，当前这只不该跟着变，
 *    而埋点若照报，一次点击会在两个标签里各记一笔。
 */
import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderEn, renderZh } from '../../i18n/testing'
import { LibraryPanel } from '../LibraryPanel'
import { Gallery } from '../Gallery'
import { INSECTS } from '../../data/insects.zh'
import { INSECTS as INSECTS_EN } from '../../data/insects.en'
import { canonicalPath } from '../../i18n/hrefForLocale'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { track } from '../../analytics'

const trackMock = vi.mocked(track)

// 组件内部换选中项时会调它，jsdom 没有实现
Element.prototype.scrollIntoView = function () {}

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

const libProps = {
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

/** 页面上所有指向物种页的链接 */
const speciesLinks = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLAnchorElement>('a[href*="/s/"]')]

/**
 * 点一下链接，返回「组件有没有拦下这次跳转」。
 *
 * 不能直接读 `fireEvent` 之后的 `ev.defaultPrevented`：没被拦下时 jsdom 会真的
 * 去导航，然后异步刷一屏 `Not implemented: navigation` —— 那是**放行成功**的证据，
 * 却长得像测试出了错，久了就会训练人忽略测试输出。
 *
 * 所以挂一个探针：它跑的时候组件的处理器已经跑完，此刻的 `defaultPrevented`
 * 正是组件的答案；读完再统一 preventDefault，把导航掐掉。
 *
 * ⚠️ 探针必须挂在 **React 根容器**上，不能挂 document —— Gallery 的面板有一层
 * `onClick={e => e.stopPropagation()}`（点面板不该关弹层），事件根本冒泡不到
 * document，探针不跑，jsdom 照样去导航。React 18 的根监听器也在这个容器上、
 * 且注册得比这条早，所以它先跑；而 stopPropagation 拦的是别的节点，
 * 拦不住同一节点上后注册的监听器。
 */
function clickLink(root: HTMLElement, el: HTMLElement, init: MouseEventInit = {}): boolean {
  let preventedByComponent = false
  const probe = (e: Event) => {
    preventedByComponent = e.defaultPrevented
    e.preventDefault()
  }
  root.addEventListener('click', probe)
  try {
    fireEvent(el, new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }))
  } finally {
    root.removeEventListener('click', probe)
  }
  return preventedByComponent
}

describe('左栏名录：63 条真链接', () => {
  it('每一只都有一条 href，一只不少', () => {
    const { container } = renderZh(<LibraryPanel {...libProps} />)
    const hrefs = speciesLinks(container).map((a) => a.getAttribute('href'))
    expect(
      hrefs.length,
      '渲染后的 DOM 里物种链接数量不对 —— 少一条就是少一页能被发现',
    ).toBe(INSECTS.length)
    expect(new Set(hrefs).size, 'href 有重复').toBe(INSECTS.length)
    for (const i of INSECTS) {
      expect(hrefs, `${i.name} 没有链接`).toContain(canonicalPath('zh', i.id))
    }
  })

  it('英文站的链接带 /en 前缀 —— 否则跨语言互链，跟壳页的 hreflang 打架', () => {
    const { container } = renderEn(
      <LibraryPanel {...libProps} insects={INSECTS_EN} activeId={INSECTS_EN[0].id} />,
    )
    const hrefs = speciesLinks(container).map((a) => a.getAttribute('href'))
    expect(hrefs.length).toBe(INSECTS_EN.length)
    expect(hrefs.every((h) => h?.startsWith('/en/s/')), '有链接漏了 /en 前缀').toBe(true)
    expect(hrefs).toContain(canonicalPath('en', INSECTS_EN[1].id))
  })

  it('普通左键：不真跳转，走站内切换', () => {
    const onSelect = vi.fn()
    const { container } = renderZh(<LibraryPanel {...libProps} onSelect={onSelect} />)
    const link = speciesLinks(container).find(
      (a) => a.getAttribute('href') === canonicalPath('zh', INSECTS[1].id),
    )!
    expect(clickLink(container, link), '没有拦下跳转 —— 整页重载会把 3D 从头重建一遍').toBe(true)
    expect(onSelect).toHaveBeenCalledWith(INSECTS[1].id)
    expect(trackMock).toHaveBeenCalled()
  })

  it('Ctrl / Cmd / Shift 点击：放行给浏览器，当前这只不动，也不上报', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'shiftKey'] as const) {
      const onSelect = vi.fn()
      const { container, unmount } = renderZh(<LibraryPanel {...libProps} onSelect={onSelect} />)
      const link = speciesLinks(container).find(
        (a) => a.getAttribute('href') === canonicalPath('zh', INSECTS[1].id),
      )!
      expect(clickLink(container, link, { [mod]: true }), `${mod} 点击被拦下了 —— 新标签打不开`).toBe(false)
      expect(onSelect, `${mod} 点击换掉了当前物种 —— 用户要的是新标签里那一只`).not.toHaveBeenCalled()
      expect(trackMock, `${mod} 点击照样上报 —— 新标签自己会记一次落地，这是重复计数`).not.toHaveBeenCalled()
      unmount()
      trackMock.mockClear()
    }
  })
})

describe('总览弹层：同样是真链接', () => {
  const galleryProps = {
    insects: INSECTS,
    activeId: INSECTS[0].id,
    onSelect: vi.fn(),
    onClose: vi.fn(),
  }

  it('每一张卡片都有 href', () => {
    const { container } = renderZh(<Gallery {...galleryProps} />)
    const hrefs = speciesLinks(container).map((a) => a.getAttribute('href'))
    expect(hrefs.length).toBe(INSECTS.length)
    expect(hrefs).toContain(canonicalPath('zh', INSECTS[INSECTS.length - 1].id))
  })

  it('Ctrl 点击：弹层不关、物种不换 —— 用户还想接着挑下一只', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    const { container } = renderZh(
      <Gallery {...galleryProps} onSelect={onSelect} onClose={onClose} />,
    )
    const link = speciesLinks(container)[3]
    expect(clickLink(container, link, { ctrlKey: true }), 'Ctrl 点击被拦下了').toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
    expect(onClose, '弹层被关掉了 —— 新标签开完，这边该原样留着').not.toHaveBeenCalled()
  })
})
