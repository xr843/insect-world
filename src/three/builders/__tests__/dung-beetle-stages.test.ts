/**
 * 神农洁蜣螂三个生活史阶段（卵 / 幼虫 / 蛹）的形态断言。
 *
 * ## 这份测试的自检标准
 *
 * **把代码改回出问题的那一版，这条断言会不会红？** 不会就等于没写。
 * 下面每一条都对着一个**真出过**的问题，逐条做过变异测试（把该处改坏、
 * 确认这条红、再改回来）：
 *
 * 一共 23 个退化版本，**全部被抓住**（脚本见提交说明；每个变异跑一遍本文件，
 * 确认它红了、再改回来）：
 *
 * | 变异 | 抓住它的断言 |
 * | --- | --- |
 * | 驼峰振幅调成 0 | 驼峰的净凸出量 |
 * | 表面换成单一频率的磨砂 | 三个频带的谱形（单层是尖的） |
 * | 只留最细 / 只留最粗那一层 | 对应频带的下限 |
 * | 材质不开 vertexColors / 几何不写顶点色 | 色调不匀（两处分开断言） |
 * | C 卷成 330°（甜甜圈）/ 拉直成 70° | C 形剪影的缺口 / 端点距离 |
 * | 体壁改用 elytra 那档 | 白铬防线 |
 * | 体色照抄独角仙的乳白 | 与独角仙的饱和度差 |
 * | 头壳照独角仙的比例放大 | 头宽 / 体最粗 |
 * | 体长照独角仙做（8.35） | 体长上限 |
 * | 胸足挪到腹节 | 足全在前 28% |
 * | 节间沟挖到 0.22（松果） | 节间起伏的峰谷差 |
 * | 幼虫腔壁磨平 | 腔壁粗糙度按阶段递变 |
 * | 孵化室内壁刷成粗糙的 | 同上 |
 * | 卵放大一倍 | 卵的长宽上限 |
 * | 卵壳上清漆 | 白铬防线 |
 * | 孵化室整圈生成（卵被自己的室挡住） | 室壁在朝观众一侧必须没有面 |
 * | 蛹的铲做成薄刃 / 做得跟头一样宽 | 铲的厚 / 半宽、铲宽 / 头宽 |
 * | 前足齿纯沿切向（埋进躯干） | 开掘齿的净凸出量 |
 * | 芽片跨段时被静默丢掉 | 翅芽 / 足芽的数量 |
 *
 *
 * ## 量的是「人看见的那个量」
 *
 * 项目的老教训：断言量的是数字，人看的是长相，两者可以毫无关系
 * （兰花螳螂「宽 ≥ 厚 3.5 倍」测出 5.75 是绿的，渲染出来却是几片薄板）。
 * 所以这里尽量按成像去量：C 形不靠端点距离一条（一根对折的香肠也满足），
 * 而是把整条虫投到 XY 栅格化，问「中间有没有洞、边上有没有缺口」；
 * 粪梨的粗糙度不问「粗糙度是多少」（那是个标量，磨砂球也很大），
 * 而是把每一圈的偏差按弧长分成三个频带，问「三个尺度是不是都有能量」。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildDungBeetle } from '../dung-beetle'
import { buildDungBeetleEgg } from '../stages/dung-beetle-egg'
import { buildDungBeetleLarva } from '../stages/dung-beetle-larva'
import { buildDungBeetlePupa } from '../stages/dung-beetle-pupa'
import { buildRhinocerosBeetleLarva } from '../stages/rhinoceros-beetle-larva'
import type { InsectModel } from '../kit'
import { HOLOMETABOLOUS, builtStagesOf, metamorphosisOf } from '../../stages'

/** 三个阶段都远低于这个预算；上限只防「某次改动让面数失控」 */
const TRIANGLE_BUDGET = 60_000

/** 验收机位（与 scripts/new-species-shots.mjs 一致）+ 展台默认机位 */
const VIEWS: Record<string, THREE.Vector3> = {
  home: new THREE.Vector3(0.86, 0.44, 1.25).normalize(),
  top: new THREE.Vector3(0.18, 1, 0.14).normalize(),
  side: new THREE.Vector3(0.12, 0.28, 1).normalize(),
}

// ---------------------------------------------------------------- 通用工具

function meshesNamed(model: InsectModel, ...names: string[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && names.includes(m.name)) out.push(m)
  })
  return out
}

function verticesOf(model: InsectModel, ...names: string[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (const mesh of meshesNamed(model, ...names)) {
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
    }
  }
  return out
}

function boxOf(model: InsectModel, ...names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const p of verticesOf(model, ...names)) box.expandByPoint(p)
  return box
}

function allVertices(model: InsectModel): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const pos = m.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
    }
  })
  return out
}

function triangleCount(model: InsectModel): number {
  let n = 0
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const g = m.geometry
    n += g.index ? g.index.count / 3 : g.getAttribute('position').count / 3
  })
  return n
}

function hasNonFinite(model: InsectModel): boolean {
  let bad = false
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const arr = m.geometry.getAttribute('position').array
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) bad = true
  })
  return bad
}

function materialOf(model: InsectModel, name: string): THREE.MeshPhysicalMaterial {
  const mesh = meshesNamed(model, name)[0]
  expect(mesh, `找不到名为 ${name} 的网格`).toBeTruthy()
  return mesh.material as THREE.MeshPhysicalMaterial
}

/**
 * 材质基色的 HSL。
 *
 * ⚠️ 必须显式传 `SRGBColorSpace`：three 从 r152 起做颜色管理，
 * `new THREE.Color('#6d6046')` 存的是**线性**值，`getHSL()` 缺省也按线性算，
 * 读出来的明度比源码里那个十六进制暗一大截。拿线性值去对「够不够亮」的阈值，
 * 等于用另一把尺子量。
 */
function hslOf(mat: THREE.MeshPhysicalMaterial): { h: number; s: number; l: number } {
  const out = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(out, THREE.SRGBColorSpace)
  return out
}

/**
 * 把 loft() 产物按 uv 的 v 分环、取每环重心，反推出中心线。
 * 这是从**几何本身**量出来的，不是 builder 自报的数字：loft 的每一环都是绕
 * 中心点均匀分布的椭圆采样，Σcos = Σsin = 0，所以环重心恰好落在中心线上。
 * u=1 那一列与 u=0 重合（接缝），要剔掉，否则重心会往那个方位偏。
 */
function centerline(mesh: THREE.Mesh): THREE.Vector3[] {
  const pos = mesh.geometry.getAttribute('position')
  const uv = mesh.geometry.getAttribute('uv')
  const rings = new Map<number, { sum: THREE.Vector3; n: number }>()
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    if (uv.getX(i) > 1 - 1e-6) continue
    const key = Math.round(uv.getY(i) * 1e6)
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    const e = rings.get(key) ?? { sum: new THREE.Vector3(), n: 0 }
    e.sum.add(v)
    e.n++
    rings.set(key, e)
  }
  return [...rings.entries()].sort((a, b) => a[0] - b[0]).map(([, e]) => e.sum.clone().divideScalar(e.n))
}

function arcLength(points: THREE.Vector3[]): number {
  let s = 0
  for (let i = 1; i < points.length; i++) s += points[i].distanceTo(points[i - 1])
  return s
}

