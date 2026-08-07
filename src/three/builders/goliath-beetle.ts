/**
 * 大王花金龟 Goliathus goliatus（鞘翅目·金龟科·花金龟亚科，非洲，世界最重的甲虫之一）
 *
 * 造型要点：
 * - 前胸背板「黑底白纵条」是本种最好认的招牌，且必须是纵条（从前缘
 *   贯到后缘）而非斑点或横带——白斑是花金龟亚科同门 Protaetia 的花纹
 *   （见 flower-chafer.ts），横带是埋葬虫的花纹（见 burying-beetle.ts），
 *   两者都不对。纵条与 burying-beetle.surfaceStripe() 的扫描方向刚好
 *   相反：那个函数固定「长度方向下标」、沿 theta（宽度方向）扫出一条
 *   环绕的横带；本文件的 pronotumStripe() 反过来，固定 theta、沿 t
 *   （长度方向）扫，天然就是一条纵向色带。前胸背板因此不能像
 *   ground-beetle.ts 的 pronotum 那样直接用 kit.spindle()（返回值只是
 *   BufferGeometry，拿不到中间的 sections/centers），必须像
 *   flower-chafer.ts 那样自建放样，且两端半径都不收尖到 0（wFrac 在
 *   t=0 时仍有 0.5，不是 0）——否则纵条在端点会收成一个点，读不出
 *   「贯到后缘」。
 * - 头角是 Goliathus 属（而非其近亲 Cetonia/Protaetia）专属的次要特征：
 *   Y 形分叉、且分叉前的主干与分叉后的两瓣全程扁平（ry ≪ rz）——这与
 *   独角仙 rhinoceros-beetle.ts 的 hornY() 完全不同构造。hornY() 分叉后
 *   两枝仍收尖成两根圆锥细齿（"钳子"读法），本种反过来：两瓣宽度只
 *   轻微收窄、不收尖到点，loft() 的自动端盖因此是一片仍有实际面积的
 *   椭圆薄片，读出来是"铲/桨"而不是"针"。为体现这个区别，本文件不
 *   复用 hornY()，改写 spadeHorn()：分叉后的每一瓣半径用 wEase（只降
 *   到 0.78 倍，不趋 0）而不是 hornY() 那种 (1-t*0.92) 的收尖式衰减。
 * - 鞘翅是均匀棕红到栗色、不带任何斑点或条纹——与前胸背板的黑白强烈
 *   反差正是本种配色的全部逻辑，因此本文件的鞘翅不需要
 *   flower-chafer.spotPatch() 那类贴面装饰，结构上比其它金龟总科的
 *   builder 都更简单。基色刻意压深（见下方材质注释）。
 * - 质感是天鹅绒、不反光——这是 Goliathus 属与大多数金龟总科（多半
 *   釉光锃亮）最显著的区别之一，本文件因此全身统一用 chitin() 的低
 *   gloss/零 metal/极低 clearcoat 组合，不使用 kit.elytra() 那条为
 *   "清漆下釉质光泽"设计的辅助函数（那是给 flower-chafer/rhinoceros-
 *   beetle 这类真正锃亮的金龟用的，本种反而要刻意避免）。
 * - 体型「巨大而厚重」：flat 与足的 knee 幅度都比 flower-chafer 更接近
 *   独角仙/大兜虫一路的高隆起厚重体型，而非花金龟本种（扁平体型）——
 *   虽然花金龟亚科整体确实偏扁平，但 Goliathus 是其中体型最厚重壮硕
 *   的一支，为了压住"巨大而厚重"这句形态描述，本文件的 belly/elytra
 *   flat 取中间值（1.2~1.3），不采用 flower-chafer 的 1.75~1.8 极扁体型。
 * - 六足粗壮带钩：钩爪复用 hercules-beetle.ts legClaws() 的构造思路
 *   （胫跗关节处加一对小钩），本文件重新实现一份，不跨文件 import
 *   私有函数（项目约定，见 hercules-beetle.ts 同一说明）。
 * - 鳃叶状触角是金龟总科共有特征，kit 内建类型直接用，未设专属
 *   anchor（同 hercules-beetle.ts 的先例）。
 * - ⚠️ 返工记录：本轮改了 bodyMat/stripeMat 两处颜色——上一版把纵条白斑
 *   也当彩色色块「压深一档」，实机渲染读成与黑底同色的深灰，招牌纵条
 *   消失；白斑该靠 gloss/clearcoat 提亮读出「白」，不是靠压深防过曝。
 *   详见下方材质注释。
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

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 沿放样截面反推曲面坐标（同 flower-chafer.ts surfacePoint()，本文件
 * 重新实现一份，不跨文件 import 私有函数）。zOffset 显式传入而不是从
 * side/halfWidth 推导——本文件的鞘翅、前胸背板都用得到，其中前胸背板
 * 是单个居中放样（zOffset=0），不是花金龟那种「两侧各一份」的写法。
 */
