/**
 * 日本吉丁 Chrysochroa fulgidissima（鞘翅目·吉丁科，俗称"玉虫"）
 *
 * 造型要点：
 * - 全部重点是鞘翅的虹彩金属光泽：换个角度看会在绿→金→紫红之间
 *   漂移，这不是固有色能画出来的，必须靠物理正确的薄膜干涉。
 *   kit.chitin() 不设置 iridescence 相关属性（它面向普通几丁质，
 *   不该默认给全部 24 个物种加这个较重的效果），因此本文件直接在
 *   chitin() 返回的 MeshPhysicalMaterial 上补设 iridescence /
 *   iridescenceIOR / iridescenceThicknessRange。
 * - 纺锤形（船形）轮廓：前宽（肩部）、后尖（近乎收成一点），是吉丁科
 *   区别于其他鞘翅目的标志性体型。kit.spindle() 的鼓包公式是关于
 *   bulge 对称的一条正弦曲线，画不出"肩部急剧变宽、其后长距离缓慢
 *   收尖"这种前后不对称的轮廓，因此鞘翅改用本文件自写的分段轮廓
 *   profileWidth()（在几个控制点之间用 smoothstep 插值）。
 * - 鞘翅两条纵向红铜色条带：沿放样鞘翅时的同一组截面反推曲面坐标
 *   （复用星天牛白斑的取法），保证紧贴曲面。
 * - 短锯齿状触角：kit.AntennaKind 里没有"锯齿"这个选项（最接近的
 *   'pectinate' 是长羽枝，比例不对），因此自写 serrateAntenna()——
 *   短而渐细的主干，每节朝外侧凸一枚小尖齿。
 */
import * as THREE from 'three'
import { chitin, compoundEyePair, finalize, legPair, loft, spindle, type InsectModel, type LegSpec, type Section } from './kit'

// ---------------------------------------------------------------- 局部工具

/** 轮廓控制点：t 沿体长 0~1，w 为该处半宽相对峰值的比例。
 * 前段（肩部附近）迅速撑到最宽，此后长距离缓慢收窄，最后收成尖点。 */
const HULL_PROFILE: [number, number][] = [
  [0, 0.55],
  [0.08, 0.94],
  [0.24, 0.88],
  [0.46, 0.66],
  [0.7, 0.4],
  [0.88, 0.18],
  [0.97, 0.05],
  [1, 0],
]

function profileWidth(t: number): number {
  for (let i = 0; i < HULL_PROFILE.length - 1; i++) {
    const [t0, w0] = HULL_PROFILE[i]
    const [t1, w1] = HULL_PROFILE[i + 1]
    if (t >= t0 && t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1)
      const s = f * f * (3 - 2 * f)
      return THREE.MathUtils.lerp(w0, w1, s)
    }
  }
  return HULL_PROFILE[HULL_PROFILE.length - 1][1]
}

/** 沿鞘翅放样时的同一组截面反推曲面坐标，画出一条贴面的窄纵带。 */
function surfaceStripe(
  sections: Section[],
  centers: THREE.Vector3[],
  zOffset: number,
  theta: number,
  tFrom: number,
  tTo: number,
  tubeR: number,
  material: THREE.Material,
): THREE.Mesh {
  const n = sections.length
  const iFrom = Math.round(tFrom * (n - 1))
  const iTo = Math.round(tTo * (n - 1))
  const pts: Section[] = []
  for (let i = iFrom; i <= iTo; i++) {
    const sec = sections[i]
    const center = centers[i]
    const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
    const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
    const normal = new THREE.Vector3(0, nx, nz).normalize()
    const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz).addScaledVector(
      normal,
      0.01,
    )
    pts.push({ at: pos, ry: tubeR, rz: tubeR })
  }
  return new THREE.Mesh(loft(pts, 8), material)
}

/** 短锯齿状触角：渐细主干 + 每节朝外侧凸出的一枚小尖齿。 */
function serrateAntenna(base: THREE.Vector3, side: 1 | -1, length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  g.userData.phase = side >= 0 ? 0 : Math.PI * 0.62 // 左右错相位（此类自写触角常左右共用 base，不能按 z 符号判）
  const segs = 9
  const pitch = THREE.MathUtils.degToRad(26)
  const yaw = side * THREE.MathUtils.degToRad(30)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))

  const path: THREE.Vector3[] = []
  for (let i = 0; i <= segs; i++) path.push(base.clone().addScaledVector(dir, (length * i) / segs))

  const sections: Section[] = path.map((p, i) => {
    const t = i / segs
    const r = thickness * (1 - t * 0.55)
    return { at: p, ry: r, rz: r }
  })
  g.add(new THREE.Mesh(loft(sections, 8), material))

  const up = new THREE.Vector3(0, 1, 0)
  let outSide = new THREE.Vector3().crossVectors(dir, up)
  if (outSide.lengthSq() < 1e-8) outSide = new THREE.Vector3(0, 0, 1)
  outSide.normalize().multiplyScalar(side)

  for (let i = 2; i < segs; i++) {
    const t = i / segs
    const p = path[i]
    const toothLen = thickness * 2.2 * (1 - t * 0.5)
    const tip = p.clone().addScaledVector(outSide, toothLen).addScaledVector(dir, -toothLen * 0.3)
    g.add(
      new THREE.Mesh(loft([{ at: p, ry: thickness * 0.55, rz: thickness * 0.55 }, { at: tip, ry: 0.003, rz: 0.003 }], 6), material),
    )
  }
  return g
}

