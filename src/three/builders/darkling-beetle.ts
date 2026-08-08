/**
 * 甘肃鳖甲 Anatolica sp.（鞘翅目·拟步甲科，荒漠地表种）
 *
 * 造型要点：
 * - 「鳖甲」得名于两片鞘翅在中缝完全愈合成一整块无缝硬壳、鞘翅下也
 *   没有后翅（终生不能飞）——这是拟步甲荒漠类群最本质的适应，也是
 *   本文件与其它所有甲虫 builder 最大的结构差异：其它 builder 的鞘翅
 *   都是「两片独立放样、以 shell.position.z=±halfWidth 分开装配」
 *   （见 ground-beetle.ts/rhinoceros-beetle.ts/hercules-beetle.ts 等，
 *   无一例外），本文件反过来只放样一次、sections 直接以 z=0 为共享
 *   中心（不做 ±zOffset 的两侧偏移），天生就是一块连续曲面，不存在
 *   「两片壳凑起来看着像一片」的近似——这是唯一能让「单个 mesh」这个
 *   断言在几何层面自然成立的写法，不是事后拼接或删掉接缝线。
 * - 鞘翅侧缘明显下包、把腹部完全罩住（暗示鞘翅与腹部之间的封闭空腔，
 *   减少水分蒸发）：穹顶的半宽（rz）在最宽处明显超过 abdomen 基座
 *   自身的半宽，且穹顶中心高度 domeCenterY 压得很接近 abdomen 的
 *   中心高度（不像其它甲虫的鞘翅那样"悬浮"在腹部上方一大截）——两者
 *   叠加，穹顶的"赤道"（theta=90°/270° 那圈最外侧点）在 Y 方向落在
 *   abdomen 自身侧缘的高度附近甚至更低，视觉上读成"整个腹部被扣在
 *   壳下面"而不是"壳像帐篷一样撑在腹部上方"。
 * - 极高的足：真实的荒漠拟步甲（本种取材自 Anatolica 及同类群
 *   Onymacris 一类的公认体态）用近乎伸直的长腿把身体撑离滚烫沙面。
 *   这里有一个容易踩的反直觉点，已经用本文件的实际数值验证过——
 *   kit.leg() 的 knee 参数并不是"越小越直立"：knee 决定胫节方向从
 *   "沿股节方向延伸"（knee→0，胫节几乎不向下折，反而继续向外上方，
 *   触不到地面）到"折向正下方"（knee→90°，胫节近乎垂直下插）之间
 *   插值。ground-beetle.ts 的注释「knee 角度压低=更直立」说的是
 *   "整条腿不折叠、保持接近一条直线地向外伸展"（优化的是 3D 直线
 *   reach），而本文件要的是"整条腿近乎一条直线地向下伸展"（优化的是
 *   垂直方向的净落差）——两者需要的 knee 方向刚好相反：本文件反而
 *   要开大 knee（本文件取 74~78°，明显大于 ground-beetle 的
 *   32~36°），让胫节真正折向地面，再配合较长的 femur/tibia/tarsus，
 *   才能撑出"体腹面离地距离≈体高"的踮脚站姿。这个反直觉点已经用
 *   __tests__/beetles7.test.ts 的真实几何测量钉住，不是凭直觉设的参数。
 * - 体色乌黑哑光：不走 kit.elytra()（内定 gloss 0.74 + clearcoat 0.55，
 *   是"清漆下的釉质光泽"，专给鞘翅硬壳用），本文件全身统一用低
 *   gloss、零 clearcoat 的 chitin()，模拟荒漠甲虫体表蜡质层（epicuticular
 *   wax bloom）特有的哑光质感——这层蜡本身也是真实的减少失水适应，
 *   与鞘翅愈合是同一套生存逻辑的两个侧面。
 * - 细微纵向棱：穹顶上加 3 条极轻的纵向隆起，幅度远小于 ground-beetle
 *   的三条主脊，且材质与穹顶本体相同（同一份哑光黑，不另开高光材质），
 *   只靠几何起伏提示纹理，不破坏"表面光滑无缝"的整体读法。
 */
