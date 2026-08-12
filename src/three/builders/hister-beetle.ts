/**
 * 阎甲 Hister sp.（鞘翅目·阎甲科）
 *
 * 造型要点：
 * - 「压扁的黑色小方砖」是本种存在的全部理由：轮廓近乎矩形，前后缘
 *   都平截，不是常规甲虫那种纺锤/卵圆轮廓。kit.spindle()/loft() 的
 *   截面终归是椭圆（sin/cos 参数化），永远做不出「平截边」，因此
 *   身体不走 loft 路线，改用与 tortoise-beetle.ts 的 marginGeometry()
 *   同款手法——THREE.Shape 画一圈圆角矩形闭合轮廓，ExtrudeGeometry
 *   拉伸出扁薄实体，再 rotateX(90°) 摊平到 XZ 平面：这样「前后缘平
 *   截、四角只是小圆角」的方砖轮廓才做得出来，边缘的 bevel 只给一点
 *   点，避免看着像倒角夸张的工业零件。
 * - 头/前胸背板/鞘翅/腹末露出节四段沿 X 依次排列、共用同一个扁平
 *   高度（同一个 halfHeight），拼起来读成「一整块方砖」而不是几个
 *   分开的鼓包；鞘翅刻意比腹部本身短一截（roundedBlock 的 xTo 早于
 *   腹部真实末端），腹末露出的一小节单独再放一块同样方正、但更小的
 *   block，颜色/光泽与鞘翅一致（同样是硬质角质），表现「阎甲科鞘翅
 *   截短、露出 1~2 节坚硬腹节」。
 * - 附肢能完全收进体侧凹槽：kit.leg()/legPair() 只会生成向外撑开
 *   站立的姿态、且四段肢体截面永远是圆形（seg() 内部 ry=rz=r，没有
 *   压扁的接口），画不出「胫节扁平如铲、贴体收拢」，因此自写
 *   tuckedLeg()——用 loft() 直接给出压扁的椭圆截面（tibia 段 ry 远
 *   小于 rz，做出铲状扁平），路径本身贴着体侧走、只在末端微微探出，
 *   而不是 leg() 那种向外甩开的直线折角。左右两条不靠 scale.z 镜像
 *   （kit.ts 注释里提醒过那类写法的镜像 bug），而是让 side 参数直接
 *   进方向向量的 z 分量运算，与 rove-beetle.ts 的 moniliformAntenna()
 *   同一套「显式 side 参与运算」写法。anchor key 用 tuckedLeg 而非
 *   leg，就是要和其余物种的「站立腿」区分开。
 * - 膝状触角、末端紧实的球：kit 的 geniculate 类型只管出肘状折线，
 *   末端不会像 clavate 那样膨大（膨大逻辑写死判断 kind==='clavate'），
 *   因此自写 histerAntenna()——柄节直伸一段，折肘后再接一小段，
 *   末端扣一颗球，做出「膝状+球状端锤」的组合，同 rove-beetle.ts
 *   因缺「念珠状」类型而自写 moniliformAntenna() 同理。触角整体长度
 *   压得短、贴近头部，呼应「能收进头下凹槽」的描述。
 * - 通体乌黑、镜面高光泽：不用 kit.elytra()（其 gloss/clearcoat 是为
 *   「硬亮但非镜面」的常规甲虫壳标定的中间值），改用 chitin() 直接把
 *   gloss 推到 0.9 附近、clearcoat 摸到 kit 允许的上限 0.55（阎甲科
 *   真实光泽度比多数鞘翅目更接近抛光黑曜岩）。前胸背板与鞘翅（拼接
 *   面相邻、视觉上最需要连成一体的两块）刻意共用完全相同的参数；
 *   头部与腹末露出节各自把 gloss/clearcoat 压低一点点，读出来是
 *   「主体一整块黑玉」外加两端质感略有差异，而不是四段各自为政。
 */
import * as THREE from 'three'
import { chitin, compoundEyePair, finalize, loft, type InsectModel, type Section } from './kit'
import { punctateMaps } from './surface'

// ---------------------------------------------------------------- 局部辅助：方砖体块

/**
 * 圆角矩形闭合轮廓 + 极薄挤出，摊平到 XZ 平面——同 tortoise-beetle.ts
 * marginGeometry() 的手法，但轮廓换成「前后缘平截、四角小圆角」的
 * 矩形而非卵圆，这样才有「方砖」的平直边。
 * @param xFrom 前缘 x（大） @param xTo 后缘 x（小） @param halfWidth 半宽（z）
 * @param halfHeight 半高，决定挤出厚度 @param corner 圆角半径
 */
