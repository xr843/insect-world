/**
 * 黄脸油葫芦 Teleogryllus emma（雄）
 *
 * 造型要点（与同为直翅目的蝈螽 katydid.ts、飞蝗 locust.ts 的分辨点）：
 * - 前翅短而方、平覆背上：螽斯前翅是竖起的长叶片，蝗虫覆翅狭长过腹端，
 *   蟋蟀的前翅平摊在背上、只盖到腹部约 2/3 处，轮廓近方形；右翅叠在
 *   左翅之上（蟋蟀式，与螽斯左叠右相反），右翅面上一组斜行脊线示意
 *   音锉（stridulatory file）——雄蟋蟀鸣叫就是右翅音锉刮左翅刮器。
 * - 一对细长尾须（cercus）：向后八字张开、长约体长 0.36，是蟋蟀科
 *   区别于螽斯（尾须短小）的醒目特征；做雄虫，无剑状产卵器。
 * - 触角丝状超过体长（直翅目螽亚目共性，蝗虫触角远短于体长）。
 * - 体色深褐近黑、体型墩实、头大而圆（油葫芦头部圆亮如漆）；
 *   后足粗壮能跳，但股节比例（直径 ≈ 长 0.31）比蝗虫（0.38）收敛。
 * - 腹部裸露分节，挂节间膜环（segmentedAbdomenMembranes）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  registerWing,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type SegmentedAbdomenOptions,
  spindle,
  wingGeometry,
  wingVeins,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 触角着生点与名义长度：导出供测试复算「触角 > 体长」。 */
export const ANTENNA_BASE: [number, number, number] = [1.04, 0.3, 0.07]
export const ANTENNA_LENGTH = 2.6
/** 跳跃后足髋着生点（右）：导出供测试量取股节粗细比例。 */
export const HIND_HIP: [number, number, number] = [0.1, -0.02, 0.3]
/** 右尾须基点：导出供测试量取尾须伸出长度。 */
export const CERCUS_BASE: [number, number, number] = [-0.98, 0.04, 0.06]

/**
 * 平覆式前翅：复刻 kit.wing() 的枢轴装配，但左右基点高度可各自给——
 * 右翅要叠在左翅上方（+0.023），kit.wing() 的对称 side 翻转给不出这个错位。
 * withFile=true（右翅）时在翅面基半段加 5 条斜行脊线示意音锉。
 */
function flatTegmen(
  spec: WingSpec,
  faceMat: THREE.Material,
  veinMat: THREE.Material,
  side: 1 | -1,
  withFile: boolean,
): { pivot: THREE.Group; blade: THREE.Group } {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), faceMat)
  face.name = side === 1 ? 'cricket-tegmen-r' : 'cricket-tegmen-l'
  blade.add(face)
  blade.add(wingVeins(spec, veinMat, 5))

  if (withFile) {
    // 音锉：斜行于翅基半段的一组隆起脊线（真实音锉是一列微齿，这里做示意尺度的脊）
    const halfW = spec.width * 0.5
    for (let k = 0; k < 5; k++) {
      const x0 = spec.length * (0.14 + 0.07 * k)
      const ridge = new THREE.Mesh(
        loft(
          [
            { at: new THREE.Vector3(x0, 0.016, -halfW * 0.55), ry: 0.013, rz: 0.013 },
            { at: new THREE.Vector3(x0 + spec.length * 0.1, 0.016, halfW * 0.74), ry: 0.009, rz: 0.009 },
          ],
          6,
        ),
        veinMat,
      )
      ridge.name = 'cricket-stridulator-ridge'
      blade.add(ridge)
    }
  }

  pivot.add(blade)
  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  // 骨架标记：本种只建了前翅（覆翅），后翅未单独建模，role 固定给 'fore'。
  registerWing(pivot, { side, role: 'fore' })
  return { pivot, blade }
}

