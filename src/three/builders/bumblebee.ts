/**
 * 明亮熊蜂 Bombus lucorum
 *
 * 造型要点：
 * - 与西方蜜蜂（honeybee.ts）的分辨点就一句话：更圆、更毛。体长/体高
 *   压到 ≈2（蜜蜂约 2.6），全身材质走 velvet 绒面，胸+腹两层程序化
 *   绒毛合计 400+ 根（蜜蜂只有胸部 170 根），黑黄环带做得更宽、
 *   环沟更浅（groove 0.08），再让绒毛本身按环带换色——色界糊在毛里，
 *   这正是熊蜂环带「宽而糊」的来源。真实明亮熊蜂尾端为浅色带，
 *   本模型按「双色材质分段」的口径并入黄带材质，不另开第三色。
 * - 翅相对身体明显偏小（前翅约体长一半，蜜蜂约 0.5 但身体细长得多），
 *   这是「熊蜂按空气动力学不该会飞」都市传说的形态来源——讲解层要用，
 *   所以测试钉住 翅长 < 体长×0.75。翅膜虹彩取极轻档 0.25。
 * - 后足花粉篮（corbicula）：胫节外侧一片压扁的凹面 + 缘毛围栏 +
 *   一团压实的花粉球。做法沿 honeybee.ts 的 hindLegWithBasket 思路
 *   自写一份：右腿原坐标构建，篮/毛/球挂进同一 group 再整体镜像。
 * - 腹部为绒毛覆盖的膜翅目蜂腹，不挂节间膜环（节间被毛盖住，
 *   segmentedAbdomen 的默认膜位也用不上——腹部是自写双色分段）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  membrane,
  ocelli,
  spindle,
  wingPair,
  type InsectModel,
  type LegSpec,
  type Section,
  type WingSpec,
} from './kit'

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

// ---- 腹部包络（自写双色分段与腹部绒毛共用，保证毛贴在真实表面上）
const ABD_FROM = new THREE.Vector3(0.02, -0.06, 0)
const ABD_TO = new THREE.Vector3(-0.98, -0.12, 0)
const ABD_R0 = 0.46
const ABD_R1 = 0.14
const ABD_SEGS = 5

function abdRadius(t: number): number {
  return THREE.MathUtils.lerp(ABD_R0, ABD_R1, smoothstep01(t))
}

/** t（0..1 沿腹长）落在第几个环带：偶数段黄、奇数段黑。 */
function bandIndex(t: number): number {
  return Math.min(ABD_SEGS - 1, Math.floor(t * ABD_SEGS))
}

/**
 * 双色分段腹部：逐节独立放样交替上 velvet 材质。环沟刻意浅（0.08）——
 * 熊蜂的环带分界靠毛色渐糊，不靠深沟。
 */
function bandedAbdomen(matYellow: THREE.Material, matBlack: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const groove = 0.08
  for (let s = 0; s < ABD_SEGS; s++) {
    const t0 = s / ABD_SEGS
    const t1 = (s + 1) / ABD_SEGS
    const p0 = new THREE.Vector3().lerpVectors(ABD_FROM, ABD_TO, t0)
    const p1 = new THREE.Vector3().lerpVectors(ABD_FROM, ABD_TO, t1)
    const rStart = abdRadius(t0)
    const rBulge = abdRadius((t0 + t1) / 2) * 1.06
    const rEnd = abdRadius(t1) * (1 - groove)
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart, 1e-4), rz: Math.max(rStart, 1e-4) },
      { at: new THREE.Vector3().lerpVectors(p0, p1, 0.5), ry: Math.max(rBulge, 1e-4), rz: Math.max(rBulge, 1e-4) },
      { at: p1, ry: Math.max(rEnd, 1e-4), rz: Math.max(rEnd, 1e-4) },
    ]
    const mesh = new THREE.Mesh(loft(sections, 22), s % 2 === 0 ? matYellow : matBlack)
    mesh.name = 'bumblebee-abdomen-segment'
    g.add(mesh)
  }
  // 尾端圆帽：把最后一节收圆，不留平口
  const tail = new THREE.Mesh(
    loft(
      [
        { at: ABD_TO.clone(), ry: ABD_R1 * 0.92, rz: ABD_R1 * 0.92 },
        { at: new THREE.Vector3(-1.06, -0.13, 0), ry: 0.02, rz: 0.02 },
      ],
      16,
    ),
    ABD_SEGS % 2 === 1 ? matYellow : matBlack, // 与末节同色
  )
  tail.name = 'bumblebee-abdomen-segment'
  g.add(tail)
  return g
}

