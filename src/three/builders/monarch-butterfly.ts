/**
 * 帝王蝶 Danaus plexippus
 *
 * 造型要点：
 * - 鳞翅目最强的辨识特征不是体形而是翅——本种用橙底 + 黑色放射翅脉
 *   + 黑色缘带 + 缘带上一圈白斑还原经典的「彩绘玻璃」翅面，且落在
 *   半展开姿态（约 60°展角 + 上扬），对应标本/栖息时的常见停栖姿势
 *   （帝王蝶极少完全平摊翅膀，那是展翅板标本的姿势，不是活体常态）。
 * - 虹吸式口器（喙）是鳞翅目区别于其他有翅昆虫的标志：口器退化为一对
 *   下颚延长并咬合成的中空管道，不用时靠环肌卷成钟表发条状的平面螺旋，
 *   收在头下。本文件自写 `coiledProboscis` 用等距收紧的螺旋线放样实现。
 * - 前足退化是蛱蝶科（Nymphalidae，帝王蝶所属科）的科级特征：前足失去
 *   步行功能、萎缩成一对贴胸收拢的「刷状足」，只用中足与后足站立/抓握。
 *   本文件用极短、大幅屈曲的前足腿节表现这一点。
 * - 棒状触角（末端膨大）是蝶类 vs 蛾类最直观的区分特征之一。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  registerWing,
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/**
 * 虹吸式口器：一段从头部伸出、逐渐收紧收细的平面螺旋管。
 * 现生鳞翅目成虫的喙不吸食时呈盘卷状，是本目最独有的外部特征。
 */
function coiledProboscis(
  base: THREE.Vector3,
  opts: { turns: number; startRadius: number; drift: number; thickness: number; steps?: number },
  material: THREE.Material,
): { mesh: THREE.Mesh; core: THREE.Vector3 } {
  const steps = opts.steps ?? 44
  // 先在局部坐标原点生成螺旋（第一点固定在 (startRadius,0,0)），
  // 最后整体平移，使螺旋起点精确落在头部基点上，不留缝隙。
  const raw: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ang = t * opts.turns * Math.PI * 2
    // 半径随圈数收紧——喙从基部到末梢逐渐盘紧成钟表发条状
    const rad = opts.startRadius * (1 - t * 0.86)
    raw.push(new THREE.Vector3(rad * Math.cos(ang), rad * Math.sin(ang) - t * opts.drift, 0))
  }
  const offset = base.clone().sub(raw[0])
  const sections: Section[] = raw.map((p, i) => {
    const t = i / steps
    const r = opts.thickness * (1 - t * 0.6)
    return { at: p.clone().add(offset), ry: Math.max(r, 1e-4), rz: Math.max(r, 1e-4) }
  })
  const core = raw[raw.length - 1].clone().add(offset) // 螺旋卷心，作为 anchor
  return { mesh: new THREE.Mesh(loft(sections, 8), material), core }
}

/** 复刻 kit.antenna() 内部的弧线公式，在不构建触角网格的前提下算出末梢精确坐标（供 anchor 用）。 */
function approxAntennaTip(base: THREE.Vector3, length: number, pitchDeg: number, yawDeg: number): THREE.Vector3 {
  const pitch = THREE.MathUtils.degToRad(pitchDeg)
  const yaw = THREE.MathUtils.degToRad(yawDeg)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  const droop = length * 0.12
  const zTerm = Math.sin(Math.PI * 0.5) * length * 0.12 * Math.sign(yaw || 1)
  return base.clone().addScaledVector(dir, length).add(new THREE.Vector3(0, -droop, zTerm))
}

/**
 * 加粗的主翅脉：kit.wingVeins() 里的翅脉半径是写死的绝对值 0.009，与
 * spec.length/width 无关。对帝王蝶这种翅长 4+ 的大翅膀而言，这个绝对值
 * 只占翅宽的 1% 左右，实测渲染出来近乎发丝般的细线，帝王蝶最标志性的
 * "橙底粗黑脉"图案基本看不见。kit.ts 是只读的共享文件（12 个物种都依赖
 * 它），不能为了这一个物种改它的默认粗细，所以这里另写一版半径按
 * spec.width 成比例缩放、明显更粗的主脉，只供本文件使用；纵脉之间保留
 * 与 kit.wingVeins() 相同的横脉网，一并加粗。
 */
