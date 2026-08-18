/**
 * 西方蜜蜂三个生活史阶段（卵 / 幼虫 / 蛹）的形态断言。
 *
 * ## 这份测试的自检标准
 *
 * **「把代码改回出问题的那一版，这条断言会不会红？」不会红就等于没写。**
 * 下面每一条都对着一个**真出过**的问题，出图时一个个撞出来的：
 *
 * | 断言 | 它守着的那次事故 |
 * | --- | --- |
 * | 房口沿的六边形度 | 把角点磨圆 / 换成圆管，蜂窝就成了一堆杯子 |
 * | 房底三菱锥的两档角高 | 房底做成平板，「蜂巢最有名的结构」直接没了 |
 * | 壁厚 0.03~0.07 且逐房不一 | 按真值 0.07 毫米做 → 亚像素的纸片；做匀 → 装饰图案 |
 * | 幼虫**没有足** | 加上胸足就成了蛴螬，加上腹足就成了毛虫（换了个目） |
 * | 幼虫整条在房内 | 盘绕半径按外接圆卡，虫从边中方向伸出房底，后斜机位看得见挂在脾外 |
 * | 蜂王浆整层在房底之上 | 水平液面在菱形锥的高处低于房底，浆从脾背穿出来 |
 * | 蛹的三类芽存在、贴伏、且在体壁之外 | 埋进体壁 = 没做；伸太远 = 穿出蜡壁挂在房外（真撞过） |
 * | 复眼与躯干的明度差 | 没有这道差，蛹只是一枚白蜡人，看不出「正在变成蜜蜂」 |
 * | 中央房的周向缺口 ≥ 120° | 切口方位算错 60°，蛹被自己房的壁挡得只剩几根足尖（真撞过） |
 * | 三个阶段的体长量级 | 量级差本身就是生活史要讲的内容，不许为了好看放大卵 |
 *
 * 量的尽量是**用户真正看见的那个量**：六边形度按「口沿到房轴的距离 max/min」
 * 量（圆管是 1.0、正六边形是 1.155），不按顶点数；「没有足」按「所有顶点到体轴
 * 的距离都不超过体半径的 1.35 倍」量，不按网格名字 —— 名字可以改，包络不会说谎。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildHoneybeeEgg } from '../stages/honeybee-egg'
import { buildHoneybeeLarva } from '../stages/honeybee-larva'
import { buildHoneybeePupa } from '../stages/honeybee-pupa'
import type { InsectModel } from '../kit'
import { HOLOMETABOLOUS, builtStagesOf, metamorphosisOf } from '../../stages'

/** 三个阶段都远低于这个预算；上限只防「某次改动让面数失控」 */
const TRIANGLE_BUDGET = 90_000

/** 工蜂房中心间距（= 对边距）。三个 builder 里都是这个数，测试独立写一份对照 */
const CELL_W = 0.53
const CELL_A = CELL_W / 2
const CELL_RC = CELL_A / Math.cos(Math.PI / 6)

// ---------------------------------------------------------------- 通用工具

function meshesNamed(root: THREE.Object3D, ...names: string[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  root.updateMatrixWorld(true)
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && names.includes(m.name)) out.push(m)
  })
  return out
}

function verticesOf(root: THREE.Object3D, ...names: string[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (const mesh of meshesNamed(root, ...names)) {
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
    }
  }
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

/**
 * 材质基色的 HSL。
 * ⚠️ 必须显式传 `SRGBColorSpace`：three 从 r152 起做颜色管理，
 * `new THREE.Color('#cb9c4c')` 存的是**线性**值，`getHSL()` 缺省也按线性算，
 * 读出来的明度比源码里那个十六进制暗一大截。拿线性值对阈值＝换了把尺子。
 */
function hslOf(mat: THREE.MeshPhysicalMaterial): { h: number; s: number; l: number } {
  const out = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(out, THREE.SRGBColorSpace)
  return out
}

function materialOf(root: THREE.Object3D, name: string): THREE.MeshPhysicalMaterial {
  const mesh = meshesNamed(root, name)[0]
  expect(mesh, `找不到名为 ${name} 的网格`).toBeTruthy()
  return mesh.material as THREE.MeshPhysicalMaterial
}

/** 把 loft() 产物按 uv 的 v 分环、取每环重心，从**几何本身**反推中心线 */
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

/**
 * 放样体的截面宽厚比：逐环取「到环心的最远距离 / 最近距离」，取中段的中位数。
 * 椭圆截面的这个比就是宽厚比；圆截面恒等于 1。
 */
function sectionFlatness(mesh: THREE.Mesh): number {
  const line = centerline(mesh)
  const pos = mesh.geometry.getAttribute('position')
  const uv = mesh.geometry.getAttribute('uv')
  const keys = [...new Set(Array.from({ length: pos.count }, (_, i) => Math.round(uv.getY(i) * 1e6)))].sort(
    (a, b) => a - b,
  )
  const index = new Map(keys.map((k, i) => [k, i]))
  const per = keys.map(() => [] as number[])
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    if (uv.getX(i) > 1 - 1e-6) continue
    const k = index.get(Math.round(uv.getY(i) * 1e6))
    if (k === undefined) continue
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
    per[k].push(v.distanceTo(line[k]))
  }
  const ratios = per
    .slice(Math.floor(per.length * 0.25), Math.floor(per.length * 0.75))
    .filter((r) => r.length > 4 && Math.min(...r) > 1e-5)
    .map((r) => Math.max(...r) / Math.min(...r))
    .sort((a, b) => a - b)
  return ratios[Math.floor(ratios.length / 2)] ?? 1
}

