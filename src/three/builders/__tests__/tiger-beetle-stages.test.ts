/**
 * 中华虎甲生活史三阶段（卵 / 幼虫 / 蛹）的形态验证。
 *
 * 写每一条断言之前的自检只有一句：**把实现改坏，这条会不会红？**
 * 阈值都是先量后定的，每条都做过变异测试（改坏对应的常量/部件、确认变红、再还原），
 * 变异表见提交说明。
 *
 * 照抄 `ladybird-stages.test.ts` 的两条纪律：
 * 1. 「大小」类断言一律上下限齐给。
 * 2. 「看得见」类断言换算成占画面的比例，或量它**真的凸出来 / 真的挨着 / 真的在那儿**。
 *
 * 这一只多出来的两条：
 * 3. **锚点名不许与成虫 hotspot 同名。** 展台拿阶段模型的锚点名去配成虫的 hotspot 表，
 *    同名会把「镰刀状交叉如剪」这类成虫卡片贴到幼期身上。
 * 4. **不许开 translucent。** 天牛幼虫那一轮，长直体开了透射被渲成一块透镜，
 *    46 条断言全绿。这里直接查材质的 transmission。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildTigerBeetleEgg } from '../stages/tiger-beetle-egg'
import { buildTigerBeetleLarva } from '../stages/tiger-beetle-larva'
import { buildTigerBeetlePupa } from '../stages/tiger-beetle-pupa'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000
/** 展台打开时的相机方向（右侧前上方） */
const HOME_VIEW: [number, number, number] = [0.86, 0.44, 1.25]

/** 从某个方向看过去时，点在屏幕上的 (右, 上) 坐标 —— 「在屏幕上分不分得开」只能这么量 */
function screenOf(dir: [number, number, number], v: THREE.Vector3): [number, number] {
  const d = new THREE.Vector3(...dir).normalize()
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), d).normalize()
  const up = new THREE.Vector3().crossVectors(d, right).normalize()
  return [v.dot(right), v.dot(up)]
}
/** 成虫 tiger-beetle.ts 的锚点名 = 数据层 hotspot.anchor */
const ADULT_ANCHORS = ['mandible', 'elytra', 'eye', 'leg', 'antenna', 'pronotum']

const egg = buildTigerBeetleEgg()
const larva = buildTigerBeetleLarva()
const pupa = buildTigerBeetlePupa()

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

function allMeshes(model: InsectModel): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry) out.push(m)
  })
  return out
}

function boxOf(objs: THREE.Object3D[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const m of objs) box.union(new THREE.Box3().setFromObject(m))
  return box
}
function sizeOf(objs: THREE.Object3D[]): THREE.Vector3 {
  return boxOf(objs).getSize(new THREE.Vector3())
}
function centerOf(objs: THREE.Object3D[]): THREE.Vector3 {
  return boxOf(objs).getCenter(new THREE.Vector3())
}

function vertsOf(meshes: THREE.Mesh[]): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (const mesh of meshes) {
    const pos = mesh.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
    }
  }
  return out
}

function matOf(mesh: THREE.Mesh): THREE.MeshPhysicalMaterial {
  return (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
}

/** 材质基色的 HSL。必须显式 sRGB —— 缺省拿到的是线性明度，深色会被压扁 */
function hslOf(mesh: THREE.Mesh): { h: number; s: number; l: number } {
  const hsl = { h: 0, s: 0, l: 0 }
  matOf(mesh).color.getHSL(hsl, THREE.SRGBColorSpace)
  return { h: hsl.h * 360, s: hsl.s, l: hsl.l }
}
function hslByName(model: InsectModel, name: string) {
  const m = meshesByName(model, name)[0]
  expect(m, `找不到名为 ${name} 的网格`).toBeDefined()
  return hslOf(m)
}

function inspect(model: InsectModel): { triangles: number; nan: number; meshes: number } {
  let triangles = 0
  let nan = 0
  let meshes = 0
  for (const m of allMeshes(model)) {
    meshes++
    const pos = m.geometry.getAttribute('position')
    triangles += m.geometry.index ? m.geometry.index.count / 3 : pos.count / 3
    const arr = pos.array
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) nan++
  }
  return { triangles, nan, meshes }
}

/** 锚点离实体多远（占包围半径的比例）。算法同 anchors-have-geometry.test.ts */
function detachRatio(model: InsectModel, anchor: THREE.Vector3): number {
  const v = new THREE.Vector3()
  let best = Infinity
  for (const mesh of allMeshes(model)) {
    best = Math.min(best, new THREE.Box3().setFromObject(mesh).distanceToPoint(anchor))
    const pos = mesh.geometry.getAttribute('position')
    const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld)
      best = Math.min(best, v.distanceTo(anchor))
    }
  }
  return best / Math.max(model.radius, 1e-6)
}

