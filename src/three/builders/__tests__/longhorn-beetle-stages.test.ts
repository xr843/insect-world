/**
 * 星天牛三个生活史阶段（卵 / 幼虫 / 蛹）的形态断言。
 *
 * ## 写每一条之前先问一句：把实现改坏，这条会不会红？
 *
 * 项目反复栽的那个跟头是：**断言量的是数字，人看的是长相，两者可以毫无关系**。
 * 双叉犀金龟那支头角的 `g.add()` 被注释掉时，3034 条测试全绿。所以这里尽量量
 * **用户真正看见的那个量**：
 *
 * - 「幼虫是直的不是 C 形」不靠端点距离（一根对折的香肠也满足），而是从放样
 *   几何里反推中心线，量弧长与弦长之比、量离弦的最大偏移。
 * - 「两枚上颚分得开」不比三维距离，而是投到五个真实机位的成像平面上量最小
 *   间距 —— 黑翅土白蚁兵蚁的两颚在世界坐标里分得很开，默认机位的视线方向
 *   恰好把分离压扁，屏幕上糊成一根独角。
 * - 「刻槽是人字形」不看有没有那两条浅色带（删掉截断逻辑、把浅色带埋在树皮
 *   底下，那两条带照样在），而是数**树皮脊被截断成两段的条数**，再验断口位置
 *   沿横向是不是一条帐篷函数。
 * - 「离蛹」不看附肢 mesh 在不在，而是逐顶点问「它落在体壁之外吗」——
 *   把附肢埋回体壁（被蛹）时 mesh 数一个不少。
 *
 * 派数字时上下限一起给（天蛾的喙只给下限，长成了三四倍体长的标枪）。
 * 「看得见」类断言换算成占画面的比例：取景按 `model.radius` 归一化，
 * 一条带宽 / 画面直径就是它在屏幕上占多少。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildLonghornBeetleEgg } from '../stages/longhorn-beetle-egg'
import { buildLonghornBeetleLarva } from '../stages/longhorn-beetle-larva'
import { buildLonghornBeetlePupa } from '../stages/longhorn-beetle-pupa'
import type { InsectModel } from '../kit'
import { HOLOMETABOLOUS, builtStagesOf, metamorphosisOf } from '../../stages'

/** 每个阶段模型的三角形预算 */
const TRIANGLE_BUDGET = 150_000

/** 验收机位（与 rhino-stages.test.ts 一致）+ 展台默认机位（InsectCanvas 的 [2,1,3]） */
const VIEWS: Record<string, THREE.Vector3> = {
  home: new THREE.Vector3(2, 1, 3).normalize(),
  top: new THREE.Vector3(0.18, 1, 0.14).normalize(),
  side: new THREE.Vector3(0.12, 0.28, 1).normalize(),
  front: new THREE.Vector3(1, 0.32, 0.4).normalize(),
  rear: new THREE.Vector3(-0.85, 0.42, -0.7).normalize(),
}

const egg = buildLonghornBeetleEgg()
const larva = buildLonghornBeetleLarva()
const pupa = buildLonghornBeetlePupa()

// ---------------------------------------------------------------- 测量工具

function meshesNamed(model: InsectModel, ...names: string[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && names.includes(m.name)) out.push(m)
  })
  return out
}

/** 一组网格的世界坐标顶点（模型已 finalize 居中，世界坐标即模型局部坐标） */
function vertsOfMeshes(meshes: THREE.Mesh[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
    }
  }
  return out
}

function vertsOf(model: InsectModel, ...names: string[]): THREE.Vector3[] {
  return vertsOfMeshes(meshesNamed(model, ...names))
}

function boxOf(model: InsectModel, ...names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const m of meshesNamed(model, ...names)) box.union(new THREE.Box3().setFromObject(m))
  return box
}

function centroid(points: THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3()
  for (const p of points) c.add(p)
  return c.divideScalar(Math.max(points.length, 1))
}

function inspect(model: InsectModel): { triangles: number; nan: number; meshes: number } {
  let triangles = 0
  let nan = 0
  let meshes = 0
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    meshes++
    const pos = m.geometry.getAttribute('position')
    triangles += m.geometry.index ? m.geometry.index.count / 3 : pos.count / 3
    const arr = pos.array
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) nan++
  })
  return { triangles, nan, meshes }
}

/**
 * 材质基色的 HSL。
 *
 * ⚠️ 必须显式传 `SRGBColorSpace`：three 从 r152 起做颜色管理，
 * `new THREE.Color('#b5822c')` 存的是**线性**值，`getHSL()` 缺省也按线性算，
 * 读出来的明度比源码里写的那个十六进制暗一大截。拿线性值去对「够不够亮」的
 * 阈值，等于用另一把尺子量。
 */
function hslOf(model: InsectModel, name: string): { h: number; s: number; l: number } {
  const mesh = meshesNamed(model, name)[0]
  expect(mesh, `找不到名为 ${name} 的网格`).toBeTruthy()
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
  const out = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(out, THREE.SRGBColorSpace)
  return { h: out.h * 360, s: out.s, l: out.l }
}

