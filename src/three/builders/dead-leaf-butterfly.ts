/**
 * 枯叶蛱蝶 Kallima inachus
 *
 * 造型要点：
 * - 翅合拢时拟态一片枯叶，姿态是本种的核心：翅**竖立**收在背上，不是
 *   半展开的 V 姿（帝王蝶/凤蝶那种），也不是蛾类的屋顶状平摊。kit.wing()
 *   的 spread 参数实测语义与自己的文档字符串相反（monarch-butterfly.ts /
 *   swallowtail.ts / silk-moth.ts 已各自验证过、结论一致，本文件不重新
 *   推导，直接沿用同一套公式）：
 *     pivot.rotation.y = side*(90°-spread) + sweep =: θy
 *     偏移(局部(length,0,0)相对翅基) = length*(cosθy, sinθx·sinθy, -cosθx·sinθy)
 *   取 spread=180、sweep≈0（这是"纯侧展"基线，φ=90），再把 tilt 推到
 *   接近 −90°（而不是帝王蝶/凤蝶那种 −40°~−50° 的半 V 姿），offset 里
 *   sinθx 分量就压过 cosθx 分量、翅尖的落点从"侧展"整体转成"竖直向上"，
 *   只留一点残余的 Z 分量（翅没有完全并拢到 0，留一条自然的合缝角度）。
 *   __tests__/round5b.test.ts 用「四翅 Y 向跨度 > Z 向跨度」直接钉住这个
 *   姿态判断。
 * - 主叶脉/侧脉/霉斑都画在后翅（翅合拢后视觉上的"叶片主体"）上；主脉
 *   刻意贯穿后翅局部坐标系的 X 轴全长（贴着 0~0.98*length），保证
 *   "从翅尖贯到翅基"，而不是描边一段意思一下。
 * - kit.wingVeins() 的翅脉半径是写死的绝对值 0.009，本种翅长 3.6/2.5，
 *   超过 3 的那片（前翅）必然细到看不见，因此主脉/侧脉全部自写、
 *   半径按 spec.width 缩放（技术同 monarch-butterfly.ts 的 boldWingVeins，
 *   不导入，本文件自己重写一版）。
 * - 后翅末端的"叶柄"（尾突）复刻 swallowtail.ts 的 buildTail 技术：
 *   取后缘上的一点，沿"翅基→着生点"的径向方向继续延伸，而不是贴着
 *   翅缘拐弯，这样才读成"从叶片轮廓延续出去的柄"而非"贴边的附属物"。
 * - 前翅尖端的"叶尖"：不额外建附属网格，直接把前翅的 outline 轮廓点
 *   延伸到 x=1.22（超过标准的 1.0），wingGeometry() 对 outline 的 x
 *   坐标本就不做 0~1 裁剪，超出部分照样放样，比另建一段拼接更干净。
 * - 因为翅合拢，背面的蓝紫色只在翅基内侧留一小块暗示色斑，不做整面
 *   背纹——真做了也几乎看不见，纯粹浪费面数。
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
 * 翅局部坐标系里，沿翅长方向比例 xFrac 处前缘/后缘的 (x,z) 坐标。
 * 复刻 kit.wingGeometry() 内部对 outline 的线性插值（前缘 ×1，后缘 ×0.72）。
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

/** 主叶脉：贯穿后翅局部 X 轴全长（0~0.98*length），略偏前缘——真实叶片
 *  中脉常不严格居中。半径按 spec.width 缩放，而非 kit.wingVeins() 写死的
 *  绝对值。 */
function mainVeinMesh(spec: WingSpec, material: THREE.Material): THREE.Mesh {
  const steps = 22
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = THREE.MathUtils.lerp(spec.width * 0.05, -spec.width * 0.03, t)
    const r = THREE.MathUtils.lerp(spec.width * 0.022, spec.width * 0.007, t)
    sections.push({ at: new THREE.Vector3(t * spec.length * 0.98, 0.0022, y), ry: Math.max(r, 0.0035), rz: Math.max(r, 0.0035) })
  }
  const m = new THREE.Mesh(loft(sections, 8), material)
  m.name = 'mainVein'
  return m
}

