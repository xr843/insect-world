/**
 * 玉带凤蝶 Papilio polytes
 *
 * 造型要点：
 * - 后翅尾突（tail）是凤蝶科（Papilionidae）最招牌的外部特征：翅脉 M3
 *   在后翅外缘延伸出体壁，形成一根不带翅膜、纯粹由翅脉本身构成的细长
 *   指状突起，末端因翅脉端头的角质增厚而略微膨大。kit 的 wingGeometry
 *   只描边到主轮廓为止，不含这种"轮廓之外"的附属结构，所以本文件在
 *   翅局部坐标系里另起一段放样：取后缘（trailing edge）上尾突着生点，
 *   沿"翅基→着生点"的径向方向继续向外延伸（而不是顺着翅缘切线方向），
 *   这样尾突才会呈现真实的"从翅脉发散状态延续出去"的角度，而不是贴着
 *   翅缘拐弯。挂在翅的 blade 分组下，天然继承 spread/tilt 姿态。
 * - 翅色是本种得名之由：黑底天鹅绒质感（低光泽、几乎无清漆，鳞粉的
 *   哑光观感），前翅外缘一列白斑，后翅中段横贯一条完整的白色横带
 *   （"玉带"），后翅外缘再缀一列红色新月斑（用 TorusGeometry 的
 *   partial arc 压扁而成，比单纯的扁球更接近真实新月形）。
 * - 停栖 V 姿：翅面与水平面成 40~50°，前翅角度略大于后翅（"略高于
 *   后翅"），且前翅翅基位置略靠前靠上、后翅略靠后靠下，使前翅自然
 *   遮住后翅前缘一部分——这组角度与位置关系的推导见下方
 *   `spread = 270 + sweep − φ` 注释（φ=0 收拢贴尾，φ=90 完全侧展，
 *   经验证与 kit.wing() 的实际旋转矩阵一致，抄自 monarch-butterfly.ts /
 *   cicada.ts 顶部已验证过的推导，不是本文件独立发明）。
 * - 凤蝶科三对足全部具备正常步行功能，不像蛱蝶科（帝王蝶所属）那样
 *   前足退化——本文件三对足只在长度上略有差异，不做蛱蝶那种大幅屈曲
 *   收拢的处理，这是与 monarch-butterfly.ts 刻意不同的地方。
 * - 虹吸式口器盘卷收在头下前方，做法与帝王蝶一致（自写 `coiledProboscis`，
 *   不从 monarch-butterfly.ts 导入——各物种文件不互相依赖，保持独立可编译）。
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
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/** 虹吸式口器：从头部伸出、逐圈收紧的平面螺旋管，不吸食时盘成钟表发条状。 */
function coiledProboscis(
  base: THREE.Vector3,
  opts: { turns: number; startRadius: number; drift: number; thickness: number; steps?: number },
  material: THREE.Material,
): THREE.Mesh {
  const steps = opts.steps ?? 40
  const raw: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ang = t * opts.turns * Math.PI * 2
    const rad = opts.startRadius * (1 - t * 0.86)
    raw.push(new THREE.Vector3(rad * Math.cos(ang), rad * Math.sin(ang) - t * opts.drift, 0))
  }
  const offset = base.clone().sub(raw[0])
  const sections: Section[] = raw.map((p, i) => {
    const t = i / steps
    const r = Math.max(opts.thickness * (1 - t * 0.6), 1e-4)
    return { at: p.clone().add(offset), ry: r, rz: r }
  })
  return new THREE.Mesh(loft(sections, 8), material)
}

/**
 * 翅局部坐标系里，沿翅长方向比例 xFrac 处前缘/后缘的 (x,z) 坐标。
 * 复刻 kit.wingGeometry() 内部对 outline 的线性插值（前缘 ×1，后缘 ×0.72），
 * 用于把尾突/色带/斑点精确钉在翅缘轮廓上，不是凭手感估的坐标。
 */
