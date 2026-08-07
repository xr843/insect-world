/**
 * 中华豆芫菁 Epicauta chinensis（鞘翅目·芫菁科）
 *
 * 造型要点：
 * - 「大头细脖子」是芫菁科最好认的招牌：头部宽大呈心形（spindle 的
 *   bulge 靠前、flat 略 >1 让头部左右比上下更宽），向后没有自己
 *   收尖到底，而是在头部末端还留着相当的截面——真正的「急剧收缩」
 *   由紧接着的 neck 段单独完成：neck 用显式三截面 loft（同 rove-beetle
 *   的颈子手法）把半径骤降到头部最宽处的一小截，越过中点再回升一点
 *   接上前胸背板，形成沙漏状的细颈，而不是头部自己渐渐收细——两段
 *   拼接处半径的「断层」才是「夸张」的来源。
 * - 前胸背板窄圆筒形：spindle 的 taperStart/taperEnd 都取接近 1、
 *   bulge=0.5，让半径全程接近常数，读出来是一段窄管而非纺锤。
 * - 软鞘翅、后半段分开不完全盖住腹部：鞘翅不用 kit.elytra()（那个
 *   helper 把 clearcoat 定死在 0.55、gloss 定死在 0.74，是「硬亮」
 *   甲虫壳专用的观感），改用 chitin() 直接调低 gloss/clearcoat 表现
 *   「软」；几何上用自写 softElytron()——loft 的每个截面既缩半径
 *   （前半段基本不变，后半段快速收窄到近乎消失）又外移 z（后半段
 *   偏离背中线向体侧漂移），前半段两片在背中线附近相接，后半段两片
 *   分开且变薄，同时露出下方腹部的背面与侧缘。kit.segmentedAbdomen()
 *   只会给单一材质、单一路径的规则收细体，做不出「两片各自独立漂移
 *   变薄」的鞘翅，因此自写。
 * - 腹部细长、通体裸露度高：用 kit.segmentedAbdomen() 即可（这段不
 *   需要变色分段，rove-beetle 那种红黑相间在本种不适用），flat 取
 *   接近 1 保持近圆筒截面，与硬鞘翅的扁阔形成软硬对比。
 * - 六足细长：kit.legPair() 直接够用（细长只是 thickness 小、
 *   femur/tibia 拉长），但「足基部橙红」没法用 leg() 的单一材质做到
 *   （femur/tibia/tarsus/关节球共用一个 material 参数）——不改
 *   kit.ts，改用「腿本体全黑 + 基节处贴一颗橙红色小球」的办法，
 *   球半径比 leg() 自己的基节关节球略大，正好包住它，读出来是
 *   「基节橙红，往下变黑」。
 * - 触角丝状（filiform）：kit.AntennaKind 里现成的类型就够用，
 *   芫菁触角本就是简单的线状/念珠状，不必再自写念珠版本。
 * - 复眼有建但不进 anchors——题目要求的 anchor key 集合里没有 eye，
 *   建出来只为视觉完整（有头无眼看着空）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  segmentedAbdomen,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/**
 * 软鞘翅一侧：前半段贴近背中线缩窄覆盖，后半段 z 外移、半径收窄至近乎
 * 消失——两片在后半段「分开」且「变薄」，不再完全盖住腹部。
 * 每片独立命名 'elytra'，供测试取并集包围盒。
 */
function softElytron(
  from: number,
  to: number,
  side: 1 | -1,
  yPath: (t: number) => number,
  material: THREE.Material,
): THREE.Mesh {
  const steps = 16
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(from, to, t)
    // 前半段 z 偏移随体宽缓慢增加（贴合腹部渐宽的轮廓），
    // 后半段偏移加速外移——两片「翻开」露出腹部背面。
    const zOffset = t <= 0.5 ? THREE.MathUtils.lerp(0.05, 0.078, t / 0.5) : THREE.MathUtils.lerp(0.078, 0.155, (t - 0.5) / 0.5)
    // 半径：前半段基本维持覆盖宽度，后半段迅速收窄到近乎消失（薄而软的翻边）
    const r = t <= 0.5 ? THREE.MathUtils.lerp(0.09, 0.084, t / 0.5) : THREE.MathUtils.lerp(0.084, 0.016, (t - 0.5) / 0.5)
    sections.push({
      at: new THREE.Vector3(x, yPath(t), side * zOffset),
      ry: Math.max(r * 0.62, 1e-4),
      rz: Math.max(r, 1e-4),
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 14), material)
  mesh.name = 'elytra'
  return mesh
}

