/**
 * 屁步甲 Pheropsophus jessoensis（鞘翅目·步甲科，能喷 100°C 苯醌的化学防御专家）
 *
 * 造型要点：
 * - 招牌是腹末的喷射口：真实个体的腹部末节（生殖节/pygidium 区域）能
 *   转向任意方向喷射，静止时也比常规步甲更明显地上翘。本文件把腹部
 *   拆成两截——'abdomen'（鞘翅末端到喷口根部，维持接近水平，代表
 *   "腹部中段"）与喷口本体 sprayNozzle()（从 'abdomen' 末端出发，
 *   一路上翘卷向后上方，半径从根部到末端渐次放大——放大而非收尖，
 *   是本文件与其它甲虫附肢管状结构最大的写法差异：其它管状结构
 *   （腿、触角、大颚）全部往末端收细，独独喷口要"张开"，因为它读的
 *   是"喇叭口"而不是"尖端"）。两截分开命名是为了让测试量得到干净的
 *   对照——如果只建一根连续的管子，喷口根部那圈截面必然与腹部末端
 *   重叠，此时"喷口 Y 坐标 > 腹部 Y 坐标"这类比较会被根部的重叠区污染；
 *   拆成两个独立命名的 mesh，测试就能分别取各自的真实包围盒来比较，
 *   不必猜哪一圈顶点才算"喷口"。
 * - 黄黑警戒色：头与前胸背板橙红、鞘翅蓝黑缀肩部+端部两对黄斑。⚠️
 *   彩色色块的基色都要比"想要的观感"压深一档——ACES 色调映射会把
 *   受光面大幅提亮去饱和（同 burying-beetle.ts 橙带的教训），本文件
 *   直接沿用那次踩坑后校准过的压深幅度：头胸橙红压到 #7a3c05，黄斑
 *   压到 #6e4c04，且都把 gloss/clearcoat 压低，减少高光对固有色的
 *   冲淡。鞘翅底色不是中性黑，而是刻意偏蓝的 #080a12，并保留
 *   kit.elytra() 的釉质路线（gloss/clearcoat 都不压低）——这是本种
 *   与埋葬虫警戒色的关键区别："蓝黑具金属光泽"是鞘翅本身的固有质感，
 *   不是需要避免被高光冲淡的彩色色块，因此不适用上面那条"压深一档"
 *   的规则。
 * - 鞘翅细纵纹：步甲科通用的刻点沟（striae），比 ground-beetle.ts 的
 *   3 条粗纵脊更细更密（5 条，半径不到 ground-beetle 主脊的一半），
 *   复用同一套"沿放样截面反推曲面坐标扫出一条真正凸起的窄脊"手法
 *   （elytraRidge()，本文件重新实现一份，不跨文件 import 私有函数），
 *   只是幅度调轻，读成"细密刻纹"而不是"三条隆起的棱"。
 * - 镰刀状大颚沿用 ground-beetle.ts sickleMandibles() 的构造思路（主干
 *   先外凸后段加速内弯），本文件按更小体型重新标定参数。
 * - 长足疾走姿态：knee/ankle 角度压低（更直立，同 ground-beetle.ts
 *   "高步态"），但腿的粗细明显更细——本种不强调"有力"，强调"快"。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

function smooth(x: number): number {
  const c = Math.min(1, Math.max(0, x))
  return c * c * (3 - 2 * c)
}

function edgeTaper(t: number, inFrac: number, outFrac: number): number {
  if (t < inFrac) return smooth(t / inFrac)
  if (t > 1 - outFrac) return smooth((1 - t) / outFrac)
  return 1
}

/** 鞘翅细纵纹：同 ground-beetle.ts elytraRidge()，半径压得更小、条数更多，读成刻点沟而非隆脊。 */
function fineStriae(
  sections: Section[],
  centers: THREE.Vector3[],
  side: 1 | -1,
  zOffset: number,
  thetaDeg: number,
  tFrom: number,
  tTo: number,
  ridgeR: number,
  material: THREE.Material,
): THREE.Mesh {
  const n = sections.length
  const iFrom = Math.round(tFrom * (n - 1))
  const iTo = Math.round(tTo * (n - 1))
  const theta = THREE.MathUtils.degToRad(side * thetaDeg)
  const pts: Section[] = []
  for (let i = iFrom; i <= iTo; i++) {
    const sec = sections[i]
    const c = centers[i]
    const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
    const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
    const normal = new THREE.Vector3(0, nx, nz).normalize()
    const pos = new THREE.Vector3(c.x, c.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz).addScaledVector(
      normal,
      ridgeR * 0.8 + 0.004,
    )
    const localT = (i - iFrom) / Math.max(1, iTo - iFrom)
    const r = Math.max(ridgeR * edgeTaper(localT, 0.1, 0.14), 0.001)
    pts.push({ at: pos, ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(pts, 6), material)
  mesh.name = 'stria'
  return mesh
}

/** 贴合鞘翅曲面的黄斑，写法同 hercules-beetle.ts surfaceSpot()。 */
function surfaceSpot(
  sec: Section,
  center: THREE.Vector3,
  zOffset: number,
  thetaDeg: number,
  r: number,
  material: THREE.Material,
): THREE.Mesh {
  const theta = THREE.MathUtils.degToRad(thetaDeg)
  const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
  const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz).addScaledVector(
    normal,
    0.006,
  )
  const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), material)
  spot.scale.set(1, 1, 0.4)
  spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  spot.position.copy(pos)
  spot.name = 'spot'
  return spot
}

