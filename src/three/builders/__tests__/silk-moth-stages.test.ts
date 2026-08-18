/**
 * 柞蚕蛾 Antheraea pernyi 三个生活史阶段（卵 / 幼虫 / 蛹连茧）的形态验证。
 *
 * 写这些断言时的自检标准是本仓库的老规矩：**把代码改回出问题的那一版，
 * 这条断言会失败吗？** 下面每一条都对应一次真实的返工，注释里写明了是哪一次。
 *
 * 还有一条更贵的教训：**断言量的是数字，人看的是长相，两者可以毫无关系**
 * （兰花螳螂的「宽厚比 5.75」全绿，渲染出来是几片侧立薄板）。所以这里尽量量
 * 「用户真正看得见的那个量」：
 *
 * - 毛瘤不量半径，量它**相对同方向体壁的净凸出量** —— 把瘤沉进肉里，半径不变，
 *   凸出量归零，这条会红；
 * - 胸足与腹足不量长度，量**自上而下的收细比** —— 「尖细的真足」与「等粗的肉柱
 *   加一枚更宽的趾面」在这个数上差一个量级，而长度、粗细各自都可能撞车；
 * - 分节不量体节数这个常量，量**躯干半径剖面上的局部极小个数** —— 把环沟填平
 *   （第一版就是这样，出图是一根光滑的绿香肠）这条会红；
 * - 「茧包住蛹」不量包围盒（旋转过的包围盒会虚胖），而是**按 x 分箱对茧壳做最小
 *   二乘圆拟合**，逐个蛹顶点判断是否在拟合出的外壁之内。茧是剖开的，顶点的均值
 *   与包围盒中心都不在轴上，只有拟合拿得到真正的轴。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildSilkMothEgg } from '../stages/silk-moth-egg'
import { buildSilkMothLarva } from '../stages/silk-moth-larva'
import { buildSilkMothPupa } from '../stages/silk-moth-pupa'
import { buildSilkMoth } from '../silk-moth'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

// ---------------------------------------------------------------- 通用工具

function meshesNamed(group: THREE.Group, name: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  group.updateMatrixWorld(true)
  group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.name === name) out.push(m)
  })
  return out
}

/** 世界坐标下的全部顶点（阶段模型里有旋转过的子组，不能只看几何体本身） */
function worldVerts(m: THREE.Mesh): THREE.Vector3[] {
  const pos = m.geometry.getAttribute('position')
  const out: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) {
    out.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(m.matrixWorld))
  }
  return out
}

/** 一组网格顶点的真实包围盒。⚠️ 不用 Box3.setFromObject —— 它取几何包围盒的 8 个角
 *  过变换再求 AABB，旋转过的部件会虚胖（蛹滚了 52°，YZ 尺寸会从 1.56 涨到 2.19）。 */
function vertBox(ms: THREE.Mesh[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const m of ms) for (const p of worldVerts(m)) box.expandByPoint(p)
  return box
}

function inspect(model: InsectModel): { nan: number; triangles: number } {
  let nan = 0
  let triangles = 0
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    const pos = m.geometry.getAttribute('position')
    const arr = pos.array
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) nan++
    triangles += m.geometry.index ? m.geometry.index.count / 3 : pos.count / 3
  })
  return { nan, triangles }
}

/** 材质的 sRGB HSL。必须显式指定色彩空间：three 把 hex 转进线性工作空间，
 *  缺省的 getHSL 返回线性明度，深色会被压扁，阈值随之失真。 */
function hslOf(m: THREE.Mesh): { h: number; s: number; l: number } {
  const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshPhysicalMaterial
  const o = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(o, THREE.SRGBColorSpace)
  return o
}

/** 沿 Y 分箱量每一层的水平宽度，返回 [最上层宽, 最下层宽]。判「尖细」还是「等粗」用它。 */
function taperTopBottom(m: THREE.Mesh, bins = 8): { top: number; bottom: number } {
  const vs = worldVerts(m)
  const yMin = Math.min(...vs.map((p) => p.y))
  const yMax = Math.max(...vs.map((p) => p.y))
  const rows: THREE.Vector3[][] = Array.from({ length: bins }, () => [])
  for (const p of vs) {
    const b = Math.min(bins - 1, Math.floor(((p.y - yMin) / (yMax - yMin + 1e-9)) * bins))
    rows[b].push(p)
  }
  const width = (row: THREE.Vector3[]) => {
    if (row.length < 2) return 0
    const dx = Math.max(...row.map((p) => p.x)) - Math.min(...row.map((p) => p.x))
    const dz = Math.max(...row.map((p) => p.z)) - Math.min(...row.map((p) => p.z))
    return Math.max(dx, dz)
  }
  return { top: width(rows[bins - 1]), bottom: width(rows[0]) }
}

