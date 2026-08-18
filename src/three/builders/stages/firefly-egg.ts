/**
 * 中华黄萤 · 卵 Pyrocoelia（完全变态第 1 阶段）
 *
 * ## 一粒会发微光的卵，没人会误认成珠子
 *
 * 第一批四颗卵里有两颗栽在同一件事上：**卵本身没有结构**，于是白底深斑读成
 * 「奶牛纹的土豆」、光球配一圈小球读成「珍珠配巧克力球」。规则因此定死：
 * **卵必须有可指认的表面结构，或有一个不是「一圈小球」的语境。**
 *
 * 萤火虫的卵有第三条路可走 —— 它**自己会发光**。萤科的卵、幼虫、蛹全都发光，
 * 这是真的，也正好把「一粒毫米级的白球」变成一件没有别的东西长这样的东西。
 * 所以本文件的招牌不是表面纹饰，而是：**淡黄 + 微微自发光 + 苔藓湿土的语境**。
 *
 * ## 分寸（三条都是照着第一批的教训定的）
 *
 * 1. **微光，不是灯泡。** 三个阶段的亮度排序必须真实：幼虫尾端两点最亮
 *    （emissiveIntensity 2.8），卵与蛹只是微光（0.75 / 0.95）。全开到成虫
 *    那一档（3.2）就成了三颗夜灯，反而假。
 * 2. **土要像土。** 粒径按幂律取样（细屑极多、粗块很少，跨度 6 倍），
 *    每粒各轴独立压扁 0.42~1.0 倍再随机滚转，颜色在三档土色里按随机数挑 ——
 *    「一圈大小相近的滚圆小球」是程序化偷懒最典型的样子，一眼就露。
 * 3. **苔藓不是装饰，是判据。** 萤火虫产卵在苔藓或湿土表面。加一小丛苔藓，
 *    「这是野外地面上的一窝卵」就立住了；只有土粒的话，读起来仍然可能是
 *    「一堆颗粒里的几颗珠子」。
 * 4. **基质的尺寸压到与卵同量级。** 帝王蝶那颗卵的经验：基座一大，取景被它
 *    撑开，卵反而缩成一个点。这里整片基质直径 0.42，卵簇跨度 0.23。
 *
 * ## 尺寸与簇
 *
 * 单粒直径约 1 毫米 = 模型 0.10（略扁，纵径 0.086），5 粒成一小簇彼此挨着
 * （雌虫成批产在苔藓上）。真实大小交给界面文字说 —— 尺度按真实比例做、
 * 取景由 `finalize()` 归一化，是 `stages.ts` 顶部写死的约定。
 *
 * 随机数一律走固定种子的 mulberry32：同一份代码在任何机器上都要长成同一窝卵，
 * 否则目视验收过的那张图跟用户看到的不是同一个东西。
 *
 * 局部坐标系与成虫（../firefly.ts）一致：+X 向前、+Y 向上、+Z 向右。
 * 卵没有前后之分，基质摊在 XZ 平面上。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度

/** 单粒卵的赤道半径：直径 1 毫米 */
const EGG_R = 0.05
/** 纵向压扁系数：球形至扁球，0.86 一眼看得出「不是正球」又不至于成饼 */
const EGG_FLAT = 0.86
/** 卵心离基质面的高度：底面正好压在土粒顶上 */
const EGG_Y = 0.02

/**
 * 一簇 5 粒（真实是 4~6 粒一小簇）。相邻中心距约 0.095 ≈ 一个卵径，
 * 彼此贴着 —— 撒开就成了「掉在地上的几颗珠子」（柞蚕卵第一版栽过）。
 */
const EGG_SITES: readonly (readonly [number, number, number])[] = [
  [0.0, 0.0, 0.0],
  [0.094, 0.002, 0.022],
  [-0.048, -0.004, 0.086],
  [0.032, 0.005, -0.088],
  [-0.086, 0.001, -0.036],
]

/** 基质半径。压到与卵簇同量级，取景才不会被基质撑开 */
const PATCH_R = 0.21
/** 土粒数与粒径区间（上下限差 6 倍，且按幂律取样） */
const GRAIN_COUNT = 220
const GRAIN_MIN = 0.007
const GRAIN_MAX = 0.042
/** 苔藓丛数 */
const MOSS_COUNT = 11

// ---------------------------------------------------------------- 颜色

/** 卵壳：淡黄。乳白偏黄的高明度档，压深就成了脏灰（第 5 轮那个坑） */
const EGG_COLOR = '#f2e3a6'
/** 卵的自发光：与成虫发光器同一色（黄绿），亮度只给微光档 */
const EGG_EMISSIVE = '#c8ff8a'
const EGG_INTENSITY = 0.75

/** 三档土色：湿腐殖土。按随机数挑，不按下标轮换（轮换会沿螺旋严格交替，反而规整） */
const SOIL_COLORS = ['#4b3a27', '#634d33', '#332a1e'] as const
/** 苔藓：两档绿。ACES 会提亮去饱和，这一档是「看得出是活苔藓」的绿 */
const MOSS_COLORS = ['#6f8c3c', '#587532'] as const

