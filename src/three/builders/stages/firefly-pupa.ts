/**
 * 中华黄萤 · 蛹 Pyrocoelia（完全变态第 3 阶段）
 *
 * ## 这只蛹要说的两件事
 *
 * 1. **「里面是一只萤火虫」** —— 靠腹面那三套芽（翅芽 / 足芽 / 触角芽）与
 *    已经成形的**半圆形前胸背板**。萤科最好认的特征就是那片盖住头的盾片，
 *    它在蛹期已经在了，于是「乳白的荚」和「会发光的甲虫」接得上。
 * 2. **腹端仍在发光** —— 萤科的卵、幼虫、蛹全都发光。蛹的是微光
 *    （emissiveIntensity 0.95），排在幼虫尾端两点（2.8）之下、与卵（0.75）同档。
 *    三个阶段一起点亮，但亮度排序必须真实，不是全开到最大。
 *
 * ## 分寸
 *
 * - **裸蛹**（exarate）：鞘翅目的蛹附肢是游离的，不像蝶蛹那样封在一层壳里。
 *   所以芽必须是**贴着体壁半埋的隆脊**，有自由边、边下有阴影缝 ——
 *   ⚠️ 第一批的教训：**深色贴浅色读成斑纹，不是结构**（黑蚱蝉的翅芽比胸背
 *   暗一档，四个机位全读成一块污渍）。区分结构靠形，不靠更暗的颜色。
 *   摆位沿用独角仙蛹的 `flankPad()` 那一招：整组绕 X 转到「组的局部 +Y =
 *   该方位角处体壁的外法线」，组内只写「离体轴多远、多厚、多宽」。
 *   ⚠️ 左侧**不能**用 `scale.z = −1` 镜像 —— 矩阵是 T·R·S，缩放先作用于局部
 *   向量，而局部 +Y 的 z 分量是 0，翻 scale.z 对它毫无影响，两侧的芽会一起
 *   指向 +Z（独角仙蛹第一版的三片悬空剪纸就是这么来的）。镜像做在角度上。
 * - **姿态：侧卧**（绕 X 滚 −55°）。理由不是好看：四个验收机位全在上方，
 *   不滚的话腹面那三套芽在任何机位都看不见，等于白做。滚 55° 之后，
 *   顶视仍看得到背板（背向 +Y 分量 0.57），侧视正对腹面（腹侧向 +Z 分量 0.92）。
 * - **土室只做一层浅底，不做罩子。** 萤火虫末龄幼虫在湿土里做土室化蛹，
 *   但把蛹包进土室等于把招牌挡掉（独角仙蛹那一轮就是为此干脆不做土室）。
 *   这里取折中：侧卧姿态下腹面朝上朝前，土只铺在底下，一点都挡不着。
 * - **不为了好看放大**：体长 1.2 厘米 = 模型 1.2，比幼虫（2.2）短 —— 化蛹时
 *   虫体本来就缩短，这个差值是真实的。
 *
 * ## 颜色纪律
 *
 * 乳白至淡黄的东西**反过来最危险**：压深就是脏灰，不压又会过曝成白铬
 * （七星瓢虫、甘薯腊龟甲栽的都是后者）。解法不是调基色而是调材质 ——
 * 体壁用哑光 + 次表面透光（`gloss` 0.22 / `clearcoat` 0.03 / `translucent`），
 * 高光根本没有机会顶到过曝区，基色因此可以放心用真正的乳黄。
 *
 * 局部坐标系与成虫（../firefly.ts）一致：+X 向前（头）、+Y 向上（背）、+Z 向右。
 */
import * as THREE from 'three'
import {
  abdomenEnvelope,
  chitin,
  finalize,
  loft,
  segmentedAbdomen,
  spindle,
  type InsectModel,
  type SegmentedAbdomenOptions,
  type Section,
} from '../kit'

// ---------------------------------------------------------------- 颜色

/** 蛹体：乳白偏黄。搭配哑光 + 半透材质才不会过曝（见文件头「颜色纪律」） */
const BODY_COLOR = '#eddfae'
/** 芽：比体壁深一档的蜡黄。**颜色只是辅助**，芽读得出来靠的是自由边与阴影缝 */
const PAD_COLOR = '#d2b87e'
/** 前胸背板：略带粉橙，与成虫那片粉橙盾片同一个方向（蛹期还很淡） */
const SHIELD_COLOR = '#e6c79a'
/** 蛹眼与气门的深色小点。蛹期复眼先于体色变深，是真实特征 */
const DARK_COLOR = '#6a4b30'

