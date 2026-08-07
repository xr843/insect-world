/**
 * 中华金星步甲 Carabus sp.（鞘翅目·步甲科，地表疾走捕食者）
 *
 * 造型要点：
 * - 步甲科最招牌的表面特征是鞘翅的"雕刻感"：每片鞘翅有若干条纵向
 *   隆脊（本文件取 3 条主脊），脊间是成列的凹点/瘤突。kit 里没有现成
 *   的表面雕刻工具，本文件因此自写两个局部函数：elytraRidge() 沿放样
 *   截面反推曲面坐标扫出一条真正凸起的脊（半径远大于 jewel-beetle
 *   surfaceStripe() 那种贴皮色带的 0.01，且两端用 edgeTaper() 平滑收尖，
 *   不是硬切的圆柱体），elytraTubercle() 用同一套曲面坐标公式在脊间的
 *   "谷"里贴一列压扁小凸起。三脊的 theta 角特意分散在背侧到外侧之间
 *   （22°/55°/88°），谷地 theta 取脊角的中点（含最靠背中线与最靠外侧
 *   各一条），保证脊、谷在视觉上交替排列，读成真正的雕刻纹理而不是
 *   随手撒的几颗痘。
 * - 金属光泽用 iridescence 做"黑底泛铜绿/紫铜"：base color 压暗接近
 *   黑，iridescenceThicknessRange 取偏厚的区间让干涉色落在绿→铜→紫红
 *   一段（同 jewel-beetle.ts 的技法，区间收窄且 iridescence 强度降低，
 *   步甲的虹彩要比吉丁含蓄得多，只在特定角度才"泛"出来）；脊单独用
 *   一份 gloss/metal 更高的材质，让"脊上尤其亮"这句形态描述有真实的
 *   材质依据，不只是几何更凸。
 * - 长而有力的足：地表疾走的捕食者站姿是"高步态"——kneel/ankle 角度
 *   压低（更直立）同 tiger-beetle.ts 的处理，但没有虎甲那么极端的
 *   针状纤细，粗细(thickness)明显更粗，读成"有力"而非"轻捷"。中足
 *   挂 userData.hip 供测试量取 hip→tip 真实 3D 距离（同 tiger-beetle.ts
 *   'stilt-leg-rig' 的做法，beetles2.test.ts 已验证过这个量取方式）。
 * - 镰刀状大颚：改写自"主干先外凸、后段加速内弯"的通用镰刀颚思路
 *   （tiger-beetle.sickleJaws 的构造逻辑），但弯曲与外张幅度都收窄、
 *   只挂 1 枚内缘齿——步甲的颚是捕食利器但不像虎甲那样夸张到静止时
 *   交叉，本文件的两侧颚尖终点仍分处两侧、不重叠。
 * - 鞘翅在中缝处愈合、无可见接缝：两片鞘翅的 halfWidth 压得很小
 *   （两壳在背中线附近的间隙远小于其余物种），并在 z=0 正中线补一条
 *   连续的暗色窄脊（同 ladybird.ts"中缝"手法：沿两侧鞘翅共用的同一组
 *   放样截面反推背中线最高点，串成一条线），把"两片壳其实是一整块"
 *   的视觉暗示做实，而不是留一条可见的黑缝。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
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

/** 两端平滑收尖的包络：inFrac/outFrac 是首尾渐变段各占的比例，中段恒为 1。 */
function edgeTaper(t: number, inFrac: number, outFrac: number): number {
  if (t < inFrac) return smooth(t / inFrac)
  if (t > 1 - outFrac) return smooth((1 - t) / outFrac)
  return 1
}

/**
 * 鞘翅纵脊：沿放样截面反推曲面坐标扫出一条真正凸起的脊（半径远超
 * 贴皮色带），两端用 edgeTaper() 收尖成自然的纺锤状凸起而非硬切
 * 圆柱。zOffset 是该侧鞘翅壳体装配时的 position.z（两片壳的截面本身
 * 存在 z=0 的共享坐标系里，见主体部分注释）。
 */
function elytraRidge(
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
      ridgeR * 0.8 + 0.007,
    )
    const localT = (i - iFrom) / Math.max(1, iTo - iFrom)
    const r = Math.max(ridgeR * edgeTaper(localT, 0.14, 0.16), 0.0015)
    pts.push({ at: pos, ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(pts, 8), material)
  mesh.name = 'ridge'
  return mesh
}

/** 脊间凹点/瘤突：与 elytraRidge 共用同一套曲面坐标公式，取的是"谷"里的 theta。 */
function elytraTubercle(
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
    r * 0.55 + 0.004,
  )
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), material)
  m.scale.set(1, 1, 0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
  m.position.copy(pos)
  return m
}

