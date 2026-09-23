/**
 * 玉带凤蝶 · 幼虫 Papilio polytes（生活史第 2 阶段，取末龄 5 龄）
 *
 * 单位与坐标系与成虫（../swallowtail.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * 形态依据（Butterfly Circle 饲养记录 + 通行图鉴描述）：
 * - **体长 4.5 厘米上下**（5 龄可达 45~46 mm），**光滑的嫩绿色**。低龄是黑白相间的
 *   「鸟粪拟态」，到 5 龄才换成这身绿 —— 本文件只做末龄，一个阶段只放一个模型。
 * - **胸部膨大**：中后胸（T2~T3）鼓起、比腹部粗一圈，前胸收窄、头壳缩在前胸之下，
 *   从背面看是一个圆钝的「蛇头」。
 * - **招牌 = 后胸（T3）背侧的一对假眼**：黑瞳孔 + 浅色虹圈 + 黑色外缘，瞳孔里一点白色
 *   反光。两眼之间由一道横贯背面的深色波状细纹相连。胸部膨大 + 一对眼 = 一条小蛇的头，
 *   这是凤蝶幼虫吓退小鸟的拟态，也是它一眼要认出来的东西。
 * - **T3 与 A1 之间一条横带**：深褐色、边缘呈波状，带里夹着几块浅紫蓝色斑
 *   （原文 "pale purplish bluish gaps between the sinuous markings"）。
 * - **腹部两对斜带**：第一对自 A3 基部斜向上后方走到 A4 背面，第二对短，在 A5 两侧。
 *   黑白两色（白芯黑边）。
 * - **臭角（osmeterium）**：前胸背面一对可翻出的 Y 形肉质腺体，玉带凤蝶是**深红/橙红色**。
 *   平时缩在体内，受惊才翻出并散发臭味 —— 这是凤蝶科独有的器官，本模型做成翻出状，
 *   作为第二招牌。锚点单独命名 `osmeterium`。
 * - **头壳小、黄褐色**，缩在前胸下方（「蛇头」上那对「眼」根本不是头）。
 * - 附肢照鳞翅目幼虫的通例：3 对分节胸足、A3~A6 4 对肉质腹足、A10 1 对尾足；
 *   体侧 9 对气门（T1 与 A1~A8）。
 *
 * ## 为什么体壁不用 loft 而自己拉参数曲面
 *
 * 帝王蝶幼虫的三色**横环**能靠「沿体轴切成一段段环、逐段上色」（bandRing）做出来，
 * 因为它的色块只随体轴位置变。这只虫的招牌是**二维的**色块 —— 眼斑是体壁上的一个
 * 圆、斜带是斜着走的一条 —— 同时随体轴位置 u 与绕体方位角 θ 变，环切不出来。
 *
 * 所以把 bandRing 的思路推广一维：体壁按 (u, θ) 拉一张参数曲面，每块图案的边界写成
 * 一个标量场的零等值线，网格沿这些曲线切开，再按色区分进各自的网格（各配一个材质）。
 * 所有色区是同一张曲面切下来的 —— 色块是**体壁本身的颜色区**，不凸出一丝一毫
 * （瓢虫幼虫的斑点做成凸出的实体，渲出来是一圈「塑料环」；这里从根上排除了那个可能）。
 * 细节与三条保证见 patternedSkin()。
 */
