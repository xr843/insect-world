/**
 * 中华齿蛉 Acanthacorydalis sp.（广翅目 Megaloptera，本项目第一个广翅目物种）
 *
 * 造型要点：
 * - 雄虫细长交叉的大颚是招牌，也是本文件的核心自定义部件：kit.mandibles()
 *   的粗细公式 `ry = length*0.14*(1-t*0.85)` 直接和 length 成正比，用在
 *   这么长的颚上会粗成两根棍子，读不出"咬合力很弱、纯用于展示"的细长
 *   如钳观感；而且它的展开/内收比例也不足以让颚尖真正越过中线交叉。
 *   因此本文件自写 `longMandible()`：粗细单独给一条从 0.05 收到 0.008
 *   的曲线，和 length 解耦；路径沿 X 线性前伸（因此 mandible 的 X 跨度
 *   精确等于 length 参数），Z 方向前段外扬（flare）、后段大幅内收
 *   （cross），cross 项压过 flare 项就让颚尖越过中线。每条颚生成时把
 *   解析求出的颚尖存进 `mesh.userData.tip`，测试直接读取判定是否交叉，
 *   不必重新解一遍路径公式。内缘另加三枚小齿，直接复用同一个
 *   `mandibleAt()` 取点定位（做法呼应 hornet.ts 复刻 kit.mandibles()
 *   路径公式加齿的思路，但这里路径本就是本文件自己的函数，不必二次
 *   复刻）。
 * - 巨大网状翅脉：C 轮起走 venation.ts 的参数化翅脉网（脉粗按翅宽
 *   缩放，不沾 kit.wingVeins() 硬编码 0.009 的老坑）。密度取中档
 *   （纵脉 9、横脉密度 9）：不必像 lacewing.ts 的中华草蛉那样夸张到
 *   蕾丝感（那是脉翅目的极端案例），但横脉向翅尖渐密围出封闭翅室，
 *   读出"网"而不是"扇"。每根脉命名 `vein`，四片翅的脉数远超测试
 *   要求的 30 条下限。
 * - 停息时翅呈屋脊状盖在腹背：姿态推导与 lacewing.ts 顶部一致（结论：
 *   spread 取较小的 φ 配合较大的正 tilt，让翅从近背中线的翅基向后
 *   下方外扫），此处不重复整段证明，只按同一推导结果标定角度，φ/tilt
 *   数值参照 lacewing.ts 等比放大到本种翅长。
 * - 头部宽扁：用 kit.spindle() 的 flat>1（背腹压扁）做出"宽而扁"的头
 *   廓形，复眼装在侧面而非正面，是本目区别于蜻蜓目"接眼式"复眼的
 *   关键差异。
 * - 通体深褐至黑，翅上零散几枚浅色斑点：斑点是贴在翅面上的扁球体，
 *   作为 blade 分组的子节点随翅一起装配，不需要另外计算世界坐标。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  membrane,
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

interface MandibleSpec {
  /** 头部前端基点，z 分量会按 side 取正负 */
  at: [number, number, number]
  /** 沿 X 的前伸长度，等于该颚的 X 跨度 */
  length: number
  /** t=0 处的侧偏量（外扬） */
  flare: number
  /** t=1 处的内收量；cross 压过 flare 时颚尖会越过中线 */
  cross: number
  r0: number
  r1: number
}

/** 颚路径上 t∈[0,1] 处的点：t=0 是颚基，t=1 是颚尖。 */
function mandibleAt(spec: MandibleSpec, side: 1 | -1, t: number): THREE.Vector3 {
  const baseZ = spec.at[2] * side
  return new THREE.Vector3(
    spec.at[0] + spec.length * t,
    spec.at[1] - spec.length * 0.045 * t,
    baseZ + side * (spec.flare * (1 - t) * (1 - t) - spec.cross * t * t),
  )
}

/**
 * 细长交叉大颚：粗细单独给一条曲线（0.05→0.008），不像 kit.mandibles()
 * 那样和 length 绑死，才能做出"细长如钳"而不是"两根粗棍"。解析求出的
 * 颚尖存进 mesh.userData.tip，测试直接读取判定是否交叉。
 */
function longMandible(spec: MandibleSpec, side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const steps = 12
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = THREE.MathUtils.lerp(spec.r0, spec.r1, t)
    sections.push({ at: mandibleAt(spec, side, t), ry: Math.max(r, 1e-4), rz: Math.max(r, 1e-4) })
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'mandible'
  mesh.userData.tip = mandibleAt(spec, side, 1)
  return mesh
}