/** 侧脉：从主脉沿途向前后缘斜出的短分支，制造"叶片侧脉"的纹理感。 */
function sideVeins(spec: WingSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  for (let i = 1; i < count; i++) {
    const t = i / count
    const x = t * spec.length * 0.94
    const mainY = THREE.MathUtils.lerp(spec.width * 0.05, -spec.width * 0.03, t)
    const len = spec.length * 0.2 * (1 - t * 0.35)
    for (const s of [1, -1] as const) {
      const start = new THREE.Vector3(x, 0.002, mainY)
      const tip = new THREE.Vector3(x + len * 0.5, 0.0015, mainY + s * len)
      g.add(
        new THREE.Mesh(
          loft([{ at: start, ry: spec.width * 0.007, rz: spec.width * 0.007 }, { at: tip, ry: 0.0028, rz: 0.0028 }], 6),
          material,
        ),
      )
    }
  }
  return g
}

/** 确定性伪随机（sin 哈希），避免 Math.random() 让每次构建结果不一致。 */
function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453
  return s - Math.floor(s)
}

/** 零散深色霉斑：模拟枯叶上的斑驳霉点。 */
function moldSpots(spec: WingSpec, material: THREE.Material, count: number, seed: number): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const fx = hash(seed + i * 3.1)
    const fy = hash(seed + i * 7.7 + 1.3)
    const xFrac = 0.14 + fx * 0.74
    const yFrac = (fy * 2 - 1) * 0.55
    const r = spec.width * (0.018 + fx * 0.02)
    const spot = new THREE.Mesh(new THREE.SphereGeometry(Math.max(r, 0.006), 7, 5), material)
    spot.scale.set(1, 0.22, 1)
    spot.position.set(xFrac * spec.length, 0.0032, yFrac * spec.width * 0.42)
    g.add(spot)
  }
  return g
}

/** 后翅末端的"叶柄"（尾突）。技术同 swallowtail.ts 的 buildTail：沿
 *  "翅基→着生点"径向方向延伸，而不是贴翅缘拐弯。 */
function buildPetiole(spec: WingSpec, material: THREE.Material): { group: THREE.Group; tipLocal: THREE.Vector3 } {
  const attachFrac = 0.88
  const margin = outlinePoint(spec, attachFrac, 'trail')
  const dir = margin.clone().normalize()
  const stalkLen = spec.length * 0.24
  const mid = margin.clone().addScaledVector(dir, stalkLen * 0.55)
  const tip = margin.clone().addScaledVector(dir, stalkLen)

  const toV3 = (p: THREE.Vector2) => new THREE.Vector3(p.x, 0.002, p.y)
  const sections: Section[] = [
    { at: toV3(margin), ry: 0.03, rz: 0.03 },
    { at: toV3(mid), ry: 0.017, rz: 0.017 },
    { at: toV3(tip), ry: 0.009, rz: 0.009 },
  ]
  const group = new THREE.Group()
  group.name = 'tail'
  group.add(new THREE.Mesh(loft(sections, 10), material))
  return { group, tipLocal: toV3(tip) }
}

/**
 * 背面蓝紫色的"暗示"：贴合翅面的薄片色斑，不是球体。原先用压扁的
 * SphereGeometry，渲染出来球面自身的弧度仍在，读作"两颗贴在翅根上的
 * 糖豆"；这里改用与 wingGeometry()/wingBands() 同款手法——2D 轮廓沿
 * Y 极薄挤出、rotateX 摊平贴合翅面——同时把尺寸大幅缩小（合拢状态下
 * 背面本就几乎看不到，宁可含蓄）。
 */
function underwingHint(spec: WingSpec, material: THREE.Material): THREE.Mesh {
  const rLen = spec.width * 0.05 // 沿翅长方向的半径，远小于原球体的 width*0.16*0.5
  const rWid = spec.width * 0.03 // 沿翅宽方向的半径，远小于原球体的 width*0.16
  const shape = new THREE.Shape()
  const segs = 14
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    const x = Math.cos(a) * rLen
    const y = Math.sin(a) * rWid
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.0025, bevelEnabled: false, curveSegments: 10 })
  geo.rotateX(Math.PI / 2) // 摊平贴合翅面，同 wingGeometry() 的做法
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'underwingHint'
  mesh.position.set(spec.length * 0.22, 0.0016, spec.width * 0.02)
  return mesh
}

