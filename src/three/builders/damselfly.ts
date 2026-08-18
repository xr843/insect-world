/**
 * 蓝纹尾蟌 Ischnura sp.（蜻蜓目·蟌科 Zygoptera）
 *
 * 本文件存在的意义就是与已有的 dragonfly.ts（碧伟蜓，差翅亚目 Anisoptera）
 * 形成对照——蟌科（束翅亚目）和差翅亚目虽同属蜻蜓目，但三处关键形态截然
 * 相反，本文件把每一处都做实：
 *
 * 1. 停息姿态：蜻蜓（差翅）静止时四翅完全水平侧展（dragonfly.ts 把
 *    spread 锁在接近 90°的"完全侧展"）；蟌（束翅）恰好相反，静止时
 *    四翅向后收拢、竖立贴合在腹部背方。kit.wing() 的 spread/tilt 组合
 *    行为不直观（见 kit.ts 对 spread 语义的警告），本文件没有直接猜，
 *    而是写了一个临时探针脚本实测 wing() 在不同 spread/tilt 下的真实
 *    渲染包围盒（探针已用完即删，不留在仓库里），得到的关键结论：
 *    - spread=270（sweep=0）时，翅尖沿翅长方向精确指向 -X（体后），
 *      且这个方向对 tilt 完全不敏感——因为翅长轴此时正好落在 X 旋转轴
 *      上，绕自身轴转不会移动轴上的点。
 *    - 但翅的"宽度"方向（离轴的点）会随 tilt 转动：tilt=0 时宽度方向
 *      落在水平的 Z 轴上（翅平展），tilt→90°时宽度方向转到竖直的 Y 轴
 *      上（翅立起来，像两页立着的书）。
 *    因此 spread=270+tilt=90 精确对应"翅长指向体后、翅面竖起"——正是
 *    束翅亚目收翅的姿态。四片翅 base.z 只给很小的偏移，tilt=90 时翅自身
 *    宽度带来的 Z 方向散布也趋近于 0，四翅因此紧紧靠拢在背中线上方，
 *    读出来是"合拢竖立"而不是"摊开"。__tests__/round5a.test.ts 直接量
 *    四翅并集包围盒的 Y 跨度是否大于 Z 跨度来验证，不复述 spread/tilt
 *    这两个常量本身。
 * 2. 复眼间距：差翅亚目复眼硕大、在头顶几乎相接（dragonfly.ts 特意把
 *    两眼半径放大到主动重叠，见其"holoptic"注释）；束翅亚目恰好相反，
 *    复眼比例小得多，左右分居头部两端，中间隔着一段明显的额部，整个
 *    头部呈"哑铃形"。本文件因此不用 compoundEyePair()（它只是简单的
 *    左右镜像，没有"中间连一段哑铃杆"的余地），改成手动调用两次
 *    compoundEye() 分别命名 eyeR/eyeL，中间再放一段细杆（spindle 从
 *    -barHalf 到 +barHalf，杆长明显短于两眼中心距，即两颗眼球"探出"
 *    在杆的两端之外）。测试验证两眼的渲染包围盒在 Z 方向不重叠。
 * 3. 腹部粗细：差翅亚目腹部虽细长，但比束翅亚目粗得多；蟌科腹部细如
 *    一根针，分节却依然清晰可辨——这是野外一眼分辨"哪个是豆娘"最快的
 *    特征。本文件复用 dragonfly.ts 首创的 bandedAbdomen()（逐节独立
 *    放样、双色交替，环沟做出清晰分节），但 r0/r1 都调得远小于原版，
 *    节数加到 10 以上强调"分节清晰"。测试直接验证渲染出来的腹部最大
 *    直径 ≤ 体长的 1/25。
 *
 * 另外两处次要但同样是蟌科辨识特征：
 * - 翅基有明显的翅柄（petiole）：蜻蜓的翅基直接扩展成翅面，蟌科的翅基
 *   先收窄成一段柄状结构再展开成翅面。kit.wingGeometry() 支持自定义
 *   outline（沿翅长 0~1 的半宽控制点），本文件因此没有复用 kit 默认的
 *   卵圆轮廓，而是自写 STALK_OUTLINE：前 17% 半宽压得很窄，此后才
 *   放宽成主翅面。
 * - 翅脉比蜻蜓稀疏：dragonfly.ts 走 venation.ts 时纵脉 13、横脉密度 16
 *   （还原古翅类最密网状脉序），本文件只给纵脉 6、横脉密度 6（束翅亚目
 *   翅脉相对简化）；脉粗同样是按翅宽缩放的相对值。venation 在纵脉几乎
 *   贴拢的区段自动不搭横脉，翅柄（petiole）段因此天然是「集束无横脉」
 *   ——恰好是真实蟌翅翅柄的样子。翅痣蟌科很醒目，本文件没自带，
 *   由 venation 的 pterostigma 开关补上。
 *
 * 体色蓝绿金属配黑环纹：bandedAbdomen 的双色交替材质一份走金属蓝绿、
 * 一份走近黑，天然读出"环纹"节律。⚠️ 提醒自己：kit.ts 强调 ACES 色调
 * 映射会显著提亮去饱和，蓝绿基色因此也比"想要的观感"压深一档。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEye,
  finalize,
  legPair,
  loft,
  membrane,
  registerWing,
  spindle,
  wingGeometry,
  type InsectModel,
  type LegSpec,
  type Section,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 翅轮廓：前 17% 收成窄柄（翅柄/petiole），此后放宽成主翅面，
 * 末端圆钝收尖——蟌科翅基有柄，这是它和 dragonfly.ts 默认卵圆轮廓
 * 最直观的几何差异。 */
