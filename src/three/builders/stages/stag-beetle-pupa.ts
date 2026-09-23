/**
 * 中华大锹甲 · 蛹（雄）Dorcus hopei（完全变态第 3 阶段）
 *
 * ## 这只蛹的全部价值：那对大颚已经在蛹上成形了
 *
 * 幼虫是一条乳白的胖虫，成虫是一只黑亮、顶着一对鹿角大颚的甲虫 —— 中间隔着的
 * 就是它。**雄蛹头前那对大颚已经完整成形**：粗、弯、内缘带齿，只是还软、
 * 还是淡黄色，贴着头前向前下方伸出。这一处把「白虫」和「黑甲」两张图接了起来，
 * 所以本文件别的都可以简化，这对颚不行 —— 以雄性为准，与成虫卡片一致。
 *
 * 分寸（沿用独角仙蛹那几轮换来的判据）：
 * - 蛹颚是**鞘**，不是成虫那对武器：更短、更粗。成虫颚长 1.9 / 基部半径 0.19，
 *   粗细比 0.10；这里长 1.4 / 基部 0.24，比 0.17。独角仙蛹第一版把角照成虫
 *   比例做，整只蛹读成一只虾，那支角读成虾钳。
 * - 弧度照成虫的 `stagMandible()`：基部随前伸外张，后四成向内钩回 —— 这是
 *   「鹿角」而不是「獠牙」的那条弧。但**整体向前下方弯**：蛹的头是低垂的，
 *   颚顺着头前贴向前足的方向，不是成虫那样平端着张开。
 * - **两颚在展台默认机位下必须是两根。** 这是用户打开展台第一眼的画面。
 *   ⚠️ 第三版左右对称（俯角都到 −30°），默认机位下两颚叠成一根向前弯的刺，
 *   又用了深一档的琥珀色 —— 整体读成独角仙蛹的角（协调人一眼看出，我那四个
 *   验收机位里恰好没有这个角度）。现在：基部拉开到 z = ±0.56、外张加大，
 *   靠镜头的右颚弯得更低（末端俯角 −60° 对 −12°，理由见 MANDIBLE_PITCH_TO），
 *   颜色回到体色那一档。测试在默认机位、初始相机、顶视、前斜视四个成像平面上
 *   量两颚的最小间距（白蚁兵蚁的教训：三维里分得开不等于屏幕上分得开）。
 * - 「钳」的读法全靠末端那一下向内钩：第二版钩得太浅，出图是两根往下耷拉的香肠。
 *
 * ## 其余形态
 *
 * - **离蛹（裸蛹）**：附肢与身体分离、各自裹着一层薄膜，折叠贴在身上。
 *   这是离蛹的教学点，所以三对足做成腿节 / 胫节 / 跗节三段、顺着体壁折成「〈」字
 *   （见 FOLDED_LEGS），颜色比体色深一档；默认机位与侧视下前中两对的折叠轮廓
 *   都要露在最前面（测试用 z-buffer 数格子）。
 *   不做蛹室 —— 蛹室会挡住大颚，而大颚是这一阶段的全部看点（判据与独角仙蛹一致）。
 * - **头大、宽、方**：雄锹甲的头为了装下驱动大颚的肌肉，宽得像一块板；
 *   这里头部半宽 0.84，与前胸背板（0.88）几乎一样宽，撑出「前重后轻」的剪影。
 * - **前胸背板宽而方**：锹甲前胸不收尖，跟成虫同一个道理。
 * - 翅芽（鞘翅雏形）贴在腹面两侧；一对膝状触角芽从头侧折向后下方。
 * - 腹部 6 节，节间膜环；体侧一排浅褐气门；**整段向腹面弯**约 35°（见 bendPoint）——
 *   第三版是一根直挺挺的锥，读成胡萝卜。
 * - **姿态略仰卧**（绕 X 轴 −24°，与独角仙蛹同一个角度常量的理由）：不滚的话
 *   腹面那一整套翅芽足芽在任何机位都看不见。
 *
 * ## 颜色
 *
 * 锹甲蛹刚化出时乳白，数日后转淡黄至橙黄。取中间的淡黄 `#eecf8e`
 * （明度 0.74），与独角仙蛹的橙褐 `#c2762f`（0.47）拉开 —— 并排两只蛹要
 * 看得出不是同一种。大颚与体色同一档（`#e9c888`），足深一档（`#cf9c55`）。
 * 材质绝不走 `elytra()`：淡黄 + 清漆在 ACES 下必过曝（七星瓢虫、甘薯腊龟甲），
 * 也**不开 `translucent`**（天牛幼虫那一轮的透镜病）。
 *
 * 局部坐标系与成虫完全一致：+X 向前（头）、+Y 向上（背）、+Z 向右。
 */
