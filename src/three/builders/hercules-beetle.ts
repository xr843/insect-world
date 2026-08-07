/**
 * 长戟大兜虫 Dynastes hercules（鞘翅目·犀金龟科，世界最长的甲虫）
 *
 * 造型要点：
 * - 全部辨识度压在一对"钳子"上：前胸背板伸出一根极长的胸角，近乎
 *   水平前伸、随长度逐渐下弯；头部伸出一根短得多的头角，前伸后上翘。
 *   两者上下相对，静止时读成一把钳——这与独角仙（rhinoceros-beetle.ts）
 *   "单根角、末端分叉"的构型完全不同，本文件因此不复用 hornY()
 *   的分叉逻辑，改写 beetleHorn()：单尖不分叉，但保留「pitch 初始角 +
 *   curve 二次项弯曲」的参数化思路（该思路已被 hornY 验证好用）。
 * - 长度按真实纪录写：完整个体（含角）体长可达 17cm 左右，其中胸角
 *   单独就能占体长的一半以上，胸角长度设定为「不含角躯干长度」的
 *   1.25~1.3 倍（真实大个体的角本身就接近甚至超过身体长度）——这不是
 *   随手夸张，是这个物种存在的理由，也是它和独角仙最大的区别（独角仙
 *   的角短且分叉）。
 * - 胸角内缘（下侧，即角向下弯曲后朝向头角的那一面）密生一排短绒毛
 *   （thoracicHornBristles()），是它加持夹持力的真实结构（防滑面）。
 *   绒毛沿角的路径点在局部"下方"（-Y）生长，因为 loft() 的截面标架
 *   对这种几乎不出 XY 平面、切线方向变化平缓的路径，其 u 分量全程
 *   接近 (0,1,0)，用 -Y 近似"腹侧法线"是安全的（其余文件的绒毛/齿突
 *   都是这个近似精度，见 mole-cricket.velvetFuzz 的螺旋近似）。
 * - 鞘翅橄榄黄绿色（湿度升高时真实个体会转深褐——静态模型无法模拟湿度，
 *   此处仅还原干燥状态的浅色），缀散乱黑斑，与漆黑的头胸形成强对比；
 *   斑点沿放样截面反推曲面坐标贴合（同 tiger-beetle.surfaceSpot 的取法，
 *   本文件重新实现一份，不跨文件 import 私有函数）。
 * - 六足粗壮，胫节末端加一对小钩爪（legClaws()）：右腿在 base.z 恒正的
 *   局部坐标系里生成，再把同一份爪追加到 legPair() 拆出的 right/left
 *   两个子 Group 上——left 子 Group 自带 scale.z=-1，用同一组正 z 坐标
 *   即可自动镜像到正确一侧，不必再手写一次镜像坐标（legPair 的镜像
 *   原理见 kit.ts 与 mirror.test.ts）。
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

/**
 * 单尖不分叉的犀角：一条从 base 出发、以 pitch 初始角前伸、
 * 沿 curve 二次项弯曲的曲线。curve<0 越往末端越往下垂，curve>0 越往
 * 末端越上翘。返回主干 mesh 以及路径点/半径数组，供绒毛等附属结构
 * 复用（避免重新推一遍路径公式）。
 */
function beetleHorn(
  base: THREE.Vector3,
  length: number,
  material: THREE.Material,
  opts: { pitch: number; curve: number; thickness: number; tipThickness?: number; flatten?: number; steps?: number },
): { mesh: THREE.Mesh; path: THREE.Vector3[]; radii: number[] } {
  const steps = opts.steps ?? 20
  const pitch = THREE.MathUtils.degToRad(opts.pitch)
  const flatten = opts.flatten ?? 0.8
  const tipK = opts.tipThickness ?? 0.16

  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(
      new THREE.Vector3(
        base.x + Math.cos(pitch) * length * t,
        base.y + Math.sin(pitch) * length * t + opts.curve * length * t * t,
        base.z,
      ),
    )
  }
  const radii: number[] = []
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = opts.thickness * (1 - t * (1 - tipK))
    radii.push(r)
    return { at: p, ry: r, rz: r * flatten }
  })
  const mesh = new THREE.Mesh(loft(sections, 18), material)
  return { mesh, path, radii }
}

/**
 * 胸角内缘短绒毛：沿角路径的中段（避开基部与尖端）在"下方"密生一排
 * 短毛，是真实大兜虫夹持时的防滑面。用路径点 + 半径反推毛发根部，
 * 每根毛略朝下前方倾斜。
 */
