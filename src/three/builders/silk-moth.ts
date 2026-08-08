/**
 * 柞蚕蛾 Antheraea pernyi
 *
 * 造型要点：
 * - 雄蛾巨大的羽状（栉齿状）触角是蛾与蝶最直观的区别之一。kit.antenna()
 *   的 `pectinate` 分支本身就在主干两侧生成栉齿（数量随 `segments` 增加），
 *   本文件把 segments 提到 20（默认 16），让栉齿数量与密度都显著超过
 *   一般用量，触角部分的独立网格数因此远多于丝状/棒状触角（详见测试）。
 * - 四枚透明"眼斑"（前后翅各一对）是天蚕蛾科（Saturniidae）的标志：
 *   kit 没有现成的"同心环"构造，本文件用三层同心、依次略微抬高、半径
 *   依次收小的扁球（画家算法）叠出"深色外环 + 浅色内环 + 半透明窗"的
 *   靶心效果——外层未被内层盖住的部分自然读成一圈环，不需要真的挖空
 *   造一个圆环体。
 * - 停栖姿态"翅平摊向两侧、屋顶略下垂"，和蝶类合拢上举的 V 姿正相反：
 *   本文件把展开角 φ 取到接近 90°（几乎完全侧展，而非蝶类常见的
 *   60° 上下），配合一个小的正向 tilt（而不是蝶类的负值）——推导见
 *   下方 `spread = 270 + sweep − φ` 注释，tilt 符号翻转的原因是
 *   offset_y = length·sinθx·sinθy，本种 θy 象限与蝶类不同，tilt 同号
 *   下 y 方向偏移的正负也随之翻转，正 tilt 才对应"翅尖略垂"而非"上翘"。
 * - 巨大厚重的翅意味着 kit.wingVeins() 写死的 0.009 绝对半径完全不够看
 *   （本种翅长 4.5~5.8，远超题目给出的"翅长超过 3"阈值），因此翅脉
 *   自写一版按 spec.width 缩放的加粗版本。
 * - 胸部绒毛密而厚（158 根，控制在 150~250 区间），比一般蜂类更蓬松；
 *   成虫口器完全退化，不建喙。
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
  segmentedAbdomen,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/**
 * 胸部绒毛：黄金角螺旋在椭球上半球撒点，每点沿外法线立一根细锥。
 * 复刻 honeybee.ts 的做法（本文件不从它导入，物种文件互相独立）。
 */
function thoraxFuzz(center: THREE.Vector3, radii: THREE.Vector3, count: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const yFrac = 1 - (i + 0.5) / count
    const ringR = Math.sqrt(Math.max(0, 1 - yFrac * yFrac))
    const theta = i * golden
    const nx = Math.cos(theta) * ringR
    const nz = Math.sin(theta) * ringR
    const ny = yFrac
    const p = new THREE.Vector3(center.x + nx * radii.x, center.y + ny * radii.y, center.z + nz * radii.z)
    const n = new THREE.Vector3(nx / radii.x, ny / radii.y, nz / radii.z).normalize()
    const jitter = Math.sin(i * 12.9898) * 43758.5453
    const len = 0.024 + 0.016 * (jitter - Math.floor(jitter))
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.0055, len, 5), material)
    hair.position.copy(p).addScaledVector(n, len * 0.45)
    hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
    g.add(hair)
  }
  return g
}