/** 顶点云的主轴（协方差最大特征向量，幂迭代） */
function principalAxis(verts: THREE.Vector3[]): THREE.Vector3 {
  const c = new THREE.Vector3()
  for (const v of verts) c.add(v)
  c.divideScalar(verts.length)
  let xx = 0
  let xy = 0
  let xz = 0
  let yy = 0
  let yz = 0
  let zz = 0
  for (const v of verts) {
    const dx = v.x - c.x
    const dy = v.y - c.y
    const dz = v.z - c.z
    xx += dx * dx
    xy += dx * dy
    xz += dx * dz
    yy += dy * dy
    yz += dy * dz
    zz += dz * dz
  }
  let a = new THREE.Vector3(1, 0.3, 0.1).normalize()
  for (let i = 0; i < 80; i++) {
    const n = new THREE.Vector3(
      xx * a.x + xy * a.y + xz * a.z,
      xy * a.x + yy * a.y + yz * a.z,
      xz * a.x + yz * a.y + zz * a.z,
    )
    if (n.lengthSq() < 1e-20) break
    a = n.normalize()
  }
  return a
}

/** 一根管状件沿主轴的长度与垂直于主轴的最大粗细 */
function tubeShape(mesh: THREE.Mesh): { len: number; thick: number; axis: THREE.Vector3 } {
  const vs = vertsOf([mesh])
  const c = new THREE.Vector3()
  for (const v of vs) c.add(v)
  c.divideScalar(vs.length)
  const dir = principalAxis(vs)
  const proj = vs.map((v) => v.dot(dir))
  let thick = 0
  for (const v of vs) {
    const d = v.clone().sub(c)
    thick = Math.max(thick, d.addScaledVector(dir, -d.dot(dir)).length())
  }
  return { len: Math.max(...proj) - Math.min(...proj), thick: 2 * thick, axis: dir }
}

/** 两组顶点之间的最短距离 */
function minGapVerts(va: THREE.Vector3[], vb: THREE.Vector3[]): number {
  let best = Infinity
  for (const p of va) for (const q of vb) best = Math.min(best, p.distanceToSquared(q))
  return Math.sqrt(best)
}

// ---------------------------------------------------------------- 通规

