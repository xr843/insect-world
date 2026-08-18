/**
 * 柞蚕蛾 Antheraea pernyi · 幼虫（柞蚕，俗称「蚕宝宝」的那一类）
 *
 * 与成虫 silk-moth.ts 同一套单位与坐标系：1 = 1 厘米，+X 向前（头）、+Y 向上（背）、+Z 向右。
 *
 * ## 尺度：比成虫还长，而且不许缩
 *
 * 末龄柞蚕幼虫体长 9~10 厘米、体径 1.6~1.8 厘米，比展翅前的成虫躯干（约 4 厘米）
 * 长一倍有余。本文件的躯干 8.3（含前后圆头 0.66）+ 头壳 ≈ 9.6，就是真值。
 * 这个量级差正是生活史要讲的内容，取景归一化由 finalize() 的 radius 负责，
 * 不能为了「和成虫摆在一起好看」把它缩小。
 *
 * ## 招牌结构（做不出这几样就不是柞蚕幼虫）
 *
 * 1. **圆筒形分节 + 每节的毛瘤**。分节由两样东西一起承担：环沟（形）与节间膜环
 *    （色）—— 只有形的那一版出图是一根光滑的绿香肠，分节只活在剪影上。
 *    鳞翅目幼虫的躯干是 3 胸节 + 10 腹节 = 13 节
 *    （头壳另算），柞蚕幼虫每节生 6 个毛瘤（瘤突）：背线两侧一对、气门上线一对、
 *    气门下线一对，瘤上生刚毛。13 × 6 = 78 个，这是它最认得出的特征，
 *    也是它与「一条光溜溜的绿虫」的分界线。毛瘤按品种呈银白或金黄，
 *    本文件取偏银的浅金 —— 浅到接近白，才能在青绿体色上真的看出来
 *    （第 5 轮「深灰叠深灰、招牌图案消失」的教训：要对比就得真的有对比）。
 * 2. **体侧一排气门**。9 对，不是 13 对：真实的鳞翅目幼虫只有前胸 1 对 +
 *    腹节 1~8 各 1 对，中胸后胸无气门。做成每节都有反而是错的。
 *    气门本身近白、围边近黑，明度差 0.8 以上。
 * 3. **三种形态完全不同的附肢**：3 对胸足（真足，琥珀褐的几丁质、尖细、末端一枚爪）、
 *    4 对腹足（腹节 3~6，肉质、粗短、末端是吸盘状的趾面 planta，趾面内侧一排趾钩
 *    crochets）、1 对尾足（腹节 10，更粗、朝后下方蹬）。把腹足画成胸足的样子
 *    是这个阶段最典型的错误 —— 它们一个是关节化的附肢，一个是体壁的肉质外突。
 * 4. **头壳比体节小、颜色略深**。前胸比头宽是幼虫的常态，头壳缩在前胸前缘。
 *
 * ## 为什么躯干不用 kit 的 segmentedAbdomen()
 *
 * 那个函数只画直线段，而且包络是「从 r0 鼓到峰值再收到 r1」的单峰。
 * 幼虫要的是两件它给不了的：**近乎等粗**的圆筒（毛虫的粗细几乎全程不变，
 * 只在两端收），以及**微拱的体轴**（贴附在枝上的自然姿态，直挺挺一根读起来像香肠）。
 * 所以本文件用 kit 的 `loft()` 自写一条弧线放样，节间收缩用余弦的高次幂做成窄环沟
 * —— 与 kit 的思路一致，只是包络与路径换了（silk-moth.ts 自写 boldWingVeins /
 * marginBandGeometry 也是同样的取舍：kit 给不了就在物种文件里自写，不去改 kit）。
 *
 * 所有附肢都通过同一组 `trunkCenter()` / `trunkEnvelope()` / `surfacePoint()` 求值落位，
 * 所以毛瘤、气门、腹足永远长在体壁上，不会因为改了体型参数而浮在空中或陷进肉里。
 */
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { chitin, finalize, loft, mandibles, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体型参数

/** 躯干体节数：3 胸节 + 10 腹节（鳞翅目幼虫的定数，头壳不计在内） */
const SEGMENTS = 13
/** 躯干前端（第 1 胸节前缘）的 x */
const TRUNK_FRONT_X = 4.15
/** 躯干全长（头壳另占约 1.1，合计体长约 9.6 = 真实末龄的 9~10 厘米） */
const TRUNK_LEN = 8.3
/** 前端圆头的长度：躯干不是一截切平的管子，前胸前缘要收成圆的，头壳从这个圆顶上长出来 */
const NOSE_LEN = 0.36
/** 尾端圆头的长度 */
const TAIL_LEN = 0.3
/** 最粗处半径：真实体径 1.6~1.8 厘米 → 半径 0.85 */
const R_MAX = 0.86
/**
 * 节间环沟深度（相对该处包络半径）。第一版取 0.12，出图后只在剪影上看得出分节，
 * 体表本身是一根光滑的绿香肠 —— 分节是毛虫的第一识别特征，不能只活在轮廓线上。
 * 加深到 0.17，另外在每道节界补一圈更深色的节间膜（`segmentRings()`），
 * 用**颜色**把节界画出来：漫射光下颜色差比 0.1 的形变差好读得多。
 */
const GROOVE = 0.17
/** 背腹略扁：真实毛虫的横截面不是正圆，腹面稍平 */
const FLAT_Y = 0.95

/** 躯干上某处的中轴点。s ∈ [0,1]，0 = 前端，1 = 尾端。 */
function trunkCenter(s: number, out = new THREE.Vector3()): THREE.Vector3 {
  const x = TRUNK_FRONT_X - s * TRUNK_LEN
  // 微拱：中段抬起约 0.30（体长的 3%），加上前端再抬 0.22 —— 幼虫抓在枝上时
  // 前胸总是略昂起。指数 0.85 让拱顶稍稍偏前，那才是重心所在。
  const y = 0.3 * Math.sin(Math.PI * Math.pow(s, 0.85)) + 0.22 * Math.pow(1 - s, 4)
  return out.set(x, y, 0)
}

/**
 * 沿全长的半径包络（不含节间收缩）：**中段几乎等粗**，两端才收。
 * 这是毛虫与蜂/蚁腹部最大的形状差别 —— 后者是单峰的纺锤，
 * 毛虫是一根粗细几乎不变的肉管，尾端也只收到六成、不收成尖。
 */
function trunkEnvelope(s: number): number {
  let k: number
  if (s < 0.3) k = THREE.MathUtils.lerp(0.68, 1, smooth(s / 0.3))
  else if (s < 0.78) k = 1
  else k = THREE.MathUtils.lerp(1, 0.42, smooth((s - 0.78) / 0.22))
  return R_MAX * k
}

/** 含节间环沟的实际半径：余弦的 8 次幂 = 只在节界附近陷下去的一道窄沟 */
function trunkRadius(s: number): number {
  const local = (s * SEGMENTS) % 1
  const dip = Math.pow(Math.abs(Math.cos(Math.PI * local)), 8)
  return trunkEnvelope(s) * (1 - GROOVE * dip)
}

function smooth(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}

/**
 * 体壁上一点。theta 从背中线（+Y）起算、朝 +Z（右）转，所以
 * 0 = 背中线、±90° = 体侧、±180° = 腹中线。sink 让附肢基部略陷进体壁。
 */
function surfacePoint(s: number, theta: number, sink = 0, out = new THREE.Vector3()): THREE.Vector3 {
  const c = trunkCenter(s)
  const r = Math.max(trunkEnvelope(s) - sink, 0.02)
  return out.set(c.x, c.y + Math.cos(theta) * r * FLAT_Y, Math.sin(theta) * r)
}

/** 体壁外法线（忽略体轴斜率带来的那 6° 倾斜，拱度很缓，肉眼看不出） */
function surfaceNormal(theta: number, out = new THREE.Vector3()): THREE.Vector3 {
  return out.set(0, Math.cos(theta) / FLAT_Y, Math.sin(theta)).normalize()
}

/** 第 i 节（0 起算，0~2 是胸节，3~12 是腹节 1~10）的中点 s */
const segMid = (i: number) => (i + 0.5) / SEGMENTS

// ---------------------------------------------------------------- 躯干

function trunkGeometry(): THREE.BufferGeometry {
  const perSeg = 8 // 每节 8 个采样，够画出「鼓—沟」的起伏
  const total = SEGMENTS * perSeg
  const sections: Section[] = []

  // 前端圆头：四分之一椭球，从体径收到近乎一点。不这么收的话 loft 会在前端
  // 封一张平盖，读起来像一截切断的香肠 —— 头壳只盖得住中间那块，边上一圈露着。
  const front = trunkCenter(0)
  const r0 = trunkRadius(0)
  for (let j = 3; j >= 1; j--) {
    const t = j / 3
    sections.push({
      at: new THREE.Vector3(front.x + NOSE_LEN * t, front.y, 0),
      ry: Math.max(r0 * Math.sqrt(1 - t * t), 0.02) * FLAT_Y,
      rz: Math.max(r0 * Math.sqrt(1 - t * t), 0.02),
    })
  }

  for (let i = 0; i <= total; i++) {
    const s = i / total
    const r = trunkRadius(s)
    sections.push({ at: trunkCenter(s), ry: r * FLAT_Y, rz: r })
  }

  // 尾端圆头：同上，收成钝圆而不是尖 —— 毛虫的尾端是圆的
  const tail = trunkCenter(1)
  const r1 = trunkRadius(1)
  for (let j = 1; j <= 3; j++) {
    const t = j / 3
    sections.push({
      at: new THREE.Vector3(tail.x - TAIL_LEN * t, tail.y, 0),
      ry: Math.max(r1 * Math.sqrt(1 - t * t), 0.02) * FLAT_Y,
      rz: Math.max(r1 * Math.sqrt(1 - t * t), 0.02),
    })
  }

  return loft(sections, 26)
}

/**
 * 节间膜环：12 道节界各套一圈很窄的深色环，卡在环沟里。
 * 只靠几何收缩的话，漫射光下的分节只在剪影上看得见（第一版出图就是一根光滑的绿香肠）；
 * 补一圈**颜色**更深的窄环，正面、顶面、任何角度都读得出「一节一节」。
 * 思路与 kit 的 `segmentedAbdomenMembranes()` 一致，只是路径换成了本文件这条弧线。
 */
function segmentRings(mat: THREE.Material): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  const half = 0.006 // 环宽（s 的半宽），换算到长度约 0.1，肉眼是一条细带
  for (let i = 1; i < SEGMENTS; i++) {
    const s0 = i / SEGMENTS
    const sections: Section[] = []
    for (const ds of [-half, 0, half]) {
      const s = s0 + ds
      // 1.012 让环浮出沟底一点点，避免与体壁共面闪烁
      const r = trunkRadius(s) * 1.012
      sections.push({ at: trunkCenter(s), ry: r * FLAT_Y, rz: r })
    }
    const m = new THREE.Mesh(loft(sections, 24, false), mat)
    m.name = 'segment-ring'
    out.push(m)
  }
  return out
}