function roundedBlock(
  xFrom: number,
  xTo: number,
  halfWidth: number,
  halfHeight: number,
  corner: number,
  crown = 0,
): THREE.BufferGeometry {
  const len = xFrom - xTo
  const c = Math.min(corner, len * 0.4, halfWidth * 0.7)
  const shape = new THREE.Shape()
  // 在局部 (u,v) = (沿长度, 沿宽度) 平面画圆角矩形，之后整体当成 (x,z) 使用
  shape.moveTo(-len / 2 + c, -halfWidth)
  shape.lineTo(len / 2 - c, -halfWidth)
  shape.quadraticCurveTo(len / 2, -halfWidth, len / 2, -halfWidth + c)
  shape.lineTo(len / 2, halfWidth - c)
  shape.quadraticCurveTo(len / 2, halfWidth, len / 2 - c, halfWidth)
  shape.lineTo(-len / 2 + c, halfWidth)
  shape.quadraticCurveTo(-len / 2, halfWidth, -len / 2, halfWidth - c)
  shape.lineTo(-len / 2, -halfWidth + c)
  shape.quadraticCurveTo(-len / 2, -halfWidth, -len / 2 + c, -halfWidth)

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: halfHeight * 2,
    bevelEnabled: true,
    bevelSize: halfHeight * 0.22,
    bevelThickness: halfHeight * 0.22,
    bevelSegments: 2,
    curveSegments: 10,
  })
  g.rotateX(Math.PI / 2) // 摊平到 XZ 平面：挤出深度方向(局部 z)变成世界 -Y
  g.translate((xFrom + xTo) / 2, halfHeight, 0)

  /*
   * 背向拱起 —— 2026-08-12 返工加的。
   *
   * ExtrudeGeometry 给出的是**平顶棱柱**：四段共用同一个 halfHeight，拼起来
   * 整个背面是一整片水平平板。实拍下这只虫读成了一块黑色工业塑料件，而
   * vitest 全绿（几何合法、面数达标、包围盒比例也在范围内）—— 又一次
   * 「数字对、长相不对」。
   *
   * 阎甲确实方，但它是**强烈隆起**的方：背面从中线向两侧和前后滑落。这里
   * 把顶面顶点按到中心的距离抬高，纵向(u)拱得缓、横向(v)拱得急，正是鞘翅
   * 横截面比纵剖面更弯的实际形状。
   */
  if (crown > 0) {
    g.computeBoundingBox()
    const bb = g.boundingBox as THREE.Box3
    const yMid = (bb.min.y + bb.max.y) / 2
    const span = Math.max(bb.max.y - yMid, 1e-6)
    const cx = (xFrom + xTo) / 2
    const halfLen = Math.max(len / 2, 1e-6)
    const pos = g.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (y <= yMid) continue // 只动背面，腹面保持平坦——阎甲腹面本就平贴地面
      const u = (pos.getX(i) - cx) / halfLen
      const v = pos.getZ(i) / Math.max(halfWidth, 1e-6)
      const r2 = Math.min(1, u * u * 0.5 + v * v)
      const t = (y - yMid) / span // 越靠顶面抬得越多，侧壁几乎不动
      pos.setY(i, y + crown * (1 - r2) * t)
    }
    pos.needsUpdate = true
    g.computeVertexNormals()
  }
  return g
}

/**
 * 收拢贴体的扁平肢：胫节段用压扁椭圆截面（ry«rz）做出「铲状」，
 * 整条路径贴着体侧走、末端只微微探出，而非向外撑开站立。
 * side 直接参与方向向量的 z 分量运算（不靠 scale 镜像）。
 */
function tuckedLeg(
  base: THREE.Vector3,
  side: 1 | -1,
  opts: { femur: number; tibiaLen: number; thickness: number; hug: number },
  material: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const th = opts.thickness

  // 基节→腿节转折点：紧贴体侧向后偏，几乎不外张
  const knee = base.clone().add(new THREE.Vector3(-opts.femur * 0.55, -opts.femur * 0.12, side * opts.femur * 0.22))
  // 胫节（铲状扁平段）：继续贴体向后向下，末端略往身体中线收（收拢感）
  const ankle = knee.clone().add(new THREE.Vector3(-opts.tibiaLen * 0.5, -opts.tibiaLen * 0.28, side * opts.tibiaLen * (0.18 - opts.hug)))
  // 跗节：小小一段收在体下
  const tip = ankle.clone().add(new THREE.Vector3(-opts.tibiaLen * 0.22, -opts.tibiaLen * 0.05, side * opts.tibiaLen * 0.05))

  const roundSeg = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    const steps = 6
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3().lerpVectors(a, b, t), ry: r, rz: r })
    }
    return new THREE.Mesh(loft(sections, 10), material)
  }
  const flatSeg = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    // 扁平铲状：ry 远小于 rz
    const steps = 8
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3().lerpVectors(a, b, t), ry: Math.max(r * 0.32, 1e-4), rz: r })
    }
    const m = new THREE.Mesh(loft(sections, 10), material)
    m.name = 'tuckedLeg'
    return m
  }

  g.add(roundSeg(base, knee, th * 1.3, th * 0.85))
  g.add(flatSeg(knee, ankle, th * 1.0, th * 0.75)) // 扁平的铲状胫节
  g.add(flatSeg(ankle, tip, th * 0.6, th * 0.3))

  for (const [p, r] of [
    [base, th * 1.35],
    [knee, th * 0.9],
  ] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material)
    j.position.copy(p)
    j.name = 'tuckedLeg'
    g.add(j)
  }

  g.userData.tip = tip
  return g
}

