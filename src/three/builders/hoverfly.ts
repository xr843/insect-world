/**
 * 黑带食蚜蝇 Episyrphus balteatus（双翅目，本项目第一个双翅目物种）
 *
 * 造型要点：
 * - 双翅目的定义特征：只有一对前翅，后翅退化成一对平衡棒
 *   （halteres，末端带小球的短棒），着生在前翅后下方的胸侧。这是与
 *   蜜蜂（两对翅）最本质的区别，本文件用 wing 的数量（严格 2 片翅面
 *   mesh）+ 独立建的 haltere 部件同时把这个特征做扎实。
 *   kit.wingPair() 内部会调用 kit.wingVeins()，其生成的翅脉 mesh 是
 *   BufferGeometry；翅面本体用的是 ExtrudeGeometry（kit.wingGeometry()）
 *   ——两者几何类型不同，因此在装配完 wingPair() 后按 geometry.type
 *   过滤出 ExtrudeGeometry 的 mesh 并打上 'wing-membrane' 的 name，
 *   测试直接按 name 数，不需要另写一遍翅膀装配逻辑。
 * - 腹部黄黑相间横带拟态蜜蜂（贝氏拟态），但带纹比蜜蜂更细更规则，
 *   腹部本身也更扁平——沿用 honeybee.ts 分节独立上色的思路，但加了
 *   flat 参数做背腹压扁，且分段数更多、每段更窄。
 * - 复眼硕大到几乎占满整个头部，雄虫两眼在头顶相接（holoptic），
 *   做法与 dragonfly.ts 一致：半径远超头部比例、两眼在中线附近重叠。
 * - 触角极短（只有三节，末端一根芒毛 arista）：kit.antenna() 没有
 *   "芒状触角"这个类型，这里用极短的 setaceous 基节 + 手工加一根更细
 *   的芒毛短鬃，组合出食蚜蝇触角的观感。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  membrane,
  spindle,
  wingPair,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 扁平分节上色的腹部：黄黑横带比 honeybee.ts 的做法更"细而规则"——
 * 段数更多（7 段）、每段内部鼓起幅度更小（更接近方筒环带而非鼓鼓的
 * 一节节），并加入 flat>1（按本工具箱内 flat 的实测语义，越大越
 * 背腹压扁）压出食蚜蝇特有的扁平腹部。
 */
function flatBandedAbdomen(opts: {
  from: THREE.Vector3
  to: THREE.Vector3
  r0: number
  r1: number
  segments: number
  flat: number
  colorA: THREE.ColorRepresentation
  colorB: THREE.ColorRepresentation
}): THREE.Group {
  const g = new THREE.Group()
  const matA = chitin({ color: opts.colorA, gloss: 0.5, clearcoat: 0.22 })
  const matB = chitin({ color: opts.colorB, gloss: 0.55, clearcoat: 0.26 })
  for (let s = 0; s < opts.segments; s++) {
    const t0 = s / opts.segments
    const t1 = (s + 1) / opts.segments
    const p0 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t0)
    const p1 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t1)
    const rStart = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t0))
    const rBulge = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep((t0 + t1) / 2)) * 1.04
    const rEnd = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t1)) * 0.92
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart, 1e-4) / opts.flat, rz: Math.max(rStart, 1e-4) * opts.flat },
      { at: new THREE.Vector3().lerpVectors(p0, p1, 0.5), ry: Math.max(rBulge, 1e-4) / opts.flat, rz: Math.max(rBulge, 1e-4) * opts.flat },
      { at: p1, ry: Math.max(rEnd, 1e-4) / opts.flat, rz: Math.max(rEnd, 1e-4) * opts.flat },
    ]
    const mesh = new THREE.Mesh(loft(sections, 22), s % 2 === 0 ? matB : matA)
    mesh.name = 'abdomen-band'
    g.add(mesh)
  }
  return g
}

