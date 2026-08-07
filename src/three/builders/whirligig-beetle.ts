/**
 * 豉甲 Gyrinus sp.（鞘翅目·豉甲科，水面旋游）
 *
 * 造型要点：
 * - 定义特征是复眼被一道横脊完全分成上下两对独立半球：上面一对露出
 *   水面看空中，下面一对浸在水下看水里。本文件不满足于"一对复眼加一圈
 *   暗色分界线"这种平面化的偷懒做法，而是真的放两对互不相连、互不
 *   重叠的 compoundEye 球——upperEye 一对 Y 区间与 lowerEye 一对 Y 区间
 *   严格不重叠，中间留出可见缝隙，缝隙里再贴一道极窄的分界脊
 *   （dividingRidge()）把"这里断开了"的视觉信号做实。用
 *   `compoundEyePair()` 分别调两次（一次给上眼参数，一次给下眼参数）
 *   而不是手写四份镜像坐标，保证左右镜像正确性直接继承自 kit 已验证
 *   的实现；再深入子节点把 dome mesh 重命名为 upperEye/lowerEye，供
 *   测试按名字精确清点「恰好 4 个独立复眼」。
 * - 体长按真实尺度写（约 0.7cm，与 ladybird.ts 同一量级）——finalize()
 *   统一按包围球半径归一化取景，绝对数值不影响呈现，但沿用"1=1cm"
 *   约定本身是本项目的纪律（见 kit.ts 与 ladybird.ts 头注）。
 * - 极度光滑的扁卵形体：像一粒压扁的瓜子。豉甲在水面高速旋游，任何
 *   突起都是阻力，所以本文件刻意不给鞘翅加任何隆脊/斑纹/毛簇——
 *   干净的双凸曲面 + 高光泽材质（gloss 0.95、metal 0.62，外加克制的
 *   iridescence 模拟"乌黑带蓝紫金属反光"）就是全部的表面语言。
 * - 中后足特化成极短的扁桨（stubPaddle()，仿 diving-beetle.ts 的
 *   paddleHindleg() 手法自建放样，不走 kit.leg() 的固定圆管截面），
 *   收在体侧、伸出量很小，与前足形成强烈反差；前足则用 kit.legPair()
 *   拉长比例、大幅前摆（sweep 强负值），伸向头前方用于抓握猎物。
 * - 触角短小，藏在复眼下方——豉甲触角短粗且特化（第二节膨大成浮囊，
 *   本文件不刻画到这个细节，只取"短而不起眼"这一读者能一眼看懂的
 *   共性，避免为一个次要器官引入新的 AntennaKind）。
 */
import * as THREE from 'three'
import { antennaPair, chitin, compoundEyePair, finalize, legPair, loft, spindle, type InsectModel, type Section } from './kit'

// ---------------------------------------------------------------- 局部工具

/**
 * 极短扁桨（一侧）：基节极短，桨叶厚度(ry)沿全长持续变薄、宽度(rz)
 * 在中段达到峰值再收尖——与 kit.leg() 的固定圆管截面不同。side 直接
 * 决定方向分量正负，不依赖 kit 的镜像机制（同 diving-beetle.paddleHindleg
 * 与 mole-cricket.diggingForeleg 的处理方式）。方向几乎纯侧向、只带
 * 极轻微的下探与后掠，读成"贴着体侧收拢的短桨"而非"伸出去挠水的长桨"。
 */
