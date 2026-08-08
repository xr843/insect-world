/**
 * 榆蓝叶甲 Pyrrhalta aenescens（鞘翅目·叶甲科 Chrysomelidae）
 *
 * 造型要点：
 * - 短圆体型：近乎正圆的卵形，长宽比约 1.4:1——比瓢虫（ladybird.ts 实测
 *   约 1.17:1，"近乎正圆"）略长，但仍是"圆润饱满"这一路，不是长卵形。
 *   沿用 ladybird.ts 首创的"平底圆顶"手法（domeSections/humpProfile：
 *   路径中心的 y 随半径同步抬升，让椭圆截面的底边始终贴在 groundY 这
 *   条线上，只有顶部随半径起伏）——kit.spindle()/segmentedAbdomen() 都
 *   是关于路径中心对称的椭圆截面，两端必然收尖，做不出"平底圆顶"这种
 *   半球轮廓。两个物种共用同一套局部工具函数（本文件独立复制一份并按
 *   自己的尺度调参，同 tortoise-beetle.ts 的做法，不去改 ladybird.ts）。
 *   __tests__/round5a.test.ts 直接量渲染出来的包围盒 X/Z 比例，不复述
 *   构造常量。
 * - 高饱和金属蓝绿色鞘翅：叶甲科很多种类（包括本种）鞘翅有虹彩金属光泽，
 *   用 kit.elytra() 的清漆+金属路线，metal 给在 0.4~0.6 区间。⚠️ 记住
 *   kit.ts 的告诫——ACES 色调映射会显著提亮去饱和，基色要比"想要的观感"
 *   压深一档，本文件的深墨绿蓝基色渲染后才会读成"高饱和蓝绿金属色"，
 *   不是暗色。
 * - 细密刻点行：鞘翅表面成列的细小凹点（punctate striae），复用 ladybird
 *   的 domeSurfacePoint()（曲面上某点的位置与法线）+ spotPatch()（把小球
 *   沿法线压扁贴在曲面上）手法，但点做得远比瓢虫的黑斑小、密度高得多、
 *   颜色只比底色略深（不是纯黑），读出来是"刻点"而不是"斑点"。
 * - 前胸背板橙黄色，中央一对黑斑，与鞘翅的蓝绿冷色形成暖/冷对比——这也
 *   是本种野外辨识的关键特征之一。
 * - 六足短小、丝状触角中等长度：整体依旧走"圆滚滚"路线，附肢不能把
 *   包围盒撑得太宽/太长，否则会破坏"短圆"这个核心特征。
 * - ⚠️ 返工记录：本轮改了 elytraMat/pronotumMat 颜色——上一版鞘翅基色
 *   #0b3d3f 压得太深，实机渲染接近纯黑，看不出蓝绿；前胸背板原为高饱和
 *   纯橙，与深色鞘翅并置像塑料件，改偏黄褐的自然色调。详见下方材质注释。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助（同 ladybird.ts 的"平底圆顶"手法）

/** 半径包络：从 startR 经 sin 缓动升到 maxR（bulge 处），再经 cos 缓动降到 endR */
function humpProfile(bulge: number, startR: number, maxR: number, endR: number): (t: number) => number {
  return (t: number) => {
    if (t <= bulge) {
      const k = bulge <= 1e-6 ? 1 : Math.min(1, t / bulge)
      return THREE.MathUtils.lerp(startR, maxR, Math.sin(k * Math.PI * 0.5))
    }
    const k = Math.min(1, (t - bulge) / (1 - bulge))
    return THREE.MathUtils.lerp(maxR, endR, 1 - Math.cos(k * Math.PI * 0.5))
  }
}

/** "平底圆顶"截面组：底边始终贴在 groundY，只有顶部随半径起伏。 */
function domeSections(xFrom: number, xTo: number, groundY: number, profile: (t: number) => number, aspect: number, steps: number): Section[] {
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(profile(t), 1e-4)
    sections.push({ at: new THREE.Vector3(THREE.MathUtils.lerp(xFrom, xTo, t), groundY + r, 0), ry: r, rz: r * aspect })
  }
  return sections
}

