/**
 * 黄缘龙虱 Cybister japonicus（龙虱科，鞘翅目水生类群）
 *
 * 造型要点：
 * - 水生甲虫的核心形态逻辑是「整体一颗压扁的橄榄」：背腹面都光滑连续，
 *   没有陆生甲虫常见的高耸前胸背板、犄角或棱脊——任何突起都会增加
 *   水中阻力。因此本文件不采用 rhino/jewel-beetle 那种「belly + 高耸
 *   shell + 粗壮 pronotum」的强对比结构，而是让 belly／鞘翅／前胸
 *   背板三段的半径在衔接处彼此接近，读成一个连续的流线椭球，两端
 *   都收成钝尖而不是任何一端截平。
 * - kit.spindle() 的 flat 参数实测：flat > 1 是 **Y 方向（背腹向）**
 *   压扁——已用 earwig.ts 的实际用法核实过这一点（该文件注释明确写
 *   「flat 都 > 1（Y 方向压扁）」，与 kit.ts 文档字符串的措辞相反；
 *   以 flat 的实际代码行为 ry=r/flat, rz=r*flat 为准）。本文件全身
 *   取 flat 1.4~1.5，压出「压扁的橄榄」。
 * - 后足特化成桨：胫节+跗节合并成一整片连续的扁桨（paddleHindleg()，
 *   仿 mole-cricket.ts 的 diggingForeleg() 手法自建放样，不走
 *   kit.leg() 的固定圆管截面）——厚度(ry)沿全长持续变薄，宽度(rz)
 *   在中段达到峰值，两端收窄成桨的轮廓。桨外缘另加 16 根细毛（缘毛，
 *   仿 water-strider.ts 的 hydrophobicTuft() 手法，但改为沿桨缘密集
 *   排布而非只簇生在腿尖），是划水的推进面。后足姿态向体侧后方伸展、
 *   几乎不下探，与陆生甲虫「腿向下撑」的姿态相反。
 * - 前中足维持 kit.legPair() 的常规圆管足，仅缩短比例，体现「仅用于
 *   抓握」而非游泳。
 * - 黄缘：沿鞘翅与前胸背板外缘各贴一条黄色窄带。取外缘点时把 theta
 *   显式乘上 side（marginBand() 内部），保证左右两侧真正镜像对称——
 *   jewel-beetle.ts 的 surfaceStripe() 对两侧复用同一个固定 theta，
 *   实测会让右侧落在外缘、左侧却落在偏内侧，并不对称，本文件不重复
 *   这个用法。
 * - airStore（储气腔）是一个概念性锚点：鞘翅在体后端收尖处比腹部
 *   本体略短一点点，露出的窄缝即潜水时含气泡处，缝隙旁加一颗极淡的
 *   半透明气泡做点缀。
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
  membrane,
  spindle,
  type InsectModel,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/**
 * 贴面窄带：沿一段已放样截面（sections/centers）在指定外缘角处画一条细管。
 * theta 内部乘 side，保证左右两侧真正镜像（而不是复用同一个固定角度）。
 * halfWidth 是该组截面在装配时额外叠加的侧向偏移（对应 mesh.position.z）。
 */
function marginBand(
  sections: Section[],
  centers: THREE.Vector3[],
  side: 1 | -1,
  halfWidth: number,
  thetaDeg: number,
  tFrom: number,
  tTo: number,
  tubeR: number,
  material: THREE.Material,
): THREE.Mesh {
  const n = sections.length
  const iFrom = Math.round(tFrom * (n - 1))
  const iTo = Math.round(tTo * (n - 1))
  const theta = THREE.MathUtils.degToRad(side * thetaDeg)
  const pushOut = 1.05 // 略推出表面之外一点，避免与母体网格 z-fighting
  const pts: Section[] = []
  for (let i = iFrom; i <= iTo; i++) {
    const sec = sections[i]
    const c = centers[i]
    const pos = new THREE.Vector3(
      c.x,
      c.y + Math.cos(theta) * sec.ry * pushOut,
      side * halfWidth + Math.sin(theta) * sec.rz * pushOut,
    )
    pts.push({ at: pos, ry: tubeR, rz: tubeR })
  }
  return new THREE.Mesh(loft(pts, 6), material)
}

/** 前胸背板的黄缘：背板是单个左右对称的 spindle，不走 marginBand 的
 * 多截面数组，因此复刻 spindle() 内部的鼓包公式，在几个 t 处直接取
 * 外缘点连成窄带（做法同 hornet.ts 的 mandiblePoint()：复刻 kit 内部
 * 公式而不改 kit.ts）。 */