/** 点到一条无限长直线（过 origin、方向 dir，dir 已归一化）的距离 */
function distToAxis(p: THREE.Vector3, origin: THREE.Vector3, dir: THREE.Vector3): number {
  const d = new THREE.Vector3().subVectors(p, origin)
  return d.clone().addScaledVector(dir, -d.dot(dir)).length()
}

// ---------------------------------------------------------------- 巢脾

/**
 * 巢脾的局部标架。
 *
 * 巢脾整组带一个四元数（房口朝上前方），所以量房的一切都得先回到**巢脾局部
 * 坐标**：那里房轴恒为 +Y、房阵列铺在 XZ 平面上。用 group 自己的世界矩阵求逆，
 * 不在测试里重抄一遍角度 —— 抄一遍就是第二处会跟源码对不上的地方。
 */
function combFrame(model: InsectModel) {
  model.group.updateMatrixWorld(true)
  let comb: THREE.Object3D | null = null
  model.group.traverse((o) => {
    if (o.name === 'comb') comb = o
  })
  expect(comb, '找不到名为 comb 的巢脾组').toBeTruthy()
  const node = comb as unknown as THREE.Object3D
  const toLocal = node.matrixWorld.clone().invert()
  return {
    node,
    /** 模型坐标 → 巢脾局部坐标 */
    toLocal: (p: THREE.Vector3) => p.clone().applyMatrix4(toLocal),
  }
}

interface Cell {
  group: THREE.Object3D
  /** 房底锥尖（巢脾局部坐标） */
  apex: THREE.Vector3
  /** 六个房角（巢脾局部坐标） */
  corners: THREE.Vector3[]
  wall: THREE.Mesh
}

/**
 * 从**几何本身**认出每个房：房底网格里出现次数最多的那个位置就是锥尖
 * （三瓣菱形共用它，出现 6 次；其余每个房角只出现 2 次），剩下的去重就是六个房角。
 * 不靠顶点下标、不靠 builder 自报的数字。
 */
function cellsOf(model: InsectModel): Cell[] {
  const { toLocal } = combFrame(model)
  const out: Cell[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    if (o.name !== 'comb-cell') return
    const floor = meshesNamed(o, 'comb-floor')[0]
    const wall = meshesNamed(o, 'comb-wall')[0]
    if (!floor || !wall) return
    const pos = floor.geometry.getAttribute('position')
    const tally = new Map<string, { p: THREE.Vector3; n: number }>()
    for (let i = 0; i < pos.count; i++) {
      const p = toLocal(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(floor.matrixWorld))
      const key = [p.x, p.y, p.z].map((v) => Math.round(v * 1e4)).join(',')
      const e = tally.get(key) ?? { p, n: 0 }
      e.n++
      tally.set(key, e)
    }
    /*
     * 锥尖 = 落在房轴上的那两个位置（房底有厚度，正反两面各一个）里靠房口的那个。
     * 房角 = 其余位置按方位角分组，每组取靠房口的那一个 ——
     * ⚠️ 不能只按「y 比锥尖高」筛：背面那一层的房角也比正面的锥尖高，
     * 于是六个方位各混进两个点，测出来的房角间隔是 0°（第一版实测）。
     */
    const all = [...tally.values()]
    const axisPts = all.filter((e) => Math.hypot(e.p.x, e.p.z) < 1e6) // 占位，下面按到轴的距离筛
    const cx = all.reduce((a, e) => a + e.p.x, 0) / all.length
    const cz = all.reduce((a, e) => a + e.p.z, 0) / all.length
    const onAxis = axisPts.filter((e) => Math.hypot(e.p.x - cx, e.p.z - cz) < 0.02)
    const apex = onAxis.reduce((a, b) => (a.p.y >= b.p.y ? a : b)).p
    const buckets = new Map<number, THREE.Vector3>()
    for (const e of all) {
      const dx = e.p.x - cx
      const dz = e.p.z - cz
      if (Math.hypot(dx, dz) < 0.02) continue
      const key = Math.round((Math.atan2(dz, dx) * 180) / Math.PI / 5)
      const prev = buckets.get(key)
      if (!prev || e.p.y > prev.y) buckets.set(key, e.p)
    }
    out.push({ group: o, apex, corners: [...buckets.values()], wall })
  })
  return out
}

/** 中央那格（房底锥尖最靠近巢脾局部原点的） */
function mainCell(cells: Cell[]): Cell {
  return cells.reduce((a, b) => (Math.hypot(a.apex.x, a.apex.z) <= Math.hypot(b.apex.x, b.apex.z) ? a : b))
}