// ---------------------------------------------------------------- 毛瘤与刚毛

/** 三排毛瘤在截面上的角位置（从背中线起算的度数），左右各一个，共 6 个/节 */
const VERRUCA_ROWS: { role: string; theta: number; radius: number }[] = [
  { role: 'dorsal', theta: 32, radius: 0.16 }, // 背线两侧：最显眼的一排，也最大
  { role: 'supraspiracular', theta: 78, radius: 0.145 }, // 气门上线
  { role: 'subspiracular', theta: 122, radius: 0.13 }, // 气门下线
]

/** 每个毛瘤上的刚毛数。真实毛瘤是一丛短刚毛，5 根够读出「有毛」而不糊成一团 */
const SETAE_PER_VERRUCA = 5

/**
 * 毛瘤：一颗压扁的半球坐在体壁上，露出约六成。
 */
function verruca(s: number, theta: number, r: number, mat: THREE.Material): THREE.Mesh {
  const n = surfaceNormal(theta)
  // 球心陷进体壁 0.28r、沿法线压扁到 0.72 —— 净露出 0.44r（背侧那排约 0.07，
  // 合真实的 0.7 毫米）。整颗球贴上去会读成「粘了颗豆子」，陷进去一点才像
  // 体壁自己鼓起来的瘤突。
  const p = surfacePoint(s, theta).addScaledVector(n, -r * 0.28)
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat)
  m.position.copy(p)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
  m.scale.set(1, 0.72, 1)
  return m
}