function pronotumRimBand(
  side: 1 | -1,
  fromX: number,
  toX: number,
  centerY: number,
  baseR: number,
  bulge: number,
  flat: number,
  thetaDeg: number,
  material: THREE.Material,
): THREE.Mesh {
  const theta = THREE.MathUtils.degToRad(side * thetaDeg)
  const steps = 16
  const pts: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = THREE.MathUtils.lerp(0.06, 0.9, i / steps)
    const k = t < bulge ? t / bulge : (1 - t) / (1 - bulge)
    const r = baseR * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI * 0.5)
    const ry = r / flat
    const rz = r * flat
    const x = THREE.MathUtils.lerp(fromX, toX, t)
    const pos = new THREE.Vector3(x, centerY + Math.cos(theta) * ry * 1.05, Math.sin(theta) * rz * 1.05)
    pts.push({ at: pos, ry: 0.017, rz: 0.017 })
  }
  return new THREE.Mesh(loft(pts, 6), material)
}

/**
 * 桨状后足（一侧）：基节、腿节是正常细圆管，胫节+跗节合并成一片连续的
 * 扁桨——厚度(ry)沿全长持续变薄，宽度(rz)在中段达到峰值再收窄成桨尖，
 * 外缘密生一排游泳缘毛。side 直接决定方向分量的正负，不依赖 kit 的
 * 镜像机制（同 mole-cricket.ts 的 diggingForeleg() 处理方式）。
 */
function paddleHindleg(
  base: THREE.Vector3,
  side: 1 | -1,
  material: THREE.Material,
  hairMaterial: THREE.Material,
): { group: THREE.Group; tip: THREE.Vector3 } {
  const g = new THREE.Group()
  // 向体侧后方伸展，几乎不下探：z（侧向）分量占主导，y（垂直）分量很小，
  // 与陆生甲虫「腿向下撑」的姿态相反。
  const dir = new THREE.Vector3(-0.5, -0.16, side * 0.85).normalize()

  const coxaLen = 0.16
  const coxaEnd = base.clone().addScaledVector(dir, coxaLen)
  g.add(
    new THREE.Mesh(
      loft([{ at: base, ry: 0.085, rz: 0.085 }, { at: coxaEnd, ry: 0.072, rz: 0.072 }], 10),
      material,
    ),
  )

  const femurLen = 0.58
  const femurEnd = coxaEnd.clone().addScaledVector(dir, femurLen)
  g.add(
    new THREE.Mesh(
      loft([{ at: coxaEnd, ry: 0.072, rz: 0.072 }, { at: femurEnd, ry: 0.058, rz: 0.058 }], 10),
      material,
    ),
  )

  // 桨叶：胫节+跗节合一，厚度持续变薄、宽度中段最大——一整片桨而不是圆管腿
  const bladeLen = 1.0
  const steps = 16
  const bladeSections: Section[] = []
  const bladeCenters: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = femurEnd.clone().addScaledVector(dir, bladeLen * t)
    bladeCenters.push(p)
    const widthEnv = Math.sin(Math.pow(t, 0.58) * Math.PI * 0.92)
    const ry = THREE.MathUtils.lerp(0.046, 0.015, t)
    const rz = Math.max(0.038 + widthEnv * 0.22, 0.01)
    bladeSections.push({ at: p, ry: Math.max(ry, 0.007), rz })
  }
  const blade = new THREE.Mesh(loft(bladeSections, 16), material)
  blade.name = 'hindleg'
  g.add(blade)

  // 缘毛：沿桨叶外缘密生一排细长硬毛——这是它划水的推进面
  const hairCount = 16
  for (let i = 0; i < hairCount; i++) {
    const t = 0.1 + (i / (hairCount - 1)) * 0.85
    const idx = Math.min(steps, Math.max(0, Math.round(t * steps)))
    const sec = bladeSections[idx]
    const center = bladeCenters[idx]
    const edge = center.clone()
    edge.z += side * sec.rz * 0.96
    const hairLen = 0.09 + 0.055 * Math.sin(t * Math.PI) // 中段毛更长
    const tip = edge.clone()
    tip.z += side * hairLen
    tip.y -= hairLen * 0.1
    const hair = new THREE.Mesh(
      loft([{ at: edge, ry: 0.006, rz: 0.006 }, { at: tip, ry: 0.0006, rz: 0.0006 }], 5),
      hairMaterial,
    )
    hair.name = 'swim-hair'
    g.add(hair)
  }

  return { group: g, tip: bladeCenters[bladeCenters.length - 1].clone() }
}

// ---------------------------------------------------------------- 主体

