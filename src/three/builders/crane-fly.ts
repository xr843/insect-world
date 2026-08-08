/**
 * 大蚊 Nephrotoma scalaris（双翅目 Tipulidae，"蚊子放大版"错觉的来源）
 *
 * 造型要点：
 * - 六条极细极长的腿是大蚊的全部辨识度所在：单腿伸展长度约为体长的
 *   1.6~1.7 倍（形态断言给上下限 [1.5, 2.2]，防止长成蜘蛛）。kit.leg()
 *   的折线姿态是"膝盖深弯的蹲伏"，表达不了大蚊那种"几乎伸直、只在
 *   关节处微折"的高跷腿，因此自建 craneLeg()：股节斜向外上、胫节与
 *   跗节依次微折向外下，三段接近共线（膝角 ~140°），端到端距离因此
 *   接近路径全长。每条腿一个 name='craneLeg' 的组，测试直接量组的
 *   世界包围盒对角线（看得见的量），不复述段长参数。
 * - 一对平衡棒是**全昆虫里最显眼的**：长柄（0.42，体长的 14%）+ 端球，
 *   着生在后胸两侧、翅根后下方，完全外露——大蚊的平衡棒肉眼可见地
 *   随飞行振动，比食蚜蝇/食虫虻那种藏在翅下的小锤大一个数量级。
 * - 双翅目解剖底线：恰好一对窄长翅（长宽比 ~4.2），停栖时向侧后方
 *   平置摊开（tilt≈4°，几乎水平）；翅面 mesh 命名 'wing-membrane'。
 * - 躯干瘦弱：小头带短吻、胸背微拱、腹部细长（雌虫尾端收尖）。
 *   大蚊不叮人、口器只能舔食花蜜露水——纤弱是这个科的整体气质，
 *   材质一律低光泽。
 * - 配色：ACES 下压深一档的灰驼色系，平衡棒给奶黄色拉满对比。
 *
 * 坐标：+X 前，+Y 上，+Z 右；1 单位 = 1cm，体长约 3cm（腿展远大于此）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  finalize,
  loft,
  membrane,
  mirrorZ,
  compoundEyePair,
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

/** 两点间圆锥放样段 */
function tube(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, material: THREE.Material, radial = 10): THREE.Mesh {
  return new THREE.Mesh(loft([{ at: a, ry: r0, rz: r0 }, { at: b, ry: r1, rz: r1 }], radial), material)
}

interface CraneLegSpec {
  /** 基节着生点（建 +z 一侧，mirrorZ 出对侧） */
  base: [number, number, number]
  /** 前后向分量系数：负值前伸、正值后蹬（决定三段共同的 x 倾向） */
  kx: number
}

/**
 * 大蚊腿：股节斜向外上，胫节、跗节依次微折向外下，三段接近共线。
 * 端到端伸展 ≈ 5.0~5.3（体长 3.0 的 1.65~1.75 倍，落在断言带 [1.5,2.2] 中段）。
 * 组 name='craneLeg'（mirrorZ 克隆保留组名，左右各计一条）。
 */
function craneLeg(spec: CraneLegSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'craneLeg'
  const base = new THREE.Vector3(...spec.base)
  const dirFemur = new THREE.Vector3(spec.kx * 0.5, 0.3, 0.95).normalize()
  const dirTibia = new THREE.Vector3(spec.kx * 0.55, -0.42, 0.92).normalize()
  const dirTarsus = new THREE.Vector3(spec.kx * 0.6, -0.3, 0.95).normalize()
  const kneePt = base.clone().addScaledVector(dirFemur, 1.55)
  const anklePt = kneePt.clone().addScaledVector(dirTibia, 1.95)
  const tipPt = anklePt.clone().addScaledVector(dirTarsus, 1.75)

  g.add(tube(base, kneePt, 0.02, 0.015, material))
  g.add(tube(kneePt, anklePt, 0.014, 0.009, material))
  g.add(tube(anklePt, tipPt, 0.008, 0.003, material))
  for (const [p, r] of [
    [base, 0.024],
    [kneePt, 0.017],
    [anklePt, 0.011],
  ] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material)
    j.position.copy(p)
    g.add(j)
  }
  g.userData.knee = kneePt
  return g
}

