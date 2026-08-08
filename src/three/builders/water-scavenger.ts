/**
 * 大黑水龟虫 Hydrophilus acuminatus（水龟虫科）体长 ~3.5cm
 *
 * 形态学依据与造型要点（三处与黄缘龙虱 diving-beetle 的分辨点必须一眼可见）：
 * - ①下颚须比触角还长还显眼：水龟虫科摸世界靠下颚须不靠触角——触角特化成
 *   短棒状的「换气管」，静止时收在复眼下方；伸在最前面、行使「触角职能」的
 *   是一对细长的下颚须。因此本文件把 palp 建成从口器伸向前方的细长分节须
 *   （长度 > 触角、≥ 头长 1.2 倍，测试量的是真实几何不是声明值），触角则用
 *   kit 的 clavate 短棒档、负 pitch 收在眼下。
 * - ②背部更高隆：龙虱是「压扁的橄榄」（其鞘翅 ry:rz≈0.33:0.42，扁宽），
 *   水龟虫背面明显穹起（船底式高拱）——本文件鞘翅 ry:rz≈0.50:0.42，
 *   高度方向反超宽度方向，侧影一眼可分。全身 flat 只取 1.15（龙虱 1.4~1.5）。
 * - ③腹面中央纵向龙骨脊延伸成后刺：水龟虫科的胸腹板中央有一道纵龙骨
 *   （sternal keel），末端游离成一根伸向体后下方的尖刺（acuminatus 之名即
 *   由此来）。keel 用一条薄刃状放样贴着腹面正中走线，走线的 y 由复刻
 *   kit.spindle() 内部鼓包公式的 bellyBottomY() 算出（复刻不改 kit，同
 *   hornet.ts / diving-beetle.ts 的先例），尾段脱离体表收成尖刺。
 * - 鞘翅光亮黑：elytra('#0c0f0c', 0.2, {surface:'punctate'}) 后把刻点贴图
 *   换成 punctateMaps(48, 0.009) 的极细档（与 diving-beetle 同一档），
 *   真实水龟虫鞘翅有若干列极细的刻点列，近观才见，远看是一整片亮黑。
 * - 游泳足：中后足胫节带游泳缘毛（fringe），但不像龙虱那样特化成整片桨
 *   ——水龟虫划水是左右交替的「跑步式」，腿仍是可见的分节圆管。
 * - ACES 铁律：全身黑色系压深（#0b0e0b / #0c0f0c），下颚须用深红棕
 *   （#63360f）在黑底上做辨识对比。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  leg,
  legPair,
  loft,
  mirrorZ,
  spindle,
  type InsectModel,
  type Section,
} from './kit'
import { punctateMaps } from './surface'

// ---------------------------------------------------------------- 局部辅助

const BELLY_FROM: [number, number, number] = [-1.7, 0, 0]
const BELLY_TO: [number, number, number] = [1.05, 0.02, 0]
const BELLY_R = 0.6
const BELLY_BULGE = 0.42
const BELLY_FLAT = 1.15

/**
 * 腹面底缘的 y：复刻 kit.spindle() 内部的非对称正弦鼓包公式（不改 kit），
 * 供龙骨脊沿腹面正中贴线用。x 超出腹体范围时按端点截断。
 */
function bellyBottomY(x: number): number {
  const t = THREE.MathUtils.clamp((x - BELLY_FROM[0]) / (BELLY_TO[0] - BELLY_FROM[0]), 0, 1)
  const k = t < BELLY_BULGE ? t / BELLY_BULGE : (1 - t) / (1 - BELLY_BULGE)
  const r = BELLY_R * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI * 0.5)
  const centerY = THREE.MathUtils.lerp(BELLY_FROM[1], BELLY_TO[1], t)
  return centerY - r / BELLY_FLAT
}

/**
 * 下颚须（一侧）：从口器向前伸的细长分节须。单条 loft，半径在 30%/60% 处
 * 微鼓成「节间关节」、端节略粗后收钝——一整根就是一个可量长度的 mesh
 * （name='palp'），测试直接取它的几何包围盒对角线当作须长。
 */
