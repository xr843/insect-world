/**
 * 兰花螳螂 Hymenopus coronatus —— 返工版
 *
 * 返工缘由：上一版测试全绿（花瓣宽厚比 5.75~6.28，远超 3.5 的门槛），渲染出来
 * 却像一只苍白的虾。测试量的是数字，而"宽而扁"这个数字，一块侧立的薄板和
 * 一片花瓣是一样的——问题不在数字本身，在这块薄板**转向了哪个方向**。
 * 本版逐条对着渲染实拍修，细节见下面每个部件的注释；总体判据是"一个人看到
 * 这张图会说这是什么虫"，不是任何单项数字指标。
 *
 * 造型要点（对照上一版的四个问题逐条修）：
 *
 * 1. 躯干短粗紧凑，不是细长管状：把前胸（"脖子"）长度压到原来的三分之一
 *    左右，头/胸/腹的整个轴向跨度也大幅收短；腹部改用自建的 curvedAbdomen
 *    （见下方 curvedAbdomenGeometry），沿一条向上弯的贝塞尔弧放样，而不是
 *    kit.segmentedAbdomen() 的直线首尾——上一版 from/to 的 y 甚至写反了
 *    （to.y < from.y，腹部是往下垂的，跟"略上翘"要求正相反）。腹部本身也
 *    显著加宽加扁，是躯干里最宽的一段，跟收短的轴向长度一起把"棍子"感
 *    压掉，整体轮廓收拢成接近花的团块。
 *
 * 2. 花瓣状腿节：几何体本身（petalFemurGeometry，局部建型：长度沿局部 +X，
 *    厚度=局部 Y，宽度=局部 Z）没有问题，问题出在**整体旋转**上。上一版用
 *    `quaternion.setFromUnitVectors(localX, dirFemur)`，这个方法只保证局部
 *    +X 对齐 dirFemur，绕这根轴的滚转（roll）完全不受约束——花瓣的厚度轴
 *    （扁平面法线）会被转到一个跟"该往哪边展开"毫无关系的随机方向，测试量
 *    的局部宽厚比在任意滚转下都成立，于是测试全绿而花瓣从大多数角度看都是
 *    侧立的窄边。本版换成 petalOrientation()：显式构造三轴正交基，把厚度轴
 *    定向为"在垂直于 dirFemur 的前提下，离目标方向最近的方向"——这是该约束
 *    下数学上唯一的最优解。目标方向不是直接取默认相机方向：中/后足腿只建
 *    了一侧、另一侧靠 kit.mirrorZ() 镜像得到，直接用相机方向会让镜像那一侧
 *    的法线几乎转去跟相机方向垂直（实测比返工前的 bug 还边缘），因此改用
 *    经过平衡的 PETAL_TARGET_DIR，兼顾左右两侧，见该常量的注释。宽度轴由
 *    长度轴与厚度轴叉乘得到。
 *
 * 3. 头部三角轮廓：技术同 mantis.ts——头壳本身是个小楔形，两颗大复眼顶在
 *    上后角才是真正撑起"倒三角"轮廓的主体，不是雕出三角形的头壳。上一版
 *    复眼的 z 向外扩（0.24）跟 y 向上扩（0.18）差得不够多，头本身又偏小，
 *    两颗眼球挤在头顶中央，读成"虾头顶着两个包"。本版把复眼的 z 偏移显著
 *    拉开（远大于 y 偏移），头部 bulge 提前、taper 加大对比，前后宽度差
 *    更明显，俯视轮廓才读得出三角形而不是一个球。
 *
 * 4. 捕捉足：折刀关节技术沿用 mantis.ts 的 raptorialLeg（腿节内缘刺列 +
 *    胫节反折镰刀钩），上一版结构其实是对的，"看不出来"主要是两个原因：
 *    (a) 躯干收短前，捕捉足在整只虫的比例里显得更小；(b) raptorialColor
 *    (#ecccd2) 跟 bodyColor (#e6c9cd) 几乎是同一个颜色，在 ACES 提亮去饱和
 *    之后基本融进头部/前胸，形状再对也看不出轮廓。本版把捕捉足和刺的颜色
 *    换成明显更深更艳的玫瑰色（呼应 mantis.ts 给 raptorialMat 一个比
 *    bodyMat 更深更艳的做法），并把长度/粗细相对躯干的比例调大。
 *
 * 颜色总纲：图鉴数据（src/data/insects.ts）明确写了"复眼乌黑，与粉白体色
 * 形成鲜明对比"——上一版复眼却是接近体色的淡粉（#f6dbe1），跟数据描述矛盾，
 * 也是"看不出五官"的一部分成因。本版复眼改成近黑色。整体配色也从"各部件
 * 几乎同一个粉白"改成有明显深浅/纯度层次（躯干最浅、花瓣最艳、捕捉足与刺
 * 最深），确保 ACES 把整体提亮去饱和之后，边缘的粉/紫晕仍然看得出是粉色，
 * 而不是被压成一片灰白。
 *
 * ⚠️ 实现笔记：
 * - 花瓣腿（中足/后足）跟 mantis.ts 的站立腿一样，不用 kit.legPair()
 *   （原因见 mantis.ts 文件头注释：legPair 对 base.z 取反又对整条腿
 *   scale.z=-1，双重镜像会让左右腿从同一点前后叉开），而是自建一条腿
 *   （base.z 恒为正）再用 kit.mirrorZ() 整体镜像出另一侧。
 * - petalOrientation() 里"默认相机方向"取自 InsectCanvas.tsx 的
 *   CameraRig：`home = new Vector3(0.86, 0.44, 1.25).normalize()`（这是
 *   挂载/复位时相机实际所在的方向；Canvas props 里的 position=[2,1,3]
 *   只是首帧渲染前的占位，一 mount 就被这个方向覆盖）。这里按同一方向
 *   硬编码为常量，不从 InsectCanvas.tsx 导入——builders/ 目录不依赖任何
 *   React/场景层代码，是本项目一贯的分层方式（registry.ts 用 glob 动态
 *   import 也是同样的解耦考虑）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  loft,
  mirrorZ,
  spindle,
  wingPair,
  type InsectModel,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/** 两点间直筒/圆锥放样 */