import * as THREE from 'three'
import {
  abdomenEnvelope,
  chitin,
  finalize,
  loft,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  spindle,
  type InsectModel,
  type SegmentedAbdomenOptions,
  type Section,
} from '../kit'

// ---------------------------------------------------------------- 颜色

/** 蛹体：淡黄 */
const BODY_COLOR = '#eecf8e'
/**
 * 大颚鞘：与体色同一档的淡黄，只暗一点点。
 * ⚠️ 上一版用深一档的琥珀 `#cf9a55`，在默认机位下两颚读成「另外插上去的一个部件」，
 * 配上叠成一根的剪影就是独角仙蛹的角。蛹的颚跟全身是同一层蛹皮，颜色不该跳。
 */
const MANDIBLE_COLOR = '#e9c888'
/** 翅芽 / 足芽 / 触角芽：比体色略深，才分得出「贴在腹面的另一层」 */
const PAD_COLOR = '#dfb872'
/**
 * 折叠足：比体色深一档。足是一层叠在体壁（和翅芽）外面的东西，同色的话
 * 默认机位下只剩几团分不清的鼓包；深一档，「〈」字形的轮廓才从体侧剥出来。
 */
const LEG_COLOR = '#cf9c55'
/** 气门 */
const DARK_COLOR = '#8a5a2b'

/** 略仰卧：绕 X 轴滚这么多度，腹面转向 +Z（默认机位与侧机位都在那一侧） */
const SUPINE_DEG = -24

// ---------------------------------------------------------------- 体段

/**
 * 腹部：6 节，背腹压扁、末端仍粗（r1 0.42）。
 * ⚠️ 第一版 r1 0.3 / flat 1.12，腹部收成一根尖锥，整只蛹侧视读成一根胡萝卜；
 * 锹甲蛹的腹部是宽扁的一块，末端圆钝。前端塞进前胸背板里，接缝被背板罩住。
 */
const ABDOMEN: SegmentedAbdomenOptions = {
  from: [0.45, 0.02, 0],
  to: [-1.7, 0.12, 0],
  r0: 0.62,
  r1: 0.42,
  segments: 6,
  groove: 0.07,
  membraneRatio: 0.86,
  flat: 1.22,
  bulge: 0.3,
  /*
   * 这一行不只是「体色」：膜环颜色由 kit 按它压暗 35% 推出（一圈比体色暗一档的软黄）。
   * 不给的话 kit 退到通用兜底 #231e1b —— 在淡黄的蛹身上就是一圈圈黑箍。
   */
  color: BODY_COLOR,
}
/** 膜环单独用一个更大的比例，才不会与体节自身的收缩重合（独角仙蛹实撞过） */
const MEMBRANE_RING_RATIO = 0.93

interface SpindleSpec {
  from: [number, number, number]
  to: [number, number, number]
  radius: number
  bulge: number
  flat: number
  taperStart: number
  taperEnd: number
}

/** 前胸背板：宽而方。后端几乎收成一点藏进腹部里，不留封口盘 */
const THORAX: SpindleSpec = {
  from: [-0.35, 0.05, 0],
  to: [1.2, 0.12, 0],
  radius: 0.74,
  bulge: 0.58,
  flat: 1.19,
  taperStart: 0.05,
  taperEnd: 0.2,
}

/**
 * 头：大、宽、**方**，略低垂。
 *
 * 不用 `spindle()`：它的包络是正弦鼓包，两端要么收尖（读成一颗小圆疙瘩，
 * 夹在背板和大颚之间像个「脖子上的结」），要么靠 taperEnd 截出一枚平圆盘
 * —— 第二版 taperEnd 0.45，前斜与顶视都正对着那枚盘，读成头前贴了一块板。
 * 这里用超椭圆母线 `r = R·(1 − |2t−1|^4)^(1/4)`：中段近乎等宽（方头），
 * 两端以竖直切线收到 0（圆钝的球冠，没有封口盘）。
 * 横截面半宽 0.84 / 半高 0.37：雄锹甲的头为了装驱动大颚的肌肉，宽得像一块板。
 */