/** 一丛刚毛：绕法线撒开的细锥，变换烘进顶点后统一合并（一根一 mesh 会把 draw call 打爆） */
function setaeGeometries(center: THREE.Vector3, normal: THREE.Vector3, count: number, seed: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  // 绕法线的正交基
  const ref = Math.abs(normal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const t1 = new THREE.Vector3().crossVectors(ref, normal).normalize()
  const t2 = new THREE.Vector3().crossVectors(normal, t1)
  for (let i = 0; i < count; i++) {
    const phi = (i / count) * Math.PI * 2 + seed
    // 刚毛不是全部直立：外圈的向外斜张 35°，中间一根近乎直立
    const tilt = i === 0 ? 0.12 : 0.62
    const dir = normal
      .clone()
      .multiplyScalar(Math.cos(tilt))
      .addScaledVector(t1, Math.cos(phi) * Math.sin(tilt))
      .addScaledVector(t2, Math.sin(phi) * Math.sin(tilt))
      .normalize()
    const jitter = Math.abs(Math.sin(seed * 91.7 + i * 12.9898))
    const len = 0.22 + 0.12 * jitter
    const geo = new THREE.ConeGeometry(0.017, len, 5)
    const m = new THREE.Matrix4().makeRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
    )
    m.setPosition(center.clone().addScaledVector(dir, len * 0.42))
    geo.applyMatrix4(m)
    out.push(geo)
  }
  return out
}

