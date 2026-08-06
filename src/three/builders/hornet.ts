/**
 * 金环胡蜂 Vespa mandarinia
 *
 * 造型要点：
 * - 巨大的橙黄色头部配一对发达黑色大颚：kit.mandibles() 只给出大颚主体
 *   的钳状造型，不含内缘的咬合齿。本文件复刻 mandibles() 内部的路径
 *   公式（不改 kit.ts，做法与 ant.ts 处理蚁科大颚齿一致），在内缘采样
 *   三个点各加一枚尖齿，做出"能咬碎蜜蜂"的粗壮带齿观感。
 * - 腹部橙黄与深褐相间的宽环带：不是贴图，是六段各自独立放样、交替
 *   上两种材质的圆台拼接而成（同 honeybee.ts 的分节上色思路，本文件
 *   自写一份，环带比例更宽、色块更少更醒目，符合"比蜜蜂条纹更宽更
 *   鲜明"的要求）。每段命名为 `abdomen-segment`，供测试直接清点分节数
 *   与材质种类，而不是回头重算一遍构造参数。
 * - 明显的细腰：胸部与腹部之间插入一段半径远小于两端的短管（腰节，
 *   膜翅目细腰亚目 Apocrita 的定义特征），做法参考 ant.ts 的腹柄节处理，
 *   但胡蜂的腰比蚂蚁粗短，不做蚁科那种针状腰。
 * - 长而直的螫针：不同于 honeybee.ts 里工蜂那根短而弯、藏在腹端的螫针，
 *   本文件把它做得更长更直，明显探出腹部末端之外。
 * - 两对膜翅半透明带琥珀色调，姿态是"向后侧方展开"的飞行预备姿——
 *   本种翅长明显小于题目给出的"超过 3 单位才需要自写翅脉"的阈值，
 *   直接用 kit.wingPair() + kit.wingVeins() 默认翅脉即可，不必另写。
 * - 头顶三枚单眼（ocelli）+ 大复眼；胸部绒毛比蜜蜂稀疏（约 70 根 vs
 *   蜜蜂的 170 根）。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  loft,
  mandibles,
  membrane,
  ocelli,
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
 * 分节上色的腹部：逐节独立放样，每节前段鼓起、末端略收（环沟），交替
 * 填两种材质。环带比例（groove、每节鼓包幅度）比 honeybee.ts 的版本更宽
 * 更粗放，符合金环胡蜂"更宽更鲜明"的环带观感。每段 mesh 命名
 * `abdomen-segment` 供测试清点。
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
  const matA = chitin({ color: opts.colorA, gloss: 0.5, clearcoat: 0.22 })
  const matB = chitin({ color: opts.colorB, gloss: 0.55, clearcoat: 0.26 })
  for (let s = 0; s < opts.segments; s++) {
    const t0 = s / opts.segments
    const t1 = (s + 1) / opts.segments
    const p0 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t0)
    const p1 = new THREE.Vector3().lerpVectors(opts.from, opts.to, t1)
    const rStart = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t0))
    const rBulge = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep((t0 + t1) / 2)) * 1.1
    const rEnd = THREE.MathUtils.lerp(opts.r0, opts.r1, smoothstep(t1)) * (1 - opts.groove)
    const sections: Section[] = [
      { at: p0, ry: Math.max(rStart, 1e-4), rz: Math.max(rStart, 1e-4) },
      { at: new THREE.Vector3().lerpVectors(p0, p1, 0.5), ry: Math.max(rBulge, 1e-4), rz: Math.max(rBulge, 1e-4) },
      { at: p1, ry: Math.max(rEnd, 1e-4), rz: Math.max(rEnd, 1e-4) },
    ]
    const mesh = new THREE.Mesh(loft(sections, 22), s % 2 === 0 ? matA : matB)
    mesh.name = 'abdomen-segment'
    g.add(mesh)
  }
  return g
}

/** 复刻 kit.mandibles() 内部的路径公式，用于在大颚内缘精确采样加齿的位置（不改 kit.ts）。 */
function mandiblePoint(at: [number, number, number], length: number, spread: number, curve: number, side: 1 | -1, t: number): THREE.Vector3 {
  const base = new THREE.Vector3(at[0], at[1], at[2] * side)
  return base.add(
    new THREE.Vector3(length * t, -length * 0.12 * t, side * length * spread * (1 - t) * (1 - t) - side * length * curve * t * t * 0.5),
  )
}

/** 稀疏胸部绒毛：做法同 honeybee.ts 的 thoraxFuzz，本文件自写一份、数量更少。 */
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
    const len = 0.03 + 0.018 * (jitter - Math.floor(jitter))
    const hair = new THREE.Mesh(new THREE.ConeGeometry(0.007, len, 5), material)
    hair.position.copy(p).addScaledVector(n, len * 0.45)
    hair.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n)
    g.add(hair)
  }
  return g
}

