/**
 * 日本弓背蚁 · 卵 Camponotus japonicus（完全变态第 1 阶段）
 *
 * 单位与坐标系与成虫（../ant.ts）一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。
 *
 * ## 为什么做**一小堆**而不是一颗
 *
 * 弓背蚁的卵只有 0.5~0.8 毫米，短椭圆、乳白半透 —— 单看一颗，它与蝇卵、蚜虫卵、
 * 甚至一粒米浆没有任何可区分的形态特征。**这一阶段真正的招牌不在卵本身，
 * 而在「卵是成堆的」**：工蚁把卵不断舔舐（唾液里的抗菌物质防霉），舔过的卵
 * 表面带黏性，于是黏成一小团被叼着在巢室之间搬来搬去。社会性昆虫的育幼
 * 从这一堆开始，一颗孤零零的白椭球把这件事整个漏掉了。
 *
 * 顺带解掉尺度问题：单枚卵的包围半径只有 0.04，贴着 `stages.ts` 的下限
 * （0.02）；一小堆是 0.3~0.35，取景不必把一颗米粒撑满全屏。
 *
 * ## 形态依据
 *
 * 1. **单枚 0.72 × 0.42 毫米**（模型 0.072 × 0.042），长宽比约 1.7 —— 短椭圆，
 *    不是米粒（蜜蜂卵 4:1）也不是球。一端略细（着生端），这点不对称是
 *    「这是卵不是塑料珠」的第一眼判据。
 * 2. **28 枚，堆成一个矮丘**：四层，逐层收小、层内按均匀圆盘取样 + 黄金角布点
 *    （固定种子的伪随机，绝不用 Math.random —— 出图与测试都不该闪）。
 *    相邻卵中心距实测 0.027~0.072，**都不超过一枚卵的长度**，所以卵与卵互相抵住、
 *    局部微陷 —— 这正是「舔成一团、黏在一起」的几何表达。散开摆成一圈的话
 *    读成一盘珍珠。
 * 3. **朝向逐枚不同**：方位角走一圈、俯仰 ±20°。真实卵堆里卵是横七竖八的，
 *    全部平行会读成一板胶囊药。
 * 4. **乳白半透、哑光**：`chitin({ translucent: true, gloss 0.22, clearcoat 0.05 })`。
 *    高光是压过一档的：第一版 gloss 0.28 时每枚卵背上有一道细长高光，
 *    顶视出图里 28 枚卵一起读成了一把**咖啡豆**。
 *    基色取真正接近白的 `#f7f2e6`（明度 0.93），**不压深** —— 这个仓库栽过
 *    「颜色压深一档」被误解成「越深越保险」的跟头，浅色物件一压就三个阶段
 *    全成灰坨。防过曝靠哑光 + 次表面透光，不靠调暗基色。
 *
 * ## 巢室地面：这堆卵的语境与明度对照
 *
 * 蜜蜂那一颗卵的教训是「卵本身没有结构，语境又不可信」。蚁卵没有蜂那样
 * 举世皆知的六角房，但它有真实的语境：**土壤巢室的地面**。这里做一小片
 * 微凹的湿土（中央浅、周边略高，卵堆正落在凹处），边缘散着土粒把剪影打毛。
 * 它同时是明度对照 —— 土 `#4a3a2c`（明度 0.23）对卵的 0.93，差 0.70，
 * 乳白的卵才跳得出来；卵堆孤零零悬在浅色背景上时，白对白就什么都没有了。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 卵

/** 单枚卵长：0.72 毫米（真值 0.5~0.8） */
const EGG_LEN = 0.072
/** 单枚卵最粗处半径：宽 0.42 毫米，长宽比 1.7 —— 短椭圆 */
const EGG_R = 0.021

/**
 * 卵壳纵剖轮廓。t=0 是略细的着生端、t=1 是略圆的游离端，最粗处偏后
 * （0.55）。两端一样圆的胶囊读成零件，这一点微不对称是「卵」的关键。
 */
const EGG_PROFILE = [
  [0.0, 0.1],
  [0.08, 0.5],
  [0.2, 0.76],
  [0.38, 0.93],
  [0.55, 1.0],
  [0.72, 0.98],
  [0.86, 0.84],
  [0.95, 0.56],
  [1.0, 0.1],
] as const

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