/** 全昆虫里最显眼的平衡棒：长柄 + 端球，完全外露。柄与球都命名 'haltere'。 */
function haltere(base: THREE.Vector3, side: 1 | -1, stalkMat: THREE.Material, ballMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const dir = new THREE.Vector3(-0.55, 0.25, side * 0.8).normalize()
  const len = 0.42
  const tip = base.clone().addScaledVector(dir, len)
  const stalk = new THREE.Mesh(
    loft([{ at: base, ry: 0.014, rz: 0.014 }, { at: tip, ry: 0.009, rz: 0.009 }], 8),
    stalkMat,
  )
  stalk.name = 'haltere'
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), ballMat)
  ball.position.copy(tip)
  ball.name = 'haltere'
  g.add(stalk, ball)
  g.userData.ball = tip
  return g
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/**
 * 窄长翅装配：停栖平置——θy = 90°−spread，spread=205 → θy=−115°
 * （sinθy<0：侧展为主 + 明显朝尾），tilt=4 让翅面几乎水平。
 */
function buildWing(spec: WingSpec, faceMat: THREE.Material, veinMat: THREE.Material, side: 1 | -1): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), faceMat)
  face.name = 'wing-membrane'
  blade.add(face)
  // venation 轻档：大蚊翅脉简单（纵脉 6、横脉密度 3）
  const veins = venation({
    length: spec.length,
    width: spec.width,
    outline: spec.outline,
    longitudinal: 6,
    crossDensity: 3,
    veinScale: 0.01,
    material: veinMat,
    name: 'vein',
  })
  if (veins) blade.add(veins)
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  return { pivot, blade, tipLocal: new THREE.Vector3(spec.length * 0.94, 0, 0) }
}

// ---------------------------------------------------------------- 建模主体