/** 发光器：与成虫、幼虫同一套黄绿自发光，亮度只给微光档 */
const LANTERN_COLOR = '#eef7c8'
const LANTERN_EMISSIVE = '#c8ff8a'
/** 蛹的微光。排序：幼虫 2.8 > 蛹 0.95 ≈ 卵 0.75 */
const LANTERN_INTENSITY = 0.95

/** 土室底：三档湿土色 */
const SOIL_COLORS = ['#4b3a27', '#634d33', '#332a1e'] as const

/**
 * 仰卧偏侧：整体绕 X 轴滚这么多度，腹面转向斜上方（+Y 与 +Z 之间）。
 *
 * 出图实测折了两轮才定：
 * - −42°（侧卧）时腹面只在侧机位擦着看得见，三套芽在顶视全灭 —— 而
 *   「看得出里面是一只萤火虫」正是这个阶段的全部价值，芽看不见等于白做；
 * - −122° 让腹面法线在顶视与侧视上的余弦都是 0.53 以上，四个机位都读得到芽。
 * 代价是背面的前胸背板转到下方，只在轮廓里留下那道半圆的宽肩 —— 这个取舍
 * 与独角仙蛹「不做土室以免挡住角」是同一条判据：哪种做法能让招牌被看见。
 * 真实的甲虫蛹在土室里本来就多是仰卧或侧卧的，这不是为了好看摆的姿势。
 */
const ROLL_DEG = -122

// ---------------------------------------------------------------- 体段

interface SpindleSpec {
  from: [number, number, number]
  to: [number, number, number]
  radius: number
  bulge: number
  flat: number
  taperStart: number
  taperEnd: number
}

/** 前胸背板：一片扁而阔的半圆盾，盖住头 —— 萤科最好认的那处，蛹期已成形 */
const SHIELD: SpindleSpec = {
  from: [0.16, 0.055, 0],
  to: [0.6, 0.075, 0],
  radius: 0.092,
  bulge: 0.58,
  flat: 2.1,
  taperStart: 0.34,
  taperEnd: 0.12,
}

/** 中后胸：短，前端塞进盾片下面 */
const THORAX: SpindleSpec = {
  from: [-0.02, 0.02, 0],
  to: [0.3, 0.05, 0],
  radius: 0.115,
  bulge: 0.5,
  flat: 1.4,
  taperStart: 0.5,
  taperEnd: 0.42,
}

/** 头：小，缩在盾片下方前端，只在前视/侧视露一点 */
const HEAD: SpindleSpec = {
  from: [0.34, -0.005, 0],
  to: [0.58, 0.005, 0],
  radius: 0.062,
  bulge: 0.5,
  flat: 1.25,
  taperStart: 0.3,
  taperEnd: 0.3,
}

/**
 * 腹部：6 节，前粗后细、背腹略压扁（flat 1.25，语义见 kit.spindle 注释：
 * >1 = 上下压扁）。萤火虫成虫就是扁的，蛹已经是这个体型。
 * `groove` 只给 0.075：深了背缘剪影会成一排锯齿（松果病）。
 */
const ABDOMEN: SegmentedAbdomenOptions = {
  from: [0.1, 0.015, 0],
  to: [-0.56, 0.035, 0],
  r0: 0.152,
  r1: 0.052,
  segments: 6,
  groove: 0.075,
  flat: 1.25,
  bulge: 0.24,
  color: BODY_COLOR,
}

/** 复刻 kit.spindle 的半径包络，供腹面附属物按体壁定位（不重复造几何） */
function spindleRadius(spec: SpindleSpec, x: number): { axisY: number; ry: number; rz: number } | null {
  const span = spec.to[0] - spec.from[0]
  const t = (x - spec.from[0]) / span
  if (t < 0 || t > 1) return null
  const k = t < spec.bulge ? t / spec.bulge : (1 - t) / (1 - spec.bulge)
  let r = spec.radius * Math.sin(THREE.MathUtils.clamp(k, 0, 1) * Math.PI * 0.5)
  if (t === 0) r = spec.radius * spec.taperStart
  if (t === 1) r = spec.radius * spec.taperEnd
  return {
    axisY: THREE.MathUtils.lerp(spec.from[1], spec.to[1], t),
    ry: r / spec.flat,
    rz: r * spec.flat,
  }
}

