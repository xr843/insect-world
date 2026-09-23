/**
 * 中华大锹甲三个生活史阶段（卵 / 幼虫 / 蛹）的形态断言。
 *
 * ## 这份测试最要紧的一件事：跟独角仙那一套**分得开**
 *
 * 锹甲与独角仙同为朽木 / 腐殖质里长大的 C 形蛴螬，三个阶段都有一只现成的
 * 「近亲」在图鉴里。照抄独角仙的参数换个颜色，所有「像不像蛴螬」的断言都会
 * 绿 —— 可两张卡片并排是同一条虫。所以除了每个阶段自己的形态断言，这里专门
 * 有几条**直接构建独角仙的对应阶段来比**：体色更白、头壳更橙、上颚更大更黑、
 * 最粗处在后半段、体毛更少更短、卵更长、蛹色更浅。把参数改回独角仙那一档，
 * 这几条会红。
 *
 * ## 量的是人看见的那个量
 *
 * 老教训：断言量的是数字，人看的是长相，两者可以毫无关系（天牛幼虫 46 条全绿、
 * 出图糊成一团）。所以：
 * - C 形用剪影栅格判（有洞 + 有缺口），不靠端点距离；
 * - 两颚分不分得开，投到真实机位的成像平面上量最小间距，不比三维距离；
 * - 「朽木有顺纹纤维」数横纹方向上的裂缝个数，不看 mesh 在不在；
 * - 肛门「纵裂」量缝在侧向与矢状面内的跨度比。
 *
 * 派数字时上下限一起给（天蛾的喙只给下限，长成了标枪）。
 * 每条断言都做过变异测试 —— 把实现改坏，确认它会红（见 commit 说明）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildStagBeetle } from '../stag-beetle'
import { buildStagBeetleEgg } from '../stages/stag-beetle-egg'
import { buildStagBeetleLarva } from '../stages/stag-beetle-larva'
import { buildStagBeetlePupa } from '../stages/stag-beetle-pupa'
import { buildRhinocerosBeetleEgg } from '../stages/rhinoceros-beetle-egg'
import { buildRhinocerosBeetleLarva } from '../stages/rhinoceros-beetle-larva'
import { buildRhinocerosBeetlePupa } from '../stages/rhinoceros-beetle-pupa'
import type { InsectModel } from '../kit'
import { HOLOMETABOLOUS, builtStagesOf, metamorphosisOf } from '../../stages'

/** 三个阶段都远低于这个预算；上限只防「某次改动让面数失控」 */
const TRIANGLE_BUDGET = 60_000

/** 验收机位（与 scripts/new-species-shots.mjs 一致）+ 展台默认机位（InsectCanvas 的 [2,1,3]） */
const VIEWS: Record<string, THREE.Vector3> = {
  home: new THREE.Vector3(2, 1, 3).normalize(),
  top: new THREE.Vector3(0.18, 1, 0.14).normalize(),
  side: new THREE.Vector3(0.12, 0.28, 1).normalize(),
  front: new THREE.Vector3(1, 0.32, 0.4).normalize(),
  rear: new THREE.Vector3(-0.85, 0.42, -0.7).normalize(),
}

const egg = buildStagBeetleEgg()
const larva = buildStagBeetleLarva()
const pupa = buildStagBeetlePupa()
const adult = buildStagBeetle()

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

function verticesOfMesh(mesh: THREE.Mesh): THREE.Vector3[] {
  const pos = mesh.geometry.getAttribute('position')
  const out: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld))
  return out
}

function verticesOf(model: InsectModel, ...names: string[]): THREE.Vector3[] {
  return meshesNamed(model, ...names).flatMap(verticesOfMesh)
}

function allVertices(model: InsectModel): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh) out.push(...verticesOfMesh(m))
  })
  return out
}

function boxOf(model: InsectModel, ...names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const m of meshesNamed(model, ...names)) box.union(new THREE.Box3().setFromObject(m))
  return box
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

/** 材质基色的 HSL（按 sRGB 读 —— 与源码里写的十六进制同一把尺子，见 rhino-stages 的注释） */
function hslOf(mat: THREE.MeshPhysicalMaterial): { h: number; s: number; l: number } {
  const out = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(out, THREE.SRGBColorSpace)
  return out
}

/** loft 产物按 uv 的 v 分环、取每环重心，反推中心线（几何本身量出来的，不是 builder 自报） */
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
  const keys = [...new Set(Array.from({ length: pos.count }, (_, i) => Math.round(uv.getY(i) * 1e6)))].sort((a, b) => a - b)
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

/** 画面上两团顶点之间的最小间距（成像平面投影，不是三维距离） */
function minProjectedGap(a: THREE.Vector3[], b: THREE.Vector3[], dir: THREE.Vector3): number {
  const e1 = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
  const e2 = new THREE.Vector3().crossVectors(dir, e1).normalize()
  const pa = a.map((v) => [v.dot(e1), v.dot(e2)] as const)
  const pb = b.map((v) => [v.dot(e1), v.dot(e2)] as const)
  let best = Infinity
  for (const [x0, y0] of pa) for (const [x1, y1] of pb) best = Math.min(best, Math.hypot(x0 - x1, y0 - y1))
  return best
}

