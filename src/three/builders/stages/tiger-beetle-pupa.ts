/**
 * 中华虎甲 · 蛹 Cicindela chinensis（完全变态第 3 阶段）
 *
 * ## 在洞底的蛹室里，仰躺在自己背上的一排刺上
 *
 * 末龄幼虫把洞口封住，在洞底（或洞底侧挖的一个小室）里化蛹。蛹是**离蛹**：
 * 触角、足、翅芽各自成形、离开体壁，乳白色，还没有一点成虫的金属光泽。
 * 蛹室的土是潮的，而蛹壳软、一碰就伤 —— 虎甲蛹的办法是**腹部背面长着几对
 * 长刺突**，仰躺时靠刺尖把身子撑离室底，只有刺尖着地。本文件的三条主线：
 *
 * 1. **背刺把蛹撑离室底**：腹部第 2~5 节背面各一对，长 0.2、尖端一根深色刚毛。
 *    蛹仰躺（整体绕体轴翻 180°），全身最低的一圈点全是刺尖，蛹体与室底之间
 *    留着一道看得见的空隙 —— 这道缝就是刺突存在的理由，测试专门量它。
 *    ⚠️ 依据说明：刺突的对数与所在腹节，各属之间有差别，公开资料里找到的
 *    描述不够细（只确认了「背面有成对的刺突/突起、用于支撑」这一层），
 *    这里取「第 2~5 腹节、4 对」是示意性的，不是逐节核对过的计数。
 * 2. **成虫的雏形已经看得见**：头宽于前胸、两侧一对**大复眼**（半径 0.11，
 *    已开始变深的灰褐 —— 乳白的蛹上只靠隆起读不出眼）；前胸窄成细腰；
 *    头前一对张开的**镰刀状上颚芽** —— 成虫最戏剧性的两处特征
 *    （`tiger-beetle.ts` 的大复眼与 sickleJaws）在这里都有了雏形；
 *    三对足各自折成紧凑的 V、贴着腹面从前往后排开 —— 离蛹「附肢已分开成形、
 *    折好贴在身上」的教学点。
 * 3. **仰躺**：离蛹的附肢全折在腹面，仰躺正好把它们翻到上面，顶视机位一眼
 *    看得见三对折起的足、翅芽和沿体侧后伸的触角。
 *
 * ## 室底与蜕下的幼虫皮
 *
 * 室底是一小片潮湿的深色土（比洞口的沙暗一档：洞底是湿的），浅碗形。
 * 腹末一侧留着**蜕下的幼虫皮**：皱成一团的苍白表皮，上面仍连着那块深色的
 * 头与前胸背板 —— 幼虫最显眼的「盘子」在蛹室里还认得出来，把上一阶段
 * 接进了这张图（与 `ladybird-pupa.ts` 腹末那团旧皮是同一个用意）。
 *
 * ## 不做蛹室的顶与壁
 *
 * 蛹室是封闭的土室，做全了就把蛹整个包起来。判据与 `longhorn-beetle-pupa.ts`
 * 不做蛹室是同一条：哪种做法能让招牌被看见。只留室底，交代「躺在土里」即可。
 *
 * ## 颜色纪律
 *
 * 乳白（`#f2e7cc`，明度 0.87）不压深；附肢比体色深一档（明度 0.78~0.80）才在
 * 同为浅色的体壁上分得出轮廓。不开 translucent —— 天牛幼虫那一轮，长直体
 * 开了透射整条被渲成一块透镜。
 *
 * 尺寸：体长 1.52 厘米（真实 1.4~1.7），比成虫（约 1.9）略短。
 * 局部坐标系与成虫一致：+X 向前（头）、+Y 向上、+Z 向右（仰躺翻转前）。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体形

/** 体形包络（x → 半径）：腹部宽，胸—腹交界、前胸（细腰）两处缢缩，头又宽起来 */
const BODY_ENV = [
  [-0.78, 0.03],
  [-0.72, 0.1],
  [-0.6, 0.16],
  [-0.42, 0.22],
  [-0.18, 0.255],
  [0.0, 0.255],
  [0.1, 0.235],
  [0.2, 0.19],
  [0.26, 0.16],
  [0.36, 0.17],
  [0.44, 0.145],
  [0.5, 0.165],
  [0.58, 0.2],
  [0.66, 0.19],
  [0.72, 0.13],
  [0.76, 0.04],
] as const
const BODY_FRONT = 0.76
const BODY_REAR = -0.78