/** 平衡棒（haltere）：细柄 + 末端小球，着生在前翅基部后下方。 */
function haltere(base: THREE.Vector3, side: 1 | -1, stalkMat: THREE.Material, ballMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const dir = new THREE.Vector3(-0.35, -0.55, side * 0.55).normalize()
  const len = 0.1
  const tip = base.clone().addScaledVector(dir, len)
  const stalk = new THREE.Mesh(loft([{ at: base, ry: 0.007, rz: 0.007 }, { at: tip, ry: 0.0045, rz: 0.0045 }], 8), stalkMat)
  stalk.name = 'haltere'
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.021, 12, 10), ballMat)
  ball.position.copy(tip)
  ball.name = 'haltere'
  g.add(stalk, ball)
  return g
}

/** 极短触角：三节短锥 + 一根更细的末端芒毛（arista），双翅目区别于蜂类长触角的关键。 */
function aristateAntenna(base: THREE.Vector3, side: 1 | -1, mat: THREE.Material, aristaMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  g.userData.phase = side >= 0 ? 0 : Math.PI * 0.62 // 左右错相位（此类自写触角常左右共用 base，不能按 z 符号判）
  const dir = new THREE.Vector3(0.85, 0.3, side * 0.45).normalize()
  const stalkLen = 0.07
  const sections: Section[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    const p = base.clone().addScaledVector(dir, stalkLen * t)
    sections.push({ at: p, ry: 0.018 * (1 - t * 0.45), rz: 0.018 * (1 - t * 0.45) })
  }
  g.add(new THREE.Mesh(loft(sections, 10), mat))
  const tip = base.clone().addScaledVector(dir, stalkLen)
  const aristaDir = new THREE.Vector3(0.5, 0.75, side * 0.2).normalize()
  const aristaTip = tip.clone().addScaledVector(aristaDir, 0.09)
  g.add(new THREE.Mesh(loft([{ at: tip, ry: 0.006, rz: 0.006 }, { at: aristaTip, ry: 0.0008, rz: 0.0008 }], 6), aristaMat))
  return g
}

// ---------------------------------------------------------------- 主体