function stubPaddle(
  base: THREE.Vector3,
  side: 1 | -1,
  bladeLen: number,
  material: THREE.Material,
  hairMaterial: THREE.Material,
): { group: THREE.Group; tip: THREE.Vector3 } {
  const g = new THREE.Group()
  const dir = new THREE.Vector3(-0.22, -0.12, side * 0.97).normalize()

  const coxaLen = bladeLen * 0.22
  const coxaEnd = base.clone().addScaledVector(dir, coxaLen)
  g.add(
    new THREE.Mesh(loft([{ at: base, ry: 0.02, rz: 0.02 }, { at: coxaEnd, ry: 0.016, rz: 0.016 }], 8), material),
  )

  const steps = 10
  const bladeSections: Section[] = []
  const bladeCenters: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = coxaEnd.clone().addScaledVector(dir, bladeLen * t)
    bladeCenters.push(p)
    const widthEnv = Math.sin(Math.pow(t, 0.55) * Math.PI * 0.92)
    const ry = THREE.MathUtils.lerp(0.013, 0.0035, t)
    const rz = Math.max(0.008 + widthEnv * bladeLen * 0.55, 0.003)
    bladeSections.push({ at: p, ry: Math.max(ry, 0.0018), rz })
  }
  const blade = new THREE.Mesh(loft(bladeSections, 14), material)
  blade.name = 'paddle'
  g.add(blade)

  // 稀疏缘毛：数量刻意压低（豉甲的桨短而快，缘毛不像龙虱那样是主要推进面）
  const hairCount = 7
  for (let i = 0; i < hairCount; i++) {
    const t = 0.15 + (i / (hairCount - 1)) * 0.75
    const idx = Math.min(steps, Math.max(0, Math.round(t * steps)))
    const sec = bladeSections[idx]
    const center = bladeCenters[idx]
    const edge = center.clone()
    edge.z += side * sec.rz * 0.95
    const hairLen = 0.012 + 0.006 * Math.sin(t * Math.PI)
    const tip = edge.clone()
    tip.z += side * hairLen
    const hair = new THREE.Mesh(loft([{ at: edge, ry: 0.0012, rz: 0.0012 }, { at: tip, ry: 0.0002, rz: 0.0002 }], 5), hairMaterial)
    g.add(hair)
  }

  return { group: g, tip: bladeCenters[bladeCenters.length - 1].clone() }
}

/** 上下复眼间的分界脊：一道极窄的短脊，贴在两对眼之间的缝隙里，坐实"这里断开了"。 */
function dividingRidge(at: THREE.Vector3, side: 1 | -1, len: number, material: THREE.Material): THREE.Mesh {
  const from = at.clone().add(new THREE.Vector3(-len * 0.5, 0, 0))
  const to = at.clone().add(new THREE.Vector3(len * 0.5, 0, 0))
  const sections: Section[] = [
    { at: from, ry: 0.004, rz: 0.004 },
    { at: at.clone().add(new THREE.Vector3(0, 0, side * 0.006)), ry: 0.007, rz: 0.007 },
    { at: to, ry: 0.004, rz: 0.004 },
  ]
  return new THREE.Mesh(loft(sections, 8), material)
}

// ---------------------------------------------------------------- 主体

