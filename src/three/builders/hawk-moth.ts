/**
 * 长喙天蛾 Macroglossum stellatarum 一类（天蛾科 Sphingidae）
 *
 * 造型要点：
 * - 狭长三角形前翅、后掠如战斗机：这是本种能悬停的空气动力学基础，也是
 *   与其他鳞翅目最直观的轮廓差异。kit.wing() 的 spread/sweep 实测语义
 *   （见 monarch-butterfly.ts / swallowtail.ts / silk-moth.ts 已验证、
 *   本文件不重推）：
 *     θy = side*(90°-spread) + sweep
 *     偏移 = length*(cosθy, sinθx·sinθy, -cosθx·sinθy)
 *   固定 spread=180（侧展基线，θy=-90°·side），此时 offset_x=cosθy=0——
 *   一分不后掠。要做出"后掠三角翼"，直接在这个基线上叠加一个**负**
 *   sweep（不改 spread）：θy 从 -90° 进一步偏负，cosθy 变负、offset_x
 *   随之变负（翅尖比翅根更靠体后），同时 offset_z 仍然是正的侧向分量
 *   ——两者叠加正是"翅尖既向外、又向后"的三角翼后掠轮廓。
 * - 悬停吸蜜的短弧喙：不用 monarch-butterfly.ts/swallowtail.ts 那套
 *   盘卷喙（coiledProboscis），天蛾喙不盘卷，但也**不是笔直的针**——
 *   写一版沿平缓下弯、末梢回勾的弧线放样收细的版本（curvedProboscis）：
 *   基部沿一个较浅的俯角伸出，中段逐渐叠加向下的弧垂，末段再向上略微
 *   回勾，读作"伸进花冠里探"而非"标枪刺出"。长度钉在躯干长度的
 *   1.2~1.5 倍——早先"≥1.2倍"的写法被读成了"越长越好"，这次连同
 *   上限一起标定。基部粗、末端细，锥度贯穿全程。"喙"这个部件的一般
 *   建造手法（Section[] 沿一条路径逐步收细放样）沿用蝶类范例，但路径
 *   本身重新写，不是简单复用其公式。
 * - 前翅翅长 2.4、后翅 1.3，前翅已超过 kit.wingVeins() 半径写死 0.009
 *   开始失真的阈值，翅脉/条纹改用自写的按翅宽缩放版本。
 * - 密被绒毛的胸部：技术同 silk-moth.ts 的 thoraxFuzz（黄金角螺旋撒点 +
 *   法向立锥），自己重写一份，不跨文件导入。
 * - 腹末扇形展开的鳞毛（飞行"尾舵"）：无现成 kit 工具，自建 tailFan——
 *   在垂直于腹部末端切线的平面内，把若干根扁锥沿一段圆弧角度展开。
 * - 触角末端小钩：kind:'clavate' 已经做出棒状膨大末端，再在其尖端
 *   续接一小段弯向下方的细管，做出天蛾科特有的钩状尖端。
 *
 * anchors：proboscis, forewing, hindwing, antenna, eye, abdomen
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  mirrorZ,
  registerWing,
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/** 胸部绒毛：黄金角螺旋在椭球上半球撒点，每点沿外法线立一根细锥。 */
function thoraxFuzz(center: THREE.Vector3, radii: THREE.Vector3, count: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const yFrac = 1 - (i + 0.5) / count
    const ringR = Math.sqrt(Math.max(0, 1 - yFrac * yFrac))
    const theta = i * golden
    const nx = Math.cos(theta) * ringR
    const nz = Math.sin(theta) * ringR
    const ny = yFrac
    const p = new THREE.Vector3(center.x + nx * radii.x, center.y + ny * radii.y, center.z + nz * radii.z)
    const n = new THREE.Vector3(nx / radii.x, ny / radii.y, nz / radii.z).normalize()
    const jitter = Math.sin(i * 12.9898) * 43758.5453
    const len = 0.018 + 0.012 * (jitter - Math.floor(jitter))
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.0045, len, 5), material)
    hair.position.copy(p).addScaledVector(n, len * 0.45)
    hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
    g.add(hair)
  }
  return g
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 短弧喙：基部沿 baseAngleDeg 方向（较浅的俯角）伸出，0~72% 路径上逐渐
 * 叠加向下的弧垂（bendDrop），72%~100% 再向上回勾（hookLift）模拟"探进
 * 花冠"的末梢上扬。全程按锥度收细（基部粗、末端细）。不是直杆，也不是
 * 盘卷——一条平缓的分段弧线。
 */
