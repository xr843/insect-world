/**
 * 德国小蠊生活史两阶段（卵鞘 / 若虫）的形态验证。
 *
 * 写每一条断言之前的自检只有一句：**把实现改坏，这条会不会红？**
 * 每条都注了它对着哪一种坏法 —— 逐条做过变异测试（改坏 → 跑 → 确认红 → 还原），
 * 记录在各条的注释里。
 *
 * 本仓库两条买来的教训，通篇按它们写：
 * 1. **断言量的是数字，人看的是长相。** 所以「大小」类断言上下限齐给，
 *    「看得见」类断言换算成占画面的比例（取景按 model.radius 归一化）。
 *    这两只都是逐张看过四个机位的出图才交的，这份测试只负责把看对了的东西钉住。
 * 2. **有向的断言比「差多少」值钱。** 「浅带比体色浅」写成有向的，
 *    不写「两者明度差 > x」。
 *
 * 若虫那一组拿成虫（`buildCockroach()`）当参照系量「缩小版成虫」这句话，
 * 不写死常数 —— 成虫哪天改了尺寸，这里跟着报警。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildCockroachEgg, CHAMBERS, KEEL_RADIAL, SHELL_RADIAL } from '../stages/cockroach-egg'
import { buildCockroachNymph, TRUNK_RADIAL } from '../stages/cockroach-nymph'
import { buildCockroach } from '../cockroach'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 60_000

const egg = buildCockroachEgg()
const nymph = buildCockroachNymph()
const adult = buildCockroach()

// ---------------------------------------------------------------- 测量工具

function meshesByName(model: InsectModel, ...names: string[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && names.includes(m.name)) out.push(m)
  })
  return out
}

function boxOf(objs: THREE.Object3D[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const o of objs) box.union(new THREE.Box3().setFromObject(o))
  return box
}

/** 某网格第 i 个顶点的世界坐标（finalize 已居中，世界坐标即模型局部坐标） */
function vert(mesh: THREE.Mesh, i: number): THREE.Vector3 {
  return new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute('position') as THREE.BufferAttribute, i).applyMatrix4(mesh.matrixWorld)
}

function vertsOf(mesh: THREE.Mesh): THREE.Vector3[] {
  const n = mesh.geometry.getAttribute('position').count
  return Array.from({ length: n }, (_, i) => vert(mesh, i))
}

/** 材质基色的 sRGB HSL（必须显式 sRGB，否则深色的明度被线性空间压扁） */
function hslOfMat(mat: THREE.Material): { h: number; s: number; l: number } {
  const hsl = { h: 0, s: 0, l: 0 }
  ;(mat as THREE.MeshPhysicalMaterial).color.getHSL(hsl, THREE.SRGBColorSpace)
  return { h: hsl.h * 360, s: hsl.s, l: hsl.l }
}

function matsOf(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material]
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

/** 锚点离实体多远（占包围半径），判据同全站闸门 anchors-have-geometry.test.ts */
function detachRatio(model: InsectModel, anchor: THREE.Vector3): number {
  model.group.updateMatrixWorld(true)
  const v = new THREE.Vector3()
  const box = new THREE.Box3()
  let best = Infinity
  model.group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    box.setFromObject(mesh)
    best = Math.min(best, box.distanceToPoint(anchor))
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i)
      mesh.localToWorld(v)
      best = Math.min(best, v.distanceTo(anchor))
    }
  })
  return best / Math.max(model.radius, 1e-6)
}

/** 放样管的中轴线（每环顶点取平均；封口中心凑不满一环，整除时自然落掉） */
function centerline(mesh: THREE.Mesh, radialSegments: number): THREE.Vector3[] {
  const ring = radialSegments + 1
  const rings = Math.floor(mesh.geometry.getAttribute('position').count / ring)
  const out: THREE.Vector3[] = []
  for (let r = 0; r < rings; r++) {
    const c = new THREE.Vector3()
    for (let j = 0; j < ring; j++) c.add(vert(mesh, r * ring + j))
    out.push(c.divideScalar(ring))
  }
  return out
}

function arcLength(pts: THREE.Vector3[]): number {
  let s = 0
  for (let i = 1; i < pts.length; i++) s += pts[i].distanceTo(pts[i - 1])
  return s
}

/** 一条序列里的严格局部极大 / 极小的下标 */
function extrema(vals: number[], kind: 'max' | 'min'): number[] {
  const out: number[] = []
  const sgn = kind === 'max' ? 1 : -1
  for (let i = 1; i < vals.length - 1; i++) {
    if (sgn * (vals[i] - vals[i - 1]) > 0 && sgn * (vals[i] - vals[i + 1]) >= 0) out.push(i)
  }
  return out
}

function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y)
  return s[Math.floor(s.length / 2)]
}

