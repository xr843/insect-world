/**
 * 神农洁蜣螂 · 卵 Catharsius molossus（完全变态第 1 阶段）
 *
 * ## 为什么整枚梨都入画，明知卵只占画面的 7%
 *
 * 三个阶段共用「育儿粪梨」这个语境。这一件试过把镜头推到颈上（只保留
 * y ∈ [3.97, 5.40] 或 [4.30, 5.40] 那一段，卵能占到画面的两成），
 * **两档都失败**：截出来的一段颈配上一片平切的底面与两片纵剖面，
 * 出图整件读成一顶**帐篷** —— 一块没有可指认形状的褐色东西。
 * 卵是变大了，可它旁边那样东西已经不再是「粪梨」，而卵本身没有任何结构，
 * 语境是它唯一的招牌（第一批四颗卵里三颗栽的就是这一条）。
 *
 * 所以退回整枚梨，但**不把整枚梨都剖开**：只在颈上开一个楔形的豁口
 * （y ≥ 4.21 那一段挖掉 128° 的方位角），梨体完好无损。
 * 幼虫/蛹那两件是从头剖到底的纵剖 —— 那是必须的，虫在梨心里；
 * 这一件的孵化室就在颈里，全剖开只会白白多出两大片平剖面，
 * 出图上整枚梨读成一枚**吊坠**（实心的梨纵剖出来就是一大片平面，实撞过）。
 * 开豁口则相反：梨还是一枚完整的梨，颈上被揭开一角，里面那粒白的一眼就找得到。
 *
 * 卵只有 0.4，梨有 5.4，卵在画面里就是一粒白米。
 * 这不是妥协，是 `stages.ts` 写死的那条约定本身 ——
 * 「不许为了好看把卵放大，卵只有毫米、幼虫比成虫还长，**这种量级差本身
 * 就是生活史要讲的内容**」。而且整枚梨入画时，三个阶段之间才对得起来：
 * 卵期的梨是**实心**的，只在颈里有一个小室；幼虫期梨心被吃空了一大腔；
 * 蛹期那腔更大、壁被糊平 —— 三张图并排就是「幼虫把自己的家吃出来」这件事。
 * 画面上唯一的亮色就是那粒卵，眼睛不会找不到它。
 *
 * 这跟独角仙那一轮是**同一条判据的两次相反决定**：那只蛹不做土室（土室会挡住
 * 角，而角是它唯一的看点），那颗卵反而做土室。判据始终是「哪种做法能让招牌被
 * 看见」，不是「哪种更完整」，也不是「哪种让主体更大」。
 *
 * ## 招牌：孵化室的内壁比外壁光滑
 *
 * 母虫做好粪梨后，会在窄端掏一个小室，用分泌物把内壁**抹平抛光**，再把卵产进去。
 * 这个内外差别是真实的、也是这一件唯一能做出来的结构差：
 * 外壁是压实的粗糙团块（三层尺度叠加 + 指压痕 + 干裂纹），内壁近乎光滑（起伏只有
 * 外壁的十分之一）且光泽略高。测试按两者的偏差标准差之比断言 —— 把内壁也刷成
 * 粗糙的，这条会红。
 *
 * ## 粪梨表面：三个尺度叠加，绝不是「磨砂球」
 *
 * 第一批独角仙的卵栽在「一圈大小相近、滚圆、同色的小球」上，读成巧克力球。
 * 真实的粪梨是压实的粗糙团块，辨识特征是**尺度差**而不是「粗糙度」这个标量：
 * 大的指压痕（母虫塑形时用足和头压的）、中等的团块、细的纤维颗粒，三层叠加，
 * 格距 1.75 / 0.66 / 0.17 厘米，比值 2.65 与 3.88，**刻意不成整数比** ——
 * 整数比会让三层的峰谷周期性对齐，叠出规则花纹，那正是程序化偷懒的样子。
 * （格距不是波长：值噪声一个起落跨两格，看到的特征尺寸约是这些数的两倍。）
 *
 * ## 卵本身的材质纪律
 *
 * 乳白 + 清漆在 ACES 下会整片过曝成白铬（七星瓢虫、甘薯腊龟甲都栽过），而卵的
 * 固有色本来就贴近画面最亮端。所以 `gloss` 只给 0.4、`clearcoat` 近零；
 * 也**不开 `translucent`** —— 独角仙那颗卵做过对照实验：transmission 会在
 * `loft()` 的放样接缝上折射出一道贯穿卵身的亮线，出图读成「卵壳裂了」，
 * 而这个尺度下半透几乎换不来可见的通透感。
 *
 * 局部坐标系与成虫一致：+X 向前、+Y 向上、+Z 向右。粪梨的轴沿 +Y（颈朝上，
 * 真实粪梨就是这么埋的），剖口开在 +Z 那一侧（展台默认机位与侧机位都在那边）。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ================================================================ 通用工具

/** 分段线性 + smoothstep 的关键帧插值 */
function keyframe(keys: readonly (readonly [number, number])[], t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  for (let i = 1; i < keys.length; i++) {
    if (x <= keys[i][0]) {
      const [t0, v0] = keys[i - 1]
      const [t1, v1] = keys[i]
      const k = t1 === t0 ? 0 : (x - t0) / (t1 - t0)
      return THREE.MathUtils.lerp(v0, v1, k * k * (3 - 2 * k))
    }
  }
  return keys[keys.length - 1][1]
}

