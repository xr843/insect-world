/**
 * 柞蚕蛾 Antheraea pernyi · 卵
 *
 * 造型要点（与成虫 silk-moth.ts 同一套单位与坐标系：1 = 1 厘米，+X 向前、+Y 向上、+Z 向右）：
 *
 * - **尺寸按真实的毫米级来**：柞蚕卵长径约 3 毫米、短径 2.5 毫米、厚约 2 毫米，
 *   所以模型里就是 0.30 / 0.245 / 0.185 —— 三个数各不相同才是「扁圆形」，
 *   等半径的球是任何虫的卵，也是本阶段最容易做砸的地方。厚度只有长径的 0.62 倍，
 *   这个扁度从侧面一眼就能读出来。
 * - **一堆三粒，不是孤零零一粒**：柞蚕蛾把卵产在柞树叶背，成堆或成行、彼此相贴。
 *   单独一粒椭球在画面里读起来像颗药片；三粒挤在一起、朝向各差一点，
 *   「这是一窝卵」的判读就没有歧义了。三粒尺寸完全相同（同一个几何体复用），
 *   量级信息不会因此走样。
 * - **卵壳表面略有凹陷**：真实卵壳（chorion）有浅浅的凹坑与刻纹，不是光面。
 *   本文件不靠贴图，直接在球面上按黄金角撒 12 个凹陷中心、用高斯衰减把半径
 *   压下去，再在前端（受精孔 micropyle 所在的一极）压一个更大更浅的坑 ——
 *   受精孔那一端在真卵上确实略平塌。凹陷是**几何**的，所以任何机位、任何光照
 *   下都在，不像法线贴图那样在剪影上消失。
 * - **灰白带褐斑**：卵初产乳白、随后卵壳外附着的褐色胶质显出斑纹带。
 *   斑块做成贴合卵面的「帽子」（同一套 `eggPoint()` 求值、整体外推 1.2%），
 *   所以它是贴在壳上的一块色斑，不是浮在旁边的一片薄膜。
 *   底色 `#e0dacb` 接近白（HSL 明度 0.83）、斑块 `#7a5330` 中褐（0.33），差 0.5 ——
 *   第 5 轮「深灰叠深灰、招牌图案直接消失」的教训要求对比必须是真的对比。
 *   但**反向也会翻车**：第一版把斑做成角半径 0.6 的大色块、颜色近黑，出图是三颗
 *   奶牛斑的白豆子。真卵是细碎斑驳，所以最终是 11 块小斑 + 3 粒更深的小点。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

// ---------------------------------------------------------------- 卵壳形状

/** 长径 3 毫米 = 0.30；下面三个半轴按 长 : 宽 : 厚 = 3 : 2.45 : 1.85 毫米取 */
const SEMI_X = 0.15
const SEMI_Y = 0.0925
const SEMI_Z = 0.1225

/** 凹陷中心的数量。太少看不出「有坑」，太多会糊成噪点，16 个在 3 毫米的卵上疏密正好 */
const DIMPLE_COUNT = 16
/**
 * 单个凹陷把半径压下去的比例（相对未变形的单位球）。
 * 0.08 太浅 —— 关掉自阴影噪点之后出图是一颗完全光滑的白豆子，
 * 「表面略有凹陷」等于没做。0.13 配上收窄的 σ 才看得出是一个个浅坑。
 */
const DIMPLE_DEPTH = 0.13
/** 凹陷的角半径（弧度），高斯衰减的 σ。收窄一点，坑与坑之间才留得住脊 */
const DIMPLE_SIGMA = 0.2
/** 受精孔那一极的浅塌：更宽更缓，读起来是「一端略平」而不是「被戳了一下」 */
const MICROPYLE_DEPTH = 0.075
const MICROPYLE_SIGMA = 0.55

/** 黄金角螺旋撒点 —— 与 silk-moth.ts 的胸部绒毛同一招，保证分布均匀且完全确定（无随机数） */
function dimpleCenters(count: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = i * golden
    out.push(new THREE.Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring))
  }
  return out
}

const DIMPLES = dimpleCenters(DIMPLE_COUNT)
/** 受精孔在前端（+X 极）—— 卵产下时这一端朝外，也是幼虫将来咬破出壳的一端 */
const MICROPYLE = new THREE.Vector3(1, 0, 0)