/** 一根绒毛：细锥沿法线立起，长度带伪随机参差（可复现）。 */
function hair(p: THREE.Vector3, n: THREE.Vector3, seed: number, baseLen: number, mat: THREE.Material): THREE.Mesh {
  const jitter = Math.sin(seed * 12.9898) * 43758.5453
  const len = baseLen + 0.035 * (jitter - Math.floor(jitter))
  const h = new THREE.Mesh(new THREE.ConeGeometry(0.008, len, 5), mat)
  h.position.copy(p).addScaledVector(n, len * 0.42)
  h.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
  h.name = 'bumblebee-fuzz'
  return h
}

/** 胸部绒毛：黄金角螺旋撒满上半球+体侧；x>collarX 的毛用黄色——领环的色界糊在毛里。 */
function thoraxFuzz(
  center: THREE.Vector3,
  radii: THREE.Vector3,
  count: number,
  collarX: number,
  yellowMat: THREE.Material,
  blackMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const yFrac = 1 - (i + 0.5) / count
    const ringR = Math.sqrt(Math.max(0, 1 - yFrac * yFrac))
    const theta = i * golden
    const nx = Math.cos(theta) * ringR
    const nz = Math.sin(theta) * ringR
    const ny = yFrac
    const p = new THREE.Vector3(center.x + nx * radii.x, center.y + ny * radii.y, center.z + nz * radii.z)
    const n = new THREE.Vector3(nx / radii.x, ny / radii.y, nz / radii.z).normalize()
    g.add(hair(p, n, i, 0.05, p.x > collarX ? yellowMat : blackMat))
  }
  return g
}

/** 腹部绒毛：沿腹长 × 上侧 200° 弧撒毛，颜色跟着所在环带走。 */
function abdomenFuzz(yellowMat: THREE.Material, blackMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const rings = 20
  const perRing = 9
  for (let k = 0; k < rings; k++) {
    const t = (k + 0.5) / rings
    const center = new THREE.Vector3().lerpVectors(ABD_FROM, ABD_TO, t)
    const r = abdRadius(t) * 0.98
    const mat = bandIndex(t) % 2 === 0 ? yellowMat : blackMat
    for (let j = 0; j < perRing; j++) {
      const phi = (j / (perRing - 1) - 0.5) * (Math.PI * 200) / 180
      const n = new THREE.Vector3(0, Math.cos(phi), Math.sin(phi)).normalize()
      const p = center.clone().addScaledVector(n, r)
      g.add(hair(p, n, k * perRing + j + 977, 0.045, mat))
    }
  }
  return g
}

/**
 * 带花粉篮的后足：胫节外侧压扁凹面 + 缘毛围栏 + 花粉球。
 * 右侧原坐标构建，附件挂进同一 group，最后整体 scale.z 镜像（与
 * honeybee.ts 的 hindLegWithBasket 同一防「左右篮长反」思路）。
 */
