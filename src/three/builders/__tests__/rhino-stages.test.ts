/**
 * 双叉犀金龟三个生活史阶段（卵 / 幼虫 / 蛹）的形态断言。
 *
 * ## 这份测试为什么这么写
 *
 * 项目的老教训：**断言量的是数字，人看的是长相，两者可以毫无关系**。
 * 兰花螳螂的「宽 ≥ 厚 3.5 倍」测出 5.75 是绿的，渲染出来却是几片侧立的薄板；
 * 白蚁兵蚁的两颚在世界坐标里分得很开，默认机位的视线方向恰好把分离压扁，
 * 屏幕上糊成一根独角。所以这里尽量量**用户真正看见的那个量**：
 *
 * - C 形不靠「端点距离小」一条断言（一根对折的香肠也满足），而是把整只虫
 *   投影到 XY 平面栅格化，断言**质心落在空格上**、且从质心射出的射线大部分
 *   命中实体、同时有一段命中不了 —— 有洞 + 有缺口，那才是 C 不是 O 也不是香肠。
 * - 蛹的两支角不比三维距离，而是投到**五个真实机位**（默认 + 顶/侧/前斜/后斜）
 *   的成像平面上分箱比较，每个同时含有两者的箱都必须不相交。
 * - 幼虫的大颚同理，量顶视投影的包围盒。
 *
 * 派数字时下限与上限一起给（天蛾的喙只给下限，长成了标枪）。
 *
 * ## 自检
 *
 * 每条断言都对着一个**真出过的**问题：体壁误用 elytra() 会过曝成白铬、
 * 乳白压深会成脏灰、腹端收成尖锥 + 节间沟太深会读成松果、蛹角照成虫比例做
 * 会读成虾钳、腹足画上去就变成毛虫。把代码改回那些版本，对应的断言会红。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildRhinocerosBeetle } from '../rhinoceros-beetle'
import { buildRhinocerosBeetleEgg } from '../stages/rhinoceros-beetle-egg'
import { buildRhinocerosBeetleLarva } from '../stages/rhinoceros-beetle-larva'
import { buildRhinocerosBeetlePupa } from '../stages/rhinoceros-beetle-pupa'
import type { InsectModel } from '../kit'
import { HOLOMETABOLOUS, builtStagesOf, metamorphosisOf } from '../../stages'

/** 三个阶段都远低于这个预算；上限只防「某次改动让面数失控」 */
const TRIANGLE_BUDGET = 60_000

