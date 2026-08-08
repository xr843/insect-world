/**
 * 参数化翅脉网生成器 —— C 轮「翅脉 2.0」
 *
 * kit.wingVeins() 是「几根放射线 + 两道横杠」，读出来是扇骨不是翅脉。
 * 真实网翅（蜻蜓/豆娘/草蛉/齿蛉）的普遍规律，本模块逐条做实：
 *
 * 1. 纵脉自翅基呈扇形发出，前缘一根（前缘脉/costa）最粗、贴前缘走；
 *    往后逐渐变细、更弯，且每根都终止在翅缘上（不是悬在翅面中间）。
 * 2. 横脉在相邻纵脉间近垂直搭桥，密度从翅基到翅尖渐增——于是围出
 *    「基部大格、端部小格」的封闭翅室网，蜻蜓翅「越靠翅尖越碎」的
 *    质感全靠这条梯度。
 * 3. 可选翅痣（pterostigma）：前缘近翅尖的一小枚色块。蜻蜓文件已
 *    自带翅痣，调用方自带时**不要**再开这里的开关。
 *
 * 坐标与实现约定（与 kit 对齐，kit 只读、此处不改它一个字）：
 * - 输出位于翅面局部系：+X 沿翅长、翅面摊在 XZ 平面、+Z 为前缘——
 *   与 kit.wingGeometry() rotateX(π/2) 之后的空间一致，直接 add 进
 *   各物种的 blade 分组即可。
 * - 后缘收窄系数 TRAILING_NARROW 与 kit.wingGeometry() 内联的 0.72
 *   保持一致，纵脉的可行域才与翅膜真实轮廓重合；kit 若改（它不会，
 *   只读），这里要跟着改。
 * - 脉全部用 kit.loft() 的细圆柱段拼；**脉粗是按翅宽缩放的相对值**
 *   （veinScale），不再犯 kit.wingVeins() 半径硬编码 0.009 的老毛病
 *   ——豆娘窄翅上那根 0.009 曾经比翅柄还粗。
 * - 纵脉路径用「弦向坐标 c∈[0,1]（0=前缘、1=后缘）」参数化后再映射
 *   到轮廓：无论调用方传什么轮廓，脉都天然落在翅膜之内，不需要事后
 *   裁剪，也不可能算出 NaN。
 * - 横脉的疏密梯度与微扰全部走确定性哈希（无 Math.random）：同参数
 *   两次构建逐顶点一致，longtails.test.ts 对 dobsonfly 的确定性断言
 *   连带钉住了这里。
 * - 单翅面数闸门 MAX_WING_TRIANGLES=6000：纵脉与翅痣先扣预算，横脉
 *   在剩余额度内等比缩减——参数怎么拉都超不了。
 * - 退化输入（翅长/翅宽非正或非有限、材质缺失）返回 null 而不抛；
 *   其余参数非法时钳制到安全档。node 无 Canvas 与本模块无关（纯几何）。
 */
import * as THREE from 'three'
import { loft, type Section } from './kit'

export interface VenationSpec {
  /** 翅长，沿 +X。非正或非有限 → 返回 null */
  length: number
  /** 最宽处全宽。非正或非有限 → 返回 null */
  width: number
  /**
   * 轮廓控制点，格式同 kit.WingSpec.outline：x 沿翅长 0~1，y 为该处
   * 半宽 0~1（前缘侧；后缘按 TRAILING_NARROW 收窄）。缺省用 kit 的
   * 通用卵圆轮廓。非法点会被剔除，剩不足 2 点则整体退回缺省。
   */
  outline?: [number, number][]
  /** 纵脉数（含前缘脉），默认 7，钳制 2~24 */
  longitudinal?: number
  /** 横脉密度：一对相邻纵脉横贯全翅长时的搭桥数基准，默认 6，钳制 0~40 */
  crossDensity?: number
  /**
   * 脉粗：纵脉基部半径 = width × veinScale（**相对翅宽的比例**），
   * 默认 0.012，钳制 0.002~0.05。前缘脉再 ×1.6，横脉 ×0.5。
   */
  veinScale?: number
  /** 翅脉材质（虹彩为零的那份由物种文件负责——b4 的防泄漏断言盯着它） */
  material: THREE.Material
  /** 前缘近翅尖的翅痣。默认关；物种文件已自带翅痣（如 dragonfly.ts）时别开 */
  pterostigma?: boolean
  /** 翅痣材质，缺省复用 material */
  pterostigmaMaterial?: THREE.Material
  /** 每根脉 mesh 的 name，默认 'vein'（damselfly 传 'wingVein' 以配合既有测试） */
  name?: string
  /** 脉心相对翅面的抬升，默认 0.0011（与既有物种文件的手写翅脉一致） */
  lift?: number
}

