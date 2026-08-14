/**
 * WebGL 可用性探测与上下文丢失的事件绑定。
 *
 * 单独成文件而不是塞进 InsectCanvas：这两件事不依赖 r3f，
 * 纯 DOM 就能测 —— 真丢一次上下文没法在测试里复现，
 * 但「preventDefault 有没有调、事件有没有转成回调」可以钉死。
 */

/**
 * 这台设备现在能不能建 WebGL 上下文。
 *
 * 拿一块一次性 canvas 试建（webgl2 不行再试 webgl1，three r150+ 两者都吃）。
 * 会走到 false 的真实场景：远程桌面、虚拟机、驱动被浏览器拉黑名单、
 * 用户关了硬件加速。直接挂 <Canvas> 的话 three 的构造器会 throw，
 * 白屏之外什么也留不下 —— 先问一声，不行就体面地摆剪影。
 */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null
  } catch {
    return false
  }
}

/**
 * 监听一块 canvas 的 WebGL 上下文丢失/恢复，转成一个布尔回调。
 *
 * ⚠️ contextlost 必须 preventDefault：规范规定默认行为是「不再恢复」，
 * 阻止默认之后浏览器才会在资源回来时发 contextrestored（很反直觉，
 * 与其他事件的 preventDefault 语义正好相反）。
 *
 * 返回解绑函数。
 */
export function bindContextLoss(
  el: HTMLCanvasElement,
  onChange: (lost: boolean) => void,
): () => void {
  const onLost = (e: Event) => {
    e.preventDefault()
    onChange(true)
  }
  const onRestored = () => onChange(false)
  el.addEventListener('webglcontextlost', onLost)
  el.addEventListener('webglcontextrestored', onRestored)
  return () => {
    el.removeEventListener('webglcontextlost', onLost)
    el.removeEventListener('webglcontextrestored', onRestored)
  }
}
