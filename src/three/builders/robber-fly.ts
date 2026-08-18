/**
 * 食虫虻 Promachus yesonicus（双翅目 Asilidae，空中伏击的顶级捕猎蝇）
 *
 * 造型要点：
 * - mystax（髭簇）：口器上方一丛前伸的硬毛，是食虫虻科的字面招牌
 *   （拉丁科名 Asilidae 的鉴定检索第一条就是它）——空中撞击猎物时保护
 *   面部的"护面刷"。kit 没有毛簇构件，自建：以口上一点为圆心向前下方
 *   扇形散出确定性分布的细锥毛，逐根命名 'mystax' 供测试清点与定位。
 * - 两复眼**分开**、头顶中间凹陷（dichoptic + 眉间沟）：双翅目里独一份
 *   的特征，与食蚜蝇（hoverfly.ts，两眼在头顶相接 holoptic）正相反。
 *   做法不是雕一条沟，而是靠组合关系：两眼中心 z=±0.21 分开、眼顶
 *   (y≈0.40) 高出头壳顶 (y≈0.33)，"两峰夹一谷"自然读出凹陷，
 *   谷底再放三枚单眼（食虫虻的单眼正长在凹陷的单眼丘上）。
 * - 双翅目的解剖底线：恰好一对翅（翅面 mesh 严格 2 片，命名
 *   'wing-membrane'）+ 一对平衡棒（haltere，细柄端球的独立小 mesh，
 *   命名 'haltere'，着生在翅基后下方、腹侧外露可见）。
 * - 捕猎足粗壮多刺（三对全部 spines:true，前足最粗），静止时前足
 *   前伸如钳；腹部修长渐尖（长/粗 ≈ 4，远比食蚜蝇细长）。
 * - 配色：ACES 下底色压深——灰褐体色全部取深一档，让淡黄白的 mystax
 *   和奶黄的平衡棒这两处招牌对比拉满。
 *
 * 坐标：+X 前，+Y 上，+Z 右；1 单位 = 1cm，体长约 2.6cm。
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
  ocelli,
  registerWing,
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

/** 确定性 0~1 哈希（无 Math.random，同参数两次构建逐顶点一致） */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * mystax 髭簇：以 at 为中心，向前下方扇形散出 count 根细锥硬毛。
 * 毛的方向以"前伸略俯"为中心（护面刷要挡在口器前方），左右扇开 ±40°，
 * 俯仰在 -22°~+12° 抖动。每根毛一个独立 mesh，name='mystax'。
 */
function mystaxTuft(at: THREE.Vector3, count: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0.5 : i / (count - 1)
    const yawA = (u - 0.5) * 1.4 + (hash01(i * 7 + 1) - 0.5) * 0.3
    const pitchA = -0.32 + hash01(i * 13 + 5) * 0.55
    const dir = new THREE.Vector3(
      Math.cos(pitchA) * Math.cos(yawA),
      Math.sin(pitchA),
      Math.cos(pitchA) * Math.sin(yawA),
    ).normalize()
    const base = at
      .clone()
      .add(new THREE.Vector3(0, (hash01(i * 3 + 2) - 0.5) * 0.05, (hash01(i * 5 + 4) - 0.5) * 0.1))
    const len = 0.15 + hash01(i * 11 + 3) * 0.08
    const tip = base.clone().addScaledVector(dir, len)
    const hair = new THREE.Mesh(
      loft([{ at: base, ry: 0.011, rz: 0.011 }, { at: tip, ry: 0.0012, rz: 0.0012 }], 7),
      material,
    )
    hair.name = 'mystax'
    g.add(hair)
  }
  return g
}