function tube(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, material: THREE.Material, radial = 14): THREE.Mesh {
  return new THREE.Mesh(loft([{ at: a, ry: r0, rz: r0 }, { at: b, ry: r1, rz: r1 }], radial), material)
}

/** 沿一串点放样、半径按点逐一指定：给弯曲路径（镰刀胫节、上翘腹部）用 */
function tubeShape(points: THREE.Vector3[], radii: number[], material: THREE.Material, radial = 14): THREE.Mesh {
  const sections: Section[] = points.map((p, i) => ({ at: p, ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

function jointSphere(p: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material)
  m.position.copy(p)
  return m
}

function quadBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  return p0.clone().lerp(p1, t).lerp(p1.clone().lerp(p2, t), t)
}

function smooth(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 节末环沟：只在每节最后 25% 处下凹，复刻 kit.segmentedAbdomen() 的同款算法 */
function grooveDip(local: number): number {
  if (local < 0.75) return 0
  const t = (local - 0.75) / 0.25
  return Math.sin(t * Math.PI)
}

/**
 * 弯曲上翘的腹部几何体：沿一条二次贝塞尔弧放样，而不是直线首尾——真实
 * 兰花螳螂腹部背面略向上卷翘，直线放样做不出这个弧度（上一版 from/to 的
 * y 甚至写反了，腹部是往下垂的）。分节环沟、粗细包络的算法思路照抄
 * kit.segmentedAbdomen()，只是把 `at` 换成沿贝塞尔弧采样而非线性 lerp。
 */
function curvedAbdomenGeometry(opts: {
  p0: THREE.Vector3
  ctrl: THREE.Vector3
  p2: THREE.Vector3
  r0: number
  r1: number
  segments: number
  groove: number
  flat: number
  bulgeT: number
  steps?: number
}): THREE.BufferGeometry {
  const steps = opts.steps ?? 44
  const peak = Math.max(opts.r0, opts.r1) * 1.06
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const at = quadBezier(opts.p0, opts.ctrl, opts.p2, t)
    const env =
      t <= opts.bulgeT
        ? THREE.MathUtils.lerp(opts.r0, peak, smooth(t / opts.bulgeT))
        : THREE.MathUtils.lerp(peak, opts.r1, smooth((t - opts.bulgeT) / (1 - opts.bulgeT)))
    const local = (t * opts.segments) % 1
    const r = Math.max(env * (1 - opts.groove * grooveDip(local)), 1e-4)
    sections.push({ at, ry: r / opts.flat, rz: r * opts.flat })
  }
  return loft(sections, 26)
}

/**
 * 短粗版捕捉足（一侧）：基节 → 短而粗壮的腿节（内缘刺列）→ 反折回来的
 * 镰刀状胫节。技术照抄 mantis.ts 的 raptorialLeg，长度/粗细相对躯干的
 * 比例比上一版更大，配合更深的颜色（见 buildOrchidMantis）解决"看不出
 * 捕捉足"的问题。只建 base.z 为正的一侧，调用处用 mirrorZ() 复制另一侧。
 */
function stubbyRaptorialLeg(base: THREE.Vector3, material: THREE.Material, spineMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()

  const coxaLen = 0.24
  const coxaDir = new THREE.Vector3(0.32, 0.6, 0.5).normalize()
  const coxaTip = base.clone().addScaledVector(coxaDir, coxaLen)
  g.add(tube(base, coxaTip, 0.165, 0.14, material))
  g.add(jointSphere(base, 0.175, material))

  const femurLen = 1.05
  const femurDir = new THREE.Vector3(0.88, 0.38, -0.12).normalize()
  const femurTip = coxaTip.clone().addScaledVector(femurDir, femurLen)
  g.add(tube(coxaTip, femurTip, 0.15, 0.086, material))
  g.add(jointSphere(coxaTip, 0.16, material))

  const ventral = new THREE.Vector3(0, -1, 0)
    .addScaledVector(femurDir, -new THREE.Vector3(0, -1, 0).dot(femurDir))
    .normalize()

  const spineCount = 6
  for (let i = 0; i < spineCount; i++) {
    const t = 0.14 + (i / (spineCount - 1)) * 0.78
    const p = coxaTip.clone().lerp(femurTip, t)
    const long = i % 2 === 0
    const len = long ? 0.175 : 0.1
    const tip = p.clone().addScaledVector(ventral, len).addScaledVector(femurDir, -len * 0.35)
    g.add(tubeShape([p, tip], [0.025, 0.0035], spineMat, 7))
  }

  const tibiaLen = 0.82
  const ctrl = femurTip.clone().addScaledVector(femurDir, tibiaLen * 0.42).addScaledVector(ventral, tibiaLen * 0.62)
  const hookTip = femurTip.clone().addScaledVector(femurDir, -tibiaLen * 0.55).addScaledVector(ventral, tibiaLen * 0.2)
  const steps = 16
  const path: THREE.Vector3[] = []
  const radii: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(quadBezier(femurTip, ctrl, hookTip, t))
    radii.push(THREE.MathUtils.lerp(0.09, 0.007, Math.pow(t, 0.8)))
  }
  g.add(tubeShape(path, radii, material))
  g.add(jointSphere(femurTip, 0.096, material))

  g.userData.femurTip = femurTip
  return g
}

/**
 * 花瓣状腿节的几何体：建在局部坐标系，长度沿局部 +X（0→length），厚度
 * （局部 Y）从 jointR0 到 jointR1 正常收窄，宽度（局部 Z）额外叠加一个在
 * bulgeT 处达到峰值 petalHalfWidth 的鼓包——两端仍收回关节粗细，与相邻的
 * 关节球/胫节无缝衔接。这部分本身没问题；调用处如何把它转到腿的真实空间
 * 朝向（petalOrientation()）才是本次返工要修的地方，见文件头注释。
 */
function petalFemurGeometry(
  length: number,
  jointR0: number,
  jointR1: number,
  petalHalfWidth: number,
  bulgeT: number,
  steps = 22,
): THREE.BufferGeometry {
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const baseR = THREE.MathUtils.lerp(jointR0, jointR1, t)
    const env = t <= bulgeT ? smooth(t / bulgeT) : smooth(1 - (t - bulgeT) / (1 - bulgeT))
    sections.push({ at: new THREE.Vector3(t * length, 0, 0), ry: baseR, rz: baseR + petalHalfWidth * env })
  }
  return loft(sections, 24)
}