function boldWingVeins(spec: WingSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  const baseR = spec.width * 0.02 // 主脉基部半径，随翅宽缩放，而非写死的绝对值
  const veinY = (t: number) => THREE.MathUtils.lerp(halfW * 0.84, -halfW * 0.58, t)
  const veinEndX = (t: number) => spec.length * THREE.MathUtils.lerp(0.6, 0.96, Math.sin(t * Math.PI))

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const endY = veinY(t)
    const endX = veinEndX(t)
    const sections: Section[] = []
    const steps = 12
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      const x = spec.length * 0.035 + (endX - spec.length * 0.035) * s
      const y = THREE.MathUtils.lerp(0, endY, Math.pow(s, 0.75))
      const r = baseR * (1 - s * 0.75) * (i === 0 || i === count - 1 ? 1.35 : 1)
      sections.push({ at: new THREE.Vector3(x, 0.0016, y), ry: Math.max(r, 0.005), rz: Math.max(r, 0.005) })
    }
    g.add(new THREE.Mesh(loft(sections, 8), material))
  }

  // 横脉：把纵脉连成网，帝王蝶翅脉图案里前段密、近翅尖处稀疏
  for (let i = 0; i < count - 1; i++) {
    for (const s of [0.4, 0.66]) {
      const t0 = i / (count - 1)
      const t1 = (i + 1) / (count - 1)
      const y0 = veinY(t0) * s
      const y1 = veinY(t1) * s
      const x = spec.length * s * 0.85
      g.add(
        new THREE.Mesh(
          loft(
            [
              { at: new THREE.Vector3(x, 0.0016, y0), ry: baseR * 0.32, rz: baseR * 0.32 },
              { at: new THREE.Vector3(x * 1.02, 0.0016, y1), ry: baseR * 0.32, rz: baseR * 0.32 },
            ],
            6,
          ),
          material,
        ),
      )
    }
  }
  return g
}

/** 翅缘外轮廓在翅局部坐标系里的采样点，复刻 kit.wingGeometry 的坐标约定（供边框/白斑复用）。 */
function outlinePoint(spec: WingSpec, xFrac: number, edge: 'lead' | 'trail'): THREE.Vector2 {
  const outline = spec.outline!
  let y = 0
  for (let i = 0; i < outline.length - 1; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[i + 1]
    if (xFrac >= x0 && xFrac <= x1) {
      const t = x1 === x0 ? 0 : (xFrac - x0) / (x1 - x0)
      y = THREE.MathUtils.lerp(y0, y1, t)
      break
    }
  }
  const halfW = spec.width * 0.5
  const z = edge === 'lead' ? y * halfW : -y * halfW * 0.72
  return new THREE.Vector2(xFrac * spec.length, z)
}

/** 翅缘黑色带：外轮廓与一圈向几何中心内缩的轮廓之间抠出的环带，扣孔后拉伸成形。 */
function wingBorderGeometry(spec: WingSpec, inset: number, thickness: number): THREE.BufferGeometry {
  const outline = spec.outline!
  const outerPts: THREE.Vector2[] = []
  for (const [x, y] of outline) outerPts.push(new THREE.Vector2(x * spec.length, y * spec.width * 0.5))
  for (let i = outline.length - 1; i >= 0; i--) {
    const [x, y] = outline[i]
    outerPts.push(new THREE.Vector2(x * spec.length, -y * spec.width * 0.5 * 0.72))
  }
  const shape = new THREE.Shape(outerPts)
  const cx = spec.length * 0.5
  const innerPts = outerPts.map((p) => new THREE.Vector2(cx + (p.x - cx) * inset, p.y * inset))
  shape.holes.push(new THREE.Path(innerPts))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 22 })
  geo.rotateX(Math.PI / 2)
  geo.translate(0, 0.0028, 0) // 略高出翅面，避免与橙色翅面共面导致 z-fighting
  return geo
}

