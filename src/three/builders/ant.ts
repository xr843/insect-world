/**
 * 日本弓背蚁 Camponotus japonicus
 *
 * 造型要点：
 * - 蚂蚁最关键的鉴定特征是胸腹之间那截"腰"：并胸腹节之后突然收成一根
 *   极细的柄（腹柄节 petiole），柄上还竖着一枚鳞片状结节。这截"腰"
 *   必须比头、胸、腹的最细处还要细得多，否则蚂蚁就会看起来像一只
 *   没有腰的甲虫——因此单独建模，半径远小于相邻两段。
 * - "弓背"（本种中文名由来）：中胸背板到并胸腹节这段背线不是直的，
 *   而是先扬后抑的一道拱——kit.spindle()/segmentedAbdomen() 的路径
 *   只能是直线（from→to 两点连线），做不出这个拱形，所以胸部（并胸腹节
 *   + 中后胸，统称"alitrunk"）自建了一条弯曲路径（archPath）。
 * - 腹部（gaster）：卵圆、光亮，前端紧接细腰后必须迅速鼓起——
 *   kit.segmentedAbdomen() 的鼓包幅度是"取两端半径中较大者再放大 6%"，
 *   两端都细的话鼓不起来，不适合"细腰突然接大卵圆"这种形状，因此腹部
 *   也自建了独立的半径包络（gasterProfile），并叠加一圈极浅的正弦纹路
 *   暗示环节。
 * - 大颚：用 kit.mandibles() 建主体（粗壮有力），再在其内缘用与
 *   mandibles() 完全相同的路径公式采样两个点，各加一枚小尖齿——
 *   kit 没有暴露大颚路径，这里照抄公式采样，不改 kit.ts。
 * - 膝状触角（kind: 'geniculate'）：柄节长、折角明显，是蚁科的招牌特征。
 * - 六足细长，跗节触地站稳；躯干整体黑色带红棕色调，头部与足更亮，
 *   腹部走"丝绒感"（clearcoat 低一些）以区别于全身统一的高光泽。
 *
 * 体长约 1.2cm（头后缘到腹末，不计大颚，符合常见的量法）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  mandibles,
  mirrorZ,
  spindle,
  type InsectModel,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/** 两点间直筒/圆锥放样 */
function tube(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, material: THREE.Material, radial = 16): THREE.Mesh {
  return new THREE.Mesh(loft([{ at: a, ry: r0, rz: r0 }, { at: b, ry: r1, rz: r1 }], radial), material)
}

