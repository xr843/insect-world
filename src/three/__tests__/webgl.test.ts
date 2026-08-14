/**
 * @vitest-environment jsdom
 *
 * WebGL 上下文丢失的事件绑定。真丢一次上下文没法在测试里复现，
 * 但这两件事能钉死：contextlost 有没有 preventDefault（没有它浏览器
 * **永不**发恢复事件 —— 规范如此，也是最容易被「顺手清理」掉的一行）、
 * 事件有没有正确转成布尔回调。
 */
import { describe, expect, it, vi } from 'vitest'
import { bindContextLoss, webglAvailable } from '../webgl'

describe('bindContextLoss', () => {
  it('contextlost 被 preventDefault，并上报 lost=true', () => {
    const el = document.createElement('canvas')
    const onChange = vi.fn()
    bindContextLoss(el, onChange)
    const e = new Event('webglcontextlost', { cancelable: true })
    el.dispatchEvent(e)
    expect(e.defaultPrevented, '不 preventDefault 的话浏览器永不恢复上下文').toBe(true)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('contextrestored 上报 lost=false', () => {
    const el = document.createElement('canvas')
    const onChange = vi.fn()
    bindContextLoss(el, onChange)
    el.dispatchEvent(new Event('webglcontextrestored'))
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('解绑后两个事件都不再上报', () => {
    const el = document.createElement('canvas')
    const onChange = vi.fn()
    const unbind = bindContextLoss(el, onChange)
    unbind()
    el.dispatchEvent(new Event('webglcontextlost', { cancelable: true }))
    el.dispatchEvent(new Event('webglcontextrestored'))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('webglAvailable', () => {
  /** jsdom 没有 WebGL —— 正好当一台「不支持的设备」用：要 false，不许抛 */
  it('建不出上下文时返回 false 而不是抛错', () => {
    expect(webglAvailable()).toBe(false)
  })
})
