/**
 * 石蛾 Stenopsyche marmorata（毛翅目 Trichoptera——本项目第 14 个目）
 *
 * 造型要点：
 * - 毛翅目之名的来源：翅面覆**毛**而非鳞片（蛾是鳞片、石蛾是毛，
 *   Trichoptera = "毛翅"），停栖时两对翅呈屋脊状合拢于背上成"人字
 *   屋顶"。翅面因此**不用 membrane()**（石蛾翅不透亮），用
 *   chitin({surface:'velvet', gloss:0.25}) 出绒毛感（velvet 档会把
 *   sheen 置 1——这是测试可以钉住的材质事实），再在前翅上表面撒
 *   确定性分布的短毛锥加强"被毛"的第一眼观感。
 * - 屋脊合拢的几何事实：翅整体 Y 向跨度 > Z 向跨度（陡屋顶）。
 *   姿态推导沿用 cicada.ts 的公式（θy = 90°−spread+sweep）：
 *   spread=−100 → θy=190°（cos≈−0.985 几乎纯朝尾、外扬极小），
 *   tilt=76° 把翅宽方向立起来（宽度的 96% 投影到 Y）——前缘在背
 *   中线相合成脊、后缘垂向腹侧两旁，正是帐篷状停栖。
 * - 前伸的长丝状触角（≥ 体长）：静止时**向前平伸**——蛾类触角后收
 *   贴体，石蛾触角向前直指，是水边分辨蛾与石蛾的第一分辨点。
 *   kit.antenna() 的 filiform 有明显下垂弧（末端 droop = 0.35L），
 *   表达不了"平伸"，故自建：几乎纯 +X 的微弯长杆、半径交替出
 *   念珠状分节，按铁律挂微动钩子（name='antenna' + userData.base，
 *   左右各自 base、z 符号相反，展台据此错开相位）。
 * - 下颚须（maxillary palp）明显：石蛾成虫口器退化，头前下方一对
 *   分节长须是它取食花蜜露水的主要工具，也是检索表上的常用特征。
 * - 通体灰褐低调（压深一档），无虹彩无金属——石蛾就该朴素。
 *
 * 坐标：+X 前，+Y 上，+Z 右；1 单位 = 1cm，体长约 1.8cm。
 */
