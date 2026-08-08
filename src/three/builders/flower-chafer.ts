/**
 * 白星花金龟 Protaetia brevitarsis（金龟科花金龟亚科）
 *
 * 造型要点：
 * - 扁平体型：与独角仙的高隆起正相反，本种整体上下压扁，背面近乎
 *   平坦。kit.spindle() 的 flat 参数实测 flat > 1 是 **Y 方向（背腹
 *   向）压扁**（已用 earwig.ts「flat 都 > 1（Y 方向压扁）」的实际
 *   用法核实，以代码行为 ry=r/flat, rz=r*flat 为准，不采信 kit.ts
 *   文档字符串里相反的措辞）。本文件全身取 flat 1.7~1.8（独角仙的
 *   belly 只取 1.12），鞘翅穹顶也换成「宽而低」的 ry:rz 比例（独角仙
 *   反过来是 ry:rz≈0.62:0.42，本文件是 ry:rz≈0.30:0.60，正好倒转），
 *   并把六足的 knee 角度压得比独角仙浅得多（独角仙 74~82°的深蹲会
 *   把腿甩到体下方很远，导致整体高度反超宽度）。
 * - 鞘翅肩部一个明显的凹口（humeral notch）：花金龟亚科独有的构造，
 *   后翅从这个凹口伸出，不必张开鞘翅就能飞——这是本物种最值得讲的
 *   结构。loft() 的截面只有 ry/rz 两个半径，没有「沿角度局部内凹」
 *   的参数，因此改用另一条思路：只对 **rz（宽度方向）** 施加一个
 *   局部集中的 notchDip() 衰减，ry（穹顶高度）只给极浅的同步衰减——
 *   从正上方看，鞘翅外缘在肩后不远处会真的向内凹进去一截，而背面的
 *   高度基本不受影响，读成「削掉一角」而不是整片被捏细的蜂腰。
 * - 古铜绿色带金属光泽、散布不规则白斑：白斑用 surfacePoint() 在放样
 *   截面上按 (t, theta) 反推曲面坐标 + spotPatch() 压扁贴面（手法与
 *   ladybird.ts 的 domeSurfacePoint/spotPatch、jewel-beetle.ts 的
 *   surfaceStripe 同源），但 theta 显式乘 side 保证两侧真镜像（见
 *   diving-beetle.ts 同款问题的说明：jewel-beetle.ts 对两侧复用同一个
 *   固定 theta，实测会让右侧落在外缘、左侧偏内，本文件不重复这个
 *   用法）。
 * - 鳃叶状触角直接用 kit 内建的 'lamellate' 类型（金龟总科共有特征，
 *   无需自写）。
 * - 跗节短（brevitarsis）：legSpec.tarsus 显式给到 femur 的 0.17~0.18
 *   倍，明显短于 kit.leg() 默认的 0.35 倍。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 局部凹陷：中心 1-depth，边缘平滑回 1，只在 [center-halfWidth, center+halfWidth] 内起效。 */
function notchDip(t: number, center: number, halfWidth: number, depth: number): number {
  const d = Math.abs(t - center) / halfWidth
  if (d >= 1) return 1
  const s = Math.cos((d * Math.PI) / 2)
  return 1 - depth * s * s
}

/** 沿放样截面反推曲面坐标；theta 内部乘 side，保证左右两侧真正镜像。 */
function surfacePoint(
  sections: Section[],
  centers: THREE.Vector3[],
  side: 1 | -1,
  halfWidth: number,
  t: number,
  outerThetaDeg: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const n = sections.length
  const idx = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))))
  const sec = sections[idx]
  const center = centers[idx]
  const theta = THREE.MathUtils.degToRad(side * outerThetaDeg)
  const zOffset = side * halfWidth
  const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz)
  const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
  const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  return { pos, normal }
}

