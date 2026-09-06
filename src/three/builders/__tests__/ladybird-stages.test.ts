/**
 * 七星瓢虫生活史三阶段（卵 / 幼虫 / 蛹）的形态验证。
 *
 * 写每一条断言之前的自检只有一句：**把实现改坏，这条会不会红？**
 * 所有阈值都是先量后定的（量的过程见提交说明里的变异测试表），不是拍出来的数。
 *
 * 两条从本仓库的事故里抄来的纪律：
 *
 * 1. **「大小」类断言一律上下限齐给。** 只给下限的那次，天蛾的喙长成了三四倍
 *    体长的标枪而测试全绿。这里卵、幼虫、蛹的每一个尺寸都是一对。
 * 2. **「看得见」类断言一律换算成占画面的比例。** 取景按 `model.radius` 归一化，
 *    「斑的直径 / 画面直径」才是它在屏幕上占多少，比绝对尺寸更接近人眼看到的量。
 *
 * 还有一条是这一轮自己踩的：**断言量数字，人看长相。** 所以除了数量与颜色，
 * 每一处招牌结构都另有一条「它真的凸出来了吗 / 它真的挨着吗 / 它真的在那个
 * 位置吗」的形态断言 —— 疣突量凸出体壁多少、旧皮量离蛹壳多远、卵量彼此挨多近。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildLadybirdEgg } from '../stages/ladybird-egg'
import { buildLadybirdLarva } from '../stages/ladybird-larva'
import { buildLadybirdPupa } from '../stages/ladybird-pupa'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

const egg = buildLadybirdEgg()
const larva = buildLadybirdLarva()
const pupa = buildLadybirdPupa()

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

/** 一组网格在模型局部坐标下的并集包围盒（模型已 finalize 居中，世界坐标即局部坐标） */
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

/**
 * 材质基色的 HSL。**必须显式指定 sRGB**：three 的颜色管理把 hex 转进线性
 * 工作空间，缺省 `getHSL` 返回的是线性明度，深色会被压扁（`#161314` 线性
 * L≈0.007），阈值全失真。
 */
function hslOf(mesh: THREE.Mesh): { h: number; s: number; l: number } {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
  const hsl = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(hsl, THREE.SRGBColorSpace)
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

/**
 * 锚点离实体有多远（占包围半径的比例），算法照抄仓库的全局闸门
 * `src/three/__tests__/anchors-have-geometry.test.ts`：取 min(到最近顶点,
 * 到最近网格包围盒)。那条闸门只跑成虫，阶段模型不在它的覆盖范围里 ——
 * 而它防的正是这一轮最容易犯的错：招牌部件被删掉，锚点还留在原处指着空气，
 * 别的断言一条都不红。所以这里自己带一份。
 */
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

/**
 * 一根「管状」部件的长度与粗细。
 *
 * 不能用包围盒代替：一根斜着伸出去的刚毛，三个轴向的盒边都吃到了长度的投影
 * （实测最小边 0.019，而它其实只有 0.007 粗），拿盒边当粗细会量出三倍的数。
 * 这里先找出最远的一对顶点定出轴，再量垂直于轴的最大偏离。
 */
function tubeShape(mesh: THREE.Mesh): { len: number; thick: number } {
  const vs = vertsOf([mesh])
  const c = new THREE.Vector3()
  for (const v of vs) c.add(v)
  c.divideScalar(vs.length)
  // 轴取顶点云的主轴。用「最远的一对顶点」连线当轴会歪掉：两端各偏出一个管径，
  // 一根 0.024 长的毛就被斜了 10°，量出来的粗细当场翻倍（实测 0.0138 vs 真值 0.007）
  const dir = principalAxis(vs)
  const proj = vs.map((v) => v.dot(dir))
  let thick = 0
  for (const v of vs) {
    const d = v.clone().sub(c)
    thick = Math.max(thick, d.addScaledVector(dir, -d.dot(dir)).length())
  }
  return { len: Math.max(...proj) - Math.min(...proj), thick: 2 * thick }
}

/**
 * 顶点云的主轴（协方差矩阵最大特征向量，幂迭代求）。
 *
 * 蛹是斜着摆的，「体长」「横脊是不是横的」「哪一端是头」都要沿它自己的体轴量。
 * 从几何本身求主轴，而不是读锚点或读常量 —— 锚点写错了这里也得照样红。
 */
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

/** 两组网格之间的最短顶点距离 —— 「A 真的挨着 B」只能这么量 */
function minGap(a: THREE.Mesh[], b: THREE.Mesh[]): number {
  const va = vertsOf(a)
  const vb = vertsOf(b)
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
})

