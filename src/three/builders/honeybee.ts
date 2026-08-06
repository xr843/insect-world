/**
 * 西方蜜蜂 Apis mellifera
 *
 * 造型要点：
 * - 绒毛覆盖的胸部是蜜蜂最直接的观感来源（也是它能沾上花粉、成为传粉者
 *   的功能基础）。本文件用 Fibonacci 网格在胸部背侧椭球面上撒出一层
 *   小圆锥模拟绒毛，只覆盖上半球（背侧+体侧），腹面不长毛，贴近真实
 *   绒毛分布；数量控制在 170 根，兼顾观感与面数预算。
 * - 蜜蜂科最典型的黑黄相间环带出现在腹部背板：这不是一张贴图，而是
 *   相邻背板（tergite）本身颜色不同。因此本文件放弃 kit.segmentedAbdomen
 *   （单一材质）,自写分段循环，每一节独立建一段小型放样并交替上色。
 * - 后足胫节外侧扁平凹陷、边缘长毛形成「花粉篮」（corbicula），采集时
 *   会驮着一团压实的花粉；这是蜜蜂科（有社会性的 Apidae）区别于其他
 *   蜂类的采集器官，也是蜜蜂辨识度第二高的部位。
 * - 螫针在腹末，是社会性蜂类（工蜂）特有的产卵器特化结构。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  legPair,
  loft,
  membrane,
  ocelli,
  spindle,
  wingPair,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 胸部绒毛：用黄金角螺旋在椭球上半球均匀撒点，每点沿椭球外法线方向
 * 立一根细锥。半球范围（不含腹面）复现真实绒毛只长在背侧/体侧的分布。
 */
function thoraxFuzz(center: THREE.Vector3, radii: THREE.Vector3, count: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const yFrac = 1 - (i + 0.5) / count // 0(赤道)..1(背极)，只取上半球
    const ringR = Math.sqrt(Math.max(0, 1 - yFrac * yFrac))
    const theta = i * golden
    const nx = Math.cos(theta) * ringR
    const nz = Math.sin(theta) * ringR
    const ny = yFrac
    const p = new THREE.Vector3(center.x + nx * radii.x, center.y + ny * radii.y, center.z + nz * radii.z)
    // 椭球外法线用 1/r^2 缩放近似，再归一化
    const n = new THREE.Vector3(nx / radii.x, ny / radii.y, nz / radii.z).normalize()
    // 用位置本身做一个廉价的伪随机源，让长度有参差但保持可复现
    const jitter = Math.sin(i * 12.9898) * 43758.5453
    const len = 0.02 + 0.012 * (jitter - Math.floor(jitter))
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.0045, len, 5), material)
    hair.position.copy(p).addScaledVector(n, len * 0.45)
    hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
    g.add(hair)
  }
  return g
}

/**
 * 分节上色的腹部：逐节独立放样，每节前段鼓起、末端略收（环沟），
 * 交替填两种材质，形成蜜蜂标志性的黑黄环带（而不是一条渐变纹理）。
 */
function bandedAbdomen(opts: {
  from: THREE.Vector3
  to: THREE.Vector3
  r0: number
  r1: number
  segments: number
  groove: number
  colorA: THREE.ColorRepresentation
  colorB: THREE.ColorRepresentation
}): THREE.Group {
  const g = new THREE.Group()
  const matA = chitin({ color: opts.colorA, gloss: 0.55, clearcoat: 0.25 })
  const matB = chitin({ color: opts.colorB, gloss: 0.6, clearcoat: 0.3 })
  for (let s = 0; s < opts.segments; s++) {
    const t0 = s / opts.segments
    const t1 = (s + 1) / opts.segments
    const p0 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t0)
    const p1 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t1)
    const rStart = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t0))
    const rBulge = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep((t0 + t1) / 2)) * 1.08
    const rEnd = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t1)) * (1 - opts.groove)
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart, 1e-4), rz: Math.max(rStart, 1e-4) },
      { at: new THREE.Vector3().lerpVectors(p0, p1, 0.5), ry: Math.max(rBulge, 1e-4), rz: Math.max(rBulge, 1e-4) },
      { at: p1, ry: Math.max(rEnd, 1e-4), rz: Math.max(rEnd, 1e-4) },
    ]
    g.add(new THREE.Mesh(loft(sections, 20), s % 2 === 0 ? matA : matB))
  }
  return g
}

