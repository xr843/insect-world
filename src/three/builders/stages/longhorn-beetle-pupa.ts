/**
 * 星天牛 · 蛹 Anoplophora chinensis（完全变态第 3 阶段）
 *
 * ## 一眼认出「这是天牛的蛹」，靠的是那对盘着的长触角
 *
 * 蛹这个阶段最难做：它既不像幼虫（一条乳白的粗虫）也不像成虫（黑底白星的
 * 大甲虫），大多数昆虫的蛹长得都差不多。天牛是极少数**蛹期就有独门特征**的
 * 类群 —— 成虫的触角比体长还长，蛹壳里装不下，只能**沿体侧向后铺、末端盘成
 * 一个圈**。本文件里别的都可以简化，这对触角不行：
 * 单条弧长 5.85 厘米、是蛹体长（3.52）的 1.66 倍，后段沿体表绕 1.05 圈，
 * 而且必须在默认机位一眼看得出是「盘着的」而不是「贴着的」。
 *
 * ## 离蛹（exarate）：这份文件的第二条主线
 *
 * 鞘翅目的蛹是**离蛹** —— 触角、足、翅芽各自成形、各有轮廓、**不贴在体壁上**；
 * 与蝶蛾的被蛹（附肢与体壁愈合成一枚一体的硬壳，`monarch-butterfly-pupa.ts`
 * 那种只能做成浅浮雕）恰成对照。这一条不是细节而是分类学要点，所以：
 * - 每一件附肢都离体壁有真实的净空（触角 0.19~0.24、翅芽 0.105、
 *   三对足分别 0.10 / 0.155 / 0.21），测试逐件量「顶点是不是落在体壁之外」，
 *   把附肢埋回体壁就红。
 * - 三对足按**不同的径向层**摆（前足最贴体、后足最外），既是真实的
 *   「折叠的足互相叠着」，也顺手解决了三对足在腹面挤成一团时互相穿模的问题。
 * - 触角摆在**最外层**：真实的天牛蛹里触角就压在折起的足与翅芽上面；
 *   放最外层同时保证它在任何机位都不被别的附肢挡住 —— 招牌不能被自己挡。
 *
 * ## 其余形态
 *
 * - 体长 3.5 厘米（真实 3~4）。头小、前胸背板宽大且**两侧已有侧刺突**
 *   （成虫那对科级识别特征在蛹期就看得出雏形，是接住「这是同一只虫」的一处扣子）。
 * - 腹部 7 节，节间浅沟 6%；背面成排小刺（蛹靠它在木质部的蛹室里扭动），
 *   腹末一对尾突。
 * - 复眼已经显色：`#8a5a2e`（明度 0.36）对体色 `#f0e2bb`（0.84），差 0.48。
 *   「能看出复眼的轮廓」这句话如果只靠几何隆起，在乳黄的体色上根本读不出来。
 * - **不做蛹室。** 星天牛在木质部里做一个蛹室化蛹，把蛹包进去等于把那对触角
 *   挡掉 —— 判据跟 `rhinoceros-beetle-pupa.ts` 决定不做土室时是同一条：
 *   哪种做法能让招牌结构被看见。（卵那一阶段反过来做了整块树皮，因为卵本身
 *   没有可看的结构，语境才是它读得出来的必要条件。）
 * - **姿态略仰卧**：整体绕 X 轴滚 −30°，腹面（触角、足、翅芽全在那一侧）
 *   转向观察者。不滚的话这一整套附肢在默认机位（相机仰角只有 16°）全看不见，
 *   等于白做。
 *
 * ## 颜色纪律
 *
 * 「乳白至淡黄」在 ACES 下是反过来最危险的一档：压深就成脏灰。所以体色
 * `#f0e2bb` 明度 0.84 不压，材质走 gloss 0.42 / clearcoat 0.12 —— `elytra()`
 * 那档（0.74 / 0.55）套在这个亮度上会把隆起的体积感整片吃掉（独角仙成虫
 * 当年就是这么变成「两个白球」的）。附肢比体色各深一档（0.72~0.75），
 * 才在同为浅色的体壁上分得出轮廓。
 *
 * 局部坐标系与成虫一致：+X 向前（头）、+Y 向上（背）、+Z 向右（姿态旋转前）。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 姿态与体形

/** 略仰卧：绕 X 轴滚这么多度，腹面（附肢那一侧）转向 +Z */
const SUPINE_DEG = -30