function outlinePoint(spec: WingSpec, xFrac: number, edge: 'lead' | 'trail'): THREE.Vector2 {
  const outline = spec.outline!
  let y = outline[outline.length - 1][1]
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

/**
 * 按翅宽缩放半径的主脉，kit.wingVeins() 的 0.009 绝对半径在本种这个尺寸的
 * 翅上勉强够用，但为保证黑底上仍有可辨的深色脉络纹理，这里仍自写一版
 * 按 spec.width 缩放的版本（原因见文件顶部注释与题目已知的踩坑点 #2）。
 */
function scaledWingVeins(spec: WingSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  const baseR = spec.width * 0.014
  const veinY = (t: number) => THREE.MathUtils.lerp(halfW * 0.82, -halfW * 0.56, t)
  const veinEndX = (t: number) => spec.length * THREE.MathUtils.lerp(0.6, 0.96, Math.sin(t * Math.PI))
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const endY = veinY(t)
    const endX = veinEndX(t)
    const steps = 10
    const sections: Section[] = []
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      const x = spec.length * 0.035 + (endX - spec.length * 0.035) * s
      const y = THREE.MathUtils.lerp(0, endY, Math.pow(s, 0.75))
      const r = Math.max(baseR * (1 - s * 0.78), 0.0035)
      sections.push({ at: new THREE.Vector3(x, 0.0014, y), ry: r, rz: r })
    }
    g.add(new THREE.Mesh(loft(sections, 6), material))
  }
  return g
}

/** 后翅尾突：见文件顶部注释。返回局部坐标系里的 group 与尾尖坐标（供 anchor 用）。 */
function buildTail(spec: WingSpec, material: THREE.Material): { group: THREE.Group; tipLocal: THREE.Vector3 } {
  const attachFrac = 0.86
  const margin = outlinePoint(spec, attachFrac, 'trail')
  const dir = margin.clone().normalize()
  const tailLen = spec.length * 0.26 // 约后翅长的 26%，落在题目"约 25%"的范围内
  const mid = margin.clone().addScaledVector(dir, tailLen * 0.55)
  const tip = margin.clone().addScaledVector(dir, tailLen)

  const toV3 = (p: THREE.Vector2) => new THREE.Vector3(p.x, 0.0022, p.y)
  const sections: Section[] = [
    { at: toV3(margin), ry: 0.034, rz: 0.034 },
    { at: toV3(mid), ry: 0.017, rz: 0.017 },
    { at: toV3(tip), ry: 0.011, rz: 0.011 },
  ]
  const group = new THREE.Group()
  group.name = 'tail'
  group.add(new THREE.Mesh(loft(sections, 10), material))
  // 末端略膨大：翅脉末梢角质增厚
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.019, 10, 8), material)
  bulb.position.copy(toV3(tip))
  group.add(bulb)
  return { group, tipLocal: toV3(tip) }
}

/** 缘斑：沿翅缘取若干采样点，贴一枚压扁的小球，供前翅白斑列使用。 */
function marginSpots(spec: WingSpec, material: THREE.Material, xFrom: number, xTo: number, count: number, edge: 'lead' | 'trail', size: number): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const xFrac = THREE.MathUtils.lerp(xFrom, xTo, i / (count - 1))
    const p = outlinePoint(spec, xFrac, edge)
    const inward = edge === 'lead' ? -0.14 * spec.width * 0.5 : 0.14 * spec.width * 0.5
    const spot = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 7), material)
    spot.scale.set(1, 0.3, 1)
    spot.position.set(p.x, 0.0032, p.y + inward)
    g.add(spot)
  }
  return g
}

/** 后翅中部的"玉带"：一条横贯前后缘的完整白色条带，而不是沿边缘的一串斑点。 */
function midBandGeometry(spec: WingSpec, xFrom: number, xTo: number, thickness: number): THREE.BufferGeometry {
  const outline = spec.outline!
  const yAt = (xFrac: number): number => {
    for (let i = 0; i < outline.length - 1; i++) {
      const [x0, y0] = outline[i]
      const [x1, y1] = outline[i + 1]
      if (xFrac >= x0 && xFrac <= x1) {
        const t = x1 === x0 ? 0 : (xFrac - x0) / (x1 - x0)
        return THREE.MathUtils.lerp(y0, y1, t)
      }
    }
    return outline[outline.length - 1][1]
  }
  const halfW = spec.width * 0.5
  const steps = 10
  const pts: THREE.Vector2[] = []
  for (let i = 0; i <= steps; i++) {
    const xf = THREE.MathUtils.lerp(xFrom, xTo, i / steps)
    pts.push(new THREE.Vector2(xf * spec.length, yAt(xf) * halfW))
  }
  for (let i = steps; i >= 0; i--) {
    const xf = THREE.MathUtils.lerp(xFrom, xTo, i / steps)
    pts.push(new THREE.Vector2(xf * spec.length, -yAt(xf) * halfW * 0.72))
  }
  const shape = new THREE.Shape(pts)
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 16 })
  geo.rotateX(Math.PI / 2)
  geo.translate(0, 0.0026, 0)
  return geo
}