/** 贴合曲面的白斑：把小球沿法线方向压扁，紧贴在曲面上（同 ladybird.ts 的 spotPatch）。 */
function spotPatch(pos: THREE.Vector3, normal: THREE.Vector3, radius: number, thinness: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), material)
  m.position.copy(pos).addScaledVector(normal, (radius * thinness) / 2 + 0.005)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  m.scale.set(1, 1, thinness)
  m.name = 'white-spot'
  return m
}

// ---------------------------------------------------------------- 主体

export function buildFlowerChafer(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#4a5a24', gloss: 0.68, metal: 0.42, clearcoat: 0.4 })
  // B 轮：中虹彩铜绿底。iridescent:true 后 iridescence 手动降到
  // 0.5——弱于强虹彩档（吉丁 0.75、虎甲用 kit 默认 1），强于弱虹彩档
  // （豉甲 0.28、隐翅虫 0.3），IOR/厚度域仍用 kit 默认。白斑走独立的
  // spotMat，不受影响，保持哑光。
  const shellMat = elytra('#4f5f27', 0.4, { iridescent: true })
  shellMat.iridescence = 0.5
  const spotMat = chitin({ color: '#efe8d4', gloss: 0.18 }) // 蜡质哑光白斑，不是光泽
  const legMat = chitin({ color: '#3a4420', gloss: 0.5, metal: 0.26, clearcoat: 0.24 })
  const antennaMat = chitin({ color: '#241f10', gloss: 0.4 })
  const hintMat = chitin({ color: '#2c1c10', gloss: 0.22 }) // 凹口下隐约的后翅暗示色

  const halfWidth = 0.42

  // ---- 腹面体躯：整条身体唯一的连续基底，flat 取到 1.75——扁平体型的地基
  const belly = new THREE.Mesh(
    spindle([-1.15, -0.02, 0], [0.85, 0.06, 0], 0.5, { bulge: 0.4, flat: 1.75, taperStart: 0.06, taperEnd: 0.55 }),
    bodyMat,
  )
  g.add(belly)

  // ---- 鞘翅：宽而低的圆顶（ry:rz≈0.30:0.60，与独角仙的 0.62:0.42 正相反），
  // 肩后一段施加 notchDip，凹出后翅伸出口
  const eFrom = 0.55
  const eTo = -1.15
  const eSteps = 30
  const notchCenter = 0.16
  const notchHalf = 0.045
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.6) * Math.PI * 0.92)
    const dipZ = notchDip(t, notchCenter, notchHalf, 0.58)
    const dipY = notchDip(t, notchCenter, notchHalf, 0.15)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.14 - 0.05 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.3 * dipY, 0.012), rz: Math.max(w * 0.6 * dipZ, 0.012) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 30), shellMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)

    // 凹口下隐约露出的后翅暗示——不是必需结构，只是加强"这里是缺口"的可读性
    const { pos, normal } = surfacePoint(elytronSections, elytronCenters, side, halfWidth, notchCenter, 66)
    const hint = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), hintMat)
    hint.position.copy(pos).addScaledVector(normal, -0.016)
    hint.scale.set(1, 0.42, 0.5)
    g.add(hint)

    // 白斑：每侧 8 个，大小不一、位置不规则，避开凹口区与首尾两端
    const spotDefs: [number, number, number][] = [
      [0.26, 20, 0.05],
      [0.24, 54, 0.036],
      [0.34, 8, 0.046],
      [0.42, 46, 0.052],
      [0.5, 16, 0.037],
      [0.58, 48, 0.044],
      [0.68, 12, 0.033],
      [0.78, 40, 0.038],
    ]
    for (const [t, theta, r] of spotDefs) {
      const sp = surfacePoint(elytronSections, elytronCenters, side, halfWidth, t, theta)
      g.add(spotPatch(sp.pos, sp.normal, r, 0.3, spotMat))
    }
  }

  // ---- 小盾片：两鞘翅基部之间的三角小片，鞘翅目通用识别点
  g.add(
    new THREE.Mesh(
      spindle([0.56, 0.15, 0], [0.4, 0.18, 0], 0.048, { bulge: 0.15, flat: 1.4, taperStart: 0.9, taperEnd: 0.05 }),
      bodyMat,
    ),
  )

  // ---- 前胸背板：同为古铜绿，宽度从头侧向鞘翅侧渐宽，与鞘翅衔接处不留台阶；
  // 用自建放样（而非 kit.spindle()）以便同样能在其上贴白斑
  const pronotumFromX = 0.8
  const pronotumToX = 0.55
  const pSteps = 12
  const pronotumSections: Section[] = []
  const pronotumCenters: THREE.Vector3[] = []
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps
    const wFrac = THREE.MathUtils.lerp(0.5, 1.0, smoothstep(t))
    const c = new THREE.Vector3(THREE.MathUtils.lerp(pronotumFromX, pronotumToX, t), 0.15, 0)
    pronotumCenters.push(c)
    pronotumSections.push({ at: c, ry: Math.max(0.5 * wFrac * 0.32, 0.015), rz: Math.max(0.5 * wFrac * 0.62, 0.015) })
  }
  g.add(new THREE.Mesh(loft(pronotumSections, 26), bodyMat))
  for (const side of [1, -1] as const) {
    for (const [t, theta, r] of [
      [0.3, 30, 0.03],
      [0.65, 34, 0.032],
    ] as [number, number, number][]) {
      const sp = surfacePoint(pronotumSections, pronotumCenters, side, 0, t, theta)
      g.add(spotPatch(sp.pos, sp.normal, r, 0.3, spotMat))
    }
  }

  // ---- 头部：小，大半藏在前胸背板前缘下方（典型金龟姿态）
  const head = new THREE.Mesh(
    spindle([pronotumFromX, 0.16, 0], [0.97, 0.17, 0], 0.22, { bulge: 0.4, flat: 1.3, taperStart: 0.78, taperEnd: 0.42 }),
    bodyMat,
  )
  g.add(head)

  g.add(compoundEyePair({ at: [0.78, 0.2, 0.28], radius: 0.085, color: '#0e0c0a', flatten: 0.84, facets: true }))

  // ---- 鳃叶状触角：金龟总科共有特征，kit 内建类型直接用
  const antBase: [number, number, number] = [0.87, 0.15, 0.16]
  g.add(antennaPair({ base: antBase, length: 0.28, kind: 'lamellate', pitch: -6, yaw: 32, thickness: 0.03 }, antennaMat))

  // ---- 六足：中等粗细，knee 角度压浅（保持整体扁平，不让腿把高度撑过宽度），
  // 跗节显式给短（femur 的 ~0.18 倍，明显短于默认 0.35 倍——brevitarsis「短跗」）
  const legSpecs: LegSpec[] = [
    { base: [0.55, -0.1, 0.34], femur: 0.32, tibia: 0.27, tarsus: 0.058, thickness: 0.042, splay: 36, sweep: -30, knee: 36, ankle: 34 },
    { base: [0.05, -0.12, 0.4], femur: 0.35, tibia: 0.3, tarsus: 0.062, thickness: 0.044, splay: 34, sweep: 6, knee: 38, ankle: 36 },
    { base: [-0.5, -0.12, 0.36], femur: 0.36, tibia: 0.31, tarsus: 0.065, thickness: 0.045, splay: 38, sweep: 38, knee: 40, ankle: 38 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const notchPos = surfacePoint(elytronSections, elytronCenters, 1, halfWidth, notchCenter, 62).pos

  const anchors: Record<string, THREE.Vector3> = {
    elytra: surfacePoint(elytronSections, elytronCenters, 1, halfWidth, 0.4, 20).pos,
    notch: notchPos,
    pronotum: surfacePoint(pronotumSections, pronotumCenters, 1, 0, 0.5, 20).pos,
    eye: new THREE.Vector3(0.78, 0.26, 0.34),
    antenna: new THREE.Vector3(antBase[0] + 0.22, antBase[1] + 0.1, antBase[2] + 0.14),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