const HEAD_FROM = new THREE.Vector3(0.88, 0.0, 0)
const HEAD_TO = new THREE.Vector3(1.86, -0.06, 0)
const HEAD_R = 0.56
const HEAD_FLAT = 1.5

function headRadius(x: number): { axisY: number; ry: number; rz: number } | null {
  const t = (x - HEAD_FROM.x) / (HEAD_TO.x - HEAD_FROM.x)
  if (t < 0 || t > 1) return null
  const r = HEAD_R * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), 4)), 0.25)
  return { axisY: THREE.MathUtils.lerp(HEAD_FROM.y, HEAD_TO.y, t), ry: r / HEAD_FLAT, rz: r * HEAD_FLAT }
}

function headGeometry(): THREE.BufferGeometry {
  const steps = 28
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    // 两端加密采样：超椭圆在端点处半径变化最陡，均匀采样会把球冠切出棱角
    const t = 0.5 - 0.5 * Math.cos((Math.PI * i) / steps)
    const x = THREE.MathUtils.lerp(HEAD_FROM.x, HEAD_TO.x, t)
    const c = headRadius(x) ?? { axisY: 0, ry: 1e-4, rz: 1e-4 }
    sections.push({ at: new THREE.Vector3(x, c.axisY, 0), ry: Math.max(c.ry, 1e-4), rz: Math.max(c.rz, 1e-4) })
  }
  return loft(sections, 28)
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
  return { axisY: THREE.MathUtils.lerp(spec.from[1], spec.to[1], t), ry: r / spec.flat, rz: r * spec.flat }
}

/** 腹部某个 x 处的轴心与半径（与 segmentedAbdomen 共用 kit 的同一条包络） */
function abdomenRadius(x: number): { axisY: number; ry: number; rz: number } | null {
  const span = ABDOMEN.to[0] - ABDOMEN.from[0]
  const t = (x - ABDOMEN.from[0]) / span
  if (t < 0 || t > 1) return null
  const env = abdomenEnvelope(t, ABDOMEN.r0, ABDOMEN.r1, ABDOMEN.bulge)
  const flat = ABDOMEN.flat ?? 1
  return { axisY: THREE.MathUtils.lerp(ABDOMEN.from[1], ABDOMEN.to[1], t), ry: env / flat, rz: env * flat }
}

/** 某个 x、某个方位角（从腹中线量向侧方）上的体壁位置。几段重叠处取更粗的那个 */
function bodyWall(x: number, phi: number): { axisY: number; r: number } {
  let best = { axisY: 0, r: 0 }
  for (const c of [abdomenRadius(x), spindleRadius(THORAX, x), headRadius(x)]) {
    if (!c) continue
    const r = 1 / Math.hypot(Math.cos(phi) / c.ry, Math.sin(phi) / c.rz)
    if (r > best.r) best = { axisY: c.axisY, r }
  }
  return best
}

/** 腹末：`segmentedAbdomen` 的末端是个平口，这里补一枚圆钝的球冠收口 */
function abdomenTip(material: THREE.Material): THREE.Mesh {
  const from = new THREE.Vector3(...ABDOMEN.to)
  const dir = new THREE.Vector3(...ABDOMEN.to).sub(new THREE.Vector3(...ABDOMEN.from)).normalize()
  const flat = ABDOMEN.flat ?? 1
  const steps = 10
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    const r = Math.max(ABDOMEN.r1 * Math.sqrt(Math.max(0, 1 - u * u)), 1e-4)
    sections.push({ at: from.clone().addScaledVector(dir, u * ABDOMEN.r1 * 1.15), ry: r / flat, rz: r * flat })
  }
  const mesh = new THREE.Mesh(loft(sections, 22), material)
  mesh.name = 'pupa-abdomen-tip'
  return mesh
}

// ---------------------------------------------------------------- 大颚鞘