import * as THREE from 'three'
import { chitin, finalize, legPair, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体轴与体型

/** 体躯（前胸前缘）X */
const BODY_FRONT_X = 2.1
/** 体躯末端 X */
const BODY_REAR_X = -2.3
const BODY_LEN = BODY_FRONT_X - BODY_REAR_X
/** 3 胸节 + 10 腹节 */
const SEGMENTS = 13

/**
 * 基础网格密度：只需表达体形（节间缢缩每节约 17 行）；图案边界另沿曲线精确切开，
 * 不靠加密网格（见 patternedSkin）
 */
const ROWS = 220
const COLS = 96

/**
 * 体轴：u=0 在前胸前缘、u=1 在尾端。胸部略昂起（静息时凤蝶幼虫的胸部是抬着的，
 * 「蛇头」才冲着来者），腹部平贴枝叶。
 */
function axis(u: number): THREE.Vector3 {
  const x = THREE.MathUtils.lerp(BODY_FRONT_X, BODY_REAR_X, u)
  const y = 0.1 * Math.sin(Math.PI * u) + 0.2 * Math.pow(Math.max(1 - u * 2.2, 0), 2)
  return new THREE.Vector3(x, y, 0)
}

/**
 * 半宽包络（控制点 [u, 半径]）：前胸收窄 → 中后胸膨大到最粗 → 腹部略细且近等粗 → 尾端收。
 * 胸部最宽处 0.5（体宽 1 厘米）、腹部 0.38 —— 胸比腹粗约三成，从背面看才是「头大」的蛇形。
 */
const GIRTH_POINTS: readonly [number, number][] = [
  [0.0, 0.3],
  [0.05, 0.37],
  [0.1, 0.45],
  [0.16, 0.52],
  [0.21, 0.52],
  [0.27, 0.44],
  [0.34, 0.395],
  [0.5, 0.38],
  [0.7, 0.37],
  [0.84, 0.31],
  [0.94, 0.22],
  [1.0, 0.16],
]
const GIRTH_CURVE = new THREE.SplineCurve(GIRTH_POINTS.map(([u, r]) => new THREE.Vector2(u, r)))
const GIRTH_TABLE = Array.from({ length: 201 }, (_, i) => GIRTH_CURVE.getPoint(i / 200))

function envelope(u: number): number {
  const t = GIRTH_TABLE
  for (let i = 0; i < t.length - 1; i++) {
    if (u <= t[i + 1].x) {
      const k = (u - t[i].x) / Math.max(t[i + 1].x - t[i].x, 1e-6)
      return THREE.MathUtils.lerp(t[i].y, t[i + 1].y, THREE.MathUtils.clamp(k, 0, 1))
    }
  }
  return t[t.length - 1].y
}

/**
 * 半宽 = 包络 × 节间浅缢缩 × 两端圆封口。
 * 前端封口比尾端长：前胸前缘是一个圆顶，头壳从它下面探出来；尾端是钝圆。
 */
function girth(u: number): number {
  const local = (u * SEGMENTS) % 1
  const ripple = 1 - 0.045 * Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
  const xf = THREE.MathUtils.clamp((0.035 - u) / 0.035, 0, 1)
  const xr = THREE.MathUtils.clamp((u - 0.94) / 0.06, 0, 1)
  const cap = Math.sqrt(Math.max(1 - xf * xf, 0)) * Math.sqrt(Math.max(1 - xr * xr, 0))
  return Math.max(envelope(u) * ripple * cap, 1e-4)
}

/** 背面半高：胸部拱得更高（膨大主要是向背面鼓），腹面压平 */
function heightUp(u: number): number {
  return girth(u) * (1.02 + 0.16 * Math.exp(-(((u - 0.18) / 0.09) ** 2)))
}
function heightDown(u: number): number {
  return girth(u) * 0.8
}

/** 体壁上 (u, θ) 处的点。θ=0 在背中线、θ=+90° 在右侧（+Z）、θ=±180° 在腹中线 */
function surfacePoint(u: number, theta: number, out = new THREE.Vector3()): THREE.Vector3 {
  const a = axis(u)
  const c = Math.cos(theta)
  const ry = c >= 0 ? heightUp(u) : heightDown(u)
  return out.set(a.x, a.y + c * ry, girth(u) * Math.sin(theta))
}

// ---------------------------------------------------------------- 色区

type Zone =
  | 'body'
  | 'eyespot-pupil'
  | 'eyespot-glint'
  | 'eyespot-iris'
  | 'eyespot-rim'
  | 'eyespot-bridge'
  | 'saddle-band'
  | 'saddle-spot'
  | 'oblique-bar'
  | 'oblique-edge'
  | 'spiracle'

const deg = THREE.MathUtils.degToRad

/** 眼斑中心：T3 前半（第 2.15 节），背侧 ±50° */
const EYE_U = 2.15 / SEGMENTS
const EYE_THETA = deg(50)
/** 眼斑外缘 / 虹圈 / 瞳孔的半径（厘米，体表弧长度量）。沿体轴略长：真实眼斑是竖卵形 */
const EYE_RIM = 0.19
const EYE_IRIS = 0.155
const EYE_PUPIL = 0.095
const EYE_ELONG = 1.12
/** 反光点半径 */
const EYE_GLINT = 0.03
/** 横带：T3/A1 交界之后（第 3.15 节），半宽（沿体轴）0.08 厘米，向下到 ±106° */
const SADDLE_U = 3.15 / SEGMENTS
const SADDLE_HALF = 0.085
const SADDLE_THETA = deg(106)

/**
 * 斜带：两对，端点以 [节位, 方位角(度)] 给。
 * 第一对自 A3 基部（节位 5.1，体侧下方 118°）斜向上后方到 A4 顶（节位 6.9，背侧 20°）；
 * 第二对短，在 A5 两侧（节位 7.2 → 7.9，115° → 62°）。
 */
const OBLIQUE_BARS: readonly { from: [number, number]; to: [number, number] }[] = [
  { from: [5.1, 118], to: [6.9, 20] },
  { from: [7.2, 115], to: [7.95, 62] },
]
const BAR_CORE = 0.052
const BAR_EDGE = 0.082

/** T1 与 A1~A8 各一对气门的节位 */
const SPIRACLE_SEGS = [0.55, 3.55, 4.55, 5.55, 6.55, 7.55, 8.55, 9.55, 10.55]
const SPIRACLE_THETA = deg(100)

/** 体表两点间的近似弧长：沿体轴的距离与绕体的弧长合成（局部把体壁摊平来量） */
function surfaceDelta(u: number, theta: number, u0: number, theta0: number): [number, number] {
  const ds = (u - u0) * BODY_LEN
  const r = girth((u + u0) / 2) * 1.05
  return [ds, (theta - theta0) * r]
}

/** 点到线段的距离（2D） */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const vx = bx - ax
  const vy = by - ay
  const t = THREE.MathUtils.clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy), 0, 1)
  return Math.hypot(px - ax - t * vx, py - ay - t * vy)
}

