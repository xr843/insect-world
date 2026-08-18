/**
 * 双叉犀金龟 · 蛹 Trypoxylus dichotomus（完全变态第 3 阶段）
 *
 * ## 这只蛹的全部价值：头端已经能看出两支角
 *
 * 蛴螬是一条乳白的胖虫，成虫是一只黑亮带角的甲虫 —— 中间隔着的就是它。
 * **一支头角、一支胸角的短粗前身，在蛹上已经成形**，这是整个项目最有教育
 * 价值的一处形态：它把「白虫」和「黑甲」这两张互不相干的图接了起来。
 * 所以本文件里别的都可以简化，这两支角不行 —— 必须做出来，而且必须在
 * 默认机位与四个验收机位下都**看得出是两支**。
 *
 * 分寸拿捏（三处都是出图之后才改对的）：
 * - 蛹角是**鞘**，不是成虫那支武器：短、粗、钝。头角长 1.05 / 基部半径 0.26，
 *   粗细比 0.25；成虫是 2.25 / 0.30，比 0.13。差这一倍就是「还没长开」与
 *   「小一号的成虫」的分界。⚠️ 第一版给的是长 1.32 / 半径 0.21（比 0.16，
 *   基本就是成虫的比例）、而且一路弯到 −92° 垂下去 —— 出图后整只蛹读成
 *   一只**虾**，那支角读成虾钳。
 * - 两支角必须隔开，而且要从**体表**长出来。第一版把胸角架在 y=0.68，
 *   悬在前胸背板表面之上 0.25。现在基部**沉进**背板最鼓处（x=1.00，该处
 *   背板顶在 y≈0.89，基部在 0.62），几乎平伸，与一路下弯的头角在头前拉开
 *   约 0.4 的净空。角与体的接缝必须埋起来 —— 露出来的放样封口盘是一枚平
 *   圆盘，在剪影里就是一道笔直的硬边，会把整支角读成一片「鳍」。
 *   ⚠️ 这条净空按**投影**核过，不是按三维距离：黑翅土白蚁兵蚁的两颚在世界
 *   坐标里分得很开，默认机位的视线方向恰好把分离压扁，屏幕上糊成一根独角。
 *   这里的分离量放在 Y 上（默认机位视线在 XZ 面上分量最大，压不掉 Y），
 *   测试也按成像平面的投影分箱判，不按三维距离。
 * - 头角末端**已经分叉**（本种得名「双叉」之处，蛹期就看得出雏形），
 *   两枝往 ±Z 岔开 36°，顶视一眼看得出是两枝。
 *
 * ## 体形比例：为什么第一版是一只虾
 *
 * 第一版腹部占了全长 73%、前胸背板只是个小圆疙瘩，加上那支长钳 —— 剪影
 * 就是一只虾。真实的鞘翅目蛹恰恰相反：**前胸背板是全身最宽的一块盾**
 * （这里最大半径 0.86 / 半宽 0.96，比腹部最粗处还宽三成），腹部占六成、
 * 逐节收细但末端圆钝。改完这两条，剪影才回到「甲虫的蛹」。
 *
 * ## 其余形态
 *
 * - **裸蛹**，不结茧：鞘翅目的蛹是暴露的，末龄幼虫在土里做一个光滑土室化蛹。
 *   这里**不建土室** —— 把蛹包进土室等于把那两支角挡掉，而角是这个阶段的
 *   全部看点。（卵那一阶段反过来做了土室，因为卵本身没有可看的结构，语境
 *   才是它读得出「这是虫卵」的必要条件。两处相反的决定，判据是同一条：
 *   哪种做法能让招牌结构被看见。）
 * - 腹部分节：`segmentedAbdomen` 6 节 + `segmentedAbdomenMembranes` 的节间
 *   膜环（kit 早就备好、此前无人调用的能力）。⚠️ 两者的 `membraneRatio`
 *   必须**不同**（体节 0.86 / 膜环 0.93），否则膜环与体节交界处的收缩半径
 *   分毫不差地重合，整圈膜环要么被埋掉、要么与体壁打架。
 *   而 `groove` 只给 0.07：第一版取 kit 默认的 0.15 并叠上 0.2 的膜收缩，
 *   交界处半径一口气掉 33%，背缘剪影成了一排锯齿（松果病）。
 * - 翅芽与足芽贴在腹面。⚠️ 第一版是几片手写世界坐标的扁椭圆，侧视读成
 *   几片悬空的「剪纸」（兰花螳螂的花瓣腿节栽的就是这个）。这一版改用
 *   `flankPad()`：整组绕 X 转到「组的局部 +Y = 该处体壁外法线」，再按
 *   「离体轴多远、多厚、多宽」摆截面，芽自然半埋在体壁里。
 * - 腹节侧缘的成对小突（ampullae）：蛹靠它在土室里扭动，是真实结构，
 *   顺带让侧剪影不至于是一条光滑的锥。
 * - **姿态略仰卧**：整体绕 X 轴滚 −24°，腹面朝向观察者一侧。不是为了好看
 *   —— 不滚的话腹面那一整套翅芽足芽在任何机位都看不见，等于白做。
 *
 * 颜色：`#c2762f` 橙褐。ACES 会提亮去饱和，但这一档已经在 `ladybird.ts`
 * 的 `#e2382a`（目视验收过的「够亮」基准）同一个亮度带里，不必再压 ——
 * 压深一档就成了闷褐，蛹和幼虫的色差也跟着塌掉。
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

/** 蛹体：橙褐。与 ladybird 的 #e2382a 同一亮度带，不再往下压 */
const BODY_COLOR = '#c2762f'
/** 角鞘：比体色深一档（骨化程度更高的观感），但远不到近黑 */
const HORN_COLOR = '#9d551f'
/** 翅芽 / 足芽：比体色略深略暗，才分得出「贴在腹面的另一层」 */
const PAD_COLOR = '#a85f26'
/** 气门与侧突的深色小点 */
const DARK_COLOR = '#5d2f10'