function materialOf(model: InsectModel, name: string): THREE.MeshPhysicalMaterial {
  const mesh = meshesNamed(model, name)[0]
  expect(mesh, `找不到名为 ${name} 的网格`).toBeTruthy()
  return (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
}

/**
 * 把 `loft()` 产物按 uv 的 v 分环、取每环重心，反推出中心线。
 * 这是从**几何本身**量出来的，不是 builder 自报的数字：loft 的每一环都是绕
 * 中心点均匀分布的椭圆采样，Σcos = Σsin = 0，重心恰好落在中心线上。
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
  return sums.map((e) => (e.n ? e.s / e.n : 0))
}

function arcLength(points: THREE.Vector3[]): number {
  let s = 0
  for (let i = 1; i < points.length; i++) s += points[i].distanceTo(points[i - 1])
  return s
}

/**
 * 两组顶点投到某机位的成像平面上之后，最近的一对点隔了多远。
 *
 * 白蚁兵蚁那一轮换来的写法：三维距离说「分得很开」，屏幕上却糊成一坨 ——
 * 视线方向恰好压掉了分离的那个轴。这里只问一件事：**在这个机位的画面上，
 * 两者之间还看得见缝吗。**
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

/** 每 20 个点抽一个 —— minProjectedGap 是 O(n²)，全量跑几千个顶点会拖垮整份测试 */
function thin(points: THREE.Vector3[], step = 20): THREE.Vector3[] {
  return points.filter((_, i) => i % step === 0)
}

/**
 * 沿 X 分箱统计一条躯干的「轴心 + 最大向径」。
 *
 * 轴心逐箱现算（取该箱内顶点的 y/z 均值），所以既不受 `finalize()` 居中的
 * 平移影响，也不受整体绕 X 滚转的姿态影响 —— 蛹那两条都占。
 */
function radialProfile(points: THREE.Vector3[], bins = 44) {
  const xs = points.map((p) => p.x)
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  const acc = Array.from({ length: bins }, () => ({ y: 0, z: 0, n: 0 }))
  const binOf = (x: number) => THREE.MathUtils.clamp(Math.floor(((x - lo) / (hi - lo)) * bins), 0, bins - 1)
  for (const p of points) {
    const b = acc[binOf(p.x)]
    b.y += p.y
    b.z += p.z
    b.n++
  }
  const maxR = acc.map(() => 0)
  for (const p of points) {
    const i = binOf(p.x)
    const b = acc[i]
    if (!b.n) continue
    maxR[i] = Math.max(maxR[i], Math.hypot(p.y - b.y / b.n, p.z - b.z / b.n))
  }
  return {
    lo,
    hi,
    /** 某个 x 处的体壁最大向径与轴心；落在躯干之外返回 null */
    at(x: number): { cy: number; cz: number; r: number } | null {
      if (x < lo || x > hi) return null
      const i = binOf(x)
      const b = acc[i]
      if (!b.n) return null
      return { cy: b.y / b.n, cz: b.z / b.n, r: maxR[i] }
    },
  }
}

/**
 * 背中线剖面：沿 X 分箱，取「贴着背中线那一竖条」里最高的顶点。
 *
 * ⚠️ 量「盾比体壁高多少」时**不能**拿 `radialProfile` 的最大向径当基准 ——
 * 那个量的是横截面椭圆的**长半轴**（体侧最宽处），而盾在背中线上，
 * 那里的体壁半径是短半轴。两者差 0.06，足以让一块真凸出 0.05 的盾
 * 被算成「陷进去 0.02」。第一版就是这么把三条本该绿的断言判红的。
 */
function dorsalProfile(points: THREE.Vector3[], halfWidth = 0.09, bins = 60) {
  const xs = points.map((p) => p.x)
  const lo = Math.min(...xs)
  const hi = Math.max(...xs)
  const top = Array.from({ length: bins }, () => -Infinity)
  const binOf = (x: number) => THREE.MathUtils.clamp(Math.floor(((x - lo) / (hi - lo)) * bins), 0, bins - 1)
  for (const p of points) {
    if (Math.abs(p.z) > halfWidth) continue
    const i = binOf(p.x)
    top[i] = Math.max(top[i], p.y)
  }
  return (x: number): number | null => {
    if (x < lo || x > hi) return null
    const v = top[binOf(x)]
    return Number.isFinite(v) ? v : null
  }
}

// ---------------------------------------------------------------- 通规

describe('三个阶段的共同契约', () => {
  const all: [string, InsectModel][] = [
    ['卵', egg],
    ['幼虫', larva],
    ['蛹', pupa],
  ]

  it.each(all)('%s：有实体、无 NaN、面数在预算内', (_label, model) => {
    const { triangles, nan, meshes } = inspect(model)
    expect(meshes).toBeGreaterThan(0)
    expect(nan, 'NaN/Inf 顶点会让整个模型静默变成空白').toBe(0)
    expect(triangles).toBeGreaterThan(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(all)('%s：anchors 都是有限坐标，且贴在实体上', (_label, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length).toBeGreaterThanOrEqual(3)
    model.group.updateMatrixWorld(true)
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 坐标非有限`).toBe(true)
      /*
       * 「标注点浮在空气里」是全站闸门 anchors-have-geometry.test.ts 抓的那类 bug，
       * 但那份只跑成虫（knownSpecies），阶段模型得自己看着。判据同款：
       * 取 min(到最近顶点, 到最近网格包围盒)，除以包围半径，阈值 0.12。
       */
      const box = new THREE.Box3()
      const p = new THREE.Vector3()
      let best = Infinity
      model.group.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh || !mesh.geometry) return
        box.setFromObject(mesh)
        best = Math.min(best, box.distanceToPoint(v))
        const pos = mesh.geometry.getAttribute('position')
        const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
        for (let i = 0; i < pos.count; i += step) {
          p.fromBufferAttribute(pos, i)
          mesh.localToWorld(p)
          best = Math.min(best, p.distanceTo(v))
        }
      })
      expect(best / model.radius, `anchor ${k} 离实体 ${(best / model.radius).toFixed(3)}×半径，浮在空气里`).toBeLessThan(
        0.12,
      )
    }
  })

  it('注册成一条完全变态路线：卵 → 幼虫 → 蛹 →（成虫走 registry）', () => {
    expect(metamorphosisOf('longhorn-beetle')).toBe(HOLOMETABOLOUS)
    expect(builtStagesOf('longhorn-beetle')).toEqual(['egg', 'larva', 'pupa'])
  })
})

// ---------------------------------------------------------------- 卵

describe('卵：嵌在树皮「人」字刻槽里的乳白长椭球', () => {
  const ridges = meshesNamed(egg, 'bark-ridge')
  const floors = meshesNamed(egg, 'groove-floor')
  const shellVerts = vertsOf(egg, 'egg-shell')

  /**
   * 树皮的局部标架：法线由「脊的重心 − 底板的重心」现算，横向轴 = X̂ × n̂。
   * 不写死姿态角 —— 从几何本身推出来的标架，改了倾角这些断言照样成立，
   * 而删掉刻槽仍然会红。
   */
  const barkUp = (() => {
    const n = centroid(vertsOf(egg, 'bark-ridge')).sub(centroid(vertsOf(egg, 'bark-base')))
    n.x = 0
    return n.normalize()
  })()
  const barkAcross = new THREE.Vector3(1, 0, 0).cross(barkUp).normalize()
  const localZ = (v: THREE.Vector3) => v.dot(barkAcross)
  const localUp = (v: THREE.Vector3) => v.dot(barkUp)

  it('卵长 5~6 毫米、短径 1.4~1.9 毫米的长椭圆（不是球、也不是米粒）', () => {
    /*
     * 卵沿刻槽的臂斜放且略弯，包围盒与「顶点云主轴」都量不准：
     * 前者把斜放算进去，后者把弯曲的弓高算进短径（实测把 0.167 算成 0.19，
     * 长宽比从 3.3 掉到 2.9）。这里改从放样几何本身反推 ——
     * 中心线的弧长就是卵长，每一环到自己中心的平均距离就是当地半径。
     */
    const mesh = meshesNamed(egg, 'egg-shell')[0]
    const line = centerline(mesh)
    const len = arcLength(line)
    const wide = 2 * Math.max(...ringRadii(mesh, line))
    expect(len, `卵长 ${len.toFixed(3)} 不在 0.5~0.62 之间`).toBeGreaterThan(0.5)
    expect(len).toBeLessThan(0.62)
    expect(wide, `卵短径 ${wide.toFixed(3)} 不在 0.14~0.19 之间`).toBeGreaterThan(0.14)
    expect(wide).toBeLessThan(0.19)
    const slender = len / wide
    expect(slender, '长宽比 3~4.5 才是「长椭圆形」；接近 1 是球，1.5 是米粒').toBeGreaterThan(3)
    expect(slender).toBeLessThan(4.5)
  })

  it('卵身略弯：弓高占卵长的 4%~14%（做直了就是一根胶囊）', () => {
    const line = centerline(meshesNamed(egg, 'egg-shell')[0])
    const a = line[0]
    const b = line[line.length - 1]
    const chord = b.clone().sub(a)
    const len = chord.length()
    chord.normalize()
    let sag = 0
    for (const p of line) {
      const d = p.clone().sub(a)
      sag = Math.max(sag, d.clone().addScaledVector(chord, -d.dot(chord)).length())
    }
    expect(sag / len, `弓高比 ${(sag / len).toFixed(3)}`).toBeGreaterThan(0.04)
    expect(sag / len).toBeLessThan(0.14)
  })

  it('卵在画面上占得住：卵长 / 画面直径 ≥ 20%（树皮不能把主角挤成一粒沙）', () => {
    // 取景按 radius 归一化，所以「占画面多少」才是人真正看见的量
    const len = arcLength(centerline(meshesNamed(egg, 'egg-shell')[0]))
    expect(len / (2 * egg.radius)).toBeGreaterThan(0.2)
  })

  it('乳白不压深、树皮真的深：卵壳明度 ≥ 0.84，树皮 ≤ 0.32，两者差 ≥ 0.5', () => {
    // 「颜色要压深一档」被误解成「越深越保险」，第 5 轮 10 只里 7 只因此返工。
    // 乳白的东西反过来最危险：压深就是脏灰。
    const shell = hslOf(egg, 'egg-shell')
    const bark = hslOf(egg, 'bark-ridge')
    const floor = hslOf(egg, 'groove-floor')
    expect(shell.l, `卵壳明度 ${shell.l.toFixed(3)} 太暗，乳白被压成了脏灰`).toBeGreaterThan(0.84)
    expect(shell.h, '色相要落在黄区').toBeGreaterThan(30)
    expect(shell.h).toBeLessThan(60)
    expect(bark.l, `树皮明度 ${bark.l.toFixed(3)} 太亮，衬不出卵`).toBeLessThan(0.32)
    expect(shell.l - bark.l).toBeGreaterThan(0.5)
    // 槽底的内皮夹在两者之间：跟树皮分得开（读得出「这里被咬开了」），又不跟卵抢亮
    expect(floor.l - bark.l, '槽底与树皮的明度差不足，刻槽在画面上就没有了').toBeGreaterThan(0.2)
    expect(shell.l - floor.l, '槽底太亮会跟卵糊在一起').toBeGreaterThan(0.25)
  })

  it('卵壳不上清漆：白铬防线', () => {
    // elytra() 那档（clearcoat 0.55 / metal 0.25）套在这个亮度的基色上必过曝，
    // 七星瓢虫与甘薯腊龟甲都栽过。
    const mat = materialOf(egg, 'egg-shell')
    expect(mat.clearcoat).toBeLessThan(0.15)
    expect(mat.metalness).toBeLessThan(0.05)
    expect(mat.roughness, '高光要宽而软，不能是镜面点').toBeGreaterThan(0.5)
  })

  it('树皮脊被刻槽截断：≥ 14 条脊断成两段', () => {
    // 只断言「有浅色的槽底」是抓不住的：把截断逻辑删掉、槽底埋在完整的树皮下面，
    // 那两条浅色带照样在，而画面上一道槽也看不见。
    const byLane = new Map<number, THREE.Mesh[]>()
    for (const m of ridges) {
      const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3())
      const key = Math.round(localZ(c) * 40)
      byLane.set(key, [...(byLane.get(key) ?? []), m])
    }
    const cut = [...byLane.values()].filter((v) => v.length >= 2)
    expect(cut.length, `只有 ${cut.length} 条脊被截断 —— 刻槽没有真的切开树皮`).toBeGreaterThanOrEqual(14)
  })

  it('刻槽是「人」字形：断口位置沿横向是一条帐篷函数，顶点朝前', () => {
    const gaps: { z: number; center: number; width: number }[] = []
    const byLane = new Map<number, THREE.Mesh[]>()
    for (const m of ridges) {
      const c = new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3())
      const key = Math.round(localZ(c) * 40)
      byLane.set(key, [...(byLane.get(key) ?? []), m])
    }
    for (const [, group] of byLane) {
      if (group.length !== 2) continue
      const boxes = group.map((m) => new THREE.Box3().setFromObject(m))
      const rear = boxes[0].max.x < boxes[1].max.x ? boxes[0] : boxes[1]
      const front = rear === boxes[0] ? boxes[1] : boxes[0]
      const z = localZ(boxes[0].getCenter(new THREE.Vector3()))
      gaps.push({ z, center: (rear.max.x + front.min.x) / 2, width: front.min.x - rear.max.x })
    }
    expect(gaps.length).toBeGreaterThanOrEqual(14)

    const middle = gaps.filter((g) => Math.abs(g.z) < 0.08)
    const outer = gaps.filter((g) => Math.abs(g.z) > 0.34)
    expect(middle.length, '中线附近没有断口').toBeGreaterThan(0)
    expect(outer.length, '两臂末端附近没有断口').toBeGreaterThan(0)
    const apex = Math.max(...middle.map((g) => g.center))
    const tip = Math.min(...outer.map((g) => g.center))
    // 「人」字：中线处的断口最靠前，往两侧一路后退。做成一道横直的槽（T 字的横杠）
    // 时这个差是 0，做成人字才有 0.4 以上
    expect(apex - tip, `断口从中线到臂端只后退了 ${(apex - tip).toFixed(3)}，不是人字形`).toBeGreaterThan(0.4)
    // 两臂对称：+Z 侧与 −Z 侧的断口位置应当镜像
    const right = gaps.filter((g) => g.z > 0.2)
    const left = gaps.filter((g) => g.z < -0.2)
    const mean = (v: { center: number }[]) => v.reduce((s, g) => s + g.center, 0) / v.length
    expect(Math.abs(mean(right) - mean(left)), '两臂不对称').toBeLessThan(0.12)
    // 槽宽：中间宽、臂端窄（等宽的槽两端会留下两个方头，读成「铣出来的」）
    const wMid = Math.max(...middle.map((g) => g.width))
    const wTip = Math.max(...outer.map((g) => g.width))
    expect(wMid).toBeGreaterThan(wTip * 1.25)
  })

  it('刻槽真的是凹的：槽底比脊冠低 0.08 以上，且卵没被埋掉', () => {
    const ridgeTop = Math.max(...vertsOfMeshes(ridges).map(localUp))
    const floorTop = Math.max(...vertsOfMeshes(floors).map(localUp))
    expect(ridgeTop - floorTop, '槽底与脊冠一样高 —— 那不是槽').toBeGreaterThan(0.08)
    const eggTop = Math.max(...shellVerts.map(localUp))
    expect(eggTop, '卵沉得比槽底还低').toBeGreaterThan(floorTop + 0.06)
    expect(eggTop, '卵浮在树皮表面之上，不是「产在槽里」').toBeLessThan(ridgeTop + 0.02)
  })

  it('卵嵌在槽里：卵心离槽底 ≤ 0.09', () => {
    const c = centroid(shellVerts)
    const floorVerts = vertsOfMeshes(floors)
    const near = Math.min(...floorVerts.map((v) => v.distanceTo(c)))
    expect(near, `卵心离槽底 ${near.toFixed(3)}，卵没放进槽里`).toBeLessThan(0.09)
  })

  it('树皮真的有纹理：脊 ≥ 30 段、且高矮宽窄不一', () => {
    expect(ridges.length).toBeGreaterThanOrEqual(30)
    const heights = ridges.map((m) => {
      const v = vertsOfMeshes([m]).map(localUp)
      return Math.max(...v) - Math.min(...v)
    })
    const lo = Math.min(...heights)
    const hi = Math.max(...heights)
    expect(hi / lo, '每条脊一样高就成了一块搓衣板').toBeGreaterThan(1.4)
  })

  it('啃下来的碎屑：≥ 12 片、大小悬殊，且每一片都落在树皮上（不悬空）', () => {
    const chips = meshesNamed(egg, 'bark-chip')
    expect(chips.length).toBeGreaterThanOrEqual(12)
    const sizes = chips.map((m) => new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).length())
    expect(Math.max(...sizes) / Math.min(...sizes), '一堆同样大的碎屑读成装饰，不是碎屑').toBeGreaterThan(2.5)
    /*
     * 「悬空」这一条是自查时抓到的：碎屑的横向落点原本没有夹回脊铺开的范围，
     * 最外侧几片会落到只有底板、没有脊的那一圈，离最近的实体 0.30 —— 几何合法、
     * 别的断言全绿，只有出图才看得见（蛴螬那排全埋进体壁的气门是同一类毛病）。
     */
    const ridgeVerts = thin(vertsOfMeshes(ridges), 7)
    for (const chip of chips) {
      const c = new THREE.Box3().setFromObject(chip).getCenter(new THREE.Vector3())
      const near = Math.min(...ridgeVerts.map((v) => v.distanceTo(c)))
      expect(near, `有一片碎屑离最近的树皮脊 ${near.toFixed(3)}，悬在半空`).toBeLessThan(0.12)
    }
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫：戴着盾牌的乳白蛀木虫', () => {
  const bodyMesh = meshesNamed(larva, 'larva-body')[0]
  const line = centerline(bodyMesh)
  const radii = ringRadii(bodyMesh, line)
  /** 判「这道凹陷有多突出」时的窗口半宽：约 1/4 个体节，跟着采样密度走 */
  const WIN = Math.max(4, Math.round(radii.length / 60))
  const bodyBox = boxOf(larva, 'larva-body')
  const bodyLen = bodyBox.getSize(new THREE.Vector3()).x
  const plate = meshesNamed(larva, 'pronotal-plate')
  const granules = meshesNamed(larva, 'pronotal-granule')
  const calluses = meshesNamed(larva, 'larva-callus')
  const wrinkles = meshesNamed(larva, 'larva-callus-wrinkle')
  const nubs = meshesNamed(larva, 'larva-leg-nub')
  const mandibles = meshesNamed(larva, 'larva-mandible')

  it('体长 4.5~6.0 厘米：末龄幼虫比成虫（2~3.9 厘米）的体躯还长', () => {
    expect(bodyLen, `体长 ${bodyLen.toFixed(2)}`).toBeGreaterThan(4.5)
    expect(bodyLen).toBeLessThan(6.0)
  })

  it('身体是直的，不是蛴螬那样的 C 形', () => {
    const chordVec = line[line.length - 1].clone().sub(line[0])
    const chord = chordVec.length()
    const arc = arcLength(line)
    // C 形（独角仙幼虫）的弧弦比在 1.8 以上；轻微下垂的直筒不到 1.01
    expect(arc / chord, `弧长/弦长 = ${(arc / chord).toFixed(3)}，身体被弯起来了`).toBeLessThan(1.02)
    const dir = chordVec.clone().normalize()
    let sag = 0
    for (const p of line) {
      const d = p.clone().sub(line[0])
      sag = Math.max(sag, d.clone().addScaledVector(dir, -d.dot(dir)).length())
    }
    expect(sag / chord, `离弦最大偏移 ${(sag / chord).toFixed(3)}×体长`).toBeLessThan(0.05)
  })

  it('长圆筒：横截面近圆（不是压扁的带子），且前胸最粗而不是腹中段', () => {
    const mid = boxOf(larva, 'larva-body')
    void mid
    const front = Math.max(...radii.slice(Math.floor(radii.length * 0.06), Math.floor(radii.length * 0.16)))
    const belly = Math.max(...radii.slice(Math.floor(radii.length * 0.35), Math.floor(radii.length * 0.6)))
    expect(front, '前胸不是最粗处 —— 那是蛴螬的体型').toBeGreaterThan(belly * 1.05)
    // 横截面的高宽比：量中段一薄片顶点的 y/z 跨度
    const verts = vertsOfMeshes([bodyMesh])
    const xMid = bodyBox.min.x + bodyBox.getSize(new THREE.Vector3()).x * 0.5
    const slab = verts.filter((v) => Math.abs(v.x - xMid) < 0.05)
    const h = Math.max(...slab.map((v) => v.y)) - Math.min(...slab.map((v) => v.y))
    const w = Math.max(...slab.map((v) => v.z)) - Math.min(...slab.map((v) => v.z))
    expect(h / w).toBeGreaterThan(0.75)
    expect(h / w).toBeLessThan(1.2)
  })

  it('分节明显：≥ 10 道节间沟，深度在 2.5%~9% 之间（更深就读成松果）', () => {
    const from = Math.floor(radii.length * 0.08)
    const to = Math.floor(radii.length * 0.9)
    let count = 0
    let deepest = 0
    for (let i = from; i < to; i++) {
      if (!(radii[i] <= radii[i - 1] && radii[i] <= radii[i + 1])) continue
      // 突出度按「约 1/4 个体节」的窗口算：节间沟（约 4%）过线，细横皱（约 1.4%）不过
      let peak = 0
      for (let k = Math.max(0, i - WIN); k <= Math.min(radii.length - 1, i + WIN); k++) peak = Math.max(peak, radii[k])
      const depth = (peak - radii[i]) / peak
      if (depth >= 0.025) count++
      deepest = Math.max(deepest, depth)
    }
    expect(count, `只数出 ${count} 道节间沟`).toBeGreaterThanOrEqual(10)
    expect(count, `数出 ${count} 道节间沟，比 13 节该有的多太多`).toBeLessThanOrEqual(18)
    expect(deepest, `最深的一道沟占半径 ${(deepest * 100).toFixed(1)}%，会读成松果的鳞片`).toBeLessThan(0.09)
  })

  it('体壁有细横皱：节间沟之外还有一档更浅的起伏', () => {
    let shallow = 0
    for (let i = 1; i < radii.length - 1; i++) {
      if (!(radii[i] <= radii[i - 1] && radii[i] <= radii[i + 1])) continue
      let peak = 0
      for (let k = Math.max(0, i - WIN); k <= Math.min(radii.length - 1, i + WIN); k++) peak = Math.max(peak, radii[k])
      const depth = (peak - radii[i]) / peak
      if (depth > 0.002 && depth < 0.025) shallow++
    }
    expect(shallow, '除了节间沟没有更细的横皱，体壁会读成一根光塑料管').toBeGreaterThanOrEqual(18)
  })

  it('前胸背板：宽大（≥ 体宽的 70%）、扁平（凸起 0.02~0.09）、位置在前部背面', () => {
    expect(plate.length).toBeGreaterThanOrEqual(9)
    const box = boxOf(larva, 'pronotal-plate')
    const size = box.getSize(new THREE.Vector3())
    const bodySize = bodyBox.getSize(new THREE.Vector3())
    expect(size.z / bodySize.z, `盾宽只有体宽的 ${((size.z / bodySize.z) * 100).toFixed(0)}%`).toBeGreaterThan(0.7)
    expect(size.x, `盾长 ${size.x.toFixed(2)}`).toBeGreaterThan(0.5)
    expect(size.x).toBeLessThan(1.15)
    const c = box.getCenter(new THREE.Vector3())
    expect(c.x, '盾必须长在前部').toBeGreaterThan(bodyBox.max.x - bodySize.x * 0.25)
    expect(c.y, '盾长在背面（+Y）').toBeGreaterThan(0)

    // 凸起量：拿同一 x 处、背中线上躯干自己的体壁高度作基准
    const backTop = dorsalProfile(vertsOfMeshes([bodyMesh]))
    let rise = -Infinity
    for (const v of vertsOfMeshes(plate)) {
      if (Math.abs(v.z) > 0.09) continue
      const top = backTop(v.x)
      if (top === null) continue
      rise = Math.max(rise, v.y - top)
    }
    expect(rise, `盾冠只比体壁高 ${rise.toFixed(3)}，整块埋在体壁里等于没做`).toBeGreaterThan(0.02)
    expect(rise, `盾冠比体壁高 ${rise.toFixed(3)}，那是个瘤不是一块扁盾`).toBeLessThan(0.09)
  })

  it('前胸背板与体色真的分得开：明度差 ≥ 0.30', () => {
    // 第 5 轮头号病因就是把招牌图案压成深灰叠深灰，在画面上直接消失。
    const body = hslOf(larva, 'larva-body')
    const shield = hslOf(larva, 'pronotal-plate')
    expect(body.l, `体壁明度 ${body.l.toFixed(3)} —— 乳白就要真的接近白`).toBeGreaterThan(0.85)
    expect(shield.l, `盾的明度 ${shield.l.toFixed(3)}`).toBeGreaterThan(0.3)
    expect(shield.l).toBeLessThan(0.6)
    expect(body.l - shield.l, '盾与体色分不开，招牌在画面上就没有了').toBeGreaterThan(0.3)
    expect(shield.h, '黄褐：色相落在 25°~55°').toBeGreaterThan(25)
    expect(shield.h).toBeLessThan(55)
    expect(shield.s, '压灰了就成了土色').toBeGreaterThan(0.4)
  })

  it('前胸背板上有细密颗粒：≥ 60 枚，每枚都小，且真的凸在盾面上', () => {
    expect(granules.length).toBeGreaterThanOrEqual(60)
    for (const gr of granules) {
      const s = new THREE.Box3().setFromObject(gr).getSize(new THREE.Vector3())
      expect(Math.max(s.x, s.y, s.z), '颗粒做大了就成了一排疣').toBeLessThan(0.075)
    }
    const plateTop = Math.max(...vertsOfMeshes(plate).map((v) => v.y))
    const granuleTop = Math.max(...vertsOfMeshes(granules).map((v) => v.y))
    expect(granuleTop, '颗粒整个陷进盾里，等于没做').toBeGreaterThan(plateTop - 0.012)
  })

  it('体壁不用鞘翅材质：白铬防线', () => {
    const mat = materialOf(larva, 'larva-body')
    expect(mat.clearcoat, 'elytra() 那档清漆套在乳白上必过曝').toBeLessThan(0.15)
    expect(mat.metalness).toBeLessThan(0.05)
    expect(mat.roughness).toBeGreaterThan(0.6)
  })

  it('头小、缩在前胸里：头宽 < 体宽的 60%，露出来的只有 0.02~0.32', () => {
    const head = boxOf(larva, 'head-capsule')
    const headSize = head.getSize(new THREE.Vector3())
    const bodySize = bodyBox.getSize(new THREE.Vector3())
    expect(headSize.z / bodySize.z, '头做大了会变成一只蛆').toBeLessThan(0.6)
    const exposed = head.max.x - bodyBox.max.x
    expect(exposed, `头露出 ${exposed.toFixed(3)} —— 缩进去了或者根本没长出来`).toBeGreaterThan(0.02)
    expect(exposed, `头露出 ${exposed.toFixed(3)}，那不叫「缩在前胸里」`).toBeLessThan(0.32)
  })

  it('一对短粗的深色上颚：在最前端、够厚、不是两片剪纸', () => {
    expect(mandibles).toHaveLength(2)
    const box = boxOf(larva, 'larva-mandible')
    expect(box.max.x, '上颚必须是全身最前').toBeGreaterThan(boxOf(larva, 'head-capsule').max.x)
    for (const m of mandibles) {
      const s = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3())
      const dims = [s.x, s.y, s.z].sort((a, b) => a - b)
      expect(dims[0], '最薄的一维不足 0.05 就是一片剪纸（黑翅土白蚁兵蚁栽的那个）').toBeGreaterThan(0.05)
      expect(dims[2] / dims[0], '长厚比 ≤ 6：啃木头的钝凿，不是吸血的针').toBeLessThan(6)
      expect(dims[2], `单枚上颚长 ${dims[2].toFixed(2)}`).toBeGreaterThan(0.25)
      expect(dims[2]).toBeLessThan(0.6)
    }
    const c = hslOf(larva, 'larva-mandible')
    expect(c.l, '上颚要真的深').toBeLessThan(0.22)
    expect(c.l, '压到近黑就把体积感一起吃掉了').toBeGreaterThan(0.06)
  })

  it('两枚上颚在屏幕上分得开：≥ 4 个机位的投影间距 ≥ 0.02', () => {
    /*
     * 三维距离说「分得很开」，视线方向恰好压掉分离的那个轴时屏幕上会糊成一根。
     * 只看远端 55%：两颚基部本来就挨在一起，那一段不该要求分开。
     *
     * 为什么是 4/5 而不是 5/5：`side` 机位 (0.12,0.28,1) 几乎正对着 +Z，
     * 而两颚的分离量就在 Z 上 —— 沿着分离轴看过去，任何左右对称的一对结构
     * 都必然完全重叠，这是投影本身的性质，不是模型的毛病。
     * 实测（第一版 → 现在）：home 0.009 → 0.057、top 0.119 → 0.253、
     * front 0.079 → 0.252、rear 0.032 → 0.168。默认机位那 0.009 是把两颚
     * 从「往前收拢」改成「向外张开」换掉的 —— 收拢那一版在展台第一眼就是一坨。
     */
    const distal = mandibles.map((m) => {
      const v = vertsOfMeshes([m])
      const xMax = Math.max(...v.map((p) => p.x))
      const xMin = Math.min(...v.map((p) => p.x))
      return thin(
        v.filter((p) => p.x > xMin + (xMax - xMin) * 0.45),
        6,
      )
    })
    const ok = Object.entries(VIEWS).filter(([, dir]) => minProjectedGap(distal[0], distal[1], dir) >= 0.02)
    expect(ok.length, `只有 ${ok.length} 个机位看得出是两枚上颚`).toBeGreaterThanOrEqual(4)
    expect(minProjectedGap(distal[0], distal[1], VIEWS.home), '默认机位（展台第一眼）必须看得出是两枚').toBeGreaterThan(
      0.03,
    )
  })

  it('几乎无足：没有分节的胸足骨架，只有 6 枚极小的突起', () => {
    // ⚠️ 这一条正对着「顺手改成 kit.legPair()」那种改法：真足会在 rig 里登记，
    // 而那会把天牛幼虫当场变成一只蛴螬。
    expect(larva.rig?.legs, '幼虫身上出现了分节的真足').toBeUndefined()
    expect(nubs).toHaveLength(6)
    for (const n of nubs) {
      const s = new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3())
      const longest = Math.max(s.x, s.y, s.z)
      expect(longest, `退化胸足长 ${longest.toFixed(3)}，那已经是一条腿了`).toBeLessThan(0.16)
      expect(longest / bodyLen, '突起占体长的比例').toBeLessThan(0.035)
    }
    // 全部落在前段（三个胸节）
    const xs = nubs.map((n) => new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3()).x)
    expect(Math.min(...xs), '退化胸足跑到腹部去了').toBeGreaterThan(bodyBox.max.x - bodyLen * 0.35)
  })

  it('步泡突：背腹各 ≥ 6 块、逐节一块、每块带横皱且真的隆起', () => {
    expect(calluses.length).toBeGreaterThanOrEqual(12)
    const dorsal = calluses.filter((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).y > 0)
    const ventral = calluses.filter((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).y < 0)
    expect(dorsal.length, '背面的步泡突').toBeGreaterThanOrEqual(6)
    expect(ventral.length, '腹面的步泡突 —— 只做背面就少了一半').toBeGreaterThanOrEqual(6)
    expect(wrinkles.length, '每块垫至少 3 道横皱').toBeGreaterThanOrEqual(calluses.length * 3)

    const backTop = dorsalProfile(vertsOfMeshes([bodyMesh]), 0.06)
    for (const pad of dorsal) {
      let rise = -Infinity
      for (const v of vertsOfMeshes([pad])) {
        if (Math.abs(v.z) > 0.06) continue
        const top = backTop(v.x)
        if (top === null) continue
        rise = Math.max(rise, v.y - top)
      }
      expect(rise, `步泡突只比体壁高 ${rise.toFixed(3)}，看不出是一块垫`).toBeGreaterThan(0.012)
      expect(rise, `步泡突高出 ${rise.toFixed(3)}，成了一排疣`).toBeLessThan(0.09)
    }

    // 逐节一块：相邻两块的间距应当接近一个腹节的长度且彼此相当
    const xs = [...new Set(dorsal.map((m) => +new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).x.toFixed(3)))].sort(
      (a, b) => b - a,
    )
    const gaps = xs.slice(1).map((x, i) => xs[i] - x)
    const lo = Math.min(...gaps)
    const hi = Math.max(...gaps)
    expect(hi / lo, '步泡突不是逐节均匀排的').toBeLessThan(1.3)
  })

  it('步泡突与体壁分得开，但不能喧宾夺主：明度差 0.06~0.35', () => {
    const body = hslOf(larva, 'larva-body')
    const pad = hslOf(larva, 'larva-callus')
    expect(body.l - pad.l).toBeGreaterThan(0.06)
    expect(body.l - pad.l).toBeLessThan(0.35)
  })

  it('体侧一排气门：9 对，左右各 9，每个都很小', () => {
    const sp = meshesNamed(larva, 'larva-spiracle')
    expect(sp).toHaveLength(18)
    const right = sp.filter((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).z > 0)
    expect(right).toHaveLength(9)
    for (const m of sp) {
      const s = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3())
      expect(Math.max(s.x, s.y, s.z)).toBeLessThan(0.16)
    }
  })

  it('尾端圆钝收口，不是一截锯断的塑料管', () => {
    const verts = vertsOfMeshes([bodyMesh])
    const xMin = Math.min(...verts.map((v) => v.x))
    const maxR = Math.max(...radii)
    const tail = verts.filter((v) => v.x <= xMin + bodyLen * 0.012)
    const tailR = Math.max(...tail.map((v) => Math.abs(v.z)))
    expect(tailR / maxR, '尾端必须收细').toBeLessThan(0.35)
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹：盘着一对长触角的离蛹', () => {
  const bodyVerts = vertsOf(pupa, 'pupa-body')
  const bodyProfile = radialProfile(bodyVerts)
  const bodyLen = bodyProfile.hi - bodyProfile.lo
  const antennae = meshesNamed(pupa, 'pupa-antenna')
  const wingPads = meshesNamed(pupa, 'pupa-wing-pad')
  const legSegs = meshesNamed(pupa, 'pupa-leg-segment')

  /** 一组顶点里，有多大比例落在体壁之外（离蛹的判据） */
  function outsideRatio(points: THREE.Vector3[], margin = 0.015): number {
    let inside = 0
    let total = 0
    for (const v of points) {
      const b = bodyProfile.at(v.x)
      if (!b) continue
      total++
      if (Math.hypot(v.y - b.cy, v.z - b.cz) < b.r + margin) inside++
    }
    return total === 0 ? 0 : 1 - inside / total
  }

  it('体长 3.0~4.0 厘米', () => {
    expect(bodyLen, `蛹体长 ${bodyLen.toFixed(2)}`).toBeGreaterThan(3.0)
    expect(bodyLen).toBeLessThan(4.0)
  })

  it('招牌：一对触角，单条弧长是体长的 1.15~2.2 倍', () => {
    expect(antennae).toHaveLength(2)
    for (const a of antennae) {
      const len = arcLength(centerline(a))
      expect(len / bodyLen, `触角弧长只有体长的 ${(len / bodyLen).toFixed(2)} 倍 —— 那不是天牛`).toBeGreaterThan(1.15)
      expect(len / bodyLen, `触角弧长 ${(len / bodyLen).toFixed(2)} 倍体长，做过头了`).toBeLessThan(2.2)
    }
  })

  it('触角是盘着的：累计转角 ≥ 300°，且没有伸到体外去', () => {
    for (const a of antennae) {
      const line = centerline(a)
      let turn = 0
      for (let i = 2; i < line.length; i++) {
        const v1 = line[i - 1].clone().sub(line[i - 2])
        const v2 = line[i].clone().sub(line[i - 1])
        if (v1.lengthSq() < 1e-12 || v2.lengthSq() < 1e-12) continue
        turn += v1.angleTo(v2)
      }
      const deg = THREE.MathUtils.radToDeg(turn)
      // 一根直棒是 0°，「往后一弯」大约 90°，盘一圈 360° 以上
      expect(deg, `触角累计只转了 ${deg.toFixed(0)}°，没有盘起来`).toBeGreaterThan(300)
    }
    // 盘曲的意义就是「长触角要塞进蛹的长度里」：伸直了这条就红
    const box = boxOf(pupa, 'pupa-antenna').getSize(new THREE.Vector3())
    expect(box.x / bodyLen, `触角沿体轴摊开了 ${(box.x / bodyLen).toFixed(2)} 倍体长，没有盘起来`).toBeLessThan(1.05)
  })

  it('离蛹：触角 / 翅芽 / 足都在体壁之外，各自有轮廓', () => {
    // 被蛹（蝶蛾）的附肢与体壁愈合成一枚一体的硬壳，只能做成浅浮雕；
    // 把这里的附肢埋回体壁，mesh 数一个不少，但这三条会红。
    expect(outsideRatio(thin(vertsOfMeshes(antennae), 3)), '触角陷进体壁了').toBeGreaterThan(0.9)
    expect(outsideRatio(thin(vertsOfMeshes(wingPads), 3)), '翅芽陷进体壁了').toBeGreaterThan(0.7)
    expect(outsideRatio(thin(vertsOfMeshes(legSegs), 3)), '足陷进体壁了').toBeGreaterThan(0.7)
  })

  it('三对足，每条三节，膝真的折着（40°~140°）', () => {
    expect(legSegs).toHaveLength(18)
    expect(meshesNamed(pupa, 'pupa-leg-joint')).toHaveLength(12)
    // 逐条腿量膝角：把同一条腿的三节按中心线首尾串起来
    const perLeg: THREE.Vector3[][] = []
    for (let i = 0; i < legSegs.length; i += 3) {
      perLeg.push(legSegs.slice(i, i + 3).map((m) => centerline(m)[0]))
    }
    for (const seg of legSegs.length ? perLeg : []) {
      void seg
    }
    let bent = 0
    for (let i = 0; i < legSegs.length; i += 3) {
      const [femur, tibia, tarsus] = legSegs.slice(i, i + 3).map((m) => centerline(m))
      const knee = femur[femur.length - 1]
      const a = femur[0].clone().sub(knee)
      const b = tibia[tibia.length - 1].clone().sub(knee)
      const deg = THREE.MathUtils.radToDeg(a.angleTo(b))
      expect(deg, `膝角 ${deg.toFixed(0)}° —— 伸直的腿不是折起来的蛹足`).toBeGreaterThan(40)
      expect(deg).toBeLessThan(140)
      expect(tarsus.length).toBeGreaterThan(1)
      bent++
    }
    expect(bent).toBe(6)
  })

  it('一对翅芽，自胸部盖到腹部前段', () => {
    expect(wingPads).toHaveLength(2)
    const box = boxOf(pupa, 'pupa-wing-pad')
    expect(box.max.x, '翅芽的前端要够到胸部').toBeGreaterThan(bodyProfile.lo + bodyLen * 0.6)
    expect(box.min.x, '翅芽要盖到腹部').toBeLessThan(bodyProfile.lo + bodyLen * 0.45)
    for (const pad of wingPads) {
      const s = new THREE.Box3().setFromObject(pad).getSize(new THREE.Vector3())
      const dims = [s.x, s.y, s.z].sort((a, b) => a - b)
      expect(dims[2] / dims[0], '翅芽是宽而扁的一片').toBeGreaterThan(2.5)
    }
  })

  it('乳白至淡黄不压深，复眼真的更深', () => {
    const body = hslOf(pupa, 'pupa-body')
    const eye = hslOf(pupa, 'pupa-eye')
    expect(body.l, `蛹体明度 ${body.l.toFixed(3)} 被压成了脏黄`).toBeGreaterThan(0.78)
    expect(body.h, '色相落在黄区').toBeGreaterThan(30)
    expect(body.h).toBeLessThan(60)
    expect(body.l - eye.l, '复眼与体色分不开就看不出轮廓').toBeGreaterThan(0.3)
  })

  it('附肢与体壁分得开：触角 / 翅芽 / 足都比体色深，但都还在浅色区', () => {
    const body = hslOf(pupa, 'pupa-body')
    for (const name of ['pupa-antenna', 'pupa-wing-pad', 'pupa-leg-segment']) {
      const c = hslOf(pupa, name)
      expect(body.l - c.l, `${name} 与体色的明度差不足，轮廓读不出来`).toBeGreaterThan(0.05)
      expect(c.l, `${name} 压得太深，不像蛹了`).toBeGreaterThan(0.6)
    }
  })

  it('蛹壳不用鞘翅材质：白铬防线', () => {
    const mat = materialOf(pupa, 'pupa-body')
    expect(mat.clearcoat).toBeLessThan(0.2)
    expect(mat.metalness).toBeLessThan(0.05)
  })

  it('前胸两侧已有侧刺突（接住成虫那处科级识别特征）', () => {
    const spines = meshesNamed(pupa, 'pupa-pronotal-spine')
    expect(spines).toHaveLength(2)
    const zs = spines.map((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()).z)
    expect(Math.sign(zs[0]) * Math.sign(zs[1]), '两枚侧刺要分在体侧两边').toBe(-1)
  })

  it('腹部背面成排小刺 + 腹末一对尾突', () => {
    expect(meshesNamed(pupa, 'pupa-spinelet').length).toBeGreaterThanOrEqual(48)
    expect(meshesNamed(pupa, 'pupa-urogomphus')).toHaveLength(2)
  })
})