/** 腹部 7 节，从胸腹交界到腹末 */
const ABD_FROM = 0.02
const ABD_TO = -0.74
const ABD_SEGMENTS = 7
/**
 * 节间沟：深 8%、宽而软（`|cos|^3`）。第一版 6%、`|cos|^6` 的窄折痕在乳白体上
 * 几乎看不出来，整只蛹读成一块光滑的肥皂。蛹是软的，分节该是一圈圈缓起伏而不是刻痕；
 * 深度仍压在松果红线（9%）以下
 */
const ABD_GROOVE = 0.08

/** 横截面：背腹略扁 */
const FLAT_Y = 0.9
const FLAT_Z = 1.05

/** 仰躺：绕体轴翻 180°，腹面朝上 */
const ROLL_DEG = 180

/** 背刺：所在腹节（1 起算）、离背中线的角度、长度 */
const PROCESS_SEGMENTS = [2, 3, 4, 5] as const
const PROCESS_BETA = 142
const PROCESS_LEN = 0.2

// ---------------------------------------------------------------- 颜色

/** 蛹体：乳白（明度 0.87），不压深 */
const BODY_COLOR = '#f2e7cc'
/** 附肢：比体色深一档（明度 0.71，差 0.16；第一版 0.76 的足在乳白体上糊成一片） */
const APPENDAGE_COLOR = '#dcc18e'
const PAD_COLOR = '#e8d6ab'
/**
 * 复眼：灰褐（明度 0.41，饱和 0.19），与体色差 0.46。
 * 甲虫蛹的眼随发育由白转深；虎甲蛹具体经过什么色没查到可靠描述，所以不取第一版那种
 * 饱和的番茄红褐，取「正在变深」的中性灰褐
 */
const EYE_COLOR = '#7c6655'
/** 上颚芽：浅琥珀，比附肢再深一档 */
const JAW_COLOR = '#caa064'
/** 刺尖刚毛 */
const SETA_COLOR = '#6b5436'
/** 室底：潮湿的深色土（明度 0.33） */
const FLOOR_COLOR = '#6e5a42'
/** 幼虫皮：干缩的苍白表皮；头盘：与幼虫同一古铜绿 */
const EXUVIA_COLOR = '#d6c7a2'
const EXUVIA_SHIELD_COLOR = '#56603a'

// ---------------------------------------------------------------- 小工具

function keyframe(keys: readonly (readonly [number, number])[], t: number): number {
  const x = THREE.MathUtils.clamp(t, keys[0][0], keys[keys.length - 1][0])
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

function abdomenCrease(x: number): number {
  if (x > ABD_FROM || x < ABD_TO) return 1
  const p = ((ABD_FROM - x) / (ABD_FROM - ABD_TO)) * ABD_SEGMENTS
  return 1 - ABD_GROOVE * Math.pow(Math.abs(Math.cos(p * Math.PI)), 3)
}

function bodyRadius(x: number): number {
  return keyframe(BODY_ENV, x) * abdomenCrease(x)
}

/** 包络的分段线性插值 */
function envLinear(x: number): number {
  const k = BODY_ENV
  if (x <= k[0][0]) return k[0][1]
  for (let i = 1; i < k.length; i++) {
    if (x <= k[i][0]) return THREE.MathUtils.lerp(k[i - 1][1], k[i][1], (x - k[i - 1][0]) / (k[i][0] - k[i - 1][0]))
  }
  return k[k.length - 1][1]
}

/**
 * 附肢落位用的包络：分段线性再做一次滑动平均，**不含节间折痕**。
 *
 * 不能直接用 `keyframe()`：它在每一对关键帧之间走 smoothstep，两端导数为零，
 * 于是包络在每个关键帧处都「停一下」—— 蛹体上看不出来，可沿体轴走的后足、
 * 触角离体壁有一段净空，这点起伏被放大成一条波浪线（第一版出图，沿体侧两道
 * 蛇形的线）。折痕同理不能算进来。
 */
function envSmooth(x: number): number {
  let sum = 0
  const n = 9
  for (let i = 0; i < n; i++) sum += envLinear(x + ((i / (n - 1)) * 2 - 1) * 0.06)
  return sum / n
}

/** 体壁在方位角 β（从腹中线量）处的向径（附肢落位用，见 envSmooth） */
function wallR(x: number, betaDeg: number): number {
  const r = envSmooth(x)
  const b = THREE.MathUtils.degToRad(betaDeg)
  return 1 / Math.hypot(Math.cos(b) / (r * FLAT_Y), Math.sin(b) / (r * FLAT_Z))
}

/**
 * 体表外一点：`x` 处、离腹中线 `betaDeg` 度、离体壁 `extra` 远（翻转前的体坐标）。
 * 足、翅芽、触角、背刺全部按它落位 —— 「离体壁多远」只有这一个来源。
 */
function shell(x: number, betaDeg: number, extra: number, side: 1 | -1): THREE.Vector3 {
  const r = wallR(x, betaDeg) + extra
  const b = THREE.MathUtils.degToRad(betaDeg)
  return new THREE.Vector3(x, -r * Math.cos(b), side * r * Math.sin(b))
}

function tube(pts: THREE.Vector3[], r0: number, r1: number, radial = 10): THREE.BufferGeometry {
  const sections: Section[] = pts.map((at, i) => {
    const r = THREE.MathUtils.lerp(r0, r1, i / (pts.length - 1))
    return { at, ry: r, rz: r }
  })
  return loft(sections, radial)
}

function bezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, steps: number): THREE.Vector3[] {
  const out: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    out.push(new THREE.Vector3().addScaledVector(p0, u * u).addScaledVector(p1, 2 * u * t).addScaledVector(p2, t * t))
  }
  return out
}

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------- 蛹体