/**
 * 确定性整数散列。表面起伏必须**可复现**：同一份代码在任何机器、任何一次构建里
 * 都要长成同一枚粪梨，否则目视验收过的那张图跟用户看到的不是同一个东西。
 */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ (seed | 0)
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return (h >>> 0) / 4294967296
}

/** 二维值噪声，值域 [-1, 1] */
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi, seed)
  const b = hash2(xi + 1, yi, seed)
  const c = hash2(xi, yi + 1, seed)
  const d = hash2(xi + 1, yi + 1, seed)
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1
}

/**
 * 转过一个角度再取噪声。值噪声的格子是轴对齐的，直接叠几层会在表面上留下
 * 横平竖直的方格结构（出图上是一圈圈绕着梨身的「年轮」）。每层各转一个角度，
 * 格子的痕迹就互相抵消了。
 */
function rotNoise(x: number, y: number, deg: number, seed: number): number {
  const a = THREE.MathUtils.degToRad(deg)
  const c = Math.cos(a)
  const s = Math.sin(a)
  return valueNoise(x * c + y * s, -x * s + y * c, seed)
}

// ================================================================ 育儿粪梨

/** 粪梨全高（厘米）。梨体最粗处直径 4.06、颈长约 1.3 —— 真实育儿粪梨的量级 */
const PEAR_H = 5.4

/** 与另两个阶段完全相同的一条外轮廓 */
const PEAR_PROFILE = [
  [0.0, 0.0],
  [0.05, 0.68],
  [0.14, 1.32],
  [0.26, 1.82],
  [0.4, 2.03],
  [0.52, 1.95],
  [0.62, 1.7],
  [0.7, 1.3],
  [0.76, 0.88],
  [0.82, 0.6],
  [0.87, 0.53],
  [0.92, 0.57],
  [0.96, 0.48],
  [0.99, 0.24],
  [1.0, 0.0],
] as const

function pearRadius(v: number): number {
  return keyframe(PEAR_PROFILE, v)
}

/**
 * 颈上的豁口：**挖掉**的那段方位角，中心正对 +Z（展台默认机位与侧机位都在那一侧），
 * 只从 NOTCH_V 往上挖，梨体不动。
 *
 * 半宽给满 90°（整整半个颈），不是另两个阶段的 64°。理由是光进不去：
 * 64° 的口子配上一个 0.6 厘米深的小室，卵整个落在自阴影里，出图上是一团比周围
 * **更暗**的东西 —— 唯一的亮色没了，眼睛反而找不到它（顶视都救不回来，实撞过）。
 * 揭掉半个颈之后小室成了一只敞口的碗，卵直接吃到主光。
 * 幼虫/蛹那两件不能这么办：那里的腔占了梨的大半，挖到 180° 整枚梨就读成一只碗；
 * 这里挖的只是颈，梨体一点没动，从后方看仍是完整的一枚梨。
 */
const WINDOW_HALF_DEG = 90
const NOTCH_FROM = THREE.MathUtils.degToRad(90 - WINDOW_HALF_DEG)
const NOTCH_TO = THREE.MathUtils.degToRad(90 + WINDOW_HALF_DEG)
/** 豁口的下沿：y = 4.21，正落在孵化室底下 0.27 处 —— 揭开的是颈，不是肩 */
const NOTCH_V = 4.21 / 5.4