// ---------------------------------------------------------------- 气门

/** 有气门的体节：前胸（第 0 节）+ 腹节 1~8（第 3~10 节）。中后胸无气门。 */
const SPIRACLE_SEGMENTS = [0, 3, 4, 5, 6, 7, 8, 9, 10]
/** 气门在截面上的角位置：正体侧偏下，恰在气门上线与气门下线两排毛瘤之间 */
const SPIRACLE_THETA = 100

/** 一枚气门：深色围边（peritreme）上叠一枚更小的浅色椭圆气门本体，画家算法出「环」 */
function spiracle(s: number, side: 1 | -1, rimMat: THREE.Material, poreMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const theta = THREE.MathUtils.degToRad(SPIRACLE_THETA) * side
  const n = surfaceNormal(theta)
  const p = surfacePoint(s, theta)
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)

  const disc = (rx: number, rz: number, lift: number, mat: THREE.Material, name: string) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat)
    m.name = name
    // 长轴沿体轴（X）—— 真实气门是纵向的长椭圆，横过来就成了另一种虫
    m.scale.set(rx, 0.055, rz)
    m.quaternion.copy(quat)
    m.position.copy(p).addScaledVector(n, lift - 0.02)
    return m
  }
  // 第一版围边 0.115/浅色 0.082，出图是一排黑点 —— 围边太宽把浅色本体吃掉了。
  // 浅色本体放大到围边的 0.83 倍，剩下的那圈深色就只是一道细边。
  g.add(disc(0.135, 0.075, 0.018, rimMat, 'spiracle-rim'))
  g.add(disc(0.112, 0.058, 0.034, poreMat, 'spiracle'))
  return g
}

// ---------------------------------------------------------------- 附肢

/** 二次贝塞尔上的一点 */
function bez(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  const a = 1 - t
  return new THREE.Vector3()
    .addScaledVector(p0, a * a)
    .addScaledVector(p1, 2 * a * t)
    .addScaledVector(p2, t * t)
}

/**
 * 胸足（真足）：短、尖、几丁质深褐，末端一枚弯爪。
 * 与腹足的差别必须一眼看出来 —— 这里是「从粗 0.115 一路收到 0.028 的锥」
 * 加一根更细的爪，腹足则是「几乎等粗的肉柱 + 一枚比柱子还宽的趾面」。
 */
