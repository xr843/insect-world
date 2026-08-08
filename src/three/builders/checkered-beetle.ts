/**
 * 中华郭公虫 Trichodes sinae（郭公虫科）体长 ~1.5cm
 *
 * 形态学依据与造型要点：
 * - 招牌①红黑相间的宽横带：郭公虫成虫访花捕食，蓝黑底鞘翅上 3 道鲜红宽横带
 *   是警戒色。横带走 burying-beetle 验证过的「贴面染色」思路——不造有实体
 *   半径的管子（那会渲染成粘在壳上的软垫），而是用与放样鞘翅完全相同的截面
 *   数据在曲面上拉一条极薄三角带，径向只偏移 ~2%防 z-fighting。本文件的
 *   bandStripe() 在其基础上把截面下标改为**连续插值**（不取整）——带宽由
 *   参数精确决定，不被采样格点量化拉宽，测试按 X 向占比 25%~55% 钉住总覆盖。
 *   红用已验收基准档 #e2382a，且 metal=0、clearcoat 压到 0.08：ACES 下高光
 *   层会把固有色冲淡，警戒红必须让漫反射主导（burying-beetle 三次返工的教训）。
 * - 招牌②通体密被竖立刚毛：郭公虫全身密生直立长毛，侧影看得出「毛边」。
 *   刚毛是细短锥形 loft（2 截面 × 5 径向段，单根约 30 个三角形，面数克制），
 *   沿鞘翅/前胸/头的曲面按确定性散列（正弦散列，无 Math.random）取位，
 *   方向以曲面法线为主、带少量确定性抖动——根根竖立而非贴伏。
 * - 招牌③窄长体、头比前胸宽：郭公虫科的头连眼比前胸背板宽（头宽 0.39 >
 *   前胸 0.32 < 鞘翅 0.42），前胸呈收腰的钟形——三段宽度「宽-窄-宽」的
 *   节奏是科级轮廓特征。全身长宽比 ~3.6，明显窄长。
 * - 躯干 chitin({surface:'velvet'}) 衬毛感：绒面 sheen 让底色在掠射角泛出
 *   细绒光，与真实刚毛（几何）互相衬托；鞘翅同为绒面深蓝黑，不走 elytra()
 *   的釉面高光（郭公虫鞘翅被毛，不是光壳）。
 * - 触角短棒状（末端渐膨大），复眼在宽头两侧；捕食性，加一对小型大颚。
 * - ACES 铁律：底色压深（#100e16 蓝黑），警戒红 #e2382a 对比拉满。
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
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/** 确定性散列（无 Math.random）：同参数任何机器同结果，刚毛布局可复现 */
function hash01(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

/**
 * 放样曲面上的点与解析法线：截面下标按 t **连续插值**（不取整），
 * theta 内部乘 side 保证左右真镜像（沿用 flower-chafer 的修正）。
 */
function surfacePoint(
  sections: Section[],
  centers: THREE.Vector3[],
  side: 1 | -1,
  halfWidth: number,
  t: number,
  outerThetaDeg: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const n = sections.length
  const f = THREE.MathUtils.clamp(t, 0, 1) * (n - 1)
  const i0 = Math.min(n - 2, Math.floor(f))
  const frac = f - i0
  const ry = THREE.MathUtils.lerp(sections[i0].ry, sections[i0 + 1].ry, frac)
  const rz = THREE.MathUtils.lerp(sections[i0].rz, sections[i0 + 1].rz, frac)
  const center = new THREE.Vector3().lerpVectors(centers[i0], centers[i0 + 1], frac)
  const theta = THREE.MathUtils.degToRad(side * outerThetaDeg)
  const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * ry, side * halfWidth + Math.sin(theta) * rz)
  const nx = (Math.cos(theta) / Math.max(ry, 1e-6)) * rz
  const nz = (Math.sin(theta) / Math.max(rz, 1e-6)) * ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  return { pos, normal }
}

