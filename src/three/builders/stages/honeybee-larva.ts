/**
 * 西方蜜蜂 · 幼虫 Apis mellifera（完全变态第 2 阶段）
 *
 * 单位与坐标系与成虫（../honeybee.ts）一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。
 *
 * ## 招牌：一条**没有足**的乳白蛆，蜷在六角房底
 *
 * 1. **无足**。膜翅目的幼虫既没有胸足也没有腹足 —— 这是它与鳞翅目毛虫
 *    （3 对胸足 + 数对腹足）、鞘翅目蛴螬（3 对胸足）最硬的分界线。
 *    给它加腿就是换了一个目。本文件里除了体壁与气门，**一根附肢都没有**，
 *    测试按「所有顶点到体轴的距离都不超过体半径的 1.3 倍」来看着这件事：
 *    只要长出任何一根腿，某些顶点必然远远伸出这个包络。
 * 2. **C 形蜷在房底**。0.92 圈的扁椭圆盘绕，首尾之间留一道明显的缺口 ——
 *    满一圈就读成一个甜甜圈，不足半圈又读成一根香蕉。体轴弧长 1.02
 *    （真值 1.0~1.2 厘米），盘起来外径 0.53，几乎顶到房壁：
 *    **大幼虫本来就把房塞满**，这是它「快化蛹了」的全部表达。
 *    ⚠️ 一条 1 厘米的虫塞不进 5.3 毫米的房里，除非它盘着 —— 这个约束是真的，
 *    不是为了好看：椭圆长半轴 0.188 + 体半径 0.072 = 0.260，
 *    而房内接的外接圆半径是 0.290，只剩 0.030 的余量。
 * 3. **体节明显、饱满**。13 节（3 胸 + 10 腹），节间只做**窄而浅的折痕**
 *    （`|cos|^6`、深 6%）。折痕一深就读成松果 —— 黑翅土白蚁兵蚁与蛴螬
 *    那两轮栽过同一个跟头。
 * 4. **通体乳白带珍珠光泽、哑光**。`chitin({ gloss: 0.2, clearcoat: 0.03,
 *    translucent: true })`：软体不是硬壳，**绝不用 `elytra()`**。
 *    乳白 + 高光会整片过曝成白铬（七星瓢虫、甘薯腊龟甲栽的就是这个），
 *    所以基色可以放心用真正的乳白 `#f0e9d8`，靠材质而不是靠压深来防过曝。
 * 5. **躺在一小滩蜂王浆里**。工蜂饲喂的幼虫虫体下总有一层乳浆，
 *    比虫体黄一档、亮泽一档 —— 它同时是「有人在喂它」这件事的唯一表达。
 * 6. **邻房里还有一条更小的**（约半龄）。同形不同大小的两条摆在一起，
 *    「这是同一种东西的不同日龄」不用文字就说清了；真实子脾上也正是这样。
 *
 * ## 巢脾：与卵、蛹两阶段同一套（房宽、菱形房底、房轴姿态都一致）
 *
 * 房**按刀切的剖面画法截短**：真实工蜂房深 11~12 毫米，这里只留房底
 * 到房口 3~5 毫米。理由与柞蚕蛾茧的半剖一样 —— 满深的房从任何机位看进去
 * 都只是一口暗井，而这个阶段唯一要讲的事就在井底。截短是公开承认的剖法，
 * 不是把房「做小」：房宽、房底、壁厚全是真值。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 巢房阵列

/** 工蜂房中心间距 = 对边距。真值 5.2~5.4 毫米，取 5.3 */
const CELL_W = 0.53
/** 内切圆半径（对边距的一半） */
const CELL_A = CELL_W / 2
/** 外接圆半径 */
const CELL_RC = CELL_A / Math.cos(Math.PI / 6)
/**
 * 菱形房底的高差。房底由三枚菱形拼成，六个房角交替落在 h 与 2h、锥尖在房轴上。
 * 取 h = 外接圆半径 /(2√2) 时菱形钝角恰为 109.47°（实测值）。
 */
const BASE_H = CELL_RC / (2 * Math.SQRT2)