/**
 * 带花粉篮的后足：胫节外侧贴一片扁平凹面代表 corbicula 边缘的长毛围栏，
 * 外侧再挂一团压实的花粉球。用未镜像的右侧 spec 直接建腿，篮子和花粉球
 * 作为同一 group 的子节点加入，最后统一整体做一次 scale.z 镜像——
 * 这样篮子与腿的镜像变换完全同步，不会出现左右篮子长反的问题。
 */
function hindLegWithBasket(
  spec: LegSpec,
  legMat: THREE.Material,
  pollenMat: THREE.Material,
  side: 1 | -1,
): { group: THREE.Group; basketLocal: THREE.Vector3 } {
  const legGroup = leg(spec, legMat)
  const knee = legGroup.userData.knee as THREE.Vector3
  const tip = legGroup.userData.tip as THREE.Vector3
  const tibiaMid = new THREE.Vector3().lerpVectors(knee, tip, 0.42)

  // 篮子扁平地贴在胫节外侧（+Z 方向，未镜像前恒为「外侧」）
  const basket = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), legMat)
  basket.scale.set(1, 0.4, 0.62)
  basket.position.copy(tibiaMid).addScaledVector(new THREE.Vector3(0.01, -0.01, 1), 0.05)
  legGroup.add(basket)

  const pollen = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), pollenMat)
  pollen.scale.set(1, 0.8, 1.05)
  pollen.position.copy(tibiaMid).addScaledVector(new THREE.Vector3(0.02, -0.015, 1), 0.115)
  legGroup.add(pollen)

  if (side === -1) legGroup.scale.z = -1
  return { group: legGroup, basketLocal: pollen.position.clone() }
}

// ---------------------------------------------------------------- 建模主体

