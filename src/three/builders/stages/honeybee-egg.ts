/**
 * 西方蜜蜂 · 卵 Apis mellifera（完全变态第 1 阶段）
 *
 * 单位与坐标系与成虫（../honeybee.ts）一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。
 *
 * ## 这一颗卵为什么不该栽在「白椭球」上
 *
 * 第一批四颗卵里两颗栽了，栽法一样：**卵本身没有结构，语境又不可信**
 * （柞蚕蛾读成奶牛纹的土豆、独角仙读成一圈珍珠配巧克力球）。
 * 蜜蜂这一颗有全世界辨识度最高的语境 —— **六角形蜡质巢房**。
 * 所以本文件的力气六成花在巢脾上、四成花在卵上：
 *
 * 1. **房是真六边形，而且有厚度。** 对边距 5.3 毫米（工蜂房真值 5.2~5.4），
 *    房壁不是一张纸：房口处半厚 0.021~0.028（实读壁厚约 0.5 毫米），
 *    往房底渐薄。真实蜡壁只有 0.07 毫米，但**房口边缘是加厚抹圆的**，
 *    而 0.07 毫米在这个尺度上是 0.007 模型单位 —— 亚像素、还要与邻房打架，
 *    渲染出来是一片纸而不是蜡。取「加厚的房口」那一档，是在真实结构里
 *    挑一个读得出来的真实数字，不是把数字调好看。
 * 2. **房底是三枚菱形拼成的锥，不是一块平板。** 这是蜂巢最有名的结构：
 *    六个房角交替落在 h 与 2h，锥尖在房轴上，菱形钝角 109.47°。
 *    h 由外接圆半径 /(2√2) 反解（见 BASE_H），不是拍出来的数。
 *    卵就粘在这个锥尖上 —— 从房口看进去，卵脚下那三瓣菱形本身就是招牌。
 * 3. **不做成一整张规整的蜂窝。** 规整蜂窝读成装饰图案。这里 7 个房，
 *    壁厚 / 房口高度 / 蜡色逐房不同（固定种子的伪随机，不用 Math.random），
 *    房口沿周向还有起伏；最外圈有一个房**缺了朝外的两条壁**，读作掰断的脾边。
 * 4. **房只筑了一小截。** 真实工蜂房深 11~12 毫米，这里壁只高出房底外缘
 *    0.6~2 毫米。这不是缩水：**造脾时工蜂逐步加深房，蜂王在只筑了一小截的
 *    浅房里照样产卵**，新脾上一片浅房里立着卵是真实景象。而蜂卵只有 1.5 毫米，
 *    比房底那枚菱形锥自己的落差（2.2 毫米）还矮 —— 房一深，四个机位里
 *    就只剩顶视看得见它，那才是把这一阶段做没了。
 *
 * ## 卵本身
 *
 * - **长 1.5 毫米、最粗处直径约 0.38 毫米**（模型 0.15 × 0.038）：一粒极细的米，
 *   不是一颗珠子。长径比 4:1 是「这是虫卵不是鱼卵」的第一眼判据。
 * - **一端粘在房底、直立**。刚产下时直立于房底，随时间倒伏 —— 取直立那一态。
 *   基部另有一小圈**胶质**（蜂王分泌、卵靠它立着），比卵壳暗一档、亮泽一档；
 *   缺了它整粒卵会读成「悬空插在那儿」。
 * - **前端（游离端）略粗、后端（黏着端）略细，且微弯**。两头一样粗的胶囊读成零件；
 *   蜂卵实际是前粗后细、略呈弓形。
 * - **乳白微透**：`translucent` 开次表面透光，但**哑光**（gloss 0.3 / clearcoat 0.1）。
 *   乳白 + 高光会整片过曝成白铬（七星瓢虫、甘薯腊龟甲栽过），这一档是安全线。
 * - **两粒卵**：中央房一粒（本阶段主角、最直立），邻房一粒（略斜）。
 *   一粒白点可能是脏东西，两粒同形同姿就只能是卵 —— 重复本身是可读性，
 *   而真实产卵也是一房一粒、连片地产。
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
 * 取 h = 外接圆半径 /(2√2) 时菱形钝角恰为 109.47°（实测值），
 * 这条式子就是「房底为什么长这样」的全部依据，别换成好看的数。
 */