/** 圆顶曲面上某一点的位置与法线：theta=0 为正背中线最高点，theta 越大越靠外侧。 */
function domeSurfacePoint(
  xFrom: number,
  xTo: number,
  groundY: number,
  profile: (t: number) => number,
  aspect: number,
  t: number,
  thetaDeg: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const r = profile(t)
  const theta = THREE.MathUtils.degToRad(thetaDeg)
  const cx = THREE.MathUtils.lerp(xFrom, xTo, t)
  const cy = groundY + r
  const pos = new THREE.Vector3(cx, cy + r * Math.cos(theta), r * aspect * Math.sin(theta))
  const normal = new THREE.Vector3(0, Math.cos(theta), Math.sin(theta)).normalize()
  return { pos, normal }
}

/** 贴合曲面的小圆点：把小球沿法线方向压扁，紧贴在曲面上（刻点/斑点通用）。 */
function spotPatch(pos: THREE.Vector3, normal: THREE.Vector3, radius: number, thinness: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), material)
  m.position.copy(pos).addScaledVector(normal, radius * thinness * 0.5 + 0.002)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  m.scale.set(1, 1, thinness)
  return m
}

// ---------------------------------------------------------------- 主体

export function buildLeafBeetle(): InsectModel {
  const g = new THREE.Group()

  // ⚠️⚠️ 返工记录：#0b3d3f 实机渲染接近纯黑，看不出任何蓝绿——"基色要
  // 比想要的观感压深一档"这条经验在这里被执行过头了：压到这个深度，
  // ACES 提亮的幅度不足以拉回"看得出色相"的区间，尤其 metal=0.5 时大
  // 部分观感由环境反射的明暗调制，固有色太暗就没有可供反射调制的底
  // 子。现提到一个实测能明确读出蓝绿的档位（仍比直觉上"已经够蓝绿"的
  // 色值更深一些，金属材质需要一点余量防止高光整片过曝）。刻点构造与
  // "只比底色略深"的相对关系都不动。
  // B 轮：中虹彩蓝绿底（叠在已有金属底色之上），档位同 flower-chafer——
  // iridescence 手动降到 0.5，IOR/厚度域仍用 kit 默认。刻点几何/贴面不动。
  const elytraMat = elytra('#1c8a8f', 0.5, { iridescent: true })
  elytraMat.iridescence = 0.5
  const punctureMat = chitin({ color: '#062527', gloss: 0.6, metal: 0.35, clearcoat: 0.4 }) // 刻点：只比底色略深
  // 前胸背板改偏黄褐的自然色调：原 #c9791a 饱和度过高，与深色鞘翅并置
  // 观感像塑料件；现降饱和度、略调整明度，读出昆虫外骨骼该有的哑光
  // 质感而不是塑料玩具的高饱和亮橙。
  const pronotumMat = chitin({ color: '#9c7a3f', gloss: 0.42, clearcoat: 0.22 })
  const pronotumSpotMat = chitin({ color: '#140f0a', gloss: 0.55, clearcoat: 0.3 })
  const headMat = chitin({ color: '#171210', gloss: 0.5, clearcoat: 0.3 })
  const legMat = chitin({ color: '#211a14', gloss: 0.38, clearcoat: 0.18 })
  const antennaMat = chitin({ color: '#2c2013', gloss: 0.34 })

  const groundY = -0.15 // 腹面基准线

  // ---- 鞘翅：单一对称"平底圆顶"（不像多数甲虫那样左右两片分建），
  // 长宽比目标 ~1.4:1，比瓢虫（约 1.17:1）略长但仍圆润饱满
  const elytraFrom = 0.08
  const elytraTo = -0.34
  const elytraAspect = 1.0
  const elytraProfile = humpProfile(0.35, 0.15, 0.27, 0.045)
  const elytraSections = domeSections(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, 26)
  const elytraMesh = new THREE.Mesh(loft(elytraSections, 30), elytraMat)
  elytraMesh.name = 'elytra'
  g.add(elytraMesh)

  // ---- 细密刻点行：5 行 × 7 列，比瓢虫的黑斑小得多、密得多、颜色只略深
  for (const side of [1, -1] as const) {
    for (const theta of [10, 24, 38, 52]) {
      for (const tFrac of [0.16, 0.3, 0.44, 0.58, 0.7, 0.82]) {
        const { pos, normal } = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, tFrac, theta)
        pos.z *= side
        normal.z *= side
        g.add(spotPatch(pos, normal, 0.017, 0.3, punctureMat))
      }
    }
  }
  // 背中线一行跨中缝的刻点（theta≈2，几乎在正背中线上，左右各半行已覆盖两侧）
  for (const tFrac of [0.2, 0.36, 0.52, 0.68, 0.82]) {
    const { pos, normal } = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, tFrac, 0)
    g.add(spotPatch(pos, normal, 0.015, 0.3, punctureMat))
  }

  // ---- 前胸背板：橙黄，中央一对黑斑，与鞘翅前缘平滑重叠衔接
  const pronotumFrom = 0.3
  const pronotumTo = 0.07 // 略伸进鞘翅起点(0.08)内侧，藏住接缝
  const pronotumAspect = 1.05
  const pronotumProfile = humpProfile(0.75, 0.09, 0.185, 0.18)
  const pronotumMesh = new THREE.Mesh(loft(domeSections(pronotumFrom, pronotumTo, groundY, pronotumProfile, pronotumAspect, 16), 24), pronotumMat)
  pronotumMesh.name = 'pronotum'
  g.add(pronotumMesh)

  for (const side of [1, -1] as const) {
    const { pos, normal } = domeSurfacePoint(pronotumFrom, pronotumTo, groundY, pronotumProfile, pronotumAspect, 0.42, 30)
    pos.z *= side
    normal.z *= side
    g.add(spotPatch(pos, normal, 0.028, 0.32, pronotumSpotMat))
  }

  // ---- 头部：小而深色，大半藏在前胸背板前缘下方
  const headFrom = new THREE.Vector3(0.3, groundY + 0.13, 0)
  const headTo = new THREE.Vector3(0.42, groundY + 0.11, 0)
  g.add(
    new THREE.Mesh(
      spindle([headFrom.x, headFrom.y, headFrom.z], [headTo.x, headTo.y, headTo.z], 0.095, { bulge: 0.35, flat: 1.0, taperStart: 0.7, taperEnd: 0.12 }),
      headMat,
    ),
  )

  const eyeAt: [number, number, number] = [0.375, groundY + 0.15, 0.08]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.028, color: '#0a0808', flatten: 0.85, facets: false }))

  const antennaBase: [number, number, number] = [0.4, groundY + 0.13, 0.045]
  // 丝状、中等长度，yaw 偏大让它更朝外侧展而不是一路向前——避免把包围盒 X 撑长
  g.add(antennaPair({ base: antennaBase, length: 0.19, kind: 'filiform', pitch: 22, yaw: 46, thickness: 0.009 }, antennaMat))

  // ---- 六足：短小，紧凑
  const legFront: LegSpec = { base: [0.16, groundY + 0.02, 0.13], femur: 0.12, tibia: 0.13, thickness: 0.015, splay: 30, sweep: -10, knee: 66, ankle: 54 }
  const legMid: LegSpec = { base: [-0.02, groundY, 0.15], femur: 0.13, tibia: 0.14, thickness: 0.015, splay: 32, sweep: 8, knee: 68, ankle: 53 }
  const legHind: LegSpec = { base: [-0.19, groundY, 0.14], femur: 0.14, tibia: 0.15, thickness: 0.015, splay: 30, sweep: 32, knee: 70, ankle: 51 }
  const legRigs = [legFront, legMid, legHind].map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const elytraTop = domeSurfacePoint(elytraFrom, elytraTo, groundY, elytraProfile, elytraAspect, 0.42, 0)
  const pronotumTop = domeSurfacePoint(pronotumFrom, pronotumTo, groundY, pronotumProfile, pronotumAspect, 0.5, 0)

  const anchors: Record<string, THREE.Vector3> = {
    elytra: elytraTop.pos,
    head: new THREE.Vector3(headTo.x, headTo.y, 0),
    antenna: new THREE.Vector3(...antennaBase),
    leg: midLegTip.clone(),
    pronotum: pronotumTop.pos,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2]),
  }

  return finalize(g, anchors)
}
