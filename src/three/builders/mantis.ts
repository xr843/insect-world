/**
 * 中华大刀螳 Tenodera sinensis
 *
 * 造型要点：
 * - 捕捉足（前足）：螳螂目的灵魂器官。kit.leg() 只会生成"膝盖朝一个方向弯"的
 *   直腿，无法表达螳螂前足那种"腿节前伸、胫节反折扣回来"的折刀式关节，
 *   因此完全自建（见下方 raptorialLeg）。腿节内缘的长短相间刺列是螳螂
 *   钳住猎物的关键结构，也一并做出来。
 * - 前胸（pronotum）被极度拉长成一根细杆，几乎占体长三分之一——这是螳螂
 *   "脖子"的由来，也是它能像潜望镜一样转头巡视的解剖基础。
 * - 头呈倒三角：不是靠雕出三角形的头壳，而是靠"头壳本身很小、两颗大复眼
 *   顶在头的两个上后角"这个组合关系——复眼才是撑起倒三角轮廓的主体。
 * - 中足、后足纤细，只负责站立支撑，把身体撑离地面、让腹部悬空。
 * - 前翅（覆翅）折叠贴在腹背、指向体后而非侧展摊平，末端略窄，紧贴腹部
 *   背面，也不会盖住已经折叠在头下方的捕捉足。
 * - 通体草绿，刺与关节膜带一点黄褐，是这类拟态草叶的螳螂常见的配色过渡。
 *
 * ⚠️ 实现笔记：本文件的站立腿（中足/后足）没有使用 kit.legPair()，
 * 而是用 leg() + mirrorZ() 自己配对。实测 legPair() 在 base 做 z 取反的
 * 同时又对整条腿 scale.z = -1，两次镜像叠加后，左右腿的基节几乎落在
 * 同一侧（差值只有 splay/sweep 带来的一点点偏移），腿尖却各自甩向两侧，
 * 效果是"一对腿从同一个点前后叉开"而不是"左右对称站立"。leg() 直接
 * 用正 z 建模一侧、再交给 mirrorZ() 整体镜像，两侧腿严格轴对称，
 * 站姿更可信。此现象与 kit.ts 本身有关，未改动 kit.ts。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  leg,
  loft,
  mirrorZ,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type SegmentedAbdomenOptions,
  spindle,
  wingPair,
  type InsectModel,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/** 两点间直筒/圆锥放样：关节段之间足够用直段表达，不需要弯曲采样 */
function tube(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, material: THREE.Material, radial = 14): THREE.Mesh {
  return new THREE.Mesh(loft([{ at: a, ry: r0, rz: r0 }, { at: b, ry: r1, rz: r1 }], radial), material)
}