/** 大颚的基部（右侧；左侧 z 取负）、弧长、基部与末端半径 */
const MANDIBLE_BASE = new THREE.Vector3(1.62, -0.08, 0.56)
const MANDIBLE_LENGTH = 1.4
const MANDIBLE_R0 = 0.24
const MANDIBLE_R1 = 0.09
/** 俯角：从基部的 MANDIBLE_PITCH_FROM 一路弯到末端的 MANDIBLE_PITCH_TO[side] */
const MANDIBLE_PITCH_FROM = -4
/**
 * 末端俯角**左右不等**：右颚（+Z，靠展台默认机位那一侧）弯得更低。
 *
 * ⚠️ 对称的一对在默认机位（视线 ≈ (0.86, 0.44, 1.25)，几乎从右前上方看）下
 * 叠成一根向前弯的刺，读成独角仙蛹的角 —— 用户打开展台第一眼就是这个画面。
 * 算过账：左右两颚的横向间距投到这个机位的画面上只剩 1/3，而「略仰卧」那 −24°
 * 的滚转又让右颚抬高、左颚压低，这一上一下在画面上恰好**抵掉**了横向那点间距。
 * 上下方向的错开在画面上几乎是 1:1 保留的，所以解法是让靠近镜头的右颚反过来
 * 弯得更低：两颚在画面上沿竖直方向拉开。真实的蛹两颚也并非严格对称地摆着
 * （蛹室里压着的那一侧常常更低），这个不对称量（14°）在顶视里看不出来。
 */
const MANDIBLE_PITCH_TO: Record<1 | -1, number> = { 1: -60, [-1]: -12 }

/**
 * 大颚鞘：弧度抄成虫 `stagMandible()` 的外张 → 内钩（横向），再叠一条
 * 持续下弯的俯仰（纵向）。横向与纵向两条曲线分开写，各管各的：
 * 前者决定「像不像鹿角」，后者决定「像不像蛹」。
 *
 * 内缘一枚钝齿（中段），成虫是三枚、中间最大 —— 蛹上只看得出最大那一枚的雏形。
 */
function mandibleSheath(side: 1 | -1, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const z0 = MANDIBLE_BASE.z
  const zFlare = z0 + MANDIBLE_LENGTH * 0.24
  const zHook = z0 - MANDIBLE_LENGTH * 0.06
  const smooth = (t: number) => {
    const x = THREE.MathUtils.clamp(t, 0, 1)
    return x * x * (3 - 2 * x)
  }

  const steps = 22
  const ds = MANDIBLE_LENGTH / steps
  const path: THREE.Vector3[] = []
  let x = MANDIBLE_BASE.x
  let y = MANDIBLE_BASE.y
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const widen = smooth(t / 0.6)
    const curl = t < 0.6 ? 0 : smooth((t - 0.6) / 0.4)
    const zAbs = z0 + (zFlare - z0) * widen - (zFlare - zHook) * curl
    path.push(new THREE.Vector3(x, y, side * zAbs))
    const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(MANDIBLE_PITCH_FROM, MANDIBLE_PITCH_TO[side], t))
    x += Math.cos(a) * ds
    y += Math.sin(a) * ds
  }

  const sections: Section[] = path.map((at, i) => {
    const t = i / steps
    const r = THREE.MathUtils.lerp(MANDIBLE_R0, MANDIBLE_R1, Math.pow(t, 0.8))
    // 颚鞘上下扁、左右宽（成虫的颚就是一片扁的鹿角，圆管读成两根筷子）
    return { at, ry: r * 0.72, rz: r * 1.12 }
  })
  /*
   * 末端圆钝收口：沿末端切向再补一截球冠。
   * ⚠️ 第一版末端直接停在半径 0.075 的截面上，loft 的封口是一枚平圆盘，
   * 前斜机位正对着它，出图是两根**锯断的管子**。
   */
  const end = path[steps]
  const dir = new THREE.Vector3().subVectors(end, path[steps - 1]).normalize()
  for (let k = 1; k <= 4; k++) {
    const u = k / 4
    const r = MANDIBLE_R1 * Math.sqrt(Math.max(1e-4, 1 - u * u))
    sections.push({ at: end.clone().addScaledVector(dir, MANDIBLE_R1 * 0.9 * u), ry: r * 0.72, rz: r * 1.12 })
  }
  const shaft = new THREE.Mesh(loft(sections, 16), material)
  shaft.name = 'pupa-mandible'
  g.add(shaft)

  // 内缘钝齿：中段朝中线鼓出的一个小圆丘，不是尖刺
  const idx = Math.round(0.45 * steps)
  const p = path[idx]
  const r = THREE.MathUtils.lerp(MANDIBLE_R0, MANDIBLE_R1, Math.pow(0.45, 0.8))
  const tooth = new THREE.Mesh(
    loft(
      [
        { at: p.clone(), ry: r * 0.6, rz: r * 0.6 },
        { at: p.clone().add(new THREE.Vector3(0.02, -0.01, -side * r * 1.5)), ry: r * 0.34, rz: r * 0.32 },
        { at: p.clone().add(new THREE.Vector3(0.03, -0.015, -side * r * 1.85)), ry: 0.01, rz: 0.01 },
      ],
      12,
    ),
    material,
  )
  tooth.name = 'pupa-mandible-tooth'
  g.add(tooth)
  return g
}