// ---------------------------------------------------------------- 随机数

/**
 * 种子化 PRNG（mulberry32）。土粒与苔藓必须是**确定性**的随机 ——
 * 与 `surface.ts` 的程序贴图同一条纪律。
 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 土丘顶面（中心）高度与半高。压得很扁：一小片湿土的侧影本来就是低平的 */
const MOUND_TOP = -0.018
const MOUND_HALF_H = 0.058
const MOUND_R = PATCH_R * 0.98

/**
 * 土丘表面在半径 r 处的高度。
 *
 * ⚠️ 这个函数必须与 `soilMound()` 那枚压扁椭球**用同一组数字**：
 * 第一版土粒按另一条抛物线摆，结果多数颗粒陷在丘体里面，丘面反而光溜溜的，
 * 出图读成「一块饼」。土粒是丘面的质感，摆不到面上就等于没做。
 */
function moundY(r: number): number {
  const k = THREE.MathUtils.clamp(r / MOUND_R, 0, 1)
  return MOUND_TOP - MOUND_HALF_H + MOUND_HALF_H * Math.sqrt(Math.max(0, 1 - k * k))
}

// ---------------------------------------------------------------- 部件

/** 一粒卵：略扁的椭球。表面光洁 —— 招牌是光，不是纹饰，纹饰做多了反而成土豆 */
function eggMesh(at: readonly [number, number, number], r: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), material)
  m.name = 'egg-shell'
  m.position.set(at[0], EGG_Y + at[1], at[2])
  m.scale.set(1, EGG_FLAT, 1)
  return m
}

/**
 * 土面本体：一枚压扁、轮廓不规则的低丘，土粒铺在它上面。
 *
 * ⚠️ 出图实测（第一版没有这一层）：只有颗粒的话，颗粒之间到处漏出背景色，
 * 整片基质读成「悬在空中的一堆碎屑」，卵也跟着像浮着的。真实的地面首先是
 * 一个**连续的面**，颗粒只是它的质感。轮廓用几条正弦叠出来的径向扰动打散 ——
 * 正圆的饼是「摆件的托盘」，那正是要避开的东西。
 */
function soilMound(material: THREE.Material): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 30, 18)
  const pos = geo.getAttribute('position')
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const a = Math.atan2(v.z, v.x)
    // 三条不同频率的正弦：确定性、周期闭合（不会在接缝处裂开）
    const wob = 1 + 0.11 * Math.sin(3 * a + 0.7) + 0.07 * Math.sin(5 * a + 2.1) + 0.045 * Math.sin(8 * a + 4.3)
    pos.setXYZ(i, v.x * wob, v.y, v.z * wob)
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'soil-mound'
  // 压得很扁（半高 0.058 ≈ 卵径的一半）：鼓成半球会读成一块巧克力蛋糕，
  // 一小片湿土的侧影本来就是低平的
  mesh.scale.set(MOUND_R, MOUND_HALF_H, MOUND_R)
  mesh.position.y = MOUND_TOP - MOUND_HALF_H
  return mesh
}

/**
 * 湿土：一层不规则的碎块。
 *
 * 幂律取样（`rand()^1.7`）把粒径压向下限，于是细屑多、粗块少 —— 均匀取样
 * 做不出土（独角仙卵第二版就是均匀取样，出图读成一圈巧克力球）。
 * 每粒再各轴独立压扁到 0.42~1.0、随机滚转，整片才不是一堆珠子。
 *
 * 卵簇正下方（r < 0.105）的土粒整体沉下去，只把顶端露在卵之间：
 * 卵要「躺在土上」，不能被土埋掉。
 */
function soilPatch(rand: () => number, materials: readonly THREE.Material[]): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < GRAIN_COUNT; i++) {
    // 黄金角螺旋 + 抖动：比纯随机均匀，不会一边堆满一边空
    const azimuth = i * 2.399963 + rand() * 0.6
    const radius = PATCH_R * Math.sqrt((i + 0.5) / GRAIN_COUNT) * (0.86 + rand() * 0.28)
    const size = GRAIN_MIN * Math.pow(GRAIN_MAX / GRAIN_MIN, Math.pow(rand(), 1.7))
    // 卵簇正下方的土粒压低一点：只把顶端从卵与卵之间露出来，不许把卵垫起来。
    // 其余的半埋在丘面上（−0.35 个粒径），露出的那一半才是「土的质感」。
    const under = radius < 0.105
    const y = under ? -0.036 + size * 0.3 : moundY(radius) - size * 0.35

    const grain = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 6),
      materials[Math.floor(rand() * materials.length)],
    )
    grain.name = 'soil-grain'
    grain.position.set(Math.cos(azimuth) * radius, y, Math.sin(azimuth) * radius)
    // 各轴独立压扁：土屑是崩出来的碎块，长宽厚差两倍以上很常见
    grain.scale.set(0.42 + rand() * 0.58, 0.42 + rand() * 0.58, 0.42 + rand() * 0.58)
    grain.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    g.add(grain)
  }
  return g
}