/** 单位内切圆半径的正六边形角点（第 7 个 = 第 0 个，方便按边取用） */
const CORNER: THREE.Vector2[] = Array.from({ length: 7 }, (_, k) => {
  const a = Math.PI / 6 + (k * Math.PI) / 3
  const rc = 1 / Math.cos(Math.PI / 6)
  return new THREE.Vector2(Math.cos(a) * rc, Math.sin(a) * rc)
})

function cellCenter(q: number, r: number): THREE.Vector2 {
  return new THREE.Vector2(CELL_W * (q + r / 2), CELL_W * (Math.sqrt(3) / 2) * r)
}

/** 房底锥面在第 k 条边、参数 u 处的高度（角点交替 h / 2h，边上线性 —— 菱形是平的） */
function floorY(k: number, u: number): number {
  const a = k % 2 === 0 ? BASE_H : 2 * BASE_H
  const b = (k + 1) % 2 === 0 ? BASE_H : 2 * BASE_H
  return THREE.MathUtils.lerp(a, b, u)
}

/**
 * 房底锥面在房内任意一点（相对房心的 dx, dz）的高度。
 *
 * 三枚菱形各是一个过锥尖的平面，按方位角落在哪 120° 扇区选平面即可。
 * 幼虫就靠它**贴着这枚锥面**盘起来 —— 盘在一个水平圆面上会读成放在
 * 玻璃板上的一根面条，而真实的幼虫是顺着房底那三瓣斜面起伏的。
 */
function baseHeightAt(dx: number, dz: number): number {
  const ang = Math.atan2(dz, dx)
  const start = Math.PI / 6
  const sector = Math.floor(((ang - start) / (2 * Math.PI / 3) + 6) % 3)
  const k0 = 2 * sector
  const p1 = new THREE.Vector3(CORNER[k0].x * CELL_A, BASE_H, CORNER[k0].y * CELL_A)
  const p2 = new THREE.Vector3(CORNER[k0 + 2].x * CELL_A, BASE_H, CORNER[k0 + 2].y * CELL_A)
  const n = new THREE.Vector3().crossVectors(p1, p2)
  if (Math.abs(n.y) < 1e-6) return BASE_H
  return -(n.x * dx + n.z * dz) / n.y
}

// ---------------------------------------------------------------- 巢脾姿态

/**
 * 房轴（模型局部坐标），三个阶段共用。取值理由见 honeybee-egg.ts 同名常量：
 * 与顶 / 侧 / 前斜 / 展台默认四个机位的夹角是 29° / 41° / 43° / 34°，
 * 都看得进房里；后斜机位看到的是脾背（菱形房底那一面），也是真实结构。
 */
const CELL_AXIS = new THREE.Vector3(0.38, 0.76, 0.53).normalize()

const AXIS_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), CELL_AXIS)

/** 绕房轴的自转量，与另两个阶段同一个式子 —— 翻阅生活史时巢脾不该跳一下 */
const COMB_SPIN = (() => {
  const acc = new THREE.Vector3()
  const v = new THREE.Vector3()
  for (const d of [
    [0.12, 0.28, 1],
    [1, 0.32, 0.4],
    [0.86, 0.44, 1.25],
  ] as const) {
    v.set(d[0], d[1], d[2]).normalize()
    v.addScaledVector(CELL_AXIS, -v.dot(CELL_AXIS))
    acc.add(v.normalize())
  }
  const local = acc.normalize().applyQuaternion(AXIS_Q.clone().invert())
  return -Math.atan2(local.z, local.x)
})()

const COMB_Q = AXIS_Q.clone().multiply(
  new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), COMB_SPIN),
)

// ---------------------------------------------------------------- 伪随机

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

// ---------------------------------------------------------------- 单房几何

interface CellSpec {
  q: number
  r: number
  tRim: number
  tBase: number
  /**
   * 房壁高出**房底外缘**（2×BASE_H）多少。以房底外缘为基准而不是锥尖：
   * 房底是个交替高低的锯齿圈，按锥尖记高度时起伏一叠上去就可能让某个房角的
   * 「口」低于「底」，那一段壁会翻过来 —— 几何合法、断言全绿，画面上是一片乱刺。
   */
  rimAbove: number
  ripple: number
  phase: number
  edges: readonly number[]
}

const SUB = 4
const ROWS = 3

/**
 * 一个房的蜡壁。每条边自成一片、角点重复一次 —— 这样 `computeVertexNormals()`
 * 不会把六个角磨圆，六边形才读得出是六边形。
 * 相邻两房的壁互相重叠、半厚逐房抖动，实读壁厚 2×max(t_A, t_B)，天然厚薄不匀。
 */