/** 点到网格**表面**（逐三角形最近点）的距离 —— 比「到最近顶点」准：稀疏处顶点间距可达 0.1 */
function surfaceDistance(mesh: THREE.Mesh, p: THREE.Vector3): number {
  const pos = mesh.geometry.getAttribute('position')
  const idx = mesh.geometry.index!
  const tri = new THREE.Triangle()
  const q = new THREE.Vector3()
  const [a, b, c] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  let best = Infinity
  for (let i = 0; i < idx.count; i += 3) {
    a.fromBufferAttribute(pos, idx.getX(i)).applyMatrix4(mesh.matrixWorld)
    b.fromBufferAttribute(pos, idx.getX(i + 1)).applyMatrix4(mesh.matrixWorld)
    c.fromBufferAttribute(pos, idx.getX(i + 2)).applyMatrix4(mesh.matrixWorld)
    tri.set(a, b, c).closestPointToPoint(p, q)
    best = Math.min(best, q.distanceTo(p))
  }
  return best
}

/** 离一组点最近的距离 */
function nearest(p: THREE.Vector3, pts: THREE.Vector3[]): number {
  let best = Infinity
  for (const q of pts) best = Math.min(best, q.distanceToSquared(p))
  return Math.sqrt(best)
}

// ---------------------------------------------------------------- 共同契约

const STAGES: [string, InsectModel][] = [
  ['卵', egg],
  ['幼虫', larva],
  ['蛹', pupa],
]