/** 一枚卵：沿 +X 放样的短椭圆，中心在原点（朝向由外层 group 给） */
function eggGeometry(): THREE.BufferGeometry {
  const steps = 14
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(EGG_R * keyframe(EGG_PROFILE, t), 1e-4)
    sections.push({ at: new THREE.Vector3(-EGG_LEN / 2 + t * EGG_LEN, 0, 0), ry: r, rz: r })
  }
  return loft(sections, 14)
}

// ---------------------------------------------------------------- 卵堆布局

/** 固定种子的伪随机（mulberry32）。全整数运算、逐位确定 —— 出图与测试都不会闪 */
function prng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 卵堆的四层。`disc` 是该层的取样圆盘半径，`y` 是该层卵心的高度。
 *
 * 层内用 `r = disc * √((i+0.5)/n)` + 黄金角方位 —— 均匀圆盘取样，
 * 比等距圆环自然（等距圆环读成一枚花朵图案），也保证层内间距接近一致：
 * 底层 14 枚落在半径 0.142 的盘上，全堆实测最近邻距离 0.027~0.072，**全都不超过
 * 一枚卵的长度 0.072**，于是卵与卵彼此抵住 = 黏成一团。
 */
const LAYERS: readonly { y: number; disc: number; n: number; phase: number }[] = [
  { y: 0.024, disc: 0.142, n: 14, phase: 0.0 },
  { y: 0.051, disc: 0.104, n: 8, phase: 1.1 },
  { y: 0.073, disc: 0.064, n: 4, phase: 2.3 },
  { y: 0.091, disc: 0.024, n: 2, phase: 0.6 },
]

/** 黄金角：相继两枚卵的方位角差，均匀铺满圆盘而不成行成列 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface EggPose {
  pos: THREE.Vector3
  /** 绕 Y 的方位（长轴朝向） */
  yaw: number
  /** 抬头角：真实卵堆里卵横七竖八，全平行会读成一板胶囊药 */
  pitch: number
}

/** 全部卵的摆位（确定性，出图与测试完全一致） */
function eggPoses(): EggPose[] {
  const rnd = prng(0x0a17e6)
  const out: EggPose[] = []
  for (const layer of LAYERS) {
    for (let i = 0; i < layer.n; i++) {
      const rad = layer.disc * Math.sqrt((i + 0.5) / layer.n) * (0.88 + 0.24 * rnd())
      const ang = layer.phase + i * GOLDEN_ANGLE + (rnd() - 0.5) * 0.5
      out.push({
        pos: new THREE.Vector3(Math.cos(ang) * rad, layer.y + (rnd() - 0.5) * 0.012, Math.sin(ang) * rad),
        yaw: rnd() * Math.PI * 2,
        pitch: (rnd() - 0.5) * THREE.MathUtils.degToRad(40),
      })
    }
  }
  return out
}

// ---------------------------------------------------------------- 巢室地面

/**
 * 土面外缘的基准半径。卵堆宽约 0.32，土面直径 0.50 —— 卵堆占去大半，
 * 语境够而不喧宾夺主。第一版给的是 0.30（直径 0.60），出图后整块土
 * 占了画面的四分之三，读成「一块布朗尼上撒了几粒米」。
 */
const FLOOR_R = 0.25
/** 土层厚度：地面不是一张纸。零厚度的面被 finalize() 翻成双面后会在阴影贴图里自己遮自己，
 *  出图整片刷上噪点（蜂房底那一轮实撞过），所以给足实厚 */
const FLOOR_T = 0.055

/**
 * 外缘轮廓逐角度起伏：一个正圆的边界读成「一块切好的蛋糕」。
 * 掰下来的一块巢室地面本来就是不规则的。
 */
function floorEdge(ang: number): number {
  return FLOOR_R * (1 + 0.1 * Math.sin(ang * 3 + 0.5) + 0.06 * Math.sin(ang * 5 - 1.2))
}

/**
 * 土层厚度随半径收薄：外缘只剩三成。第一版是等厚的，出图时那圈垂直的侧壁
 * 读成一块蛋糕的切面 —— 掰下来的一片土，边上本来就是薄的。
 */
