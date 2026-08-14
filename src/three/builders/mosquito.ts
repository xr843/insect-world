/**
 * 淡色库蚊 Culex pipiens pallens（双翅目 蚊科，雌虫 —— 第 7 轮「日常昆虫」补编之一）
 *
 * 造型要点：
 * - 招牌是雌虫的**细长刺吸喙**：一根几乎笔直的针管从头前伸出，微垂。
 *   长度 = 头 + 胸的总长（0.24），**上下限都钉住**（0.2~0.29）——
 *   本项目天蛾的喙曾因只给下限长成三倍体长的标枪，这里绝不重演。
 *   name='proboscis'，测试量真实网格的长度比。
 * - 「淡色」的种名由来：**腹节基部的淡色横带**。腹部按节放样，每节
 *   基段换浅色材质（name='pale-band'），主段深褐，明度差真的拉开
 *   （第 5 轮教训：压深一档 ≠ 越深越保险）。
 * - 停歇姿态：体轴与停面大致平行（库蚊属特征，区别于按蚊的翘尾）——
 *   头、胸、腹的中心线几乎等高，整个躯干水平悬在六条高跷腿上。
 * - 六足极细长：借 crane-fly 的近共线三段式（膝角 ~150°），但比大蚊
 *   收敛（单腿伸展 ≈ 1.2~1.6 倍体长），name='mosquitoLeg'。
 * - 雌虫触角具稀疏轮毛：细丝主干上每节一圈 4 根短毛（雄蚊是浓密
 *   羽毛状，雌蚊稀疏——做雌虫就要克制）。含微动钩子。
 * - 一对狭长翅（长宽比 ~4.3）平覆在腹背上方 + 一对平衡棒。
 *
 * 坐标：+X 前，+Y 上，+Z 右；1 单位 = 1cm，体长约 0.5（4–5mm，不含喙）。
 */
import * as THREE from 'three'
import {
  chitin,
  compoundEyePair,
  finalize,
  loft,
  membrane,
  mirrorZ,
  spindle,
  wingGeometry,
  type InsectModel,
  type Section,
  type WingSpec,
} from './kit'
import { venation } from './venation'

// ---------------------------------------------------------------- 局部辅助

/** 两点间圆锥放样段 */
function tube(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, material: THREE.Material, radial = 8): THREE.Mesh {
  return new THREE.Mesh(loft([{ at: a, ry: r0, rz: r0 }, { at: b, ry: r1, rz: r1 }], radial), material)
}

/**
 * 蚊足：三段近共线（股节斜向外上、胫节折向外下、跗节长而低平），
 * 端到端伸展 ≈ 0.6~0.75（体长 0.5 的 1.2~1.5 倍）。组 name='mosquitoLeg'。
 */
function mosquitoLeg(spec: { base: [number, number, number]; kx: number; scale?: number }, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'mosquitoLeg'
  const s = spec.scale ?? 1
  const base = new THREE.Vector3(...spec.base)
  const dirFemur = new THREE.Vector3(spec.kx * 0.55, 0.42, 0.9).normalize()
  const dirTibia = new THREE.Vector3(spec.kx * 0.6, -0.5, 0.85).normalize()
  const dirTarsus = new THREE.Vector3(spec.kx * 0.65, -0.28, 0.9).normalize()
  const kneePt = base.clone().addScaledVector(dirFemur, 0.21 * s)
  const anklePt = kneePt.clone().addScaledVector(dirTibia, 0.24 * s)
  const tipPt = anklePt.clone().addScaledVector(dirTarsus, 0.25 * s)
  g.add(tube(base, kneePt, 0.0068, 0.0052, material))
  g.add(tube(kneePt, anklePt, 0.005, 0.0035, material))
  g.add(tube(anklePt, tipPt, 0.0032, 0.0014, material))
  for (const [p, r] of [
    [base, 0.008],
    [kneePt, 0.0058],
    [anklePt, 0.004],
  ] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), material)
    j.position.copy(p)
    g.add(j)
  }
  g.userData.knee = kneePt
  return g
}

