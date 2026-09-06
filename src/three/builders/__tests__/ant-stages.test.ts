/**
 * 日本弓背蚁生活史三阶段（卵 / 幼虫 / 蛹连茧）的形态验证。
 *
 * 写每一条断言之前只问一句：**把实现改坏，这条会不会红？**
 * 下面每条都做过变异测试（给幼虫加足、把 C 形拉直、删掉钩毛、把茧换成
 * 光泽甲壳、删掉茧里的蛹、把卵堆做成单枚、把三个阶段的浅色压成灰……），
 * 咬不住的当场改强，注释里记着它对应哪一种改坏法。
 *
 * 两条从别的轮次买来的教训，这份测试里都用上了：
 *
 * 1. **剖开的东西不能用包围盒判轴心。** 茧挖掉了 100° 的一扇窗，包围盒中心
 *    离真正的旋转轴差着 0.03（实测），按它算半径，壁厚会从 0.032 量成 0.051，
 *    「一端略尖」会从 0.78 量成 0.99 —— 数字全错而测试照样绿。
 *    这里用**逐环圆拟合**（Kåsa 最小二乘 + 两级迭代）定轴。
 *    附带的坑：闭合母线两端收到轴上的那些「半径为 0」的顶点方位角是噪声，
 *    量方位缺口前必须先滤掉，否则 100° 的窗会量成 19.5°（第一版实测）。
 * 2. **断言量数字，人看长相。** 所以「大小」类一律上下限齐给，
 *    「看得见」类一律换算成占画面的比例（取景按 model.radius / frameRadius
 *    归一化，一个部件的跨度 / 画面直径就是它在屏幕上占多少）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildAntEgg } from '../stages/ant-egg'
import { buildAntLarva } from '../stages/ant-larva'
import { buildAntPupa } from '../stages/ant-pupa'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

const egg = buildAntEgg()
const larva = buildAntLarva()
const pupa = buildAntPupa()

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
  for (const o of objs) box.union(new THREE.Box3().setFromObject(o))
  return box
}

const sizeOf = (objs: THREE.Object3D[]) => boxOf(objs).getSize(new THREE.Vector3())
const centerOf = (objs: THREE.Object3D[]) => boxOf(objs).getCenter(new THREE.Vector3())

/** 世界坐标下的全部顶点（模型已 finalize 居中，世界坐标即模型局部坐标） */
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

/** 几何体自身局部坐标下的尺寸（不含摆位旋转）—— 量「一枚卵有多大」用它，
 *  因为卵是逐枚转过朝向的，世界包围盒量到的是被旋转拉宽的那个盒 */
function localSize(mesh: THREE.Mesh): THREE.Vector3 {
  mesh.geometry.computeBoundingBox()
  return mesh.geometry.boundingBox!.getSize(new THREE.Vector3())
}

/**
 * 材质基色的 HSL。**必须显式指定 sRGB**：three 的颜色管理把 hex 转进线性
 * 工作空间，缺省 getHSL 返回线性明度，深色会被压扁，阈值全失真。
 * （同一个坑在实现侧也咬过一次：`offsetHSL` 读的也是线性明度，
 * 给深褐土粒减明度直接减成了纯黑。）
 */
function hslOf(mesh: THREE.Mesh): { h: number; s: number; l: number } {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
  const hsl = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(hsl, THREE.SRGBColorSpace)
  return { h: hsl.h * 360, s: hsl.s, l: hsl.l }
}

function matOf(mesh: THREE.Mesh): THREE.MeshPhysicalMaterial {
  return (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
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
 * 从一根放样管里还原中轴线：loft() 的顶点逐截面排列，每截面
 * radialSegments+1 个，取每一环的平均即得该处轴心。
 * 与「量包围盒」相比，这个量的是**弧** —— 包围盒分不出一根直管和一条 C 形，
 * 而 C 形正是幼虫这一阶段的招牌。
 */
function centerline(mesh: THREE.Mesh, radialSegments: number): THREE.Vector3[] {
  const ring = radialSegments + 1
  const pos = mesh.geometry.getAttribute('position')
  const rings = Math.floor(pos.count / ring)
  const out: THREE.Vector3[] = []
  const p = new THREE.Vector3()
  for (let r = 0; r < rings; r++) {
    const c = new THREE.Vector3()
    for (let j = 0; j < ring; j++) {
      p.fromBufferAttribute(pos, r * ring + j)
      c.add(p)
    }
    out.push(c.divideScalar(ring).applyMatrix4(mesh.matrixWorld))
  }
  return out
}

function arcLength(pts: THREE.Vector3[]): number {
  let sum = 0
  for (let i = 1; i < pts.length; i++) sum += pts[i].distanceTo(pts[i - 1])
  return sum
}

/** 折线的切线总转角（度）—— 「弯成 C」最直接的量 */
function turnAngle(pts: THREE.Vector3[]): number {
  let turn = 0
  for (let i = 2; i < pts.length; i++) {
    const a = new THREE.Vector3().subVectors(pts[i - 1], pts[i - 2]).normalize()
    const b = new THREE.Vector3().subVectors(pts[i], pts[i - 1]).normalize()
    turn += Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
  }
  return (turn * 180) / Math.PI
}

/** 一点到一条折线的最短距离 */
function distToLine(p: THREE.Vector3, line: THREE.Vector3[]): number {
  let best = Infinity
  for (const q of line) best = Math.min(best, q.distanceTo(p))
  return best
}

/**
 * 锚点离实体有多远（占包围半径的比例），取 min(到最近顶点, 到最近网格包围盒)。
 * 与全物种闸门 `three/__tests__/anchors-have-geometry.test.ts` 同一套判据 ——
 * 那条闸门只覆盖成虫，阶段模型得自己带一份，否则「标注点浮在空气里」在这里不设防。
 */
function detachRatio(model: InsectModel, anchor: THREE.Vector3): number {
  const v = new THREE.Vector3()
  const box = new THREE.Box3()
  let best = Infinity
  for (const mesh of allMeshes(model)) {
    box.setFromObject(mesh)
    best = Math.min(best, box.distanceToPoint(anchor))
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i)
      mesh.localToWorld(v)
      best = Math.min(best, v.distanceTo(anchor))
    }
  }
  return best / Math.max(model.radius, 1e-6)
}

