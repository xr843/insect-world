/**
 * 日本蠼螋 Anisolabis maritima（革翅目 Dermaptera，本项目第一个该目物种）
 *
 * 造型要点：
 * - 革翅目的定义特征是腹末一对角质尾铗（cerci 特化成钳），必须做得
 *   粗壮醒目。forceps() 自写路径：向体后（-X）伸出的同时逐渐上翘、
 *   向中线内弯——不到交叉，读成张开的"钳"而不是两根直刺。
 * - 前翅（覆翅 tegmina）退化成很短的革质小片，只盖住腹部最前约
 *   1/4，其余腹节完全裸露——这与鞘翅目"鞘翅盖满全腹"是最直观的
 *   区别，因此鞘翅的 X 跨度被刻意钉死在腹长的一小截。
 * - 裸露的腹部要看得出分节：直接用 kit.segmentedAbdomen()（本模块
 *   为分节体设计，蜂/蚁/蜻蜓用过），groove 给得比那几种更深一些，
 *   因为革翅目腹节间的收缩本来就比膜翅目更显眼。
 * - 身体扁平：thorax/abdomen 的 flat 都 > 1（Y 方向压扁），这是
 *   潜伏缝隙的革翅目/隐翅虫类昆虫的共同体型。
 * - 体色深褐到近黑、有光泽，尾铗比躯干更深更亮（角质化程度更高）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  elytra,
  finalize,
  legPair,
  loft,
  segmentedAbdomen,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/**
 * 尾铗：向体后伸出的同时逐渐上翘、向中线内弯，末端不交叉（张开的钳形）。
 * 基部粗壮，向尖端加速收细。
 */
function forceps(base: THREE.Vector3, side: 1 | -1, length: number, thickness: number, material: THREE.Material): THREE.Mesh {
  const steps = 14
  const z0 = base.z
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const curl = Math.pow(t, 1.6)
    path.push(new THREE.Vector3(base.x - length * t * 0.92, base.y + length * 0.35 * curl, side * (z0 * (1 - curl * 0.55))))
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = thickness * (1 - t * 0.72)
    return { at: p, ry: r, rz: r * 0.85 }
  })
  const mesh = new THREE.Mesh(loft(sections, 12), material)
  mesh.name = 'forceps'
  return mesh
}

export function buildEarwig(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#2a1c14', gloss: 0.68, metal: 0.12, clearcoat: 0.4 })
  const elytraMat = elytra('#241812', 0.1)
  const forcepsMat = chitin({ color: '#170e09', gloss: 0.76, metal: 0.2, clearcoat: 0.46 })
  const legMat = chitin({ color: '#231610', gloss: 0.55, metal: 0.1, clearcoat: 0.35 })

  // ---- 腹部：分节清晰可见（未被鞘翅覆盖的部分正是本种与甲虫最直观的区别）
  const abdomenMesh = new THREE.Mesh(
    segmentedAbdomen({ from: [0.3, 0.0, 0], to: [-1.05, -0.02, 0], r0: 0.2, r1: 0.185, segments: 8, groove: 0.24, flat: 1.4, bulge: 0.15 }),
    bodyMat,
  )
  abdomenMesh.name = 'abdomen'
  g.add(abdomenMesh)

  // ---- 尾铗：一对，粗壮、上翘、内弯，长度约体长的 15%
  g.add(forceps(new THREE.Vector3(-1.05, 0.02, 0.08), 1, 0.375, 0.075, forcepsMat))
  g.add(forceps(new THREE.Vector3(-1.05, 0.02, 0.08), -1, 0.375, 0.075, forcepsMat))

  // ---- 前翅（覆翅）：极短，只盖住腹部最前约 1/4，扁平低矮（不是甲虫那种高隆鞘翅）
  const eSteps = 10
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.5) * Math.PI * 0.85) * 0.17
    elytronSections.push({ at: new THREE.Vector3(0.3 - 0.34 * t, 0.1 - 0.02 * t, 0), ry: Math.max(w * 0.5, 0.01), rz: Math.max(w * 0.62, 0.01) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 16), elytraMat)
    shell.position.z = side * 0.13
    shell.name = 'elytra'
    g.add(shell)
  }

  // ---- 胸部：扁平，比头部略窄，光滑过渡到腹部
  const thorax = new THREE.Mesh(
    spindle([0.35, 0.0, 0], [0.85, 0.02, 0], 0.19, { bulge: 0.4, flat: 1.35, taperStart: 0.55, taperEnd: 0.72 }),
    bodyMat,
  )
  g.add(thorax)

  // ---- 头部：扁平，略宽于胸部前缘
  const head = new THREE.Mesh(
    spindle([0.85, 0.02, 0], [1.15, 0.03, 0], 0.16, { bulge: 0.45, flat: 1.3, taperStart: 0.7, taperEnd: 0.5 }),
    bodyMat,
  )
  g.add(head)

  // ---- 简单的小型复眼（革翅目复眼不大，不作为 anchor 强调）
  for (const side of [1, -1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), forcepsMat)
    eye.scale.set(1, 0.85, 0.7)
    eye.position.set(1.02, 0.06, side * 0.13)
    g.add(eye)
  }

  // ---- 丝状触角，中等长度
  g.add(antennaPair({ base: [1.1, 0.05, 0.1], length: 0.55, kind: 'filiform', pitch: 20, yaw: 30, thickness: 0.018 }, legMat))

  // ---- 三对低矮的一般型足
  const legSpecs: LegSpec[] = [
    { base: [0.5, -0.1, 0.2], femur: 0.32, tibia: 0.3, tarsus: 0.14, thickness: 0.02, splay: 40, sweep: -30, knee: 58 },
    { base: [0.05, -0.11, 0.21], femur: 0.34, tibia: 0.32, tarsus: 0.15, thickness: 0.021, splay: 38, sweep: 4, knee: 60 },
    { base: [-0.45, -0.11, 0.2], femur: 0.33, tibia: 0.31, tarsus: 0.15, thickness: 0.021, splay: 42, sweep: 38, knee: 62 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    forceps: new THREE.Vector3(-1.38, 0.16, 0.04),
    elytra: new THREE.Vector3(0.15, 0.14, 0.16),
    antenna: new THREE.Vector3(1.55, 0.25, 0.35),
    head: new THREE.Vector3(1.0, 0.08, 0),
    abdomen: new THREE.Vector3(-0.35, 0.1, 0.22),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