export function buildHoverfly(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#1c1a17', gloss: 0.48, clearcoat: 0.28 })
  const legMat = chitin({ color: '#171512', gloss: 0.35 })
  const bandDark = '#181410'
  const bandLight = '#e8a728'
  const eyeColor = '#5c2f18'
  const haltereMat = chitin({ color: '#caa156', gloss: 0.4 })
  const haltereBallMat = chitin({ color: '#e8c477', gloss: 0.55, clearcoat: 0.3 })
  // B 轮翅膜虹彩组：极轻档。kit.MembraneOptions 只暴露 iridescent 布尔开关，
  // 强度由 kit 内部 MEMBRANE_IRIDESCENCE 常量统一控制，本文件无法单独再调低
  // ——若目视比预期更显闹，需回 kit.ts 加强度参数，见本文件报告。
  const wingFaceMat = membrane('#f2f5ef', 0.22, { iridescent: true, iridescenceStrength: 0.25 })
  const veinMat = chitin({ color: '#2c281f', gloss: 0.3, side: THREE.DoubleSide })

  // ---- 头：小，几乎被复眼盖满
  const head = new THREE.Mesh(spindle([0.42, 0.01, 0], [0.57, 0.02, 0], 0.1, { bulge: 0.5, taperStart: 0.7, taperEnd: 0.45 }), bodyMat)
  g.add(head)

  // ---- 胸：着生翅、平衡棒、三对足
  const thoraxCenter = new THREE.Vector3(0.22, 0.07, 0)
  const thorax = new THREE.Mesh(
    spindle([0.04, 0, 0], [0.42, 0.02, 0], 0.135, { bulge: 0.45, flat: 1.02, taperStart: 0.55, taperEnd: 0.6 }),
    bodyMat,
  )
  g.add(thorax)

  // ---- 腹：扁平，黄黑细横带，7 段
  const abdomenFrom = new THREE.Vector3(0.03, -0.01, 0)
  const abdomenTo = new THREE.Vector3(-0.56, -0.03, 0)
  g.add(
    flatBandedAbdomen({
      from: abdomenFrom,
      to: abdomenTo,
      r0: 0.125,
      r1: 0.018,
      segments: 7,
      flat: 1.4,
      colorA: bandDark,
      colorB: bandLight,
    }),
  )

  // ---- 复眼：硕大，holoptic——两眼在头顶几乎相接
  /*
   * 复眼尺寸 —— 2026-08-12 收窄。
   *
   * 原值 radius 0.185，而头部 spindle 半径只有 0.1、胸部 0.135：两只眼各自
   * 比整个头还大近一倍，又在中线重叠，渲染出来融成**一颗棕色浆果粘在前端**，
   * 看不出是眼睛，也看不出有头。vitest 全绿（眼睛的几何、成对性、锚点都合法）。
   *
   * 食蚜蝇的复眼确实硕大、雄虫两眼在头顶相接（holoptic），文件头注释没错；
   * 但「占满头部」不等于「比头大一倍」。0.12 让两眼仍在中线附近相接、仍占满
   * 头部，却读得出是一对眼睛长在一个头上。
   */
  const eyeAt: [number, number, number] = [0.53, 0.14, 0.072]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.12, color: eyeColor, flatten: 0.92, stretch: 1.08, facets: true }))

  // ---- 触角：三节短锥 + 芒毛
  const antBase = new THREE.Vector3(0.58, 0.13, 0.04)
  g.add(aristateAntenna(antBase, 1, bodyMat, bodyMat), aristateAntenna(antBase, -1, bodyMat, bodyMat))

  // ---- 平衡棒：着生在前翅基部后下方
  const haltereBase = new THREE.Vector3(0.12, 0.02, 0.1)
  g.add(haltere(haltereBase, 1, haltereMat, haltereBallMat), haltere(haltereBase, -1, haltereMat, haltereBallMat))

  // ---- 三对足：常规步行比例，纤细
  g.add(legPair({ base: [0.36, -0.05, 0.1], femur: 0.17, tibia: 0.15, thickness: 0.017, splay: 26, sweep: -26, knee: 66 }, legMat))
  g.add(legPair({ base: [0.2, -0.06, 0.12], femur: 0.19, tibia: 0.17, thickness: 0.018, splay: 30, sweep: 6, knee: 68 }, legMat))
  g.add(legPair({ base: [0.02, -0.06, 0.11], femur: 0.21, tibia: 0.2, thickness: 0.019, splay: 28, sweep: 32, knee: 70 }, legMat))

  // ---- 一对膜翅：向后侧方展开，半透明。装配完之后按 geometry 类型
  // 精确打上 'wing-membrane' 的 name，供测试断言"恰好一对（2 片）"。
  const wingLength = 0.82
  const wingSpec: WingSpec = { base: [0.26, 0.11, 0.08], length: wingLength, width: 0.36, spread: 196, tilt: -6, sweep: 4, thickness: 0.006 }
  const wings = wingPair(wingSpec, wingFaceMat, veinMat, 6)
  wings.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry.type === 'ExtrudeGeometry') m.name = 'wing-membrane'
  })
  g.add(wings)

  // wing anchor：用实际装配矩阵链读出右翅翅尖，避免手工重算三角函数
  g.updateMatrixWorld(true)
  const rightPivot = wings.children[0] as THREE.Group
  const rightBlade = rightPivot.children[0] as THREE.Group
  const wingTip = rightBlade.localToWorld(new THREE.Vector3(wingLength * 0.9, 0, 0))

  const anchors: Record<string, THREE.Vector3> = {
    haltere: haltereBase.clone().add(new THREE.Vector3(-0.05, -0.05, 0.06)),
    wing: wingTip,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + 0.12),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.4),
    antenna: antBase.clone().add(new THREE.Vector3(0.09, 0.05, 0)),
    thorax: thoraxCenter,
  }

  return finalize(g, anchors)
}