/** 躯干：一条放样走完头—胸—腹，缢缩写在包络里（拼段会在交界露出封口盘） */
function bodyMesh(material: THREE.Material): THREE.Mesh {
  const steps = 200
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const x = THREE.MathUtils.lerp(BODY_REAR, BODY_FRONT, i / steps)
    const r = Math.max(bodyRadius(x), 1e-4)
    sections.push({ at: new THREE.Vector3(x, 0, 0), ry: r * FLAT_Y, rz: r * FLAT_Z })
  }
  const mesh = new THREE.Mesh(loft(sections, 28), material)
  mesh.name = 'pupa-body'
  return mesh
}

/** 大复眼：头两侧一对鼓出的半球，已显色 */
function eyes(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const at = shell(0.61, 92, -0.035, side)
    const out = new THREE.Vector3(0, at.y, at.z).normalize()
    const third = new THREE.Vector3(1, 0, 0).cross(out).normalize()
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), material)
    m.name = 'pupa-eye'
    m.position.copy(at)
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), out, third))
    m.scale.set(1.05, 0.62, 1.0)
    g.add(m)
  }
  return g
}

/**
 * 上颚芽：头前一对镰刀，先向外凸、再向内弯，尖端收向中线但**不交叉**。
 *
 * 成虫的 sickleJaws 是尖端交叉的；第一版照抄，结果在展台默认机位（右前上方）
 * 两支颚沿视线叠成一根角 —— 与锹甲蛹那一次一模一样。蛹期颚芽是软的、还没合拢，
 * 做成张开的一对既真实，也让两支在任何机位都分得开：中段各自外凸到 ±0.22，
 * 两颚之间最窄处仍留 0.07 的缝。
 */
function jawBuds(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const pts = bezier(
      new THREE.Vector3(0.7, -0.05, side * 0.09),
      new THREE.Vector3(0.88, -0.07, side * 0.32),
      new THREE.Vector3(1.0, -0.1, side * 0.035),
      16,
    )
    const m = new THREE.Mesh(tube(pts, 0.045, 0.01, 10), material)
    m.name = 'pupa-jaw-bud'
    g.add(m)
  }
  return g
}

// ---------------------------------------------------------------- 触角

/**
 * 触角：自复眼内侧出发，**沿体侧**（β 70~82，介于足的膝与翅芽之间）贴着体壁
 * 往后走到腹基。第一版先抬到离体壁 0.12 再落回，还斜穿过腹面，读成横在足上的一根杆。
 */
function antenna(side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const pts: THREE.Vector3[] = []
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(0.64, -0.3, t)
    const beta = THREE.MathUtils.lerp(70, 82, THREE.MathUtils.smoothstep(t, 0, 0.3))
    pts.push(shell(x, beta, 0.02, side))
  }
  // 11 节：半径按节点收一下
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]))
  const total = cum[cum.length - 1]
  const sections: Section[] = pts.map((at, i) => {
    const s = cum[i] / total
    const node = Math.pow(Math.abs(Math.cos(s * 11 * Math.PI)), 6)
    const r = THREE.MathUtils.lerp(0.03, 0.018, s) * (1 - 0.2 * node)
    return { at, ry: r, rz: r }
  })
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'pupa-antenna'
  return mesh
}