/** 鞘翅上的灰白色细条纹：贴着鞘翅表面走的一根细管，只做视觉点缀 */
function elytronStripe(from: number, to: number, side: 1 | -1, zBias: number, yPath: (t: number) => number, material: THREE.Material): THREE.Mesh {
  const steps = 12
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(from, to, t)
    const zOffset = (t <= 0.5 ? THREE.MathUtils.lerp(0.05, 0.078, t / 0.5) : THREE.MathUtils.lerp(0.078, 0.155, (t - 0.5) / 0.5)) * zBias
    const r = (t <= 0.5 ? 1 : THREE.MathUtils.lerp(1, 0.15, (t - 0.5) / 0.5)) * 0.012
    sections.push({ at: new THREE.Vector3(x, yPath(t) + 0.012, side * zOffset), ry: r, rz: r })
  }
  return new THREE.Mesh(loft(sections, 8), material)
}

// ---------------------------------------------------------------- 主体

export function buildBlisterBeetle(): InsectModel {
  const g = new THREE.Group()

  const headMat = chitin({ color: '#c2481c', gloss: 0.42, clearcoat: 0.18 }) // 头部橙红
  const pronotumMat = chitin({ color: '#100d0a', gloss: 0.4, clearcoat: 0.2 })
  const elytraMat = chitin({ color: '#0e0c0a', gloss: 0.3, clearcoat: 0.14 }) // 软鞘翅：高 roughness、低 clearcoat
  const stripeMat = chitin({ color: '#c7c4ba', gloss: 0.28, clearcoat: 0.05 }) // 灰白纵条纹
  const abdomenMat = chitin({ color: '#151210', gloss: 0.34, clearcoat: 0.08 })
  const legMat = chitin({ color: '#0c0a08', gloss: 0.4, clearcoat: 0.16 })
  const coxaMat = chitin({ color: '#c2481c', gloss: 0.4, clearcoat: 0.16 }) // 足基部橙红
  const antennaMat = chitin({ color: '#181310', gloss: 0.3 })
  const eyeColor = '#0a0908'

  // ---- 头部：宽大心形，bulge 靠前，flat 略 >1 令左右宽于上下
  const headFrontX = 1.16
  const headBackX = 0.96
  const headMesh = new THREE.Mesh(
    spindle([headFrontX, 0.01, 0], [headBackX, 0.0, 0], 0.19, { bulge: 0.36, flat: 1.08, taperStart: 0.36, taperEnd: 0.56 }),
    headMat,
  )
  headMesh.name = 'head'
  g.add(headMesh)

  // ---- 颈：三截面沙漏状细颈，半径骤降到头部最宽处的一小截
  // 这是本种的招牌：与头部自身的截面在 headBackX 附近形成明显断层。
  // neckFrom.x 比 headBackX 略靠前（往头部方向重叠一点点，同
  // tortoise-beetle.ts 里前胸背板/鞘翅接缝用的重叠手法）：head 和 neck
  // 都是 loft() 独立生成、两端各自默认加端盖的实体，若 neckFrom 恰好
  // 落在 headBackX 上，头部端盖（半径~0.10）与颈部端盖（半径 0.06）会
  // 共面但大小不等，产生一圈可见的共面 z-fighting；重叠一点让颈部
  // 的管身直接扎进头部已有的体积里，头部端盖被颈部管身盖住，不再暴露。
  const neckOverlap = 0.02
  const neckFrom = new THREE.Vector3(headBackX + neckOverlap, 0.004, 0)
  const neckMid = new THREE.Vector3((headBackX + 0.78) / 2, -0.006, 0)
  const neckTo = new THREE.Vector3(0.78, 0.0, 0)
  const neckMesh = new THREE.Mesh(
    loft(
      [
        { at: neckFrom, ry: 0.06, rz: 0.06 },
        { at: neckMid, ry: 0.035, rz: 0.035 },
        { at: neckTo, ry: 0.058, rz: 0.058 },
      ],
      16,
    ),
    headMat,
  )
  neckMesh.name = 'neck'
  g.add(neckMesh)

  // ---- 前胸背板：窄圆筒形，taperStart/taperEnd 接近 1 让半径全程近常数。
  // from 同样比 neckTo（0.78）略靠前重叠一点，理由同上——颈部端盖
  // 被前胸背板的管身覆盖，不会露出共面的小圆盘。
  const pronotumMesh = new THREE.Mesh(
    spindle([0.78 + neckOverlap, -0.004, 0], [0.5, 0.006, 0], 0.075, { bulge: 0.5, flat: 1.0, taperStart: 0.82, taperEnd: 0.82 }),
    pronotumMat,
  )
  g.add(pronotumMesh)

  // ---- 腹部：细长分节，flat 接近 1 保持近圆筒截面（与硬鞘翅的扁阔对比）
  const abdomenFromX = 0.5
  const abdomenToX = -0.95
  const abdomenMesh = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFromX, 0.006, 0],
      to: [abdomenToX, 0.03, 0],
      r0: 0.11,
      r1: 0.02,
      segments: 8,
      groove: 0.16,
      flat: 1.02,
      bulge: 0.16,
    }),
    abdomenMat,
  )
  abdomenMesh.name = 'abdomen'
  g.add(abdomenMesh)

  // ---- 软鞘翅：覆盖腹部前 ~60%，后半段分开变薄，露出腹部背侧
  const elytronXFrom = 0.5
  const elytronXTo = -0.35
  const elytraYPath = (t: number) => 0.05 - 0.015 * t
  for (const side of [1, -1] as const) {
    g.add(softElytron(elytronXFrom, elytronXTo, side, elytraYPath, elytraMat))
    g.add(elytronStripe(elytronXFrom, elytronXTo, side, 0.42, elytraYPath, stripeMat))
    g.add(elytronStripe(elytronXFrom, elytronXTo, side, 0.82, elytraYPath, stripeMat))
  }

  // ---- 小盾片：两鞘翅基部之间的三角小片
  g.add(
    new THREE.Mesh(
      spindle([0.51, 0.05, 0], [0.46, 0.058, 0], 0.014, { bulge: 0.2, flat: 1.3, taperStart: 0.9, taperEnd: 0.1 }),
      elytraMat,
    ),
  )

  // ---- 复眼：视觉完整用，不进 anchors
  const eyeAt: [number, number, number] = [1.08, 0.045, 0.14]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.05, color: eyeColor, flatten: 0.82, facets: false }))

  // ---- 丝状触角
  const antBase: [number, number, number] = [1.12, 0.05, 0.09]
  const antLength = 0.44
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'filiform', pitch: 26, yaw: 30, thickness: 0.018 }, antennaMat))

  // ---- 六足：细长。腿本体全黑，基节处叠一颗橙红小球表现「足基部橙红」
  const legSpecs: LegSpec[] = [
    { base: [0.56, -0.05, 0.08], femur: 0.3, tibia: 0.28, tarsus: 0.15, thickness: 0.021, splay: 36, sweep: -26, knee: 58 },
    { base: [0.46, -0.055, 0.085], femur: 0.32, tibia: 0.3, tarsus: 0.16, thickness: 0.022, splay: 34, sweep: 8, knee: 60 },
    { base: [0.34, -0.055, 0.08], femur: 0.33, tibia: 0.31, tarsus: 0.16, thickness: 0.022, splay: 38, sweep: 38, knee: 62 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  for (const spec of legSpecs) {
    for (const side of [1, -1] as const) {
      const coxa = new THREE.Mesh(new THREE.SphereGeometry(spec.thickness! * 1.85, 12, 10), coxaMat)
      coxa.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
      g.add(coxa)
    }
  }
  const frontLegTip = (legRigs[0].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    head: new THREE.Vector3(headFrontX - 0.1, 0.09, 0.1),
    neck: neckMid.clone().add(new THREE.Vector3(0, 0.03, 0.035)),
    elytra: new THREE.Vector3(0.1, 0.075, 0.1),
    antenna: new THREE.Vector3(antBase[0] + antLength * 0.55, antBase[1] + 0.08, antBase[2] + 0.1),
    leg: frontLegTip.clone(),
    abdomen: new THREE.Vector3(-0.65, 0.09, 0.05),
  }

  return finalize(g, anchors)
}