const BASE_H = CELL_RC / (2 * Math.SQRT2)

/** 单位内切圆半径的正六边形角点（第 7 个 = 第 0 个，方便按边取用） */
const CORNER: THREE.Vector2[] = Array.from({ length: 7 }, (_, k) => {
  const a = Math.PI / 6 + (k * Math.PI) / 3
  const rc = 1 / Math.cos(Math.PI / 6)
  return new THREE.Vector2(Math.cos(a) * rc, Math.sin(a) * rc)
})

/** 蜂房阵列坐标 →（x, z）。相邻房中心相距 CELL_W，方向角 0° / 60° / …… */
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
 * 房轴（模型局部坐标）。真实巢脾是**竖直**的、房口近水平并上仰约 13°；
 * 这里整片转成「房口朝上前方」，是展示取向而不是形态主张。
 * 四个验收机位（顶 / 侧 / 前斜 / 后斜）与展台默认机位都在上前方，
 * 取 (0.38, 0.76, 0.53) 时房轴与它们的夹角是 顶 29° / 侧 41° / 前斜 43° /
 * 展台默认 34°，四个都看得进房里。
 * ⚠️ 第一版取的是 (0.20, 0.79, 0.58)：顶与侧更好，但前斜机位落到 53°，
 * 出图后那一张里近侧的房壁把所有房口挡光，整张读成一团抽象的黄块 ——
 * 「四个机位都看得见招牌」这条比「某一个机位最好看」优先。
 * 后斜机位（108°）看到的是脾背 —— 那一面正是菱形房底，也是真实结构。
 */
const CELL_AXIS = new THREE.Vector3(0.38, 0.76, 0.53).normalize()

const AXIS_Q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), CELL_AXIS)

/**
 * 绕房轴的自转量。三个阶段共用同一套姿态：蛹那一阶段要靠它把纵剖口正对
 * 「侧 / 前斜 / 展台默认」三个机位，卵与幼虫沿用同一个数，
 * 只为了翻阅生活史时巢脾不会在阶段之间跳一下。
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
  // 绕 Y 转 σ 会把局部方位角 a 变成 a−σ；要让 a=0 对上剖口方向，σ = −a_cut
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
  /** 房口处的半壁厚（两房之间实读的壁厚 = 2×，相邻两房各出一半） */
  tRim: number
  /** 房底处的半壁厚 */
  tBase: number
  /**
   * 房壁高出**房底外缘**（2×BASE_H，房角最高的那一圈）多少。
   * ⚠️ 必须以房底外缘为基准、不能以锥尖为基准：房底是个交替高低的锯齿圈，
   * 按锥尖记高度时，起伏一叠上去就可能让某个房角的「口」低于「底」，
   * 那一段壁会翻过来 —— 几何合法、顶点数正常、断言全绿，渲染出来是一片乱刺。
   */
  rimAbove: number
  /** 房口沿周向的起伏幅度 */
  ripple: number
  phase: number
  /** 保留哪几条壁（整房 = 0..5）。缺边 = 掰断的脾边 */
  edges: readonly number[]
}

/** 每条边的细分数与沿高度的分层数 */
const SUB = 4
const ROWS = 3