/** 按翅宽缩放半径的主脉（kit.wingVeins 的写死半径在这个尺寸的翅上太细，见文件顶部注释）。 */
function boldWingVeins(spec: WingSpec, material: THREE.Material, count: number): THREE.Group {
  const g = new THREE.Group()
  const halfW = spec.width * 0.5
  const baseR = spec.width * 0.018
  const veinY = (t: number) => THREE.MathUtils.lerp(halfW * 0.84, -halfW * 0.58, t)
  const veinEndX = (t: number) => spec.length * THREE.MathUtils.lerp(0.6, 0.96, Math.sin(t * Math.PI))
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    const endY = veinY(t)
    const endX = veinEndX(t)
    const steps = 12
    const sections: Section[] = []
    for (let k = 0; k <= steps; k++) {
      const s = k / steps
      const x = spec.length * 0.03 + (endX - spec.length * 0.03) * s
      const y = THREE.MathUtils.lerp(0, endY, Math.pow(s, 0.75))
      const r = Math.max(baseR * (1 - s * 0.75), 0.006)
      sections.push({ at: new THREE.Vector3(x, 0.0016, y), ry: r, rz: r })
    }
    g.add(new THREE.Mesh(loft(sections, 8), material))
  }
  for (let i = 0; i < count - 1; i++) {
    for (const s of [0.4, 0.66]) {
      const t0 = i / (count - 1)
      const t1 = (i + 1) / (count - 1)
      const y0 = veinY(t0) * s
      const y1 = veinY(t1) * s
      const x = spec.length * s * 0.85
      g.add(
        new THREE.Mesh(
          loft(
            [
              { at: new THREE.Vector3(x, 0.0016, y0), ry: baseR * 0.3, rz: baseR * 0.3 },
              { at: new THREE.Vector3(x * 1.02, 0.0016, y1), ry: baseR * 0.3, rz: baseR * 0.3 },
            ],
            6,
          ),
          material,
        ),
      )
    }
  }
  return g
}

/**
 * 同心圆眼斑：外层深色扁球（不被内层遮住的部分读成"深色外环"）→
 * 中层浅色扁球（同理读成"浅色内环"）→ 内层半透明窗，逐层抬高避免共面闪烁。
 */
function eyespot(x: number, z: number, outerR: number, mats: { dark: THREE.Material; pale: THREE.Material; window: THREE.Material }): THREE.Group {
  const g = new THREE.Group()
  g.name = 'eyespot'
  const disc = (r: number, y: number, mat: THREE.Material, flat: number) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat)
    m.scale.set(1, flat, 1)
    m.position.set(x, y, z)
    return m
  }
  g.add(disc(outerR, 0.0032, mats.dark, 0.13))
  g.add(disc(outerR * 0.66, 0.0055, mats.pale, 0.15))
  g.add(disc(outerR * 0.34, 0.0078, mats.window, 0.18))
  return g
}

interface WingMats {
  face: THREE.Material
  vein: THREE.Material
  border: THREE.Material
  eyeDark: THREE.Material
  eyePale: THREE.Material
  eyeWindow: THREE.Material
}

interface WingAssembly {
  pivot: THREE.Group
  blade: THREE.Group
  tipLocal: THREE.Vector3
}

/** 翅缘深色窄边：外轮廓与一圈内缩轮廓之间抠出的环带，复刻 monarch-butterfly.ts 的做法（自写，不导入）。 */
function marginBandGeometry(spec: WingSpec, inset: number, thickness: number): THREE.BufferGeometry {
  const outline = spec.outline!
  const outerPts: THREE.Vector2[] = []
  for (const [x, y] of outline) outerPts.push(new THREE.Vector2(x * spec.length, y * spec.width * 0.5))
  for (let i = outline.length - 1; i >= 0; i--) {
    const [x, y] = outline[i]
    outerPts.push(new THREE.Vector2(x * spec.length, -y * spec.width * 0.5 * 0.72))
  }
  const shape = new THREE.Shape(outerPts)
  const cx = spec.length * 0.5
  const innerPts = outerPts.map((p) => new THREE.Vector2(cx + (p.x - cx) * inset, p.y * inset))
  shape.holes.push(new THREE.Path(innerPts))
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 20 })
  geo.rotateX(Math.PI / 2)
  geo.translate(0, 0.0026, 0)
  return geo
}

/**
 * spread 姿态推导（与 monarch-butterfly.ts / cicada.ts 顶部一致，此处不重复证明）：
 *   spread = 270 + sweep − φ，φ=0 收拢贴尾，φ=90 完全侧展。
 * 本种取 φ 接近 90（近乎纯侧展）而非蝶类常见的 60 上下，且 tilt 取正值
 * 制造"翅尖略垂"的浅屋顶，而非蝶类的上举 V 姿。
 */
