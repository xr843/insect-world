/**
 * 竹象 Cyrtotrachelus buquetii（鞘翅目·象甲科）
 *
 * 造型要点：
 * - 长喙（额喙）是象甲科最不会认错的特征，也是本种绝对主角：从头部
 *   向前下方伸出一根细长管状构造，长度可达躯干的一半左右，末端才是
 *   口器，整根略向下弯。kit 里没有现成的「前伸下弯的长喙」——
 *   kit.rostrum() 是刺吸式口器（蝉/蝽），角度公式固定指向后下方，
 *   语义不对，因此本文件自写 buildRostrum()：路径按 t² 项下弯，
 *   命名 mesh 为 'rostrum' 供测试量取真实跨度。
 * - 膝状触角着生在喙的中段（不是头上）：柄节长、折角明显，末端再
 *   膨大成棒形端锤。kit.antenna({kind:'geniculate'}) 只画折线主干、
 *   不加端锤（那是 lamellate 分支的专利，而且 lamellate 的扇叶片
 *   是金龟总科的样子，不是象甲这种紧凑棒锤），因此复刻 stag-beetle.ts
 *   的思路：照抄 kit 内部 geniculate 分支的肘点/末段方向公式算出
 *   触角尖，贴 3 颗定向椭球拼成棒锤。
 * - 体形梨形/卵圆，前胸背板向前收窄，鞘翅宽阔隆起；体色橙黄到
 *   红褐带黑斑，六足较长，胫节末端加一枚小钩（攀竹用）。
 */
import * as THREE from 'three'
import {
  antenna,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  leg,
  loft,
  spindle,
  type AntennaSpec,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/**
 * 长喙：从头部前缘向前下方伸出的细长管状构造，沿路径按 t² 项下弯
 * （越靠近末端弯得越明显，符合真实象甲喙「基部较直、端部略垂」的
 * 观感），末端略收细为口器。命名为 'rostrum'，供测试量取真实渲染
 * 出来的 X 向跨度。
 */
function buildRostrum(base: THREE.Vector3, length: number, thickness: number, droop: number, material: THREE.Material): THREE.Mesh {
  const steps = 20
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(new THREE.Vector3(base.x + length * t, base.y - droop * length * t * t, base.z))
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = thickness * (1 - t * 0.5)
    return { at: p, ry: r, rz: r }
  })
  const mesh = new THREE.Mesh(loft(sections, 14), material)
  mesh.name = 'rostrum'
  return mesh
}

/**
 * 膝状触角 + 棒状端锤。主干直接复用 kit.antenna({kind:'geniculate'})；
 * 端锤位置需要肘点/末段方向，kit 内部算完就丢了，因此这里照抄
 * kit.ts 里 geniculate 分支的公式重新推一遍（仅用于定位端锤球，
 * 与主干网格严丝合缝）。象甲的端锤是紧凑的卵形棒锤，不是金龟总科
 * lamellate 那种摊开的扁平扇叶，因此用较接近球形的缩放、并用
 * quaternion 让椭球长轴对齐触角末段方向（同 tiger-beetle.ts
 * surfaceSpot() 的定向手法），而不是简单摆成扁片。
 * 所有生成的 mesh 统一命名为 'antenna'，供测试用真实包围盒
 * 的 min.x 当「触角基部」的代理（触角从基部单调向 +X 伸展，
 * 详见 buildWeevil 内的位置设计）。
 */
function clubbedAntenna(spec: AntennaSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const shaft = antenna(spec, material)
  shaft.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'antenna'
  })
  g.add(shaft)

  const pitch = THREE.MathUtils.degToRad(spec.pitch ?? 32)
  const yaw = THREE.MathUtils.degToRad(spec.yaw ?? 22)
  const base = new THREE.Vector3(...spec.base)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  const elbow = base.clone().addScaledVector(dir, spec.length * 0.45)
  const dir2 = new THREE.Vector3(Math.cos(yaw * 1.8), -0.18, Math.sin(yaw * 1.8)).normalize()
  const tip = elbow.clone().addScaledVector(dir2, spec.length * 0.55)

  for (let i = 0; i < 3; i++) {
    const club = new THREE.Mesh(new THREE.SphereGeometry(spec.length * 0.1, 12, 10), material)
    club.scale.set(1.3, 0.72, 0.72)
    club.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir2)
    club.position.copy(tip).addScaledVector(dir2, i * spec.length * 0.075)
    club.name = 'antenna'
    g.add(club)
  }
  return g
}

function clubbedAntennaPair(spec: AntennaSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(clubbedAntenna(spec, material))
  g.add(clubbedAntenna({ ...spec, base: [spec.base[0], spec.base[1], -spec.base[2]], yaw: -(spec.yaw ?? 22) }, material))
  return g
}

/** 胫节末端小钩：攀竹用。直接读 kit.leg() 暴露的 tip/knee 算方向，接一段弯尖。 */
function legPairWithClaw(spec: LegSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const right = leg(spec, material)
  const tip = right.userData.tip as THREE.Vector3
  const knee = right.userData.knee as THREE.Vector3
  const dir = new THREE.Vector3().subVectors(tip, knee).normalize()
  const th = spec.thickness ?? 0.05
  const hookLen = th * 3.4
  const steps = 6
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(tip.clone().addScaledVector(dir, hookLen * t * 0.55).add(new THREE.Vector3(0, -hookLen * t * t * 1.3, 0)))
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = th * 0.42 * (1 - t * 0.85)
    return { at: p, ry: r, rz: r }
  })
  right.add(new THREE.Mesh(loft(sections, 8), material))
  g.add(right)
  const left = right.clone()
  left.scale.z = -1
  g.add(left)
  return g
}