/**
 * 默认视角方向，取自 InsectCanvas.tsx 的 CameraRig（`home` 常量，挂载/
 * 复位时相机实际所在方向）。真正衡量"花瓣朝向好不好"就是拿这个方向去点乘
 * 花瓣法线（__tests__/orchid-mantis.test.ts 就是这么测的）；petalOrientation()
 * 选朝向时用的却是下面另一个方向，原因见 PETAL_TARGET_DIR 的注释。
 */
const DEFAULT_VIEW_DIR = new THREE.Vector3(0.86, 0.44, 1.25).normalize()

/**
 * petalOrientation() 实际瞄准的目标方向——不是直接用 DEFAULT_VIEW_DIR。
 *
 * ⚠️ petalLeg() 只建 base.z 为正的一侧，另一侧由 kit.mirrorZ() 对整条腿群
 * 做 scale.z=-1 镜像得到。可以证明：只要目标方向的 z 分量不为 0，"镜像后
 * 的朝向"就不可能同时对两侧都是相对 DEFAULT_VIEW_DIR 的最优解——一侧精确
 * 达到最优，另一侧则等价于对目标方向的镜像（z 取反）版本求最优。直接拿
 * DEFAULT_VIEW_DIR 当目标试过：后足花瓣镜像的那一侧法线跟 DEFAULT_VIEW_DIR
 * 几乎垂直（facing 只有 0.035），比返工前的 bug（0.34~0.61）还边缘。
 *
 * 这里改用把 DEFAULT_VIEW_DIR 的 z 分量按 -0.25 加权混合后的方向：对
 * midPetalSpec/hindPetalSpec 两组腿的 dirFemur，分别算"本侧 + 镜像侧"共
 * 4 个 facing 分数（对 DEFAULT_VIEW_DIR 的点积绝对值），用穷举搜索找到让
 * 这 4 个分数的最小值最大化（minimax）的 z 权重，-0.25 就是搜索结果。
 * 四个实例的 facing 分数落在 0.50~0.71 之间，比返工前 bug 的 0.34~0.61
 * （且有一侧低到 0.035）明显更高、更均衡——两侧花瓣都过得去，不是"一侧
 * 惊艳、另一侧比 bug 还差"。
 */