/** 平衡棒：细柄 + 末端小球，双翅目后翅的退化产物。柄与球都命名 'haltere'。 */
function haltere(base: THREE.Vector3, side: 1 | -1, stalkMat: THREE.Material, ballMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const dir = new THREE.Vector3(-0.4, -0.28, side * 0.87).normalize()
  const len = 0.17
  const tip = base.clone().addScaledVector(dir, len)
  const stalk = new THREE.Mesh(
    loft([{ at: base, ry: 0.011, rz: 0.011 }, { at: tip, ry: 0.007, rz: 0.007 }], 8),
    stalkMat,
  )
  stalk.name = 'haltere'
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 10), ballMat)
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
 * 翅装配（自建以便给翅面命名 + 接 venation 轻档翅脉）。
 * 停栖姿态：翅收拢盖在腹背上、后掠半开——θy = 90°−spread+sweep，
 * spread=-115 → θy=205°（cos<0 朝尾为主、少量外扬），tilt=-8 让翅面
 * 微微上抬悬在腹背上方而不是压进腹壳。
 */
function buildWing(spec: WingSpec, faceMat: THREE.Material, veinMat: THREE.Material, side: 1 | -1): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), faceMat)
  face.name = 'wing-membrane'
  blade.add(face)
  // 双翅目翅脉稀疏：venation 轻档（纵脉 5、横脉密度 2）
  const veins = venation({
    length: spec.length,
    width: spec.width,
    outline: spec.outline,
    longitudinal: 5,
    crossDensity: 2,
    veinScale: 0.011,
    material: veinMat,
    name: 'vein',
  })
  if (veins) blade.add(veins)
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  // 骨架标记：双翅目只有一对前翅是真正的翅，平衡棒（haltere）是另一处
  // 独立的自写部件，不在这里、也不该被登记成翅。
  registerWing(pivot, { side, role: 'fore' })
  return { pivot, blade, tipLocal: new THREE.Vector3(spec.length * 0.94, 0, 0) }
}

// ---------------------------------------------------------------- 建模主体