/** 跳跃后足股节：宽平台包络，maxR = len/6.4（直径/长 ≈ 0.31，比蝗虫的 0.38 收敛）。 */
function jumpingFemur(hip: THREE.Vector3, knee: THREE.Vector3, mat: THREE.Material): THREE.Mesh {
  const len = hip.distanceTo(knee)
  const maxR = len / 6.4
  const steps = 18
  const sections: Section[] = []
  const startK = 0.36
  const endK = 0.26
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let k: number
    if (t < 0.26) k = startK + (1 - startK) * smoothstep01(t / 0.26)
    else if (t > 0.72) k = 1 - (1 - endK) * smoothstep01((t - 0.72) / 0.28)
    else k = 1
    const r = maxR * k
    sections.push({ at: new THREE.Vector3().lerpVectors(hip, knee, t), ry: Math.max(r, 0.006), rz: Math.max(r * 0.88, 0.006) })
  }
  const mesh = new THREE.Mesh(loft(sections, 16), mat)
  mesh.name = 'cricket-jumping-femur'
  return mesh
}

/** 跳跃后足胫节：渐收 + 外缘两列刺（每列 6 枚）。 */
function jumpingTibia(knee: THREE.Vector3, ankle: THREE.Vector3, mat: THREE.Material, spineMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const steps = 14
  const path: THREE.Vector3[] = []
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = new THREE.Vector3().lerpVectors(knee, ankle, t)
    path.push(p)
    const r = THREE.MathUtils.lerp(0.045, 0.02, t)
    sections.push({ at: p, ry: r, rz: r })
  }
  g.add(new THREE.Mesh(loft(sections, 10), mat))

  const axis = new THREE.Vector3().subVectors(ankle, knee).normalize()
  const upHint = Math.abs(axis.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3().crossVectors(axis, upHint).normalize()
  const normal = new THREE.Vector3().crossVectors(side, axis).normalize()
  for (const rowSign of [1, -1] as const) {
    for (let i = 1; i <= 6; i++) {
      const t = i / 7
      const idx = Math.min(steps, Math.round(t * steps))
      const p = path[idx]
      const r = THREE.MathUtils.lerp(0.045, 0.02, t)
      const base = p.clone().addScaledVector(normal, r * 0.85).addScaledVector(side, rowSign * r * 0.5)
      const tip = base.clone().addScaledVector(normal, 0.06).addScaledVector(axis, -0.032)
      g.add(new THREE.Mesh(loft([{ at: base, ry: 0.009, rz: 0.009 }, { at: tip, ry: 0.0013, rz: 0.0013 }], 5), spineMat))
    }
  }
  return g
}

/** 组装一对跳跃后足，返回右膝供 anchor 用。 */
function hindLegPair(mat: THREE.Material, spineMat: THREE.Material): { group: THREE.Group; rightKnee: THREE.Vector3 } {
  const g = new THREE.Group()
  let rightKnee = new THREE.Vector3()
  for (const side of [1, -1] as const) {
    const hip = new THREE.Vector3(HIND_HIP[0], HIND_HIP[1], HIND_HIP[2] * side)
    const femurDir = new THREE.Vector3(-0.72, 0.42, side * 0.24).normalize()
    const femurLen = 0.95
    const knee = hip.clone().addScaledVector(femurDir, femurLen)
    const tibiaDir = new THREE.Vector3(0.1, -0.97, side * -0.18).normalize()
    const ankle = knee.clone().addScaledVector(tibiaDir, 0.85)
    const tarsusDir = new THREE.Vector3(0.55, -0.35, side * -0.04).normalize()
    const tip = ankle.clone().addScaledVector(tarsusDir, 0.32)

    if (side === 1) rightKnee = knee.clone()

    g.add(jumpingFemur(hip, knee, mat))
    g.add(jumpingTibia(knee, ankle, mat, spineMat))

    const tarsusSections: Section[] = [0, 0.5, 1].map((t) => ({
      at: new THREE.Vector3().lerpVectors(ankle, tip, t),
      ry: THREE.MathUtils.lerp(0.018, 0.006, t),
      rz: THREE.MathUtils.lerp(0.018, 0.006, t),
    }))
    g.add(new THREE.Mesh(loft(tarsusSections, 8), mat))

    const maxR = femurLen / 6.4
    for (const [p, r] of [
      [hip, maxR * 0.36 * 1.15],
      [knee, maxR * 0.26 * 1.2],
      [ankle, 0.022],
    ] as const) {
      const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat)
      j.position.copy(p)
      g.add(j)
    }
  }
  return { group: g, rightKnee }
}