import * as THREE from 'three'
import {
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

/** 确定性 0~1 哈希（无 Math.random，同参数两次构建逐顶点一致） */
function hash01(seed: number): number {
  const s = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * 前伸的长丝状触角（自写）：几乎纯 +X 方向的微弯长杆，半径按节交替
 * （粗/细相间）读出念珠状分节。末端只轻微下垂（0.05，远小于 kit
 * filiform 的 0.35L）——"平伸"就是它与蛾类的分辨点，垂下来就不是石蛾了。
 */
function forwardAntenna(base: THREE.Vector3, side: 1 | -1, length: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  const pitch = THREE.MathUtils.degToRad(3)
  const yaw = THREE.MathUtils.degToRad(5) * side
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  const steps = 16
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const p = base
      .clone()
      .addScaledVector(dir, length * t)
      .add(new THREE.Vector3(0, -0.05 * t * t, side * 0.06 * Math.sin(t * Math.PI)))
    const taper = 0.011 * (1 - t * 0.6)
    const bead = i % 2 === 0 ? 1.0 : 0.78 // 念珠状分节：半径交替
    sections.push({ at: p, ry: taper * bead, rz: taper * bead })
  }
  g.add(new THREE.Mesh(loft(sections, 8), material))
  return g
}

/** 下颚须：头前下方向前下弯、端部微上勾的分节细须。每侧一根，name='palp'。 */
function maxillaryPalp(base: THREE.Vector3, side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const pts = [
    base.clone(),
    base.clone().add(new THREE.Vector3(0.09, -0.06, side * 0.015)),
    base.clone().add(new THREE.Vector3(0.17, -0.085, side * 0.03)),
    base.clone().add(new THREE.Vector3(0.23, -0.055, side * 0.04)),
  ]
  const radii = [0.014, 0.011, 0.008, 0.004]
  const sections: Section[] = pts.map((p, i) => ({ at: p, ry: radii[i], rz: radii[i] }))
  const m = new THREE.Mesh(loft(sections, 8), material)
  m.name = 'palp'
  return m
}

/** 翅面短毛：在翅 blade 局部系（X 沿翅长、Z 翅宽）中带撒确定性毛锥，沿 +Y 微向翅尖倒。 */
function wingHairs(spec: WingSpec, count: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const up = new THREE.Vector3(0, 1, 0)
  for (let i = 0; i < count; i++) {
    const x = (0.22 + hash01(i * 7 + 1) * 0.66) * spec.length
    const z = (-0.2 + hash01(i * 13 + 5) * 0.46) * spec.width
    const len = 0.035 + hash01(i * 3 + 2) * 0.03
    const dir = new THREE.Vector3(0.35, 1, (hash01(i * 5 + 4) - 0.5) * 0.3).normalize()
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.0055, len, 4), material)
    hair.position.set(x, 0.008 + len * 0.4, z)
    hair.quaternion.setFromUnitVectors(up, dir)
    g.add(hair)
  }
  return g
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/** 被毛翅装配：翅面命名 'hairyWing'（velvet 材质），姿态见文件头推导。 */
function buildWing(spec: WingSpec, faceMat: THREE.Material, hairMat: THREE.Material, hairs: number, side: 1 | -1): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  const face = new THREE.Mesh(wingGeometry(spec), faceMat)
  face.name = 'hairyWing'
  blade.add(face)
  if (hairs > 0) blade.add(wingHairs(spec, hairs, hairMat))
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side
  return { pivot, blade, tipLocal: new THREE.Vector3(spec.length * 0.92, 0, 0) }
}

// ---------------------------------------------------------------- 建模主体