// ---- 各块图案的标量场：< 0 在图案里、> 0 在外。色区判定与网格裁切共用这同一批函数，
// 两处因此不可能对不上（一处改了阈值、另一处没改，边界就会切在色块中间）。

/** 眼斑的「半径」：竖卵形的归一化距离（厘米） */
function eyeDist(u: number, at: number): number {
  const [es, ea] = surfaceDelta(u, at, EYE_U, EYE_THETA)
  return Math.hypot(es / EYE_ELONG, ea)
}
/** 瞳孔里偏前上方的反光点 */
function glintDist(u: number, at: number): number {
  const [gs, ga] = surfaceDelta(u, at, EYE_U - 0.05 / BODY_LEN, EYE_THETA - deg(5))
  return Math.hypot(gs, ga)
}
/**
 * 两眼之间的波状细纹，只在两眼之间（|θ| < EYE_THETA）。
 *
 * 「只在某范围里」一律用 max() 并进场里，而不是在判定时另加一个 if：
 * 裁切网格靠的是场的零等值线，场在范围外若仍过零，范围边上的三角形会各切各的，
 * 相邻两块对同一条边一个切了一个没切，就是一道 T 形裂缝。
 */
function bridgeField(u: number, at: number): number {
  const [bs] = surfaceDelta(u, at, EYE_U, 0)
  return Math.max(Math.abs(bs - 0.035 * Math.sin(at * 9)) - 0.02, (at - EYE_THETA) * 0.5)
}
function spiracleField(u: number, at: number): number {
  let m = Infinity
  for (const seg of SPIRACLE_SEGS) {
    const [ss, sa] = surfaceDelta(u, at, seg / SEGMENTS, SPIRACLE_THETA)
    m = Math.min(m, Math.hypot(ss / 0.028, sa / 0.045) - 1)
  }
  return m
}
/** 横带：沿体轴的半宽随方位角起伏（波状边缘），向下止于 ±SADDLE_THETA */
function saddleField(u: number, at: number): number {
  const [bs] = surfaceDelta(u, at, SADDLE_U, 0)
  return Math.max(Math.abs(bs) - SADDLE_HALF * (1 + 0.28 * Math.sin(at * 7 + 0.6)), (at - SADDLE_THETA) * 0.4)
}
const SADDLE_SPOTS = [14, 42, 70, 95].map(deg)
function saddleSpotField(u: number, at: number): number {
  let m = Infinity
  for (const t of SADDLE_SPOTS) {
    const [ps, pa] = surfaceDelta(u, at, SADDLE_U, t)
    m = Math.min(m, Math.hypot(ps, pa) - 0.05)
  }
  return m
}
/** 到最近一条斜带中线的距离 */
function barDist(u: number, at: number): number {
  let m = Infinity
  for (const bar of OBLIQUE_BARS) {
    const [ax, ay] = surfaceDelta(bar.from[0] / SEGMENTS, deg(bar.from[1]), u, 0)
    const [bx, by] = surfaceDelta(bar.to[0] / SEGMENTS, deg(bar.to[1]), u, 0)
    const [px, py] = surfaceDelta(u, at, u, 0)
    m = Math.min(m, segDist(px, py, ax, ay, bx, by))
  }
  return m
}

