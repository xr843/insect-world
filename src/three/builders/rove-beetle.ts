/**
 * 梭毒隐翅虫 Paederus fuscipes（隐翅虫科，鞘翅目）
 *
 * 造型要点：
 * - 极短的鞘翅是定义特征：鞘翅只盖住胸部之后很短一段（本文件把它钉在
 *   腹部总长的 12% 左右），其余腹节完全裸露——与「鞘翅盖满全身」的
 *   常规甲虫印象正相反，同 earwig.ts 处理覆翅的手法一致（短小的一对
 *   壳，位置紧贴胸腹交界处），只是隐翅虫的鞘翅比蠼螋的覆翅更短。
 * - 细长柔软、可上翘的分节腹部：kit.segmentedAbdomen() 只能沿直线
 *   路径放样、也只能整条腹部使用同一种材质，两者都不满足本种「腹末
 *   上翘」+「红黑相间要分段上色」的需求，因此自写 roveAbdomen()——
 *   逐节独立放样（做法参考 hornet.ts 的 bandedAbdomen()），但路径点
 *   改用 curlPoint()，让最后约 2/3 段的 Y 坐标按幂函数抬升，做出
 *   受惊时腹部上翘的姿态。
 * - 蚁形体态：头、胸、腹三段界限分明，头颈之间插入一段明显收细的
 *   短「脖子」（做法同 hornet.ts 的细腰 waist，但比蜂腰更短更粗，
 *   是隐翅虫可活动头颈的观感来源，不是针状蚁腰）。
 * - 红黑相间的警戒色：头黑、前胸橙红、鞘翅深蓝黑金属光泽、腹部橙红
 *   与黑相间、腹末黑——必须分段生成多个 mesh 才能贴上不同材质，
 *   因此头/前胸/鞘翅/每节腹节都是独立 mesh，各自的材质取值也刻意
 *   互不相同（即使色相相近的两处也各开一份 chitin()，不复用同一个
 *   材质对象），保证「体表材质里能数出 ≥4 种颜色」这个断言站得住。
 * - 种名 fuscipes 直译「暗足的」：六足与触角基部因此不取头部那种
 *   纯黑，而是明显的褐色，这是唯一的第四种色相来源，而不是硬凑。
 * - 触角是念珠状（moniliform）：kit.AntennaKind 里没有这个类型（最
 *   接近的 filiform 是渐细丝状，画不出「一串珠子」的鼓包感），因此
 *   自写 moniliformAntenna()——每一节都是一颗独立小球，球间以细杆
 *   相连，做法与 jewel-beetle.ts 因缺「锯齿触角」类型而自写
 *   serrateAntenna() 同理。
 * - 头部带小颚：捕食性隐翅虫有明显的大颚，直接用 kit.mandibles()，
 *   尖端锚点复刻 kit 内部路径公式取得（做法同 hornet.ts 的
 *   mandiblePoint()，不改 kit.ts）。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  legPair,
  loft,
  mandibles,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 腹部路径点：直线 lerp 之外，后段按幂函数抬升 Y，做出上翘的弧度。 */
function curlPoint(from: THREE.Vector3, to: THREE.Vector3, t: number, curl: number): THREE.Vector3 {
  const p = new THREE.Vector3().lerpVectors(from, to, t)
  const lift = curl * Math.pow(Math.max(0, (t - 0.3) / 0.7), 1.7)
  p.y += lift
  return p
}

/**
 * 分节上色、末段上翘的腹部：逐节独立放样交替（实际是按 opts.colors 数组
 * 逐一）填色，环沟做法同 hornet.ts 的 bandedAbdomen()，路径改用
 * curlPoint() 换出上翘弧度。每节命名 'abdomen'，供测试用并集包围盒
 * 量出整条腹部的真实跨度。
 */
function roveAbdomen(opts: {
  from: THREE.Vector3
  to: THREE.Vector3
  r0: number
  r1: number
  segments: number
  groove: number
  curl: number
  flat: number
  colors: THREE.Material[]
}): THREE.Group {
  const g = new THREE.Group()
  for (let s = 0; s < opts.segments; s++) {
    const t0 = s / opts.segments
    const t1 = (s + 1) / opts.segments
    const tm = (t0 + t1) / 2
    const p0 = curlPoint(opts.from, opts.to, t0, opts.curl)
    const pm = curlPoint(opts.from, opts.to, tm, opts.curl)
    const p1 = curlPoint(opts.from, opts.to, t1, opts.curl)
    const rStart = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t0))
    const rBulge = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(tm)) * 1.08
    const rEnd = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t1)) * (1 - opts.groove)
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart / opts.flat, 1e-4), rz: Math.max(rStart * opts.flat, 1e-4) },
      { at: pm, ry: Math.max(rBulge / opts.flat, 1e-4), rz: Math.max(rBulge * opts.flat, 1e-4) },
      { at: p1, ry: Math.max(rEnd / opts.flat, 1e-4), rz: Math.max(rEnd * opts.flat, 1e-4) },
    ]
    const mesh = new THREE.Mesh(loft(sections, 16), opts.colors[s % opts.colors.length])
    mesh.name = 'abdomen'
    g.add(mesh)
  }
  return g
}