/** 镰刀状大颚：主干先外凸后段加速内弯，弧度比虎甲收敛，静止时两尖不交叉，只挂 1 枚内缘齿。 */
function sickleMandibles(at: [number, number, number], length: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const z0 = at[2]
  const bow = length * 0.1
  const inward = length * 0.42 // 内弯幅度：明显小于 z0，两尖终点仍分处两侧、不交叉
  for (const side of [1, -1] as const) {
    const base = new THREE.Vector3(at[0], at[1], z0 * side)
    const steps = 14
    const path: THREE.Vector3[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const outBulge = Math.sin(t * Math.PI) * bow
      const curl = Math.pow(t, 1.6) * inward
      path.push(new THREE.Vector3(base.x + length * t, base.y - length * 0.05 * t, side * (z0 + outBulge - curl)))
    }
    const sections: Section[] = path.map((p, i) => {
      const t = i / steps
      const r = thickness * (1 - t * 0.8)
      return { at: p, ry: r * 0.8, rz: r }
    })
    const shaft = new THREE.Mesh(loft(sections, 10), material)
    shaft.name = 'mandible'
    g.add(shaft)

    // 一枚内缘齿，位于弯曲加剧的中段
    const idx = Math.round(0.4 * steps)
    const p = path[idx]
    const toothLen = thickness * 1.2
    const tip = p.clone().add(new THREE.Vector3(-toothLen * 0.2, -toothLen * 0.22, -side * toothLen * 0.9))
    g.add(
      new THREE.Mesh(
        loft([{ at: p, ry: thickness * 0.32, rz: thickness * 0.32 }, { at: tip, ry: 0.003, rz: 0.003 }], 7),
        material,
      ),
    )
  }
  return g
}

// ---------------------------------------------------------------- 主体