/** 验收机位（与 scripts/new-species-shots.mjs 一致）+ 展台默认机位 */
const VIEWS: Record<string, THREE.Vector3> = {
  home: new THREE.Vector3(0.86, 0.44, 1.25).normalize(), // InsectCanvas 的默认位
  top: new THREE.Vector3(0.18, 1, 0.14).normalize(),
  side: new THREE.Vector3(0.12, 0.28, 1).normalize(),
  front: new THREE.Vector3(1, 0.32, 0.4).normalize(),
  rear: new THREE.Vector3(-0.85, 0.42, -0.7).normalize(),
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

/** 某几个部件的世界坐标顶点 */
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
  for (const m of meshesNamed(model, ...names)) box.union(new THREE.Box3().setFromObject(m))
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
 * 材质基色的 HSL —— 明度是「看得出深浅差」的那个量。
 *
 * ⚠️ 必须显式传 `SRGBColorSpace`：three 从 r152 起做颜色管理，
 * `new THREE.Color('#c2762f')` 存的是**线性**值，`getHSL()` 缺省也按线性算，
 * 读出来的明度比源码里写的那个十六进制暗一大截（#c2762f 线性 0.28 / sRGB 0.47）。
 * 拿线性值去对「够不够亮」的阈值，等于用另一把尺子量。
 */
function hslOf(mat: THREE.MeshPhysicalMaterial): { h: number; s: number; l: number } {
  const out = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(out, THREE.SRGBColorSpace)
  return out
}

/**
 * 把 loft() 产物按 uv 的 v 分环、取每环重心，反推出中心线。
 *
 * 这是从**几何本身**量出来的，不是 builder 自报的数字：loft 的每一环
 * 都是绕中心点均匀分布的椭圆采样，`Σcos = Σsin = 0`，所以环重心恰好落在
 * 中心线上。u=1 那一列与 u=0 重合（接缝），要剔掉，否则重心会往那个方位偏。
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

/**
 * 把两组顶点投到某个机位的成像平面上，按横轴分箱比较纵向区间。
 *
 * 白蚁兵蚁那一轮换来的写法：三维距离说「分得很开」，屏幕上却糊成一坨 ——
 * 因为视线方向恰好压掉了分离的那个轴。这里只问一件事：
 * **在这个机位的画面上，两者有没有重叠。**
 */
function projectedOverlap(
  a: THREE.Vector3[],
  b: THREE.Vector3[],
  dir: THREE.Vector3,
  bins = 24,
): { shared: number; disjoint: number; minGap: number } {
  const e1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
  const e2 = new THREE.Vector3().crossVectors(dir, e1).normalize()
  const pa = a.map((v) => [v.dot(e1), v.dot(e2)] as const)
  const pb = b.map((v) => [v.dot(e1), v.dot(e2)] as const)
  const lo = Math.min(...pa.map((p) => p[0]), ...pb.map((p) => p[0]))
  const hi = Math.max(...pa.map((p) => p[0]), ...pb.map((p) => p[0]))
  let shared = 0
  let disjoint = 0
  let minGap = Infinity
  for (let k = 0; k < bins; k++) {
    const x0 = lo + ((hi - lo) * k) / bins
    const x1 = lo + ((hi - lo) * (k + 1)) / bins
    const ia = pa.filter((p) => p[0] >= x0 && p[0] < x1).map((p) => p[1])
    const ib = pb.filter((p) => p[0] >= x0 && p[0] < x1).map((p) => p[1])
    if (!ia.length || !ib.length) continue
    shared++
    const gap = Math.max(Math.min(...ia) - Math.max(...ib), Math.min(...ib) - Math.max(...ia))
    if (gap > 0) disjoint++
    minGap = Math.min(minGap, gap)
  }
  return { shared, disjoint, minGap }
}

/**
 * 两组顶点在某机位的画面上是否**分得开** —— 存在一条分离轴。
 *
 * 与 projectedOverlap 的分工：那个用于「一前一后、沿横轴排开」的两件东西
 * （蛹的两支角），这个用于「共用一个根、往两边岔」的两件东西（分叉的两枝）
 * —— 后者在根部必然重叠，只能问「岔出去的那一段分不分得开」，
 * 而且分离方向可能落在画面的任一条轴上，所以两条轴都试。
 *
 * 上面的 minProjectedGap 则回答「画面上两团之间隔了多远」：分箱法在两者
 * **完全不共用横轴区间**时会退化成 0 === 0 的空断言（大颚并拢那一版
 * 就是这么漏过去的），量最小间距不会有这个盲区。
 */
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

function separatedInImage(a: THREE.Vector3[], b: THREE.Vector3[], dir: THREE.Vector3): boolean {
  const e1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
  const e2 = new THREE.Vector3().crossVectors(dir, e1).normalize()
  for (const axis of [e1, e2]) {
    const pa = a.map((v) => v.dot(axis))
    const pb = b.map((v) => v.dot(axis))
    if (Math.min(...pa) > Math.max(...pb) || Math.min(...pb) > Math.max(...pa)) return true
  }
  return false
}

// ---------------------------------------------------------------- 共同契约

const STAGES: [string, () => InsectModel][] = [
  ['卵', buildRhinocerosBeetleEgg],
  ['幼虫', buildRhinocerosBeetleLarva],
  ['蛹', buildRhinocerosBeetlePupa],
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
    expect(metamorphosisOf('rhinoceros-beetle')).toBe(HOLOMETABOLOUS)
    expect(builtStagesOf('rhinoceros-beetle')).toEqual(['egg', 'larva', 'pupa'])
  })
})