/**
 * (u, θ) 处的体壁属于哪块色区。按优先级自上而下判：眼斑 > 细纹 > 气门 > 横带 > 斜带 > 底色。
 * 左右对称的图案一律拿 |θ| 判，保证两侧是镜像。
 */
function zoneAt(u: number, theta: number): Zone {
  const at = Math.abs(theta)
  const e = eyeDist(u, at)
  if (e < EYE_RIM) {
    // 有了这一点反光，一块黑斑才读成「一只在看你的眼睛」
    if (glintDist(u, at) < EYE_GLINT) return 'eyespot-glint'
    if (e < EYE_PUPIL) return 'eyespot-pupil'
    if (e < EYE_IRIS) return 'eyespot-iris'
    return 'eyespot-rim'
  }
  if (bridgeField(u, at) < 0) return 'eyespot-bridge'
  if (spiracleField(u, at) < 0) return 'spiracle'
  if (saddleField(u, at) < 0) {
    return saddleSpotField(u, at) < 0 ? 'saddle-spot' : 'saddle-band'
  }
  const b = barDist(u, at)
  if (b < BAR_CORE) return 'oblique-bar'
  if (b < BAR_EDGE) return 'oblique-edge'
  return 'body'
}

/**
 * 裁切网格用的全部边界：场 + 该场可能过零的 (u, |θ|) 范围（范围外不必试切，省三角形）。
 * 范围必须把零等值线整个包住、再留出至少一格的余量 —— 否则见 bridgeField 的注释。
 */
const EYE_BOX: [number, number, number, number] = [EYE_U - 0.08, EYE_U + 0.08, 0, deg(110)]
const SADDLE_BOX: [number, number, number, number] = [SADDLE_U - 0.06, SADDLE_U + 0.06, 0, SADDLE_THETA + deg(12)]
const BAR_BOX: [number, number, number, number] = [4.6 / SEGMENTS, 8.5 / SEGMENTS, 0, deg(150)]
const FIELDS: SkinField[] = [
  { f: (u, a) => eyeDist(u, a) - EYE_RIM, box: EYE_BOX },
  { f: (u, a) => eyeDist(u, a) - EYE_IRIS, box: EYE_BOX },
  { f: (u, a) => eyeDist(u, a) - EYE_PUPIL, box: EYE_BOX },
  { f: (u, a) => glintDist(u, a) - EYE_GLINT, box: EYE_BOX },
  { f: bridgeField, box: [EYE_U - 0.04, EYE_U + 0.04, 0, EYE_THETA + deg(10)] },
  { f: spiracleField, box: [0, 1, deg(70), deg(130)] },
  { f: saddleField, box: SADDLE_BOX },
  { f: saddleSpotField, box: SADDLE_BOX },
  { f: (u, a) => barDist(u, a) - BAR_CORE, box: BAR_BOX },
  { f: (u, a) => barDist(u, a) - BAR_EDGE, box: BAR_BOX },
]