function floorThickness(rad: number): number {
  return FLOOR_T * (1 - 0.72 * THREE.MathUtils.smoothstep(rad, 0.45, 1))
}

/**
 * 土面高度：中央微凹（卵堆卧在凹处，不是摆在一块平板上），周边略高，
 * 再叠三组不同频率的正弦当颗粒起伏 —— 一张光滑的圆盘读成巧克力饼，
 * 有起伏才读成土。
 */
function floorHeight(rad: number, ang: number): number {
  const bowl = 0.05 * THREE.MathUtils.smoothstep(rad, 0.08, FLOOR_R)  // 中央微凹
  const grain =
    0.019 * Math.sin(ang * 3 + 0.7) +
    0.013 * Math.sin(ang * 7 + 2.1) +
    0.015 * Math.sin(rad * 21 + ang * 2) +
    0.008 * Math.sin(rad * 47 - ang * 5)
  return -0.014 + bowl + grain * THREE.MathUtils.smoothstep(rad, 0.03, 0.16)
}

/** 巢室地面：极坐标网格的上表面 + 下表面 + 外缘一圈侧壁（封成一块有厚度的土） */
function floorGeometry(): THREE.BufferGeometry {
  const NA = 56
  const NR = 10
  const pos: number[] = []
  const idx: number[] = []
  const push = (rad: number, ang: number, y: number) => {
    pos.push(Math.cos(ang) * rad, y, Math.sin(ang) * rad)
    return pos.length / 3 - 1
  }

  // 上表面（半径按角度起伏 —— 边界不是一个正圆）
  const top: number[][] = []
  for (let i = 0; i <= NR; i++) {
    const row: number[] = []
    for (let j = 0; j < NA; j++) {
      const ang = (j / NA) * Math.PI * 2
      const rad = (i / NR) * floorEdge(ang)
      row.push(push(rad, ang, floorHeight(rad, ang)))
    }
    top.push(row)
  }
  // 下表面：厚度随半径收薄，外缘只剩三成
  const bottom: number[][] = []
  for (let i = 0; i <= NR; i++) {
    const row: number[] = []
    for (let j = 0; j < NA; j++) {
      const ang = (j / NA) * Math.PI * 2
      const rad = (i / NR) * floorEdge(ang)
      row.push(push(rad, ang, floorHeight(rad, ang) - floorThickness(i / NR)))
    }
    bottom.push(row)
  }
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NA; j++) {
      const j2 = (j + 1) % NA
      idx.push(top[i][j], top[i + 1][j], top[i + 1][j2])
      idx.push(top[i][j], top[i + 1][j2], top[i][j2])
      idx.push(bottom[i][j], bottom[i + 1][j2], bottom[i + 1][j])
      idx.push(bottom[i][j], bottom[i][j2], bottom[i + 1][j2])
    }
  }
  // 外缘侧壁
  for (let j = 0; j < NA; j++) {
    const j2 = (j + 1) % NA
    idx.push(top[NR][j], bottom[NR][j], bottom[NR][j2])
    idx.push(top[NR][j], bottom[NR][j2], top[NR][j2])
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * 土粒：24 颗棱角分明的小块（IcosahedronGeometry 不细分 = 20 个平面），
 * 大半散在外缘、几颗混进卵堆边上。
 * 光有一张起伏的圆盘时剪影仍是一条光滑的弧，读成一枚饼干；
 * 剪影上带出颗粒，才读成土。（柞蚕茧的散丝是同一个道理。）
 */
function grainGroup(mat: (i: number) => THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const rnd = prng(0x9a11c5)
  for (let i = 0; i < 24; i++) {
    const ang = i * GOLDEN_ANGLE * 1.7 + rnd() * 0.4
    // 五颗混进卵堆边上，其余散在外圈；外圈那些跟着边界的起伏走
    const rad = i < 5 ? 0.155 + rnd() * 0.03 : floorEdge(ang) * (0.62 + 0.4 * rnd())
    const size = 0.011 + rnd() * 0.015
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), mat(i))
    m.name = 'soil-grain'
    m.position.set(Math.cos(ang) * rad, floorHeight(rad, ang) + size * 0.35, Math.sin(ang) * rad)
    m.scale.set(1, 0.62 + rnd() * 0.4, 0.8 + rnd() * 0.5)
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3)
    g.add(m)
  }
  return g
}