/** 沿一串点放样、半径按点逐一指定 */
function tubeShape(points: THREE.Vector3[], radii: number[], material: THREE.Material, radial = 12): THREE.Mesh {
  const sections: Section[] = points.map((p, i) => ({ at: p, ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 半径包络：从 startR 经 sin 缓动升到 maxR（bulge 处），再经 cos 缓动降到 endR */
function humpProfile(bulge: number, startR: number, maxR: number, endR: number): (t: number) => number {
  return (t: number) => {
    if (t <= bulge) {
      const k = bulge <= 1e-6 ? 1 : Math.min(1, t / bulge)
      return THREE.MathUtils.lerp(startR, maxR, Math.sin(k * Math.PI * 0.5))
    }
    const k = Math.min(1, (t - bulge) / (1 - bulge))
    return THREE.MathUtils.lerp(maxR, endR, 1 - Math.cos(k * Math.PI * 0.5))
  }
}

/** "先扬后抑"的拱形路径：弓背胸部背线专用 */
function archPath(xFrom: number, xTo: number, yFrom: number, yPeak: number, yTo: number, peakT: number, steps: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const y = t <= peakT ? THREE.MathUtils.lerp(yFrom, yPeak, smoothstep(t / peakT)) : THREE.MathUtils.lerp(yPeak, yTo, smoothstep((t - peakT) / (1 - peakT)))
    pts.push(new THREE.Vector3(THREE.MathUtils.lerp(xFrom, xTo, t), y, 0))
  }
  return pts
}

/** 给一串已知点配上按 profile(t) 算出的半径，生成 loft 截面 */
function profiledSections(points: THREE.Vector3[], profile: (t: number) => number, aspect: number): Section[] {
  const n = points.length
  return points.map((p, i) => {
    const r = Math.max(profile(i / (n - 1)), 1e-4)
    return { at: p, ry: r, rz: r * aspect }
  })
}

/** 复刻 kit.mandibles() 内部的路径公式，用于在大颚内缘精确采样加齿的位置 */
function mandiblePoint(at: [number, number, number], length: number, spread: number, curve: number, side: 1 | -1, t: number): THREE.Vector3 {
  const base = new THREE.Vector3(at[0], at[1], at[2] * side)
  return base.add(
    new THREE.Vector3(length * t, -length * 0.12 * t, side * length * spread * (1 - t) * (1 - t) - side * length * curve * t * t * 0.5),
  )
}

// ---------------------------------------------------------------- 主体

export function buildAnt(): InsectModel {
  const g = new THREE.Group()

  const darkMat = chitin({ color: '#241a16', gloss: 0.8, clearcoat: 0.6 }) // 头、大颚：黑中透红棕，高光泽
  const trunkMat = chitin({ color: '#3a241c', gloss: 0.72, clearcoat: 0.45 }) // 胸部与腰节：红棕过渡
  const gasterMat = chitin({ color: '#15100d', gloss: 0.58, clearcoat: 0.3 }) // 腹部：黑色丝绒感，光泽克制
  const legMat = chitin({ color: '#4a2b1e', gloss: 0.66, clearcoat: 0.36 }) // 足：红棕色调，仍保持光泽
  const antennaMat = chitin({ color: '#3a241c', gloss: 0.6, clearcoat: 0.3 })

  // ---- 胸部（alitrunk：并胸腹节+中后胸）：拱起的背线是"弓背"之名的由来。
  // 前端（近头）略高，中段（中胸背板）拱到最高，后端（近腰节）压低——
  // 这道"先扬后抑"的曲线只能靠自建路径实现，spindle() 的路径是直线
  const alitrunkPts = archPath(0.02, 0.46, 0.12, 0.34, 0.16, 0.42, 22)
  const alitrunkProfile = humpProfile(0.4, 0.075, 0.135, 0.095)
  g.add(new THREE.Mesh(loft(profiledSections(alitrunkPts, alitrunkProfile, 1.0), 22), trunkMat))

  // ---- 腰节（petiole）：蚂蚁的核心鉴定特征。半径远小于胸部与腹部，
  // 中段再竖起一枚扁鳞状结节——三段式身体因这截"细腰"才成立
  const petioleFrom = new THREE.Vector3(0.02, 0.12, 0)
  const petioleTo = new THREE.Vector3(-0.1, 0.135, 0)
  g.add(tube(petioleFrom, petioleTo, 0.05, 0.055, trunkMat, 14))
  const nodeCenter = petioleFrom.clone().lerp(petioleTo, 0.5).add(new THREE.Vector3(0, 0.095, 0))
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), trunkMat)
  node.scale.set(0.4, 1.05, 0.62) // 压扁成竖立的鳞片，而非圆球
  node.position.copy(nodeCenter)
  g.add(node)

  // ---- 腹部（gaster）：卵圆、光亮，紧接细腰后迅速鼓起，
  // 再收成圆钝的尾端；叠加一圈极浅的正弦纹路暗示环节
  const gasterFrom = new THREE.Vector3(-0.1, 0.135, 0)
  const gasterTo = new THREE.Vector3(-0.64, 0.08, 0)
  const gasterSteps = 24
  const gasterPts: THREE.Vector3[] = []
  for (let i = 0; i <= gasterSteps; i++) gasterPts.push(new THREE.Vector3().lerpVectors(gasterFrom, gasterTo, i / gasterSteps))
  const gasterBase = humpProfile(0.22, 0.058, 0.235, 0.075)
  const gasterProfile = (t: number) => gasterBase(t) * (1 - 0.035 * Math.abs(Math.sin(t * Math.PI * 5)))
  g.add(new THREE.Mesh(loft(profiledSections(gasterPts, gasterProfile, 0.95), 26), gasterMat))

  // ---- 头部：略扁的卵形，前端承接大颚
  const headFrom: [number, number, number] = [0.4, 0.15, 0]
  const headTo: [number, number, number] = [0.64, 0.14, 0]
  g.add(new THREE.Mesh(spindle(headFrom, headTo, 0.15, { bulge: 0.42, flat: 0.92, taperStart: 0.55, taperEnd: 0.3 }), darkMat))

  // ---- 大颚：粗壮有力，内缘各加两枚小尖齿咬合用
  const mandibleAt: [number, number, number] = [0.6, 0.1, 0.06]
  const mandibleLen = 0.24
  const mandibleSpread = 0.38
  const mandibleCurve = 0.58
  g.add(mandibles({ at: mandibleAt, length: mandibleLen, spread: mandibleSpread, curve: mandibleCurve }, darkMat))
  for (const side of [1, -1] as const) {
    for (const t of [0.42, 0.68]) {
      const p = mandiblePoint(mandibleAt, mandibleLen, mandibleSpread, mandibleCurve, side, t)
      const tip = p.clone().add(new THREE.Vector3(0, -0.02, -side * 0.045))
      g.add(tubeShape([p, tip], [0.013, 0.002], darkMat, 6))
    }
  }

  // ---- 复眼：中等大小，位于头侧
  const eyeAt: [number, number, number] = [0.53, 0.16, 0.1]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.045, color: '#100c0a', flatten: 0.85, stretch: 1.05, facets: true }))

  // ---- 膝状触角：柄节长、折角明显，是蚁科最直观的特征之一
  const antennaBase: [number, number, number] = [0.58, 0.17, 0.07]
  g.add(antennaPair({ base: antennaBase, length: 0.56, kind: 'geniculate', pitch: 14, yaw: 34, thickness: 0.012 }, antennaMat))

  // ---- 六足：细长，跗节触地，站姿自然。用 leg()+mirrorZ() 而非
  // legPair() 配对——legPair() 的 base 取反与 scale.z 取反会叠加成
  // "左右腿根挤在同一侧、腿尖各自甩开"的错误镜像（已用小脚本实测验证），
  // leg()+mirrorZ() 才是严格轴对称的左右腿，站姿才可信
  const foreLeg = { base: [0.36, 0.06, 0.1] as [number, number, number], femur: 0.3, tibia: 0.36, tarsus: 0.15, thickness: 0.015, splay: 32, sweep: -30, knee: 62, ankle: 58 }
  const midLeg = { base: [0.2, 0.03, 0.115] as [number, number, number], femur: 0.32, tibia: 0.37, tarsus: 0.16, thickness: 0.015, splay: 35, sweep: 4, knee: 64, ankle: 56 }
  const hindLeg = { base: [0.06, 0.02, 0.11] as [number, number, number], femur: 0.34, tibia: 0.4, tarsus: 0.17, thickness: 0.015, splay: 30, sweep: 38, knee: 66, ankle: 54 }
  g.add(mirrorZ(leg(foreLeg, legMat)))
  g.add(mirrorZ(leg(midLeg, legMat)))
  g.add(mirrorZ(leg(hindLeg, legMat)))

  const mandibleTip = mandiblePoint(mandibleAt, mandibleLen, mandibleSpread, mandibleCurve, 1, 1)
  const gasterMid = new THREE.Vector3().lerpVectors(gasterFrom, gasterTo, 0.4).add(new THREE.Vector3(0, gasterProfile(0.4), 0))

  const anchors: Record<string, THREE.Vector3> = {
    mandible: mandibleTip,
    petiole: nodeCenter,
    gaster: gasterMid,
    antenna: new THREE.Vector3(...antennaBase),
    eye: new THREE.Vector3(...eyeAt),
    leg: new THREE.Vector3(midLeg.base[0], midLeg.base[1] - 0.2, midLeg.base[2] + 0.15),
  }

  return finalize(g, anchors)
}
