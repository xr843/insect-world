/**
 * 柞蚕蛾 Antheraea pernyi · 卵
 *
 * 造型要点（与成虫 silk-moth.ts 同一套单位与坐标系：1 = 1 厘米，+X 向前、+Y 向上、+Z 向右）：
 *
 * ## 这是第二版。第一版被目视验收打回，记录下来避免重犯
 *
 * 第一版三粒卵被读成「奶牛纹的土豆」或「骰子」，三个病根：
 *
 * 1. **斑点太圆、太大、对比太高、分布太规则。** 白底上一颗颗界限分明的深褐圆斑
 *    （14 块独立网格，明度差硬卡到 0.5+）是牛皮/骰子的语汇，不是虫卵的语汇——
 *    真实卵壳的斑纹是灰白至淡褐底上**晕开的**云斑，边界糊、大小不一、疏密不匀，
 *    对比低得多。**网格叠网格天生做不出「糊」**：两片不透明壳只能有硬边界，
 *    要软过渡只能走贴图里的连续色值插值。这是本版改用程序化贴图而非几何贴片
 *    的根本原因，不是「用 surface.ts 凑合一下」。
 * 2. **轮廓有疙瘩。** 第一版为了做表面凹陷，在球面上撒 16 个高斯衰减凹坑直接
 *    压低半径，凹坑深达半径的 13%、彼此又靠黄金角螺旋近乎均匀撒满整个球面——
 *    从任何一个机位看，视轮廓（法线与视线垂直的那圈点）附近总有凹坑落在上面，
 *    顶视图尤其明显（撒点算法在 y≈0 的赤道带上正好摆了两个坑），啃出来的缺口
 *    就是「土豆」。**表面纹理不等于表面几何**：真实卵壳确实有浅浅刻纹，但那是
 *    法线/明暗层面的事，不该改变外形轮廓。本版把壳收回数学意义上光洁的三轴
 *    椭球（半径完全不作方向调制），刻纹改用 `punctateMaps()` 走法线贴图——
 *    任何光照下能看出「不是打磨过的塑料」，但轮廓在任何机位都是干净的椭圆。
 * 3. **三粒的堆叠偏随意。** 原摆位里最远两粒中心相距 0.45（超过卵长径的
 *    1.5 倍），且各自 roll 达 20°+，读起来是撒在桌上滚开的三颗骰子，
 *    不是产在树皮上、彼此挤着的一窝卵。本版收紧间距（最远中心距 < 0.19，
 *    明显小于卵宽），roll 压到几度以内（卵是平躺贴着基质，不是被弹起来的），
 *    并新增一小片树皮基质让三粒卵有「贴」的面——这一条同时也是「有接触面、
 *    有朝向」的字面实现：没有基质，卵飘在空中本身就是骰子感的一部分来源。
 *
 * ## 尺寸
 *
 * 柞蚕卵长径约 3 毫米、短径 2.5 毫米、厚约 2 毫米，模型里是 0.30 / 0.245 /
 * 0.185（第一版定的量级，目视验收没打回这条，原样保留）。厚度只有长径的
 * 0.62 倍，这个扁度从侧面一眼就能读出来。
 *
 * ## 斑纹怎么做成「云」而不是「豆」
 *
 * 三层周期化 value noise（大/中/细三种格数，权重递减）在球面 UV 上叠加成一个
 * 连续标量场，再用 `smoothstep` 在一段较宽的区间里把场值软映射成 0~1 的混合
 * 权重——区间越宽，斑与底之间的过渡带越糊，这正是「边界糊」的来源。
 * 混合权重驱动基色到斑色的**连续插值**（sRGB 空间，见下方色彩空间的注释），
 * 而不是「场值过阈值就整块涂死」的硬判定，斑块内部还叠了一层很轻的明度抖动，
 * 避免插值结果是一片死平的纯色。这套场值计算是纯数值函数、不摸 Canvas，
 * 因此 `mottleColorAt()` 在 node（vitest）下可以直接调用来断言对比度——
 * 这也是它被导出的唯一原因，不是给别的文件用的公共 API。
 *
 * ## 色彩空间：一个极容易踩的坑
 *
 * three 把十六进制颜色按 sRGB 解释、转到线性工作空间存储；`Color.getHSL()`
 * 不显式传 `colorSpace` 时，返回的是**线性空间**的明度——线性明度对深色的
 * 压缩幅度远大于人眼感知，直接拿它去卡对比阈值，数字会失真（这条坑
 * `__tests__/silk-moth-stages.test.ts` 的 `hslOf()` 已经踩过一次并写了注释）。
 * 本文件的调色、混合、写 Canvas 字节全部显式走 `THREE.SRGBColorSpace`，
 * 保证「贴图里写的字节」「THREE.Color 算出来的明度」「人眼在 sRGB 显示器上
 * 看到的明暗」三者说的是同一件事。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'
import { punctateMaps } from '../surface'

// ---------------------------------------------------------------- 卵壳形状

/** 长径 3 毫米 = 0.30；下面三个半轴按 长 : 宽 : 厚 = 3 : 2.45 : 1.85 毫米取 */
const SEMI_X = 0.15
const SEMI_Y = 0.0925
const SEMI_Z = 0.1225