function thoracicHornBristles(
  path: THREE.Vector3[],
  radii: number[],
  count: number,
  material: THREE.Material,
): THREE.Group {
  const g = new THREE.Group()
  const n = path.length
  const iFrom = Math.round(0.08 * (n - 1))
  const iTo = Math.round(0.82 * (n - 1))
  for (let k = 0; k < count; k++) {
    const t = k / (count - 1)
    const idx = Math.round(THREE.MathUtils.lerp(iFrom, iTo, t))
    const p = path[idx]
    const r = radii[idx]
    const root = p.clone().add(new THREE.Vector3(0, -r * 0.94, 0))
    const bristleLen = 0.16 + 0.07 * Math.sin(t * Math.PI) // 中段更长，两端收短
    const jitter = (k % 2 === 0 ? 1 : -1) * 0.02
    const tip = root
      .clone()
      .add(new THREE.Vector3(-bristleLen * 0.12, -bristleLen * 0.96, jitter))
    g.add(
      new THREE.Mesh(
        loft([{ at: root, ry: 0.018, rz: 0.018 }, { at: tip, ry: 0.0015, rz: 0.0015 }], 6),
        material,
      ),
    )
  }
  return g
}

/** 贴合鞘翅曲面的圆斑，反推放样截面坐标——写法同 tiger-beetle.ts 的 surfaceSpot()。 */
function surfaceSpot(
  sec: Section,
  center: THREE.Vector3,
  zOffset: number,
  theta: number,
  r: number,
  material: THREE.Material,
): THREE.Mesh {
  const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
  const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
  const normal = new THREE.Vector3(0, nx, nz).normalize()
  const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz).addScaledVector(
    normal,
    0.014,
  )
  const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 7), material)
  spot.scale.set(1, 1, 0.34)
  spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  spot.position.copy(pos)
  return spot
}

/** 胫节末端一对小钩爪。用 tip→knee 方向近似"前伸方向"，够用且不需要精确的踝关节朝向。 */
function legClaws(tip: THREE.Vector3, forward: THREE.Vector3, size: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  let side = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0))
  if (side.lengthSq() < 1e-8) side.set(0, 0, 1)
  side = side.normalize()
  for (const s of [1, -1] as const) {
    const clawTip = tip
      .clone()
      .addScaledVector(forward, size * 1.9)
      .addScaledVector(side, s * size * 0.6)
      .addScaledVector(new THREE.Vector3(0, -1, 0), size * 1.4)
    g.add(
      new THREE.Mesh(
        loft([{ at: tip, ry: size * 0.5, rz: size * 0.5 }, { at: clawTip, ry: 0.004, rz: 0.004 }], 7),
        material,
      ),
    )
  }
  return g
}

// ---------------------------------------------------------------- 主体