/** 略仰卧：绕 X 轴滚这么多度，腹面转向 +Z（默认机位与侧机位都在那一侧） */
const SUPINE_DEG = -24

// ---------------------------------------------------------------- 体段

/**
 * 腹部：6 节，前粗后细、背腹略压扁（flat 1.08，语义见 kit.spindle 注释：
 * >1 = 上下压扁）。前端塞进前胸背板里（x=0.55 处背板半径 0.745 > 腹部
 * r0 0.66），两段的可见表面在 x≈0.3 附近自然交接 ——
 * ⚠️ 第一版两段谁都罩不住谁，背板的后端封口盘与腹部的前端封口盘双双露在
 * 外面，渲染出来是躯干中间一道明晃晃的圆盘，而顶点数 / 包围盒 / NaN 检查
 * 全是绿的。
 */
const ABDOMEN: SegmentedAbdomenOptions = {
  from: [0.55, 0.02, 0],
  to: [-1.95, 0.1, 0],
  r0: 0.66,
  r1: 0.32,
  segments: 6,
  groove: 0.07,
  membraneRatio: 0.86,
  flat: 1.08,
  bulge: 0.22,
  color: BODY_COLOR,
}
/** 膜环单独用一个更大的比例，才不会与体节自身的收缩重合（见文件头） */
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

/** 前胸背板：全身最宽的一块盾，胸角就从它的最鼓处长出来 */
const THORAX: SpindleSpec = {
  // taperStart 0.05：后端几乎收成一点，整个藏进腹部里，不留封口盘
  from: [-0.35, 0.04, 0],
  to: [1.55, 0.16, 0],
  radius: 0.86,
  bulge: 0.72,
  flat: 1.12,
  taperStart: 0.05,
  // taperEnd 0.18：前端封口盘半径只有 0.155，小于头部在该处的 0.255，
  // 才不会在头的外圈露出一道圆环（0.4 那一档露过）
  taperEnd: 0.18,
}

/**
 * 头：小而低垂，正好夹在两支角之间露出来。
 * 后端一直探到 x=1.25（背板半径 0.60 处）且 taperStart 只有 0.5 ——
 * 起点封口盘半径 0.21 完全藏在背板里。⚠️ 起点若停在 1.42、taperStart 0.85，
 * 封口盘半径 0.357 比该处背板的 0.286 还大，头与背板之间会露出一圈硬边，
 * 出图上读成「两段拼起来的」。
 */