/**
 * 贴面红横带：与 burying-beetle 的 surfaceStripe 同思路（曲面染色、解析法线、
 * DoubleSide 防环绕方向反面消隐），但长度方向的截面参数改为连续插值——
 * 带子的 X 向覆盖宽度 = 2*(halfT+waveAmpT)，由参数精确决定，供测试按
 * 占比断言。thetaFrom/thetaTo 单位是弧度，内部乘 side。
 */
function bandStripe(
  sections: Section[],
  centers: THREE.Vector3[],
  side: 1 | -1,
  halfWidth: number,
  tCenter: number,
  halfT: number,
  thetaFrom: number,
  thetaTo: number,
  waveAmpT: number,
  waveCount: number,
  material: THREE.Material,
): THREE.Mesh {
  const steps = 36

  const surfaceAt = (thetaRad: number, tF: number): { pos: THREE.Vector3; normal: THREE.Vector3 } => {
    const n = sections.length
    const f = THREE.MathUtils.clamp(tF, 0, 1) * (n - 1)
    const i0 = Math.min(n - 2, Math.floor(f))
    const frac = f - i0
    const ry = THREE.MathUtils.lerp(sections[i0].ry, sections[i0 + 1].ry, frac)
    const rz = THREE.MathUtils.lerp(sections[i0].rz, sections[i0 + 1].rz, frac)
    const center = new THREE.Vector3().lerpVectors(centers[i0], centers[i0 + 1], frac)
    const theta = side * thetaRad
    const nx = (Math.cos(theta) / Math.max(ry, 1e-6)) * rz
    const nz = (Math.sin(theta) / Math.max(rz, 1e-6)) * ry
    const normal = new THREE.Vector3(0, nx, nz).normalize()
    const localR = Math.min(ry, rz)
    const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * ry, side * halfWidth + Math.sin(theta) * rz).addScaledVector(
      normal,
      Math.max(localR * 0.02, 0.0015),
    )
    return { pos, normal }
  }

  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const theta = THREE.MathUtils.lerp(thetaFrom, thetaTo, f)
    const tC = tCenter + Math.sin(f * Math.PI * waveCount) * waveAmpT
    const front = surfaceAt(theta, tC - halfT)
    const back = surfaceAt(theta, tC + halfT)
    positions.push(front.pos.x, front.pos.y, front.pos.z, back.pos.x, back.pos.y, back.pos.z)
    normals.push(front.normal.x, front.normal.y, front.normal.z, back.normal.x, back.normal.y, back.normal.z)
    if (i < steps) {
      const a = i * 2
      const b = a + 2
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setIndex(indices)
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'band'
  mesh.userData.side = side
  return mesh
}

/** 一根竖立刚毛：细短锥形，2 截面 × 5 径向段（约 30 个三角形，面数克制） */
function seta(pos: THREE.Vector3, dir: THREE.Vector3, len: number, material: THREE.Material): THREE.Mesh {
  const tip = pos.clone().addScaledVector(dir, len)
  const hair = new THREE.Mesh(
    loft([{ at: pos, ry: 0.0055, rz: 0.0055 }, { at: tip, ry: 0.0007, rz: 0.0007 }], 5),
    material,
  )
  hair.name = 'seta'
  return hair
}

/** 在放样曲面上按确定性散列布一片竖立刚毛（方向=法线为主+少量抖动） */
function setaField(
  g: THREE.Group,
  sections: Section[],
  centers: THREE.Vector3[],
  side: 1 | -1,
  halfWidth: number,
  count: number,
  tRange: [number, number],
  thetaRange: [number, number],
  seed: number,
  material: THREE.Material,
): void {
  for (let i = 0; i < count; i++) {
    const t = THREE.MathUtils.lerp(tRange[0], tRange[1], (i + 0.5) / count) + (hash01(seed + i * 3.1) - 0.5) * 0.05
    const theta = THREE.MathUtils.lerp(thetaRange[0], thetaRange[1], hash01(seed + i * 7.7))
    const { pos, normal } = surfacePoint(sections, centers, side, halfWidth, t, theta)
    const dir = normal
      .clone()
      .add(new THREE.Vector3((hash01(seed + i * 13.3) - 0.5) * 0.5, 0.12, (hash01(seed + i * 17.9) - 0.5) * 0.3))
      .normalize()
    const len = 0.05 + 0.025 * hash01(seed + i * 23.7)
    g.add(seta(pos, dir, len, material))
  }
}

