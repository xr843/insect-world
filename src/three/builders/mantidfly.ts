/**
 * 螳蛉 Mantispa japonica（脉翅目 Mantispidae，趋同演化的活教材）
 *
 * 造型要点：
 * - 讲解层的核心故事是"螳螂式捕捉前足 + 脉翅目网状翅**同框**"：
 *   前足与螳螂（螳螂目）毫无亲缘却长出同一把镰刀——趋同演化；
 *   翅却出卖了它的真实家门——密网翅脉是脉翅目（草蛉的近亲）。
 *   两个招牌各自都有别的虫有，同框才是螳蛉。
 * - 捕捉前足照 mantis.ts 的做法（腿节内缘刺列 + 胫节贝塞尔弧反折
 *   扣回腿节）但整体小一号：腿节 mesh 命名 'raptorialFemur'、胫节
 *   'raptorialTibia'、刺 'raptorialSpine'——"反折"的可测表达是
 *   胫节与腿节在 X 向大幅重叠（直伸的胫节重叠≈0）。
 * - 前胸拉长成"颈"，且比螳螂的更细长（长/粗 ≈ 8，螳螂约 5）——
 *   螳蛉脖子占体长 1/4 以上，是它区别于其他脉翅目的第二眼特征。
 * - 两对近等大的膜翅（脉翅目特征）停栖屋脊状：翅脉必须走
 *   venation.ts 的参数化翅脉网（中档：纵脉 7、横脉密度 12），
 *   翅膜开极轻虹彩（iridescenceStrength 0.3）。
 * - 配色：黄褐带红棕（常见种拟蜂色系的收敛版），ACES 下整体压深，
 *   捕捉足内缘刺给淡黄拉对比。
 *
 * 坐标：+X 前，+Y 上，+Z 右；1 单位 = 1cm，体长约 2cm。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  membrane,
  mirrorZ,
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

/** 两点间圆锥放样段 */
function tube(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, material: THREE.Material, radial = 12): THREE.Mesh {
  return new THREE.Mesh(loft([{ at: a, ry: r0, rz: r0 }, { at: b, ry: r1, rz: r1 }], radial), material)
}