// ---------------------------------------------------------------- 翅芽

/** 翅芽所在方位角（离腹中线）：体侧偏背，让出 β 90° 以内给足与触角 */
const PAD_BETA = 120
const PAD_EXTRA = 0.02
const PAD_HALF_T = 0.04

/**
 * 翅芽（鞘翅与后翅的前身）：自中胸体侧向后包到腹部第 3 节，末端向腹面收。
 * 摆位抄 `longhorn-beetle-pupa.ts` 的 wingPad：整组绕 X 转到「局部 +Y = 该方位的
 * 体壁外法线」，组内只写离体轴多远、多厚、多宽。左侧镜像做在角度上（不能翻 scale.z）。
 */
function wingPad(side: 1 | -1, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.rotation.x = Math.PI - THREE.MathUtils.degToRad(PAD_BETA) * side
  const samples: readonly (readonly [number, number])[] = [
    [0.2, 0.04],
    [0.12, 0.1],
    [0.0, 0.13],
    [-0.14, 0.13],
    [-0.28, 0.11],
    [-0.38, 0.07],
    [-0.42, 0.02],
  ]
  const sections: Section[] = samples.map(([x, halfW], i) => {
    const t = i / (samples.length - 1)
    const thin = 0.4 + 0.6 * Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0.05, 0.95))
    return {
      at: new THREE.Vector3(x, bodyRadius(x) * FLAT_Z + PAD_EXTRA + PAD_HALF_T * 0.6, 0),
      ry: Math.max(PAD_HALF_T * thin, 1e-3),
      rz: Math.max(halfW, 1e-3),
    }
  })
  const mesh = new THREE.Mesh(loft(sections, 18), material)
  mesh.name = 'pupa-wing-pad'
  g.add(mesh)
  return g
}

// ---------------------------------------------------------------- 足

interface LegPlan {
  /** 基节、膝、胫跗关节、跗端：[x, 离腹中线的角度] */
  joints: readonly (readonly [number, number])[]
  /** 径向层：前足最贴体、后足最外（折起的足本来就互相压着） */
  extra: number
  thick: number
}

/**
 * 三对足：每条都是**腿节 + 胫节折成一个紧凑的「V」**，V 尖（膝）朝体侧，
 * 跗节顺着胫节再往后收一小截。三条都**贴着腹面轮廓**走（管心离体壁 0.7 个管径，
 * 下半截压进体壁），不起拱、不跨中线（基节离腹中线 13°），同侧三条沿体轴
 * 从前往后依次排开、互不相碰。
 *
 * 第一、二版是「长足各走一条车道」：后足腿节横跨前两对的胫节，净空按 0.02 / 0.055 /
 * 0.09 分三层叠起来。目视验收打回 —— home、侧视、后视都读成一盘面条或一架梯子，
 * 恰恰看不出离蛹最该讲的那件事：**附肢已经分开成形、各自折好贴在身上**。
 * 所以这一版宁可让足短一点（后足跗节到腹部第 6 节，不再伸过腹末），也要三个 V 各占一段。
 *
 * [x, 离腹中线的角度 β]：基节 → 膝 → 胫跗关节 → 跗端
 */
const LEGS: readonly LegPlan[] = [
  { joints: [[0.45, 13], [0.39, 62], [0.31, 28], [0.27, 22]], extra: 0.024, thick: 0.034 },
  { joints: [[0.18, 13], [0.12, 64], [0.05, 30], [0.0, 24]], extra: 0.025, thick: 0.036 },
  { joints: [[-0.1, 13], [-0.24, 70], [-0.46, 34], [-0.58, 26]], extra: 0.026, thick: 0.038 },
]