// ---------------------------------------------------------------- 腹面的芽

interface PadSpec {
  /** 方位角（度）：从腹中线量向侧方。足芽靠内、翅芽靠外 */
  phi: number
  /** 沿体轴的采样：[x, 半厚（沿法线）, 半宽（沿切向）] */
  samples: readonly (readonly [number, number, number])[]
  name: string
}

/**
 * 贴壁的芽（翅芽 / 足芽）：整组绕 X 轴转到「组的局部 +Y = 该处体壁外法线」，
 * 组内只按「离体轴多远、多厚、多宽」写截面，芽天然半埋在体壁里。
 * 左侧不能用 scale.z = −1 镜像（组本身有旋转，镜像必须做在角度上）——
 * 独角仙蛹那一轮左边三片因此飞成了半空中的斜板。
 */
function flankPad(spec: PadSpec, material: THREE.Material, side: 1 | -1): THREE.Group {
  const phi = THREE.MathUtils.degToRad(spec.phi)
  const mid = spec.samples[Math.floor(spec.samples.length / 2)][0]
  const g = new THREE.Group()
  g.position.y = bodyWall(mid, phi).axisY
  g.rotation.x = Math.PI - phi * side
  const sections: Section[] = []
  for (const [x, halfThick, halfWide] of spec.samples) {
    sections.push({ at: new THREE.Vector3(x, bodyWall(x, phi).r, 0), ry: halfThick, rz: halfWide })
  }
  const mesh = new THREE.Mesh(loft(sections, 18), material)
  mesh.name = spec.name
  g.add(mesh)
  return g
}

/** 翅芽：鞘翅雏形，自胸部腹侧向后盖到腹部第 3 节 */
const WING_PAD: PadSpec = {
  phi: 64,
  samples: [
    [0.95, 0.03, 0.1],
    [0.6, 0.08, 0.24],
    [0.1, 0.095, 0.3],
    [-0.5, 0.085, 0.26],
    [-0.95, 0.05, 0.15],
    [-1.12, 0.02, 0.05],
  ],
  name: 'pupa-wing-pad',
}

/**
 * 三对折叠足：离蛹（exarate）的教学点就是「附肢已经分开、各自折叠贴在身上」。
 *
 * ⚠️ 第一版是贴在腹面体壁上的三条隆脊（flankPad），半径不到 0.1、颜色跟翅芽一档，
 * 侧视与默认机位下完全读不出来 —— 整只蛹就是一根胡萝卜。
 * ⚠️ 第二版改成三段直圆管、关节写死世界坐标，出图是一堆悬在肚子下面的木棍：
 * 体侧那一圈体壁比腹中线高得多，写死的 y 离体侧差了 0.3 以上。
 *
 * 这一版每个关节按「沿体轴的 x + 从腹中线量起的方位角 φ」给，落点用 bodyWall()
 * 从 kit 的同一条包络算，再往外抬一个管径 —— 段与段之间按 (x, φ) 插值取点，
 * 于是每一段都**顺着体壁的弧度**贴过去，而不是一根直棍切进体内或悬在外面。
 * 形态：腿节从腹面基节斜向外前方伸到体侧（φ ≈ 80°，膝在体侧轮廓上鼓出来），
 * 胫节折回向后、往腹面收，跗节再顺着腹面往后贴 —— 一个清楚的「〈」字形。
 * 抬起量要盖过翅芽（翅芽最厚 0.095）：足压在翅芽外面，真实的离蛹也是这样。
 *
 * 坐标写在弯曲之前的体坐标里（腹部的弯曲在装配末尾统一施加）。
 */