export function buildHoneybee(): InsectModel {
  const g = new THREE.Group()

  const cuticleMat = chitin({ color: '#241a0e', gloss: 0.45, clearcoat: 0.25 })
  const fuzzMat = chitin({ color: '#c99a52', gloss: 0.1 })
  const legMat = chitin({ color: '#1c130a', gloss: 0.35 })
  const pollenMat = chitin({ color: '#f0b429', gloss: 0.28 })
  const stingerMat = chitin({ color: '#150f09', gloss: 0.7, clearcoat: 0.4 })
  const veinMat = chitin({ color: '#3a2c17', gloss: 0.3, side: THREE.DoubleSide })

  // ---- 头
  const head = new THREE.Mesh(
    spindle([0.42, 0.02, 0], [0.63, 0.03, 0], 0.085, { bulge: 0.5, taperStart: 0.7, taperEnd: 0.45 }),
    cuticleMat,
  )
  g.add(head)

  // ---- 胸：三对足与两对翅的着生处，背面覆盖绒毛
  const thoraxCenter = new THREE.Vector3(0.23, 0.09, 0)
  const thorax = new THREE.Mesh(
    spindle([0.05, 0, 0], [0.42, 0.02, 0], 0.13, { bulge: 0.45, flat: 1.05, taperStart: 0.55, taperEnd: 0.6 }),
    cuticleMat,
  )
  g.add(thorax)
  g.add(thoraxFuzz(thoraxCenter, new THREE.Vector3(0.2, 0.13, 0.14), 170, fuzzMat))

  // ---- 腹：分节黑黄相间
  const abdomenFrom = new THREE.Vector3(0.02, -0.01, 0)
  const abdomenTo = new THREE.Vector3(-0.62, -0.04, 0)
  const abdomenR0 = 0.115
  const abdomenR1 = 0.02
  g.add(
    bandedAbdomen({
      from: abdomenFrom,
      to: abdomenTo,
      r0: abdomenR0,
      r1: abdomenR1,
      segments: 6,
      groove: 0.22,
      colorA: '#e5a12b',
      colorB: '#2b2118',
    }),
  )

  // ---- 螫针：腹末一根向下后方收尖的刺，基部略膨大代表毒囊
  const stingerBase = new THREE.Vector3().copy(abdomenTo)
  const stingerTip = stingerBase.clone().add(new THREE.Vector3(-0.16, -0.05, 0))
  const venomSac = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), stingerMat)
  venomSac.position.copy(stingerBase).add(new THREE.Vector3(-0.02, -0.01, 0))
  g.add(venomSac)
  const stingerSections: Section[] = [
    { at: stingerBase, ry: 0.026, rz: 0.026 },
    { at: new THREE.Vector3().lerpVectors(stingerBase, stingerTip, 0.5), ry: 0.014, rz: 0.014 },
    { at: stingerTip, ry: 0.002, rz: 0.002 },
  ]
  g.add(new THREE.Mesh(loft(stingerSections, 10), stingerMat))

  // ---- 复眼 + 头顶单眼
  g.add(
    compoundEyePair({
      at: [0.58, 0.06, 0.075],
      radius: 0.075,
      color: '#1a140d',
      flatten: 0.88,
      facets: true,
    }),
  )
  g.add(ocelli([0.5, 0.145, 0], 0.011, 0.045, cuticleMat))

  // ---- 膝状触角
  const antBase: [number, number, number] = [0.6, 0.05, 0.05]
  g.add(antennaPair({ base: antBase, length: 0.32, kind: 'geniculate', pitch: 10, yaw: 34, thickness: 0.014 }, legMat))

  // ---- 两对膜翅：前翅大、后翅小，半透明带翅脉，向后侧方展开的飞行预备姿态
  //
  // kit.wing() 的 spread 参数实测和文档字符串不一致：spread=90 时翅尖指向体前方，
  // spread=180 才是纯侧向展开（推导见 dragonfly.ts/monarch-butterfly.ts 顶部注释，
  // 结论对所有物种通用）：把"0=收拢向后，90=完全侧展"这句文档里的角度记作 φ，则
  //   spread = 270 + sweep − φ
  // 蜜蜂飞行预备姿态要"向后侧方展开、基本放平"，取 φ 略小于 90（78/70）+ 一点点
  // sweep 制造前后错位，tilt 取小负值让翅面基本贴平、只微微上扬。
  const foreWingLength = 0.62
  const foreWings = wingPair(
    { base: [0.28, 0.1, 0.09], length: foreWingLength, width: 0.34, spread: 198, tilt: -5, sweep: 6, thickness: 0.006 },
    membrane('#eef1ee', 0.34),
    veinMat,
    6,
  )
  g.add(foreWings)
  g.add(
    wingPair(
      { base: [0.12, 0.08, 0.085], length: 0.4, width: 0.22, spread: 210, tilt: -3, sweep: 10, thickness: 0.006 },
      membrane('#eef1ee', 0.34),
      veinMat,
      5,
    ),
  )

  // ---- 三对足：前/中足常规站立，后足带花粉篮
  g.add(
    legPair(
      { base: [0.38, -0.04, 0.09], femur: 0.16, tibia: 0.14, thickness: 0.018, splay: 28, sweep: -25, knee: 68 },
      legMat,
    ),
  )
  g.add(
    legPair(
      { base: [0.2, -0.05, 0.11], femur: 0.19, tibia: 0.17, thickness: 0.02, splay: 32, sweep: 6, knee: 70 },
      legMat,
    ),
  )
  const hindSpec: LegSpec = {
    base: [0.02, -0.05, 0.1],
    femur: 0.22,
    tibia: 0.2,
    thickness: 0.024,
    splay: 30,
    sweep: 34,
    knee: 72,
  }
  const hindRight = hindLegWithBasket(hindSpec, legMat, pollenMat, 1)
  const hindLeft = hindLegWithBasket(hindSpec, legMat, pollenMat, -1)
  g.add(hindRight.group, hindLeft.group)

  // ---- anchor：花粉篮直接用右后足那份（未做整体镜像，局部坐标即最终坐标）
  const antTip = (() => {
    const pitch = THREE.MathUtils.degToRad(10)
    const yaw = THREE.MathUtils.degToRad(34)
    // 膝状触角：柄节直伸到 45% 处再折向前下，这里近似取折点之后的中段作为热点
    const elbow = new THREE.Vector3(...antBase).addScaledVector(
      new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw)),
      0.32 * 0.45,
    )
    const dir2 = new THREE.Vector3(Math.cos(yaw * 1.8), -0.18, Math.sin(yaw * 1.8)).normalize()
    return elbow.addScaledVector(dir2, 0.32 * 0.55)
  })()

  // wing anchor：借 Object3D.localToWorld 沿实际装配的矩阵链读出前翅翅尖，
  // 避免手工重算 spread/tilt 的三角函数
  g.updateMatrixWorld(true)
  const foreRightPivot = foreWings.children[0] as THREE.Group
  const foreRightBlade = foreRightPivot.children[0] as THREE.Group
  const wingTip = foreRightBlade.localToWorld(new THREE.Vector3(foreWingLength * 0.9, 0, 0))

  const anchors: Record<string, THREE.Vector3> = {
    stinger: stingerTip,
    pollenBasket: hindRight.basketLocal,
    wing: wingTip,
    eye: new THREE.Vector3(0.58, 0.06, 0.075 + 0.075),
    antenna: antTip,
    thorax: thoraxCenter.clone(),
  }

  return finalize(g, anchors)
}