/** 膝状+球状端锤触角：柄节直伸，折肘后再接短段，末端扣一颗紧实小球 */
function histerAntenna(base: THREE.Vector3, side: 1 | -1, scapeLen: number, clubLen: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  g.userData.phase = side >= 0 ? 0 : Math.PI * 0.62 // 左右错相位（此类自写触角常左右共用 base，不能按 z 符号判）
  const pitch = THREE.MathUtils.degToRad(24)
  const yaw = side * THREE.MathUtils.degToRad(38)
  const dir1 = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  const elbow = base.clone().addScaledVector(dir1, scapeLen)
  const dir2 = new THREE.Vector3(-0.25, -0.32, side * 0.7).normalize()
  const tip = elbow.clone().addScaledVector(dir2, clubLen)

  const scapeSections: Section[] = []
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    const r = thickness * (1 - t * 0.35)
    scapeSections.push({ at: new THREE.Vector3().lerpVectors(base, elbow, t), ry: r, rz: r })
  }
  g.add(new THREE.Mesh(loft(scapeSections, 10), material))

  const funicleSections: Section[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    const r = thickness * (0.62 - t * 0.2)
    funicleSections.push({ at: new THREE.Vector3().lerpVectors(elbow, tip, t), ry: r, rz: r })
  }
  g.add(new THREE.Mesh(loft(funicleSections, 10), material))

  const ball = new THREE.Mesh(new THREE.SphereGeometry(thickness * 1.7, 14, 12), material)
  ball.position.copy(tip)
  g.add(ball)

  g.userData.tip = tip
  return g
}

// ---------------------------------------------------------------- 主体