/** 一个分区网格（geometry groups）里某一区的全部三角形重心 */
function groupCentroids(mesh: THREE.Mesh, materialIndex: number): THREE.Vector3[] {
  const idx = mesh.geometry.getIndex()!.array
  const out: THREE.Vector3[] = []
  for (const grp of mesh.geometry.groups) {
    if (grp.materialIndex !== materialIndex) continue
    for (let t = grp.start; t < grp.start + grp.count; t += 3) {
      out.push(vert(mesh, idx[t]).add(vert(mesh, idx[t + 1])).add(vert(mesh, idx[t + 2])).divideScalar(3))
    }
  }
  return out
}

const ADULT_KEYS = ['stripe', 'head', 'antenna', 'wing', 'cercus', 'leg']

// ---------------------------------------------------------------- 通规

describe('两个阶段的通用契约', () => {
  const all: [string, InsectModel][] = [
    ['卵鞘', egg],
    ['若虫', nymph],
  ]

  // 变异：卵鞘纵向站位 ×10（CHAMBERS * 100）→ 三角形 ~20 万，红
  it.each(all)('%s：有实体、无 NaN、面数在预算内', (_n, model) => {
    const { triangles, nan, meshes } = inspect(model)
    expect(meshes).toBeGreaterThan(0)
    expect(nan, 'NaN/Inf 顶点会让整个模型静默变成空白').toBe(0)
    expect(triangles).toBeGreaterThan(1000)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  // 变异：若虫 cercus 锚点改成 CERCUS_LEN * 8（指向空气），红
  it.each(all)('%s：每个标注点底下都真的有几何体', (_n, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length).toBeGreaterThan(0)
    const floating: string[] = []
    for (const k of keys) {
      const r = detachRatio(model, model.anchors[k])
      if (!(r <= 0.12)) floating.push(`${k}（${r.toFixed(2)}×半径）`)
    }
    expect(floating, `这些标注点浮在空气里：${floating.join('、')}`).toEqual([])
  })

  /*
   * 展台拿当前模型的 anchors 去配**成虫**的 hotspot 表：同名就把成虫的卡片贴上来。
   * 卵鞘上没有任何一处与成虫同义；若虫的头/触角/尾须/足同义可复用，
   * 但 stripe（成虫的「前胸双纹」卡）与 wing（「前翅」卡）绝不能出现。
   * 变异：卵鞘锚点 keel 改名 head → 红；若虫 dorsalBand 改名 stripe → 红
   */
  it('锚点名不把成虫的卡片错贴到幼期上', () => {
    expect(Object.keys(egg.anchors).filter((k) => ADULT_KEYS.includes(k))).toEqual([])
    const nk = Object.keys(nymph.anchors)
    expect(nk).not.toContain('stripe')
    expect(nk).not.toContain('wing')
    for (const k of ['head', 'antenna', 'cercus', 'leg']) expect(nk, `若虫缺了与成虫同义的锚点 ${k}`).toContain(k)
  })
})

// ---------------------------------------------------------------- 卵鞘

describe('卵鞘：侧扁的长方钱包，侧面一排卵室纹，顶上一道锯齿脊', () => {
  const shell = meshesByName(egg, 'ootheca-shell')[0]
  const keel = meshesByName(egg, 'keel')[0]
  const shellBox = boxOf([shell])
  const shellSize = shellBox.getSize(new THREE.Vector3())
  const frame = egg.radius * 2
  const cols = SHELL_RADIAL + 1
  const rows = shell.geometry.getAttribute('position').count / cols

  /** 网格第 j 列（方位角 φ = j/RADIAL·2π；j=RADIAL/4 为 +Z 侧壁正中）沿纵向的一串顶点 */
  const column = (j: number) => Array.from({ length: rows }, (_, i) => vert(shell, i * cols + j))
  const side = column(SHELL_RADIAL / 4)
  const sideMid = side.filter((p) => Math.abs(p.x - shellBox.getCenter(new THREE.Vector3()).x) < shellSize.x * 0.42)
  const sideZ = sideMid.map((p) => p.z)
  const grooveIdx = extrema(sideZ, 'min')
  const bulgeIdx = extrema(sideZ, 'max')

  it('找得到壳与脊', () => {
    expect(shell).toBeDefined()
    expect(keel).toBeDefined()
    expect(Number.isInteger(rows)).toBe(true)
  })

  // 变异：FRONT_X/REAR_X 放大到 ±0.8 → 长 1.6 红；HALF_W 改 0.16（宽>高）→ 红
  it('真实体量：长 6~9 毫米、高约 3 毫米，且高大于宽（侧扁）', () => {
    expect(shellSize.x).toBeGreaterThan(0.6)
    expect(shellSize.x).toBeLessThan(0.9)
    expect(shellSize.y).toBeGreaterThan(0.24)
    expect(shellSize.y).toBeLessThan(0.34)
    expect(shellSize.z).toBeGreaterThan(0.18)
    expect(shellSize.z).toBeLessThan(0.28)
    expect(shellSize.y, '卵鞘是侧扁的：高必须大于宽').toBeGreaterThan(shellSize.z * 1.08)
    const slender = shellSize.x / shellSize.y
    expect(slender, '长高比 2.3~3.3：再胖是块方糖，再瘦是根香肠').toBeGreaterThan(2.3)
    expect(slender).toBeLessThan(3.3)
  })

  /*
   * 「钱包」而不是「橄榄」：侧壁是平的。量中段横断面上 |z| ≥ 0.9·最宽 的那一段
   * 占全高的比例 —— 椭圆断面约 0.40，超椭圆 3.1 约 0.6。
   * 变异：SIDE_EXP = 2（椭圆）→ 下限红；SIDE_EXP = 8（方管）→ 上限红
   */
  it('横断面是平侧壁 + 圆棱，不是椭圆管也不是方管', () => {
    const midRow = Math.floor(rows / 2)
    const ring = Array.from({ length: cols }, (_, j) => vert(shell, midRow * cols + j))
    const zmax = Math.max(...ring.map((p) => Math.abs(p.z)))
    const flat = ring.filter((p) => Math.abs(p.z) >= zmax * 0.9)
    const ys = ring.map((p) => p.y)
    const frac = (Math.max(...flat.map((p) => p.y)) - Math.min(...flat.map((p) => p.y))) / (Math.max(...ys) - Math.min(...ys))
    expect(frac, `侧壁平直段只占全高 ${(frac * 100).toFixed(0)}%，断面成了椭圆（橄榄）`).toBeGreaterThan(0.5)
    expect(frac, `侧壁平直段占全高 ${(frac * 100).toFixed(0)}%，成了一根方管`).toBeLessThan(0.78)
  })

  /*
   * 端面方中带圆：离端面 6% 体长处，断面宽度仍有最宽处的 70% 以上。
   * 变异：END_EXP = 2（椭圆端，收成橄榄尖）→ 下限红；
   *      END_EXP = 40（一刀切平）→ 上限红
   */
  it('两端是钝圆的端面，不收成橄榄尖，也不是一刀切平', () => {
    const all = vertsOf(shell)
    const zmax = Math.max(...all.map((p) => Math.abs(p.z)))
    for (const [label, near] of [
      ['前端', (p: THREE.Vector3) => p.x > shellBox.max.x - shellSize.x * 0.06],
      ['后端', (p: THREE.Vector3) => p.x < shellBox.min.x + shellSize.x * 0.06],
    ] as const) {
      const w = Math.max(...all.filter(near).map((p) => Math.abs(p.z))) / zmax
      expect(w, `${label}收得太尖`).toBeGreaterThan(0.7)
      expect(w, `${label}没有一点圆角，是个方盒子`).toBeLessThan(0.97)
    }
  })

  /*
   * 招牌一：侧面一排分节纹。
   * 变异：GROOVE = 0 → 沟数 0 红；CHAMBERS = 8 → 下限红；CHAMBERS = 30 → 上限红
   */
  it('招牌一：侧壁上 16~20 道分节纹，一道对应一对卵', () => {
    expect(grooveIdx.length, `侧壁上数到 ${grooveIdx.length} 道分节纹`).toBeGreaterThanOrEqual(14)
    expect(grooveIdx.length).toBeLessThanOrEqual(20)
    expect(CHAMBERS * 2, '两排卵的总数要落在德国小蠊的 30~48 枚里').toBeGreaterThanOrEqual(30)
    expect(CHAMBERS * 2).toBeLessThanOrEqual(48)
  })

  /*
   * 深浅：谷到峰 / 该处半宽。
   * 变异：GROOVE = 0.012 → 下限红（光板）；GROOVE = 0.15 → 上限红（瓦楞 / 潮虫壳）
   */
  it('招牌一之二：分节纹深浅适中 —— 看得出，又不成瓦楞', () => {
    const rel: number[] = []
    for (const gi of grooveIdx) {
      const nextPeak = bulgeIdx.find((b) => b > gi)
      if (nextPeak === undefined) continue
      rel.push((sideZ[nextPeak] - sideZ[gi]) / sideZ[nextPeak])
    }
    expect(rel.length).toBeGreaterThanOrEqual(10)
    expect(median(rel), '分节纹太浅，侧面读成一块光板').toBeGreaterThan(0.025)
    expect(median(rel), '分节纹太深，读成瓦楞板 / 潮虫壳').toBeLessThan(0.1)
  })

  /*
   * 圆过去的起伏，不是锐坎：从谷底到下一个峰顶要跨 ≥3 个纵向采样。
   * 变异：groove() 换成锯齿 `c - Math.floor(c) < 0.1 ? 1 : 0`（一道窄槽）→ 红
   */
  it('招牌一之三：分节纹是软起伏，不是一道道锐坎', () => {
    const flanks: number[] = []
    for (const gi of grooveIdx) {
      const nextPeak = bulgeIdx.find((b) => b > gi)
      if (nextPeak !== undefined) flanks.push(nextPeak - gi)
    }
    expect(median(flanks)).toBeGreaterThanOrEqual(3)
  })

  /*
   * 不等距：等距是「机器压出来的」最强信号。
   * 变异：CHAMBER_WOBBLE = 0 → 下限红；CHAMBER_WOBBLE = 0.6 → 上限红
   */
  it('招牌一之四：分节纹间距有缓变，不是尺子量出来的', () => {
    const xs = grooveIdx.map((i) => sideMid[i].x)
    const gaps = xs.slice(1).map((x, i) => Math.abs(x - xs[i]))
    const spread = Math.max(...gaps) / Math.min(...gaps)
    expect(spread, '分节纹严格等距').toBeGreaterThan(1.08)
    expect(spread, '间距乱到没有节奏').toBeLessThan(1.8)
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length
    expect(mean / frame, '分节纹挤成一团，屏幕上数不出').toBeGreaterThan(0.03)
  })

  /*
   * 分节纹向接缝脊淡出：顶视看到的是一道纵脊，不是一圈圈横箍（潮虫背）。
   * 量 φ≈19° 那一列的起伏幅度，对侧壁正中那一列。
   * 变异：grooveWeight() 恒返回 1 → 红
   */
  it('分节纹只在侧壁上深，向顶上的接缝脊淡出', () => {
    const amp = (pts: THREE.Vector3[]) => {
      const zs = pts.filter((p) => Math.abs(p.x - shellBox.getCenter(new THREE.Vector3()).x) < shellSize.x * 0.3).map((p) => Math.abs(p.z))
      const mins = extrema(zs, 'min').map((i) => zs[i])
      const maxs = extrema(zs, 'max').map((i) => zs[i])
      return (median(maxs) - median(mins)) / median(maxs)
    }
    const high = amp(column(3))
    const mid = amp(side)
    expect(high / mid, '分节纹一直延伸到脊上，顶视会读成一圈圈横箍').toBeLessThan(0.35)
  })

  /*
   * 分节纹同时是体壁的颜色区：沟底顶点色压暗一档（不是贴在壳上的深色环）。
   * 变异：GROOVE_DARKEN = 0 → 红（没压暗）；= 0.7 → 红（藤编篮）
   */
  it('沟底是体壁本身暗一档的颜色区，而且暗在沟里、不暗在峰上', () => {
    const col = shell.geometry.getAttribute('color')
    expect(col, '壳体没有顶点色').toBeDefined()
    expect((shell.material as THREE.MeshPhysicalMaterial).vertexColors, '材质没开 vertexColors，顶点色不生效').toBe(true)
    let lo = Infinity
    for (let i = 0; i < col.count; i++) lo = Math.min(lo, col.getX(i))
    expect(lo, '沟底一点都没压暗').toBeLessThan(0.85)
    expect(lo, '沟底压得太暗，十几道深线把卵鞘读成藤编').toBeGreaterThan(0.6)
    // 暗的必须是沟：侧壁列上，沟底的顶点色低于峰顶
    const j = SHELL_RADIAL / 4
    const idxMid = side.map((_, i) => i).filter((i) => Math.abs(side[i].x - shellBox.getCenter(new THREE.Vector3()).x) < shellSize.x * 0.42)
    const cAt = (k: number) => col.getX(idxMid[k] * cols + j)
    const gC = median(grooveIdx.map(cAt))
    const bC = median(bulgeIdx.map(cAt))
    expect(gC, '顶点色暗在峰上而不是沟里').toBeLessThan(bC - 0.1)
  })

  const keelBox = boxOf([keel])
  const keelSize = keelBox.getSize(new THREE.Vector3())

  /*
   * 招牌二：接缝脊。
   * 变异：KEEL_RZ = 0.08 → 宽比红；KEEL_SINK = 0.1（整条埋进壳里）→ 探出量红；
   *      KEEL_U0/U1 = 0.3/0.7 → 纵贯比红
   */
  it('招牌二：一道纵贯顶上的窄脊，居中、真的探出壳顶', () => {
    expect(keelSize.x / shellSize.x, '脊要纵贯全长').toBeGreaterThan(0.85)
    expect(keelSize.z / shellSize.z, '脊太宽，成了顶上一块板').toBeLessThan(0.25)
    expect(Math.abs(keelBox.getCenter(new THREE.Vector3()).z)).toBeLessThan(0.005)
    const rise = keelBox.max.y - shellBox.max.y
    expect(rise, '脊整条埋在壳顶以下').toBeGreaterThan(0.01)
    expect(rise, '脊探出太高，成了一片背鳍').toBeLessThan(0.06)
    expect(rise / frame, '脊在画面上要看得见').toBeGreaterThan(0.02)
  })

  /** 脊顶轮廓：放样每一环的第 0 个顶点就是脊顶（环向角 0 = +Y） */
  const keelTop = (() => {
    const ring = KEEL_RADIAL + 1
    const rings = Math.floor(keel.geometry.getAttribute('position').count / ring)
    return Array.from({ length: rings }, (_, r) => vert(keel, r * ring))
  })()
  const toothIdx = extrema(
    keelTop.map((p) => p.y),
    'max',
  ).filter((i) => Math.abs(keelTop[i].x - keelBox.getCenter(new THREE.Vector3()).x) < keelSize.x * 0.45)

  /*
   * 锯齿：齿数与卵室数对得上，齿高适中。
   * 变异：TOOTH = 0 → 齿数红；TOOTH = 0.05 → 探出量上限红（上一条）
   */
  it('招牌二之二：脊顶是一排小齿，一室一齿', () => {
    expect(toothIdx.length, `脊上数到 ${toothIdx.length} 枚齿`).toBeGreaterThanOrEqual(CHAMBERS - 3)
    expect(toothIdx.length).toBeLessThanOrEqual(CHAMBERS + 1)
    // 逐齿量「齿尖 − 紧随其后的齿间谷」，不量整条脊的最高最低（那会把壳顶的纵向微弯也算进去）
    const ys = keelTop.map((p) => p.y)
    const valleys = extrema(ys, 'min')
    const relief: number[] = []
    for (const i of toothIdx) {
      const v = valleys.find((k) => k > i)
      if (v !== undefined) relief.push(ys[i] - ys[v])
    }
    expect(median(relief), '齿太低，脊是一根光棱').toBeGreaterThan(0.007)
    expect(median(relief), '齿太高，成了一排背鳍').toBeLessThan(0.025)
  })

  /*
   * 齿与分节纹一一对齐（它们是同一个卵室的两面）。量每枚齿到最近一道侧壁「鼓」的距离。
   * 变异：tooth() 相位错半室（c 换成 c+0.5 再取小数）→ 红
   */
  it('招牌二之三：脊上的齿与侧面的卵室对齐', () => {
    const bulgeX = bulgeIdx.map((i) => sideMid[i].x)
    const gx = grooveIdx.map((i) => sideMid[i].x)
    const spacing = Math.abs(gx[gx.length - 1] - gx[0]) / (gx.length - 1)
    const off = toothIdx.map((i) => Math.min(...bulgeX.map((bx) => Math.abs(bx - keelTop[i].x))))
    expect(median(off) / spacing, '齿落在卵室的交界上，而不是卵室上').toBeLessThan(0.2)
  })

  /*
   * 配色：有向。脊比壳深（深色收边），壳不许压成黑炭。
   * 变异：keelMat 改成与壳同色 → 红；shellMat 改 #3a2410 → 明度下限红；改 #e8d4b0 → 上限红
   */
  it('明度：接缝脊比壳面深一档，壳面是栗褐不是黑炭', () => {
    const s = hslOfMat(matsOf(shell)[0])
    const k = hslOfMat(matsOf(keel)[0])
    expect(k.l, '脊要比壳深 —— 浅贴浅会糊成一片').toBeLessThan(s.l - 0.12)
    expect(k.l, '脊压成了纯黑').toBeGreaterThan(0.2)
    expect(s.l).toBeGreaterThan(0.42)
    expect(s.l).toBeLessThan(0.62)
    expect(s.h, '色相落在栗褐区').toBeGreaterThan(18)
    expect(s.h).toBeLessThan(40)
    expect(s.s, '灰掉的话读成一块水泥').toBeGreaterThan(0.3)
  })
})

// ---------------------------------------------------------------- 若虫

describe('若虫：缩小版成虫 —— 没有翅、深色、背中一条浅带', () => {
  const trunk = meshesByName(nymph, 'trunk')[0]
  const pronotum = meshesByName(nymph, 'pronotum')[0]
  const head = meshesByName(nymph, 'head')[0]
  const trunkBox = boxOf([trunk])
  const headBox = boxOf([head])
  const bodyLen = headBox.max.x - trunkBox.min.x
  const frame = nymph.radius * 2

  const aHead = boxOf(meshesByName(adult, 'head'))
  const aTeg = boxOf(meshesByName(adult, 'tegmen'))
  const adultLen = aHead.max.x - aTeg.min.x

  it('找得到躯干、前胸背板、头', () => {
    expect(trunk).toBeDefined()
    expect(pronotum).toBeDefined()
    expect(head).toBeDefined()
  })

  // 变异：TRUNK_REAR = -0.9 → 上限红；TRUNK_REAR = -0.02（体长 ~0.37）→ 下限红
  it('中龄体长 5~7 毫米，约为成虫的 35~50%', () => {
    expect(bodyLen).toBeGreaterThan(0.5)
    expect(bodyLen).toBeLessThan(0.72)
    const rel = bodyLen / adultLen
    expect(rel, '若虫和成虫一样大了').toBeLessThan(0.5)
    expect(rel, '小得像刚孵出的一龄').toBeGreaterThan(0.33)
  })

  /*
   * 「缩小版成虫」第一条：同样的扁平体型（能钻缝）。
   * 变异：trunkH 全程抬到 0.15（圆管）→ 上限红；压到 0.012（纸片）→ 下限红
   */
  it('与成虫同样的扁平体型：躯干宽远大于高', () => {
    const s = trunkBox.getSize(new THREE.Vector3())
    const r = s.y / s.z
    expect(r, '躯干成了圆管 —— 蜚蠊是扁的').toBeLessThan(0.45)
    expect(r, '躯干扁成了纸片').toBeGreaterThan(0.2)
  })

  /*
   * 「缩小版成虫」第二条：头下口式，缩在前胸背板底下（成虫的同一构造）。
   * 变异：headTop 挪到 x 0.52（伸出背板前方）→ 红
   */
  it('与成虫同样：头缩在前胸背板前缘底下，背视只露一线', () => {
    const pBox = boxOf([pronotum])
    const hv = vertsOf(head)
    const under = hv.filter((p) => p.x <= pBox.max.x).length / hv.length
    expect(under, '头伸到了前胸背板之外 —— 那是蝗虫 / 蟋蟀的头').toBeGreaterThan(0.6)
    expect(headBox.max.y, '头顶高过了背板').toBeLessThan(pBox.max.y)
  })

  /*
   * 幼体比例：头相对更大。量头宽 / 体长，对成虫。
   * 变异：HEAD_R = 0.035 → 下限红；HEAD_R = 0.12 → 上限红
   */
  it('幼体比例：头相对体长比成虫大', () => {
    const nr = headBox.getSize(new THREE.Vector3()).z / bodyLen
    const ar = aHead.getSize(new THREE.Vector3()).z / adultLen
    expect(nr / ar, '头与成虫同比例，若虫的幼体感没了').toBeGreaterThan(1.3)
    expect(nr / ar, '头大得像一只大头娃娃').toBeLessThan(2.6)
  })

  /*
   * 「缩小版成虫」第三条：丝状长触角比身体还长。
   * 变异：ANTENNA_L = 0.6 → 下限红；= 1.4 → 上限红
   */
  it('与成虫同样：一对比身体还长的丝状触角', () => {
    const ants = meshesByName(nymph, 'antenna')
    expect(ants.length).toBe(2)
    for (const a of ants) {
      const L = arcLength(centerline(a, 8))
      expect(L / bodyLen, '触角比身体短了 —— 德国小蠊若虫的触角不短于体长').toBeGreaterThan(1.0)
      expect(L / bodyLen, '触角太长，取景被它撑大、身子缩成一个点').toBeLessThan(1.45)
    }
  })

  // 变异：删掉尾须 → 红；CERCUS_DIR 的 x 改正（朝前）→ 红
  it('与成虫同样：腹端一对分节尾须，朝后外方岔开', () => {
    const cs = meshesByName(nymph, 'cercus')
    expect(cs.length).toBe(2)
    for (const c of cs) {
      const line = centerline(c, 8)
      const d = line[line.length - 1].clone().sub(line[0])
      expect(d.x, '尾须要朝后').toBeLessThan(0)
      expect(line[0].x, '尾须长在腹端').toBeLessThan(trunkBox.min.x + 0.1)
    }
    const zs = cs.map((c) => boxOf([c]).getCenter(new THREE.Vector3()).z)
    expect(Math.sign(zs[0]) * Math.sign(zs[1]), '两条尾须要分在左右').toBe(-1)
  })

  /*
   * 与成虫的差别：没有翅。成虫的覆翅（tegmen）是盖住整个腹部的一片，
   * 若虫身上不许有同名件，也不许有任何盖在腹背上的「另一层」。
   * 变异：给若虫加一片名为 tegmen 的扁壳 → 红；同一片壳改名 cover → 红（第二段）
   */
  it('与成虫的差别：没有翅 —— 腹部背板直接露在外面', () => {
    expect(meshesByName(nymph, 'tegmen', 'wing', 'wing-pad')).toEqual([])
    /*
     * 腹部段的背中线上方不许有任何别的东西：取所有非躯干网格落在腹部 x 区间、
     * 且靠近中线（|z| < 躯干半宽的 60%）的顶点，最高点必须低于躯干顶。
     * 第一版只看「整个包围盒都落在腹部区间内」的网格，一片从胸部盖到腹端的壳
     * 因为包围盒伸进了胸部而被漏掉（变异测试实测漏过）。
     */
    const x0 = trunkBox.min.x + 0.03
    const x1 = trunkBox.max.x - 0.12
    const halfW = trunkBox.getSize(new THREE.Vector3()).z / 2
    let top = -Infinity
    nymph.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m === trunk) return
      for (const p of vertsOf(m)) {
        if (p.x > x0 && p.x < x1 && Math.abs(p.z) < halfW * 0.6) top = Math.max(top, p.y)
      }
    })
    expect(top, '腹部背上盖着别的东西').toBeLessThan(trunkBox.max.y)
  })

  /** 躯干侧缘（环向 90° 那一列）沿纵向的 |z| 轮廓 */
  const ring = TRUNK_RADIAL + 1
  const trunkRings = Math.floor(trunk.geometry.getAttribute('position').count / ring)
  const lateral = Array.from({ length: trunkRings }, (_, r) => vert(trunk, r * ring + TRUNK_RADIAL / 4))
  const latZ = lateral.map((p) => Math.abs(p.z))
  const latMax = extrema(latZ, 'max').filter((i) => i > 2 && i < trunkRings - 8)

  /*
   * 腹部背板一节节看得见（软起伏，不等距）。
   * 变异：TERGITE_RIPPLE = 0 → 节数 0 红；TERGITE_EDGES 改成等距 → 前后间距比红
   *
   * 「一块比一块短」量的是节间沟（侧缘的谷）的间距，前 3 个对后 3 个 —— 有向。
   * 不量「最大间距 / 最小间距」：中后胸背板后侧角那一点延出会在侧缘上多造一个鼓包，
   * 这个比值在背板改成等距之后照样 > 1.3（变异测试实测漏过一次，才换成现在这个量法）。
   */
  it('背板分节：侧缘数得出 8~10 块背板，且自前向后一块比一块短', () => {
    expect(latMax.length, `侧缘只数到 ${latMax.length} 块背板`).toBeGreaterThanOrEqual(8)
    expect(latMax.length).toBeLessThanOrEqual(11)
    const xs = extrema(latZ, 'min').map((i) => lateral[i].x)
    const gaps = xs.slice(1).map((x, i) => Math.abs(x - xs[i]))
    expect(gaps.length).toBeGreaterThanOrEqual(6)
    const front = (gaps[0] + gaps[1] + gaps[2]) / 3
    const n = gaps.length
    const rear = (gaps[n - 1] + gaps[n - 2] + gaps[n - 3]) / 3
    expect(front / rear, '背板前后一样长 —— 等距的一排节读成潮虫').toBeGreaterThan(1.15)
    expect(front / rear, '前后背板长短差得离谱').toBeLessThan(2.2)
  })

  // 变异：TERGITE_RIPPLE = 0.2 → 上限红（锯齿状外缘 / 潮虫壳）
  it('背板起伏是软的、浅的', () => {
    const rel: number[] = []
    const mins = extrema(latZ, 'min')
    for (const i of latMax) {
      const m = mins.find((k) => k > i)
      if (m !== undefined) rel.push((latZ[i] - latZ[m]) / latZ[i])
    }
    expect(median(rel), '背板起伏看不出').toBeGreaterThan(0.015)
    expect(median(rel), '背板外缘成了一排锯齿').toBeLessThan(0.13)
  })

  const bandTris = groupCentroids(trunk, 1)
  const trunkMats = matsOf(trunk)

  /*
   * 招牌：背中央一条浅色纵带，是躯干体壁本身的颜色区（同一张网格的一个材质分组）。
   * 变异：zoneOf 恒返回 0 → 分组空红；BAND_HALF_DEG 改 60 → 宽比红；
   *      躯干改回单一材质（浅带若另做成凸出体表的实体条就是这个样子）→ 红
   */
  it('招牌：浅色纵带是躯干体壁本身的颜色区，居中、窄、贯穿胸腹', () => {
    expect(trunkMats.length, '躯干不是分区网格 —— 浅带被做成了贴上去的实体').toBe(2)
    expect(bandTris.length, '浅带一个三角形都没有').toBeGreaterThan(100)
    // 居中且在背上
    const maxZ = Math.max(...bandTris.map((c) => Math.abs(c.z)))
    const trunkW = trunkBox.getSize(new THREE.Vector3()).z
    expect(maxZ * 2 / trunkW, '浅带太宽，成了半边身子').toBeLessThan(0.32)
    expect(maxZ * 2 / trunkW, '浅带细成一根线').toBeGreaterThan(0.12)
    expect((maxZ * 2) / frame, '浅带在画面上要看得见').toBeGreaterThan(0.03)
    const trunkMidY = trunkBox.getCenter(new THREE.Vector3()).y
    expect(bandTris.every((c) => c.y > trunkMidY), '浅带跑到了肚皮上').toBe(true)
    // 贯穿：从躯干前缘一直到腹部后段
    const bx = bandTris.map((c) => c.x)
    const span = (Math.max(...bx) - Math.min(...bx)) / trunkBox.getSize(new THREE.Vector3()).x
    expect(span, '浅带只有一截').toBeGreaterThan(0.7)
    expect(Math.max(...bx), '浅带没从胸部开始').toBeGreaterThan(trunkBox.max.x - 0.03)
  })

  // 变异：BAND_REAR_X = -0.4（一直到腹端）→ 红
  it('浅带在腹末前收掉，腹端是纯深色', () => {
    const minX = Math.min(...bandTris.map((c) => c.x))
    expect(minX - trunkBox.min.x, '浅带一直拉到了腹端').toBeGreaterThan(0.03)
  })

  /*
   * 前胸背板：成虫「前胸双纹」的雏形 —— 浅中带 | 左右各一条深纹 | 浅外缘。
   * 中带与躯干的浅带首尾相接，连成一条。
   * 变异：PRONOTUM_DARK_TO_DEG = 12（深纹消失）→ 深纹分组空红；
   *      zoneOf 里去掉 `a < BAND_HALF_DEG` 那支（中带没了）→ 红
   */
  it('前胸背板：浅中带 + 两条深纹 + 浅外缘，中带与躯干浅带连成一条', () => {
    const pMats = matsOf(pronotum)
    expect(pMats.length).toBe(3)
    const center = groupCentroids(pronotum, 1)
    const dark = groupCentroids(pronotum, 0)
    const margin = groupCentroids(pronotum, 2)
    expect(center.length).toBeGreaterThan(20)
    expect(dark.length).toBeGreaterThan(20)
    expect(margin.length).toBeGreaterThan(20)
    const pTop = boxOf([pronotum]).getCenter(new THREE.Vector3()).y
    const darkTop = dark.filter((c) => c.y > pTop)
    const zR = darkTop.filter((c) => c.z > 0)
    const zL = darkTop.filter((c) => c.z < 0)
    expect(zR.length, '右侧那条深纹不见了').toBeGreaterThan(10)
    expect(zL.length, '左侧那条深纹不见了').toBeGreaterThan(10)
    const cMax = Math.max(...center.map((c) => Math.abs(c.z)))
    const dMean = darkTop.reduce((s, c) => s + Math.abs(c.z), 0) / darkTop.length
    const mTop = margin.filter((c) => c.y > pTop)
    const mMean = mTop.reduce((s, c) => s + Math.abs(c.z), 0) / Math.max(mTop.length, 1)
    expect(dMean, '深纹要在中带外侧').toBeGreaterThan(cMax)
    expect(mMean, '浅外缘要在深纹外侧').toBeGreaterThan(dMean)
    // 首尾相接：背板中带的后端与躯干浅带的前端在 x 上重叠或几乎相接
    const pMinX = Math.min(...center.map((c) => c.x))
    const tMaxX = Math.max(...bandTris.map((c) => c.x))
    expect(pMinX - tMaxX, '前胸中带与躯干浅带断开了').toBeLessThan(0.02)
  })

  /*
   * 颜色，一律有向。
   * 变异：bandMat 改 #6e4828（与体色同）→ 红；darkMat 改 #120a05（纯黑）→ 下限红；
   *      stripeMat 与 marginMat 对调 → 红；legMat 改 #3a2514 → 红
   */
  it('明度：浅带 ≫ 体色，体色深褐但不是纯黑；前胸深纹深于浅外缘；足浅于身体', () => {
    const dark = hslOfMat(trunkMats[0])
    const band = hslOfMat(trunkMats[1])
    expect(band.l, '浅带必须远浅于体色').toBeGreaterThan(dark.l + 0.35)
    expect(band.l, '浅带要真的浅').toBeGreaterThan(0.65)
    expect(dark.l, '体色压成了纯黑，ACES 之后连形都读不出').toBeGreaterThan(0.2)
    expect(dark.l, '体色太浅 —— 若虫是深褐近黑的').toBeLessThan(0.36)
    const [pStripe, pCenter, pMargin] = matsOf(pronotum).map(hslOfMat)
    expect(pStripe.l, '前胸深纹要深于浅外缘').toBeLessThan(pMargin.l - 0.3)
    expect(pStripe.l, '前胸深纹要深于中带').toBeLessThan(pCenter.l - 0.3)
    const legMeshes = meshesByName(nymph, 'leg')
    expect(legMeshes.length, '足的网格没找到').toBeGreaterThan(12)
    const legL = hslOfMat(matsOf(legMeshes[0])[0]).l
    expect(legL, '足要比身体浅，六条腿才从深色的身子上跳出来').toBeGreaterThan(dark.l + 0.1)
  })
})