export function buildCaddisfly(): InsectModel {
  const g = new THREE.Group()

  // ACES：灰褐全系压深一档。石蛾没有招牌亮色——它的招牌是形态不是颜色
  const bodyMat = chitin({ color: '#4f463a', gloss: 0.3, clearcoat: 0.06 })
  const thoraxMat = chitin({ color: '#544a3c', gloss: 0.3, clearcoat: 0.08, surface: 'velvet' })
  const abdomenMat = chitin({ color: '#484034', gloss: 0.26 })
  // 招牌材质：被毛的翅——velvet（sheen=1）+ 低光泽，不透亮
  const wingMat = chitin({ color: '#57503f', gloss: 0.25, surface: 'velvet', side: THREE.DoubleSide })
  const hairMat = chitin({ color: '#6a6150', gloss: 0.15 })
  const legMat = chitin({ color: '#5d5344', gloss: 0.28 })
  const antennaMat = chitin({ color: '#3a332a', gloss: 0.3 })
  const palpMat = chitin({ color: '#4a4136', gloss: 0.25 })

  // ---- 头：小圆头
  const head = new THREE.Mesh(
    spindle([0.75, 0.08, 0], [0.95, 0.08, 0], 0.11, { bulge: 0.45, taperStart: 0.65, taperEnd: 0.4 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 复眼：中等，半球状凸出头侧
  const eyeAt: [number, number, number] = [0.88, 0.12, 0.085]
  const eyeR = 0.05
  g.add(compoundEyePair({ at: eyeAt, radius: eyeR, color: '#241d15', flatten: 0.85, stretch: 1.0 }))

  // ---- 长丝状触角：向前平伸，长度超过体长（1.9 vs 体长 1.8）
  const antLength = 1.9
  const antBaseR = new THREE.Vector3(0.94, 0.12, 0.05)
  const antBaseL = new THREE.Vector3(0.94, 0.12, -0.05)
  g.add(forwardAntenna(antBaseR, 1, antLength, antennaMat), forwardAntenna(antBaseL, -1, antLength, antennaMat))

  // ---- 下颚须：头前下方一对，前下弯、端部微上勾
  const palpBase = new THREE.Vector3(0.9, -0.02, 0.04)
  g.add(maxillaryPalp(palpBase, 1, palpMat), maxillaryPalp(new THREE.Vector3(palpBase.x, palpBase.y, -palpBase.z), -1, palpMat))

  // ---- 胸：背面微拱、带绒（石蛾胸背也是毛的）
  const thoraxCenter = new THREE.Vector3(0.55, 0.12, 0)
  const thorax = new THREE.Mesh(
    spindle([0.3, 0.04, 0], [0.78, 0.1, 0], 0.17, { bulge: 0.45, flat: 1.0, taperStart: 0.6, taperEnd: 0.55 }),
    thoraxMat,
  )
  thorax.name = 'thorax'
  g.add(thorax)

  // ---- 腹：圆筒渐细，8 节，全部藏进翅屋顶之下
  const abdomenFrom = new THREE.Vector3(0.32, 0.02, 0)
  const abdomenTo = new THREE.Vector3(-0.85, -0.02, 0)
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({
      from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
      to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
      r0: 0.15,
      r1: 0.03,
      segments: 8,
      groove: 0.15,
      bulge: 0.22,
      color: '#484034',
    }),
    abdomenMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 六足：细长，splay 放大让腿从翅裙下伸出可见
  g.add(legPair({ base: [0.62, -0.04, 0.12], femur: 0.32, tibia: 0.34, thickness: 0.018, splay: 38, sweep: -26, knee: 66 }, legMat))
  g.add(legPair({ base: [0.48, -0.06, 0.13], femur: 0.36, tibia: 0.38, thickness: 0.018, splay: 40, sweep: 6, knee: 68 }, legMat))
  g.add(legPair({ base: [0.34, -0.06, 0.12], femur: 0.42, tibia: 0.46, thickness: 0.018, splay: 36, sweep: 34, knee: 72 }, legMat))

  // ---- 两对被毛翅：屋脊状合拢成人字屋顶（推导见文件头）。
  // 前翅覆在外侧带毛；后翅略短、藏在前翅之下（毛省掉，看不见）
  const wingOutline: [number, number][] = [
    [0, 0.15],
    [0.12, 0.5],
    [0.35, 0.85],
    [0.6, 1.0],
    [0.8, 0.9],
    [0.93, 0.6],
    [1, 0.2],
  ]
  const foreSpec: WingSpec = {
    base: [0.55, 0.3, 0.05],
    length: 1.9,
    width: 0.6,
    outline: wingOutline,
    spread: -100,
    tilt: 76,
    sweep: 0,
    thickness: 0.005,
  }
  const hindSpec: WingSpec = {
    base: [0.42, 0.27, 0.05],
    length: 1.45,
    width: 0.55,
    outline: wingOutline,
    spread: -96,
    tilt: 70,
    sweep: 0,
    thickness: 0.005,
  }
  let foreRight: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingMat, hairMat, 36, side)
    const hw = buildWing(hindSpec, wingMat, hairMat, 0, side)
    g.add(fw.pivot, hw.pivot)
    if (side === 1) foreRight = fw
  }

  // ---- anchors
  g.updateMatrixWorld(true)
  const wingMid = foreRight!.blade.localToWorld(new THREE.Vector3(foreSpec.length * 0.55, 0, 0))
  const antennaTip = antBaseR
    .clone()
    .add(new THREE.Vector3(antLength * 0.6, 0.0, 0.06))

  const anchors: Record<string, THREE.Vector3> = {
    hairyWing: wingMid,
    antenna: antennaTip,
    palp: palpBase.clone().add(new THREE.Vector3(0.17, -0.08, 0.03)),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + eyeR),
    thorax: thoraxCenter,
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.45).add(new THREE.Vector3(0, 0.1, 0)),
  }

  return finalize(g, anchors)
}