import * as THREE from 'three'
import { antennaPair, chitin, finalize, legPair, loft, spindle, type InsectModel, type LegSpec, type Section } from './kit'

// ---------------------------------------------------------------- 局部工具

/** 沿放样截面反推曲面坐标；本文件的鞘翅是单一共享坐标系（zOffset 恒为 0），不做左右两侧偏移。 */
function surfaceAt(
  sections: Section[],
  centers: THREE.Vector3[],
  t: number,
  thetaDeg: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const n = sections.length
  const idx = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))))
  const sec = sections[idx]
  const center = centers[idx]
  const theta = THREE.MathUtils.degToRad(thetaDeg)
  const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, center.z + Math.sin(theta) * sec.rz)
  const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
  const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  return { pos, normal }
}

/** 穹顶上一条极轻的纵向棱：同 ground-beetle.elytraRidge() 手法，半径压得很小，双侧对称（theta 取正负）。 */
function domeRidge(
  sections: Section[],
  centers: THREE.Vector3[],
  thetaDeg: number,
  tFrom: number,
  tTo: number,
  ridgeR: number,
  material: THREE.Material,
): THREE.Mesh {
  const n = sections.length
  const iFrom = Math.round(tFrom * (n - 1))
  const iTo = Math.round(tTo * (n - 1))
  const theta = THREE.MathUtils.degToRad(thetaDeg)
  const pts: Section[] = []
  for (let i = iFrom; i <= iTo; i++) {
    const sec = sections[i]
    const c = centers[i]
    const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
    const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
    const normal = new THREE.Vector3(0, nx, nz).normalize()
    const pos = new THREE.Vector3(c.x, c.y + Math.cos(theta) * sec.ry, c.z + Math.sin(theta) * sec.rz).addScaledVector(
      normal,
      ridgeR * 0.7 + 0.003,
    )
    const localT = (i - iFrom) / Math.max(1, iTo - iFrom)
    const taper = Math.sin(Math.min(1, Math.max(0, localT)) * Math.PI)
    const r = Math.max(ridgeR * (0.35 + 0.65 * taper), 0.0008)
    pts.push({ at: pos, ry: r, rz: r })
  }
  return new THREE.Mesh(loft(pts, 6), material)
}

// ---------------------------------------------------------------- 主体

