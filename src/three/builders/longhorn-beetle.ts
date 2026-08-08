/**
 * 星天牛 Anoplophora chinensis（鞘翅目·天牛科，果树头号蛀干害虫）
 *
 * 造型要点：
 * - 触角是天牛科的招牌——远超体长的黑白环纹长鞭，由 11 节"鞭小节"
 *   串成，节间收缩、节基略膨大。要画出黑白环纹必须逐节切开成独立
 *   mesh 上不同材质，因此本文件不复用 kit 的单色 antenna()，
 *   而是自写 antennomere()/longhornAntenna() 分节循环。
 * - 复眼被触角窝从中央"咬"开一个缺口，天牛复眼因此呈肾形——
 *   这里用两个分别贴在触角基部正上方/正下方的扁球体拼出这道缺口，
 *   而不是像多数昆虫那样用一个完整球体。
 * - 鞘翅是狭长的筒状（区别于金龟子那种高高隆起的卵圆壳），
 *   漆黑高光，缀满每侧十余枚大小不一的白斑——这正是"星天牛"得名
 *   之处。斑点位置直接复用放样鞘翅时算出的椭圆截面反推坐标，
 *   保证紧贴曲面而不悬浮。
 * - 前胸背板两侧各有一枚尖锐侧刺突，是天牛科区别于其他大型
 *   鞘翅目（金龟总科等）的识别特征。
 * - 大颚粗壮有力（天牛幼虫蛀木，成虫大颚也能啃食树皮嫩枝）。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEye,
  elytra,
  finalize,
  legPair,
  loft,
  mandibles,
  spindle,
  type InsectModel,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/** 固定种子伪随机（sin-hash）：同一 index 永远得到同一个值，
 * 保证白斑的分布/大小在每次构建时完全一致（不依赖 Math.random）。 */
function hash01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 一节触角（鞭小节）：两端收缩、中段略膨大的纺锤段。
 * 若给定 ringMat，会在节基部截出一小段独立着色的"白环"，
 * 与主干共用同一半径函数 radiusAt()，接缝处半径完全相等，
 * 因此换色处不会露出台阶或缝隙。
 */
function antennomere(
  p0: THREE.Vector3,
  p1: THREE.Vector3,
  rJointIn: number,
  rPeak: number,
  rJointOut: number,
  bulgeAt: number,
  ringFrac: number,
  ringMat: THREE.Material | null,
  shaftMat: THREE.Material,
  radialSegments = 8,
): THREE.Group {
  const g = new THREE.Group()
  const radiusAt = (t: number) =>
    t < bulgeAt
      ? THREE.MathUtils.lerp(rJointIn, rPeak, smoothstep(t / bulgeAt))
      : THREE.MathUtils.lerp(rPeak, rJointOut, smoothstep((t - bulgeAt) / (1 - bulgeAt)))
  const sectionAt = (t: number): Section => {
    const r = radiusAt(t)
    return { at: new THREE.Vector3().lerpVectors(p0, p1, t), ry: r, rz: r * 0.9 }
  }

  if (ringMat && ringFrac > 0) {
    const ringSteps = 3
    const ring: Section[] = []
    for (let i = 0; i <= ringSteps; i++) ring.push(sectionAt((i / ringSteps) * ringFrac))
    g.add(new THREE.Mesh(loft(ring, radialSegments), ringMat))

    const shaftSteps = 6
    const shaft: Section[] = []
    for (let i = 0; i <= shaftSteps; i++) shaft.push(sectionAt(ringFrac + (i / shaftSteps) * (1 - ringFrac)))
    g.add(new THREE.Mesh(loft(shaft, radialSegments), shaftMat))
  } else {
    const steps = 7
    const whole: Section[] = []
    for (let i = 0; i <= steps; i++) whole.push(sectionAt(i / steps))
    g.add(new THREE.Mesh(loft(whole, radialSegments), shaftMat))
  }
  return g
}

/**
 * 11 节触角长鞭：柄节(0)粗短、梗节(1)极短，鞭小节(2~10)渐长后趋平。
 * 用"步进转向"画出整条向后弯曲的弧——每节末端方向转折一次，
 * 转折量正比于该节长度占比，天然形成基部较直、往末端渐弯的
 * 姿态，正是天牛静栖时长触角向后甩过身体的典型样子。
 */