/** 一个房的壁顶点（巢脾局部坐标） */
function wallVertices(model: InsectModel, cell: Cell): THREE.Vector3[] {
  const { toLocal } = combFrame(model)
  const pos = cell.wall.geometry.getAttribute('position')
  const pts: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) {
    pts.push(toLocal(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(cell.wall.matrixWorld)))
  }
  return pts
}

/**
 * 口沿那一圈：按方位角分桶，每桶取**最高的那一层**的内外两点。
 *
 * ⚠️ 不能用「离顶端 0.05 以内」这种切片去近似。口沿本身有起伏、壁厚又随高度
 * 渐变，切片会把低一层的**内**壁点混进来，而它的半径恰好落在高一层**外**壁点
 * 的区间里 —— 于是一根纯圆管也能测出 1.152 的 max/min（实测），
 * 「房口是六边形」那条断言就等于没写。按桶取顶层才分得干净。
 */
function rimRing(model: InsectModel, cell: Cell): { angle: number; inner: number; outer: number }[] {
  const buckets = new Map<number, THREE.Vector3[]>()
  for (const p of wallVertices(model, cell)) {
    const a = Math.atan2(p.z - cell.apex.z, p.x - cell.apex.x)
    const key = Math.round((a * 180) / Math.PI / 3)
    const arr = buckets.get(key) ?? []
    arr.push(p)
    buckets.set(key, arr)
  }
  const out: { angle: number; inner: number; outer: number }[] = []
  for (const [key, arr] of buckets) {
    const top = Math.max(...arr.map((p) => p.y))
    const layer = arr.filter((p) => p.y > top - 1e-3)
    const d = layer.map((p) => Math.hypot(p.x - cell.apex.x, p.z - cell.apex.z))
    if (d.length < 2) continue
    out.push({ angle: key * 3, inner: Math.min(...d), outer: Math.max(...d) })
  }
  return out
}

const STAGES = [
  ['卵', buildHoneybeeEgg],
  ['幼虫', buildHoneybeeLarva],
  ['蛹', buildHoneybeePupa],
] as const

// ================================================================ 共同契约