// ---------------------------------------------------------------- 卵

describe('卵', () => {
  const model = buildRhinocerosBeetleEgg()
  const shell = boxOf(model, 'egg-shell')
  const size = shell.getSize(new THREE.Vector3())

  it('直径 3~4 毫米量级，上下限一起卡', () => {
    // 真实卵 3mm 产下、孵化前吸水胀到 4mm。上限同样重要：
    // 「阶段模型不许为了好看放大」是 stages.ts 写死的约定。
    for (const [axis, v] of [
      ['长', size.x],
      ['高', size.y],
      ['宽', size.z],
    ] as const) {
      expect(v, `卵的${axis}径 ${v.toFixed(3)} 不在 0.25~0.42 之间`).toBeGreaterThan(0.25)
      expect(v, `卵的${axis}径 ${v.toFixed(3)} 不在 0.25~0.42 之间`).toBeLessThan(0.42)
    }
  })

  it('近球形而不是纺锤：最长轴 / 最短轴 ≤ 1.3', () => {
    const ratio = Math.max(size.x, size.y, size.z) / Math.min(size.x, size.y, size.z)
    expect(ratio, `轴比 ${ratio.toFixed(2)} 太大，读成了纺锤/柠檬`).toBeLessThan(1.3)
  })

  it('乳白不压深：卵壳明度 ≥ 0.78，土粒 ≤ 0.35，两者拉得开', () => {
    // 「颜色要压深一档」被误解成「越深越保险」，第 5 轮 10 只里 7 只因此返工。
    // 乳白的东西反过来最危险：压深就是脏灰。
    const egg = hslOf(materialOf(model, 'egg-shell')).l
    const soil = hslOf(materialOf(model, 'soil-grain')).l
    expect(egg, `卵壳明度 ${egg.toFixed(3)} 太暗，乳白被压成了脏灰`).toBeGreaterThan(0.78)
    expect(soil, `土粒明度 ${soil.toFixed(3)} 太亮，衬不出卵`).toBeLessThan(0.35)
    expect(egg - soil).toBeGreaterThan(0.4)
  })

  it('卵壳不上清漆：白铬防线', () => {
    // elytra() 那档（clearcoat 0.55 / metal 0.25）套在这个亮度的基色上必过曝，
    // 七星瓢虫与甘薯腊龟甲都栽过。
    const mat = materialOf(model, 'egg-shell')
    expect(mat.clearcoat, '卵壳挂了清漆，乳白会整片过曝成白铬').toBeLessThanOrEqual(0.12)
    expect(mat.metalness).toBeLessThanOrEqual(0.05)
  })

  it('没有被土埋掉：卵体至少三成顶点高于最高的一粒土', () => {
    const grainTop = boxOf(model, 'soil-grain').max.y
    const pts = verticesOf(model, 'egg-shell')
    const above = pts.filter((p) => p.y > grainTop).length / pts.length
    expect(above, `只有 ${(above * 100).toFixed(0)}% 的卵面露在土上，埋过头就成了一堆土`).toBeGreaterThan(0.3)
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫（蛴螬）', () => {
  const model = buildRhinocerosBeetleLarva()
  const trunk = meshesNamed(model, 'larva-body')[0]
  const line = centerline(trunk)
  const arc = arcLength(line)
  const radii = ringRadii(trunk, line)

  it('末龄体长 8~10 厘米，而且比成虫还长', () => {
    expect(arc, `躯干弧长 ${arc.toFixed(2)} 不在 8~10 之间`).toBeGreaterThan(8)
    expect(arc, `躯干弧长 ${arc.toFixed(2)} 不在 8~10 之间`).toBeLessThan(10)

    // 「幼虫比成虫大」是这条生活史要讲的内容本身，不是修辞
    const adult = buildRhinocerosBeetle()
    const adultLen = new THREE.Box3().setFromObject(adult.group).getSize(new THREE.Vector3()).x
    expect(arc / adultLen, `幼虫伸直只有成虫全长的 ${(arc / adultLen).toFixed(2)} 倍`).toBeGreaterThan(1.1)
  })

  it('C 形蜷曲：首尾端点的直线距离远小于沿体轴的弧长', () => {
    const chord = line[0].distanceTo(line[line.length - 1])
    expect(chord / arc, `端点距离 / 弧长 = ${(chord / arc).toFixed(3)}，身子基本是直的`).toBeLessThan(0.35)
  })

  it('C 形蜷曲：侧视剪影中间真的有个洞，而且有缺口', () => {
    /*
     * 只查端点距离是不够的 —— 一根对折的香肠同样满足。
     * 这里量的是**人看见的那张图**：把全部顶点投到 XY（C 所在的矢状面，
     * 也是默认机位与侧机位看过去的那个面）栅格化，
     *   ① 占用格的质心必须落在空格上（中间是洞）
     *   ② 从质心射出的 72 条射线大部分命中实体（洞被围住 = 不是香蕉）
     *   ③ 但要有几条射不中（有缺口 = 是 C 不是 O）
     */
    const pts = allVertices(model)
    const N = 96
    const min = new THREE.Vector3(Infinity, Infinity, 0)
    const max = new THREE.Vector3(-Infinity, -Infinity, 0)
    for (const p of pts) {
      min.x = Math.min(min.x, p.x)
      min.y = Math.min(min.y, p.y)
      max.x = Math.max(max.x, p.x)
      max.y = Math.max(max.y, p.y)
    }
    const grid = new Uint8Array(N * N)
    for (const p of pts) {
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
    expect(hit, `只有 ${hit}/72 个方向被身体围住，蜷得不够 —— 读成香蕉不是 C`).toBeGreaterThanOrEqual(55)
    expect(hit, `72 个方向全被围住，首尾接上了 —— 那是 O 不是 C`).toBeLessThanOrEqual(70)
  })

  it('中段最粗、尾端圆钝、节间只是浅褶（不是松果）', () => {
    const maxR = Math.max(...radii)
    const at = radii.indexOf(maxR) / (radii.length - 1)
    expect(at, `最粗处在 t=${at.toFixed(2)}，不在中前段`).toBeGreaterThan(0.3)
    expect(at, `最粗处在 t=${at.toFixed(2)}，不在中前段`).toBeLessThan(0.6)
    expect(maxR / radii[0], '中段没有明显比头端粗，读成一根均匀的腊肠').toBeGreaterThan(1.8)

    // 尾端圆钝：倒数第 4 环（球冠收口之前）仍有相当粗细，不是收成针尖的锥
    const nearTip = radii[radii.length - 4]
    expect(nearTip / maxR, `尾端在收口前已经细到 ${(nearTip / maxR).toFixed(2)} 倍，读成尖锥`).toBeGreaterThan(0.35)

    // 松果线：相邻环之间的半径跌落不许超过 15%（球冠收口那几环除外）
    let drop = 0
    for (let i = 1; i < radii.length - 3; i++) drop = Math.max(drop, (radii[i - 1] - radii[i]) / radii[i - 1])
    expect(drop, `节间沟一口气掉了 ${(drop * 100).toFixed(0)}%，鳞片感 —— 会读成松果`).toBeLessThan(0.15)
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
    // 附肢（含爪）的每一个顶点都必须落在前 32% 的体轴范围内
    for (const p of verticesOf(model, 'larva-claw')) {
      expect(paramAt(line, p), '爪出现在腹部区段').toBeLessThan(0.32)
    }
  })

  it('头壳明显更硬更深：与体壁的明度差 ≥ 0.35', () => {
    const head = hslOf(materialOf(model, 'larva-head'))
    const body = hslOf(materialOf(model, 'larva-body'))
    expect(body.l, `体壁明度 ${body.l.toFixed(3)} 被压成了脏灰`).toBeGreaterThan(0.78)
    expect(head.l, `头壳明度 ${head.l.toFixed(3)} 太亮，看不出是骨化的壳`).toBeLessThan(0.45)
    expect(body.l - head.l, '头壳与体壁的明度拉不开').toBeGreaterThan(0.35)
    // 头壳要有清漆高光、体壁不许有 —— 「硬 vs 软」的另一半表达
    expect(materialOf(model, 'larva-head').clearcoat).toBeGreaterThan(0.3)
  })

  it('体壁绝不是鞘翅材质：白铬防线', () => {
    // elytra() 是 gloss 0.74 + clearcoat 0.55，套在乳白上必过曝成白铬
    const mat = materialOf(model, 'larva-body')
    expect(mat.clearcoat, '体壁上了清漆').toBeLessThanOrEqual(0.12)
    expect(mat.metalness, '体壁有金属感').toBeLessThanOrEqual(0.05)
    expect(mat.roughness, '体壁太光滑，软体读成了硬壳').toBeGreaterThan(0.6)
  })

  it('腹端数节偏深偏灰：明度低一档，且只覆盖末段数节', () => {
    const body = hslOf(materialOf(model, 'larva-body'))
    const tail = hslOf(materialOf(model, 'larva-abdomen-dark'))
    expect(body.l - tail.l, '腹端与体壁的深浅差看不出来').toBeGreaterThan(0.18)
    expect(tail.l, '腹端压得太黑，读成一块焦炭').toBeGreaterThan(0.3)

    // 覆盖范围：末段 15%~35% 的弧长 —— 少了看不出，多了就成了「半截黑虫」
    const share = arcLength(centerline(meshesNamed(model, 'larva-abdomen-dark')[0])) / arc
    expect(share, `深色段占了 ${(share * 100).toFixed(0)}% 的体长`).toBeGreaterThan(0.15)
    expect(share, `深色段占了 ${(share * 100).toFixed(0)}% 的体长`).toBeLessThan(0.35)
  })

  it('体侧一排气门：每侧 ≥ 8 枚，且真的长在体侧', () => {
    const spiracles = meshesNamed(model, 'larva-spiracle')
    const right = spiracles.filter((m) => m.getWorldPosition(new THREE.Vector3()).z > 0)
    const left = spiracles.filter((m) => m.getWorldPosition(new THREE.Vector3()).z < 0)
    expect(right.length).toBeGreaterThanOrEqual(8)
    expect(left.length).toBeGreaterThanOrEqual(8)
    // 侧向偏移够大才叫「体侧」；贴在背中线上的一排会读成花纹
    for (const s of spiracles) {
      expect(Math.abs(s.getWorldPosition(new THREE.Vector3()).z)).toBeGreaterThan(0.2)
    }
    expect(hslOf(materialOf(model, 'larva-spiracle')).l, '气门不够深，看不见').toBeLessThan(0.35)
  })

  it('一对深色大颚：顶视投影下两支不重叠', () => {
    const mand = meshesNamed(model, 'larva-mandible')
    expect(mand.length, '大颚不是一对').toBe(2)
    expect(hslOf(mand[0].material as THREE.MeshPhysicalMaterial).l, '大颚不够深').toBeLessThan(0.28)

    const pts = verticesOf(model, 'larva-mandible')
    const r = pts.filter((p) => p.z > 0)
    const l = pts.filter((p) => p.z < 0)
    expect(r.length, '两支大颚没有各自待在中线一侧').toBeGreaterThan(0)
    expect(l.length, '两支大颚没有各自待在中线一侧').toBeGreaterThan(0)
    expect(r.length + l.length, '有顶点跨过了中线 —— 两支已经贴在一起').toBe(pts.length)

    /*
     * 顶视是最能看清「两支」的机位。量的是**画面上两团之间的最小间距**，
     * 不是三维距离，也不是分箱重叠数 ——
     * ⚠️ 分箱法在这里有盲区：两支大颚在顶视里沿画面横轴完全错开，
     * 于是「同时含有两者的箱」为 0，`disjoint === shared` 退化成 0 === 0，
     * 把两颚并拢到中线的改动照样是绿的（变异测试当场抓到）。
     * 最小间距没有这个盲区：并拢就直接掉到 0。
     */
    const gap = minProjectedGap(l, r, VIEWS.top)
    expect(gap, `顶视投影里两支大颚只隔了 ${gap.toFixed(3)}，糊成了一支`).toBeGreaterThan(0.08)
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹', () => {
  const model = buildRhinocerosBeetlePupa()
  const bodyParts = ['pupa-abdomen', 'pupa-abdomen-tip', 'pupa-thorax', 'pupa-head'] as const
  const body = boxOf(model, ...bodyParts)
  const whole = new THREE.Box3().setFromObject(model.group)

  /** 还原「略仰卧」那一层旋转，回到体坐标（+Y = 背、−Y = 腹） */
  const pose = model.group.getObjectByName('pupa-pose')!
  const unpose = (v: THREE.Vector3) => pose.worldToLocal(v.clone())

  it('体长约 5 厘米，且比末龄幼虫短', () => {
    const len = whole.getSize(new THREE.Vector3()).x
    expect(len, `全长 ${len.toFixed(2)} 不在 4.2~6.2 之间`).toBeGreaterThan(4.2)
    expect(len, `全长 ${len.toFixed(2)} 不在 4.2~6.2 之间`).toBeLessThan(6.2)

    const larva = buildRhinocerosBeetleLarva()
    const larvaArc = arcLength(centerline(meshesNamed(larva, 'larva-body')[0]))
    expect(len, '蛹居然不比末龄幼虫短').toBeLessThan(larvaArc)
  })

  it('两支角的雏形确实存在，而且都长在头端', () => {
    const headHorn = boxOf(model, 'pupa-head-horn', 'pupa-head-horn-prong')
    const thoraxHorn = boxOf(model, 'pupa-thorax-horn')
    expect(headHorn.isEmpty(), '没有头角').toBe(false)
    expect(thoraxHorn.isEmpty(), '没有胸角').toBe(false)

    // 「在头端」= 中心落在躯干 x 范围的前 40%
    const front = body.min.x + (body.max.x - body.min.x) * 0.6
    expect(headHorn.getCenter(new THREE.Vector3()).x, '头角没长在头端').toBeGreaterThan(front)
    expect(thoraxHorn.getCenter(new THREE.Vector3()).x, '胸角没长在头端').toBeGreaterThan(front)
  })

  it('五个机位下两支角都看得出是两支（按成像平面的投影判，不按三维距离）', () => {
    /*
     * 黑翅土白蚁兵蚁那一轮的教训：两颚在世界坐标里分得很开，
     * 默认机位的视线方向恰好把分离压扁，屏幕上糊成一根独角。
     * 这条断言问的是「画面上有没有重叠」，不是「空间里离多远」。
     */
    const a = verticesOf(model, 'pupa-head-horn', 'pupa-head-horn-prong')
    const b = verticesOf(model, 'pupa-thorax-horn')
    for (const [name, dir] of Object.entries(VIEWS)) {
      const o = projectedOverlap(a, b, dir)
      expect(o.shared, `${name} 机位下两支角的投影压根不共用横轴区间，这条断言等于没测`).toBeGreaterThanOrEqual(4)
      expect(o.disjoint, `${name} 机位下两支角的投影有 ${o.shared - o.disjoint} 段重叠 —— 糊成了一支`).toBe(o.shared)
    }
  })

  it('角是「还没长开的鞘」，不是小一号的成虫角', () => {
    // 成虫的头角是长 2.25 / 基部半径 0.30，粗细比 0.13。
    // 蛹角必须明显更粗短，否则这个阶段就没有教育价值了。
    const shaft = meshesNamed(model, 'pupa-head-horn')[0]
    const line = centerline(shaft)
    const len = arcLength(line)
    const baseR = ringRadii(shaft, line)[0]
    expect(len, `头角弧长 ${len.toFixed(2)} 不在 0.8~1.6 之间`).toBeGreaterThan(0.8)
    expect(len, `头角弧长 ${len.toFixed(2)} 不在 0.8~1.6 之间`).toBeLessThan(1.6)
    expect(baseR / len, `粗细比 ${(baseR / len).toFixed(3)} 已经细到成虫那一档`).toBeGreaterThan(0.16)
  })

  it('头角末端已经分叉（本种得名「双叉」之处）', () => {
    const prongs = meshesNamed(model, 'pupa-head-horn-prong')
    expect(prongs.length, '分叉不是两枝').toBe(2)
    /*
     * 量两枝**末梢**的间距，不是两个包围盒中心的间距：两枝共用一个岔点，
     * 包围盒中心几乎重合在岔点附近，量出来只有真实开叉量的三分之一 ——
     * 那个数字和「看得出分叉吗」这件事已经不是一回事了。
     */
    const shaft = meshesNamed(model, 'pupa-head-horn')[0]
    const shaftLine = centerline(shaft)
    const forkFrom = shaftLine[shaftLine.length - 1]
    const [p0, p1] = prongs.map((m) => {
      const pos = m.geometry.getAttribute('position')
      let best = new THREE.Vector3()
      let bd = -1
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
        const d = v.distanceTo(forkFrom)
        if (d > bd) {
          bd = d
          best = v
        }
      }
      return best
    })
    const gap = p0.distanceTo(p1)
    expect(gap, `两枝间距 ${gap.toFixed(2)} 太小，看不出分叉`).toBeGreaterThan(0.15)
    expect(gap, `两枝间距 ${gap.toFixed(2)} 太大，成了两支独立的角`).toBeLessThan(0.8)
    /*
     * 再问一次「画面上看得出吗」：取两枝**岔出去的后半段**（根部共用一个
     * 岔点，那一段必然重叠，不该拿来判），在顶视与前斜视的成像平面上必须
     * 存在一条分离轴。三维距离够大但屏幕上糊成一根，正是白蚁兵蚁踩过的坑。
     */
    const outer = (sign: 1 | -1) =>
      prongs
        .flatMap((m) => {
          const pos = m.geometry.getAttribute('position')
          const out: THREE.Vector3[] = []
          for (let i = 0; i < pos.count; i++) {
            const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
            if (v.distanceTo(forkFrom) > gap * 0.5) out.push(v)
          }
          return out
        })
        .filter((v) => Math.sign(unpose(v).z) === sign)
    for (const view of ['top', 'front'] as const) {
      expect(separatedInImage(outer(1), outer(-1), VIEWS[view]), `${view} 机位下两枝糊成一枝`).toBe(true)
    }
  })

  it('腹部分节可见：节间膜环成排排在体轴上', () => {
    const rings = meshesNamed(model, 'membrane-ring')
    expect(rings.length, '节间膜环少于 4 圈，分节读不出来').toBeGreaterThanOrEqual(4)
    const xs = rings.map((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).x)
    expect(Math.max(...xs) - Math.min(...xs), '膜环挤在一处，没有沿体轴排开').toBeGreaterThan(1.2)
  })

  it('翅芽与足芽贴在腹面', () => {
    const wing = meshesNamed(model, 'pupa-wing-pad')
    const leg = meshesNamed(model, 'pupa-leg-pad')
    expect(wing.length, '翅芽不是一对').toBe(2)
    expect(leg.length, '足芽不是三对').toBe(6)
    // 回到体坐标判「腹面」—— 直接看世界 y 会被「略仰卧」那层滚转带偏
    for (const m of [...wing, ...leg]) {
      const c = unpose(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))
      expect(c.y, `${m.name} 跑到背面去了`).toBeLessThan(0)
    }
  })

  it('前胸背板是全身最宽的一块盾', () => {
    // 第一版背板只是个小圆疙瘩、腹部占了七成，整只蛹读成一只虾
    const zSpan = (name: string) => {
      const pts = verticesOf(model, name).map((v) => unpose(v).z)
      return Math.max(...pts) - Math.min(...pts)
    }
    expect(zSpan('pupa-thorax') / zSpan('pupa-abdomen'), '背板没比腹部宽，剪影会读成虾').toBeGreaterThan(1.15)
  })

  it('褐色至橙褐，且不是鞘翅材质', () => {
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
})