/** 把单位方向映射到卵壳表面：三个半轴各自缩放，不再有任何方向性的半径调制 */
function eggPoint(dir: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(dir.x * SEMI_X, dir.y * SEMI_Y, dir.z * SEMI_Z)
}

/**
 * 卵壳本体：一颗单位球直接按三个半轴缩放，数学意义上的光洁三轴椭球。
 * 不作任何顶点级半径调制——第一版的教训是「表面纹理」与「表面几何」一旦
 * 混为一谈，凹坑一深、一密就把轮廓做成了土豆。刻纹留给下面的法线贴图。
 *
 * `computeVertexNormals()` 是必须的：`BufferGeometry.scale()` 只变换顶点位置，
 * 不会按逆转置矩阵重算法线；非等比缩放（三个半轴不同）之后不重算法线，
 * 明暗会按未缩放前的球面法线来，椭球会显出一圈虚假的高光带。
 */
function chorionGeometry(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 96, 64)
  geo.scale(SEMI_X, SEMI_Y, SEMI_Z)
  geo.computeVertexNormals()
  return geo
}

// ---------------------------------------------------------------- 云斑：程序化贴图

/** 底色：灰白偏一点点暖，不是纯白（sRGB #e0dacb，明度约 0.84） */
export const SHELL_BASE_COLOR = '#e0dacb'
/**
 * 云斑色：中褐但比第一版浅得多。第一版 `#7a5330` 配底色对比硬卡到 0.5+，
 * 是「奶牛斑」的直接成因；这版选浅一档的 `#a8886a`，sRGB 空间里与底色相差
 * 约 0.30（下面 `mottleColorAt()` 的 sRGB 混合会再乘上 smoothstep 权重，
 * 实际观感对比比这个数还要柔和）。
 */
export const SHELL_BLOTCH_COLOR = '#a8886a'

const BASE_RGB = srgbOf(SHELL_BASE_COLOR)
const BLOTCH_RGB = srgbOf(SHELL_BLOTCH_COLOR)

/** 取十六进制颜色在 sRGB 空间的 rgb 浮点分量（0~1），避免线性/sRGB 混着算 */
function srgbOf(hex: string): { r: number; g: number; b: number } {
  const c = new THREE.Color(hex)
  const o = { r: 0, g: 0, b: 0 }
  c.getRGB(o, THREE.SRGBColorSpace)
  return o
}

/** 整数格点哈希：纯函数，无状态，node 下可直接调用。不用 Math.random —— 必须可复现 */
function latticeHash(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2654435761) | 0
  h = (h ^ (h >>> 13)) | 0
  h = Math.imul(h, 1274126177)
  h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}

function smooth01(t: number): number {
  return t * t * (3 - 2 * t)
}

/**
 * 周期化 2D value noise。u 方向按 cellsU 个格点回绕——球面 UV 的 u=0 与 u=1
 * 是同一条经线，不回绕就是背面正中一条硬接缝；v 方向（南北极）不回绕，
 * 两极是真实的点，不是接缝。纯数值计算，不摸 Canvas/DOM。
 */
