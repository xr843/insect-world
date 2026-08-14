/**
 * 德国小蠊 Blattella germanica（蜚蠊目 姬蠊科 —— 第 7 轮「日常昆虫」补编之一）
 *
 * 造型要点：
 * - 认种第一特征是**前胸背板上的两条深色纵条纹**：浅琥珀底 + 近黑双纹，
 *   明度差真的拉开（第 5 轮教训）。背板是一块前后皆圆的扁盾（自建
 *   flat-dome 放样，参考 ladybird 的 domeSections 思路但压得很扁），
 *   双纹沿背板曲面放样贴上，name='pronotum-stripe'，测试按名量
 *   「恰好 2 条、沿 X 长条、与底色的明度差」。
 * - 体扁平：躯干（背板 + 前翅 + 腹）总高约 0.30，不到体长 1.4 的 22%——
 *   「能钻进缝里」的体型是蜚蠊的本体，宽高比全程 > 2（禁圆管感）。
 * - 头大部分被前胸背板盖住：头下口式（hypognathous）斜垂在背板前缘
 *   之下，背视只露头顶一线。头网格的 X 范围绝大部分在背板投影之内。
 * - 丝状长触角**超过体长**：自建后掠弧线（先前伸再外扩、末端微垂），
 *   曲线全长 ≈ 1.7 > 体长 1.4；含微动钩子。
 * - 前翅（覆翅）革质、覆盖整个腹部：扁壳一体放样 + 背中线细缝暗示
 *   左右两片相叠，尾端伸过腹端。name='tegmen'。
 * - 一对分节尾须从翅端下方斜伸而出，name='cercus'。
 * - 足具刺（LegSpec.spines）、长而多刺，疾走者的低伏站姿。
 *
 * 坐标：+X 前，+Y 上，+Z 右；1 单位 = 1cm，体长约 1.4（12–15mm，不含触角）。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  mirrorZ,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/** 扁盾包络：sin 缓动进出的「宽度 / 高度」轮廓，前后皆圆 */
function shieldProfile(t: number, peakAt: number, r0: number, rMax: number, r1: number): number {
  if (t <= peakAt) {
    const k = peakAt <= 1e-6 ? 1 : t / peakAt
    return THREE.MathUtils.lerp(r0, rMax, Math.sin(Math.min(1, k) * Math.PI * 0.5))
  }
  const k = (t - peakAt) / (1 - peakAt)
  return THREE.MathUtils.lerp(rMax, r1, 1 - Math.cos(Math.min(1, k) * Math.PI * 0.5))
}

interface ShieldSpec {
  xFrom: number
  xTo: number
  /** 底面基准线（扁盾的下缘贴着它） */
  baseY: number
  peakAt: number
  /** 高度包络（ry）三键 */
  h0: number
  hMax: number
  h1: number
  /** 宽度包络（rz）三键——与高度解耦，扁盾的关键 */
  w0: number
  wMax: number
  w1: number
}

/** 扁盾放样截面组：底边贴 baseY，只有背面随高度包络起伏（平底圆顶的扁版） */
function shieldSections(s: ShieldSpec, steps: number): Section[] {
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const h = Math.max(shieldProfile(t, s.peakAt, s.h0, s.hMax, s.h1), 1e-4)
    const w = Math.max(shieldProfile(t, s.peakAt, s.w0, s.wMax, s.w1), 1e-4)
    sections.push({ at: new THREE.Vector3(THREE.MathUtils.lerp(s.xFrom, s.xTo, t), s.baseY + h, 0), ry: h, rz: w })
  }
  return sections
}

/** 扁盾曲面一点与法线：theta=0 背中线最高点，向 +Z 增大 */
function shieldSurface(s: ShieldSpec, t: number, thetaDeg: number): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const h = shieldProfile(t, s.peakAt, s.h0, s.hMax, s.h1)
  const w = shieldProfile(t, s.peakAt, s.w0, s.wMax, s.w1)
  const th = THREE.MathUtils.degToRad(thetaDeg)
  const pos = new THREE.Vector3(THREE.MathUtils.lerp(s.xFrom, s.xTo, t), s.baseY + h + h * Math.cos(th), w * Math.sin(th))
  const normal = new THREE.Vector3(0, (Math.cos(th) / Math.max(h, 1e-6)) * w, (Math.sin(th) / Math.max(w, 1e-6)) * h).normalize()
  return { pos, normal }
}

/**
 * 丝状长触角：先前伸、随即向外后掠、末端微垂的一条长弧。
 * 曲线全长 ≈ 1.7（超过体长 1.4）。含微动钩子。
 */
