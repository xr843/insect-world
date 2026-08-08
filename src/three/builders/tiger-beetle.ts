/**
 * 中华虎甲 Cicindela chinensis（鞘翅目·虎甲科，地表奔跑捕食者）
 *
 * 造型要点：
 * - 虎甲是公认跑得最快的昆虫之一（体长倍数速度冠军），足因此要
 *   长而纤细，站姿是"高高撑起身体"的高脚式——膝弯角度反而要比
 *   一般甲虫小（更直立），而不是蹲伏。
 * - 头比前胸宽、复眼向两侧鼓出：虎甲靠视觉锁定猎物，头部因此在
 *   全身比例里显得突出，前胸背板反而收窄成"细腰"过渡段。
 * - 上颚是本种最戏剧性的特征：细长弯刀状、内缘带齿、静止时左右
 *   在身体中线前方交叉。kit.mandibles() 给的是矮胖的通用咀嚼式
 *   口器比例，装不出这种"武器化"的镰刀颚，因此改用本文件自写的
 *   sickleJaws()：主干先外凸（刀背）、随后随 t 加速内弯（刀刃），
 *   尖端越过中线形成交叉，内缘再挂三枚递减小齿。
 * - 体色是本种得名"斑斓虎甲"的另一半：头胸翠绿带金属光泽，鞘翅
 *   深绿到紫铜色，缀白垩色斑纹（肩部一对、中部一条横带、端部一
 *   对）——这套固定斑纹位置直接复用放样鞘翅时的截面反推曲面坐标
 *   （借用星天牛白斑的取法），不是散乱的随机散点。
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
 * 镰刀状大颚：见文件头注释。`at` 给出一侧的着生点（z 为该侧的正偏移量，
 * 另一侧自动镜像生成，不复用 kit 的 legPair 镜像方案是因为大颚只有一
 * 个 loft 主干 + 几枚齿，直接左右各建一次比抽象一层镜像工具更省事）。
 */
function sickleJaws(at: [number, number, number], length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const z0 = at[2]
  const overshoot = length * 0.13 // 尖端越过中线的量，做出"交叉"
  const bow = length * 0.12 // 中段先外凸出的"刀背"弧度

  for (const side of [1, -1] as const) {
    const base = new THREE.Vector3(at[0], at[1], z0 * side)
    const steps = 16
    const path: THREE.Vector3[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const outBulge = Math.sin(t * Math.PI) * bow
      const inward = Math.pow(t, 1.7) * (z0 + overshoot)
      path.push(new THREE.Vector3(base.x + length * t, base.y - length * 0.05 * t, side * (z0 + outBulge - inward)))
    }
    const sections: Section[] = path.map((p, i) => {
      const t = i / steps
      const r = thickness * (1 - t * 0.82)
      return { at: p, ry: r * 0.82, rz: r }
    })
    g.add(new THREE.Mesh(loft(sections, 10), material))

    // 内缘齿突：3 枚，集中在弯曲加剧的中段，越靠基部越大——
    // 真实虎甲上颚内缘有若干不等大的齿，这里用递减尺寸近似
    for (const tt of [0.34, 0.5, 0.64]) {
      const idx = Math.round(tt * steps)
      const p = path[idx]
      const toothLen = thickness * 1.7 * (1 - tt * 0.5)
      const tip = p.clone().add(new THREE.Vector3(-toothLen * 0.2, -toothLen * 0.25, -side * toothLen * 0.85))
      g.add(
        new THREE.Mesh(
          loft([{ at: p, ry: thickness * 0.34, rz: thickness * 0.34 }, { at: tip, ry: 0.003, rz: 0.003 }], 7),
          material,
        ),
      )
    }
  }
  return g
}

/** 在鞘翅某一圈截面上沿 theta 扫出一段贴面窄带——用于中部横斑；
 * 复用与放样同一套"除半径倒数、乘另一半径"法线公式，保证贴住曲面不悬浮。 */
function surfaceBand(
  sec: Section,
  center: THREE.Vector3,
  zOffset: number,
  thetaFrom: number,
  thetaTo: number,
  tubeR: number,
  material: THREE.Material,
): THREE.Mesh {
  const steps = 10
  const pts: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const theta = THREE.MathUtils.lerp(thetaFrom, thetaTo, i / steps)
    const nx = (Math.cos(theta) / Math.max(sec.ry, 1e-6)) * sec.rz
    const nz = (Math.sin(theta) / Math.max(sec.rz, 1e-6)) * sec.ry
    const normal = new THREE.Vector3(0, nx, nz).normalize()
    const pos = new THREE.Vector3(center.x, center.y + Math.cos(theta) * sec.ry, zOffset + Math.sin(theta) * sec.rz).addScaledVector(
      normal,
      0.012,
    )
    pts.push({ at: pos, ry: tubeR, rz: tubeR })
  }
  return new THREE.Mesh(loft(pts, 8), material)
}

/** 单个贴面圆斑——与上面 surfaceBand 共用法线公式，只取一个 theta 点。 */
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
    0.012,
  )
  const spot = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 6), material)
  spot.scale.set(1, 1, 0.32)
  spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  spot.position.copy(pos)
  return spot
}

