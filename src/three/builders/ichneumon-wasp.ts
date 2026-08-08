/**
 * 姬蜂 Megarhyssa sp.（膜翅目姬蜂科 Ichneumonidae）
 *
 * 造型要点：
 * - 产卵器是本物种存在的全部理由，必须是绝对视觉主角：从腹部末端向后
 *   伸出三根独立的细丝——中间一根是真正的产卵管（细而深色），两侧两根
 *   是包裹保护它的鞘（略粗）。真实的 Megarhyssa 靠这根针隔着几厘米厚
 *   的树皮把卵精确产入树干深处的天牛幼虫隧道——这也是为什么它必须
 *   又长又直又细：越直越省力地传递腹部肌肉产生的钻探压力，越细才能
 *   刺穿致密木质部而不折断。本文件里三根丝各自独立 loft，命名统一为
 *   `ovipositor-strand`，供测试直接清点数量而不是回头重算一遍构造
 *   参数；x(t) 与参数 t 成正比，因此每根丝的包围盒 X 尺寸精确等于其
 *   length 参数，测试量包围盒即可拿到真实跨度，不需要另外解析式还原
 *   路径。
 * - 细腰 + 细长纺锤形腹部：膜翅目细腰亚目 Apocrita 的腰做法沿用
 *   hornet.ts 的三截面收细短管思路，但本种腰更细（最窄处半径仅
 *   0.032，约为金环胡蜂同一部位的三分之一）——姬蜂整体纤细，不像
 *   胡蜂那样需要腰部支撑猛烈缠斗时的扭矩。腹部延续 hornet.ts /
 *   dragonfly.ts 的分节上色技法（逐节独立放样、交替材质做出环纹），
 *   但改用"前段轻微鼓起、此后单调收尖至近乎一点"的包络（借用
 *   dragonfly.ts envelope() 的思路），让腹部末端能与产卵器无缝相接，
 *   而不是像金环胡蜂那样收在一个圆钝的螫针基座上。
 * - 体色黄褐与黑相间的横纹：腹部沿用上面的分节交替材质；头、胸则用
 *   单一材质区分黄褐（头）与深色（胸），不做逐节渐变，符合姬蜂
 *   "头胸色块简单、腹部环纹密集"的真实观感。
 * - 两对狭长膜翅：kit.wingGeometry() 默认轮廓偏卵圆，本文件自定义
 *   一个更窄的 slimOutline（各控制点半宽都比默认值小），配合较大的
 *   长宽比做出"狭长"感。翅长 2.0~2.6，远小于题目给出的"超过 3 单位
 *   才需自写翅脉"阈值，直接用 kit.wingPair() 默认翅脉即可。姿态推导
 *   同 hornet.ts：spread = 270+sweep−φ，取中等偏大的 φ 做出"向后
 *   侧方展开"的飞行预备姿，而不是收拢贴背。
 * - 长丝状触角向前上方伸展，做法与 lacewing.ts 一致（filiform 触角
 *   的末梢下垂公式在两文件里各自独立复刻自 kit.antenna()，未导出
 *   共享，因为 kit.ts 是只读文件）。
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
  wingPair,
  type InsectModel,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/**
 * 分节上色的细长腹部：前 bulge 比例内轻微鼓起，此后单调收尖到 r1
 * （取接近 0 的值，好让产卵器从这一点无缝续接）。逐节独立放样、
 * 交替填两种材质做出环纹。每段命名 `trunk`，供测试与头、胸、腰
 * 一起量出"头到腹末"的躯干长度——本物种的 anchors 里没有单独的
 * head/abdomen 锚点，只能靠命名 mesh 的合并包围盒反推。
 */
