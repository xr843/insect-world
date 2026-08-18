/**
 * 首帧分段计时通道（默认关闭，`?perf=1` 打开）
 *
 * 为什么需要它：首帧「从导航到虫子出现」跨越网络 → JS 解析 → React 挂载 →
 * WebGL 上下文 → 环境立方体贴图 → PMREM → 阴影贴图 → 着色器编译 → 物种几何构建
 * 这一长串，DevTools 的火焰图只告诉你「主线程忙了 3 秒」，不告诉你这 3 秒
 * 属于上面哪一段。没有分段就只能猜，而 `docs/model-audit-notes.md` 已经记过
 * 一次「猜了六轮全落空」的教训。
 *
 * 设计约束：
 * - **默认零成本**。不带 `?perf=1` 时所有函数直接 return，不建对象、不进 window。
 * - **不 import three**。要打三的补丁由调用方把 THREE 传进来（`installThreeProbes`），
 *   这样本模块不影响任何 chunk 的依赖图，打开与关闭跑的是同一份产物。
 * - 出口沿用 `src/preview.tsx` 的 `window.__preview` 那套做法：挂一个只读对象，
 *   外部脚本（`scripts/perf-firstframe.mjs`）从这里读，不必改产品代码。
 *
 * 用法见 `docs/perf-notes.md`。
 */

export const PERF =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf')

type Mark = { name: string; t: number }
type Span = { name: string; t: number; dur: number; extra?: Record<string, number> }
type RenderRec = { t: number; dur: number; programs: number; calls: number; tris: number }

interface PerfChannel {
  marks: Mark[]
  spans: Span[]
  renders: RenderRec[]
  /**
   * 本次实际生效的渲染参数快照。
   * `docs/model-audit-notes.md` 记过：诊断脚本自己有 bug 时会生产一堆假的
   * 「无变化」。所以每轮实验必须把**真正写进渲染器的值**打出来自证，
   * 而不是相信「我改了源码所以它一定生效了」。
   */
  info: Record<string, number | string | boolean>
  /**
   * 调试出口：THREE 本体与当前渲染器/场景/相机。
   *
   * 沿用 `src/preview.tsx` 的 `window.__preview` 那套做法。真正的用途是
   * **在没有 GPU 的机器之外做实验**：WSL 的无头 Chromium 只有 SwiftShader
   * 软件渲染，环境立方体/PMREM/着色器编译这几段的绝对值全部失真；
   * 拿到 THREE 之后可以在一台**有真 GPU** 的浏览器里跑同一组微基准，
   * 而且不依赖 requestAnimationFrame —— 后台标签页里 rAF 根本不来
   * （README「踩过的坑」那条），但 WebGL 调用照样执行。
   */
  debug: Record<string, unknown>
  /** 外部脚本轮询这个字段判断「虫子已经画出来了」 */
  firstFrame: number | null
}

const channel: PerfChannel = {
  marks: [],
  spans: [],
  renders: [],
  info: {},
  debug: {},
  firstFrame: null,
}

if (PERF && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__perf = channel
}

/** 往调试出口里挂东西（THREE、渲染器、场景…），只在 ?perf=1 下生效 */
export function pexpose(entries: Record<string, unknown>): void {
  if (!PERF) return
  Object.assign(channel.debug, entries)
}

/** 记一条「实际生效的参数」，供外部脚本核对实验是否真的进了渲染 */
export function pinfo(entries: Record<string, number | string | boolean>): void {
  if (!PERF) return
  Object.assign(channel.info, entries)
}

/** 打一个时间点（相对 navigationStart 的毫秒） */
export function pmark(name: string): void {
  if (!PERF) return
  channel.marks.push({ name, t: performance.now() })
}

/** 给一段同步代码计时 */
export function pspan<T>(name: string, fn: () => T): T {
  if (!PERF) return fn()
  const t = performance.now()
  try {
    return fn()
  } finally {
    channel.spans.push({ name, t, dur: performance.now() - t })
  }
}

/** 给一段异步代码计时（返回原 promise，不改变行为） */
export function ptrack<T>(name: string, p: Promise<T>): Promise<T> {
  if (!PERF) return p
  const t = performance.now()
  const done = () => channel.spans.push({ name, t, dur: performance.now() - t })
  p.then(done, done)
  return p
}