function valueNoise2D(u: number, v: number, cellsU: number, seed: number): number {
  const nu = Math.max(1, Math.round(cellsU))
  const x = (((u % 1) + 1) % 1) * nu
  const y = v * nu
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = smooth01(x - x0)
  const fy = smooth01(y - y0)
  const wx = (n: number) => ((n % nu) + nu) % nu
  const v00 = latticeHash(wx(x0), y0, seed)
  const v10 = latticeHash(wx(x0 + 1), y0, seed)
  const v01 = latticeHash(wx(x0), y0 + 1, seed)
  const v11 = latticeHash(wx(x0 + 1), y0 + 1, seed)
  const top = v00 + (v10 - v00) * fx
  const bot = v01 + (v11 - v01) * fx
  return top + (bot - top) * fy
}

/** 三个种子，彼此无关（不同哈希种子），对应大/中/细三档云斑 */
const SEED_BIG = 17
const SEED_MID = 401
const SEED_FINE = 9007
const SEED_JITTER = 5501

/**
 * 大（4 格）+ 中（8 格）+ 细（11 格）三个倍频程叠加，权重递减：大小不一的云斑。
 *
 * 细节那一档从 17 格降到 10 格、权重从 0.15 降到 0.09、权重也降了一点：**边界糊不糊，由最高频那一档
 * 说了算**。17 格时相邻采样点之间能跨过小半个噪声格，斑缘出现 0.13 的明度台阶，
 * 读起来又开始有「边」了。加宽 smoothstep 区间也能压这个台阶，但那会把整体
 * 对比一起压掉（对比另有下限，压过头斑就消失了）——降高频是对症的那一味。
 */
function mottleNoise(u: number, v: number): number {
  const big = valueNoise2D(u, v, 4, SEED_BIG)
  const mid = valueNoise2D(u, v, 8, SEED_MID)
  const fine = valueNoise2D(u, v, 11, SEED_FINE)
  return 0.57 * big + 0.31 * mid + 0.12 * fine
}

/** smoothstep 的下/上限：区间越宽，斑与底之间的软过渡带越宽——这是「边界糊」的旋钮 */
const MOTTLE_LO = 0.28
const MOTTLE_HI = 0.98

/** 斑纹强度：0 = 纯底色，1 = 纯斑色，中间连续过渡（不是阈值硬判定） */
function mottleMask(u: number, v: number): number {
  return THREE.MathUtils.smoothstep(mottleNoise(u, v), MOTTLE_LO, MOTTLE_HI)
}

/**
 * 卵壳在球面 UV 上某一点的最终颜色：sRGB 空间里按 `mottleMask` 在底色/斑色间
 * 连续插值，再叠一点点明度抖动（同样在 sRGB 空间）避免插值结果死平。
 *
 * 纯函数、不摸 Canvas——node（vitest）下可以直接调用，是「对比度断言」与
 * 「贴图实际画的像素」共用的唯一算法，不存在测试与实现各算一套的风险。
 */
export function mottleColorAt(u: number, v: number): THREE.Color {
  const m = mottleMask(u, v)
  const r = THREE.MathUtils.lerp(BASE_RGB.r, BLOTCH_RGB.r, m)
  const g = THREE.MathUtils.lerp(BASE_RGB.g, BLOTCH_RGB.g, m)
  const b = THREE.MathUtils.lerp(BASE_RGB.b, BLOTCH_RGB.b, m)
  const out = new THREE.Color()
  out.setRGB(r, g, b, THREE.SRGBColorSpace)
  // ±0.035 的明度抖动：细碎斑驳感，幅度很小，不足以推翻对比度的上下限
  const jitter = (valueNoise2D(u, v, 23, SEED_JITTER) - 0.5) * 0.07
  const hsl = { h: 0, s: 0, l: 0 }
  out.getHSL(hsl, THREE.SRGBColorSpace)
  out.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + jitter, 0, 1), THREE.SRGBColorSpace)
  return out
}

const MOTTLE_TEX_SIZE = 256
let mottleTextureCache: THREE.CanvasTexture | null | undefined

/**
 * 把 `mottleColorAt()` 逐像素画进一张 Canvas 贴图。node（vitest）没有 Canvas 2D，
 * 提前判 `typeof document` 返回 null——与 surface.ts 同一套守卫，材质层拿到
 * null 就跳过，不影响任何几何/参数层面的断言。
 */
function mottleTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  if (mottleTextureCache !== undefined) return mottleTextureCache
  const canvas = document.createElement('canvas')
  canvas.width = MOTTLE_TEX_SIZE
  canvas.height = MOTTLE_TEX_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    mottleTextureCache = null
    return null
  }
  const img = ctx.createImageData(MOTTLE_TEX_SIZE, MOTTLE_TEX_SIZE)
  const rgb = { r: 0, g: 0, b: 0 }
  for (let y = 0; y < MOTTLE_TEX_SIZE; y++) {
    const v = y / (MOTTLE_TEX_SIZE - 1)
    for (let x = 0; x < MOTTLE_TEX_SIZE; x++) {
      const u = x / MOTTLE_TEX_SIZE
      mottleColorAt(u, v).getRGB(rgb, THREE.SRGBColorSpace)
      const o = (y * MOTTLE_TEX_SIZE + x) * 4
      img.data[o] = Math.round(rgb.r * 255)
      img.data[o + 1] = Math.round(rgb.g * 255)
      img.data[o + 2] = Math.round(rgb.b * 255)
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  // 颜色贴图必须标 sRGB——法线/粗糙度是数据图保持线性，这张是反照率，两者不能混
  tex.colorSpace = THREE.SRGBColorSpace
  mottleTextureCache = tex
  return tex
}

// ---------------------------------------------------------------- 树皮基质

/** 基质挤出深度、倒角，以及水平方向的半长/半宽 */
const BARK_HALF_LEN = 0.27
const BARK_HALF_WIDE = 0.19
const BARK_DEPTH = 0.05

/**
 * 一小片树皮基质：柞蚕蛾把卵成堆产在枝干或叶背，卵簇要有「贴」的面，
 * 不然三粒悬在空中，读出来就是撒在桌上的骰子——这是第一版三个病根之一。
 * 做法照抄 monarch-butterfly-egg.ts 的 `leafPatch()`：形状在 XY 平面画出后
 * `rotateX(π/2)` 摊平到 XZ，厚度落到 -Y，顶面正好是 y=0，卵基埋进去一点点。
 * 只做粗轮廓与浅纵纹 —— 它是尺度与「有面可贴」的参照物，抢戏就本末倒置；
 * 但也不能省成一块光板，那会把卵一起拖进「摆在木板上的面团」。
 */
function barkPatch(material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector2[] = []
  const N = 40
  /**
   * 轮廓要**参差**。第一版的边缘是一条光滑的正弦包络，挤出来是块边线干净的
   * 板子 —— 出图里三粒卵读成「木板上的三个白面团」，卵本身改得再对也救不回来，
   * 因为语境把它带偏了。树皮碎块的边是崩口与裂茬，不是刀切的。
   *
   * 用固定种子的伪随机做参差（不用 Math.random：每次构建必须一样，否则测试会闪）：
   * 一层大起伏定基本形，一层小锯齿做崩口，两层频率不成整数比，合起来不会读出周期。
   */
  const jag = (s: number, seed: number) => {
    const a = Math.sin(s * 7.3 + seed) * 0.5 + Math.sin(s * 17.1 + seed * 2.7) * 0.28
    return 1 + a * 0.16
  }
  const edge = (s: number, seed: number) =>
    BARK_HALF_WIDE * Math.pow(0.35 + 0.65 * Math.sin(Math.PI * s), 0.5) * jag(s, seed)
  for (let i = 0; i <= N; i++) {
    const s = i / N
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(-BARK_HALF_LEN, BARK_HALF_LEN, s), edge(s, 0.7)))
  }
  // 另一侧换种子：两边各崩各的，对称的崩口反而像刻意的花边
  for (let i = N; i >= 0; i--) {
    const s = i / N
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(-BARK_HALF_LEN, BARK_HALF_LEN, s), -edge(s, 3.1)))
  }
  const shape = new THREE.Shape(pts)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: BARK_DEPTH,
    bevelEnabled: true,
    bevelSize: 0.014,
    bevelThickness: 0.012,
    bevelSegments: 2,
    curveSegments: 10,
  })
  geo.rotateX(Math.PI / 2)
  /**
   * 顶面顺纹起伏：树皮是有纵向沟脊的，平顶只会读成刨光的板材。
   * 只动 y≈0 的那一层顶点（挤出后顶面在 y=0），沟深控制在 0.012 以内 ——
   * 再深卵就坐不稳了，而卵与基质的贴合是这块基质存在的全部理由。
   */
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    if (Math.abs(pos.getY(i)) > 1e-4) continue
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const ridge = Math.sin(z * 41 + 0.9) * 0.007 + Math.sin(z * 97 + x * 3) * 0.004
    pos.setY(i, ridge - 0.004)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'egg-bark'
  return mesh
}

