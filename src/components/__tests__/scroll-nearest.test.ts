/**
 * @vitest-environment jsdom
 *
 * `scrollNearestWithin` 的语义闸门。
 *
 * 它替掉的是 `scrollIntoView({ block: 'nearest' })`，所以断言逐条对着
 * nearest 的定义写：已经可见就不动、在哪一侧之外就贴哪一侧、子项比容器
 * 还大时对齐起始边。两个轴各判各的 —— 桌面名录竖着滚，手机上同一个容器
 * 被 CSS 改成横向滑条。
 *
 * 最后一条才是它存在的理由：**页面不许动**。原来那版 scrollIntoView 功能
 * 完全正确、测试也全绿，坏就坏在它顺手把页面也滚了（实测手机上每次换物种
 * 都把整页往下拽 179px，页头滚出屏外）。
 */
import { describe, expect, it } from 'vitest'
import { scrollNearestWithin } from '../scrollNearest'

/** jsdom 没有布局，用假矩形喂进去；scrollTop/scrollLeft 用可读写的普通属性模拟 */
function fake(rect: { top: number; bottom: number; left: number; right: number }) {
  return {
    scrollTop: 0,
    scrollLeft: 0,
    getBoundingClientRect: () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top }),
  } as unknown as Element & { scrollTop: number; scrollLeft: number }
}

/** 容器：视口内 y ∈ [100, 500]、x ∈ [0, 200] */
const box = () => fake({ top: 100, bottom: 500, left: 0, right: 200 })

describe('scrollNearestWithin —— nearest 语义', () => {
  it('已经完整可见时一动不动', () => {
    const c = box()
    scrollNearestWithin(c, fake({ top: 200, bottom: 260, left: 10, right: 90 }))
    expect(c.scrollTop).toBe(0)
    expect(c.scrollLeft).toBe(0)
  })

  it('在下边缘之外：把下沿贴上去，只滚差的那一点', () => {
    const c = box()
    scrollNearestWithin(c, fake({ top: 520, bottom: 580, left: 10, right: 90 }))
    expect(c.scrollTop).toBe(80) // 580 - 500
  })

  it('在上边缘之外：把上沿贴上去（负向滚）', () => {
    const c = box()
    scrollNearestWithin(c, fake({ top: 40, bottom: 100, left: 10, right: 90 }))
    expect(c.scrollTop).toBe(-60) // 40 - 100
  })

  /**
   * 子项比容器还高时两侧都超出，浏览器的 nearest 取起始边。写成两个独立的
   * if 就会先贴上沿、再被下沿那条覆盖成贴下沿，方向正好反过来。
   */
  it('子项比容器还高时对齐起始边', () => {
    const c = box()
    scrollNearestWithin(c, fake({ top: 60, bottom: 900, left: 10, right: 90 }))
    expect(c.scrollTop).toBe(-40) // 60 - 100，不是 900 - 500
  })

  it('横轴同理，且与纵轴互不干扰', () => {
    const c = box()
    scrollNearestWithin(c, fake({ top: 520, bottom: 580, left: 240, right: 320 }))
    expect(c.scrollTop).toBe(80)
    expect(c.scrollLeft).toBe(120) // 320 - 200
  })

  /**
   * 这一条是整个改动的目的：只碰传进来的那个容器，页面（以及任何别的
   * 可滚动祖先）不许被动到。
   */
  it('只动传进来的容器，页面不动', () => {
    const before = { x: window.scrollX, y: window.scrollY }
    const c = box()
    scrollNearestWithin(c, fake({ top: 5200, bottom: 5280, left: 10, right: 90 }))
    expect(c.scrollTop).toBe(4780)
    expect(window.scrollX).toBe(before.x)
    expect(window.scrollY).toBe(before.y)
    expect(document.documentElement.scrollTop).toBe(0)
  })
})