function curvedProboscis(
  base: THREE.Vector3,
  opts: { length: number; baseAngleDeg: number; bendDrop: number; hookLift: number; thickness: number; steps?: number },
  material: THREE.Material,
): { mesh: THREE.Mesh; tip: THREE.Vector3 } {
  const steps = opts.steps ?? 24
  const a = THREE.MathUtils.degToRad(opts.baseAngleDeg)
  const dir = new THREE.Vector3(Math.cos(a), -Math.sin(a), 0)
  const sections: Section[] = []
  let tip = base.clone()
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = base.clone().addScaledVector(dir, opts.length * t)
    p.y -= opts.bendDrop * smoothstep(Math.min(t / 0.72, 1)) // 中段弧垂
    if (t > 0.72) p.y += opts.hookLift * smoothstep((t - 0.72) / 0.28) // 末梢回勾
    const r = Math.max(opts.thickness * (1 - t * 0.82), opts.thickness * 0.1)
    sections.push({ at: p, ry: r, rz: r })
    tip = p
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'proboscis'
  return { mesh, tip }
}

/** 按翅宽缩放半径的翅脉/条纹主干：kit.wingVeins() 写死的 0.009 在本种
 *  前翅（翅长 2.4）上已经细到快看不见，自写一版。 */
function scaledWingVeins(spec: WingSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  const baseR = spec.width * 0.024
  const veinY = (t: number) => THREE.MathUtils.lerp(halfW * 0.82, -halfW * 0.55, t)
  const veinEndX = (t: number) => spec.length * THREE.MathUtils.lerp(0.58, 0.95, Math.sin(t * Math.PI))
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const endY = veinY(t)
    const endX = veinEndX(t)
    const steps = 10
    const sections: Section[] = []
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      const x = spec.length * 0.03 + (endX - spec.length * 0.03) * s
      const y = THREE.MathUtils.lerp(0, endY, Math.pow(s, 0.75))
      const r = Math.max(baseR * (1 - s * 0.78), 0.0045)
      sections.push({ at: new THREE.Vector3(x, 0.0015, y), ry: r, rz: r })
    }
    g.add(new THREE.Mesh(loft(sections, 7), material))
  }
  return g
}

/** 黑白横纹：几条横贯翅面的窄带，宽窄交替模拟天蛾前翅的斑驳条纹。 */
function wingBands(spec: WingSpec, material: THREE.Material, xs: number[], bandWidth: number): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  for (const xFrac of xs) {
    const x = xFrac * spec.length
    const w = bandWidth * spec.length
    const shape = new THREE.Shape()
    shape.moveTo(x - w * 0.5, halfW)
    shape.lineTo(x + w * 0.5, halfW)
    shape.lineTo(x + w * 0.5, -halfW * 0.72)
    shape.lineTo(x - w * 0.5, -halfW * 0.72)
    shape.closePath()
    const geo = new THREE.ExtrudeGeometry(shape, { depth: (spec.thickness ?? 0.012) * 1.6, bevelEnabled: false, curveSegments: 10 })
    geo.rotateX(Math.PI / 2)
    geo.translate(0, 0.0022, 0)
    g.add(new THREE.Mesh(geo, material))
  }
  return g
}

interface WingMats {
  face: THREE.Material
  vein: THREE.Material
  band: THREE.Material
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/**
 * 后掠三角翼装配：spread=180 为侧展基线，负 sweep 直接叠出"翅尖既向外
 * 又向后"的战斗机轮廓（推导见文件头注释）。
 */
function buildWing(
  spec: WingSpec,
  mats: WingMats,
  opts: { veinCount: number; bands?: number[]; faceName: string },
  side: 1 | -1,
): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), mats.face)
  face.name = opts.faceName // 前后翅分别命名，便于测试单独量前翅长宽比
  blade.add(face)
  blade.add(scaledWingVeins(spec, mats.vein, opts.veinCount))
  if (opts.bands) blade.add(wingBands(spec, mats.band, opts.bands, 0.05))
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side

  const tipLocal = new THREE.Vector3(spec.length * 0.97, 0, 0)
  return { pivot, blade, tipLocal }
}

/** 腹末扇形展开的鳞毛"尾舵"：在垂直于 dir 的平面内，若干扁锥沿一段圆弧角度展开。 */
function tailFan(at: THREE.Vector3, dir: THREE.Vector3, count: number, length: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const worldUp = Math.abs(dir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
  const side = new THREE.Vector3().crossVectors(dir, worldUp).normalize()
  const fanUp = new THREE.Vector3().crossVectors(side, dir).normalize()
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const ang = THREE.MathUtils.lerp(-Math.PI * 0.4, Math.PI * 0.4, t)
    const bladeDir = dir.clone().multiplyScalar(Math.cos(ang)).addScaledVector(fanUp, Math.sin(ang)).normalize()
    const tip = at.clone().addScaledVector(bladeDir, length)
    const mesh = new THREE.Mesh(
      loft([{ at, ry: 0.032, rz: 0.02 }, { at: tip, ry: 0.008, rz: 0.004 }], 6),
      material,
    )
    g.add(mesh)
  }
  return g
}