function hindLegWithBasket(
  spec: LegSpec,
  legMat: THREE.Material,
  rimMat: THREE.Material,
  pollenMat: THREE.Material,
  side: 1 | -1,
): { group: THREE.Group; pollenLocal: THREE.Vector3 } {
  const legGroup = leg(spec, legMat)
  const knee = legGroup.userData.knee as THREE.Vector3
  const tip = legGroup.userData.tip as THREE.Vector3
  const tibiaMid = new THREE.Vector3().lerpVectors(knee, tip, 0.42)

  // 凹面：压得很扁的球代表胫节外侧的光滑凹板
  const basket = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), legMat)
  basket.scale.set(1, 0.32, 0.68)
  basket.position.copy(tibiaMid).addScaledVector(new THREE.Vector3(0.01, -0.01, 1), 0.06)
  legGroup.add(basket)

  // 缘毛：篮缘一圈向外斜立的硬毛围栏
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const rim = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.07, 4), rimMat)
    rim.position
      .copy(basket.position)
      .add(new THREE.Vector3(Math.cos(a) * 0.075, Math.sin(a) * 0.032, 0.02))
    rim.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(Math.cos(a) * 0.4, Math.sin(a) * 0.25, 1).normalize(),
    )
    rim.name = 'bumblebee-basket-hair'
    legGroup.add(rim)
  }

  const pollen = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), pollenMat)
  pollen.scale.set(1, 0.85, 1.05)
  pollen.position.copy(tibiaMid).addScaledVector(new THREE.Vector3(0.02, -0.015, 1), 0.13)
  pollen.name = 'bumblebee-pollen'
  legGroup.add(pollen)

  if (side === -1) legGroup.scale.z = -1
  return { group: legGroup, pollenLocal: pollen.position.clone() }
}

