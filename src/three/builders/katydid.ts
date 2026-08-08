/**
 * 优雅蝈螽（蝈蝈）Gampsocleis gratiosa
 *
 * 造型要点：
 * - 超长丝状触角是螽斯科与蝗总科最直观的分野：蝗虫触角短于体长，
 *   螽斯触角长度超过体长（本种取约体长的 1.5 倍）、极细，从头顶两复眼
 *   之间紧靠着生，向后呈弧线拖出——这是必须做出的第一特征。
 * - 前翅（覆翅）宽大呈叶片状，革质、带清晰放射状+网状翅脉，折叠贴在
 *   背上像两片扣着的树叶（拟态基础）。翅长超过 kit.wingVeins() 硬编码
 *   半径仍能看清的上限（3 单位），因此本文件自写 leafVeins()，脉粗按
 *   翅宽缩放而非用固定绝对值。
 * - 跳跃后足做法与东亚飞蝗（locust.ts）同源：kit.leg() 只会生成"膝盖
 *   朝一个方向弯"的普通步行足，做不出粗壮股节+Λ形反折，所以后足腿节/
 *   胫节完全自建（宽平台包络避免"中间鼓一坨、两端收尖成线"）。
 * - 听器（tympanum）：螽斯的"耳朵"长在前足胫节基部（不是腹部！），
 *   做成胫节近膝关节处一侧的椭圆薄膜凹片。
 * - 产卵器：雌虫腹端一把侧扁如刀的剑状构造，向后伸出，长度约体长 1/4。
 * - 通体草绿，翅脉/听器膜片/产卵器用褐绿或黄褐过渡，制造层次。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  legPair,
  loft,
  membrane,
  mirrorZ,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type SegmentedAbdomenOptions,
  spindle,
  wingGeometry,
  type InsectModel,
  type LegSpec,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 叶脉状翅脉：kit.wingVeins() 的半径是硬编码绝对值 0.009，在本种这种
 * 翅长 > 3 单位的宽大叶状翅上会细到看不见。这里按 spec.width 缩放脉粗，
 * 并加密横脉分支，强化"叶片"观感（螽斯拟态树叶靠的就是这张脉网）。
 */
function leafVeins(spec: WingSpec, material: THREE.Material, count = 9): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  const baseR = spec.width * 0.017 // 按翅宽缩放，翅越宽脉越粗
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const endY = THREE.MathUtils.lerp(halfW * 0.88, -halfW * 0.62, t)
    const endX = spec.length * THREE.MathUtils.lerp(0.6, 0.96, Math.sin(t * Math.PI))
    const sections: Section[] = []
    const steps = 12
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      const x = spec.length * 0.03 + (endX - spec.length * 0.03) * s
      const y = THREE.MathUtils.lerp(0, endY, Math.pow(s, 0.75))
      const r = baseR * (1 - s * 0.7) * (i === 0 ? 1.6 : 1)
      sections.push({ at: new THREE.Vector3(x, 0.002, y), ry: r, rz: r })
    }
    g.add(new THREE.Mesh(loft(sections, 6), material))
  }
  // 横脉：三道横向连线把纵脉织成网格，是"叶片状"翅最关键的细节
  for (let i = 0; i < count - 1; i++) {
    for (const s of [0.34, 0.58, 0.8]) {
      const t0 = i / (count - 1)
      const t1 = (i + 1) / (count - 1)
      const y0 = THREE.MathUtils.lerp(halfW * 0.88, -halfW * 0.62, t0) * Math.pow(s, 0.75)
      const y1 = THREE.MathUtils.lerp(halfW * 0.88, -halfW * 0.62, t1) * Math.pow(s, 0.75)
      const x = spec.length * s * 0.85
      g.add(
        new THREE.Mesh(
          loft(
            [
              { at: new THREE.Vector3(x, 0.002, y0), ry: baseR * 0.42, rz: baseR * 0.42 },
              { at: new THREE.Vector3(x * 1.02, 0.002, y1), ry: baseR * 0.42, rz: baseR * 0.42 },
            ],
            5,
          ),
          material,
        ),
      )
    }
  }
  return g
}

/** 复刻 kit.wing() 的枢轴装配逻辑，但用 leafVeins() 换掉固定半径的 wingVeins()。 */
function tegmenWing(spec: WingSpec, faceMat: THREE.Material, veinMat: THREE.Material, side: 1 | -1): THREE.Group {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), faceMat))
  blade.add(leafVeins(spec, veinMat, 9))
  pivot.add(blade)
  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  return pivot
}