// ================================================================ 卵

describe('柞蚕卵 buildSilkMothEgg', () => {
  const model = buildSilkMothEgg()
  const shells = meshesNamed(model.group, 'egg-shell')
  const blotches = meshesNamed(model.group, 'egg-blotch')

  it('能构建，无 NaN，面数在预算内', () => {
    const { nan, triangles } = inspect(model)
    expect(nan).toBe(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('一窝三粒，共用同一个几何体', () => {
    let eggs = 0
    model.group.traverse((o) => {
      if (o.name === 'egg') eggs++
    })
    expect(eggs, '柞蚕蛾成堆产卵，单独一粒读起来像颗药片').toBe(3)
    expect(shells).toHaveLength(3)
    expect(shells[0].geometry, '三粒是同一个几何体的三个实例').toBe(shells[1].geometry)
  })

  it('单粒是扁圆形：长 > 宽 > 厚，长径合真实的 3 毫米，厚只有长的六成', () => {
    shells[0].geometry.computeBoundingBox()
    const s = new THREE.Vector3()
    shells[0].geometry.boundingBox!.getSize(s)
    // 真值 3.0 × 2.5 × 2.0 毫米；上限一起给（只给下限的话，一颗放大十倍的卵也能过）
    expect(s.x, `长径 ${s.x.toFixed(3)} 不在 3 毫米量级`).toBeGreaterThan(0.26)
    expect(s.x).toBeLessThan(0.34)
    expect(s.x, '长径必须大于宽').toBeGreaterThan(s.z)
    expect(s.z, '宽必须大于厚').toBeGreaterThan(s.y)
    // 「扁」要真的扁：厚/长 ∈ [0.5, 0.75]。做成球（1.0）或做成饼（0.2）都会红
    expect(s.y / s.x).toBeGreaterThan(0.5)
    expect(s.y / s.x).toBeLessThan(0.75)
  })

  it('表面真的有凹陷，不是一颗光溜溜的椭球', () => {
    shells[0].geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    shells[0].geometry.boundingBox!.getSize(size)
    const a = size.clone().multiplyScalar(0.5)
    const pos = shells[0].geometry.getAttribute('position')
    let minQ = Infinity
    let maxQ = -Infinity
    for (let i = 0; i < pos.count; i++) {
      // q = (x/a)²+(y/b)²+(z/c)²，完美椭球恒为 1；凹陷把它压到 1 以下
      const q = (pos.getX(i) / a.x) ** 2 + (pos.getY(i) / a.y) ** 2 + (pos.getZ(i) / a.z) ** 2
      minQ = Math.min(minQ, q)
      maxQ = Math.max(maxQ, q)
    }
    // 换算成半径就是至少有处比理想椭球缩了 8%。把 DIMPLE_DEPTH 归零这条立刻红
    expect(minQ, `最深的凹陷只有 ${(1 - Math.sqrt(minQ)).toFixed(3)}，读不出「表面略有凹陷」`).toBeLessThan(0.85)
    // 上限：凹陷只准往里，不准鼓出一堆瘤（那就成了另一种虫的卵）
    expect(maxQ).toBeLessThan(1.15)
  })

  it('褐斑贴在壳上，且与灰白底色的明度差够大', () => {
    expect(blotches.length, '14 块斑 × 3 粒').toBe(42)
    shells[0].geometry.computeBoundingBox()
    const size = new THREE.Vector3()
    shells[0].geometry.boundingBox!.getSize(size)
    const a = size.clone().multiplyScalar(0.5)
    let minQ = Infinity
    let maxQ = -Infinity
    for (const b of blotches.slice(0, 14)) {
      const pos = b.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        const q = (pos.getX(i) / a.x) ** 2 + (pos.getY(i) / a.y) ** 2 + (pos.getZ(i) / a.z) ** 2
        minQ = Math.min(minQ, q)
        maxQ = Math.max(maxQ, q)
      }
    }
    // 斑块的每个顶点都落在壳面附近（±12% 半径），不是浮在旁边的一片膜
    expect(minQ).toBeGreaterThan(0.7)
    expect(maxQ).toBeLessThan(1.3)

    const shellL = hslOf(shells[0]).l
    const blotchL = hslOf(blotches[0]).l
    // 第 5 轮「深灰叠深灰、招牌图案消失」的教训：对比要真的量出来
    expect(shellL, '底色要接近白').toBeGreaterThan(0.75)
    expect(shellL - blotchL, `明度差只有 ${(shellL - blotchL).toFixed(2)}`).toBeGreaterThan(0.35)
  })
})

// ================================================================ 幼虫

describe('柞蚕幼虫 buildSilkMothLarva', () => {
  const model = buildSilkMothLarva()
  const g = model.group
  const trunk = meshesNamed(g, 'larva-trunk')[0]
  const trunkVerts = worldVerts(trunk)
  const trunkBox = new THREE.Box3().setFromPoints(trunkVerts)

  /*
   * 躯干的横截面查询表。放样体的每个截面都落在一个确定的 x 上，一圈 26 个顶点 ——
   * 直接按角度筛顶点只能筛到 0~1 个（相邻顶点差 13.8°），拿它当「体壁半径」
   * 完全不可靠。改成**给每一圈拟合一个椭圆**（中心 + 上下半轴 + 左右半轴），
   * 之后任何方向上的体壁半径都能解析地算出来。
   */
  const ringMap = new Map<number, THREE.Vector3[]>()
  for (const p of trunkVerts) {
    const key = Math.round(p.x * 1e4)
    const arr = ringMap.get(key)
    if (arr) arr.push(p)
    else ringMap.set(key, [p])
  }
  const trunkRings = [...ringMap.entries()]
    .map(([key, pts]) => ({
      x: key / 1e4,
      axisY: (Math.max(...pts.map((p) => p.y)) + Math.min(...pts.map((p) => p.y))) / 2,
      A: (Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y))) / 2,
      B: (Math.max(...pts.map((p) => p.z)) - Math.min(...pts.map((p) => p.z))) / 2,
    }))
    .filter((r) => r.A > 1e-3 && r.B > 1e-3)
    .sort((a, b) => a.x - b.x)
  const ringNear = (x: number) => trunkRings.reduce((best, r) => (Math.abs(r.x - x) < Math.abs(best.x - x) ? r : best), trunkRings[0])
  /** 体壁在 x 处、极角 theta（从背中线朝 +Z 量）方向上的半径 */
  const trunkWallAt = (x: number, theta: number) => {
    const r = ringNear(x)
    return { r, rho: 1 / Math.hypot(Math.cos(theta) / r.A, Math.sin(theta) / r.B) }
  }

  it('能构建，无 NaN，面数在预算内', () => {
    const { nan, triangles } = inspect(model)
    expect(nan).toBe(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it('体长 9~10.5，而且比成虫还长（生活史要讲的就是这个量级差）', () => {
    const box = new THREE.Box3().setFromObject(g)
    const len = box.max.x - box.min.x
    expect(len, `体长 ${len.toFixed(2)} 不在末龄柞蚕的 9~10 厘米量级`).toBeGreaterThan(9)
    expect(len, '上限一起给：只给下限的话，缩放失控也能过').toBeLessThan(10.5)

    const adult = buildSilkMoth()
    const ab = new THREE.Box3().setFromObject(adult.group)
    expect(len, '末龄幼虫比成虫（含展开的翅）还长，这是本阶段的看点').toBeGreaterThan(ab.max.x - ab.min.x)
  })

  it('躯干是圆筒：横截面近圆，且明显细长', () => {
    const s = new THREE.Vector3()
    trunkBox.getSize(s)
    const ratio = s.y / s.z
    expect(ratio, `横截面 ${s.y.toFixed(2)}×${s.z.toFixed(2)}，不是圆筒`).toBeGreaterThan(0.85)
    expect(ratio).toBeLessThan(1.2)
    expect(s.x / s.z, '躯干长径比至少 4:1').toBeGreaterThan(4)
    expect(s.x / s.z, '上限：再细就成了线虫').toBeLessThan(8)
  })

  it('分节看得见：躯干半径剖面上有 10 道以上的环沟，另有 12 圈深色节间膜', () => {
    const BINS = 140
    const x0 = trunkBox.min.x
    const x1 = trunkBox.max.x
    const prof = new Array(BINS).fill(0)
    for (const p of trunkVerts) {
      const b = Math.min(BINS - 1, Math.floor(((p.x - x0) / (x1 - x0)) * BINS))
      prof[b] = Math.max(prof[b], Math.abs(p.z))
    }
    let minima = 0
    for (let i = 2; i < BINS - 2; i++) {
      // 两侧都要比它粗（min 而不是 max）—— 用 max 的话，尾端单调收细的那一段里
      // 每个采样点都会被判成「局部极小」，把环沟填平也照样能凑够数。
      // 这条是突变测试当场抓出来的：GROOVE 归零后旧写法依然全绿。
      if (prof[i] > 0 && prof[i] <= prof[i - 1] && prof[i] <= prof[i + 1] && prof[i] < Math.min(prof[i - 2], prof[i + 2]) * 0.97) minima++
    }
    // 第一版 GROOVE=0.12 时出图是一根光滑的绿香肠；把环沟填平这条会红
    expect(minima, `半径剖面只有 ${minima} 处收腰，看不出分节`).toBeGreaterThanOrEqual(10)
    expect(meshesNamed(g, 'segment-ring'), '12 道节界各一圈深色节间膜').toHaveLength(12)

    const ringL = hslOf(meshesNamed(g, 'segment-ring')[0]).l
    const bodyL = hslOf(trunk).l
    expect(bodyL - ringL, '节间膜要比体色深，才在漫射光下画得出节界').toBeGreaterThan(0.1)
  })

  it('毛瘤 78 个（13 节 × 3 排 × 左右），左右成对，且真的凸出体壁', () => {
    const ver = meshesNamed(g, 'verruca')
    expect(ver, '13 个体节 × 背侧/气门上/气门下 3 排 × 左右').toHaveLength(78)
    expect(ver.filter((m) => m.userData.row === 'dorsal'), '背侧那排 13 对').toHaveLength(26)

    // 成对：每个右侧毛瘤都能找到一个 x 相同、z 相反的左侧毛瘤
    const centers = ver.map((m) => {
      const vs = worldVerts(m)
      const c = new THREE.Vector3()
      for (const p of vs) c.add(p)
      return { c: c.multiplyScalar(1 / vs.length), row: m.userData.row as string, mesh: m }
    })
    for (const a of centers.filter((v) => v.c.z > 0)) {
      const mate = centers.find((b) => b.row === a.row && Math.abs(b.c.x - a.c.x) < 0.02 && Math.abs(b.c.z + a.c.z) < 0.02)
      expect(mate, `x=${a.c.x.toFixed(2)} 的 ${a.row} 毛瘤没有对侧的那一个`).toBeDefined()
    }

    /*
     * 凸出量要沿**毛瘤自己那个方向**量：拿同一 x 处、方向相近的躯干顶点做对照。
     * 若改成「和该处躯干最大半径比」，背侧的毛瘤会被体侧的最宽处压掉，
     * 量出来只有 0.014 —— 那个数字和「看不看得见瘤」是两件事。
     */
    let minOut = Infinity
    for (const { mesh } of centers) {
      // 逐顶点比：这个顶点离体轴多远，减去体壁在**它自己那个方向**上有多远。
      // 取一个毛瘤上的最大值 = 这个瘤鼓出体壁多少；再取全体的最小值。
      let out = -Infinity
      for (const p of worldVerts(mesh)) {
        const theta = Math.atan2(p.z, p.y - ringNear(p.x).axisY)
        const { r, rho } = trunkWallAt(p.x, theta)
        out = Math.max(out, Math.hypot(p.y - r.axisY, p.z) - rho)
      }
      minOut = Math.min(minOut, out)
    }
    expect(minOut, `最不凸的那个毛瘤只高出体壁 ${minOut.toFixed(3)}，会读成体表的一块色斑`).toBeGreaterThan(0.04)
    expect(minOut, '上限：高出太多就成了刺，不是瘤').toBeLessThan(0.2)
  })

  it('毛瘤上生刚毛，且刚毛都长在毛瘤上', () => {
    const setae = meshesNamed(g, 'setae')
    expect(setae, '刚毛合并成一个网格（一根一 mesh 会把 draw call 打爆）').toHaveLength(1)
    expect(setae[0].userData.setaCount, '78 个毛瘤 × 5 根').toBe(390)

    const ver = meshesNamed(g, 'verruca').map((m) => {
      const vs = worldVerts(m)
      const c = new THREE.Vector3()
      for (const p of vs) c.add(p)
      return c.multiplyScalar(1 / vs.length)
    })
    // 抽样：每根刚毛的顶点都得离某个毛瘤足够近，否则就是「凭空长在体壁上的毛」
    const pos = setae[0].geometry.getAttribute('position')
    let worst = 0
    for (let i = 0; i < pos.count; i += 7) {
      const p = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(setae[0].matrixWorld)
      worst = Math.max(worst, Math.min(...ver.map((c) => c.distanceTo(p))))
    }
    expect(worst, `有刚毛离最近的毛瘤 ${worst.toFixed(2)}，不是长在瘤上的`).toBeLessThan(0.6)
  })

  it('气门 9 对：在体侧排成一列，浅色本体 + 深色围边', () => {
    const sp = meshesNamed(g, 'spiracle')
    const rim = meshesNamed(g, 'spiracle-rim')
    // 9 对不是 13 对：真实鳞翅目幼虫只有前胸 + 腹节 1~8 有气门，中后胸没有
    expect(sp, '9 对气门（前胸 1 + 腹节 1~8）').toHaveLength(18)
    expect(rim).toHaveLength(18)

    const trunkR = (x: number) => {
      const near = trunkVerts.filter((p) => Math.abs(p.x - x) < 0.08)
      return near.length ? Math.max(...near.map((p) => Math.abs(p.z))) : 0
    }
    for (const m of sp) {
      const vs = worldVerts(m)
      const c = new THREE.Vector3()
      for (const p of vs) c.add(p)
      c.multiplyScalar(1 / vs.length)
      // 「体侧」：横向偏移至少是该处躯干半径的一半，背中线或腹中线上的气门是错的
      expect(Math.abs(c.z) / trunkR(c.x), `x=${c.x.toFixed(2)} 的气门不在体侧`).toBeGreaterThan(0.5)
    }
    const right = sp
      .map((m) => vertBox([m]).getCenter(new THREE.Vector3()))
      .filter((c) => c.z > 0)
      .sort((a, b) => a.x - b.x)
    // 排成一列：9 枚的 y 落在一条窄带里（散开的话就不是「一排」）
    const ys = right.map((c) => c.y)
    expect(Math.max(...ys) - Math.min(...ys), '同侧 9 枚气门的高度差太大，读不成一排').toBeLessThan(0.6)

    const l1 = hslOf(sp[0]).l
    const l2 = hslOf(rim[0]).l
    expect(l1, '气门本体要接近白').toBeGreaterThan(0.8)
    expect(l1 - l2, '围边要接近黑，两者明度差 ≥ 0.5 才看得出是个「有边的孔」').toBeGreaterThan(0.5)
  })

  it('三种附肢：3 对胸足 + 4 对腹足 + 1 对尾足，数量、位置、形态各不相同', () => {
    const legs = meshesNamed(g, 'thoracic-leg')
    const claws = meshesNamed(g, 'tarsal-claw')
    const pros = meshesNamed(g, 'proleg')
    const plantas = meshesNamed(g, 'planta')
    const anal = meshesNamed(g, 'anal-proleg')
    const analPlanta = meshesNamed(g, 'anal-planta')
    const crochets = meshesNamed(g, 'crochet')

    expect(legs, '3 对胸足').toHaveLength(6)
    expect(claws, '每条胸足一枚爪').toHaveLength(6)
    expect(pros, '4 对腹足（腹节 3~6）').toHaveLength(8)
    expect(plantas).toHaveLength(8)
    expect(anal, '1 对尾足（腹节 10）').toHaveLength(2)
    expect(analPlanta).toHaveLength(2)
    expect(crochets.length, '每枚趾面一列趾钩').toBeGreaterThanOrEqual(9 * 10)

    // 位置：胸足全在腹足之前，腹足全在尾足之前（把腹足画到胸上这条会红）
    expect(vertBox(legs).min.x).toBeGreaterThan(vertBox(pros).max.x)
    expect(vertBox(pros).min.x).toBeGreaterThan(vertBox(anal).max.x)
    // 胸足在前 1/3、尾足在最后端
    const body = new THREE.Box3().setFromObject(g)
    expect(vertBox(legs).min.x).toBeGreaterThan(body.min.x + (body.max.x - body.min.x) * 0.55)
    expect(vertBox(anal).max.x).toBeLessThan(body.min.x + (body.max.x - body.min.x) * 0.2)

    /*
     * 形态差异 —— 量的是「自上而下收不收细」，这正是眼睛看到的那件事：
     * 真足是一根收到尖、末端带爪的锥；腹足是几乎等粗的肉柱，末端反而更宽（吸盘）。
     * 只量长度或粗细都分不开这两者（它们的长度差不多）。
     */
    for (const leg of legs) {
      const { top, bottom } = taperTopBottom(leg)
      expect(bottom / top, `胸足的末端/基部宽度比 ${(bottom / top).toFixed(2)}，不够「尖细」`).toBeLessThan(0.45)
    }
    for (const pro of [...pros, ...anal]) {
      const { top, bottom } = taperTopBottom(pro)
      expect(bottom / top, `腹足/尾足的末端/基部宽度比 ${(bottom / top).toFixed(2)}，被画成了锥形的真足`).toBeGreaterThan(0.65)
    }

    const widthOf = (m: THREE.Mesh) => {
      const b = vertBox([m])
      return Math.max(b.max.x - b.min.x, b.max.z - b.min.z)
    }
    const legMax = Math.max(...legs.map(widthOf))
    const plantaMin = Math.min(...plantas.map(widthOf))
    const proMax = Math.max(...pros.map(widthOf))
    expect(plantaMin, '趾面（吸盘）必须比肉柱更宽，这是「吸盘状」那三个字').toBeGreaterThan(proMax * 0.95)
    expect(plantaMin, '趾面宽度至少是胸足的两倍 —— 两种附肢在画面上要一眼分得开').toBeGreaterThan(legMax * 2)

    // 爪要真的收成尖
    for (const claw of claws) {
      const { bottom } = taperTopBottom(claw)
      expect(bottom, `爪尖宽 ${bottom.toFixed(3)}，不算尖`).toBeLessThan(0.05)
    }

    // 材质差异按**色相**判：胸足是琥珀褐的几丁质，腹足是体壁本身（青绿）。
    // 第一版把胸足做成近黑，出图是三根黑尖刺 —— 差别应该在色相，不是一味压深。
    const legH = hslOf(legs[0]).h * 360
    const proH = hslOf(pros[0]).h * 360
    const dh = Math.abs(((legH - proH + 540) % 360) - 180)
    expect(dh, `胸足与腹足的色相只差 ${dh.toFixed(0)}°，看着像同一种材质`).toBeGreaterThan(40)
  })

  it('头壳比体节小、颜色略深，且长着侧单眼与大颚', () => {
    const lobes = meshesNamed(g, 'head-lobe')
    expect(lobes, '头壳由左右两片头盖组成').toHaveLength(2)
    const hb = vertBox(lobes)
    const hs = new THREE.Vector3()
    hb.getSize(hs)
    const ts = new THREE.Vector3()
    trunkBox.getSize(ts)
    const headWidth = Math.max(hs.y, hs.z)
    const trunkWidth = Math.max(ts.y, ts.z)
    expect(headWidth, `头 ${headWidth.toFixed(2)} 不比体节 ${trunkWidth.toFixed(2)} 小`).toBeLessThan(trunkWidth * 0.75)
    expect(headWidth, '下限：小到看不见就不是头了').toBeGreaterThan(trunkWidth * 0.3)
    // 头在躯干之前
    expect(hb.max.x).toBeGreaterThan(trunkBox.max.x)

    const headL = hslOf(lobes[0]).l
    const bodyL = hslOf(trunk).l
    expect(bodyL - headL, `头壳只比体色深 ${(bodyL - headL).toFixed(2)}`).toBeGreaterThan(0.1)

    expect(meshesNamed(g, 'stemma'), '每侧 6 枚侧单眼（幼虫没有复眼）').toHaveLength(12)
    expect(meshesNamed(g, 'mandible'), '一对咀嚼式大颚').toHaveLength(2)
    expect(meshesNamed(g, 'epicranial-suture').length, '蜕裂线：正中一道 + 两条岔臂').toBe(3)

    // 侧单眼要在头壳外面看得见，不能埋进肉里（第二版就是整排埋掉的）
    const lobeBox = vertBox(lobes)
    for (const s of meshesNamed(g, 'stemma')) {
      const c = vertBox([s]).getCenter(new THREE.Vector3())
      const rel = Math.abs(c.z) / ((lobeBox.max.z - lobeBox.min.z) / 2)
      expect(rel, '侧单眼贴在头壳侧面，靠得太内就被头盖挡住了').toBeGreaterThan(0.5)
    }
  })
})

// ================================================================ 蛹连茧

describe('柞蚕蛹连茧 buildSilkMothPupa', () => {
  const model = buildSilkMothPupa()
  const g = model.group
  const body = meshesNamed(g, 'pupa-body')[0]
  const bodyVerts = worldVerts(body)
  const shell = meshesNamed(g, 'cocoon-shell')[0]
  const shellVerts = worldVerts(shell)

  /** 把茧壳按 x 分箱、逐箱做最小二乘圆拟合，得到「这一处的轴心与外半径」 */
  const BINS = 48
  const sx0 = Math.min(...shellVerts.map((p) => p.x))
  const sx1 = Math.max(...shellVerts.map((p) => p.x))
  const binOf = (x: number) => Math.min(BINS - 1, Math.max(0, Math.floor(((x - sx0) / (sx1 - sx0)) * BINS)))
  const rings: THREE.Vector2[][] = Array.from({ length: BINS }, () => [])
  for (const p of shellVerts) rings[binOf(p.x)].push(new THREE.Vector2(p.y, p.z))
  const fits = rings.map((pts) => {
    if (pts.length < 12) return null
    let Suu = 0
    let Suv = 0
    let Svv = 0
    let Su = 0
    let Sv = 0
    let Sw = 0
    let Swu = 0
    let Swv = 0
    const n = pts.length
    for (const q of pts) {
      const w = q.x * q.x + q.y * q.y
      Suu += q.x * q.x
      Suv += q.x * q.y
      Svv += q.y * q.y
      Su += q.x
      Sv += q.y
      Sw += w
      Swu += w * q.x
      Swv += w * q.y
    }
    const A = [
      [2 * Suu, 2 * Suv, Su],
      [2 * Suv, 2 * Svv, Sv],
      [2 * Su, 2 * Sv, n],
    ]
    const b = [Swu, Swv, Sw]
    const det3 = (M: number[][]) =>
      M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
      M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
      M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    const det = det3(A)
    if (Math.abs(det) < 1e-9) return null
    const solve = (col: number) => {
      const M = A.map((r) => r.slice())
      for (let i = 0; i < 3; i++) M[i][col] = b[i]
      return det3(M) / det
    }
    const cy = solve(0)
    const cz = solve(1)
    const R = Math.sqrt(Math.max(solve(2) + cy * cy + cz * cz, 0))
    return { cy, cz, R }
  })

  it('能构建，无 NaN，面数在预算内', () => {
    const { nan, triangles } = inspect(model)
    expect(nan).toBe(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it('蛹本体：纺锤形，长约 3.5 厘米', () => {
    const bb = new THREE.Box3().setFromPoints(bodyVerts)
    const len = bb.max.x - bb.min.x
    expect(len, `蛹长 ${len.toFixed(2)}，真值 3.5~4.5 厘米`).toBeGreaterThan(3.2)
    expect(len).toBeLessThan(4.6)
    const girth = Math.max(bb.max.y - bb.min.y, bb.max.z - bb.min.z)
    // 纺锤：长是粗的 2~3.5 倍。做成球（1）或做成棍（6）都会红
    expect(len / girth).toBeGreaterThan(2)
    expect(len / girth).toBeLessThan(3.5)
  })

  it('腹部分节可见：后半段有 6 圈深色节间环，半径剖面上也数得出腹节', () => {
    expect(meshesNamed(g, 'pupa-segment-ring'), '7 个腹节之间 6 道环').toHaveLength(6)
    const bb = new THREE.Box3().setFromPoints(bodyVerts)
    const B = 90
    const prof = new Array(B).fill(0)
    const axisY = (bb.max.y + bb.min.y) / 2
    const axisZ = (bb.max.z + bb.min.z) / 2
    for (const p of bodyVerts) {
      const i = Math.min(B - 1, Math.floor(((p.x - bb.min.x) / (bb.max.x - bb.min.x)) * B))
      prof[i] = Math.max(prof[i], Math.hypot(p.y - axisY, p.z - axisZ))
    }
    let minima = 0
    for (let i = 2; i < B - 2; i++) {
      // 同上：两侧都要比它粗，否则蛹尾单调收细的那一段会冒充腹节
      if (prof[i] > 0 && prof[i] <= prof[i - 1] && prof[i] <= prof[i + 1] && prof[i] < Math.min(prof[i - 2], prof[i + 2]) * 0.99) minima++
    }
    expect(minima, `蛹体半径剖面只有 ${minima} 处收腰，腹部分节读不出来`).toBeGreaterThanOrEqual(4)
  })

  it('翅芽与触角芽：紧贴体表的壳片，不是支出去的翅', () => {
    const wings = meshesNamed(g, 'wing-bud')
    expect(wings, '一对翅芽').toHaveLength(2)
    expect(meshesNamed(g, 'antenna-bud'), '一对触角芽').toHaveLength(2)
    expect(meshesNamed(g, 'antenna-bud-ridge'), '触角芽上的横棱（雄蛾的羽状触角折在里面）').toHaveLength(2)
    expect(meshesNamed(g, 'eye-bud')).toHaveLength(2)

    const bb = new THREE.Box3().setFromPoints(bodyVerts)
    const len = bb.max.x - bb.min.x
    const span = vertBox([wings[0]])
    expect(span.max.x - span.min.x, '翅芽从胸侧一直盖到第 4 腹节，至少占体长的 35%').toBeGreaterThan(len * 0.35)
    expect(span.max.x - span.min.x, '上限：盖满全身就不是翅芽了').toBeLessThan(len * 0.75)

    /*
     * 「紧贴腹面」量的是**离体表多高**：逐顶点与同一 x 处的蛹体半径比。
     * 上下限一起给 —— 只给下限，一片支出去的翅照样过（天蛾喙长成标枪的教训）。
     */
    let hi = -Infinity
    for (const w of wings) {
      for (const p of worldVerts(w)) {
        const near = bodyVerts.filter((q) => Math.abs(q.x - p.x) < 0.05)
        if (near.length < 8) continue
        const cy = (Math.max(...near.map((q) => q.y)) + Math.min(...near.map((q) => q.y))) / 2
        const cz = (Math.max(...near.map((q) => q.z)) + Math.min(...near.map((q) => q.z))) / 2
        const rb = Math.max(...near.map((q) => Math.hypot(q.y - cy, q.z - cz)))
        hi = Math.max(hi, Math.hypot(p.y - cy, p.z - cz) - rb)
      }
    }
    expect(hi, `翅芽最高只鼓出 ${hi.toFixed(3)}，读不出是一片盖上去的壳`).toBeGreaterThan(0.03)
    expect(hi, `翅芽鼓出 ${hi.toFixed(3)}，那是支开的翅不是芽`).toBeLessThan(0.2)
  })

  it('茧包住蛹：蛹的每个顶点都在茧壳的拟合外壁之内', () => {
    const names = ['pupa-body', 'wing-bud', 'antenna-bud', 'antenna-bud-ridge', 'leg-bud', 'eye-bud', 'pupal-spiracle', 'pupa-segment-ring']
    let worst = -Infinity
    let worstName = ''
    for (const n of names) {
      for (const m of meshesNamed(g, n)) {
        for (const p of worldVerts(m)) {
          const f = fits[binOf(p.x)]
          if (!f) continue
          const over = Math.hypot(p.y - f.cy, p.z - f.cz) - f.R
          if (over > worst) {
            worst = over
            worstName = n
          }
        }
      }
    }
    // 负值 = 在壳内。留 0.05 的余量：贴着内壁画等于让蛹与丝壁互相穿插
    expect(worst, `${worstName} 顶到（或穿出）茧壁：最大外突 ${worst.toFixed(3)}`).toBeLessThan(-0.05)
    // 蛹也不能小到只剩一粒：至少要占到茧腔的一半粗
    const bb = new THREE.Box3().setFromPoints(bodyVerts)
    const girth = Math.max(bb.max.y - bb.min.y, bb.max.z - bb.min.z)
    const rMax = Math.max(...fits.filter(Boolean).map((f) => f!.R))
    expect(girth / (2 * rMax), '蛹太细，茧腔里空荡荡的（第一版就是这个毛病）').toBeGreaterThan(0.6)
  })

  it('茧是剖开的：中段截面上有一段 60° 以上的方位缺口', () => {
    const sb = new THREE.Box3().setFromPoints(shellVerts)
    const midX = (sb.min.x + sb.max.x) / 2
    const mid = shellVerts.filter((p) => Math.abs(p.x - midX) < 0.3)
    const f = fits[binOf(midX)]!
    const SLOTS = 72
    const hit = new Array(SLOTS).fill(false)
    for (const p of mid) {
      const a = Math.atan2(p.z - f.cz, p.y - f.cy)
      hit[Math.floor((((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2)) * SLOTS) % SLOTS] = true
    }
    let run = 0
    let best = 0
    for (let i = 0; i < SLOTS * 2; i++) {
      if (!hit[i % SLOTS]) best = Math.max(best, ++run)
      else run = 0
    }
    const gap = (best / SLOTS) * 360
    expect(gap, `方位缺口只有 ${gap.toFixed(0)}°，茧是闭合的，看不见里面的蛹`).toBeGreaterThan(60)
    // 上限：挖掉一半以上就不再是「茧」，而是一只碗（第一版挖 155° 出图就是碗）
    expect(gap, `方位缺口 ${gap.toFixed(0)}°，剩下的壳围不住蛹了`).toBeLessThan(150)
  })

  it('丝的质感：壳外缠着丝索与散丝，一端有柄状丝索伸出茧外', () => {
    expect(meshesNamed(g, 'silk-wrap'), '沿茧面缠的丝索').toHaveLength(1)
    expect(meshesNamed(g, 'silk-floss'), '支棱出来的散丝（丝的质感有一半在剪影上）').toHaveLength(1)
    const ped = meshesNamed(g, 'peduncle')
    expect(ped, '茧柄').toHaveLength(1)
    expect(meshesNamed(g, 'peduncle-loop'), '茧柄末端套在枝上的那个环').toHaveLength(1)

    const sb = new THREE.Box3().setFromPoints(shellVerts)
    const pb = vertBox(ped)
    expect(pb.max.x, '茧柄必须伸到茧体之外').toBeGreaterThan(sb.max.x)
    expect(pb.max.x - sb.max.x, '柄长至少占茧长的三成').toBeGreaterThan((sb.max.x - sb.min.x) * 0.3)
  })

  it('茧与蛹的明度差够大，隔着剖口一眼分得开', () => {
    const shellL = hslOf(shell).l
    const pupaL = hslOf(body).l
    expect(shellL - pupaL, `茧 ${shellL.toFixed(2)} 与蛹 ${pupaL.toFixed(2)} 的明度差不够`).toBeGreaterThan(0.15)
    const lining = meshesNamed(g, 'cocoon-lining')
    expect(lining, '内衬是单独一层').toHaveLength(1)
    expect(hslOf(lining[0]).l, '内衬要比外壳浅，否则茧腔是个暗洞').toBeGreaterThan(shellL)
  })
})