export function buildBumblebee(): InsectModel {
  const g = new THREE.Group()

  // 全身 velvet；黄取深琥珀档（ACES 宁深勿浅），与近黑对比仍拉满
  const blackVelvet = chitin({ color: '#1b1410', gloss: 0.32, surface: 'velvet' })
  const yellowVelvet = chitin({ color: '#dfa72e', gloss: 0.3, surface: 'velvet' })
  const yellowHair = chitin({ color: '#e2ac3a', gloss: 0.12 })
  const blackHair = chitin({ color: '#241c14', gloss: 0.12 })
  const legMat = chitin({ color: '#20170f', gloss: 0.35 })
  const pollenMat = chitin({ color: '#d98a2b', gloss: 0.26 })
  const faceMat = chitin({ color: '#191310', gloss: 0.45 })
  const veinMat = chitin({ color: '#3a2c17', gloss: 0.3, side: THREE.DoubleSide })
  const wingMat = membrane('#e9ecef', 0.3, { iridescent: true, iridescenceStrength: 0.25 })

  // ---- 头：小而圆，藏在毛领之前
  const head = new THREE.Mesh(
    spindle([0.72, 0.14, 0], [1.02, 0.16, 0], 0.15, { bulge: 0.45, taperStart: 0.6, taperEnd: 0.45 }),
    blackVelvet,
  )
  head.name = 'bumblebee-body-core'
  g.add(head)

  // ---- 胸：接近球体的一大团（圆胖第一来源）
  const thorax = new THREE.Mesh(
    spindle([0.02, 0.02, 0], [0.78, 0.06, 0], 0.46, { bulge: 0.5, flat: 1.0, taperStart: 0.5, taperEnd: 0.55 }),
    blackVelvet,
  )
  thorax.name = 'bumblebee-body-core'
  g.add(thorax)

  // ---- 黄色毛领：前胸一圈鼓出的绒环（明亮熊蜂的领环）
  const collar = new THREE.Mesh(
    spindle([0.56, 0.04, 0], [0.8, 0.06, 0], 0.42, { bulge: 0.45, taperStart: 0.75, taperEnd: 0.35 }),
    yellowVelvet,
  )
  collar.name = 'bumblebee-body-core'
  g.add(collar)

  // ---- 腹：宽环带双色分段（构造见 bandedAbdomen 注释）
  g.add(bandedAbdomen(yellowVelvet, blackVelvet))

  // ---- 两层绒毛：胸 240 根（领环处换黄）+ 腹 180 根（跟环带换色）
  g.add(thoraxFuzz(new THREE.Vector3(0.4, 0.06, 0), new THREE.Vector3(0.42, 0.45, 0.42), 240, 0.55, yellowHair, blackHair))
  g.add(abdomenFuzz(yellowHair, blackHair))

  // ---- 复眼 + 单眼（熊蜂复眼相对小，也是「圆脸」观感的一部分）
  g.add(compoundEyePair({ at: [0.92, 0.16, 0.115], radius: 0.075, color: '#14100c', flatten: 0.88, facets: true }))
  g.add(ocelli([0.88, 0.28, 0], 0.012, 0.038, faceMat))

  // ---- 膝状触角
  const antBase: [number, number, number] = [0.98, 0.2, 0.05]
  g.add(antennaPair({ base: antBase, length: 0.5, kind: 'geniculate', pitch: 12, yaw: 32, thickness: 0.02 }, legMat))

  // ---- 两对翅：相对身体明显偏小（前翅约体长一半），极轻虹彩
  const foreWingLength = 1.05
  const foreSpec: WingSpec = {
    base: [0.42, 0.3, 0.12],
    length: foreWingLength,
    width: 0.4,
    spread: 200,
    tilt: -4,
    sweep: 6,
    thickness: 0.007,
  }
  const foreWings = wingPair(foreSpec, wingMat, veinMat, 6)
  g.add(foreWings)
  const hindWings = wingPair(
    { base: [0.24, 0.26, 0.12], length: 0.66, width: 0.26, spread: 208, tilt: -3, sweep: 10, thickness: 0.007 },
    wingMat,
    veinMat,
    5,
  )
  g.add(hindWings)
  // 面片命名：供测试用翅面自身几何量「翅长 < 体长 × 0.75」
  for (const pair of [foreWings, hindWings]) {
    for (const pivot of pair.children) {
      const blade = pivot.children[0] as THREE.Group
      const face = blade.children[0] as THREE.Mesh
      face.name = pair === foreWings ? 'bumblebee-fore-wing' : 'bumblebee-hind-wing'
    }
  }

  // ---- 前中足常规，后足带花粉篮
  g.add(
    (() => {
      const grp = new THREE.Group()
      const foreSpecLeg: LegSpec = { base: [0.62, -0.14, 0.16], femur: 0.26, tibia: 0.24, thickness: 0.028, splay: 28, sweep: -25, knee: 68 }
      const midSpec: LegSpec = { base: [0.36, -0.16, 0.19], femur: 0.3, tibia: 0.28, thickness: 0.03, splay: 32, sweep: 6, knee: 70 }
      for (const spec of [foreSpecLeg, midSpec]) {
        const right = leg(spec, legMat)
        const left = leg(spec, legMat)
        left.scale.z = -1
        grp.add(right, left)
      }
      return grp
    })(),
  )
  const hindSpec: LegSpec = { base: [0.1, -0.18, 0.18], femur: 0.36, tibia: 0.32, thickness: 0.036, splay: 30, sweep: 34, knee: 72 }
  const hindRight = hindLegWithBasket(hindSpec, legMat, blackHair, pollenMat, 1)
  const hindLeft = hindLegWithBasket(hindSpec, legMat, blackHair, pollenMat, -1)
  g.add(hindRight.group, hindLeft.group)

  // ---- wing anchor：沿装配矩阵链读出右前翅翅尖（honeybee.ts 同法）
  g.updateMatrixWorld(true)
  const foreRightBlade = (foreWings.children[0] as THREE.Group).children[0] as THREE.Group
  const wingTip = foreRightBlade.localToWorld(new THREE.Vector3(foreWingLength * 0.9, 0, 0))

  const anchors: Record<string, THREE.Vector3> = {
    fuzz: new THREE.Vector3(0.4, 0.56, 0),
    pollenBasket: hindRight.pollenLocal,
    wing: wingTip,
    eye: new THREE.Vector3(0.92, 0.16, 0.19),
    antenna: new THREE.Vector3(1.12, 0.3, 0.16),
    abdomen: new THREE.Vector3(-0.5, 0.28, 0),
  }

  return finalize(g, anchors)
}
