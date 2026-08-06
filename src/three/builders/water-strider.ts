/**
 * 水黾 Aquarius elongatus
 *
 * 造型要点：
 * - 三对足功能完全分化，是全部造型重点：前足极短用于捕食抓握；中足
 *   极长（约体长 2 倍）向侧后方几乎水平划出，是划水的桨；后足略短于
 *   中足、向后方伸展作舵。kit.leg() 的 knee/ankle 角给得很小时腿会
 *   近乎一条直线延伸，正好用来表现"浮在水面、几乎不向下撑"的姿态——
 *   femur/tibia/splay/sweep 的取值经过手算校验，确认中足株型偏移里
 *   z（侧向）分量占比 > 90%，y（垂直）分量很小。
 * - 中后足跗节末端有一簇疏水毛，承托表面张力，是水黾能立于水面的
 *   关键结构，在 kit.leg() 返回的 tip 处另加一圈细毛。
 * - 细长梭形身体，深褐到黑色，背中线加一条银灰色绒毛感窄条。
 * - 刺吸式口器直接用 kit.rostrum()。
 * - 本种没有 wing anchor：水黾多数个体翅退化或短翅，静止时并不构成
 *   可辨认的独立特征，因此不建可视翅面，符合题目给定的 6 个 anchor。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  mirrorZ,
  rostrum,
  segmentedAbdomen,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/**
 * 疏水毛簇：在腿的跗节尖端加一圈细而短的发散刚毛，模拟承托表面张力的
 * 憎水毛垫。方向沿"腿轴延长线 + 侧向散开"混合，让毛簇明显超出腿尖，
 * 而不是缩在腿的轮廓之内看不见。
 */