/** 缘带上的一圈白斑：沿前缘/后缘各取若干采样点，落在边框带中部。 */
function wingSpots(spec: WingSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const xFrac = 0.16 + (i / (count - 1)) * 0.76 // 避开翅基与翅尖，斑点分布在边缘中段
    for (const edge of ['lead', 'trail'] as const) {
      const p = outlinePoint(spec, xFrac, edge)
      const halfW = spec.width * 0.5
      const inward = edge === 'lead' ? -0.16 * halfW : 0.16 * halfW
      const spot = new THREE.Mesh(new THREE.SphereGeometry(spec.width * 0.045, 8, 6), material)
      spot.scale.set(1, 0.32, 1)
      spot.position.set(p.x, 0.0038, p.y + inward)
      g.add(spot)
    }
  }
  return g
}

interface MonarchWingMats {
  face: THREE.Material
  vein: THREE.Material
  border: THREE.Material
  spot: THREE.Material
}

/** 一片完整的蝶翅（翅面+翅脉+缘带+白斑），已按 spread/tilt 摆好半展姿态；复刻 kit.wing() 的枢轴装配方式。 */
function monarchWing(
  spec: WingSpec,
  mats: MonarchWingMats,
  veinCount: number,
  borderInset: number,
  spotCount: number,
  side: 1 | -1,
): { pivot: THREE.Group; blade: THREE.Group; tipLocal: THREE.Vector3 } {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), mats.face))
  blade.add(boldWingVeins(spec, mats.vein, veinCount))
  blade.add(new THREE.Mesh(wingBorderGeometry(spec, borderInset, (spec.thickness ?? 0.012) * 1.8), mats.border))
  blade.add(wingSpots(spec, mats.spot, spotCount))
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y =
    side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side

  const tipLocal = new THREE.Vector3(spec.length * 0.94, 0, 0)
  return { pivot, blade, tipLocal }
}

/** 腹部表面点缀的白色斑点：沿背中线两侧各取一排，避开腹面（爬行/贴附面不长斑）。 */
function abdomenDots(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, rows: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (let i = 1; i <= rows; i++) {
    const t = i / (rows + 1)
    const p = new THREE.Vector3().lerpVectors(from, to, t)
    const r = THREE.MathUtils.lerp(r0, r1, t) * 0.94
    for (const ang of [0.38 * Math.PI, -0.38 * Math.PI]) {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r * 0.24, 0.004), 6, 5), material)
      dot.position.set(p.x, p.y + Math.cos(ang) * r, p.z + Math.sin(ang) * r)
      g.add(dot)
    }
  }
  return g
}

// ---------------------------------------------------------------- 建模主体