/**
 * 一个房的蜡壁。
 *
 * **每条边自成一片、角点重复一次** —— 这样 `computeVertexNormals()` 不会把六个角
 * 磨圆。磨圆了就只剩一个杯子，而「六边形」正是这个阶段的语境骨架。
 *
 * 相邻两房的壁在中间那道缝上互相**重叠**（各自向外伸到 CELL_A + t），
 * 半厚逐房抖动，所以两层面永远不重合、不会打架；实读壁厚是 2×max(t_A, t_B)，
 * 天然「厚薄不匀」。
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
      // 房口起伏：绕一圈正好整数个周期，接缝处才连得上
      const top =
        2 * BASE_H +
        spec.rimAbove +
        spec.ripple * Math.sin((k + u) * Math.PI + spec.phase) +
        spec.ripple * 0.4 * Math.sin((k + u) * 2 * Math.PI + spec.phase * 1.7)
      for (let j = 0; j <= ROWS; j++) {
        const v = j / ROWS
        const y = THREE.MathUtils.lerp(bottom, top, v)
        // 蜡壁向房口渐厚：真实蜂房的口缘就是加厚并抹圆的那一圈
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
        // 内壁：切向 × 上 = −径向，所以 A→B→C 这个绕向的法线正好朝房心
        idx.push(vid(i, j, 0), vid(i + 1, j, 0), vid(i + 1, j + 1, 0))
        idx.push(vid(i, j, 0), vid(i + 1, j + 1, 0), vid(i, j + 1, 0))
        // 外壁：反向绕
        idx.push(vid(i, j, 1), vid(i + 1, j + 1, 1), vid(i + 1, j, 1))
        idx.push(vid(i, j, 1), vid(i, j + 1, 1), vid(i + 1, j + 1, 1))
      }
      // 口缘（法线朝上）与底缘（法线朝下）
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

/** 中肋厚度：真实蜡片约 0.1 毫米，这里给 0.22 毫米 —— 理由同房壁（见文件头第 1 条） */
const MIDRIB = 0.022

/**
 * 房底：三枚菱形拼成的锥，带厚度。
 *
 * 一面的位置只有 7 个 —— 锥尖 1 个 + 房角 6 个（交替 h / 2h）。菱形是平的，
 * 每瓣拆成两个三角形就够，不需要细分。
 *
 * ⚠️ **必须有厚度，不能做成一张零厚度的双面片。** `finalize()` 会把所有
 * 不透明材质翻成双面，零厚度的面在阴影贴图里正反两面深度完全相同，
 * 于是自己遮自己 —— 出图后房底整片刷上被面纹样的噪点，看着像模型坏了。
 * 那是出图台与几何的合谋，不是材质问题（第一批在毫米级的卵上撞过同一类假象）。
 * 给它 0.022 的实厚之后噪点消失，脾背看过去也正是这一层 —— 真实的中肋。
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
    // 房腔那一面（三瓣菱形）
    push(front[0], front[1 + i0], front[1 + i1])
    push(front[0], front[1 + i1], front[1 + i2])
    // 脾背那一面（绕向相反）
    push(back[0], back[1 + i1], back[1 + i0])
    push(back[0], back[1 + i2], back[1 + i1])
  }
  // 六条房角边上的侧壁，把两层封起来
  for (let k = 0; k < 6; k++) {
    const p0 = front[1 + k]
    const p1 = front[1 + ((k + 1) % 6)]
    const q0 = back[1 + k]
    const q1 = back[1 + ((k + 1) % 6)]
    push(p0, q0, q1)
    push(p0, q1, p1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

// ---------------------------------------------------------------- 颜色

/** 新造脾的蜡：暖蜡黄。逐房再抖一点明度，一片死板的同色读成塑料模型 */
const WAX_COLOR = '#d3a555'
/**
 * 卵壳：真正的乳白（略带暖），不压深 —— 压深就成脏灰，防过曝靠哑光材质。
 * 明度 0.94 对蜡壁的 0.58，这道 0.36 的明度差是「白米粒立在黄蜡上」的全部依据；
 * 卵只有 1.5 毫米，颜色再往蜡那一侧靠一点就彻底看不见了。
 */
const EGG_COLOR = '#f8f3e6'
/** 卵基的胶质：比卵壳暗一档、亮泽一档，是「粘住」这件事的全部表达 */
const GLUE_COLOR = '#e2d4ac'