export function buildDarklingBeetle(): InsectModel {
  const g = new THREE.Group()

  // 全身统一哑光黑：低 gloss、零/极低 clearcoat，不用 elytra() 的釉质路线
  const matteBlack = chitin({ color: '#111110', gloss: 0.14, metal: 0.02, clearcoat: 0.03 })
  // B3 刻点组：甲壳（愈合无缝的鞘翅硬壳，即 fusedElytra + 其纵向棱）单独
  // 一份材质挂 punctate，哑光维持——gloss/metal/clearcoat 与 matteBlack
  // 完全相同，只多一个 surface 选项；abdomen/pronotum/head 仍用不带纹理
  // 的 matteBlack，不跟着牵动。
  const shellMat = chitin({ color: '#111110', gloss: 0.14, metal: 0.02, clearcoat: 0.03, surface: 'punctate' })
  const legMat = chitin({ color: '#0d0c0b', gloss: 0.16, metal: 0.02, clearcoat: 0.04 })
  const antennaMat = chitin({ color: '#131211', gloss: 0.15 })

  // ---- 腹部/胸腹基座：大半被鞘翅罩住，只在两端露出一点点。命名
  // 'abdomen'，供测试量取"体腹面离地距离"的参照高度。
  const abdomenFrom: [number, number, number] = [-0.88, 0.09, 0]
  const abdomenTo: [number, number, number] = [0.16, 0.11, 0]
  const abdomen = new THREE.Mesh(
    spindle(abdomenFrom, abdomenTo, 0.3, { bulge: 0.42, flat: 1.15, taperStart: 0.16, taperEnd: 0.45 }),
    matteBlack,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 鞘翅：单一放样、z=0 共享坐标系，天生一整块，无中缝。半宽在
  // 最宽处（rz 峰值 ≈0.53）明显超过 abdomen 半宽（≈0.345），且穹顶
  // 中心 y（0.24）只比 abdomen 中心 y（0.09~0.11）高一截而非悬浮很高——
  // 两者共同做出"鞘翅侧缘下包、罩住腹部"的读法（见文件头注释）。
  const eSteps = 32
  const eFrom = 0.3
  const eTo = -0.97
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.56) * Math.PI * 0.94)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.24 - 0.05 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.44, 0.015), rz: Math.max(w * 0.53, 0.015) })
  }
  const fusedElytra = new THREE.Mesh(loft(elytronSections, 34), shellMat)
  fusedElytra.name = 'fusedElytra'
  g.add(fusedElytra)

  // 3 条极轻纵向棱，双侧对称，材质与穹顶本体相同（同一份哑光黑参数，
  // 仅多刻点纹理，不额外开高光材质）
  for (const theta of [22, 0, -22]) {
    g.add(domeRidge(elytronSections, elytronCenters, theta, 0.1, 0.88, 0.012, shellMat))
  }

  // ---- 前胸背板：小而低调（不是本种视觉重点），衔接头与鞘翅前缘
  const pronotum = new THREE.Mesh(
    spindle([0.14, 0.16, 0], [0.32, 0.19, 0], 0.19, { bulge: 0.46, flat: 1.05, taperStart: 0.6, taperEnd: 0.55 }),
    matteBlack,
  )
  pronotum.name = 'pronotum'
  g.add(pronotum)

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([0.3, 0.17, 0], [0.56, 0.185, 0], 0.155, { bulge: 0.42, flat: 1.02, taperStart: 0.6, taperEnd: 0.32 }),
    matteBlack,
  )
  head.name = 'head'
  g.add(head)

  // ---- 复眼：小、不设专属 anchor（本种最具辨识度的特征是鞘翅与足，
  // 复眼只作为视觉补全，同 hercules-beetle.ts"未设专属 anchor"的先例）
  const eyeMat = chitin({ color: '#08070a', gloss: 0.3 })
  for (const side of [1, -1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 8), eyeMat)
    eye.scale.set(1, 0.82, 0.82)
    eye.position.set(0.47, 0.195, side * 0.1)
    g.add(eye)
  }

  // ---- 丝状触角，荒漠拟步甲的通用特征
  g.add(antennaPair({ base: [0.52, 0.18, 0.06], length: 0.42, kind: 'filiform', pitch: 10, yaw: 30, thickness: 0.014 }, antennaMat))

  // ---- 六足：极高、近乎伸直——knee 开大（74~78°）让胫节真正折向
  // 地面，配合较长的 femur/tibia/tarsus，撑出"腹面离地≈体高"的
  // 踮脚站姿（数值依据见文件头注释，已用真实测量校准）。
  const legSpecs: LegSpec[] = [
    { base: [0.18, 0.02, 0.24], femur: 0.76, tibia: 0.78, tarsus: 0.32, thickness: 0.03, splay: 28, sweep: -24, knee: 76, ankle: 30 },
    { base: [-0.2, 0.0, 0.26], femur: 0.82, tibia: 0.82, tarsus: 0.34, thickness: 0.032, splay: 27, sweep: 4, knee: 78, ankle: 30 },
    { base: [-0.58, 0.0, 0.24], femur: 0.78, tibia: 0.8, tarsus: 0.33, thickness: 0.031, splay: 28, sweep: 30, knee: 76, ankle: 30 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  legRigs[1].name = 'stilt-leg-rig'
  ;(legRigs[1].children[0] as THREE.Group).userData.hip = new THREE.Vector3(...legSpecs[1].base)
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    fusedElytra: surfaceAt(elytronSections, elytronCenters, 0.42, 0).pos,
    leg: midLegTip.clone(),
    head: new THREE.Vector3(0.5, 0.28, 0),
    antenna: new THREE.Vector3(0.9, 0.32, 0.2),
    pronotum: surfaceAt(elytronSections, elytronCenters, 0.03, 0).pos.clone().add(new THREE.Vector3(0, 0.02, 0)),
    abdomen: new THREE.Vector3(abdomenFrom[0] + 0.1, abdomenFrom[1] - 0.15, 0.2),
  }

  return finalize(g, anchors)
}