export function buildHerculesBeetle(): InsectModel {
  const g = new THREE.Group()

  // 头胸漆黑，鞘翅橄榄黄绿——强对比是本种最直观的配色特征
  const bodyMat = chitin({ color: '#111010', gloss: 0.62, clearcoat: 0.42 })
  const shellMat = elytra('#93a247', 0.15)
  const spotMat = chitin({ color: '#171512', gloss: 0.42, clearcoat: 0.3 })
  const hornMat = chitin({ color: '#0c0b0a', gloss: 0.72, clearcoat: 0.5 })
  const legMat = chitin({ color: '#121110', gloss: 0.56, clearcoat: 0.36 })

  // ---- 腹面体躯：躯干（不含角）主轴，从尾端一路延伸到头前缘附近
  const belly = new THREE.Mesh(
    spindle([-4.4, 0.04, 0], [0.2, 0.14, 0], 1.05, { bulge: 0.4, flat: 1.14, taperStart: 0.12, taperEnd: 0.5 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：两片高度隆起的硬壳，覆盖躯干后段，缀散乱黑斑
  const eSteps = 24
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.62) * Math.PI * 0.92) * 0.92
    const c = new THREE.Vector3(0.5 - 4.55 * t, 0.62 - 0.3 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.64, 0.02), rz: Math.max(w * 0.44, 0.02) })
  }
  const eZ = 0.4
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), shellMat)
    shell.position.z = side * eZ
    shell.scale.set(1, 1.05, 1.05)
    shell.name = 'elytra'
    g.add(shell)

    // 零散黑斑：位置、大小刻意不规则，避免读成瓢虫式的规整点阵。
    // 半径相对鞘翅（长 4.55）明显放大过——按 tiger-beetle 那种小鞘翅
    // 的斑点比例直接套用会小到几乎看不见，这里按本种更大的鞘翅尺度
    // 重新标定，保证黑斑在橄榄黄绿底色上读得出来。
    const spots: [number, number, number][] = [
      [0.14, 0.55, 0.1],
      [0.3, 0.15, 0.082],
      [0.42, 0.85, 0.088],
      [0.58, 0.35, 0.105],
      [0.7, 0.9, 0.075],
      [0.86, 0.5, 0.085],
    ]
    for (const [t, theta, r] of spots) {
      const idx = Math.round(t * eSteps)
      g.add(surfaceSpot(elytronSections[idx], elytronCenters[idx], side * eZ, theta, r, spotMat))
    }
  }

  // ---- 小盾片
  const scutellum = new THREE.Mesh(
    spindle([0.52, 0.72, 0], [0.16, 0.72, 0], 0.26, { bulge: 0.15, flat: 1.35, taperStart: 0.9, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：厚实梯形盾，承托胸角，是全身最壮的部位
  const pronotum = new THREE.Mesh(
    spindle([0.42, 0.2, 0], [2.15, 0.42, 0], 0.86, { bulge: 0.52, flat: 1.06, taperStart: 0.68, taperEnd: 0.42 }),
    bodyMat,
  )
  pronotum.scale.set(1, 0.94, 1)
  pronotum.name = 'trunk'
  g.add(pronotum)

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([2.08, 0.32, 0], [3.05, 0.4, 0], 0.46, { bulge: 0.5, flat: 1.0, taperStart: 0.8, taperEnd: 0.5 }),
    bodyMat,
  )
  head.name = 'trunk'
  g.add(head)

  // ---- 胸角：全物种的核心。近水平前伸，沿长度持续下弯，末端垂向头角。
  // 长度取躯干（trunk，belly∪pronotum∪head 的并集 X 跨度，约 7.45）的
  // 1.28 倍——真实大个体的胸角本就能与身体等长甚至更长，这不是随手
  // 夸张出的数字。
  const thoracicRaw = beetleHorn(new THREE.Vector3(2.2, 1.18, 0), 9.55, hornMat, {
    pitch: 7,
    curve: -0.185,
    thickness: 0.34,
    tipThickness: 0.2,
    flatten: 0.82,
    steps: 24,
  })
  thoracicRaw.mesh.name = 'thoracicHorn'
  g.add(thoracicRaw.mesh)
  g.add(thoracicHornBristles(thoracicRaw.path, thoracicRaw.radii, 22, hornMat))

  // ---- 头角：短得多，前伸后明显上翘，与胸角上下相对合成钳子
  const headRaw = beetleHorn(new THREE.Vector3(3.0, 0.74, 0), 4.3, hornMat, {
    pitch: 14,
    curve: 0.16,
    thickness: 0.25,
    tipThickness: 0.16,
    flatten: 0.85,
    steps: 18,
  })
  headRaw.mesh.name = 'headHorn'
  g.add(headRaw.mesh)

  // ---- 复眼：被头角基部与头侧缘分割，偏小
  g.add(
    compoundEyePair({
      at: [2.62, 0.36, 0.36],
      radius: 0.15,
      color: '#141010',
      flatten: 0.86,
      facets: true,
    }),
  )

  // ---- 鳃叶状触角（金龟总科通用特征），未设专属 anchor
  g.add(
    antennaPair(
      { base: [2.85, 0.2, 0.22], length: 0.6, kind: 'lamellate', pitch: -6, yaw: 34, thickness: 0.04 },
      hornMat,
    ),
  )

  // ---- 三对粗壮足，胫节带刺，末端加钩爪
  const legSpecs: LegSpec[] = [
    { base: [2.0, -0.2, 0.78], femur: 1.3, tibia: 1.35, thickness: 0.14, splay: 34, sweep: -38, knee: 74, spines: true },
    { base: [0.65, -0.3, 0.9], femur: 1.45, tibia: 1.55, thickness: 0.145, splay: 30, sweep: 4, knee: 78, spines: true },
    { base: [-0.75, -0.3, 0.85], femur: 1.6, tibia: 1.8, thickness: 0.15, splay: 26, sweep: 40, knee: 82, spines: true },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) {
    const [right, left] = rig.children as THREE.Group[]
    const tip = right.userData.tip as THREE.Vector3
    const knee = right.userData.knee as THREE.Vector3
    const forward = new THREE.Vector3().subVectors(tip, knee).normalize()
    right.add(legClaws(tip, forward, 0.055, legMat))
    left.add(legClaws(tip, forward, 0.055, legMat))
    g.add(rig)
  }
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    thoracicHorn: thoracicRaw.path[thoracicRaw.path.length - 1].clone(),
    headHorn: headRaw.path[headRaw.path.length - 1].clone(),
    elytra: new THREE.Vector3(-1.6, 1.3, 0.5),
    eye: new THREE.Vector3(2.62, 0.42, 0.46),
    leg: midLegTip.clone(),
    pronotum: new THREE.Vector3(1.3, 1.15, 0),
  }

  return finalize(g, anchors)
}