function maxillaryPalp(side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const base = new THREE.Vector3(1.6, -0.03, side * 0.1)
  // 前伸为主、微外张微下垂——伸在头前面「探路」的姿态
  const waypoints: [THREE.Vector3, number][] = [
    [base, 0.02],
    [new THREE.Vector3(1.76, -0.045, side * 0.16), 0.024], // 第一关节微鼓
    [new THREE.Vector3(1.92, -0.07, side * 0.21), 0.019],
    [new THREE.Vector3(2.05, -0.1, side * 0.25), 0.026], // 端节略粗
    [new THREE.Vector3(2.2, -0.14, side * 0.28), 0.011], // 端部收钝
  ]
  const sections: Section[] = []
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const f = (i / steps) * (waypoints.length - 1)
    const i0 = Math.min(waypoints.length - 2, Math.floor(f))
    const frac = f - i0
    const at = new THREE.Vector3().lerpVectors(waypoints[i0][0], waypoints[i0 + 1][0], frac)
    const r = THREE.MathUtils.lerp(waypoints[i0][1], waypoints[i0 + 1][1], frac)
    sections.push({ at, ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'palp'
  return mesh
}

/**
 * 游泳缘毛：沿胫节+跗节（knee→tip 轴）外侧密生一排指向体后的细长毛，
 * 是水龟虫交替划水的推进面（手法同 water-strider 的 hydrophobicTuft，
 * 改为沿轴分布）。加在右腿上、随 mirrorZ 一起镜像。
 */
function swimFringe(legGroup: THREE.Group, material: THREE.Material, count: number, maxLen: number): void {
  const knee = legGroup.userData.knee as THREE.Vector3 | undefined
  const tip = legGroup.userData.tip as THREE.Vector3 | undefined
  if (!knee || !tip) return
  const axis = new THREE.Vector3().subVectors(tip, knee)
  const segLen = axis.length()
  axis.normalize()
  const side = new THREE.Vector3().crossVectors(axis, new THREE.Vector3(0, 1, 0)).normalize()
  if (side.x > 0) side.negate() // 毛排指向体后（-X 半空间），划水时向后拨水
  for (let i = 0; i < count; i++) {
    const t = 0.15 + (0.8 * i) / (count - 1)
    const p = knee.clone().addScaledVector(axis, segLen * t)
    const hairLen = maxLen * (0.55 + 0.45 * Math.sin(t * Math.PI))
    const hairTip = p.clone().addScaledVector(side, hairLen).addScaledVector(axis, hairLen * 0.15)
    const hair = new THREE.Mesh(
      loft([{ at: p, ry: 0.007, rz: 0.007 }, { at: hairTip, ry: 0.0008, rz: 0.0008 }], 5),
      material,
    )
    hair.name = 'swim-hair'
    legGroup.add(hair)
  }
}

// ---------------------------------------------------------------- 主体

export function buildWaterScavenger(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#0b0e0b', gloss: 0.55, metal: 0.08, clearcoat: 0.3 })
  // 鞘翅光亮黑 + 极细刻点档：与 diving-beetle 同一档的 punctateMaps(48, 0.009)
  // 覆盖默认密度——远看一整片亮黑，近观才有稀疏细麻点（真实水龟虫即如此）。
  const shellMat = elytra('#0c0f0c', 0.2, { surface: 'punctate' })
  const finePunctate = punctateMaps(48, 0.009)
  if (finePunctate) {
    shellMat.normalMap = finePunctate.normal
    shellMat.roughnessMap = finePunctate.roughness
  }
  const palpMat = chitin({ color: '#63360f', gloss: 0.5, clearcoat: 0.15 })
  const antMat = chitin({ color: '#4a2c10', gloss: 0.4 })
  const legMat = chitin({ color: '#191510', gloss: 0.42, clearcoat: 0.2 })
  const hairMat = chitin({ color: '#3a3324', gloss: 0.3 })

  const halfWidth = 0.52

  // ---- 腹面体躯：连续基底。flat 仅 1.15（龙虱 1.5）——不压扁，为高拱背留地基
  const belly = new THREE.Mesh(
    spindle(BELLY_FROM, BELLY_TO, BELLY_R, { bulge: BELLY_BULGE, flat: BELLY_FLAT, taperStart: 0.04, taperEnd: 0.6 }),
    bodyMat,
  )
  g.add(belly)

  // ---- 鞘翅：高拱船底式圆顶（ry 0.50 > rz 0.42，高度反超宽度——分辨点②），
  // 尾端收得比龙虱更尖（sin 因子 0.96，acuminatus 尖尾）
  const eFrom = 0.98
  const eTo = -1.66
  const eSteps = 26
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.56) * Math.PI * 0.96)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.12 - 0.05 * t * t, 0)
    elytronSections.push({ at: c, ry: Math.max(w * 0.5, 0.012), rz: Math.max(w * 0.42, 0.012) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 28), shellMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)
  }

  // ---- 前胸背板：宽短，与鞘翅前缘平滑衔接，同为高拱剖面
  const pronotum = new THREE.Mesh(
    spindle([1.0, 0.05, 0], [1.36, 0.07, 0], 0.56, { bulge: 0.32, flat: 1.25, taperStart: 0.84, taperEnd: 0.66 }),
    bodyMat,
  )
  g.add(pronotum)

  // ---- 头部：短宽，前缘钝圆。name='head' 供测试量头长（下颚须长度的参照系）
  const head = new THREE.Mesh(
    spindle([1.3, 0.07, 0], [1.76, 0.09, 0], 0.3, { bulge: 0.42, flat: 1.25, taperStart: 0.8, taperEnd: 0.45 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  g.add(
    compoundEyePair({
      at: [1.5, 0.14, 0.3],
      radius: 0.13,
      color: '#12100d',
      flatten: 0.84,
      stretch: 1.05,
      facets: true,
    }),
  )

  // ---- 触角：短棒状（clavate），负 pitch 收在复眼下方——分辨点①的「短」一半。
  // kit.antennaPair 自带微动钩子（name='antenna' + userData.base）。
  g.add(
    antennaPair(
      { base: [1.46, 0, 0.24], length: 0.3, kind: 'clavate', pitch: -16, yaw: 58, thickness: 0.02 },
      antMat,
    ),
  )

  // ---- 下颚须：伸在最前面的一对细长分节须——分辨点①的「长」一半
  const palpR = maxillaryPalp(1, palpMat)
  const palpL = maxillaryPalp(-1, palpMat)
  g.add(palpR, palpL)

  // ---- 腹面纵龙骨脊 → 后刺（分辨点③）：薄刃状放样贴腹面正中走线，
  // 尾段脱离体表、收成伸向体后下方的尖刺
  const keelXs = [0.85, 0.5, 0.1, -0.35, -0.75, -1.1, -1.35]
  const keelSections: Section[] = keelXs.map((x, i) => {
    const bladeDepth = 0.1 - 0.02 * (i / (keelXs.length - 1))
    return {
      at: new THREE.Vector3(x, bellyBottomY(x) + 0.04, 0),
      ry: bladeDepth,
      rz: THREE.MathUtils.lerp(0.024, 0.014, i / (keelXs.length - 1)),
    }
  })
  // 游离刺段：离开体表向后下方收尖
  keelSections.push({ at: new THREE.Vector3(-1.52, -0.17, 0), ry: 0.035, rz: 0.009 })
  keelSections.push({ at: new THREE.Vector3(-1.66, -0.13, 0), ry: 0.005, rz: 0.004 })
  const keel = new THREE.Mesh(loft(keelSections, 10), bodyMat)
  keel.name = 'keel'
  g.add(keel)

  // ---- 前足：常规抓握足
  const foreRig = legPair(
    { base: [0.85, -0.16, 0.4], femur: 0.34, tibia: 0.3, tarsus: 0.14, thickness: 0.05, splay: 32, sweep: -20, knee: 55 },
    legMat,
  )
  g.add(foreRig)

  // ---- 中后足：分节圆管 + 游泳缘毛（交替划水，不是龙虱的整片桨）
  const midRight = leg(
    { base: [0.35, -0.2, 0.48], femur: 0.46, tibia: 0.42, tarsus: 0.2, thickness: 0.052, splay: 30, sweep: 8, knee: 50 },
    legMat,
  )
  swimFringe(midRight, hairMat, 8, 0.13)
  g.add(mirrorZ(midRight))

  const hindRight = leg(
    { base: [-0.15, -0.2, 0.5], femur: 0.55, tibia: 0.5, tarsus: 0.26, thickness: 0.055, splay: 26, sweep: 38, knee: 45 },
    legMat,
  )
  swimFringe(hindRight, hairMat, 11, 0.16)
  const hindTip = (hindRight.userData.tip as THREE.Vector3).clone()
  g.add(mirrorZ(hindRight))

  const anchors: Record<string, THREE.Vector3> = {
    palp: new THREE.Vector3(2.2, -0.14, 0.28),
    keel: new THREE.Vector3(-1.45, -0.18, 0),
    elytra: new THREE.Vector3(-0.08, 0.58, 0.45),
    eye: new THREE.Vector3(1.5, 0.18, 0.38),
    leg: hindTip,
    antenna: new THREE.Vector3(1.6, -0.05, 0.42),
  }

  return finalize(g, anchors)
}
