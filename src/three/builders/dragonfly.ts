/**
 * 碧伟蜓 Anax parthenope（蜻蜓目 Anisoptera）
 *
 * 造型要点：
 * - 蜻蜓目最硬的分类学特征是「翅不能折叠」：静止时四片狭长膜翅完全
 *   水平平展在体侧（spread≈88°），这是它和几乎所有其他有翅昆虫目
 *   （静止时翅收拢贴背）的根本区别，本文件把姿态锁死在接近 90°而不
 *   是像其他物种那样半展开。
 * - 蜻蜓翅脉是所有昆虫里最密的网状脉序（古翅类特征，翅脉不像新翅类
 *   那样退化简化）。C 轮起翅脉走 venation.ts 的参数化翅脉网（本种是
 *   翅脉 2.0 的定标物种）：纵脉 13/12 条扇形发出、前缘脉最粗，横脉
 *   密度给 16 的高档并向翅尖渐密，围出「基部大格、端部小格」的封闭
 *   翅室——蜻蜓翅「越靠翅尖越碎」的质感即来于此；前缘近端还有一枚
 *   深色翅痣（pterostigma，飞行时的配重结构），本文件自写
 *   `pterostigma()` 在轮廓前缘插一枚小方片，因此 venation 的翅痣
 *   开关保持关闭（避免两枚翅痣重叠）。
 * - 复眼硕大到左右几乎在头顶相接（holoptic，"接眼式"）——蜻蜓科
 *   （Aeshnidae）视觉几乎占满整个头部，这是蜻蜓辨识度最高的单一特征，
 *   本文件把复眼半径放到远超常规头部比例，两眼在背中线上主动重叠。
 * - 六足全部向前方收拢、大幅屈曲，形成飞行中捕虫用的「捕虫篮」，
 *   这也是蜻蜓目区别于蜻蜓目以外几乎所有目的姿态（腿完全不用来走路）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  membrane,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 分节上色的细长腹部：蜻蜓腹部基半部粗、往后急剧收细，
 * 逐节独立放样交替上色（蓝绿/近黑），环沟用较大的 groove 撑出清晰分节。
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
  const matA = chitin({ color: opts.colorA, gloss: 0.55, clearcoat: 0.3 })
  const matB = chitin({ color: opts.colorB, gloss: 0.5, clearcoat: 0.2 })
  // 全长包络：前 15% 快速鼓到最粗（基部第 1、2 节最壮），此后单调收细到尾端
  const envelope = (t: number): number => {
    const bulge = 0.14
    if (t < bulge) return THREE.MathUtils.lerp(opts.r0 * 0.72, opts.r0, smoothstep(t / bulge))
    return THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep((t - bulge) / (1 - bulge)))
  }
  for (let s = 0; s < opts.segments; s++) {
    const t0 = s / opts.segments
    const t1 = (s + 1) / opts.segments
    const p0 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t0)
    const p1 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t1)
    const rStart = envelope(t0)
    const rBulge = envelope((t0 + t1) / 2) * 1.04
    const rEnd = envelope(t1) * (1 - opts.groove)
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart, 1e-4), rz: Math.max(rStart, 1e-4) },
      { at: new THREE.Vector3().lerpVectors(p0, p1, 0.5), ry: Math.max(rBulge, 1e-4), rz: Math.max(rBulge, 1e-4) },
      { at: p1, ry: Math.max(rEnd, 1e-4), rz: Math.max(rEnd, 1e-4) },
    ]
    g.add(new THREE.Mesh(loft(sections, 22), s % 2 === 0 ? matA : matB))
  }
  return g
}

/** 在翅前缘（outline 的正 y 一侧）按弦长比例查半宽，供翅痣定位复用 kit.wingGeometry 的坐标约定。 */
function leadingEdgeHalfWidth(spec: WingSpec, xFrac: number): number {
  const outline = spec.outline!
  let y = 0.3
  for (let i = 0; i < outline.length - 1; i++) {
    const [x0, y0] = outline[i]
    const [x1, y1] = outline[i + 1]
    if (xFrac >= x0 && xFrac <= x1) {
      const t = x1 === x0 ? 0 : (xFrac - x0) / (x1 - x0)
      y = THREE.MathUtils.lerp(y0, y1, t)
      break
    }
  }
  return y * spec.width * 0.5
}

/** 翅痣：前缘近端部的一小块加厚深色翅膜，飞行时兼作配重与视觉标记。 */
function pterostigma(spec: WingSpec, material: THREE.Material): THREE.Mesh {
  const xFrac = 0.87
  const halfW = leadingEdgeHalfWidth(spec, xFrac)
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.length * 0.05, 0.01, halfW * 0.5), material)
  mesh.position.set(spec.length * xFrac, 0.006, halfW * 0.62)
  return mesh
}