interface WingMats {
  face: THREE.Material
  vein: THREE.Material
  spot: THREE.Material
  hint: THREE.Material
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/**
 * 一片完整的翅，已按"竖立合拢"姿态摆好（见文件头注释的推导）。
 * hind=true 时加主脉/侧脉/霉斑/叶柄；前翅只加一段短侧脉意思一下。
 */
function buildWing(
  spec: WingSpec,
  mats: WingMats,
  opts: { hind: boolean; tipFrac: number },
  side: 1 | -1,
): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), mats.face)
  face.name = 'wingFace'
  blade.add(face)

  if (opts.hind) {
    blade.add(mainVeinMesh(spec, mats.vein))
    blade.add(sideVeins(spec, mats.vein, 5))
    blade.add(moldSpots(spec, mats.spot, 7, side === 1 ? 11 : 47))
  } else {
    blade.add(sideVeins(spec, mats.vein, 3))
  }

  // 背面蓝紫色的"暗示"：贴合翅面的薄片，翅基内侧一小块，不做整面背纹
  blade.add(underwingHint(spec, mats.hint))

  if (opts.hind) {
    const petiole = buildPetiole(spec, mats.face)
    blade.add(petiole.group)
  }
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side

  // 主体最远点取轮廓远端（前翅的"叶尖"或后翅的轮廓远端）；叶柄尖是另一个
  // 更远的点，单独由 buildPetiole() 返回，不经这个 tipLocal。
  const tipLocal = new THREE.Vector3(spec.length * opts.tipFrac, 0, 0)
  return { pivot, blade, tipLocal }
}

// ---------------------------------------------------------------- 建模主体

