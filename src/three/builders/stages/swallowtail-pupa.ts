/**
 * 玉带凤蝶 · 蛹 Papilio polytes（生活史第 3 阶段）
 *
 * 单位与坐标系与成虫（../swallowtail.ts）完全一致：1 = 1 厘米真实体长，+Y 向上、+Z 向右。
 *
 * **体轴在这一阶段是斜立的，头朝上**，这是凤蝶真实的化蛹姿态：
 * 凤蝶科结**缢蛹**（girdled pupa）—— 末龄幼虫头朝上趴在枝条上，先吐丝垫钩住尾端的
 * **臀棘（cremaster）**，再吐一根**丝带（girdle）**绕过自己的腰背、两端固定在枝上，
 * 然后在这根「安全带」里蜕皮化蛹。蛹因此**腹面朝枝、背面朝外、斜着吊在枝上**，
 * 与帝王蝶那种只靠臀棘**头朝下倒挂**的垂蛹是完全变态里的两种挂法 ——
 * 这根丝带就是本阶段最要讲的东西，所以做得比真实略粗（0.45 毫米），
 * 保证四个机位都看得见。
 *
 * 模型里枝条竖直立在 +X 一侧；蛹的尾端钩在枝上，体轴自枝条向 −X 外倾约 28°，
 * 背面朝 −X。
 *
 * 形态依据（Butterfly Circle 饲养记录）：
 * - **蛹长 31~32 毫米**，模型蛹壳 3.0 + 臀棘 0.18。
 * - **绿色型**（另有褐色型，本模型取绿色，更好认）：底绿，背面一块大的**黄色菱形斑**。
 * - **头端一对头角（cephalic horns）**、**胸背一个隆起（dorsal thoracic hump）**，
 *   侧看有棱有角（"angled in side view"）—— 与帝王蝶那只浑圆的瓮形蛹是另一种长相。
 *   棱角用超椭圆截面做：体侧与背中线各起一道钝棱。
 * - **翅芽**在体侧前半，色略浅、外缘一道深色缝线：成虫的翅就折在这里面。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel } from '../kit'

// ---------------------------------------------------------------- 姿态与体轴

/** 蛹壳长（不含臀棘） */
const PUPA_LEN = 3.0
/** 体轴相对竖直的外倾角 */
const LEAN = THREE.MathUtils.degToRad(28)
/** 臀棘长 */
const CREMASTER_LEN = 0.18
/** 枝条半径：柑橘嫩枝直径约 3 毫米 */
const TWIG_R = 0.15

/** 头向（自臀棘指向头端）、背向、右向 —— 三者是右手系，镜像不会反 */
const H = new THREE.Vector3(-Math.sin(LEAN), Math.cos(LEAN), 0)
const D = new THREE.Vector3(-Math.cos(LEAN), -Math.sin(LEAN), 0)
const Z = new THREE.Vector3(0, 0, 1)
/** 蛹壳尾端（u=1）位置 */
const TAIL = new THREE.Vector3(0, 0, 0)
/** 臀棘末端：顺体轴再往下走一小段，扎进枝上的丝垫 */
const CREMASTER_END = TAIL.clone().addScaledVector(H, -CREMASTER_LEN)
/** 枝条中轴 X：枝面恰好抵住臀棘末端 */
const TWIG_X = CREMASTER_END.x + TWIG_R * 0.92

/** 体轴上 u 处（u=0 头端、u=1 尾端）的中心点 */
function axisPoint(u: number): THREE.Vector3 {
  return TAIL.clone().addScaledVector(H, PUPA_LEN * (1 - u))
}

// ---------------------------------------------------------------- 截面

function table(points: readonly [number, number][]): (u: number) => number {
  const curve = new THREE.SplineCurve(points.map(([u, r]) => new THREE.Vector2(u, r)))
  const t = Array.from({ length: 161 }, (_, i) => curve.getPoint(i / 160))
  return (u: number) => {
    for (let i = 0; i < t.length - 1; i++) {
      if (u <= t[i + 1].x) {
        const k = THREE.MathUtils.clamp((u - t[i].x) / Math.max(t[i + 1].x - t[i].x, 1e-6), 0, 1)
        return THREE.MathUtils.lerp(t[i].y, t[i + 1].y, k)
      }
    }
    return t[t.length - 1].y
  }
}