/** 体形包络（x → 半径）。三处缢缩分别是头/前胸、前胸/中胸、胸/腹的交界 */
const BODY_ENV = [
  [-1.66, 0.03],
  [-1.55, 0.14],
  [-1.35, 0.23],
  [-1.15, 0.3],
  [-0.9, 0.36],
  [-0.6, 0.41],
  [-0.3, 0.435],
  [0.0, 0.44],
  [0.1, 0.41],
  [0.18, 0.44],
  [0.35, 0.45],
  [0.55, 0.42],
  [0.64, 0.36],
  [0.7, 0.4],
  [0.8, 0.45],
  [1.0, 0.455],
  [1.2, 0.42],
  [1.36, 0.32],
  [1.44, 0.22],
  [1.5, 0.265],
  [1.58, 0.27],
  [1.72, 0.22],
  [1.8, 0.14],
  [1.86, 0.03],
] as const

const BODY_FRONT = 1.86
const BODY_REAR = -1.66
// 体长 3.52 厘米

/** 腹部分节：7 节，从胸腹交界到腹末 */
const ABD_FROM = 0.12
const ABD_TO = -1.55
const ABD_SEGMENTS = 7
/** 节间沟深 6%。第一版用 kit 默认的 15%，背缘剪影成了一排锯齿（松果病） */
const ABD_GROOVE = 0.06

/** 横截面略背腹压扁 */
const FLAT_Y = 0.95
const FLAT_Z = 1.06

/** 分段线性 + smoothstep 的关键帧插值 */
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

/** 腹节的窄折痕（`|cos|^6`）。宽凹槽在这个粗细上会读成松果的鳞片 */
function abdomenCrease(x: number): number {
  if (x > ABD_FROM || x < ABD_TO) return 1
  const p = ((ABD_FROM - x) / (ABD_FROM - ABD_TO)) * ABD_SEGMENTS
  return 1 - ABD_GROOVE * Math.pow(Math.abs(Math.cos(p * Math.PI)), 6)
}

function bodyRadius(x: number): number {
  return keyframe(BODY_ENV, x) * abdomenCrease(x)
}

/**
 * 体壁的**最大**向径（= 横截面椭圆的长半轴）。附肢的净空一律按它算 ——
 * 按平均半径算的话，正侧方的附肢会因为截面是扁的而悄悄陷进体壁里。
 * 这里刻意不含节间折痕：折痕会让净空沿体轴一节一节地抖，附肢跟着起皱。
 */
function envMax(x: number): number {
  return keyframe(BODY_ENV, x) * FLAT_Z
}

/**
 * 腹面壳层上的一个点：`x` 处、离腹中线 `betaDeg` 度、离体壁 `extra` 远。
 * 三对足、翅芽、触角全部按它定位，所以「离体壁多远」这件事只有一个来源，
 * 改体形时附肢不会留在原地穿模。
 */
function shell(x: number, betaDeg: number, extra: number, side: 1 | -1): THREE.Vector3 {
  const r = envMax(x) + extra
  const b = THREE.MathUtils.degToRad(betaDeg)
  return new THREE.Vector3(x, -r * Math.cos(b), side * r * Math.sin(b))
}

// ---------------------------------------------------------------- 颜色

/** 蛹体：乳白偏淡黄（明度 0.84），不压深 */
const BODY_COLOR = '#f0e2bb'
/** 触角：比体色深一档才在浅色体壁上分得出轮廓 */
const ANTENNA_COLOR = '#dfc98f'
/** 翅芽 */
const PAD_COLOR = '#e2cf9c'
/** 足 */
const LEG_COLOR = '#dccc9a'
/** 复眼：已开始显色的深褐（明度 0.36），与体色差 0.48 */
const EYE_COLOR = '#8a5a2e'
/** 背刺、尾突、上颚芽这类深色小件 */
const DARK_COLOR = '#7a5526'