// ---------------------------------------------------------------- 卵

/** 卵长 1.5 毫米 */
const EGG_LEN = 0.15
/** 最粗处半径（直径约 0.38 毫米，真值 0.3~0.4） */
const EGG_R = 0.019
/** 弓形弯量：笔直的胶囊读成零件 */
const EGG_BEND = 0.016

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

/** t=0 黏着端（细）→ t=1 游离端（粗而圆）。峰值刻意偏前，蜂卵不是对称胶囊 */
const EGG_PROFILE = [
  [0.0, 0.3],
  [0.06, 0.62],
  [0.16, 0.81],
  [0.34, 0.93],
  [0.55, 0.99],
  [0.72, 1.0],
  [0.85, 0.92],
  [0.93, 0.76],
  [0.98, 0.46],
  [1.0, 0.07],
] as const

/**
 * 一粒卵：沿一条微弯的中心线放样，立在给定房的房底锥尖上。
 * 轴向 = 房轴（组内局部 +Y），再按 lean 斜一点、按 azimuth 转一下 ——
 * 两粒卵的斜向不同，才不会读成两根一模一样的插棍。
 */
function eggMesh(center: THREE.Vector2, leanDeg: number, leanAzi: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const sections: Section[] = []
  const steps = 26
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(EGG_R * keyframe(EGG_PROFILE, t), 1e-4)
    // 弯在 XY 平面里，整组再绕 Y 转到 leanAzi —— 弯与斜同向才自然
    sections.push({ at: new THREE.Vector3(EGG_BEND * t * t, t * EGG_LEN, 0), ry: r, rz: r })
  }
  const body = new THREE.Mesh(loft(sections, 18), mat)
  body.name = 'egg-body'
  g.add(body)
  g.rotation.z = -THREE.MathUtils.degToRad(leanDeg)
  const holder = new THREE.Group()
  holder.rotation.y = leanAzi
  holder.add(g)
  holder.position.set(center.x, 0, center.y)
  return holder
}

/** 卵基的胶质小圈：压扁的半球，坐在房底锥尖上 */
function glueMesh(center: THREE.Vector2, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), mat)
  m.scale.set(1, 0.34, 1)
  m.position.set(center.x, 0.004, center.y)
  m.name = 'egg-glue'
  return m
}

// ---------------------------------------------------------------- 装配

/** 中央房的外圈六邻 */
const RING: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
  [1, -1],
]