/** 一片完整的蜻蜓翅（翅面+翅室网翅脉+翅痣），按 spread/tilt 摆位；复刻 kit.wing() 的枢轴装配方式。 */
function dragonflyWing(
  spec: WingSpec,
  faceMat: THREE.Material,
  veinMat: THREE.Material,
  stigmaMat: THREE.Material,
  veinCount: number,
  side: 1 | -1,
): { pivot: THREE.Group; blade: THREE.Group; tipLocal: THREE.Vector3 } {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), faceMat))
  // 翅脉 2.0：纵脉扇 + 向翅尖渐密的横脉围出封闭翅室。脉粗是相对翅宽的
  // 比例值（不再是 kit.wingVeins 的硬编码 0.009）；翅痣本文件自带，
  // venation 的 pterostigma 开关保持关闭。
  const veins = venation({
    length: spec.length,
    width: spec.width,
    outline: spec.outline,
    longitudinal: veinCount,
    crossDensity: 16,
    veinScale: 0.009,
    material: veinMat,
    name: 'vein',
  })
  if (veins) blade.add(veins)
  blade.add(pterostigma(spec, stigmaMat))
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y =
    side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side

  const tipLocal = new THREE.Vector3(spec.length * 0.96, 0, 0)
  return { pivot, blade, tipLocal }
}

// ---------------------------------------------------------------- 建模主体