/**
 * 半宽：头端收窄成一个「平截的额」，翅芽一带最宽，向尾端收细。
 * 头端第一版给到 0.3，渲出来前端是一颗圆脑袋，配上头角活像一只站在枝上的绿鸟 ——
 * 凤蝶蛹的头端是窄而平截的，头角长在这块窄额的两角上。
 */
const halfWidth = table([
  [0.0, 0.13],
  [0.05, 0.2],
  [0.14, 0.34],
  [0.3, 0.46],
  [0.45, 0.46],
  [0.6, 0.4],
  [0.78, 0.28],
  [0.92, 0.15],
  [1.0, 0.08],
])

/**
 * 背面半高：胸背隆起在 u≈0.24 处拱到最高，其后下凹一段再平缓 ——
 * 侧看「隆起 → 凹 → 腹部」这一折，就是凤蝶蛹「有棱角」的那个剪影。
 */
const dorsalHeight = table([
  [0.0, 0.1],
  [0.07, 0.24],
  [0.17, 0.5],
  [0.24, 0.66],
  [0.3, 0.48],
  [0.4, 0.4],
  [0.52, 0.43],
  [0.68, 0.36],
  [0.84, 0.23],
  [1.0, 0.08],
])

/** 腹面半高：腹面（翅芽与足芽所在的一面）近乎平直 */
const ventralHeight = table([
  [0.0, 0.12],
  [0.1, 0.26],
  [0.3, 0.36],
  [0.5, 0.37],
  [0.7, 0.3],
  [0.88, 0.17],
  [1.0, 0.07],
])

/** 超椭圆指数：< 2 让截面在背中线与两侧起钝棱（2 = 圆润的椭圆） */
const SUPER = 1.5

/** 头端封口：钝圆地收（尾端直接收进臀棘，不另封） */
function cap(u: number): number {
  const xf = THREE.MathUtils.clamp((0.025 - u) / 0.025, 0, 1)
  return Math.sqrt(Math.max(1 - xf * xf, 0))
}

const sgnPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e)

/** 蛹壳上 (u, θ) 处的点。θ=0 背中线、θ=+90° 右侧、±180° 腹中线 */
function shellPoint(u: number, theta: number, out = new THREE.Vector3()): THREE.Vector3 {
  const uc = THREE.MathUtils.clamp(u, 0, 1)
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  const k = cap(uc)
  const hy = (c >= 0 ? dorsalHeight(uc) : ventralHeight(uc)) * k
  const hz = halfWidth(uc) * k
  const e = 2 / SUPER
  return out
    .copy(axisPoint(u))
    .addScaledVector(D, sgnPow(c, e) * hy)
    .addScaledVector(Z, sgnPow(s, e) * hz)
}

// ---------------------------------------------------------------- 色区

type Zone = 'pupa-shell' | 'dorsal-diamond' | 'wing-case' | 'wing-seam'

const deg = THREE.MathUtils.degToRad

/** 背面黄斑（菱形）：中心 u，沿体轴半长（u 单位），绕体半角 */
const DIAMOND_U = 0.44
const DIAMOND_HALF_U = 0.14
const DIAMOND_HALF_THETA = deg(48)

/** 翅芽的前后范围（u） */
const WING_U0 = 0.1
const WING_U1 = 0.6
/** 翅芽上缘的方位角：前端在体侧偏背（62°），向后逐渐压向腹面，到 u=0.6 收尖 */
function wingTopTheta(u: number): number {
  const t = THREE.MathUtils.clamp((u - WING_U0) / (WING_U1 - WING_U0), 0, 1)
  return deg(62 + 108 * Math.pow(t, 1.6))
}
/** 翅芽外缘缝线的方位角半宽：约 0.4 毫米宽，按当地半宽换算 */
function seamHalf(u: number): number {
  return 0.022 / Math.max(halfWidth(u), 0.1)
}
/** 把「只在 WING_U0~WING_U1 之间」并进场里（理由见 swallowtail-larva 的 bridgeField） */
function wingRange(u: number): number {
  return Math.max(WING_U0 - u, u - WING_U1) * 4
}

function diamondField(u: number, at: number): number {
  return Math.abs(u - DIAMOND_U) / DIAMOND_HALF_U + at / DIAMOND_HALF_THETA - 1
}
function wingField(u: number, at: number): number {
  return Math.max(wingTopTheta(u) - at, wingRange(u))
}
function seamField(u: number, at: number): number {
  return Math.max(Math.abs(at - wingTopTheta(u)) - seamHalf(u), wingRange(u))
}