export function buildTigerBeetle(): InsectModel {
  const g = new THREE.Group()

  // 头胸翠绿带金属光泽；鞘翅深绿到紫铜色，clearcoat 不超过 elytra() 内定的
  // 0.55（见 kit 注释：更高会在正对光角度整片过曝成灰白，吃掉固有色）。
  const bodyMat = chitin({ color: '#0f8a4f', gloss: 0.82, metal: 0.6, clearcoat: 0.48 })
  // B 轮：强虹彩，红绿撞色的招牌基色不动。iridescent:true 让 elytra()
  // 把 clearcoat 自动压到 ≤0.35（虹彩本身已是强角度高光，叠清漆更容易
  // 过曝），iridescence/IOR/厚度域用 kit 内定的强虹彩默认值。
  const shellMat = elytra('#3c5a2a', 0.55, { iridescent: true })
  const markMat = chitin({ color: '#f2ecc9', gloss: 0.32, metal: 0.05 })
  const jawMat = chitin({ color: '#20140c', gloss: 0.68, metal: 0.28, clearcoat: 0.42 })
  const legMat = chitin({ color: '#123d2a', gloss: 0.56, metal: 0.32, clearcoat: 0.38 })

  // ---- 腹面体躯（被鞘翅覆盖的部分）
  const belly = new THREE.Mesh(
    spindle([-1.15, 0.0, 0], [0.15, 0.02, 0], 0.32, { bulge: 0.42, flat: 1.08, taperStart: 0.1, taperEnd: 0.55 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：狭长扁筒，不像金龟子那样高高隆起；缀固定位置的白垩斑纹
  const eSteps = 22
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.68) * Math.PI * 0.94) * 0.36
    const c = new THREE.Vector3(0.05 - 1.2 * t, 0.28 - 0.05 * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.66, 0.015), rz: Math.max(w * 0.58, 0.015) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 24), shellMat)
    shell.position.z = side * 0.17
    g.add(shell)

    // 肩部一对白斑（近前缘）
    g.add(surfaceSpot(elytronSections[2], elytronCenters[2], side * 0.17, 1.0, 0.055, markMat))
    // 端部一对白斑（近末端）
    g.add(surfaceSpot(elytronSections[20], elytronCenters[20], side * 0.17, 0.55, 0.05, markMat))
    // 中部一条横斑：沿截面弧线扫过背侧到外侧
    g.add(surfaceBand(elytronSections[11], elytronCenters[11], side * 0.17, -0.75, 1.15, 0.05, markMat))
  }

  // ---- 小盾片
  const scutellum = new THREE.Mesh(
    spindle([0.06, 0.28, 0], [-0.14, 0.3, 0], 0.09, { bulge: 0.2, flat: 1.3, taperStart: 0.85, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：收窄成"细腰"过渡段，比头和鞘翅基部都窄
  const pronotum = new THREE.Mesh(
    spindle([0.05, 0.02, 0], [0.34, 0.06, 0], 0.2, { bulge: 0.5, flat: 1.05, taperStart: 0.55, taperEnd: 0.6 }),
    bodyMat,
  )
  pronotum.name = 'trunk'
  g.add(pronotum)

  // ---- 头部：明显比前胸宽
  const head = new THREE.Mesh(
    spindle([0.34, 0.05, 0], [0.78, 0.08, 0], 0.3, { bulge: 0.42, flat: 0.98, taperStart: 0.62, taperEnd: 0.42 }),
    bodyMat,
  )
  head.name = 'trunk'
  g.add(head)

  // ---- 复眼：大而鼓出
  g.add(
    compoundEyePair({
      at: [0.58, 0.17, 0.27],
      radius: 0.135,
      color: '#0c0c0c',
      flatten: 0.86,
      stretch: 1.05,
      facets: true,
    }),
  )

  // ---- 镰刀状大颚：几乎和头一样长（头长 0.44），向前交叉
  g.add(sickleJaws([0.74, 0.06, 0.13], 0.4, 0.052, jawMat))

  // ---- 丝状触角
  g.add(antennaPair({ base: [0.66, 0.1, 0.2], length: 0.95, kind: 'filiform', pitch: 18, yaw: 38, thickness: 0.02 }, legMat))

  // ---- 三对细长足：高脚站姿，knee 角度刻意压低（更直立而非蹲伏）。
  // 腿节+胫节合计要接近体长（trunk≈1.94）的 0.7 倍——第一版
  // femur+tibia=1.18 实测 hip→tip 只到体长的 0.51 倍，仅堪堪压线，
  // 因此加长到接近体长 0.75 倍并进一步压直膝/踝角，留足安全边际。
  const legSpecs: LegSpec[] = [
    { base: [0.3, -0.14, 0.22], femur: 0.68, tibia: 0.62, tarsus: 0.22, thickness: 0.025, splay: 54, sweep: -40, knee: 34, ankle: 30 },
    { base: [-0.15, -0.15, 0.24], femur: 0.76, tibia: 0.7, tarsus: 0.24, thickness: 0.026, splay: 50, sweep: 6, knee: 32, ankle: 28 },
    { base: [-0.62, -0.15, 0.22], femur: 0.72, tibia: 0.66, tarsus: 0.22, thickness: 0.026, splay: 56, sweep: 46, knee: 36, ankle: 32 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  // 中间一对用于"腿是否够长"的自检：把 hip 一并记入 userData，
  // 测试据此量取 hip→tip 的真实 3D 直线距离（不是简单相加 femur+tibia，
  // 更诚实地反映渲染出来的腿到底伸多远）。
  legRigs[1].name = 'stilt-leg-rig'
  ;(legRigs[1].children[0] as THREE.Group).userData.hip = new THREE.Vector3(...legSpecs[1].base)
  for (const rig of legRigs) g.add(rig)

  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    mandible: new THREE.Vector3(1.08, 0.03, 0.1),
    elytra: new THREE.Vector3(-0.55, 0.34, 0.22),
    eye: new THREE.Vector3(0.58, 0.2, 0.32),
    leg: midLegTip.clone(),
    antenna: new THREE.Vector3(1.4, 0.35, 0.5),
    pronotum: new THREE.Vector3(0.2, 0.3, 0),
  }

  return finalize(g, anchors)
}