// ---------------------------------------------------------------- 常量

/** 后缘相对前缘的收窄系数，必须与 kit.wingGeometry() 内联值一致 */
const TRAILING_NARROW = 0.72
/** 单翅翅脉总面数闸门 */
const MAX_WING_TRIANGLES = 6000
/** 纵脉采样段数 / 圆柱径向分段（照 kit.wingVeins 的档位） */
const LONG_STEPS = 12
const LONG_RADIAL = 6
const CROSS_RADIAL = 5
/** loft(n 截面, m 径向, 封口) 的面数 = (n-1)·m·2 + 2·m */
const LONG_TRIS = LONG_STEPS * LONG_RADIAL * 2 + LONG_RADIAL * 2
const CROSS_TRIS = 1 * CROSS_RADIAL * 2 + CROSS_RADIAL * 2
const STIGMA_TRIS = 12
/**
 * 横脉沿翅长的分布指数（<1 = 向翅尖聚集）。0.6 时翅尖半段的横脉数
 * 约为翅基半段的 1.7 倍——「基部大格、端部小格」的梯度旋钮。
 */
const CROSS_TIP_BIAS = 0.6
/** 纵脉相对翅缘的内缩比例，脉贴缘走但不探出翅膜 */
const MARGIN_INSET = 0.94
/** 缺省轮廓 = kit.wingGeometry() 的通用膜翅卵圆 */
const DEFAULT_OUTLINE: [number, number][] = [
  [0, 0.18],
  [0.12, 0.6],
  [0.3, 0.92],
  [0.55, 1.0],
  [0.78, 0.82],
  [0.92, 0.5],
  [1, 0.12],
]

// ---------------------------------------------------------------- 小工具

/** 确定性 0~1 哈希（无 Math.random——dobsonfly 的「两次构建一致」测试连带钉住这里） */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function clampInt(v: number | undefined, fallback: number, lo: number, hi: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(hi, Math.max(lo, Math.round(v)))
}

function clampNum(v: number | undefined, fallback: number, lo: number, hi: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(hi, Math.max(lo, v))
}

/** 剔除非法控制点并按 x 排序；剩不足 2 点退回缺省轮廓 */
function sanitizeOutline(outline?: [number, number][]): [number, number][] {
  if (!outline) return DEFAULT_OUTLINE
  const ok = outline.filter(
    (p) => Array.isArray(p) && p.length === 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] >= 0,
  )
  if (ok.length < 2) return DEFAULT_OUTLINE
  return [...ok].sort((a, b) => a[0] - b[0])
}

/** 轮廓在弦长比例 xf 处的半宽（分前/后缘），线性插值、端点外取端值 */
function halfWidthAt(outline: [number, number][], width: number, xf: number, side: 'lead' | 'trail'): number {
  const x = Math.min(1, Math.max(0, xf))
  let y = outline[0][1]
  if (x >= outline[outline.length - 1][0]) {
    y = outline[outline.length - 1][1]
  } else {
    for (let i = 0; i < outline.length - 1; i++) {
      const [x0, y0] = outline[i]
      const [x1, y1] = outline[i + 1]
      if (x >= x0 && x <= x1) {
        const t = x1 - x0 > 1e-9 ? (x - x0) / (x1 - x0) : 0
        y = THREE.MathUtils.lerp(y0, y1, t)
        break
      }
    }
  }
  return y * width * 0.5 * (side === 'trail' ? TRAILING_NARROW : 1)
}

/** 一条纵脉的采样折线（xs 严格沿 +X 递增），供横脉搭桥时按 x 反查 z */
interface VeinPath {
  xs: number[]
  zs: number[]
  rBase: number
}

function veinZAt(p: VeinPath, x: number): number | null {
  const xs = p.xs
  if (x < xs[0] || x > xs[xs.length - 1]) return null
  for (let k = 0; k < xs.length - 1; k++) {
    if (x <= xs[k + 1]) {
      const dx = xs[k + 1] - xs[k]
      const t = dx > 1e-9 ? (x - xs[k]) / dx : 0
      return THREE.MathUtils.lerp(p.zs[k], p.zs[k + 1], t)
    }
  }
  return p.zs[xs.length - 1]
}