const HEAD: SpindleSpec = {
  from: [1.25, -0.02, 0],
  to: [2.05, -0.18, 0],
  radius: 0.42,
  bulge: 0.62,
  flat: 1.02,
  taperStart: 0.5,
  taperEnd: 0.25,
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
 * 腹部与背板在中段重叠，取更粗的那个 —— 那才是实际看得见的表面。
 */
function bodyWall(x: number, phi: number): { axisY: number; r: number } {
  let best = { axisY: 0, r: 0 }
  for (const c of [abdomenRadius(x), spindleRadius(THORAX, x)]) {
    if (!c) continue
    // 椭圆在给定方位角上的向径
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
    const r = Math.max((ABDOMEN.r1 ?? 0.3) * Math.sqrt(Math.max(0, 1 - u * u)), 1e-4)
    sections.push({
      at: from.clone().addScaledVector(dir, u * ABDOMEN.r1 * 1.15),
      ry: r / flat,
      rz: r * flat,
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 22), material)
  mesh.name = 'pupa-abdomen-tip'
  return mesh
}

// ---------------------------------------------------------------- 角鞘

interface HornSpec {
  base: [number, number, number]
  /** 弧长 */
  length: number
  /** 起止俯仰角（度，负值向下）。角鞘是一条沿途持续下弯的弧，不是直锥 */
  from: number
  to: number
  r0: number
  r1: number
  name: string
  /** 末端分叉（只有头角有） */
  fork?: { length: number; spread: number; radius: number }
}

/**
 * 角鞘：按俯仰角沿弧长积分出一条真正下弯的路径，再逐点放样。
 *
 * 不复用成虫 `rhinoceros-beetle.ts` 的 `hornY()`：那支角是「向前上方伸出、
 * 末端翘起」的武器，弧度是往上的；蛹角恰恰相反 —— 从头前伸出后向前下方
 * 弯，是一支还没展开的鞘。曲率方向不同，参数化也就不同。
 */
function hornSheath(spec: HornSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const steps = 18
  const ds = spec.length / steps
  const p = new THREE.Vector3(...spec.base)
  const sections: Section[] = []
  let dir = new THREE.Vector3(1, 0, 0)
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(spec.r0, spec.r1, Math.pow(t, 0.85))
    // 角鞘略侧扁（rz < ry）：正圆管读成一根香肠，侧扁才有「角」的硬度
    sections.push({ at: p.clone(), ry: r, rz: r * 0.86 })
    const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(spec.from, spec.to, t))
    dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0)
    p.addScaledVector(dir, ds)
  }
  const shaft = new THREE.Mesh(loft(sections, 18), material)
  shaft.name = spec.name
  g.add(shaft)

  if (spec.fork) {
    // 末端两枝：沿末端切向往 ±Z 岔开。分离量放在 Z 上，顶视一眼看得出是两枝
    const tip = sections[sections.length - 1].at as THREE.Vector3
    const spread = THREE.MathUtils.degToRad(spec.fork.spread)
    for (const side of [1, -1] as const) {
      const pd = new THREE.Vector3(dir.x * Math.cos(spread), dir.y * Math.cos(spread), side * Math.sin(spread)).normalize()
      const fs: Section[] = []
      const fsteps = 8
      for (let i = 0; i <= fsteps; i++) {
        const t = i / fsteps
        const at = tip
          .clone()
          .addScaledVector(pd, spec.fork.length * t)
          // 枝端微微回翘，跟成虫那对分叉同一个走向
          .add(new THREE.Vector3(0, spec.fork.length * 0.2 * t * t, 0))
        fs.push({ at, ry: spec.fork.radius * (1 - t * 0.8), rz: spec.fork.radius * 0.85 * (1 - t * 0.8) })
      }
      const prong = new THREE.Mesh(loft(fs, 12), material)
      prong.name = `${spec.name}-prong`
      g.add(prong)
    }
  }
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
 * 贴壁的芽（翅芽 / 足芽）。
 *
 * 关键在**摆位方式**而不是形状：整组绕 X 轴转到「组的局部 +Y = 该 φ 处体壁
 * 的外法线」，组内只需按「离体轴多远、多厚、多宽」写截面 —— 于是芽天然
 * 半埋在体壁里，宽的那一维贴着体表铺开。
 *
 * 手写世界坐标的做法（第一版）做不到这件事：`loft()` 的截面椭圆恒以标架的
 * u/v 为轴（`Section.roll` 只挪 UV 接缝，不转椭圆），扁截面因此永远是
 * 「上下扁」，贴不到斜着的体侧上；结果就是几片悬在体表外的「剪纸」。
 */