/** 内缘小齿：沿颚内侧三个点各加一枚尖齿，直接复用 mandibleAt() 取点。 */
function mandibleTeeth(spec: MandibleSpec, side: 1 | -1, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const inward = -side
  for (const t of [0.45, 0.62, 0.78]) {
    const p = mandibleAt(spec, side, t)
    const tip = p.clone().add(new THREE.Vector3(0.02, -0.02, inward * 0.05))
    g.add(
      new THREE.Mesh(
        loft(
          [
            { at: p, ry: 0.014, rz: 0.014 },
            { at: tip, ry: 0.002, rz: 0.002 },
          ],
          6,
        ),
        material,
      ),
    )
  }
  return g
}

/** 翅面上零散的浅色斑点：xFrac/yFrac 是翅长方向/半翅宽方向的归一化坐标。 */
function wingSpots(spec: WingSpec, material: THREE.Material, points: [number, number][]): THREE.Group {
  const g = new THREE.Group()
  for (const [xFrac, yFrac] of points) {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(spec.width * 0.045, 8, 6), material)
    spot.scale.set(1, 0.12, 1)
    spot.position.set(spec.length * xFrac, 0.008, spec.width * 0.5 * yFrac)
    g.add(spot)
  }
  return g
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/**
 * spread 推导与 lacewing.ts 顶部一致（不重复整段证明）：
 *   spread = 270 + sweep − φ，φ=0 收拢贴尾，φ=90 完全侧展。
 * 屋脊状停栖姿：较小的 φ 配合较大的正 tilt，翅从近背中线的翅基向后
 * 下方外扫，两翅相合成屋顶。
 */
function buildWing(
  spec: WingSpec,
  faceMat: THREE.Material,
  veinMat: THREE.Material,
  spotMat: THREE.Material,
  side: 1 | -1,
): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), faceMat))
  // 翅脉 2.0：中档密度（见文件头）。齿蛉无醒目翅痣，开关不开。
  const veins = venation({
    length: spec.length,
    width: spec.width,
    outline: spec.outline,
    longitudinal: 9,
    crossDensity: 9,
    veinScale: 0.012,
    material: veinMat,
    name: 'vein',
  })
  if (veins) blade.add(veins)
  blade.add(
    wingSpots(spec, spotMat, [
      [0.32, 0.32],
      [0.5, -0.22],
      [0.66, 0.4],
      [0.82, -0.3],
      [0.44, 0.05],
    ]),
  )
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side

  const tipLocal = new THREE.Vector3(spec.length * 0.94, 0, 0)
  return { pivot, blade, tipLocal }
}

// ---------------------------------------------------------------- 建模主体

