/**
 * 帝王蝶生活史三阶段（卵 / 幼虫 / 蛹）的形态验证。
 *
 * 写这些断言时的自检标准只有一条：**把代码改回出问题的那一版，这条会不会红？**
 * 所以每条断言下面都注了它对应的是哪个真实事故 —— 有几条正是本轮目视验收
 * 当场抓出来的（尾端锯断的塑料管、白带细成一条灰线、长方形贴纸似的翅芽）。
 *
 * 另一条同样贵的教训：**断言量的是数字，人看的是长相，两者可以毫无关系。**
 * 所以「大小」类断言一律上下限齐给（天蛾的喙只给下限，长成了三四倍体长的标枪），
 * 「看得见」类断言一律换算成占画面的比例 —— 取景按 model.radius 归一化，
 * 一条带宽 / 画面直径 就是它在屏幕上占多少，比绝对尺寸更接近人眼看到的那个量。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildMonarchButterflyEgg } from '../stages/monarch-butterfly-egg'
import { buildMonarchButterflyLarva } from '../stages/monarch-butterfly-larva'
import { buildMonarchButterflyPupa } from '../stages/monarch-butterfly-pupa'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

const egg = buildMonarchButterflyEgg()
const larva = buildMonarchButterflyLarva()
const pupa = buildMonarchButterflyPupa()

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

/** 一组网格在模型局部坐标下的并集包围盒 */
function boxOf(meshes: THREE.Object3D[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const m of meshes) box.union(new THREE.Box3().setFromObject(m))
  return box
}

function sizeOf(meshes: THREE.Object3D[]): THREE.Vector3 {
  return boxOf(meshes).getSize(new THREE.Vector3())
}

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

/**
 * 材质基色的 HSL。**必须显式指定 sRGB**：three 的颜色管理把 hex 转进线性工作空间，
 * 缺省 getHSL 返回的是线性明度，深色会被压扁（#141117 线性 L≈0.006），阈值全失真。
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
 * 从一根放样管里还原中轴线：loft() 的顶点是逐截面、每截面 radialSegments+1 个，
 * 取每一环的平均即得该处轴心（末尾两个封口中心点凑不满一环，整除时自然落掉）。
 *
 * 与「量包围盒」相比，这个量的是**弧**：包围盒分不出一根直刺和一条弯钩，
 * 而「肉质突起是软的、向后弯」正是这一对结构的形态学要点。
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

/**
 * 一条附肢末端的横截宽度：取最低的一薄层顶点，量其水平包围盒对角线。
 * 「胸足尖细带爪 vs 腹足末端是宽的吸盘状趾面」这件事，人看的就是这个量。
 */
function tipWidth(meshes: THREE.Mesh[], slab = 0.03): number {
  const verts = vertsOf(meshes)
  const yMin = Math.min(...verts.map((v) => v.y))
  const low = verts.filter((v) => v.y <= yMin + slab)
  const box = new THREE.Box3()
  for (const v of low) box.expandByPoint(v)
  const s = box.getSize(new THREE.Vector3())
  return Math.hypot(s.x, s.z)
}

/** 一组网格中，落在 [y0,y1] 高度带内的顶点离 Y 轴的最大距离（旋转体的「当地半径」） */
function maxRadius(meshes: THREE.Mesh[], y0: number, y1: number): number {
  let max = 0
  for (const v of vertsOf(meshes)) {
    if (v.y < y0 || v.y > y1) continue
    max = Math.max(max, Math.hypot(v.x, v.z))
  }
  return max
}