function pupaLeg(plan: LegPlan, side: 1 | -1, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const pts = plan.joints.map(([x, beta]) => shell(x, beta, plan.extra, side))
  const radii = [
    [plan.thick, plan.thick * 0.85],
    [plan.thick * 0.8, plan.thick * 0.62],
    [plan.thick * 0.55, plan.thick * 0.35],
  ]
  for (let i = 0; i < 3; i++) {
    /*
     * 每节沿**体表参数** (x, β) 插值再贴回体壁，不在三维里拉直线：
     * 直线是弦，跨过半个腹面的腿节中段会钻进体壁里、两头再冒出来，
     * 第一版出图读成一地折断的小棍。沿体表走，腿就是贴着身子折起来的。
     */
    const steps = 10
    const seg: THREE.Vector3[] = []
    const [x0, b0] = plan.joints[i]
    const [x1, b1] = plan.joints[i + 1]
    for (let k = 0; k <= steps; k++) {
      const t = k / steps
      seg.push(shell(THREE.MathUtils.lerp(x0, x1, t), THREE.MathUtils.lerp(b0, b1, t), plan.extra, side))
    }
    const m = new THREE.Mesh(tube(seg, radii[i][0], radii[i][1], 12), material)
    m.name = 'pupa-leg-segment'
    g.add(m)
    if (i < 2) {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(radii[i][1] * 1.15, 10, 8), material)
      joint.name = 'pupa-leg-joint'
      joint.position.copy(pts[i + 1])
      g.add(joint)
    }
  }
  return g
}

// ---------------------------------------------------------------- 背刺

/** 第 k 腹节（1 起算）的中点 x */
function abdSegMid(k: number): number {
  return ABD_FROM - ((k - 0.5) / ABD_SEGMENTS) * (ABD_FROM - ABD_TO)
}

/**
 * 背刺：圆锥形，自腹节背侧竖起、略向后弯，尖端一根深色刚毛。
 * 基部埋进体壁 0.02，免得刺与体壁之间露缝（悬空的一根锥读成插上去的牙签）。
 */
function dorsalProcesses(bodyMat: THREE.Material, setaMat: THREE.Material): { group: THREE.Group; tips: THREE.Vector3[] } {
  const g = new THREE.Group()
  const tips: THREE.Vector3[] = []
  for (const k of PROCESS_SEGMENTS) {
    const x = abdSegMid(k)
    for (const side of [1, -1] as const) {
      const base = shell(x, PROCESS_BETA, -0.02, side)
      const mid = shell(x - 0.02, PROCESS_BETA + 6, PROCESS_LEN * 0.5, side)
      const tip = shell(x - 0.06, PROCESS_BETA + 10, PROCESS_LEN - 0.02, side)
      const m = new THREE.Mesh(tube(bezier(base, mid, tip, 8), 0.045, 0.01, 10), bodyMat)
      m.name = 'dorsal-process'
      g.add(m)
      const setaTip = shell(x - 0.09, PROCESS_BETA + 12, PROCESS_LEN + 0.06, side)
      const s = new THREE.Mesh(tube([tip.clone(), setaTip], 0.008, 0.002, 6), setaMat)
      s.name = 'process-seta'
      g.add(s)
      tips.push(tip.clone())
    }
  }
  return { group: g, tips }
}

// ---------------------------------------------------------------- 室底与幼虫皮

const FLOOR_A = 1.12
const FLOOR_B = 0.66
const FLOOR_CX = -0.08

/** 室底高度：浅碗，大半是平的、外缘一圈翘起 0.09 */
function floorHeight(x: number, z: number): number {
  const q = Math.hypot((x - FLOOR_CX) / FLOOR_A, z / FLOOR_B)
  return 0.09 * THREE.MathUtils.smoothstep(q, 0.78, 1) + 0.006 * Math.sin(x * 23 + z * 11) * Math.sin(z * 17 - x * 5)
}