function longAntenna(base: THREE.Vector3, side: 1 | -1, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z * side]
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const L = 1.7
  const path: THREE.Vector3[] = []
  const steps = 22
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(
      new THREE.Vector3(
        b.x + L * (0.72 * t - 0.18 * t * t), // 前伸后减速（末端折回一点）
        b.y + L * (0.16 * t - 0.28 * t * t), // 微扬即垂（贴近水平的探路姿态）
        b.z + side * L * (0.5 * t - 0.06 * t * t), // 持续外扩
      ),
    )
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = 0.013 * (1 - t * 0.82)
    return { at: p, ry: Math.max(r, 0.0022), rz: Math.max(r, 0.0022) }
  })
  g.add(new THREE.Mesh(loft(sections, 8), mat))
  return g
}

/** 分节尾须：短锥体 + 节间微缩，斜向后外下方 */
function cercus(base: THREE.Vector3, side: 1 | -1, mat: THREE.Material): THREE.Mesh {
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const dir = new THREE.Vector3(-0.7, -0.13, side * 0.8).normalize()
  const len = 0.3
  const sections: Section[] = []
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ripple = 1 - 0.16 * Math.pow(Math.sin(t * Math.PI * 5), 6)
    const r = 0.03 * (1 - t * 0.78) * ripple
    sections.push({ at: b.clone().addScaledVector(dir, len * t), ry: Math.max(r, 0.004), rz: Math.max(r, 0.004) })
  }
  const m = new THREE.Mesh(loft(sections, 8), mat)
  m.name = 'cercus'
  return m
}

// ---------------------------------------------------------------- 主体

