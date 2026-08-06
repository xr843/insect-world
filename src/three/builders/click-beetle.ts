/**
 * 沟叩头虫 Agrypnus binodulus（鞘翅目·叩甲科）
 *
 * 造型要点：
 * - 细长舟形体躯：两头略尖、中段最宽，整体扁平流线，长宽比约 3:1。
 *   spindle() 的 taperStart/taperEnd 都调得很低（两端都收尖，不同于
 *   蜣螂的两端敦实），flat 调高做出扁平横截面。三对足特意收在高
 *   splay（更立式、贴身），既符合叩甲「遇险收足装死」的真实习性，
 *   也不让伸展的足把整体包围盒的宽度撑爆——kit.leg() 的 splay 实测
 *   语义是「越大越贴身收拢、越小越向外摊开」（数值越大 tip 的侧向
 *   分量越小），与 kit.ts 文档字面写的「0=贴体，90=完全侧展」正好
 *   相反，这里按实测行为取数，不按文档字面。
 * - 前胸背板后角向后延伸成一对尖锐刺突，超出鞘翅基部——这是叩甲科
 *   最具辨识度的背面轮廓特征。刺突的起点特意放在比鞘翅基部更靠前
 *   （x 更大）的位置，让「有没有刺突」真正决定测试的通过与否：
 *   删掉刺突（刺尖收回到起点）时起点本身就应比鞘翅基部更靠前，
 *   测试会正确地失败。
 * - 腹面弹跳机制：前胸腹突（一根向后的刺）插入中胸凹槽，是叩甲
 *   「咔嗒」弹跳的力学来源。背面看不见，因此 clickSpine 锚点按题目
 *   要求放在体侧偏腹面、实际能看到的位置，而不是刺本身的隐藏位置。
 * - 体色深褐近黑，密被短绒毛（用低 gloss/高 roughness 表现），
 *   鞘翅缀纵向浅沟（叩甲的「沟」）。锯齿状触角，kit 没有专门的
 *   「锯齿状」触角类型，用 'pectinate' 近似（同属"齿状"大类，
 *   真正的黄褐色羽枝长度已经通过较小的 length 收窄，读起来接近
 *   锯齿而非长羽状）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/** 沿放样路径某个固定 theta 角贴面拉一条细管——鞘翅纵沟。复用与
 * loft() 同一套法线公式（除半径倒数、乘另一半径），保证贴住曲面。 */
function surfaceGroove(
  sections: Section[],
  centers: THREE.Vector3[],
  zSideOffset: number,
  theta: number,
  tubeR: number,
  material: THREE.Material,
  iFrom: number,
  iTo: number,
): THREE.Mesh {
  const pts: Section[] = []
  for (let i = iFrom; i <= iTo; i++) {
    const sec = sections[i]
    const c = centers[i]
    const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
    const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
    const normal = new THREE.Vector3(0, nx, nz).normalize()
    const pos = new THREE.Vector3(c.x, c.y + Math.cos(theta) * sec.ry, zSideOffset + Math.sin(theta) * sec.rz).addScaledVector(
      normal,
      0.008,
    )
    pts.push({ at: pos, ry: tubeR, rz: tubeR })
  }
  return new THREE.Mesh(loft(pts, 6), material)
}

// ---------------------------------------------------------------- 主体