/**
 * 雌蚊触角：细丝主干微弯下垂，每节一圈稀疏短轮毛（4 根）。
 * name='antenna' + userData.base（微动钩子），毛 name='whorl-hair'。
 */
function pilousAntenna(base: THREE.Vector3, side: 1 | -1, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  g.name = 'antenna'
  g.userData.base = [base.x, base.y, base.z * side]
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const len = 0.17
  const dir = new THREE.Vector3(0.82, 0.18, side * 0.5).normalize()
  const path: THREE.Vector3[] = []
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(b.clone().addScaledVector(dir, len * t).add(new THREE.Vector3(0, -t * t * len * 0.28, 0)))
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = 0.0038 * (1 - t * 0.6)
    return { at: p, ry: r, rz: r }
  })
  g.add(new THREE.Mesh(loft(sections, 8), mat))
  // 稀疏轮毛：5 个节点，每节 4 根，短而细
  for (let n = 1; n <= 5; n++) {
    const t = n / 6
    const p = path[Math.round(t * steps)]
    const fwd = dir
    for (let h = 0; h < 4; h++) {
      const a = (h / 4) * Math.PI * 2 + n * 0.7
      const radial = new THREE.Vector3(0, Math.cos(a), Math.sin(a))
      radial.sub(fwd.clone().multiplyScalar(radial.dot(fwd))).normalize()
      const hairLen = 0.022 * (1 - t * 0.35)
      const tip = p.clone().addScaledVector(radial, hairLen).addScaledVector(fwd, hairLen * 0.3)
      const hair = new THREE.Mesh(loft([{ at: p, ry: 0.0012, rz: 0.0012 }, { at: tip, ry: 0.0004, rz: 0.0004 }], 5), mat)
      hair.name = 'whorl-hair'
      g.add(hair)
    }
  }
  return g
}

/** 平衡棒 */
function haltere(base: THREE.Vector3, side: 1 | -1, mat: THREE.Material, ballMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const b = new THREE.Vector3(base.x, base.y, base.z * side)
  const dir = new THREE.Vector3(-0.5, 0.15, side * 0.85).normalize()
  const tip = b.clone().addScaledVector(dir, 0.05)
  const stalk = new THREE.Mesh(loft([{ at: b, ry: 0.004, rz: 0.004 }, { at: tip, ry: 0.0028, rz: 0.0028 }], 8), mat)
  stalk.name = 'haltere'
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), ballMat)
  ball.position.copy(tip)
  ball.name = 'haltere'
  g.add(stalk, ball)
  g.userData.ball = tip
  return g
}

// ---------------------------------------------------------------- 主体