/** 腹部某个 x 处的轴心与半径（与 segmentedAbdomen 共用 kit 的同一条包络） */
function abdomenRadius(x: number): { axisY: number; ry: number; rz: number } | null {
  const span = ABDOMEN.to[0] - ABDOMEN.from[0]
  const t = (x - ABDOMEN.from[0]) / span
  if (t < 0 || t > 1) return null
  const env = abdomenEnvelope(t, ABDOMEN.r0, ABDOMEN.r1, ABDOMEN.bulge)
  const flat = ABDOMEN.flat ?? 1
  return {
    axisY: THREE.MathUtils.lerp(ABDOMEN.from[1], ABDOMEN.to[1], t),
    ry: env / flat,
    rz: env * flat,
  }
}

/**
 * 某个 x、某个方位角（从腹中线量向侧方）上的体壁位置。
 * 几段在中段互相重叠，取更粗的那个 —— 那才是实际看得见的表面。
 */
function bodyWall(x: number, phi: number): { axisY: number; r: number } {
  let best = { axisY: 0, r: 0 }
  for (const c of [abdomenRadius(x), spindleRadius(THORAX, x), spindleRadius(HEAD, x)]) {
    if (!c) continue
    const r = 1 / Math.hypot(Math.cos(phi) / c.ry, Math.sin(phi) / c.rz)
    if (r > best.r) best = { axisY: c.axisY, r }
  }
  return best
}

/** 腹末：`segmentedAbdomen` 的末端是个平口，补一枚圆钝的球冠收口 */
function abdomenTip(material: THREE.Material): THREE.Mesh {
  const from = new THREE.Vector3(...ABDOMEN.to)
  const dir = new THREE.Vector3(...ABDOMEN.to).sub(new THREE.Vector3(...ABDOMEN.from)).normalize()
  const flat = ABDOMEN.flat ?? 1
  const steps = 10
  const r1 = ABDOMEN.r1 ?? 0.05
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const r = Math.max(r1 * Math.sqrt(Math.max(0, 1 - u * u)), 1e-4)
    sections.push({ at: from.clone().addScaledVector(dir, u * r1 * 1.2), ry: r / flat, rz: r * flat })
  }
  const mesh = new THREE.Mesh(loft(sections, 20), material)
  mesh.name = 'pupa-abdomen-tip'
  return mesh
}

// ---------------------------------------------------------------- 腹面的芽

interface PadSpec {
  /** 方位角（度）：从腹中线量向侧方 */
  phi: number
  /** 沿体轴的采样：[x, 半厚（沿法线）, 半宽（沿切向）] */
  samples: readonly (readonly [number, number, number])[]
  name: string
}

/**
 * 贴壁的芽（翅芽 / 足芽 / 触角芽）。做法与独角仙蛹的 `flankPad()` 同源，
 * 关键在**摆位方式**而不是形状：整组绕 X 转到「组的局部 +Y = 该 φ 处体壁的
 * 外法线」，组内只写「离体轴多远、多厚、多宽」—— 芽因此天然半埋在体壁里，
 * 有自由边、边下有缝，而不是几片贴在体表上的深色剪纸。
 *
 * 为什么每个物种各写一份而不抽成公共函数：`builders/stages/` 下的文件会被
 * `stages.ts` 的 glob 当成阶段模块登记，放一个「只有工具函数、没有 build*」
 * 的文件进去会污染注册表。这是目录约定换来的代价，注释说清即可。
 */
function flankPad(spec: PadSpec, material: THREE.Material, side: 1 | -1): THREE.Group {
  const phi = THREE.MathUtils.degToRad(spec.phi)
  const mid = spec.samples[Math.floor(spec.samples.length / 2)][0]

  const g = new THREE.Group()
  g.position.y = bodyWall(mid, phi).axisY
  // 局部 +Y → 该处体壁的外法线 (0, −cosφ, side·sinφ)：绕 X 转 (π − side·φ)。
  // 镜像必须做在角度上，理由见文件头（scale.z 对 z 分量为 0 的局部 +Y 无效）。
  g.rotation.x = Math.PI - phi * side

  const sections: Section[] = []
  for (const [x, halfThick, halfWide] of spec.samples) {
    // 圆心正落在体壁上：一半埋进去、一半露出来，读成隆脊而不是贴片
    sections.push({ at: new THREE.Vector3(x, bodyWall(x, phi).r, 0), ry: halfThick, rz: halfWide })
  }
  const mesh = new THREE.Mesh(loft(sections, 16), material)
  mesh.name = spec.name
  g.add(mesh)
  return g
}