function bandedAbdomen(opts: {
  from: THREE.Vector3
  to: THREE.Vector3
  r0: number
  r1: number
  segments: number
  groove: number
  bulge?: number
  colorA: THREE.ColorRepresentation
  colorB: THREE.ColorRepresentation
}): THREE.Group {
  const g = new THREE.Group()
  const matA = chitin({ color: opts.colorA, gloss: 0.46, clearcoat: 0.18 })
  const matB = chitin({ color: opts.colorB, gloss: 0.56, clearcoat: 0.3 })
  const bulge = opts.bulge ?? 0.22
  const envelope = (t: number): number => {
    if (t < bulge) return THREE.MathUtils.lerp(opts.r0 * 0.86, opts.r0, smoothstep(t / bulge))
    return THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep((t - bulge) / (1 - bulge)))
  }
  for (let s = 0; s < opts.segments; s++) {
    const t0 = s / opts.segments
    const t1 = (s + 1) / opts.segments
    const p0 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t0)
    const p1 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t1)
    const rStart = envelope(t0)
    const rBulge = envelope((t0 + t1) / 2) * 1.05
    const rEnd = envelope(t1) * (1 - opts.groove)
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart, 1e-4), rz: Math.max(rStart, 1e-4) },
      { at: new THREE.Vector3().lerpVectors(p0, p1, 0.5), ry: Math.max(rBulge, 1e-4), rz: Math.max(rBulge, 1e-4) },
      { at: p1, ry: Math.max(rEnd, 1e-4), rz: Math.max(rEnd, 1e-4) },
    ]
    const mesh = new THREE.Mesh(loft(sections, 18), s % 2 === 0 ? matA : matB)
    mesh.name = 'trunk'
    g.add(mesh)
  }
  return g
}

/**
 * 产卵器的一根丝：从腹部末端几乎笔直向后拖曳，只在最后一段（t 的三次
 * 方权重）才明显下垂。x(t) 与 t 成正比，因此一根丝的包围盒 X 尺寸
 * 精确等于 `length` 参数——测试直接量 `ovipositor-strand` 命名 mesh
 * 的包围盒即可拿到真实跨度。
 */
function ovipositorStrand(
  opts: {
    base: THREE.Vector3
    zOffset: number
    length: number
    droop: number
    r0: number
    r1: number
  },
  material: THREE.Material,
): THREE.Mesh {
  const steps = 10
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = opts.base.x - opts.length * t
    const y = opts.base.y - opts.droop * t * t * t
    const z = opts.base.z + opts.zOffset * (1 - 0.25 * t)
    const r = THREE.MathUtils.lerp(opts.r0, opts.r1, t)
    sections.push({ at: new THREE.Vector3(x, y, z), ry: Math.max(r, 1e-4), rz: Math.max(r, 1e-4) })
  }
  const mesh = new THREE.Mesh(loft(sections, 8), material)
  mesh.name = 'ovipositor-strand'
  return mesh
}

// ---------------------------------------------------------------- 建模主体

