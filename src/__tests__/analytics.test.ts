/**
 * 埋点出口 track() 的防御性，以及事件名/来源枚举的自检。
 *
 * 这个文件故意不声明 jsdom 测试环境（那个声明是文件头一行形如
 * "vitest-environment" 加环境名的注释指令，写在这里会真的把本文件切
 * 到 jsdom —— 连带全局 window 存在，第一条用例就白测了，所以连提都
 * 只敢这样拐着弯提）。默认环境里根本没有全局 window，这正是「大陆
 * 访客拿不到 Umami 脚本」「vitest 跑测试」这类场景的真实写照 ——
 * 用真的「没有 window」去测，比用 jsdom 里删一个属性去模拟更接近
 * 实际会撞到的情况。需要「window 存在但没有 umami」或「umami.track
 * 存在」这几种场景时，用 vi.stubGlobal 临时挂一个假的上去。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EVENTS, SPECIES_SWITCH_SOURCES, STAGE_TOOLS, track } from '../analytics'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('track() 必须对任何环境都是防御性的', () => {
  it('全局 window 不存在时不抛', () => {
    expect(typeof window).toBe('undefined')
    expect(() => track('probe', { a: 1 })).not.toThrow()
  })

  it('window 存在但没有 umami 时不抛', () => {
    vi.stubGlobal('window', {})
    expect(() => track('probe', { a: 1 })).not.toThrow()
  })

  it('window.umami.track 存在时会被正确调用', () => {
    const spy = vi.fn()
    vi.stubGlobal('window', { umami: { track: spy } })
    track(EVENTS.THEME_TOGGLE, { theme: 'dark' })
    expect(spy).toHaveBeenCalledWith(EVENTS.THEME_TOGGLE, { theme: 'dark' })
  })

  it('data 参数可以省略', () => {
    const spy = vi.fn()
    vi.stubGlobal('window', { umami: { track: spy } })
    track(EVENTS.DISCOVERY_OPEN)
    expect(spy).toHaveBeenCalledWith(EVENTS.DISCOVERY_OPEN, undefined)
  })

  it('window.umami.track 内部抛异常也不上抛 —— 埋点失败不能影响交互', () => {
    vi.stubGlobal('window', {
      umami: {
        track: () => {
          throw new Error('umami 自己炸了')
        },
      },
    })
    expect(() => track('probe')).not.toThrow()
  })
})

describe('事件名常量', () => {
  it('全部是稳定的英文小写下划线风格', () => {
    const bad = Object.values(EVENTS).filter((name) => !/^[a-z]+(_[a-z]+)*$/.test(name))
    expect(bad).toEqual([])
  })

  it('互不重复 —— 撞名会让 Umami 后台把两件事混成一件', () => {
    const names = Object.values(EVENTS)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('来源枚举齐全', () => {
  it('species_switch 的来源覆盖需求里明确列出的六个，一个不多一个不少', () => {
    expect([...SPECIES_SWITCH_SOURCES].sort()).toEqual(
      ['list', 'search', 'gallery', 'keyboard', 'deeplink', 'compare'].sort(),
    )
  })

  it('stage_tool 覆盖工具条六个按钮，不含「对比」', () => {
    expect([...STAGE_TOOLS].sort()).toEqual(
      ['rotate', 'zoom', 'focus', 'section', 'layers', 'reset'].sort(),
    )
    expect(STAGE_TOOLS).not.toContain('compare')
  })
})