export function buildClickBeetle(): InsectModel {
  const g = new THREE.Group()

  // 深褐近黑，低 gloss 表现绒毛质感；不用 elytra()（固定 gloss=0.74
  // 偏亮），叩甲不是吉丁那种亮甲，clearcoat 仍压在安全范围内。
  const bodyMat = chitin({ color: '#1c130d', gloss: 0.24, clearcoat: 0.14 })
  const shellMat = chitin({ color: '#241a12', gloss: 0.3, clearcoat: 0.2 })
  const grooveMat = chitin({ color: '#100b07', gloss: 0.2, clearcoat: 0.1 })
  const legMat = chitin({ color: '#150f0a', gloss: 0.3, clearcoat: 0.16 })
  const spineMat = chitin({ color: '#0d0a07', gloss: 0.34, clearcoat: 0.2 })

  // ---- 腹面体躯：两端都收尖（taperStart/taperEnd 都低），flat 调高
  const belly = new THREE.Mesh(
    spindle([-1.6, 0.0, 0], [1.05, 0.02, 0], 0.34, { bulge: 0.42, flat: 1.3, taperStart: 0.06, taperEnd: 0.15 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：延续舟形轮廓，纵向浅沟
  const eSteps = 22
  const elytronSections: Section[] = []
  const elytronCenters: THREE.Vector3[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.58) * Math.PI * 0.95) * 0.4
    const c = new THREE.Vector3(0.5 - 2.2 * t, 0.22 - 0.05 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.55, 0.012), rz: Math.max(w * 0.62, 0.012) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 24), shellMat)
    shell.position.z = side * 0.16
    shell.name = 'elytra'
    g.add(shell)

    for (const theta of [-1.0, -0.5, 0, 0.5, 1.0]) {
      g.add(surfaceGroove(elytronSections, elytronCenters, side * 0.16, theta, 0.011, grooveMat, 2, eSteps - 2))
    }
  }

  // ---- 小盾片
  const scutellum = new THREE.Mesh(
    spindle([0.5, 0.24, 0], [0.35, 0.26, 0], 0.09, { bulge: 0.15, flat: 1.3, taperStart: 0.85, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：与鞘翅之间用略微收窄暗示活动关节
  const pronotum = new THREE.Mesh(
    spindle([0.55, 0.02, 0], [1.2, 0.06, 0], 0.4, { bulge: 0.62, flat: 1.25, taperStart: 0.68, taperEnd: 0.5 }),
    bodyMat,
  )
  pronotum.name = 'trunk'
  g.add(pronotum)

  // ---- 前胸背板后角刺突：一对尖锐刺突从前胸背板后缘两侧向后伸出，
  // 起点 x=0.55 特意比鞘翅基部 x=0.5 更靠前（更大），因此刺突的
  // 「延伸量」才是让 tip.x < elytraBase.x 成立的唯一原因——去掉
  // 刺突（尖端收回到起点 0.55）时 0.55 > 0.5，测试会正确地失败。
  const spineOriginX = 0.55
  const spineOriginZ = 0.34
  const spineOriginY = 0.1
  const spineLen = 0.38
  for (const side of [1, -1] as const) {
    const p0 = new THREE.Vector3(spineOriginX, spineOriginY, side * spineOriginZ)
    const p1 = new THREE.Vector3(spineOriginX - spineLen * 0.55, spineOriginY - 0.015, side * (spineOriginZ + 0.06))
    const tip = new THREE.Vector3(spineOriginX - spineLen, spineOriginY - 0.025, side * (spineOriginZ + 0.02))
    const spine = new THREE.Mesh(
      loft(
        [
          { at: p0, ry: 0.06, rz: 0.06 },
          { at: p1, ry: 0.038, rz: 0.038 },
          { at: tip, ry: 0.004, rz: 0.004 },
        ],
        10,
      ),
      spineMat,
    )
    spine.name = 'pronotum-spine'
    g.add(spine)
  }

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([1.18, 0.03, 0], [1.55, 0.05, 0], 0.24, { bulge: 0.4, flat: 1.05, taperStart: 0.6, taperEnd: 0.35 }),
    bodyMat,
  )
  head.name = 'trunk'
  g.add(head)

  // ---- 复眼
  g.add(compoundEyePair({ at: [1.32, 0.09, 0.19], radius: 0.06, color: '#0a0806', flatten: 0.85, facets: true }))

  // ---- 锯齿状触角：kit 没有专门的 serrate 类型，用 pectinate 近似，
  // 收窄 length 让齿感更接近锯齿而非长羽状
  g.add(antennaPair({ base: [1.28, 0.08, 0.14], length: 0.4, kind: 'pectinate', pitch: 18, yaw: 34, thickness: 0.02 }, legMat))

  // ---- 三对足：splay 调高使其贴身收拢（实测越大越贴身，见文件头
  // 注释），femur/tibia 也偏短——既是「装死收足」的真实习性，
  // 也让整体包围盒不至于被伸展的足撑宽
  const legSpecs: LegSpec[] = [
    { base: [0.75, -0.06, 0.2], femur: 0.3, tibia: 0.32, tarsus: 0.12, thickness: 0.03, splay: 62, sweep: -30, knee: 60 },
    { base: [0.15, -0.08, 0.22], femur: 0.32, tibia: 0.34, tarsus: 0.13, thickness: 0.032, splay: 60, sweep: 6, knee: 62 },
    { base: [-0.45, -0.08, 0.2], femur: 0.3, tibia: 0.32, tarsus: 0.12, thickness: 0.03, splay: 58, sweep: 38, knee: 64 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  legRigs[1].name = 'leg-rig'
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  // ---- 腹面弹跳机制：前胸腹突刺入中胸凹槽，从背面看不见
  const clickBase = new THREE.Vector3(0.58, -0.06, 0)
  const clickTip = new THREE.Vector3(0.24, -0.13, 0)
  const clickMesh = new THREE.Mesh(
    loft([{ at: clickBase, ry: 0.045, rz: 0.042 }, { at: clickTip, ry: 0.008, rz: 0.008 }], 10),
    spineMat,
  )
  clickMesh.name = 'click-mechanism'
  g.add(clickMesh)

  const groove = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), bodyMat)
  groove.scale.set(1.1, 0.26, 0.7)
  groove.position.set(0.1, -0.08, 0)
  g.add(groove)

  const anchors: Record<string, THREE.Vector3> = {
    pronotum: new THREE.Vector3(0.85, 0.4, 0),
    // 体侧偏腹面、实际能看到的位置（不是刺本身贴着中线的隐藏位置）
    clickSpine: new THREE.Vector3(0.42, -0.02, 0.26),
    elytra: new THREE.Vector3(-0.9, 0.26, 0.2),
    antenna: new THREE.Vector3(1.55, 0.22, 0.32),
    eye: new THREE.Vector3(1.32, 0.13, 0.24),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