/** 这个方位角在豁口里吗（只对 v ≥ NOTCH_V 有意义） */
function inNotch(phi: number): boolean {
  const a = ((phi % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  return a > NOTCH_FROM && a < NOTCH_TO
}

/**
 * 指压痕：母虫塑形时用足与头压出的大凹陷。[v, 方位角°, 深度, 高斯半径(厘米)]。
 * 位置刻意不规整、深浅不一 —— 均匀分布的一圈坑就成了高尔夫球。
 * 颈上的几处比梨体的浅而小：那截是母虫用前足捏出来的，力道本来就轻。
 */
const DENTS: readonly (readonly [number, number, number, number])[] = [
  [0.2, 205, 0.22, 0.78],
  [0.33, 168, 0.15, 0.52],
  [0.31, 268, 0.26, 0.86],
  [0.47, 232, 0.18, 0.62],
  [0.46, 330, 0.21, 0.72],
  [0.58, 190, 0.13, 0.5],
  [0.61, 300, 0.19, 0.66],
  [0.24, 355, 0.16, 0.58],
  [0.75, 300, 0.13, 0.46],
  [0.82, 250, 0.09, 0.34],
  [0.87, 195, 0.06, 0.24],
] as const

/** 三层起伏的格距（厘米），比值 2.65 / 3.88。格距不是波长，见文件头 */
const GRAIN_COARSE = 1.75
const GRAIN_MID = 0.66
const GRAIN_FINE = 0.17
/** 细层的轴向格距：约为周向的 2.8 倍 = 纤维顺着抹开的方向拉长，不是砂粒 */
const GRAIN_FINE_AXIAL = 0.48
/** 周向坐标用固定参考半径而不是该处真实半径，否则纹理会被拉成绕轴的环带 */
const GRAIN_REF_R = 1.5

/**
 * 两极附近的淡出系数。
 *
 * 极点处半径趋于 0，那一圈的方位角采样间距已经小到几分之一毫米：径向位移在
 * 那里既没有意义，还会把细层采成一圈**放射状的锯齿**（顶视里最刺眼，
 * 一眼看去像模型破了）。那是采样不足的假象，不是模型的花纹 ——
 * 按半径淡出即可，代价只是颈尖那一小块更平，而它本来就该更平。
 */
function poleFade(v: number): number {
  return THREE.MathUtils.clamp((pearRadius(v) - 0.12) / 0.7, 0, 1)
}

function pearOffset(v: number, phi: number): number {
  const r = Math.max(pearRadius(v), 0.25)
  const s = v * PEAR_H
  const a = phi * GRAIN_REF_R
  const coarse = rotNoise(s / GRAIN_COARSE, a / GRAIN_COARSE, 27, 0x51a3) * 0.14
  const mid = rotNoise(s / GRAIN_MID, a / GRAIN_MID, -41, 0xa7c1) * 0.075
  // 细层只转 15°：转多了各向异性就被转没了，纤维的方向感是这一层的全部意义
  const fine = rotNoise(s / GRAIN_FINE_AXIAL, a / GRAIN_FINE, 15, 0x3d09) * 0.032

  // 干裂纹：脊线噪声的负向，挖出一条条窄而不规则的沟
  const ridge = Math.abs(rotNoise(s / 0.95, a / 0.95, 11, 0x60f7))
  const crack = 0.1 * Math.pow(Math.max(0, 1 - ridge * 6.5), 3)

  let dent = 0
  for (const [dv, deg, depth, sigma] of DENTS) {
    const da = (v - dv) * PEAR_H
    let dphi = phi - THREE.MathUtils.degToRad(deg)
    while (dphi > Math.PI) dphi -= Math.PI * 2
    while (dphi < -Math.PI) dphi += Math.PI * 2
    const db = dphi * r
    dent += depth * Math.exp(-(da * da + db * db) / (sigma * sigma))
  }

  const taper = poleFade(v)
  return (coarse + mid + fine - crack - dent) * taper
}

/**
 * 表面色调的不匀（乘在基色上的明度系数）。独角仙那颗卵的土室给的教训是
 * 「两档深浅不够」，那里用五档材质轮换；这里是一整片连续曲面，改用顶点色 ——
 * 同一件事的连续版本。没有它，一整片同色的褐会读成一颗巧克力。
 */
function pearTint(v: number, phi: number): number {
  const s = v * PEAR_H
  const a = phi * GRAIN_REF_R
  const patch = rotNoise(s / 0.72, a / 0.72, -17, 0x9b22) * 0.18
  const speck = rotNoise(s / 0.2, a / 0.11, 49, 0x2c88) * 0.11
  const shade = THREE.MathUtils.clamp(pearOffset(v, phi) * 1.1, -0.16, 0.08)
  // 斑驳同样要在两极淡出，否则顶视上那一圈会跟着采样密度闪成放射状的花
  return THREE.MathUtils.clamp(1 + (patch + speck) * poleFade(v) + shade, 0.62, 1.32)
}

function pearOuterRadius(v: number, phi: number): number {
  return Math.max(pearRadius(v) + pearOffset(v, phi), 0.002)
}

// ---------------------------------------------------------------- 孵化室

/**
 * 孵化室：母虫在颈里掏出、并把内壁抹平的一个小室。
 * 起伏振幅只有外壁的十分之一 —— 这个内外差别就是本阶段的招牌。
 */
const CHAMBER_Y = 4.8
const CHAMBER_HY = 0.32
const CHAMBER_HR = 0.24
/** 抹平后残留的起伏。0 会让它读成一颗玻璃球，0.004 是「抹过但仍是粪」的那一档 */
const CHAMBER_ROUGH = 0.004

function chamberPoint(vc: number, phi: number): { r: number; y: number } {
  const u = 2 * vc - 1
  const y = CHAMBER_Y + u * CHAMBER_HY
  const shell = Math.sqrt(Math.max(0, 1 - u * u))
  // 略呈上窄下宽的梨形小室（母虫是自下而上掏出来的）
  const base = CHAMBER_HR * shell * (1 - 0.1 * u)
  const smoothed = rotNoise(y / 0.5, (phi * GRAIN_REF_R) / 0.5, 23, 0x7712) * CHAMBER_ROUGH * shell
  return { r: Math.max(base + smoothed, 0.003), y }
}

function chamberTint(vc: number, phi: number): number {
  const y = CHAMBER_Y + (2 * vc - 1) * CHAMBER_HY
  return THREE.MathUtils.clamp(1 + rotNoise(y / 0.35, (phi * GRAIN_REF_R) / 0.35, 33, 0x4411) * 0.07, 0.88, 1.12)
}

// ---------------------------------------------------------------- 网格

/** 轴线上的细孔半径：剖面多边形沿轴的两段边不能真的落在 r=0 上，否则退化自交 */
const AXIS_R = 0.003
const OUTER_RINGS = 58
const CHAMBER_RINGS = 26
const AZIMUTH = 176

/** 把色调系数写成一个略带色温位移的顶点色：单纯的明度缩放读起来像脏 */
function tintColor(m: number): [number, number, number] {
  return [m * (m > 1 ? 1.02 : 0.99), m, m * (m > 1 ? 0.95 : 1.03)]
}

/**
 * 旋转面：整圈扫过 360°，逐点取半径，并把色调不匀烘进顶点色。
 * `skip` 返回真的那些面**不生成** —— 顶点网格仍是完整的一圈（省掉边界处的
 * T 型接缝），只是那一块没有面。
 *
 * ⚠️ 外壳与孵化室要用**各自的**判据，不能共用一个。第一版让孵化室整圈都生成，
 * 结果它是一枚闭合的壳：豁口把外壳揭开了，露出来的却是**孵化室的外表面** ——
 * 出图上那是一团比周围更暗的蛋形东西，看着像「卵在阴影里」，
 * 于是差点去改灯光和卵的材质。真正的问题是卵根本没露出来，被室壁挡着。
 */
function revolve(
  rings: number,
  point: (v: number, phi: number) => { r: number; y: number },
  tint: (v: number, phi: number) => number,
  skip: (v: number, phi: number) => boolean,
): THREE.BufferGeometry {
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= rings; i++) {
    const v = i / rings
    for (let j = 0; j <= AZIMUTH; j++) {
      const phi = (Math.PI * 2 * j) / AZIMUTH
      const p = point(v, phi)
      pos.push(p.r * Math.cos(phi), p.y, p.r * Math.sin(phi))
      uv.push(j / AZIMUTH, i / rings)
      col.push(...tintColor(tint(v, phi)))
    }
  }
  const row = AZIMUTH + 1
  for (let i = 0; i < rings; i++) {
    const v = i / rings
    for (let j = 0; j < AZIMUTH; j++) {
      const phi = (Math.PI * 2 * (j + 0.5)) / AZIMUTH
      if (skip(v, phi)) continue
      const a = i * row + j
      idx.push(a, a + row, a + 1, a + row, a + row + 1, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * 豁口的一侧壁：把该方位角上「外轮廓 + 轴 + 孵化室轮廓 + 轴 + 豁口底」围成的
 * 多边形填成一片。只从 NOTCH_V 往上。
 *
 * 用的是该方位角上**位移后**的外轮廓，不是光滑轮廓 —— 否则豁口边缘会与外表面
 * 差出一整个起伏量，出图上是一道贯穿的裂缝。（柞蚕茧那件用未位移的
 * ShapeGeometry 能对齐，是因为它的壳面本来就没有位移。）
 */
function notchWall(phi: number, material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = []
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const v = NOTCH_V + (1 - NOTCH_V) * (i / steps)
    pts.push(new THREE.Vector2(Math.max(pearOuterRadius(v, phi), AXIS_R), v * PEAR_H))
  }
  pts.push(new THREE.Vector2(AXIS_R, chamberPoint(1, phi).y))
  for (let i = CHAMBER_RINGS; i >= 0; i--) {
    const p = chamberPoint(i / CHAMBER_RINGS, phi)
    pts.push(new THREE.Vector2(Math.max(p.r, AXIS_R), p.y))
  }
  pts.push(new THREE.Vector2(AXIS_R, NOTCH_V * PEAR_H))

  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts))
  paintCut(geo)
  const e1 = new THREE.Vector3(Math.cos(phi), 0, Math.sin(phi))
  const e2 = new THREE.Vector3(0, 1, 0)
  const e3 = new THREE.Vector3().crossVectors(e1, e2)
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(e1, e2, e3))
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'pear-cut'
  return mesh
}

/** 豁口的底：一片水平的扇形断面，外缘跟着位移后的外轮廓走 */
function notchFloor(material: THREE.Material): THREE.Mesh {
  const y = NOTCH_V * PEAR_H
  const steps = 48
  const pos: number[] = [0, y, 0]
  const idx: number[] = []
  for (let j = 0; j <= steps; j++) {
    const phi = NOTCH_FROM + (NOTCH_TO - NOTCH_FROM) * (j / steps)
    const r = pearOuterRadius(NOTCH_V, phi)
    pos.push(r * Math.cos(phi), y, r * Math.sin(phi))
  }
  for (let j = 1; j <= steps; j++) idx.push(0, j + 1, j)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  paintCut(g)
  g.computeVertexNormals()
  const mesh = new THREE.Mesh(g, material)
  mesh.name = 'pear-cut'
  return mesh
}

/** 给断面刷一层竖向的斑驳：切开的粪料本来就是一层层不匀的，平涂会读成色板 */
function paintCut(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute('position')
  const col: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const m = THREE.MathUtils.clamp(
      1 + rotNoise(pos.getY(i) / 0.3, pos.getX(i) / 0.3, 37, 0xdd41) * 0.13,
      0.82,
      1.18,
    )
    col.push(m * 1.01, m, m * 0.97)
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
}

// ================================================================ 卵

/** 长 4 毫米、宽 2.2 毫米的乳白椭球 —— 蜣螂的卵比多数甲虫的卵大而长 */
const EGG_LENGTH = 0.4
const EGG_WIDTH = 0.22
/** 卵在室里斜躺 25°：正立会读成一颗摆好的珠子，真实的卵是靠在室壁上的 */
const EGG_TILT_DEG = 25

/**
 * 卵体：沿长轴放样的椭球。
 * 不用 `spindle()` —— 它的半径包络是 `sin(kπ/2)`，两端收成尖，做出来是个柠檬。
 * 这里直接喂 `loft()` 一条真正的椭圆母线 `r = R√(1-u²)`，两极是光滑球冠。
 * `ovoid` 是那点不对称：钝端略粗于尖端，卵才不像一颗珠子。
 */
function eggBody(): THREE.BufferGeometry {
  const steps = 30
  const half = EGG_LENGTH / 2
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 2 * t - 1
    const ovoid = 1 + 0.08 * u
    const r = Math.max((EGG_WIDTH / 2) * Math.sqrt(Math.max(0, 1 - u * u)) * ovoid, 1e-4)
    sections.push({ at: new THREE.Vector3(0, u * half, 0), ry: r, rz: r })
  }
  return loft(sections, 28)
}