// ---- 茧（旋转体，长轴沿 X）专用

/** Kåsa 代数圆拟合：一组 (y,z) 点的最小二乘圆心 */
function fitCircle(pts: THREE.Vector3[]): { y: number; z: number } {
  let Sy = 0, Sz = 0, Syy = 0, Szz = 0, Syz = 0, Syr = 0, Szr = 0, Sr = 0
  for (const p of pts) {
    const r = p.y * p.y + p.z * p.z
    Sy += p.y
    Sz += p.z
    Syy += p.y * p.y
    Szz += p.z * p.z
    Syz += p.y * p.z
    Syr += p.y * r
    Szr += p.z * r
    Sr += r
  }
  const n = pts.length
  const a11 = 2 * (Syy - (Sy * Sy) / n)
  const a12 = 2 * (Syz - (Sy * Sz) / n)
  const a22 = 2 * (Szz - (Sz * Sz) / n)
  const b1 = Syr - (Sy * Sr) / n
  const b2 = Szr - (Sz * Sr) / n
  const det = a11 * a22 - a12 * a12
  return { y: (b1 * a22 - b2 * a12) / det, z: (a11 * b2 - a12 * b1) / det }
}

/**
 * 茧的旋转轴（在 YZ 平面上的位置）。
 * **不能用包围盒中心**：剖掉 100° 之后包围盒中心离真轴 0.03。
 * 两级：先用中段全部点粗拟一次，再只留最外一圈（半径 > 93% 最大值）重拟三轮。
 */
function fitCocoonAxis(shellVerts: THREE.Vector3[]): { y: number; z: number } {
  const xs = shellVerts.map((v) => v.x)
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2
  const slab = shellVerts.filter((v) => Math.abs(v.x - mid) < 0.06)
  let axis = fitCircle(slab)
  for (let pass = 0; pass < 3; pass++) {
    const rs = slab.map((v) => Math.hypot(v.y - axis.y, v.z - axis.z))
    const rmax = Math.max(...rs)
    axis = fitCircle(slab.filter((_, i) => rs[i] > rmax * 0.93))
  }
  return axis
}

const radiusFromAxis = (v: THREE.Vector3, axis: { y: number; z: number }) =>
  Math.hypot(v.y - axis.y, v.z - axis.z)

/** 绕茧轴的方位角（度）。与实现里 φ 的定义一致：φ=0 朝 +Z，φ=270° 朝 +Y */
const azimuthOf = (v: THREE.Vector3, axis: { y: number; z: number }) =>
  ((Math.atan2(v.z - axis.z, -(v.y - axis.y)) * 180) / Math.PI + 360) % 360