function floorGeometry(): THREE.BufferGeometry {
  const NA = 72
  const NR = 20
  const pos: number[] = []
  const idx: number[] = []
  const top: number[][] = []
  const bottom: number[][] = []
  for (let i = 0; i <= NR; i++) {
    const rowT: number[] = []
    const rowB: number[] = []
    for (let j = 0; j < NA; j++) {
      const a = (j / NA) * Math.PI * 2
      const wob = 1 + 0.05 * Math.sin(a * 3 + 0.7) + 0.035 * Math.sin(a * 5 - 0.3)
      const x = FLOOR_CX + Math.cos(a) * FLOOR_A * wob * (i / NR)
      const z = Math.sin(a) * FLOOR_B * wob * (i / NR)
      const y = floorHeight(x, z)
      pos.push(x, y, z)
      rowT.push(pos.length / 3 - 1)
      pos.push(x, y - 0.1 * (1 - 0.6 * THREE.MathUtils.smoothstep(i / NR, 0.6, 1)), z)
      rowB.push(pos.length / 3 - 1)
    }
    top.push(rowT)
    bottom.push(rowB)
  }
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NA; j++) {
      const j2 = (j + 1) % NA
      idx.push(top[i][j], top[i + 1][j2], top[i + 1][j])
      idx.push(top[i][j], top[i][j2], top[i + 1][j2])
      idx.push(bottom[i][j], bottom[i + 1][j], bottom[i + 1][j2])
      idx.push(bottom[i][j], bottom[i + 1][j2], bottom[i][j2])
    }
  }
  for (let j = 0; j < NA; j++) {
    const j2 = (j + 1) % NA
    idx.push(top[NR][j], bottom[NR][j2], bottom[NR][j])
    idx.push(top[NR][j], top[NR][j2], bottom[NR][j2])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * 蜕下的幼虫皮：皱成一团的苍白表皮 + 仍连在上面的深色头盘。
 * 皮用一段沿弯曲路径、半径逐段抖动且被压扁的放样做（皱缩），头盘是两片扁椭球
 * （头 + 前胸背板）斜靠在皮团的一端。
 */
function exuvia(at: THREE.Vector3, skinMat: THREE.Material, shieldMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.position.copy(at)
  // 头盘一端朝 +Z 偏前：朝 +X 摆的话，两片深色头盘正好塞到蛹的腹末底下，读成蛹身下的阴影
  g.rotation.y = -1.2
  const rnd = rng(0x5eed41)
  /*
   * 皮团：一段压扁的放样，半径逐段抖动 ±25% 读成皱褶。第一版压得太扁（背腹
   * 只有左右的一半、中心还贴着地），又落在室底上翘的碗沿里，一半埋进土 ——
   * 出图是一摊白漆。现在截面圆一些（0.7）、整团坐在平底上。
   */
  const sections: Section[] = []
  const steps = 26
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const env = Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0.03, 0.97))
    const r = 0.1 * Math.pow(env, 0.6) * (0.78 + 0.44 * rnd())
    sections.push({
      at: new THREE.Vector3(-0.22 + 0.4 * t, r * 0.62, 0.05 * Math.sin(t * 6)),
      ry: Math.max(r * 0.7, 1e-3),
      rz: Math.max(r, 1e-3),
    })
  }
  const skin = new THREE.Mesh(loft(sections, 16), skinMat)
  skin.name = 'larval-exuvia'
  g.add(skin)
  /*
   * 头盘：幼虫那块头 + 前胸背板的旧壳，硬骨片不会皱，所以仍是两片完整的扁盘，
   * 斜靠在皮团的前端 —— 大小照幼虫的原尺寸（前胸背板宽 0.54、头宽 0.40）
   * 压一压：蜕皮时骨片从中缝裂开，这里取其半宽的八成。
   */
  for (const [x, y, rx, rz, tilt] of [
    [0.2, 0.1, 0.12, 0.2, -0.45],
    [0.35, 0.07, 0.1, 0.15, -0.3],
  ] as const) {
    const plate = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), shieldMat)
    plate.name = 'exuvia-shield'
    plate.scale.set(rx, 0.03, rz)
    plate.position.set(x, y, 0.03)
    plate.rotation.z = tilt
    g.add(plate)
  }
  return g
}

/** 幼虫皮所在：腹末后方、室底平坦的那一片 */
const EXUVIA_AT = new THREE.Vector3(-0.9, 0, -0.1)

// ---------------------------------------------------------------- 绕向

/**
 * 让每个三角面的绕向与它的顶点法线一致。缘由见 `tiger-beetle-egg.ts` 同名函数：
 * kit.loft() 的侧面绕向与外法线相反，配上 finalize() 的 DoubleSide，loft 件都按
 * 朝内的法线受光；乳白光滑的蛹体上这会让体积感反过来。本文件在 finalize 前自行校正。
 */