/** 沿一串点放样、半径逐点指定（弯曲路径：镰刀胫节、拉长的颈） */
function tubeShape(points: THREE.Vector3[], radii: number[], material: THREE.Material, radial = 12): THREE.Mesh {
  const sections: Section[] = points.map((p, i) => ({ at: p, ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

function jointSphere(p: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material)
  m.position.copy(p)
  return m
}

function quadBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  return p0.clone().lerp(p1, t).lerp(p1.clone().lerp(p2, t), t)
}

/**
 * 螳蛉捕捉足（一侧，+z）：基节 → 腿节（内缘刺列，name='raptorialFemur'）
 * → 贝塞尔反折的镰刀胫节（name='raptorialTibia'，尖端勾回腿节中段下方）。
 * 结构照 mantis.ts 的 raptorialLeg，整体缩小约 1/4 比例、刺列 5 枚。
 */
function raptorialLeg(base: THREE.Vector3, material: THREE.Material, spineMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()

  // 基节：短，从前胸前端下方把整条前足撑向前下
  const coxaDir = new THREE.Vector3(0.5, -0.55, 0.42).normalize()
  const coxaTip = base.clone().addScaledVector(coxaDir, 0.16)
  g.add(tube(base, coxaTip, 0.035, 0.03, material))
  g.add(jointSphere(base, 0.038, material))

  // 腿节：前伸微扬——"举起前臂"的主体
  const femurLen = 0.52
  const femurDir = new THREE.Vector3(0.9, 0.3, -0.06).normalize()
  const femurTip = coxaTip.clone().addScaledVector(femurDir, femurLen)
  const femur = tube(coxaTip, femurTip, 0.034, 0.016, material)
  femur.name = 'raptorialFemur'
  g.add(femur)
  g.add(jointSphere(coxaTip, 0.036, material))

  // 腹侧方向：垂直腿节、指向身体腹面——刺列与胫节折入的凹槽都朝这侧
  const down = new THREE.Vector3(0, -1, 0)
  const ventral = down.clone().addScaledVector(femurDir, -down.dot(femurDir)).normalize()

  // 内缘刺列：5 枚长短相间，卡住猎物的关键结构
  for (let i = 0; i < 5; i++) {
    const t = 0.15 + (i / 4) * 0.72
    const p = coxaTip.clone().lerp(femurTip, t)
    const len = i % 2 === 0 ? 0.055 : 0.032
    const tip = p.clone().addScaledVector(ventral, len).addScaledVector(femurDir, -len * 0.3)
    const spine = new THREE.Mesh(
      loft([{ at: p, ry: 0.008, rz: 0.008 }, { at: tip, ry: 0.001, rz: 0.001 }], 6),
      spineMat,
    )
    spine.name = 'raptorialSpine'
    g.add(spine)
  }

  // 胫节：贝塞尔弧反折——先向前下凸出，再把尖端勾回腿节中段下方。
  // "反折"的几何事实：胫节 X 范围与腿节 X 范围大幅重叠（测试钉这个）。
  const tibiaLen = 0.42
  const ctrl = femurTip.clone().addScaledVector(femurDir, tibiaLen * 0.42).addScaledVector(ventral, tibiaLen * 0.62)
  const hookTip = femurTip.clone().addScaledVector(femurDir, -tibiaLen * 0.72).addScaledVector(ventral, tibiaLen * 0.18)
  const steps = 14
  const path: THREE.Vector3[] = []
  const radii: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(quadBezier(femurTip, ctrl, hookTip, t))
    radii.push(THREE.MathUtils.lerp(0.02, 0.0018, Math.pow(t, 0.8)))
  }
  const tibia = tubeShape(path, radii, material)
  tibia.name = 'raptorialTibia'
  g.add(tibia)
  g.add(jointSphere(femurTip, 0.022, material))

  g.userData.femurTip = femurTip
  return g
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/**
 * 网状翅装配：屋脊停栖（spread/tilt 档位沿用 lacewing.ts 的推导结果，
 * spread = 270 − φ，φ≈30 收向体后 + tilt≈42 出屋顶坡度），翅脉走
 * venation 中档——螳蛉翅室比草蛉略疏（纵脉 7 / 横密 12 vs 草蛉 9 / 20）。
 */
function buildWing(spec: WingSpec, faceMat: THREE.Material, veinMat: THREE.Material, side: 1 | -1): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), faceMat)
  face.name = 'wing-membrane'
  blade.add(face)
  const veins = venation({
    length: spec.length,
    width: spec.width,
    outline: spec.outline,
    longitudinal: 7,
    crossDensity: 12,
    veinScale: 0.014,
    material: veinMat,
    name: 'vein',
  })
  if (veins) blade.add(veins)
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  return { pivot, blade, tipLocal: new THREE.Vector3(spec.length * 0.94, 0, 0) }
}

// ---------------------------------------------------------------- 建模主体