/**
 * 跳跃腿股节：纺锤形，宽平台包络（28%~74% 保持满宽，两端平滑收细到
 * 0.34×/0.24×maxR）——做法与 locust.ts 的 jumpingFemur 同源，避免
 * "两端收尖成线、只有中段鼓一坨"的失真。maxR=len/4.3，直径≈len/2.15，
 * 明显超过"≥ 全长 1/3"的下限。
 */
function jumpingFemur(hip: THREE.Vector3, knee: THREE.Vector3, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const len = hip.distanceTo(knee)
  const maxR = len / 4.3
  const steps = 20
  const sections: Section[] = []
  const startK = 0.34
  const endK = 0.24
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = new THREE.Vector3().lerpVectors(hip, knee, t)
    let k: number
    if (t < 0.28) k = startK + (1 - startK) * smoothstep01(t / 0.28)
    else if (t > 0.74) k = 1 - (1 - endK) * smoothstep01((t - 0.74) / 0.26)
    else k = 1
    const r = maxR * k
    sections.push({ at: p, ry: Math.max(r, 0.007), rz: Math.max(r * 0.86, 0.007) })
  }
  const mesh = new THREE.Mesh(loft(sections, 16), mat)
  mesh.name = 'katydid-jumping-femur' // 供测试直接量取真实几何体的最粗处
  g.add(mesh)
  return g
}

/** 跳跃腿胫节：细长渐收，外缘两列刺，是螽斯与蝗虫共有的辨识细节。 */
function jumpingTibia(knee: THREE.Vector3, ankle: THREE.Vector3, mat: THREE.Material, spineMat: THREE.Material, spinesPerRow = 9): THREE.Group {
  const g = new THREE.Group()
  const steps = 16
  const path: THREE.Vector3[] = []
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = new THREE.Vector3().lerpVectors(knee, ankle, t)
    path.push(p)
    const r = THREE.MathUtils.lerp(0.048, 0.02, t)
    sections.push({ at: p, ry: r, rz: r })
  }
  g.add(new THREE.Mesh(loft(sections, 10), mat))

  const axis = new THREE.Vector3().subVectors(ankle, knee).normalize()
  const upHint = Math.abs(axis.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3().crossVectors(axis, upHint).normalize()
  const normal = new THREE.Vector3().crossVectors(side, axis).normalize()
  for (const rowSign of [1, -1] as const) {
    for (let i = 1; i <= spinesPerRow; i++) {
      const t = i / (spinesPerRow + 1)
      const idx = Math.min(steps, Math.round(t * steps))
      const p = path[idx]
      const r = THREE.MathUtils.lerp(0.048, 0.02, t)
      const base = p.clone().addScaledVector(normal, r * 0.85).addScaledVector(side, rowSign * r * 0.5)
      const tip = base.clone().addScaledVector(normal, 0.075).addScaledVector(axis, -0.04)
      g.add(new THREE.Mesh(loft([{ at: base, ry: 0.01, rz: 0.01 }, { at: tip, ry: 0.0014, rz: 0.0014 }], 5), spineMat))
    }
  }
  return g
}

/** 组装一对跳跃后足：髋→股节→胫节→跗节，膝部反折成 Λ 形，明显高过背线。 */
function hindLegPair(hipBase: [number, number, number], mat: THREE.Material, spineMat: THREE.Material): { group: THREE.Group; rightKnee: THREE.Vector3 } {
  const g = new THREE.Group()
  let rightKnee = new THREE.Vector3()
  for (const side of [1, -1] as const) {
    const hip = new THREE.Vector3(hipBase[0], hipBase[1], hipBase[2] * side)
    const femurDir = new THREE.Vector3(-0.8, 0.5, side * 0.18).normalize()
    const femurLen = 2.3
    const knee = hip.clone().addScaledVector(femurDir, femurLen)
    const tibiaDir = new THREE.Vector3(0.15, -0.96, side * -0.12).normalize()
    const ankle = knee.clone().addScaledVector(tibiaDir, 2.5)
    const tarsusDir = new THREE.Vector3(0.5, -0.42, side * -0.05).normalize()
    const tip = ankle.clone().addScaledVector(tarsusDir, 0.52)

    if (side === 1) rightKnee = knee.clone()

    g.add(jumpingFemur(hip, knee, mat))
    g.add(jumpingTibia(knee, ankle, mat, spineMat))

    const tarsusSections: Section[] = [0, 0.5, 1].map((t) => ({
      at: new THREE.Vector3().lerpVectors(ankle, tip, t),
      ry: THREE.MathUtils.lerp(0.02, 0.007, t),
      rz: THREE.MathUtils.lerp(0.02, 0.007, t),
    }))
    g.add(new THREE.Mesh(loft(tarsusSections, 8), mat))

    const maxR = femurLen / 4.3
    for (const [p, r] of [
      [hip, maxR * 0.34 * 1.15],
      [knee, maxR * 0.24 * 1.2],
      [ankle, 0.026],
    ] as const) {
      const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat)
      j.position.copy(p)
      g.add(j)
    }
  }
  return { group: g, rightKnee }
}