/** 每一环到自己中心的平均距离 = 该处的可见半径 */
function ringRadii(mesh: THREE.Mesh, line: THREE.Vector3[]): number[] {
  const pos = mesh.geometry.getAttribute('position')
  const uv = mesh.geometry.getAttribute('uv')
  const keys = [...new Set(Array.from({ length: pos.count }, (_, i) => Math.round(uv.getY(i) * 1e6)))].sort(
    (a, b) => a - b,
  )
  const index = new Map(keys.map((k, i) => [k, i]))
  const sums = keys.map(() => ({ s: 0, n: 0 }))
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    if (uv.getX(i) > 1 - 1e-6) continue
    const k = index.get(Math.round(uv.getY(i) * 1e6))
    if (k === undefined) continue
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    sums[k].s += v.distanceTo(line[k])
    sums[k].n++
  }
  return sums.map((e) => e.s / e.n)
}

/** 沿中心线找离某点最近的那一环，返回它的归一化位置 0~1 */
function paramAt(line: THREE.Vector3[], p: THREE.Vector3): number {
  let best = 0
  let bd = Infinity
  for (let i = 0; i < line.length; i++) {
    const d = line[i].distanceToSquared(p)
    if (d < bd) {
      bd = d
      best = i
    }
  }
  return best / (line.length - 1)
}

/** 代数圆拟合（Kåsa）。返回圆心与半径 */
function circleFit(pts: { x: number; y: number }[]): { cx: number; cy: number; r: number } {
  let Sx = 0
  let Sy = 0
  let Sxx = 0
  let Syy = 0
  let Sxy = 0
  let Sxxx = 0
  let Syyy = 0
  let Sxyy = 0
  let Sxxy = 0
  const n = pts.length
  for (const p of pts) {
    const { x, y } = p
    Sx += x
    Sy += y
    Sxx += x * x
    Syy += y * y
    Sxy += x * y
    Sxxx += x * x * x
    Syyy += y * y * y
    Sxyy += x * y * y
    Sxxy += x * x * y
  }
  const C = n * Sxx - Sx * Sx
  const D = n * Sxy - Sx * Sy
  const E = n * Sxxx + n * Sxyy - (Sxx + Syy) * Sx
  const G = n * Syy - Sy * Sy
  const H = n * Sxxy + n * Syyy - (Sxx + Syy) * Sy
  const a = (E * G - H * D) / (C * G - D * D)
  const b = (C * H - D * E) / (C * G - D * D)
  const cx = a / 2
  const cy = b / 2
  let r = 0
  for (const p of pts) r += Math.hypot(p.x - cx, p.y - cy)
  return { cx, cy, r: r / n }
}

function movingAverage(arr: number[], w: number): number[] {
  const out: number[] = []
  for (let i = 0; i < arr.length; i++) {
    let s = 0
    let n = 0
    for (let j = -w; j <= w; j++) {
      const k = i + j
      if (k < 0 || k >= arr.length) continue
      s += arr[k]
      n++
    }
    out.push(s / n)
  }
  return out
}

function std(a: number[]): number {
  const m = a.reduce((x, y) => x + y, 0) / a.length
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length)
}

/**
 * 旋转面（粪梨的外壁 / 腔壁）的表面起伏，按**弧长**分成三个频带。
 *
 * 做法：逐环把顶点投到 XZ 平面做圆拟合，得到该环的偏差序列（圆拟合顺带吃掉
 * 「这一圈整体粗一点」与「圆心偏一点」，剩下的才是真正的起伏）；
 * 再按 0.6 厘米与 2.0 厘米两个窗口做滑动平均，拆成
 * 细（< 0.6cm）/ 中（0.6~2cm）/ 粗（> 2cm）三段。
 *
 * **为什么非要分频带**：粗糙度是个标量，一颗磨砂球的粗糙度也可以很大。
 * 「压实的粗糙团块」与「磨砂球」的区别只在**尺度差** —— 三个尺度上都得有能量。
 * 单一频率的噪声无论振幅调多大，都会让另外两个频带塌到近零。
 */
function surfaceBands(
  model: InsectModel,
  name: string,
): { fine: number; mid: number; coarse: number; maxdev: number; rings: number } {
  const rings = new Map<number, { x: number; z: number; u: number }[]>()
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || m.name !== name) return
    const pos = m.geometry.getAttribute('position')
    const uv = m.geometry.getAttribute('uv')
    for (let i = 0; i < pos.count; i++) {
      const key = Math.round(uv.getY(i) * 1e6)
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      const e = rings.get(key) ?? []
      e.push({ x: v.x, z: v.z, u: uv.getX(i) })
      rings.set(key, e)
    }
  })

  let fine = 0
  let mid = 0
  let coarse = 0
  let maxdev = 0
  let n = 0
  for (const [, pts] of [...rings.entries()].sort((a, b) => a[0] - b[0])) {
    if (pts.length < 30) continue
    const fit = circleFit(pts.map((p) => ({ x: p.x, y: p.z })))
    // 半径太小的环（两极附近）采样间距趋于零，量出来的是采样噪声不是表面
    if (!Number.isFinite(fit.r) || fit.r < 0.08) continue
    const sorted = pts.slice().sort((a, b) => a.u - b.u)
    const dev = sorted.map((p) => Math.hypot(p.x - fit.cx, p.z - fit.cy) - fit.r)
    const span = Math.abs(sorted[sorted.length - 1].u - sorted[0].u)
    const perSample = (fit.r * Math.PI * 2 * span) / dev.length
    const w1 = Math.max(1, Math.round(0.6 / perSample / 2))
    const w2 = Math.max(w1 + 1, Math.round(2.0 / perSample / 2))
    const s1 = movingAverage(dev, w1)
    const s2 = movingAverage(dev, w2)
    fine += std(dev.map((v, i) => v - s1[i]))
    mid += std(s1.map((v, i) => v - s2[i]))
    coarse += std(s2)
    maxdev = Math.max(maxdev, ...dev.map(Math.abs))
    n++
  }
  expect(n, `${name} 上一圈可用的环都没有，测量本身失效了`).toBeGreaterThan(8)
  return { fine: fine / n, mid: mid / n, coarse: coarse / n, maxdev, rings: n }
}

/**
 * 一个网格的三角面重心。
 *
 * ⚠️ 判断「这一侧有没有壁」必须看**面**不能看顶点：粪梨的外壳与腔壁都是
 * 整圈生成顶点、只在豁口处**不生成面**（这样省掉边界上的 T 型接缝）。
 * 按顶点数去判，豁口那一侧照样有一半顶点，断言等于没写。
 */
function faceCentroids(model: InsectModel, name: string): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (const mesh of meshesNamed(model, name)) {
    const pos = mesh.geometry.getAttribute('position')
    const idx = mesh.geometry.getIndex()
    if (!idx) continue
    for (let i = 0; i < idx.count; i += 3) {
      const c = new THREE.Vector3()
      for (let k = 0; k < 3; k++) {
        c.add(new THREE.Vector3().fromBufferAttribute(pos, idx.getX(i + k)))
      }
      out.push(c.divideScalar(3).applyMatrix4(mesh.matrixWorld))
    }
  }
  return out
}

/**
 * 腔（旋转面）的包络：轴心 + 每个高度上的半径。
 *
 * ⚠️ 不能拿腔的**包围盒**当「腔的范围」：腔壁是缺了一段方位角的旋转面，
 * 它的包围盒在剖口那一侧被切平，拿它去判「虫有没有戳出腔」会把腔里
 * 靠近剖口的一整块都判成「戳出去了」（实测 1612 个顶点的假阳性）。
 * 这里逐环做圆拟合拿到真正的轴与半径，再按高度线性插值。
 */