export function buildMantidfly(): InsectModel {
  const g = new THREE.Group()

  // ACES：黄褐压深一档；捕捉足刺淡黄拉满对比
  const bodyMat = chitin({ color: '#6d4f24', gloss: 0.4, clearcoat: 0.15 })
  const neckMat = chitin({ color: '#5d431e', gloss: 0.42, clearcoat: 0.18 })
  const abdomenMat = chitin({ color: '#6d5227', gloss: 0.35, clearcoat: 0.1 })
  const raptorialMat = chitin({ color: '#74401f', gloss: 0.5, clearcoat: 0.25 })
  const spineMat = chitin({ color: '#d9c27a', gloss: 0.3 })
  const legMat = chitin({ color: '#584019', gloss: 0.35 })
  const antennaMat = chitin({ color: '#4a3316', gloss: 0.32 })
  const wingFaceMat = membrane('#efe6cf', 0.18, { iridescent: true, iridescenceStrength: 0.3 })
  const veinMat = chitin({ color: '#5d4a28', gloss: 0.3, side: THREE.DoubleSide })

  // ---- 中后胸：短粗，翅与步行足的着生段
  const thorax = new THREE.Mesh(
    spindle([0.12, 0.1, 0], [0.48, 0.2, 0], 0.13, { bulge: 0.45, flat: 1.0, taperStart: 0.6, taperEnd: 0.65 }),
    bodyMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 前胸"颈"：细长杆向前上方斜举（长 0.66 / 粗 0.045~0.075，
  // 长粗比 ≈ 8，比螳螂的脖子更细长），头顶在颈端
  const neckPts = [
    new THREE.Vector3(0.45, 0.24, 0),
    new THREE.Vector3(0.68, 0.38, 0),
    new THREE.Vector3(0.88, 0.48, 0),
    new THREE.Vector3(1.02, 0.53, 0),
  ]
  const pronotum = tubeShape(neckPts, [0.075, 0.048, 0.045, 0.055], neckMat, 14)
  pronotum.name = 'pronotum'
  g.add(pronotum)

  // ---- 头：小而横宽，两颗大复眼占掉大半（脉翅目的大眼小脸）
  const head = new THREE.Mesh(
    spindle([1.02, 0.55, 0], [1.22, 0.52, 0], 0.095, { bulge: 0.4, flat: 1.3, taperStart: 0.55, taperEnd: 0.3 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  const eyeAt: [number, number, number] = [1.12, 0.58, 0.085]
  const eyeR = 0.075
  g.add(compoundEyePair({ at: eyeAt, radius: eyeR, color: '#3c2a12', flatten: 0.85, stretch: 1.1, facets: true }))

  // ---- 触角：短丝状（螳蛉触角远短于草蛉——捕猎靠视觉不靠触觉）
  const antBase: [number, number, number] = [1.18, 0.6, 0.04]
  const antLength = 0.5
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'filiform', pitch: 28, yaw: 30, thickness: 0.012 }, antennaMat))

  // ---- 捕捉前足：着生在前胸**前端**（螳蛉与螳螂的差异之一——
  // 螳螂前足长在前胸基部，螳蛉长在拉长前胸的最前端、紧贴头后）
  const raptorialBase = new THREE.Vector3(0.98, 0.48, 0.06)
  g.add(mirrorZ(raptorialLeg(raptorialBase.clone(), raptorialMat, spineMat)))

  // ---- 腹：纺锤形收尖，7 节
  const abdomenFrom = new THREE.Vector3(0.14, 0.06, 0)
  const abdomenTo = new THREE.Vector3(-0.78, -0.02, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      r0: 0.115,
      r1: 0.015,
      segments: 7,
      groove: 0.16,
      bulge: 0.24,
      color: '#6d5227',
    }),
    abdomenMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 中足、后足：普通步行足（前足已特化，不参与行走支撑）
  g.add(legPair({ base: [0.32, 0.02, 0.1], femur: 0.3, tibia: 0.32, thickness: 0.02, splay: 30, sweep: 8, knee: 66 }, legMat))
  g.add(legPair({ base: [0.18, 0.0, 0.1], femur: 0.34, tibia: 0.38, thickness: 0.02, splay: 28, sweep: 36, knee: 70 }, legMat))

  // ---- 两对近等大的网状翅：屋脊状盖在腹背
  const wingOutline: [number, number][] = [
    [0, 0.12],
    [0.12, 0.52],
    [0.3, 0.85],
    [0.5, 1.0],
    [0.7, 0.95],
    [0.88, 0.66],
    [1, 0.22],
  ]
  const foreSpec: WingSpec = {
    base: [0.34, 0.2, 0.04],
    length: 1.3,
    width: 0.46,
    outline: wingOutline,
    spread: 240,
    tilt: 42,
    sweep: 0,
    thickness: 0.005,
  }
  const hindSpec: WingSpec = {
    base: [0.22, 0.18, 0.04],
    length: 1.2,
    width: 0.44,
    outline: wingOutline,
    spread: 236,
    tilt: 40,
    sweep: -4,
    thickness: 0.005,
  }
  let foreRight: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingFaceMat, veinMat, side)
    const hw = buildWing(hindSpec, wingFaceMat, veinMat, side)
    g.add(fw.pivot, hw.pivot)
    if (side === 1) foreRight = fw
  }

  // ---- anchors
  g.updateMatrixWorld(true)
  const wingTip = foreRight!.blade.localToWorld(foreRight!.tipLocal.clone())

  const anchors: Record<string, THREE.Vector3> = {
    raptorialLeg: raptorialBase.clone().add(new THREE.Vector3(0.45, 0.05, 0.12)),
    wing: wingTip,
    pronotum: new THREE.Vector3(0.75, 0.44, 0),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + eyeR),
    antenna: new THREE.Vector3(antBase[0] + 0.35, antBase[1] + 0.1, antBase[2] + 0.12),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.45).add(new THREE.Vector3(0, 0.08, 0)),
  }

  return finalize(g, anchors)
}