function hydrophobicTuft(legGroup: THREE.Group, material: THREE.Material, count = 6): void {
  const knee = legGroup.userData.knee as THREE.Vector3 | undefined
  const tip = legGroup.userData.tip as THREE.Vector3 | undefined
  if (!knee || !tip) return
  const axis = new THREE.Vector3().subVectors(tip, knee).normalize()
  const upHint = Math.abs(axis.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
  const side = new THREE.Vector3().crossVectors(axis, upHint).normalize()
  const normal = new THREE.Vector3().crossVectors(side, axis).normalize()
  for (let i = 0; i < count; i++) {
    const a = (i / (count - 1)) * 2 - 1 // -1..1
    const dir = axis
      .clone()
      .multiplyScalar(0.62)
      .addScaledVector(side, a * 0.5)
      .addScaledVector(normal, 0.25 + Math.abs(a) * 0.15)
      .normalize()
    const hairTip = tip.clone().addScaledVector(dir, 0.09)
    const hair = new THREE.Mesh(
      loft([{ at: tip, ry: 0.006, rz: 0.006 }, { at: hairTip, ry: 0.0008, rz: 0.0008 }], 5),
      material,
    )
    hair.name = 'hydrophobic-hair'
    legGroup.add(hair)
  }
}

// ---------------------------------------------------------------- 主体

export const ABDOMEN_TIP_X = -0.62

export const MID_BASE: [number, number, number] = [0.35, -0.05, 0.1]
export const FORE_BASE: [number, number, number] = [0.85, -0.05, 0.08]
export const HIND_BASE: [number, number, number] = [-0.15, -0.05, 0.09]

export const MID_SPEC: LegSpec = {
  base: MID_BASE,
  femur: 1.4,
  tibia: 1.3,
  tarsus: 0.5,
  thickness: 0.024,
  splay: 18,
  sweep: 15,
  knee: 12,
  ankle: 10,
}
export const FORE_SPEC: LegSpec = {
  base: FORE_BASE,
  femur: 0.44,
  tibia: 0.4,
  tarsus: 0.18,
  thickness: 0.026,
  splay: 30,
  sweep: -48,
  knee: 76,
  ankle: 50,
}
export const HIND_SPEC: LegSpec = {
  base: HIND_BASE,
  femur: 1.25,
  tibia: 1.15,
  tarsus: 0.45,
  thickness: 0.022,
  splay: 16,
  sweep: 46,
  knee: 15,
  ankle: 12,
}

export function buildWaterStrider(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#211a15', gloss: 0.22, clearcoat: 0.08 }) // 深褐近黑，低光泽
  const sheenMat = chitin({ color: '#9a978f', gloss: 0.14 }) // 背中线银灰绒毛感窄条
  const legMat = chitin({ color: '#2a2119', gloss: 0.2 })
  const hairMat = chitin({ color: '#c9c4b8', gloss: 0.1 })
  const eyeColor = '#151210'

  // ---- 头：小
  const headFrontX = 1.08
  const headBackX = 0.92
  const head = new THREE.Mesh(
    spindle([headFrontX, 0.02, 0], [headBackX, 0.02, 0], 0.09, { bulge: 0.5, taperStart: 0.6, taperEnd: 0.5 }),
    bodyMat,
  )
  head.name = 'body-core' // 与胸/腹一起构成测试用的"体长"量取范围（不含腿/触角/口器）
  g.add(head)

  // ---- 胸：细长纺锤体，三对足的着生处
  const thoraxFrom = new THREE.Vector3(headBackX, 0.0, 0)
  const thoraxTo = new THREE.Vector3(0.15, -0.01, 0)
  const thorax = new THREE.Mesh(
    spindle([thoraxFrom.x, thoraxFrom.y, thoraxFrom.z], [thoraxTo.x, thoraxTo.y, thoraxTo.z], 0.13, {
      bulge: 0.42,
      flat: 1.0,
      taperStart: 0.5,
      taperEnd: 0.6,
    }),
    bodyMat,
  )
  thorax.name = 'body-core'
  g.add(thorax)
  const thoraxCenter = new THREE.Vector3().lerpVectors(thoraxFrom, thoraxTo, 0.4)

  // ---- 腹：细长分节，收细但不收尖到 0
  const abdomenMesh = new THREE.Mesh(
    segmentedAbdomen({
      from: [0.15, -0.02, 0],
      to: [ABDOMEN_TIP_X, 0.0, 0],
      r0: 0.115,
      r1: 0.045,
      segments: 6,
      groove: 0.12,
      flat: 1.0,
      bulge: 0.1,
    }),
    bodyMat,
  )
  abdomenMesh.name = 'body-core'
  g.add(abdomenMesh)

  // ---- 背中线银灰绒毛感窄条：细长扁平的一条薄片贴在背脊
  const sheenSections: Section[] = []
  const sheenSteps = 20
  for (let i = 0; i <= sheenSteps; i++) {
    const t = i / sheenSteps
    const x = THREE.MathUtils.lerp(headFrontX - 0.05, -0.55, t)
    const r = 0.045 * (1 - Math.pow(t - 0.4, 2) * 0.8)
    sheenSections.push({ at: new THREE.Vector3(x, 0.04, 0), ry: Math.max(r * 0.25, 0.004), rz: Math.max(r, 0.004) })
  }
  g.add(new THREE.Mesh(loft(sheenSections, 10), sheenMat))

  // ---- 复眼
  const eyeAt: [number, number, number] = [1.0, 0.03, 0.1]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.075, color: eyeColor, flatten: 0.85, facets: true }))

  // ---- 触角：细短丝状
  const antBase: [number, number, number] = [1.1, 0.02, 0.05]
  g.add(antennaPair({ base: antBase, length: 0.55, kind: 'filiform', pitch: 12, yaw: 30, thickness: 0.009 }, bodyMat))

  // ---- 刺吸式口器
  g.add(rostrum({ at: [1.05, -0.02, 0], length: 0.36, thickness: 0.016, angle: 55 }, bodyMat))

  // ---- 前足：极短，向前抓握，用于捕食
  const foreRight = leg(FORE_SPEC, legMat)
  g.add(mirrorZ(foreRight))

  // ---- 中足：极长，几乎水平向侧后方划出，是本种的造型核心
  const midRight = leg(MID_SPEC, legMat)
  hydrophobicTuft(midRight, hairMat, 7)
  g.add(mirrorZ(midRight))

  // ---- 后足：略短于中足，向后方伸展作舵
  const hindRight = leg(HIND_SPEC, legMat)
  hydrophobicTuft(hindRight, hairMat, 6)
  g.add(mirrorZ(hindRight))

  const anchors: Record<string, THREE.Vector3> = {
    midleg: (midRight.userData.tip as THREE.Vector3).clone(),
    foreleg: (foreRight.userData.tip as THREE.Vector3).clone(),
    hindleg: (hindRight.userData.tip as THREE.Vector3).clone(),
    body: thoraxCenter,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + 0.075),
    antenna: new THREE.Vector3(antBase[0] + 0.3, antBase[1] + 0.1, antBase[2] + 0.1),
  }

  return finalize(g, anchors)
}