function chamberEnvelope(model: InsectModel): { cx: number; cz: number; at: (y: number) => number | null } {
  const rings = new Map<number, { x: number; z: number; y: number }[]>()
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || m.name !== 'pear-chamber') return
    const pos = m.geometry.getAttribute('position')
    const uv = m.geometry.getAttribute('uv')
    for (let i = 0; i < pos.count; i++) {
      const key = Math.round(uv.getY(i) * 1e6)
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      const e = rings.get(key) ?? []
      e.push({ x: v.x, z: v.z, y: v.y })
      rings.set(key, e)
    }
  })
  const profile: { y: number; r: number }[] = []
  let cx = 0
  let cz = 0
  let n = 0
  for (const [, pts] of [...rings.entries()].sort((a, b) => a[0] - b[0])) {
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length
    if (pts.length < 8) {
      profile.push({ y, r: 0 })
      continue
    }
    const fit = circleFit(pts.map((p) => ({ x: p.x, y: p.z })))
    if (!Number.isFinite(fit.r)) continue
    profile.push({ y, r: fit.r })
    if (fit.r > 0.2) {
      cx += fit.cx
      cz += fit.cy
      n++
    }
  }
  cx /= Math.max(n, 1)
  cz /= Math.max(n, 1)
  profile.sort((a, b) => a.y - b.y)
  return {
    cx,
    cz,
    at(y: number) {
      if (y < profile[0].y || y > profile[profile.length - 1].y) return null
      for (let i = 1; i < profile.length; i++) {
        if (y <= profile[i].y) {
          const k = (y - profile[i - 1].y) / Math.max(profile[i].y - profile[i - 1].y, 1e-9)
          return THREE.MathUtils.lerp(profile[i - 1].r, profile[i].r, k)
        }
      }
      return profile[profile.length - 1].r
    },
  }
}

/** 某几个部件有多少顶点戳出了腔 */
function outsideChamber(model: InsectModel, pad: number, ...names: string[]): number {
  const env = chamberEnvelope(model)
  let bad = 0
  for (const p of verticesOf(model, ...names)) {
    const r = env.at(p.y)
    if (r === null) {
      bad++
      continue
    }
    if (Math.hypot(p.x - env.cx, p.z - env.cz) > r + pad) bad++
  }
  return bad
}

/** 顶点色的起伏幅度：没有 color 属性或整片同色时为 0 */
function vertexColorSpread(model: InsectModel, name: string): number {
  const mesh = meshesNamed(model, name)[0]
  const col = mesh?.geometry.getAttribute('color')
  if (!col) return 0
  const values: number[] = []
  for (let i = 0; i < col.count; i++) values.push(col.getY(i))
  return std(values)
}

/** 两组顶点在某机位的成像平面上，最近的两点隔多远 */
function minProjectedGap(a: THREE.Vector3[], b: THREE.Vector3[], dir: THREE.Vector3): number {
  const e1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
  const e2 = new THREE.Vector3().crossVectors(dir, e1).normalize()
  const pa = a.map((v) => [v.dot(e1), v.dot(e2)] as const)
  const pb = b.map((v) => [v.dot(e1), v.dot(e2)] as const)
  let best = Infinity
  for (const [x0, y0] of pa) {
    for (const [x1, y1] of pb) best = Math.min(best, Math.hypot(x0 - x1, y0 - y1))
  }
  return best
}

// ================================================================ 共同契约

const STAGES: [string, () => InsectModel][] = [
  ['卵', buildDungBeetleEgg],
  ['幼虫', buildDungBeetleLarva],
  ['蛹', buildDungBeetlePupa],
]

describe('三个阶段的共同契约', () => {
  it.each(STAGES)('%s 能构建、无 NaN、面数在预算内', (label, build) => {
    const model = build()
    expect(hasNonFinite(model), `${label} 顶点里有 NaN/Inf`).toBe(false)
    expect(model.radius).toBeGreaterThan(0)
    expect(Number.isFinite(model.radius)).toBe(true)
    expect(triangleCount(model), `${label} 面数超预算`).toBeLessThan(TRIANGLE_BUDGET)
  })

  it('注册成一条完全变态路线：卵 → 幼虫 → 蛹 →（成虫走 registry）', () => {
    expect(metamorphosisOf('dung-beetle')).toBe(HOLOMETABOLOUS)
    expect(builtStagesOf('dung-beetle')).toEqual(['egg', 'larva', 'pupa'])
  })

  it('确定性：连造两次，顶点逐个相同', () => {
    // 表面起伏是种子化噪声。一旦哪天顺手换成 Math.random()，
    // 目视验收过的那张图就跟用户看到的不是同一枚梨了，而别的断言一条都不会红。
    for (const [label, build] of STAGES) {
      const a = allVertices(build())
      const b = allVertices(build())
      expect(a.length, `${label} 两次构建的顶点数不同`).toBe(b.length)
      let worst = 0
      for (let i = 0; i < a.length; i++) worst = Math.max(worst, a[i].distanceTo(b[i]))
      expect(worst, `${label} 两次构建的顶点对不上（差 ${worst}），随机数没有固定种子`).toBe(0)
    }
  })
})

// ================================================================ 育儿粪梨