// ---------------------------------------------------------------- 体躯

/** 躯干：一条放样体走完头—胸—腹。三段之间的缢缩写在包络里，不拼三个纺锤 ——
 * 拼段的话每段的放样封口盘都会在交界处露出来，读成「几截拼起来的」
 * （`rhinoceros-beetle-pupa.ts` 第一版就是这么在躯干中间露出一道圆盘的）。 */
function bodyMesh(material: THREE.Material): THREE.Mesh {
  const steps = 210
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const x = THREE.MathUtils.lerp(BODY_FRONT, BODY_REAR, i / steps)
    const r = Math.max(bodyRadius(x), 1e-4)
    sections.push({ at: new THREE.Vector3(x, 0, 0), ry: r * FLAT_Y, rz: r * FLAT_Z })
  }
  const mesh = new THREE.Mesh(loft(sections, 24), material)
  mesh.name = 'pupa-body'
  return mesh
}

/** 前胸背板两侧的侧刺突：成虫那对科级识别特征在蛹期已见雏形 */
function pronotalSpines(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const base = shell(0.98, 90, -0.06, side)
    const tip = shell(0.84, 96, 0.13, side)
    const mesh = new THREE.Mesh(
      loft(
        [
          { at: base, ry: 0.075, rz: 0.075 },
          { at: base.clone().lerp(tip, 0.55), ry: 0.045, rz: 0.045 },
          { at: tip, ry: 0.008, rz: 0.008 },
        ],
        10,
      ),
      material,
    )
    mesh.name = 'pupa-pronotal-spine'
    g.add(mesh)
  }
  return g
}

// ---------------------------------------------------------------- 触角

/** 触角基部（头侧）离腹中线的角度 */
const ANT_BASE_BETA = 66
/** 盘曲段在体轴上的中心与沿体轴的半幅 */
const COIL_X = -1.05
const COIL_A = 0.48
/** 盘心所在的方位角与方位角上的半幅（度）。β 最低到 14° —— 再低两侧的盘会在腹中线撞上 */
const COIL_BETA = 45
const COIL_BETA_AMP = 34
/** 盘绕的圈数。1.05 圈：不足一圈读成「弯了一下」，两圈以上又会盖住半个腹部 */
const COIL_TURNS = 1.05
/**
 * 盘曲段的起始相位（度）。150° 不是随手取的：该处的切向恰好是
 * 「沿体轴向后 + 方位角减小」，与前段掠过来的方向一致 —— 换个相位，
 * 前段与盘曲段的接缝上就会出现一个硬拐角。
 */
const COIL_PSI0 = 150
/** 前段中途抬到的最大净空（压在折起的足与翅芽上面）与并入盘曲段时的净空 */
const ANT_LIFT_MID = 0.24
const ANT_LIFT_COIL = 0.19

/**
 * 触角中心线。
 *
 * 前段：自头侧沿体侧后掠。离体壁的净空由 0.10 抬到 0.24 —— 抬升这一步是
 * 有讲究的：不抬的话它会跟前足的膝、翅芽的内缘挤在同一层里互相穿模；
 * 抬到最外层既真实（真天牛蛹的触角就压在折起的足与翅芽上面）又保证
 * 招牌不被自己的附肢挡住。
 *
 * 后段：盘成一圈。
 * ⚠️ 盘**不是**画在一个平面里再摆到体侧的 —— 那样做盘必须离体轴足够远才能
 * 躲开最粗的那一段，于是在渐渐收细的腹末就浮起 0.45 那么高，读成一根悬空的
 * 铁丝。这里改成在「体表参数」`(x, 方位角)` 里画椭圆、再按恒定净空贴回体壁：
 * 盘因此**跟着腹部一起收细**，从头到尾都贴着虫身盘着。
 * 每绕一圈向外漂 0.09、半幅缩 14%，两圈才不会叠成一条线。
 */