/** 沿一串点放样、半径按点逐一指定：给弯曲路径（镰刀胫节、拱起的前胸）用 */
function tubeShape(points: THREE.Vector3[], radii: number[], material: THREE.Material, radial = 14): THREE.Mesh {
  const sections: Section[] = points.map((p, i) => ({ at: p, ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

function jointSphere(p: THREE.Vector3, r: number, material: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material)
  m.position.copy(p)
  return m
}

function quadBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, t: number): THREE.Vector3 {
  return p0.clone().lerp(p1, t).lerp(p1.clone().lerp(p2, t), t)
}

/**
 * 捕捉足（一侧）：基节 → 极长的腿节（内缘刺列）→ 反折回来的镰刀状胫节。
 * 只建 base.z 为正的一侧，调用处用 mirrorZ() 复制出另一侧。
 */
function raptorialLeg(base: THREE.Vector3, material: THREE.Material, spineMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()

  // 基节(coxa)：短粗，把整条捕捉足从前胸端部撑起、略向外抬升
  const coxaLen = 0.38
  const coxaDir = new THREE.Vector3(0.3, 0.6, 0.5).normalize()
  const coxaTip = base.clone().addScaledVector(coxaDir, coxaLen)
  g.add(tube(base, coxaTip, 0.15, 0.13, material))
  g.add(jointSphere(base, 0.16, material))

  // 腿节(femur)：捕捉足中最长最粗壮的一节，向前方伸出并微微上扬——
  // 这是"举起前臂"祈祷姿态的主体，也是螳螂前足力量的来源
  const femurLen = 2.15
  const femurDir = new THREE.Vector3(0.92, 0.32, -0.08).normalize()
  const femurTip = coxaTip.clone().addScaledVector(femurDir, femurLen)
  g.add(tube(coxaTip, femurTip, 0.135, 0.062, material))
  g.add(jointSphere(coxaTip, 0.145, material))

  // 腹侧方向：垂直于腿节走向、指向身体腹面一侧——内缘刺列与
  // 胫节折入的凹槽都朝这一侧展开
  const ventral = new THREE.Vector3(0, -1, 0)
    .addScaledVector(femurDir, -new THREE.Vector3(0, -1, 0).dot(femurDir))
    .normalize()

  // 内缘刺列：7 枚，长短相间，捕猎时扎入并卡住猎物体壁
  const spineCount = 7
  for (let i = 0; i < spineCount; i++) {
    const t = 0.12 + (i / (spineCount - 1)) * 0.8
    const p = coxaTip.clone().lerp(femurTip, t)
    const long = i % 2 === 0
    const len = long ? 0.2 : 0.115
    const tip = p.clone().addScaledVector(ventral, len).addScaledVector(femurDir, -len * 0.35)
    g.add(tubeShape([p, tip], [0.026, 0.003], spineMat, 7))
  }

  // 胫节(tibia)：镰刀状，从腿节末端弧形反折回来，扣进内缘刺列的凹槽，
  // 末端收成尖钩——用一条二次贝塞尔弯出这个反折，比直段折线更像"镰刀"
  const tibiaLen = 1.7
  const ctrl = femurTip.clone().addScaledVector(femurDir, tibiaLen * 0.42).addScaledVector(ventral, tibiaLen * 0.62)
  const hookTip = femurTip.clone().addScaledVector(femurDir, -tibiaLen * 0.55).addScaledVector(ventral, tibiaLen * 0.2)
  const steps = 18
  const path: THREE.Vector3[] = []
  const radii: number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(quadBezier(femurTip, ctrl, hookTip, t))
    radii.push(THREE.MathUtils.lerp(0.088, 0.006, Math.pow(t, 0.8)))
  }
  g.add(tubeShape(path, radii, material))
  g.add(jointSphere(femurTip, 0.094, material))

  g.userData.femurTip = femurTip
  return g
}

// ---------------------------------------------------------------- 主体

export function buildMantis(): InsectModel {
  const g = new THREE.Group()

  const bodyColor = '#7d9455' // 草绿：拟态植物的保护色主调
  const abdomenColor = '#899a5c' // 腹部略偏黄绿，与胸背区分层次
  const tanColor = '#c2a862' // 关节膜、刺、复眼的黄褐过渡

  const bodyMat = chitin({ color: bodyColor, gloss: 0.5, clearcoat: 0.25 })
  const abdomenMat = chitin({ color: abdomenColor, gloss: 0.4, clearcoat: 0.15 })
  const legMat = chitin({ color: bodyColor, gloss: 0.45, clearcoat: 0.2 })
  const raptorialMat = chitin({ color: '#6f8a4a', gloss: 0.55, clearcoat: 0.32 })
  const spineMat = chitin({ color: tanColor, gloss: 0.3 })
  const wingMat = chitin({ color: '#63793f', gloss: 0.6, clearcoat: 0.4 })
  const veinMat = chitin({ color: '#4f6533', gloss: 0.35 })
  const antennaMat = chitin({ color: tanColor, gloss: 0.35 })

  // ---- 沿体轴的关键分段坐标（+X 向前）
  const mouthX = 4.55
  const headBaseX = 4.15
  const prothoraxFrontX = headBaseX
  const prothoraxBackX = 1.3
  const thoraxFrontX = prothoraxBackX
  const thoraxBackX = 0.4
  const abdomenFrontX = thoraxBackX
  const abdomenTipX = -4.05

  /**
   * 螳螂静止时不是趴着的：中后胸与腹部由中后足撑在支撑面上，
   * 拉长的前胸从那里向前上方斜举，头因此高出腹部一大截，
   * 两把捕捉足悬在抬起的前胸下方待发。少了这个仰角，
   * 再准确的部件也只会读成「一根横躺的绿枝」。
   * 这里取约 36° 仰角（前胸水平跨 2.85、升高 2.05）。
   */
  const prothoraxRise = 2.05
  const prothoraxSlope = prothoraxRise / (prothoraxFrontX - prothoraxBackX)
  const prothoraxBackY = 0.5
  /** 前胸中轴在某个 x 处的高度 */
  const prothoraxY = (x: number) => prothoraxBackY + (x - prothoraxBackX) * prothoraxSlope
  const headY = prothoraxY(headBaseX)

  // ---- 头部：倒三角轮廓——头壳本身只是个小的收尖楔形，
  // 真正撑起"倒三角"的是顶在两个上后角的大复眼。
  // 口器略向下前方，是螳螂俯视猎物时的姿态
  const head = new THREE.Mesh(
    spindle([headBaseX, headY, 0], [mouthX, headY + 0.16, 0], 0.26, { bulge: 0.18, flat: 1.35, taperStart: 0.55, taperEnd: 0.04 }),
    bodyMat,
  )
  g.add(head)

  // ---- 复眼：位于头两侧的上后角，facets 出小眼面颗粒；颜色带黄褐，
  // 而非甲虫式的纯黑，更符合活体螳螂複眼常见的浅棕/浅绿观感
  const eyeAt: [number, number, number] = [headBaseX + 0.07, headY + 0.2, 0.3]
  g.add(compoundEyePair({ at: eyeAt, radius: 0.2, color: '#cbb98a', flatten: 0.8, stretch: 1.15, facets: true }))

  // ---- 丝状触角：细长下垂，螳螂用它探测气流与猎物
  g.add(antennaPair({ base: [mouthX - 0.1, headY + 0.2, 0.12], length: 1.7, kind: 'filiform', pitch: 18, yaw: 36, thickness: 0.017 }, antennaMat))

  // ---- 前胸：极度拉长的一根细杆，占体长近三分之一，向前上方斜举并微微上拱，
  // 靠近头端细、靠近中后胸端稍粗（为前足基节提供附着的肌肉团）
  const prothoraxPts = [
    new THREE.Vector3(prothoraxFrontX, prothoraxY(prothoraxFrontX), 0),
    new THREE.Vector3(3.35, prothoraxY(3.35) + 0.06, 0),
    new THREE.Vector3(2.2, prothoraxY(2.2) + 0.05, 0),
    new THREE.Vector3(prothoraxBackX, prothoraxBackY, 0),
  ]
  g.add(tubeShape(prothoraxPts, [0.165, 0.15, 0.155, 0.24], bodyMat, 18))

  // ---- 中后胸：短而粗壮的一段，翅与中足、后足都从这里长出
  const thorax = new THREE.Mesh(
    spindle([thoraxFrontX, 0.48, 0], [thoraxBackX, 0.5, 0], 0.4, { bulge: 0.35, flat: 1.05, taperStart: 0.62, taperEnd: 0.72 }),
    bodyMat,
  )
  g.add(thorax)

  // ---- 腹部：分节，左右略扁（背腹压扁），基部粗、向后收细成尖
  const mantisAbdomenOpts: SegmentedAbdomenOptions = {
    from: [abdomenFrontX, 0.46, 0],
    to: [abdomenTipX, 0.05, 0],
    r0: 0.32,
    r1: 0.04,
    segments: 8,
    groove: 0.18,
    flat: 1.35,
    bulge: 0.22,
  }
  const mantisAbdomenMesh = new THREE.Mesh(segmentedAbdomen(mantisAbdomenOpts), abdomenMat)
  mantisAbdomenMesh.add(...segmentedAbdomenMembranes(mantisAbdomenOpts))
  g.add(mantisAbdomenMesh)

  // ---- 捕捉足：胸前"祈祷"折叠。base 靠近前胸最前端，紧贴头后，
  // 两侧腿节前伸时天然带一点向内收拢的趋势，形成"双手合十"的观感
  // 着生在抬起的前胸腹面靠前处，两把刀因此悬在头的下前方
  const raptorialBase = new THREE.Vector3(3.7, prothoraxY(3.7) - 0.22, 0.2)
  g.add(mirrorZ(raptorialLeg(raptorialBase.clone(), raptorialMat, spineMat)))

  // ---- 中足、后足：纤细，只负责站立支撑。用 leg()+mirrorZ() 而非
  // legPair()（原因见文件头注释），保证左右腿严格对称
  const midLegSpec = { base: [1.0, 0.28, 0.35] as [number, number, number], femur: 0.95, tibia: 1.1, thickness: 0.042, splay: 28, sweep: 6, knee: 66, ankle: 55, spines: true }
  const hindLegSpec = { base: [0.45, 0.24, 0.36] as [number, number, number], femur: 1.1, tibia: 1.3, thickness: 0.042, splay: 25, sweep: 38, knee: 70, ankle: 52, spines: true }
  g.add(mirrorZ(leg(midLegSpec, legMat)))
  g.add(mirrorZ(leg(hindLegSpec, legMat)))

  // ---- 覆翅：收拢贴在腹背，几乎完全沿体轴向后收起，紧贴腹部背面。
  // 实测 kit.wing() 的 spread/sweep 语义与它自己的注释相反：spread 越
  // 小反而甩得越向体侧（越"平展"），要让翅"沿体轴收拢"必须
  // spread≈90 且 sweep≈180（把翅从"朝头部方向伸出"整体掉头指向尾部）。
  // 这里再从 90/180 各留一点点偏移，做出收拢时残留的自然展角。
  g.add(
    wingPair(
      {
        base: [0.7, 0.62, 0.16],
        length: 3.5,
        width: 0.66,
        outline: [
          [0, 0.14],
          [0.15, 0.4],
          [0.4, 0.46],
          [0.7, 0.34],
          [0.9, 0.18],
          [1, 0.04],
        ],
        spread: 86,
        sweep: 179,
        tilt: 5,
        thickness: 0.018,
      },
      wingMat,
      veinMat,
      5,
    ),
  )

  const anchors: Record<string, THREE.Vector3> = {
    raptorialLeg: raptorialBase.clone().add(new THREE.Vector3(1.7, 0.7, 0.5)),
    head: new THREE.Vector3(4.35, headY + 0.24, 0),
    eye: new THREE.Vector3(eyeAt[0], eyeAt[1], eyeAt[2]),
    wing: new THREE.Vector3(-1.1, 0.72, 0.25),
    abdomen: new THREE.Vector3(-2.2, 0.28, 0),
    prothorax: new THREE.Vector3(2.7, prothoraxY(2.7) + 0.16, 0),
  }

  return finalize(g, anchors)
}