describe('育儿粪梨（三个阶段共用的语境）', () => {
  it.each(STAGES)('%s 都带着粪梨：外壳 + 剖面', (label, build) => {
    void label
    const model = build()
    expect(meshesNamed(model, 'pear-shell').length, `${label} 没有粪梨外壳`).toBeGreaterThan(0)
    expect(meshesNamed(model, 'pear-cut').length, `${label} 没有剖面`).toBeGreaterThan(0)
    expect(meshesNamed(model, 'pear-chamber').length, `${label} 没有腔壁`).toBeGreaterThan(0)
  })

  it.each(STAGES)('%s 的粪梨表面有尺度差，不是一颗磨砂球', (label, build) => {
    const b = surfaceBands(build(), 'pear-shell')
    /*
     * 三个频带都要有能量。实测（三件相近）：细 0.014~0.019、中 0.021~0.029、
     * 粗 0.024~0.026，总起伏峰值 0.23~0.26。阈值取实测的一半上下 ——
     * 把三层噪声换成任意**单一**频率，另外两个频带会掉一个数量级，这条当场红。
     */
    expect(b.fine, `${label} 细尺度（<0.6cm 的纤维颗粒）几乎没有：${b.fine.toFixed(4)}`).toBeGreaterThan(0.006)
    expect(b.mid, `${label} 中尺度（0.6~2cm 的团块）几乎没有：${b.mid.toFixed(4)}`).toBeGreaterThan(0.01)
    expect(b.coarse, `${label} 粗尺度（>2cm 的压痕与起伏）几乎没有：${b.coarse.toFixed(4)}`).toBeGreaterThan(0.01)
    expect(b.maxdev, `${label} 表面最大起伏只有 ${b.maxdev.toFixed(3)}，读成磨砂球`).toBeGreaterThan(0.12)

    /*
     * 三个频带的**能量要相当**，不能有哪一带独大。
     *
     * ⚠️ 这条是变异测试逼出来的：只卡三个下限抓不住「一层噪声调大振幅」——
     * 值噪声不是纯正弦，一层 0.25 振幅的噪声在三个频带里都有读数
     * （实测 0.017 / 0.040 / 0.034，三个下限全过）。它与三层叠加的区别在
     * **谱形**：单层是尖的（中带独大，max/min = 2.3），三层是平的
     * （实测 1.55~1.78）。人眼看到的也正是这个 —— 磨砂球只有一种颗粒，
     * 压实的粪团是大坑套着团块、团块上再浮着纤维粒。
     */
    const flat = Math.max(b.fine, b.mid, b.coarse) / Math.min(b.fine, b.mid, b.coarse)
    expect(flat, `${label} 三个频带里有一带独大（max/min = ${flat.toFixed(2)}），谱形是单层噪声的样子`).toBeLessThan(
      2.2,
    )
  })

  it.each(STAGES)('%s 的粪梨有色调不匀（顶点色），不是一片平涂的褐', (label, build) => {
    // 独角仙那颗卵的土室栽在「一圈同色的小球」上。一整片同色的暖褐是同一个病。
    const model = build()
    const spread = vertexColorSpread(model, 'pear-shell')
    expect(spread, `${label} 外壳的 color 属性没有或整片同色（起伏 ${spread.toFixed(4)}）`).toBeGreaterThan(0.04)
    /*
     * 光有 color 属性不算数：材质那边不开 `vertexColors`，这一整套斑驳
     * 一个像素都不会画出来，而几何侧的断言照样是绿的（变异测试当场抓到）。
     * 两条要一起断言 —— 顶点色是「几何 + 材质」两处合起来才成立的东西。
     */
    for (const name of ['pear-shell', 'pear-chamber', 'pear-cut']) {
      expect(materialOf(model, name).vertexColors, `${label} 的 ${name} 材质没开 vertexColors`).toBe(true)
    }
  })

  it.each(STAGES)('%s 的粪色是灰味的黄褐：不是巧克力，也不是近黑', (label, build) => {
    void label
    const model = build()
    const shell = hslOf(materialOf(model, 'pear-shell'))
    expect(shell.l, `外壁明度 ${shell.l.toFixed(2)} 压得太深，读成黑巧克力`).toBeGreaterThan(0.26)
    expect(shell.l, `外壁明度 ${shell.l.toFixed(2)} 太亮，读成沙子`).toBeLessThan(0.5)
    expect(shell.s, `外壁饱和度 ${shell.s.toFixed(2)} 太高，橙味一重就读成巧克力`).toBeLessThan(0.3)
    const deg = shell.h * 360
    expect(deg, `外壁色相 ${deg.toFixed(0)}° 偏红，粪是黄灰不是红棕`).toBeGreaterThan(28)
    expect(deg, `外壁色相 ${deg.toFixed(0)}° 偏绿`).toBeLessThan(60)
    // 粪是最不反光的东西之一：清漆必须为零，否则整枚梨会泛出塑料光
    expect(materialOf(model, 'pear-shell').clearcoat, '粪梨上了清漆').toBe(0)
  })

  it('腔壁的粗糙度按阶段递变：孵化室最光滑 < 蛹室 < 正在被啃的幼虫腔', () => {
    /*
     * 这是三件之间唯一按阶段变化的量，也是「幼虫把自己的家吃出来、再糊好」
     * 这条叙事的全部依据：
     *   卵期  母虫抹平抛光的孵化室
     *   幼虫期 正在被啃的腔（最粗）
     *   蛹期  末龄幼虫用粪便糊平的蛹室
     * 三件都刷成一样的话这条会红。
     */
    const total = (b: { fine: number; mid: number; coarse: number }) => b.fine + b.mid + b.coarse
    const egg = buildDungBeetleEgg()
    const larva = buildDungBeetleLarva()
    const pupa = buildDungBeetlePupa()
    const eggRatio = total(surfaceBands(egg, 'pear-chamber')) / total(surfaceBands(egg, 'pear-shell'))
    const larvaRatio = total(surfaceBands(larva, 'pear-chamber')) / total(surfaceBands(larva, 'pear-shell'))
    const pupaRatio = total(surfaceBands(pupa, 'pear-chamber')) / total(surfaceBands(pupa, 'pear-shell'))

    expect(eggRatio, `孵化室内壁（${eggRatio.toFixed(3)} 倍外壁）不比外壁光滑，母虫白抹了`).toBeLessThan(0.15)
    expect(larvaRatio, `幼虫腔（${larvaRatio.toFixed(3)}）不够粗糙，看不出正在被啃`).toBeGreaterThan(0.32)
    expect(pupaRatio, `蛹室（${pupaRatio.toFixed(3)}）没被糊平`).toBeLessThan(larvaRatio * 0.6)
    expect(pupaRatio, `蛹室（${pupaRatio.toFixed(3)}）光得像塑料碗，粪糊的面不会这么平`).toBeGreaterThan(0.02)
  })

  it('蛹室比幼虫腔大：那一圈粪被幼虫吃掉了', () => {
    const size = (m: InsectModel) => boxOf(m, 'pear-chamber').getSize(new THREE.Vector3())
    const larva = size(buildDungBeetleLarva())
    const pupa = size(buildDungBeetlePupa())
    expect(pupa.y, `蛹室高 ${pupa.y.toFixed(2)} 不比幼虫腔的 ${larva.y.toFixed(2)} 大`).toBeGreaterThan(larva.y)
  })
})

// ================================================================ 卵

describe('卵', () => {
  const model = buildDungBeetleEgg()
  const eggBox = boxOf(model, 'egg-shell')
  const size = eggBox.getSize(new THREE.Vector3())

  it('长约 4 毫米，上下限一起卡', () => {
    // 上限同样重要：「阶段模型不许为了好看放大」是 stages.ts 写死的约定，
    // 而这一件正是最容易被放大的那个（卵在整枚梨里只占画面的 7%）。
    const long = Math.max(size.x, size.y, size.z)
    const short = Math.min(size.x, size.y, size.z)
    expect(long, `卵长 ${long.toFixed(3)} 不在 0.3~0.5 之间`).toBeGreaterThan(0.3)
    expect(long, `卵长 ${long.toFixed(3)} 不在 0.3~0.5 之间`).toBeLessThan(0.5)
    expect(short, `卵宽 ${short.toFixed(3)} 不在 0.15~0.32 之间`).toBeGreaterThan(0.15)
    expect(short, `卵宽 ${short.toFixed(3)} 不在 0.15~0.32 之间`).toBeLessThan(0.32)
    // 椭球不是球：卵形的长短轴差是「这是个卵」的最低要求
    expect(long / short, `轴比 ${(long / short).toFixed(2)}，太圆读成珍珠`).toBeGreaterThan(1.4)
    expect(long / short, `轴比 ${(long / short).toFixed(2)}，太长读成米粒`).toBeLessThan(2.4)
  })

  it('卵躺在梨窄端的孵化室里 —— 不在梨心，也不在梨外', () => {
    const pear = boxOf(model, 'pear-shell')
    const chamber = boxOf(model, 'pear-chamber')
    const eggCenter = eggBox.getCenter(new THREE.Vector3())

    // ① 高度：卵心必须落在梨的上四分之一（窄端），落在梨心就是另一回事了
    const h = (eggCenter.y - pear.min.y) / (pear.max.y - pear.min.y)
    expect(h, `卵心在梨高的 ${(h * 100).toFixed(0)}% 处，不在窄端`).toBeGreaterThan(0.78)
    expect(h, `卵心在梨高的 ${(h * 100).toFixed(0)}% 处，已经戳出颈尖了`).toBeLessThan(0.98)

    // ② 卵的每一个顶点都必须在孵化室的范围里（留 0.03 的余量给壁的起伏）
    const pad = 0.03
    for (const p of verticesOf(model, 'egg-shell')) {
      expect(
        p.x >= chamber.min.x - pad && p.x <= chamber.max.x + pad,
        `卵有顶点戳出孵化室（x=${p.x.toFixed(2)}，室 ${chamber.min.x.toFixed(2)}~${chamber.max.x.toFixed(2)}）`,
      ).toBe(true)
      expect(p.y >= chamber.min.y - pad && p.y <= chamber.max.y + pad, '卵有顶点戳出孵化室（y）').toBe(true)
      expect(p.z >= chamber.min.z - pad && p.z <= chamber.max.z + pad, '卵有顶点戳出孵化室（z）').toBe(true)
    }

    // ③ 室要真的比卵大一圈，卵不能把室撑满（撑满就看不出「室」了）
    const cs = chamber.getSize(new THREE.Vector3())
    expect(cs.y / size.y, '孵化室没比卵高多少，看不出是个室').toBeGreaterThan(1.3)
  })

  it('孵化室是敞开的：卵在默认机位与侧机位下都露得出来', () => {
    /*
     * 这条对着一个真出过的问题：第一版让室壁整圈都生成，豁口只揭开了外壳，
     * 露出来的是**室壁的外表面** —— 出图上一团比周围更暗的蛋形东西，
     * 看着像「卵在阴影里」，于是差点去改灯光和卵的材质。
     * 判据：室壁在朝向观众那一侧必须没有面，也就是室壁顶点在 +Z 半边显著更少。
     */
    const faces = faceCentroids(model, 'pear-chamber')
    const front = faces.filter((p) => p.z > 0.02).length
    const back = faces.filter((p) => p.z < -0.02).length
    expect(back, '孵化室背面没有壁').toBeGreaterThan(20)
    expect(front, `室壁在朝观众那一侧还剩 ${front} 个面，卵被自己的室挡着`).toBe(0)
  })

  it('乳白不压深，且与室壁拉得开', () => {
    // 「颜色要压深一档」被误解成「越深越保险」，第 5 轮 10 只里 7 只因此返工。
    // 乳白的东西反过来最危险：压深就是脏灰。
    const egg = hslOf(materialOf(model, 'egg-shell')).l
    const chamber = hslOf(materialOf(model, 'pear-chamber')).l
    expect(egg, `卵壳明度 ${egg.toFixed(3)} 太暗，乳白被压成了脏灰`).toBeGreaterThan(0.78)
    expect(chamber, `室壁明度 ${chamber.toFixed(3)} 太亮，衬不出卵`).toBeLessThan(0.4)
    expect(egg - chamber, '卵与室壁的明暗拉不开').toBeGreaterThan(0.35)
  })

  it('卵壳不上清漆：白铬防线', () => {
    // elytra() 那档（clearcoat 0.55 / metal 0.25）套在这个亮度的基色上必过曝，
    // 七星瓢虫与甘薯腊龟甲都栽过。
    const mat = materialOf(model, 'egg-shell')
    expect(mat.clearcoat, '卵壳挂了清漆，乳白会整片过曝成白铬').toBeLessThanOrEqual(0.12)
    expect(mat.metalness).toBeLessThanOrEqual(0.05)
    // transmission 会在 loft 的放样接缝上折射出一道亮线，读成「卵壳裂了」
    expect(mat.transmission, '卵壳开了半透，接缝会读成一道裂纹').toBe(0)
  })
})