function antennaCenterline(side: 1 | -1): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  const psi0 = THREE.MathUtils.degToRad(COIL_PSI0)
  const entryX = COIL_X + COIL_A * Math.cos(psi0)
  const entryBeta = COIL_BETA + COIL_BETA_AMP * Math.sin(psi0)

  const runSteps = 44
  for (let i = 0; i <= runSteps; i++) {
    const t = i / runSteps
    const lift =
      0.1 +
      (ANT_LIFT_MID - 0.1) * THREE.MathUtils.smoothstep(t, 0, 0.28) -
      (ANT_LIFT_MID - ANT_LIFT_COIL) * THREE.MathUtils.smoothstep(t, 0.72, 1)
    pts.push(
      shell(
        THREE.MathUtils.lerp(1.62, entryX, t),
        THREE.MathUtils.lerp(ANT_BASE_BETA, entryBeta, THREE.MathUtils.smoothstep(t, 0, 1)),
        lift,
        side,
      ),
    )
  }

  const coilSteps = 84
  for (let i = 1; i <= coilSteps; i++) {
    const psi = psi0 + (i / coilSteps) * COIL_TURNS * Math.PI * 2
    const turn = (psi - psi0) / (Math.PI * 2)
    const shrink = 1 - 0.14 * turn
    pts.push(
      shell(
        COIL_X + COIL_A * shrink * Math.cos(psi),
        COIL_BETA + COIL_BETA_AMP * shrink * Math.sin(psi),
        ANT_LIFT_COIL + 0.09 * turn,
        side,
      ),
    )
  }
  return pts
}

/**
 * 触角：沿中心线放样，半径按 11 个节点收缩一次。
 *
 * 节点相位按**累计弧长**算而不是按采样下标：前段一步 0.07、盘曲段一步 0.03，
 * 按下标算的话节间收缩会在盘上挤成一片、在前段稀成几道，读起来像两根不同的触角。
 *
 * 逐节切成独立 mesh（成虫 `longhorn-beetle.ts` 为了画黑白环纹只能那样做）
 * 在这里没必要 —— 蛹的触角是均一的乳黄色，节间收缩用半径函数表达即可，
 * 一根整管还省掉 11 处放样封口盘。
 */
function antenna(side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const pts = antennaCenterline(side)
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]))
  const total = cum[cum.length - 1]
  const sections: Section[] = pts.map((at, i) => {
    const s = cum[i] / total
    const node = Math.pow(Math.abs(Math.cos(s * 11 * Math.PI)), 6)
    const r = THREE.MathUtils.lerp(0.058, 0.026, Math.pow(s, 0.8)) * (1 - 0.25 * node)
    return { at, ry: r, rz: r * 0.92 }
  })
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'pupa-antenna'
  return mesh
}

// ---------------------------------------------------------------- 翅芽

/** 翅芽所在的方位角（离腹中线）。88° ≈ 正侧方，默认机位与侧机位都正对着它 */
const PAD_BETA = 88
/** 翅芽中面离体壁的净空与半厚：内表面仍在体壁外 0.05，「不贴体」是离蛹的定义 */
const PAD_EXTRA = 0.105
const PAD_HALF_T = 0.055

/**
 * 翅芽（鞘翅的前身）：自中胸侧腹面向后盖到腹部第 2 节。
 *
 * 摆位方式抄 `rhinoceros-beetle-pupa.ts` 的 `flankPad`：整组绕 X 转到
 * 「组的局部 +Y = 该方位角处的体壁外法线」，组内只写「离体轴多远、多厚、多宽」。
 * ⚠️ 左侧**不能**用 `scale.z = −1` 镜像：矩阵是 T·R·S，缩放先作用于局部向量，
 * 而局部 +Y 的 z 分量是 0 —— 翻 scale.z 对它毫无影响，两侧的芽会一起指向 +Z。
 * 镜像必须做在角度上。
 */