export function buildMonarchButterfly(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#171210', gloss: 0.35, clearcoat: 0.15, surface: 'velvet' }) // B轮绒面组：只躯干加绒面，翅面不动
  const legMat = chitin({ color: '#110d0b', gloss: 0.3 })
  const proboscisMat = chitin({ color: '#3a2a12', gloss: 0.55, clearcoat: 0.3 })
  const dotMat = chitin({ color: '#f4efdd', gloss: 0.2 })

  // 翅面基色取明快饱和的橙色（hue≈29°），而不是偏暗的红褐——
  // clearcoat 刻意留低（0.04），高 clearcoat 在正对光源时会把翅面反成
  // 一片灰白/发乌，鳞粉本该是接近哑光的质感。vein/border 用近黑色，
  // 且几何半径显著加粗（见 boldWingVeins/wingBorderGeometry 调用处），
  // 保证橙底 + 粗黑脉 + 黑边镶白点这组帝王蝶最标志性的图案清晰可辨。
  const wingMats: MonarchWingMats = {
    face: chitin({ color: '#e8801f', gloss: 0.22, clearcoat: 0.04, opacity: 1, side: THREE.DoubleSide }),
    vein: chitin({ color: '#140d09', gloss: 0.15, side: THREE.DoubleSide }),
    border: chitin({ color: '#120c08', gloss: 0.15, side: THREE.DoubleSide }),
    spot: dotMat,
  }

  // ---- 头 / 胸 / 腹：细长的鳞翅目体型，胸部是唯一的「肌肉块」
  const head = new THREE.Mesh(
    spindle([1.02, 0.06, 0], [1.36, 0.09, 0], 0.145, { bulge: 0.5, taperStart: 0.85, taperEnd: 0.5 }),
    bodyMat,
  )
  g.add(head)

  const thorax = new THREE.Mesh(
    spindle([0.16, 0, 0], [1.02, 0.05, 0], 0.22, { bulge: 0.45, flat: 1.05, taperStart: 0.55, taperEnd: 0.75 }),
    bodyMat,
  )
  g.add(thorax)

  const abdomenFrom = new THREE.Vector3(0.15, -0.02, 0)
  const abdomenTo = new THREE.Vector3(-1.35, -0.06, 0)
  const abdomenR0 = 0.16
  const abdomenR1 = 0.02
  g.add(
    new THREE.Mesh(
      segmentedAbdomen({
        from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
        to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
        r0: abdomenR0,
        r1: abdomenR1,
        segments: 8,
        groove: 0.2,
        bulge: 0.22,
      }),
      bodyMat,
    ),
  )
  g.add(abdomenDots(abdomenFrom, abdomenTo, abdomenR0, abdomenR1, 6, dotMat))

  // ---- 虹吸式口器：自头部前下方伸出并盘卷收紧。喙是鳞翅目最标志性的
  // 器官之一，早期版本的管径(0.022)相对头部(半径0.145)太细，渲染出来
  // 容易被当成头部阴影忽略掉——这里加粗管径、放大盘卷半径，让它在
  // 头下方清晰可辨，同时保持"盘成钟表发条状"的卷曲形态不变
  const proboscisBase = new THREE.Vector3(1.37, -0.03, 0)
  const proboscis = coiledProboscis(
    proboscisBase,
    { turns: 2.35, startRadius: 0.21, drift: 0.06, thickness: 0.032 },
    proboscisMat,
  )
  g.add(proboscis.mesh)

  // ---- 复眼：鳞翅目复眼大而近球形，占头部大半
  g.add(
    compoundEyePair({
      at: [1.28, 0.06, 0.11],
      radius: 0.13,
      color: '#231a10',
      flatten: 0.95,
      stretch: 1.02,
      facets: true,
    }),
  )

  // ---- 棒状触角：末端膨大是蝶类的招牌特征
  const antBase: [number, number, number] = [1.32, 0.13, 0.06]
  const antLength = 0.55
  const antPitch = 34
  const antYaw = 26
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'clavate', pitch: antPitch, yaw: antYaw, thickness: 0.02 }, legMat))

  // ---- 两对翅：前翅三角形、后翅圆扇形，半展开停栖姿态
  const foreOutline: [number, number][] = [
    [0, 0.06],
    [0.05, 0.42],
    [0.15, 0.78],
    [0.3, 0.98],
    [0.5, 1.0],
    [0.72, 0.78],
    [0.9, 0.42],
    [1, 0.04],
  ]
  const hindOutline: [number, number][] = [
    [0, 0.1],
    [0.1, 0.55],
    [0.25, 0.92],
    [0.45, 1.0],
    [0.65, 0.95],
    [0.85, 0.7],
    [1, 0.3],
  ]

  // kit.wing() 的 spread 参数实测与自己的文档字符串不一致（对着源码逆向验证过，
  // 结论和 cicada.ts 顶部的推导一致）：
  //   pivot.rotation.y = side*(90°-spread) + sweep =: θy
  //   偏移(局部 (length,0,0) 相对翅基) = length*(cosθy, sinθx·sinθy, -cosθx·sinθy)
  // 实测 spread=90 时翅尖指向体前方（+X），spread=180 时才是纯左右侧向（+Z，右翅）。
  // 也就是说"0=沿体轴收拢，90=完全侧展"这句文档描述的角度 φ，和 spread 的真实关系是
  //   spread = 270 + sweep − φ   （φ=0 收拢向后，φ=90 完全侧向展开）
  // φ（58/64，见下）沿用早期版本的数值不变——它决定翅在水平面上展开
  // 得多开，不是问题所在。真正让翅"像标本展翅"的是 tilt 太小（早期版本
  // -13/-7）：offset 的上下分量是 length*sinθx·sinθy，tilt 越大 |sinθx|
  // 越大、翅才越往上抬。用 tipcheck 类脚本实测 tilt=-44/-37 时单翅
  // (y,z) 尺寸比约为 tan(44°)/tan(37°)，也就是翅面与水平面确实成
  // 44°/37° 夹角，落在题目要求的 35~55° 区间，且前翅角度大于后翅，
  // 形成开口向上的 V，不再是水平摊平的标本姿态。
  // 帝王蝶的翅相对体长极不成比例地大（翅展~10cm vs 体长~2.5cm，翅单片长度
  // 比整个身体还长）——这是鳞翅目区别于甲虫/蜂类的体感关键，翅的绝对尺寸
  // 不能只按"和身体差不多大"来给，必须显著超出身体本身。
  const foreSpec: WingSpec = {
    base: [0.62, 0.15, 0.16],
    length: 4.3,
    width: 2.6,
    outline: foreOutline,
    spread: 206, // φ=64, sweep=0 → 270+0-64
    tilt: -44, // 翅面与水平面成约 44°，前翅略高于后翅
    sweep: 0,
    thickness: 0.014,
  }
  const hindSpec: WingSpec = {
    base: [0.2, 0.09, 0.14],
    length: 2.9,
    width: 3.1,
    outline: hindOutline,
    spread: 218, // φ=58, sweep=6 → 270+6-58；后翅略收在前翅之下
    tilt: -37, // 翅面与水平面成约 37°，比前翅略平一些
    sweep: 6,
    thickness: 0.014,
  }

  let foreTip = { pivot: new THREE.Group(), blade: new THREE.Group(), tipLocal: new THREE.Vector3() }
  let hindTip = { pivot: new THREE.Group(), blade: new THREE.Group(), tipLocal: new THREE.Vector3() }
  for (const side of [1, -1] as const) {
    const fw = monarchWing(foreSpec, wingMats, 9, 0.72, 6, side)
    const hw = monarchWing(hindSpec, wingMats, 7, 0.7, 5, side)
    // 骨架标记：monarchWing() 复刻的是 kit.wing() 的枢轴装配方式（pivot 已按
    // spread/tilt 摆好姿态），registerWing 补上 kit 内建 wing() 打不到的这一份。
    registerWing(fw.pivot, { side, role: 'fore' })
    registerWing(hw.pivot, { side, role: 'hind' })
    g.add(fw.pivot, hw.pivot)
    if (side === 1) {
      foreTip = fw
      hindTip = hw
    }
  }

  // ---- 六足：中足/后足纤细站立，前足因蛱蝶科退化而极短并大幅屈曲收拢
  g.add(
    legPair(
      { base: [0.95, -0.02, 0.1], femur: 0.09, tibia: 0.07, tarsus: 0.03, thickness: 0.013, splay: 12, sweep: 68, knee: 120, ankle: 90 },
      legMat,
    ),
  )
  g.add(
    legPair(
      { base: [0.55, -0.09, 0.17], femur: 0.42, tibia: 0.46, thickness: 0.028, splay: 36, sweep: -8, knee: 64 },
      legMat,
    ),
  )
  g.add(
    legPair(
      { base: [0.26, -0.1, 0.16], femur: 0.46, tibia: 0.5, thickness: 0.03, splay: 32, sweep: 30, knee: 66 },
      legMat,
    ),
  )

  // ---- anchor 精确坐标：用 Object3D.localToWorld 沿着实际装配的矩阵链读出翅尖世界坐标，
  // 避免手工重算 spread/tilt 的三角函数（那样容易和真实装配出现细微偏差）。
  g.updateMatrixWorld(true)
  const foreWingTip = foreTip.blade.localToWorld(foreTip.tipLocal.clone())
  const hindWingTip = hindTip.blade.localToWorld(hindTip.tipLocal.clone())

  const antennaTip = approxAntennaTip(new THREE.Vector3(...antBase), antLength, antPitch, antYaw)

  const anchors: Record<string, THREE.Vector3> = {
    forewing: foreWingTip,
    hindwing: hindWingTip,
    proboscis: proboscis.core,
    antenna: antennaTip,
    eye: new THREE.Vector3(1.28, 0.06, 0.11 + 0.13),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.4).add(new THREE.Vector3(0, 0.1, 0)),
  }

  return finalize(g, anchors)
}