function surfaceAt(
  sections: Section[],
  centers: THREE.Vector3[],
  zOffset: number,
  t: number,
  thetaDeg: number,
): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const n = sections.length
  const idx = Math.min(n - 1, Math.max(0, Math.round(t * (n - 1))))
  const sec = sections[idx]
  const center = centers[idx]
  const theta = THREE.MathUtils.degToRad(thetaDeg)
  const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz)
  const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
  const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  return { pos, normal }
}

/**
 * 前胸背板纵条：固定 theta（宽度方向角），沿 t（长度方向）扫出一条
 * 贴面色带——与 burying-beetle.surfaceStripe()（固定长度下标、沿 theta
 * 扫）方向正交。不造实体管子（同 burying-beetle.ts 踩过的坑：造管子
 * 会渲成一块块凸起的软垫），只在曲面上铺一条极薄的三角带，径向偏移
 * 一个小常量避免 z-fighting。idxFrom/idxTo 取接近 0/1（留极小边距避开
 * 端点退化三角形），保证条纹真的「从前缘贯到后缘」。
 */
function pronotumStripe(
  sections: Section[],
  centers: THREE.Vector3[],
  thetaCenterDeg: number,
  halfThetaDeg: number,
  tFrom: number,
  tTo: number,
  material: THREE.Material,
): THREE.Mesh {
  const n = sections.length
  const iFrom = Math.round(tFrom * (n - 1))
  const iTo = Math.round(tTo * (n - 1))
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  let row = 0
  for (let i = iFrom; i <= iTo; i++) {
    const t = i / (n - 1)
    const left = surfaceAt(sections, centers, 0, t, thetaCenterDeg - halfThetaDeg)
    const right = surfaceAt(sections, centers, 0, t, thetaCenterDeg + halfThetaDeg)
    left.pos.addScaledVector(left.normal, 0.007)
    right.pos.addScaledVector(right.normal, 0.007)
    positions.push(left.pos.x, left.pos.y, left.pos.z, right.pos.x, right.pos.y, right.pos.z)
    normals.push(left.normal.x, left.normal.y, left.normal.z, right.normal.x, right.normal.y, right.normal.z)
    if (row > 0) {
      const a = (row - 1) * 2
      const b = a + 2
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
    row++
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setIndex(indices)
  const mat = material.clone() as THREE.MeshPhysicalMaterial
  mat.side = THREE.DoubleSide
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'stripe'
  return mesh
}

/**
 * Y 形扁平头角：主干与分叉后的两瓣全程扁平（ry≪rz），分叉两瓣的宽度
 * 只轻微收窄、不收尖到 0——与独角仙 hornY() 的圆锥形分叉齿相反（见
 * 文件头注释）。返回两瓣末端点供装配 anchor 使用。
 */
function spadeHorn(
  base: THREE.Vector3,
  length: number,
  material: THREE.Material,
  opts: {
    pitch: number
    curve: number
    thickness: number
    width: number
    forkLen: number
    forkAngle: number
    forkWidth: number
  },
): { shaft: THREE.Mesh; forks: THREE.Mesh[]; leftTip: THREE.Vector3; rightTip: THREE.Vector3 } {
  const steps = 16
  const pitch = THREE.MathUtils.degToRad(opts.pitch)
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(
      new THREE.Vector3(
        base.x + Math.cos(pitch) * length * t,
        base.y + Math.sin(pitch) * length * t + opts.curve * length * t * t,
        base.z,
      ),
    )
  }
  const shaftSections: Section[] = path.map((p, i) => {
    const t = i / steps
    return { at: p, ry: opts.thickness * (1 - t * 0.3), rz: opts.width * (1 - t * 0.12) }
  })
  const shaft = new THREE.Mesh(loft(shaftSections, 16), material)
  shaft.name = 'headHorn'

  const tip = path[path.length - 1]
  const dir = new THREE.Vector3().subVectors(tip, path[path.length - 3]).normalize()

  const forks: THREE.Mesh[] = []
  let leftTip = new THREE.Vector3()
  let rightTip = new THREE.Vector3()
  for (const side of [1, -1] as const) {
    const fsteps = 10
    const fs: Section[] = []
    let lastPt = tip
    for (let i = 0; i <= fsteps; i++) {
      const t = i / fsteps
      const spread = THREE.MathUtils.degToRad(opts.forkAngle) * smoothstep(t)
      const p = tip
        .clone()
        .addScaledVector(dir, opts.forkLen * t)
        .add(new THREE.Vector3(0, opts.forkLen * t * 0.1, side * Math.sin(spread) * opts.forkLen * 1.05))
      const wEase = 1 - 0.22 * smoothstep(t) // 只降到 0.78 倍，不收尖到 0——铲瓣而非针尖
      fs.push({ at: p, ry: opts.thickness * 0.72 * (1 - t * 0.2), rz: opts.forkWidth * wEase })
      lastPt = p
    }
    const forkMesh = new THREE.Mesh(loft(fs, 14), material)
    forkMesh.name = 'headHornFork'
    forks.push(forkMesh)
    if (side === 1) rightTip = lastPt.clone()
    else leftTip = lastPt.clone()
  }

  return { shaft, forks, leftTip, rightTip }
}

/** 胫节末端一对小钩爪（同 hercules-beetle.ts legClaws()，本文件重新实现）。 */
function legClaws(tip: THREE.Vector3, forward: THREE.Vector3, size: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  let side = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0))
  if (side.lengthSq() < 1e-8) side.set(0, 0, 1)
  side = side.normalize()
  for (const s of [1, -1] as const) {
    const clawTip = tip
      .clone()
      .addScaledVector(forward, size * 1.8)
      .addScaledVector(side, s * size * 0.6)
      .addScaledVector(new THREE.Vector3(0, -1, 0), size * 1.35)
    g.add(
      new THREE.Mesh(
        loft([{ at: tip, ry: size * 0.5, rz: size * 0.5 }, { at: clawTip, ry: 0.004, rz: 0.004 }], 7),
        material,
      ),
    )
  }
  return g
}