function cellWallGeometry(spec: CellSpec): THREE.BufferGeometry {
  const c = cellCenter(spec.q, spec.r)
  const pos: number[] = []
  const idx: number[] = []
  const p = new THREE.Vector2()

  for (const k of spec.edges) {
    const base = pos.length / 3
    for (let i = 0; i <= SUB; i++) {
      const u = i / SUB
      p.copy(CORNER[k]).lerp(CORNER[k + 1], u)
      const bottom = floorY(k, u)
      const top =
        2 * BASE_H +
        spec.rimAbove +
        spec.ripple * Math.sin((k + u) * Math.PI + spec.phase) +
        spec.ripple * 0.4 * Math.sin((k + u) * 2 * Math.PI + spec.phase * 1.7)
      for (let j = 0; j <= ROWS; j++) {
        const v = j / ROWS
        const y = THREE.MathUtils.lerp(bottom, top, v)
        const t = THREE.MathUtils.lerp(spec.tBase, spec.tRim, THREE.MathUtils.smoothstep(v, 0.4, 1))
        for (const s of [-1, 1] as const) {
          const a = CELL_A + s * t
          pos.push(c.x + p.x * a, y, c.y + p.y * a)
        }
      }
    }
    const vid = (i: number, j: number, shell: 0 | 1) => base + (i * (ROWS + 1) + j) * 2 + shell
    for (let i = 0; i < SUB; i++) {
      for (let j = 0; j < ROWS; j++) {
        idx.push(vid(i, j, 0), vid(i + 1, j, 0), vid(i + 1, j + 1, 0))
        idx.push(vid(i, j, 0), vid(i + 1, j + 1, 0), vid(i, j + 1, 0))
        idx.push(vid(i, j, 1), vid(i + 1, j + 1, 1), vid(i + 1, j, 1))
        idx.push(vid(i, j, 1), vid(i, j + 1, 1), vid(i + 1, j + 1, 1))
      }
      idx.push(vid(i, ROWS, 0), vid(i + 1, ROWS, 1), vid(i, ROWS, 1))
      idx.push(vid(i, ROWS, 0), vid(i + 1, ROWS, 0), vid(i + 1, ROWS, 1))
      idx.push(vid(i, 0, 0), vid(i, 0, 1), vid(i + 1, 0, 1))
      idx.push(vid(i, 0, 0), vid(i + 1, 0, 1), vid(i + 1, 0, 0))
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** 中肋厚度：真实蜡片约 0.1 毫米，这里给 0.22 毫米 */
const MIDRIB = 0.022

/**
 * 房底：三枚菱形拼成的锥，带厚度。
 * ⚠️ 必须有厚度：`finalize()` 会把不透明材质翻成双面，零厚度的面在阴影贴图里
 * 正反两面深度相同、自己遮自己，出图后整片刷上被面纹样的噪点，看着像模型坏了。
 */
function cellFloorGeometry(spec: CellSpec): THREE.BufferGeometry {
  const c = cellCenter(spec.q, spec.r)
  const a = CELL_A - spec.tBase
  const rimY = (k: number) => (k % 2 === 0 ? BASE_H : 2 * BASE_H)
  const front = [
    new THREE.Vector3(c.x, 0, c.y),
    ...Array.from(
      { length: 6 },
      (_, k) => new THREE.Vector3(c.x + CORNER[k].x * a, rimY(k), c.y + CORNER[k].y * a),
    ),
  ]
  const back = front.map((v) => new THREE.Vector3(v.x, v.y - MIDRIB, v.z))
  const pos: number[] = []
  const push = (...vs: THREE.Vector3[]) => {
    for (const v of vs) pos.push(v.x, v.y, v.z)
  }
  for (let m = 0; m < 3; m++) {
    const i0 = (2 * m) % 6
    const i1 = (2 * m + 1) % 6
    const i2 = (2 * m + 2) % 6
    push(front[0], front[1 + i0], front[1 + i1])
    push(front[0], front[1 + i1], front[1 + i2])
    push(back[0], back[1 + i1], back[1 + i0])
    push(back[0], back[1 + i2], back[1 + i1])
  }
  for (let k = 0; k < 6; k++) {
    push(front[1 + k], back[1 + k], back[1 + ((k + 1) % 6)])
    push(front[1 + k], back[1 + ((k + 1) % 6)], front[1 + ((k + 1) % 6)])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

// ---------------------------------------------------------------- 颜色

/** 蜡：暖蜡黄。子脾比新脾略深一档（用过的蜡会变深），逐房再抖一点 */
const WAX_COLOR = '#cb9c4c'
/** 体壁：真正的乳白，不压深。防过曝靠哑光 + 次表面透光，不靠调暗基色 */
const BODY_COLOR = '#f0e9d8'
/** 头端：极浅的琥珀。幼虫的头壳只有一点点骨化，压深就成了「戴帽子」 */
const HEAD_COLOR = '#e0cfa8'
/** 气门：细小的浅褐点。太深会读成一排黑洞 */
const SPIRACLE_COLOR = '#b79a6b'
/** 蜂王浆：比体壁黄一档、亮泽一档 —— 这一档色差是「虫躺在浆里」的全部依据 */
const JELLY_COLOR = '#e3cf98'

// ---------------------------------------------------------------- 幼虫

/** 盘绕圈数。0.95 圈：首尾之间留 18° 的缺口，满一圈读成甜甜圈，半圈读成香蕉 */
const COIL_TURNS = 0.95
/** 盘绕椭圆的半轴（长轴指向房的一个角，那个方向房里空间最富余） */
const COIL_A = 0.172
const COIL_B = 0.163
/** 长轴方位（相对房的角点方向） */
const COIL_TILT = Math.PI / 6
/**
 * 体半径峰值。0.068 → 体径 1.36 毫米。
 *
 * ⚠️ 盘绕半轴 + 体半径**必须小于房底六边形的内切半径 0.25**，不是外接半径 ——
 * 六边形在边中方向上最窄。第一版按外接半径卡（0.188 + 0.072 = 0.26），
 * 结果虫在边中那两处伸出房底 0.01，从**后斜机位**（看的是脾背）能看见几块
 * 奶白色的虫体挂在脾底下。顶点数、包围盒、NaN 检查全绿，只有出图看得见。
 * 现在最大外伸 0.240（角方向）/ 0.238（边中方向），留着 0.012 的余量。
 */
const BODY_R = 0.068
/** 可见体节数：3 胸节 + 10 腹节 */
const SEGMENTS = 13
/** 节间折痕深度（占该处体半径的比例）。超过 0.1 就开始读成松果 */
const GROOVE = 0.06
/** 节内微鼓：体节的「饱满」靠节中微凸，不靠节间深挖 */
const PLUMP = 0.025
/** 虫体离房底的间隙（下面垫着一层蜂王浆） */
const FLOAT = 0.012

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

/** u=0 头端（细）→ 中段最粗 → u=1 尾端圆钝。两端都收，但尾端收得更圆 */
const BODY_PROFILE = [
  [0.0, 0.2],
  [0.04, 0.5],
  [0.12, 0.78],
  [0.26, 0.94],
  [0.46, 1.0],
  [0.64, 0.97],
  [0.8, 0.87],
  [0.9, 0.7],
  [0.97, 0.42],
  [1.0, 0.1],
] as const

/** 节间折痕 + 节中微鼓。窄折痕（|cos|^6）而不是宽凹槽，同样深度下读得更清楚 */
function ripple(u: number): number {
  const local = u * SEGMENTS - Math.floor(u * SEGMENTS)
  const crease = Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
  // 两端各淡出一节：球冠收口处再刻横褶会读成一圈圈的「切面」
  const fade = THREE.MathUtils.clamp(Math.min(u, 1 - u) / 0.06, 0, 1)
  return 1 - GROOVE * crease * fade + PLUMP * Math.sin(local * Math.PI) * fade
}

/** 一条幼虫：多大、绕房轴转多少 */
interface LarvaSpec {
  scale: number
  /**
   * 盘绕方向绕房轴的自转。
   * ⚠️ 必须在**中心线公式内部**转，不能把整组 `rotation.y` 一转了事：
   * 中心线的高度是查 `baseHeightAt()` 得来的（虫贴着菱形房底起伏），
   * 转组会把虫转走、把它脚下那枚锥留在原地 —— 虫一半陷进蜡里、一半悬空，
   * 而顶点数、包围盒、断言全是绿的。
   */
  spin: number
}

/** 该处的体半径 */
function bodyRadius(u: number, scale: number): number {
  return Math.max(BODY_R * scale * keyframe(BODY_PROFILE, u) * ripple(u), 1e-4)
}

/**
 * 盘绕中心线上的一点（相对房心）。
 *
 * 椭圆盘绕 + **贴着菱形房底起伏**：y 取该处房底高度加上体半径加一点间隙，
 * 所以虫顺着房底那三瓣斜面一高一低。盘在一个水平圆面上会读成放在玻璃板上的面条。
 */
function coilPoint(u: number, spec: LarvaSpec): THREE.Vector3 {
  const th = -Math.PI * 0.35 + COIL_TURNS * 2 * Math.PI * u
  const a = COIL_A * spec.scale * (1 - 0.07 * u)
  const b = COIL_B * spec.scale * (1 - 0.07 * u)
  const tilt = COIL_TILT + spec.spin
  const e1 = new THREE.Vector2(Math.cos(tilt), Math.sin(tilt))
  const e2 = new THREE.Vector2(-Math.sin(tilt), Math.cos(tilt))
  const dx = e1.x * a * Math.cos(th) + e2.x * b * Math.sin(th)
  const dz = e1.y * a * Math.cos(th) + e2.y * b * Math.sin(th)
  const y = baseHeightAt(dx, dz) + bodyRadius(u, spec.scale) * 0.92 + FLOAT * spec.scale
  return new THREE.Vector3(dx, y, dz)
}

interface Frame {
  pos: THREE.Vector3
  forward: THREE.Vector3
  dorsal: THREE.Vector3
  lateral: THREE.Vector3
  r: number
}

/** 体轴局部标架：背面朝房口（房轴 +Y），侧向 = 切向 × 背向 */
function frameAt(u: number, spec: LarvaSpec): Frame {
  const h = 1e-3
  const a = coilPoint(Math.max(0, u - h), spec)
  const b = coilPoint(Math.min(1, u + h), spec)
  const forward = new THREE.Vector3().subVectors(b, a).normalize()
  const up = new THREE.Vector3(0, 1, 0)
  const lateral = new THREE.Vector3().crossVectors(forward, up).normalize()
  const dorsal = new THREE.Vector3().crossVectors(lateral, forward).normalize()
  return { pos: coilPoint(u, spec), forward, dorsal, lateral, r: bodyRadius(u, spec.scale) }
}

/** 虫体：沿盘绕中心线放样。横截面近圆、略宽于高（贴着房底压了一点） */
function larvaBodyGeometry(spec: LarvaSpec): THREE.BufferGeometry {
  const steps = SEGMENTS * 9
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const r = bodyRadius(u, spec.scale)
    sections.push({ at: coilPoint(u, spec), ry: r * 0.95, rz: r * 1.04 })
  }
  return loft(sections, 22)
}

/** 头端：套在最前一小截外面的一层浅琥珀壳，外扩一点点，形成一道干净的分界 */
function larvaHeadGeometry(spec: LarvaSpec): THREE.BufferGeometry {
  const steps = 12
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * 0.075
    const r = bodyRadius(u, spec.scale) + 0.004 * spec.scale
    sections.push({ at: coilPoint(u, spec), ry: r * 0.95, rz: r * 1.04 })
  }
  return loft(sections, 20)
}

/**
 * 体侧一排气门：每节一对，位于体侧偏背 72° 处的一枚小椭圆，
 * 沿体轴拉长、贴着体壁压扁 —— 立起来的小球会读成一排疣，不是气孔。
 * ⚠️ 圆心正落在体壁上（系数 1.0，不是 0.95）：蛴螬那一轮把气门往里陷 5%，
 * 结果整排一颗都看不见 —— 几何合法、断言（若按坐标写）也绿。
 */
function spiracleGroup(spec: LarvaSpec, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const theta = THREE.MathUtils.degToRad(84)
  for (let seg = 0; seg < 10; seg++) {
    const u = (seg + 2.5) / SEGMENTS
    const f = frameAt(u, spec)
    for (const side of [1, -1] as const) {
      const out = new THREE.Vector3()
        .addScaledVector(f.dorsal, Math.cos(theta))
        .addScaledVector(f.lateral, side * Math.sin(theta))
        .normalize()
      const third = new THREE.Vector3().crossVectors(f.forward, out).normalize()
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.011 * spec.scale, 10, 8), mat)
      m.name = 'larva-spiracle'
      m.position.copy(f.pos).addScaledVector(out, f.r)
      m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.forward, out, third))
      m.scale.set(1, 0.4, 0.62)
      g.add(m)
    }
  }
  return g
}

