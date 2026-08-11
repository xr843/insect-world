/**
 * 棒䗛（竹节虫目 Phasmatodea，棒䗛属 Ramulus）
 *
 * 造型要点：
 * - 全身是一根极端细长的圆柱，长径比要做到 40:1 以上——这是竹节虫
 *   拟态"枯枝"的根本，本文件把体长压到约 10cm、平均直径压到约
 *   0.16cm，实测比值超过 60:1。
 * - 躯干分节明显：每一节起始处有一圈略微凸起的"竹节"环，其余
 *   光滑收细——用 bodySegment() 逐节单独建 mesh（而非 kit 的
 *   segmentedAbdomen 单一材质几何体），这样才能顺带让相邻节
 *   之间出现颜色深浅差异。
 * - 前足向前伸直，与头、身体连成一条直线——这是竹节虫拟态时最
 *   标志性的姿势（把前足并拢前伸夹住头部，让整只虫子看起来更像
 *   一截笔直的枯枝）；中、后足则向两侧后方斜撑，起支撑作用。
 * - 六条腿都极细极长（单腿长度接近甚至超过体长一半），腿节上
 *   缀有细小的棘突/瘤突，模拟树枝表面的粗糙质感。
 * - 配色是褐绿相间的"树枝色"，各体节之间用固定种子的伪随机
 *   （sin-hash，不用 Math.random）在色相/明度上做小幅抖动，
 *   模拟枯枝上深浅不一的斑驳感，同时保证每次构建结果完全一致。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/** 固定种子伪随机（sin-hash）：同一 index 永远得到同一个值，
 * 用来给体节配色做"看起来随机、实则可复现"的斑驳抖动。 */
function hash01(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 一节躯干：近似圆柱，起始的前 30% 内有一圈随距离指数衰减的凸棱，
 * 模拟竹节的环状棱线；其余部分平滑地从 r0 过渡到 r1。
 * 相邻两节在环棱处半径不连续（前一节收尾是 r1，后一节起步是
 * r0*(1+nodeBulge)），这个"台阶"正是节间分界线的来源，是有意为之。
 */
function bodySegment(
  from: THREE.Vector3,
  to: THREE.Vector3,
  r0: number,
  r1: number,
  material: THREE.Material,
  radialSegments = 8,
  nodeBulge = 0.22,
): THREE.Mesh {
  const steps = 7
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const base = THREE.MathUtils.lerp(r0, r1, t)
    const bump = 1 + nodeBulge * Math.exp(-t * 10)
    const r = base * bump
    sections.push({ at: new THREE.Vector3().lerpVectors(from, to, t), ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, radialSegments), material)
  mesh.name = 'trunk-segment' // 供测试量取真实体径（排除腿/触角）
  return mesh
}

/** 沿腿节撒几颗细小的瘤突，模拟树枝表皮的粗糙感（kit 的 leg() 只有稀疏的刺，这里补密度）。 */
function addLegTubercles(legGroup: THREE.Group, base: THREE.Vector3, material: THREE.Material): void {
  const knee = legGroup.userData.knee as THREE.Vector3 | undefined
  const tip = legGroup.userData.tip as THREE.Vector3 | undefined
  if (!knee || !tip) return
  for (const t of [0.32, 0.68]) {
    const p = base.clone().lerp(knee, t)
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), material)
    bump.position.copy(p)
    legGroup.add(bump)
  }
  for (const t of [0.28, 0.62]) {
    const p = knee.clone().lerp(tip, t)
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), material)
    bump.position.copy(p)
    legGroup.add(bump)
  }
}

/**
 * 一对腿，附带瘤突。不能直接用 kit 的 legPair()——那样拿不到内部
 * leg() 分组的引用来挂瘤突，所以自己重新拼一遍镜像。
 *
 * 这里刻意不采用"先把 base.z 取反、再整体 scale.z=-1"的做法（那是
 * kit.legPair() 内部的手法）：leg() 生成的顶点坐标是绝对坐标，
 * 每个顶点 z = base.z + 该点沿腿长方向累积的 z 位移 C，而 C 的正负号
 * 由 splay/sweep 决定、与 base.z 的符号无关。先把 base.z 取反再整体
 * 镜像，顶点会变成 -(-base.z + C) = base.z - C——只有当 |base.z| 远大于
 * |C|（腿很短、贴着身体）时才近似等于真镜像 -(base.z + C)；一旦腿很长
 * 而 base.z 很小（本物种正是如此：细长腿、贴近体侧生出），C 会反超
 * base.z，左右腿就会明显不对称，甚至摆到错误的一侧，把整体包围盒
 * 撑得很夸张。正确做法：左右腿用同一个 base 生成同一份（未镜像的）
 * 几何，只在最后对整组做一次 scale.z=-1，这样每个顶点都精确地变成
 * -(base.z + C)，才是真正的镜像。
 */