interface Joint {
  x: number
  /** 方位角（度），从腹中线量向体侧 */
  phi: number
}

interface FoldedLegSpec {
  coxa: Joint
  knee: Joint
  ankle: Joint
  tip: Joint
  /** 腿节 / 胫节 / 跗节的半径 */
  r: [number, number, number]
}

const FOLDED_LEGS: FoldedLegSpec[] = [
  // 前足：腿节向前外伸到头后的体侧，胫节贴着腿节折回（一个开口朝后的窄「〈」）
  { coxa: { x: 0.8, phi: 20 }, knee: { x: 1.3, phi: 72 }, ankle: { x: 0.68, phi: 60 }, tip: { x: 0.42, phi: 30 }, r: [0.11, 0.085, 0.055] },
  // 中足：最显眼的一条，膝在前胸后半的体侧
  { coxa: { x: 0.25, phi: 22 }, knee: { x: 0.78, phi: 76 }, ankle: { x: 0.02, phi: 62 }, tip: { x: -0.32, phi: 30 }, r: [0.115, 0.09, 0.058] },
  // 后足：膝在翅芽前缘，胫节 / 跗节顺着翅芽下缘往后
  { coxa: { x: -0.25, phi: 22 }, knee: { x: 0.12, phi: 70 }, ankle: { x: -0.72, phi: 56 }, tip: { x: -1.08, phi: 28 }, r: [0.11, 0.085, 0.055] },
]

/** 足离开体壁的抬起量（管心到体壁）：盖过翅芽的厚度，再加一个管径 */
const LEG_LIFT = 0.1

/** 体壁上 (x, φ) 处往外抬 lift 的点（side 取左右） */
function onWall(x: number, phiDeg: number, lift: number, side: 1 | -1): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(phiDeg)
  const w = bodyWall(x, phi)
  const R = w.r + lift
  return new THREE.Vector3(x, w.axisY - Math.cos(phi) * R, side * Math.sin(phi) * R)
}

/** 一段足：顺着体壁弧度的圆管，中段略粗，两端球冠封口（不留平圆盘） */
function legSegment(a: Joint, b: Joint, r: number, side: 1 | -1, material: THREE.Material, name: string): THREE.Mesh {
  const steps = 10
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push(onWall(THREE.MathUtils.lerp(a.x, b.x, t), THREE.MathUtils.lerp(a.phi, b.phi, t), LEG_LIFT + r, side))
  }
  const sections: Section[] = pts.map((at, i) => {
    const k = 0.82 + 0.18 * Math.sin((Math.PI * i) / steps)
    return { at, ry: r * k, rz: r * k }
  })
  const d0 = new THREE.Vector3().subVectors(pts[0], pts[1]).normalize()
  const d1 = new THREE.Vector3().subVectors(pts[steps], pts[steps - 1]).normalize()
  for (let k = 1; k <= 3; k++) {
    const u = k / 3
    const rr = r * 0.82 * Math.sqrt(Math.max(1e-4, 1 - u * u))
    sections.push({ at: pts[steps].clone().addScaledVector(d1, r * 0.82 * u), ry: rr, rz: rr })
    sections.unshift({ at: pts[0].clone().addScaledVector(d0, r * 0.82 * u), ry: rr, rz: rr })
  }
  const mesh = new THREE.Mesh(loft(sections, 12), material)
  mesh.name = name
  return mesh
}

/** pair：0 前足 / 1 中足 / 2 后足，记在每段的 userData 上（测试按它分对） */
function foldedLeg(spec: FoldedLegSpec, pair: number, side: 1 | -1, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(legSegment(spec.coxa, spec.knee, spec.r[0], side, material, 'pupa-femur'))
  g.add(legSegment(spec.knee, spec.ankle, spec.r[1], side, material, 'pupa-tibia'))
  g.add(legSegment(spec.ankle, spec.tip, spec.r[2], side, material, 'pupa-tarsus'))
  for (const m of g.children) m.userData.pair = pair
  return g
}