function flankPad(spec: PadSpec, material: THREE.Material, side: 1 | -1): THREE.Group {
  const phi = THREE.MathUtils.degToRad(spec.phi)
  const mid = spec.samples[Math.floor(spec.samples.length / 2)][0]

  const g = new THREE.Group()
  g.position.y = bodyWall(mid, phi).axisY
  /*
   * 局部 +Y → 该处体壁的外法线 (0, −cosφ, side·sinφ)：绕 X 转 (π − side·φ)。
   *
   * ⚠️ 左侧**不能**用 `scale.z = −1` 镜像。矩阵是 T·R·S，缩放先作用于局部
   * 向量、旋转再作用于结果，而局部 +Y 的 z 分量是 0 —— 翻 scale.z 对它毫无
   * 影响，两侧的芽会一起指向 +Z，左边那三片就成了半空中的几块斜板。
   * （出图时它们正是那几片「凭空多出来的平面」。kit.legPair 能用 scale.z
   * 是因为那一层 group 本身没有旋转；这里有，所以镜像必须做在角度上。）
   */
  g.rotation.x = Math.PI - phi * side

  const sections: Section[] = []
  for (const [x, halfThick, halfWide] of spec.samples) {
    // 圆心正落在体壁上：一半埋进去、一半露出来，读成隆脊而不是贴片
    sections.push({ at: new THREE.Vector3(x, bodyWall(x, phi).r, 0), ry: halfThick, rz: halfWide })
  }
  const mesh = new THREE.Mesh(loft(sections, 18), material)
  mesh.name = spec.name
  g.add(mesh)
  return g
}

/** 翅芽：一对宽扁的鞘翅前身，自胸部腹侧向后盖到腹部第 3 节 */
const WING_PAD: PadSpec = {
  phi: 62,
  samples: [
    [1.2, 0.03, 0.1],
    [0.85, 0.08, 0.24],
    [0.3, 0.095, 0.3],
    [-0.35, 0.085, 0.27],
    [-0.85, 0.05, 0.16],
    [-1.05, 0.02, 0.05],
  ],
  name: 'pupa-wing-pad',
}

/** 足芽：三对折起来的足，截面正圆（隆脊，不是板），从内到外排在腹面 */
const LEG_PADS: PadSpec[] = [
  {
    phi: 12,
    samples: [
      [1.35, 0.03, 0.03],
      [1.0, 0.08, 0.08],
      [0.62, 0.09, 0.09],
      [0.45, 0.03, 0.03],
    ],
    name: 'pupa-leg-pad',
  },
  {
    phi: 29,
    samples: [
      [1.22, 0.03, 0.03],
      [0.8, 0.085, 0.085],
      [0.25, 0.095, 0.095],
      [0.05, 0.035, 0.035],
    ],
    name: 'pupa-leg-pad',
  },
  {
    phi: 45,
    samples: [
      [1.02, 0.03, 0.03],
      [0.55, 0.09, 0.09],
      [-0.2, 0.1, 0.1],
      [-0.45, 0.035, 0.035],
    ],
    name: 'pupa-leg-pad',
  },
]

// ---------------------------------------------------------------- 装配