function zoneAt(u: number, theta: number): Zone {
  const at = Math.abs(theta)
  if (diamondField(u, at) < 0) return 'dorsal-diamond'
  if (seamField(u, at) < 0) return 'wing-seam'
  if (wingField(u, at) < 0) return 'wing-case'
  return 'pupa-shell'
}

const WING_BOX: [number, number, number, number] = [WING_U0 - 0.03, WING_U1 + 0.03, deg(45), Math.PI]
const FIELDS: SkinField[] = [
  { f: diamondField, box: [DIAMOND_U - DIAMOND_HALF_U - 0.03, DIAMOND_U + DIAMOND_HALF_U + 0.03, 0, DIAMOND_HALF_THETA + deg(8)] },
  { f: wingField, box: WING_BOX },
  { f: seamField, box: WING_BOX },
]

const ROWS = 170
const COLS = 96

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
 * θ 自 −π 走到 +π，接缝落在腹中线 —— 蛹的腹面朝着枝条，看不见。
 *
 * 与 swallowtail-larva.ts 里那份逐行相同。为什么不抽成公共函数：`builders/stages/`
 * 下每个文件都会被 stages.ts 的
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

// ---------------------------------------------------------------- 丝带

/** 丝带绕在蛹体的哪个位置：胸背隆起之后、第一腹节一带 */
const GIRDLE_U = 0.4
/** 丝带半径 0.0225 = 直径 0.45 毫米（真实是几十股丝并成的一束，约 0.3 毫米） */
const GIRDLE_R = 0.0225

/**
 * 丝带的走向：自枝条左侧起，斜跨到蛹体腹侧，绕过整个背面，再回到枝条右侧。
 * 绕体那一段贴着壳面外 0.03 走（丝带是被蛹壳撑紧的，不能陷进壳里），
 * 两端到枝条那两段悬空 —— 这两段悬空的丝就是「缢」字的由来，必须看得见。
 */
function girdleCurve(): { curve: THREE.CatmullRomCurve3; ends: THREE.Vector3[] } {
  const loop: THREE.Vector3[] = []
  const p = new THREE.Vector3()
  const center = axisPoint(GIRDLE_U)
  for (let k = -9; k <= 9; k++) {
    const theta = deg(122) * (k / 9)
    shellPoint(GIRDLE_U, theta, p)
    const outward = p.clone().sub(center).normalize()
    loop.push(p.clone().addScaledVector(outward, 0.03))
  }
  // 丝带平面大致垂直于体轴：两个固着点取在该平面与枝面相交处的左右两侧
  const attach = (side: 1 | -1) => {
    const x = TWIG_X - TWIG_R * 0.55
    const z = side * TWIG_R * 0.84
    // H·(Q − center) = 0 解出 y
    const y = center.y + (H.x * (center.x - x) + H.z * (center.z - z)) / H.y
    return new THREE.Vector3(x, y, z)
  }
  const left = attach(-1)
  const right = attach(1)
  return { curve: new THREE.CatmullRomCurve3([left, ...loop, right], false, 'centripetal'), ends: [left, right] }
}

// ---------------------------------------------------------------- 建模主体