describe('三个阶段的共同契约', () => {
  it.each(STAGES)('%s 能构建、无 NaN、面数在预算内', (label, model) => {
    expect(hasNonFinite(model), `${label} 顶点里有 NaN/Inf`).toBe(false)
    expect(model.radius).toBeGreaterThan(0)
    expect(Number.isFinite(model.radius)).toBe(true)
    expect(triangleCount(model), `${label} 面数超预算`).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(STAGES)('%s：anchors 都是有限坐标，且贴在实体上', (_label, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length).toBeGreaterThanOrEqual(2)
    model.group.updateMatrixWorld(true)
    const pts = allVertices(model)
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 坐标非有限`).toBe(true)
      // 全站闸门 anchors-have-geometry 只跑成虫，阶段模型自己看着；判据同款：离实体 < 0.12×半径
      const d = nearest(v, pts)
      expect(d / model.radius, `anchor ${k} 离实体 ${(d / model.radius).toFixed(3)}×半径，浮在空气里`).toBeLessThan(0.12)
    }
  })

  it.each(STAGES)('%s：锚点名不与成虫 hotspot 同名（同名会把成虫卡片贴到幼期上）', (label, model) => {
    /*
     * 展台拿当前模型的 anchors 去配成虫 hotspot 表。成虫的 mandible 卡写的是
     * 「内缘有齿、用来夹住对手掀翻」—— 贴到幼虫啃木头的上颚、或还软着的蛹颚上
     * 都是错的；elytra 在蛹上只是翅芽。一律改名。
     */
    const adultKeys = new Set(Object.keys(adult.anchors))
    const clash = Object.keys(model.anchors).filter((k) => adultKeys.has(k))
    expect(clash, `${label} 的锚点 ${clash.join('、')} 与成虫同名`).toEqual([])
  })

  it('注册成一条完全变态路线：卵 → 幼虫 → 蛹 →（成虫走 registry）', () => {
    expect(metamorphosisOf('stag-beetle')).toBe(HOLOMETABOLOUS)
    expect(builtStagesOf('stag-beetle')).toEqual(['egg', 'larva', 'pupa'])
  })
})

// ---------------------------------------------------------------- 卵

describe('卵：朽木上啃出的浅坑里一粒乳白椭圆', () => {
  const shell = boxOf(egg, 'egg-shell')
  const size = shell.getSize(new THREE.Vector3())
  const wood = meshesNamed(egg, 'rotten-wood')[0]
  const woodPts = verticesOfMesh(wood)

  it('长 3~3.8 毫米、短径 2.2~3 毫米，上下限一起卡', () => {
    expect(size.x, `卵长 ${size.x.toFixed(3)}`).toBeGreaterThan(0.3)
    expect(size.x, `卵长 ${size.x.toFixed(3)}`).toBeLessThan(0.38)
    for (const [axis, v] of [
      ['高', size.y],
      ['宽', size.z],
    ] as const) {
      expect(v, `卵的${axis}径 ${v.toFixed(3)}`).toBeGreaterThan(0.22)
      expect(v, `卵的${axis}径 ${v.toFixed(3)}`).toBeLessThan(0.3)
    }
  })

  it('刚产下的椭圆：轴比 1.15~1.45，而且比独角仙那颗近球形的卵明显更长', () => {
    const ratio = size.x / Math.min(size.y, size.z)
    expect(ratio, `轴比 ${ratio.toFixed(2)}：读成了球`).toBeGreaterThan(1.15)
    expect(ratio, `轴比 ${ratio.toFixed(2)}：读成了米粒`).toBeLessThan(1.45)
    const r = boxOf(buildRhinocerosBeetleEgg(), 'egg-shell').getSize(new THREE.Vector3())
    expect(ratio - r.x / Math.min(r.y, r.z), '跟独角仙的卵一样圆，并排分不出来').toBeGreaterThan(0.08)
  })

  it('乳白不压深、朽木够深：卵壳明度 ≥ 0.85，木头 ≤ 0.45，差 ≥ 0.4；木屑居中', () => {
    const e = hslOf(materialOf(egg, 'egg-shell')).l
    const w = hslOf(materialOf(egg, 'rotten-wood')).l
    const c = hslOf(materialOf(egg, 'wood-chip')).l
    expect(e, `卵壳明度 ${e.toFixed(3)} 被压成了脏灰`).toBeGreaterThan(0.85)
    expect(w, `木头明度 ${w.toFixed(3)} 衬不出卵`).toBeLessThan(0.45)
    expect(w, `木头明度 ${w.toFixed(3)} 压成了炭`).toBeGreaterThan(0.25)
    expect(e - w).toBeGreaterThan(0.4)
    // 新鲜木屑比木面浅、比卵深：要读成「刚啃出来的木质」，不是第二批卵
    expect(c).toBeGreaterThan(w + 0.1)
    expect(c).toBeLessThan(e - 0.2)
  })

  it('卵壳不上清漆、不透射：白铬防线 + 接缝亮线防线', () => {
    const mat = materialOf(egg, 'egg-shell')
    expect(mat.clearcoat, '卵壳挂了清漆，乳白会整片过曝成白铬').toBeLessThanOrEqual(0.12)
    expect(mat.metalness).toBeLessThanOrEqual(0.05)
    expect(mat.transmission, 'translucent 会在接缝上折射出一道「裂缝」').toBe(0)
  })

  it('卵陷在坑里：卵下方的木面比坑外平处低 ≥ 0.06，卵底低于平处木面', () => {
    // 取顶面：同一 (x,z) 上最高的那个木头顶点。坑心 = 卵正下方；平处 = 离卵心 0.33 以外
    const topNear = woodPts.filter((p) => Math.hypot(p.x, p.z) < 0.05).map((p) => p.y)
    const topFar = woodPts.filter((p) => Math.hypot(p.x, p.z) > 0.33 && Math.abs(p.z) < 0.3 && Math.abs(p.x) < 0.38)
    const farY = topFar.map((p) => p.y).sort((a, b) => b - a)
    const rim = farY[Math.floor(farY.length * 0.1)] // 平处顶面（取高分位，排除侧壁与底面）
    const pit = Math.max(...topNear)
    expect(rim - pit, `坑只有 ${(rim - pit).toFixed(3)} 深，卵是摆在木板上的`).toBeGreaterThan(0.06)
    expect(shell.min.y, '卵底没沉到木面以下 —— 没陷进坑里').toBeLessThan(rim)
    // 但卵心（赤道）要高过坑沿：坑沿一旦高过卵的腰，默认机位（仰角 16°）只看得见一圈木头
    const eggMid = shell.getCenter(new THREE.Vector3()).y
    expect(eggMid - rim, '坑沿高过了卵的赤道，卵被木头挡住').toBeGreaterThan(0.01)
  })

  it('没被埋掉：至少三成卵面高过木头与木屑的最高处（默认机位仰角只有 16°）', () => {
    const top = Math.max(boxOf(egg, 'rotten-wood').max.y, boxOf(egg, 'wood-chip').max.y)
    const pts = verticesOf(egg, 'egg-shell')
    const above = pts.filter((p) => p.y > top).length / pts.length
    expect(above, `只有 ${(above * 100).toFixed(0)}% 的卵面露在外面`).toBeGreaterThan(0.3)
  })

  it('朽木是顺纹的纤维，不是颗粒：横纹方向上数得出 ≥ 14 道裂缝', () => {
    /*
     * 取一条横穿木面的窄带（x ≈ −0.3，离坑足够远），按 z 排序看顶面高度：
     * 纤维之间的裂缝是一个个局部极小。颗粒状的「土」数不出这么规整的一排谷，
     * 一块光板则一个谷都没有。
     */
    const band = woodPts
      .filter((p) => Math.abs(p.x + 0.3) < 0.014 && Math.abs(p.z) < 0.36 && p.y > -0.14)
      .sort((a, b) => a.z - b.z)
    let valleys = 0
    for (let i = 2; i < band.length - 2; i++) {
      const y = band[i].y
      if (y < band[i - 1].y && y < band[i + 1].y && Math.min(band[i - 2].y, band[i + 2].y) - y > 0.008) valleys++
    }
    expect(valleys, `只数出 ${valleys} 道裂缝，读不出木纹`).toBeGreaterThanOrEqual(14)
    expect(valleys, `${valleys} 道裂缝太密，读成了灯芯绒`).toBeLessThanOrEqual(30)
    // 没有土粒：土粒是独角仙的语境，锹甲的卵在木头里
    expect(meshesNamed(egg, 'soil-grain').length).toBe(0)
  })

  it('朽木逐条深浅不一（顶点色），坑里露出更浅的新鲜木质', () => {
    const col = wood.geometry.getAttribute('color')
    expect(col, '木头没有顶点色 —— 整块一个颜色，读成塑料').toBeTruthy()
    expect((wood.material as THREE.MeshPhysicalMaterial).vertexColors).toBe(true)
    const pos = wood.geometry.getAttribute('position')
    const nrm = wood.geometry.getAttribute('normal')
    const near: number[] = []
    const far: number[] = []
    for (let i = 0; i < pos.count; i++) {
      const d = Math.hypot(pos.getX(i), pos.getZ(i))
      // 只看顶面（法线朝上、且不是底面）：侧壁各层自带深浅、底面是一片 0.5，
      // 混进来会替顶面「撑」出方差 —— 木面整片同色这条也照样绿（变异测试抓到）
      if (nrm.getY(i) < 0.7 || pos.getY(i) < -0.2) continue
      if (d < 0.12) near.push(col.getX(i))
      // 「远处」取后端一截（x < −0.34）：那里坑的提亮已衰减到 < 10%，
      // 否则坑边的渐变本身就撑出方差，木面整片同色这条也照样绿（变异测试抓到）
      else if (pos.getX(i) < -0.34) far.push(col.getX(i))
    }
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
    const sd = (a: number[]) => Math.sqrt(mean(a.map((v) => (v - mean(a)) ** 2)))
    expect(sd(far), '木面深浅太均匀').toBeGreaterThan(0.06)
    expect(mean(near) / mean(far), '坑里没比外面浅 —— 读不出是新啃开的').toBeGreaterThan(1.15)
  })

  it('坑沿一堆木屑：≥ 15 片，扎堆在一侧而不是均匀一圈，每片都落在木面上', () => {
    const chips = meshesNamed(egg, 'wood-chip')
    expect(chips.length).toBeGreaterThanOrEqual(15)
    expect(chips.length).toBeLessThanOrEqual(60)
    const centers = chips.map((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))
    // 扎堆：六成以上在后方（−X）。第一版金角螺旋均匀一圈，读成「光环」
    const back = centers.filter((c) => c.x < 0).length / centers.length
    expect(back, `只有 ${(back * 100).toFixed(0)}% 的木屑在后方，排成了一圈`).toBeGreaterThan(0.6)
    for (const c of centers) {
      expect(nearest(c, woodPts), '有一片木屑悬在空中').toBeLessThan(0.06)
      // 不压在卵上：木屑中心不落进卵的水平投影里
      expect(Math.hypot(c.x / (size.x / 2), c.z / (size.z / 2)), '木屑盖到了卵上').toBeGreaterThan(0.75)
    }
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫：C 形乳白蛴螬，跟独角仙的那只看得出不是同一种', () => {
  const trunk = meshesNamed(larva, 'larva-body')[0]
  const line = centerline(trunk)
  const arc = arcLength(line)
  const radii = ringRadii(trunk, line)

  const rhino = buildRhinocerosBeetleLarva()
  const rTrunk = meshesNamed(rhino, 'larva-body')[0]
  const rLine = centerline(rTrunk)
  const rRadii = ringRadii(rTrunk, rLine)

  it('老熟幼虫 5~6 厘米（躯干弧长 4.6~5.6）', () => {
    expect(arc, `躯干弧长 ${arc.toFixed(2)}`).toBeGreaterThan(4.6)
    expect(arc, `躯干弧长 ${arc.toFixed(2)}`).toBeLessThan(5.6)
  })

  it('C 形蜷曲：首尾直线距离只有弧长的 15%~40%', () => {
    // 剪影判据对「香蕉」不够狠：150° 的弯弧从质心看出去照样围住大半圈（变异测试抓到），
    // 所以再卡一道弦长 / 弧长。下限防首尾接成 O。
    const chord = line[0].distanceTo(line[line.length - 1])
    expect(chord / arc, `弦长 / 弧长 = ${(chord / arc).toFixed(3)}，身子基本是直的`).toBeLessThan(0.4)
    expect(chord / arc, `弦长 / 弧长 = ${(chord / arc).toFixed(3)}，首尾快接上了`).toBeGreaterThan(0.15)
  })

  it('C 形蜷曲：侧视剪影中间真的有个洞，而且有缺口', () => {
    // 与 rhino-stages 同一套判据：栅格化到 XY 平面，质心是空的、大部分方向被围住、但有缺口
    const pts = allVertices(larva)
    const N = 96
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const p of pts) {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    const grid = new Uint8Array(N * N)
    for (const p of pts) {
      const i = Math.min(N - 1, Math.floor(((p.x - minX) / (maxX - minX)) * N))
      const j = Math.min(N - 1, Math.floor(((p.y - minY) / (maxY - minY)) * N))
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
    expect(grid[cj * N + ci], 'C 的中心不是空的').toBe(0)
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
    expect(hit, `只有 ${hit}/72 个方向被围住 —— 读成香蕉`).toBeGreaterThanOrEqual(52)
    expect(hit, '72 个方向全被围住 —— 那是 O 不是 C').toBeLessThanOrEqual(70)
  })

  it('前细后粗：最粗处在后半段（t 0.6~0.85），独角仙的在前半段', () => {
    const maxR = Math.max(...radii)
    const at = radii.indexOf(maxR) / (radii.length - 1)
    expect(at, `最粗处在 t=${at.toFixed(2)}`).toBeGreaterThan(0.6)
    expect(at, `最粗处在 t=${at.toFixed(2)}`).toBeLessThan(0.85)
    const rAt = rRadii.indexOf(Math.max(...rRadii)) / (rRadii.length - 1)
    expect(at - rAt, '最粗处跟独角仙幼虫在同一个位置，轮廓分不出来').toBeGreaterThan(0.15)
    expect(maxR / radii[0], '中后段没有明显比头端粗').toBeGreaterThan(2.2)
  })

  it('腹端圆钝、节间只是浅褶（不是松果）', () => {
    const maxR = Math.max(...radii)
    // 尾端圆顶：离尾极 6% 弧长处仍有最粗处的一半以上（锹甲腹端「更圆」）
    const k = Math.round((radii.length - 1) * 0.94)
    expect(radii[k] / maxR, '腹端收成了尖锥').toBeGreaterThan(0.5)
    /*
     * 逐节量起伏：每一节窗口内 (最粗 − 最细) / 最粗。
     * ⚠️ 不能只量相邻两环的跌落 —— 节间折痕窄（cos^6），每节只有 8 个采样，
     * 折痕的下坡被摊在两三环上，沟深 0.2 时相邻跌落也才 8%（变异测试抓到）。
     */
    let depth = 0
    for (let k = 4; k < 10; k++) {
      const w = radii.slice(Math.round(((radii.length - 1) * k) / 13), Math.round(((radii.length - 1) * (k + 1)) / 13) + 1)
      depth = Math.max(depth, (Math.max(...w) - Math.min(...w)) / Math.max(...w))
    }
    expect(depth, `一节里起伏 ${(depth * 100).toFixed(0)}% —— 松果`).toBeLessThan(0.14)
    expect(depth, '一道节间沟都没有，读成一根光滑香肠').toBeGreaterThan(0.05)
  })

  it('每节两道小环：节间主沟之外，节中还有一道更浅的次级沟', () => {
    // 在腹中段（t 0.3~0.8）数半径的局部极小：13 节里这一段约 6.5 节，
    // 每节 2 道 → ≥ 10 个；只有主沟则只有 6~7 个
    const lo = Math.round((radii.length - 1) * 0.3)
    const hi = Math.round((radii.length - 1) * 0.8)
    let minima = 0
    for (let i = lo; i < hi; i++) if (radii[i] < radii[i - 1] && radii[i] < radii[i + 1]) minima++
    expect(minima, `只数出 ${minima} 道沟`).toBeGreaterThanOrEqual(10)
    expect(minima, `${minima} 道沟太密`).toBeLessThanOrEqual(16)
  })

  it('三对胸足全在前三节；腹部一根附肢都没有', () => {
    const legs: THREE.Object3D[] = []
    larva.group.traverse((o) => {
      if (o.name === 'larva-leg') legs.push(o)
    })
    expect(legs.length, '胸足不是 6 条').toBe(6)
    for (const leg of legs) {
      const t = paramAt(line, leg.getWorldPosition(new THREE.Vector3()))
      expect(t, `有一条足长在 t=${t.toFixed(2)}`).toBeLessThan(0.28)
    }
    for (const p of verticesOf(larva, 'larva-claw')) expect(paramAt(line, p), '爪出现在腹部').toBeLessThan(0.32)
  })

  it('体壁更白：比独角仙幼虫更亮、更不黄，且不是鞘翅材质、不开透射', () => {
    const body = hslOf(materialOf(larva, 'larva-body'))
    const rBody = hslOf(materialOf(rhino, 'larva-body'))
    expect(body.l, `体壁明度 ${body.l.toFixed(3)} 压成了脏灰`).toBeGreaterThan(0.86)
    expect(body.l, '体壁白到顶了，ACES 下会过曝成一片').toBeLessThan(0.96)
    expect(body.l - rBody.l, '跟独角仙幼虫一样黄').toBeGreaterThan(0.04)
    expect(body.s, '跟独角仙幼虫一样饱和').toBeLessThan(rBody.s)

    const mat = materialOf(larva, 'larva-body')
    expect(mat.clearcoat, '体壁上了清漆').toBeLessThanOrEqual(0.12)
    expect(mat.metalness).toBeLessThanOrEqual(0.05)
    expect(mat.roughness, '体壁太光滑，软体读成了硬壳').toBeGreaterThan(0.6)
    // 天牛幼虫的透镜病：transmission 在长条体上把虫化成一块透镜
    expect(mat.transmission, '体壁开了 transmission').toBe(0)
  })

  it('头壳橙黄、坚硬：色相 25~42°，明度 0.38~0.56，比独角仙的红褐头壳亮且更橙', () => {
    const head = hslOf(materialOf(larva, 'larva-head'))
    const body = hslOf(materialOf(larva, 'larva-body'))
    const rHead = hslOf(materialOf(rhino, 'larva-head'))
    const deg = head.h * 360
    expect(deg, `头壳色相 ${deg.toFixed(0)}°`).toBeGreaterThan(25)
    expect(deg, `头壳色相 ${deg.toFixed(0)}°`).toBeLessThan(42)
    expect(head.l).toBeGreaterThan(0.38)
    expect(head.l).toBeLessThan(0.56)
    expect(body.l - head.l, '头壳与体壁的明度拉不开').toBeGreaterThan(0.3)
    expect(head.l - rHead.l, '头壳跟独角仙的一样深').toBeGreaterThan(0.06)
    expect(materialOf(larva, 'larva-head').clearcoat, '头壳没有骨化的高光').toBeGreaterThan(0.3)
  })

  it('上颚大而黑：近黑（明度 ≤ 0.12），长度 / 头宽比独角仙的大三成以上', () => {
    const mand = meshesNamed(larva, 'larva-mandible')
    expect(mand.length, '上颚不是一对').toBe(2)
    expect(hslOf(mand[0].material as THREE.MeshPhysicalMaterial).l, '上颚不够黑').toBeLessThan(0.12)

    const ratio = (model: InsectModel) => {
      const m = meshesNamed(model, 'larva-mandible')[0]
      const len = arcLength(centerline(m))
      const head = verticesOf(model, 'larva-head')
      const f = new THREE.Box3().setFromPoints(head).getSize(new THREE.Vector3()).z
      return len / f
    }
    const mine = ratio(larva)
    const theirs = ratio(rhino)
    expect(mine, `上颚长 / 头宽 = ${mine.toFixed(2)}`).toBeGreaterThan(0.6)
    expect(mine, `上颚长 / 头宽 = ${mine.toFixed(2)}，长成了成虫的鹿角`).toBeLessThan(1.1)
    expect(mine / theirs, '上颚跟独角仙幼虫的一样短').toBeGreaterThan(1.3)
  })

  it('两枚上颚在画面上分得开：顶视与前斜视投影间距 ≥ 0.08', () => {
    const pts = verticesOf(larva, 'larva-mandible')
    const r = pts.filter((p) => p.z > 0)
    const l = pts.filter((p) => p.z < 0)
    expect(r.length + l.length, '有顶点跨过了中线').toBe(pts.length)
    for (const view of ['top', 'front'] as const) {
      const gap = minProjectedGap(l, r, VIEWS[view])
      expect(gap, `${view} 机位两枚上颚只隔 ${gap.toFixed(3)}`).toBeGreaterThan(0.08)
    }
  })

  it('体毛稀疏、短、浅色：根数与长度都明显少于独角仙幼虫', () => {
    const setae = meshesNamed(larva, 'larva-seta')
    const rSetae = meshesNamed(rhino, 'larva-seta')
    const len = (m: THREE.Mesh) => arcLength(centerline(m))
    const maxLen = Math.max(...setae.map(len))
    const rMaxLen = Math.max(...rSetae.map(len))
    expect(setae.length, '一根毛都没有，近看是一根塑料香肠').toBeGreaterThan(20)
    expect(setae.length / rSetae.length, '毛跟独角仙的一样密').toBeLessThan(0.75)
    expect(maxLen / rMaxLen, '毛跟独角仙的一样长').toBeLessThan(0.6)
    expect(hslOf(materialOf(larva, 'larva-seta')).l, '毛是深色的').toBeGreaterThan(0.55)
  })

  it('体侧一排气门：每侧 9 枚、真的在体侧、够深', () => {
    const sp = meshesNamed(larva, 'larva-spiracle')
    const right = sp.filter((m) => m.getWorldPosition(new THREE.Vector3()).z > 0)
    expect(right.length).toBe(9)
    expect(sp.length - right.length).toBe(9)
    for (const s of sp) expect(Math.abs(s.getWorldPosition(new THREE.Vector3()).z)).toBeGreaterThan(0.2)
    expect(hslOf(materialOf(larva, 'larva-spiracle')).l).toBeLessThan(0.35)
  })

  it('腹端变深是体壁自身的颜色区（顶点色渐变），不是套上去的一截外壳', () => {
    // 独角仙那版是外扩 0.01 的深色外壳，交界一道硬边，读成「尾巴套了只袜子」
    expect(meshesNamed(larva, 'larva-abdomen-dark').length, '又套了一层深色外壳').toBe(0)
    const col = trunk.geometry.getAttribute('color')
    expect(col, '躯干没有顶点色').toBeTruthy()
    expect((trunk.material as THREE.MeshPhysicalMaterial).vertexColors).toBe(true)
    const uv = trunk.geometry.getAttribute('uv')
    // 每个 t 的平均亮度（顶点色三通道均值）
    const byT = new Map<number, { s: number; n: number }>()
    for (let i = 0; i < col.count; i++) {
      const k = Math.round(uv.getY(i) * 200) / 200
      const e = byT.get(k) ?? { s: 0, n: 0 }
      e.s += (col.getX(i) + col.getY(i) + col.getZ(i)) / 3
      e.n++
      byT.set(k, e)
    }
    const ts = [...byT.keys()].sort((a, b) => a - b)
    /*
     * 顶点色是线性空间的乘子。换回 sRGB（≈ ^1/2.2）再判，才跟「看起来暗了多少」
     * 是同一把尺子 —— 线性 0.44 在屏幕上是 0.69，直接拿线性值卡阈值会把
     * 「浅灰褐」误判成「焦炭」（第一版这条就是这么红的）。
     */
    const shade = (t: number) => {
      const k = ts.reduce((b, v) => (Math.abs(v - t) < Math.abs(b - t) ? v : b), ts[0])
      const e = byT.get(k)!
      return Math.pow(e.s / e.n, 1 / 2.2)
    }
    expect(shade(0.5), '体壁中段被染色了').toBeGreaterThan(0.99)
    expect(shade(0.97), '腹端没变深').toBeLessThan(0.85)
    expect(shade(0.97), '腹端染成了焦炭').toBeGreaterThan(0.6)
    // 深色区只占末端 8%~22%：独角仙那只是 25%（锹甲腹端没那么黑）
    const darkShare = ts.filter((t) => shade(t) < 0.93).length / ts.length
    expect(darkShare).toBeGreaterThan(0.08)
    expect(darkShare).toBeLessThan(0.22)
    // 渐变而非硬边：中间色调至少跨 3 个采样（0.005 一格）
    const ramp = ts.filter((t) => shade(t) < 0.97 && shade(t) > 0.8).length
    expect(ramp, '深浅交界是一道硬边').toBeGreaterThanOrEqual(3)
  })

  it('肛门纵裂：腹端极点上一道竖缝 —— 矢状面内的跨度远大于侧向跨度', () => {
    const slit = meshesNamed(larva, 'larva-anal-slit')
    expect(slit.length).toBe(1)
    const pts = verticesOf(larva, 'larva-anal-slit')
    const box = new THREE.Box3().setFromPoints(pts).getSize(new THREE.Vector3())
    const sagittal = Math.hypot(box.x, box.y)
    // 「纵」= 沿背腹方向；C 画在 XY 平面里，所以侧向就是 Z
    expect(sagittal / box.z, '缝是横的（金龟科的「一」字），不是锹甲的「丨」字').toBeGreaterThan(4)
    expect(sagittal, '缝太短，看不见').toBeGreaterThan(0.25)
    expect(sagittal, '缝太长，快把腹端劈成两半').toBeLessThan(0.6)
    /*
     * 在腹端极点上、贴着体壁（不悬空：第一版一半悬在圆顶外，侧视是一根黑钩）。
     * 量缝的**中心线**到体壁**表面**的距离（逐三角形最近点）：缝本身外扩 0.012，
     * 所以 ≤ 0.03 就是贴着；第一版悬空的那一半离体壁 0.1 以上。
     */
    for (const p of centerline(slit[0])) {
      expect(paramAt(line, p), '缝不在腹端').toBeGreaterThan(0.95)
      const d = surfaceDistance(trunk, p)
      expect(d, `缝的中心线离体壁 ${d.toFixed(3)}，悬在外面`).toBeLessThan(0.03)
    }
    expect(hslOf(materialOf(larva, 'larva-anal-slit')).l).toBeLessThan(0.35)
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹（雄）：离蛹，一对大颚已经成形', () => {
  const bodyParts = ['pupa-abdomen', 'pupa-abdomen-tip', 'pupa-thorax', 'pupa-head'] as const
  const whole = new THREE.Box3().setFromObject(pupa.group)
  /** 还原「略仰卧」那层旋转，回到体坐标（+Y = 背、−Y = 腹） */
  const pose = pupa.group.getObjectByName('pupa-pose')!
  const unpose = (v: THREE.Vector3) => pose.worldToLocal(v.clone())
  const local = (...names: string[]) => verticesOf(pupa, ...names).map(unpose)
  const span = (pts: THREE.Vector3[]) => new THREE.Box3().setFromPoints(pts).getSize(new THREE.Vector3())

  it('全长 4.2~6 厘米（含大颚），且比成虫短', () => {
    const len = span(local(...bodyParts, 'pupa-mandible')).x
    expect(len, `全长 ${len.toFixed(2)}`).toBeGreaterThan(4.2)
    expect(len, `全长 ${len.toFixed(2)}`).toBeLessThan(6)
    const adultLen = new THREE.Box3().setFromObject(adult.group).getSize(new THREE.Vector3()).x
    expect(len, '蛹比成虫还长').toBeLessThan(adultLen)
    expect(whole.isEmpty()).toBe(false)
  })

  it('大颚成对、长在头前', () => {
    const mand = meshesNamed(pupa, 'pupa-mandible')
    expect(mand.length, '大颚不是一对').toBe(2)
    const headBox = new THREE.Box3().setFromPoints(local('pupa-head'))
    const headMid = headBox.getCenter(new THREE.Vector3()).x
    for (const m of mand) {
      const pts = verticesOfMesh(m).map(unpose)
      const box = new THREE.Box3().setFromPoints(pts)
      expect(box.min.x, '大颚根部跑到了头的后半').toBeGreaterThan(headMid)
      expect(box.max.x - headBox.max.x, '大颚没伸出头前').toBeGreaterThan(0.8)
    }
  })

  it('颚是「还没长开的鞘」：比成虫的颚短、粗细比 ≥ 成虫的 1.25 倍', () => {
    const measure = (m: THREE.Mesh) => {
      const line = centerline(m)
      return { len: arcLength(line), baseR: ringRadii(m, line)[0] }
    }
    const mine = measure(meshesNamed(pupa, 'pupa-mandible')[0])
    // 成虫那对的主干（stagMandible 的 shaft 就叫 mandible），同一把尺子量
    const theirs = measure(meshesNamed(adult, 'mandible')[0])
    expect(mine.len, `颚长 ${mine.len.toFixed(2)}`).toBeGreaterThan(1.1)
    expect(mine.len, `颚长 ${mine.len.toFixed(2)} 不比成虫短`).toBeLessThan(theirs.len * 0.9)
    const ratio = mine.baseR / mine.len / (theirs.baseR / theirs.len)
    expect(ratio, `粗细比只有成虫的 ${ratio.toFixed(2)} 倍 —— 小一号的成虫颚，不是鞘`).toBeGreaterThan(1.25)
    expect(ratio, `粗细比是成虫的 ${ratio.toFixed(2)} 倍 —— 两根短粗的肉棒`).toBeLessThan(2.2)
  })

  it('鹿角的弧：先外张、末端向内钩回；整体向前下方弯（蛹的头是低垂的）', () => {
    for (const m of meshesNamed(pupa, 'pupa-mandible')) {
      const line = centerline(m).map(unpose)
      const base = line[0]
      const tip = line[line.length - 1]
      const maxZ = Math.max(...line.map((p) => Math.abs(p.z)))
      expect(maxZ - Math.abs(tip.z), '末端没有向内钩回 —— 两根往外叉的棍，不是钳').toBeGreaterThan(0.2)
      expect(maxZ - Math.abs(base.z), '基部之后没有外张').toBeGreaterThan(0.1)
      expect(base.y - tip.y, '颚没有向下弯 —— 那是成虫平端着的姿势').toBeGreaterThan(0.25)
      expect(tip.x - base.x, '颚垂成了竖直的獠牙').toBeGreaterThan(0.9)
    }
  })

  it('两颚在画面上分得开：顶视 / 前斜视的投影间距 ≥ 0.1', () => {
    /*
     * 只查顶视与前斜视。默认机位与侧机位的视线几乎就是 ±Z，一左一右的一对东西
     * 在那两个方向上**必然**前后叠住 —— 成虫模型自己的那对颚在默认机位也只隔
     * 0.004（实测）。强求那两个机位分开，只能把颚掰成上下错开，那就不是锹甲了。
     */
    const pts = verticesOf(pupa, 'pupa-mandible')
    const r = pts.filter((p) => unpose(p).z > 0)
    const l = pts.filter((p) => unpose(p).z < 0)
    expect(r.length + l.length).toBe(pts.length)
    for (const view of ['top', 'front'] as const) {
      const gap = minProjectedGap(l, r, VIEWS[view])
      expect(gap, `${view} 机位两颚只隔 ${gap.toFixed(3)}，糊成了一支`).toBeGreaterThan(0.1)
    }
  })

  it('内缘一枚钝齿：朝中线凸出', () => {
    const teeth = meshesNamed(pupa, 'pupa-mandible-tooth')
    expect(teeth.length).toBe(2)
    for (const t of teeth) {
      const pts = verticesOfMesh(t).map(unpose)
      const side = Math.sign(pts.reduce((s, p) => s + p.z, 0))
      const inner = Math.min(...pts.map((p) => p.z * side))
      const tx = pts.reduce((s, p) => s + p.x, 0) / pts.length
      // 齿尖要凸出到**同一 x 处**颚鞘内缘之外（跟颚全长的最内点比没有意义：
      // 颚末端本来就钩回到中线附近）
      const shaft = meshesNamed(pupa, 'pupa-mandible')
        .map((m) => verticesOfMesh(m).map(unpose))
        .find((v) => Math.sign(v.reduce((s, p) => s + p.z, 0)) === side)!
      const innerWall = Math.min(...shaft.filter((p) => Math.abs(p.x - tx) < 0.06).map((p) => p.z * side))
      expect(innerWall - inner, '齿没凸出颚鞘内缘').toBeGreaterThan(0.04)
      expect(innerWall - inner, '齿长成了一根刺').toBeLessThan(0.2)
    }
  })

  it('头大、宽、方：头宽 ≥ 前胸宽的 85%，宽高比 ≥ 2', () => {
    const head = span(local('pupa-head'))
    const thorax = span(local('pupa-thorax'))
    expect(head.z / thorax.z, '头太窄，读成背板和颚之间的一个小疙瘩').toBeGreaterThan(0.85)
    expect(head.z / thorax.z, '头比前胸宽太多').toBeLessThan(1.25)
    expect(head.z / head.y, '头是圆球不是扁板').toBeGreaterThan(2)
  })

  it('腹部宽扁、末端圆钝，不是胡萝卜', () => {
    const abd = local('pupa-abdomen')
    const box = new THREE.Box3().setFromPoints(abd)
    const width = (x0: number, x1: number) => {
      const zs = abd.filter((p) => p.x > x0 && p.x < x1).map((p) => p.z)
      return Math.max(...zs) - Math.min(...zs)
    }
    const maxW = box.getSize(new THREE.Vector3()).z
    const tailW = width(box.min.x, box.min.x + 0.2)
    expect(tailW / maxW, `末端宽只有最宽处的 ${(tailW / maxW).toFixed(2)}，收成了尖锥`).toBeGreaterThan(0.55)
    expect(tailW / maxW, '腹部前后一样粗，读成一根圆筒').toBeLessThan(0.9)
  })

  it('离蛹：翅芽一对、足芽三对、触角芽一对，全在腹面（回到体坐标判）', () => {
    const wing = meshesNamed(pupa, 'pupa-wing-pad')
    const leg = meshesNamed(pupa, 'pupa-leg-pad')
    const ant = meshesNamed(pupa, 'pupa-antenna-pad')
    expect(wing.length).toBe(2)
    expect(leg.length).toBe(6)
    expect(ant.length).toBe(2)
    for (const m of [...wing, ...leg, ...ant]) {
      const c = unpose(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))
      expect(c.y, `${m.name} 跑到背面去了`).toBeLessThan(0)
    }
  })

  it('腹部分节：≥ 4 圈膜环沿体轴排开，膜环颜色不是一圈圈黑箍', () => {
    const rings = meshesNamed(pupa, 'membrane-ring')
    expect(rings.length).toBeGreaterThanOrEqual(4)
    const xs = rings.map((m) => unpose(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3())).x)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1.2)
    const body = hslOf(materialOf(pupa, 'pupa-abdomen')).l
    const ring = hslOf(rings[0].material as THREE.MeshPhysicalMaterial).l
    expect(body - ring, '膜环跟体色一样，分节读不出来').toBeGreaterThan(0.03)
    expect(body - ring, '膜环在淡黄身上勒成了黑箍').toBeLessThan(0.15)
  })

  it('淡黄，比独角仙的橙褐蛹明显更浅；大颚深一档；不是鞘翅材质、不开透射', () => {
    const mat = materialOf(pupa, 'pupa-abdomen')
    const { h, l } = hslOf(mat)
    const deg = h * 360
    expect(deg, `色相 ${deg.toFixed(0)}°`).toBeGreaterThan(30)
    expect(deg, `色相 ${deg.toFixed(0)}°`).toBeLessThan(50)
    expect(l, `明度 ${l.toFixed(2)} 压成了土黄`).toBeGreaterThan(0.64)
    expect(l, `明度 ${l.toFixed(2)} 太亮，会过曝成白`).toBeLessThan(0.82)
    const rhino = hslOf(materialOf(buildRhinocerosBeetlePupa(), 'pupa-abdomen')).l
    expect(l - rhino, '跟独角仙的蛹一样深，并排分不出来').toBeGreaterThan(0.15)

    const mand = hslOf(materialOf(pupa, 'pupa-mandible')).l
    expect(l - mand, '大颚跟身体一个颜色，从头前那团淡黄里剥不出来').toBeGreaterThan(0.08)
    expect(mand, '大颚已经黑了 —— 那是成虫').toBeGreaterThan(0.45)

    expect(mat.clearcoat).toBeLessThanOrEqual(0.2)
    expect(mat.metalness).toBeLessThanOrEqual(0.05)
    expect(mat.transmission).toBe(0)
  })
})