/** 复刻 kit.mandibles() 内部的路径公式，用于精确取得大颚尖端坐标（不改 kit.ts）。 */
function mandiblePoint(at: [number, number, number], length: number, spread: number, curve: number, side: 1 | -1, t: number): THREE.Vector3 {
  const base = new THREE.Vector3(at[0], at[1], at[2] * side)
  return base.add(
    new THREE.Vector3(length * t, -length * 0.12 * t, side * length * spread * (1 - t) * (1 - t) - side * length * curve * t * t * 0.5),
  )
}

/** 念珠状（moniliform）触角一侧：每节都是独立小球，球间细杆相连，逐节渐细并略下垂。 */
function moniliformAntenna(base: THREE.Vector3, side: 1 | -1, length: number, beadR: number, beads: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z]
  g.userData.phase = side >= 0 ? 0 : Math.PI * 0.62 // 左右错相位（此类自写触角常左右共用 base，不能按 z 符号判）
  const pitch = THREE.MathUtils.degToRad(22)
  const yaw = side * THREE.MathUtils.degToRad(36)
  const dir = new THREE.Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  let prev = base.clone()
  for (let i = 0; i < beads; i++) {
    const t = (i + 1) / beads
    const p = base.clone().addScaledVector(dir, length * t)
    p.y -= 0.3 * length * t * t
    const r = beadR * (1 - t * 0.5)
    g.add(new THREE.Mesh(loft([{ at: prev, ry: r * 0.4, rz: r * 0.4 }, { at: p, ry: r * 0.4, rz: r * 0.4 }], 7), material))
    const bead = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), material)
    bead.position.copy(p)
    g.add(bead)
    prev = p
  }
  return g
}

function moniliformAntennaPair(base: [number, number, number], length: number, beadR: number, beads: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.add(moniliformAntenna(new THREE.Vector3(...base), 1, length, beadR, beads, material))
  g.add(moniliformAntenna(new THREE.Vector3(base[0], base[1], -base[2]), -1, length, beadR, beads, material))
  return g
}

// ---------------------------------------------------------------- 主体