// ================================================================ 颜色

/** 卵壳：乳白。与 termite-soldier.ts 那身目视验收过的「苍白柔软」同一档 */
const EGG_COLOR = '#ecdfc2'
/** 粪梨外壁：灰味的黄褐。橙味重一档就读成巧克力，压到近黑则读成黑巧克力 */
const DUNG_COLOR = '#6d6046'
/**
 * 断面：只比外壁暗一点点（#665a41 对 #6d6046）。
 * ⚠️ 第一版压到 #5b5138，出图上整截颈读成一块**扣在梨上的深色帽子** ——
 * 豁口的两片壁在颈上占的面积比外壁还大，色差一拉开，它们就不再是「同一块粪」了。
 * 剖面与外壁的关系是「同一种材料的两个面」，不是两种材料。
 */
const DUNG_CUT_COLOR = '#665a41'
/** 孵化室内壁：抹平后颜色更匀、更深一点，把乳白的卵衬出来 */
const CHAMBER_COLOR = '#4a4130'

// ================================================================ 装配

export function buildDungBeetleEgg(): InsectModel {
  const g = new THREE.Group()

  /*
   * 粪梨：哑光、无清漆（粪是最不反光的东西之一），并且**开顶点色** ——
   * 色调的不匀已经烘进几何的 color 属性，材质基色只提供那一档基准。
   */
  const dungMat = chitin({ color: DUNG_COLOR, gloss: 0.1, clearcoat: 0 })
  const cutMat = chitin({ color: DUNG_CUT_COLOR, gloss: 0.08, clearcoat: 0 })
  /*
   * 孵化室内壁：**光泽比外壁高一档**（0.3 对 0.1）。
   * 这不是装饰 —— 母虫抹平内壁时涂的是分泌物，抛过的面本来就比压实的粗粉面亮。
   * 几何上的光滑 + 材质上的光泽，两件事一起说「这一面是被抹过的」，
   * 只做其中一件都容易被读成「这里恰好平一点」。
   */
  const chamberMat = chitin({ color: CHAMBER_COLOR, gloss: 0.3, clearcoat: 0.06 })
  for (const m of [dungMat, cutMat, chamberMat]) m.vertexColors = true

  const shell = new THREE.Mesh(
    revolve(
      OUTER_RINGS,
      (v, phi) => ({ r: pearOuterRadius(v, phi), y: v * PEAR_H }),
      pearTint,
      (v, phi) => v >= NOTCH_V - 1e-9 && inNotch(phi),
    ),
    dungMat,
  )
  shell.name = 'pear-shell'
  g.add(shell)

  // 孵化室整个落在豁口高度以上，所以它的判据只看方位角：朝观众那半不生成，
  // 剩下的半只碗就是我们看见的室壁
  const chamber = new THREE.Mesh(
    revolve(CHAMBER_RINGS, chamberPoint, chamberTint, (_v, phi) => inNotch(phi)),
    chamberMat,
  )
  chamber.name = 'pear-chamber'
  g.add(chamber)

  g.add(notchWall(NOTCH_FROM, cutMat))
  g.add(notchWall(NOTCH_TO, cutMat))
  g.add(notchFloor(cutMat))

  /*
   * 卵壳材质。三个数都是「防白铬」的：
   * gloss 0.4 → roughness ≈ 0.63（宽而软的高光，不是镜面点）；
   * clearcoat 0.05 → 几乎没有第二层角度高光（elytra 的 0.55 在这个亮度上必炸）；
   * 不开 translucent（理由见文件头）。
   */
  const eggMat = chitin({ color: EGG_COLOR, gloss: 0.4, clearcoat: 0.05, surface: 'smooth' })
  const egg = new THREE.Mesh(eggBody(), eggMat)
  egg.name = 'egg-shell'
  /*
   * 卵躺在室底：比室心低 0.1，并向 +X 斜 25°、微微偏向剖口一侧（+Z 0.02），
   * 这样从默认机位与侧机位看过去它整个露在窗口里，不会被室口的边缘切掉。
   */
  egg.position.set(0.03, CHAMBER_Y - 0.08, 0.02)
  egg.rotation.z = -THREE.MathUtils.degToRad(EGG_TILT_DEG)
  g.add(egg)

  const anchors: Record<string, THREE.Vector3> = {
    egg: new THREE.Vector3(0.02, CHAMBER_Y - 0.1 + EGG_LENGTH * 0.4, 0.02),
    chamber: new THREE.Vector3(0, CHAMBER_Y + CHAMBER_HY * 0.8, 0),
    pear: new THREE.Vector3(-pearRadius(0.4) * 0.86, 0.4 * PEAR_H, 0),
  }

  return finalize(g, anchors)
}