/** 一组点绕 Y 轴的方位角排序后，相邻两点之间的最大角间隙（度）。用来判「是不是绕了一整圈」 */
function maxAzimuthGap(points: THREE.Vector3[]): number {
  const angs = points.map((p) => ((Math.atan2(p.z, p.x) * 180) / Math.PI + 360) % 360).sort((a, b) => a - b)
  let max = 0
  for (let i = 0; i < angs.length; i++) {
    const next = i === angs.length - 1 ? angs[0] + 360 : angs[i + 1]
    max = Math.max(max, next - angs[i])
  }
  return max
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

  it.each(all)('%s：anchors 都是有限坐标，且落在模型的包围盒内', (_name, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length).toBeGreaterThan(0)
    const box = new THREE.Box3().setFromObject(model.group).expandByScalar(model.radius * 0.06)
    for (const k of keys) {
      const v = model.anchors[k]
      expect(v).toBeInstanceOf(THREE.Vector3)
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${k} 坐标非有限`).toBe(true)
      // 标注点飘在虫体之外时页面不会报错，只是那个点指着空气
      expect(box.containsPoint(v), `anchor ${k} 落在模型之外`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------- 卵

describe('卵：带纵棱的炮弹形', () => {
  const shell = meshesByName(egg, 'egg-shell')
  const ridges = meshesByName(egg, 'egg-ridge')
  const striae = meshesByName(egg, 'egg-stria')

  it('体量是一粒 1.2 毫米的卵，且高大于宽（炮弹形，不是球）', () => {
    const s = sizeOf([...shell, ...ridges])
    // 真实 1.2 × 0.9 毫米。上下限齐给：放大到「好看」是 stages.ts 明令禁止的
    expect(s.y).toBeGreaterThan(0.1)
    expect(s.y).toBeLessThan(0.14)
    expect(s.x).toBeGreaterThan(0.07)
    expect(s.x).toBeLessThan(0.12)
    const slender = s.y / Math.max(s.x, s.z)
    expect(slender, '高宽比落在 1.15~1.7 之外就不是炮弹形了（球是 1，米粒是 1.3 上下）').toBeGreaterThan(1.15)
    expect(slender).toBeLessThan(1.7)
  })

  it('纵棱 20~26 条，绕卵一整圈均布', () => {
    expect(ridges.length).toBeGreaterThanOrEqual(20)
    expect(ridges.length).toBeLessThanOrEqual(26)
    const centers = ridges.map((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))
    // 均布 23 条时平均间隔 15.7°；最大间隙超过 25° 说明有一侧是秃的
    expect(maxAzimuthGap(centers), '纵棱没有绕满一圈').toBeLessThan(25)
  })

  it('每条棱都是纵向的（竖着的棱，不是横着的环）', () => {
    for (const r of ridges) {
      const s = new THREE.Box3().setFromObject(r).getSize(new THREE.Vector3())
      const across = Math.max(s.x, s.z)
      expect(s.y / across, '棱的竖向跨度必须明显大于横向跨度').toBeGreaterThan(1.6)
    }
  })

  it('棱真的凸出于卵壳（不是画在壳上的一条线）', () => {
    const shellHalf = sizeOf(shell).x / 2
    const ridgeHalf = sizeOf(ridges).x / 2
    expect(ridgeHalf - shellHalf, '棱脊冠面必须高出壳面').toBeGreaterThan(0.003)
    // 上限：高过 0.02 就不是棱而是一圈刺了
    expect(ridgeHalf - shellHalf).toBeLessThan(0.02)
  })

  it('棱在屏幕上分得开（棱间距 / 画面直径 ≥ 1.5%）', () => {
    // 取景按 radius 归一化，所以「占画面多少」才是人真正看见的量。
    // 720 像素的画面上，1.5% ≈ 11 像素 —— 数得出来的粗细
    const spacing = (2 * Math.PI * (sizeOf(ridges).x / 2)) / ridges.length
    expect(spacing / (2 * egg.radius)).toBeGreaterThan(0.015)
  })

  it('横向细纹 ≥ 6 环，且真的是横的', () => {
    expect(striae.length).toBeGreaterThanOrEqual(6)
    for (const s of striae) {
      const sz = new THREE.Box3().setFromObject(s).getSize(new THREE.Vector3())
      expect(sz.y, '横纹必须是薄薄一圈').toBeLessThan(0.012)
      expect(sz.x, '横纹必须绕住卵身').toBeGreaterThan(0.03)
    }
  })

  it('乳白略带黄，且棱脊比壳面亮一档', () => {
    const shellHsl = hslByName(egg, 'egg-shell')
    const ridgeHsl = hslByName(egg, 'egg-ridge')
    expect(shellHsl.h, '色相要落在黄区').toBeGreaterThan(30)
    expect(shellHsl.h).toBeLessThan(60)
    expect(shellHsl.l, '乳白 —— 不能压深成土色').toBeGreaterThan(0.65)
    expect(shellHsl.l).toBeLessThan(0.9)
    expect(ridgeHsl.l - shellHsl.l, '棱是受光的凸起，压成同色等于白做了几何').toBeGreaterThan(0.08)
  })
})

// ---------------------------------------------------------------- 幼虫

describe('幼虫：黑黄白三色带的毛虫', () => {
  const black = meshesByName(larva, 'band-black')
  const white = meshesByName(larva, 'band-white')
  const yellow = meshesByName(larva, 'band-yellow')
  const bands = [...black, ...white, ...yellow]
  const front = meshesByName(larva, 'tentacle-front')
  const rear = meshesByName(larva, 'tentacle-rear')
  const prolegs = meshesByName(larva, 'proleg')
  const claspers = meshesByName(larva, 'clasper')
  const spiracles = meshesByName(larva, 'spiracle')
  const bodyLen = sizeOf([larva.group]).x

  it('体长 4.3~5.2 厘米（末龄幼虫，比成虫体躯还长）', () => {
    expect(bodyLen).toBeGreaterThan(4.3)
    expect(bodyLen).toBeLessThan(5.2)
  })

  it('三色逐对的明度差都拉得开 —— 这是第 5 轮 7 只返工的那条', () => {
    const b = hslByName(larva, 'band-black')
    const w = hslByName(larva, 'band-white')
    const y = hslByName(larva, 'band-yellow')
    // 「越深越保险」把黑白压成深灰叠深灰，招牌图案就在画面上消失了
    expect(b.l, '黑要真的接近黑').toBeLessThan(0.15)
    expect(w.l, '白要真的接近白').toBeGreaterThan(0.85)
    expect(Math.abs(w.l - b.l)).toBeGreaterThan(0.6)
    expect(Math.abs(y.l - b.l), '黄与黑必须分得开').toBeGreaterThan(0.3)
    expect(Math.abs(w.l - y.l), '白与黄必须分得开').toBeGreaterThan(0.25)
    // 黄要真的是黄：色相在黄区、饱和度够高（压灰了就成了土黄）
    expect(y.h).toBeGreaterThan(35)
    expect(y.h).toBeLessThan(60)
    expect(y.s).toBeGreaterThan(0.6)
    expect(y.l).toBeGreaterThan(0.4)
    expect(y.l).toBeLessThan(0.72)
  })

  it('逐节一组：13 节 × (黑 白 黄 白)', () => {
    expect(black).toHaveLength(13)
    expect(yellow).toHaveLength(13)
    expect(white).toHaveLength(26)
  })

  it('色带是横的环带，且铺满整条体躯', () => {
    const bandSpan = sizeOf(bands).x
    expect(bandSpan / bodyLen, '色带必须贯穿全身，不能只在中段').toBeGreaterThan(0.85)
    for (const b of bands) {
      const s = new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3())
      // 只查体躯主段：尾端封口处横径本就趋近于零，那里的比值没有意义
      if (s.z < 0.25) continue
      expect(s.x / s.z, '横带沿体轴的跨度必须远小于横径，否则就成了纵条纹').toBeLessThan(0.6)
    }
  })

  it('每一条带在屏幕上都看得见（最窄的带 / 画面直径 ≥ 0.9%）', () => {
    // 第一版白带按 0.11/0.12 给，渲染出来细成一条灰线，三色里丢了一色。
    // 0.6% 在 720 像素的画面上约 4 像素 —— 低于这个数就不能算「三色分得开」
    const narrowest = Math.min(...bands.map((b) => new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).x))
    // 阈值是照着「坏掉的那一版」标定的：白带占比 0.11 时这个数是 0.0080，
    // 加宽到 0.14 后是 0.0100 —— 0.009 正卡在两者之间，才算真的管住了
    expect(narrowest / (2 * larva.radius)).toBeGreaterThan(0.009)
  })

  it('两对肉质突起：前长后短、都向后弯、都是弧不是刺', () => {
    expect(front).toHaveLength(2)
    expect(rear).toHaveLength(2)

    const measure = (m: THREE.Mesh) => {
      const pts = centerline(m, 10)
      const base = pts[0]
      const tip = pts[pts.length - 1]
      return { len: arcLength(pts), chord: base.distanceTo(tip), base, tip }
    }
    const f = measure(front[0])
    const r = measure(rear[0])

    // 长度上下限齐给：末龄幼虫前突起约 1.2 厘米、后突起约 0.6 厘米
    expect(f.len).toBeGreaterThan(0.9)
    expect(f.len).toBeLessThan(1.6)
    expect(r.len).toBeGreaterThan(0.45)
    expect(r.len).toBeLessThan(0.85)
    const ratio = f.len / r.len
    expect(ratio, '前后突起的长短比约 2:1').toBeGreaterThan(1.5)
    expect(ratio).toBeLessThan(2.6)

    for (const [what, m] of [
      ['前', f],
      ['后', r],
    ] as const) {
      expect(m.base.x - m.tip.x, `${what}突起的末梢要落在基部之后（向后弯）`).toBeGreaterThan(0.15)
      expect(m.tip.y - m.base.y, `${what}突起要向上扬起`).toBeGreaterThan(0.2)
      // 弧长明显大于弦长 = 真的是弯的。直刺的比值恒等于 1
      expect(m.len / m.chord, `${what}突起是柔软的弧，不是直刺`).toBeGreaterThan(1.05)
    }

    // 着生位置：前一对在胸部（T2）、后一对在腹端（A8），中间隔着大半条虫
    expect(f.base.x - r.base.x).toBeGreaterThan(2)
  })

  it('三类附肢的数量对：3 对胸足 + 4 对腹足 + 1 对尾足', () => {
    // 胸足走 kit.legPair()，因此在 rig 里注册成了 6 条分节的腿
    expect(larva.rig?.legs, '胸足必须是 kit 的分节足（有骨架句柄）').toBeDefined()
    expect(larva.rig?.legs).toHaveLength(6)
    expect(prolegs).toHaveLength(8)
    expect(claspers).toHaveLength(2)
  })

  it('三类附肢的形态真的不同：胸足尖细带爪，腹足/尾足末端是宽的趾面', () => {
    // 逐条量，不能把六条腿并成一团再量 —— 那样量到的是「左右腿之间的跨度」，
    // 与「一条腿的末端有多宽」毫无关系（第一版就栽在这儿，数字 1.15 看着还挺像回事）
    const legTips = (larva.rig?.legs ?? []).map((leg) => {
      const meshes: THREE.Mesh[] = []
      leg.coxa.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) meshes.push(m)
      })
      return tipWidth(meshes)
    })
    const legTip = Math.max(...legTips)
    // 腹足连它那圈趾钩一起量：人看到的「吸盘状趾面」就是肉柱末端 + 趾钩环，
    // 而趾钩环是水平的，量起来还不受尾足后倾的影响
    const footWidth = (wall: THREE.Mesh) => {
      const parts: THREE.Mesh[] = []
      ;(wall.parent ?? wall).traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) parts.push(m)
      })
      return tipWidth(parts)
    }
    const prolegTip = Math.min(...prolegs.map(footWidth))
    const clasperTip = Math.min(...claspers.map(footWidth))
    // 把腹足画成缩小版的胸足是最常见的错法，这条正对着它
    expect(prolegTip / legTip, '腹足末端必须明显宽于胸足末端').toBeGreaterThan(3)
    expect(clasperTip / legTip).toBeGreaterThan(3)

    for (const p of [...prolegs, ...claspers]) {
      const s = new THREE.Box3().setFromObject(p).getSize(new THREE.Vector3())
      const dims = [s.x, s.y, s.z].sort((a, b) => a - b)
      // 粗短的肉柱：最长边不到最短边的 2.2 倍。细长的分节足过不了这一条
      expect(dims[2] / dims[0], '腹足是粗短的肉质突起').toBeLessThan(2.2)
    }
  })

  it('附肢按体节分区：胸足在前、腹足在 A3~A6、尾足在末端且中间空着三节', () => {
    const legX = (larva.rig?.legs ?? []).map((l) => l.base.x)
    const prolegX = [...new Set(prolegs.map((p) => +new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3()).x.toFixed(3)))].sort(
      (a, b) => b - a,
    )
    const clasperX = boxOf(claspers).getCenter(new THREE.Vector3()).x

    expect(Math.min(...legX), '胸足必须全在腹足之前').toBeGreaterThan(Math.max(...prolegX))
    expect(clasperX, '尾足必须在最后').toBeLessThan(Math.min(...prolegX))

    expect(prolegX).toHaveLength(4)
    const gaps = prolegX.slice(1).map((x, i) => prolegX[i] - x)
    const segLen = 4.4 / 13
    for (const gg of gaps) {
      expect(gg, '相邻腹足相隔正好一节').toBeGreaterThan(segLen * 0.75)
      expect(gg).toBeLessThan(segLen * 1.25)
    }
    // A6 与 A10 之间空着 A7~A9 —— 这段空档是肉眼可辨的科普点，
    // 把腹足摊到每一节上就会砸掉这条
    expect(Math.min(...prolegX) - clasperX).toBeGreaterThan(segLen * 2.5)
  })

  it('尾端收细封口，不是一截锯断的塑料管', () => {
    // 目视验收当场抓到的：只做包络时尾端还留着 0.15 的半径，放样封口封出一个
    // 正圆平面，四个机位下都读成锯断的管子。量「尾端最后 1% 体长处的横径」
    const verts = vertsOf(bands)
    const xs = verts.map((v) => v.x)
    const xMin = Math.min(...xs)
    const maxR = Math.max(...verts.map((v) => Math.abs(v.z)))
    const tail = verts.filter((v) => v.x <= xMin + bodyLen * 0.01)
    const tailR = Math.max(...tail.map((v) => Math.abs(v.z)))
    // 不封口那一版这个数是 0.50（尾端半径几乎没收），封口后是 0.22
    expect(tailR / maxR, '尾端必须收细').toBeLessThan(0.35)
  })

  it('头壳是黑的、纹是浅的 —— 与体节同一套警戒配色', () => {
    const head = hslByName(larva, 'head-capsule')
    const stripe = hslByName(larva, 'head-stripe')
    expect(head.l, '帝王蝶幼虫的头壳是黑底').toBeLessThan(0.15)
    expect(stripe.l - head.l, '头纹要与头壳分得开').toBeGreaterThan(0.6)
  })

  it('体侧一排气门：9 对，左右各 9，且每个都很小', () => {
    expect(spiracles).toHaveLength(18)
    const right = spiracles.filter((s) => new THREE.Box3().setFromObject(s).getCenter(new THREE.Vector3()).z > 0)
    expect(right).toHaveLength(9)
    for (const s of spiracles) {
      const sz = new THREE.Box3().setFromObject(s).getSize(new THREE.Vector3())
      expect(Math.max(sz.x, sz.y, sz.z)).toBeLessThan(0.1)
    }
  })

  it('头壳在最前端，且不比体躯粗', () => {
    const head = boxOf(meshesByName(larva, 'head-capsule'))
    const headC = head.getCenter(new THREE.Vector3())
    const bandC = bands.map((b) => new THREE.Box3().setFromObject(b).getCenter(new THREE.Vector3()).x)
    expect(headC.x).toBeGreaterThan(Math.max(...bandC))
    const headSize = head.getSize(new THREE.Vector3())
    const bodyThick = Math.max(...bands.map((b) => new THREE.Box3().setFromObject(b).getSize(new THREE.Vector3()).z))
    expect(headSize.z, '毛虫的头比身体细，做大了会变成一只蝇').toBeLessThan(bodyThick)
  })
})

// ---------------------------------------------------------------- 蛹

describe('蛹：倒挂的金斑绿蛹', () => {
  const shell = meshesByName(pupa, 'pupa-shell')
  const gold = meshesByName(pupa, 'gold-spot')
  const wingPads = meshesByName(pupa, 'wing-pad')
  const eyePads = meshesByName(pupa, 'eye-pad')
  const cremaster = meshesByName(pupa, 'cremaster')
  const silk = meshesByName(pupa, 'silk-pad')
  const shellBox = boxOf(shell)

  it('长约 2.5 厘米的短粗瓮形（不是细长的荚）', () => {
    const s = shellBox.getSize(new THREE.Vector3())
    expect(s.y).toBeGreaterThan(2.1)
    expect(s.y).toBeLessThan(2.9)
    expect(s.x).toBeGreaterThan(0.9)
    expect(s.x).toBeLessThan(1.35)
    const slender = s.y / s.x
    expect(slender, '细长比 1.8~2.6：再瘦就成了蚕蛹或一根豆荚').toBeGreaterThan(1.8)
    expect(slender).toBeLessThan(2.6)
  })

  it('垂蛹：悬垂器与丝垫在顶端，头端（复眼、翅芽）在下半截', () => {
    const crem = boxOf(cremaster).getCenter(new THREE.Vector3())
    const pad = boxOf(silk).getCenter(new THREE.Vector3())
    expect(crem.y, '悬垂器要在蛹体顶端之上').toBeGreaterThan(shellBox.max.y - 0.16)
    expect(pad.y, '丝垫在悬垂器之上 —— 蛹是挂在它上面的').toBeGreaterThan(crem.y)
    // 头朝下：复眼隆起必须落在蛹体的下半截。把整只蛹翻过来这条就红
    const eye = boxOf(eyePads).getCenter(new THREE.Vector3())
    expect(eye.y).toBeLessThan(shellBox.getCenter(new THREE.Vector3()).y - 0.5)
    const wing = boxOf(wingPads).getCenter(new THREE.Vector3())
    expect(wing.y).toBeLessThan(shellBox.getCenter(new THREE.Vector3()).y)
  })

  it('招牌金斑：一整圈 ≥ 10 点绕体排开，另有零星几点', () => {
    expect(gold.length).toBeGreaterThanOrEqual(14)
    const centers = gold.map((m) => new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))
    // 环：取高度最集中的那一簇（同一高度上下 0.12 之内）
    const byHeight = centers.slice().sort((a, b) => a.y - b.y)
    let best: THREE.Vector3[] = []
    for (const c of byHeight) {
      const group = centers.filter((o) => Math.abs(o.y - c.y) <= 0.12)
      if (group.length > best.length) best = group
    }
    expect(best.length, '金斑环上的点数（真实蛹十余点）').toBeGreaterThanOrEqual(10)
    expect(maxAzimuthGap(best), '金斑必须绕成一整圈，不能只排在正面').toBeLessThan(55)
    // 环在翅芽上缘：这一圈金标的就是腹部与翅芽的交界
    const ringY = best.reduce((s, p) => s + p.y, 0) / best.length
    expect(ringY).toBeGreaterThan(boxOf(wingPads).max.y - 0.15)
  })

  it('金斑在屏幕上是「一点金」而不是一粒看不见的沙（直径 / 画面直径 ≥ 2%）', () => {
    const d = Math.max(...gold.map((m) => new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).length()))
    expect(d / (2 * pupa.radius)).toBeGreaterThan(0.02)
  })

  it('金要真的亮得出来，玉绿要真的是绿的', () => {
    const g = hslByName(pupa, 'gold-spot')
    const s = hslByName(pupa, 'pupa-shell')
    expect(g.h, '金的色相在 35~55°').toBeGreaterThan(35)
    expect(g.h).toBeLessThan(55)
    expect(g.s, '压灰了就是一圈土黄疙瘩').toBeGreaterThan(0.6)
    expect(g.l, '金必须比蛹壳亮得多').toBeGreaterThan(0.55)
    expect(g.l - s.l).toBeGreaterThan(0.12)

    expect(s.h, '玉绿的色相在 100~165°').toBeGreaterThan(100)
    expect(s.h).toBeLessThan(165)
    expect(s.s).toBeGreaterThan(0.3)
    expect(s.l, '亮绿：压成墨绿就不是帝王蝶的蛹了').toBeGreaterThan(0.35)
    expect(s.l).toBeLessThan(0.6)
  })

  it('浮雕的轮廓是梭形，不是长方形贴纸', () => {
    /*
     * 目视验收当场抓到的：第一版浮雕的方位角跨度取常数，于是每块芽都带着
     * 上下两条笔直的横边，侧面机位下读成「往蛹上贴了一张长方形贴纸」。
     * 量的就是人看见的那件事 —— 两端的横向跨度必须明显窄于中段。
     * 矩形版这个比值恒等于 1，梭形版约 0.4。
     */
    const azimuthSpan = (verts: THREE.Vector3[]) => {
      const a = verts.map((v) => (Math.atan2(v.z, v.x) * 180) / Math.PI)
      return Math.max(...a) - Math.min(...a)
    }
    for (const pad of [...wingPads, ...eyePads]) {
      const verts = vertsOf([pad])
      const ys = verts.map((v) => v.y)
      const y0 = Math.min(...ys)
      const y1 = Math.max(...ys)
      const h = y1 - y0
      const top = verts.filter((v) => v.y >= y1 - h * 0.06)
      const mid = verts.filter((v) => Math.abs(v.y - (y0 + y1) / 2) <= h * 0.03)
      expect(azimuthSpan(top) / azimuthSpan(mid), '浮雕上端必须收窄').toBeLessThan(0.6)
    }
  })

  it('表面能看出成虫的分区，且只是浅浮雕（不是贴上去的瘤）', () => {
    expect(wingPads).toHaveLength(2)
    expect(eyePads).toHaveLength(2)
    expect(meshesByName(pupa, 'antenna-pad')).toHaveLength(2)
    expect(meshesByName(pupa, 'leg-pad')).toHaveLength(2)
    expect(meshesByName(pupa, 'proboscis-pad')).toHaveLength(1)

    for (const pad of [...wingPads, ...eyePads, ...meshesByName(pupa, 'antenna-pad', 'leg-pad', 'proboscis-pad')]) {
      const box = new THREE.Box3().setFromObject(pad)
      const c = box.getCenter(new THREE.Vector3())
      expect(c.x, '成虫的芽全在腹面（+X 侧）').toBeGreaterThan(0.05)
      // 隆起量：拿同一高度带里蛹壳自己的半径作基准
      const y0 = c.y - 0.05
      const y1 = c.y + 0.05
      const rise = maxRadius([pad], y0, y1) - maxRadius(shell, y0, y1)
      expect(rise, '浮雕得真的凸出来，否则整块埋在壳里等于没做').toBeGreaterThan(0.005)
      expect(rise, '浅浮雕：凸过 0.09 就成了粘在壳上的一个瘤').toBeLessThan(0.09)
    }
  })
})
