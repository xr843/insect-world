/**
 * 西方蜜蜂 · 蛹 Apis mellifera（完全变态第 3 阶段）
 *
 * 单位与坐标系与成虫（../honeybee.ts）一致：1 = 1 厘米真实体长，
 * +X 向前（头）、+Y 向上（背）、+Z 向右。蛹按这套坐标建好之后整体摆进巢房，
 * 头朝房口 —— 真实蜂蛹就是头朝蜡盖躺在房里的。
 *
 * ## 这个阶段全部的教学价值：一只蜜蜂的**所有部件都已经排好了，只是还没展开**
 *
 * 1. **离蛹（exarate）**。膜翅目的蛹是离蛹：翅、足、触角各自游离，
 *    只是贴在体表上，**不像鳞翅目的被蛹那样被一层壳粘死**
 *    （柞蚕蛾那一阶段做的正是被蛹，两者摆在一起就是一堂课）。
 *    所以这里的翅芽是**边缘自由的薄片**、足芽是**一根根分节的管**、
 *    触角芽是**一对折成膝状的杆**，每一件与体壁之间都留着缝。
 *    ⚠️ 区分结构靠**形**（轮廓转折、自由边、边下的阴影缝），不靠更暗的颜色 ——
 *    黑蚱蝉的翅芽比它趴着的胸背还暗，四个机位全读成「胸背上的一块污渍」。
 * 2. **复眼先显色**。真实蜂蛹的复眼比身体先变成紫褐 / 近黑，躯干还是乳白。
 *    这道色差（复眼明度 0.22 对躯干 0.87，差 0.65）是让蛹「看着像正在变成
 *    一只蜜蜂」的关键 —— 没有它就只是一枚白蜡人。头顶三枚单眼同样先显色。
 * 3. **躯干仍是乳白、哑光**。`chitin({ gloss: 0.2, clearcoat: 0.04,
 *    translucent: true })`，**绝不用 `elytra()`**：乳白 + 高光会整片过曝成
 *    白铬（七星瓢虫、甘薯腊龟甲栽过）。基色因此可以放心用真乳白，不必压深。
 * 4. **房口被工蜂封了蜡盖**。封盖子脾的蜡盖是**微凸、哑光、多孔**的褐色
 *    （蜡里掺了花粉，所以比新蜡深一档），一眼与四周的蜡壁分得开。
 *    邻房两格封着盖，**中央这格被纵向剖开、盖也只剩远侧半边** ——
 *    满深 12 毫米的房从任何机位看进去都只是一口暗井，而这个阶段要讲的
 *    全部内容都在井里。剖开是公开承认的教科书画法（柞蚕蛾茧的半剖同理），
 *    房宽、房深、房底、壁厚一个数都没改。
 *
 * ## 尺寸
 *
 * 蛹长 1.20（真值 1.2~1.5 厘米），比盘着的幼虫（体轴弧长 1.02）略长 ——
 * 幼虫化蛹前会在房里**伸直**，所以蛹是躺满一整个房的。房深也因此按真值
 * 给足：房底锥尖到房口 1.37，蛹头离蜡盖只剩 0.07。
 */
import * as THREE from 'three'
import { chitin, compoundEye, finalize, loft, type InsectModel, type Section } from '../kit'

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

// ---------------------------------------------------------------- 巢脾姿态

/**
 * 房轴（模型局部坐标），三个阶段共用。与顶 / 侧 / 前斜 / 展台默认四个机位的
 * 夹角是 29° / 41° / 43° / 34°；后斜机位看到的是脾背（菱形房底那一面）。
 */
const CELL_AXIS = new THREE.Vector3(0.38, 0.76, 0.53).normalize()

const AXIS_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), CELL_AXIS)