/**
 * 翅芽：一对软鞘翅的前身，长在**体侧**（φ=76，靠近侧棱），自胸部向后盖到
 * 腹部第 3 节。
 *
 * ⚠️ 出图实测（诊断色渲染）改过两轮：第一版 φ=58、半宽 0.16，两片翅芽在
 * 腹面正中**碰头**，把六个足芽和两条触角芽全盖住了 —— 顶视只剩「一枚光滑的
 * 荚」，三套芽一套都读不出来。真实排布是从腹中线往外：足在内、触角次之、
 * 翅芽最外，本组数字照这个改回来了（宽度 0.065 ≈ 40° 弧，压住后足基部为止）。
 */
const WING_PAD: PadSpec = {
  phi: 76,
  samples: [
    [0.4, 0.018, 0.024],
    [0.24, 0.05, 0.055],
    [0.0, 0.056, 0.065],
    [-0.22, 0.048, 0.058],
    [-0.4, 0.024, 0.03],
    [-0.5, 0.008, 0.01],
  ],
  name: 'pupa-wing-pad',
}

/**
 * 触角芽：一对细长的隆脊，自头侧沿腹面向后伸到胸末。
 * 位置在翅芽之外（φ 更大）—— 甲虫蛹的触角正是折在翅芽外缘那一线。
 */
const ANTENNA_PAD: PadSpec = {
  phi: 56,
  samples: [
    [0.52, 0.014, 0.016],
    [0.38, 0.028, 0.032],
    [0.18, 0.03, 0.034],
    [-0.02, 0.026, 0.03],
    [-0.14, 0.012, 0.014],
  ],
  name: 'pupa-antenna-pad',
}

/** 足芽：三对折起来的足，截面近正圆（隆脊，不是板），从内到外排在腹面 */
const LEG_PADS: PadSpec[] = [
  {
    phi: 11,
    samples: [
      [0.46, 0.016, 0.016],
      [0.3, 0.04, 0.04],
      [0.12, 0.044, 0.044],
      [0.0, 0.016, 0.016],
    ],
    name: 'pupa-leg-pad',
  },
  {
    phi: 26,
    samples: [
      [0.42, 0.016, 0.016],
      [0.22, 0.042, 0.042],
      [-0.04, 0.044, 0.044],
      [-0.16, 0.016, 0.016],
    ],
    name: 'pupa-leg-pad',
  },
  {
    phi: 40,
    samples: [
      [0.34, 0.016, 0.016],
      [0.12, 0.042, 0.042],
      [-0.16, 0.043, 0.043],
      [-0.3, 0.016, 0.016],
    ],
    name: 'pupa-leg-pad',
  },
]

// ---------------------------------------------------------------- 发光器与土

/** 发光器着生的体轴位置（腹端第 8 节腹面，与幼虫、成虫同一处） */
const LANTERN_X = -0.4

/**
 * 一对腹端发光器：腹面偏侧的扁乳突，微光。
 *
 * φ 取 34°（不是贴着腹中线的 20°）：侧卧姿态下腹中线朝下偏前，正腹面的东西
 * 在四个俯视机位里都是背光的一侧；挪到腹侧才既真实（发光器本来就成对分居
 * 腹面两侧）又看得见。圆心正落在体壁上，一半埋进去 —— 浮在外面就成了两颗珠子。
 */
function lanterns(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const phi = THREE.MathUtils.degToRad(34)
    const wall = bodyWall(LANTERN_X, phi)
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), material)
    m.name = 'pupa-lantern'
    m.position.set(LANTERN_X, wall.axisY - Math.cos(phi) * wall.r, side * Math.sin(phi) * wall.r)
    m.scale.set(1.3, 0.62, 1.05)
    g.add(m)
  }
  return g
}