export function buildGroundBeetle(): InsectModel {
  const g = new THREE.Group()

  // 黑底泛铜绿/紫铜：base color 压暗，iridescence 强度克制（0.4，远低于
  // jewel-beetle 的 0.75），厚度区间取偏厚的一段让干涉色落在绿→铜→
  // 紫红，只在特定角度才"泛"出来，不是吉丁那种全角度虹彩。
  const shellMat = chitin({ color: '#12160f', gloss: 0.72, metal: 0.58, clearcoat: 0.52 })
  shellMat.iridescence = 0.4
  shellMat.iridescenceIOR = 1.9
  shellMat.iridescenceThicknessRange = [260, 460]

  // 脊专用材质：gloss/metal 都比壳体基色更高，"脊上尤其亮"要有真实的材质依据
  const ridgeMat = chitin({ color: '#2c2013', gloss: 0.92, metal: 0.8, clearcoat: 0.55 })
  ridgeMat.iridescence = 0.3
  ridgeMat.iridescenceIOR = 1.8
  ridgeMat.iridescenceThicknessRange = [300, 480]

  const tubercleMat = chitin({ color: '#181c12', gloss: 0.55, metal: 0.42, clearcoat: 0.4 })
  const sutureMat = chitin({ color: '#0a0c08', gloss: 0.5, metal: 0.35, clearcoat: 0.35 })
  const bodyMat = chitin({ color: '#10130d', gloss: 0.66, metal: 0.48, clearcoat: 0.4 })
  const mandibleMat = chitin({ color: '#14100a', gloss: 0.7, metal: 0.42, clearcoat: 0.44 })
  const legMat = chitin({ color: '#0e120c', gloss: 0.58, metal: 0.44, clearcoat: 0.36 })

  // ---- 腹面体躯：躯干主轴，尾端到头前缘约 3cm（真实尺度，1=1cm）
  const belly = new THREE.Mesh(
    spindle([-1.85, 0.02, 0], [0.22, 0.05, 0], 0.58, { bulge: 0.42, flat: 1.13, taperStart: 0.1, taperEnd: 0.5 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：两片紧贴中线的低隆壳，halfWidth 压得很小，暗示两片其实
  // 是愈合的一整块；截面数组本身存在共享的 z=0 坐标系里，装配时才用
  // shell.position.z 整体偏移——ridge/tubercle/suture 都复用同一组
  // sections/centers 反推曲面坐标，因此天然贴合、不会漂浮。
  const eFrom = 0.14
  const eTo = -1.8
  const eSteps = 28
  const halfWidth = 0.18
  const elytronCenters: THREE.Vector3[] = []
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.58) * Math.PI * 0.9)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.42 - 0.11 * t * t, 0)
    elytronCenters.push(c)
    elytronSections.push({ at: c, ry: Math.max(w * 0.5, 0.012), rz: Math.max(w * 0.44, 0.012) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 30), shellMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)

    // 三条纵向主脊：theta 分散在背侧到外侧（22°/55°/88°），长度、起止 t
    // 略有差异，避免三条脊读成机械复制的等距阵列
    g.add(elytraRidge(elytronSections, elytronCenters, side, side * halfWidth, 22, 0.08, 0.92, 0.032, ridgeMat))
    g.add(elytraRidge(elytronSections, elytronCenters, side, side * halfWidth, 55, 0.06, 0.9, 0.03, ridgeMat))
    g.add(elytraRidge(elytronSections, elytronCenters, side, side * halfWidth, 88, 0.1, 0.86, 0.026, ridgeMat))

    // 脊间成列凹点/瘤突：4 条"谷"（含最靠背中线与最靠外侧各一条），
    // 每条谷 9 颗，theta 取相邻脊角的中点
    const valleyThetas = [4, 38, 71, 104]
    for (const theta of valleyThetas) {
      for (let k = 0; k < 9; k++) {
        const t = 0.1 + (k / 8) * 0.78
        const idx = Math.round(t * eSteps)
        g.add(elytraTubercle(elytronSections[idx], elytronCenters[idx], side * halfWidth, theta, 0.016, tubercleMat))
      }
    }
  }

  // 中缝：沿共享截面的背中线最高点串成一条连续窄脊，暗示两壳在此闭合
  {
    const seamPts: Section[] = elytronSections.map((sec, i) => ({
      at: new THREE.Vector3(elytronCenters[i].x, elytronCenters[i].y + sec.ry * 1.03, 0),
      ry: 0.013,
      rz: 0.013,
    }))
    const seam = new THREE.Mesh(loft(seamPts, 8), sutureMat)
    g.add(seam)
  }

  // ---- 小盾片
  const scutellum = new THREE.Mesh(
    spindle([0.16, 0.36, 0], [0.02, 0.37, 0], 0.09, { bulge: 0.2, flat: 1.3, taperStart: 0.85, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：心形/梯形过渡段，比头部略宽、比鞘翅明显窄
  const pronotum = new THREE.Mesh(
    spindle([0.16, 0.14, 0], [0.6, 0.2, 0], 0.44, { bulge: 0.48, flat: 1.05, taperStart: 0.6, taperEnd: 0.55 }),
    bodyMat,
  )
  pronotum.scale.set(1, 0.94, 1)
  pronotum.name = 'trunk'
  g.add(pronotum)

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([0.55, 0.18, 0], [1.12, 0.2, 0], 0.38, { bulge: 0.42, flat: 0.98, taperStart: 0.65, taperEnd: 0.32 }),
    bodyMat,
  )
  head.name = 'trunk'
  g.add(head)

  // ---- 复眼：中等大小、略鼓出（视觉捕食者，但不像虎甲那样极端硕大）
  g.add(
    compoundEyePair({
      at: [0.87, 0.28, 0.3],
      radius: 0.11,
      color: '#0c0c0b',
      flatten: 0.85,
      facets: true,
    }),
  )

  // ---- 镰刀状大颚，向前伸
  g.add(sickleMandibles([1.12, 0.2, 0.12], 0.42, 0.055, mandibleMat))

  // ---- 丝状触角
  g.add(antennaPair({ base: [1.0, 0.24, 0.18], length: 1.0, kind: 'filiform', pitch: 16, yaw: 34, thickness: 0.028 }, bodyMat))

  // ---- 三对长而有力的足：高步态（knee/ankle 角度压低），粗细明显
  // 大于虎甲的针状细腿。中足挂 userData.hip，供测试量取 hip→tip 真实
  // 3D 距离（同 tiger-beetle.ts 'stilt-leg-rig' 的做法）。
  const legSpecs: LegSpec[] = [
    { base: [0.78, -0.18, 0.32], femur: 0.78, tibia: 0.72, tarsus: 0.22, thickness: 0.075, splay: 48, sweep: -42, knee: 34, ankle: 30 },
    { base: [0.22, -0.21, 0.36], femur: 0.95, tibia: 0.88, tarsus: 0.26, thickness: 0.08, splay: 46, sweep: 6, knee: 32, ankle: 28 },
    { base: [-0.5, -0.21, 0.34], femur: 0.88, tibia: 0.82, tarsus: 0.24, thickness: 0.078, splay: 50, sweep: 44, knee: 36, ankle: 32 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  legRigs[1].name = 'stilt-leg-rig'
  ;(legRigs[1].children[0] as THREE.Group).userData.hip = new THREE.Vector3(...legSpecs[1].base)
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    elytra: new THREE.Vector3(-0.85, 0.68, halfWidth * 0.75),
    mandible: new THREE.Vector3(1.5, 0.14, 0.1),
    leg: midLegTip.clone(),
    eye: new THREE.Vector3(0.87, 0.34, 0.36),
    antenna: new THREE.Vector3(1.9, 0.4, 0.5),
    pronotum: new THREE.Vector3(0.38, 0.56, 0),
  }

  return finalize(g, anchors)
}