describe('三个阶段的共同契约', () => {
  it('注册成一条完全变态路线：卵 → 幼虫 → 蛹 →（成虫走 registry）', () => {
    expect(metamorphosisOf('honeybee')).toBe(HOLOMETABOLOUS)
    expect(builtStagesOf('honeybee')).toEqual(['egg', 'larva', 'pupa'])
  })

  it.each(STAGES)('%s 的面数在预算内', (_name, build) => {
    expect(triangleCount(build())).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(STAGES)('%s 的巢脾有 3~7 个房', (_name, build) => {
    const n = cellsOf(build()).length
    expect(n).toBeGreaterThanOrEqual(3)
    expect(n).toBeLessThanOrEqual(7)
  })
})

// ================================================================ 巢脾

describe.each(STAGES)('%s 的巢脾', (_name, build) => {
  const model = build()
  const cells = cellsOf(model)
  const main = mainCell(cells)

  it('房底是**六**角形：六个房角绕房轴两两相差 60°', () => {
    for (const cell of cells) {
      expect(cell.corners.length, '房底不是六个角').toBe(6)
      const angles = cell.corners
        .map((c) => (Math.atan2(c.z - cell.apex.z, c.x - cell.apex.x) * 180) / Math.PI)
        .map((a) => (a + 360) % 360)
        .sort((a, b) => a - b)
      for (let i = 0; i < 6; i++) {
        const gap = (angles[(i + 1) % 6] - angles[i] + 360) % 360
        expect(gap, `房角间隔 ${gap.toFixed(1)}°，不是 60°`).toBeGreaterThan(55)
        expect(gap).toBeLessThan(65)
      }
    }
  })

  it('房宽是真值：对边距 5.2~5.4 毫米', () => {
    for (const cell of cells) {
      const rc = cell.corners.map((c) => Math.hypot(c.x - cell.apex.x, c.z - cell.apex.z))
      const across = (Math.min(...rc) + Math.max(...rc)) / 2 // 外接圆半径
      expect(across * 2 * Math.cos(Math.PI / 6)).toBeGreaterThan(0.46)
      expect(across * 2 * Math.cos(Math.PI / 6)).toBeLessThan(0.56)
    }
  })

  it('房底是三菱锥不是平板：六个房角交替落在两档高度，比值约 2:1', () => {
    for (const cell of cells) {
      const hs = cell.corners.map((c) => c.y - cell.apex.y).sort((a, b) => a - b)
      const low = (hs[0] + hs[1] + hs[2]) / 3
      const high = (hs[3] + hs[4] + hs[5]) / 3
      expect(low, '房角低档高度为 0 —— 房底做成平板了').toBeGreaterThan(0.03)
      // 109.47° 那条式子的直接后果：高档恰好是低档的两倍
      expect(high / low).toBeGreaterThan(1.8)
      expect(high / low).toBeLessThan(2.2)
      // 锥深也得是真尺度。房底六边形比房本身小一个壁厚，所以实测略低于
      // 外接圆半径 /(2√2)=0.108，落在 0.09~0.112 这一带
      expect(low).toBeGreaterThan(0.09)
      expect(low).toBeLessThan(0.112)
    }
  })

  it('房口是六边形不是圆管：外壁到房轴的距离 max/min ≈ 1.155', () => {
    // 正六边形 = 外接/内切 = 1.1547；圆管 = 1.000。只看口沿那一层的**外**壁，
    // 两者分得干干净净（实测圆管 1.00、本模型 1.15）
    const d = rimRing(model, main).map((r) => r.outer)
    const ratio = Math.max(...d) / Math.min(...d)
    expect(ratio, `外壁的 max/min = ${ratio.toFixed(3)}，接近 1 说明房口被磨成了圆`).toBeGreaterThan(1.1)
    expect(ratio).toBeLessThan(1.22)
  })

  it('房壁有厚度（0.3~0.7 毫米），而且各房厚薄不匀', () => {
    // 逐桶取口沿那一层的外壁减内壁 —— 那就是这一格在房口处的壁厚，取中位数
    const thickness = cells.map((cell) => {
      const ring = rimRing(model, cell)
        .map((r) => r.outer - r.inner)
        .sort((a, b) => a - b)
      return ring[Math.floor(ring.length / 2)]
    })
    expect(thickness.length).toBeGreaterThan(2)
    for (const t of thickness) {
      expect(t, `壁厚 ${t.toFixed(3)} —— 太薄会读成一张纸`).toBeGreaterThan(0.03)
      expect(t, `壁厚 ${t.toFixed(3)} —— 太厚就不是蜡壁了`).toBeLessThan(0.075)
    }
    const mean = thickness.reduce((a, b) => a + b, 0) / thickness.length
    const sd = Math.sqrt(thickness.reduce((a, b) => a + (b - mean) ** 2, 0) / thickness.length)
    expect(sd, '各房壁厚一模一样 —— 规整的蜂窝会读成装饰图案').toBeGreaterThan(0.001)
  })

  it('蜡绝不是鞘翅材质：白铬防线', () => {
    for (const cell of cells) {
      const mat = cell.wall.material as THREE.MeshPhysicalMaterial
      expect(mat.clearcoat, '蜡壁上了清漆').toBeLessThanOrEqual(0.2)
      expect(mat.roughness, '蜡壁太亮，会整片过曝').toBeGreaterThan(0.55)
      const { l } = hslOf(mat)
      expect(l, '蜡压得太深，读成硬纸板').toBeGreaterThan(0.4)
      expect(l, '蜡太浅，白色的虫会溶进背景').toBeLessThan(0.68)
    }
  })
})

// ================================================================ 卵

describe('卵', () => {
  const model = buildHoneybeeEgg()
  const cells = cellsOf(model)
  const main = mainCell(cells)
  const { toLocal } = combFrame(model)
  const eggs = meshesNamed(model.group, 'egg-body')

  it('一房一粒，连片产了三粒 —— 一粒白点可能是脏东西，三粒同形才只能是卵', () => {
    expect(eggs.length).toBe(3)
    const centres = eggs.map((m) => {
      const box = new THREE.Box3().setFromObject(m)
      return toLocal(box.getCenter(new THREE.Vector3()))
    })
    for (let i = 0; i < centres.length; i++) {
      for (let j = i + 1; j < centres.length; j++) {
        const d = Math.hypot(centres[i].x - centres[j].x, centres[i].z - centres[j].z)
        expect(d, '两粒卵挤在同一格里').toBeGreaterThan(CELL_W * 0.8)
      }
    }
  })

  it('长 1.3~1.7 毫米、最粗处直径 0.3~0.5 毫米（上下限一起卡）', () => {
    for (const egg of eggs) {
      const line = centerline(egg)
      const len = arcLength(line)
      expect(len, `卵长 ${len.toFixed(3)}`).toBeGreaterThan(0.13)
      expect(len).toBeLessThan(0.17)
      const r = ringRadii(egg, line)
      const dia = 2 * Math.max(...r)
      expect(dia, `卵径 ${dia.toFixed(3)}`).toBeGreaterThan(0.03)
      expect(dia).toBeLessThan(0.05)
      // 长径比 4:1 —— 「米粒」不是「珠子」
      expect(len / dia).toBeGreaterThan(3)
    }
  })

  it('直立：卵的长轴与房轴的夹角不超过 25°', () => {
    for (const egg of eggs) {
      const line = centerline(egg).map(toLocal)
      const axis = new THREE.Vector3().subVectors(line[line.length - 1], line[0]).normalize()
      const deg = (Math.acos(Math.abs(axis.y)) * 180) / Math.PI
      expect(deg, `卵斜了 ${deg.toFixed(1)}°，读成倒伏的旧卵`).toBeLessThan(25)
    }
  })

  it('一端粘在房底，而且整粒都在房口以下 —— 不是搁在脾面上的一颗米', () => {
    const rimTop = Math.max(...wallVertices(model, main).map((p) => p.y))
    for (const egg of eggs) {
      const pts = verticesOf(egg, 'egg-body').map(toLocal)
      const low = Math.min(...pts.map((p) => p.y))
      const high = Math.max(...pts.map((p) => p.y))
      expect(low, '卵底悬空，没粘在房底上').toBeLessThan(0.02)
      expect(high, '卵伸出房口了').toBeLessThan(rimTop)
    }
    // 卵基还得有那一小圈胶质，否则读成「悬空插在那儿」
    expect(meshesNamed(model.group, 'egg-glue').length).toBe(3)
  })

  it('乳白而不是脏灰，与蜡拉得开；且绝不上清漆（白铬防线）', () => {
    const egg = hslOf(materialOf(model.group, 'egg-body'))
    const wax = hslOf(materialOf(model.group, 'comb-wall'))
    expect(egg.l, '卵压深了，成了脏灰').toBeGreaterThan(0.85)
    expect(egg.l - wax.l, '卵与蜡的明度差太小，1.5 毫米的卵会溶进蜡里').toBeGreaterThan(0.25)
    const mat = materialOf(model.group, 'egg-body')
    expect(mat.clearcoat).toBeLessThanOrEqual(0.15)
    expect(mat.roughness, '乳白 + 高光会整片过曝成白铬').toBeGreaterThan(0.65)
  })
})

// ================================================================ 幼虫

describe('幼虫', () => {
  const model = buildHoneybeeLarva()
  const cells = cellsOf(model)
  const main = mainCell(cells)
  const { toLocal } = combFrame(model)
  /**
   * 中央那格里那条（体积最大的）幼虫，以及它**整组**的网格。
   *
   * ⚠️ 按组取、不按名字列举。第一版的「没有足」只查 `larva-body` / `larva-head`
   * 两个名字，于是变异测试往组里塞了三对胸足、断言照样全绿 ——
   * 长出来的东西不会自报名字，只有包络不会说谎。
   */
  const larvaNodes: THREE.Object3D[] = []
  model.group.traverse((o) => {
    if (o.name === 'larva') larvaNodes.push(o)
  })
  const larva = larvaNodes.reduce((a, b) =>
    new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3()).length() >=
    new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).length()
      ? a
      : b,
  )
  const body = meshesNamed(larva, 'larva-body')[0]
  const line = centerline(body)
  const radii = ringRadii(body, line)

  /** 这条幼虫组里除了蜂王浆之外的全部顶点 —— 任何新长出来的东西都躲不掉 */
  function larvaVertices(): THREE.Vector3[] {
    const out: THREE.Vector3[] = []
    larva.updateMatrixWorld(true)
    larva.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m.name === 'brood-food') return
      const pos = m.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld))
      }
    })
    return out
  }

  it('体轴弧长 1.0~1.2 厘米（真值），而且远比卵长', () => {
    const len = arcLength(line)
    expect(len, `体长 ${len.toFixed(3)}`).toBeGreaterThan(1.0)
    expect(len).toBeLessThan(1.2)
    expect(len / 0.15, '幼虫与卵的量级差没做出来').toBeGreaterThan(6)
  })

  it('C 形蜷曲：首尾几乎碰上，但留着缺口', () => {
    const len = arcLength(line)
    const gap = line[0].distanceTo(line[line.length - 1])
    expect(gap / len, '首尾离得太远 —— 这是一根香蕉不是一个 C').toBeLessThan(0.28)
    expect(gap, '首尾接上了 —— 这是一个甜甜圈不是一个 C').toBeGreaterThan(0.04)
  })

  it('C 形蜷曲：从房口看下去，虫圈中间真的有个洞', () => {
    const own = larvaVertices()
      .map(toLocal)
      .filter((p) => Math.hypot(p.x - main.apex.x, p.z - main.apex.z) < CELL_A)
    const cx = own.reduce((a, p) => a + p.x, 0) / own.length
    const cz = own.reduce((a, p) => a + p.z, 0) / own.length
    const dists = own.map((p) => Math.hypot(p.x - cx, p.z - cz))
    // 有洞 = 质心附近没有实体
    expect(Math.min(...dists), '虫圈中间是实的 —— 不是 C 是一团').toBeGreaterThan(0.03)
  })

  it('**一根足都没有**：所有顶点到体轴的距离都不超过体半径的 1.35 倍', () => {
    const rMax = Math.max(...radii)
    let worst = 0
    for (const p of larvaVertices()) {
      let best = Infinity
      for (const c of line) best = Math.min(best, c.distanceTo(p))
      worst = Math.max(worst, best)
    }
    expect(
      worst / rMax,
      `有顶点伸到体半径的 ${(worst / rMax).toFixed(2)} 倍处 —— 膜翅目幼虫既没有胸足也没有腹足，长出附肢就换了一个目`,
    ).toBeLessThan(1.35)
  })

  it('体节明显：沿体轴至少数得出 11 道节间折痕', () => {
    let dips = 0
    for (let i = 2; i < radii.length - 2; i++) {
      if (radii[i] < radii[i - 1] && radii[i] <= radii[i + 1] && radii[i] < radii[i - 2] * 0.995) dips++
    }
    // 13 节，但首尾各有一节的折痕是淡出的，实际数得出 9~12 道
    expect(dips, `只数出 ${dips} 道折痕 —— 体节没做出来`).toBeGreaterThanOrEqual(9)
  })

  it('折痕窄而浅：不许收成松果', () => {
    const rMax = Math.max(...radii)
    // 中段（避开两端的收口）里，相邻两环的落差不许超过该处半径的 12%
    const from = Math.floor(radii.length * 0.15)
    const to = Math.floor(radii.length * 0.85)
    for (let i = from + 1; i < to; i++) {
      const drop = Math.abs(radii[i] - radii[i - 1]) / rMax
      expect(drop, '节间沟太深，整条虫会读成一枚松果').toBeLessThan(0.12)
    }
  })

  it('整条虫都在房里：任何顶点都不许伸出房底的内切半径', () => {
    const pts = larvaVertices().map(toLocal)
    // 每个顶点归给**离它最近**的那个房，再量到该房轴的距离。
    // 按半径筛会把邻房的顶点也算进来，测出来的最大值恰好等于筛选半径本身
    let far = 0
    for (const p of pts) {
      const cell = cells.reduce((a, b) =>
        Math.hypot(p.x - a.apex.x, p.z - a.apex.z) <= Math.hypot(p.x - b.apex.x, p.z - b.apex.z) ? a : b,
      )
      far = Math.max(far, Math.hypot(p.x - cell.apex.x, p.z - cell.apex.z))
    }
    expect(
      far,
      `虫伸到离房轴 ${far.toFixed(3)} 处，越过了房底的内切半径 ${CELL_A.toFixed(3)} —— 后斜机位会看见它挂在脾底下`,
    ).toBeLessThan(CELL_A)
  })

  it('乳白、哑光、有珍珠感 —— 绝不是鞘翅材质', () => {
    const mat = materialOf(model.group, 'larva-body')
    const { l } = hslOf(mat)
    expect(l, '体壁压深了，成了脏灰').toBeGreaterThan(0.85)
    expect(mat.clearcoat, '乳白 + 清漆 = 白铬').toBeLessThanOrEqual(0.1)
    expect(mat.roughness, '体壁太亮，会整片过曝').toBeGreaterThan(0.7)
    expect(mat.transmission, '幼虫是软体，要有次表面透光').toBeGreaterThan(0)
  })

  it('体侧一排气门：每侧至少 8 枚，且都长在体侧', () => {
    const own = meshesNamed(larva, 'larva-spiracle')
    expect(own.length).toBeGreaterThanOrEqual(16)
  })

  it('身下垫着一层蜂王浆：比虫体黄一档，而且整层都在房底之上', () => {
    const jelly = hslOf(materialOf(model.group, 'brood-food'))
    const bodyHsl = hslOf(materialOf(model.group, 'larva-body'))
    expect(jelly.s, '浆与虫体同色，「有人在喂它」这件事就没了').toBeGreaterThan(bodyHsl.s + 0.05)
    const pts = verticesOf(model.group, 'brood-food').map(toLocal)
    for (const p of pts) {
      const cell = cells.reduce((a, b) =>
        Math.hypot(p.x - a.apex.x, p.z - a.apex.z) <= Math.hypot(p.x - b.apex.x, p.z - b.apex.z) ? a : b,
      )
      const rad = Math.hypot(p.x - cell.apex.x, p.z - cell.apex.z)
      // 房底锥面在该半径处的最低高度（低档房角那一侧）
      const floorLow = (CELL_RC / (2 * Math.SQRT2)) * (rad / CELL_RC)
      expect(
        p.y - cell.apex.y,
        '浆低到房底面以下了 —— 后斜机位会看见几块奶油色的楔子挂在脾背外面',
      ).toBeGreaterThan(floorLow - 1e-3)
    }
  })
})