export function buildWhirligigBeetle(): InsectModel {
  const g = new THREE.Group()

  // 乌黑带蓝紫金属反光：高 metalness + 极低 roughness 打底，
  // 补一点 iridescence 做出"角度一转会泛蓝紫"的克制虹彩（不像
  // jewel-beetle 那样大幅漂移，豉甲的虹彩要含蓄得多）。
  const shellMat = chitin({ color: '#0a0a10', gloss: 0.95, metal: 0.62, clearcoat: 0.54 })
  shellMat.iridescence = 0.28
  shellMat.iridescenceIOR = 1.35
  shellMat.iridescenceThicknessRange = [180, 320]

  const bodyMat = chitin({ color: '#0d0d13', gloss: 0.86, metal: 0.5, clearcoat: 0.46 })
  const legMat = chitin({ color: '#111117', gloss: 0.62, metal: 0.32, clearcoat: 0.32 })
  const eyeColor = '#050507'
  const ridgeMat = chitin({ color: '#050506', gloss: 0.5, metal: 0.2 })

  const halfWidth = 0.1

  // ---- 腹面体躯：唯一的连续基底，两端都收成钝尖但不尖锐——"压扁的瓜子"
  const belly = new THREE.Mesh(
    spindle([-0.34, -0.008, 0], [0.2, 0.01, 0], 0.155, { bulge: 0.42, flat: 1.55, taperStart: 0.08, taperEnd: 0.42 }),
    bodyMat,
  )
  belly.name = 'body'
  g.add(belly)

  // ---- 鞘翅：两片贴体低矮圆顶，干净无棱、高度抛光
  const eFrom = 0.17
  const eTo = -0.32
  const eSteps = 22
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.55) * Math.PI * 0.9)
    elytronSections.push({
      at: new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.04 - 0.015 * t * t, 0),
      ry: Math.max(w * 0.09, 0.004),
      rz: Math.max(w * 0.1, 0.004),
    })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), shellMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)
  }

  // ---- 前胸背板：短而扁，与鞘翅、头部平滑衔接
  const pronotum = new THREE.Mesh(
    spindle([0.19, 0.018, 0], [0.27, 0.02, 0], 0.135, { bulge: 0.3, flat: 1.4, taperStart: 0.85, taperEnd: 0.65 }),
    bodyMat,
  )
  g.add(pronotum)

  // ---- 头部：小，四眼几乎占满两侧
  const head = new THREE.Mesh(
    spindle([0.25, 0.02, 0], [0.34, 0.02, 0], 0.09, { bulge: 0.4, flat: 1.15, taperStart: 0.75, taperEnd: 0.35 }),
    bodyMat,
  )
  g.add(head)

  // ---- 上下两对复眼：Y 区间严格不重叠，这是本物种存在的理由
  const eyeX = 0.3
  const eyeZ = 0.086
  const eyeR = 0.042
  const eyeFlatten = 0.8
  const upperY = 0.135
  const lowerY = 0.043

  const upperPair = compoundEyePair({ at: [eyeX, upperY, eyeZ], radius: eyeR, color: eyeColor, flatten: eyeFlatten, facets: false })
  for (const eyeGroup of upperPair.children as THREE.Group[]) {
    ;(eyeGroup.children[0] as THREE.Mesh).name = 'upperEye'
  }
  g.add(upperPair)

  const lowerPair = compoundEyePair({ at: [eyeX, lowerY, eyeZ], radius: eyeR, color: eyeColor, flatten: eyeFlatten, facets: false })
  for (const eyeGroup of lowerPair.children as THREE.Group[]) {
    ;(eyeGroup.children[0] as THREE.Mesh).name = 'lowerEye'
  }
  g.add(lowerPair)

  const ridgeY = (upperY - eyeR * eyeFlatten + (lowerY + eyeR * eyeFlatten)) / 2
  for (const side of [1, -1] as const) {
    g.add(dividingRidge(new THREE.Vector3(eyeX, ridgeY, side * (eyeZ + eyeR * 0.4)), side, 0.05, ridgeMat))
  }

  // ---- 短触角，藏在复眼下方
  const antennaBase: [number, number, number] = [0.31, 0.03, 0.06]
  g.add(antennaPair({ base: antennaBase, length: 0.1, kind: 'filiform', pitch: 4, yaw: 30, thickness: 0.006 }, bodyMat))

  // ---- 前足：细长，大幅前摆，用于抓握猎物
  const foreRig = legPair(
    { base: [0.22, -0.03, 0.11], femur: 0.22, tibia: 0.26, tarsus: 0.1, thickness: 0.013, splay: 22, sweep: -56, knee: 38, ankle: 40 },
    legMat,
  )
  foreRig.name = 'foreleg-rig'
  g.add(foreRig)

  // ---- 中足、后足：极短扁桨，紧收体侧
  const midBaseR = new THREE.Vector3(0.02, -0.02, 0.096)
  const midBaseL = new THREE.Vector3(0.02, -0.02, -0.096)
  const midR = stubPaddle(midBaseR, 1, 0.09, legMat, legMat)
  const midL = stubPaddle(midBaseL, -1, 0.09, legMat, legMat)
  const midRig = new THREE.Group()
  midRig.name = 'midleg-rig'
  midRig.add(midR.group, midL.group)
  g.add(midRig)

  const hindBaseR = new THREE.Vector3(-0.13, -0.02, 0.09)
  const hindBaseL = new THREE.Vector3(-0.13, -0.02, -0.09)
  const hindR = stubPaddle(hindBaseR, 1, 0.08, legMat, legMat)
  const hindL = stubPaddle(hindBaseL, -1, 0.08, legMat, legMat)
  const hindRig = new THREE.Group()
  hindRig.name = 'hindleg-rig'
  hindRig.add(hindR.group, hindL.group)
  g.add(hindRig)

  const anchors: Record<string, THREE.Vector3> = {
    upperEye: new THREE.Vector3(eyeX, upperY, eyeZ),
    lowerEye: new THREE.Vector3(eyeX, lowerY, eyeZ),
    midleg: midR.tip,
    elytra: new THREE.Vector3(-0.06, 0.13, halfWidth * 0.75),
    antenna: new THREE.Vector3(...antennaBase),
    body: new THREE.Vector3(-0.05, 0.05, 0),
  }

  return finalize(g, anchors)
}