function wingPad(side: 1 | -1, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.rotation.x = Math.PI - THREE.MathUtils.degToRad(PAD_BETA) * side

  const samples: readonly (readonly [number, number])[] = [
    [0.66, 0.05],
    [0.5, 0.16],
    [0.25, 0.23],
    [-0.05, 0.245],
    [-0.28, 0.2],
    [-0.45, 0.11],
    [-0.55, 0.03],
  ]
  const sections: Section[] = samples.map(([x, halfW], i) => {
    const t = i / (samples.length - 1)
    const thin = 0.35 + 0.65 * Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0.04, 0.96))
    return {
      at: new THREE.Vector3(x, envMax(x) + PAD_EXTRA + PAD_HALF_T, 0),
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
  /** 这一对足所在的径向层。前足最贴体、后足最外 —— 折起来的三对足本来就是叠着的 */
  extra: number
}

/**
 * 三对足的折叠方案：腿节向外后方伸到体侧的膝，胫节折回腹面，跗节顺着腹面后伸。
 * 膝角落在 90°~110°，一眼看得出是折起来的而不是伸直的。
 *
 * 三对分层（0.10 / 0.155 / 0.21）不只是防穿模：真实离蛹的三对足在腹面本来
 * 就互相压着，分层出来的深度差正是「能看出各自轮廓」的那件事。
 */
const LEGS: readonly LegPlan[] = [
  { joints: [[1.18, 16], [0.86, 50], [0.58, 30], [0.34, 16]], extra: 0.1 },
  { joints: [[0.84, 13], [0.48, 47], [0.18, 28], [-0.08, 15]], extra: 0.155 },
  { joints: [[0.48, 10], [0.08, 44], [-0.22, 26], [-0.46, 14]], extra: 0.21 },
]

/** 每节的起止半径：腿节最粗（肌肉所在），跗节收到 0.018 */
const LEG_RADII = [
  [0.055, 0.046],
  [0.046, 0.034],
  [0.034, 0.018],
] as const

function pupaLeg(plan: LegPlan, side: 1 | -1, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const pts = plan.joints.map(([x, beta]) => shell(x, beta, plan.extra, side))
  for (let i = 0; i < 3; i++) {
    const [r0, r1] = LEG_RADII[i]
    const steps = 6
    const sections: Section[] = []
    for (let k = 0; k <= steps; k++) {
      const t = k / steps
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3().lerpVectors(pts[i], pts[i + 1], t), ry: r, rz: r })
    }
    const seg = new THREE.Mesh(loft(sections, 12), material)
    seg.name = 'pupa-leg-segment'
    g.add(seg)
    // 关节球：折角处不填球会露出两截管子的封口盘，读成「断了」
    if (i < 2) {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(r1 * 1.15, 10, 8), material)
      joint.name = 'pupa-leg-joint'
      joint.position.copy(pts[i + 1])
      g.add(joint)
    }
  }
  return g
}

// ---------------------------------------------------------------- 头部与小件

/** 复眼：一对压扁的深色隆起，贴在头的背侧方 */
function eyes(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const at = shell(1.6, 112, -0.02, side)
    const out = at.clone().setX(0).normalize()
    const third = new THREE.Vector3(1, 0, 0).cross(out).normalize()
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), material)
    m.name = 'pupa-eye'
    m.position.copy(at)
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), out, third))
    m.scale.set(1.25, 0.6, 0.95)
    g.add(m)
  }
  return g
}

/** 上颚芽：头前一对短钝的深色突起。成虫那对粗壮大颚在这里还只是个雏形 */
function mandibleBuds(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const mesh = new THREE.Mesh(
      loft(
        [
          { at: new THREE.Vector3(1.74, -0.06, side * 0.075), ry: 0.055, rz: 0.048 },
          { at: new THREE.Vector3(1.85, -0.1, side * 0.062), ry: 0.04, rz: 0.034 },
          { at: new THREE.Vector3(1.93, -0.13, side * 0.04), ry: 0.014, rz: 0.012 },
        ],
        10,
      ),
      material,
    )
    mesh.name = 'pupa-mandible-bud'
    g.add(mesh)
  }
  return g
}

/**
 * 背面成排小刺 + 腹末一对尾突。
 * 蛹在木质部的蛹室里靠这些小刺蹬着壁扭动（它没有别的运动器官），
 * 顺带让背缘剪影不至于是一条光滑的锥。
 */