/**
 * 触角芽：膝状触角折起来贴在头侧 —— 柄节从头侧向后下方伸，肘部再折向后方。
 * 很细（半径 0.05），只负责让头的侧面不是一片光板；锚点另给。
 */
function antennaPad(side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const pts = [
    new THREE.Vector3(1.42, -0.06, side * 0.5),
    new THREE.Vector3(1.22, -0.2, side * 0.62),
    new THREE.Vector3(1.02, -0.3, side * 0.66),
    new THREE.Vector3(0.8, -0.34, side * 0.62),
  ]
  const curve = new THREE.CatmullRomCurve3(pts)
  const sections: Section[] = []
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // 末端略膨大：锹甲触角末端那几节栉片的雏形
    const r = 0.045 + 0.025 * THREE.MathUtils.smoothstep(t, 0.7, 1) - 0.02 * Math.pow(t, 8)
    sections.push({ at: curve.getPoint(t), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'pupa-antenna-pad'
  return mesh
}

// ---------------------------------------------------------------- 腹部弯曲

/** 弯曲从 x = BEND_FROM 往后开始；曲率 BEND_K（弧度 / 厘米） */
const BEND_FROM = 0.1
const BEND_K = 0.3

/**
 * 腹部向腹面弯（体坐标里原地改写一个点，返回它自己）。
 *
 * 离蛹躺在蛹室里，腹部总是向腹面卷起一个弧 —— 一根直挺挺的锥读成胡萝卜
 * （上一版就是）。做法是把 x < BEND_FROM 的部分绕体轴下方 R = 1/k 处的一条
 * 横轴弯过去：沿轴走了 s，就转过 φ = k·s。背面在外、腹面在内，
 * 所以是「向腹面」弯；截面不变形，只是跟着转。
 */
function bendPoint(p: THREE.Vector3): THREE.Vector3 {
  const s = BEND_FROM - p.x
  if (s <= 0) return p
  const R = 1 / BEND_K
  const phi = s * BEND_K
  const rr = R + p.y
  return p.set(BEND_FROM - rr * Math.sin(phi), -R + rr * Math.cos(phi), p.z)
}

/**
 * 对姿态层里每个网格的顶点施加 bendPoint（在 pose 坐标里算，再换回网格自己的坐标）。
 * 法线跟着转同一个角 φ，不重算 —— computeVertexNormals 会在 loft 的 uv 接缝上
 * 撕出一道明暗缝。
 */
function bendPose(pose: THREE.Group): void {
  pose.updateMatrixWorld(true)
  const toPose = new THREE.Matrix4()
  const fromPose = new THREE.Matrix4()
  const nToPose = new THREE.Matrix3()
  const nFromPose = new THREE.Matrix3()
  const p = new THREE.Vector3()
  const n = new THREE.Vector3()
  pose.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    toPose.copy(pose.matrixWorld).invert().multiply(mesh.matrixWorld)
    fromPose.copy(toPose).invert()
    nToPose.getNormalMatrix(toPose)
    nFromPose.getNormalMatrix(fromPose)
    const pos = mesh.geometry.getAttribute('position')
    const nrm = mesh.geometry.getAttribute('normal')
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(toPose)
      const phi = Math.max(0, BEND_FROM - p.x) * BEND_K
      bendPoint(p).applyMatrix4(fromPose)
      pos.setXYZ(i, p.x, p.y, p.z)
      if (nrm && phi > 0) {
        n.fromBufferAttribute(nrm, i).applyMatrix3(nToPose)
        // 弯曲把局部「上」从 (0,1) 转到 (−sinφ, cosφ)：绕 +Z 转 +φ
        const c = Math.cos(phi)
        const sn = Math.sin(phi)
        n.set(n.x * c - n.y * sn, n.x * sn + n.y * c, n.z).applyMatrix3(nFromPose).normalize()
        nrm.setXYZ(i, n.x, n.y, n.z)
      }
    }
    pos.needsUpdate = true
    if (nrm) nrm.needsUpdate = true
    mesh.geometry.computeBoundingBox()
    mesh.geometry.computeBoundingSphere()
  })
}

// ---------------------------------------------------------------- 装配