/** 复刻 kit.spindle() 内部鼓包公式取曲面点（不改 kit）——供头部布毛用 */
function spindleSurface(
  from: [number, number, number],
  to: [number, number, number],
  R: number,
  bulge: number,
  flat: number,
  t: number,
  side: 1 | -1,
  thetaDeg: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const k = t < bulge ? t / bulge : (1 - t) / (1 - bulge)
  const r = R * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI * 0.5)
  const ry = r / flat
  const rz = r * flat
  const theta = THREE.MathUtils.degToRad(side * thetaDeg)
  const center = new THREE.Vector3().lerpVectors(new THREE.Vector3(...from), new THREE.Vector3(...to), t)
  const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * ry, center.z + Math.sin(theta) * rz)
  const nx = (Math.cos(theta) / Math.max(ry, 1e-6)) * rz
  const nz = (Math.sin(theta) / Math.max(rz, 1e-6)) * ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  return { pos, normal }
}

// ---------------------------------------------------------------- 主体

export function buildCheckeredBeetle(): InsectModel {
  const g = new THREE.Group()

  // 躯干绒面衬毛感（郭公虫不是光壳甲虫）；底色蓝黑压深，警戒红对比拉满
  const bodyMat = chitin({ color: '#131019', gloss: 0.32, clearcoat: 0.1, surface: 'velvet' })
  const shellMat = chitin({ color: '#100e16', gloss: 0.34, clearcoat: 0.12, surface: 'velvet' })
  // 警戒红横带：#e2382a 已验收基准档；metal=0 + 低 clearcoat 让漫反射固有色
  // 主导（高光层在 ACES 下会把红冲成粉——burying-beetle 的教训）
  const bandMat = chitin({ color: '#e2382a', gloss: 0.4, metal: 0, clearcoat: 0.08, side: THREE.DoubleSide })
  const setaMat = chitin({ color: '#c9b89a', gloss: 0.25 }) // 浅麦色刚毛，深底上侧影可见
  const legMat = chitin({ color: '#17131f', gloss: 0.4, clearcoat: 0.15 })
  const antMat = chitin({ color: '#241d28', gloss: 0.4 })
  const mandMat = chitin({ color: '#1b1420', gloss: 0.6, clearcoat: 0.3 })

  const halfWidth = 0.095

  // ---- 腹面体躯：窄长基底
  g.add(
    new THREE.Mesh(
      spindle([-0.7, -0.02, 0], [0.42, 0, 0], 0.155, { bulge: 0.45, flat: 1.15, taperStart: 0.1, taperEnd: 0.6 }),
      bodyMat,
    ),
  )

  // ---- 鞘翅：窄长、近平行侧缘的低圆顶，尾端收圆
  const eFrom = 0.2
  const eTo = -0.75
  const eSteps = 30
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.62) * Math.PI * 0.9)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.1 - 0.02 * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.155, 0.008), rz: Math.max(w * 0.115, 0.008) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 24), shellMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)

    // 三道红横带：basal / median / subapical。X 向覆盖=3×2×(0.062+0.012)=44.4%，
    // 落在测试钉住的 25%~55% 区间内
    for (const tCenter of [0.2, 0.5, 0.8]) {
      g.add(bandStripe(elytronSections, elytronCenters, side, halfWidth, tCenter, 0.062, -0.85, 1.25, 0.012, 2, bandMat))
    }

    // 鞘翅刚毛：每侧 32 根
    setaField(g, elytronSections, elytronCenters, side, halfWidth, 32, [0.06, 0.94], [8, 64], side * 11.3, setaMat)
  }

  // ---- 前胸背板：钟形收腰——比头窄、比鞘翅窄（宽-窄-宽节奏的「窄」）
  const pFront = 0.52
  const pRear = 0.22
  const pSteps = 12
  const pronotumCenters: THREE.Vector3[] = []
  const pronotumSections: Section[] = []
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps // 0=前缘 1=后缘
    const wf = 0.55 + 0.45 * Math.sin(Math.pow(t, 0.85) * Math.PI * 0.78)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(pFront, pRear, t), 0.07, 0)
    pronotumCenters.push(c)
    pronotumSections.push({ at: c, ry: Math.max(0.14 * wf, 0.01), rz: Math.max(0.16 * wf, 0.01) })
  }
  const pronotum = new THREE.Mesh(loft(pronotumSections, 22), bodyMat)
  pronotum.name = 'pronotum'
  g.add(pronotum)
  for (const side of [1, -1] as const) {
    setaField(g, pronotumSections, pronotumCenters, side, 0, 8, [0.15, 0.85], [12, 60], side * 31.7, setaMat)
  }

  // ---- 头部：连眼比前胸宽（0.39 > 0.32），郭公虫科的「大头」轮廓
  const headFrom: [number, number, number] = [0.5, 0.05, 0]
  const headTo: [number, number, number] = [0.8, 0.06, 0]
  const head = new THREE.Mesh(
    spindle(headFrom, headTo, 0.185, { bulge: 0.42, flat: 1.05, taperStart: 0.6, taperEnd: 0.4 }),
    bodyMat,
  )
  g.add(head)
  // 头顶刚毛
  for (const side of [1, -1] as const) {
    for (const [t, theta] of [
      [0.3, 18],
      [0.45, 46],
      [0.62, 30],
      [0.75, 55],
      [0.55, 8],
    ] as [number, number][]) {
      const { pos, normal } = spindleSurface(headFrom, headTo, 0.185, 0.42, 1.05, t, side, theta)
      g.add(seta(pos, normal, 0.05, setaMat))
    }
  }

  g.add(compoundEyePair({ at: [0.66, 0.09, 0.155], radius: 0.062, color: '#0d0b0a', flatten: 0.85, facets: true }))

  // ---- 大颚：捕食性，小而尖
  g.add(mandibles({ at: [0.8, 0.01, 0.045], length: 0.1, spread: 0.42, curve: 0.55 }, mandMat))

  // ---- 触角：短、末端渐膨大成松散棒状。kit 自带微动钩子
  g.add(
    antennaPair({ base: [0.76, 0.04, 0.1], length: 0.28, kind: 'clavate', pitch: 6, yaw: 34, thickness: 0.016 }, antMat),
  )

  // ---- 六足：细长善走（访花捕食的活跃猎手）
  const legSpecs: LegSpec[] = [
    { base: [0.42, -0.08, 0.14], femur: 0.28, tibia: 0.26, tarsus: 0.1, thickness: 0.026, splay: 36, sweep: -26, knee: 54, ankle: 48 },
    { base: [0.1, -0.1, 0.16], femur: 0.31, tibia: 0.28, tarsus: 0.11, thickness: 0.026, splay: 34, sweep: 8, knee: 56, ankle: 48 },
    { base: [-0.28, -0.1, 0.15], femur: 0.33, tibia: 0.3, tarsus: 0.12, thickness: 0.027, splay: 38, sweep: 36, knee: 58, ankle: 50 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    band: surfacePoint(elytronSections, elytronCenters, 1, halfWidth, 0.5, 30).pos,
    fuzz: surfacePoint(elytronSections, elytronCenters, 1, halfWidth, 0.3, 62).pos.add(new THREE.Vector3(0, 0.03, 0.03)),
    elytra: surfacePoint(elytronSections, elytronCenters, 1, halfWidth, 0.45, 10).pos,
    eye: new THREE.Vector3(0.66, 0.13, 0.2),
    pronotum: new THREE.Vector3(0.37, 0.22, 0),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
