/**
 * 环斑猛猎蝽 Sphedanolestes impressicollis
 *
 * 造型要点：
 * - 粗壮弯曲的三节刺吸喙是猎蝽科与其他蝽的一眼之别：植食蝽的喙细直、
 *   平贴腹面中线；猎蝽的喙短粗、只有三节，停息时从头前向下再向后折，
 *   像一把收起的折刀，喙尖搁在前胸腹面（真实猎蝽受惊时就用喙尖在前胸
 *   腹板的发音沟里刮擦发声）。kit.rostrum() 是一根直杆，做不出这个
 *   「折刀」姿态，本文件用三段独立放样 + 关节球自建。
 * - 捕捉式前足：股节明显加粗（制服猎物的肌肉都在这里），内缘一列微齿
 *   用于扣压挣扎的猎物；中后足保持细长步行比例，反衬前足的特化。
 *   kit.leg() 做不出这种局部加粗，股节用宽平台包络自建（做法与
 *   locust.ts 的 jumpingFemur 同源，但更短粗）。
 * - 头在复眼之后收细成一段圆柱「颈」——猎蝽头部的标志轮廓，蝽科没有。
 * - 腹部宽扁（flat 1.5），侧接缘（connexivum）在半翅外露出一圈，
 *   黄黑相间的警戒色块——腹部比收拢的翅更宽是本科常态。
 * - 腹部裸露分节，挂节间膜环（segmentedAbdomenMembranes）。
 * - 前胸背板刻点（surface:'punctate'），通体黑褐带光泽。
 */
import * as THREE from 'three'
import {
  abdomenEnvelope,
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type SegmentedAbdomenOptions,
  spindle,
  wingPair,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 捕捉式前足髋（基节）着生点：导出供测试量取股节「加粗」比例（配合 foreleg anchor = 右膝）。 */
export const FORE_HIP: [number, number, number] = [0.52, -0.1, 0.2]

/**
 * 捕捉式前足股节：宽平台包络（22%~72% 满宽），maxR = len/6 → 直径 ≈ len/3，
 * 明显粗于同虫中后足（thickness 0.034 → 股节半径 ≈ 0.049），一眼读出「特化」。
 */
function raptorialFemur(hip: THREE.Vector3, knee: THREE.Vector3, mat: THREE.Material): THREE.Mesh {
  const len = hip.distanceTo(knee)
  const maxR = len / 6
  const steps = 16
  const sections: Section[] = []
  const startK = 0.4
  const endK = 0.3
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let k: number
    if (t < 0.22) k = startK + (1 - startK) * smoothstep01(t / 0.22)
    else if (t > 0.72) k = 1 - (1 - endK) * smoothstep01((t - 0.72) / 0.28)
    else k = 1
    const r = maxR * k
    sections.push({ at: new THREE.Vector3().lerpVectors(hip, knee, t), ry: Math.max(r, 0.006), rz: Math.max(r * 0.9, 0.006) })
  }
  const mesh = new THREE.Mesh(loft(sections, 14), mat)
  mesh.name = 'assassin-raptorial-femur' // 供测试从真实几何体量取最粗处
  return mesh
}

/** 股节包络的半径复算（与 raptorialFemur 内部一致），用于把微齿贴在真实表面上。 */
function femurRadiusAt(t: number, len: number): number {
  const maxR = len / 6
  const startK = 0.4
  const endK = 0.3
  let k: number
  if (t < 0.22) k = startK + (1 - startK) * smoothstep01(t / 0.22)
  else if (t > 0.72) k = 1 - (1 - endK) * smoothstep01((t - 0.72) / 0.28)
  else k = 1
  return maxR * k
}