/**
 * 绕房轴的自转量，与另两个阶段同一个式子。
 * **这一阶段靠它对准剖口**：取「侧 / 前斜 / 展台默认」三个机位方向里垂直于
 * 房轴的那部分的平均，再解出要转多少才能让局部方位角 0° 指向那个方向。
 * 于是被切掉的三条壁（第 5、0、1 条，中线正是局部 0°）刚好背对着这三个机位，
 * 观众直接看进房里。数字是算出来的，不是试出来的。
 */
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
  /**
   * 保留哪几条壁。整房 = 0..5；纵剖开的那格只留 1,2,3。
   * ⚠️ 是 1,2,3 不是 2,3,4：角点在 30°+60k，所以**第 k 条边的中线在 60°+60k**，
   * 不是 60k。第一版按 60k 记，切口整整偏了 60° —— 几何合法、断言全绿，
   * 出图后前斜机位里那只蛹被自己房的壁挡得只剩几根足尖，查了三轮才发现是这个。
   */
  edges: readonly number[]
}

const SUB = 4
const ROWS = 5

/**
 * 剖面：整块脾被一刀顺着 x=0 这个平面切开，**近侧（+X）的蜡全部削到房底**。
 *
 * 为什么必须削掉整个近侧，而不是只把中央那格开半边：相邻两房共用一堵壁，
 * 中央那格的近侧壁撤了，**邻房自己那一侧的壁还立在原地**，照样把视线挡死
 * （第一版实测：前斜机位里蛹只露出几根足尖）。刀是切整块脾的，不是切一格。
 *
 * 削掉之后近侧几格仍留着房底与一圈 0.5 毫米的矮壁 —— 这既是刀口该有的样子，
 * 也让 `finalize()` 的包围盒重新对称：只保留远侧半圈的话模型「重心」整个偏出去，
 * 中央那格会被挤到画面角上，主角站在边上。
 *
 * 剖是公开承认的画法（柞蚕蛾茧的半剖同理）：房宽、房深、房底、壁厚一个数都没改。
 */
/** 刀口过渡带宽度：不留一点过渡的话，切口是一道数学上的直角，读起来像塑料件 */
const CUT_FADE = 0.06
/** 削到最低时仍保留的一圈矮壁高度（高出房底外缘） */
const MIN_WALL = 0.05

/** 房壁在轮廓参数 t（0..6，整数处为房角）上的口沿高度，已经过刀口 */
function rimHeight(spec: CellSpec, t: number): number {
  const k = Math.floor(t) % 6
  const u = t - Math.floor(t)
  const gx = cellCenter(spec.q, spec.r).x + THREE.MathUtils.lerp(CORNER[k].x, CORNER[k + 1].x, u) * CELL_A
  const grown =
    2 * BASE_H +
    spec.rimAbove +
    spec.ripple * Math.sin(t * Math.PI + spec.phase) +
    spec.ripple * 0.4 * Math.sin(t * 2 * Math.PI + spec.phase * 1.7)
  const floorLevel = 2 * BASE_H + MIN_WALL
  const limit = THREE.MathUtils.lerp(grown, floorLevel, THREE.MathUtils.smoothstep(gx, 0, CUT_FADE))
  return Math.max(Math.min(grown, limit), floorLevel)
}

/**
 * 一个房的蜡壁。每条边自成一片、角点重复一次 —— `computeVertexNormals()`
 * 因此不会把六个角磨圆，六边形才读得出是六边形。
 * 相邻两房的壁互相重叠、半厚逐房抖动，实读壁厚 2×max(t_A, t_B)，天然厚薄不匀。
 *
 * 只保留部分边时（纵剖开的那格），两端补一片**刀口断面** ——
 * 露出蜡壁的厚度，读作「这里是被切开的」，而不是「这里的壁凭空没了」。
 */