// ---------------------------------------------------------------- 主体

/**
 * 生成一片翅的翅脉网（纵脉扇 + 渐密横脉 + 可选翅痣），返回可直接 add
 * 进翅 blade 分组的 Group。退化输入返回 null。
 *
 * mesh 约定：每根脉 name = spec.name（默认 'vein'）；翅痣 name =
 * 'pterostigma'。userData.venationRole ∈ 'longitudinal'|'cross'|
 * 'pterostigma'，纵脉另带 userData.veinIndex（0 = 前缘脉），横脉带
 * userData.pairIndex——形态测试按这些量「用户看得见的量」，不复述参数。
 */
export function venation(spec: VenationSpec): THREE.Group | null {
  if (!spec || !Number.isFinite(spec.length) || spec.length <= 0) return null
  if (!Number.isFinite(spec.width) || spec.width <= 0) return null
  if (!spec.material) return null

  const L = spec.length
  const W = spec.width
  const outline = sanitizeOutline(spec.outline)
  const N = clampInt(spec.longitudinal, 7, 2, 24)
  const density = clampNum(spec.crossDensity, 6, 0, 40)
  const veinScale = clampNum(spec.veinScale, 0.012, 0.002, 0.05)
  const lift = clampNum(spec.lift, 0.0011, 0, W)
  const name = spec.name ?? 'vein'
  const rUnit = W * veinScale
  const hwLead = (xf: number) => halfWidthAt(outline, W, xf, 'lead')
  const hwTrail = (xf: number) => halfWidthAt(outline, W, xf, 'trail')

  const g = new THREE.Group()

  // ---- 纵脉路径。前缘脉贴前缘走；其余从翅基的集束点呈扇形散开，
  // 弦向坐标 c(s) = cStart + (cEnd−cStart)·s^γ：γ 随扇位后移而减小
  // （后面的脉离基后更快离散 = 更弯），端点全部落在翅缘一圈上——
  // 端点弦位 cEnd 从近前缘一路排到近后缘，端点弦长 xe 以「翅尖靠前」
  // （峰值 0.38）为峰、向后缘方向递减（后方的脉更短，先碰到后缘）。
  const paths: VeinPath[] = []
  {
    const xs: number[] = []
    const zs: number[] = []
    for (let k = 0; k <= LONG_STEPS; k++) {
      const s = k / LONG_STEPS
      const xf = 0.02 + (0.985 - 0.02) * s
      xs.push(xf * L)
      zs.push(hwLead(xf) * MARGIN_INSET)
    }
    paths.push({ xs, zs, rBase: rUnit * 1.6 })
  }
  for (let i = 1; i < N; i++) {
    const fi = i / (N - 1)
    // 端点弦位：前段脉终止在近前缘/翅尖（那里前后缘已收拢，落点即翅缘）；
    // 后段脉（fi>0.45）额外向后缘拉满到 0.97——脉的末端必须落在翅缘上，
    // 否则后缘会留出一条「脉悬空、膜空白」的带（目视自检抓出来的问题）
    const cEnd = Math.min(0.97, 0.08 + 0.89 * fi + Math.max(0, fi - 0.45) * 1.6)
    const cStart = 0.22
    const gamma = 0.85 - 0.3 * fi
    const d = Math.abs(fi - 0.38) / 0.62
    const xeFrac = 0.985 - 0.485 * Math.pow(d, 1.35)
    const xs: number[] = []
    const zs: number[] = []
    for (let k = 0; k <= LONG_STEPS; k++) {
      const s = k / LONG_STEPS
      const xf = 0.025 + (xeFrac - 0.025) * s
      const c = cStart + (cEnd - cStart) * Math.pow(s, gamma)
      xs.push(xf * L)
      zs.push(THREE.MathUtils.lerp(hwLead(xf) * MARGIN_INSET, -hwTrail(xf) * MARGIN_INSET, c))
    }
    paths.push({ xs, zs, rBase: rUnit * (1 - 0.45 * fi) })
  }

  for (let i = 0; i < paths.length; i++) {
    const p = paths[i]
    const sections: Section[] = []
    for (let k = 0; k < p.xs.length; k++) {
      const s = k / (p.xs.length - 1)
      const r = Math.max(p.rBase * (1 - 0.62 * s), rUnit * 0.16, 1e-4)
      sections.push({ at: new THREE.Vector3(p.xs[k], lift, p.zs[k]), ry: r, rz: r })
    }
    const mesh = new THREE.Mesh(loft(sections, LONG_RADIAL), spec.material)
    mesh.name = name
    mesh.userData.venationRole = 'longitudinal'
    mesh.userData.veinIndex = i
    g.add(mesh)
  }

  // ---- 横脉排期：每对相邻纵脉在共同覆盖的 x 区间内按 density 配额，
  // 位置按 u^CROSS_TIP_BIAS 向翅尖聚集。先算总量，超预算等比缩减。
  interface BridgePlan {
    pair: number
    count: number
    xA: number
    xB: number
  }
  const plans: BridgePlan[] = []
  if (density > 0) {
    for (let i = 0; i < paths.length - 1; i++) {
      const a = paths[i]
      const b = paths[i + 1]
      const pad = 0.04 * L
      const xA = Math.max(a.xs[0], b.xs[0]) + pad
      const xB = Math.min(a.xs[a.xs.length - 1], b.xs[b.xs.length - 1]) - pad
      if (xB - xA < 0.03 * L) continue
      plans.push({ pair: i, count: Math.max(1, Math.round((density * (xB - xA)) / L)), xA, xB })
    }
  }
  const budget = MAX_WING_TRIANGLES - paths.length * LONG_TRIS - (spec.pterostigma ? STIGMA_TRIS : 0)
  const maxBridges = Math.max(0, Math.floor(budget / CROSS_TRIS))
  const planned = plans.reduce((sum, p) => sum + p.count, 0)
  if (planned > maxBridges && planned > 0) {
    const f = maxBridges / planned
    for (const p of plans) p.count = Math.floor(p.count * f)
  }

  const rCross = Math.max(rUnit * 0.5, 1e-4)
  for (const plan of plans) {
    const a = paths[plan.pair]
    const b = paths[plan.pair + 1]
    const gap = (plan.xB - plan.xA) / (plan.count + 1)
    for (let k = 0; k < plan.count; k++) {
      const u = Math.pow((k + 1) / (plan.count + 1), CROSS_TIP_BIAS)
      const jitter = (hash01(plan.pair * 53 + k * 17 + 1) - 0.5) * gap * 0.5
      const x = THREE.MathUtils.clamp(plan.xA + (plan.xB - plan.xA) * u + jitter, plan.xA, plan.xB)
      // 近垂直：对侧落点只带极小的确定性 x 偏斜，破掉机械的正交网格感
      const skew = (hash01(plan.pair * 29 + k * 41 + 7) - 0.5) * gap * 0.3
      const x2 = THREE.MathUtils.clamp(x + skew, b.xs[0], b.xs[b.xs.length - 1])
      const zA = veinZAt(a, x)
      const zB = veinZAt(b, x2)
      if (zA === null || zB === null) continue
      // 纵脉几乎贴在一起的区段（如豆娘翅柄的集束段）不搭桥，桥会退化成疙瘩
      if (Math.hypot(x2 - x, zB - zA) < rCross * 3) continue
      const mesh = new THREE.Mesh(
        loft(
          [
            { at: new THREE.Vector3(x, lift, zA), ry: rCross, rz: rCross },
            { at: new THREE.Vector3(x2, lift, zB), ry: rCross, rz: rCross },
          ],
          CROSS_RADIAL,
        ),
        spec.material,
      )
      mesh.name = name
      mesh.userData.venationRole = 'cross'
      mesh.userData.pairIndex = plan.pair
      g.add(mesh)
    }
  }

  // ---- 翅痣：前缘近翅尖的一小枚扁片，尺寸全部相对翅长/翅宽
  if (spec.pterostigma) {
    const xf = 0.875
    const hw = hwLead(xf)
    const stigma = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(L * 0.045, 1e-3), Math.max(W * 0.012, lift * 3, 1e-4), Math.max(hw * 0.34, 1e-4)),
      spec.pterostigmaMaterial ?? spec.material,
    )
    stigma.position.set(L * xf, lift, hw * 0.72)
    stigma.name = 'pterostigma'
    stigma.userData.venationRole = 'pterostigma'
    g.add(stigma)
  }

  return g
}