/** 蜂王浆层的厚度（大幼虫那格；小幼虫那格薄一点） */
const JELLY_T = 0.028

/**
 * 蜂王浆：房底那一层乳浆。
 *
 * 做成一层**贴着菱形房底的膜**，而不是一枚水平的透镜或水平液面。
 * ⚠️ 两版都栽在同一件事上：房底是一枚交替高低的锥，任何水平面在锥的高处
 * 都会低于房底 —— 于是浆从脾底下穿出来，后斜机位（看的是脾背）里几块
 * 奶油色的楔子挂在巢脾外面。顶点数、包围盒、NaN 检查全绿，只有出图看得见。
 * 贴着锥面抬起一个固定厚度就不可能穿：它处处在房底之上。
 *
 * 色相比虫体黄一档、亮泽一档。⚠️ 也就一档：乳白上再叠强高光就是白铬
 * （七星瓢虫那一档），所以 gloss 0.5 / clearcoat 0.16 封顶。
 */
function jellyMesh(spec: LarvaSpec, mat: THREE.Material): THREE.Mesh {
  const a = CELL_A - 0.03
  const k = a / CELL_A
  const t = JELLY_T * (spec.scale > 0.8 ? 1 : 0.7)
  const rimY = (i: number) => (i % 2 === 0 ? BASE_H : 2 * BASE_H) * k
  const pos: number[] = []
  const push = (x: number, y: number, z: number) => pos.push(x, y, z)
  for (let i = 0; i < 6; i++) {
    const p0 = CORNER[i]
    const p1 = CORNER[i + 1]
    const y0 = rimY(i)
    const y1 = rimY(i + 1)
    // 浆面（贴着房底抬高 t）
    push(0, t, 0)
    push(p0.x * a, y0 + t, p0.y * a)
    push(p1.x * a, y1 + t, p1.y * a)
    // 外缘的厚度带：落回房底面上，读作「一层湿的东西糊在房底」
    push(p0.x * a, y0 + t, p0.y * a)
    push(p0.x * a, y0, p0.y * a)
    push(p1.x * a, y1, p1.y * a)
    push(p0.x * a, y0 + t, p0.y * a)
    push(p1.x * a, y1, p1.y * a)
    push(p1.x * a, y1 + t, p1.y * a)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.computeVertexNormals()
  const m = new THREE.Mesh(geo, mat)
  m.name = 'brood-food'
  return m
}

/** 一条幼虫（含头端、气门、身下的蜂王浆），摆进给定的房 */
function larvaGroup(
  center: THREE.Vector2,
  spec: LarvaSpec,
  mats: { body: THREE.Material; head: THREE.Material; spiracle: THREE.Material; jelly: THREE.Material },
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'larva'
  g.position.set(center.x, 0, center.y)

  g.add(jellyMesh(spec, mats.jelly))

  const body = new THREE.Mesh(larvaBodyGeometry(spec), mats.body)
  body.name = 'larva-body'
  g.add(body)

  const head = new THREE.Mesh(larvaHeadGeometry(spec), mats.head)
  head.name = 'larva-head'
  g.add(head)

  g.add(spiracleGroup(spec, mats.spiracle))
  return g
}

// ---------------------------------------------------------------- 装配

const RING: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
]