// ================================================================ 幼虫

describe('幼虫（蛴螬）', () => {
  const model = buildDungBeetleLarva()
  const trunk = meshesNamed(model, 'larva-body')[0]
  const line = centerline(trunk)
  const arc = arcLength(line)
  const radii = ringRadii(trunk, line)
  const maxR = Math.max(...radii)

  /** 独角仙那条蛴螬 —— 「看得出区别吗」这件事只能对着它量 */
  const rhino = buildRhinocerosBeetleLarva()
  const rhinoTrunk = meshesNamed(rhino, 'larva-body')[0]
  const rhinoLine = centerline(rhinoTrunk)
  const rhinoArc = arcLength(rhinoLine)
  const rhinoRadii = ringRadii(rhinoTrunk, rhinoLine)

  it('体长 4~5 厘米，且明显比独角仙那条短', () => {
    const head = boxOf(model, 'larva-head')
    const total = arc + head.getSize(new THREE.Vector3()).length() * 0.35
    expect(arc, `躯干弧长 ${arc.toFixed(2)} 不在 3.8~4.8 之间`).toBeGreaterThan(3.8)
    expect(arc, `躯干弧长 ${arc.toFixed(2)} 不在 3.8~4.8 之间`).toBeLessThan(4.8)
    expect(total, `连头全长 ${total.toFixed(2)} 超出 4~5 的量级`).toBeLessThan(5.2)
    expect(arc / rhinoArc, `只有独角仙那条的 ${(arc / rhinoArc).toFixed(2)} 倍，量级差没做出来`).toBeLessThan(0.7)
  })

  it('C 形蜷曲：首尾端点的直线距离远小于沿体轴的弧长，而且比独角仙那条卷得紧', () => {
    const chord = line[0].distanceTo(line[line.length - 1])
    const ratio = chord / arc
    expect(ratio, `端点距离 / 弧长 = ${ratio.toFixed(3)}，身子基本是直的`).toBeLessThan(0.25)
    const rhinoRatio = rhinoLine[0].distanceTo(rhinoLine[rhinoLine.length - 1]) / rhinoArc
    expect(ratio, `卷得不比独角仙那条紧（${ratio.toFixed(3)} vs ${rhinoRatio.toFixed(3)}）`).toBeLessThan(
      rhinoRatio * 0.9,
    )
  })

  it('C 形蜷曲：侧视剪影中间真的有个洞，而且有缺口', () => {
    /*
     * 只查端点距离是不够的 —— 一根对折的香肠同样满足；而卷过了头（缺口被头壳
     * 填掉）就成了甜甜圈，「C 形」这个招牌反而没了（第一版取 330° 实撞，71/72）。
     * 这里量的是**人看见的那张图**：把幼虫的全部顶点投到 XY（C 所在的矢状面，
     * 也是默认机位与侧机位看过去的那个面）栅格化，
     *   ① 占用格的质心必须落在空格上（中间是洞）
     *   ② 从质心射出的 72 条射线大部分命中实体（洞被围住 = 不是香蕉）
     *   ③ 但要有几条射不中（有缺口 = 是 C 不是 O）
     */
    const larvaPts: THREE.Vector3[] = []
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || !m.name.startsWith('larva')) return
      const pos = m.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        larvaPts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
      }
    })
    expect(larvaPts.length, '一个幼虫顶点都没取到，这条断言等于没测').toBeGreaterThan(1000)
    const N = 96
    const min = new THREE.Vector3(Infinity, Infinity, 0)
    const max = new THREE.Vector3(-Infinity, -Infinity, 0)
    for (const p of larvaPts) {
      min.x = Math.min(min.x, p.x)
      min.y = Math.min(min.y, p.y)
      max.x = Math.max(max.x, p.x)
      max.y = Math.max(max.y, p.y)
    }
    const grid = new Uint8Array(N * N)
    for (const p of larvaPts) {
      const i = Math.min(N - 1, Math.floor(((p.x - min.x) / (max.x - min.x)) * N))
      const j = Math.min(N - 1, Math.floor(((p.y - min.y) / (max.y - min.y)) * N))
      grid[j * N + i] = 1
    }
    let sx = 0
    let sy = 0
    let n = 0
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++)
        if (grid[j * N + i]) {
          sx += i
          sy += j
          n++
        }
    const ci = Math.round(sx / n)
    const cj = Math.round(sy / n)
    expect(grid[cj * N + ci], 'C 的中心不是空的 —— 剪影读成了一坨实心的东西').toBe(0)

    let hit = 0
    for (let d = 0; d < 72; d++) {
      const a = (d / 72) * Math.PI * 2
      for (let r = 1; r < N; r++) {
        const i = Math.round(ci + Math.cos(a) * r)
        const j = Math.round(cj + Math.sin(a) * r)
        if (i < 0 || j < 0 || i >= N || j >= N) break
        if (grid[j * N + i]) {
          hit++
          break
        }
      }
    }
    expect(hit, `只有 ${hit}/72 个方向被身体围住，蜷得不够 —— 读成香蕉不是 C`).toBeGreaterThanOrEqual(56)
    expect(hit, `${hit}/72 个方向全被围住，缺口被头填掉了 —— 那是甜甜圈不是 C`).toBeLessThanOrEqual(70)
  })

  it('背中前部有一个明显的驼峰（把它压平这条就红）', () => {
    /*
     * 驼峰是本种与独角仙那条蛴螬最直观的差别，也是最容易被「反正都是白胖虫」
     * 糊弄过去的一处。量法：
     *   ① 用**后半段**的中心线拟合一个圆（那一段没有驼峰，是干净的 C 弧）；
     *   ② 对该圆心量出整条中心线的向径 A(t)；
     *   ③ 在后段 [0.55, 0.95] 上对 A 拟合一条直线（螺旋量让向径缓慢变化，
     *      这条直线就是「没有驼峰时它该在哪」），外推到驼峰所在的前段；
     *   ④ 前段 [0.15, 0.50] 的最大残差就是驼峰把中心线顶出去的净量。
     * 实测 0.114（体半径 0.62 的六分之一，背面净凸出是它的两倍），
     * 而后段自身的残差只有 0.004 —— 差 25 倍，阈值取 0.05 有足够余量。
     * 把 HUMP_RISE 调成 0 时残差降到 0.008，这条当场红。
     */
    const post = line.filter((_, i) => i / (line.length - 1) >= 0.5).map((p) => ({ x: p.x, y: p.y }))
    const fit = circleFit(post)
    const A = line.map((p) => Math.hypot(p.x - fit.cx, p.y - fit.cy))
    let n = 0
    let st = 0
    let sa = 0
    let stt = 0
    let sta = 0
    for (let i = 0; i < A.length; i++) {
      const t = i / (A.length - 1)
      if (t < 0.55 || t > 0.95) continue
      n++
      st += t
      sa += A[i]
      stt += t * t
      sta += t * A[i]
    }
    const slope = (n * sta - st * sa) / (n * stt - st * st)
    const inter = (sa - slope * st) / n
    let peak = -Infinity
    let peakT = 0
    for (let i = 0; i < A.length; i++) {
      const t = i / (A.length - 1)
      if (t < 0.15 || t > 0.5) continue
      const res = A[i] - (slope * t + inter)
      if (res > peak) {
        peak = res
        peakT = t
      }
    }
    let elsewhere = 0
    for (let i = 0; i < A.length; i++) {
      const t = i / (A.length - 1)
      if (t < 0.55 || t > 0.95) continue
      elsewhere = Math.max(elsewhere, Math.abs(A[i] - (slope * t + inter)))
    }

    expect(peak, `驼峰的净凸出只有 ${peak.toFixed(3)}，背是平的`).toBeGreaterThan(0.05)
    expect(peak, `驼峰凸出 ${peak.toFixed(3)}，成了一个瘤`).toBeLessThan(0.32)
    expect(peakT, `驼峰在 t=${peakT.toFixed(2)}，不在背中前部`).toBeGreaterThan(0.16)
    expect(peakT, `驼峰在 t=${peakT.toFixed(2)}，不在背中前部`).toBeLessThan(0.5)
    expect(elsewhere, '后半段的背也在起伏，说明量到的不是驼峰而是整体的不圆').toBeLessThan(peak * 0.4)

    // 驼峰必须只鼓**背面**：腹面（C 的内侧）不许跟着凹进去或鼓出来
    const ventral = line.map((p, i) => Math.hypot(p.x - fit.cx, p.y - fit.cy) - radii[i])
    const front = ventral.filter((_, i) => {
      const t = i / (ventral.length - 1)
      return t > 0.2 && t < 0.45
    })
    const back = ventral.filter((_, i) => {
      const t = i / (ventral.length - 1)
      return t > 0.6 && t < 0.85
    })
    const dv = Math.abs(front.reduce((a, b) => a + b, 0) / front.length - back.reduce((a, b) => a + b, 0) / back.length)
    expect(dv, `腹面在驼峰处也动了 ${dv.toFixed(3)} —— 那是整段身体被抬起来，不是驼峰`).toBeLessThan(peak * 0.8)
  })

  it('比独角仙那条短粗：最粗半径 / 弧长明显更大', () => {
    const stout = maxR / arc
    const rhinoStout = Math.max(...rhinoRadii) / rhinoArc
    expect(stout, `粗细比 ${stout.toFixed(3)} 不够粗壮`).toBeGreaterThan(0.12)
    expect(stout, `粗细比 ${stout.toFixed(3)} 粗过头，读成一个球`).toBeLessThan(0.2)
    expect(stout / rhinoStout, `只比独角仙那条粗 ${(stout / rhinoStout).toFixed(2)} 倍，看不出区别`).toBeGreaterThan(1.2)
  })

  it('头壳相对更小：头宽 / 体最粗处明显小于独角仙那条', () => {
    const headW = boxOf(model, 'larva-head').getSize(new THREE.Vector3()).z
    const rhinoHeadW = boxOf(rhino, 'larva-head').getSize(new THREE.Vector3()).z
    const ratio = headW / (maxR * 2)
    const rhinoRatio = rhinoHeadW / (Math.max(...rhinoRadii) * 2)
    expect(ratio, `头宽是体最粗处的 ${ratio.toFixed(2)} 倍，头太大`).toBeLessThan(0.55)
    expect(ratio, `头宽只有体最粗处的 ${ratio.toFixed(2)} 倍，头小得不像虫`).toBeGreaterThan(0.2)
    expect(ratio, `头身比 ${ratio.toFixed(2)} 与独角仙那条的 ${rhinoRatio.toFixed(2)} 分不出来`).toBeLessThan(
      rhinoRatio * 0.92,
    )
  })

  it('体色偏灰白淡黄，与独角仙那条的纯乳白分得开', () => {
    const mine = hslOf(materialOf(model, 'larva-body'))
    const theirs = hslOf(materialOf(rhino, 'larva-body'))
    expect(mine.l, `体壁明度 ${mine.l.toFixed(3)} 被压成了脏灰`).toBeGreaterThan(0.72)
    expect(mine.l, `体壁明度 ${mine.l.toFixed(3)} 顶到画面最亮端，会过曝`).toBeLessThan(0.86)
    expect(mine.s, `体壁饱和度 ${mine.s.toFixed(3)} 太高，不是灰白`).toBeLessThan(0.36)
    expect(theirs.s - mine.s, `与独角仙那条的饱和度差只有 ${(theirs.s - mine.s).toFixed(3)}，肉眼分不出`).toBeGreaterThan(
      0.12,
    )
  })

  it('体壁绝不是鞘翅材质：白铬防线', () => {
    // elytra() 是 gloss 0.74 + clearcoat 0.55，套在乳白/灰白上必过曝成白铬
    const mat = materialOf(model, 'larva-body')
    expect(mat.clearcoat, '体壁上了清漆').toBeLessThanOrEqual(0.12)
    expect(mat.metalness, '体壁有金属感').toBeLessThanOrEqual(0.05)
    expect(mat.roughness, '体壁太光滑，软体读成了硬壳').toBeGreaterThan(0.6)
  })

  it('只有 3 对胸足，全长在紧靠头部的三节上；腹部一根附肢都没有', () => {
    // 蛴螬与鳞翅目毛虫的分界线就在这条：画上腹足就是另一个目的虫。
    const legs: THREE.Object3D[] = []
    model.group.traverse((o) => {
      if (o.name === 'larva-leg') legs.push(o)
    })
    expect(legs.length, '胸足不是 6 条').toBe(6)
    for (const leg of legs) {
      const t = paramAt(line, leg.getWorldPosition(new THREE.Vector3()))
      expect(t, `有一条足长在 t=${t.toFixed(2)} 处 —— 那已经是腹部了`).toBeLessThan(0.28)
    }
    /*
     * 爪不能用 `paramAt` 判「长在第几节」：它量的是「离哪一环最近」，而这条虫
     * 卷得很紧，伸向 C 内侧的足尖到**对面那段体壁**同样很近（实测把爪判到
     * t=0.36）。改成问一件真正想问的事：**每个爪离胸段都比离腹段近**。
     * 腹部真长出足来的话，它的爪离腹段更近，这条当场红。
     */
    const nearest = (p: THREE.Vector3, from: number, to: number) => {
      let best = Infinity
      for (let i = 0; i < line.length; i++) {
        const t = i / (line.length - 1)
        if (t < from || t > to) continue
        best = Math.min(best, line[i].distanceTo(p))
      }
      return best
    }
    for (const p of verticesOf(model, 'larva-claw')) {
      const thorax = nearest(p, 0, 0.28)
      const abdomen = nearest(p, 0.4, 1)
      expect(thorax, `有一枚爪离腹段（${abdomen.toFixed(2)}）比离胸段（${thorax.toFixed(2)}）还近`).toBeLessThan(abdomen)
    }
  })

  it('中段最粗、尾端圆钝、节间只是浅褶（不是松果）', () => {
    const at = radii.indexOf(maxR) / (radii.length - 1)
    expect(at, `最粗处在 t=${at.toFixed(2)}，不在中前段`).toBeGreaterThan(0.25)
    expect(at, `最粗处在 t=${at.toFixed(2)}，不在中前段`).toBeLessThan(0.6)
    expect(maxR / radii[0], '中段没有明显比头端粗，读成一根均匀的腊肠').toBeGreaterThan(1.8)

    const nearTip = radii[radii.length - 4]
    expect(nearTip / maxR, `尾端在收口前已经细到 ${(nearTip / maxR).toFixed(2)} 倍，读成尖锥`).toBeGreaterThan(0.33)

    /*
     * 松果线量的是**节间起伏的峰谷差**，不是相邻两环的跌落。
     * ⚠️ 后者是个陷阱：沟再深，只要采样密（这里每节 8 个截面），
     * 相邻两环之间也只掉一小步 —— 把 GROOVE 从 0.05 挖到 0.22（明摆着的松果）
     * 逐环跌落也才 10%，「< 15%」照样绿（变异测试当场抓到）。
     * 改成先用一节长度的滑动平均去掉包络，再看残差的峰谷差。
     */
    const trend = movingAverage(radii, 4)
    // 只在 t ∈ [0.45, 0.88] 上量：前段有驼峰、尾端在收口，两处的包络变化都比
    // 一节还慢不了多少，滑动平均去不干净，会混进「起伏」里
    const ripple = radii
      .map((r, i) => r / trend[i] - 1)
      .slice(Math.round(radii.length * 0.45), Math.round(radii.length * 0.88))
    const p2p = Math.max(...ripple) - Math.min(...ripple)
    expect(p2p, `节间起伏的峰谷差只有 ${(p2p * 100).toFixed(1)}%，分节看不出来`).toBeGreaterThan(0.03)
    expect(p2p, `节间起伏的峰谷差 ${(p2p * 100).toFixed(0)}%，鳞片感 —— 会读成松果`).toBeLessThan(0.15)
  })

  it('腹端数节偏深偏灰：明度低一档，且只覆盖末段数节', () => {
    const body = hslOf(materialOf(model, 'larva-body'))
    const tail = hslOf(materialOf(model, 'larva-abdomen-dark'))
    expect(body.l - tail.l, '腹端与体壁的深浅差看不出来').toBeGreaterThan(0.18)
    expect(tail.l, '腹端压得太黑，读成一块焦炭').toBeGreaterThan(0.3)
    const share = arcLength(centerline(meshesNamed(model, 'larva-abdomen-dark')[0])) / arc
    expect(share, `深色段占了 ${(share * 100).toFixed(0)}% 的体长`).toBeGreaterThan(0.12)
    expect(share, `深色段占了 ${(share * 100).toFixed(0)}% 的体长`).toBeLessThan(0.35)
  })

  it('一对深色大颚：顶视投影下两支不重叠', () => {
    const mand = meshesNamed(model, 'larva-mandible')
    expect(mand.length, '大颚不是一对').toBe(2)
    expect(hslOf(mand[0].material as THREE.MeshPhysicalMaterial).l, '大颚不够深').toBeLessThan(0.28)
    const pts = verticesOf(model, 'larva-mandible')
    const r = pts.filter((p) => p.z > 0)
    const l = pts.filter((p) => p.z < 0)
    expect(r.length + l.length, '有顶点跨过了中线 —— 两支已经贴在一起').toBe(pts.length)
    /*
     * 量的是**画面上两团之间的最小间距**，不是三维距离 ——
     * 黑翅土白蚁兵蚁那一轮：两颚在世界坐标里分得很开，视线方向恰好把分离压扁，
     * 屏幕上糊成一根。
     */
    const gap = minProjectedGap(l, r, VIEWS.top)
    expect(gap, `顶视投影里两支大颚只隔了 ${gap.toFixed(3)}，糊成了一支`).toBeGreaterThan(0.05)
  })

  it('虫真的在梨腔里：没有一处戳出腔壁', () => {
    const outside = outsideChamber(model, 0.05, 'larva-body', 'larva-abdomen-dark', 'larva-head')
    expect(outside, `${outside} 个顶点戳出了梨腔`).toBe(0)
  })
})