function cellWallGeometry(spec: CellSpec): THREE.BufferGeometry {
  const c = cellCenter(spec.q, spec.r)
  const pos: number[] = []
  const idx: number[] = []
  const p = new THREE.Vector2()
  const bases: number[] = []

  for (const k of spec.edges) {
    const base = pos.length / 3
    bases.push(base)
    for (let i = 0; i <= SUB; i++) {
      const u = i / SUB
      p.copy(CORNER[k]).lerp(CORNER[k + 1], u)
      const bottom = floorY(k, u)
      const top = rimHeight(spec, k + u)
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

  if (spec.edges.length < 6) {
    // 刀口断面：第一条边的 i=0 那一列、最后一条边的 i=SUB 那一列，各封一片
    const ends: [number, number][] = [
      [bases[0], 0],
      [bases[bases.length - 1], SUB],
    ]
    for (const [base, i] of ends) {
      const vid = (j: number, shell: 0 | 1) => base + (i * (ROWS + 1) + j) * 2 + shell
      for (let j = 0; j < ROWS; j++) {
        idx.push(vid(j, 0), vid(j, 1), vid(j + 1, 1))
        idx.push(vid(j, 0), vid(j + 1, 1), vid(j + 1, 0))
      }
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

/** 蜡盖凸起高度：工蜂子的封盖是**微凸**的（雄蜂子才高高鼓起） */
const CAP_RISE = 0.055
/** 蜡盖厚度：真实约 0.3 毫米 */
const CAP_T = 0.03

/**
 * 蜡盖：盖在房口上的一枚微凸六角薄壳，可以只封一段方位（剖开那格只剩远侧半边）。
 *
 * 带 uv —— 蜡盖是这片脾上唯一挂 `surface: 'punctate'` 的件：真实的封盖子脾
 * 表面是**多孔**的（蜡里掺花粉、留着透气的细孔），刻点图正是它。
 * 其余几何都不挂贴图，所以没有 uv 也无所谓，这一件不行。
 */
function cellCapGeometry(spec: CellSpec, span: readonly [number, number]): THREE.BufferGeometry {
  const c = cellCenter(spec.q, spec.r)
  const NT = 24
  const NS = 4
  const outer = CELL_A + spec.tRim
  let meanRim = 0
  for (let i = 0; i <= NT; i++) meanRim += rimHeight(spec, THREE.MathUtils.lerp(span[0], span[1], i / NT))
  meanRim /= NT + 1
  const domeTop = meanRim + CAP_RISE

  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const p = new THREE.Vector2()
  for (let i = 0; i <= NT; i++) {
    const t = THREE.MathUtils.lerp(span[0], span[1], i / NT)
    const k = Math.floor(t) % 6
    const u = t - Math.floor(t)
    p.copy(CORNER[k]).lerp(CORNER[k + 1], u)
    const rim = rimHeight(spec, t)
    for (let j = 0; j <= NS; j++) {
      const s = j / NS
      const y = THREE.MathUtils.lerp(domeTop, rim, s * s)
      for (const shell of [0, 1] as const) {
        pos.push(c.x + p.x * outer * s, y - shell * CAP_T, c.y + p.y * outer * s)
        uv.push(i / NT, s)
      }
    }
  }
  const vid = (i: number, j: number, shell: 0 | 1) => (i * (NS + 1) + j) * 2 + shell
  for (let i = 0; i < NT; i++) {
    for (let j = 0; j < NS; j++) {
      idx.push(vid(i, j, 0), vid(i + 1, j, 0), vid(i + 1, j + 1, 0))
      idx.push(vid(i, j, 0), vid(i + 1, j + 1, 0), vid(i, j + 1, 0))
      idx.push(vid(i, j, 1), vid(i + 1, j + 1, 1), vid(i + 1, j, 1))
      idx.push(vid(i, j, 1), vid(i, j + 1, 1), vid(i + 1, j + 1, 1))
    }
    // 外缘的厚度带
    idx.push(vid(i, NS, 0), vid(i + 1, NS, 1), vid(i, NS, 1))
    idx.push(vid(i, NS, 0), vid(i + 1, NS, 0), vid(i + 1, NS, 1))
  }
  // 半封时两端的断面
  if (span[1] - span[0] < 6) {
    for (const i of [0, NT]) {
      for (let j = 0; j < NS; j++) {
        idx.push(vid(i, j, 0), vid(i, j, 1), vid(i, j + 1, 1))
        idx.push(vid(i, j, 0), vid(i, j + 1, 1), vid(i, j + 1, 0))
      }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// ---------------------------------------------------------------- 颜色

/** 蜡壁：子脾上用过的蜡，比新脾深一档 */
const WAX_COLOR = '#cb9c4c'
/** 蜡盖：掺了花粉的封盖蜡，明显更深更闷（明度 0.40 对蜡壁 0.55） */
const CAP_COLOR = '#9c6c30'
/** 躯干：真正的乳白。不压深 —— 防过曝靠哑光 + 次表面透光 */
const BODY_COLOR = '#ece2cf'
/** 复眼：紫褐。蜂蛹的复眼比身体先显色，这道明度差是本阶段最强的对比 */
const EYE_COLOR = '#4b2340'
/** 翅芽：比躯干略沉一点点。**结构靠自由边与边下的缝去读，不靠压暗** */
const WING_COLOR = '#ddd0b4'
/** 足芽与触角芽：与躯干同色系，略深，靠形分辨 */
const LIMB_COLOR = '#e2d7bd'
/** 上颚：极浅的琥珀 */
const MOUTH_COLOR = '#d3c095'

// ---------------------------------------------------------------- 蛹本体

/** 蛹长（真值 1.2~1.5 厘米）。头端在 +X，腹末在 −X */
const PUPA_LEN = 1.2
const pupaX = (p: number) => -PUPA_LEN / 2 + p * PUPA_LEN
/** 可见腹节数 */
const ABD_SEGS = 6
/** 腹部占体长的比例（p < 这个值是腹部） */
const ABD_END = 0.55

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
 * 体半径包络：腹末圆钝 → 腹部渐粗 → 颈部收一道 → 头部再鼓一点。
 * 那道**颈**（p≈0.845 收到 0.098）是把「头 / 胸 / 腹三段」读出来的关键；
 * 一根从头到尾平滑的纺锤只会读成一颗蚕豆。
 */
const ENVELOPE = [
  [0.0, 0.018],
  [0.035, 0.058],
  [0.1, 0.098],
  [0.22, 0.13],
  [0.36, 0.146],
  [0.48, 0.148],
  [0.55, 0.142],
  [0.62, 0.15],
  [0.72, 0.153],
  [0.8, 0.128],
  [0.845, 0.09],
  [0.88, 0.108],
  [0.94, 0.112],
  [0.98, 0.072],
  [1.0, 0.016],
] as const

/** 腹节间的窄折痕。只刻在腹部，胸与头是融合光滑的一整块 —— 这个前后对比本身就是识别特征 */
function abdomenCrease(p: number): number {
  if (p > ABD_END) return 1
  const local = ((p / ABD_END) * ABD_SEGS) % 1
  const crease = Math.pow(Math.abs(Math.cos(local * Math.PI)), 6)
  const fade = THREE.MathUtils.clamp(p / 0.06, 0, 1) * THREE.MathUtils.clamp((ABD_END - p) / 0.05, 0, 1)
  return 1 - 0.095 * crease * fade + 0.03 * Math.sin(local * Math.PI) * fade
}

function bodyRadius(p: number): number {
  return Math.max(keyframe(ENVELOPE, p) * abdomenCrease(p), 1e-4)
}

function pupaBodyGeometry(): THREE.BufferGeometry {
  const steps = 150
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const p = i / steps
    const r = bodyRadius(p)
    // 背腹略高于左右：蜂的胸腹在侧面看比俯视看更高
    sections.push({ at: new THREE.Vector3(pupaX(p), 0, 0), ry: r * 1.03, rz: r * 0.96 })
  }
  return loft(sections, 26)
}

/**
 * 一根分节的附肢（足芽 / 触角芽）：沿几个控制点放样的锥管。
 *
 * 离蛹的足与触角是**游离**的，所以每一根都与体壁留着缝（控制点的 y 都在
 * 体壁包络之外）。⚠️ 不能用 `kit.leg()`：那是给站立的成虫算姿势的，
 * 它内部固有一个向上的分量；而且打了骨架标记，`finalize()` 会给蛹收出一个
 * `rig` 来，展台的静息微动就会让一只蛹在房里活动腿 —— 蛹不动，这是硬的。
 */
function limbTube(pts: readonly THREE.Vector3[], r0: number, r1: number, mat: THREE.Material, name: string): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts.map((v) => v.clone()), false, 'catmullrom', 0.4)
  const steps = 24
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(r0, r1, Math.pow(t, 0.8))
    sections.push({ at: curve.getPoint(t), ry: r, rz: r })
  }
  const m = new THREE.Mesh(loft(sections, 10), mat)
  m.name = name
  return m
}

/**
 * 一片翅芽：沿翅轴放样的**扁片**，截面 ry = 半宽、rz = 半厚，再用 roll
 * 把片面绕翅轴转到「斜贴在体侧腹面」。
 *
 * 之所以让片面斜着而不是纯竖直：蛹的腹面正对剖口（也就是正对机位），
 * 纯竖直的片在这几个机位下只剩一条线，「一片翅」就没了。
 * 斜贴既是真实姿态，也是唯一读得出「片」的姿态。
 */
function wingPad(
  pts: readonly THREE.Vector3[],
  halfWidths: readonly number[],
  thick: number,
  rollDeg: number,
  mat: THREE.Material,
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts.map((v) => v.clone()), false, 'catmullrom', 0.4)
  const steps = 26
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const w = keyframe(
      halfWidths.map((v, k) => [k / (halfWidths.length - 1), v] as const),
      t,
    )
    sections.push({
      at: curve.getPoint(t),
      ry: Math.max(w, 1e-4),
      rz: thick,
      roll: THREE.MathUtils.degToRad(rollDeg),
    })
  }
  const m = new THREE.Mesh(loft(sections, 16), mat)
  m.name = 'pupa-wing-bud'
  return m
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/**
 * 蛹本体（右半侧建好，左半侧整组翻 `scale.z = -1`）。
 *
 * ⚠️ 翻 scale.z 的那个 group **不能带旋转**：矩阵是 T·R·S，缩放先作用于
 * 局部向量，带旋转时翻 z 不是镜像（独角仙蛹的三片翅芽因此一起指向 +Z，
 * 成了悬空的剪纸）。这里的附肢几何全是绝对坐标、group 只有 scale，安全。
 */
function pupaGroup(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'pupa'

  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.2, clearcoat: 0.04, translucent: true })
  const wingMat = chitin({ color: WING_COLOR, gloss: 0.3, clearcoat: 0.08, translucent: true })
  const limbMat = chitin({ color: LIMB_COLOR, gloss: 0.26, clearcoat: 0.05 })
  const mouthMat = chitin({ color: MOUTH_COLOR, gloss: 0.3, clearcoat: 0.1 })

  const body = new THREE.Mesh(pupaBodyGeometry(), bodyMat)
  body.name = 'pupa-body'
  g.add(body)

  // ---- 复眼：整只蛹上唯一显了色的部件
  const eyes = compoundEye({ at: [0.5, 0.012, 0.076], radius: 0.062, color: EYE_COLOR, flatten: 1.42, stretch: 0.92 })
  const eyesL = compoundEye({ at: [0.5, 0.012, -0.076], radius: 0.062, color: EYE_COLOR, flatten: 1.42, stretch: 0.92 })
  for (const e of [eyes, eyesL]) {
    e.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.name = 'pupa-eye'
    })
    g.add(e)
  }

  // ---- 头顶三枚单眼：同样先显色，是「复眼先变色」这条规律的第二个证据
  const ocellusMat = chitin({ color: EYE_COLOR, gloss: 0.6, clearcoat: 0.5 })
  for (const [x, z] of [
    [0.487, 0],
    [0.462, 0.035],
    [0.462, -0.035],
  ] as const) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.017, 10, 8), ocellusMat)
    o.position.set(x, 0.098, z)
    o.scale.set(1, 0.6, 1)
    o.name = 'pupa-ocellus'
    g.add(o)
  }

  // ---- 右半侧的成对部件
  const half = new THREE.Group()

  /*
   * 前翅芽：自胸侧起、向后盖到第 3 腹节，中段最宽。
   * 末端不收成针 —— 蛹的翅芽是一片**边缘游离的短壳**，尖了就读成一根刺。
   */
  half.add(
    wingPad(
      [V(0.36, 0.075, 0.095), V(0.24, 0.05, 0.152), V(0.09, 0.025, 0.168), V(-0.06, 0.0, 0.156)],
      [0.026, 0.082, 0.098, 0.07, 0.018],
      0.012,
      -38,
      wingMat,
    ),
  )
  // 后翅芽：更短更窄，压在前翅芽下面偏腹侧一点
  half.add(
    wingPad(
      [V(0.26, 0.005, 0.108), V(0.15, -0.025, 0.152), V(0.02, -0.05, 0.146)],
      [0.022, 0.056, 0.04, 0.012],
      0.01,
      -52,
      wingMat,
    ),
  )

  /*
   * 三对足芽：折在腹面，前 / 中 / 后依次向后排。
   * 每一根都有「腿节—胫节—跗节」三折，而不是一根光滑的香蕉 ——
   * 「所有部件都已经排好了」这句话就靠这三折说出来。
   */
  /*
   * ⚠️ 足到房轴的**径向**距离必须小于房底的内切半径 0.265，而径向距离是
   * 腹面外伸量与体侧外伸量的**平方和开根**，不是其中任何一个。
   * 第一版只卡了腹面那一项（0.228）、忘了体侧还有 0.14，合起来 0.268 + 管半径，
   * 三对足尖直接穿出蜡壁挂在房外 —— 顶点数、包围盒、材质断言全绿，
   * 只有出图和「附肢全在房里」那条断言看得见。
   */
  const LEGS: readonly (readonly [THREE.Vector3[], number, number])[] = [
    [
      [V(0.34, -0.084, 0.052), V(0.44, -0.124, 0.086), V(0.46, -0.166, 0.092), V(0.34, -0.184, 0.084), V(0.2, -0.17, 0.058)],
      0.026,
      0.009,
    ],
    [
      [V(0.19, -0.106, 0.066), V(0.3, -0.148, 0.104), V(0.31, -0.19, 0.11), V(0.1, -0.2, 0.098), V(-0.06, -0.178, 0.07)],
      0.028,
      0.0095,
    ],
    [
      [V(0.06, -0.112, 0.07), V(0.17, -0.158, 0.112), V(0.18, -0.196, 0.12), V(-0.11, -0.204, 0.106), V(-0.31, -0.172, 0.078)],
      0.03,
      0.01,
    ],
  ]
  for (const [pts, r0, r1] of LEGS) half.add(limbTube(pts, r0, r1, limbMat, 'pupa-leg-bud'))

  /*
   * 触角芽：自颜面伸出、向前下折一道**膝**再折回贴着头胸腹面 ——
   * 膝状触角是蜜蜂成虫最好认的部件之一，蛹上已经折好了。
   */
  half.add(
    limbTube(
      [V(0.555, -0.04, 0.045), V(0.615, -0.09, 0.062), V(0.5, -0.15, 0.072), V(0.32, -0.168, 0.066)],
      0.02,
      0.0095,
      limbMat,
      'pupa-antenna-bud',
    ),
  )

  // 上颚：颜面前下方的一对小钳，浅琥珀
  half.add(limbTube([V(0.585, -0.055, 0.026), V(0.625, -0.085, 0.028), V(0.6, -0.105, 0.014)], 0.018, 0.007, mouthMat, 'pupa-mandible'))

  const mirrored = new THREE.Group()
  mirrored.scale.z = -1
  for (const child of [...half.children]) mirrored.add(child.clone())
  g.add(half, mirrored)

  return g
}