const PETAL_TARGET_DIR = new THREE.Vector3(DEFAULT_VIEW_DIR.x, DEFAULT_VIEW_DIR.y, DEFAULT_VIEW_DIR.z * -0.25).normalize()

/**
 * 花瓣腿节的整体旋转：显式构造三轴正交基，取代
 * `quaternion.setFromUnitVectors(localX, dirFemur)`。
 *
 * ⚠️ 这是本次返工的核心修复，详见文件头注释第 2 条。这里只留实现要点：
 * 厚度轴（局部 +Y，花瓣扁平面的法线）定向为"把 PETAL_TARGET_DIR 投影到
 * 垂直于 dirFemur 的平面，再归一化"——在"必须垂直于 dirFemur"这个硬约束
 * 下，这是数学上离 PETAL_TARGET_DIR 最近的唯一解；PETAL_TARGET_DIR 本身
 * 为什么不直接等于相机方向，见它自己的注释。宽度轴（局部 +Z，花瓣真正
 * 展开变宽的方向）由长度轴与厚度轴叉乘得到。
 */
function petalOrientation(dirFemur: THREE.Vector3): THREE.Quaternion {
  const xAxis = dirFemur.clone().normalize()
  let yAxis = PETAL_TARGET_DIR.clone().addScaledVector(xAxis, -PETAL_TARGET_DIR.dot(xAxis))
  if (yAxis.lengthSq() < 1e-8) {
    // 退化兜底：dirFemur 恰好与目标方向平行的极端情况，改投影世界上方向
    yAxis = new THREE.Vector3(0, 1, 0).addScaledVector(xAxis, -xAxis.y)
  }
  yAxis.normalize()
  const zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize()
  yAxis.crossVectors(zAxis, xAxis).normalize() // 重新正交化，消除叉乘顺序带来的浮点漂移
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis))
}

interface PetalLegSpec {
  base: [number, number, number]
  femur: number
  tibia: number
  tarsus?: number
  splay: number
  sweep: number
  knee?: number
  ankle?: number
  boneR?: number
  petalHalfWidth: number
  petalBulge?: number
}

/**
 * 花瓣腿（中足/后足通用）：基节直接省略（花瓣腿节从体壁附着点直接扩展），
 * 关节方向公式复刻 kit.leg() 内部同款三角函数（该函数未导出，属于按公式
 * 照抄，不是从 kit.ts 引入实现），只是把腿节段换成 petalFemurGeometry()，
 * 整体旋转换成 petalOrientation()（见上方注释）而不是 setFromUnitVectors()。
 */
