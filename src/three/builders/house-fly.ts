/**
 * 家蝇 Musca domestica（双翅目 蝇科 —— 第 7 轮「日常昆虫」补编之一）
 *
 * 造型要点：
 * - 认种第一特征是**胸背 4 条深色纵纹**（vittae）：灰底近黑纹，明度差
 *   必须真的拉开（第 5 轮教训：深灰叠深灰在 ACES 下直接消失）。做法是
 *   复刻 spindle() 的半径公式得到胸面参数化（thoraxSurface），把 4 条
 *   窄带沿体轴放样、贴在曲面上（±10°/±30°），name='thorax-stripe'，
 *   测试按名量「沿 X 的长条 + 与底色的明度差」。
 * - 舐吸式口器：短粗、下垂，端部一对海绵状唇瓣（labella）——绝不是
 *   刺吸针。喙管全长约 0.12（体长 18%），上下限都钉住（天蛾喙曾因只给
 *   下限长成三倍体长的标枪）。唇瓣是两枚并排压扁的球，name='labella'。
 * - 红褐色大复眼占据头两侧，雌虫式 dichoptic：两眼之间留额条，不越中线
 *   （与食蚜蝇雄虫的 holoptic 相接相反）。
 * - 芒状触角：极短的三节短锥 + 一根芒毛（同 hoverfly 的做法，含微动钩子）。
 * - 双翅目底线：一对膜翅（'wing-membrane' 恰好 2 片）+ 一对平衡棒。
 * - 足端爪垫（pulvilli）：每足跗端两枚浅色小垫，name='pulvillus'——
 *   家蝇倒走天花板的本钱，也是讲解的重点部位。
 * - 腹部黄褐，背中一条暗色纵线（沿腹包络放样的窄带）。
 *
 * 坐标：+X 前，+Y 上，+Z 右；1 单位 = 1cm，体长约 0.68（6–7mm）。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  membrane,
  mirrorZ,
  spindle,
  segmentedAbdomen,
  abdomenEnvelope,
  wingGeometry,
  type InsectModel,
  type LegSpec,
  type Section,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

/**
 * 复刻 spindle() 的截面公式，得到胸部曲面上的一点与外法线。
 * theta=0 是背中线最高处，向 +Z 增大；路径沿 X 微斜，斜率很小，
 * 标架近似取全局 Y/Z 轴（斜差 < 4°，肉眼不可辨）。
 */
function spindleSurface(opts: {
  from: THREE.Vector3
  to: THREE.Vector3
  radius: number
  bulge: number
  flat: number
  t: number
  thetaDeg: number
}): { pos: THREE.Vector3; normal: THREE.Vector3 } {
  const { from, to, radius, bulge, flat, t, thetaDeg } = opts
  const k = t < bulge ? t / bulge : (1 - t) / (1 - bulge)
  const r = radius * Math.sin(Math.min(1, Math.max(0, k)) * Math.PI * 0.5)
  const ry = r / flat
  const rz = r * flat
  const th = THREE.MathUtils.degToRad(thetaDeg)
  const center = new THREE.Vector3().lerpVectors(from, to, t)
  const pos = center.clone().add(new THREE.Vector3(0, Math.cos(th) * ry, Math.sin(th) * rz))
  const normal = new THREE.Vector3(0, Math.cos(th) / Math.max(ry, 1e-6) * rz, Math.sin(th) / Math.max(rz, 1e-6) * ry).normalize()
  return { pos, normal }
}

/** 芒状触角：三节短锥下垂 + 一根芒毛。带微动钩子（name + base + phase）。 */
function aristateAntenna(base: THREE.Vector3, side: 1 | -1, mat: THREE.Material, aristaMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z * side]
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const dir = new THREE.Vector3(0.42, -0.82, side * 0.24).normalize() // 家蝇触角贴脸下垂
  const stalkLen = 0.062
  const sections: Section[] = []
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    sections.push({
      at: b.clone().addScaledVector(dir, stalkLen * t),
      ry: 0.019 * (1 - t * 0.35),
      rz: 0.019 * (1 - t * 0.35),
    })
  }
  g.add(new THREE.Mesh(loft(sections, 10), mat))
  // 芒毛：自第三节背面翘出，比柄细一个数量级
  const aristaBase = b.clone().addScaledVector(dir, stalkLen * 0.45)
  const aristaTip = aristaBase.clone().add(new THREE.Vector3(0.072, 0.034, side * 0.024))
  g.add(new THREE.Mesh(loft([{ at: aristaBase, ry: 0.0045, rz: 0.0045 }, { at: aristaTip, ry: 0.0008, rz: 0.0008 }], 6), aristaMat))
  return g
}