export function buildStagBeetlePupa(): InsectModel {
  const g = new THREE.Group()
  /*
   * 姿态层：整体绕 X 轴滚 SUPINE_DEG。放在内层，finalize() 的居中与包围球照旧
   * 在根上算；锚点手工套同一个旋转（见文件末尾），两处共用一个角度常量。
   */
  const pose = new THREE.Group()
  pose.name = 'pupa-pose'
  pose.rotation.x = THREE.MathUtils.degToRad(SUPINE_DEG)
  g.add(pose)

  // 蛹壳：软的、半哑光的角质，不是成虫那层上过清漆的鞘翅
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.4, clearcoat: 0.1, surface: 'punctate' })
  const mandibleMat = chitin({ color: MANDIBLE_COLOR, gloss: 0.48, clearcoat: 0.16 })
  const padMat = chitin({ color: PAD_COLOR, gloss: 0.36, clearcoat: 0.08, surface: 'striate' })
  const darkMat = chitin({ color: DARK_COLOR, gloss: 0.4, clearcoat: 0.12 })
  // 足：比翅芽再深一点点 —— 叠在翅芽前面时要分得出是两层
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.4, clearcoat: 0.08 })

  // ---- 腹部（分节 + 节间膜环）
  const abdomen = new THREE.Mesh(segmentedAbdomen(ABDOMEN), bodyMat)
  abdomen.name = 'pupa-abdomen'
  pose.add(abdomen)
  for (const ring of segmentedAbdomenMembranes({ ...ABDOMEN, membraneRatio: MEMBRANE_RING_RATIO })) pose.add(ring)
  pose.add(abdomenTip(bodyMat))

  // ---- 前胸背板
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

  // ---- 头
  const head = new THREE.Mesh(headGeometry(), bodyMat)
  head.name = 'pupa-head'
  pose.add(head)

  // ---- 大颚鞘（本阶段的招牌）
  for (const side of [1, -1] as const) pose.add(mandibleSheath(side, mandibleMat))

  // ---- 触角芽
  for (const side of [1, -1] as const) pose.add(antennaPad(side, padMat))

  // ---- 腹面：一对翅芽 + 三对折叠足
  for (const side of [1, -1] as const) {
    pose.add(flankPad(WING_PAD, padMat, side))
    FOLDED_LEGS.forEach((spec, pair) => pose.add(foldedLeg(spec, pair, side, legMat)))
  }

  // ---- 气门：腹节侧上方一排小点（离背中线 55°，圆心正落在体壁上）
  const spPhi = THREE.MathUtils.degToRad(125)
  for (let i = 0; i < 6; i++) {
    const x = 0.2 - i * 0.36
    const wall = bodyWall(x, spPhi)
    for (const side of [1, -1] as const) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), darkMat)
      s.name = 'pupa-spiracle'
      s.position.set(x, wall.axisY - Math.cos(spPhi) * wall.r, side * Math.sin(spPhi) * wall.r)
      s.scale.set(1, 0.9, 0.45)
      pose.add(s)
    }
  }

  /*
   * 锚点名避开成虫 hotspot 表（mandible / elytra / head / antenna / leg / pronotum）：
   * 展台按名字把成虫卡片贴到当前模型上。成虫 mandible 卡写的是「内缘有齿、
   * 用来夹住对手掀翻」—— 蛹颚还是软的，用不了；翅芽也不是已经硬化的鞘翅。
   * 锚点在未滚转的体坐标里定义，再套上与 pose 同一个旋转。
   */
  // ---- 腹部向腹面弯：所有部件一起过同一个弯曲（弯曲起点以前不受影响）
  bendPose(pose)

  const roll = new THREE.Euler(THREE.MathUtils.degToRad(SUPINE_DEG), 0, 0)
  const anchors: Record<string, THREE.Vector3> = {
    pupalMandible: new THREE.Vector3(2.4, -0.3, 0.58),
    wingPad: new THREE.Vector3(0.1, -0.4, 0.8),
    legPad: onWall(FOLDED_LEGS[1].knee.x, FOLDED_LEGS[1].knee.phi, LEG_LIFT, 1),
    abdomen: new THREE.Vector3(-1.0, 0.5, 0),
    thorax: new THREE.Vector3(0.6, 0.85, 0),
    antennaPad: new THREE.Vector3(1.05, -0.32, 0.72),
  }
  for (const v of Object.values(anchors)) bendPoint(v).applyEuler(roll)

  return finalize(g, anchors)
}