// ---------------------------------------------------------------- 装配

export function buildHoneybeePupa(): InsectModel {
  const g = new THREE.Group()
  const comb = new THREE.Group()
  comb.name = 'comb'
  comb.quaternion.copy(COMB_Q)
  g.add(comb)

  const rnd = prng(0x5eed03)

  /*
   * 7 个房（中央 1 + 外圈 6），全部按真深筑起，再被 x=0 那一刀切过
   * （见 rimHeight）：远侧三格完好并封着蜡盖，近侧三格削到只剩房底与一圈矮壁，
   * 中央那格正好被切成两半，只留远侧的第 1/2/3 条壁。
   *
   * 于是画面上同时有三件事：满深封盖的子脾、被切开的房、以及房里的那只蛹。
   */
  const specs: CellSpec[] = []
  const CELLS: readonly (readonly [number, number])[] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [0, -1],
    [1, -1],
  ]
  for (const [q, r] of CELLS) {
    const main = q === 0 && r === 0
    specs.push({
      q,
      r,
      tRim: 0.021 + rnd() * 0.007,
      tBase: 0.012 + rnd() * 0.005,
      // 房深按真值给足：房底锥尖到房口 1.37（真值 11~12 毫米），之后交给刀口去削
      rimAbove: 1.15 + rnd() * 0.06,
      ripple: 0.014 + rnd() * 0.016,
      phase: rnd() * Math.PI * 2,
      edges: main ? [1, 2, 3] : [0, 1, 2, 3, 4, 5],
    })
  }

  const capMat = chitin({ color: CAP_COLOR, gloss: 0.16, clearcoat: 0.02, surface: 'punctate' })

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

    const main = spec.q === 0 && spec.r === 0
    // 只有刀口没削到的那几格才封得住盖：削过的房口已经不成一个口了
    const capped = cellCenter(spec.q, spec.r).x <= -0.2
    if (capped || main) {
      /*
       * 中央那格的盖只剩当中一小段：剖面把近侧半边连壁带盖一起切走了，
       * 剩下的那半边又被「挑开」了两头 —— 养蜂人查子脾就是这么挑开一格看的。
       * （顶视机位仍然主要看到的是一片棕色的封盖：那一张讲的是「封盖子脾」，
       * 蛹本身交给侧机位、前斜机位与展台默认机位去讲。）
       */
      const cap = new THREE.Mesh(cellCapGeometry(spec, main ? [1.55, 3.45] : [0, 6]), capMat)
      cap.name = 'comb-cap'
      cell.add(cap)
    }
    comb.add(cell)
  }

  /*
   * 把蛹摆进中央那格：体轴（+X）对房轴（+Y，头朝房口），
   * 背面（+Y）朝远侧房壁、腹面朝剖口 —— 翅芽、足芽、触角芽全在腹面，
   * 不这么转的话它们正对着那半圈没被切掉的壁，等于白做。
   */
  const pupa = pupaGroup()
  const fwd = new THREE.Vector3(0, 1, 0)
  const dorsal = new THREE.Vector3(-1, 0, 0)
  const right = new THREE.Vector3().crossVectors(fwd, dorsal)
  pupa.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(fwd, dorsal, right))
  const mainCenter = cellCenter(0, 0)
  /** 蛹在房里的高度：头端离蜡盖约 0.07，腹末落在房底锥面上方 */
  const PUPA_BASE_Y = 0.7
  pupa.position.set(mainCenter.x, PUPA_BASE_Y, mainCenter.y)
  comb.add(pupa)

  const toModel = (v: THREE.Vector3) => v.clone().applyQuaternion(COMB_Q)
  /** 蛹局部坐标 → 巢脾局部坐标 */
  const fromPupa = (x: number, y: number, z: number) =>
    new THREE.Vector3(x, y, z).applyQuaternion(pupa.quaternion).add(pupa.position)

  const anchors: Record<string, THREE.Vector3> = {
    eye: toModel(fromPupa(0.5, 0.012, 0.14)),
    wingBud: toModel(fromPupa(0.0, 0.015, 0.2)),
    legBud: toModel(fromPupa(0.11, -0.2, 0.1)),
    antennaBud: toModel(fromPupa(0.5, -0.16, 0.075)),
    cap: toModel(
      new THREE.Vector3(
        cellCenter(-1, 1).x,
        2 * BASE_H + specs[3].rimAbove + CAP_RISE,
        cellCenter(-1, 1).y,
      ),
    ),
  }

  /*
   * 取景收到 0.78：包围半径被整片脾撑到 1.4 上下，按它取景蛹只占画面四成。
   * 收紧后蛹占七成、脾边出画 ——
   * 与卵、幼虫两阶段同一套处理，巢脾本身一点没缩水（radius 照实报）。
   */
  return finalize(g, anchors, { frameRadius: 0.78 })
}