// ---------------------------------------------------------------- 颜色

/**
 * 卵壳：真正接近白的乳白（明度 0.93）。**不压深** —— ACES 会提亮去饱和，
 * 于是有了「颜色压深一档」的经验，但它一旦被当成「越深越保险」，
 * 三个浅色阶段就一起变成三坨分不清的灰。防过曝交给哑光材质。
 */
const EGG_COLOR = '#f7f2e6'
/** 巢室土：湿润的深褐（明度 0.23）。与卵差 0.70 个明度 —— 白卵靠它跳出来 */
const SOIL_COLOR = '#4a3a2c'

// ---------------------------------------------------------------- 装配

export function buildAntEgg(): InsectModel {
  const g = new THREE.Group()

  // 土：哑光、无清漆；surface: 'punctate' 挂一张随机圆坑法线（node 下静默跳过），
  // 让土面在近景里有颗粒感 —— 本仓库零贴图资产，颗粒只能来自程序生成的图与几何
  const soilMat = chitin({ color: SOIL_COLOR, gloss: 0.14, clearcoat: 0, surface: 'punctate' })
  /*
   * 土粒的深浅逐颗不同，但**直接写死六个 hex，不用 offsetHSL** ——
   * `Color.offsetHSL()` 读的是**线性工作空间**的明度：深褐 #4a3a2c 的线性 L
   * 只有 0.045，再减 0.055 就被夹到 0，那颗土粒当场变纯黑。
   * （这与测试里 getHSL 必须显式传 sRGB 是同一个坑，第一版实测踩到了。）
   */
  const grainMats = ['#584634', '#4a3a2c', '#3e3025', '#61503a', '#463629', '#523f2d'].map((c) =>
    chitin({ color: c, gloss: 0.18, clearcoat: 0 }),
  )

  const floor = new THREE.Mesh(floorGeometry(), soilMat)
  floor.name = 'nest-floor'
  g.add(floor)
  g.add(grainGroup((i) => grainMats[i % grainMats.length]))

  // 卵：乳白 + 次表面透光 + 哑光。绝不用 elytra()：乳白配清漆会整片过曝成白铬
  const eggMat = chitin({ color: EGG_COLOR, gloss: 0.22, clearcoat: 0.05, translucent: true })
  const eggGeo = eggGeometry()

  const poses = eggPoses()
  for (const pose of poses) {
    const m = new THREE.Mesh(eggGeo, eggMat)
    m.name = 'ant-egg'
    m.position.copy(pose.pos)
    m.rotation.set(0, pose.yaw, pose.pitch, 'YXZ')
    g.add(m)
  }

  /*
   * 锚点一律落在**真实几何体表面**上：仓库有一条闸门专门抓「标注点浮在空气里」，
   * 而那个 bug 的现场表现是页面上一个彩色圆点指着背景。
   */
  const top = poses.reduce((a, b) => (a.pos.y > b.pos.y ? a : b))
  const front = poses.reduce((a, b) => (a.pos.z > b.pos.z ? a : b))
  const anchors: Record<string, THREE.Vector3> = {
    // 堆顶那枚卵的背面
    pile: top.pos.clone().add(new THREE.Vector3(0, EGG_R * 0.92, 0)),
    // 最靠前的那枚卵的侧面 —— 指的是「一枚卵」而不是「一堆」
    egg: front.pos.clone().add(new THREE.Vector3(0, 0, EGG_R * 0.92)),
    // 巢室地面
    nest: new THREE.Vector3(
      Math.cos(-0.9) * 0.22,
      floorHeight(0.22, -0.9),
      Math.sin(-0.9) * 0.22,
    ),
  }

  /*
   * 取景收到 0.235：包围半径被土面的对角撑到 0.37，按它取景卵堆只占画面的四成。
   * 收紧后卵堆约占七成、土面边缘出画 ——
   * 与蜜蜂三阶段同一套处理，土面本身一点没缩水（radius 照实报）。
   * 再收下去土面就只剩一条边，「这是巢室地面上的一堆卵」的语境会跟着没掉。
   */
  return finalize(g, anchors, { frameRadius: 0.235 })
}