export function buildDragonfly(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#25361f', gloss: 0.55, metal: 0.12, clearcoat: 0.4 })
  const headMat = chitin({ color: '#1c2a18', gloss: 0.5, clearcoat: 0.3 })
  const legMat = chitin({ color: '#171410', gloss: 0.35 })
  const eyeColor = '#3f8f86'
  // B 轮翅膜虹彩组定标：掠射角轻虹彩（强度由 kit MEMBRANE_IRIDESCENCE 常量控制，
  // 保守档，只在翅面材质上开——翅痣 stigmaMat 与翅脉 veinMat 不动）
  const wingFaceMat = membrane('#f0f7f2', 0.2, { iridescent: true })
  const veinMat = chitin({ color: '#241f16', gloss: 0.35, side: THREE.DoubleSide })
  const stigmaMat = chitin({ color: '#3a2a18', gloss: 0.5 })

  // ---- 头：体量很小，绝大部分会被巨大的复眼盖住
  const head = new THREE.Mesh(
    spindle([0.38, 0.05, 0], [0.72, 0.06, 0], 0.22, { bulge: 0.5, taperStart: 0.7, taperEnd: 0.55 }),
    headMat,
  )
  g.add(head)

  // ---- 胸：粗壮且略前倾（蜻蜓目胸部特化为斜置，翅足全部集中在这一小段）
  const thoraxFrom = new THREE.Vector3(-0.62, -0.02, 0)
  const thoraxTo = new THREE.Vector3(0.36, 0.06, 0)
  const thorax = new THREE.Mesh(
    spindle([thoraxFrom.x, thoraxFrom.y, thoraxFrom.z], [thoraxTo.x, thoraxTo.y, thoraxTo.z], 0.5, {
      bulge: 0.4,
      flat: 1.05,
      taperStart: 0.55,
      taperEnd: 0.7,
    }),
    bodyMat,
  )
  g.add(thorax)
  const thoraxCenter = new THREE.Vector3().lerpVectors(thoraxFrom, thoraxTo, 0.45)

  // ---- 腹：细长分节，10 节，蓝绿/近黑相间，环沟加大以突出分节
  const abdomenFrom = new THREE.Vector3(-0.68, -0.04, 0)
  const abdomenTo = new THREE.Vector3(-6.35, 0.05, 0)
  const abdomenR0 = 0.34
  const abdomenR1 = 0.05
  g.add(
    bandedAbdomen({
      from: abdomenFrom,
      to: abdomenTo,
      r0: abdomenR0,
      r1: abdomenR1,
      segments: 10,
      groove: 0.28,
      colorA: '#2f6f63',
      colorB: '#161d17',
    }),
  )

  // ---- 复眼：holoptic——半径远超头部比例，两眼在头顶中线附近相接/轻度重叠，
  // 但保留一点间距差，避免两颗同色球体完全吞并成一个看不出"两只眼"的团块
  g.add(
    compoundEyePair({
      at: [0.62, 0.36, 0.3],
      radius: 0.42,
      color: eyeColor,
      flatten: 0.92,
      stretch: 1.12,
      facets: true,
    }),
  )

  // ---- 刚毛状触角：极短，几乎只是两根鬃毛，蜻蜓目定位主要靠视觉而非嗅觉
  const antBase: [number, number, number] = [0.78, 0.2, 0.1]
  g.add(antennaPair({ base: antBase, length: 0.08, kind: 'setaceous', pitch: 20, yaw: 45, thickness: 0.01 }, legMat))

  // ---- 两对狭长膜翅：完全水平平展，密网状翅脉 + 翅痣
  const commonOutline: [number, number][] = [
    [0, 0.12],
    [0.06, 0.42],
    [0.15, 0.62],
    [0.35, 0.72],
    [0.6, 0.72],
    [0.82, 0.6],
    [0.95, 0.38],
    [1, 0.12],
  ]
  const hindOutline: [number, number][] = [
    [0, 0.25],
    [0.08, 0.62],
    [0.18, 0.8],
    [0.4, 0.82],
    [0.65, 0.72],
    [0.85, 0.55],
    [1, 0.15],
  ]

  // kit.wing() 的 spread 参数实测和它自己的文档字符串不一致（对着源码逆向验证过）：
  //   pivot.rotation.y = side*(90°-spread) + sweep =: θy
  //   偏移(局部 (length,0,0) 相对翅基) = length*(cosθy, sinθx·sinθy, -cosθx·sinθy)
  // 实测 spread=90 时翅尖指向体前方（+X），spread=180 才是纯左右侧向（+Z，右翅）。
  // 把"0=收拢向后，90=完全侧展"这句文档描述的角度记作 φ，则真实关系是
  //   spread = 270 + sweep − φ
  // 蜻蜓要"完全水平侧展"，取 φ=88（几乎打满 90°），tilt 只给 1~2°保证近乎水平、
  // 带一丝自然下垂；后翅额外给一点 sweep 制造前后错位，不是简单地照抄前翅角度。
  const foreSpec: WingSpec = {
    base: [0.18, 0.42, 0.22],
    length: 4.3,
    width: 0.85,
    outline: commonOutline,
    spread: 182, // φ=88, sweep=0 → 270+0-88
    tilt: 2,
    sweep: 0,
    thickness: 0.01,
  }
  const hindSpec: WingSpec = {
    base: [-0.28, 0.4, 0.24],
    length: 4.1,
    width: 1.1,
    outline: hindOutline,
    spread: 178, // φ=88, sweep=-4 → 270-4-88
    tilt: 1,
    sweep: -4,
    thickness: 0.01,
  }

  let foreTip = { pivot: new THREE.Group(), blade: new THREE.Group(), tipLocal: new THREE.Vector3() }
  let hindTip = { pivot: new THREE.Group(), blade: new THREE.Group(), tipLocal: new THREE.Vector3() }
  for (const side of [1, -1] as const) {
    const fw = dragonflyWing(foreSpec, wingFaceMat, veinMat, stigmaMat, 13, side)
    const hw = dragonflyWing(hindSpec, wingFaceMat, veinMat, stigmaMat, 12, side)
    g.add(fw.pivot, hw.pivot)
    if (side === 1) {
      foreTip = fw
      hindTip = hw
    }
  }

  // ---- 六足：全部向前聚拢、大幅屈曲，构成飞行捕虫的「捕虫篮」，不承担步行功能
  g.add(
    legPair(
      { base: [0.28, -0.24, 0.35], femur: 0.55, tibia: 0.6, thickness: 0.045, splay: 25, sweep: -55, knee: 60, spines: true },
      legMat,
    ),
  )
  g.add(
    legPair(
      { base: [0.1, -0.28, 0.4], femur: 0.75, tibia: 0.85, thickness: 0.05, splay: 30, sweep: -70, knee: 55, spines: true },
      legMat,
    ),
  )
  g.add(
    legPair(
      { base: [-0.12, -0.3, 0.42], femur: 0.95, tibia: 1.05, thickness: 0.055, splay: 32, sweep: -80, knee: 50, spines: true },
      legMat,
    ),
  )

  // ---- anchor：翅尖用 localToWorld 沿实际装配矩阵链读出精确坐标
  g.updateMatrixWorld(true)
  const forewingTip = foreTip.blade.localToWorld(foreTip.tipLocal.clone())
  const hindwingTip = hindTip.blade.localToWorld(hindTip.tipLocal.clone())

  const anchors: Record<string, THREE.Vector3> = {
    forewing: forewingTip,
    hindwing: hindwingTip,
    eye: new THREE.Vector3(0.62, 0.36, 0.3 + 0.42 * 0.6),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.35).add(new THREE.Vector3(0, abdomenR0 * 0.7, 0)),
    thorax: thoraxCenter,
    leg: (() => {
      // 用最靠后的一对腿（后足）做代表锚点：base + femur 方向近似
      const base = new THREE.Vector3(-0.12, -0.3, 0.42)
      const sweep = THREE.MathUtils.degToRad(-80)
      const splay = THREE.MathUtils.degToRad(32)
      const dir = new THREE.Vector3(
        Math.sin(sweep) * Math.cos(splay) * -1,
        Math.sin(splay) * 0.35 + 0.25,
        Math.cos(sweep) * Math.cos(splay),
      ).normalize()
      return base.addScaledVector(dir, 0.95)
    })(),
  }

  return finalize(g, anchors)
}