/** 侧扁如刀的产卵器：基部快速撑到全宽、中段保持刀刃宽度、末 25% 收尖，全程极薄且向上方轻弧。 */
function ovipositorBlade(base: THREE.Vector3, length: number, material: THREE.Material): THREE.Mesh {
  const steps = 16
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    let widthFrac = 1
    if (t < 0.12) widthFrac = t / 0.12
    else if (t > 0.72) widthFrac = Math.max(0, 1 - (t - 0.72) / 0.28)
    const rise = Math.sin(t * Math.PI * 0.5) * length * 0.16
    const p = base.clone().add(new THREE.Vector3(-length * t, rise, 0))
    const ry = Math.max(0.1 * widthFrac, 0.003)
    const rz = Math.max(THREE.MathUtils.lerp(0.026, 0.006, t), 0.0025)
    sections.push({ at: p, ry, rz })
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'ovipositor-blade'
  return mesh
}

// ---------------------------------------------------------------- 主体

/** 触角着生点与长度：导出供测试精确复算"触角总长 / 体长"比例，避免与建模数值脱节。 */
export const ANTENNA_BASE: [number, number, number] = [2.36, 0.34, 0.075]
export const ANTENNA_LENGTH = 5.95
/** 跳跃后足髋（基节）着生点：导出供测试从真实几何体量取股节最粗处直径。 */
export const HIND_HIP_BASE: [number, number, number] = [0.72, -0.04, 0.36]