export function buildCraneFly(): InsectModel {
  const g = new THREE.Group()

  // ACES：灰驼色系整体压深一档，平衡棒奶黄拉满对比
  const bodyMat = chitin({ color: '#665949', gloss: 0.32, clearcoat: 0.08 })
  const thoraxMat = chitin({ color: '#6e6050', gloss: 0.35, clearcoat: 0.1 })
  const abdomenMat = chitin({ color: '#5f5342', gloss: 0.3, clearcoat: 0.06 })
  const legMat = chitin({ color: '#4a4238', gloss: 0.28 })
  const haltereStalkMat = chitin({ color: '#a8905c', gloss: 0.35 })
  const haltereBallMat = chitin({ color: '#cfb374', gloss: 0.5, clearcoat: 0.25 })
  const wingFaceMat = membrane('#e9e4d8', 0.2, { iridescent: true, iridescenceStrength: 0.2 })
  const veinMat = chitin({ color: '#3d372e', gloss: 0.3, side: THREE.DoubleSide })

  // ---- 头：小，前端拉长成短吻（大蚊头部的 snout）
  const head = new THREE.Mesh(
    spindle([1.08, 0.16, 0], [1.4, 0.13, 0], 0.12, { bulge: 0.35, taperStart: 0.6, taperEnd: 0.3 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 复眼：小而圆，不占头比例（大蚊不是视觉猎手）
  const eyeAt: [number, number, number] = [1.14, 0.2, 0.1]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.075, color: '#241c14', flatten: 0.85, stretch: 1.0 }))

  // ---- 触角：短丝状（kit 自带微动钩子）
  const antBase: [number, number, number] = [1.36, 0.2, 0.05]
  const antLength = 0.55
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'filiform', pitch: 22, yaw: 26, thickness: 0.011 }, bodyMat))

  // ---- 胸：背面微拱（driving 翅的肌肉舱，但远不如食虫虻粗壮）
  const thoraxCenter = new THREE.Vector3(0.75, 0.14, 0)
  const thorax = new THREE.Mesh(
    spindle([0.42, 0.04, 0], [1.1, 0.1, 0], 0.27, { bulge: 0.42, flat: 0.95, taperStart: 0.55, taperEnd: 0.55 }),
    thoraxMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 腹：细长，9 节，尾端微翘收尖（雌虫产卵器状尾尖）
  const abdomenFrom = new THREE.Vector3(0.44, 0.06, 0)
  const abdomenTo = new THREE.Vector3(-1.6, 0.1, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      r0: 0.14,
      r1: 0.028,
      segments: 9,
      groove: 0.15,
      bulge: 0.2,
      color: '#5f5342',
    }),
    abdomenMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 平衡棒：后胸两侧，完全外露（全昆虫最显眼档）
  const haltereBase = new THREE.Vector3(0.4, 0.1, 0.2)
  const haltereR = haltere(haltereBase, 1, haltereStalkMat, haltereBallMat)
  const haltereL = haltere(new THREE.Vector3(haltereBase.x, haltereBase.y, -haltereBase.z), -1, haltereStalkMat, haltereBallMat)
  g.add(haltereR, haltereL)

  // ---- 六条高跷腿：三对，前对略前伸、中对侧伸、后对后蹬
  const legSpecs: CraneLegSpec[] = [
    { base: [1.0, 0.02, 0.16], kx: -0.5 },
    { base: [0.78, -0.02, 0.2], kx: 0.05 },
    { base: [0.55, -0.02, 0.18], kx: 0.55 },
  ]
  const midLeg = craneLeg(legSpecs[1], legMat)
  g.add(mirrorZ(craneLeg(legSpecs[0], legMat)))
  g.add(mirrorZ(midLeg))
  g.add(mirrorZ(craneLeg(legSpecs[2], legMat)))

  // ---- 一对窄长翅：向侧后方平置摊开
  const wingSpec: WingSpec = {
    base: [0.72, 0.28, 0.1],
    length: 2.3,
    width: 0.55,
    outline: [
      [0, 0.1],
      [0.12, 0.42],
      [0.35, 0.8],
      [0.6, 1.0],
      [0.82, 0.85],
      [0.94, 0.55],
      [1, 0.2],
    ],
    spread: 205,
    tilt: 4,
    sweep: 0,
    thickness: 0.005,
  }
  let rightWing: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const w = buildWing(wingSpec, wingFaceMat, veinMat, side)
    g.add(w.pivot)
    if (side === 1) rightWing = w
  }

  // ---- anchors
  g.updateMatrixWorld(true)
  const wingTip = rightWing!.blade.localToWorld(rightWing!.tipLocal.clone())

  // 复刻 kit.antenna() filiform 末梢公式（droop = L·0.35，z 偏 = L·0.12）
  const antPitchRad = THREE.MathUtils.degToRad(22)
  const antYawRad = THREE.MathUtils.degToRad(26)
  const antDir = new THREE.Vector3(
    Math.cos(antPitchRad) * Math.cos(antYawRad),
    Math.sin(antPitchRad),
    Math.cos(antPitchRad) * Math.sin(antYawRad),
  )
  const antennaTip = new THREE.Vector3(...antBase)
    .addScaledVector(antDir, antLength)
    .add(new THREE.Vector3(0, -antLength * 0.35, antLength * 0.12))

  const anchors: Record<string, THREE.Vector3> = {
    haltere: (haltereR.userData.ball as THREE.Vector3).clone(),
    leg: (midLeg.userData.knee as THREE.Vector3).clone(),
    wing: wingTip,
    thorax: thoraxCenter,
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.45).add(new THREE.Vector3(0, 0.08, 0)),
    antenna: antennaTip,
  }

  return finalize(g, anchors)
}
