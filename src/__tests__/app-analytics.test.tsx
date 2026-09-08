/**
 * @vitest-environment jsdom
 *
 * App.tsx 内部才拿得到、没法在单个叶子组件里单测的几处埋点：↑↓ 键翻页
 * （species_switch, source:'keyboard'）、地址栏自带物种的首帧
 * （species_switch, source:'deeplink'）、展台底部对比条换对照
 * （species_switch, source:'compare'），外加主题切换（theme_toggle）。
 *
 * three/registry 与 InsectCanvas 打桩，和 stage-fallback.test.tsx 同一套
 * 策略，额外把 registry 也打了桩 —— 否则 App.tsx 里的 prefetchInsectModel
 * 会真的触发建模（含 jsdom 没有的 2D canvas 上下文），又慢又不稳定，
 * 而这份测试根本不关心建模结果，只关心埋点调用。
 */
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../i18n/testing'
import { INSECTS } from '../data/insects.zh'
import App from '../App'

vi.mock('../three/registry', () => ({
  isKnownSpecies: () => true,
  prefetchInsectModel: () => {},
}))

vi.mock('../three/webgl', () => ({
  webglAvailable: () => true,
  bindContextLoss: () => () => {},
}))

vi.mock('../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return {
    InsectCanvas: () => createElement('div', { 'data-testid': 'canvas-stub' }),
  }
})

vi.mock('../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../analytics'

const trackMock = vi.mocked(track)

beforeAll(() => {
  // Stage 初始化要问一次 prefers-reduced-motion；老 jsdom 没有 matchMedia
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    })
  }
  // jsdom 不实现 scrollIntoView。LibraryPanel 已经不再调用它（改走 scrollNearest，
  // 只滚名录容器、不滚页面），这个空桩留作兜底
  Element.prototype.scrollIntoView = function () {}
})

beforeEach(() => {
  // 深链测试会改地址栏，其余测试要从干净的 "/" 开始；主题也要清掉，
  // 不然上一条用例存的 dark 会带进下一条，起始状态就不是默认的 light 了
  history.replaceState(null, '', '/')
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

describe('↑↓ 键翻页 —— species_switch(source: keyboard)', () => {
  it('按下 ↓ 翻到下一只，带上它的 id 与目', () => {
    renderZh(<App />)
    trackMock.mockClear() // 挂载本身可能已经报过 deeplink，这里只看按键之后
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    const next = INSECTS[1]
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, {
      source: 'keyboard',
      species_id: next.id,
      order: next.order,
    })
  })
})

describe('落地页带物种 —— species_switch(source: deeplink)', () => {
  it('地址栏是 /s/<id>/ 时，挂载即报一次', () => {
    history.replaceState(null, '', '/s/ant/')
    renderZh(<App />)
    const ant = INSECTS.find((i) => i.id === 'ant')!
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, {
      source: 'deeplink',
      species_id: 'ant',
      order: ant.order,
    })
  })

  it('裸首页（不带物种）不算深链，不该报', () => {
    history.replaceState(null, '', '/')
    renderZh(<App />)
    expect(trackMock).not.toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, expect.objectContaining({ source: 'deeplink' }))
  })
})

describe('展台底部对比条换对照 —— species_switch(source: compare)', () => {
  it('打开对比：挑一个对照物种时上报', () => {
    renderZh(<App />)
    trackMock.mockClear()
    fireEvent.click(screen.getByText('对比'))
    const peer = INSECTS[1] // activeId 是 INSECTS[0]，pickPeer(1) 取下一个
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, {
      source: 'compare',
      species_id: peer.id,
      order: peer.order,
    })
  })

  it('关掉对比（再点一次「对比」）不上报 —— 没有新物种产生', () => {
    renderZh(<App />)
    fireEvent.click(screen.getByText('对比')) // 打开
    trackMock.mockClear()
    fireEvent.click(screen.getByText('对比')) // 关掉
    expect(trackMock).not.toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, expect.objectContaining({ source: 'compare' }))
  })

  it('换一个对照物种：上报新的那一个', () => {
    renderZh(<App />)
    fireEvent.click(screen.getByText('对比')) // 打开，对照 = INSECTS[1]
    trackMock.mockClear()
    fireEvent.click(screen.getByTitle('换一个对照物种'))
    const next = INSECTS[2]
    expect(trackMock).toHaveBeenCalledWith(EVENTS.SPECIES_SWITCH, {
      source: 'compare',
      species_id: next.id,
      order: next.order,
    })
  })
})

describe('主题切换 —— theme_toggle(theme)', () => {
  it('默认浅色，点一下切到暗色并上报 theme: dark', () => {
    renderZh(<App />)
    fireEvent.click(screen.getByLabelText('切换到深色主题'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.THEME_TOGGLE, { theme: 'dark' })
  })
})

describe('点播墙的两个入口 —— feedback_open(source)', () => {
  /**
   * 页脚与右侧浮栏的曝光度差着一个量级（浮栏一直在视野里，页脚要滚到底），
   * source 分不开的话，两周后就没法判断「墙没人用」是功能问题还是入口太深。
   */
  it('右侧浮栏那个按钮上报 source: rail', () => {
    renderZh(<App />)
    fireEvent.click(screen.getByTitle('大家想看什么'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.FEEDBACK_OPEN, { kind: 'wish', source: 'rail' })
  })

  it('页脚那个上报 source: footer', () => {
    renderZh(<App />)
    // 两个入口的无障碍名字都是「大家想看什么」（浮栏靠 title，页脚靠文字），
    // 所以按角色查会同时命中两个 —— 同一个动作两个入口，这不是缺陷，
    // 但测试必须各自限定作用域，否则只是在测「随便点中了哪一个」
    const footer = document.querySelector('footer')!
    fireEvent.click(within(footer).getByRole('button', { name: '大家想看什么' }))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.FEEDBACK_OPEN, { kind: 'wish', source: 'footer' })
  })

  /**
   * 浮栏在 ≤1240px 下整条 display:none（global.css），也就是手机与平板看不见它 ——
   * 页脚那个是窄屏上唯一的入口，撤掉等于 29% 的访客再也进不了墙。
   */
  it('两个入口同时存在，页脚那个不能因为浮栏有了就撤掉', () => {
    renderZh(<App />)
    expect(document.querySelector('.rail-float [title="大家想看什么"]')).toBeTruthy()
    expect(document.querySelector('footer button')?.textContent).toContain('大家想看什么')
  })
})