export function buildRoveBeetle(): InsectModel {
  const g = new THREE.Group()

  const headMat = chitin({ color: '#120e0b', gloss: 0.58, clearcoat: 0.34 })
  const pronotumMat = chitin({ color: '#c8481c', gloss: 0.46, clearcoat: 0.22 })
  // B 轮：鞘翅弱蓝黑虹彩，只动这一小截材质，红黑警戒配色（下面几种
  // 材质）不动。iridescence 手动降到 0.3（同豉甲 0.28 一档），IOR/厚度域
  // 用 kit 默认。
  const elytraMat = elytra('#131a2e', 0.42, { iridescent: true })
  elytraMat.iridescence = 0.3
  const abdomenOrangeMat = chitin({ color: '#cf4e1f', gloss: 0.35, clearcoat: 0.1 })
  const abdomenBlackMat = chitin({ color: '#0d0b09', gloss: 0.35, clearcoat: 0.1 })
  const legMat = chitin({ color: '#5a3820', gloss: 0.36, clearcoat: 0.14 }) // fuscipes = 「暗足的」
  const antennaMat = chitin({ color: '#4a3018', gloss: 0.3 })
  const mandibleMat = chitin({ color: '#0a0806', gloss: 0.62, clearcoat: 0.3 })
  const eyeColor = '#0a0908'

  // ---- 头部：小而黑
  const headFrontX = 0.4
  const headBackX = 0.32
  const head = new THREE.Mesh(
    spindle([headFrontX, 0.01, 0], [headBackX, 0.0, 0], 0.075, { bulge: 0.42, flat: 1.05, taperStart: 0.65, taperEnd: 0.55 }),
    headMat,
  )
  g.add(head)

  // ---- 颈：明显收细的短「脖子」，头胸分界由此产生（蚁形体态的关键）
  const neckFrom = new THREE.Vector3(headBackX, 0.005, 0)
  const neckTo = new THREE.Vector3(0.28, -0.005, 0)
  g.add(
    new THREE.Mesh(
      loft(
        [
          { at: neckFrom, ry: 0.042, rz: 0.042 },
          { at: new THREE.Vector3().lerpVectors(neckFrom, neckTo, 0.5), ry: 0.03, rz: 0.03 },
          { at: neckTo, ry: 0.046, rz: 0.046 },
        ],
        14,
      ),
      headMat,
    ),
  )

  // ---- 前胸背板：橙红，界限分明
  const pronotumFrontX = 0.28
  const pronotumBackX = 0.17
  const pronotum = new THREE.Mesh(
    spindle([pronotumFrontX, -0.005, 0], [pronotumBackX, 0.0, 0], 0.09, { bulge: 0.42, flat: 1.1, taperStart: 0.55, taperEnd: 0.86 }),
    pronotumMat,
  )
  g.add(pronotum)

  // ---- 鞘翅：极短，只盖住腹部最前一小截——本种的全部辨识度所在
  const eSteps = 8
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.5) * Math.PI * 0.85) * 0.082
    elytronSections.push({
      at: new THREE.Vector3(pronotumBackX - 0.07 * t, 0.005 - 0.006 * t, 0),
      ry: Math.max(w * 0.55, 0.006),
      rz: Math.max(w * 0.6, 0.006),
    })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 16), elytraMat)
    shell.position.z = side * 0.058
    shell.name = 'elytra'
    g.add(shell)
  }

  // ---- 小盾片：两鞘翅基部之间的三角小片
  g.add(
    new THREE.Mesh(
      spindle([pronotumBackX + 0.01, 0.02, 0], [pronotumBackX - 0.03, 0.03, 0], 0.014, {
        bulge: 0.2,
        flat: 1.3,
        taperStart: 0.9,
        taperEnd: 0.1,
      }),
      elytraMat,
    ),
  )

  // ---- 腹部：细长分节、红黑相间、末段上翘——与极短鞘翅相对的裸露部分
  const abdomenFrom = new THREE.Vector3(pronotumBackX, 0.005, 0)
  const abdomenTo = new THREE.Vector3(-0.42, 0.02, 0)
  g.add(
    roveAbdomen({
      from: abdomenFrom,
      to: abdomenTo,
      r0: 0.075,
      r1: 0.022,
      segments: 7,
      groove: 0.24,
      curl: 0.15,
      flat: 1.15,
      colors: [abdomenOrangeMat, abdomenBlackMat, abdomenOrangeMat, abdomenBlackMat, abdomenOrangeMat, abdomenBlackMat, abdomenBlackMat],
    }),
  )

  // ---- 复眼：小而突出
  const eyeAt: [number, number, number] = [0.37, 0.03, 0.045]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.032, color: eyeColor, flatten: 0.85, facets: false }))

  // ---- 大颚：捕食性隐翅虫的小而尖的一对钳
  const mandibleAt: [number, number, number] = [0.4, -0.01, 0.02]
  const mandibleLen = 0.09
  const mandibleSpread = 0.32
  const mandibleCurve = 0.45
  g.add(mandibles({ at: mandibleAt, length: mandibleLen, spread: mandibleSpread, curve: mandibleCurve }, mandibleMat))

  // ---- 念珠状触角
  const antBase: [number, number, number] = [0.42, 0.02, 0.035]
  const antLength = 0.26
  g.add(moniliformAntennaPair(antBase, antLength, 0.013, 9, antennaMat))

  // ---- 六足：细长，褐色（fuscipes）
  const legSpecs: LegSpec[] = [
    { base: [0.26, -0.032, 0.06], femur: 0.1, tibia: 0.09, tarsus: 0.05, thickness: 0.012, splay: 38, sweep: -28, knee: 56 },
    { base: [0.19, -0.036, 0.065], femur: 0.11, tibia: 0.1, tarsus: 0.055, thickness: 0.013, splay: 36, sweep: 6, knee: 58 },
    { base: [0.1, -0.036, 0.06], femur: 0.115, tibia: 0.105, tarsus: 0.06, thickness: 0.013, splay: 40, sweep: 36, knee: 60 },
  ]
  const legRigs = legSpecs.map((spec) => legPair(spec, legMat))
  for (const rig of legRigs) g.add(rig)
  const midLegTip = (legRigs[1].children[0] as THREE.Group).userData.tip as THREE.Vector3

  const anchors: Record<string, THREE.Vector3> = {
    elytra: new THREE.Vector3(pronotumBackX - 0.035, 0.05, 0.06),
    abdomen: curlPoint(abdomenFrom, abdomenTo, 0.42, 0.15),
    mandible: mandiblePoint(mandibleAt, mandibleLen, mandibleSpread, mandibleCurve, 1, 1),
    antenna: new THREE.Vector3(antBase[0] + 0.2, antBase[1] + 0.1, antBase[2] + 0.13),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1] + 0.03, eyeAt[2] + 0.032),
    leg: midLegTip.clone(),
  }

  return finalize(g, anchors)
}