export function buildCockroach(): InsectModel {
  const g = new THREE.Group()

  /*
   * 茶褐/琥珀色系。前胸双纹的对比是本种的命：底色取亮琥珀、纹取近黑，
   * 亮度基准对齐 ladybird #e2382a 档（第 5 轮「越深越保险」已被证伪）。
   */
  /*
   * 覆翅不走 elytra()：0.55 的清漆叠 ACES 把琥珀褐压成近黑檀（目视验收打回过
   * 一轮），德国小蠊要的是「茶褐半哑光的革质」，clearcoat 收到 0.35、基色提亮。
   */
  const tegmenMat = chitin({ color: '#a87334', gloss: 0.62, metal: 0.05, clearcoat: 0.35, surface: 'striate' })
  const pronotumMat = chitin({ color: '#bd9147', gloss: 0.55, clearcoat: 0.3 }) // 亮琥珀底
  const stripeMat = chitin({ color: '#26190f', gloss: 0.35 }) // 近黑双纹
  const bodyMat = chitin({ color: '#7c5122', gloss: 0.4 })
  const headMat = chitin({ color: '#57351a', gloss: 0.45 })
  const legMat = chitin({ color: '#9a6c33', gloss: 0.38 })
  const antennaMat = chitin({ color: '#4e3418', gloss: 0.3 })
  const sutureMat = chitin({ color: '#3d2812', gloss: 0.3 })

  const baseY = -0.1 // 腹面基准：贴地的扁平肚皮

  // ---- 腹部：扁平的宽腹，藏在前翅之下，侧缘微露
  const abdomenSpec: ShieldSpec = {
    xFrom: 0.42, xTo: -0.6, baseY, peakAt: 0.4,
    h0: 0.05, hMax: 0.085, h1: 0.02,
    w0: 0.2, wMax: 0.25, w1: 0.07,
  }
  const abdomen = new THREE.Mesh(loft(shieldSections(abdomenSpec, 20), 24), bodyMat)
  abdomen.name = 'abdomen'
  g.add(abdomen)

  // ---- 前翅（覆翅）：扁壳盖过整个腹部，尾端伸过腹端
  const tegmenSpec: ShieldSpec = {
    xFrom: 0.5, xTo: -0.7, baseY: baseY + 0.055, peakAt: 0.3,
    h0: 0.035, hMax: 0.075, h1: 0.018,
    w0: 0.18, wMax: 0.26, w1: 0.1,
  }
  const tegmen = new THREE.Mesh(loft(shieldSections(tegmenSpec, 22), 26), tegmenMat)
  tegmen.name = 'tegmen'
  g.add(tegmen)
  {
    // 背中线细缝：左右两片覆翅相叠的暗示
    const sections: Section[] = []
    const steps = 16
    for (let i = 0; i <= steps; i++) {
      const t = 0.04 + (i / steps) * 0.92
      const { pos } = shieldSurface(tegmenSpec, t, 1.5)
      sections.push({ at: pos, ry: 0.008, rz: 0.008 })
    }
    g.add(new THREE.Mesh(loft(sections, 8), sutureMat))
  }

  // ---- 前胸背板：前后皆圆的扁盾，微微罩过覆翅前缘
  const pronotumSpec: ShieldSpec = {
    xFrom: 0.82, xTo: 0.44, baseY: baseY + 0.05, peakAt: 0.55,
    h0: 0.02, hMax: 0.09, h1: 0.045,
    w0: 0.13, wMax: 0.23, w1: 0.2,
  }
  const pronotum = new THREE.Mesh(loft(shieldSections(pronotumSpec, 16), 24), pronotumMat)
  pronotum.name = 'pronotum'
  g.add(pronotum)

  // ---- 招牌：背板上的两条深色纵条纹
  for (const side of [1, -1] as const) {
    const sections: Section[] = []
    const steps = 12
    for (let i = 0; i <= steps; i++) {
      const t = 0.12 + (i / steps) * 0.76
      const { pos, normal } = shieldSurface(pronotumSpec, t, side * 16)
      pos.addScaledVector(normal, 0.004)
      const w = 0.028 * Math.sin(Math.min(1, (i / steps) * 4, (1 - i / steps) * 4) * Math.PI * 0.5)
      sections.push({ at: pos, ry: Math.max(w * 0.4, 1e-4), rz: Math.max(w, 1e-4) })
    }
    const stripe = new THREE.Mesh(loft(sections, 10), stripeMat)
    stripe.name = 'pronotum-stripe'
    g.add(stripe)
  }

  // ---- 头：下口式斜垂在背板前缘之下，背视只露头顶一线
  const headTopX = 0.86
  const head = new THREE.Mesh(
    spindle([headTopX, 0.0, 0], [0.76, -0.09, 0], 0.085, { bulge: 0.42, flat: 1.2, taperStart: 0.62, taperEnd: 0.5 }),
    headMat,
  )
  head.name = 'head'
  g.add(head)
  g.add(compoundEyePair({ at: [0.83, -0.02, 0.052], radius: 0.028, color: '#171008', flatten: 1.25, stretch: 0.85 }))

  // ---- 丝状长触角
  const antBase = new THREE.Vector3(0.875, -0.02, 0.028)
  g.add(longAntenna(antBase, 1, antennaMat), longAntenna(antBase, -1, antennaMat))

  // ---- 一对尾须：从覆翅尾端下方斜伸而出
  const cercusBase = new THREE.Vector3(-0.6, -0.04, 0.1)
  const cercusR = cercus(cercusBase, 1, bodyMat)
  g.add(cercusR, cercus(cercusBase, -1, bodyMat))

  // ---- 三对多刺长足：疾走者的低伏站姿（贴地矮蹲，别踩成高跷）
  const legSpecs: LegSpec[] = [
    { base: [0.52, -0.08, 0.15], femur: 0.26, tibia: 0.22, thickness: 0.034, splay: 34, sweep: -35, knee: 74, ankle: 52, spines: true },
    { base: [0.18, -0.08, 0.18], femur: 0.32, tibia: 0.28, thickness: 0.036, splay: 36, sweep: 8, knee: 74, ankle: 52, spines: true },
    { base: [-0.2, -0.08, 0.17], femur: 0.38, tibia: 0.34, thickness: 0.036, splay: 32, sweep: 38, knee: 76, ankle: 50, spines: true },
  ]
  const midLeg = leg(legSpecs[1], legMat)
  g.add(mirrorZ(leg(legSpecs[0], legMat)))
  g.add(mirrorZ(midLeg))
  g.add(mirrorZ(leg(legSpecs[2], legMat)))

  // ---- anchors
  g.updateMatrixWorld(true)
  const stripeTop = shieldSurface(pronotumSpec, 0.5, 16)
  const tegmenTop = shieldSurface(tegmenSpec, 0.45, 0)
  const cercusTip = cercusBase.clone().addScaledVector(new THREE.Vector3(-0.7, -0.13, 0.8).normalize(), 0.26)
  const antennaMid = new THREE.Vector3(antBase.x + 1.7 * 0.28, antBase.y + 1.7 * 0.05, antBase.z + 1.7 * 0.23)

  const anchors: Record<string, THREE.Vector3> = {
    stripe: stripeTop.pos.clone().add(new THREE.Vector3(0, 0.02, 0)),
    head: new THREE.Vector3(headTopX, 0.03, 0),
    antenna: antennaMid,
    wing: tegmenTop.pos.clone().add(new THREE.Vector3(0, 0.02, 0)),
    cercus: cercusTip,
    leg: (midLeg.userData.knee as THREE.Vector3).clone(),
  }

  return finalize(g, anchors)
}