function longhornAntenna(
  base: THREE.Vector3,
  side: 1 | -1,
  totalLength: number,
  baseRadius: number,
  blackMat: THREE.Material,
  bandMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  g.userData.phase = side >= 0 ? 0 : Math.PI * 0.62 // 左右错相位（此类自写触角常左右共用 base，不能按 z 符号判）

  // 每节占全长比例：柄节短粗、梗节极短，鞭小节渐长后趋于稳定
  const lenFracRaw = [0.05, 0.03, 0.065, 0.08, 0.09, 0.095, 0.1, 0.1, 0.1, 0.1, 0.1]
  const lenSum = lenFracRaw.reduce((a, b) => a + b, 0)
  const lenFrac = lenFracRaw.map((f) => f / lenSum)
  // 每节最粗处半径相对 baseRadius 的倍数：柄节最粗，往后递减变细
  const peakMult = [1.0, 0.5, 0.62, 0.6, 0.56, 0.52, 0.47, 0.42, 0.37, 0.32, 0.26]

  const pitch0 = THREE.MathUtils.degToRad(38)
  const yaw0 = THREE.MathUtils.degToRad(24) * side
  let dir = new THREE.Vector3(Math.cos(pitch0) * Math.cos(yaw0), Math.sin(pitch0), Math.cos(pitch0) * Math.sin(yaw0))
  // 弯曲量不能太大：一根 6cm 长鞭如果整体卷曲超过半圈，端点反而会
  // 卷回身体附近，撑不开"远超体长"的空间跨度。开口更大的弧线
  // （约 1/4 圈）配合较强的侧向漂移，既保留"优雅弯曲"的观感，
  // 又能让触角尖真正甩到躯干范围以外很远的地方。
  const totalBend = THREE.MathUtils.degToRad(95) // 累积弯曲量：从前上方渐渐甩向后方
  const totalYawDrift = THREE.MathUtils.degToRad(46) * side // 侧向甩开的漂移量，是水平跨度的主要来源

  const joints: THREE.Vector3[] = [base.clone()]
  let cur = base.clone()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < lenFrac.length; i++) {
    const segLen = totalLength * lenFrac[i]
    cur = cur.clone().addScaledVector(dir, segLen)
    joints.push(cur)
    // 转弯轴：垂直于当前方向与竖直轴张成的平面，让弯曲发生在这个纵向弧面内
    let sideAxis = new THREE.Vector3().crossVectors(dir, up)
    if (sideAxis.lengthSq() < 1e-8) sideAxis = new THREE.Vector3(0, 0, 1)
    sideAxis.normalize()
    dir = dir
      .clone()
      .applyAxisAngle(sideAxis, totalBend * lenFrac[i])
      .applyAxisAngle(up, totalYawDrift * lenFrac[i])
      .normalize()
  }

  for (let i = 0; i < lenFrac.length; i++) {
    // 两端收缩半径都取 peakMult[i]*0.4，与相邻节的推导公式一致，接缝处严丝合缝
    const rJointIn = i === 0 ? baseRadius * peakMult[0] * 0.7 : baseRadius * peakMult[i - 1] * 0.4
    const rJointOut = baseRadius * peakMult[i] * (i === lenFrac.length - 1 ? 0.15 : 0.4)
    const rPeak = baseRadius * peakMult[i]
    // 柄节、梗节是实心黑色；鞭小节(第 3 节起)基部截出一圈白/灰蓝环——
    // 星天牛得名的黑白斑纹正来自这一圈圈基环
    const hasRing = i >= 2
    g.add(
      antennomere(joints[i], joints[i + 1], rJointIn, rPeak, rJointOut, 0.32, hasRing ? 0.3 : 0, hasRing ? bandMat : null, blackMat),
    )
  }
  return g
}