function petalLeg(spec: PetalLegSpec, material: THREE.Material, petalMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const boneR = spec.boneR ?? 0.05
  const tarsusLen = spec.tarsus ?? spec.femur * 0.38
  const splay = THREE.MathUtils.degToRad(spec.splay)
  const sweep = THREE.MathUtils.degToRad(spec.sweep)
  const knee = THREE.MathUtils.degToRad(spec.knee ?? 66)
  const ankle = THREE.MathUtils.degToRad(spec.ankle ?? 55)

  const base = new THREE.Vector3(...spec.base)
  const dirFemur = new THREE.Vector3(
    Math.sin(sweep) * Math.cos(splay) * -1,
    Math.sin(splay) * 0.35 + 0.25,
    Math.cos(sweep) * Math.cos(splay),
  ).normalize()
  const kneePt = base.clone().addScaledVector(dirFemur, spec.femur)

  const down = new THREE.Vector3(0, -1, 0)
  const dirTibia = dirFemur.clone().lerp(down, Math.sin(knee) * 0.85).normalize()
  const anklePt = kneePt.clone().addScaledVector(dirTibia, spec.tibia)

  const dirTarsus = dirTibia
    .clone()
    .lerp(new THREE.Vector3(-Math.sin(sweep), -0.35, Math.cos(sweep) * 0.3).normalize(), Math.sin(ankle) * 0.9)
    .normalize()
  const tipPt = anklePt.clone().addScaledVector(dirTarsus, tarsusLen)

  // 腿节：花瓣状主体，本物种的招牌。局部建型 + 显式正交基整体转到 dirFemur，
  // 厚度轴朝向由 petalOrientation() 选定，见上方注释。
  const petalMesh = new THREE.Mesh(
    petalFemurGeometry(spec.femur, boneR * 1.3, boneR * 0.85, spec.petalHalfWidth, spec.petalBulge ?? 0.55),
    petalMat,
  )
  petalMesh.name = 'petalFemur'
  const petalGroup = new THREE.Group()
  petalGroup.quaternion.copy(petalOrientation(dirFemur))
  petalGroup.position.copy(base)
  petalGroup.add(petalMesh)
  g.add(petalGroup)
  g.add(jointSphere(base, boneR * 1.3, material))

  // 胫节 + 跗节：收回纤细圆管，负责站立支撑
  g.add(tube(kneePt, anklePt, boneR * 0.6, boneR * 0.4, material))
  g.add(tube(anklePt, tipPt, boneR * 0.34, boneR * 0.16, material))
  g.add(jointSphere(kneePt, boneR * 0.62, material))
  g.add(jointSphere(anklePt, boneR * 0.4, material))

  g.userData.tip = tipPt
  return g
}

// ---------------------------------------------------------------- 主体