// ================================================================ 蛹

describe('蛹', () => {
  const model = buildDungBeetlePupa()
  const pose = model.group.getObjectByName('pupa-pose')!
  /** 还原姿态那两层旋转，回到体坐标（+X = 头、+Y = 背、+Z = 右） */
  const unpose = (v: THREE.Vector3) => pose.worldToLocal(v.clone())

  function bodyBox(...names: string[]): THREE.Box3 {
    const box = new THREE.Box3()
    for (const p of verticesOf(model, ...names)) box.expandByPoint(unpose(p))
    return box
  }

  const bodyParts = ['pupa-abdomen', 'pupa-thorax', 'pupa-head', 'pupa-shovel', 'pupa-shovel-tooth'] as const

  it('体长约 3 厘米，且比末龄幼虫短得多', () => {
    const len = bodyBox(...bodyParts).getSize(new THREE.Vector3()).x
    expect(len, `全长 ${len.toFixed(2)} 不在 2.4~3.4 之间`).toBeGreaterThan(2.4)
    expect(len, `全长 ${len.toFixed(2)} 不在 2.4~3.4 之间`).toBeLessThan(3.4)
    const larva = buildDungBeetleLarva()
    const larvaArc = arcLength(centerline(meshesNamed(larva, 'larva-body')[0]))
    expect(len, '蛹居然不比末龄幼虫短').toBeLessThan(larvaArc)
  })

  it('头端有一片铲的雏形：比头宽、探出头的轮廓，而且厚钝不成刃', () => {
    const shovel = bodyBox('pupa-shovel')
    const head = bodyBox('pupa-head')
    expect(shovel.isEmpty(), '没有铲').toBe(false)

    const shovelW = shovel.getSize(new THREE.Vector3()).z
    const headW = head.getSize(new THREE.Vector3()).z
    expect(shovelW / headW, `铲宽只有头宽的 ${(shovelW / headW).toFixed(2)} 倍，读成「头前面鼓了一块」`).toBeGreaterThan(
      1.25,
    )
    expect(shovelW / headW, `铲宽是头宽的 ${(shovelW / headW).toFixed(2)} 倍，夸张到不像蛹`).toBeLessThan(2.2)

    // 探出头的轮廓：结构靠形来读（轮廓转折 + 边下的阴影缝），不靠颜色
    expect(shovel.max.x - head.max.x, '铲没有探出头的前缘，看不出是一片铲').toBeGreaterThan(0.12)

    /*
     * 厚 / 半宽 = 0.43，成虫那片铲是 0.21。
     * 下限防的是「照成虫比例做成薄刃」——那样这个阶段就没有教育价值了
     * （独角仙蛹第一版把角照成虫比例做，出图读成虾钳）；
     * 上限防的是「鼓成一个球」。
     */
    const thick = shovel.getSize(new THREE.Vector3()).y
    const ratio = thick / (shovelW / 2)
    expect(ratio, `铲厚 / 半宽 = ${ratio.toFixed(2)}，薄得像成虫的刃，不是雏形`).toBeGreaterThan(0.25)
    expect(ratio, `铲厚 / 半宽 = ${ratio.toFixed(2)}，厚成了一个球`).toBeLessThan(0.65)

    // 铲在头端（不是长在肚子上）
    const body = bodyBox(...bodyParts)
    const front = body.min.x + (body.max.x - body.min.x) * 0.6
    expect(shovel.getCenter(new THREE.Vector3()).x, '铲没长在头端').toBeGreaterThan(front)
  })

  it('铲缘五枚齿只是圆钝的鼓包，不是成虫那样的尖齿', () => {
    const teeth = meshesNamed(model, 'pupa-shovel-tooth')
    expect(teeth.length, '铲缘齿不是五枚').toBe(5)
    for (const t of teeth) {
      const b = new THREE.Box3()
      const pos = t.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        b.expandByPoint(unpose(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(t.matrixWorld)))
      }
      const s = b.getSize(new THREE.Vector3())
      const longest = Math.max(s.x, s.y, s.z)
      const shortest = Math.min(s.x, s.y, s.z)
      expect(longest / shortest, `齿的长短轴比 ${(longest / shortest).toFixed(2)}，做成尖刺了`).toBeLessThan(3)
      expect(longest, `齿长 ${longest.toFixed(2)}，比铲本身还显眼`).toBeLessThan(0.3)
    }
  })

  it('前足的开掘齿已成形，而且真的凸出足芽的表面', () => {
    /*
     * 深色贴浅色是斑纹，不是结构（黑蚱蝉的翅芽栽的就是这条）。
     * 所以量的是**净凸出量**：齿尖离体轴的距离必须明显超过足芽表面。
     * 第一版让齿纯沿体表切向长，齿尖只比足芽多出 0.02、还有一半埋进躯干，
     * 出图上只是「芽缘颜色深了一道」。
     */
    const radial = (names: string[]) => {
      let best = 0
      for (const p of verticesOf(model, ...names)) {
        const b = unpose(p)
        best = Math.max(best, Math.hypot(b.y, b.z))
      }
      return best
    }
    const teeth = meshesNamed(model, 'pupa-foreleg-tooth')
    expect(teeth.length, '前足开掘齿不是每侧四枚').toBe(8)
    const out = radial(['pupa-foreleg-tooth']) - radial(['pupa-foreleg-pad'])
    expect(out, `齿只比足芽表面凸出 ${out.toFixed(3)}，读成一道深色的边而不是齿`).toBeGreaterThan(0.03)
  })

  it('翅芽与足芽都在，而且贴在腹面', () => {
    /*
     * 「都在」这一条不是废话：第一版让每片芽各自指定贴在哪一段体节上，
     * 芽只要跨过段界，半径查询就返回 null，整片芽被 `if (pad)` 静默丢掉 ——
     * 出图上翅芽、前足芽、中后足芽一片都没有，而 typecheck、面数、包围盒全绿。
     */
    const wing = meshesNamed(model, 'pupa-wing-pad')
    const foreleg = meshesNamed(model, 'pupa-foreleg-pad')
    const legs = meshesNamed(model, 'pupa-leg-pad')
    expect(wing.length, '翅芽不是一对').toBe(2)
    expect(foreleg.length, '前足芽不是一对').toBe(2)
    expect(legs.length, '中后足芽不是两对').toBe(4)
    for (const m of [...wing, ...legs]) {
      const c = bodyBox(m.name === 'pupa-wing-pad' ? 'pupa-wing-pad' : 'pupa-leg-pad').getCenter(new THREE.Vector3())
      expect(c.y, `${m.name} 跑到背面去了`).toBeLessThan(0)
    }
  })

  it('前胸背板是全身最宽的一块盾', () => {
    // 第一版背板只是个小圆疙瘩、腹部占了七成，整只蛹读成一只虾
    const zSpan = (name: string) => bodyBox(name).getSize(new THREE.Vector3()).z
    expect(zSpan('pupa-thorax') / zSpan('pupa-abdomen'), '背板没比腹部宽，剪影会读成虾').toBeGreaterThan(1.15)
  })

  it('腹部分节可见：节间膜环成排排在体轴上', () => {
    const rings = meshesNamed(model, 'membrane-ring')
    expect(rings.length, '节间膜环少于 4 圈，分节读不出来').toBeGreaterThanOrEqual(4)
    const xs = rings.map((m) => {
      const b = new THREE.Box3()
      const pos = m.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        b.expandByPoint(unpose(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)))
      }
      return b.getCenter(new THREE.Vector3()).x
    })
    expect(Math.max(...xs) - Math.min(...xs), '膜环挤在一处，没有沿体轴排开').toBeGreaterThan(0.8)
  })

  it('褐色裸蛹，且不是鞘翅材质', () => {
    const mat = materialOf(model, 'pupa-abdomen')
    const { h, l } = hslOf(mat)
    const deg = h * 360
    expect(deg, `色相 ${deg.toFixed(0)}° 不在橙褐区间`).toBeGreaterThan(15)
    expect(deg, `色相 ${deg.toFixed(0)}° 不在橙褐区间`).toBeLessThan(45)
    expect(l, `明度 ${l.toFixed(2)} 压成了闷褐`).toBeGreaterThan(0.38)
    expect(l, `明度 ${l.toFixed(2)} 太亮，蛹壳读成塑料`).toBeLessThan(0.62)
    expect(mat.clearcoat, '蛹壳上了鞘翅那档清漆，隆起的体积感会被高光吃掉').toBeLessThanOrEqual(0.2)
    expect(mat.metalness).toBeLessThanOrEqual(0.05)
  })

  it('蛹真的在蛹室里：没有一处戳出室壁', () => {
    const outside = outsideChamber(model, 0.05, ...bodyParts, 'pupa-wing-pad', 'pupa-foreleg-pad', 'pupa-leg-pad')
    expect(outside, `${outside} 个顶点戳出了蛹室`).toBe(0)
  })

  it('三个阶段与成虫是同一只虫的四张脸：成虫那把铲在蛹上已经能认出来', () => {
    // 成虫的唇基铲宽 / 头宽 ≈ 1.37；蛹上那片雏形必须落在同一个量级，
    // 否则「能看出它要变成谁」这句话就没有依据。
    const adult = buildDungBeetle()
    const adultClypeus = boxOf(adult, 'clypeus').getSize(new THREE.Vector3()).z
    const adultHead = boxOf(adult, 'head').getSize(new THREE.Vector3()).z
    const adultRatio = adultClypeus / adultHead
    const pupaRatio = bodyBox('pupa-shovel').getSize(new THREE.Vector3()).z / bodyBox('pupa-head').getSize(new THREE.Vector3()).z
    expect(adultRatio, '成虫的铲宽 / 头宽读数异常，比较失去意义').toBeGreaterThan(1.1)
    expect(Math.abs(pupaRatio - adultRatio), `蛹的铲宽比 ${pupaRatio.toFixed(2)} 与成虫的 ${adultRatio.toFixed(2)} 差太远`).toBeLessThan(0.6)
  })
})