function thoracicLeg(s: number, side: 1 | -1, forward: number, mat: THREE.Material, clawMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const theta = THREE.MathUtils.degToRad(146) * side
  const base = surfacePoint(s, theta, 0.06)
  // 第一版长 0.6、根部 0.115，出图是三根黑尖刺。真足只有 4~5 毫米、粗而短，
  // 所以缩到 0.42 并把根部加粗到 0.145：它要读成「短锥」，不是「刺」。
  const p1 = base.clone().add(new THREE.Vector3(forward * 0.4, -0.18, side * 0.16))
  const p2 = base.clone().add(new THREE.Vector3(forward * 0.68, -0.4, side * 0.08))

  const steps = 10
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(0.145, 0.038, Math.pow(t, 0.8))
    sections.push({ at: bez(base, p1, p2, t), ry: r, rz: r })
  }
  const limb = new THREE.Mesh(loft(sections, 12), mat)
  limb.name = 'thoracic-leg'
  g.add(limb)

  // 爪：向后下方钩，尖端收到 0.005 —— 「尖细有爪」的那个尖
  const tip = p2.clone().add(new THREE.Vector3(-0.06, -0.12, -side * 0.02))
  const claw = new THREE.Mesh(
    loft(
      [
        { at: p2, ry: 0.038, rz: 0.038 },
        { at: p2.clone().lerp(tip, 0.55).add(new THREE.Vector3(-0.012, 0, 0)), ry: 0.02, rz: 0.02 },
        { at: tip, ry: 0.005, rz: 0.005 },
      ],
      10,
    ),
    clawMat,
  )
  claw.name = 'tarsal-claw'
  g.add(claw)
  return g
}

/**
 * 腹足 / 尾足：体壁的肉质外突，几乎等粗，末端是吸盘状的趾面，趾面内侧一排趾钩。
 * 与胸足同色系都不行 —— 它是体壁本身，所以直接用体色材质。
 */
function proleg(
  s: number,
  side: 1 | -1,
  opts: {
    theta: number
    /** 朝后蹬的分量：腹足近乎垂直向下，尾足明显朝后 */
    back: number
    len: number
    radius: number
    name: string
    plantaName: string
  },
  bodyMat: THREE.Material,
  plantaMat: THREE.Material,
  crochetMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const theta = THREE.MathUtils.degToRad(opts.theta) * side
  const base = surfacePoint(s, theta, 0.08)
  const p1 = base.clone().add(new THREE.Vector3(-opts.back * 0.4, -opts.len * 0.5, side * 0.1))
  const p2 = base.clone().add(new THREE.Vector3(-opts.back, -opts.len, side * 0.06))

  const steps = 9
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // 中段略鼓、末端收一点：肉质吸盘足的轮廓是「腰粗」，不是锥；
    // 末端收细才让下面那枚圆垫明显更宽，「吸盘」才读得出来
    const r = opts.radius * (1 + 0.16 * Math.sin(t * Math.PI) - 0.22 * t)
    sections.push({ at: bez(base, p1, p2, t), ry: r, rz: r })
  }
  const stalk = new THREE.Mesh(loft(sections, 14), bodyMat)
  stalk.name = opts.name
  g.add(stalk)

  // 趾面（planta）：比肉柱更宽的**圆垫**。第一版用 CylinderGeometry，出图是四只
  // 平口的绿杯子 —— 平切口一露出来就再也不像肉了。改成压扁的球，边缘是圆的。
  const plantaR = opts.radius * 1.3
  const planta = new THREE.Mesh(new THREE.SphereGeometry(plantaR, 18, 12), plantaMat)
  planta.name = opts.plantaName
  planta.scale.set(1, 0.42, 0.92)
  planta.position.copy(p2).add(new THREE.Vector3(0, -0.03, 0))
  g.add(planta)

  // 趾钩（crochets）：真实是趾面内侧的一列半环，钩尖朝内 —— 幼虫靠它勾住枝叶
  const CROCHETS = 9
  for (let i = 0; i < CROCHETS; i++) {
    const a = THREE.MathUtils.lerp(-1.05, 1.05, i / (CROCHETS - 1))
    const root = planta.position
      .clone()
      .add(new THREE.Vector3(Math.sin(a) * plantaR * 0.8, -0.055, -side * Math.cos(a) * plantaR * 0.74))
    const tip = root
      .clone()
      .add(new THREE.Vector3(-Math.sin(a) * 0.05, -0.075, side * Math.cos(a) * 0.05))
    const hook = new THREE.Mesh(
      loft(
        [
          { at: root, ry: 0.022, rz: 0.022 },
          { at: tip, ry: 0.004, rz: 0.004 },
        ],
        7,
      ),
      crochetMat,
    )
    hook.name = 'crochet'
    g.add(hook)
  }
  return g
}

