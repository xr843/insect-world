/**
 * 日本埋葬虫 Nicrophorus japonicus（鞘翅目·埋葬甲科）
 *
 * 造型要点：
 * - 科级鉴定特征是「鞘翅截短」：埋葬甲以掩埋小型尸体为生，鞘翅只
 *   盖住腹部前段，末端平齐地"截断"（不像多数鞘翅目那样收窄盖满
 *   全腹），露出的腹部末 2~3 节完全裸露在外、能看出分节。因此鞘翅
 *   改用 truncatedWidth() 控制宽度包络——前段快速撑开后长距离维持
 *   接近满宽，只在末端轻微收窄，让 kit.loft() 的自动端盖在末端收出
 *   一个近乎平齐的截面，而不是像常规甲虫那样收尖成一个点。腹部则
 *   用 kit.segmentedAbdomen() 整段建出，长度明显超过鞘翅覆盖范围。
 * - 鞘翅上两条橙红色波浪横带是本种最醒目的视觉标志（黑底橙纹，俗
 *   称"红胸"/"黑背橙纹"埋葬虫的日常外观）。横带用 surfaceStripe()：
 *   带子必须是"鞘翅表面本身被染色"，不能是"贴在表面上的独立物体"
 *   ——第一版用 kit.loft() 造了一根有实体半径的管子焊在壳上，实机
 *   渲染出来是一块块凸起的橙色软垫，边缘还翘起，这是本文件唯一动
 *   过返工的地方。修正后不再造管子：每个采样点都用与放样鞘翅完全
 *   相同的截面数据（sections/centers）算出曲面上的精确位置和法线，
 *   径向只偏移局部半径的 1.5%（下限 0.0012，仅用于避免 z-fighting），
 *   宽度和厚度都通过在曲面上取两条相邻边界线（沿 theta 扫描 = 带子
 *   的长边；沿截面下标取一小段偏移 = 带子的窄边）拉出一条贴面三角
 *   带，而不是靠管子半径撑出体积。取样时让"长度方向截面下标"按正弦
 *   波动，两条边界线跟着一起波动，带子的前后边缘因此天然起伏成波浪
 *   状。同时把放样鞘翅用的 sections/centers 原始数据存进 shell mesh
 *   的 userData，供测试独立验证"色带顶点到鞘翅真实曲面的径向偏移"
 *   ——而不是只信构造时声明的偏移量。
 * - 触角是本种第二个招牌特征：埋葬虫靠触角末端骤然膨大的橙色"棒
 *   状端球"嗅闻数百米外的尸体气味。kit.antenna() 的 'clavate' 类型
 *   只在最后 22% 路径上渐扩，膨大倍数上限约 2.5x 且是连续渐变，读
 *   不出"骤然鼓成一个球"的观感，因此本文件自写 clubbedAntenna()：
 *   细柄（渐收的 loft 管）+ 柄基一枚小球（关节，同时是量取"柄粗细"
 *   的真实几何参照）+ 末端一枚明显更大的橙色球（真实 SphereGeometry，
 *   半径与柄基球半径都是测试直接从渲染几何体量取的，不是摆样子的
 *   声明值）。
 * - 前胸背板扁平宽阔、近圆形、边缘外扩：用一枚压扁的椭球做隆起的
 *   中央，外面再叠一圈更宽的扁平圆柱做外扩的"檐"——单纯一个扁球
 *   只有隆起没有外扩平缘，叠一层才是"边缘扁平外扩"的关键。
 * - 大颚发达，直接复用 kit.mandibles() 的通用咀嚼式口器（埋葬虫用
 *   大颚切割尸体组织，不需要虎甲那种镰刀状特化）。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  legPair,
  loft,
  mandibles,
  segmentedAbdomen,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/**
 * 鞘翅宽度包络：前段迅速撑开、中段几乎维持满宽、末端只轻微收窄——
 * 刻意不收尖到 0，这样 loft 在末端自动加的端盖是一个仍有相当宽度的
 * 平面，读出来才是"截断"而不是"收尖"。
 */
function truncatedWidth(t: number): number {
  if (t < 0.16) return THREE.MathUtils.lerp(0.5, 1.0, t / 0.16)
  if (t < 0.85) return THREE.MathUtils.lerp(1.0, 0.92, (t - 0.16) / 0.69)
  return THREE.MathUtils.lerp(0.92, 0.85, (t - 0.85) / 0.15)
}