export function buildSwallowtailPupa(): InsectModel {
  const g = new THREE.Group()

  /*
   * 底绿 hue≈100°、L≈0.46：比帝王蝶蛹的玉绿（hue≈140°）更偏黄绿 ——
   * 凤蝶绿蛹是嫩叶色，挂在柑橘嫩枝上与叶同色（这就是它的伪装）。
   * 背斑是浅黄（L≈0.69），与底绿明度差 0.2 以上，否则在 ACES 下会融成一片。
   * 丝带近白（L≈0.89）：绿蛹 + 褐枝 + 白丝，三者明度各不相同，丝带才跳得出来。
   */
  const mats: Record<Zone, THREE.Material> = {
    'pupa-shell': chitin({ color: '#5fae3e', gloss: 0.55, clearcoat: 0.38 }),
    'dorsal-diamond': chitin({ color: '#e0da74', gloss: 0.55, clearcoat: 0.38 }),
    'wing-case': chitin({ color: '#7cc257', gloss: 0.55, clearcoat: 0.38 }),
    'wing-seam': chitin({ color: '#2e6424', gloss: 0.45, clearcoat: 0.25 }),
  }
  const hornMat = chitin({ color: '#86be52', gloss: 0.55, clearcoat: 0.3 })
  const cremasterMat = chitin({ color: '#4a3a22', gloss: 0.5, clearcoat: 0.2 })
  const silkMat = chitin({ color: '#efeadb', gloss: 0.3 })
  const twigMat = chitin({ color: '#7a6440', gloss: 0.3 })

  // ---- 蛹壳
  for (const m of patternedSkin(ROWS, COLS, shellPoint, FIELDS, zoneAt, mats)) g.add(m)

  // ---- 头角：头端那块窄额的左右两角各一枚短锥，顺头向伸出、略向外分
  const hornTips: THREE.Vector3[] = []
  for (const side of [1, -1] as const) {
    const u = 0.02
    const base = axisPoint(u)
      .addScaledVector(D, dorsalHeight(u) * 0.35)
      .addScaledVector(Z, side * halfWidth(u) * 0.75)
    const dir = H.clone().addScaledVector(D, 0.12).addScaledVector(Z, side * 0.22).normalize()
    const tip = base.clone().addScaledVector(dir, 0.2)
    hornTips.push(tip)
    const horn = new THREE.Mesh(
      loft(
        [
          { at: base.clone().addScaledVector(dir, -0.06), ry: 0.055, rz: 0.055 },
          { at: base.clone().addScaledVector(dir, 0.08), ry: 0.036, rz: 0.036 },
          { at: tip, ry: 0.008, rz: 0.008 },
        ],
        10,
      ),
      hornMat,
    )
    horn.name = 'cephalic-horn'
    g.add(horn)
  }

  // ---- 臀棘：尾端一小截深褐色的钩状柄，扎进枝上的丝垫
  const cremaster = new THREE.Mesh(
    loft(
      [
        { at: TAIL.clone().addScaledVector(H, 0.06), ry: 0.075, rz: 0.075 },
        { at: TAIL.clone().addScaledVector(H, -CREMASTER_LEN * 0.5), ry: 0.045, rz: 0.05 },
        { at: CREMASTER_END, ry: 0.03, rz: 0.04 },
      ],
      12,
    ),
    cremasterMat,
  )
  cremaster.name = 'cremaster'
  g.add(cremaster)

  const pad = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), silkMat)
  pad.scale.set(0.35, 0.9, 1)
  pad.position.set(TWIG_X - TWIG_R, CREMASTER_END.y, 0)
  pad.name = 'silk-pad'
  g.add(pad)

  // ---- 丝带
  const { curve, ends } = girdleCurve()
  const girdle = new THREE.Mesh(new THREE.TubeGeometry(curve, 140, GIRDLE_R, 8, false), silkMat)
  girdle.name = 'girdle'
  g.add(girdle)
  for (const e of ends) {
    // 固着点：丝带两端在枝面上铺开的一小团丝
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), silkMat)
    knot.position.copy(e)
    knot.scale.set(0.6, 1, 0.6)
    knot.name = 'girdle-knot'
    g.add(knot)
  }

  // ---- 枝条：竖直的一截柑橘嫩枝
  const twigBottom = CREMASTER_END.y - 0.7
  const twigTop = axisPoint(0).y + 0.45
  const twig = new THREE.Mesh(new THREE.CylinderGeometry(TWIG_R * 0.94, TWIG_R, twigTop - twigBottom, 20, 1), twigMat)
  twig.position.set(TWIG_X, (twigTop + twigBottom) / 2, 0)
  twig.name = 'twig'
  g.add(twig)

  const anchors: Record<string, THREE.Vector3> = {
    // 名字避开成虫的 tail / forewing：臀棘不是尾突，翅芽不是前翅
    girdle: curve.getPoint(0.5),
    cremaster: CREMASTER_END.clone().lerp(TAIL, 0.5),
    cephalicHorn: hornTips[0],
    thoracicHump: shellPoint(0.24, 0),
    dorsalDiamond: shellPoint(DIAMOND_U, 0),
    wingCase: shellPoint(0.3, deg(135)),
    twig: new THREE.Vector3(TWIG_X, twigTop - 0.3, 0),
  }

  return finalize(g, anchors)
}