/** 平衡棒：细柄 + 端球，藏在翅基后下方。 */
function haltere(base: THREE.Vector3, side: 1 | -1, stalkMat: THREE.Material, ballMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const dir = new THREE.Vector3(-0.4, -0.45, side * 0.6).normalize()
  const tip = b.clone().addScaledVector(dir, 0.085)
  const stalk = new THREE.Mesh(loft([{ at: b, ry: 0.006, rz: 0.006 }, { at: tip, ry: 0.004, rz: 0.004 }], 8), stalkMat)
  stalk.name = 'haltere'
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), ballMat)
  ball.position.copy(tip)
  ball.name = 'haltere'
  g.add(stalk, ball)
  return g
}

// ---------------------------------------------------------------- 主体

export function buildHouseFly(): InsectModel {
  const g = new THREE.Group()

  /*
   * 颜色纪律：胸纹要在灰底上读得出来，底色取亮灰、纹取近黑，
   * 明度差对齐 ladybird #e2382a 的「目视够亮」基准档。
   */
  const thoraxGround = '#98918a' // 亮灰底
  const stripeColor = '#211d1a' // 近黑纹
  const thoraxMat = chitin({ color: thoraxGround, gloss: 0.42, clearcoat: 0.12, surface: 'punctate' })
  const stripeMat = chitin({ color: stripeColor, gloss: 0.3 })
  const headMat = chitin({ color: '#7d7770', gloss: 0.4 })
  const fronsMat = chitin({ color: '#5b3a20', gloss: 0.3 }) // 两眼间的额条，锈褐
  const abdomenColor = '#b3854a' // 黄褐
  const abdomenMat = chitin({ color: abdomenColor, gloss: 0.5, clearcoat: 0.2 })
  const midlineMat = chitin({ color: '#2a241e', gloss: 0.3 })
  const legMat = chitin({ color: '#2b2622', gloss: 0.35 })
  const pulvillusMat = chitin({ color: '#d9c9a8', gloss: 0.25 })
  const proboscisMat = chitin({ color: '#4a423a', gloss: 0.35 })
  const labellaMat = chitin({ color: '#8a7358', gloss: 0.3 })
  const haltereMat = chitin({ color: '#c8a666', gloss: 0.4 })
  const eyeColor = '#8f3520' // 红褐大复眼
  const wingFaceMat = membrane('#eceae4', 0.24, { iridescent: true, iridescenceStrength: 0.22 })
  const veinMat = chitin({ color: '#847a6e', gloss: 0.3, side: THREE.DoubleSide })

  // ---- 胸：拱起的灰色中胸，是全身最高点
  const thoraxFrom = new THREE.Vector3(0.245, 0.05, 0)
  const thoraxTo = new THREE.Vector3(-0.035, 0.02, 0)
  const thoraxR = 0.135
  const thoraxBulge = 0.45
  const thoraxFlat = 1.06
  {
    const thorax = new THREE.Mesh(
      spindle([thoraxFrom.x, thoraxFrom.y, thoraxFrom.z], [thoraxTo.x, thoraxTo.y, thoraxTo.z], thoraxR, {
        bulge: thoraxBulge,
        flat: thoraxFlat,
        taperStart: 0.62,
        taperEnd: 0.55,
      }),
      thoraxMat,
    )
    thorax.name = 'thorax'
    g.add(thorax)
  }

  // ---- 招牌：胸背 4 条深色纵纹，贴着胸面从前缘扫到后缘
  const stripeThetas = [-30, -10, 10, 30]
  for (const theta of stripeThetas) {
    const sections: Section[] = []
    const steps = 14
    for (let i = 0; i <= steps; i++) {
      const t = 0.14 + (i / steps) * 0.7
      const { pos, normal } = spindleSurface({
        from: thoraxFrom, to: thoraxTo, radius: thoraxR, bulge: thoraxBulge, flat: thoraxFlat,
        t, thetaDeg: theta,
      })
      pos.addScaledVector(normal, 0.0025) // 微浮出曲面，避免 z-fighting
      // 两端收细，读成「纹」而不是「贴上去的管子」
      const w = 0.014 * Math.sin(Math.min(1, (i / steps) * 5, (1 - i / steps) * 5) * Math.PI * 0.5)
      sections.push({ at: pos, ry: Math.max(w * 0.4, 1e-4), rz: Math.max(w, 1e-4) })
    }
    const stripe = new THREE.Mesh(loft(sections, 10), stripeMat)
    stripe.name = 'thorax-stripe'
    g.add(stripe)
  }

  // ---- 头：短而高，前面几乎被复眼占满
  const headFrom = new THREE.Vector3(0.22, 0.03, 0)
  const headTo = new THREE.Vector3(0.355, 0.045, 0)
  {
    const head = new THREE.Mesh(spindle([headFrom.x, headFrom.y, headFrom.z], [headTo.x, headTo.y, headTo.z], 0.097, { bulge: 0.5, flat: 1.12, taperStart: 0.55, taperEnd: 0.4 }), headMat)
    head.name = 'head'
    g.add(head)
  }

  // ---- 额条：两眼之间的一道窄条（雌虫 dichoptic 的证据）
  g.add(
    new THREE.Mesh(
      loft(
        [
          { at: new THREE.Vector3(0.265, 0.105, 0), ry: 0.009, rz: 0.015 },
          { at: new THREE.Vector3(0.345, 0.068, 0), ry: 0.01, rz: 0.013 },
        ],
        10,
      ),
      fronsMat,
    ),
  )

  // ---- 红褐大复眼：一对，各留本侧，不越中线
  const eyeAt: [number, number, number] = [0.305, 0.07, 0.063]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.067, color: eyeColor, flatten: 0.98, stretch: 1.18, facets: true }))

  // ---- 芒状触角
  const antBase = new THREE.Vector3(0.35, 0.03, 0.02)
  g.add(aristateAntenna(antBase, 1, headMat, headMat), aristateAntenna(antBase, -1, headMat, headMat))

  // ---- 舐吸式口器：短喙管下垂 + 端部一对海绵状唇瓣
  const proboscisTop = new THREE.Vector3(0.295, -0.03, 0)
  const proboscisEnd = new THREE.Vector3(0.315, -0.135, 0)
  const proboscis = new THREE.Mesh(
    loft(
      [
        { at: proboscisTop, ry: 0.032, rz: 0.028 },
        { at: new THREE.Vector3(0.305, -0.085, 0), ry: 0.026, rz: 0.024 },
        { at: proboscisEnd, ry: 0.022, rz: 0.022 },
      ],
      12,
    ),
    proboscisMat,
  )
  proboscis.name = 'proboscis'
  g.add(proboscis)
  for (const side of [1, -1] as const) {
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), labellaMat)
    lobe.position.set(0.325, -0.155, side * 0.021)
    lobe.scale.set(1.25, 0.62, 0.8) // 压扁的海绵垫，向前下摊开
    lobe.rotation.x = side * 0.18
    lobe.name = 'labella'
    g.add(lobe)
  }

  // ---- 腹：黄褐色，4 节，尾端圆钝，背中一条暗色纵线
  const abdomenFrom: [number, number, number] = [0.03, 0.015, 0]
  const abdomenTo: [number, number, number] = [-0.32, -0.012, 0]
  const abdomenR0 = 0.112
  const abdomenR1 = 0.052
  const abdomenBulge = 0.3
  const abdomen = new THREE.Mesh(
    segmentedAbdomen({ from: abdomenFrom, to: abdomenTo, r0: abdomenR0, r1: abdomenR1, segments: 4, groove: 0.12, flat: 1.08, bulge: abdomenBulge, color: abdomenColor }),
    abdomenMat,
  )
  abdomen.name = 'abdomen'
  g.add(abdomen)
  {
    // 尾端圆帽：把 loft 的平切端面盖成圆钝的尾（略吞进尾节，藏住接缝）。
    // 用深一档的专用材质而不是腹色（终审打回）：帽子露在收拢翅膜的银灰之外，
    // 纯腹色在那儿读成贴上去的浅塞；真家蝇的腹端本来就朝尾变深。
    const capMat = chitin({ color: '#71512d', gloss: 0.5, clearcoat: 0.2 })
    const cap = new THREE.Mesh(new THREE.SphereGeometry(abdomenR1 * 1.02, 16, 12), capMat)
    cap.position.set(abdomenTo[0] + 0.014, abdomenTo[1], abdomenTo[2])
    cap.scale.set(0.8, 1.0, 1.1)
    cap.name = 'abdomen'
    g.add(cap)
  }
  {
    // 背中暗线：沿腹包络顶放样的窄条
    const a = new THREE.Vector3(...abdomenFrom)
    const b = new THREE.Vector3(...abdomenTo)
    const sections: Section[] = []
    const steps = 12
    for (let i = 0; i <= steps; i++) {
      const t = 0.05 + (i / steps) * 0.78
      const env = abdomenEnvelope(t, abdomenR0, abdomenR1, abdomenBulge)
      const at = new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, env / 1.08 + 0.002, 0))
      const w = 0.013 * (1 - t * 0.5)
      sections.push({ at, ry: Math.max(w * 0.45, 1e-4), rz: Math.max(w, 1e-4) })
    }
    g.add(new THREE.Mesh(loft(sections, 8), midlineMat))
  }

  // ---- 一对膜翅：停歇时向后收拢、交叠平覆在腹背上，收成窄三角
  const wingLength = 0.6
  const wingSpec: WingSpec = {
    base: [0.1, 0.128, 0.06],
    length: wingLength,
    width: 0.24,
    outline: [
      [0, 0.16],
      [0.14, 0.55],
      [0.36, 0.9],
      [0.6, 1.0],
      [0.8, 0.8],
      [0.93, 0.45],
      [1, 0.14],
    ],
    spread: 242,
    tilt: -2,
    sweep: 0,
    thickness: 0.005,
  }
  // 手工装配（不用 kit.wingVeins——硬编码脉径在 0.6 的小翅上重得像伞骨），
  // 翅脉走 venation 轻档；左右翅基高度错开 0.004，交叠处不打架。
  const wings = new THREE.Group()
  let rightBladeRef: THREE.Group | null = null
  for (const side of [1, -1] as const) {
    const pivot = new THREE.Group()
    const blade = new THREE.Group()
    const face = new THREE.Mesh(wingGeometry(wingSpec), wingFaceMat)
    face.name = 'wing-membrane'
    blade.add(face)
    const veins = venation({
      length: wingSpec.length,
      width: wingSpec.width,
      outline: wingSpec.outline,
      longitudinal: 5,
      crossDensity: 1.2,
      veinScale: 0.014,
      material: veinMat,
      name: 'vein',
    })
    if (veins) blade.add(veins)
    // blade 自身先俯 7°：后掠之后翅尖顺着腹背斜面下垂，不再悬浮在尾上方
    blade.rotation.z = THREE.MathUtils.degToRad(-7)
    pivot.add(blade)
    pivot.position.set(wingSpec.base[0], wingSpec.base[1] + (side === 1 ? 0.004 : 0), wingSpec.base[2] * side)
    pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(wingSpec.spread)) + THREE.MathUtils.degToRad(wingSpec.sweep ?? 0)
    pivot.rotation.x = side * THREE.MathUtils.degToRad(wingSpec.tilt ?? 0)
    pivot.scale.z = side
    wings.add(pivot)
    if (side === 1) rightBladeRef = blade
  }
  g.add(wings)

  // ---- 平衡棒
  const haltereBase = new THREE.Vector3(0.01, 0.03, 0.1)
  g.add(haltere(haltereBase, 1, haltereMat, haltereMat), haltere(haltereBase, -1, haltereMat, haltereMat))

  // ---- 三对足 + 足端爪垫（pulvilli）
  const legSpecs: LegSpec[] = [
    { base: [0.2, -0.05, 0.09], femur: 0.16, tibia: 0.15, thickness: 0.016, splay: 24, sweep: -24, knee: 66, ankle: 54 },
    { base: [0.08, -0.06, 0.1], femur: 0.18, tibia: 0.17, thickness: 0.017, splay: 28, sweep: 5, knee: 68, ankle: 55 },
    { base: [-0.05, -0.06, 0.1], femur: 0.2, tibia: 0.19, thickness: 0.017, splay: 26, sweep: 30, knee: 70, ankle: 53 },
  ]
  let midLegTip: THREE.Vector3 | null = null
  for (const [idx, spec] of legSpecs.entries()) {
    const l = leg(spec, legMat)
    const tip = (l.userData.tip as THREE.Vector3).clone()
    if (idx === 1) midLegTip = tip
    // 爪垫：跗端两枚并排的浅色小垫
    for (const side of [1, -1] as const) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), pulvillusMat)
      pad.position.copy(tip).add(new THREE.Vector3(0.008, -0.004, side * 0.011))
      pad.scale.set(1.3, 0.55, 0.9)
      pad.name = 'pulvillus'
      l.add(pad)
    }
    g.add(mirrorZ(l))
  }

  // ---- anchors
  g.updateMatrixWorld(true)
  const wingTip = rightBladeRef!.localToWorld(new THREE.Vector3(wingLength * 0.88, 0, 0))
  const stripeTop = spindleSurface({ from: thoraxFrom, to: thoraxTo, radius: thoraxR, bulge: thoraxBulge, flat: thoraxFlat, t: 0.42, thetaDeg: 10 })

  const anchors: Record<string, THREE.Vector3> = {
    stripe: stripeTop.pos.clone().add(new THREE.Vector3(0, 0.02, 0)),
    eye: new THREE.Vector3(eyeAt[0] + 0.02, eyeAt[1] + 0.01, eyeAt[2] + 0.065),
    proboscis: new THREE.Vector3(0.335, -0.15, 0.045),
    antenna: antBase.clone().add(new THREE.Vector3(0.02, -0.03, 0.01)),
    wing: wingTip,
    pulvillus: midLegTip!.clone().add(new THREE.Vector3(0.01, -0.005, 0.02)),
  }

  return finalize(g, anchors)
}