/**
 * 贴合曲面的色带：不造管子，直接在鞘翅曲面上铺一条极薄的三角带。
 * 沿 theta（鞘翅宽度方向，从背中线扫向体侧）方向前进的同时，在每一步
 * 都取两条"长度方向截面下标"相邻的边界线（中心下标 ± halfThicknessIdx，
 * 且这个中心下标本身按正弦波动），两条边界线各自用与放样鞘翅完全相同
 * 的截面数据算出曲面上的精确位置——径向只偏移局部半径的 1.5%（下限
 * 0.0012，仅用于避免 z-fighting）。宽度和厚度都是"曲面上两条线拉开的
 * 距离"，不是靠管子半径撑出体积，因此读出来是"这片壳变成了橙色"而
 * 不是"壳上粘了个东西"。中心下标的正弦波动让两条边界线一起起伏，带子
 * 的前后边缘因此天然是波浪状。
 */
function surfaceStripe(
  sections: Section[],
  centers: THREE.Vector3[],
  zOffset: number,
  centerIdx: number,
  halfThicknessIdx: number,
  thetaFrom: number,
  thetaTo: number,
  waveAmpIdx: number,
  waveCount: number,
  material: THREE.Material,
): THREE.Mesh {
  const steps = 40

  const surfaceAt = (theta: number, idxF: number): { pos: THREE.Vector3; normal: THREE.Vector3 } => {
    const idx = THREE.MathUtils.clamp(Math.round(idxF), 0, sections.length - 1)
    const sec = sections[idx]
    const center = centers[idx]
    const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
    const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
    const normal = new THREE.Vector3(0, nx, nz).normalize()
    const localR = Math.min(sec.ry, sec.rz)
    const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz).addScaledVector(
      normal,
      Math.max(localR * 0.015, 0.0012),
    )
    return { pos, normal }
  }

  // 显式给每个顶点写入曲面法线（与放样鞘翅同一套公式算出来的真实法线），
  // 不用 computeVertexNormals() 现算——一条前后两条边界线共享顶点、两条
  // 边只在"长度方向下标"上差 2*halfThicknessIdx，若靠自动算法线，边界
  // 退化窄带时容易出现权重异常；直接写解析法线更稳，也与壳体法线完全
  // 一致，贴上去光照不会显得"浮"。material 另开 DoubleSide，避免三角形
  // 环绕方向偶尔算反导致背面消隐、色带从正常视角看不见。
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= steps; i++) {
    const f = i / steps
    const theta = THREE.MathUtils.lerp(thetaFrom, thetaTo, f)
    const wave = Math.sin(f * Math.PI * waveCount) * waveAmpIdx
    const idxCenter = centerIdx + wave
    const front = surfaceAt(theta, idxCenter - halfThicknessIdx)
    const back = surfaceAt(theta, idxCenter + halfThicknessIdx)
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
  return new THREE.Mesh(geo, material)
}

/**
 * 棒状端球触角：细柄 + 柄基小球（供测试量取"柄粗细"）+ 骤然膨大的
 * 橙色端球。柄与球都是独立的真实几何体，半径直接决定渲染尺寸。
 */
function clubbedAntenna(
  base: THREE.Vector3,
  side: 1 | -1,
  length: number,
  stalkR: number,
  clubR: number,
  stalkMat: THREE.Material,
  clubMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  g.userData.phase = side >= 0 ? 0 : Math.PI * 0.62 // 左右错相位（此类自写触角常左右共用 base，不能按 z 符号判）
  const pitch = THREE.MathUtils.degToRad(28)
  const yaw = side * THREE.MathUtils.degToRad(38)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  const stalkEnd = base.clone().addScaledVector(dir, length * 0.8)
  const clubCenter = base.clone().addScaledVector(dir, length * 0.88)

  const steps = 8
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = stalkR * (1 - t * 0.45)
    sections.push({ at: base.clone().lerp(stalkEnd, t), ry: r, rz: r })
  }
  g.add(new THREE.Mesh(loft(sections, 10), stalkMat))

  const baseJoint = new THREE.Mesh(new THREE.SphereGeometry(stalkR, 12, 10), stalkMat)
  baseJoint.position.copy(base)
  baseJoint.name = 'antenna-base'
  g.add(baseJoint)

  const club = new THREE.Mesh(new THREE.SphereGeometry(clubR, 16, 12), clubMat)
  club.position.copy(clubCenter)
  club.name = 'antenna-club'
  g.add(club)

  return g
}