export function buildHoneybeeEgg(): InsectModel {
  const g = new THREE.Group()
  const comb = new THREE.Group()
  comb.name = 'comb'
  comb.quaternion.copy(COMB_Q)
  g.add(comb)

  const rnd = prng(0x5eed01)

  const specs: CellSpec[] = []
  const cells: readonly (readonly [number, number])[] = [[0, 0], ...RING]
  for (const [q, r] of cells) {
    const outer = q !== 0 || r !== 0
    // 掰断的脾边：只发生在最外圈的一个房上，缺掉朝外的两条壁
    const broken = q === 0 && r === -1
    specs.push({
      q,
      r,
      tRim: 0.021 + rnd() * 0.007,
      tBase: 0.012 + rnd() * 0.005,
      /*
       * 只筑了一小截的新脾：壁高出房底外缘 0.6~2.0 毫米（满深真值 11~12 毫米）。
       * 中央那格刻意最浅 —— 造脾时各房深浅本来就不一，而**浅的那一格正是能
       * 看清房底那粒卵的那一格**：卵只有 1.5 毫米，比房底那枚菱形锥的
       * 落差（2.2 毫米）还矮，房一深，四个机位就只剩顶视看得见它。
       */
      rimAbove: (outer ? 0.09 : 0.055) + rnd() * (outer ? 0.11 : 0.02),
      ripple: 0.01 + rnd() * 0.014,
      phase: rnd() * Math.PI * 2,
      edges: broken ? [1, 2, 3, 4] : [0, 1, 2, 3, 4, 5],
    })
  }

  for (const spec of specs) {
    const cell = new THREE.Group()
    cell.name = 'comb-cell'
    // 逐房抖动蜡色：新造的蜡浅、用过的蜡深；一片同色读成塑料
    const shade = (rnd() - 0.5) * 0.09
    const waxMat = chitin({
      color: new THREE.Color(WAX_COLOR).offsetHSL(0, (rnd() - 0.5) * 0.05, shade),
      gloss: 0.28,
      clearcoat: 0.06,
    })
    const wall = new THREE.Mesh(cellWallGeometry(spec), waxMat)
    wall.name = 'comb-wall'
    cell.add(wall)
    // 房底走双面：脾背那一面看到的就是这三瓣菱形（真实的中肋）
    const floorMat = chitin({
      color: new THREE.Color(WAX_COLOR).offsetHSL(0, 0, shade - 0.09),
      gloss: 0.22,
      clearcoat: 0.04,
      side: THREE.DoubleSide,
    })
    const floor = new THREE.Mesh(cellFloorGeometry(spec), floorMat)
    floor.name = 'comb-floor'
    cell.add(floor)
    comb.add(cell)
  }

  // ---- 卵：乳白微透 + 哑光。绝不上清漆 —— 乳白配高光会整片过曝成白铬
  const eggMat = chitin({ color: EGG_COLOR, gloss: 0.3, clearcoat: 0.1, translucent: true })
  const glueMat = chitin({ color: GLUE_COLOR, gloss: 0.46, clearcoat: 0.18 })

  /*
   * 三粒卵，三个相邻的房各一粒。
   * 一粒白点可能是任何脏东西；三粒同形、同姿、一房一粒，就只能是卵 ——
   * 而这也正是真实的产卵格局（蜂王沿脾连片产，一房一粒）。
   * 斜度与斜向逐粒不同，否则读成三根一模一样的插棍。
   */
  const mainCenter = cellCenter(0, 0)
  const eggCells: readonly (readonly [THREE.Vector2, number, number])[] = [
    [mainCenter, 7, 0.7],
    [cellCenter(1, 0), 15, 2.4],
    [cellCenter(0, 1), 11, 4.6],
  ]
  for (const [center, lean, azi] of eggCells) {
    comb.add(glueMesh(center, glueMat))
    comb.add(eggMesh(center, lean, azi, eggMat))
  }

  const toModel = (v: THREE.Vector3) => v.clone().applyQuaternion(COMB_Q)

  const anchors: Record<string, THREE.Vector3> = {
    egg: toModel(new THREE.Vector3(mainCenter.x, EGG_LEN * 0.6, mainCenter.y)),
    cellFloor: toModel(new THREE.Vector3(mainCenter.x + CELL_A * 0.5, BASE_H * 0.8, mainCenter.y)),
    cellWall: toModel(new THREE.Vector3(mainCenter.x + CELL_A, 2 * BASE_H + specs[0].rimAbove, mainCenter.y)),
    comb: toModel(
      new THREE.Vector3(cellCenter(1, -1).x, 2 * BASE_H + specs[6].rimAbove, cellCenter(1, -1).y),
    ),
  }

  /*
   * 取景收到 0.40：包围半径被整片脾撑到 1.47，按它取景则 1.5 毫米的卵
   * 只剩画面高度的 5%，四个机位全是「一片黄格子上有个白点」。
   * 收紧后中央那格占满画面、卵约 17%，脾边出画 ——
   * 真实巢房微距照就是这么裁的，巢脾本身一点没缩水（radius 照实报）。
   * ⚠️ 再往下收（试过 0.33）卵是更大了，但画面里连一个完整的六边形都剩不下，
   * 语境一没，那粒卵又变回「一个白点」—— 收到 0.40 是这条曲线的拐点。
   */
  return finalize(g, anchors, { frameRadius: 0.4 })
}
