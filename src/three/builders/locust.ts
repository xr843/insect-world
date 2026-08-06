/**
 * 东亚飞蝗 Locusta migratoria
 *
 * 造型要点：
 * - 后足跳跃腿是直翅目的灵魂：腿节(股节)内藏跳跃肌，呈粗大纺锤形
 *   （最粗处直径约为腿节长的 1/3），表面有人字形加固棱纹；胫节细长，
 *   外缘两列刺（每列 8~11 枚）；整条腿在膝关节处反折成 Z/Λ 字形。
 *   kit.leg() 的比例是为普通步行足设计的，做不出这种极端粗细对比，
 *   所以这里直接用 loft() 从零手搭一条腿（沿用 kit.leg() 内部"分段+球
 *   关节"的构造思路，但几何全部自定义）。
 * - 前胸背板呈"马鞍形"：中段收窄下凹、前后端略高，中央有一条纵脊。
 * - 前翅（覆翅）狭长革质、不透明，盖在膜质后翅之上；后翅扇形展开、
 *   半透明，翅脉像折扇一样放射——这天然贴合 kit.wingVeins() 的放射
 *   翅脉设计。
 * - 头部圆柱形、复眼位于两侧，咀嚼式大颚，触角丝状。
 * - 腹部第一节侧面有听器（鼓膜听器），做成一片圆形薄膜凹片。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  mandibles,
  membrane,
  segmentedAbdomen,
  spindle,
  wingPair,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 跳跃腿自建部件

/** 三次平滑阶跃，用于股节两端"收细但不收尖"的过渡包络 */
function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 跳跃腿腿节(股节)：纺锤形，最粗处直径 ≈ 全长/2.6（半径 = 全长/5.2）——
 * 明显超过"≥ 全长 1/3"的下限，一眼就看出里面是跳跃肌；表面加一圈圈
 * 人字纹模拟几丁质加固棱。
 *
 * 旧版用纯 sin 鼓包（k = t/0.38 或 (1-t)/0.34），两端都收到接近 0——
 * 这会让腿节在贴近基节/膝关节的地方骤然收细成一个"点"，视觉上读成
 * "细腿中间鼓了一小坨"而不是"整根粗壮的股节"。改用宽平台包络：
 * 28%~74% 之间保持在最大半径（真实蝗虫股节的肌肉腹几乎占满全长），
 * 只在两端各 1/4 左右平滑收细到 0.34×/0.24×maxR，收细后仍与基节/
 * 膝关节球体粗细相当，不会出现"细腰"断层。
 */
function jumpingFemur(hip: THREE.Vector3, knee: THREE.Vector3, mat: THREE.Material, chevronMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const len = hip.distanceTo(knee)
  const maxR = len / 5.2 // 直径 ≈ len/2.6，明显粗于"≥ len/3"的下限
  const steps = 20
  const path: THREE.Vector3[] = []
  const sections: Section[] = []
  const startK = 0.34
  const endK = 0.24
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = new THREE.Vector3().lerpVectors(hip, knee, t)
    path.push(p)
    // 宽平台包络：28%~74% 恒为 maxR，两端各用 smoothstep 平滑过渡，
    // 而不是收尖到 0——这样腿节看起来"整根都粗"，不是"中间鼓一坨"。
    let k: number
    if (t < 0.28) k = startK + (1 - startK) * smoothstep01(t / 0.28)
    else if (t > 0.74) k = 1 - (1 - endK) * smoothstep01((t - 0.74) / 0.26)
    else k = 1
    const r = maxR * k
    sections.push({ at: p, ry: Math.max(r, 0.008), rz: Math.max(r * 0.88, 0.008) })
  }
  const femurMesh = new THREE.Mesh(loft(sections, 16), mat)
  femurMesh.name = 'jumping-femur' // 供测试直接从真实几何体量取最粗处半径，不止是重算公式
  g.add(femurMesh)

  // 人字纹：沿长轴每隔一段画一对斜向短棱，左右交叉成"人"字
  const axis = new THREE.Vector3().subVectors(knee, hip).normalize()
  const upHint = Math.abs(axis.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3().crossVectors(axis, upHint).normalize()
  const normal = new THREE.Vector3().crossVectors(side, axis).normalize()
  const chevronCount = 7
  for (let i = 1; i < chevronCount; i++) {
    const t = i / chevronCount
    if (t < 0.12 || t > 0.86) continue
    const idx = Math.round(t * steps)
    const center = path[idx]
    const localR = sections[idx].ry
    for (const s of [1, -1] as const) {
      const a = center.clone().addScaledVector(normal, localR * 0.94)
      const b = a.clone().addScaledVector(axis, -len * 0.05).addScaledVector(side, s * len * 0.055)
      g.add(new THREE.Mesh(loft([{ at: a, ry: 0.012, rz: 0.012 }, { at: b, ry: 0.004, rz: 0.004 }], 5), chevronMat))
    }
  }
  return g
}