// ---------------------------------------------------------------- 头壳

/**
 * 头壳。第一版是两颗光球，出图就是「绿身子前面粘了个绿球」—— 球不是头。
 * 现在补三样让它读成头：
 * - **蜕裂线**：头顶正中一道倒 Y 形的深色缝（真实幼虫蜕皮时正是从这条线裂开），
 *   这是鳞翅目幼虫头壳最标志性的纹路，画上它就再没人把它当球；
 * - **侧单眼**：每侧 6 枚排成弧形的小黑点（幼虫没有复眼，所以不用 compoundEye）；
 * - **大颚 + 上唇**：头下前方一对深色咀嚼口器，上面压一枚浅色的上唇 ——
 *   浅色的上唇是给「嘴在哪」一个高对比的落点。
 *
 * 头壳半径 0.42，明显小于前胸的 0.585，这是幼虫的常态（头缩在前胸前缘）。
 */
const HEAD_RADII = new THREE.Vector3(0.44, 0.42, 0.4)

function headCapsule(mat: THREE.Material, darkMat: THREE.Material, paleMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const c = trunkCenter(0)
  const center = new THREE.Vector3(c.x + 0.62, c.y - 0.1, 0)

  /** 头壳表面上一点（把方向按三个半轴映射到椭球面） */
  const onHead = (dx: number, dy: number, dz: number, swell = 1) => {
    const d = new THREE.Vector3(dx, dy, dz).normalize()
    return new THREE.Vector3(
      center.x + d.x * HEAD_RADII.x * swell,
      center.y + d.y * HEAD_RADII.y * swell,
      center.z + d.z * HEAD_RADII.z * swell,
    )
  }

  // 左右两片头盖：中间留一道浅缝，蜕裂线就压在缝上
  for (const side of [1, -1] as const) {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), mat)
    lobe.name = 'head-lobe'
    lobe.scale.set(1.04, 1.0, 0.8)
    lobe.position.copy(center).add(new THREE.Vector3(0, 0, side * 0.15))
    g.add(lobe)
  }

  // 蜕裂线：一条正中的干 + 两条向后上方岔开的臂，合起来是个倒 Y
  const suture = (from: THREE.Vector3, to: THREE.Vector3) => {
    const sections: Section[] = []
    const steps = 8
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const d = new THREE.Vector3().lerpVectors(from, to, t).normalize()
      sections.push({
        at: new THREE.Vector3(
          center.x + d.x * HEAD_RADII.x * 1.008,
          center.y + d.y * HEAD_RADII.y * 1.008,
          center.z + d.z * HEAD_RADII.z * 1.008,
        ),
        ry: 0.028,
        rz: 0.028,
      })
    }
    const m = new THREE.Mesh(loft(sections, 8), darkMat)
    m.name = 'epicranial-suture'
    return m
  }
  const fork = new THREE.Vector3(0.2, 1, 0)
  g.add(suture(new THREE.Vector3(0.98, 0.1, 0), fork))
  g.add(suture(fork, new THREE.Vector3(-0.55, 0.72, 0.62)))
  g.add(suture(fork, new THREE.Vector3(-0.55, 0.72, -0.62)))

  // 侧单眼（stemmata）：每侧 6 枚，排成弧形。
  // ⚠️ 必须贴在**头盖球**的面上，不是那个理想椭球面上 —— 头盖是两颗各自偏移
  // 0.15 的球，侧向比椭球胖，按椭球放会整排埋进肉里（第二版实拍就是一颗都看不见）。
  for (const side of [1, -1] as const) {
    const lobeC = new THREE.Vector3(center.x, center.y, center.z + side * 0.15)
    const lobeR = new THREE.Vector3(0.42 * 1.04, 0.42, 0.42 * 0.8)
    for (let i = 0; i < 6; i++) {
      const a = THREE.MathUtils.lerp(-0.5, 0.95, i / 5)
      const d = new THREE.Vector3(0.58 + Math.sin(a) * 0.3, -0.4 - Math.cos(a) * 0.32, side * 0.72).normalize()
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), darkMat)
      eye.name = 'stemma'
      eye.position.set(lobeC.x + d.x * lobeR.x, lobeC.y + d.y * lobeR.y, lobeC.z + d.z * lobeR.z)
      g.add(eye)
    }
  }

  // 上唇：口器上方的一枚浅色小片，给「嘴」一个高对比的落点
  const labrum = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 9), paleMat)
  labrum.name = 'labrum'
  labrum.scale.set(0.55, 0.8, 1.25)
  labrum.position.copy(onHead(0.82, -0.5, 0, 0.98))
  g.add(labrum)

  // 大颚：咀嚼式，短而钝，柞蚕幼虫就是靠它啃柞树叶
  const jawAt = onHead(0.7, -0.72, 0, 0.92)
  const jaw = mandibles({ at: [jawAt.x, jawAt.y, 0.1], length: 0.3, spread: 0.55, curve: 0.95 }, darkMat)
  jaw.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'mandible'
  })
  g.add(jaw)
  return g
}