/** 一组方位角里最大的空缺（度）与它的起点 */
function maxAzimuthGap(angles: number[]): { gap: number; at: number } {
  const a = [...angles].sort((x, y) => x - y)
  let gap = 0
  let at = 0
  for (let i = 0; i < a.length; i++) {
    const next = i === a.length - 1 ? a[0] + 360 : a[i + 1]
    if (next - a[i] > gap) {
      gap = next - a[i]
      at = a[i]
    }
  }
  return { gap, at }
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

  it.each(all)('%s：尺度落在真实昆虫的量级里', (_name, model) => {
    expect(model.radius).toBeGreaterThan(0.02)
    expect(model.radius).toBeLessThan(12)
  })

  it.each(all)('%s：anchors 有限、在包围盒内，且每个底下都真有几何体', (_name, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length).toBeGreaterThanOrEqual(3)
    const box = new THREE.Box3().setFromObject(model.group).expandByScalar(model.radius * 0.06)
    for (const k of keys) {
      const v = model.anchors[k]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 坐标非有限`).toBe(true)
      expect(box.containsPoint(v), `anchor ${k} 落在模型之外`).toBe(true)
      // 圆点底下没有几何体 = 「标注点浮在空气里」，用户一眼能看见
      expect(detachRatio(model, v), `anchor ${k} 浮在空气里`).toBeLessThan(0.12)
    }
  })
})

// ---------------------------------------------------------------- 卵

describe('卵：黏成一小堆的乳白短椭圆', () => {
  const eggs = meshesByName(egg, 'ant-egg')
  const floor = meshesByName(egg, 'nest-floor')
  const grains = meshesByName(egg, 'soil-grain')
  const frame = 2 * (egg.frameRadius ?? egg.radius)

  it('单枚是 0.5~0.8 毫米的短椭圆（不是米粒，也不是球）', () => {
    // 逐枚卵转过朝向，所以量几何体自身的局部包围盒，不量世界包围盒
    const s = localSize(eggs[0])
    const len = Math.max(s.x, s.y, s.z)
    const wide = Math.min(s.x, s.y, s.z)
    // 上下限齐给：放大到「好看」是 stages.ts 明令禁止的，做小了则看不见
    expect(len).toBeGreaterThan(0.05)
    expect(len).toBeLessThan(0.085)
    expect(wide).toBeGreaterThan(0.028)
    expect(wide).toBeLessThan(0.05)
    const ratio = len / wide
    expect(ratio, '长宽比 1.4~2.4：球是 1，蜜蜂卵那样的米粒是 4').toBeGreaterThan(1.4)
    expect(ratio).toBeLessThan(2.4)
  })

  it('是一小堆，不是一颗 —— 15~30 枚，堆出高度', () => {
    expect(eggs.length).toBeGreaterThanOrEqual(15)
    expect(eggs.length).toBeLessThanOrEqual(30)
    const s = sizeOf(eggs)
    const wide = Math.max(s.x, s.z)
    expect(wide, '卵堆整体 0.25~0.5').toBeGreaterThan(0.25)
    expect(wide).toBeLessThan(0.5)
    // 堆是立体的：高度必须明显超过一枚卵的粗细（0.042），否则是摊了一层
    expect(s.y, '摊平成一层就不是「堆」了').toBeGreaterThan(0.08)
  })

  it('卵与卵真的黏在一起（每一枚都有邻居抵着）', () => {
    const centers = eggs.map((m) => centerOf([m]))
    const nn = centers.map((c) =>
      Math.min(...centers.filter((d) => d !== c).map((d) => d.distanceTo(c))),
    )
    // 最近邻中心距必须不超过一枚卵的长度（0.072）—— 超过就意味着中间有空隙，
    // 读成「一盘散开的珍珠」。把卵堆整体放大 2 倍这条立刻红
    expect(Math.max(...nn), '有卵孤零零地悬着，卵堆散了').toBeLessThan(0.075)
    const mean = nn.reduce((a, b) => a + b, 0) / nn.length
    expect(mean).toBeLessThan(0.06)
  })

  it('卵堆在画面上占得住（宽 / 画面直径 ≥ 40%，单枚 ≥ 6%）', () => {
    const s = sizeOf(eggs)
    expect(Math.max(s.x, s.z) / frame).toBeGreaterThan(0.4)
    expect(localSize(eggs[0]).x / frame, '单枚卵也得看得出是一枚').toBeGreaterThan(0.06)
  })

  it('卵是真乳白、半透、哑光 —— 不压深、不上清漆', () => {
    const c = hslByName(egg, 'ant-egg')
    expect(c.l, '乳白就要真的接近白：压深一档三个阶段会一起变成灰坨').toBeGreaterThan(0.88)
    expect(c.h, '色相在暖黄区').toBeGreaterThan(25)
    expect(c.h).toBeLessThan(60)
    const mat = matOf(eggs[0])
    expect(mat.transmission, '半透：次表面透光是「卵」而不是「塑料珠」的关键').toBeGreaterThan(0)
    expect(mat.roughness, '哑光；乳白 + 高光会整片过曝成白铬').toBeGreaterThan(0.55)
    expect(mat.clearcoat).toBeLessThan(0.2)
    expect(mat.metalness).toBe(0)
  })

  it('土面把卵衬出来：明度差 ≥ 0.5，且土粒不是黑的', () => {
    expect(floor).toHaveLength(1)
    const soil = hslByName(egg, 'nest-floor')
    const white = hslByName(egg, 'ant-egg')
    expect(white.l - soil.l, '白卵靠这道明度差跳出来').toBeGreaterThan(0.5)
    expect(soil.l, '土要真的深').toBeLessThan(0.35)

    expect(grains.length, '土粒把剪影打毛，光一张圆盘读成饼干').toBeGreaterThanOrEqual(10)
    // 这条是实测撞出来的回归：`Color.offsetHSL()` 读线性明度，
    // 给深褐减明度会被夹到 0 —— 那一版第一颗土粒是纯黑的
    for (const g of grains) {
      const l = hslOf(g).l
      expect(l, '土粒被压成了纯黑（多半是 offsetHSL 在线性空间里夹到了 0）').toBeGreaterThan(0.1)
      expect(l).toBeLessThan(0.45)
    }
  })

  it('卵堆卧在土面的凹处，不是浮在空中', () => {
    const pile = boxOf(eggs)
    const ground = boxOf(floor)
    expect(pile.min.y, '卵堆底不该低于土层底').toBeGreaterThan(ground.min.y)
    expect(pile.min.y, '卵堆底要陷在土面最高处之下（那是个浅坑）').toBeLessThan(ground.max.y)
    const c = pile.getCenter(new THREE.Vector3())
    expect(Math.hypot(c.x - ground.getCenter(new THREE.Vector3()).x, c.z), '卵堆要在土面中央').toBeLessThan(0.08)
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫：无足、C 形、带钩毛的乳白蛆', () => {
  const body = meshesByName(larva, 'larva-body')[0]
  const annuli = meshesByName(larva, 'larva-annulus')
  const hooks = meshesByName(larva, 'larva-hook')
  const head = meshesByName(larva, 'larva-head')
  const jaws = meshesByName(larva, 'larva-mandible')
  // 体轴：从体壁那根放样管还原（radialSegments = 22）
  const axis = centerline(body, 22)
  const bodyArc = arcLength(axis)

  it('末龄体长 0.85~1.2 厘米（量的是弧长，不是包围盒）', () => {
    expect(bodyArc).toBeGreaterThan(0.85)
    expect(bodyArc).toBeLessThan(1.2)
  })

  it('弯成 C：弧长 / 弦长 > 1.3，切线总转角 > 120°', () => {
    // 把体轴拉直成一根管时，弧长不变而这两个数直接掉到 1.0 与 ~0°
    const chord = axis[0].distanceTo(axis[axis.length - 1])
    expect(bodyArc / chord, '拉直成一根管就红').toBeGreaterThan(1.3)
    expect(turnAngle(axis), '转角不够就不是 C 而是一段微弯').toBeGreaterThan(120)
    // 上限：转过一整圈就成了甜甜圈（蜜蜂幼虫盘 0.95 圈是另一回事）
    expect(turnAngle(axis)).toBeLessThan(300)
  })

  it('**无足**：没有骨架足，也没有任何伸出体表包络的附肢', () => {
    expect(larva.rig?.legs, '膜翅目幼虫彻底无足，出现 kit 的分节足就是换了一个目').toBeUndefined()
    const names = new Set(allMeshes(larva).map((m) => m.name))
    for (const bad of ['leg', 'proleg', 'clasper', 'larva-leg']) {
      expect(names.has(bad), `多出了 ${bad}`).toBe(false)
    }
    // 体半径最大 0.125、钩毛长 0.055，全模型实测最远的顶点是 0.167；
    // kit 的一条足光股节就有 0.3，加上去这条立刻红
    let worst = 0
    let worstName = ''
    for (const m of allMeshes(larva)) {
      for (const v of vertsOf([m])) {
        const d = distToLine(v, axis)
        if (d > worst) {
          worst = d
          worstName = m.name
        }
      }
    }
    expect(worst, `${worstName} 伸出了体表包络 —— 幼虫身上不该有附肢`).toBeLessThan(0.21)
  })

  it('前细后粗：头端体径不到最粗处的四成，最粗处在体后半', () => {
    const ringR = (i: number) => {
      const pos = body.geometry.getAttribute('position')
      const ring = 23
      let max = 0
      for (let j = 0; j < ring; j++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i * ring + j).applyMatrix4(body.matrixWorld)
        max = Math.max(max, v.distanceTo(axis[i]))
      }
      return max
    }
    const n = axis.length
    const radii = Array.from({ length: n }, (_, i) => ringR(i))
    const rmax = Math.max(...radii)
    expect(rmax, '最粗处体半径 0.1~0.15（体宽 2~3 毫米）').toBeGreaterThan(0.1)
    expect(rmax).toBeLessThan(0.15)
    const front = radii[Math.floor(n * 0.03)]
    expect(front / rmax, '头端要细成一条颈').toBeLessThan(0.4)
    const at = radii.indexOf(rmax) / n
    expect(at, '最粗处落在体后半（膜翅目幼虫的体重堆在后段）').toBeGreaterThan(0.4)
    expect(at).toBeLessThan(0.8)
  })

  it('分节看得见：12 道环带，每道都是窄环而不是宽箍', () => {
    expect(annuli.length).toBeGreaterThanOrEqual(10)
    for (const ring of annuli) {
      const vs = vertsOf([ring])
      const c = new THREE.Vector3()
      for (const v of vs) c.add(v)
      c.divideScalar(vs.length)
      // 环带的「宽」要沿体轴量：环所在的平面是斜的，世界包围盒量到的是
      // 一个近似立方的盒（实测某道环的长短边比只有 1.16），那个数毫无意义
      let near = 0
      for (let i = 1; i < axis.length; i++) {
        if (axis[i].distanceTo(c) < axis[near].distanceTo(c)) near = i
      }
      const t = new THREE.Vector3()
        .subVectors(axis[Math.min(near + 1, axis.length - 1)], axis[Math.max(near - 1, 0)])
        .normalize()
      const along = vs.map((v) => v.clone().sub(c).dot(t))
      const width = Math.max(...along) - Math.min(...along)
      const radial = Math.max(...vs.map((v) => v.clone().sub(c).sub(t.clone().multiplyScalar(v.clone().sub(c).dot(t))).length()))
      expect(width, '环带必须窄').toBeLessThan(0.035)
      expect(radial / width, '直径要远大于带宽，否则是一节箍不是一道纹').toBeGreaterThan(3)
    }
    const b = hslByName(larva, 'larva-body')
    const a = hslByName(larva, 'larva-annulus')
    expect(b.l - a.l, '环带与体壁同色 = 白做了几何').toBeGreaterThan(0.04)
    expect(b.l - a.l, '深过 0.2 就成了一串黑箍').toBeLessThan(0.2)
  })

  it('稀疏的短钩毛：30~60 根，每根都真的弯成钩，且伸出体表', () => {
    expect(hooks.length).toBeGreaterThanOrEqual(30)
    expect(hooks.length).toBeLessThanOrEqual(60)
    for (const h of hooks) {
      const line = centerline(h, 6)
      const arc = arcLength(line)
      const chord = line[0].distanceTo(line[line.length - 1])
      // 直毛是刺（另一类结构），比值恒等于 1；实测这里是 1.19
      expect(arc / chord, '钩毛是弯的，直的那是刺').toBeGreaterThan(1.08)
      expect(arc, '0.4~0.9 毫米：再长就成了刺毛虫').toBeGreaterThan(0.04)
      expect(arc).toBeLessThan(0.09)
      // 毛尖必须支出体表：贴在体壁上的一层毛在出图里什么都不是
      const tip = line[line.length - 1]
      const root = line[0]
      expect(distToLine(tip, axis) - distToLine(root, axis), '钩毛没支出体表').toBeGreaterThan(0.02)
    }
    // 铺满全身而不是攒在一段
    const hookSpan = sizeOf(hooks)
    const bodySpan = sizeOf([body])
    expect(hookSpan.x / bodySpan.x, '钩毛只长在一段上').toBeGreaterThan(0.75)
  })

  it('头小、色略深、带一对小上颚', () => {
    expect(head).toHaveLength(1)
    const hc = centerOf(head)
    // 头在体轴的头端（u≈0 那一头），不是中间也不是尾端
    let near = 0
    for (let i = 1; i < axis.length; i++) {
      if (axis[i].distanceTo(hc) < axis[near].distanceTo(hc)) near = i
    }
    expect(near / axis.length, '头壳必须长在体轴的前端').toBeLessThan(0.12)
    /*
     * 头比体躯细得多：真实蚁幼虫的头壳不到 0.8 毫米。
     * 量的是头壳到**它自己那条中轴**的最大距离（头壳也是一根放样管，
     * radialSegments = 18）—— 量到体轴的距离不行：头端伸在体轴之外，
     * 那个数里混着轴向的长度，第一版就卡在 0.0752 对 0.075 这种无意义的边界上。
     */
    const headR = Math.max(...vertsOf(head).map((v) => distToLine(v, centerline(head[0], 18))))
    expect(headR, '头做大了会变成一只蝇').toBeLessThan(0.06)
    expect(headR, '头壳总得有个头的样子').toBeGreaterThan(0.02)

    const h = hslByName(larva, 'larva-head')
    const b = hslByName(larva, 'larva-body')
    expect(b.l - h.l, '头壳略深一档，读得出是另一块').toBeGreaterThan(0.08)
    expect(b.l - h.l, '压太深就成了「戴帽子」').toBeLessThan(0.35)

    expect(jaws, '一对上颚').toHaveLength(2)
    const js = sizeOf(jaws)
    expect(js.length() / (2 * larva.radius), '上颚在画面上得看得见').toBeGreaterThan(0.03)
    expect(Math.max(js.x, js.y, js.z), '上颚小而实用，不是捕猎器官').toBeLessThan(0.12)
    expect(hslByName(larva, 'larva-mandible').l, '口器已骨化，比头壳深').toBeLessThan(h.l - 0.15)
  })

  it('体壁是真乳白、半透、哑光', () => {
    const c = hslByName(larva, 'larva-body')
    expect(c.l, '压深一档就与茧、卵一起糊成三坨灰').toBeGreaterThan(0.85)
    const mat = matOf(body)
    expect(mat.transmission, '半透体壁：真实蚁幼虫能透出肠道内容物').toBeGreaterThan(0)
    expect(mat.roughness, '软体不是硬壳，绝不能走 elytra() 那档清漆').toBeGreaterThan(0.6)
    expect(mat.clearcoat).toBeLessThan(0.12)
  })
})

// ---------------------------------------------------------------- 蛹（连茧）

describe('蛹：剖开一扇窗的丝茧，里面躺着一只离蛹', () => {
  const shell = meshesByName(pupa, 'cocoon-shell')
  const rim = meshesByName(pupa, 'cocoon-rim')
  const lining = meshesByName(pupa, 'cocoon-lining')
  const strands = meshesByName(pupa, 'silk-strand')
  const stain = meshesByName(pupa, 'meconium-stain')
  const pellet = meshesByName(pupa, 'meconium')
  const pupaParts = meshesByName(
    pupa,
    'pupa-head',
    'pupa-alitrunk',
    'pupa-gaster',
    'pupa-petiole',
    'pupa-petiole-node',
    'pupa-eye',
    'pupa-leg',
    'pupa-antenna',
    'pupa-mandible',
  )
  const shellVerts = vertsOf(shell)
  const axis = fitCocoonAxis(shellVerts)
  const shellBox = boxOf(shell)
  const shellLen = shellBox.max.x - shellBox.min.x
  const maxR = Math.max(...shellVerts.map((v) => radiusFromAxis(v, axis)))

  /** 某个 x 处茧的外半径（取该薄层里最大的半径） */
  const outerRadiusAt = (frac: number) => {
    const x = shellBox.min.x + shellLen * frac
    const near = shellVerts.filter((v) => Math.abs(v.x - x) < 0.02)
    return Math.max(...near.map((v) => radiusFromAxis(v, axis)))
  }

  /**
   * 一点离茧面（茧壳的顶点云）有多远 —— 判「贴在茧面上」还是「掉进腔里 / 飘在外面」。
   *
   * 不按「该 x 处的半径」比：茧两头收细得很快，分箱取半径在端部有 15% 的误差，
   * 一条贯穿全长的丝索必然被冤枉（实测比值掉到 0.84）。顶点云的最近距离没有这个问题。
   * 茧壳的顶点间距约 0.026，所以贴面的东西这个值不会超过 0.02 上下。
   */
  const nearestShell = (p: THREE.Vector3) => {
    let best = Infinity
    for (const v of shellVerts) {
      const d = v.distanceToSquared(p)
      if (d < best) best = d
    }
    return Math.sqrt(best)
  }

  /** 取样：顶点太多时按步长抽，只影响精度不影响结论 */
  const sampled = (meshes: THREE.Mesh[], count: number) => {
    const vs = vertsOf(meshes)
    const step = Math.max(1, Math.ceil(vs.length / count))
    return vs.filter((_, i) => i % step === 0)
  }

  it('茧长 1.0~1.3 厘米、最粗处直径 0.5~0.7 厘米', () => {
    expect(shellLen).toBeGreaterThan(0.95)
    expect(shellLen).toBeLessThan(1.35)
    expect(2 * maxR).toBeGreaterThan(0.45)
    expect(2 * maxR).toBeLessThan(0.75)
    const slender = shellLen / (2 * maxR)
    expect(slender, '长椭圆：细长比 1.6~2.6').toBeGreaterThan(1.6)
    expect(slender).toBeLessThan(2.6)
  })

  it('一端略尖（前端半径明显小于后端）', () => {
    const rear = outerRadiusAt(0.12)
    const front = outerRadiusAt(0.88)
    expect(front / rear, '两端一样圆就成了胶囊').toBeLessThan(0.9)
    expect(front / rear, '尖过头就成了一只梭子').toBeGreaterThan(0.5)
  })

  it('侧壁上是一扇**窗**：中段开 50°~150°，两端仍合拢', () => {
    /*
     * 逐薄层量方位缺口，不能把全部顶点合起来量 —— 窗只开在中段，
     * 两端整圈都是完整的，合起来量出来的缺口是 0（第一版用旋转体、
     * 整条长度挖同一段方位角时才能那样量）。
     * 「两端合拢」这半条同样重要：整条挖通的那一版正对机位下读成一只掰开的蚌。
     */
    const NS = 20
    const gaps: number[] = []
    for (let k = 0; k < NS; k++) {
      const x0 = shellBox.min.x + (shellLen * k) / NS
      const x1 = x0 + shellLen / NS
      const slab = shellVerts.filter(
        (v) => v.x >= x0 && v.x < x1 && radiusFromAxis(v, axis) > maxR * 0.25,
      )
      gaps.push(slab.length > 8 ? maxAzimuthGap(slab.map((v) => azimuthOf(v, axis))).gap : 0)
    }
    const widest = Math.max(...gaps)
    expect(widest, '窗没了 —— 里面的蛹就再也看不见').toBeGreaterThan(50)
    expect(widest, '挖过头整只读成一只掰开的蚌，「蛹在茧里」立不住').toBeLessThan(150)
    // 两端各两薄层必须是完整的一圈（缺口 < 30°）
    for (const k of [1, 2, NS - 3, NS - 2]) {
      expect(gaps[k], `茧的端部第 ${k} 层被挖开了 —— 窗要在中段，两端得合拢`).toBeLessThan(30)
    }
  })

  it('茧壁有厚度，窗沿封了横断面，腔里另铺一层更浅的内衬', () => {
    // 中段薄层：外壁的最大半径减内壁的最大半径 = 实读壁厚
    const midX = (shellBox.min.x + shellBox.max.x) / 2
    const near = (vs: THREE.Vector3[]) => vs.filter((v) => Math.abs(v.x - midX) < 0.03)
    const outerMax = Math.max(...near(shellVerts).map((v) => radiusFromAxis(v, axis)))
    const innerMax = Math.max(...near(vertsOf(lining)).map((v) => radiusFromAxis(v, axis)))
    const wall = outerMax - innerMax
    expect(wall, '壁成了一张零厚度的纸 —— 窗那侧会读成一个平面的黑洞').toBeGreaterThan(0.02)
    expect(wall, '壁厚过头就成了一只陶罐').toBeLessThan(0.06)

    expect(rim, '窗沿那道横断面').toHaveLength(1)
    // 窗沿必须真的横跨整个壁厚，否则它只是一条贴边的线
    const rimSpan = vertsOf(rim).map((v) => radiusFromAxis(v, axis))
    const rimMidSpan = near(vertsOf(rim)).map((v) => radiusFromAxis(v, axis))
    expect(Math.max(...rimMidSpan) - Math.min(...rimMidSpan), '窗沿没跨过壁厚').toBeGreaterThan(0.02)
    expect(Math.max(...rimSpan)).toBeLessThan(maxR * 1.02)
    expect(lining, '茧腔内衬').toHaveLength(1)
    const shellL = hslByName(pupa, 'cocoon-shell').l
    const liningL = hslByName(pupa, 'cocoon-lining').l
    expect(liningL - shellL, '内衬要比外壳浅，否则茧腔是个暗洞，蛹陷在里面读不出形').toBeGreaterThan(0.03)
  })

  it('丝的哑光与纵向纹理 —— 不是甲壳，也不是一根光管', () => {
    const mat = matOf(shell[0])
    expect(mat.roughness, '丝是哑光的：走 elytra() 那档整枚茧就成了塑料胶囊').toBeGreaterThan(0.75)
    expect(mat.clearcoat).toBeLessThanOrEqual(0.1)
    expect(mat.metalness).toBe(0)
    const c = hslByName(pupa, 'cocoon-shell')
    expect(c.l, '浅黄褐/米色就要真的浅').toBeGreaterThan(0.68)
    expect(c.l).toBeLessThan(0.9)
    expect(c.h).toBeGreaterThan(25)
    expect(c.h).toBeLessThan(60)

    expect(strands.length, '纵向丝索').toBeGreaterThanOrEqual(20)
    for (const s of strands) {
      const sz = sizeOf([s])
      expect(sz.x / Math.max(sz.y, sz.z), '丝索必须沿茧长走，横着缠就成了一圈箍').toBeGreaterThan(3)
      // 贴在茧面上，不是浮在腔里也不是架在半空
      const far = Math.max(...sampled([s], 12).map(nearestShell))
      expect(far, '丝索没贴着茧面（掉进腔里或飘在外面）').toBeLessThan(0.035)
    }
    // 绕着茧铺开，而不是几根排在一侧
    const azis = strands.map((s) => azimuthOf(centerOf([s]), axis))
    const { gap } = maxAzimuthGap(azis)
    expect(gap, '丝索只排在一侧（缺口应当只有剖口那 100°）').toBeLessThan(160)
  })

  it('一端的排泄斑：茧面一块深斑 + 腔里那团粪块，都在后端', () => {
    expect(stain, '茧面的斑').toHaveLength(1)
    expect(pellet, '腔里的粪块本体').toHaveLength(1)
    for (const m of [...stain, ...pellet]) {
      expect(hslOf(m).l, '排泄斑要真的深，才读得出是一块脏斑').toBeLessThan(0.32)
      expect(centerOf([m]).x, '排泄斑在后端（蛹的后腹那一头）').toBeLessThan(shellBox.min.x + shellLen * 0.3)
    }
    // 斑贴在茧面上：既不陷进茧壁，也不支出去成一个瘤
    expect(Math.max(...sampled(stain, 60).map(nearestShell)), '斑没贴着茧面').toBeLessThan(0.035)
    // 粪块在腔里：离茧面明显有距离（贴在茧面上的话它就成了第二块斑）
    expect(Math.min(...sampled(pellet, 40).map(nearestShell)), '粪块贴到茧壁上了').toBeGreaterThan(0.02)
    expect(sizeOf(stain).length() / (2 * pupa.radius), '斑在画面上得看得见').toBeGreaterThan(0.1)
  })

  it('茧里真的躺着一只蚂蚁：三段身体 + 细腰 + 六足 + 一对触角', () => {
    expect(meshesByName(pupa, 'pupa-head')).toHaveLength(1)
    expect(meshesByName(pupa, 'pupa-alitrunk')).toHaveLength(1)
    expect(meshesByName(pupa, 'pupa-gaster')).toHaveLength(1)
    expect(meshesByName(pupa, 'pupa-leg'), '离蛹的六条足是一根根游离的管').toHaveLength(6)
    expect(meshesByName(pupa, 'pupa-antenna')).toHaveLength(2)
    expect(meshesByName(pupa, 'pupa-eye')).toHaveLength(2)

    const len = sizeOf(pupaParts).x
    expect(len, '蛹长 0.7~1.05 厘米，比茧短一截').toBeGreaterThan(0.7)
    expect(len).toBeLessThan(1.05)
    expect(len, '蛹不能比茧还长').toBeLessThan(shellLen)

    /*
     * 细腰：蚂蚁最硬的鉴定特征。量的是各段几何体**自身局部坐标**的 z 跨度
     * （蛹的局部 +Z 就是左右向，且这些 mesh 没有自己的位移/缩放），
     * 世界包围盒会被蛹整体的滚转搅成一个近似立方的盒，量不出腰。
     */
    const lateral = (name: string) => localSize(meshesByName(pupa, name)[0]).z
    const waist = lateral('pupa-petiole')
    expect(waist, '腰不到胸的一半').toBeLessThan(0.5 * lateral('pupa-alitrunk'))
    expect(waist, '腰不到后腹的一半').toBeLessThan(0.5 * lateral('pupa-gaster'))
  })

  it('复眼先显色：眼近黑褐，躯体仍是乳白', () => {
    const eye = hslByName(pupa, 'pupa-eye')
    const bodyC = hslByName(pupa, 'pupa-gaster')
    expect(eye.l, '复眼要真的深').toBeLessThan(0.35)
    expect(bodyC.l, '躯体要真的浅').toBeGreaterThan(0.85)
    expect(bodyC.l - eye.l, '这道色差是「正在变成一只蚂蚁」的全部依据').toBeGreaterThan(0.5)
    // 蛹要从茧腔的内衬上跳出来
    expect(bodyC.l - hslByName(pupa, 'cocoon-lining').l).toBeGreaterThan(0.06)
  })

  it('蛹与粪块都关在茧腔里（没有一处穿出茧壁）', () => {
    // 按 x 分箱取该箱内**内壁**顶点到轴的最大距离 = 该处的腔半径。
    // 这是偏严的判据（两端箱里内轮廓收到轴上，最小值接近 0），所以给 0.008 的容差；
    // 蛹真正穿出茧壁时超出量是 0.1 的量级（第一版上颚捅出茧尖，实测 0.11）
    const NB = 28
    const innerR = new Array(NB).fill(Infinity)
    for (const v of vertsOf(lining)) {
      const b = Math.min(NB - 1, Math.floor(((v.x - shellBox.min.x) / shellLen) * NB))
      innerR[b] = Math.min(innerR[b], radiusFromAxis(v, axis))
    }
    let worst = 0
    let who = ''
    for (const m of [...pupaParts, ...pellet]) {
      for (const v of vertsOf([m])) {
        const b = Math.min(NB - 1, Math.max(0, Math.floor(((v.x - shellBox.min.x) / shellLen) * NB)))
        const over = radiusFromAxis(v, axis) - innerR[b]
        if (over > worst) {
          worst = over
          who = m.name
        }
      }
    }
    expect(worst, `${who} 捅出了茧壁`).toBeLessThan(0.008)
  })

  it('从展台默认机位看进去，蛹是**看得见**的（朝向相机的蛹面 ≥ 40% 露在窗里）', () => {
    /*
     * 这是这一阶段最该被钉住的一条：剖口是为了让人看见里面。
     * 把窗关上（PHI_LEN 改成整圈）或把蛹埋到茧的另一侧，形态断言全绿，
     * 画面上却只剩一颗米色胶囊 —— 只有真的打一遍射线才抓得住。
     */
    const dir = new THREE.Vector3(0.86, 0.44, 1.25).normalize() // InsectCanvas 的默认机位方向
    const blockers = meshesByName(
      pupa,
      'cocoon-shell',
      'cocoon-rim',
      'cocoon-lining',
      'silk-strand',
      'silk-floss',
      'meconium-stain',
    )
    const ray = new THREE.Raycaster()
    ray.far = 5
    let seen = 0
    let total = 0
    const nrm = new THREE.Matrix3()
    for (const m of pupaParts) {
      const pos = m.geometry.getAttribute('position')
      const nor = m.geometry.getAttribute('normal')
      nrm.getNormalMatrix(m.matrixWorld)
      const step = Math.max(1, Math.ceil(pos.count / 60))
      for (let i = 0; i < pos.count; i += step) {
        // 只数**朝着相机的那一面**：背面的点本来就看不见，把它们算进去
        // 等于拿「蛹有多少表面积藏在自己背后」当作「茧挡了多少」
        if (nor) {
          const n = new THREE.Vector3().fromBufferAttribute(nor, i).applyMatrix3(nrm).normalize()
          if (n.dot(dir) < 0.15) continue
        }
        const v = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
        ray.set(v.clone().addScaledVector(dir, 0.004), dir)
        total++
        if (ray.intersectObjects(blockers, false).length === 0) seen++
      }
    }
    expect(total).toBeGreaterThan(100)
    /*
     * 实测 52%：窗关严了这个数是 0，窗收到中段 72° 时掉到 37%（那一版出图里
     * 蛹的头正好被近侧的窗沿挡掉）。阈值取 0.4 —— 卡在「看得见整只蚂蚁」
     * 与「只看得见一截肚子」之间。
     */
    expect(seen / total, `朝向相机的蛹面只有 ${((seen / total) * 100).toFixed(0)}% 露在窗口里`).toBeGreaterThan(0.4)
  })
})