/** 镰刀状大颚，写法同 ground-beetle.ts sickleMandibles()，按本种更小体型重新标定。 */
function sickleMandibles(at: [number, number, number], length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const z0 = at[2]
  const bow = length * 0.12
  const inward = length * 0.4
  for (const side of [1, -1] as const) {
    const base = new THREE.Vector3(at[0], at[1], z0 * side)
    const steps = 12
    const path: THREE.Vector3[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const outBulge = Math.sin(t * Math.PI) * bow
      const curl = Math.pow(t, 1.6) * inward
      path.push(new THREE.Vector3(base.x + length * t, base.y - length * 0.06 * t, side * (z0 + outBulge - curl)))
    }
    const sections: Section[] = path.map((p, i) => {
      const t = i / steps
      const r = thickness * (1 - t * 0.82)
      return { at: p, ry: r * 0.8, rz: r }
    })
    const shaft = new THREE.Mesh(loft(sections, 10), material)
    shaft.name = 'mandible'
    g.add(shaft)
  }
  return g
}

/**
 * 喷射口：从 'abdomen' 末端出发，一路上翘卷向后上方，半径从根部到
 * 末端渐次放大（"喇叭口"而非收尖）。pitch 是起始方向相对 -X 轴的
 * 上扬角，curve 是沿路径二次项叠加的额外上翘——两者共同作用，让
 * 喷口从"几乎水平后指"逐渐卷成"接近垂直朝上"，读成"正在把腹末转向
 * 后上方"的喷射姿态。
 */
function sprayNozzle(
  base: THREE.Vector3,
  length: number,
  material: THREE.Material,
  opts: { pitch: number; curve: number; r0: number; r1: number; steps?: number },
): { mesh: THREE.Mesh; tip: THREE.Vector3 } {
  const steps = opts.steps ?? 12
  const pitch = THREE.MathUtils.degToRad(opts.pitch)
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(
      new THREE.Vector3(
        base.x - Math.cos(pitch) * length * t,
        base.y + Math.sin(pitch) * length * t + opts.curve * length * t * t,
        base.z,
      ),
    )
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = THREE.MathUtils.lerp(opts.r0, opts.r1, smooth(t))
    return { at: p, ry: r * 0.86, rz: r }
  })
  const mesh = new THREE.Mesh(loft(sections, 14), material)
  mesh.name = 'sprayTip'
  return { mesh, tip: path[path.length - 1].clone() }
}

// ---------------------------------------------------------------- 主体