export function buildDeadLeafButterfly(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#1c140d', gloss: 0.32, clearcoat: 0.12 })
  const legMat = chitin({ color: '#140e09', gloss: 0.28 })

  // 枯褐色基调压深一档：ACES 色调映射会提亮去饱和，直接给"想要的枯叶棕"
  // 会在渲染后偏黄发灰。
  const wingMats: WingMats = {
    face: chitin({ color: '#5e4021', gloss: 0.16, clearcoat: 0.02, side: THREE.DoubleSide }),
    vein: chitin({ color: '#2a1c0f', gloss: 0.14, side: THREE.DoubleSide }),
    spot: chitin({ color: '#33362a', gloss: 0.12 }),
    hint: chitin({ color: '#232d52', gloss: 0.3, clearcoat: 0.15 }), // 背面蓝紫色的暗示
  }

  // ---- 头 / 胸 / 腹：细长的鳞翅目体型，体长约 3cm（头尖到腹尖）
  const head = new THREE.Mesh(spindle([1.05, 0.05, 0], [1.35, 0.08, 0], 0.135, { bulge: 0.5, taperStart: 0.85, taperEnd: 0.5 }), bodyMat)
  g.add(head)

  const thorax = new THREE.Mesh(
    spindle([0.15, 0, 0], [1.05, 0.04, 0], 0.2, { bulge: 0.45, flat: 1.05, taperStart: 0.55, taperEnd: 0.75 }),
    bodyMat,
  )
  g.add(thorax)

  const abdomenFrom = new THREE.Vector3(0.14, -0.02, 0)
  const abdomenTo = new THREE.Vector3(-1.55, -0.05, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      r0: 0.14,
      r1: 0.02,
      segments: 7,
      groove: 0.19,
      bulge: 0.22,
    }),
    bodyMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 复眼与棒状触角
  const eyeAt: [number, number, number] = [1.28, 0.05, 0.1]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.115, color: '#1a1108', flatten: 0.94, stretch: 1.02, facets: true }))
  const antBase: [number, number, number] = [1.3, 0.12, 0.06]
  const antLength = 0.48
  const antPitch = 32
  const antYaw = 26
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'clavate', pitch: antPitch, yaw: antYaw, thickness: 0.018 }, legMat))

  // ---- 两对翅：竖立合拢姿态（推导见文件头注释）
  const foreOutline: [number, number][] = [
    [0, 0.06],
    [0.1, 0.38],
    [0.25, 0.68],
    [0.45, 0.88],
    [0.65, 0.82],
    [0.82, 0.5],
    [0.95, 0.22],
    [1.22, 0.04], // 前翅尖端向外拉长成尖角（叶尖），超出标准 1.0
  ]
  const hindOutline: [number, number][] = [
    [0, 0.1],
    [0.12, 0.5],
    [0.3, 0.85],
    [0.5, 0.98],
    [0.7, 0.9],
    [0.86, 0.6],
    [1, 0.22],
  ]

  const foreTipFrac = 1.22
  const hindTipFrac = 0.97

  const foreSpec: WingSpec = {
    base: [0.62, 0.13, 0.1],
    length: 3.6,
    width: 2.0,
    outline: foreOutline,
    spread: 180,
    sweep: -4,
    tilt: -82,
    thickness: 0.012,
  }
  const hindSpec: WingSpec = {
    base: [0.2, 0.06, 0.09],
    length: 2.5,
    width: 2.3,
    outline: hindOutline,
    spread: 180,
    sweep: 0,
    tilt: -80,
    thickness: 0.012,
  }

  let foreRight: WingAssembly | null = null
  let hindRight: WingAssembly | null = null
  let hindRightPetioleTip: THREE.Vector3 | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingMats, { hind: false, tipFrac: foreTipFrac }, side)
    const hw = buildWing(hindSpec, wingMats, { hind: true, tipFrac: hindTipFrac }, side)
    // 骨架标记：buildWing() 复刻的是 kit.wing() 的枢轴装配方式，
    // registerWing 补上 kit 内建 wing() 打不到的这一份。
    registerWing(fw.pivot, { side, role: 'fore' })
    registerWing(hw.pivot, { side, role: 'hind' })
    g.add(fw.pivot, hw.pivot)
    if (side === 1) {
      foreRight = fw
      hindRight = hw
      const petiole = buildPetiole(hindSpec, wingMats.face)
      hindRightPetioleTip = petiole.tipLocal
    }
  }

  // ---- 六足：蛱蝶科前足退化（同帝王蝶所属科），中足/后足纤细站立
  g.add(
    legPair(
      { base: [0.92, -0.02, 0.08], femur: 0.08, tibia: 0.06, tarsus: 0.025, thickness: 0.011, splay: 12, sweep: 66, knee: 118, ankle: 90 },
      legMat,
    ),
  )
  g.add(legPair({ base: [0.54, -0.08, 0.14], femur: 0.36, tibia: 0.4, thickness: 0.024, splay: 34, sweep: -6, knee: 64 }, legMat))
  g.add(legPair({ base: [0.26, -0.09, 0.13], femur: 0.4, tibia: 0.44, thickness: 0.026, splay: 30, sweep: 30, knee: 66 }, legMat))

  // ---- anchor：翅尖/柄尖沿实际装配矩阵链现算
  g.updateMatrixWorld(true)
  const forewingTip = foreRight!.blade.localToWorld(foreRight!.tipLocal.clone())
  const hindwingMainTip = hindRight!.blade.localToWorld(hindRight!.tipLocal.clone())
  const tailTip = hindRight!.blade.localToWorld(hindRightPetioleTip!.clone())

  const antPitchRad = THREE.MathUtils.degToRad(antPitch)
  const antYawRad = THREE.MathUtils.degToRad(antYaw)
  const antDir = new THREE.Vector3(Math.cos(antPitchRad) * Math.cos(antYawRad), Math.sin(antPitchRad), Math.cos(antPitchRad) * Math.sin(antYawRad))
  const antennaTip = new THREE.Vector3(...antBase).addScaledVector(antDir, antLength).add(new THREE.Vector3(0, -antLength * 0.12, 0))

  const anchors: Record<string, THREE.Vector3> = {
    underwing: hindwingMainTip,
    forewing: forewingTip,
    tail: tailTip,
    antenna: antennaTip,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + 0.11),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.4).add(new THREE.Vector3(0, 0.08, 0)),
  }

  return finalize(g, anchors)
}