function clubbedAntennaPair(
  base: [number, number, number],
  length: number,
  stalkR: number,
  clubR: number,
  stalkMat: THREE.Material,
  clubMat: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  g.add(clubbedAntenna(new THREE.Vector3(...base), 1, length, stalkR, clubR, stalkMat, clubMat))
  g.add(clubbedAntenna(new THREE.Vector3(base[0], base[1], -base[2]), -1, length, stalkR, clubR, stalkMat, clubMat))
  return g
}

// ---------------------------------------------------------------- 主体

export function buildBuryingBeetle(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#141110', gloss: 0.6, metal: 0.15, clearcoat: 0.35 })
  // B3 刻点组：'punctate' 默认档。乌黑鞘翅底色；clearcoat 由 elytra() 内定
  // 0.55，不手动加高。⚠️下面的 bandMat（橙红横带）与色值三次返工才校准，
  // 本轮绝对不碰。
  const elytraMat = elytra('#100d0c', 0.15, { surface: 'punctate' })
  // 橙红横带：DoubleSide 防止 surfaceStripe() 的三角形环绕方向偶尔算反导致背面消隐。
  // 基色钉在饱和橙红~砖红（H≈17°，参照真实 Nicrophorus 的 #d95a1e~#c94a20），
  // 且把 metalness/clearcoat 都压得比原来更低——旧值 metal=0.08+clearcoat=0.3
  // 的组合在实机渲染里会被清漆层的白色高光把固有色冲淡成粉/藕荷调，读不出
  // 警戒色该有的醒目橙红；降下来让漫反射的固有色主导，clearcoat 仍远低于
  // elytra() 的 0.55 上限。
  /**
   * ⚠️ 这里的基色要比"想要的观感"**压深一档**。
   * 渲染用的是 ACES 电影级色调映射，它会把受光面大幅提亮并去饱和 ——
   * 材质设成 #d1521f（HSL 断言完全通过）渲出来仍是一片藕荷粉。
   * 所以断言材质基色**预测不了最终像素**，必须压深让它经过 tone mapping
   * 之后才落到橙红。gloss 也压低，减少高光对固有色的冲淡。
   */
  const bandMat = chitin({ color: '#a83208', gloss: 0.38, metal: 0.0, clearcoat: 0.1, side: THREE.DoubleSide })
  const antennaStalkMat = chitin({ color: '#362419', gloss: 0.45 }) // 略调暖，向端球过渡不那么陡
  const antennaClubMat = chitin({ color: '#e97a24', gloss: 0.55, clearcoat: 0.28 }) // 触角端球，与横带同色系呼应
  const mandMat = chitin({ color: '#0f0c0a', gloss: 0.68, metal: 0.2, clearcoat: 0.4 })
  const legMat = chitin({ color: '#1c1512', gloss: 0.42, metal: 0.12, clearcoat: 0.25 })

  // ---- 腹部：整段建出，长度明显超过鞘翅覆盖范围，末 2~3 节因此裸露在外
  const abdomenMesh = new THREE.Mesh(
    segmentedAbdomen({ from: [0.2, 0, 0], to: [-1.2, -0.02, 0], r0: 0.32, r1: 0.09, segments: 8, groove: 0.24, flat: 1.22, bulge: 0.15 }),
    bodyMat,
  )
  abdomenMesh.name = 'abdomen'
  g.add(abdomenMesh)

  // ---- 鞘翅：明显截短（见 truncatedWidth 注释），缀两条波浪橙红横带
  const eSteps = 22
  const elytraFromX = 0.34
  const elytraToX = -0.48
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = truncatedWidth(t) * 0.3
    const c = new THREE.Vector3(THREE.MathUtils.lerp(elytraFromX, elytraToX, t), 0.24 + 0.05 * Math.sin(t * Math.PI * 0.6), 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.6, 0.018), rz: Math.max(w * 0.82, 0.018) })
  }
  const elytraZ = 0.2
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), elytraMat)
    shell.position.z = side * elytraZ
    shell.name = 'elytra'
    // 把放样鞘翅用的原始截面数据存进 userData，供测试独立验证 band 是否
    // 真的贴合曲面（不是信构造时的偏移声明，而是拿这份真实截面数据反推
    // 曲面在 band 顶点对应角度上的真实半径，两者一比就知道偏了多少）。
    shell.userData.axisCenters = elytronCenters.map((c) => c.clone())
    shell.userData.axisSections = elytronSections.map((s) => ({ ry: s.ry, rz: s.rz }))
    shell.userData.side = side
    g.add(shell)

    // 两条波浪橙红色带：紧贴鞘翅曲面（见 surfaceStripe 注释），前带靠近
    // 肩部，后带靠近截断的末端。带子的 theta 扫得较宽（一路扫到接近
    // 背中线），个别顶点的世界坐标 z 会非常接近 0——测试若靠"z 的正负
    // 号"判断左右侧会在这些点上翻车，因此顺手把 side 记进 userData，
    // 供测试精确匹配同侧轴线，不用猜符号。
    const band1 = surfaceStripe(elytronSections, elytronCenters, side * elytraZ, 6, 1.8, -0.95, 1.3, 1.6, 2, bandMat)
    const band2 = surfaceStripe(elytronSections, elytronCenters, side * elytraZ, 15, 1.8, -0.95, 1.3, 1.6, 2, bandMat)
    band1.name = 'band'
    band2.name = 'band'
    band1.userData.side = side
    band2.userData.side = side
    g.add(band1, band2)
  }

  // ---- 前胸背板：压扁椭球做隆起中央 + 更宽的扁平圆柱做外扩的檐，
  // 近圆形、边缘扁平外扩，且比鞘翅/腹部都更宽阔扁平
  const pronotumX = 0.6
  const pronotumDome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 22, 14), bodyMat)
  pronotumDome.scale.set(0.58, 0.5, 0.95)
  pronotumDome.position.set(pronotumX, 0.2, 0)
  pronotumDome.name = 'pronotum'
  g.add(pronotumDome)

  const pronotumRim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.045, 30), bodyMat)
  pronotumRim.position.set(pronotumX, 0.08, 0)
  pronotumRim.name = 'pronotum'
  g.add(pronotumRim)

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([0.78, 0.14, 0], [1.05, 0.16, 0], 0.19, { bulge: 0.4, flat: 1.05, taperStart: 0.65, taperEnd: 0.3 }),
    bodyMat,
  )
  g.add(head)

  // ---- 复眼
  g.add(compoundEyePair({ at: [0.9, 0.2, 0.17], radius: 0.075, color: '#0b0908', flatten: 0.85, stretch: 1.0, facets: true }))

  // ---- 大颚：发达，通用咀嚼式口器足够表现"切割用"
  g.add(mandibles({ at: [1.02, 0.13, 0.08], length: 0.19, spread: 0.4, curve: 0.5 }, mandMat))

  // ---- 触角：短柄 + 骤然膨大的橙色端球（见 clubbedAntenna 注释）。
  // 端球半径比初版略收（0.07→0.062），比例仍 ≥2.5x 柄基半径，视觉上
  // 不那么像棒棒糖。
  g.add(clubbedAntennaPair([0.94, 0.22, 0.13], 0.4, 0.022, 0.062, antennaStalkMat, antennaClubMat))

  // ---- 三对足：扁平宽阔体型下的支撑步行足，前足带刺（掘穴/翻动尸体）
  const legSpecs: LegSpec[] = [
    { base: [0.5, -0.14, 0.26], femur: 0.36, tibia: 0.34, tarsus: 0.14, thickness: 0.034, splay: 36, sweep: -28, knee: 60, ankle: 52, spines: true },
    { base: [0.02, -0.15, 0.28], femur: 0.38, tibia: 0.36, tarsus: 0.15, thickness: 0.035, splay: 34, sweep: 6, knee: 62, ankle: 52 },
    { base: [-0.55, -0.15, 0.26], femur: 0.37, tibia: 0.35, tarsus: 0.14, thickness: 0.034, splay: 38, sweep: 38, knee: 64, ankle: 54 },
  ]
  for (const spec of legSpecs) g.add(legPair(spec, legMat))

  const anchors: Record<string, THREE.Vector3> = {
    elytra: new THREE.Vector3(-0.05, 0.3, elytraZ),
    antenna: new THREE.Vector3(1.3, 0.3, 0.15),
    abdomen: new THREE.Vector3(-0.95, 0.05, 0),
    mandible: new THREE.Vector3(1.18, 0.05, 0.09),
    eye: new THREE.Vector3(0.9, 0.24, 0.2),
    pronotum: new THREE.Vector3(pronotumX, 0.35, 0),
  }

  return finalize(g, anchors)
}