describe('三个阶段的通用契约', () => {
  const all: [string, InsectModel][] = [
    ['卵', egg],
    ['幼虫', larva],
    ['蛹', pupa],
  ]

  it.each(all)('%s：有实体、无 NaN、面数在预算内', (_name, model) => {
    const { triangles, nan, meshes } = inspect(model)
    expect(meshes).toBeGreaterThan(0)
    expect(nan, 'NaN/Inf 顶点会让整个模型静默变成空白').toBe(0)
    expect(triangles).toBeGreaterThan(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(all)('%s：尺度落在昆虫量级里（stages.test.ts 的硬门槛）', (_name, model) => {
    expect(model.radius).toBeGreaterThan(0.02)
    expect(model.radius).toBeLessThan(12)
  })

  it.each(all)('%s：每个锚点底下都真有几何体，没有指着空气的', (_name, model) => {
    const entries = Object.entries(model.anchors)
    expect(entries.length).toBeGreaterThanOrEqual(3)
    const floating: string[] = []
    for (const [name, a] of entries) {
      expect(Number.isFinite(a.x) && Number.isFinite(a.y) && Number.isFinite(a.z), `anchor ${name} 非有限`).toBe(true)
      const ratio = detachRatio(model, a)
      if (!(ratio <= 0.12)) floating.push(`${name}（离实体 ${ratio.toFixed(2)}×半径）`)
    }
    expect(floating, `这些标注点浮在空气里：${floating.join('、')}`).toEqual([])
  })

  it.each(all)('%s：锚点名不与成虫 hotspot 重名（否则成虫卡片会贴到幼期身上）', (_name, model) => {
    const clash = Object.keys(model.anchors).filter((k) => ADULT_ANCHORS.includes(k))
    expect(clash, `这些锚点名与成虫撞了：${clash.join('、')}`).toEqual([])
  })

  it.each(all)('%s：没有任何材质开透射（长直体开 translucent 会被渲成一块透镜）', (_name, model) => {
    const glassy = allMeshes(model).filter((m) => (matOf(m).transmission ?? 0) > 0)
    expect(glassy.map((m) => m.name)).toEqual([])
  })
})

// ---------------------------------------------------------------- 卵

describe('卵：沙坑里单独一粒', () => {
  const shells = meshesByName(egg, 'egg-shell')
  const sand = meshesByName(egg, 'sand')
  const grains = meshesByName(egg, 'sand-grain')
  const shellVerts = vertsOf(shells)
  const eggBox = boxOf(shells)
  const eggC = eggBox.getCenter(new THREE.Vector3())
  const sandVerts = vertsOf(sand)

  /** 卵正下方的坑底高度：卵心水平 0.02 以内、卵底以下 0.05 以内的沙面最高点 */
  const pitFloor = Math.max(
    ...sandVerts.filter((v) => Math.hypot(v.x - eggC.x, v.z - eggC.z) < 0.02 && v.y > eggBox.min.y - 0.05).map((v) => v.y),
  )

  it('一坑一粒：整个模型里只有一粒卵', () => {
    // 虎甲的招牌是「单产」，做成瓢虫那样一簇这条就红
    expect(shells).toHaveLength(1)
  })

  it('长约 1.9 毫米的长椭圆，横卧（不是立着的）', () => {
    const { len, thick, axis } = tubeShape(shells[0])
    // 实测 len 0.190、thick 0.085
    expect(len).toBeGreaterThan(0.16)
    expect(len).toBeLessThan(0.22)
    expect(thick).toBeGreaterThan(0.07)
    expect(thick).toBeLessThan(0.1)
    expect(len / thick, '长椭圆：做成球这条红').toBeGreaterThan(1.8)
    expect(len / thick).toBeLessThan(2.8)
    expect(Math.abs(axis.y), '卵轴要水平，卧在坑底').toBeLessThan(0.2)
  })

  it('卵是画面的主角：卵长占画面直径两成以上', () => {
    // 实测 0.26。沙面一撑大，卵就缩成一个点（帝王蝶卵的教训）
    const { len } = tubeShape(shells[0])
    expect(len / (2 * egg.radius)).toBeGreaterThan(0.22)
    expect(len / (2 * egg.radius)).toBeLessThan(0.6)
  })

  it('卵下有一个坑：坑底比周围沙面低', () => {
    const ring = sandVerts
      .filter((v) => {
        const d = Math.hypot(v.x - eggC.x, v.z - eggC.z)
        return d > 0.17 && d < 0.19 && v.y > eggBox.min.y - 0.03
      })
      .map((v) => v.y)
      .sort((a, b) => a - b)
    const ringMid = ring[Math.floor(ring.length / 2)]
    // 实测低 0.008。把坑填平（PIT_DEPTH=0）这条红
    expect(ringMid - pitFloor, '坑没了 —— 卵成了摆在平沙面上的一粒米').toBeGreaterThan(0.004)
    expect(ringMid - pitFloor).toBeLessThan(0.04)
  })

  it('卵下截陷进沙里，但大半露在外面', () => {
    // 实测陷进 0.0095、露出 0.077（卵高 0.085）
    expect(pitFloor - eggBox.min.y, '卵悬在沙面上 —— 没陷进去').toBeGreaterThan(0.003)
    expect(pitFloor - eggBox.min.y, '卵埋得太深，读成沙面上的一个白洞').toBeLessThan(0.03)
    expect(eggBox.max.y - pitFloor).toBeGreaterThan(0.055)
  })

  it('乳白对暖沙：明度差拉得开', () => {
    const e = hslByName(egg, 'egg-shell')
    const s = hslByName(egg, 'sand')
    expect(e.l, '乳白压深就是脏灰').toBeGreaterThan(0.85)
    // 高明度下 HSL 的 S 会被放大（#f4eedd 的 S 是 0.51），量彩度 C = S·(1−|2L−1|)：
    // 实测 0.09。换成奶黄 #f2d98a（C 0.4）这条红
    expect(e.s * (1 - Math.abs(2 * e.l - 1)), '卵是乳白，不是奶黄').toBeLessThan(0.15)
    expect(s.l).toBeGreaterThan(0.5)
    expect(s.l).toBeLessThan(0.72)
    expect(e.l - s.l, '白卵要从沙里跳出来').toBeGreaterThan(0.2)
  })

  it('沙粒按真实粒径散布，且不压在卵上', () => {
    // 实测 130 粒
    expect(grains.length).toBeGreaterThanOrEqual(60)
    expect(grains.length).toBeLessThanOrEqual(220)
    for (const g of grains) {
      const d = Math.max(...sizeOf([g]).toArray())
      // 细沙到中沙 0.1~0.5 毫米
      expect(d).toBeGreaterThan(0.005)
      // 上限按包围盒量：压扁再随机滚转的多面体，盒边比粒径大两成（实测最大 0.058）
      expect(d, '沙粒长成了石子').toBeLessThan(0.065)
    }
    expect(minGapVerts(vertsOf(grains), shellVerts), '有沙粒压在卵上').toBeGreaterThan(0.005)
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫：堵在洞口的深色盘子 + 吊在洞里的苍白身子', () => {
  const body = meshesByName(larva, 'larva-body')
  const shield = meshesByName(larva, 'head-shield')
  const collar = meshesByName(larva, 'burrow-collar')
  const jaws = meshesByName(larva, 'larva-jaw')
  const stemmata = meshesByName(larva, 'stemma')
  const hooks = meshesByName(larva, 'hump-hook')
  const legs = meshesByName(larva, 'larva-leg')
  const bodyVerts = vertsOf(body)
  const bodyBox = boxOf(body)
  const shieldBox = boxOf(shield)
  const shieldC = shieldBox.getCenter(new THREE.Vector3())
  const hump = larva.anchors.hookHump
  const shieldVerts = vertsOf(shield)

  /*
   * 幼虫整只绕竖轴转过一个角（为了让驼峰对着展台默认机位），所以不能拿世界 X/Z 量。
   * 头的朝向 f 从几何本身求：盘子顶点云的主轴、压到水平面、指向颚的那一头。
   * 侧向 w = f × 上。身子吊下去之后背面朝 −f。
   */
  const f = principalAxis(shieldVerts).setY(0).normalize()
  if (centerOf(jaws).sub(shieldC).dot(f) < 0) f.negate()
  const w = new THREE.Vector3().crossVectors(f, new THREE.Vector3(0, 1, 0)).normalize()
  const along = (v: THREE.Vector3) => v.dot(f)
  const lateral = (v: THREE.Vector3) => v.dot(w)
  const extent = (vs: THREE.Vector3[], g: (v: THREE.Vector3) => number) => {
    const p = vs.map(g)
    return Math.max(...p) - Math.min(...p)
  }

  /** 虫身在高度 y 处的水平切片：沿 f 的背侧（小）与腹侧（大）边 */
  function slab(y: number): { xmin: number; xmax: number } {
    const xs = bodyVerts.filter((v) => Math.abs(v.y - y) < 0.03).map(along)
    return { xmin: Math.min(...xs), xmax: Math.max(...xs) }
  }

  it('盘子是平的、横着的，在全身最上面', () => {
    // 实测 长 0.78 × 厚 0.18 × 宽 0.54
    const len = extent(shieldVerts, along)
    const wid = extent(shieldVerts, lateral)
    expect(len).toBeGreaterThan(0.6)
    expect(len).toBeLessThan(1.0)
    expect(wid).toBeGreaterThan(0.44)
    expect(wid).toBeLessThan(0.66)
    expect(sizeOf(shield).y / len, '盘子必须扁平：竖起来就堵不住洞口').toBeLessThan(0.3)
    expect(shieldBox.max.y, '虫身冒到盘子上面去了').toBeGreaterThanOrEqual(bodyBox.max.y)
  })

  it('盘子比吊着的身子宽得多（它是个盖子）', () => {
    // 实测 0.54 / 0.34 = 1.57
    expect(extent(shieldVerts, lateral) / extent(bodyVerts, lateral)).toBeGreaterThan(1.35)
  })

  it('身子竖直吊在洞里：向下垂 1.2~2.2 厘米', () => {
    // 实测 1.61。做成平躺的一条虫这条红
    const drop = shieldBox.min.y - bodyBox.min.y
    expect(drop).toBeGreaterThan(1.2)
    expect(drop).toBeLessThan(2.2)
  })

  it('深色金属盘对苍白虫身：明度差 ≥ 0.45，但盘不压到近黑', () => {
    const s = hslByName(larva, 'head-shield')
    const b = hslByName(larva, 'larva-body')
    expect(b.l, '虫身要苍白').toBeGreaterThan(0.8)
    expect(s.l, '盘子压到近黑，体积与金属光泽一起没了').toBeGreaterThan(0.2)
    expect(s.l).toBeLessThan(0.42)
    expect(b.l - s.l).toBeGreaterThan(0.45)
    // 盘有金属感，但掠射机位下不许反成一条银白带（实测 0.3 / 镜面 0.3）
    expect(matOf(shield[0]).metalness).toBeGreaterThan(0.1)
    expect(matOf(shield[0]).metalness).toBeLessThan(0.5)
  })

  it('盘子堵满洞口：沙面略低于盘顶、贴着盘缘、不盖到盘上', () => {
    const collarBox = boxOf(collar)
    // 沙面比盘顶低 0.03（实测 0.03）
    expect(shieldBox.max.y - collarBox.max.y).toBeGreaterThan(0.01)
    expect(shieldBox.max.y - collarBox.max.y).toBeLessThan(0.08)
    /*
     * 洞口与盘缘之间只有一道窄缝。沿盘子的长轴逐段量「盘缘 → 最近的沙」的水平缝宽，
     * 取最宽的那一段：只量全局最近距离的话，洞整圈放大 0.1 也总有一处角落挨得近
     * （变异测试撞出来的）。实测最宽 0.04
     */
    const cv = vertsOf(collar)
    const sv = shieldVerts
    const u0 = Math.min(...sv.map(along))
    const u1 = Math.max(...sv.map(along))
    let worst = 0
    for (let u = u0 + 0.15; u <= u1 - 0.15; u += 0.05) {
      const edge = Math.max(...sv.filter((v) => Math.abs(along(v) - u) < 0.02).map(lateral))
      const sandW = cv.filter((v) => Math.abs(along(v) - u) < 0.02 && lateral(v) > edge).map(lateral)
      worst = Math.max(worst, Math.min(...sandW) - edge)
    }
    expect(worst, '洞比盘子大一圈 —— 洞口没堵住').toBeLessThan(0.07)
    /*
     * 盘子中部那一片的正上方不许有沙（没挖洞就会红）。中心取盘子顶点的**质心**，
     * 不取包围盒中心：盘子绕竖轴转过之后，轴对齐包围盒的中心会偏出去 0.03，
     * 这一片的边正好蹭到洞沿（转角从 50° 改 60° 时撞出来的假红）
     */
    const sc = sv.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(sv.length)
    const onTop = cv.filter(
      (v) => Math.abs(along(v) - along(sc)) < 0.3 && Math.abs(lateral(v) - lateral(sc)) < 0.18 && v.y > shieldBox.min.y,
    )
    expect(onTop.length, '沙面盖住了盘子').toBe(0)
  })

  it('上颚大、向上弯，翘出盘面之上', () => {
    // 2 支颚 + 2 枚基齿；按长度取两支主颚
    expect(jaws.length).toBe(4)
    const main = jaws.map((m) => ({ m, ...tubeShape(m) })).sort((a, b) => b.len - a.len).slice(0, 2)
    for (const j of main) {
      // 实测 0.33
      expect(j.len).toBeGreaterThan(0.24)
      expect(j.len).toBeLessThan(0.46)
      // 向上弯：颚尖高出盘顶。做成平伸的一对钳这条红
      expect(boxOf([j.m]).max.y - shieldBox.max.y, '颚没有向上翻').toBeGreaterThan(0.12)
      expect(boxOf([j.m]).max.y - shieldBox.max.y).toBeLessThan(0.45)
    }
    expect(Math.max(...vertsOf(jaws).map(along)), '颚要在头的前方').toBeGreaterThan(Math.max(...shieldVerts.map(along)))
  })

  it('头顶单眼：每侧 4 枚、两大两小，大的长在盘面顶上', () => {
    expect(stemmata).toHaveLength(8)
    const right = stemmata.filter((m) => lateral(centerOf([m])) > lateral(shieldC))
    expect(right.length * 2).toBe(stemmata.length)
    const d = stemmata.map((m) => sizeOf([m]).x).sort((a, b) => b - a)
    // 背面两对特别大（实测 0.072 / 0.030）
    expect(d[3], '最大的两对不够大').toBeGreaterThan(0.055)
    expect(d[0] / d[7], '大小单眼分不出来').toBeGreaterThan(1.8)
    // 两对大单眼在头的背面（向上看天空）；小的在头侧，只要求没埋进头里
    const bySize = [...stemmata].sort((a, b) => sizeOf([b]).x - sizeOf([a]).x)
    for (const m of bySize.slice(0, 4)) {
      expect(centerOf([m]).y, '大单眼要长在盘面顶上，不是埋在头里').toBeGreaterThan(shieldBox.max.y - 0.05)
    }
    for (const m of bySize.slice(4)) expect(boxOf([m]).max.y).toBeGreaterThan(shieldBox.min.y + 0.05)
  })

  it('第 5 腹节背面的驼峰真的鼓出来', () => {
    /*
     * 身子在驼峰这一段接近竖直，水平切片≈横截面。驼峰高度 = 该切片的前后跨度
     * 减去上下各 0.3 处切片跨度的均值。实测 0.46 − 0.39 ≈ 0.07；
     * 把 HUMP_RISE 压成 0 时掉到 0.0x 以下，这条红。
     */
    const w = (y: number) => slab(y).xmax - slab(y).xmin
    const bump = w(hump.y) - (w(hump.y + 0.3) + w(hump.y - 0.3)) / 2
    expect(bump, '驼峰没鼓起来').toBeGreaterThan(0.04)
    expect(bump, '驼峰鼓成了一个瘤').toBeLessThan(0.25)
    /*
     * 鼓在背侧（−X）而不是腹侧。背缘外凸 D、腹缘外凸 V（各自相对上下 ±0.3 两个切片的
     * 连线）。S 形把两条边一起往 −X 推同一个量（D 加、V 减），驼峰只加在背缘上，
     * 所以 D − V = 2·S 偏移 + 驼峰（实测 0.15）；驼峰改长在腹侧时掉到 0 上下
     */
    const D = (slab(hump.y + 0.3).xmin + slab(hump.y - 0.3).xmin) / 2 - slab(hump.y).xmin
    const V = slab(hump.y).xmax - (slab(hump.y + 0.3).xmax + slab(hump.y - 0.3).xmax) / 2
    expect(D - V, '驼峰没有鼓在背侧').toBeGreaterThan(0.09)
    // 在背侧（−f）：盘子朝 f，身子折下来之后背面朝 −f
    expect(along(hump)).toBeLessThan((slab(hump.y).xmin + slab(hump.y).xmax) / 2)
  })

  it('S 形：驼峰那一段是全身最往背侧顶出去的地方', () => {
    // 看腹侧边（不受驼峰影响）。实测驼峰处 0.21，上方 0.35 处 0.28、下方 0.45 处 0.33
    const here = slab(hump.y).xmax
    expect(slab(hump.y + 0.35).xmax - here, '上方没有偏向腹侧').toBeGreaterThan(0.03)
    expect(slab(hump.y - 0.45).xmax - here, '下方没有偏向腹侧').toBeGreaterThan(0.03)
  })

  it('驼峰上两对钩刺：长在驼峰上、朝头（向上）弯、深色', () => {
    expect(hooks).toHaveLength(4)
    const right = hooks.filter((m) => lateral(centerOf([m])) > lateral(shieldC))
    expect(right.length * 2).toBe(hooks.length)
    const lens = hooks.map((m) => tubeShape(m).len).sort((a, b) => b - a)
    // 内侧一对大（实测 0.2）、外侧一对小（0.12）
    expect(lens[0]).toBeGreaterThan(0.12)
    expect(lens[0]).toBeLessThan(0.32)
    expect(lens[3]).toBeGreaterThan(0.06)
    expect(lens[0] / lens[3], '两对钩一样大').toBeGreaterThan(1.25)
    for (const h of hooks) {
      const hv = vertsOf([h])
      // 根部贴着驼峰（不是浮在身边的一根刺）
      expect(minGapVerts(hv, bodyVerts), '钩刺没长在身上').toBeLessThan(0.02)
      expect(centerOf([h]).distanceTo(hump), '钩刺不在驼峰上').toBeLessThan(0.2)
      /*
       * 朝头弯：钩尖比钩根高（头在上）。钩根取「离体壁最近」的顶点，钩尖取离钩根最远的
       * 顶点 —— 第一版拿最低点当钩根，钩改成朝尾弯时最低点恰好就是钩尖，这条照样绿
       * （变异测试撞出来的）
       */
      const near = bodyVerts.filter((b) => b.distanceTo(hump) < 0.35)
      const dist = (v: THREE.Vector3) => Math.min(...near.map((b) => b.distanceToSquared(v)))
      const base = hv.reduce((a, v) => (dist(v) < dist(a) ? v : a), hv[0])
      const tip = hv.reduce((a, v) => (v.distanceTo(base) > a.distanceTo(base) ? v : a), hv[0])
      expect(tip.y - base.y, '钩尖没有朝头的方向').toBeGreaterThan(0.05)
    }
    const k = hslByName(larva, 'hump-hook')
    const b = hslByName(larva, 'larva-body')
    expect(b.l - k.l, '钩刺在苍白驼峰上看不出来').toBeGreaterThan(0.4)
  })

  it('展台默认机位（右前上方）斜对着驼峰，头盘也朝上看得见', () => {
    /*
     * 展台打开时相机在 HOME 方向。驼峰长在背面（−f），头正朝 +X 时它整个背对镜头，
     * 只剩钩尖从剪影边上露出来 —— 这是补渲 home 机位时才看到的，于是整只虫绕竖轴
     * 转了 60°（50° 时只有 0.27，驼峰仍是斜着擦过去）。这里量「背面朝向」与 home
     * 方向（水平分量）的夹角余弦：实测 0.43；转角改回 0 时是 −0.57，这条红。
     */
    const home = new THREE.Vector3(...HOME_VIEW).setY(0).normalize()
    expect(f.clone().negate().dot(home), '驼峰背对展台默认机位').toBeGreaterThan(0.3)
  })

  it('三对胸足，全在驼峰之上的胸部', () => {
    // 每条 3 节 + 膝球 = 4 件，3 对 = 24
    expect(legs).toHaveLength(24)
    expect(boxOf(legs).min.y, '足长到腹部去了').toBeGreaterThan(hump.y + 0.5)
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹：仰躺在背刺上的乳白离蛹', () => {
  const body = meshesByName(pupa, 'pupa-body')
  const processes = meshesByName(pupa, 'dorsal-process')
  const floor = meshesByName(pupa, 'chamber-floor')
  const eyes = meshesByName(pupa, 'pupa-eye')
  const jawBuds = meshesByName(pupa, 'pupa-jaw-bud')
  const legs = meshesByName(pupa, 'pupa-leg-segment')
  const pads = meshesByName(pupa, 'pupa-wing-pad')
  const antennae = meshesByName(pupa, 'pupa-antenna')
  const skin = meshesByName(pupa, 'larval-exuvia')
  const exShield = meshesByName(pupa, 'exuvia-shield')
  const bodyVerts = vertsOf(body)
  const bodyBox = boxOf(body)
  const bodyC = bodyBox.getCenter(new THREE.Vector3())
  const bodyLen = bodyBox.max.x - bodyBox.min.x
  const floorVerts = vertsOf(floor)
  /** 体长方向的相对位置：0 = 腹末，1 = 头前缘 */
  const rel = (x: number) => (x - bodyBox.min.x) / bodyLen

  /** 相对位置 [a,b] 内蛹体的最大左右宽 */
  function widthIn(a: number, b: number): number {
    const zs = bodyVerts.filter((v) => rel(v.x) >= a && rel(v.x) <= b).map((v) => v.z)
    return Math.max(...zs) - Math.min(...zs)
  }
  /** 室底在 (x,z) 附近的最高点 */
  function floorAt(x: number, z: number): number {
    return Math.max(...floorVerts.filter((v) => Math.hypot(v.x - x, v.z - z) < 0.06).map((v) => v.y))
  }

  it('体长 1.35~1.75 厘米、宽 0.42~0.62', () => {
    // 实测 1.54 × 0.54
    expect(bodyLen).toBeGreaterThan(1.35)
    expect(bodyLen).toBeLessThan(1.75)
    expect(bodyBox.max.z - bodyBox.min.z).toBeGreaterThan(0.42)
    expect(bodyBox.max.z - bodyBox.min.z).toBeLessThan(0.62)
  })

  it('成虫的比例已有雏形：头宽于前胸细腰', () => {
    // 实测头 0.44 / 腰 0.32
    expect(widthIn(0.86, 0.94) / widthIn(0.76, 0.82), '头不比前胸宽 —— 丢了虎甲的大头').toBeGreaterThan(1.15)
  })

  it('背刺：4 对、左右成对，是全身最低的点，把蛹体撑离室底', () => {
    expect(processes).toHaveLength(8)
    const right = processes.filter((m) => centerOf([m]).z > bodyC.z)
    expect(right.length * 2).toBe(processes.length)
    for (const p of processes) {
      // 实测 0.2
      const { len } = tubeShape(p)
      expect(len).toBeGreaterThan(0.14)
      expect(len).toBeLessThan(0.3)
    }
    const pBox = boxOf(processes)
    // 仰躺：刺在下面、比蛹体低出一截（实测 0.14）。刺删短或蛹翻回来这条红
    expect(bodyBox.min.y - pBox.min.y, '刺尖没有比蛹体低').toBeGreaterThan(0.08)
    expect(bodyBox.min.y - pBox.min.y).toBeLessThan(0.3)
    expect(centerOf(processes).y, '刺长在朝上的那一面 —— 蛹没仰躺').toBeLessThan(bodyC.y)
  })

  it('刺尖正落在室底上，蛹体悬空', () => {
    const pv = vertsOf(processes)
    const lowest = pv.reduce((a, v) => (v.y < a.y ? v : a), pv[0])
    const gap = lowest.y - floorAt(lowest.x, lowest.z)
    expect(gap, '刺尖扎进土里了').toBeGreaterThan(-0.02)
    expect(gap, '整只蛹悬在半空').toBeLessThan(0.02)
    // 蛹体最低点离室底有一道缝：这道缝就是背刺存在的理由
    const bl = bodyVerts.reduce((a, v) => (v.y < a.y ? v : a), bodyVerts[0])
    expect(bl.y - floorAt(bl.x, bl.z), '蛹体贴在室底上了').toBeGreaterThan(0.06)
  })

  it('仰躺：三对足、触角都翻在朝上的腹面', () => {
    expect(centerOf(legs).y, '足在下面 —— 蛹没翻过来').toBeGreaterThan(bodyC.y + 0.05)
    expect(centerOf(antennae).y).toBeGreaterThan(bodyC.y)
  })

  it('离蛹：足与触角离开体壁，不是体壁上的浅浮雕', () => {
    /*
     * 以蛹体的体轴（y=中心、z=中心的 X 向直线）为准，量每个附肢顶点离轴的距离，
     * 与同一 x 处蛹体截面的最大向径比较。实测 94% 的足顶点落在体壁之外；
     * 把足的净空压成 0 并埋进体壁（extra = −0.03）时掉到 50% 以下。
     */
    const cy = bodyC.y
    const cz = bodyC.z
    const radial = (v: THREE.Vector3) => Math.hypot(v.y - cy, v.z - cz)
    const wall = (x: number) => Math.max(...bodyVerts.filter((v) => Math.abs(v.x - x) < 0.02).map(radial))
    const lv = vertsOf([...legs, ...antennae]).filter((v) => v.x > bodyBox.min.x + 0.03 && v.x < bodyBox.max.x - 0.03)
    const outside = lv.filter((v) => radial(v) > wall(v.x)).length / lv.length
    expect(outside).toBeGreaterThan(0.8)
  })

  it('长足：后足跗节伸过腹末', () => {
    // 6 条 × 3 节
    expect(legs).toHaveLength(18)
    const tail = bodyBox.min.x
    expect(boxOf(legs).min.x, '足短得够不到腹末 —— 丢了「跑得最快」').toBeLessThan(tail)
    expect(boxOf(legs).min.x).toBeGreaterThan(tail - 0.25)
  })

  it('一对大复眼，已显色，在头端两侧', () => {
    expect(eyes).toHaveLength(2)
    for (const e of eyes) {
      const d = Math.max(...sizeOf([e]).toArray())
      // 实测 0.23
      expect(d).toBeGreaterThan(0.17)
      expect(d).toBeLessThan(0.3)
      expect(rel(centerOf([e]).x), '复眼不在头端').toBeGreaterThan(0.8)
    }
    expect(Math.sign(centerOf([eyes[0]]).z - bodyC.z)).toBe(-Math.sign(centerOf([eyes[1]]).z - bodyC.z))
    const e = hslByName(pupa, 'pupa-eye')
    const b = hslByName(pupa, 'pupa-body')
    expect(b.l - e.l, '乳白蛹上光靠隆起读不出眼').toBeGreaterThan(0.4)
  })

  it('镰刀状上颚芽：一对，伸在头前、中段外凸、两支分得开', () => {
    expect(jawBuds).toHaveLength(2)
    for (const j of jawBuds) {
      const b = boxOf([j])
      expect(b.max.x - bodyBox.max.x, '颚芽没伸出头前').toBeGreaterThan(0.1)
      expect(b.max.x - bodyBox.max.x).toBeLessThan(0.4)
      // 镰刀：最外凸处比尖端离中线远（先外凸、再内弯）
      const jv = vertsOf([j])
      const off = (v: THREE.Vector3) => Math.abs(v.z - bodyC.z)
      const tip = jv.reduce((a, v) => (v.x > a.x ? v : a), jv[0])
      expect(Math.max(...jv.map(off)) - off(tip), '颚芽是一根直棍，没有镰刀的弯').toBeGreaterThan(0.08)
    }
    // 两支之间有缝（尖端交叉的一对在侧面机位下叠成一根）
    expect(minGapVerts(vertsOf([jawBuds[0]]), vertsOf([jawBuds[1]])), '两支颚芽贴在一起').toBeGreaterThan(0.03)
  })

  it('展台默认机位下两支颚芽在屏幕上分得开（锹甲蛹叠成一根角的那个坑）', () => {
    /*
     * 把两支颚芽中段（沿 x 的中间 40%）投到 home 机位的屏幕上，量两团投影的最近距离。
     * 实测 0.055（外凸 ±0.19 那一版只有 0.038，出图也勉强）；改回尖端交叉的镰刀时
     * 两团投影重叠，这条红。
     */
    const mids = jawBuds.map((j) => {
      const jv = vertsOf([j])
      const x0 = Math.min(...jv.map((v) => v.x))
      const x1 = Math.max(...jv.map((v) => v.x))
      return jv.filter((v) => (v.x - x0) / (x1 - x0) > 0.3 && (v.x - x0) / (x1 - x0) < 0.7).map((v) => screenOf(HOME_VIEW, v))
    })
    let best = Infinity
    for (const a of mids[0]) for (const b of mids[1]) best = Math.min(best, Math.hypot(a[0] - b[0], a[1] - b[1]))
    expect(best, '两支颚芽在默认机位叠成一根').toBeGreaterThan(0.04)
  })

  it('翅芽一对，在体侧', () => {
    expect(pads).toHaveLength(2)
    expect(Math.sign(centerOf([pads[0]]).z - bodyC.z)).toBe(-Math.sign(centerOf([pads[1]]).z - bodyC.z))
  })

  it('乳白蛹体，附肢深一档', () => {
    const b = hslByName(pupa, 'pupa-body')
    const l = hslOf(legs[0])
    expect(b.l, '乳白压深就是脏灰').toBeGreaterThan(0.82)
    // 实测差 0.16
    expect(b.l - l.l, '足糊在体上').toBeGreaterThan(0.08)
    expect(b.l - l.l).toBeLessThan(0.3)
  })

  it('蛹室里留着蜕下的幼虫皮，连着那块深色头盘，就在腹末旁边', () => {
    expect(skin).toHaveLength(1)
    expect(exShield).toHaveLength(2)
    const s = hslOf(exShield[0])
    const b = hslOf(skin[0])
    expect(s.l, '头盘要是深色的 —— 幼虫那块盘子').toBeLessThan(0.42)
    expect(b.l - s.l).toBeGreaterThan(0.35)
    const tail = new THREE.Vector3(bodyBox.min.x, bodyC.y, bodyC.z)
    expect(centerOf([...skin, ...exShield]).distanceTo(tail), '幼虫皮离腹末太远').toBeLessThan(0.6)
    // 在腹末之后，不压在蛹身下（实测中心在腹末后 0.2）
    expect(centerOf([...skin, ...exShield]).x, '幼虫皮塞到蛹身下面去了').toBeLessThan(bodyBox.min.x)
  })
})