export function buildDobsonfly(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#241c16', gloss: 0.42, clearcoat: 0.18 })
  const mandibleMat = chitin({ color: '#1c1410', gloss: 0.55, clearcoat: 0.3 })
  const legMat = chitin({ color: '#2a2018', gloss: 0.35 })
  const antennaMat = chitin({ color: '#201810', gloss: 0.32 })
  const wingFaceMat = membrane('#8f8172', 0.4)
  const veinMat = chitin({ color: '#3c3126', gloss: 0.32, side: THREE.DoubleSide })
  const spotMat = chitin({ color: '#e4d9bd', gloss: 0.25, opacity: 0.85 })

  // ---- 头：宽扁（flat=1.5 背腹压扁），taperStart=0.63 对接胸部
  // taperEnd=0.41 处的半径（0.30×0.63≈0.189，0.46×0.41≈0.189）
  const head = new THREE.Mesh(
    spindle([2.6, 0.04, 0], [3.3, 0.06, 0], 0.3, { bulge: 0.5, flat: 1.5, taperStart: 0.63, taperEnd: 0.42, steps: 16 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 胸：粗壮，支撑巨大翅的飞行肌
  const thoraxFrom = new THREE.Vector3(1.2, 0.02, 0)
  const thoraxTo = new THREE.Vector3(2.6, 0.05, 0)
  const thorax = new THREE.Mesh(
    spindle([thoraxFrom.x, thoraxFrom.y, thoraxFrom.z], [thoraxTo.x, thoraxTo.y, thoraxTo.z], 0.46, {
      bulge: 0.42,
      flat: 1.0,
      taperStart: 0.48,
      taperEnd: 0.41,
      steps: 16,
    }),
    bodyMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)
  const thoraxCenter = new THREE.Vector3().lerpVectors(thoraxFrom, thoraxTo, 0.5)

  // ---- 腹：中长，深褐至黑，单一材质（斑点只在翅上，体表不需要分色）
  const abdomenFrom = new THREE.Vector3(1.2, -0.02, 0)
  const abdomenTo = new THREE.Vector3(-2.7, -0.05, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      r0: 0.22,
      r1: 0.06,
      segments: 8,
      groove: 0.16,
      bulge: 0.28,
    }),
    bodyMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 大颚：细长交叉，内缘各三枚小齿。X 跨度精确等于 length=2.6。
  const mandibleSpec: MandibleSpec = { at: [3.26, -0.02, 0.13], length: 2.6, flare: 0.12, cross: 0.4, r0: 0.05, r1: 0.008 }
  const mandibleRight = longMandible(mandibleSpec, 1, mandibleMat)
  const mandibleLeft = longMandible(mandibleSpec, -1, mandibleMat)
  g.add(mandibleRight, mandibleLeft)
  g.add(mandibleTeeth(mandibleSpec, 1, mandibleMat))
  g.add(mandibleTeeth(mandibleSpec, -1, mandibleMat))

  // ---- 复眼：侧生
  const eyeAt: [number, number, number] = [2.95, 0.13, 0.28]
  const eyeRadius = 0.17
  g.add(compoundEyePair({ at: eyeAt, radius: eyeRadius, color: '#1c130f', flatten: 0.85, stretch: 1.05, facets: true }))

  // ---- 丝状触角，中等长度
  const antBase: [number, number, number] = [3.15, 0.14, 0.1]
  const antLength = 1.8
  const antPitch = 18
  const antYaw = 26
  g.add(
    antennaPair({ base: antBase, length: antLength, kind: 'filiform', pitch: antPitch, yaw: antYaw, thickness: 0.028 }, antennaMat),
  )

  // ---- 两对巨大网状翅，屋脊状盖在腹背
  const wingOutline: [number, number][] = [
    [0, 0.12],
    [0.1, 0.55],
    [0.28, 0.85],
    [0.5, 1.0],
    [0.72, 0.9],
    [0.88, 0.65],
    [1, 0.2],
  ]
  const foreSpec: WingSpec = {
    base: [2.3, 0.42, 0.32],
    length: 5.4,
    width: 2.0,
    outline: wingOutline,
    spread: 270 + 0 - 26,
    tilt: 40,
    sweep: 0,
    thickness: 0.012,
  }
  const hindSpec: WingSpec = {
    base: [1.85, 0.38, 0.3],
    length: 4.8,
    width: 1.85,
    outline: wingOutline,
    spread: 270 - 3 - 24,
    tilt: 38,
    sweep: -3,
    thickness: 0.012,
  }

  let foreRight: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingFaceMat, veinMat, spotMat, side)
    const hw = buildWing(hindSpec, wingFaceMat, veinMat, spotMat, side)
    g.add(fw.pivot, hw.pivot)
    if (side === 1) foreRight = fw
  }

  // ---- 六足：较长
  g.add(legPair({ base: [2.0, -0.3, 0.3], femur: 0.85, tibia: 0.9, thickness: 0.05, splay: 26, sweep: -22, knee: 64 }, legMat))
  g.add(legPair({ base: [1.7, -0.34, 0.36], femur: 0.95, tibia: 1.0, thickness: 0.052, splay: 28, sweep: 6, knee: 66 }, legMat))
  g.add(legPair({ base: [1.35, -0.35, 0.34], femur: 1.05, tibia: 1.1, thickness: 0.055, splay: 26, sweep: 34, knee: 68 }, legMat))

  // ---- anchor
  g.updateMatrixWorld(true)
  const wingTip = foreRight!.blade.localToWorld(foreRight!.tipLocal.clone())

  const antPitchRad = THREE.MathUtils.degToRad(antPitch)
  const antYawRad = THREE.MathUtils.degToRad(antYaw)
  const antDir = new THREE.Vector3(Math.cos(antPitchRad) * Math.cos(antYawRad), Math.sin(antPitchRad), Math.cos(antPitchRad) * Math.sin(antYawRad))
  const antennaTip = new THREE.Vector3(...antBase)
    .addScaledVector(antDir, antLength)
    .add(new THREE.Vector3(0, -antLength * 0.35, antLength * 0.12))

  const anchors: Record<string, THREE.Vector3> = {
    mandible: mandibleRight.userData.tip as THREE.Vector3,
    wing: wingTip,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + eyeRadius),
    antenna: antennaTip,
    thorax: thoraxCenter,
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.4).add(new THREE.Vector3(0, 0.13, 0)),
  }

  return finalize(g, anchors)
}