export function buildRobberFly(): InsectModel {
  const g = new THREE.Group()

  // ACES 铁律：底色压深一档，让 mystax/haltere 的亮色对比拉满
  const bodyMat = chitin({ color: '#3b342a', gloss: 0.42, clearcoat: 0.18 })
  const thoraxMat = chitin({ color: '#463e31', gloss: 0.45, clearcoat: 0.2, surface: 'punctate' })
  const abdomenMat = chitin({ color: '#4a4234', gloss: 0.4, clearcoat: 0.12 })
  const legMat = chitin({ color: '#2c271f', gloss: 0.38 })
  const mystaxMat = chitin({ color: '#d9c9a2', gloss: 0.22 })
  const haltereStalkMat = chitin({ color: '#b39a55', gloss: 0.4 })
  const haltereBallMat = chitin({ color: '#dcbf6a', gloss: 0.55, clearcoat: 0.3 })
  const wingFaceMat = membrane('#ddd6c8', 0.24, { iridescent: true, iridescenceStrength: 0.22 })
  const veinMat = chitin({ color: '#2e281f', gloss: 0.3, side: THREE.DoubleSide })

  // ---- 头：宽扁（flat>1 = 背腹压扁），前端是口器区
  const head = new THREE.Mesh(
    spindle([0.88, 0.16, 0], [1.28, 0.12, 0], 0.2, { bulge: 0.42, flat: 1.15, taperStart: 0.6, taperEnd: 0.35 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 两复眼分开（dichoptic）：z=±0.21，眼内缘不越中线——
  // 眼顶高出头壳顶，两峰之间就是食虫虻标志性的凹陷头顶
  const eyeAt: [number, number, number] = [1.06, 0.24, 0.21]
  const eyeR = 0.18
  const eyes = compoundEyePair({ at: eyeAt, radius: eyeR, color: '#54301c', flatten: 0.85, stretch: 1.05, facets: true })
  eyes.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.name = 'robberEye'
  })
  g.add(eyes)

  // ---- 单眼丘：三枚单眼落在两眼之间的凹陷谷底
  g.add(ocelli([1.02, 0.32, 0], 0.018, 0.032, chitin({ color: '#1e1712', gloss: 0.7, clearcoat: 0.5 })))

  // ---- 短粗的刺吸喙：向前下方（食虫虻穿刺猎物注入消化酶的匕首）
  const proboscis = new THREE.Mesh(
    loft(
      [
        { at: new THREE.Vector3(1.24, -0.02, 0), ry: 0.036, rz: 0.036 },
        { at: new THREE.Vector3(1.4, -0.11, 0), ry: 0.01, rz: 0.01 },
      ],
      10,
    ),
    bodyMat,
  )
  g.add(proboscis)

  // ---- mystax 髭簇：口器上方、两眼之前，向前下方扇形散出 18 根硬毛
  const mystaxAt = new THREE.Vector3(1.24, 0.02, 0)
  g.add(mystaxTuft(mystaxAt, 18, mystaxMat))

  // ---- 触角：双翅目式的极短刚毛状触角（kit 自带微动钩子），
  // 不是本种的讲解重点（anchors 不含它），但普查铁律要求每虫触角可摆
  g.add(antennaPair({ base: [1.22, 0.22, 0.05], length: 0.22, kind: 'setaceous', pitch: 40, yaw: 18, thickness: 0.016 }, bodyMat))

  // ---- 胸：粗壮拱起（捕猎蝇的飞行肌舱），表面刻点
  const thorax = new THREE.Mesh(
    spindle([0.15, 0.02, 0], [0.88, 0.08, 0], 0.3, { bulge: 0.45, flat: 1.0, taperStart: 0.55, taperEnd: 0.6 }),
    thoraxMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 腹：修长渐尖（长/粗 ≈ 4），8 节
  const abdomenFrom = new THREE.Vector3(0.18, 0.0, 0)
  const abdomenTo = new THREE.Vector3(-1.42, -0.06, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      r0: 0.19,
      r1: 0.012,
      segments: 8,
      groove: 0.16,
      bulge: 0.18,
      color: '#4a4234',
    }),
    abdomenMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 平衡棒：翅基后下方，腹侧外露
  const haltereBase = new THREE.Vector3(0.3, 0.04, 0.17)
  const haltereR = haltere(haltereBase, 1, haltereStalkMat, haltereBallMat)
  const haltereL = haltere(new THREE.Vector3(haltereBase.x, haltereBase.y, -haltereBase.z), -1, haltereStalkMat, haltereBallMat)
  g.add(haltereR, haltereL)

  // ---- 三对捕猎足：全部带胫节刺，前足最粗（空中抱抓猎物的主力）
  g.add(legPair({ base: [0.72, -0.1, 0.16], femur: 0.5, tibia: 0.46, tarsus: 0.3, thickness: 0.05, splay: 30, sweep: -30, knee: 62, spines: true }, legMat))
  g.add(legPair({ base: [0.5, -0.13, 0.19], femur: 0.52, tibia: 0.5, thickness: 0.048, splay: 34, sweep: 4, knee: 68, spines: true }, legMat))
  g.add(legPair({ base: [0.28, -0.13, 0.18], femur: 0.58, tibia: 0.56, thickness: 0.048, splay: 30, sweep: 34, knee: 70, spines: true }, legMat))

  // ---- 一对翅：收拢盖在腹背、后掠半开
  const wingSpec: WingSpec = {
    base: [0.55, 0.3, 0.09],
    length: 1.7,
    width: 0.5,
    outline: [
      [0, 0.12],
      [0.15, 0.55],
      [0.4, 0.9],
      [0.62, 1.0],
      [0.82, 0.8],
      [1, 0.25],
    ],
    spread: -115,
    tilt: -8,
    sweep: 0,
    thickness: 0.006,
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
  const haltereBall = (haltereR.userData.ball as THREE.Vector3).clone()

  const anchors: Record<string, THREE.Vector3> = {
    mystax: mystaxAt.clone().add(new THREE.Vector3(0.14, -0.03, 0)),
    foreleg: new THREE.Vector3(1.05, -0.38, 0.42),
    wing: wingTip,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + eyeR),
    haltere: haltereBall,
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.45).add(new THREE.Vector3(0, 0.1, 0)),
  }

  return finalize(g, anchors)
}