/** 后翅外缘的红色新月斑：TorusGeometry 取一段弧（非整圈）压扁，比扁球更接近新月形。 */
function crescentSpots(spec: WingSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const xFrac = THREE.MathUtils.lerp(0.2, 0.82, i / (count - 1))
    const p = outlinePoint(spec, xFrac, 'trail')
    const inward = 0.1 * spec.width * 0.5
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.017, 6, 10, Math.PI * 0.92), material)
    crescent.position.set(p.x, 0.0032, p.y + inward)
    crescent.rotation.x = Math.PI / 2
    crescent.rotation.z = Math.PI * 0.54
    crescent.scale.set(1, 1, 0.55)
    g.add(crescent)
  }
  return g
}

interface WingMats {
  face: THREE.Material
  vein: THREE.Material
  spot: THREE.Material
  band: THREE.Material
  crescent: THREE.Material
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/**
 * spread 的姿态推导（对着 kit.ts 源码验证过，与 monarch-butterfly.ts / cicada.ts
 * 顶部的推导一致，此处不重复整段证明，只记录结论）：
 *   pivot.rotation.y = side*(90°-spread) + sweep =: θy
 *   偏移 = length*(cosθy, sinθx·sinθy, -cosθx·sinθy)
 * 把"侧展 φ 度"（φ=0 收拢贴尾，φ=90 完全侧向展开）换算成 spread 用
 *   spread = 270 + sweep − φ
 */
function buildWing(spec: WingSpec, mats: WingMats, opts: { veinCount: number; tail?: boolean; band?: [number, number]; marginSpotRange?: [number, number, number]; crescents?: number }, side: 1 | -1): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), mats.face))
  blade.add(scaledWingVeins(spec, mats.vein, opts.veinCount))
  if (opts.band) blade.add(new THREE.Mesh(midBandGeometry(spec, opts.band[0], opts.band[1], (spec.thickness ?? 0.013) * 1.6), mats.band))
  if (opts.marginSpotRange) blade.add(marginSpots(spec, mats.spot, opts.marginSpotRange[0], opts.marginSpotRange[1], opts.marginSpotRange[2], 'lead', 0.055))
  if (opts.crescents) blade.add(crescentSpots(spec, mats.crescent, opts.crescents))

  let tipLocal = new THREE.Vector3(spec.length * 0.94, 0, 0)
  if (opts.tail) {
    const tail = buildTail(spec, mats.face)
    blade.add(tail.group)
    tipLocal = tail.tipLocal // 后翅的"最远点"锚点改用尾尖，见 anchors 里 tail 单独另算
  }
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  return { pivot, blade, tipLocal }
}

// ---------------------------------------------------------------- 建模主体