export function buildHoneybeeLarva(): InsectModel {
  const g = new THREE.Group()
  const comb = new THREE.Group()
  comb.name = 'comb'
  comb.quaternion.copy(COMB_Q)
  g.add(comb)

  const rnd = prng(0x5eed02)

  const specs: CellSpec[] = []
  const cells: readonly (readonly [number, number])[] = [[0, 0], ...RING]
  for (const [q, r] of cells) {
    const outer = q !== 0 || r !== 0
    const broken = q === -1 && r === 1
    specs.push({
      q,
      r,
      tRim: 0.021 + rnd() * 0.007,
      tBase: 0.012 + rnd() * 0.005,
      /*
       * 按刀切的剖面画法截短：壁只高出房底外缘 0.9~2.6 毫米（满深真值 11~12 毫米）。
       * 中央那格取下限 —— 大幼虫的背几乎顶到房口，房再深一点，
       * 侧机位与前斜机位就只剩一口暗井。
       */
      rimAbove: (outer ? 0.13 : 0.09) + rnd() * (outer ? 0.13 : 0.03),
      ripple: 0.012 + rnd() * 0.018,
      edges: broken ? [0, 1, 2, 5] : [0, 1, 2, 3, 4, 5],
      phase: rnd() * Math.PI * 2,
    })
  }

  for (const spec of specs) {
    const cell = new THREE.Group()
    cell.name = 'comb-cell'
    const shade = (rnd() - 0.5) * 0.09
    const waxMat = chitin({
      color: new THREE.Color(WAX_COLOR).offsetHSL(0, (rnd() - 0.5) * 0.05, shade),
      gloss: 0.26,
      clearcoat: 0.05,
    })
    const wall = new THREE.Mesh(cellWallGeometry(spec), waxMat)
    wall.name = 'comb-wall'
    cell.add(wall)
    const floorMat = chitin({
      color: new THREE.Color(WAX_COLOR).offsetHSL(0, 0, shade - 0.08),
      gloss: 0.2,
      clearcoat: 0.03,
    })
    const floor = new THREE.Mesh(cellFloorGeometry(spec), floorMat)
    floor.name = 'comb-floor'
    cell.add(floor)
    comb.add(cell)
  }

  /*
   * 体壁：哑光 + 次表面透光。**绝不是 elytra()** —— 幼虫是软体不是硬壳，
   * 乳白配上鞘翅那档清漆会整片过曝成白铬。
   */
  const mats = {
    body: chitin({ color: BODY_COLOR, gloss: 0.2, clearcoat: 0.03, translucent: true }),
    head: chitin({ color: HEAD_COLOR, gloss: 0.26, clearcoat: 0.06 }),
    spiracle: chitin({ color: SPIRACLE_COLOR, gloss: 0.3 }),
    // 蜂王浆是湿的，比虫体亮泽一档；但也就一档 —— 乳白上再叠强高光就是白铬
    jelly: chitin({ color: JELLY_COLOR, gloss: 0.5, clearcoat: 0.16, translucent: true }),
  }

  // 中央那格：接近末龄的大幼虫，几乎把房塞满
  const mainSpec: LarvaSpec = { scale: 1, spin: 0.35 }
  comb.add(larvaGroup(cellCenter(0, 0), mainSpec, mats))
  // 邻房里一条更小的（约半龄）：同形不同大小，「同一种东西的不同日龄」不言自明
  comb.add(larvaGroup(cellCenter(1, 0), { scale: 0.56, spin: 2.2 }, mats))

  const toModel = (v: THREE.Vector3) => v.clone().applyQuaternion(COMB_Q)
  const mainCenter = cellCenter(0, 0)
  const midFrame = frameAt(0.45, mainSpec)
  const headFrame = frameAt(0.02, mainSpec)

  const anchors: Record<string, THREE.Vector3> = {
    larva: toModel(
      new THREE.Vector3(mainCenter.x + midFrame.pos.x, midFrame.pos.y + midFrame.r, mainCenter.y + midFrame.pos.z),
    ),
    head: toModel(
      new THREE.Vector3(mainCenter.x + headFrame.pos.x, headFrame.pos.y + headFrame.r, mainCenter.y + headFrame.pos.z),
    ),
    broodFood: toModel(new THREE.Vector3(mainCenter.x, BASE_H * 0.6, mainCenter.y)),
    cellWall: toModel(
      new THREE.Vector3(mainCenter.x + CELL_A, 2 * BASE_H + specs[0].rimAbove, mainCenter.y),
    ),
  }

  /*
   * 取景收到 0.46：包围半径被整片脾撑到 1.5 上下，按它取景幼虫只占画面
   * 一成半。收紧后中央那格连虫带浆占满画面、脾边出画 —— 与卵、蛹两阶段
   * 同一套处理，巢脾本身一点没缩水（radius 照实报）。
   */
  return finalize(g, anchors, { frameRadius: 0.46 })
}