/** 跳跃腿胫节：细长渐收，外缘两列刺（每列 8~11 枚），是蝗总科最易辨认的细节 */
function jumpingTibia(
  knee: THREE.Vector3,
  ankle: THREE.Vector3,
  mat: THREE.Material,
  spineMat: THREE.Material,
  spinesPerRow = 9,
): THREE.Group {
  const g = new THREE.Group()
  const steps = 16
  const path: THREE.Vector3[] = []
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = new THREE.Vector3().lerpVectors(knee, ankle, t)
    path.push(p)
    const r = THREE.MathUtils.lerp(0.05, 0.024, t)
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
      const r = THREE.MathUtils.lerp(0.05, 0.024, t)
      const base = p.clone().addScaledVector(normal, r * 0.85).addScaledVector(side, rowSign * r * 0.5)
      const tip = base.clone().addScaledVector(normal, 0.085).addScaledVector(axis, -0.045)
      g.add(new THREE.Mesh(loft([{ at: base, ry: 0.011, rz: 0.011 }, { at: tip, ry: 0.0015, rz: 0.0015 }], 5), spineMat))
    }
  }
  return g
}

/** 组装一对完整的跳跃后足：髋(基节)→股节→胫节→跗节，膝部反折成 Λ/Z 形 */
function hindLegPair(
  hipBase: [number, number, number],
  mat: THREE.Material,
  spineMat: THREE.Material,
): { group: THREE.Group; rightKnee: THREE.Vector3 } {
  const g = new THREE.Group()
  let rightKnee = new THREE.Vector3()
  for (const side of [1, -1] as const) {
    const hip = new THREE.Vector3(hipBase[0], hipBase[1], hipBase[2] * side)
    // 股节：向后上方大幅抬起，贴着腹部侧面——Λ 形的第一笔
    const femurDir = new THREE.Vector3(-0.82, 0.46, side * 0.15).normalize()
    const femurLen = 2.05
    const knee = hip.clone().addScaledVector(femurDir, femurLen)
    // 胫节：在膝部反折向前下方——Λ 形的第二笔，形成标志性折叠跳跃腿。
    // 旧版 femurDir/tibiaDir 接近反向（夹角约 155°），折叠后内夹角只有
    // ~25°，胫节几乎贴着股节折回去，从外观上更像一条整体弯曲的细线，
    // 而不是清晰可辨的"Λ"。现在把胫节方向改得更接近竖直向下，两段
    // 夹角撑开到约 53°，折角在视觉上一眼可辨。
    const tibiaDir = new THREE.Vector3(0.12, -0.97, side * -0.12).normalize()
    const ankle = knee.clone().addScaledVector(tibiaDir, 2.2)
    const tarsusDir = new THREE.Vector3(0.55, -0.4, side * -0.05).normalize()
    const tip = ankle.clone().addScaledVector(tarsusDir, 0.5)

    if (side === 1) rightKnee = knee.clone()

    g.add(jumpingFemur(hip, knee, mat, spineMat))
    g.add(jumpingTibia(knee, ankle, mat, spineMat))

    const tarsusSections: Section[] = [0, 0.5, 1].map((t) => ({
      at: new THREE.Vector3().lerpVectors(ankle, tip, t),
      ry: THREE.MathUtils.lerp(0.022, 0.007, t),
      rz: THREE.MathUtils.lerp(0.022, 0.007, t),
    }))
    g.add(new THREE.Mesh(loft(tarsusSections, 8), mat))

    // 关节球半径跟随股节新的粗细常量算，避免"球比腿还细"的断层——
    // 髋球比股节起点(0.34×maxR)略粗、膝球比股节末端(0.24×maxR)略粗，
    // 让粗壮的股节与两端球窝平滑衔接。
    const maxR = femurLen / 5.2
    for (const [p, r] of [
      [hip, maxR * 0.34 * 1.15],
      [knee, maxR * 0.24 * 1.2],
      [ankle, 0.03],
    ] as const) {
      const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat)
      j.position.copy(p)
      g.add(j)
    }
  }
  return { group: g, rightKnee }
}