/** 触角末端小钩：在 kind:'clavate' 棒状末端之外，续接一小段弯向下方的细管。 */
function antennaHookTip(tip: THREE.Vector3, dir: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const hookLen = 0.05
  const down = new THREE.Vector3(0, -1, 0.15).normalize()
  const p0 = tip
  const p1 = tip.clone().addScaledVector(dir, hookLen * 0.55).addScaledVector(down, hookLen * 0.35)
  const p2 = tip.clone().addScaledVector(dir, hookLen * 0.6).addScaledVector(down, hookLen * 0.95)
  return new THREE.Mesh(
    loft([{ at: p0, ry: 0.013, rz: 0.013 }, { at: p1, ry: 0.009, rz: 0.009 }, { at: p2, ry: 0.004, rz: 0.004 }], 8),
    material,
  )
}

// ---------------------------------------------------------------- 建模主体

export function buildHawkMoth(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#4c443a', gloss: 0.28, clearcoat: 0.08, surface: 'velvet' }) // B轮绒面组：纺锤身躯干加绒面，翅不动
  const fuzzMat = chitin({ color: '#645a4a', gloss: 0.08 })
  const legMat = chitin({ color: '#3a3428', gloss: 0.26, clearcoat: 0.08 })
  const antennaMat = chitin({ color: '#241f18', gloss: 0.4, clearcoat: 0.15 })
  const proboscisMat = chitin({ color: '#332b1c', gloss: 0.5, clearcoat: 0.25 })

  const wingMats: WingMats = {
    face: chitin({ color: '#524a3d', gloss: 0.2, clearcoat: 0.03, side: THREE.DoubleSide }),
    vein: chitin({ color: '#221f1a', gloss: 0.14, side: THREE.DoubleSide }),
    band: chitin({ color: '#d8cfb8', gloss: 0.16, side: THREE.DoubleSide }), // 灰褐底上的浅色横纹
  }

  // ---- 头 / 胸 / 腹：粗壮纺锤体，胸厚实、腹收尖，体长约 2.5cm
  const head = new THREE.Mesh(spindle([1.0, 0.05, 0], [1.2, 0.08, 0], 0.135, { bulge: 0.5, taperStart: 0.8, taperEnd: 0.45 }), bodyMat)
  head.name = 'head'
  g.add(head)

  // 胸部肌肉发达、密被绒毛，明显粗壮呈纺锤形——半径比原先加粗约 25%
  const thoraxCenter = new THREE.Vector3(0.62, 0.14, 0)
  const thorax = new THREE.Mesh(
    spindle([0.25, 0, 0], [1.0, 0.04, 0], 0.4, { bulge: 0.42, flat: 1.0, taperStart: 0.5, taperEnd: 0.65 }),
    bodyMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)
  g.add(thoraxFuzz(thoraxCenter, new THREE.Vector3(0.43, 0.4, 0.38), 130, fuzzMat))

  const abdomenFrom = new THREE.Vector3(0.22, -0.02, 0)
  const abdomenTo = new THREE.Vector3(-1.15, 0.03, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      r0: 0.22,
      r1: 0.018,
      segments: 6,
      groove: 0.15,
      bulge: 0.26,
    }),
    bodyMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)
  g.add(thoraxFuzz(new THREE.Vector3(-0.2, 0.06, 0), new THREE.Vector3(0.28, 0.2, 0.22), 60, fuzzMat))

  // ---- 腹末扇形鳞毛"尾舵"：加粗加密，确保这簇扇形看得出来（不再是几根意思一下的毛）
  const tailDir = new THREE.Vector3(-1, 0.12, 0).normalize()
  g.add(tailFan(abdomenTo.clone(), tailDir, 12, 0.3, fuzzMat))

  // ---- 复眼
  const eyeAt: [number, number, number] = [1.13, 0.09, 0.09]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.088, color: '#100c08', flatten: 0.92, stretch: 1.05, facets: true }))

  // ---- 短弧喙：向前下方伸出，与体轴夹角远小于 45°；中段下弧、末梢回勾，
  // 长度钉在躯干长度（约 2.36）的 1.2~1.5 倍——4.0 那版（约 3~4 倍体长）
  // 就是把"≥1.2倍"读成"越长越好"的产物，这次连上限一起标定。
  const proboscisBase = new THREE.Vector3(1.19, 0.02, 0)
  const proboscis = curvedProboscis(
    proboscisBase,
    { length: 3.5, baseAngleDeg: 28, bendDrop: 0.32, hookLift: 0.6, thickness: 0.05 },
    proboscisMat,
  )
  g.add(proboscis.mesh)

  // ---- 触角：clavate 棒状末端 + 末梢小钩
  const antBase: [number, number, number] = [1.16, 0.14, 0.06]
  const antLength = 0.42
  const antPitch = 30
  const antYaw = 30
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'clavate', pitch: antPitch, yaw: antYaw, thickness: 0.02 }, antennaMat))
  {
    const pitchRad = THREE.MathUtils.degToRad(antPitch)
    const yawRad = THREE.MathUtils.degToRad(antYaw)
    const dir = new THREE.Vector3(Math.cos(pitchRad) * Math.cos(yawRad), Math.sin(pitchRad), Math.cos(pitchRad) * Math.sin(yawRad))
    const droop = antLength * 0.12
    const zTerm = antLength * 0.12
    const rightTip = new THREE.Vector3(...antBase).addScaledVector(dir, antLength).add(new THREE.Vector3(0, -droop, zTerm))
    const leftBase = new THREE.Vector3(antBase[0], antBase[1], -antBase[2])
    const leftDir = new THREE.Vector3(Math.cos(pitchRad) * Math.cos(yawRad), Math.sin(pitchRad), -Math.cos(pitchRad) * Math.sin(yawRad))
    const leftTip = leftBase.clone().addScaledVector(leftDir, antLength).add(new THREE.Vector3(0, -droop, -zTerm))
    g.add(antennaHookTip(rightTip, dir, antennaMat))
    g.add(antennaHookTip(leftTip, leftDir, antennaMat))
    g.userData.antTip = rightTip
  }

  // ---- 两对翅：前翅极窄长后掠三角翼，后翅小而简单
  const foreOutline: [number, number][] = [
    [0, 0.12],
    [0.1, 0.55],
    [0.28, 0.85],
    [0.5, 1.0],
    [0.72, 0.78],
    [0.9, 0.42],
    [1, 0.08],
  ]
  const hindOutline: [number, number][] = [
    [0, 0.15],
    [0.15, 0.6],
    [0.4, 0.92],
    [0.65, 0.95],
    [0.85, 0.65],
    [1, 0.2],
  ]

  const foreSpec: WingSpec = {
    base: [0.85, 0.22, 0.2],
    length: 2.4,
    width: 0.62,
    outline: foreOutline,
    spread: 180,
    sweep: -42, // 负 sweep：在侧展基线上叠出"既向外又向后"的后掠三角翼
    tilt: -12,
    thickness: 0.011,
  }
  const hindSpec: WingSpec = {
    base: [0.4, 0.1, 0.16],
    length: 1.3,
    width: 0.85,
    outline: hindOutline,
    spread: 180,
    sweep: -30,
    tilt: -10,
    thickness: 0.011,
  }

  let foreRight: WingAssembly | null = null
  let hindRight: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingMats, { veinCount: 6, bands: [0.35, 0.6, 0.82], faceName: 'forewingFace' }, side)
    const hw = buildWing(hindSpec, wingMats, { veinCount: 4, faceName: 'hindwingFace' }, side)
    // 骨架标记：buildWing() 复刻的是 kit.wing() 的枢轴装配方式，
    // registerWing 补上 kit 内建 wing() 打不到的这一份。
    registerWing(fw.pivot, { side, role: 'fore' })
    registerWing(hw.pivot, { side, role: 'hind' })
    g.add(fw.pivot, hw.pivot)
    if (side === 1) {
      foreRight = fw
      hindRight = hw
    }
  }

  // ---- 六足：粗壮带绒毛感（哑光材质体现绒毛而非甲壳光泽）
  g.add(mirrorZ(leg({ base: [0.95, -0.06, 0.16], femur: 0.22, tibia: 0.2, thickness: 0.028, splay: 30, sweep: -22, knee: 70 }, legMat)))
  g.add(mirrorZ(leg({ base: [0.55, -0.1, 0.2], femur: 0.26, tibia: 0.26, thickness: 0.03, splay: 32, sweep: 4, knee: 72 }, legMat)))
  g.add(mirrorZ(leg({ base: [0.3, -0.11, 0.19], femur: 0.28, tibia: 0.28, thickness: 0.032, splay: 30, sweep: 32, knee: 74 }, legMat)))

  // ---- anchor
  g.updateMatrixWorld(true)
  const forewingTip = foreRight!.blade.localToWorld(foreRight!.tipLocal.clone())
  const hindwingTip = hindRight!.blade.localToWorld(hindRight!.tipLocal.clone())

  const anchors: Record<string, THREE.Vector3> = {
    proboscis: proboscis.tip,
    forewing: forewingTip,
    hindwing: hindwingTip,
    antenna: g.userData.antTip as THREE.Vector3,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2]),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.42).add(new THREE.Vector3(0, 0.16, 0)),
  }

  return finalize(g, anchors)
}