// ---------------------------------------------------------------- 带图案的体壁

interface SkinField {
  /** 标量场，零等值线就是色区边界 */
  f: (u: number, absTheta: number) => number
  /** [u0, u1, |θ|0, |θ|1]：场只可能在这个范围里过零 */
  box: [number, number, number, number]
}

type P2 = { u: number; t: number }

/**
 * 体壁：一张 (u, θ) 参数网格，**沿每块图案的边界曲线把三角形切开**，再按色区分成若干网格。
 *
 * 第一版只按三角形中心判色区，边界是一格一格的台阶 —— 目视验收里眼斑外缘一圈锯齿、
 * 斜带像一条拉链。加密网格只能把台阶变小，三角形数却平方地涨。这里换成在参数域里
 * 做「行进三角形」：每个跨过某条边界（标量场过零）的三角形，都在过零处切成两块，
 * 切点用二分法在真实的场上求到 2⁻²⁰ 精度。于是边界是**光滑的曲线**，
 * 基础网格只需密到能表达体形即可。
 *
 * 三条保证：
 * - **不开裂**：相邻两个三角形共享的那条边，切点按「端点排好序再二分」求，
 *   两边算出的是逐位相同的同一个点。
 * - **光照连续**：所有顶点的位置与法线都由同一个 point(u, θ) 解析地求（法线取两个偏导
 *   的叉积），不靠网格拓扑 —— 色块边界两侧的法线天然一致，读不出「贴纸」。
 * - **不凸出**：色块就是体壁本身被切下来的那几块，与四周是同一张曲面。
 *
 * θ 自 −π 走到 +π，接缝落在腹中线 —— 那里贴着叶面，看不见。
 *
 * 为什么蛹那边另有一份逐行相同的：`builders/stages/` 下每个文件都会被 stages.ts 的
 * glob 当成阶段模块登记，放一个只有工具函数的文件进去会污染注册表（firefly-pupa.ts
 * 里写过同样的取舍）。
 */