function stickLegPair(spec: LegSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const base = new THREE.Vector3(...spec.base)

  const right = leg(spec, material)
  addLegTubercles(right, base, material)

  const left = leg(spec, material)
  addLegTubercles(left, base, material)
  left.scale.z = -1

  g.add(right, left)
  return g
}

export function buildStickInsect(): InsectModel {
  const g = new THREE.Group()

  // ---- 躯干分节：胸(2节)+腹(9节)，共 11 节；越往后越细
  const SEG_LEN_FRAC_RAW = [0.7, 0.85, 1.0, 1.05, 1.1, 1.1, 1.05, 1.0, 0.95, 0.85, 0.6]
  const lenSum = SEG_LEN_FRAC_RAW.reduce((a, b) => a + b, 0)
  const SEG_LEN_FRAC = SEG_LEN_FRAC_RAW.map((f) => f / lenSum)
  const NUM_SEGMENTS = SEG_LEN_FRAC.length

  const TRUNK_LENGTH = 9.4 // 胸腹总长；加上头部约得体长 10cm
  const TRUNK_FRONT_X = 4.7 // 头与前胸的衔接处
  // 体径：真实竹节虫体长/体径约 25:1~35:1，旧值 R_THORAX=0.115（直径
  // 0.23cm）对 ~10cm 体长已到 ~43:1，在正常取景距离下细得几乎看不见。
  // 加粗到最粗处(含竹节环凸起)直径 ≈ 0.354cm（体长/体径 ≈ 28:1，落在
  // 25~35:1 区间中段），仍保留拟态"细长如枝"的观感，但不再是一根发丝。
  const R_THORAX = 0.145
  const R_ABDOMEN_TIP = 0.065

  const jointsX: number[] = [TRUNK_FRONT_X]
  for (const f of SEG_LEN_FRAC) jointsX.push(jointsX[jointsX.length - 1] - f * TRUNK_LENGTH)

  for (let i = 0; i < NUM_SEGMENTS; i++) {
    const t0 = i / NUM_SEGMENTS
    const t1 = (i + 1) / NUM_SEGMENTS
    const r0 = THREE.MathUtils.lerp(R_THORAX, R_ABDOMEN_TIP, smoothstep(t0))
    const r1 = THREE.MathUtils.lerp(R_THORAX, R_ABDOMEN_TIP, smoothstep(t1))
    const from = new THREE.Vector3(jointsX[i], 0, 0)
    const to = new THREE.Vector3(jointsX[i + 1], 0, 0)

    // 每节颜色在"枯枝褐"与"苔藓绿"之间用固定种子哈希取值，明度/饱和度
    // 也做小幅抖动——树枝真实的斑驳感来自这种节间深浅不一，而非渐变
    const hue = THREE.MathUtils.lerp(32 / 360, 95 / 360, hash01(i * 3 + 1))
    const light = 0.24 + hash01(i * 3 + 2) * 0.16
    const sat = 0.28 + hash01(i * 3 + 3) * 0.22
    const color = new THREE.Color().setHSL(hue, sat, light)
    const segMat = chitin({ color, gloss: 0.16 + hash01(i * 3 + 4) * 0.1, clearcoat: 0.08 })

    g.add(bodySegment(from, to, r0, r1, segMat))
  }

  // ---- 头部：与身体几乎等粗，只在最前端略微收圆，不像大颚昆虫那样突出
  const headMat = chitin({ color: new THREE.Color().setHSL(70 / 360, 0.22, 0.28), gloss: 0.18, clearcoat: 0.06 })
  const headFrontX = TRUNK_FRONT_X + 0.55
  const head = new THREE.Mesh(
    spindle([headFrontX, 0, 0], [TRUNK_FRONT_X, 0, 0], R_THORAX * 0.95, { bulge: 0.4, taperStart: 0.55, taperEnd: 1.0 }),
    headMat,
  )
  head.name = 'head-capsule' // 与 trunk-segment 一起构成测试用的"体长/体径"量取范围
  g.add(head)

  // ---- 复眼：小而侧生，竹节虫复眼在拟态中要尽量不起眼
  g.add(
    compoundEyePair({
      at: [headFrontX - 0.15, 0.015, R_THORAX * 0.95 * 0.82],
      radius: 0.042,
      color: '#1a140f',
      flatten: 0.72,
      stretch: 0.8,
    }),
  )

  // ---- 触角：极细的丝状触角
  g.add(
    antennaPair(
      { base: [headFrontX - 0.02, 0.008, R_THORAX * 0.5], length: 2.6, kind: 'filiform', pitch: 25, yaw: 30, thickness: 0.01 },
      headMat,
    ),
  )

  // ---- 腿：三对，粗细/姿态各不相同
  const legMat = chitin({ color: new THREE.Color().setHSL(85 / 360, 0.26, 0.26), gloss: 0.15, clearcoat: 0.04 })

  // 前足：向正前方伸直，几乎与身体共线——竹节虫拟态时的标志姿势，
  // 把前足并拢前伸夹住头部，让整体轮廓更像一截笔直的枯枝
  const foreleg = stickLegPair(
    {
      base: [TRUNK_FRONT_X - 0.15, -0.015, R_THORAX * 0.8],
      femur: 2.1,
      tibia: 2.5,
      tarsus: 1.0,
      thickness: 0.034, // 与身体同步加粗（原 0.02 太细），长度不变
      splay: 9,
      sweep: -83,
      knee: 10,
      ankle: 12,
      spines: true,
    },
    legMat,
  )
  g.add(foreleg)

  // 中足：向两侧偏后方斜撑，主要承重。knee 刻意给得较大——
  // kit 的 leg() 里，膝关节转向"垂直向下"的目标向量不含 X/Z 分量，
  // 弯得越多，腿伸展的方向就越往下"收"，水平方向（尤其是会被
  // 左右镜像翻倍计算的 Z 轴）反而更收敛；这比压小 knee 更有效，
  // 压小 knee 只会让整条腿几乎贴着 splay 的原始方向一路伸到底，
  // 水平跨度不降反升。
  const midleg = stickLegPair(
    {
      base: [jointsX[2], -0.03, R_THORAX * 0.85],
      femur: 1.5,
      tibia: 1.75,
      tarsus: 0.7,
      thickness: 0.036, // 与身体同步加粗（原 0.022 太细），长度不变
      splay: 46,
      sweep: 4,
      knee: 68,
      spines: true,
    },
    legMat,
  )
  g.add(midleg)

  // 后足：三对里最长，接近体长一半以上，向后方斜撑
  const hindleg = stickLegPair(
    {
      base: [jointsX[3], -0.03, R_ABDOMEN_TIP + 0.06],
      femur: 1.9,
      tibia: 2.3,
      tarsus: 0.9,
      thickness: 0.04, // 与身体同步加粗（原 0.024 太细），长度不变
      splay: 40,
      sweep: 40,
      knee: 70,
      spines: true,
    },
    legMat,
  )
  g.add(hindleg)

  const midBodyIdx = Math.floor(NUM_SEGMENTS / 2)
  const anchors: Record<string, THREE.Vector3> = {
    body: new THREE.Vector3(jointsX[midBodyIdx], 0, 0),
    head: new THREE.Vector3(headFrontX - 0.2, 0, 0),
    thorax: new THREE.Vector3(jointsX[1], 0, 0),
    antenna: new THREE.Vector3(headFrontX + 2.0, 0.4, R_THORAX),
    leg: new THREE.Vector3(jointsX[3], -1.5, 1.8),
    // 拟态锚点：放在躯干中段侧面，用于讲解"像一截树枝"这件事
    camouflage: new THREE.Vector3(jointsX[midBodyIdx], 0, R_ABDOMEN_TIP + 0.15),
  }

  return finalize(g, anchors)
}