const STALK_OUTLINE: [number, number][] = [
  [0, 0.06],
  [0.09, 0.065],
  [0.17, 0.11],
  [0.26, 0.26],
  [0.45, 0.34],
  [0.65, 0.33],
  [0.82, 0.25],
  [0.94, 0.13],
  [1, 0.05],
]

/**
 * 一片完整的翅（翅面 + 翅室网翅脉 + 翅痣），已按 spread/tilt/sweep 摆好
 * 姿态——手动复刻 kit.wing() 的装配逻辑（不改 kit.ts），翅脉走
 * venation.ts（脉粗按翅宽缩放；纵脉 6、横脉密度 6 的稀疏档还原束翅
 * 亚目的简化脉序；翅柄集束段自动无横脉）。翅面命名 wingFace、翅脉命名
 * wingVein，供测试量取"翅膜远大于翅脉"与虹彩防泄漏。
 */
function buildWing(
  spec: WingSpec,
  faceMat: THREE.Material,
  veinMat: THREE.Material,
  stigmaMat: THREE.Material,
  side: 1 | -1,
  veinCount: number,
): THREE.Group {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), faceMat)
  face.name = 'wingFace'
  blade.add(face)
  const veins = venation({
    length: spec.length,
    width: spec.width,
    outline: spec.outline,
    longitudinal: veinCount,
    crossDensity: 6,
    veinScale: 0.01,
    material: veinMat,
    name: 'wingVein',
    pterostigma: true, // 蟌科翅痣醒目，本文件没有自带翅痣，由生成器补上
    pterostigmaMaterial: stigmaMat,
  })
  if (veins) blade.add(veins)
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  return pivot
}

/**
 * 分节上色的细长腹部：逐节独立放样、双色交替，环沟撑出清晰分节
 * （手法复用 dragonfly.ts 的 bandedAbdomen，r0/r1 按蟌科"细如针"的
 * 比例大幅调小，每段 mesh 命名 abdomen 供测试量取真实最大直径）。
 */