function patternedSkin(
  rows: number,
  cols: number,
  point: (u: number, theta: number, out?: THREE.Vector3) => THREE.Vector3,
  fields: SkinField[],
  zone: (u: number, theta: number) => Zone,
  materials: Record<Zone, THREE.Material>,
): THREE.Mesh[] {
  const grid = (i: number, j: number): P2 => ({ u: i / rows, t: -Math.PI + (j / cols) * Math.PI * 2 })
  let tris: [P2, P2, P2][] = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const a = grid(i, j)
      const b = grid(i, j + 1)
      const c = grid(i + 1, j)
      const d = grid(i + 1, j + 1)
      // 绕向取法线朝外的那一种（u 向尾、θ 向右，∂u × ∂θ 指向体外）
      tris.push([a, c, b], [b, c, d])
    }
  }

  for (const field of fields) {
    const [u0, u1, a0, a1] = field.box
    const cut = (p: P2, q: P2): P2 => {
      if (p.u > q.u || (p.u === q.u && p.t > q.t)) [p, q] = [q, p]
      const neg = field.f(p.u, Math.abs(p.t)) < 0
      let lo = 0
      let hi = 1
      for (let k = 0; k < 20; k++) {
        const m = (lo + hi) / 2
        const inside = field.f(p.u + (q.u - p.u) * m, Math.abs(p.t + (q.t - p.t) * m)) < 0
        if (inside === neg) lo = m
        else hi = m
      }
      const s = (lo + hi) / 2
      return { u: p.u + (q.u - p.u) * s, t: p.t + (q.t - p.t) * s }
    }
    const next: [P2, P2, P2][] = []
    for (const tri of tris) {
      const inBox = tri.some((p) => p.u >= u0 && p.u <= u1 && Math.abs(p.t) >= a0 && Math.abs(p.t) <= a1)
      const sides = inBox ? tri.map((p) => field.f(p.u, Math.abs(p.t)) < 0) : null
      if (!sides || (sides[0] === sides[1] && sides[1] === sides[2])) {
        next.push(tri)
        continue
      }
      // Sutherland–Hodgman：沿原绕向走一圈，分别收集场内、场外两个多边形（绕向保持不变）
      const polys: [P2[], P2[]] = [[], []]
      for (let k = 0; k < 3; k++) {
        const p = tri[k]
        const q = tri[(k + 1) % 3]
        polys[sides[k] ? 0 : 1].push(p)
        if (sides[k] !== sides[(k + 1) % 3]) {
          const x = cut(p, q)
          polys[0].push(x)
          polys[1].push(x)
        }
      }
      for (const poly of polys) {
        for (let k = 1; k + 1 < poly.length; k++) next.push([poly[0], poly[k], poly[k + 1]])
      }
    }
    tris = next
  }

  // 顶点位置与解析法线，按 (u, θ) 缓存：同一个参数点只求一次
  const cache = new Map<string, [THREE.Vector3, THREE.Vector3]>()
  const eps = 1e-4
  const pa = new THREE.Vector3()
  const pb = new THREE.Vector3()
  const du = new THREE.Vector3()
  const dt = new THREE.Vector3()
  const vertex = (p: P2): [THREE.Vector3, THREE.Vector3] => {
    const key = `${p.u},${p.t}`
    const hit = cache.get(key)
    if (hit) return hit
    const pos = point(p.u, p.t, new THREE.Vector3())
    // 两极处 ∂θ 退化为零：法线改在紧挨着的一圈上求（近似沿体轴，封口处本就如此）
    const uc = THREE.MathUtils.clamp(p.u, 0.003, 0.997)
    du.subVectors(point(uc + eps, p.t, pa), point(uc - eps, p.t, pb))
    dt.subVectors(point(uc, p.t + eps, pa), point(uc, p.t - eps, pb))
    const out: [THREE.Vector3, THREE.Vector3] = [pos, new THREE.Vector3().crossVectors(du, dt).normalize()]
    cache.set(key, out)
    return out
  }

  const buckets = new Map<Zone, { pos: number[]; nrm: number[] }>()
  for (const tri of tris) {
    const z = zone((tri[0].u + tri[1].u + tri[2].u) / 3, (tri[0].t + tri[1].t + tri[2].t) / 3)
    let b = buckets.get(z)
    if (!b) {
      b = { pos: [], nrm: [] }
      buckets.set(z, b)
    }
    for (const p of tri) {
      const [v, n] = vertex(p)
      b.pos.push(v.x, v.y, v.z)
      b.nrm.push(n.x, n.y, n.z)
    }
  }

  const meshes: THREE.Mesh[] = []
  for (const [z, b] of buckets) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3))
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm, 3))
    const mesh = new THREE.Mesh(geo, materials[z])
    mesh.name = z
    meshes.push(mesh)
  }
  return meshes
}

// ---------------------------------------------------------------- 附属结构

/**
 * 腹足 / 尾足：无节的肉质短柱，末端一圈趾钩。与帝王蝶幼虫同一套做法 ——
 * 胸足是分节尖细的真足，腹足是体壁的肉质外突，两者画成一样就讲错了。
 */
function fleshyProleg(
  u: number,
  side: 1 | -1,
  opts: { radius: number; drop: number; lean: number; name: string },
  wallMat: THREE.Material,
  soleMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const a = axis(u)
  const z0 = side * girth(u) * 0.55
  const y0 = a.y - heightDown(u) * 0.7
  const r = opts.radius
  const profile: [number, number, number][] = [
    [0.0, 0.06, 1.0],
    [0.3, -0.05, 1.05],
    [0.6, -0.13, 1.1],
    [0.85, -0.2, 1.14],
    [1.0, -0.24, 1.16],
  ]
  const radii = [r, r * 0.94, r * 0.9, r * 0.95, r * 0.76]
  const path = profile.map(
    ([t, dy, zk]) => new THREE.Vector3(a.x - opts.lean * t, y0 + dy * (opts.drop / 0.24), z0 * zk),
  )
  const sections: Section[] = path.map((at, i) => ({ at, ry: radii[i], rz: radii[i] }))
  const wall = new THREE.Mesh(loft(sections, 14), wallMat)
  wall.name = opts.name
  g.add(wall)
  const sole = new THREE.Mesh(new THREE.TorusGeometry(r * 0.66, r * 0.14, 6, 16), soleMat)
  sole.rotation.x = Math.PI / 2
  sole.position.copy(path[path.length - 1]).add(new THREE.Vector3(0, -0.006, 0))
  sole.name = `${opts.name}-sole`
  g.add(sole)
  return g
}