/** 单位方向上的卵壳半径：1 减去各凹陷的高斯贡献 */
function chorionRadius(dir: THREE.Vector3): number {
  let r = 1
  for (const c of DIMPLES) {
    // 角距离用点积换算，比 acos 稳（点积略越界时 acos 会出 NaN）
    const d = Math.acos(THREE.MathUtils.clamp(dir.dot(c), -1, 1))
    r -= DIMPLE_DEPTH * Math.exp(-(d * d) / (2 * DIMPLE_SIGMA * DIMPLE_SIGMA))
  }
  const dm = Math.acos(THREE.MathUtils.clamp(dir.dot(MICROPYLE), -1, 1))
  r -= MICROPYLE_DEPTH * Math.exp(-(dm * dm) / (2 * MICROPYLE_SIGMA * MICROPYLE_SIGMA))
  return r
}

/** 把单位方向映射到卵壳表面（先按凹陷改半径，再按三个半轴压成扁椭球） */
function eggPoint(dir: THREE.Vector3, swell = 1, out = new THREE.Vector3()): THREE.Vector3 {
  const r = chorionRadius(dir) * swell
  return out.set(dir.x * r * SEMI_X, dir.y * r * SEMI_Y, dir.z * r * SEMI_Z)
}

/** 卵壳本体：取一颗单位球，把每个顶点按 eggPoint() 重投影 */
function chorionGeometry(): THREE.BufferGeometry {
  // 96×64：凹陷是靠改半径 + 重算法线做出来的，网格太疏时相邻纬圈之间的法线
  // 会阶梯化，出图是一圈圈木纹样的等高线（48×32 实拍就是这个毛病）。
  const geo = new THREE.SphereGeometry(1, 96, 64)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const dir = new THREE.Vector3()
  const p = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize()
    eggPoint(dir, 1, p)
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  pos.needsUpdate = true
  // 半径被改过，原法线全错了：不重算的话凹陷在光照上完全看不见（只在剪影上有）
  geo.computeVertexNormals()
  return geo
}

// ---------------------------------------------------------------- 褐斑

/**
 * 一块贴合卵面的褐斑：以 `center` 方向为极点、在球面上取一顶「帽子」，
 * 每个顶点都过一遍 `eggPoint()`，所以斑块随凹陷一起起伏，贴在壳上而不是浮在旁边。
 * `lobe` 把帽沿按方位角拧成不规则形状 —— 真卵上的斑是块状而非正圆。
 */