/** 一条捕捉式前足：加粗股节（内缘微齿）+ 微弯胫节 + 短跗节。side=1 右。 */
function raptorialForeleg(side: 1 | -1, legMat: THREE.Material, toothMat: THREE.Material): { group: THREE.Group; knee: THREE.Vector3 } {
  const g = new THREE.Group()
  const hip = new THREE.Vector3(FORE_HIP[0], FORE_HIP[1], FORE_HIP[2] * side)
  const knee = new THREE.Vector3(0.92, 0.06, 0.4 * side)
  const ankle = new THREE.Vector3(0.7, -0.26, 0.3 * side)
  const tip = new THREE.Vector3(0.82, -0.35, 0.27 * side)

  g.add(raptorialFemur(hip, knee, legMat))

  // 胫节：从膝向后下方微弯收回（捕捉足合拢的姿态），二次贝塞尔采样
  const ctrl = new THREE.Vector3(0.87, -0.06, 0.38 * side)
  const tibiaSections: Section[] = []
  const tSteps = 10
  for (let i = 0; i <= tSteps; i++) {
    const t = i / tSteps
    const a = new THREE.Vector3().lerpVectors(knee, ctrl, t)
    const b = new THREE.Vector3().lerpVectors(ctrl, ankle, t)
    const p = a.lerp(b, t)
    const r = THREE.MathUtils.lerp(0.032, 0.018, t)
    tibiaSections.push({ at: p, ry: r, rz: r })
  }
  g.add(new THREE.Mesh(loft(tibiaSections, 10), legMat))

  // 跗节
  const tarsusSections: Section[] = [0, 0.5, 1].map((t) => ({
    at: new THREE.Vector3().lerpVectors(ankle, tip, t),
    ry: THREE.MathUtils.lerp(0.016, 0.005, t),
    rz: THREE.MathUtils.lerp(0.016, 0.005, t),
  }))
  g.add(new THREE.Mesh(loft(tarsusSections, 8), legMat))

  // 关节球
  const femurLen = hip.distanceTo(knee)
  for (const [p, r] of [
    [hip, (femurLen / 6) * 0.4 * 1.2],
    [knee, (femurLen / 6) * 0.3 * 1.25],
    [ankle, 0.02],
  ] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), legMat)
    j.position.copy(p)
    g.add(j)
  }

  // 内缘微齿：贴着股节下内侧表面一列 4 枚小刺，尖端指向体中线下方
  const axis = new THREE.Vector3().subVectors(knee, hip).normalize()
  const inner = new THREE.Vector3(0, -0.72, -0.7 * side).normalize()
  for (let k = 1; k <= 4; k++) {
    const t = 0.24 + 0.14 * k
    const center = new THREE.Vector3().lerpVectors(hip, knee, t)
    const r = femurRadiusAt(t, femurLen)
    const base = center.clone().addScaledVector(inner, r * 0.85)
    const tipPt = base.clone().addScaledVector(inner, 0.055).addScaledVector(axis, -0.02)
    const tooth = new THREE.Mesh(
      loft([{ at: base, ry: 0.014, rz: 0.014 }, { at: tipPt, ry: 0.002, rz: 0.002 }], 6),
      toothMat,
    )
    tooth.name = 'assassin-fore-tooth'
    g.add(tooth)
  }

  return { group: g, knee }
}