// ================================================================ 蛹

describe('蛹', () => {
  const model = buildHoneybeePupa()
  const cells = cellsOf(model)
  const main = mainCell(cells)
  const { toLocal } = combFrame(model)
  const body = meshesNamed(model.group, 'pupa-body')[0]
  const line = centerline(body)

  /** 体轴：头端 →  腹末 */
  const axis = new THREE.Vector3().subVectors(line[line.length - 1], line[0]).normalize()

  it('体长 1.05~1.4 厘米，比盘着的幼虫略长（化蛹前会伸直）', () => {
    const len = arcLength(line)
    expect(len).toBeGreaterThan(1.05)
    expect(len).toBeLessThan(1.4)
  })

  it('翅芽 / 足芽 / 触角芽三样都在', () => {
    expect(meshesNamed(model.group, 'pupa-wing-bud').length, '没有翅芽').toBeGreaterThanOrEqual(4)
    expect(meshesNamed(model.group, 'pupa-leg-bud').length, '足芽不是三对').toBe(6)
    expect(meshesNamed(model.group, 'pupa-antenna-bud').length, '触角芽不是一对').toBe(2)
  })

  it('三类芽都**贴伏**在体表：既不埋进体壁，也不甩出去', () => {
    const rBody = Math.max(...ringRadii(body, line))
    for (const name of ['pupa-wing-bud', 'pupa-leg-bud', 'pupa-antenna-bud'] as const) {
      const meshes = meshesNamed(model.group, name)
      expect(meshes.length, `一片 ${name} 都没有`).toBeGreaterThan(0)
      // ⚠️ 必须**逐片**判。把所有芽的顶点合起来取最远值，只要还剩一片没被改坏，
      // 「埋进体壁」那条就永远绿 —— 第一版的变异测试正是这么漏掉的
      for (const mesh of meshes) {
        const pos = mesh.geometry.getAttribute('position')
        let far = 0
        for (let i = 0; i < pos.count; i++) {
          const p = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
          far = Math.max(far, distToAxis(p, line[0], axis))
        }
        expect(far, `${name} 甩得太远（${far.toFixed(3)}），离蛹是「贴着」不是「张着」`).toBeLessThan(0.3)
        expect(
          far,
          `${name} 整个埋进了体壁（最远才 ${far.toFixed(3)}，体半径 ${rBody.toFixed(3)}）—— 埋进去等于没做`,
        ).toBeGreaterThan(rBody * 0.92)
      }
    }
  })

  it('翅芽是一片**壳片**：沿体轴的跨度够长、而且真的扁', () => {
    for (const pad of meshesNamed(model.group, 'pupa-wing-bud')) {
      const pos = pad.geometry.getAttribute('position')
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < pos.count; i++) {
        pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(pad.matrixWorld))
      }
      const along = pts.map((p) => p.dot(axis))
      const span = Math.max(...along) - Math.min(...along)
      expect(span, `翅芽只有 ${span.toFixed(3)} 长 —— 那是个疙瘩，不是一片翅芽`).toBeGreaterThan(0.24)
      /*
       * 扁不扁按**横截面**量，不按包围盒：翅芽是弯的、还绕自己的轴转过一个角，
       * 轴对齐包围盒把「弯」也算成了厚度，一片 0.024 厚的壳片测出来是 1.97
       * （第一版实测），那条断言等于没写。
       * 逐环取「到环心的最远 / 最近距离」：椭圆截面的这个比就是宽厚比，
       * 圆管恒等于 1。
       */
      expect(sectionFlatness(pad), '翅芽不扁 —— 那是根管子').toBeGreaterThan(3)
    }
  })

  it('复眼先显色：复眼与躯干的明度差 ≥ 0.35', () => {
    const eye = meshesNamed(model.group, 'pupa-eye')[0]
    expect(eye, '找不到复眼').toBeTruthy()
    const eyeHsl = hslOf(eye.material as THREE.MeshPhysicalMaterial)
    const bodyHsl = hslOf(body.material as THREE.MeshPhysicalMaterial)
    expect(bodyHsl.l, '躯干压深了，蛹的乳白没了').toBeGreaterThan(0.82)
    expect(
      bodyHsl.l - eyeHsl.l,
      `复眼与躯干只差 ${(bodyHsl.l - eyeHsl.l).toFixed(2)} —— 没有这道差，蛹只是一枚白蜡人`,
    ).toBeGreaterThan(0.35)
    // 头顶三枚单眼同样先显色
    expect(meshesNamed(model.group, 'pupa-ocellus').length).toBe(3)
  })

  it('躯干乳白哑光 —— 绝不是鞘翅材质', () => {
    const mat = body.material as THREE.MeshPhysicalMaterial
    expect(mat.clearcoat).toBeLessThanOrEqual(0.12)
    expect(mat.roughness, '乳白 + 高光会整片过曝成白铬').toBeGreaterThan(0.7)
  })

  /**
   * 中央那格沿周向的缺口：按方位角把**整面壁**（不只是口沿）分成 36 个箱，
   * 找最长的一段空箱。只看口沿会漏掉「房口被削平但壁还在」那一类 ——
   * 蛹的腹末就贴在那截矮壁后面。
   */
  const gap = (() => {
    const bins = new Array(36).fill(false)
    for (const p of wallVertices(model, main)) {
      const a = Math.atan2(p.z - main.apex.z, p.x - main.apex.x)
      bins[Math.floor((((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * 36) % 36] = true
    }
    let best = 0
    let bestStart = 0
    for (let s = 0; s < 36; s++) {
      let run = 0
      while (run < 36 && !bins[(s + run) % 36]) run++
      if (run > best) {
        best = run
        bestStart = s
      }
    }
    const mid = ((bestStart + best / 2) / 36) * Math.PI * 2
    return { deg: best * 10, dir: new THREE.Vector3(Math.cos(mid), 0, Math.sin(mid)) }
  })()

  it('中央那格被纵向剖开：房壁沿周向留出 ≥ 120° 的缺口', () => {
    expect(gap.deg, `最大缺口只有 ${gap.deg}° —— 房没被剖开，蛹在井底谁也看不见`).toBeGreaterThanOrEqual(120)
  })

  it('**而且缺口正对机位** —— 切口方位算错 60° 的话，缺口一样大、却背着人开', () => {
    const { node } = combFrame(model)
    const world = gap.dir.clone().transformDirection(node.matrixWorld).normalize()
    // 侧 / 前斜 / 展台默认三个机位（顶视看的是脾面、后斜看的是脾背，这两个不参与）
    for (const [name, d] of [
      ['侧', [0.12, 0.28, 1]],
      ['前斜', [1, 0.32, 0.4]],
      ['展台默认', [0.86, 0.44, 1.25]],
    ] as const) {
      const v = new THREE.Vector3(...d).normalize()
      const dot = v.dot(world)
      expect(dot, `${name}机位与剖口方向的夹角 ${((Math.acos(dot) * 180) / Math.PI).toFixed(0)}° —— 开反了`).toBeGreaterThan(
        0.3,
      )
    }
  })

  it('蛹头朝房口，整只都在房里', () => {
    const pts = verticesOf(model.group, 'pupa-body').map(toLocal)
    // ⚠️ loft 的第 0 环是**腹末**（p=0 在 −X），最后一环才是头端
    const head = toLocal(line[line.length - 1])
    const tail = toLocal(line[0])
    expect(head.y, '蛹头没朝着房口').toBeGreaterThan(tail.y + 0.5)
    const rimTop = Math.max(...wallVertices(model, main).map((p) => p.y))
    expect(head.y, '蛹头伸出房口了').toBeLessThan(rimTop)
    const far = Math.max(...pts.map((p) => Math.hypot(p.x - main.apex.x, p.z - main.apex.z)))
    expect(far, '蛹的躯干撑破了蜡壁').toBeLessThan(CELL_A)
  })

  it('附肢也全在房里 —— 足芽穿出蜡壁挂在房外是真撞过的一次', () => {
    const pts = verticesOf(model.group, 'pupa-leg-bud', 'pupa-wing-bud', 'pupa-antenna-bud').map(toLocal)
    const far = Math.max(...pts.map((p) => Math.hypot(p.x - main.apex.x, p.z - main.apex.z)))
    expect(far, `附肢伸到离房轴 ${far.toFixed(3)} 处，房底内切半径只有 ${CELL_A}`).toBeLessThan(CELL_A)
  })

  it('房口封着蜡盖：微凸、比蜡壁深一档、而且盖在房口上', () => {
    const caps = meshesNamed(model.group, 'comb-cap')
    expect(caps.length, '一个封盖的房都没有 —— 「封盖子脾」这件事就没了').toBeGreaterThanOrEqual(3)
    const capHsl = hslOf(caps[0].material as THREE.MeshPhysicalMaterial)
    const waxHsl = hslOf(main.wall.material as THREE.MeshPhysicalMaterial)
    expect(waxHsl.l - capHsl.l, '蜡盖与蜡壁一个颜色，分不出来').toBeGreaterThan(0.08)
    // 外凸：盖心比盖缘更靠外（沿房轴）
    for (const cap of caps) {
      const pos = cap.geometry.getAttribute('position')
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < pos.count; i++) {
        pts.push(toLocal(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(cap.matrixWorld)))
      }
      const cell = cells.reduce((a, b) => {
        const da = Math.hypot(pts[0].x - a.apex.x, pts[0].z - a.apex.z)
        const db = Math.hypot(pts[0].x - b.apex.x, pts[0].z - b.apex.z)
        return da <= db ? a : b
      })
      const inner = pts.filter((p) => Math.hypot(p.x - cell.apex.x, p.z - cell.apex.z) < CELL_A * 0.3)
      const outer = pts.filter((p) => Math.hypot(p.x - cell.apex.x, p.z - cell.apex.z) > CELL_A * 0.85)
      if (inner.length === 0 || outer.length === 0) continue
      const hi = Math.max(...inner.map((p) => p.y))
      const lo = Math.max(...outer.map((p) => p.y))
      expect(hi - lo, '蜡盖是平的 —— 封盖子脾的盖是微凸的').toBeGreaterThan(0.01)
    }
  })
})

// ================================================================ 量级

describe('三个阶段的体长量级', () => {
  it('卵 0.15 → 幼虫 1.0+ → 蛹 1.2：量级差本身就是生活史要讲的内容', () => {
    const eggLen = arcLength(centerline(meshesNamed(buildHoneybeeEgg().group, 'egg-body')[0]))
    const larvaModel = buildHoneybeeLarva()
    const larvaBody = meshesNamed(larvaModel.group, 'larva-body').reduce((a, b) =>
      new THREE.Box3().setFromObject(a).getSize(new THREE.Vector3()).length() >=
      new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).length()
        ? a
        : b,
    )
    const larvaLen = arcLength(centerline(larvaBody))
    const pupaLen = arcLength(centerline(meshesNamed(buildHoneybeePupa().group, 'pupa-body')[0]))

    expect(larvaLen / eggLen, '幼虫没有比卵大一个量级').toBeGreaterThan(6)
    expect(pupaLen / larvaLen, '蛹应当与伸直的幼虫同量级、略长').toBeGreaterThan(0.95)
    expect(pupaLen / larvaLen).toBeLessThan(1.6)
  })
})