export function buildDivingBeetle(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#22301a', gloss: 0.5, clearcoat: 0.3 })
  const shellMat = elytra('#283c20', 0.14)
  const rimMat = chitin({ color: '#e2b93a', gloss: 0.62, clearcoat: 0.35 })
  const legMat = chitin({ color: '#28361d', gloss: 0.42, clearcoat: 0.22 })
  const hairMat = chitin({ color: '#3c4a2a', gloss: 0.3 })
  const bubbleMat = membrane('#dcefe8', 0.26)

  const halfWidth = 0.62

  // ---- 腹面体躯：全身唯一的连续基底，两端都收成钝尖，光滑无棱，
  // 是「压扁的橄榄」这个核心形态逻辑的地基。
  const belly = new THREE.Mesh(
    spindle([-1.85, -0.02, 0], [1.02, 0.04, 0], 0.6, { bulge: 0.42, flat: 1.5, taperStart: 0.04, taperEnd: 0.55 }),
    bodyMat,
  )
  g.add(belly)

  // ---- 鞘翅：两片贴体的低矮圆顶，无中脊、无肩包，前后光滑过渡到钝尖
  const eFrom = 0.92
  const eTo = -1.82
  const eSteps = 26
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.56) * Math.PI * 0.9)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.15 - 0.05 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.33, 0.01), rz: Math.max(w * 0.42, 0.01) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 28), shellMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)
    g.add(marginBand(elytronSections, elytronCenters, side, halfWidth, 82, 0.02, 0.97, 0.02, rimMat))
  }

  // ---- 前胸背板：短而宽，半径与鞘翅前缘、头部后缘都接近，衔接处不留台阶
  const pronotumFromX = 1.0
  const pronotumToX = 1.32
  const pronotumR = 0.56
  const pronotumBulge = 0.3
  const pronotumFlat = 1.42
  const pronotum = new THREE.Mesh(
    spindle([pronotumFromX, 0.065, 0], [pronotumToX, 0.065, 0], pronotumR, {
      bulge: pronotumBulge,
      flat: pronotumFlat,
      taperStart: 0.86,
      taperEnd: 0.68,
    }),
    bodyMat,
  )
  g.add(pronotum)
  for (const side of [1, -1] as const) {
    g.add(
      pronotumRimBand(
        side,
        pronotumFromX,
        pronotumToX,
        0.065,
        pronotumR,
        pronotumBulge,
        pronotumFlat,
        80,
        rimMat,
      ),
    )
  }

  // ---- 头部：小，大复眼几乎占满两侧
  const head = new THREE.Mesh(
    spindle([1.32, 0.08, 0], [1.72, 0.1, 0], 0.32, { bulge: 0.4, flat: 1.2, taperStart: 0.78, taperEnd: 0.4 }),
    bodyMat,
  )
  g.add(head)

  g.add(
    compoundEyePair({
      at: [1.53, 0.15, 0.25],
      radius: 0.165,
      color: '#100d0b',
      flatten: 0.82,
      stretch: 1.05,
      facets: true,
    }),
  )

  // ---- 短触角
  g.add(antennaPair({ base: [1.6, 0.09, 0.13], length: 0.32, kind: 'filiform', pitch: 8, yaw: 26, thickness: 0.018 }, bodyMat))

  // ---- 前中足：短小，仅用于抓握（不是游泳桨）
  const foreRig = legPair(
    { base: [0.85, -0.14, 0.42], femur: 0.3, tibia: 0.26, tarsus: 0.12, thickness: 0.042, splay: 34, sweep: -18, knee: 58 },
    legMat,
  )
  foreRig.name = 'foreleg-rig'
  g.add(foreRig)
  const midRig = legPair(
    { base: [0.42, -0.17, 0.48], femur: 0.34, tibia: 0.3, tarsus: 0.13, thickness: 0.045, splay: 32, sweep: 6, knee: 60 },
    legMat,
  )
  midRig.name = 'midleg-rig'
  g.add(midRig)

  // ---- 后足：桨状，全物种的辨识核心
  const hindBaseR = new THREE.Vector3(0.1, -0.06, 0.48)
  const hindBaseL = new THREE.Vector3(0.1, -0.06, -0.48)
  const hindR = paddleHindleg(hindBaseR, 1, legMat, hairMat)
  const hindL = paddleHindleg(hindBaseL, -1, legMat, hairMat)
  const hindRig = new THREE.Group()
  hindRig.name = 'hindleg-rig'
  hindRig.add(hindR.group, hindL.group)
  g.add(hindRig)

  // ---- 储气腔：鞘翅末端与体躯尾尖间的窄缝，缀一颗极淡的半透明气泡
  const airStorePos = new THREE.Vector3(-1.83, -0.06, 0)
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), bubbleMat)
  bubble.position.copy(airStorePos)
  bubble.scale.set(1.3, 0.6, 1)
  g.add(bubble)

  const anchors: Record<string, THREE.Vector3> = {
    hindleg: hindR.tip,
    elytra: new THREE.Vector3(-0.3, 0.32, halfWidth * 0.7),
    eye: new THREE.Vector3(1.53, 0.2, 0.38),
    antenna: new THREE.Vector3(1.9, 0.14, 0.22),
    airStore: airStorePos,
    body: new THREE.Vector3(-0.4, 0.1, 0),
  }

  return finalize(g, anchors)
}