export function buildBombardierBeetle(): InsectModel {
  const g = new THREE.Group()

  // 头胸橙红、鞘翅蓝黑带金属光泽——头胸基色比"想要的观感"压深一档
  // （见文件头注释），gloss/clearcoat 也压低，避免清漆高光把固有色
  // 冲淡成粉浅色调。鞘翅底色刻意偏蓝（不是纯中性黑 #0b0b0b 那种），
  // 且用 kit.elytra() 的釉质路线（与本种的"金属光泽"描述一致，goliath-
  // beetle.ts 反而要刻意避开这条路线，两者是两回事，不要混用）。
  const headPronotumMat = chitin({ color: '#7a3c05', gloss: 0.48, metal: 0.04, clearcoat: 0.26 })
  // B3 纵沟组：'striate'，默认档（条数/深度不额外调）
  const elytraMat = elytra('#080a12', 0.3, { surface: 'striate' })
  const striaeMat = chitin({ color: '#03040a', gloss: 0.8, metal: 0.22, clearcoat: 0.5 })
  const spotMat = chitin({ color: '#6e4c04', gloss: 0.34, clearcoat: 0.12 })
  const legMat = chitin({ color: '#100f0d', gloss: 0.46, metal: 0.08, clearcoat: 0.24 })
  const mandibleMat = chitin({ color: '#0e0d0b', gloss: 0.55, metal: 0.1, clearcoat: 0.3 })
  const antennaMat = chitin({ color: '#2c2013', gloss: 0.4 })
  const abdomenMat = chitin({ color: '#100e0c', gloss: 0.36, clearcoat: 0.14 })
  const sprayMat = chitin({ color: '#2a0f06', gloss: 0.4, clearcoat: 0.2 })

  // ---- 腹面体躯：胸腹基底
  const belly = new THREE.Mesh(
    spindle([-0.62, 0.02, 0], [0.42, 0.05, 0], 0.19, { bulge: 0.42, flat: 1.12, taperStart: 0.14, taperEnd: 0.5 }),
    headPronotumMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：黑底，缀肩部/端部两对黄斑 + 5 条细纵纹
  const eSteps = 26
  const eFrom = 0.44
  const eTo = -0.5
  const halfWidth = 0.155
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.58) * Math.PI * 0.9)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.15 - 0.04 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.16, 0.006), rz: Math.max(w * 0.135, 0.006) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), elytraMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)

    // 5 条细纵纹，theta 分散在背侧到外侧
    const striaThetas = [12, 32, 52, 72, 92]
    for (const theta of striaThetas) {
      g.add(fineStriae(elytronSections, elytronCenters, side, side * halfWidth, theta, 0.08, 0.9, 0.009, striaeMat))
    }

    // 肩部一对（近前缘）+ 端部一对（近末端），共 4 枚黄斑
    for (const [t, theta, r] of [
      [0.1, 40, 0.028],
      [0.88, 44, 0.024],
    ] as [number, number, number][]) {
      const idx = Math.round(t * eSteps)
      g.add(surfaceSpot(elytronSections[idx], elytronCenters[idx], side * halfWidth, theta, r, spotMat))
    }
  }

  // ---- 小盾片
  g.add(
    new THREE.Mesh(
      spindle([0.46, 0.17, 0], [0.36, 0.175, 0], 0.024, { bulge: 0.2, flat: 1.3, taperStart: 0.85, taperEnd: 0.05 }),
      headPronotumMat,
    ),
  )

  // ---- 前胸背板：橙红，与鞘翅黑底形成警戒色反差
  const pronotum = new THREE.Mesh(
    spindle([0.24, 0.1, 0], [0.5, 0.14, 0], 0.145, { bulge: 0.46, flat: 1.05, taperStart: 0.62, taperEnd: 0.55 }),
    headPronotumMat,
  )
  pronotum.scale.set(1, 0.94, 1)
  pronotum.name = 'pronotum'
  g.add(pronotum)

  // ---- 头部：同为橙红
  const head = new THREE.Mesh(
    spindle([0.46, 0.12, 0], [0.85, 0.135, 0], 0.115, { bulge: 0.42, flat: 0.98, taperStart: 0.62, taperEnd: 0.3 }),
    headPronotumMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 复眼
  g.add(compoundEyePair({ at: [0.72, 0.165, 0.11], radius: 0.04, color: '#0b0908', flatten: 0.85, facets: true }))

  // ---- 镰刀状大颚，向前伸
  g.add(sickleMandibles([0.83, 0.125, 0.045], 0.16, 0.02, mandibleMat))

  // ---- 丝状触角，长而疾走型步甲科的通用特征
  g.add(antennaPair({ base: [0.76, 0.17, 0.07], length: 0.6, kind: 'filiform', pitch: 14, yaw: 32, thickness: 0.012 }, antennaMat))

  // ---- 三对长而细的疾走足：knee/ankle 角度压低（更直立，高步态），
  // 但粗细明显小于 ground-beetle 的"有力"型腿——本种强调快而非壮。
  const legSpecs: LegSpec[] = [
    { base: [0.36, -0.075, 0.135], femur: 0.34, tibia: 0.32, tarsus: 0.1, thickness: 0.022, splay: 42, sweep: -32, knee: 34, ankle: 30 },
    { base: [0.05, -0.085, 0.15], femur: 0.4, tibia: 0.38, tarsus: 0.12, thickness: 0.024, splay: 40, sweep: 6, knee: 32, ankle: 28 },
    { base: [-0.24, -0.085, 0.14], femur: 0.42, tibia: 0.4, tarsus: 0.12, thickness: 0.024, splay: 40, sweep: 30, knee: 34, ankle: 30 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  // ---- 腹部：鞘翅末端到喷口根部，维持接近水平，代表"腹部中段"
  const abdomenFrom = new THREE.Vector3(eTo, 0.09, 0)
  const abdomenTo = new THREE.Vector3(-0.68, 0.07, 0)
  const abdomen = new THREE.Mesh(
    spindle([abdomenFrom.x, abdomenFrom.y, 0], [abdomenTo.x, abdomenTo.y, 0], 0.078, {
      bulge: 0.35,
      flat: 1.15,
      taperStart: 0.85,
      taperEnd: 0.6,
    }),
    abdomenMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 喷射口：从腹部末端出发，卷向后上方，喇叭口渐次放大
  const nozzle = sprayNozzle(abdomenTo, 0.2, sprayMat, { pitch: 34, curve: 0.62, r0: 0.042, r1: 0.062, steps: 12 })
  g.add(nozzle.mesh)
  // 喷口末端的凹口暗示：一枚压扁的小球贴在管口，读成"张开的喷口"而非光秃管尖
  const lip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), sprayMat)
  lip.scale.set(1, 0.4, 1)
  lip.position.copy(nozzle.tip).addScaledVector(new THREE.Vector3(0, 1, 0), 0.006)
  lip.name = 'sprayTip'
  g.add(lip)

  const anchors: Record<string, THREE.Vector3> = {
    sprayTip: nozzle.tip.clone(),
    elytra: new THREE.Vector3(-0.05, 0.22, halfWidth * 0.8),
    mandible: new THREE.Vector3(0.95, 0.1, 0.04),
    eye: new THREE.Vector3(0.72, 0.2, 0.13),
    antenna: new THREE.Vector3(1.3, 0.28, 0.24),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