// ---------------------------------------------------------------- 主体

export function buildGoliathBeetle(): InsectModel {
  const g = new THREE.Group()

  // 前胸背板/头/角/足统一用近黑色；鞘翅是独立的棕红栗色——两者的强烈
  // 色相反差正是本种识别要点。⚠️ 鞘翅质感**不走** kit.elytra() 那条
  // "清漆+微金属"釉质路线：本种真实观感是天鹅绒质感、不反光（词典
  // 数据层 hotspot 原文明确写着「鞘翅是天鹅绒质感的栗褐色，不反光」
  // 「前胸背板...同样覆有天鹅绒质感的斑纹」），这是 Goliathus 属区别于
  // 大多数金龟总科（多半釉光锃亮）最显著的质感特征之一，因此全身统一
  // 走 chitin() 的低 gloss、零/极低 clearcoat、零 metal 路线，不用
  // elytra() 辅助函数。基色仍比"想要的观感"压深一档（ACES 色调映射
  // 会把受光面提亮去饱和，同 burying-beetle.ts 橙带的教训）——不过
  // 哑光材质本身高光少、被 tone mapping 冲淡的幅度也比釉面小得多，
  // 因此不需要像釉面材质那样压得那么极端深。
  //
  // ⚠️⚠️ 返工记录：「压深一档」这条经验对纵条白斑其实是反的——上一轮把
  // stripeMat 也当彩色色块一起压深（gloss 只给 0.18、无 clearcoat），
  // 实机渲染出来纵条读成与黑底几乎同色的深灰，招牌白纵条直接消失。白
  // 斑要靠高光/清漆"提"到白，不是靠压深防过曝。现改回参照 ladybird.ts
  // 白斑（pronotumSpotMat：#f2ede0/gloss 0.5/clearcoat 0.28）已实机验证
  // 过的亮度与清漆量级。bodyMat 顺带对齐 #1a1512 这个统一近黑参照值。
  const bodyMat = chitin({ color: '#1a1512', gloss: 0.24, metal: 0, clearcoat: 0.06 })
  const shellMat = chitin({ color: '#4a2415', gloss: 0.2, metal: 0, clearcoat: 0.04 })
  const stripeMat = chitin({ color: '#f0e6d2', gloss: 0.5, clearcoat: 0.3 }) // 蜡质白斑已改走"高光提亮"路线：同 ladybird.ts pronotumSpotMat 配方，靠 gloss/clearcoat 而非基色本身读出「白」
  const hornMat = chitin({ color: '#0c0a08', gloss: 0.32, metal: 0.04, clearcoat: 0.1 })
  const legMat = chitin({ color: '#100e0c', gloss: 0.3, metal: 0.04, clearcoat: 0.08 })
  const antennaMat = chitin({ color: '#141210', gloss: 0.26 })

  // ---- 腹面体躯：全身唯一的连续基底，flat 取中间值（1.24）——比
  // flower-chafer 的扁平体型（1.75~1.8）更厚重，贴近"巨大而厚重"的
  // 体型描述，但仍保留花金龟亚科略扁于独角仙一路的基本调性。
  const belly = new THREE.Mesh(
    spindle([-4.85, 0.06, 0], [2.6, 0.18, 0], 1.7, { bulge: 0.4, flat: 1.24, taperStart: 0.08, taperEnd: 0.5 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：两片高度隆起的硬壳，均匀棕红栗色，不带任何贴面装饰
  // （本种鞘翅没有斑点/条纹，与前胸背板的黑白纵条形成全部反差）
  const eSteps = 26
  const eFrom = 0.5
  const eTo = -5.15
  const eZ = 0.82
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.6) * Math.PI * 0.92) * 1.62
    elytronSections.push({
      at: new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.58 - 0.26 * t * t, 0),
      ry: Math.max(w * 0.62, 0.02),
      rz: Math.max(w * 0.44, 0.02),
    })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 28), shellMat)
    shell.position.z = side * eZ
    shell.scale.set(1, 1.05, 1.04)
    shell.name = 'elytra'
    g.add(shell)
  }

  // ---- 小盾片：两鞘翅基部之间的三角小片，鞘翅目通用识别点
  g.add(
    new THREE.Mesh(
      spindle([0.56, 0.68, 0], [0.32, 0.66, 0], 0.22, { bulge: 0.15, flat: 1.35, taperStart: 0.9, taperEnd: 0.05 }),
      bodyMat,
    ),
  )

  // ---- 前胸背板：自建放样（而非 kit.spindle()），以便携带 sections/
  // centers 供 pronotumStripe() 反推曲面坐标。宽度两端都不收尖到 0
  // （wFrac 在 t=0 时仍是 0.5），保证纵条能贯到前后两缘。
  const pronotumFromX = 2.55
  const pronotumToX = 0.5
  const pSteps = 16
  const pronotumSections: Section[] = []
  const pronotumCenters: THREE.Vector3[] = []
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps
    const wFrac = THREE.MathUtils.lerp(0.8, 1.0, smoothstep(t))
    const c = new THREE.Vector3(THREE.MathUtils.lerp(pronotumFromX, pronotumToX, t), 0.66, 0)
    pronotumCenters.push(c)
    pronotumSections.push({ at: c, ry: Math.max(1.0 * wFrac * 0.34, 0.02), rz: Math.max(1.0 * wFrac * 0.98, 0.02) })
  }
  const pronotumMesh = new THREE.Mesh(loft(pronotumSections, 30), bodyMat)
  pronotumMesh.name = 'pronotum'
  g.add(pronotumMesh)

  // ---- 招牌纵条：黑底上 5 条清晰白色纵条，theta 在顶部弧线上等距展开
  // （-66°~66°，5 条间距 33°，每条半宽仅 4°）。⚠️ 等角度间距不等于等
  // Z 间距——sin() 在接近 ±90° 处变化率会收窄，加上前胸背板本身前后
  // 端宽度有差（wFrac 0.8~1.0），两个效应叠加会让最外侧一对纵条在
  // Z 上比看起来的间距更容易碰头（第一版 wFrac 0.52~1.0 配 32° 间距
  // 就在这里实测碰了——最外侧两条 Z 区间实际重叠了一截，已修正：把
  // wFrac 收窄到 0.8~1.0、间距加宽到 33°/半宽收到 4°，让最紧的一对
  // 间隙也留出安全余量，不是凭感觉调的，是跑过 __tests__/beetles7
  // .test.ts 的真实测量数字反推出来的）。
  const stripeThetas = [-66, -33, 0, 33, 66]
  for (const theta of stripeThetas) {
    g.add(pronotumStripe(pronotumSections, pronotumCenters, theta, 4, 0.04, 0.96, stripeMat))
  }

  // ---- 头部：小，大半藏在前胸背板前缘下方
  const head = new THREE.Mesh(
    spindle([pronotumFromX, 0.7, 0], [3.5, 0.74, 0], 0.62, { bulge: 0.4, flat: 1.15, taperStart: 0.78, taperEnd: 0.4 }),
    bodyMat,
  )
  g.add(head)

  // ---- 头角：Y 形分叉，全程扁平，两瓣不收尖（见 spadeHorn 注释）。
  // pitch 压得很小（10°）——真实个体的角近乎水平前伸，不像独角仙那样
  // 大幅上扬。
  const horn = spadeHorn(new THREE.Vector3(3.42, 0.86, 0), 1.35, hornMat, {
    pitch: 10,
    curve: 0.1,
    thickness: 0.11,
    width: 0.25,
    forkLen: 0.62,
    forkAngle: 36,
    forkWidth: 0.17,
  })
  g.add(horn.shaft, ...horn.forks)

  // ---- 复眼
  g.add(compoundEyePair({ at: [3.62, 0.86, 0.44], radius: 0.2, color: '#0d0b0a', flatten: 0.84, facets: true }))

  // ---- 鳃叶状触角（金龟总科共有特征，未设专属 anchor，同 hercules-beetle.ts 先例）
  g.add(
    antennaPair(
      { base: [3.78, 0.68, 0.24], length: 0.55, kind: 'lamellate', pitch: -6, yaw: 32, thickness: 0.045 },
      antennaMat,
    ),
  )

  // ---- 六足：粗壮，胫节带刺，末端加钩爪
  const legSpecs: LegSpec[] = [
    { base: [2.15, -0.36, 1.06], femur: 1.5, tibia: 1.55, thickness: 0.17, splay: 34, sweep: -36, knee: 68, spines: true },
    { base: [0.55, -0.46, 1.18], femur: 1.65, tibia: 1.78, thickness: 0.18, splay: 30, sweep: 4, knee: 72, spines: true },
    { base: [-1.05, -0.46, 1.12], femur: 1.82, tibia: 2.0, thickness: 0.185, splay: 26, sweep: 40, knee: 76, spines: true },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) {
    const [right, left] = rig.children as THREE.Group[]
    const tip = right.userData.tip as THREE.Vector3
    const knee = right.userData.knee as THREE.Vector3
    const forward = new THREE.Vector3().subVectors(tip, knee).normalize()
    right.add(legClaws(tip, forward, 0.062, legMat))
    left.add(legClaws(tip, forward, 0.062, legMat))
    g.add(rig)
  }
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  // stripe anchor 取正背中线（theta=0）那条纵条的中点，与 pronotum anchor
  // 用同一份 sections/centers 反推，确保两者都落在真实渲染出的曲面上
  const stripeAnchor = surfaceAt(pronotumSections, pronotumCenters, 0, 0.5, 0).pos
  const pronotumAnchor = surfaceAt(pronotumSections, pronotumCenters, 0, 0.5, 0).pos.clone()
  pronotumAnchor.y += 0.5 // 略抬高，落在背板隆起最高点附近而非表面切点

  const anchors: Record<string, THREE.Vector3> = {
    headHorn: horn.leftTip.clone().add(horn.rightTip).multiplyScalar(0.5),
    elytra: new THREE.Vector3(-2.6, 1.9, eZ * 0.85),
    stripe: stripeAnchor,
    eye: new THREE.Vector3(3.62, 0.94, 0.5),
    leg: midLegTip.clone(),
    pronotum: pronotumAnchor,
  }

  return finalize(g, anchors)
}