export function buildHisterBeetle(): InsectModel {
  const g = new THREE.Group()

  // 通体乌黑、镜面高光泽：gloss 推高、clearcoat 摸到 kit 允许的上限 0.55
  const headMat = chitin({ color: '#0a0908', gloss: 0.88, clearcoat: 0.5 })
  const pronotumMat = chitin({ color: '#0a0908', gloss: 0.9, clearcoat: 0.55 })
  const elytraMat = chitin({ color: '#0a0908', gloss: 0.9, clearcoat: 0.55 })
  const abdomenMat = chitin({ color: '#0a0908', gloss: 0.86, clearcoat: 0.48 })
  const legMat = chitin({ color: '#100e0c', gloss: 0.7, clearcoat: 0.4 })
  const antennaMat = chitin({ color: '#0a0908', gloss: 0.8, clearcoat: 0.4 })
  const eyeColor = '#050403'

  // B3 刻点组：稀疏大刻点——阎甲科真实体表是大而疏的刻点，不是密集细砂，
  // 默认密度 260/0.016 偏密偏小，手动调低密度、放大坑径；高光泽维持，
  // 这里只挂 normalMap/roughnessMap，不碰上面四份材质已经调好的
  // gloss/clearcoat。头/前胸/鞘翅/腹末四段拼起来读成"一整块黑玉"
  // （文件头注释），因此四份材质共用同一张贴图（全局缓存本就该这么用）。
  const dorsalPunctate = punctateMaps(70, 0.028)
  if (dorsalPunctate) {
    for (const m of [headMat, pronotumMat, elytraMat, abdomenMat]) {
      m.normalMap = dorsalPunctate.normal
      m.roughnessMap = dorsalPunctate.roughness
    }
  }

  const halfHeight = 0.11 // 全身共用的半高，拼起来读成一整块方砖
  const halfWidth = 0.25

  // ---- 头部：小，前缘 X 最大。mesh.name 与 anchor key 对齐（同 rove-beetle/
  // tortoise-beetle 的约定），测试要量「躯干宽度」时把 head/pronotum/elytra/
  // abdomen 四段并集起来即可，不需要另外发明一个聚合用的 name。
  const headXFrom = 0.4
  const headXTo = 0.32
  const headMesh = new THREE.Mesh(roundedBlock(headXFrom, headXTo, halfWidth * 0.62, halfHeight * 0.82, 0.055, 0.018), headMat)
  headMesh.name = 'head'
  g.add(headMesh)

  // ---- 前胸背板：窄圆筒不适用于本种——改用与头部/鞘翅同高的方砖段
  const pronotumXFrom = headXTo + 0.03 // 前探进头部，填掉圆角在接缝处留下的凹口
  const pronotumXTo = 0.02
  const pronotumMesh = new THREE.Mesh(roundedBlock(pronotumXFrom, pronotumXTo, halfWidth, halfHeight, 0.085, 0.05), pronotumMat)
  pronotumMesh.name = 'pronotum'
  g.add(pronotumMesh)

  // ---- 鞘翅：截短——不覆盖到腹部真实末端，露出腹末 1~2 节
  const elytraXFrom = pronotumXTo + 0.035 // 同上，前探进前胸背板
  const elytraXTo = -0.28
  const elytraMesh = new THREE.Mesh(roundedBlock(elytraXFrom, elytraXTo, halfWidth * 0.98, halfHeight, 0.09, 0.075), elytraMat)
  elytraMesh.name = 'elytra'
  g.add(elytraMesh)

  // ---- 腹末露出节：比鞘翅段更小更方正，颜色光泽与鞘翅一致（同样硬质）
  const abdomenXFrom = elytraXTo + 0.03 // 同上，前探进鞘翅下方
  const abdomenXTo = -0.4
  const abdomenMesh = new THREE.Mesh(roundedBlock(abdomenXFrom, abdomenXTo, halfWidth * 0.74, halfHeight * 0.86, 0.05, 0.03), abdomenMat)
  abdomenMesh.name = 'abdomen'
  g.add(abdomenMesh)

  // ---- 复眼：小，嵌在头部前侧
  g.add(compoundEyePair({ at: [headXFrom - 0.02, 0.01, 0.09], radius: 0.028, color: eyeColor, flatten: 0.8, facets: false }))

  // ---- 膝状触角，末端紧实小球，整体短小贴近头部（呼应「能收进头下凹槽」）
  // base 的 z 分量必须显式乘 side 再传入——只让 dir1 的 yaw 变号、base 却
  // 两侧共用同一个点，会让两条触角从头部同一侧长出、其中一条斜穿头部到
  // 对侧（同 kit.ts 里 legPair 注释警告过的镜像 bug），故在此就地按 side 镜像。
  const antBaseZ = 0.1
  const antRigs = ([1, -1] as const).map((side) =>
    histerAntenna(new THREE.Vector3(headXFrom - 0.03, 0.02, antBaseZ * side), side, 0.13, 0.07, 0.02, antennaMat),
  )
  for (const rig of antRigs) g.add(rig)
  const antennaTip = antRigs[0].userData.tip as THREE.Vector3

  // ---- 六足：完全收拢贴体，胫节扁平如铲，Z 向展开跨度远小于站立姿态
  const legBases: [number, number, number][] = [
    [pronotumXFrom - 0.05, -0.09, 0.16],
    [0.14, -0.095, 0.19],
    [-0.06, -0.095, 0.17],
  ]
  const legOpts = { femur: 0.16, tibiaLen: 0.15, thickness: 0.026, hug: 0.1 }
  const legRigs: THREE.Group[] = []
  for (const base of legBases) {
    for (const side of [1, -1] as const) {
      const rig = tuckedLeg(new THREE.Vector3(base[0], base[1], base[2] * side), side, legOpts, legMat)
      legRigs.push(rig)
      g.add(rig)
    }
  }
  const tuckedLegTip = legRigs[0].userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    // ⚠️ Y 一律压在 halfHeight 以内：原先背面三个锚点写的是 halfHeight*2 / *1.3 / *1.4，
    // 意思大概是「抬到背上方一点」，实际把圆点抬出了整个包围盒（实测高出体顶 0.09），
    // 界面上就是三个热点悬在甲虫背上方的空气里。热点是 HTML 覆盖层、本来就画在最上层，
    // 不需要靠抬高来避免被埋进网格。（anchors-have-geometry.test.ts 会盯着）
    elytra: new THREE.Vector3((elytraXFrom + elytraXTo) / 2, halfHeight * 0.9, halfWidth * 0.6),
    tuckedLeg: tuckedLegTip.clone(),
    head: new THREE.Vector3((headXFrom + headXTo) / 2, halfHeight * 0.8, halfWidth * 0.5),
    antenna: antennaTip.clone(),
    pronotum: new THREE.Vector3((pronotumXFrom + pronotumXTo) / 2, halfHeight * 0.9, 0),
    abdomen: new THREE.Vector3((abdomenXFrom + abdomenXTo) / 2, halfHeight * 0.85, halfWidth * 0.4),
  }

  return finalize(g, anchors)
}