export function buildSwallowtail(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#0e0c0c', gloss: 0.32, clearcoat: 0.12, surface: 'velvet' }) // B轮绒面组：只躯干加绒面，翅面不动
  const legMat = chitin({ color: '#0b0a0a', gloss: 0.3 })
  const proboscisMat = chitin({ color: '#2a1f10', gloss: 0.55, clearcoat: 0.3 })

  const wingMats: WingMats = {
    face: chitin({ color: '#0b0a0c', gloss: 0.16, clearcoat: 0.03, side: THREE.DoubleSide }),
    vein: chitin({ color: '#020202', gloss: 0.1, side: THREE.DoubleSide }),
    spot: chitin({ color: '#f2efe4', gloss: 0.26, clearcoat: 0.06 }),
    band: chitin({ color: '#ece7d8', gloss: 0.3, clearcoat: 0.08, side: THREE.DoubleSide }),
    crescent: chitin({ color: '#c1372a', gloss: 0.42, clearcoat: 0.2 }),
  }

  // ---- 头 / 胸 / 腹：细长的鳞翅目体型
  g.add(new THREE.Mesh(spindle([1.0, 0.05, 0], [1.32, 0.08, 0], 0.14, { bulge: 0.5, taperStart: 0.85, taperEnd: 0.5 }), bodyMat))
  g.add(new THREE.Mesh(spindle([0.14, 0, 0], [1.0, 0.04, 0], 0.21, { bulge: 0.45, flat: 1.05, taperStart: 0.55, taperEnd: 0.75 }), bodyMat))

  const abdomenFrom = new THREE.Vector3(0.13, -0.02, 0)
  const abdomenTo = new THREE.Vector3(-1.3, -0.05, 0)
  g.add(
    new THREE.Mesh(
      segmentedAbdomen({
        from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
        to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
        r0: 0.15,
        r1: 0.02,
        segments: 8,
        groove: 0.2,
        bulge: 0.22,
      }),
      bodyMat,
    ),
  )

  // ---- 虹吸式口器：从头下前方伸出并盘卷
  const proboscisBase = new THREE.Vector3(1.33, -0.02, 0)
  g.add(coiledProboscis(proboscisBase, { turns: 2.2, startRadius: 0.19, drift: 0.055, thickness: 0.028 }, proboscisMat))

  // ---- 复眼与棒状触角
  const eyeAt: [number, number, number] = [1.25, 0.05, 0.1]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.12, color: '#1c140c', flatten: 0.94, stretch: 1.02, facets: true }))
  const antBase: [number, number, number] = [1.28, 0.12, 0.06]
  const antLength = 0.5
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'clavate', pitch: 32, yaw: 26, thickness: 0.019 }, legMat))

  // ---- 两对翅：前翅三角形带外缘白斑，后翅圆润带玉带横带+外缘红新月斑+尾突
  const foreOutline: [number, number][] = [
    [0, 0.05],
    [0.06, 0.38],
    [0.16, 0.72],
    [0.32, 0.95],
    [0.52, 1.0],
    [0.74, 0.78],
    [0.9, 0.42],
    [1, 0.04],
  ]
  const hindOutline: [number, number][] = [
    [0, 0.1],
    [0.12, 0.55],
    [0.3, 0.88],
    [0.5, 1.0],
    [0.7, 0.9],
    [0.88, 0.58],
    [1, 0.2],
  ]

  // φ=62(前翅)/56(后翅)：均落在"完全侧展(90)"与"折叠贴尾(0)"之间，制造 V 姿；
  // 前翅 φ 更大、tilt 幅度也更大 → 前翅角度大于后翅，即"前翅略高于后翅"。
  // 前翅翅基 X 更靠前、Y 更高，后翅翅基更靠后靠下，两者叠加使前翅自然遮住
  // 后翅前缘一部分，不需要额外的层级技巧。
  const foreSpec: WingSpec = {
    base: [0.58, 0.14, 0.15],
    length: 3.7,
    width: 2.15,
    outline: foreOutline,
    spread: 270 + 0 - 62,
    tilt: -47,
    sweep: 0,
    thickness: 0.013,
  }
  const hindSpec: WingSpec = {
    base: [0.18, 0.08, 0.13],
    length: 2.5,
    width: 2.55,
    outline: hindOutline,
    spread: 270 + 5 - 56,
    tilt: -41,
    sweep: 5,
    thickness: 0.013,
  }

  let foreRight: WingAssembly | null = null
  let hindRight: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingMats, { veinCount: 8, marginSpotRange: [0.18, 0.88, 6] }, side)
    const hw = buildWing(hindSpec, wingMats, { veinCount: 7, tail: true, band: [0.42, 0.6], crescents: 5 }, side)
    g.add(fw.pivot, hw.pivot)
    if (side === 1) {
      foreRight = fw
      hindRight = hw
    }
  }

  // ---- 六足：三对均正常发育（凤蝶科前足不退化，区别于蛱蝶科的帝王蝶）
  g.add(legPair({ base: [0.92, -0.03, 0.09], femur: 0.3, tibia: 0.32, thickness: 0.022, splay: 22, sweep: 44, knee: 92, ankle: 74 }, legMat))
  g.add(legPair({ base: [0.55, -0.08, 0.16], femur: 0.42, tibia: 0.46, thickness: 0.028, splay: 34, sweep: -6, knee: 64 }, legMat))
  g.add(legPair({ base: [0.26, -0.09, 0.15], femur: 0.45, tibia: 0.49, thickness: 0.03, splay: 30, sweep: 32, knee: 66 }, legMat))

  // ---- anchor：翅尖坐标沿装配矩阵链现算，避免手工重算三角函数产生偏差
  g.updateMatrixWorld(true)
  const forewingTip = foreRight!.blade.localToWorld(foreRight!.tipLocal.clone())
  const hindwingMainTip = hindRight!.blade.localToWorld(new THREE.Vector3(hindSpec.length * 0.94, 0, 0))
  const tailTip = hindRight!.blade.localToWorld(hindRight!.tipLocal.clone())

  const anchors: Record<string, THREE.Vector3> = {
    forewing: forewingTip,
    hindwing: hindwingMainTip,
    tail: tailTip,
    antenna: (() => {
      const pitch = THREE.MathUtils.degToRad(32)
      const yaw = THREE.MathUtils.degToRad(26)
      const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
      return new THREE.Vector3(...antBase).addScaledVector(dir, antLength).add(new THREE.Vector3(0, -antLength * 0.12, 0))
    })(),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + 0.12),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.4).add(new THREE.Vector3(0, 0.1, 0)),
  }

  return finalize(g, anchors)
}