/** 复眼上下两半分别贴在触角基部正上方/正下方，拼出被触角窝分割的肾形缺口。 */
function reniformEyePair(x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group()
  for (const side of [1, -1] as const) {
    const eyeZ = z * side
    g.add(compoundEye({ at: [x, y + 0.095, eyeZ], radius: 0.078, color: '#141013', flatten: 0.55, stretch: 0.85 }))
    g.add(compoundEye({ at: [x, y - 0.095, eyeZ], radius: 0.078, color: '#141013', flatten: 0.55, stretch: 0.85 }))
  }
  return g
}

/** 给一对腿的跗节末端加一块扁宽的"脚掌垫"——攀树昆虫跗节普遍加宽以增加抓附面积。 */
function addTarsalPads(legPairGroup: THREE.Group, material: THREE.Material, r: number): void {
  for (const child of legPairGroup.children) {
    const tip = child.userData.tip as THREE.Vector3 | undefined
    if (!tip) continue
    const pad = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), material)
    pad.scale.set(1.5, 0.5, 1.15)
    pad.position.copy(tip)
    child.add(pad)
  }
}

export function buildLonghornBeetle(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#0d0d0f', gloss: 0.5, clearcoat: 0.35 })
  // 漆黑高光，金属感很弱，天牛鞘翅不像金龟子那样带铜绿。
  // B3 刻点组：'punctate' 默认档——星天牛鞘翅基部真实存在颗粒区；
  // surface 系统按整片 UV 铺贴图，做不出"只在基部"的空间局限（会动到
  // surface.ts 才行，本文件只加选项），这里退而求其次整片鞘翅一起挂，
  // 白星斑（spotMat）不动。
  const shellMat = elytra('#08080a', 0.12, { surface: 'punctate' })
  const spotMat = chitin({ color: '#f0f1ec', gloss: 0.3 })
  const antennaBlack = chitin({ color: '#0c0c0e', gloss: 0.6, clearcoat: 0.4 })
  const antennaBand = chitin({ color: '#c9d3d8', gloss: 0.28 })
  const legMat = chitin({ color: '#111113', gloss: 0.55, clearcoat: 0.3 })
  const spikeMat = chitin({ color: '#151517', gloss: 0.45 })
  const mandibleMat = chitin({ color: '#050506', gloss: 0.72, clearcoat: 0.5 })

  // ---- 腹面体躯（被鞘翅覆盖的部分，防止鞘翅缝隙间露出内部空洞）
  const belly = new THREE.Mesh(
    spindle([-1.5, 0.0, 0], [1.15, 0.05, 0], 0.32, { bulge: 0.42, flat: 1.05, taperStart: 0.15, taperEnd: 0.45 }),
    bodyMat,
  )
  g.add(belly)

  // ---- 鞘翅：天牛鞘翅是狭长的筒状，比金龟子平直得多，末端圆钝而不高高隆起
  const eSteps = 22
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.7) * Math.PI * 0.94) * 0.4
    const c = new THREE.Vector3(1.05 - 2.5 * t, 0.32 - 0.05 * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.7, 0.015), rz: Math.max(w * 0.62, 0.015) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 24), shellMat)
    shell.position.z = side * 0.2
    g.add(shell)
  }

  // ---- 白斑：星天牛得名之处。位置/大小用固定种子哈希生成（非 Math.random），
  // 保证反复构建结果一致；坐标直接复用上面鞘翅放样用到的椭圆截面反推，
  // 因此天然贴合曲面，不会悬空或嵌入壳体太深。
  const SPOTS_PER_SIDE = 17
  for (const side of [1, -1] as const) {
    const salt = side > 0 ? 0 : 97
    for (let i = 0; i < SPOTS_PER_SIDE; i++) {
      const t = 0.06 + hash01(i * 3 + salt) * 0.86
      const theta = (hash01(i * 3 + 1 + salt) - 0.5) * Math.PI * 0.82 // 主要落在背侧可见面
      const idx = Math.min(eSteps, Math.max(0, Math.round(t * eSteps)))
      const sec = elytronSections[idx]
      const center = elytronCenters[idx]
      // 局部法线近似：鞘翅主轴几乎不绕 X 滚转，故椭圆的 u/v 轴就是全局 Y/Z，
      // 沿用 kit 的 loft() 内部同一套法线公式（除以半径、乘另一半径）
      const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
      const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
      const normal = new THREE.Vector3(0, nx, nz).normalize()
      const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, side * 0.2 + Math.sin(theta) * sec.rz).addScaledVector(
        normal,
        0.012,
      )
      const r = 0.028 + hash01(i * 7 + 3 + salt) * 0.05
      const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 5), spotMat)
      spot.scale.set(1, 1, 0.3) // 压扁成贴附曲面的斑块，而非凸起的疙瘩
      spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
      spot.position.copy(pos)
      g.add(spot)
    }
  }

  // ---- 前胸背板：天牛前胸比鞘翅基部窄，两侧各有一枚尖锐侧刺突（科级识别特征）
  const pronotum = new THREE.Mesh(
    spindle([1.1, 0.05, 0], [1.7, 0.12, 0], 0.32, { bulge: 0.5, flat: 1.05, taperStart: 0.55, taperEnd: 0.6 }),
    bodyMat,
  )
  g.add(pronotum)
  for (const side of [1, -1] as const) {
    const spikeBase = new THREE.Vector3(1.42, 0.1, side * 0.3)
    const spikeTip = spikeBase.clone().add(new THREE.Vector3(-0.06, -0.02, side * 0.22))
    g.add(new THREE.Mesh(loft([{ at: spikeBase, ry: 0.05, rz: 0.05 }, { at: spikeTip, ry: 0.002, rz: 0.002 }], 8), spikeMat))
  }

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([1.65, 0.08, 0], [2.05, 0.1, 0], 0.24, { bulge: 0.45, taperStart: 0.75, taperEnd: 0.5 }),
    bodyMat,
  )
  g.add(head)

  // ---- 大颚：粗壮有力，天牛能啃食树皮甚至咬穿嫩木
  g.add(mandibles({ at: [2.0, 0.02, 0.1], length: 0.22, spread: 0.5, curve: 0.7 }, mandibleMat))

  // ---- 复眼：肾形，被触角窝分割——见 reniformEyePair 注释
  const antennaBaseX = 2.0
  const antennaBaseY = 0.14
  const antennaBaseZ = 0.22
  g.add(reniformEyePair(antennaBaseX - 0.05, antennaBaseY, antennaBaseZ))

  // ---- 触角：11 节黑白环纹长鞭，长度约为体长的 1.5~2 倍
  for (const side of [1, -1] as const) {
    g.add(longhornAntenna(new THREE.Vector3(antennaBaseX, antennaBaseY, antennaBaseZ * side), side, 6.0, 0.05, antennaBlack, antennaBand))
  }

  // ---- 三对足：粗壮，跗节加宽垫便于攀树
  const legs = [
    legPair({ base: [1.1, -0.06, 0.36], femur: 0.62, tibia: 0.68, tarsus: 0.32, splay: 40, sweep: -30, knee: 68, thickness: 0.05, spines: true }, legMat),
    legPair({ base: [0.2, -0.08, 0.38], femur: 0.7, tibia: 0.78, tarsus: 0.36, splay: 36, sweep: 6, knee: 74, thickness: 0.055, spines: true }, legMat),
    legPair({ base: [-0.6, -0.08, 0.36], femur: 0.75, tibia: 0.85, tarsus: 0.4, splay: 34, sweep: 42, knee: 78, thickness: 0.055, spines: true }, legMat),
  ]
  for (const lp of legs) {
    addTarsalPads(lp, legMat, 0.045)
    g.add(lp)
  }

  const anchors: Record<string, THREE.Vector3> = {
    antenna: new THREE.Vector3(antennaBaseX + 3.2, antennaBaseY + 1.5, antennaBaseZ + 1.3),
    eye: new THREE.Vector3(antennaBaseX - 0.05, antennaBaseY, antennaBaseZ + 0.15),
    mandible: new THREE.Vector3(2.15, 0.0, 0.12),
    pronotum: new THREE.Vector3(1.4, 0.35, 0),
    elytra: new THREE.Vector3(-0.5, 0.3, 0.3),
    leg: new THREE.Vector3(0.2, -0.9, 1.1),
  }

  return finalize(g, anchors)
}