/** 种子化 PRNG（mulberry32）：土必须是确定性的随机，与 firefly-egg.ts 同一条纪律 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 土面的尺寸压到与蛹同量级（蛹长 1.24，土面 1.2×0.6）。
 * 出图实测：0.66×0.38 那一版的土比蛹宽一倍，整张图读成「巧克力里嵌了一粒杏仁」
 * —— 与帝王蝶卵那片叶子的经验同一条：基座一大，取景被它撑开，主角就缩了。
 */
const SOIL_HALF_X = 0.6
const SOIL_HALF_Z = 0.3
const SOIL_GRAINS = 100
const GRAIN_MIN = 0.011
const GRAIN_MAX = 0.05
/** 蛹沉进土面的深度：土面高度由蛹的实际包围盒算出来，不写死常量（姿态一改就对不上） */
const SOIL_SINK = 0.035

/**
 * 土室底面本体：一枚压扁、轮廓不规则的低丘，碎块铺在它上面。
 *
 * ⚠️ 出图实测（第一版只有碎块）：颗粒之间到处漏出背景色，一层土读成
 * 「蛹周围飘着一圈胡椒粒」。地面首先得是一个**连续的面**，颗粒只是质感。
 * 轮廓用三条正弦叠出的径向扰动打散，免得成一块规整的椭圆托盘。
 */
function soilMound(material: THREE.Material, top: number): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1, 34, 18)
  const pos = geo.getAttribute('position')
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const a = Math.atan2(v.z, v.x)
    const wob = 1 + 0.1 * Math.sin(3 * a + 1.4) + 0.06 * Math.sin(5 * a + 0.3) + 0.04 * Math.sin(9 * a + 2.6)
    pos.setXYZ(i, v.x * wob, v.y, v.z * wob)
  }
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'soil-mound'
  mesh.scale.set(SOIL_HALF_X, 0.1, SOIL_HALF_Z)
  mesh.position.y = top - 0.1
  return mesh
}

/**
 * 土室的底：一层不规则碎块，只铺在蛹下面。
 *
 * 粒径按幂律取样（细屑多、粗块少，跨度 4.6 倍）、各轴独立压扁、随机滚转、
 * 三档土色按随机数挑 —— 「一圈大小相近的滚圆小球」是程序化偷懒最典型的
 * 样子（独角仙卵第二版栽过），土的辨识特征恰恰是不规则。
 */