/**
 * 一丛苔藓：一根细茎 + 一圈螺旋排列的小叶。
 *
 * 苔藓的辨识特征就是「细茎上一圈翻卷的小叶」，做成一团绿球会退回成
 * 「另一种小球」，那正好是要避开的东西。叶片沿茎按黄金角旋上去、
 * 向斜上方外张，侧视是一支支小刷子。
 */
function mossShoot(
  rand: () => number,
  at: THREE.Vector3,
  height: number,
  stemMat: THREE.Material,
  leafMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const tilt = new THREE.Vector3((rand() - 0.5) * 0.26, 1, (rand() - 0.5) * 0.26).normalize()

  const steps = 5
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    sections.push({
      at: at.clone().addScaledVector(tilt, height * t),
      ry: Math.max(0.0055 * (1 - 0.5 * t), 1e-4),
      rz: Math.max(0.0055 * (1 - 0.5 * t), 1e-4),
    })
  }
  const stem = new THREE.Mesh(loft(sections, 7), stemMat)
  stem.name = 'moss-stem'
  g.add(stem)

  const leaves = 6 + Math.floor(rand() * 3)
  // 与茎垂直的两个方向，供叶片按方位角外张
  const e1 = new THREE.Vector3().crossVectors(tilt, new THREE.Vector3(1, 0, 0)).normalize()
  const e2 = new THREE.Vector3().crossVectors(tilt, e1).normalize()
  for (let i = 0; i < leaves; i++) {
    const t = 0.28 + 0.7 * (i / leaves)
    const a = i * 2.399963
    const out = e1.clone().multiplyScalar(Math.cos(a)).addScaledVector(e2, Math.sin(a))
    // 斜上方 45° 外张：直立的叶片读成一圈针，平摊的读成一朵花
    const dir = out.clone().multiplyScalar(0.72).addScaledVector(tilt, 0.7).normalize()
    const size = 0.022 * (0.8 + rand() * 0.5)
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), leafMat)
    leaf.name = 'moss-leaf'
    leaf.position.copy(at).addScaledVector(tilt, height * t).addScaledVector(dir, size * 0.9)
    const third = new THREE.Vector3().crossVectors(dir, tilt).normalize()
    leaf.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(dir, tilt, third))
    // 长、薄、窄：一枚披针形的小叶
    leaf.scale.set(1.5, 0.22, 0.6)
    g.add(leaf)
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildFireflyEgg(): InsectModel {
  const g = new THREE.Group()
  const rand = rng(0xf1e5)

  /*
   * 卵壳：淡黄 + 次表面透光 + **微自发光**。
   * clearcoat 只给 0.05 —— 这个亮度的基色一上清漆就在 ACES 下过曝成白铬
   * （七星瓢虫、甘薯腊龟甲都栽过），而这颗卵还额外挂着自发光，余量更小。
   * 「发光」这件事交给 emissive，不交给高光。
   */
  const eggMat = chitin({
    color: EGG_COLOR,
    gloss: 0.4,
    clearcoat: 0.05,
    translucent: true,
    emissive: EGG_EMISSIVE,
    emissiveIntensity: EGG_INTENSITY,
  })
  const soilMats = SOIL_COLORS.map((c) => chitin({ color: c, gloss: 0.3, clearcoat: 0.04, surface: 'punctate' }))
  const mossMats = MOSS_COLORS.map((c) => chitin({ color: c, gloss: 0.34, surface: 'velvet' }))

  g.add(soilMound(soilMats[1]))
  g.add(soilPatch(rand, soilMats))

  // 苔藓丛：只长在卵簇外围（r ≥ 0.115），不许挡住卵
  for (let i = 0; i < MOSS_COUNT; i++) {
    const a = i * 2.399963 + rand() * 0.5
    const r = 0.118 + rand() * 0.075
    const at = new THREE.Vector3(Math.cos(a) * r, moundY(r) - 0.01, Math.sin(a) * r)
    const height = 0.062 + rand() * 0.05
    g.add(mossShoot(rand, at, height, mossMats[i % 2], mossMats[(i + 1) % 2]))
  }

  // 卵：粒径略有出入（同一窝卵本来就不会一模一样）
  for (const site of EGG_SITES) {
    g.add(eggMesh(site, EGG_R * (0.94 + rand() * 0.12), eggMat))
  }

  const anchors: Record<string, THREE.Vector3> = {
    egg: new THREE.Vector3(0, EGG_Y + EGG_R * EGG_FLAT, 0),
    cluster: new THREE.Vector3(EGG_SITES[1][0], EGG_Y, EGG_SITES[1][2]),
    moss: new THREE.Vector3(0, moundY(PATCH_R * 0.8) + 0.05, PATCH_R * 0.8),
    soil: new THREE.Vector3(-PATCH_R * 0.75, moundY(PATCH_R * 0.75), 0),
  }

  return finalize(g, anchors)
}