// ---------------------------------------------------------------- 建模主体

export function buildSilkMothLarva(): InsectModel {
  const g = new THREE.Group()

  // 青绿（黄绿）：真实末龄柞蚕幼虫的体色。饱和度给足，ACES 提亮后才不至于发灰
  const bodyMat = chitin({ color: '#7cb43e', gloss: 0.36, clearcoat: 0.12 })
  // 头壳略深（明度 0.28 对体色 0.48）且偏黄褐 —— 真实柞蚕幼虫头壳是黄褐色的，
  // 与体色的差别一半在明度、一半在色相；纯粹压深只会得到「一颗深绿的球」
  const headMat = chitin({ color: '#6b6222', gloss: 0.44, clearcoat: 0.2 })
  // 节间膜环：比体色深一档的窄环，用颜色把节界画出来
  const ringMat = chitin({ color: '#4c7420', gloss: 0.24 })
  // 上唇：口器上方那枚浅片
  const labrumMat = chitin({ color: '#d8cf9e', gloss: 0.3 })
  const darkMat = chitin({ color: '#2a1c0c', gloss: 0.5, clearcoat: 0.2 })
  // 毛瘤：银白偏浅金（柞蚕品种间有银白与金黄两型），浅到接近白才和青绿分得开
  const verrucaMat = chitin({ color: '#f2e3a6', gloss: 0.4, clearcoat: 0.12 })
  const setaMat = chitin({ color: '#4a3316', gloss: 0.22 })
  const spiracleMat = chitin({ color: '#f7efd6', gloss: 0.3 })
  const spiracleRimMat = chitin({ color: '#2e1d0c', gloss: 0.35 })
  // 胸足：琥珀褐。第一版取近黑的 #3b2410，出图是三根黑尖刺扎在绿身子上；
  // 真实的幼虫真足是半透明的琥珀色几丁质。与体色的差别改由**色相**承担
  // （褐 vs 绿差 60° 以上），明度反而不必拉开。
  const legMat = chitin({ color: '#8a5a22', gloss: 0.46, clearcoat: 0.24 })
  const clawMat = chitin({ color: '#33200a', gloss: 0.55, clearcoat: 0.3 })
  const plantaMat = chitin({ color: '#6a8f38', gloss: 0.25 })
  const crochetMat = chitin({ color: '#33200b', gloss: 0.5 })
  const analPlateMat = chitin({ color: '#5d4419', gloss: 0.4, clearcoat: 0.2 })

  // ---- 躯干
  const trunk = new THREE.Mesh(trunkGeometry(), bodyMat)
  trunk.name = 'larva-trunk'
  g.add(trunk)

  // ---- 头壳
  g.add(headCapsule(headMat, darkMat, labrumMat))

  // ---- 节间膜环：把「一节一节」从剪影搬到体表上
  for (const ring of segmentRings(ringMat)) g.add(ring)

  // ---- 毛瘤 78 个（13 节 × 3 排 × 左右）+ 刚毛
  const setaGeos: THREE.BufferGeometry[] = []
  let seed = 0
  for (let i = 0; i < SEGMENTS; i++) {
    const s = segMid(i)
    for (const row of VERRUCA_ROWS) {
      for (const side of [1, -1] as const) {
        const theta = THREE.MathUtils.degToRad(row.theta) * side
        const m = verruca(s, theta, row.radius, verrucaMat)
        m.name = 'verruca'
        m.userData.row = row.role
        g.add(m)
        const n = surfaceNormal(theta)
        const top = surfacePoint(s, theta).addScaledVector(n, row.radius * 0.3)
        setaGeos.push(...setaeGeometries(top, n, SETAE_PER_VERRUCA, (seed += 1)))
      }
    }
  }
  const setaMerged = mergeGeometries(setaGeos)
  for (const sg of setaGeos) sg.dispose()
  if (setaMerged) {
    const setae = new THREE.Mesh(setaMerged, setaMat)
    setae.name = 'setae'
    setae.userData.setaCount = setaGeos.length
    g.add(setae)
  }

  // ---- 气门 9 对
  for (const i of SPIRACLE_SEGMENTS) {
    for (const side of [1, -1] as const) g.add(spiracle(segMid(i), side, spiracleRimMat, spiracleMat))
  }

  // ---- 3 对胸足：前胸/中胸/后胸各一对，依次略向后摆
  const thoracicSweep = [0.16, 0.0, -0.14]
  for (let i = 0; i < 3; i++) {
    for (const side of [1, -1] as const) g.add(thoracicLeg(segMid(i), side, thoracicSweep[i], legMat, clawMat))
  }

  // ---- 4 对腹足：腹节 3~6 = 第 5~8 节
  for (const i of [5, 6, 7, 8]) {
    for (const side of [1, -1] as const) {
      g.add(
        proleg(
          segMid(i),
          side,
          { theta: 152, back: 0.05, len: 0.42, radius: 0.26, name: 'proleg', plantaName: 'planta' },
          bodyMat,
          plantaMat,
          crochetMat,
        ),
      )
    }
  }

  // ---- 1 对尾足：腹节 10 = 第 12 节，更粗、明显朝后下方蹬
  for (const side of [1, -1] as const) {
    g.add(
      proleg(
        0.925,
        side,
        { theta: 140, back: 0.45, len: 0.52, radius: 0.27, name: 'anal-proleg', plantaName: 'anal-planta' },
        bodyMat,
        plantaMat,
        crochetMat,
      ),
    )
  }

  // ---- 臀板：尾端背面的一块深色硬片，盖住体末
  {
    const s = 0.985
    const n = surfaceNormal(0)
    const p = surfacePoint(s, 0).addScaledVector(n, -0.03)
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), analPlateMat)
    plate.name = 'anal-plate'
    // 压得更扁更宽：出图时 0.5 的厚度读成「尾巴上顶了个褐色球」，
    // 而臀板是一块**盖**在体末的硬片
    plate.scale.set(1.32, 0.36, 1.06)
    plate.position.copy(p).add(new THREE.Vector3(-0.08, -0.02, 0))
    g.add(plate)
  }

  // ---- anchors
  const headCenter = trunkCenter(0).add(new THREE.Vector3(0.62, -0.1, 0))
  const anchors: Record<string, THREE.Vector3> = {
    head: headCenter,
    // 背侧毛瘤：第 4 节右侧那一个
    tubercle: surfacePoint(segMid(4), THREE.MathUtils.degToRad(32)).addScaledVector(surfaceNormal(THREE.MathUtils.degToRad(32)), 0.1),
    // 气门：第 5 节右侧
    spiracle: surfacePoint(segMid(5), THREE.MathUtils.degToRad(SPIRACLE_THETA)),
    // 胸足：中胸右足的末端附近
    thoracicLeg: surfacePoint(segMid(1), THREE.MathUtils.degToRad(146), 0.06).add(new THREE.Vector3(0, -0.46, 0.1)),
    // 腹足：腹节 4（第 6 节）右侧的趾面
    proleg: surfacePoint(segMid(6), THREE.MathUtils.degToRad(152), 0.08).add(new THREE.Vector3(-0.05, -0.45, 0.06)),
  }

  return finalize(g, anchors)
}