export function buildAssassinBug(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#1f1410', gloss: 0.52, clearcoat: 0.22 })
  const pronotumMat = chitin({ color: '#241611', gloss: 0.5, clearcoat: 0.2, surface: 'punctate' })
  const legMat = chitin({ color: '#2a1a10', gloss: 0.42 })
  const rostrumMat = chitin({ color: '#17100c', gloss: 0.6, clearcoat: 0.3 })
  const toothMat = chitin({ color: '#120c08', gloss: 0.55 })
  const connexAMat = chitin({ color: '#d08a28', gloss: 0.4 }) // 侧接缘亮块：黄黑警戒相间的「黄」
  const connexBMat = chitin({ color: '#140d09', gloss: 0.45 })
  const hemelytronMat = chitin({ color: '#241a14', gloss: 0.36, clearcoat: 0.12 })
  const veinMat = chitin({ color: '#191008', gloss: 0.3 })
  const eyeColor = '#2a1c12'

  // ---- 头：狭长，前端略尖（容纳喙基）
  const head = new THREE.Mesh(
    spindle([0.72, 0.14, 0], [1.08, 0.16, 0], 0.14, { bulge: 0.5, flat: 0.95, taperStart: 0.5, taperEnd: 0.35 }),
    bodyMat,
  )
  head.name = 'assassin-head'
  g.add(head)

  // ---- 「颈」：复眼之后收细的一段圆柱——猎蝽头部的标志轮廓
  const neck = new THREE.Mesh(
    spindle([0.58, 0.13, 0], [0.74, 0.14, 0], 0.072, { bulge: 0.5, taperStart: 0.9, taperEnd: 0.9 }),
    bodyMat,
  )
  neck.name = 'assassin-neck'
  g.add(neck)

  // ---- 前胸背板：后叶宽阔隆起，表面刻点
  const pronotum = new THREE.Mesh(
    spindle([0.18, 0.1, 0], [0.62, 0.14, 0], 0.3, { bulge: 0.62, flat: 1.25, taperStart: 0.45, taperEnd: 0.3 }),
    pronotumMat,
  )
  pronotum.name = 'assassin-pronotum'
  g.add(pronotum)

  // ---- 小盾片：翅基之间的小三角
  const scutellum = new THREE.Mesh(
    spindle([0.18, 0.16, 0], [-0.08, 0.13, 0], 0.1, { bulge: 0.3, flat: 1.3, taperStart: 0.8, taperEnd: 0.1 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 胸部腹面块：足的基座，也是停息时喙尖搁靠的地方
  const venter = new THREE.Mesh(
    spindle([0.05, -0.02, 0], [0.55, 0.0, 0], 0.2, { bulge: 0.5, flat: 1.2, taperStart: 0.5, taperEnd: 0.55 }),
    bodyMat,
  )
  venter.name = 'assassin-thorax-venter'
  g.add(venter)

  // ---- 腹部：宽扁（flat 1.5），比收拢的半翅更宽，侧接缘才能露出来
  const abdomenOpts: SegmentedAbdomenOptions = {
    from: [0.16, 0, 0],
    to: [-1.02, 0.06, 0],
    r0: 0.3,
    r1: 0.05,
    segments: 7,
    groove: 0.13,
    flat: 1.5,
    bulge: 0.45,
    color: '#1f1410',
  }
  const abdomen = new THREE.Mesh(segmentedAbdomen(abdomenOpts), bodyMat)
  abdomen.name = 'assassin-abdomen'
  abdomen.add(...segmentedAbdomenMembranes(abdomenOpts))
  g.add(abdomen)

  // ---- 侧接缘（connexivum）：沿腹缘一圈黄黑相间的扁平色块，露在翅外
  const abdFrom = new THREE.Vector3(...abdomenOpts.from)
  const abdTo = new THREE.Vector3(...abdomenOpts.to)
  for (let j = 1; j <= 6; j++) {
    const t = j / 7
    const env = abdomenEnvelope(t, abdomenOpts.r0, abdomenOpts.r1, abdomenOpts.bulge)
    const at = new THREE.Vector3().lerpVectors(abdFrom, abdTo, t)
    for (const side of [1, -1] as const) {
      const plate = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), j % 2 === 0 ? connexAMat : connexBMat)
      plate.scale.set(0.13, 0.045, 0.1)
      plate.position.set(at.x, at.y + 0.02, side * (env * 1.5 * 0.98))
      plate.name = 'assassin-connexivum'
      g.add(plate)
    }
  }

  // ---- 半翅：停息时平贴背上、略呈屋脊；刻意窄于腹部，让侧接缘露出
  const hemelytraSpec: WingSpec = {
    base: [0.12, 0.3, 0.06],
    length: 1.15,
    width: 0.5,
    outline: [
      [0, 0.2],
      [0.1, 0.6],
      [0.3, 0.9],
      [0.55, 1.0],
      [0.78, 0.9],
      [0.94, 0.6],
      [1, 0.18],
    ],
    spread: -102,
    tilt: 14,
    sweep: 0,
    thickness: 0.01,
  }
  const hemelytra = wingPair(hemelytraSpec, hemelytronMat, veinMat, 4)
  hemelytra.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'assassin-hemelytron'
  })
  g.add(hemelytra)

  // ---- 三节刺吸喙：从头前向下、向后折收，喙尖落在前胸腹面投影内（折刀姿态）
  const rp = [
    new THREE.Vector3(1.1, 0.04, 0),
    new THREE.Vector3(0.96, -0.14, 0),
    new THREE.Vector3(0.74, -0.22, 0),
    new THREE.Vector3(0.5, -0.24, 0),
  ]
  const rostrumRadii: [number, number][] = [
    [0.048, 0.04],
    [0.04, 0.03],
    [0.03, 0.012],
  ]
  for (let s = 0; s < 3; s++) {
    const [r0, r1] = rostrumRadii[s]
    const sections: Section[] = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3().lerpVectors(rp[s], rp[s + 1], t), ry: r, rz: r })
    }
    const seg = new THREE.Mesh(loft(sections, 10), rostrumMat)
    seg.name = 'assassin-rostrum-seg'
    g.add(seg)
  }
  for (const [p, r] of [
    [rp[1], 0.042],
    [rp[2], 0.033],
  ] as const) {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), toothMat)
    joint.position.copy(p)
    g.add(joint)
  }

  // ---- 复眼：球状外凸于头两侧最宽处（颈之前）
  g.add(
    compoundEyePair({ at: [0.9, 0.2, 0.135], radius: 0.062, color: eyeColor, flatten: 0.9, stretch: 1.0, facets: true }),
  )

  // ---- 触角：细长丝状四节
  g.add(
    antennaPair({ base: [1.02, 0.22, 0.05], length: 1.05, kind: 'filiform', pitch: 30, yaw: 30, thickness: 0.016 }, legMat),
  )

  // ---- 前足：捕捉式（加粗股节+内缘微齿），自建
  const foreR = raptorialForeleg(1, legMat, toothMat)
  const foreL = raptorialForeleg(-1, legMat, toothMat)
  g.add(foreR.group, foreL.group)

  // ---- 中后足：细长步行足，反衬前足的加粗
  g.add(
    legPair({ base: [0.28, -0.12, 0.24], femur: 0.42, tibia: 0.44, splay: 30, sweep: 8, knee: 70, thickness: 0.034 }, legMat),
  )
  g.add(
    legPair({ base: [0.0, -0.12, 0.24], femur: 0.5, tibia: 0.55, splay: 28, sweep: 35, knee: 74, thickness: 0.036 }, legMat),
  )

  const anchors: Record<string, THREE.Vector3> = {
    rostrum: rp[3].clone(),
    foreleg: foreR.knee.clone(),
    pronotum: new THREE.Vector3(0.4, 0.36, 0),
    eye: new THREE.Vector3(0.9, 0.2, 0.2),
    antenna: new THREE.Vector3(1.15, 0.35, 0.15),
    abdomen: new THREE.Vector3(-0.45, 0.24, 0),
  }

  return finalize(g, anchors)
}