/**
 * 给渲染器打探针：每次 `gl.render` 的耗时 + 着色器程序数 + draw call 数。
 *
 * 程序数的增量是关键 —— WebGL 的着色器编译/链接在 Chrome 里是同步阻塞主线程的，
 * 一次 render 里如果程序数从 3 跳到 19，那这一帧的几百毫秒基本都是编译，
 * 与几何复杂度无关。没有这一列，render 的耗时读不出原因。
 */
export function installGLProbes(gl: {
  render: (...args: unknown[]) => unknown
  info: { programs?: unknown[] | null; render: { calls: number; triangles: number } }
}): void {
  if (!PERF) return
  const orig = gl.render.bind(gl)
  gl.render = (...args: unknown[]) => {
    const t = performance.now()
    const out = orig(...args)
    const rec = {
      t,
      dur: performance.now() - t,
      programs: gl.info.programs?.length ?? 0,
      calls: gl.info.render.calls,
      tris: gl.info.render.triangles,
    }
    channel.renders.push(rec)
    /**
     * 「虫子出现」的判据：模型就绪之后、第一次画到**大量三角面**的那次 render。
     *
     * 不能用「模型就绪后的下一次 render」—— 环境立方体那六面各自也是一次
     * render，但只有 134 个三角面（5 片 Lightformer）。第一版就是这么判的，
     * 结果算出「首帧早于模型就绪」的负数段，一眼假。虫最少的淡色库蚊也有
     * 13,308 面，阈值取 2000 两边都不沾。
     */
    if (awaitingFirstFrame && rec.tris > 2000) {
      awaitingFirstFrame = false
      channel.firstFrame = rec.t + rec.dur
      channel.marks.push({ name: 'first-frame', t: channel.firstFrame })
      channel.info.firstFrameTris = rec.tris
      channel.info.firstFramePrograms = rec.programs
    }
    return out
  }
}

let awaitingFirstFrame = false

/** 模型已就绪，开始等「第一次把它画出来」的那次 render（判据见 installGLProbes） */
export function markFirstFrame(): void {
  if (!PERF || channel.firstFrame !== null) return
  awaitingFirstFrame = true
}

/**
 * 给 three 的两处「一次性大开销」打补丁。
 *
 * `<Environment>` 带 children 时走的是 drei 的 EnvironmentPortal：
 * ① `CubeCamera.update()` 把 5 片 Lightformer 渲进 resolution² 的六面
 *    立方体渲染目标（这是 `resolution={512}` 直接决定的那笔）；
 * ② three 的渲染器在第一次用到 `scene.environment` 时**懒生成 PMREM**
 *    （`WebGLCubeUVMaps.get` → `PMREMGenerator.fromCubemap`），
 *    这笔开销同样按 resolution 缩放，但它发生在第一次 render 里面，
 *    不打补丁的话会被算进「首次 draw」而看不出来。
 *
 * THREE 由调用方传入，本模块不 import three（见文件头）。
 */
export function installThreeProbes(three: unknown): void {
  if (!PERF) return
  type Proto = Record<string, ((...a: unknown[]) => unknown) | boolean | undefined>
  const THREE = three as { CubeCamera: { prototype: Proto }; PMREMGenerator: { prototype: Proto } }
  const cc = THREE.CubeCamera.prototype
  if (!cc.__perfPatched) {
    const orig = cc.update as (...a: unknown[]) => unknown
    cc.update = function (this: unknown, ...args: unknown[]) {
      const t = performance.now()
      const out = orig.apply(this, args)
      channel.spans.push({ name: 'env-cube-render', t, dur: performance.now() - t })
      return out
    }
    cc.__perfPatched = true
  }
  const pm = THREE.PMREMGenerator.prototype
  if (!pm.__perfPatched) {
    const orig = pm.fromCubemap as (...a: unknown[]) => unknown
    pm.fromCubemap = function (this: unknown, ...args: unknown[]) {
      const t = performance.now()
      const out = orig.apply(this, args)
      channel.spans.push({ name: 'pmrem-from-cubemap', t, dur: performance.now() - t })
      return out
    }
    pm.__perfPatched = true
  }
}