/** 一根尾须：细长渐收，微微下垂，向后外侧八字张开。返回 mesh 与末端点。 */
function cercus(side: 1 | -1, mat: THREE.Material): { mesh: THREE.Mesh; tip: THREE.Vector3 } {
  const base = new THREE.Vector3(CERCUS_BASE[0], CERCUS_BASE[1], CERCUS_BASE[2] * side)
  const dir = new THREE.Vector3(-0.9, -0.06, side * 0.42).normalize()
  const len = 0.78
  const steps = 10
  const sections: Section[] = []
  let tip = base
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = base
      .clone()
      .addScaledVector(dir, len * t)
      .add(new THREE.Vector3(0, -0.1 * len * t * t, 0))
    const r = THREE.MathUtils.lerp(0.028, 0.004, t)
    sections.push({ at: p, ry: r, rz: r })
    if (i === steps) tip = p
  }
  const mesh = new THREE.Mesh(loft(sections, 8), mat)
  mesh.name = 'cricket-cercus'
  return { mesh, tip }
}

export function buildCricket(): InsectModel {
  const g = new THREE.Group()

  const headMat = chitin({ color: '#221610', gloss: 0.55, clearcoat: 0.25 }) // 油葫芦头圆亮如漆
  const bodyMat = chitin({ color: '#241812', gloss: 0.42, clearcoat: 0.15 })
  const legMat = chitin({ color: '#2e1e12', gloss: 0.38 })
  const spineMat = chitin({ color: '#140d08', gloss: 0.5 })
  const tegmenMat = chitin({ color: '#382718', gloss: 0.42, clearcoat: 0.15 }) // 革质前翅略浅于体色，翅缘可读
  const veinMat = chitin({ color: '#180f09', gloss: 0.32 })
  const cercusMat = chitin({ color: '#2a1a10', gloss: 0.3 })
  const eyeColor = '#141009'

  // ---- 头：大而圆（bulge 居中 + 高 taper，接近球形）
  const head = new THREE.Mesh(
    spindle([0.68, 0.12, 0], [1.12, 0.14, 0], 0.3, { bulge: 0.5, flat: 1.0, taperStart: 0.55, taperEnd: 0.5 }),
    headMat,
  )
  head.name = 'cricket-body-core'
  g.add(head)

  // ---- 前胸背板：墩实的短筒，略宽于高
  const pronotum = new THREE.Mesh(
    spindle([0.22, 0.1, 0], [0.7, 0.12, 0], 0.33, { bulge: 0.5, flat: 1.15, taperStart: 0.7, taperEnd: 0.75 }),
    bodyMat,
  )
  pronotum.name = 'cricket-body-core'
  g.add(pronotum)

  // ---- 腹部：分节，裸露段挂节间膜环
  const abdomenOpts: SegmentedAbdomenOptions = {
    from: [0.26, 0.02, 0],
    to: [-1.06, 0.04, 0],
    r0: 0.32,
    r1: 0.08,
    segments: 8,
    groove: 0.13,
    flat: 1.1,
    bulge: 0.2,
    color: '#241812',
  }
  const abdomen = new THREE.Mesh(segmentedAbdomen(abdomenOpts), bodyMat)
  abdomen.name = 'cricket-body-core'
  abdomen.add(...segmentedAbdomenMembranes(abdomenOpts))
  g.add(abdomen)

  // ---- 前翅：短而方、平覆背上，右翅叠左翅（右基点高 0.023），右翅带音锉
  const tegmenSpec: WingSpec = {
    base: [0.18, 0.375, 0.06],
    length: 0.95,
    width: 0.62,
    outline: [
      [0, 0.3],
      [0.08, 0.78],
      [0.25, 0.97],
      [0.55, 1.0],
      [0.85, 0.96],
      [0.96, 0.85],
      [1, 0.45],
    ],
    spread: -96,
    tilt: 5,
    sweep: 0,
    thickness: 0.01,
  }
  const tegmenR = flatTegmen(tegmenSpec, tegmenMat, veinMat, 1, true)
  const tegmenL = flatTegmen({ ...tegmenSpec, base: [0.18, 0.352, 0.06] }, tegmenMat, veinMat, -1, false)
  g.add(tegmenR.pivot, tegmenL.pivot)

  // ---- 一对尾须：八字张开
  const cercusR = cercus(1, cercusMat)
  const cercusL = cercus(-1, cercusMat)
  g.add(cercusR.mesh, cercusL.mesh)

  // ---- 复眼：圆头上侧的一对半球
  const eyeAt: [number, number, number] = [0.98, 0.26, 0.21]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.095, color: eyeColor, flatten: 0.9, stretch: 1.0, facets: true }))

  // ---- 下颚须：口器旁一对下垂的短须（蟋蟀脸部的显眼小细节）
  for (const side of [1, -1] as const) {
    const palpSections: Section[] = []
    const pa = new THREE.Vector3(1.1, -0.06, side * 0.06)
    const pb = new THREE.Vector3(1.18, -0.13, side * 0.08)
    const pc = new THREE.Vector3(1.22, -0.18, side * 0.09)
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      const a = new THREE.Vector3().lerpVectors(pa, pb, t)
      const b = new THREE.Vector3().lerpVectors(pb, pc, t)
      palpSections.push({ at: a.lerp(b, t), ry: THREE.MathUtils.lerp(0.02, 0.008, t), rz: THREE.MathUtils.lerp(0.02, 0.008, t) })
    }
    g.add(new THREE.Mesh(loft(palpSections, 6), legMat))
  }

  // ---- 触角：丝状，超过体长（体长 ≈ 2.18，触角 2.6）
  const antennaGroup = antennaPair(
    { base: ANTENNA_BASE, length: ANTENNA_LENGTH, kind: 'filiform', pitch: 18, yaw: 24, thickness: 0.014 },
    bodyMat,
  )
  antennaGroup.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'cricket-antenna-strand'
  })
  g.add(antennaGroup)

  // ---- 前中足：常规步行足；后足：跳跃腿（自建）
  g.add(
    legPair({ base: [0.62, -0.14, 0.26], femur: 0.34, tibia: 0.34, splay: 30, sweep: -28, knee: 70, thickness: 0.038 }, legMat),
  )
  g.add(
    legPair({ base: [0.34, -0.16, 0.28], femur: 0.38, tibia: 0.4, splay: 30, sweep: 6, knee: 72, thickness: 0.04 }, legMat),
  )
  const { group: hindLegs, rightKnee } = hindLegPair(legMat, spineMat)
  g.add(hindLegs)

  // ---- stridulator anchor：沿右翅装配矩阵链读出音锉区中心
  g.updateMatrixWorld(true)
  const stridulatorAt = tegmenR.blade.localToWorld(new THREE.Vector3(tegmenSpec.length * 0.3, 0.02, 0.02))

  const anchors: Record<string, THREE.Vector3> = {
    stridulator: stridulatorAt,
    cercus: cercusR.tip.clone(),
    hindleg: rightKnee,
    antenna: new THREE.Vector3(ANTENNA_BASE[0] + 0.25, ANTENNA_BASE[1] + 0.12, ANTENNA_BASE[2] + 0.1),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + 0.1),
    head: new THREE.Vector3(0.95, 0.22, 0),
  }

  return finalize(g, anchors)
}