function blotchGeometry(center: THREE.Vector3, span: number, lobe: number, phase: number): THREE.BufferGeometry {
  const c = center.clone().normalize()
  // 取一个与 c 不平行的参考向量搭正交基
  const ref = Math.abs(c.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const t1 = new THREE.Vector3().crossVectors(ref, c).normalize()
  const t2 = new THREE.Vector3().crossVectors(c, t1)

  const RINGS = 6
  const SIDES = 22
  const positions: number[] = []
  const indices: number[] = []
  const dir = new THREE.Vector3()
  const p = new THREE.Vector3()

  // 外推 1.2%：斑块浮在壳面上一丁点，避免与壳共面闪烁（z-fighting）
  const SWELL = 1.012

  eggPoint(c, SWELL, p)
  positions.push(p.x, p.y, p.z) // 极点，index 0

  for (let i = 1; i <= RINGS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const phi = (j / SIDES) * Math.PI * 2
      const rho = span * (i / RINGS) * (1 + lobe * Math.sin(2 * phi + phase))
      dir
        .copy(c)
        .multiplyScalar(Math.cos(rho))
        .addScaledVector(t1, Math.cos(phi) * Math.sin(rho))
        .addScaledVector(t2, Math.sin(phi) * Math.sin(rho))
        .normalize()
      eggPoint(dir, SWELL, p)
      positions.push(p.x, p.y, p.z)
    }
  }

  const idx = (ring: number, j: number) => 1 + (ring - 1) * SIDES + (j % SIDES)
  for (let j = 0; j < SIDES; j++) indices.push(0, idx(1, j), idx(1, j + 1))
  for (let i = 1; i < RINGS; i++) {
    for (let j = 0; j < SIDES; j++) {
      const a = idx(i, j)
      const b = idx(i, j + 1)
      const cc = idx(i + 1, j)
      const d = idx(i + 1, j + 1)
      indices.push(a, cc, b, b, cc, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

/**
 * 斑块的落位。**第一版把斑做得太大（角半径 0.5~0.62），出图是一颗奶牛斑的白豆子** ——
 * 真卵上的是细碎的褐色斑驳与斑纹带，不是几块大色块。改成 11 块小的：
 * 侧面偏多（真卵的斑纹带集中在两侧），大小错开，另加几粒更小更深的斑点。
 */
const BLOTCHES: { at: [number, number, number]; span: number; lobe: number; phase: number; deep?: boolean }[] = [
  { at: [-0.35, 0.25, 1], span: 0.3, lobe: 0.32, phase: 0.4 },
  { at: [0.1, -0.2, 1], span: 0.22, lobe: 0.3, phase: 2.2 },
  { at: [-0.75, -0.1, 0.8], span: 0.26, lobe: 0.34, phase: 4.0 },
  { at: [-0.2, -0.3, -1], span: 0.28, lobe: 0.34, phase: 1.7 },
  { at: [0.3, 0.15, -1], span: 0.24, lobe: 0.3, phase: 3.1 },
  { at: [-0.8, 0.3, -0.7], span: 0.22, lobe: 0.28, phase: 5.6 },
  { at: [0.45, 0.9, 0.3], span: 0.2, lobe: 0.26, phase: 2.6 },
  { at: [-0.5, 0.85, -0.2], span: 0.18, lobe: 0.3, phase: 0.9 },
  { at: [0.3, -0.85, -0.4], span: 0.19, lobe: 0.28, phase: 5.1 },
  { at: [-0.45, -0.8, 0.35], span: 0.17, lobe: 0.3, phase: 3.8 },
  { at: [0.95, 0.2, 0.2], span: 0.16, lobe: 0.24, phase: 1.2 },
  // 更小更深的斑点：真卵近看是斑驳而非单色块，两档深浅叠起来才有「斑驳」感
  { at: [-0.15, 0.55, 0.8], span: 0.1, lobe: 0.2, phase: 2.0, deep: true },
  { at: [-0.6, -0.45, -0.6], span: 0.11, lobe: 0.2, phase: 4.4, deep: true },
  { at: [0.55, -0.5, 0.6], span: 0.09, lobe: 0.2, phase: 0.2, deep: true },
]

// ---------------------------------------------------------------- 建模主体

/**
 * 一窝三粒卵的摆位：紧挨着、长轴大体同向但各拧一点。
 * y 全部压在 0 附近 —— 卵是平铺在叶面上的，不是堆成一座小山。
 */
const CLUTCH: { pos: [number, number, number]; yaw: number; roll: number }[] = [
  { pos: [0.02, 0.0, 0.0], yaw: 0.0, roll: 0.0 },
  { pos: [-0.05, -0.005, 0.235], yaw: 0.24, roll: 0.35 },
  { pos: [-0.11, 0.006, -0.215], yaw: -0.18, roll: -0.42 },
]

export function buildSilkMothEgg(): InsectModel {
  const g = new THREE.Group()

  // 灰白：接近白（HSL 明度约 0.83），不是「保险起见压深一档」的浅灰。
  // 不挂 punctate 刻点图 —— 在 3 毫米的卵上那张图会放大成一层棋盘格；
  // 表面起伏交给几何凹陷，任何机位、任何光照下都在。
  const shellMat = chitin({ color: '#e0dacb', gloss: 0.22, clearcoat: 0 })
  // 褐斑：中褐（明度约 0.33），与底色差 0.5，够读出斑纹又不至于变成奶牛斑
  const blotchMat = chitin({ color: '#7a5330', gloss: 0.22 })
  // 深斑点：接近黑，只用在几粒小的上
  const speckMat = chitin({ color: '#402713', gloss: 0.24 })

  const shellGeo = chorionGeometry()
  const blotchGeos = BLOTCHES.map((b) => blotchGeometry(new THREE.Vector3(...b.at), b.span, b.lobe, b.phase))

  for (const egg of CLUTCH) {
    const one = new THREE.Group()
    one.name = 'egg'
    // 几何体在三粒之间共享（同一颗卵的三个实例），省下三倍顶点
    const shell = new THREE.Mesh(shellGeo, shellMat)
    shell.name = 'egg-shell'
    one.add(shell)
    blotchGeos.forEach((bg, i) => {
      const b = new THREE.Mesh(bg, BLOTCHES[i].deep ? speckMat : blotchMat)
      b.name = 'egg-blotch'
      one.add(b)
    })
    one.position.set(...egg.pos)
    one.rotation.y = egg.yaw
    one.rotation.x = egg.roll
    g.add(one)
  }

  const anchors: Record<string, THREE.Vector3> = {
    // 受精孔：前端那处略平塌的浅坑，将来幼虫从这一端咬破卵壳
    micropyle: new THREE.Vector3(SEMI_X * 0.94 + 0.02, 0, 0),
    // 卵壳：背面正中，落在壳面上
    chorion: new THREE.Vector3(0.02, SEMI_Y * 0.95, 0),
    // 褐斑：右侧偏后那一块的中心
    blotch: eggPoint(new THREE.Vector3(-0.35, 0.25, 1).normalize(), 1.012).add(new THREE.Vector3(0.02, 0, 0)),
  }

  return finalize(g, anchors)
}