// ---------------------------------------------------------------- 建模主体

/** 卵基埋进基质的深度：贴合处不留缝，参照 monarch 蛋的 EMBED 手法 */
const EMBED = 0.018
/** 卵中心的落地高度：基质顶面在 y=0，卵沉进去 EMBED 深 */
const EGG_Y = SEMI_Y - EMBED

/**
 * 一窝三粒卵的摆位：紧挨着、长轴大体同向但各拧一点，roll 只给几度——
 * 卵是平躺贴在基质上的，不是被弹起来的骰子。三粒中心两两间距都在 0.19
 * 以内（小于卵宽 0.245），比第一版最远两粒相距 0.45 收紧了一大截。
 */
const CLUTCH: { pos: [number, number, number]; yaw: number; roll: number }[] = [
  { pos: [0.0, EGG_Y, 0.0], yaw: 0.05, roll: 0.02 },
  { pos: [0.085, EGG_Y + 0.004, 0.115], yaw: -0.12, roll: -0.04 },
  { pos: [-0.095, EGG_Y - 0.003, 0.085], yaw: 0.18, roll: 0.05 },
]

export function buildSilkMothEgg(): InsectModel {
  const g = new THREE.Group()

  // 卵壳：材质基色留白（sRGB #ffffff），颜色全部交给 mottleTexture() 那张贴图
  // 决定——两处都决定颜色会互相相乘，白色是「贴图说了算」的中性起点。
  const shellMat = chitin({ color: '#ffffff', gloss: 0.22, clearcoat: 0 })
  const map = mottleTexture()
  if (map) shellMat.map = map
  // 浅浅的刻纹改走法线贴图，不再改几何半径：任何机位轮廓都是干净的椭圆，
  // 刻纹只在明暗层面读出来（这正是第一版想要又做错的效果）。密度比鞘翅刻点
  // 稀一些、坑径大一些——卵壳的凹坑比甲虫刻点稀疏、粗糙得多。
  const pits = punctateMaps(90, 0.05)
  if (pits) {
    shellMat.normalMap = pits.normal
    shellMat.roughnessMap = pits.roughness
  }

  const barkMat = chitin({ color: '#6b5847', gloss: 0.12, surface: 'punctate' })

  const shellGeo = chorionGeometry()

  for (const egg of CLUTCH) {
    const one = new THREE.Group()
    one.name = 'egg'
    // 几何体与材质在三粒之间共享（同一颗卵的三个实例）
    const shell = new THREE.Mesh(shellGeo, shellMat)
    shell.name = 'egg-shell'
    one.add(shell)
    one.position.set(...egg.pos)
    one.rotation.y = egg.yaw
    one.rotation.x = egg.roll
    g.add(one)
  }

  g.add(barkPatch(barkMat))

  const clutchCenter = CLUTCH.reduce((acc, e) => acc.add(new THREE.Vector3(...e.pos)), new THREE.Vector3()).divideScalar(
    CLUTCH.length,
  )

  const anchors: Record<string, THREE.Vector3> = {
    // 卵簇整体：三粒中心的重心，给「这是一窝卵」的整体标注用
    clutch: clutchCenter,
    // 单粒卵壳：落在第一粒的表面上（忽略它那几度的小旋转，误差在贴图精度以内）
    shell: eggPoint(new THREE.Vector3(0.25, 0.7, 0.6).normalize()).add(new THREE.Vector3(...CLUTCH[0].pos)),
    // 基质：顶面（y=0）上、卵簇旁边留白处的一点
    bark: new THREE.Vector3(0.16, 0, 0.15),
  }

  return finalize(g, anchors)
}