function orientFaces(root: THREE.Object3D): void {
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry
    const idx = geo.index
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    if (!idx || !nor) return
    for (let i = 0; i < idx.count; i += 3) {
      const i0 = idx.getX(i)
      const i1 = idx.getX(i + 1)
      const i2 = idx.getX(i + 2)
      a.fromBufferAttribute(pos, i0)
      b.fromBufferAttribute(pos, i1).sub(a)
      c.fromBufferAttribute(pos, i2).sub(a)
      const face = b.cross(c)
      n.fromBufferAttribute(nor, i0)
        .add(a.fromBufferAttribute(nor, i1))
        .add(a.fromBufferAttribute(nor, i2))
      if (face.dot(n) < 0) {
        idx.setX(i + 1, i2)
        idx.setX(i + 2, i1)
      }
    }
    idx.needsUpdate = true
  })
}

// ---------------------------------------------------------------- 装配

export function buildTigerBeetlePupa(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.4, clearcoat: 0.1 })
  const appMat = chitin({ color: APPENDAGE_COLOR, gloss: 0.42, clearcoat: 0.12 })
  const padMat = chitin({ color: PAD_COLOR, gloss: 0.38, clearcoat: 0.1, surface: 'striate' })
  const eyeMat = chitin({ color: EYE_COLOR, gloss: 0.6, clearcoat: 0.4 })
  const jawMat = chitin({ color: JAW_COLOR, gloss: 0.5, clearcoat: 0.25 })
  const setaMat = chitin({ color: SETA_COLOR, gloss: 0.3 })
  const floorMat = chitin({ color: FLOOR_COLOR, gloss: 0.15, clearcoat: 0, surface: 'punctate' })
  const skinMat = chitin({ color: EXUVIA_COLOR, gloss: 0.3, clearcoat: 0.05 })
  const exShieldMat = chitin({ color: EXUVIA_SHIELD_COLOR, gloss: 0.5, metal: 0.25, clearcoat: 0.1 })

  /*
   * 姿态层：蛹体与附肢先在翻转前的体坐标里做（腹面 −Y），整组绕 X 翻 ROLL_DEG，
   * 再整体下移到「刺尖正好落在室底」。锚点套同一个变换。
   */
  const pose = new THREE.Group()
  pose.name = 'pupa-pose'
  pose.rotation.x = THREE.MathUtils.degToRad(ROLL_DEG)
  g.add(pose)

  pose.add(bodyMesh(bodyMat))
  pose.add(eyes(eyeMat))
  pose.add(jawBuds(jawMat))
  for (const side of [1, -1] as const) {
    pose.add(wingPad(side, padMat))
    for (const plan of LEGS) pose.add(pupaLeg(plan, side, appMat))
    pose.add(antenna(side, appMat))
  }
  const { group: processes, tips } = dorsalProcesses(bodyMat, setaMat)
  pose.add(processes)

  // 刺尖（翻转后）的最低点落在室底 floorHeight≈0 处：整只蛹悬在刺上
  const roll = new THREE.Euler(THREE.MathUtils.degToRad(ROLL_DEG), 0, 0)
  const tipLow = Math.min(...tips.map((t) => t.clone().applyEuler(roll).y))
  pose.position.y = -tipLow + 0.004

  const floor = new THREE.Mesh(floorGeometry(), floorMat)
  floor.name = 'chamber-floor'
  g.add(floor)
  const exAt = EXUVIA_AT.clone().setY(floorHeight(EXUVIA_AT.x, EXUVIA_AT.z) - 0.01)
  g.add(exuvia(exAt, skinMat, exShieldMat))

  orientFaces(g)

  /*
   * 锚点：避开成虫 hotspot 表的 mandible / elytra / eye / leg / antenna / pronotum ——
   * 同名会把「镰刀状交叉如剪」「泛金绿色金属光泽」这些成虫卡片贴到乳白的蛹上。
   */
  const place = (v: THREE.Vector3) => v.applyEuler(roll).add(new THREE.Vector3(0, pose.position.y, 0))
  const anchors: Record<string, THREE.Vector3> = {
    pupaEye: place(shell(0.61, 92, 0.03, 1)),
    jawBud: place(new THREE.Vector3(0.9, -0.08, 0.16)),
    foldedLeg: place(shell(LEGS[2].joints[1][0], LEGS[2].joints[1][1], LEGS[2].extra, 1)),
    wingPad: place(shell(-0.1, PAD_BETA, PAD_EXTRA + PAD_HALF_T, 1)),
    dorsalProcess: place(tips[Math.min(2, tips.length - 1)].clone()),
    larvalExuvia: exAt.clone().add(new THREE.Vector3(0, 0.12, 0)),
  }

  return finalize(g, anchors)
}