function buildWing(spec: WingSpec, mats: WingMats, veinCount: number, eyeAt: [number, number], eyeR: number, side: 1 | -1): WingAssembly {
  const pivot = new THREE.Group()
  const blade = new THREE.Group()
  blade.add(new THREE.Mesh(wingGeometry(spec), mats.face))
  blade.add(boldWingVeins(spec, mats.vein, veinCount))
  blade.add(new THREE.Mesh(marginBandGeometry(spec, 0.9, (spec.thickness ?? 0.014) * 1.6), mats.border))
  blade.add(eyespot(eyeAt[0], eyeAt[1], eyeR, { dark: mats.eyeDark, pale: mats.eyePale, window: mats.eyeWindow }))
  pivot.add(blade)

  pivot.position.set(spec.base[0], spec.base[1], spec.base[2] * side)
  pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(spec.spread)) + THREE.MathUtils.degToRad(spec.sweep ?? 0)
  pivot.rotation.x = side * THREE.MathUtils.degToRad(spec.tilt ?? 0)
  pivot.scale.z = side

  const tipLocal = new THREE.Vector3(spec.length * 0.95, 0, 0)
  return { pivot, blade, tipLocal }
}

// ---------------------------------------------------------------- 建模主体

export function buildSilkMoth(): InsectModel {
  const g = new THREE.Group()

  const bodyMat = chitin({ color: '#5c3d22', gloss: 0.32, clearcoat: 0.08, surface: 'velvet' }) // B轮绒面组：全身是绒的，躯干加绒面
  const fuzzMat = chitin({ color: '#8a6236', gloss: 0.1 })
  const legMat = chitin({ color: '#4a3018', gloss: 0.3, clearcoat: 0.1 })
  const antennaMat = chitin({ color: '#2e1c10', gloss: 0.45, clearcoat: 0.18 })

  const wingMats: WingMats = {
    face: chitin({ color: '#b8843f', gloss: 0.2, clearcoat: 0.04, side: THREE.DoubleSide, surface: 'velvet' }), // B轮绒面组：翅面底材质加绒面
    vein: chitin({ color: '#3a2312', gloss: 0.18, side: THREE.DoubleSide }),
    border: chitin({ color: '#5c3418', gloss: 0.2, side: THREE.DoubleSide }),
    eyeDark: chitin({ color: '#241408', gloss: 0.3 }),
    eyePale: chitin({ color: '#e8d9a0', gloss: 0.35 }),
    eyeWindow: membrane('#cfe0e8', 0.22),
  }

  // ---- 头 / 胸 / 腹：胸部粗壮蓬松，腹部厚重收细
  const head = new THREE.Mesh(spindle([1.3, 0.1, 0], [1.55, 0.13, 0], 0.19, { bulge: 0.5, taperStart: 0.8, taperEnd: 0.45 }), bodyMat)
  g.add(head)

  const thoraxCenter = new THREE.Vector3(0.82, 0.13, 0)
  const thorax = new THREE.Mesh(spindle([0.35, 0.02, 0], [1.32, 0.09, 0], 0.42, { bulge: 0.48, flat: 1.05, taperStart: 0.5, taperEnd: 0.62 }), bodyMat)
  g.add(thorax)
  g.add(thoraxFuzz(thoraxCenter, new THREE.Vector3(0.4, 0.4, 0.36), 158, fuzzMat))

  const abdomenFrom = new THREE.Vector3(0.3, -0.03, 0)
  const abdomenTo = new THREE.Vector3(-1.7, 0.03, 0)
  g.add(
    new THREE.Mesh(
      segmentedAbdomen({
        from: [abdomenFrom.x, abdomenFrom.y, abdomenFrom.z],
        to: [abdomenTo.x, abdomenTo.y, abdomenTo.z],
        r0: 0.33,
        r1: 0.04,
        segments: 7,
        groove: 0.17,
        bulge: 0.24,
      }),
      bodyMat,
    ),
  )

  // ---- 复眼：存在但不作为鉴别重点（本种不出 eye anchor，出 eyespot）
  g.add(compoundEyePair({ at: [1.48, 0.16, 0.13], radius: 0.1, color: '#1c1006', flatten: 0.9, stretch: 1.0 }))

  // ---- 口器完全退化：不建喙

  // ---- 巨大的雄蛾羽状触角：segments 提到 20，让栉齿数量显著多于默认值
  const antBase: [number, number, number] = [1.5, 0.2, 0.11]
  const antLength = 1.0
  const antPitch = 26
  const antYaw = 32
  const antennae = antennaPair({ base: antBase, length: antLength, kind: 'pectinate', pitch: antPitch, yaw: antYaw, thickness: 0.028, segments: 20 }, antennaMat)
  antennae.name = 'antennae'
  g.add(antennae)

  // ---- 两对翅：宽大厚重，近乎纯侧展 + 屋顶略下垂，各生一枚眼斑
  const foreOutline: [number, number][] = [
    [0, 0.1],
    [0.08, 0.5],
    [0.2, 0.82],
    [0.38, 0.98],
    [0.58, 1.0],
    [0.78, 0.86],
    [0.92, 0.56],
    [1, 0.18],
  ]
  const hindOutline: [number, number][] = [
    [0, 0.14],
    [0.14, 0.6],
    [0.32, 0.92],
    [0.52, 1.0],
    [0.72, 0.94],
    [0.88, 0.68],
    [1, 0.3],
  ]

  const foreSpec: WingSpec = {
    base: [0.95, 0.2, 0.22],
    length: 5.8,
    width: 4.4,
    outline: foreOutline,
    spread: 270 + 0 - 84, // φ=84：近乎纯侧展
    tilt: 14, // 正值：翅尖略垂的浅屋顶，与蝶类的负值上举相反
    sweep: 0,
    thickness: 0.02,
  }
  const hindSpec: WingSpec = {
    base: [0.5, 0.13, 0.18],
    length: 4.6,
    width: 4.8,
    outline: hindOutline,
    spread: 270 + 8 - 78, // φ=78：略收在前翅之下
    tilt: 18,
    sweep: 8,
    thickness: 0.02,
  }

  let foreRight: WingAssembly | null = null
  let hindRight: WingAssembly | null = null
  for (const side of [1, -1] as const) {
    const fw = buildWing(foreSpec, wingMats, 10, [foreSpec.length * 0.54, 0.15], foreSpec.width * 0.2, side)
    const hw = buildWing(hindSpec, wingMats, 9, [hindSpec.length * 0.5, -0.05], hindSpec.width * 0.2, side)
    g.add(fw.pivot, hw.pivot)
    if (side === 1) {
      foreRight = fw
      hindRight = hw
    }
  }

  // ---- 六足：粗壮带绒毛感（材质哑光而非高光泽体现绒毛质感），无特化结构
  g.add(legPair({ base: [1.15, -0.05, 0.24], femur: 0.36, tibia: 0.34, thickness: 0.042, splay: 30, sweep: -26, knee: 70 }, legMat))
  g.add(legPair({ base: [0.7, -0.1, 0.3], femur: 0.4, tibia: 0.4, thickness: 0.044, splay: 32, sweep: 6, knee: 72 }, legMat))
  g.add(legPair({ base: [0.3, -0.12, 0.28], femur: 0.42, tibia: 0.44, thickness: 0.046, splay: 30, sweep: 36, knee: 74 }, legMat))

  // ---- anchor
  g.updateMatrixWorld(true)
  const forewingTip = foreRight!.blade.localToWorld(foreRight!.tipLocal.clone())
  const hindwingTip = hindRight!.blade.localToWorld(hindRight!.tipLocal.clone())
  const eyespotWorld = foreRight!.blade.localToWorld(new THREE.Vector3(foreSpec.length * 0.54, 0, 0.15))

  const antPitchRad = THREE.MathUtils.degToRad(antPitch)
  const antYawRad = THREE.MathUtils.degToRad(antYaw)
  const antDir = new THREE.Vector3(Math.cos(antPitchRad) * Math.cos(antYawRad), Math.sin(antPitchRad), Math.cos(antPitchRad) * Math.sin(antYawRad))
  const antennaTip = new THREE.Vector3(...antBase)
    .addScaledVector(antDir, antLength)
    .add(new THREE.Vector3(0, -antLength * 0.12, antLength * 0.12))

  const anchors: Record<string, THREE.Vector3> = {
    eyespot: eyespotWorld,
    antenna: antennaTip,
    forewing: forewingTip,
    hindwing: hindwingTip,
    thorax: thoraxCenter.clone(),
    abdomen: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.4).add(new THREE.Vector3(0, 0.12, 0)),
  }

  return finalize(g, anchors)
}