function dorsalSpinelets(material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const segLen = (ABD_FROM - ABD_TO) / ABD_SEGMENTS
  for (let s = 0; s < 6; s++) {
    const x = ABD_FROM - (s + 0.45) * segLen
    for (let k = 0; k < 6; k++) {
      const beta = 150 + k * 12
      for (const side of [1, -1] as const) {
        const base = shell(x, beta, -0.015, side)
        const tip = shell(x - 0.03, beta, 0.055, side)
        const m = new THREE.Mesh(
          loft([{ at: base, ry: 0.026, rz: 0.026 }, { at: tip, ry: 0.004, rz: 0.004 }], 6),
          material,
        )
        m.name = 'pupa-spinelet'
        g.add(m)
      }
    }
  }
  for (const side of [1, -1] as const) {
    const base = shell(-1.5, 168, -0.02, side)
    const tip = shell(-1.66, 176, 0.06, side)
    const m = new THREE.Mesh(
      loft([{ at: base, ry: 0.05, rz: 0.05 }, { at: tip, ry: 0.006, rz: 0.006 }], 8),
      material,
    )
    m.name = 'pupa-urogomphus'
    g.add(m)
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildLonghornBeetlePupa(): InsectModel {
  const g = new THREE.Group()
  /*
   * 姿态层：整体绕 X 轴滚 SUPINE_DEG。放在内层而不是根 group 上，
   * 是为了让 finalize() 的居中与包围球照旧在根上算；锚点则手工套同一个旋转
   * ——两者共用同一个角度常量，不会各改各的。
   */
  const pose = new THREE.Group()
  pose.name = 'pupa-pose'
  pose.rotation.x = THREE.MathUtils.degToRad(SUPINE_DEG)
  g.add(pose)

  /*
   * 蛹壳是软的、半哑光的角质，不是成虫那层上过清漆的鞘翅。
   * gloss 0.42 / clearcoat 0.12 —— 上限卡在这里有具体理由：`elytra()` 那档
   * （0.74 / 0.55）在这个亮度的乳黄上会把隆起的体积感直接吃掉。
   */
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.42, clearcoat: 0.12, surface: 'punctate' })
  const antennaMat = chitin({ color: ANTENNA_COLOR, gloss: 0.46, clearcoat: 0.16 })
  const padMat = chitin({ color: PAD_COLOR, gloss: 0.4, clearcoat: 0.12, surface: 'striate' })
  const legMat = chitin({ color: LEG_COLOR, gloss: 0.44, clearcoat: 0.14 })
  const eyeMat = chitin({ color: EYE_COLOR, gloss: 0.6, clearcoat: 0.4 })
  const darkMat = chitin({ color: DARK_COLOR, gloss: 0.45, clearcoat: 0.2 })

  pose.add(bodyMesh(bodyMat))
  pose.add(pronotalSpines(bodyMat))
  pose.add(eyes(eyeMat))
  pose.add(mandibleBuds(darkMat))
  pose.add(dorsalSpinelets(darkMat))

  for (const side of [1, -1] as const) {
    pose.add(wingPad(side, padMat))
    for (const plan of LEGS) pose.add(pupaLeg(plan, side, legMat))
    // 触角最后加、摆最外层：招牌不能被自己的附肢挡住
    pose.add(antenna(side, antennaMat))
  }

  // 锚点在未滚转的体坐标里定义，再套上与 pose 同一个旋转
  const coilLine = antennaCenterline(1)
  const anchors: Record<string, THREE.Vector3> = {
    // 触角锚点取盘上真实的一个点（第一圈的外缘），不靠估 offset 猜位置
    antenna: coilLine[Math.round(coilLine.length * 0.78)].clone(),
    wingPad: shell(0.1, PAD_BETA, PAD_EXTRA + PAD_HALF_T, 1),
    leg: shell(0.86, 50, LEGS[0].extra, 1),
    eye: shell(1.6, 112, 0.03, 1),
    thorax: shell(0.98, 175, -0.05, 1),
    abdomen: shell(-0.8, 168, -0.05, 1),
  }
  const roll = new THREE.Euler(THREE.MathUtils.degToRad(SUPINE_DEG), 0, 0)
  for (const v of Object.values(anchors)) v.applyEuler(roll)

  return finalize(g, anchors)
}