export function buildIchneumonWasp(): InsectModel {
  const g = new THREE.Group()

  const headMat = chitin({ color: '#c48a3a', gloss: 0.5, clearcoat: 0.24 })
  const darkMat = chitin({ color: '#241708', gloss: 0.5, clearcoat: 0.22 })
  const legMat = chitin({ color: '#b8823c', gloss: 0.42, clearcoat: 0.1 })
  const antennaMat = chitin({ color: '#2a1c10', gloss: 0.38 })
  // B 轮翅膜虹彩组：掠射角轻虹彩，产卵器（sheathMat/trueOvipositorMat）不动
  const wingFaceMat = membrane('#ecdfc0', 0.26, { iridescent: true })
  const veinMat = chitin({ color: '#4a3520', gloss: 0.3, side: THREE.DoubleSide })
  const sheathMat = chitin({ color: '#171006', gloss: 0.62, clearcoat: 0.3 })
  const trueOvipositorMat = chitin({ color: '#0f0a03', gloss: 0.55 })

  // ---- 头：黄褐色。taperStart=0.63 精确对接胸部 taperEnd=0.5 处的半径
  // （0.15×0.63≈0.19×0.5≈0.095），头胸交界不留台阶。
  const head = new THREE.Mesh(
    spindle([1.35, 0.06, 0], [1.85, 0.09, 0], 0.15, { bulge: 0.4, flat: 1.05, taperStart: 0.63, taperEnd: 0.4, steps: 16 }),
    headMat,
  )
  head.name = 'trunk'
  g.add(head)

  // ---- 胸：深色。taperStart=0.35 对接细腰前端（见下方 waistFrom 半径
  // 0.066），taperEnd=0.5 对接头部 taperStart 处的半径。
  const thorax = new THREE.Mesh(
    spindle([0.56, 0.02, 0], [1.35, 0.06, 0], 0.19, { bulge: 0.45, flat: 1.0, taperStart: 0.35, taperEnd: 0.5, steps: 16 }),
    darkMat,
  )
  thorax.name = 'trunk'
  g.add(thorax)

  // ---- 极细的腰：胸腹间的短管，最窄处半径仅 0.032——约为 hornet.ts
  // 同一部位（0.1）的三分之一，姬蜂整体纤细，腰不必承受胡蜂那种
  // 缠斗扭矩。
  const waistFrom = new THREE.Vector3(0.56, 0.0, 0)
  const waistTo = new THREE.Vector3(0.4, -0.01, 0)
  const waist = new THREE.Mesh(
    loft(
      [
        { at: waistFrom, ry: 0.066, rz: 0.066 },
        { at: new THREE.Vector3().lerpVectors(waistFrom, waistTo, 0.5), ry: 0.032, rz: 0.032 },
        { at: waistTo, ry: 0.078, rz: 0.078 },
      ],
      18,
    ),
    darkMat,
  )
  waist.name = 'trunk'
  g.add(waist)
  const waistCenter = new THREE.Vector3().lerpVectors(waistFrom, waistTo, 0.5)

  // ---- 腹部：细长纺锤形，黄褐/深色相间八节，末端收尖到近乎一点，
  // 与产卵器无缝相接。
  const abdomenFrom = waistTo.clone()
  const abdomenTo = new THREE.Vector3(-1.85, -0.07, 0)
  g.add(
    bandedAbdomen({
      from: abdomenFrom,
      to: abdomenTo,
      r0: 0.115,
      r1: 0.012,
      segments: 8,
      groove: 0.15,
      colorA: '#c48a3a',
      colorB: '#221407',
    }),
  )

  // ---- 产卵器：绝对主角。三根独立细丝从腹末几乎笔直向后拖出，
  // 中间一根（trueOvipositorMat）是真正的产卵管，两侧两根（sheathMat）
  // 是保护鞘，略粗。长度取躯干长度（头至腹末≈3.7）的 2.6 倍，留出
  // 安全边际满足"≥2.0 倍"的要求，也贴近 Megarhyssa 产卵器可达体长
  // 数倍、绝对长度 10cm+ 的真实比例。
  const ovipositorLength = 9.6
  const ovipositorDroop = 0.55
  g.add(
    ovipositorStrand(
      { base: abdomenTo, zOffset: 0, length: ovipositorLength, droop: ovipositorDroop, r0: 0.01, r1: 0.004 },
      trueOvipositorMat,
    ),
  )
  g.add(
    ovipositorStrand(
      { base: abdomenTo, zOffset: 0.045, length: ovipositorLength, droop: ovipositorDroop, r0: 0.013, r1: 0.006 },
      sheathMat,
    ),
  )
  g.add(
    ovipositorStrand(
      { base: abdomenTo, zOffset: -0.045, length: ovipositorLength, droop: ovipositorDroop, r0: 0.013, r1: 0.006 },
      sheathMat,
    ),
  )
  const ovipositorTip = new THREE.Vector3(abdomenTo.x - ovipositorLength, abdomenTo.y - ovipositorDroop, abdomenTo.z)

  // ---- 复眼
  const eyeAt: [number, number, number] = [1.72, 0.115, 0.09]
  const eyeRadius = 0.055
  g.add(compoundEyePair({ at: eyeAt, radius: eyeRadius, color: '#3a1c12', flatten: 0.85, stretch: 1.0, facets: true }))

  // ---- 长丝状触角，向前上方伸并微微弯曲
  const antBase: [number, number, number] = [1.83, 0.15, 0.055]
  const antLength = 1.3
  const antPitch = 34
  const antYaw = 22
  g.add(
    antennaPair({ base: antBase, length: antLength, kind: 'filiform', pitch: antPitch, yaw: antYaw, thickness: 0.017 }, antennaMat),
  )

  // ---- 两对狭长膜翅，向后侧方展开。轮廓比默认更窄，翅长 2.0~2.6
  // 远小于"超过 3 单位才需自写翅脉"的阈值，直接用默认 wingVeins()。
  // spread 推导同 hornet.ts：spread = 270+sweep−φ。
  const slimOutline: [number, number][] = [
    [0, 0.14],
    [0.12, 0.42],
    [0.3, 0.58],
    [0.55, 0.62],
    [0.78, 0.5],
    [0.92, 0.32],
    [1, 0.1],
  ]
  const foreWingLength = 2.6
  const foreWings = wingPair(
    {
      base: [0.82, 0.14, 0.11],
      length: foreWingLength,
      width: 0.62,
      outline: slimOutline,
      spread: 270 + 6 - 70,
      tilt: -5,
      sweep: 6,
      thickness: 0.01,
    },
    wingFaceMat,
    veinMat,
    7,
  )
  g.add(foreWings)
  g.add(
    wingPair(
      {
        base: [0.58, 0.11, 0.09],
        length: 2.0,
        width: 0.5,
        outline: slimOutline,
        spread: 270 + 10 - 62,
        tilt: -3,
        sweep: 10,
        thickness: 0.01,
      },
      wingFaceMat,
      veinMat,
      6,
    ),
  )

  // ---- 三对细长足，黄褐色
  g.add(legPair({ base: [1.1, -0.08, 0.12], femur: 0.42, tibia: 0.4, thickness: 0.026, splay: 26, sweep: -26, knee: 68 }, legMat))
  const legMid = {
    base: [0.85, -0.09, 0.14] as [number, number, number],
    femur: 0.46,
    tibia: 0.44,
    thickness: 0.027,
    splay: 28,
    sweep: 8,
    knee: 70,
  }
  g.add(legPair(legMid, legMat))
  g.add(legPair({ base: [0.6, -0.09, 0.13], femur: 0.5, tibia: 0.48, thickness: 0.028, splay: 26, sweep: 36, knee: 72 }, legMat))

  // ---- anchor
  g.updateMatrixWorld(true)
  const foreRightPivot = foreWings.children[0] as THREE.Group
  const foreRightBlade = foreRightPivot.children[0] as THREE.Group
  const wingTip = foreRightBlade.localToWorld(new THREE.Vector3(foreWingLength * 0.9, 0, 0))

  const antPitchRad = THREE.MathUtils.degToRad(antPitch)
  const antYawRad = THREE.MathUtils.degToRad(antYaw)
  const antDir = new THREE.Vector3(Math.cos(antPitchRad) * Math.cos(antYawRad), Math.sin(antPitchRad), Math.cos(antPitchRad) * Math.sin(antYawRad))
  const antennaTip = new THREE.Vector3(...antBase)
    .addScaledVector(antDir, antLength)
    .add(new THREE.Vector3(0, -antLength * 0.35, antLength * 0.12))

  const anchors: Record<string, THREE.Vector3> = {
    ovipositor: ovipositorTip,
    antenna: antennaTip,
    wing: wingTip,
    waist: waistCenter,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + eyeRadius),
    leg: new THREE.Vector3(legMid.base[0], legMid.base[1] - 0.12, legMid.base[2] + 0.1),
  }

  return finalize(g, anchors)
}