/**
 * 臭角：一根短干分成两支的 Y 形肉质管，自前胸背面前缘翻出，两支向前上方张开。
 * 用贝塞尔弧：臭角是充了血淋巴的软管，弯的；直的会读成一对犄角。
 */
function osmeteriumArm(
  base: THREE.Vector3,
  ctrl: THREE.Vector3,
  tip: THREE.Vector3,
  thick: [number, number],
  material: THREE.Material,
): THREE.Mesh {
  const curve = new THREE.QuadraticBezierCurve3(base, ctrl, tip)
  const steps = 16
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // 末端圆钝收口：最后 12% 按圆弧收，不是针尖
    const tail = THREE.MathUtils.clamp((t - 0.88) / 0.12, 0, 1)
    const r = THREE.MathUtils.lerp(thick[0], thick[1], t) * Math.sqrt(Math.max(1 - tail * tail, 0.02))
    sections.push({ at: curve.getPoint(t), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'osmeterium'
  return mesh
}

// ---------------------------------------------------------------- 建模主体

export function buildSwallowtailLarva(): InsectModel {
  const g = new THREE.Group()

  /*
   * 配色。绿虫最怕糊成一团绿泥，所以每块招牌色都要与底绿拉开明度：
   * - 底绿 L≈0.47（嫩绿，hue≈100°）。ACES 会提亮，但不能再深 —— 这是「光滑的嫩绿」
   *   而不是墨绿；
   * - 瞳孔与眼缘近全黑（L≈0.07），与底绿差 0.4；虹圈是浅奶油色（L≈0.86），
   *   黑—浅—黑三层在一块小斑里明度来回跳，才读成一只「眼」而不是一个黑点；
   * - 横带深褐（L≈0.17），带里的浅紫蓝斑 L≈0.8；斜带白芯 L≈0.92、黑边 L≈0.1。
   * 测试逐对量这些明度差。
   */
  const mats: Record<Zone, THREE.Material> = {
    body: chitin({ color: '#67b43c', gloss: 0.5, clearcoat: 0.3 }),
    'eyespot-pupil': chitin({ color: '#131210', gloss: 0.55, clearcoat: 0.35 }),
    'eyespot-glint': chitin({ color: '#fbfaf2', gloss: 0.6, clearcoat: 0.35 }),
    'eyespot-iris': chitin({ color: '#f0e3b4', gloss: 0.5, clearcoat: 0.3 }),
    'eyespot-rim': chitin({ color: '#16130f', gloss: 0.5, clearcoat: 0.3 }),
    'eyespot-bridge': chitin({ color: '#2f3a1c', gloss: 0.45, clearcoat: 0.25 }),
    'saddle-band': chitin({ color: '#3e2818', gloss: 0.45, clearcoat: 0.25 }),
    'saddle-spot': chitin({ color: '#bdb6e8', gloss: 0.5, clearcoat: 0.3 }),
    'oblique-bar': chitin({ color: '#f4f1e4', gloss: 0.45, clearcoat: 0.25 }),
    'oblique-edge': chitin({ color: '#1f1a14', gloss: 0.45, clearcoat: 0.25 }),
    spiracle: chitin({ color: '#2a2016', gloss: 0.5 }),
  }
  const headMat = chitin({ color: '#a8803f', gloss: 0.5, clearcoat: 0.25 })
  const legMat = chitin({ color: '#9a7440', gloss: 0.5, clearcoat: 0.2 })
  const prolegMat = chitin({ color: '#9ccf72', gloss: 0.4, clearcoat: 0.2 })
  const crochetMat = chitin({ color: '#7a6038', gloss: 0.45 })
  const osmMat = chitin({ color: '#e0512b', gloss: 0.6, clearcoat: 0.35 })

  // ---- 体壁
  for (const m of patternedSkin(ROWS, COLS, surfacePoint, FIELDS, zoneAt, mats)) g.add(m)

  // ---- 头壳：黄褐色小圆头，缩在前胸圆顶的前下方
  const a0 = axis(0)
  const headCenter = new THREE.Vector3(a0.x - 0.05, a0.y - 0.14, 0)
  const headR = 0.14
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), headMat)
  head.scale.set(0.95, 1, 1.05)
  head.position.copy(headCenter)
  head.name = 'head-capsule'
  g.add(head)

  // ---- 臭角：自前胸背面前缘（头壳后上方）翻出，Y 形两支
  const osmBase = new THREE.Vector3(a0.x + 0.02, a0.y + heightUp(0.03) * 0.55, 0)
  const fork = osmBase.clone().add(new THREE.Vector3(0.1, 0.1, 0))
  const stalk = new THREE.Mesh(
    loft(
      [
        { at: osmBase, ry: 0.06, rz: 0.075 },
        { at: fork, ry: 0.055, rz: 0.07 },
      ],
      10,
    ),
    osmMat,
  )
  stalk.name = 'osmeterium'
  g.add(stalk)
  const osmTips: THREE.Vector3[] = []
  for (const side of [1, -1] as const) {
    const tip = fork.clone().add(new THREE.Vector3(0.36, 0.3, side * 0.34))
    osmTips.push(tip)
    g.add(
      osmeteriumArm(fork, fork.clone().add(new THREE.Vector3(0.22, 0.04, side * 0.1)), tip, [0.058, 0.04], osmMat),
    )
  }

  // ---- 3 对胸足：分节、尖细、末端成爪（kit.legPair，与成虫的足同一套骨架）
  for (const [seg, sweep] of [
    [0.5, -14],
    [1.5, 2],
    [2.5, 16],
  ] as const) {
    const u = seg / SEGMENTS
    const a = axis(u)
    g.add(
      legPair(
        {
          base: [a.x, a.y - heightDown(u) * 0.8, girth(u) * 0.4],
          femur: 0.13,
          tibia: 0.11,
          tarsus: 0.06,
          thickness: 0.034,
          splay: 38,
          sweep,
          knee: 78,
          ankle: 62,
        },
        legMat,
      ),
    )
  }

  // ---- 4 对腹足（A3~A6）+ 1 对尾足（A10）；A7~A9 空着
  for (const seg of [5.5, 6.5, 7.5, 8.5]) {
    for (const side of [1, -1] as const) {
      g.add(
        fleshyProleg(
          seg / SEGMENTS,
          side,
          { radius: 0.1, drop: 0.2, lean: 0.02, name: 'proleg' },
          prolegMat,
          crochetMat,
        ),
      )
    }
  }
  for (const side of [1, -1] as const) {
    g.add(
      fleshyProleg(
        12.3 / SEGMENTS,
        side,
        { radius: 0.09, drop: 0.18, lean: 0.12, name: 'clasper' },
        prolegMat,
        crochetMat,
      ),
    )
  }

  const eyeTheta = EYE_THETA
  const bandU = SADDLE_U
  const barU = 6.0 / SEGMENTS
  const prolegU = 6.5 / SEGMENTS
  const anchors: Record<string, THREE.Vector3> = {
    // 眼斑绝不能叫 eye —— 成虫的 eye 热点会被贴到这只「假眼」上
    eyespot: surfacePoint(EYE_U, eyeTheta),
    saddleBand: surfacePoint(bandU, 0),
    obliqueBar: surfacePoint(barU, deg(75)),
    osmeterium: osmTips[0].clone(),
    head: headCenter.clone().add(new THREE.Vector3(headR * 0.8, -headR * 0.2, 0)),
    proleg: new THREE.Vector3(axis(prolegU).x, axis(prolegU).y - heightDown(prolegU) - 0.1, 0.2),
  }

  return finalize(g, anchors)
}