function soilFloor(materials: readonly THREE.Material[], top: number): THREE.Group {
  const g = new THREE.Group()
  const rand = rng(0x5a17)
  for (let i = 0; i < SOIL_GRAINS; i++) {
    const size = GRAIN_MIN * Math.pow(GRAIN_MAX / GRAIN_MIN, Math.pow(rand(), 2.2))
    const a = i * 2.399963 + rand() * 0.5
    const k = Math.sqrt((i + 0.5) / SOIL_GRAINS)
    const x = Math.cos(a) * k * SOIL_HALF_X
    const z = Math.sin(a) * k * SOIL_HALF_Z
    // 中央（蛹的正下方）略凹，边缘略高 —— 那是「土室的底」而不是一块平板
    const dip = 0.055 * (1 - k * k)
    const grain = new THREE.Mesh(
      new THREE.SphereGeometry(size, 8, 6),
      materials[Math.floor(rand() * materials.length)],
    )
    grain.name = 'soil-grain'
    grain.position.set(x, top - dip - size * 0.45, z)
    grain.scale.set(0.42 + rand() * 0.58, 0.42 + rand() * 0.58, 0.42 + rand() * 0.58)
    grain.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    g.add(grain)
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildFireflyPupa(): InsectModel {
  const g = new THREE.Group()
  /*
   * 姿态层：整体绕 X 轴滚 ROLL_DEG。放在内层而不是根 group 上，
   * 是为了让 finalize() 的居中与包围球照旧在根上算；锚点手工套同一个旋转
   * （见文件末尾）—— 两者共用同一个角度常量，不会各改各的。
   */
  const pose = new THREE.Group()
  pose.name = 'pupa-pose'
  pose.rotation.x = THREE.MathUtils.degToRad(ROLL_DEG)
  g.add(pose)

  // 体壁：哑光 + 次表面透光。**绝不是 elytra()** —— 乳黄色上清漆必过曝
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.22, clearcoat: 0.03, translucent: true })
  const shieldMat = chitin({ color: SHIELD_COLOR, gloss: 0.3, clearcoat: 0.08, surface: 'punctate' })
  const padMat = chitin({ color: PAD_COLOR, gloss: 0.26, clearcoat: 0.05, surface: 'striate' })
  const darkMat = chitin({ color: DARK_COLOR, gloss: 0.45, clearcoat: 0.22 })
  const lanternMat = chitin({
    color: LANTERN_COLOR,
    gloss: 0.35,
    emissive: LANTERN_EMISSIVE,
    emissiveIntensity: LANTERN_INTENSITY,
    translucent: true,
  })
  const soilMats = SOIL_COLORS.map((c) => chitin({ color: c, gloss: 0.3, clearcoat: 0.04, surface: 'punctate' }))

  // ---- 腹部（6 节）+ 圆钝收口
  const abdomen = new THREE.Mesh(segmentedAbdomen(ABDOMEN), bodyMat)
  abdomen.name = 'pupa-abdomen'
  pose.add(abdomen)
  pose.add(abdomenTip(bodyMat))

  // ---- 中后胸与头（头塞在盾片下面）
  const thorax = new THREE.Mesh(
    spindle(THORAX.from, THORAX.to, THORAX.radius, {
      bulge: THORAX.bulge,
      flat: THORAX.flat,
      taperStart: THORAX.taperStart,
      taperEnd: THORAX.taperEnd,
    }),
    bodyMat,
  )
  thorax.name = 'pupa-thorax'
  pose.add(thorax)

  const head = new THREE.Mesh(
    spindle(HEAD.from, HEAD.to, HEAD.radius, {
      bulge: HEAD.bulge,
      flat: HEAD.flat,
      taperStart: HEAD.taperStart,
      taperEnd: HEAD.taperEnd,
    }),
    bodyMat,
  )
  head.name = 'pupa-head'
  pose.add(head)

  // 蛹眼：一对深色小点，长在头侧。蛹期复眼先于体色变深，是真实特征，
  // 也是让这枚乳白的荚「有脸」的唯一一处
  for (const side of [1, -1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 9), darkMat)
    eye.name = 'pupa-eye'
    eye.position.set(0.48, -0.008, side * 0.055)
    eye.scale.set(1.1, 0.85, 0.8)
    pose.add(eye)
  }

  // ---- 前胸背板：半圆盾，盖住头。萤科最好认的那处
  const shield = new THREE.Mesh(
    spindle(SHIELD.from, SHIELD.to, SHIELD.radius, {
      bulge: SHIELD.bulge,
      flat: SHIELD.flat,
      taperStart: SHIELD.taperStart,
      taperEnd: SHIELD.taperEnd,
    }),
    shieldMat,
  )
  shield.name = 'pupa-shield'
  pose.add(shield)

  // ---- 腹面三套芽（左右各一份，镜像做在角度上）
  for (const side of [1, -1] as const) {
    pose.add(flankPad(WING_PAD, padMat, side))
    pose.add(flankPad(ANTENNA_PAD, padMat, side))
    for (const spec of LEG_PADS) pose.add(flankPad(spec, padMat, side))
  }

  // ---- 腹端发光器（微光）
  pose.add(lanterns(lanternMat))

  /*
   * ---- 土室的底（连续的低丘 + 铺在上面的碎块）
   *
   * 土面高度**从蛹自己的包围盒算**，不写死常量：姿态角一改，写死的高度就会
   * 让蛹要么悬空要么陷进土里（−42° 那一版的出图就是悬着的）。
   * 沉 SOIL_SINK 进去，接触面才有阴影 —— 悬空 0.02 在图上就是「浮着」。
   */
  pose.updateMatrixWorld(true)
  const soilTop = new THREE.Box3().setFromObject(pose).min.y + SOIL_SINK
  g.add(soilMound(soilMats[0], soilTop))
  g.add(soilFloor(soilMats, soilTop))

  const roll = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(ROLL_DEG))
  const posed = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(roll)

  const anchors: Record<string, THREE.Vector3> = {
    shield: posed(0.42, 0.13, 0),
    wingPad: posed(0.0, -0.09, 0.17),
    legPad: posed(0.12, -0.16, 0.05),
    antennaPad: posed(0.2, -0.03, 0.19),
    lantern: posed(LANTERN_X, -0.11, 0.05),
    abdomen: posed(-0.24, 0.14, 0),
  }

  return finalize(g, anchors)
}