// ---------------------------------------------------------------- 主体

export function buildLocust(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#6a7a3d', gloss: 0.4, clearcoat: 0.15 }) // 黄绿褐保护色
  const darkAccentMat = chitin({ color: '#33301a', gloss: 0.5 }) // 纵脊/人字纹/刺——深色勾边
  const legMat = chitin({ color: '#7c6a37', gloss: 0.38 })
  const spineMat = chitin({ color: '#241d10', gloss: 0.6 })
  const tegmenMat = chitin({ color: '#5b6b34', gloss: 0.34, clearcoat: 0.12 }) // 革质前翅：不透明、低光泽
  const hindWingVeinMat = chitin({ color: '#4a5326', gloss: 0.4 })
  const tympanumMat = membrane('#cdbd8c', 0.55)
  const eyeColor = '#2b2415'

  // ---- 头部：圆柱形，略呈垂直拉长（flat<1）符合蝗虫下口式头部侧影
  const head = new THREE.Mesh(
    spindle([1.55, 0.05, 0], [2.35, 0.08, 0], 0.26, { bulge: 0.4, flat: 0.92, taperStart: 0.3, taperEnd: 0.6 }),
    bodyMat,
  )
  head.name = 'head-capsule'
  g.add(head)

  // ---- 前胸背板：马鞍形——中段收窄下凹、前后略高，中央一条纵脊
  const pFront = new THREE.Vector3(1.55, 0.14, 0)
  const pBack = new THREE.Vector3(0.92, 0.1, 0)
  const pronotumSections: Section[] = []
  const pSteps = 18
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps
    const p = new THREE.Vector3().lerpVectors(pFront, pBack, t)
    // 马鞍轮廓：sin 在中点(t=0.5)取峰值 → 中段半径最小，两端最大
    const saddle = 1 - 0.26 * Math.sin(t * Math.PI)
    const taper = t < 0.08 ? t / 0.08 : t > 0.92 ? (1 - t) / 0.08 : 1
    const r = 0.34 * saddle * Math.max(0.3, taper)
    pronotumSections.push({ at: p, ry: r * 0.82, rz: r * 1.2 })
  }
  const pronotumMesh = new THREE.Mesh(loft(pronotumSections, 20), bodyMat)
  pronotumMesh.name = 'pronotum-saddle'
  g.add(pronotumMesh)
  // 纵脊：沿马鞍中线略微抬高的一条细棱
  const keelPts = pronotumSections.map((s) => (s.at as THREE.Vector3).clone().add(new THREE.Vector3(0, 0.05, 0)))
  g.add(
    new THREE.Mesh(
      loft(
        keelPts.map((p) => ({ at: p, ry: 0.02, rz: 0.02 })),
        6,
      ),
      darkAccentMat,
    ),
  )

  // ---- 中后胸连接段：短小，多半被鞍形前胸背板与折翅遮住
  g.add(new THREE.Mesh(spindle([0.72, 0.07, 0], [0.92, 0.1, 0], 0.3, { bulge: 0.5, flat: 1.0 }), bodyMat))

  // ---- 腹部：细长圆柱、多节，是直翅目区别于圆胖鞘翅目的体型标志
  g.add(
    new THREE.Mesh(
      segmentedAbdomen({
        from: [0.72, -0.02, 0],
        to: [-2.55, 0.06, 0],
        r0: 0.32,
        r1: 0.045,
        segments: 9,
        groove: 0.13,
        flat: 0.95,
        bulge: 0.12,
      }),
      bodyMat,
    ),
  )

  // ---- 听器（鼓膜）：腹部第一节侧面一片圆形薄膜凹陷
  for (const side of [1, -1]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16), tympanumMat)
    disc.rotation.z = Math.PI / 2
    disc.position.set(0.5, -0.02, side * 0.31)
    g.add(disc)
  }

  // ---- 咀嚼式大颚
  g.add(mandibles({ at: [2.24, -0.01, 0.1], length: 0.16, spread: 0.4, curve: 0.5 }, bodyMat))

  // ---- 复眼：位于头部两侧
  g.add(
    compoundEyePair({ at: [2.16, 0.14, 0.22], radius: 0.14, color: eyeColor, flatten: 0.85, stretch: 1.1, facets: true }),
  )

  // ---- 触角：丝状，中等长度
  g.add(
    antennaPair({ base: [2.3, 0.12, 0.1], length: 1.1, kind: 'filiform', pitch: 22, yaw: 26, thickness: 0.02 }, bodyMat),
  )

  // ---- 前后足：正常步行比例，用 kit.legPair 即可
  g.add(
    legPair({ base: [1.5, -0.1, 0.28], femur: 0.42, tibia: 0.42, splay: 30, sweep: -32, knee: 70, thickness: 0.045 }, legMat),
  )
  g.add(
    legPair({ base: [1.08, -0.12, 0.3], femur: 0.46, tibia: 0.48, splay: 30, sweep: 4, knee: 72, thickness: 0.048 }, legMat),
  )

  // ---- 后足跳跃腿：极端比例，自建几何（见文件顶部说明）
  const hindHip: [number, number, number] = [0.62, -0.06, 0.34]
  const { group: hindLegs, rightKnee } = hindLegPair(hindHip, legMat, spineMat)
  g.add(hindLegs)

  // ---- 前翅（覆翅）：狭长革质、不透明，收拢贴体盖住膜质后翅
  const tegmenOutline: [number, number][] = [
    [0, 0.35],
    [0.08, 0.75],
    [0.2, 0.95],
    [0.45, 1.0],
    [0.7, 0.9],
    [0.9, 0.6],
    [1, 0.14],
  ]
  const tegmenSpec: WingSpec = {
    base: [0.85, 0.22, 0.22],
    length: 2.9,
    width: 0.62,
    outline: tegmenOutline,
    spread: -110,
    tilt: 6, // 收拢时贴伏腹背，原 15° 翘得偏高，压低抬起角
    sweep: 0,
  }
  g.add(wingPair(tegmenSpec, tegmenMat, darkAccentMat, 5))

  // ---- 后翅：膜质、扇形展开，翅脉像折扇一样放射，藏在前翅之下
  const hindWingOutline: [number, number][] = [
    [0, 0.08],
    [0.15, 0.5],
    [0.35, 0.92],
    [0.6, 1.0],
    [0.85, 0.7],
    [1, 0.15],
  ]
  const hindWingSpec: WingSpec = {
    base: [0.78, 0.17, 0.16],
    length: 2.65,
    width: 1.5,
    outline: hindWingOutline,
    spread: -108,
    tilt: 8, // 同上，原 18° 偏高，压低使后翅更贴伏
    sweep: -8,
  }
  g.add(wingPair(hindWingSpec, membrane('#dce8c8', 0.28), hindWingVeinMat, 8))

  const anchors: Record<string, THREE.Vector3> = {
    hindleg: rightKnee,
    wing: new THREE.Vector3(-0.4, 0.55, 0.5),
    tympanum: new THREE.Vector3(0.5, -0.02, 0.45),
    eye: new THREE.Vector3(2.16, 0.16, 0.36),
    antenna: new THREE.Vector3(2.55, 0.28, 0.28),
    pronotum: new THREE.Vector3(1.25, 0.24, 0),
  }

  return finalize(g, anchors)
}