export function buildRhinocerosBeetlePupa(): InsectModel {
  const g = new THREE.Group()
  /*
   * 姿态层：整体绕 X 轴滚 SUPINE_DEG。放在内层而不是根 group 上，
   * 是为了让 finalize() 的居中与包围球照旧在根上算；锚点则手工套同一个
   * 旋转（见文件末尾）—— 两者共用同一个角度常量，不会各改各的。
   */
  const pose = new THREE.Group()
  pose.name = 'pupa-pose'
  pose.rotation.x = THREE.MathUtils.degToRad(SUPINE_DEG)
  g.add(pose)

  /*
   * 蛹壳是软的、半哑光的角质，不是成虫那层上过清漆的鞘翅。
   * gloss 0.42 / clearcoat 0.12 —— 上限卡在这里有具体理由：`elytra()` 那档
   * （0.74 / 0.55）在这个亮度的橙褐上会把隆起的体积感直接吃掉，
   * 独角仙成虫当年就是这么变成「两个白球」的。
   */
  const bodyMat = chitin({ color: BODY_COLOR, gloss: 0.42, clearcoat: 0.12, surface: 'punctate' })
  const hornMat = chitin({ color: HORN_COLOR, gloss: 0.5, clearcoat: 0.2 })
  const padMat = chitin({ color: PAD_COLOR, gloss: 0.36, clearcoat: 0.1, surface: 'striate' })
  const darkMat = chitin({ color: DARK_COLOR, gloss: 0.4, clearcoat: 0.16 })

  // ---- 腹部（分节 + 节间膜环）
  const abdomen = new THREE.Mesh(segmentedAbdomen(ABDOMEN), bodyMat)
  abdomen.name = 'pupa-abdomen'
  pose.add(abdomen)
  for (const ring of segmentedAbdomenMembranes({ ...ABDOMEN, membraneRatio: MEMBRANE_RING_RATIO })) pose.add(ring)
  pose.add(abdomenTip(bodyMat))

  // ---- 前胸背板：全身最宽的一块盾
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

  // ---- 头角雏形：粗短、向前下方弯、末端已分叉（本阶段的招牌）
  pose.add(
    hornSheath(
      {
        // 基部埋进头里（x=1.75 处头部纵向范围 [−0.53, 0.29]，基部圆盘
        // [−0.46, 0.06] 整个在里面）：⚠️ 放在头的前缘 x=1.92 时，
        // 起点封口盘有一角露在头下方，出图读成一条硬边。
        // 露在外面的那一截约 0.95 长、基部半径 0.20，粗细比 0.21，
        // 仍然是「粗短的鞘」而不是成虫那支细长的武器。
        base: [1.75, -0.2, 0],
        length: 1.25,
        from: -10,
        to: -55,
        r0: 0.26,
        r1: 0.1,
        name: 'pupa-head-horn',
        fork: { length: 0.3, spread: 36, radius: 0.1 },
      },
      hornMat,
    ),
  )

  // ---- 胸角雏形：更短更钝，自背板最鼓处近乎平伸，与头角对成一副小钳
  pose.add(
    hornSheath(
      {
        // 同上：基部沉进背板 0.27 深，起点封口盘才不会在背板外缘拉出
        // 一道笔直的硬边（第一版把基部正贴在体表，magenta 那块「鳍」
        // 就是那道封口盘）
        base: [1.0, 0.62, 0],
        length: 1.05,
        from: 2,
        to: -18,
        r0: 0.24,
        r1: 0.075,
        name: 'pupa-thorax-horn',
      },
      hornMat,
    ),
  )

  // ---- 腹面：一对翅芽 + 三对足芽
  for (const side of [1, -1] as const) {
    pose.add(flankPad(WING_PAD, padMat, side))
    for (const spec of LEG_PADS) pose.add(flankPad(spec, padMat, side))
  }

  // ---- 腹节侧突（ampullae）：蛹在土室里靠它扭动。落点用 bodyWall() 从
  // kit 的同一条包络算出来，改腹部参数时侧突不会留在原地悬空。
  for (let i = 0; i < 4; i++) {
    const x = -0.25 - i * 0.42
    const wall = bodyWall(x, Math.PI / 2)
    for (const side of [1, -1] as const) {
      const bump = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 9), bodyMat)
      bump.name = 'pupa-ampulla'
      bump.position.set(x, wall.axisY - 0.02, side * wall.r * 0.96)
      bump.scale.set(0.85, 0.5, 0.46)
      pose.add(bump)
    }
  }

  // ---- 气门：腹节侧上方一排深色小点（离背中线 55°，圆心正落在体壁上）
  const spPhi = THREE.MathUtils.degToRad(125) // 从腹中线量 125° = 离背中线 55°
  for (let i = 0; i < 6; i++) {
    const x = 0.3 - i * 0.4
    const wall = bodyWall(x, spPhi)
    for (const side of [1, -1] as const) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), darkMat)
      s.name = 'pupa-spiracle'
      s.position.set(x, wall.axisY - Math.cos(spPhi) * wall.r, side * Math.sin(spPhi) * wall.r)
      s.scale.set(1, 0.9, 0.45)
      pose.add(s)
    }
  }

  // 锚点在未滚转的体坐标里定义，再套上与 pose 同一个旋转 —— 两处共用
  // SUPINE_DEG，改姿态不会让标注点留在原地。
  const roll = new THREE.Euler(THREE.MathUtils.degToRad(SUPINE_DEG), 0, 0)
  const anchors: Record<string, THREE.Vector3> = {
    headHorn: new THREE.Vector3(2.65, -0.62, 0),
    thoraxHorn: new THREE.Vector3(1.95, 0.62, 0),
    wingPad: new THREE.Vector3(0.3, -0.42, 0.78),
    abdomen: new THREE.Vector3(-1.0, 0.5, 0),
    legPad: new THREE.Vector3(0.5, -0.66, 0.3),
    thorax: new THREE.Vector3(1.0, 0.95, 0),
  }
  for (const v of Object.values(anchors)) v.applyEuler(roll)

  return finalize(g, anchors)
}