export function buildOrchidMantis(): InsectModel {
  const g = new THREE.Group()

  // 配色：从"各部件几乎同一个粉白"改成有明显层次——躯干最浅（近白），
  // 花瓣最艳（真正的"花"），捕捉足与刺最深（要在近乎同色系里读出轮廓，
  // 靠的是明度/纯度差而不是色相差）。复眼改近黑，呼应图鉴数据"复眼乌黑，
  // 与粉白体色形成鲜明对比"的描述——上一版复眼是淡粉，跟数据矛盾。
  const bodyColor = '#f0dfe2' // 躯干（头/前胸/中后胸）：近白，带一点粉
  const petalColor = '#ffc2da' // 花瓣：全虫最艳的颜色，主动拟态的核心
  const abdomenColor = '#f6d0da' // 腹部：介于躯干与花瓣之间的粉
  const raptorialColor = '#e895b7' // 捕捉足：明显更深更艳，避免融进头部
  const spineColor = '#c9678f' // 刺：全虫最深，在捕捉足内缘形成清晰锯齿
  const antennaColor = '#dba8bd'
  const eyeColor = '#241a1c' // 近黑，与粉白体色形成对比（图鉴数据原文）
  const wingColor = '#f6e2e8'
  const veinColor = '#d99bb3'

  const bodyMat = chitin({ color: bodyColor, gloss: 0.42, clearcoat: 0.18 })
  const petalMat = chitin({ color: petalColor, gloss: 0.4, clearcoat: 0.16 })
  const abdomenMat = chitin({ color: abdomenColor, gloss: 0.38, clearcoat: 0.15 })
  const legMat = chitin({ color: bodyColor, gloss: 0.4, clearcoat: 0.16 })
  const raptorialMat = chitin({ color: raptorialColor, gloss: 0.5, clearcoat: 0.28 })
  const spineMat = chitin({ color: spineColor, gloss: 0.32 })
  const antennaMat = chitin({ color: antennaColor, gloss: 0.32 })
  const wingMat = chitin({ color: wingColor, gloss: 0.5, clearcoat: 0.3, opacity: 0.94, side: THREE.DoubleSide })
  const veinMat = chitin({ color: veinColor, gloss: 0.3 })

  // ---- 沿体轴的关键分段坐标（+X 向前）：躯干整体收短，把上一版"6.9 长"
  // 的细杆感压掉。前胸（"脖子"）长度只有上一版的三分之一左右，是压缩
  // 最多的一段——兰花螳螂本就不是中华大刀螳那种极致伸长脖子的比例。
  const mouthX = 1.55
  const headBaseX = 1.3
  const prothoraxFrontX = headBaseX
  const prothoraxBackX = 0.6 // 前胸长度仅 0.7，上一版是 1.85
  const thoraxFrontX = prothoraxBackX
  const thoraxBackX = 0.02
  const abdomenFrontX = thoraxBackX
  const abdomenTipX = -1.35 // 腹部轴向跨度 1.37，另有上翘弧度叠加纵深

  // 前胸斜举出的仰角，技术同 mantis.ts：中后胸+腹部由中后足撑住，前胸向前
  // 上方斜伸，头部因此抬得比腹部高。角度本身不变（仍是"举起头部"的站姿），
  // 只是举起来的这一段（前胸）比上一版短很多。
  const prothoraxRise = 0.58
  const prothoraxSlope = prothoraxRise / (prothoraxFrontX - prothoraxBackX)
  const prothoraxBackY = 0.32
  const prothoraxY = (x: number) => prothoraxBackY + (x - prothoraxBackX) * prothoraxSlope
  const headY = prothoraxY(headBaseX)

  // ---- 头部：倒三角轮廓，头壳只是个小楔形，复眼才是撑起轮廓的主体。
  // bulge 提前到 0.16（鼓包更靠后段）、taperEnd 压到 0.04（前端收成近尖），
  // 前后半径对比比上一版更陡，俯视投影的"宽窄差"更容易读出三角形。
  const head = new THREE.Mesh(
    spindle([headBaseX, headY, 0], [mouthX, headY + 0.06, 0], 0.21, { bulge: 0.16, flat: 1.35, taperStart: 0.55, taperEnd: 0.04 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 复眼：z 向外扩（0.31）明显大于 y 向上扩（0.13）——上一版两者接近
  // （0.24 vs 0.18），头又小，读成"眼球堆在头顶"。这里拉开比例，让复眼
  // 清楚地分处头两侧，而不是叠在正上方。
  const eyeAt: [number, number, number] = [headBaseX + 0.05, headY + 0.13, 0.31]
  const eyes = compoundEyePair({ at: eyeAt, radius: 0.16, color: eyeColor, flatten: 0.76, stretch: 1.1, facets: true })
  eyes.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'eye'
  })
  g.add(eyes)

  g.add(
    antennaPair(
      { base: [mouthX - 0.05, headY + 0.11, 0.08], length: 1.05, kind: 'filiform', pitch: 16, yaw: 33, thickness: 0.013 },
      antennaMat,
    ),
  )

  // ---- 前胸：拉长的细杆，向前上方斜举（比上一版短得多，见上方坐标注释）
  const prothoraxPts = [
    new THREE.Vector3(prothoraxFrontX, prothoraxY(prothoraxFrontX), 0),
    new THREE.Vector3(1.05, prothoraxY(1.05) + 0.04, 0),
    new THREE.Vector3(0.8, prothoraxY(0.8) + 0.03, 0),
    new THREE.Vector3(prothoraxBackX, prothoraxBackY, 0),
  ]
  const prothorax = tubeShape(prothoraxPts, [0.155, 0.145, 0.15, 0.21], bodyMat, 18)
  prothorax.name = 'prothorax'
  g.add(prothorax)

  // ---- 中后胸：加宽（flat 1.28），是躯干里仅次于腹部的宽处，帮躯干整体
  // 收拢成团块而不是一根杆子
  const thorax = new THREE.Mesh(
    spindle([thoraxFrontX, 0.34, 0], [thoraxBackX, 0.33, 0], 0.33, { bulge: 0.4, flat: 1.28, taperStart: 0.62, taperEnd: 0.7 }),
    bodyMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 腹部：宽扁并略上翘（curvedAbdomenGeometry，见文件头注释与函数
  // 注释）——基部到末端沿一条向上弯的弧线放样，末端 y 明显高于基部 y，
  // 是躯干里最宽的一段，也是修正"棍子感"最关键的一块。
  const abdomenP0 = new THREE.Vector3(abdomenFrontX, 0.3, 0)
  const abdomenCtrl = new THREE.Vector3(-0.55, 0.58, 0)
  const abdomenP2 = new THREE.Vector3(abdomenTipX, 0.8, 0)
  const abdomenMesh = new THREE.Mesh(
    curvedAbdomenGeometry({
      p0: abdomenP0,
      ctrl: abdomenCtrl,
      p2: abdomenP2,
      r0: 0.4,
      r1: 0.075,
      segments: 6,
      groove: 0.15,
      flat: 1.55,
      bulgeT: 0.38,
    }),
    abdomenMat,
  )
  abdomenMesh.name = 'abdomen'
  g.add(abdomenMesh)

  // ---- 捕捉足：短粗版，胸前"祈祷"折叠。比例比上一版更粗壮（见
  // stubbyRaptorialLeg 内部注释），颜色也换成明显更深的玫瑰色，两者一起
  // 解决"看不出捕捉足"的问题。
  const raptorialBase = new THREE.Vector3(1.14, prothoraxY(1.14) - 0.15, 0.16)
  g.add(mirrorZ(stubbyRaptorialLeg(raptorialBase.clone(), raptorialMat, spineMat)))

  // ---- 中足、后足：腿节展成花瓣，本种的全部招牌。宽度比上一版更大方
  // （petalHalfWidth 0.32/0.37 → 0.40/0.46），朝向改用 petalOrientation()。
  const midPetalSpec: PetalLegSpec = {
    base: [0.42, 0.27, 0.27],
    femur: 0.72,
    tibia: 0.78,
    tarsus: 0.28,
    splay: 32,
    sweep: 10,
    knee: 64,
    ankle: 55,
    boneR: 0.055,
    petalHalfWidth: 0.4,
    petalBulge: 0.52,
  }
  const hindPetalSpec: PetalLegSpec = {
    base: [0.06, 0.23, 0.28],
    femur: 0.82,
    tibia: 0.92,
    tarsus: 0.32,
    splay: 28,
    sweep: 38,
    knee: 68,
    ankle: 52,
    boneR: 0.058,
    petalHalfWidth: 0.46,
    petalBulge: 0.56,
  }
  g.add(mirrorZ(petalLeg(midPetalSpec, legMat, petalMat)))
  g.add(mirrorZ(petalLeg(hindPetalSpec, legMat, petalMat)))

  // ---- 覆翅：短，折叠贴腹。spread≈90+sweep≈180 才是"沿体轴收拢"
  // （kit.wing() 的 spread 实际语义与其文档字符串相反，mantis.ts 已实测
  // 标定，此处照用）。翅长 1.0 << 3，默认 wingVeins() 半径够用。
  g.add(
    wingPair(
      {
        base: [0.32, 0.4, 0.13],
        length: 1.0,
        width: 0.32,
        outline: [
          [0, 0.14],
          [0.15, 0.42],
          [0.4, 0.48],
          [0.7, 0.36],
          [0.9, 0.18],
          [1, 0.04],
        ],
        spread: 87,
        sweep: 178,
        tilt: 5,
        thickness: 0.013,
      },
      wingMat,
      veinMat,
      5,
    ),
  )

  const anchors: Record<string, THREE.Vector3> = {
    petalLeg: new THREE.Vector3(...hindPetalSpec.base).add(new THREE.Vector3(0.35, 0.32, 0.5)),
    raptorialLeg: raptorialBase.clone().add(new THREE.Vector3(0.65, 0.32, 0.3)),
    head: new THREE.Vector3(headBaseX + 0.1, headY + 0.06, 0),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2]),
    abdomen: quadBezier(abdomenP0, abdomenCtrl, abdomenP2, 0.42).add(new THREE.Vector3(0, 0.18, 0)),
    wing: new THREE.Vector3(0.05, 0.62, 0.28),
  }

  return finalize(g, anchors)
}