function bandedAbdomen(opts: {
  from: THREE.Vector3
  to: THREE.Vector3
  r0: number
  r1: number
  segments: number
  groove: number
  colorA: THREE.ColorRepresentation
  colorB: THREE.ColorRepresentation
}): THREE.Group {
  const g = new THREE.Group()
  const matA = chitin({ color: opts.colorA, gloss: 0.62, metal: 0.4, clearcoat: 0.4 })
  const matB = chitin({ color: opts.colorB, gloss: 0.4, clearcoat: 0.22 })
  const envelope = (t: number): number => {
    const bulge = 0.1
    if (t < bulge) return THREE.MathUtils.lerp(opts.r0 * 0.75, opts.r0, smoothstep(t / bulge))
    return THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep((t - bulge) / (1 - bulge)))
  }
  for (let s = 0; s < opts.segments; s++) {
    const t0 = s / opts.segments
    const t1 = (s + 1) / opts.segments
    const p0 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t0)
    const p1 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t1)
    const rStart = envelope(t0)
    const rBulge = envelope((t0 + t1) / 2) * 1.03
    const rEnd = envelope(t1) * (1 - opts.groove)
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart, 1e-4), rz: Math.max(rStart, 1e-4) },
      { at: new THREE.Vector3().lerpVectors(p0, p1, 0.5), ry: Math.max(rBulge, 1e-4), rz: Math.max(rBulge, 1e-4) },
      { at: p1, ry: Math.max(rEnd, 1e-4), rz: Math.max(rEnd, 1e-4) },
    ]
    const seg = new THREE.Mesh(loft(sections, 16), s % 2 === 0 ? matA : matB)
    seg.name = 'abdomen'
    g.add(seg)
  }
  return g
}

// ---------------------------------------------------------------- 建模主体