// ---------------------------------------------------------------- 主体

export function buildWeevil(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#8a4a1c', gloss: 0.62, clearcoat: 0.4 })
  const shellMat = elytra('#c97a2b', 0.18)
  const patchMat = chitin({ color: '#231208', gloss: 0.5, clearcoat: 0.3 })
  const rostrumMat = chitin({ color: '#5c3212', gloss: 0.58, clearcoat: 0.35 })
  const legMat = chitin({ color: '#6b3818', gloss: 0.5, clearcoat: 0.28 })

  // ---- 腹面体躯：梨形基调，尾部略尖、前段渐宽
  const belly = new THREE.Mesh(
    spindle([-1.3, 0.0, 0], [0.55, 0.04, 0], 0.72, { bulge: 0.36, flat: 1.05, taperStart: 0.12, taperEnd: 0.45 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：宽阔隆起
  const eSteps = 22
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.55) * Math.PI * 0.9) * 0.78
    elytronSections.push({
      at: new THREE.Vector3(0.5 - 1.75 * t, 0.42 - 0.15 * t * t, 0),
      ry: Math.max(w * 0.62, 0.015),
      rz: Math.max(w * 0.5, 0.015),
    })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), shellMat)
    shell.position.z = side * 0.26
    shell.scale.set(1, 1.05, 1.02)
    shell.name = 'elytra'
    g.add(shell)
  }

  // 深色斑块：橙黄鞘翅上的黑斑
  for (const [ex, ey, ez, r] of [
    [-0.32, 0.5, 0.32, 0.15],
    [-0.95, 0.38, 0.24, 0.12],
  ] as const) {
    for (const side of [1, -1] as const) {
      const patch = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), patchMat)
      patch.scale.set(1, 0.35, 0.85)
      patch.position.set(ex, ey, ez * side)
      g.add(patch)
    }
  }

  // ---- 小盾片
  const scutellum = new THREE.Mesh(
    spindle([0.52, 0.56, 0], [0.24, 0.5, 0], 0.14, { bulge: 0.15, flat: 1.3, taperStart: 0.9, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：向前收窄
  const pronotum = new THREE.Mesh(
    spindle([0.45, 0.1, 0], [1.05, 0.16, 0], 0.5, { bulge: 0.4, flat: 1.0, taperStart: 0.7, taperEnd: 0.3 }),
    bodyMat,
  )
  pronotum.name = 'trunk'
  g.add(pronotum)

  // ---- 头部：小，喙才是前伸的主角
  const head = new THREE.Mesh(
    spindle([1.0, 0.14, 0], [1.26, 0.16, 0], 0.26, { bulge: 0.5, flat: 0.95, taperStart: 0.7, taperEnd: 0.55 }),
    bodyMat,
  )
  head.name = 'trunk'
  g.add(head)

  // ---- 复眼
  g.add(compoundEyePair({ at: [1.14, 0.2, 0.2], radius: 0.09, color: '#0a0806', flatten: 0.85, facets: true }))

  // ---- 长喙：base 紧贴头部前端，长度 1.55（trunk 全长≈2.58，
  // 喙 X 跨度/躯干长度 ≈0.6，远超题目要求的 0.25 阈值，
  // 视觉上也够「务必长而显眼」）
  const rostrumBase = new THREE.Vector3(1.26, 0.16, 0)
  const rostrumLength = 1.55
  const rostrumDroop = 0.22
  g.add(buildRostrum(rostrumBase, rostrumLength, 0.1, rostrumDroop, rostrumMat))

  // ---- 膝状触角：着生在喙的中段（t=0.5 处），而非头部
  const antennaBase = new THREE.Vector3(
    rostrumBase.x + rostrumLength * 0.5,
    rostrumBase.y - rostrumDroop * rostrumLength * 0.25,
    0.075,
  )
  g.add(
    clubbedAntennaPair(
      { base: [antennaBase.x, antennaBase.y, antennaBase.z], length: 0.5, kind: 'geniculate', pitch: 24, yaw: 40, thickness: 0.032 },
      legMat,
    ),
  )

  // ---- 三对较长的足，跗节末端带攀附小钩
  const legSpecs: LegSpec[] = [
    { base: [0.75, -0.08, 0.42], femur: 0.62, tibia: 0.68, tarsus: 0.22, thickness: 0.045, splay: 38, sweep: -34, knee: 66 },
    { base: [0.05, -0.12, 0.48], femur: 0.7, tibia: 0.78, tarsus: 0.24, thickness: 0.048, splay: 34, sweep: 6, knee: 70 },
    { base: [-0.65, -0.12, 0.44], femur: 0.76, tibia: 0.86, tarsus: 0.24, thickness: 0.05, splay: 32, sweep: 42, knee: 74 },
  ]
  const legRigs = legSpecs.map((spec) => legPairWithClaw(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    rostrum: new THREE.Vector3(rostrumBase.x + rostrumLength * 0.92, rostrumBase.y - rostrumDroop * rostrumLength * 0.85, 0),
    antenna: new THREE.Vector3(antennaBase.x + 0.15, antennaBase.y + 0.1, antennaBase.z + 0.35),
    elytra: new THREE.Vector3(-0.6, 0.65, 0.35),
    eye: new THREE.Vector3(1.14, 0.26, 0.26),
    leg: midLegTip.clone(),
    pronotum: new THREE.Vector3(0.75, 0.55, 0),
  }

  return finalize(g, anchors)
}