export function buildMosquito(): InsectModel {
  const g = new THREE.Group()

  // 淡褐色系；淡色横带与主节的明度差按 ladybird 亮度基准真拉开
  const thoraxMat = chitin({ color: '#8a6f4e', gloss: 0.38, clearcoat: 0.08 })
  const headMat = chitin({ color: '#77603f', gloss: 0.35 })
  const segMat = chitin({ color: '#6b5236', gloss: 0.4, clearcoat: 0.1 }) // 腹节主段深褐
  const bandMat = chitin({ color: '#d9c49a', gloss: 0.35 }) // 基部淡色横带
  const legMat = chitin({ color: '#5c4a35', gloss: 0.3 })
  const proboscisMat = chitin({ color: '#2c2520', gloss: 0.4 })
  const palpMat = chitin({ color: '#4c3d2c', gloss: 0.3 })
  const haltereMat = chitin({ color: '#c0a876', gloss: 0.4 })
  const wingFaceMat = membrane('#e7e2d6', 0.22, { iridescent: true, iridescenceStrength: 0.18 })
  const veinMat = chitin({ color: '#43382a', gloss: 0.3, side: THREE.DoubleSide })

  // ---- 头：小球形，大半被复眼覆盖
  {
    const head = new THREE.Mesh(spindle([0.17, 0.05, 0], [0.255, 0.06, 0], 0.045, { bulge: 0.5, taperStart: 0.55, taperEnd: 0.5 }), headMat)
    head.name = 'head'
    g.add(head)
  }
  g.add(compoundEyePair({ at: [0.225, 0.06, 0.028], radius: 0.026, color: '#1d1712', flatten: 0.9, stretch: 1.05 }))

  // ---- 招牌：细长刺吸喙。长度 0.24 = 头(0.09) + 胸(0.15)，上下限 [0.2, 0.29]
  const proboscisBase = new THREE.Vector3(0.25, 0.038, 0)
  const proboscisLen = 0.24
  const proboscisDir = new THREE.Vector3(0.97, -0.24, 0).normalize()
  {
    const sections: Section[] = []
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const at = proboscisBase.clone().addScaledVector(proboscisDir, proboscisLen * t).add(new THREE.Vector3(0, -t * t * 0.012, 0))
      const r = 0.0085 * (1 - t * 0.45)
      sections.push({ at, ry: r, rz: r })
    }
    const p = new THREE.Mesh(loft(sections, 10), proboscisMat)
    p.name = 'proboscis'
    g.add(p)
    // 端部唇瓣微膨
    const lab = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 6), proboscisMat)
    lab.position.copy(proboscisBase).addScaledVector(proboscisDir, proboscisLen).add(new THREE.Vector3(0, -0.012, 0))
    lab.scale.set(1.6, 0.8, 0.8)
    lab.name = 'proboscis'
    g.add(lab)
  }
  // 下颚须：雌虫短须，贴在喙基两侧
  for (const side of [1, -1] as const) {
    const pb = new THREE.Vector3(0.25, 0.045, side * 0.012)
    const pt = pb.clone().add(new THREE.Vector3(0.055, -0.008, side * 0.006))
    g.add(tube(pb, pt, 0.004, 0.002, palpMat))
  }

  // ---- 雌虫触角：稀疏轮毛
  const antBase = new THREE.Vector3(0.245, 0.075, 0.014)
  g.add(pilousAntenna(antBase, 1, headMat), pilousAntenna(antBase, -1, headMat))

  // ---- 胸：微拱的小丘（蚊背峰不高，远低于食蚜蝇）
  {
    const thorax = new THREE.Mesh(spindle([0.03, 0.03, 0], [0.19, 0.045, 0], 0.062, { bulge: 0.55, flat: 0.92, taperStart: 0.55, taperEnd: 0.6 }), thoraxMat)
    thorax.name = 'thorax'
    g.add(thorax)
  }

  // ---- 腹：细长水平（体轴与停面平行），7 节，每节基部一圈淡色横带
  const abdomenFrom = new THREE.Vector3(0.055, 0.042, 0)
  const abdomenTo = new THREE.Vector3(-0.275, 0.036, 0)
  const abdomenSegments = 7
  {
    const envelope = (t: number) => {
      // 基部 0.042，中段微鼓 0.048，端部收到 0.016（库蚊腹端圆钝不翘）
      if (t < 0.35) return THREE.MathUtils.lerp(0.042, 0.048, t / 0.35)
      return THREE.MathUtils.lerp(0.048, 0.016, (t - 0.35) / 0.65)
    }
    for (let s = 0; s < abdomenSegments; s++) {
      const t0 = s / abdomenSegments
      const t1 = (s + 1) / abdomenSegments
      const bandEnd = THREE.MathUtils.lerp(t0, t1, 0.34) // 基段 34% 是淡色带
      const mk = (ta: number, tb: number, mat: THREE.Material, name: string) => {
        const sections: Section[] = []
        for (let i = 0; i <= 3; i++) {
          const t = THREE.MathUtils.lerp(ta, tb, i / 3)
          const r = Math.max(envelope(t) * (1 - 0.1 * Math.pow(Math.sin(((t - t0) / (t1 - t0)) * Math.PI), 8)), 1e-4)
          sections.push({ at: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, t), ry: r, rz: r * 1.06 })
        }
        const m = new THREE.Mesh(loft(sections, 18), mat)
        m.name = name
        g.add(m)
      }
      mk(t0, bandEnd, bandMat, 'pale-band')
      mk(bandEnd, t1, segMat, 'abdomen-seg')
    }
    // 尾端圆帽：库蚊腹端圆钝（区别于伊蚊的尖尾），盖掉 loft 平切端面
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.0155, 12, 10), segMat)
    cap.position.copy(abdomenTo).add(new THREE.Vector3(0.002, 0, 0))
    cap.scale.set(0.8, 0.95, 1.05)
    cap.name = 'abdomen-seg'
    g.add(cap)
  }

  // ---- 一对狭长翅：停歇时向后收拢、交叠平覆在腹背上，翅尖略越过腹端
  const wingLength = 0.42
  const wingSpec: WingSpec = {
    base: [0.1, 0.095, 0.012],
    length: wingLength,
    width: 0.095,
    outline: [
      [0, 0.14],
      [0.15, 0.5],
      [0.4, 0.85],
      [0.65, 1.0],
      [0.85, 0.75],
      [0.95, 0.42],
      [1, 0.15],
    ],
    spread: 249,
    tilt: -2,
    sweep: 0,
    thickness: 0.004,
  }
  let rightBlade: THREE.Group | null = null
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
      crossDensity: 2,
      veinScale: 0.02,
      material: veinMat,
      name: 'vein',
    })
    if (veins) blade.add(veins)
    pivot.add(blade)
    // 左右翅基高度错开 0.004：交叠平覆时两片膜不打架
    pivot.position.set(wingSpec.base[0], wingSpec.base[1] + (side === 1 ? 0.004 : 0), wingSpec.base[2] * side)
    pivot.rotation.y = side * (Math.PI / 2 - THREE.MathUtils.degToRad(wingSpec.spread)) + THREE.MathUtils.degToRad(wingSpec.sweep ?? 0)
    pivot.rotation.x = side * THREE.MathUtils.degToRad(wingSpec.tilt ?? 0)
    pivot.scale.z = side
    g.add(pivot)
    if (side === 1) rightBlade = blade
  }

  // ---- 平衡棒
  const haltereBase = new THREE.Vector3(0.025, 0.05, 0.05)
  const haltereR = haltere(haltereBase, 1, haltereMat, haltereMat)
  g.add(haltereR, haltere(haltereBase, -1, haltereMat, haltereMat))

  // ---- 六条高跷腿：前对微前伸、中对侧伸、后对长而后蹬
  const midLeg = mosquitoLeg({ base: [0.14, 0.02, 0.045], kx: 0.1 }, legMat)
  g.add(mirrorZ(mosquitoLeg({ base: [0.16, 0.025, 0.04], kx: -0.62, scale: 0.94 }, legMat)))
  g.add(mirrorZ(midLeg))
  g.add(mirrorZ(mosquitoLeg({ base: [0.09, 0.018, 0.045], kx: 0.75, scale: 1.14 }, legMat)))

  // ---- anchors
  g.updateMatrixWorld(true)
  const wingTip = rightBlade!.localToWorld(new THREE.Vector3(wingLength * 0.92, 0, 0))
  const proboscisMid = proboscisBase.clone().addScaledVector(proboscisDir, proboscisLen * 0.66)
  const antennaTip = new THREE.Vector3(antBase.x, antBase.y, antBase.z)
    .addScaledVector(new THREE.Vector3(0.82, 0.18, 0.5).normalize(), 0.14)

  const anchors: Record<string, THREE.Vector3> = {
    proboscis: proboscisMid.add(new THREE.Vector3(0, 0.02, 0)),
    antenna: antennaTip,
    band: new THREE.Vector3().lerpVectors(abdomenFrom, abdomenTo, 0.32).add(new THREE.Vector3(0, 0.05, 0)),
    wing: wingTip,
    leg: (midLeg.userData.knee as THREE.Vector3).clone(),
    haltere: (haltereR.userData.ball as THREE.Vector3).clone(),
  }

  // 取景按躯干 + 喙（≈0.62）而非腿尖包围球（≈0.82）：长腿出画一点，
  // 换 4mm 的小虫在展台上读得清——同 crane-fly 的 frameRadius 先例。
  return finalize(g, anchors, { frameRadius: 0.62 })
}