// ---------------------------------------------------------------- 卵

describe('卵：一片竖着的黄色小蜡烛', () => {
  /** 每枚卵各装在自己的 group 里（壳 + 9 条纵脊），倾角绕卵基旋转 */
  const units = egg.group.children.filter((c) => c.type === 'Group') as THREE.Group[]
  const shells = meshesByName(egg, 'egg-shell')
  const ridges = meshesByName(egg, 'egg-ridge')
  const leaves = meshesByName(egg, 'leaf')

  it('是一簇 10~20 枚，不是一枚', () => {
    // 这条正对着「做成单枚」那种退化：七星瓢虫一次产 10~50 枚紧挨着竖成一小片，
    // 成簇是这个阶段唯一认得出的特征，一枚黄椭球是任何一种昆虫的卵
    expect(shells.length).toBeGreaterThanOrEqual(10)
    expect(shells.length).toBeLessThanOrEqual(20)
    expect(units.length).toBe(shells.length)
  })

  it('单枚就是 1 毫米量级，且竖立（高明显大于宽）', () => {
    for (const s of shells) {
      const d = sizeOf([s])
      // 真实 1.1 毫米高、0.52 毫米宽。上下限齐给 —— 放大到「好看」是 stages.ts 明令禁止的
      expect(d.y).toBeGreaterThan(0.09)
      expect(d.y).toBeLessThan(0.135)
      expect(Math.max(d.x, d.z)).toBeGreaterThan(0.035)
      expect(Math.max(d.x, d.z)).toBeLessThan(0.08)
      const slender = d.y / Math.max(d.x, d.z)
      // 躺倒或做成球这条就红：球是 1，长椭圆是 2 上下
      expect(slender, '卵必须是竖立的长椭圆').toBeGreaterThan(1.5)
      expect(slender).toBeLessThan(2.6)
    }
  })

  it('枚枚紧挨着：既看最近邻，也看整簇的密度', () => {
    const centers = shells.map((m) => centerOf([m]))
    // 卵径取**中位数**而不是最大值：卵是微微外倾的，倾得最多那枚的包围盒
    // 被高度的投影撑宽了两成，拿它当卵径会让下面所有比值一起漂
    const widths = shells.map((m) => sizeOf([m]).x).sort((a, b) => a - b)
    const eggW = widths[Math.floor(widths.length / 2)]
    const nn = centers.map((c, i) => Math.min(...centers.filter((_, j) => j !== i).map((o) => o.distanceTo(c))))
    // 撒开成「掉在叶子上的几粒小米」是最常见的错法。实测 nn 0.061~0.071、卵径 0.057
    expect(Math.max(...nn) / eggW, '卵之间散得太开，不成一簇').toBeLessThan(2)
    expect(Math.min(...nn) / eggW, '卵挤穿了').toBeGreaterThan(0.8)

    /*
     * 只看最近邻是不够的 —— 只把一个方向撒开（行距不变、列距拉到三倍）时，
     * 每枚卵的最近邻仍是同列的邻居，最近邻这条一点反应都没有，
     * 而画面上已经是「几行摆开的卵」而不是一小片了（变异测试当场撞出来的）。
     * 所以再加一条整簇的面密度：簇的占地 / (枚数 × 单枚占地)。
     * 实测 1.8；把列距拉到 0.2 时是 4.0。
     */
    const c = sizeOf(shells)
    expect((c.x * c.z) / (shells.length * eggW * eggW), '整簇太稀疏').toBeLessThan(3)
  })

  it('簇是一小片（两个方向都铺开），不是一条线', () => {
    const c = sizeOf(shells)
    const width = Math.max(...shells.map((m) => sizeOf([m]).x))
    expect(c.x / width).toBeGreaterThan(3.5)
    expect(c.z / width).toBeGreaterThan(3.5)
    // 上限：簇再大就不是一次产的一小片了
    expect(Math.max(c.x, c.z)).toBeLessThan(0.6)
  })

  it('每枚都黏在叶面上，没有一枚浮在空中', () => {
    expect(leaves).toHaveLength(1)
    const leafTop = boxOf(leaves).max.y
    for (const s of shells) {
      const bottom = boxOf([s]).min.y
      // 卵基埋进叶面 EMBED 深，露在外面才是真实的 1.1 毫米
      expect(bottom - leafTop, '卵基没接触叶面 —— 一簇悬空的卵').toBeLessThan(0.004)
      expect(bottom - leafTop, '卵陷进叶子里去了').toBeGreaterThan(-0.03)
    }
  })

  it('每枚都有 6~14 条纵脊，条条是竖的', () => {
    expect(ridges.length / shells.length).toBeGreaterThanOrEqual(6)
    expect(ridges.length / shells.length).toBeLessThanOrEqual(14)
    for (const r of ridges) {
      const d = sizeOf([r])
      // 横着的环这条会红：脊的竖向跨度必须远大于横向
      expect(d.y / Math.max(d.x, d.z), '脊必须是纵的，不是横的环').toBeGreaterThan(1.8)
    }
  })

  it('脊真的凸出于壳面（不是画在壳上的一条线）', () => {
    /*
     * 沿**每枚卵自己的体轴**量，不拿包围盒相减：卵是微微外倾的，
     * 倾角一大，壳的水平包围盒被卵高的投影撑开、而脊只覆盖 t∈[0.05,0.95]，
     * 两者的盒差会跟着倾角变 —— 变异测试里「把卵撒开」曾让这条红，
     * 而它跟脊高一点关系都没有（假阳性）。改成量「离体轴的最大距离」之后，
     * 倾角对它完全没有影响。
     */
    for (const u of units) {
      const sh = u.children.filter((c) => c.name === 'egg-shell') as THREE.Mesh[]
      const rd = u.children.filter((c) => c.name === 'egg-ridge') as THREE.Mesh[]
      const sv = vertsOf(sh)
      const c = new THREE.Vector3()
      for (const v of sv) c.add(v)
      c.divideScalar(sv.length)
      const dir = principalAxis(sv)
      const radial = (v: THREE.Vector3) => {
        const d = v.clone().sub(c)
        return d.addScaledVector(dir, -d.dot(dir)).length()
      }
      const out = Math.max(...vertsOf(rd).map(radial)) - Math.max(...sv.map(radial))
      // 实测 0.0029；把 RIDGE_RISE 压到 0.0007 时降到 0.0007，这条红
      expect(out, '脊冠必须高出壳面').toBeGreaterThan(0.0015)
      // 上限：高过 0.008 就不是脊而是一圈刺了
      expect(out).toBeLessThan(0.008)
    }
  })

  it('脊在屏幕上分得开（脊间距 / 画面直径 ≥ 1.5%）', () => {
    const perEgg = ridges.length / shells.length
    const r = Math.max(...shells.map((m) => sizeOf([m]).x)) / 2
    const spacing = (2 * Math.PI * r) / perEgg
    // 720 像素的画面上 1.5% ≈ 11 像素 —— 数得出来的粗细
    expect(spacing / (2 * egg.radius)).toBeGreaterThan(0.015)
  })

  it('鲜黄至橙黄，且脊冠比壳面亮一档', () => {
    const shell = hslByName(egg, 'egg-shell')
    const ridge = hslByName(egg, 'egg-ridge')
    expect(shell.h, '色相要落在黄~橙黄区').toBeGreaterThan(30)
    expect(shell.h).toBeLessThan(58)
    expect(shell.s, '压灰了就是一堆土黄疙瘩').toBeGreaterThan(0.7)
    // 明度对齐 ladybird.ts 的朱红 #e2382a（0.53）。压深一档这条就红 ——
    // 「越深越保险」正是 10 只里 7 只返工的那个病因
    expect(shell.l).toBeGreaterThan(0.45)
    expect(shell.l).toBeLessThan(0.68)
    expect(ridge.l - shell.l, '脊是受光的凸起，压成同色等于白做了几何').toBeGreaterThan(0.08)
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫：长着成排疣突的石板蓝黑小鳄鱼', () => {
  const body = meshesByName(larva, 'larva-body')
  const bodyVerts = vertsOf(body)
  const bodyBox = boxOf(body)
  const bodyLen = bodyBox.max.x - bodyBox.min.x
  const tubercles = meshesByName(larva, 'tubercle')
  const setae = meshesByName(larva, 'seta')
  const spots = meshesByName(larva, 'orange-spot')
  const head = meshesByName(larva, 'head-capsule')
  const wholeLen = sizeOf([larva.group]).x

  /** 体壁在某个 x 处的截面：中心高度与最大半径 */
  function slabAt(x: number): { yc: number; rMax: number } {
    const s = bodyVerts.filter((v) => Math.abs(v.x - x) <= 0.03)
    const ys = s.map((v) => v.y)
    const yc = (Math.min(...ys) + Math.max(...ys)) / 2
    return { yc, rMax: Math.max(...s.map((v) => Math.hypot(v.y - yc, v.z))) }
  }

  it('末龄体长 0.95~1.2 厘米（比 0.7 厘米的成虫还长）', () => {
    expect(wholeLen).toBeGreaterThan(0.95)
    expect(wholeLen).toBeLessThan(1.2)
  })

  it('长纺锤形：细长比 4~7，不是半球', () => {
    const width = sizeOf(body).z
    const slender = wholeLen / width
    // 成虫是「倒扣的碗」，长宽比约 1.2。做成半球这条当场红
    expect(slender, '细长比掉下来就成了半球形的成虫').toBeGreaterThan(4)
    expect(slender).toBeLessThan(7)
    // 背腹方向也要薄：一条球棍的三围是均等的
    expect(sizeOf(body).y / width).toBeLessThan(1.1)
  })

  it('后端渐尖：末端 5% 处的体径不到最粗处的三成', () => {
    const maxR = Math.max(...bodyVerts.map((v) => Math.abs(v.z)))
    const tail = bodyVerts.filter((v) => v.x <= bodyBox.min.x + bodyLen * 0.05)
    const tailR = Math.max(...tail.map((v) => Math.abs(v.z)))
    expect(tailR / maxR, '尾端必须收细 —— 一截平截的管子读成锯断的塑料软管').toBeLessThan(0.3)
  })

  it('体表 40 枚以上疣突，成排分布在 10 段以上体节上、左右对称', () => {
    // 「把疣突全删掉」这条当场红 —— 它是这只虫最好认的特征
    expect(tubercles.length).toBeGreaterThanOrEqual(40)
    const stations = new Set(tubercles.map((m) => +centerOf([m]).x.toFixed(2)))
    expect(stations.size, '疣突必须一节一圈地排开，不是堆在一处').toBeGreaterThanOrEqual(10)
    const right = tubercles.filter((m) => centerOf([m]).z > 0)
    expect(right.length * 2, '疣突必须左右成对').toBe(tubercles.length)
  })

  it('疣突真的凸出体壁 —— 不是深浅色斑', () => {
    /*
     * 第一批阶段模型的教训：**深色贴浅色读成斑纹，不是结构**。
     * 所以这里量的是「疣突最外的顶点比同一截面的体壁最大半径多出多少」。
     * 实测 44 枚全在 0.008~0.033，其中 42 枚 > 0.010。
     * 把疣突压平（height→0）时这个值全部塌到 0 上下，这条红。
     */
    const rises = tubercles.map((t) => {
      const vs = vertsOf([t])
      const cx = vs.reduce((a, v) => a + v.x, 0) / vs.length
      const { yc, rMax } = slabAt(cx)
      return Math.max(...vs.map((v) => Math.hypot(v.y - yc, v.z))) - rMax
    })
    expect(Math.min(...rises), '有疣突整枚埋在体壁里').toBeGreaterThan(0.004)
    expect(rises.filter((r) => r > 0.01).length / rises.length, '八成以上的疣突要明显凸起').toBeGreaterThan(0.8)
    expect(Math.max(...rises), '最高的疣突要真的看得见').toBeGreaterThan(0.025)
    // 上限：凸过 0.08 就不是疣突而是角了
    expect(Math.max(...rises)).toBeLessThan(0.08)
  })

  it('每枚疣突顶上生短刚毛（毛数 ≥ 2 枚/瘤，且真的又细又短）', () => {
    expect(setae.length / tubercles.length).toBeGreaterThanOrEqual(2)
    for (const s of setae) {
      const { len, thick } = tubeShape(s)
      // 实测长 0.024~0.043、粗 0.0070。上下限齐给：只给下限时它可以长成触角
      expect(len, '刚毛太短就看不见了').toBeGreaterThan(0.012)
      expect(len, '刚毛长过这个数就成了触角').toBeLessThan(0.08)
      expect(thick, '刚毛必须细').toBeLessThan(0.012)
      expect(len / thick, '刚毛是一根毛，不是一枚小瘤').toBeGreaterThan(2.5)
    }
  })

  it('体壁是石板蓝黑 —— 是蓝黑，不是纯黑', () => {
    const b = hslByName(larva, 'larva-body')
    // 换成 #111111（纯黑）时 s=0，这条当场红
    expect(b.s, '饱和度掉到 0 就是中性黑，丢了这只虫最直接的辨识特征').toBeGreaterThan(0.18)
    expect(b.h, '色相要落在蓝区').toBeGreaterThan(190)
    expect(b.h).toBeLessThan(250)
    expect(b.l, '深，但不是全黑').toBeGreaterThan(0.12)
    expect(b.l, '这是「蓝黑」，不是石板灰').toBeLessThan(0.34)
  })

  it('橙斑真的亮得起来，与蓝黑体壁分得开', () => {
    const s = hslByName(larva, 'orange-spot')
    const b = hslByName(larva, 'larva-body')
    expect(s.h, '色相在橙区').toBeGreaterThan(20)
    expect(s.h).toBeLessThan(48)
    expect(s.s, '压成暗棕这条就红 —— 「越深越保险」是本仓库栽过的那个跟头').toBeGreaterThan(0.7)
    // 明度对齐 ladybird.ts 的朱红 #e2382a（0.53）
    expect(s.l).toBeGreaterThan(0.45)
    expect(s.l).toBeLessThan(0.66)
    expect(s.l - b.l, '橙与蓝黑的明度差').toBeGreaterThan(0.25)
  })

  it('橙斑成对落在两段以上体节上，且在屏幕上看得见', () => {
    expect(spots.length).toBeGreaterThanOrEqual(4)
    const right = spots.filter((m) => centerOf([m]).z > 0)
    expect(right.length * 2, '橙斑必须左右成对').toBe(spots.length)
    const stations = new Set(spots.map((m) => +centerOf([m]).x.toFixed(2)))
    expect(stations.size, '橙斑要分布在不同体节上（真实分布在 A1 与 A4）').toBeGreaterThanOrEqual(2)
    // 取景按 radius 归一化，2% 在 720 像素的画面上约 14 像素
    const d = Math.max(...spots.map((m) => sizeOf([m]).x))
    expect(d / (2 * larva.radius)).toBeGreaterThan(0.02)
  })

  it('只有 3 对胸足 —— 没有腹足，这不是毛虫', () => {
    /*
     * 分两步钉：
     * 1. kit.legPair() 注册的分节足正好 6 条；
     * 2. **腹面之下的几何全部落在体前 40%**。
     *    第 2 条才是真正管用的那条 —— 把腹足画成别的名字、别的做法都躲不过：
     *    鳞翅目幼虫的 4 对腹足在 A3~A6，落在体长的 45%~75% 处，一加就红。
     *    实测最靠后的一点是后足跗节，x=0.122，阈值 0.035。
     */
    expect(larva.rig?.legs, '胸足必须是 kit 的分节足').toBeDefined()
    expect(larva.rig?.legs).toHaveLength(6)
    for (const l of larva.rig?.legs ?? []) {
      expect(l.base.x, '三对足全长在胸部').toBeGreaterThan(bodyBox.max.x - bodyLen * 0.3)
    }

    const bellyY = Math.min(...bodyVerts.map((v) => v.y))
    const below = vertsOf(allMeshes(larva)).filter((v) => v.y < bellyY - 0.012)
    expect(below.length, '一条腿都没伸到腹面之下？').toBeGreaterThan(50)
    expect(
      Math.min(...below.map((v) => v.x)),
      '腹面之下出现了体后段的附肢 —— 瓢虫幼虫没有腹足',
    ).toBeGreaterThan(bodyBox.max.x - bodyLen * 0.4)
  })

  it('头小而深色，在最前端，且带着比头亮得多的口器', () => {
    expect(head).toHaveLength(1)
    const headBox = boxOf(head)
    expect(headBox.getCenter(new THREE.Vector3()).x, '头必须在最前').toBeGreaterThan(bodyBox.max.x - bodyLen * 0.1)
    expect(headBox.getSize(new THREE.Vector3()).z, '头做大了就成了一只蝇').toBeLessThan(sizeOf(body).z * 0.75)

    const h = hslByName(larva, 'head-capsule')
    expect(h.l, '头壳高度骨化，近黑').toBeLessThan(0.15)

    // 咀嚼式口器：头前方伸出的、明显比头壳亮的件（kit.mandibles 的产物无名，按材质找）
    const bright = allMeshes(larva).filter((m) => {
      const c = centerOf([m])
      return c.x > headBox.getCenter(new THREE.Vector3()).x && hslOf(m).l > h.l + 0.25
    })
    expect(bright.length, '头前方没有亮色的口器 —— 深色镰刀糊在深色头上等于没做').toBeGreaterThanOrEqual(2)
    expect(boxOf(bright).max.x, '口器要伸出头壳之外').toBeGreaterThan(headBox.max.x)
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹：尾端连着旧皮、前端上翘的裸蛹', () => {
  const shell = meshesByName(pupa, 'pupa-shell')
  const skin = meshesByName(pupa, 'larval-skin')
  const skinTubercles = meshesByName(pupa, 'skin-tubercle')
  const ridges = meshesByName(pupa, 'segment-ridge')
  const spots = meshesByName(pupa, 'pupa-spot')
  const leaves = meshesByName(pupa, 'leaf')
  const shellVerts = vertsOf(shell)
  const skinCenter = centerOf(skin)

  /**
   * 体轴：蛹壳顶点云的主轴，方向取「背离旧皮」的那一头为头端。
   * 蛹是斜着摆的，所有「沿体轴」的量都得先有这根轴；从几何求而不是读常量，
   * 是为了让改坏姿态的实现也逃不掉。
   */
  const axisDir = principalAxis(shellVerts)
  if (centerOf(shell).clone().sub(skinCenter).dot(axisDir) < 0) axisDir.negate()
  const proj = shellVerts.map((v) => v.dot(axisDir))
  const tailTip = shellVerts[proj.indexOf(Math.min(...proj))]
  const headTip = shellVerts[proj.indexOf(Math.max(...proj))]
  const axisLen = Math.max(...proj) - Math.min(...proj)

  it('体长 0.38~0.55 厘米、体宽 0.24~0.38，短而饱满', () => {
    expect(axisLen).toBeGreaterThan(0.38)
    expect(axisLen).toBeLessThan(0.55)
    const width = sizeOf(shell).z
    expect(width).toBeGreaterThan(0.24)
    expect(width).toBeLessThan(0.38)
    const slender = axisLen / width
    // 1.2~2.0：再瘦就成了蚕蛹或一根豆荚，再胖就是一颗球
    expect(slender).toBeGreaterThan(1.2)
    expect(slender).toBeLessThan(2.0)
  })

  it('招牌姿态：腹末贴着叶面、前端上翘 15~50°', () => {
    expect(leaves).toHaveLength(1)
    const leafTop = boxOf(leaves).max.y

    /*
     * 「只有腹末着地」这句话的几何形式：全身最低的那个点
     * (a) 贴着叶面（既不悬空也不陷进去），且 (b) 落在体后三分之一里。
     * 把蛹放平躺在叶上时，最低点会跑到体中段，(b) 当场红。
     */
    const lowest = shellVerts.reduce((a, v) => (v.y < a.y ? v : a), shellVerts[0])
    expect(lowest.y - leafTop, '整只蛹陷进叶子里了').toBeGreaterThan(-0.02)
    expect(lowest.y - leafTop, '蛹悬在叶面之上，没黏住').toBeLessThan(0.02)
    expect(
      (lowest.dot(axisDir) - Math.min(...proj)) / axisLen,
      '着地的不是腹末 —— 蛹平躺在叶面上了',
    ).toBeLessThan(0.35)

    // 前端明显高于尾端。把蛹放平这条也红
    expect(headTip.y - tailTip.y, '前端没有上翘').toBeGreaterThan(0.09)
    const tilt = (Math.asin(THREE.MathUtils.clamp(axisDir.y, -1, 1)) * 180) / Math.PI
    expect(tilt, '仰角').toBeGreaterThan(15)
    expect(tilt, '翘成一根竖起来的棒子就不对了').toBeLessThan(50)
  })

  it('尾端挂着蜕下的幼虫皮，皱成一团、连着蛹体、塌在叶面上', () => {
    /*
     * 这一条是这枚蛹全部的辨识度所在。删掉旧皮，它就退回成一颗橙色的小豆子 ——
     * 而别的断言（体长、颜色、黑斑、横脊）一条都不会红。
     */
    expect(skin.length, '旧皮至少要有几片褶，一整块光滑的球读成巧克力豆').toBeGreaterThanOrEqual(4)
    expect(skinTubercles.length, '旧皮上要留着幼虫的疣突，否则读成一块泥').toBeGreaterThanOrEqual(3)

    // 在蛹体腹末那一侧，不在头那一侧
    expect(skinCenter.dot(axisDir), '旧皮必须在腹末').toBeLessThan(centerOf(shell).dot(axisDir))
    expect(tailTip.dot(axisDir) - skinCenter.dot(axisDir), '旧皮离腹末太远，读不出「还连着」').toBeLessThan(0.25)

    // 真的挨着蛹体：留缝就断了「旧皮还连在身上」这层意思
    expect(minGap(skin, shell), '旧皮与蛹体之间有缝').toBeLessThan(0.02)

    // 一小团，不是第二只虫
    const along = vertsOf(skin).map((v) => v.dot(axisDir))
    const skinLen = Math.max(...along) - Math.min(...along)
    expect(skinLen / axisLen).toBeGreaterThan(0.2)
    expect(skinLen / axisLen, '旧皮做得比蛹还大就不是「皱缩成一小团」了').toBeLessThan(0.75)

    // 与幼虫同族的石板蓝黑：一眼看出它是上一阶段的遗物
    const s = hslOf(skin[0])
    expect(s.h).toBeGreaterThan(190)
    expect(s.h).toBeLessThan(250)
    expect(s.s, '旧皮压成中性灰就与幼虫接不上了').toBeGreaterThan(0.15)
    expect(s.l).toBeLessThan(0.32)
    expect(hslOf(shell[0]).l - s.l, '旧皮必须与橙黄蛹体明显分开').toBeGreaterThan(0.25)
  })

  it('裸蛹：没有任何东西把它罩起来（不结茧）', () => {
    // 蚂蚁、家蚕化蛹结茧，瓢虫不结。给它套个茧壳这条就红
    const shellBox = boxOf(shell)
    const enclosing = allMeshes(pupa).filter(
      (m) => m.name !== 'pupa-shell' && new THREE.Box3().setFromObject(m).containsBox(shellBox),
    )
    expect(enclosing.map((m) => m.name), '有东西把蛹整个罩住了 —— 瓢虫是裸蛹').toEqual([])
    // 旧皮也只准包住腹末那一小截，不准兜住蛹心
    expect(boxOf(skin).containsPoint(centerOf(shell)), '旧皮把蛹体裹住了').toBe(false)
  })

  it('背面看得出横向分节：≥ 4 道真凸起的横脊，条条是横的', () => {
    expect(ridges.length).toBeGreaterThanOrEqual(4)
    for (const r of ridges) {
      const vs = vertsOf([r])
      const c = vs.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(vs.length)
      const along = vs.map((v) => v.clone().sub(c).dot(axisDir))
      const perp = vs.map((v) => {
        const d = v.clone().sub(c)
        return d.addScaledVector(axisDir, -d.dot(axisDir)).length()
      })
      const span = Math.max(...along) - Math.min(...along)
      const girth = 2 * Math.max(...perp)
      // 横的环：沿体轴的跨度远小于绕体一圈的直径。做成纵条纹这个比值会大于 1
      expect(span / girth, '横脊必须是横的').toBeLessThan(0.35)
      // 而且必须绕住身体，不是一小段弧
      expect(girth / sizeOf(shell).z).toBeGreaterThan(0.4)
    }
  })

  it('橙黄底带黑斑，左右成对，且黑斑在屏幕上看得见', () => {
    const s = hslByName(pupa, 'pupa-shell')
    const k = hslByName(pupa, 'pupa-spot')
    expect(s.h, '色相在橙黄区').toBeGreaterThan(25)
    expect(s.h).toBeLessThan(50)
    expect(s.s, '压灰了就是一颗土黄的豆子').toBeGreaterThan(0.7)
    // 明度对齐 ladybird.ts 的朱红 #e2382a（0.53）
    expect(s.l).toBeGreaterThan(0.45)
    expect(s.l).toBeLessThan(0.66)
    expect(k.l, '黑斑要真的近黑').toBeLessThan(0.18)
    expect(s.l - k.l, '斑与底的明度差').toBeGreaterThan(0.3)

    expect(spots.length).toBeGreaterThanOrEqual(8)
    const right = spots.filter((m) => centerOf([m]).z > 0)
    expect(right.length * 2, '黑斑必须左右成对').toBe(spots.length)
    const stations = new Set(spots.map((m) => +centerOf([m]).x.toFixed(2)))
    expect(stations.size, '黑斑要沿体节排开，不是挤在一处').toBeGreaterThanOrEqual(4)

    const d = Math.min(...spots.map((m) => Math.max(...sizeOf([m]).toArray())))
    expect(d / (2 * pupa.radius), '最小的黑斑也得看得见').toBeGreaterThan(0.02)
  })
})