// ---------------------------------------------------------------- 建模主体

export function buildHornet(): InsectModel {
  const g = new THREE.Group()

  const headMat = chitin({ color: '#e8901c', gloss: 0.5, clearcoat: 0.26 })
  const mandibleMat = chitin({ color: '#171310', gloss: 0.7, clearcoat: 0.4 })
  const thoraxMat = chitin({ color: '#2a1c12', gloss: 0.48, clearcoat: 0.22 })
  const waistMat = chitin({ color: '#241610', gloss: 0.5, clearcoat: 0.24 })
  const legMat = chitin({ color: '#241812', gloss: 0.42, clearcoat: 0.18 })
  const antennaMat = chitin({ color: '#201510', gloss: 0.4, clearcoat: 0.16 })
  const stingerMat = chitin({ color: '#120d0a', gloss: 0.72, clearcoat: 0.42 })
  const fuzzMat = chitin({ color: '#3a2a1c', gloss: 0.12 })
  const veinMat = chitin({ color: '#3a2712', gloss: 0.28, side: THREE.DoubleSide })
  const ocelliMat = chitin({ color: '#c0392b', gloss: 0.75, clearcoat: 0.5 })

  // ---- 头部：巨大橙黄。taperStart=0.67 精确对接胸部 taperEnd=0.72 处的半径
  // （0.43×0.67≈0.4×0.72≈0.29），两段网格在头胸交界处不留台阶。
  const head = new THREE.Mesh(
    spindle([1.5, 0.1, 0], [2.06, 0.16, 0], 0.43, { bulge: 0.42, flat: 1.05, taperStart: 0.67, taperEnd: 0.5, steps: 20 }),
    headMat,
  )
  g.add(head)

  // ---- 胸部：厚实块状。taperStart=0.5 处对接细腰（见下方 waist 的 r=0.16），
  // taperEnd=0.72 处对接头部 taperStart，两端各自平滑过渡到相邻部件。
  const thorax = new THREE.Mesh(
    spindle([0.56, 0.06, 0], [1.5, 0.14, 0], 0.4, { bulge: 0.5, flat: 1.0, taperStart: 0.5, taperEnd: 0.72, steps: 18 }),
    thoraxMat,
  )
  g.add(thorax)
  g.add(thoraxFuzz(new THREE.Vector3(1.0, 0.16, 0), new THREE.Vector3(0.38, 0.3, 0.32), 70, fuzzMat))

  // ---- 细腰：胸腹之间收细的短管，膜翅目"细腰亚目"的定义特征
  const waistFrom = new THREE.Vector3(0.56, 0.07, 0)
  const waistTo = new THREE.Vector3(0.36, 0.08, 0)
  g.add(
    new THREE.Mesh(
      loft(
        [
          { at: waistFrom, ry: 0.16, rz: 0.16 },
          { at: new THREE.Vector3().lerpVectors(waistFrom, waistTo, 0.5), ry: 0.1, rz: 0.1 },
          { at: waistTo, ry: 0.14, rz: 0.14 },
        ],
        20,
      ),
      waistMat,
    ),
  )
  const waistCenter = new THREE.Vector3().lerpVectors(waistFrom, waistTo, 0.5)

  // ---- 腹部：橙黄与深褐相间的宽环带，六节
  const abdomenFrom = new THREE.Vector3(0.36, 0.08, 0)
  const abdomenTo = new THREE.Vector3(-1.55, 0.02, 0)
  g.add(
    bandedAbdomen({
      from: abdomenFrom,
      to: abdomenTo,
      r0: 0.35,
      r1: 0.06,
      segments: 6,
      groove: 0.2,
      colorA: '#e8901c',
      colorB: '#301f13',
    }),
  )

  // ---- 长而直的螫针：明显探出腹端
  const stingerBase = abdomenTo.clone()
  const stingerTip = stingerBase.clone().add(new THREE.Vector3(-0.62, -0.03, 0))
  const venomSac = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), stingerMat)
  venomSac.position.copy(stingerBase).add(new THREE.Vector3(-0.03, -0.01, 0))
  g.add(venomSac)
  g.add(
    new THREE.Mesh(
      loft(
        [
          { at: stingerBase, ry: 0.058, rz: 0.058 },
          { at: new THREE.Vector3().lerpVectors(stingerBase, stingerTip, 0.6), ry: 0.026, rz: 0.026 },
          { at: stingerTip, ry: 0.004, rz: 0.004 },
        ],
        12,
      ),
      stingerMat,
    ),
  )

  // ---- 大颚：粗壮带齿
  const mandibleAt: [number, number, number] = [1.98, 0.06, 0.15]
  const mandibleLen = 0.46
  const mandibleSpread = 0.36
  const mandibleCurve = 0.55
  g.add(mandibles({ at: mandibleAt, length: mandibleLen, spread: mandibleSpread, curve: mandibleCurve }, mandibleMat))
  for (const side of [1, -1] as const) {
    for (const t of [0.32, 0.52, 0.72]) {
      const p = mandiblePoint(mandibleAt, mandibleLen, mandibleSpread, mandibleCurve, side, t)
      const tip = p.clone().add(new THREE.Vector3(0.01, -0.035, -side * 0.06))
      g.add(new THREE.Mesh(loft([{ at: p, ry: 0.02, rz: 0.02 }, { at: tip, ry: 0.003, rz: 0.003 }], 8), mandibleMat))
    }
  }

  // ---- 复眼 + 头顶三枚单眼
  const eyeAt: [number, number, number] = [1.92, 0.17, 0.33]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.27, color: '#171012', flatten: 0.85, stretch: 1.02, facets: true }))
  g.add(ocelli([1.85, 0.34, 0], 0.045, 0.16, ocelliMat))

  // ---- 膝状触角
  const antBase: [number, number, number] = [1.98, 0.2, 0.16]
  const antLength = 0.66
  const antPitch = 12
  const antYaw = 32
  g.add(antennaPair({ base: antBase, length: antLength, kind: 'geniculate', pitch: antPitch, yaw: antYaw, thickness: 0.026 }, antennaMat))

  // ---- 两对膜翅：半透明琥珀色调，向后侧方展开的飞行预备姿态。
  // 翅长 1.6~2.3，远小于题目给出的"超过 3 才需自写翅脉"阈值，
  // 直接用 kit.wingPair() + 默认 wingVeins() 即可。
  // spread 推导同 honeybee.ts：spread = 270+sweep−φ，φ=0 收拢贴尾，φ=90 完全侧展。
  const foreWingLength = 2.3
  const foreWings = wingPair(
    { base: [1.1, 0.22, 0.32], length: foreWingLength, width: 1.05, spread: 270 + 8 - 76, tilt: -6, sweep: 8, thickness: 0.012 },
    membrane('#e0b878', 0.34),
    veinMat,
    7,
  )
  g.add(foreWings)
  g.add(
    wingPair(
      { base: [0.75, 0.16, 0.28], length: 1.6, width: 0.75, spread: 270 + 12 - 68, tilt: -4, sweep: 12, thickness: 0.012 },
      membrane('#e0b878', 0.34),
      veinMat,
      6,
    ),
  )

  // ---- 三对足：粗壮，前足带刺
  g.add(legPair({ base: [1.5, -0.1, 0.3], femur: 0.55, tibia: 0.5, thickness: 0.05, splay: 30, sweep: -30, knee: 74, spines: true }, legMat))
  g.add(legPair({ base: [1.0, -0.14, 0.34], femur: 0.6, tibia: 0.56, thickness: 0.052, splay: 32, sweep: 6, knee: 76 }, legMat))
  g.add(legPair({ base: [0.55, -0.14, 0.32], femur: 0.64, tibia: 0.62, thickness: 0.055, splay: 30, sweep: 38, knee: 78 }, legMat))

  // ---- anchor
  g.updateMatrixWorld(true)
  const foreRightPivot = foreWings.children[0] as THREE.Group
  const foreRightBlade = foreRightPivot.children[0] as THREE.Group
  const wingTip = foreRightBlade.localToWorld(new THREE.Vector3(foreWingLength * 0.9, 0, 0))

  const antPitchRad = THREE.MathUtils.degToRad(antPitch)
  const antYawRad = THREE.MathUtils.degToRad(antYaw)
  const elbow = new THREE.Vector3(...antBase).addScaledVector(
    new THREE.Vector3(Math.cos(antPitchRad) * Math.cos(antYawRad), Math.sin(antPitchRad), Math.cos(antPitchRad) * Math.sin(antYawRad)),
    antLength * 0.45,
  )
  const dir2 = new THREE.Vector3(Math.cos(antYawRad * 1.8), -0.18, Math.sin(antYawRad * 1.8)).normalize()
  const antennaTip = elbow.addScaledVector(dir2, antLength * 0.55)

  const mandibleTip = mandiblePoint(mandibleAt, mandibleLen, mandibleSpread, mandibleCurve, 1, 1)

  const anchors: Record<string, THREE.Vector3> = {
    mandible: mandibleTip,
    sting: stingerTip,
    wing: wingTip,
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2] + 0.27),
    antenna: antennaTip,
    waist: waistCenter,
  }

  return finalize(g, anchors)
}