export function buildKatydid(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#5a9c3e', gloss: 0.4, clearcoat: 0.16 }) // 通体草绿
  const darkAccentMat = chitin({ color: '#33501f', gloss: 0.42 }) // 刺、听器边缘
  const legMat = chitin({ color: '#68a748', gloss: 0.38 })
  const spineMat = chitin({ color: '#2c4519', gloss: 0.5 })
  const wingMat = chitin({ color: '#6fae4a', gloss: 0.5, clearcoat: 0.22 }) // 叶片状前翅，略带光泽
  const veinMat = chitin({ color: '#3f7a2c', gloss: 0.32 })
  const tympanumMat = membrane('#e4ecc8', 0.55)
  const ovipositorMat = chitin({ color: '#8a6f34', gloss: 0.58, clearcoat: 0.3 }) // 剑状产卵器，褐色与体色形成对比
  const eyeColor = '#4a3018'

  // ---- 头部：圆钝，略高，容纳紧靠着生的一对长触角
  const head = new THREE.Mesh(
    spindle([1.72, 0.16, 0], [2.32, 0.2, 0], 0.3, { bulge: 0.42, flat: 0.96, taperStart: 0.3, taperEnd: 0.55 }),
    bodyMat,
  )
  head.name = 'katydid-body-core' // 与胸/腹一起构成测试用的"体长"量取范围（不含产卵器/触角/翅/腿）
  g.add(head)

  // ---- 前胸背板：马鞍形短杆，连接头与中后胸
  const pFront = new THREE.Vector3(1.72, 0.2, 0)
  const pBack = new THREE.Vector3(1.12, 0.16, 0)
  const pronotumSections: Section[] = []
  const pSteps = 14
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps
    const p = new THREE.Vector3().lerpVectors(pFront, pBack, t)
    const saddle = 1 - 0.22 * Math.sin(t * Math.PI)
    const taper = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1
    const r = 0.3 * saddle * Math.max(0.35, taper)
    pronotumSections.push({ at: p, ry: r * 0.85, rz: r * 1.15 })
  }
  const pronotumMesh = new THREE.Mesh(loft(pronotumSections, 18), bodyMat)
  pronotumMesh.name = 'katydid-body-core'
  g.add(pronotumMesh)

  // ---- 中后胸连接段
  const mesothoraxMesh = new THREE.Mesh(spindle([0.82, 0.14, 0], [1.12, 0.17, 0], 0.28, { bulge: 0.5, flat: 1.0 }), bodyMat)
  mesothoraxMesh.name = 'katydid-body-core'
  g.add(mesothoraxMesh)

  // ---- 腹部：分节，前粗后细，尾端接产卵器
  const abdomenTipX = -1.55
  const katydidAbdomenOpts: SegmentedAbdomenOptions = {
    from: [0.82, 0.06, 0],
    to: [abdomenTipX, 0.1, 0],
    r0: 0.42,
    r1: 0.11,
    segments: 8,
    groove: 0.14,
    flat: 1.02,
    bulge: 0.14,
  }
  const abdomenMesh = new THREE.Mesh(
    segmentedAbdomen(katydidAbdomenOpts),
    bodyMat,
  )
  abdomenMesh.add(...segmentedAbdomenMembranes(katydidAbdomenOpts))
  abdomenMesh.name = 'katydid-body-core'
  g.add(abdomenMesh)

  // ---- 产卵器：向后伸出，长度约体长 25%（体长约 3.85，取 1.05）
  const ovipositorBase = new THREE.Vector3(abdomenTipX + 0.08, 0.06, 0)
  const ovipositorLen = 1.05
  g.add(ovipositorBlade(ovipositorBase, ovipositorLen, ovipositorMat))
  const ovipositorTip = ovipositorBase
    .clone()
    .add(new THREE.Vector3(-ovipositorLen, Math.sin(Math.PI * 0.5) * ovipositorLen * 0.16, 0))

  // ---- 复眼
  const eyeAt: [number, number, number] = [2.14, 0.26, 0.26]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.155, color: eyeColor, flatten: 0.86, stretch: 1.08, facets: true }))

  // ---- 触角：超长丝状，紧靠着生于两复眼之间的头顶，长度取体长(≈3.85)的约 1.55 倍
  const antennaGroup = antennaPair(
    { base: ANTENNA_BASE, length: ANTENNA_LENGTH, kind: 'filiform', pitch: 16, yaw: 18, thickness: 0.011 },
    bodyMat,
  )
  antennaGroup.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'antenna-strand'
  })
  g.add(antennaGroup)

  // ---- 前足：带听器（tympanum）。用 leg() 单侧构建以取得真实 knee 坐标，
  // 挂上听器薄膜后再整体镜像，保证听器随左右腿精确对称。
  const foreSpec: LegSpec = { base: [1.62, -0.1, 0.26], femur: 0.56, tibia: 0.62, thickness: 0.038, splay: 26, sweep: -22, knee: 62 }
  const foreLegRight = leg(foreSpec, legMat)
  const kneePt = foreLegRight.userData.knee as THREE.Vector3
  const tipPt = foreLegRight.userData.tip as THREE.Vector3
  const tibiaAxis = new THREE.Vector3().subVectors(tipPt, kneePt).normalize()
  const outward = new THREE.Vector3(0.12, 0.05, 1).normalize()
  const tympPos = kneePt.clone().addScaledVector(tibiaAxis, (foreSpec.tibia ?? 0.6) * 0.16).addScaledVector(outward, 0.07)
  const tymp = new THREE.Mesh(new THREE.SphereGeometry(0.062, 14, 10), tympanumMat)
  tymp.scale.set(0.85, 0.22, 0.72)
  tymp.position.copy(tympPos)
  tymp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), outward)
  foreLegRight.add(tymp)
  // 听器边缘一圈细环，强化"凹陷薄膜"的可读性
  const tympRing = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.006, 6, 16), darkAccentMat)
  tympRing.scale.set(0.85, 0.72, 1)
  tympRing.position.copy(tympPos)
  tympRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward)
  foreLegRight.add(tympRing)
  g.add(mirrorZ(foreLegRight))

  // ---- 中足：常规步行比例
  g.add(
    legPair({ base: [1.2, -0.12, 0.32], femur: 0.62, tibia: 0.68, splay: 28, sweep: 8, knee: 66, thickness: 0.042 }, legMat),
  )

  // ---- 后足：跳跃腿，自建（见文件顶部说明）
  const { group: hindLegs, rightKnee } = hindLegPair(HIND_HIP_BASE, legMat, spineMat)
  g.add(hindLegs)

  // ---- 前翅（覆翅）：宽大叶片状，折叠贴背，翅脉清晰
  const tegmenOutline: [number, number][] = [
    [0, 0.28],
    [0.1, 0.72],
    [0.28, 0.96],
    [0.5, 1.0],
    [0.74, 0.88],
    [0.92, 0.56],
    [1, 0.16],
  ]
  const tegmenSpec: WingSpec = {
    base: [0.95, 0.3, 0.22],
    length: 3.55,
    width: 1.35,
    outline: tegmenOutline,
    spread: -108,
    tilt: 9,
    sweep: 0,
  }
  g.add(tegmenWing(tegmenSpec, wingMat, veinMat, 1), tegmenWing(tegmenSpec, wingMat, veinMat, -1))

  const anchors: Record<string, THREE.Vector3> = {
    antenna: new THREE.Vector3(ANTENNA_BASE[0] + 0.3, ANTENNA_BASE[1] + 0.1, ANTENNA_BASE[2] + 0.05),
    wing: new THREE.Vector3(-0.35, 0.68, 0.56),
    hindleg: rightKnee,
    ovipositor: ovipositorTip,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + 0.155),
    tympanum: tympPos,
  }

  return finalize(g, anchors)
}