function serrateAntennaPair(base: [number, number, number], length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(serrateAntenna(new THREE.Vector3(...base), 1, length, thickness, material))
  g.add(serrateAntenna(new THREE.Vector3(base[0], base[1], -base[2]), -1, length, thickness, material))
  return g
}

export function buildJewelBeetle(): InsectModel {
  const g = new THREE.Group()

  // 虹彩鞘翅：高 metalness + 极低 roughness（gloss 0.96）打底，
  // 再手动补上 iridescence 三件套——chitin() 本身不设置这些。
  // B 轮虹彩组铁律：虹彩本身已是一层强角度高光，与清漆叠满必过曝，手搓
  // 材质要手动把 clearcoat 压到 ≤0.35（同 kit.elytra() 开虹彩时的内部
  // 行为）——原先 0.5 超了，压下来；iridescence/IOR/厚度域已按本组的
  // 强虹彩定标过，不动。
  const shellMat = chitin({ color: '#146b3f', gloss: 0.96, metal: 0.9, clearcoat: 0.35 })
  shellMat.iridescence = 0.75
  shellMat.iridescenceIOR = 1.9
  shellMat.iridescenceThicknessRange = [200, 500]

  const bodyMat = chitin({ color: '#0f4a2c', gloss: 0.82, metal: 0.65, clearcoat: 0.48 })
  const stripeMat = chitin({ color: '#9a3a1e', gloss: 0.85, metal: 0.5, clearcoat: 0.5 })
  const legMat = chitin({ color: '#12241a', gloss: 0.6, metal: 0.4, clearcoat: 0.4 })

  // ---- 腹面体躯
  const belly = new THREE.Mesh(
    spindle([-2.5, 0.0, 0], [1.0, 0.05, 0], 0.5, { bulge: 0.25, flat: 1.05, taperStart: 0.04, taperEnd: 0.5 }),
    bodyMat,
  )
  g.add(belly)

  // ---- 鞘翅：前宽后尖的纺锤/船形轮廓，见 profileWidth() 注释
  const eSteps = 26
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = profileWidth(t) * 0.58
    const c = new THREE.Vector3(1.0 - 3.5 * t, 0.34 - 0.1 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.62, 0.008), rz: Math.max(w * 0.56, 0.008) })
  }
  const stripeZ = 0.19
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), shellMat)
    shell.position.z = side * stripeZ
    g.add(shell)

    // 两条纵向红铜色条带：贴着背侧偏外的位置，从近肩部到近尾尖前收尾
    g.add(surfaceStripe(elytronSections, elytronCenters, side * stripeZ, 0.5, 0.05, 0.84, 0.05, stripeMat))
  }

  // ---- 前胸背板：梯形，后缘（接鞘翅肩部）宽，前缘（接头）窄
  const pronotum = new THREE.Mesh(
    spindle([1.0, 0.28, 0], [1.35, 0.32, 0], 0.42, { bulge: 0.1, flat: 1.15, taperStart: 0.85, taperEnd: 0.28 }),
    bodyMat,
  )
  g.add(pronotum)

  // ---- 头部：小而略内收，吉丁科头部常半沉入前胸
  const head = new THREE.Mesh(
    spindle([1.35, 0.28, 0], [1.56, 0.3, 0], 0.26, { bulge: 0.4, flat: 1.0, taperStart: 0.75, taperEnd: 0.45 }),
    bodyMat,
  )
  g.add(head)

  // ---- 复眼
  g.add(compoundEyePair({ at: [1.42, 0.33, 0.2], radius: 0.09, color: '#0c0c0c', flatten: 0.85, facets: true }))

  // ---- 短锯齿状触角
  g.add(serrateAntennaPair([1.44, 0.24, 0.16], 0.42, 0.026, bodyMat))

  // ---- 三对细长足：吉丁科善飞善晒太阳，足不特别粗壮
  const legSpecs: LegSpec[] = [
    { base: [0.85, -0.16, 0.32], femur: 0.42, tibia: 0.4, tarsus: 0.16, thickness: 0.032, splay: 40, sweep: -32, knee: 62 },
    { base: [0.1, -0.2, 0.36], femur: 0.46, tibia: 0.44, tarsus: 0.18, thickness: 0.034, splay: 36, sweep: 4, knee: 66 },
    { base: [-0.65, -0.2, 0.34], femur: 0.48, tibia: 0.46, tarsus: 0.18, thickness: 0.034, splay: 38, sweep: 40, knee: 70 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    elytra: new THREE.Vector3(-0.9, 0.48, 0.3),
    stripe: new THREE.Vector3(-0.1, 0.5, 0.36),
    eye: new THREE.Vector3(1.42, 0.38, 0.24),
    antenna: new THREE.Vector3(1.75, 0.42, 0.4),
    pronotum: new THREE.Vector3(1.15, 0.55, 0),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