export function buildDamselfly(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#0d3a3c', gloss: 0.62, metal: 0.4, clearcoat: 0.4 })
  const headMat = chitin({ color: '#0b2224', gloss: 0.5, metal: 0.3, clearcoat: 0.3 })
  const legMat = chitin({ color: '#141210', gloss: 0.35 })
  const eyeColor = '#3f6fa0'
  // 翅膜：淡烟灰/淡蓝的半透明质感，opacity 从 0.22 提到 0.42——原值太透，
  // 翅脉又曾粗到盖过翅膜（kit 硬编码 0.009 的历史问题），膜要能读出
  // "四片有面积的膜"。现在翅脉走 venation.ts，脉粗按翅宽缩放。
  // B 轮翅膜虹彩组：翅面积小，保持 kit 默认强度即可（不额外加强）。只挂在
  // wingFaceMat（供下方 buildWing() 里 name='wingFace' 的翅膜面 mesh 使用）——
  // 翅脉走的是下面单独的 veinMat（venation() 里 name='wingVein'），
  // 两者是完全独立的材质对象，不会被误挂。翅痣单独一份深蓝黑 stigmaMat，
  // 同样与翅膜材质分离。
  const wingFaceMat = membrane('#cddce2', 0.42, { iridescent: true })
  const veinMat = chitin({ color: '#20241f', gloss: 0.35, side: THREE.DoubleSide })
  const stigmaMat = chitin({ color: '#16222e', gloss: 0.5 })

  // ---- 头：哑铃形——两颗复眼分居两端，中间一段细杆连接（不用
  // compoundEyePair()，因为它只是左右镜像，没有"中间连杆+眼球探出杆端"
  // 的余地，必须手动分别放置）
  const headX = 0.95
  const headY = 0.28
  const eyeRadius = 0.085
  const eyeZ = 0.16
  const barHalf = 0.075

  const headBar = new THREE.Mesh(
    spindle([headX, headY, -barHalf], [headX, headY, barHalf], 0.034, { bulge: 0.5, flat: 1.0, taperStart: 0.55, taperEnd: 0.55 }),
    headMat,
  )
  g.add(headBar)

  const eyeR = compoundEye({ at: [headX, headY, eyeZ], radius: eyeRadius, color: eyeColor, flatten: 0.92, stretch: 1.05, facets: true })
  eyeR.name = 'eyeR'
  g.add(eyeR)
  const eyeL = compoundEye({ at: [headX, headY, -eyeZ], radius: eyeRadius, color: eyeColor, flatten: 0.92, stretch: 1.05, facets: true })
  eyeL.name = 'eyeL'
  g.add(eyeL)

  // ---- 刚毛状触角：蜻蜓目共通的极短触角，定位主要靠视觉而非嗅觉
  const antBase: [number, number, number] = [headX + 0.06, headY - 0.02, 0.045]
  g.add(antennaPair({ base: antBase, length: 0.07, kind: 'setaceous', pitch: 15, yaw: 40, thickness: 0.008 }, legMat))

  // ---- 胸：远比差翅亚目小巧，翅、足集中生在这一小段
  const thoraxFrom = new THREE.Vector3(0.34, -0.02, 0)
  const thoraxTo = new THREE.Vector3(0.84, 0.08, 0)
  const thorax = new THREE.Mesh(
    spindle([thoraxFrom.x, thoraxFrom.y, thoraxFrom.z], [thoraxTo.x, thoraxTo.y, thoraxTo.z], 0.15, {
      bulge: 0.4,
      flat: 1.05,
      taperStart: 0.55,
      taperEnd: 0.6,
    }),
    bodyMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)
  const thoraxCenter = new THREE.Vector3().lerpVectors(thoraxFrom, thoraxTo, 0.45)

  // ---- 腹：细如针，10 节，蓝绿金属/近黑交替出环纹
  const abdomenFrom = new THREE.Vector3(0.3, -0.03, 0)
  const abdomenTo = new THREE.Vector3(-2.65, 0.03, 0)
  g.add(
    bandedAbdomen({
      from: abdomenFrom,
      to: abdomenTo,
      r0: 0.055,
      r1: 0.011,
      segments: 10,
      groove: 0.22,
      colorA: '#0f4f4a',
      colorB: '#12100d',
    }),
  )

  // ---- 四片翅：翅基有柄（STALK_OUTLINE），竖立合拢于背方（spread=270,
  // tilt=90，见文件头注释的探针实测结论），翅脉稀疏（纵脉 6 含前缘脉）
  const foreSpec: WingSpec = {
    base: [0.74, 0.22, 0.05],
    length: 1.7,
    width: 0.34,
    outline: STALK_OUTLINE,
    spread: 270,
    tilt: 90,
    sweep: 0,
    thickness: 0.007,
  }
  const hindSpec: WingSpec = {
    base: [0.5, 0.21, 0.055],
    length: 1.58,
    width: 0.36,
    outline: STALK_OUTLINE,
    spread: 270,
    tilt: 90,
    sweep: -3,
    thickness: 0.007,
  }

  let wingAnchorPivot: THREE.Group | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingFaceMat, veinMat, stigmaMat, side, 6)
    fw.name = 'wing'
    // 骨架标记：buildWing() 复刻的是 kit.wing() 的枢轴装配方式，
    // registerWing 补上 kit 内建 wing() 打不到的这一份。
    registerWing(fw, { side, role: 'fore' })
    g.add(fw)
    const hw = buildWing(hindSpec, wingFaceMat, veinMat, stigmaMat, side, 6)
    hw.name = 'wing'
    registerWing(hw, { side, role: 'hind' })
    g.add(hw)
    if (side === 1) wingAnchorPivot = fw
  }

  // ---- 六足：细而不承重飞行姿态，比差翅亚目的"捕虫篮"式屈曲更接近正常站立
  const legSpecs: LegSpec[] = [
    { base: [0.68, 0.02, 0.1], femur: 0.22, tibia: 0.24, thickness: 0.017, splay: 30, sweep: -22, knee: 60 },
    { base: [0.5, 0.0, 0.11], femur: 0.24, tibia: 0.26, thickness: 0.018, splay: 32, sweep: 8, knee: 62 },
    { base: [0.32, -0.02, 0.1], femur: 0.25, tibia: 0.27, thickness: 0.018, splay: 34, sweep: 30, knee: 64 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  // ---- anchor：翅尖用 localToWorld 沿实际装配矩阵链读出精确坐标（同 dragonfly.ts）
  g.updateMatrixWorld(true)
  const wingBlade = wingAnchorPivot!.children[0] as THREE.Group
  const wingTip = wingBlade.localToWorld(new THREE.Vector3(foreSpec.length * 0.96, 0, 0))

  const anchors: Record<string, THREE.Vector3> = {
    wing: wingTip,
    eye: new THREE.Vector3(headX, headY, eyeZ),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.3).add(new THREE.Vector3(0, 0.05, 0)),
    thorax: thoraxCenter,
    leg: midLegTip.clone(),
    antenna: new THREE.Vector3(...antBase),
  }

  return finalize(g, anchors)
}
