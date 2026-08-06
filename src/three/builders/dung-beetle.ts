/**
 * 神农洁蜣螂 Catharsius molossus（鞘翅目·金龟总科·蜣螂亚科）
 *
 * 造型要点：
 * - 唇基特化成扁平宽阔的半圆铲：蜣螂推粪球、切割粪块全靠头部前缘
 *   这片扁平构造，因此必须比头部本身更宽、更薄，边缘再挂几枚齿突
 *   （挖掘/切割刃口）。spindle() 只能收出两端尖或钝的旋转体，撑不出
 *   「前宽后窄贴合头部、边缘带齿」的铲形，因此改用 ExtrudeGeometry
 *   现画半圆轮廓——沿用 kit.wingGeometry() 同一手法：先在 shape 局部
 *   (x,y) 里画好轮廓，再 rotateX(90°) 摊平，只是这里的轮廓是半圆
 *   （absarc 半径弧 + 直边收口）而不是翅形卵圆。
 * - 前足特化成开掘足：胫节粗短，外缘 3~4 枚粗齿像耙齿，与中后足的
 *   细长形成强烈对比。kit.leg() 的 spines 选项只给出细小的通用刺，
 *   撑不出「粗大耙齿」的量感，因此本文件自己复刻 leg() 内部的
 *   关节点公式（kit 不对外暴露胫节两端点，只给 knee/tip）单独推算
 *   胫节起止点，据此挂上更大更少的自定义齿突。
 * - 雄虫头顶一支短粗、末端不分叉、向后弯的角——区别于独角仙那种
 *   细长分叉的角。前胸背板前缘另有一道横脊。
 * - 体形又宽又厚、近乎方正：taperStart/taperEnd 都调得比锹甲/独角仙
 *   高（两端不收尖），鞘翅隆起但不拉长，读成敦实的块状卵圆。
 * - 通体乌黑，clearcoat 压得比独角仙/锹甲都低——蜣螂表壳偏哑光，
 *   不是吉丁那种镜面光泽。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  elytra,
  finalize,
  leg,
  legPair,
  loft,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部工具

/**
 * 唇基铲：头部前缘扁平宽阔的半圆铲状构造，边缘带齿突。
 * 局部 shape 坐标 (x,y) 按 kit.wingGeometry 的约定摊平：
 * rotateX(90°) 后 x→世界 X（前凸方向）、y→世界 Z（左右宽度）、
 * 挤出厚度→世界 Y（扁平的薄）。半圆弧 absarc(-90°→90°) 让弧背朝
 * +X（铲的刃口向前），直边留在 x=0（贴头部的一侧）。
 */
function clypeusShovel(center: THREE.Vector3, radius: number, thickness: number, material: THREE.Material): THREE.Mesh {
  const shape = new THREE.Shape()
  shape.moveTo(0, -radius)
  shape.absarc(0, 0, radius, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(0, -radius)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelSize: thickness * 0.3,
    bevelThickness: thickness * 0.22,
    bevelSegments: 2,
    curveSegments: 26,
  })
  geo.rotateX(Math.PI / 2)
  geo.translate(center.x, center.y + thickness / 2, center.z)
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = 'clypeus'
  return mesh
}

/** 铲缘齿突：沿半圆弧在若干角度挂小齿，方向沿半径向外，做出切割刃口的观感 */
function clypeusTeeth(center: THREE.Vector3, radius: number, thickness: number, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const angles = [-52, -26, 0, 26, 52]
  for (const deg of angles) {
    const a = THREE.MathUtils.degToRad(deg)
    const rim = new THREE.Vector3(center.x + radius * Math.cos(a), center.y + thickness * 0.55, center.z + radius * Math.sin(a))
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
    const tip = rim.clone().addScaledVector(dir, radius * 0.2)
    g.add(
      new THREE.Mesh(
        loft([{ at: rim, ry: thickness * 0.6, rz: thickness * 0.6 }, { at: tip, ry: 0.005, rz: 0.005 }], 8),
        material,
      ),
    )
  }
  return g
}

/** 头顶短角：末端不分叉，随高度增长逐渐向后（−X）勾，比独角仙的角短而粗 */
function stubHorn(base: THREE.Vector3, length: number, thickness: number, pitchDeg: number, curve: number, material: THREE.Material): THREE.Mesh {
  const pitch = THREE.MathUtils.degToRad(pitchDeg)
  const steps = 14
  const path: THREE.Vector3[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    path.push(new THREE.Vector3(base.x - curve * length * t * t, base.y + Math.sin(pitch) * length * t, base.z))
  }
  const sections: Section[] = path.map((p, i) => {
    const t = i / steps
    const r = thickness * (1 - t * 0.68)
    return { at: p, ry: r, rz: r * 0.86 }
  })
  return new THREE.Mesh(loft(sections, 16), material)
}

/**
 * 开掘前足：在 kit.leg() 的基础上另挂 3~4 枚粗齿。kit 不暴露胫节的
 * 起止点（只有 knee 与 tip），因此这里照抄 leg() 内部算 kneePt/
 * anklePt 的公式重新推一遍，只用于定位齿突，不影响 leg() 生成的
 * 网格本身。镜像沿用 kit.legPair() 的方案（右腿原样 clone 一份、
 * 整体 scale.z=-1），不用「翻 base.z」那种已知会穿模的写法。
 */
function forelegWithTeeth(spec: LegSpec, material: THREE.Material, toothMaterial: THREE.Material, toothCount: number): THREE.Group {
  const g = new THREE.Group()
  const right = leg(spec, material)

  const splay = THREE.MathUtils.degToRad(spec.splay)
  const sweep = THREE.MathUtils.degToRad(spec.sweep)
  const knee = THREE.MathUtils.degToRad(spec.knee ?? 70)
  const base = new THREE.Vector3(...spec.base)
  const dirFemur = new THREE.Vector3(
    Math.sin(sweep) * Math.cos(splay) * -1,
    Math.sin(splay) * 0.35 + 0.25,
    Math.cos(sweep) * Math.cos(splay),
  ).normalize()
  const kneePt = base.clone().addScaledVector(dirFemur, spec.femur)
  const down = new THREE.Vector3(0, -1, 0)
  const dirTibia = dirFemur.clone().lerp(down, Math.sin(knee) * 0.85).normalize()
  const anklePt = kneePt.clone().addScaledVector(dirTibia, spec.tibia)

  const tibiaDir = new THREE.Vector3().subVectors(anklePt, kneePt).normalize()
  let outward = new THREE.Vector3().crossVectors(tibiaDir, new THREE.Vector3(1, 0, 0))
  if (outward.lengthSq() < 1e-6) outward = new THREE.Vector3(0, 0, 1)
  outward.normalize()
  if (outward.z < 0) outward.negate() // 右腿的「外缘」是 +Z 一侧

  const th = spec.thickness ?? 0.055
  for (let i = 0; i < toothCount; i++) {
    const t = 0.16 + (i / (toothCount - 1)) * 0.68 // 分布在胫节中段，避开两端关节球
    const p = kneePt.clone().lerp(anklePt, t)
    const toothLen = th * 2.1
    const tip = p.clone().addScaledVector(outward, toothLen).addScaledVector(tibiaDir, toothLen * 0.22)
    const tooth = new THREE.Mesh(
      loft([{ at: p, ry: th * 0.5, rz: th * 0.5 }, { at: tip, ry: 0.006, rz: 0.006 }], 8),
      toothMaterial,
    )
    tooth.name = 'foreleg-tooth'
    right.add(tooth)
  }

  g.add(right)
  const left = right.clone()
  left.scale.z = -1
  g.add(left)
  return g
}

// ---------------------------------------------------------------- 主体

export function buildDungBeetle(): InsectModel {
  const g = new THREE.Group()

  // 通体乌黑，clearcoat 压得比独角仙(0.34)/锹甲(0.55上限)都低——
  // 蜣螂表壳偏哑光微光，不是吉丁那种镜面。
  const bodyMat = chitin({ color: '#0b0b0c', gloss: 0.42, clearcoat: 0.22 })
  const shellMat = elytra('#111113', 0.16)
  const hornMat = chitin({ color: '#0a0a0b', gloss: 0.55, clearcoat: 0.38 })
  const legMat = chitin({ color: '#0b0b0c', gloss: 0.4, clearcoat: 0.2 })
  const toothMat = chitin({ color: '#050506', gloss: 0.46, clearcoat: 0.26 })

  // ---- 腹面体躯：taperStart 明显比独角仙(0.12)/锹甲(0.12)高，
  // 尾部不收尖，读成敦实的块状而非纺锤
  const belly = new THREE.Mesh(
    spindle([-1.25, 0.02, 0], [0.85, 0.08, 0], 1.02, { bulge: 0.44, flat: 1.18, taperStart: 0.34, taperEnd: 0.55 }),
    bodyMat,
  )
  belly.name = 'trunk'
  g.add(belly)

  // ---- 鞘翅：宽阔高隆起，两片靠拢合读成一个卵圆背甲
  const eSteps = 22
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.48) * Math.PI * 0.88) * 1.05
    elytronSections.push({
      at: new THREE.Vector3(0.6 - 2.15 * t, 0.58 - 0.2 * t * t, 0),
      ry: Math.max(w * 0.7, 0.02),
      rz: Math.max(w * 0.58, 0.02),
    })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 26), shellMat)
    shell.position.z = side * 0.3
    shell.scale.set(1, 1.1, 1.02)
    shell.name = 'elytra'
    g.add(shell)
  }

  // ---- 小盾片
  const scutellum = new THREE.Mesh(
    spindle([0.62, 0.68, 0], [0.2, 0.62, 0], 0.22, { bulge: 0.15, flat: 1.3, taperStart: 0.9, taperEnd: 0.05 }),
    bodyMat,
  )
  g.add(scutellum)

  // ---- 前胸背板：宽厚方正，前缘另加一道横脊
  const pronotum = new THREE.Mesh(
    spindle([0.48, 0.14, 0], [1.5, 0.26, 0], 0.82, { bulge: 0.55, flat: 1.16, taperStart: 0.76, taperEnd: 0.52 }),
    bodyMat,
  )
  pronotum.scale.set(1, 0.95, 1)
  pronotum.name = 'trunk'
  g.add(pronotum)

  const ridgeSteps = 14
  const ridgeSections: Section[] = []
  for (let i = 0; i <= ridgeSteps; i++) {
    const t = i / ridgeSteps
    const z = THREE.MathUtils.lerp(-0.56, 0.56, t)
    const bump = 1 - Math.pow(2 * t - 1, 2)
    ridgeSections.push({ at: new THREE.Vector3(1.36, 0.5, z), ry: 0.05 * (0.4 + 0.6 * bump), rz: 0.045 })
  }
  g.add(new THREE.Mesh(loft(ridgeSections, 10), bodyMat))

  // ---- 头部
  const head = new THREE.Mesh(
    spindle([1.42, 0.2, 0], [1.86, 0.24, 0], 0.4, { bulge: 0.4, flat: 1.02, taperStart: 0.7, taperEnd: 0.3 }),
    bodyMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 唇基铲：半径明显大于头部半径（头部 rz 峰值 ≈0.4×1.02≈0.41，
  // 铲半径 0.56 → Z 向宽度 1.12，是头部宽度 0.82 的 1.37 倍），
  // 边缘挂 5 枚齿突
  const clypeusCenter = new THREE.Vector3(1.86, 0.26, 0)
  const clypeusRadius = 0.56
  const clypeusThickness = 0.12
  g.add(clypeusShovel(clypeusCenter, clypeusRadius, clypeusThickness, bodyMat))
  g.add(clypeusTeeth(clypeusCenter, clypeusRadius, clypeusThickness, toothMat))

  // ---- 头顶短粗角：向后弯，不分叉，靠近头胸交界（真实蜣螂角从
  // 头后部/近前胸处生出，弧线拱向后方甚至可越过前胸背板上方）
  g.add(stubHorn(new THREE.Vector3(1.52, 0.46, 0), 0.75, 0.16, 58, 0.45, hornMat))

  // ---- 复眼：被头部侧缘分割的小复眼
  g.add(
    compoundEyePair({
      at: [1.62, 0.3, 0.34],
      radius: 0.1,
      color: '#0a0708',
      flatten: 0.85,
      facets: true,
    }),
  )

  // ---- 鳃叶状触角（金龟总科通用特征）——仅作视觉补全，无对应 anchor
  g.add(
    antennaPair(
      { base: [1.68, 0.22, 0.2], length: 0.36, kind: 'lamellate', pitch: -8, yaw: 32, thickness: 0.032 },
      legMat,
    ),
  )

  // ---- 前足：短粗，胫节外缘 4 枚粗齿（挖掘用）。forelegWithTeeth
  // 内部结构与 legPair 一致：children[0] 是未镜像的右腿，
  // userData.tip 是 kit.leg() 直接暴露的跗节尖端。
  const forelegSpec: LegSpec = { base: [1.28, -0.08, 0.62], femur: 0.6, tibia: 0.56, tarsus: 0.16, thickness: 0.13, splay: 40, sweep: -34, knee: 68 }
  const forelegRig = forelegWithTeeth(forelegSpec, legMat, toothMat, 4)
  g.add(forelegRig)
  const forelegTip = (forelegRig.children[0] as THREE.Group).userData.tip as THREE.Vector3

  // ---- 中足、后足：明显更细长，与前足形成对比
  g.add(legPair({ base: [0.32, -0.14, 0.66], femur: 0.78, tibia: 0.86, thickness: 0.09, splay: 30, sweep: 6, knee: 76, spines: true }, legMat))
  g.add(legPair({ base: [-0.55, -0.14, 0.6], femur: 0.9, tibia: 1.05, thickness: 0.095, splay: 26, sweep: 42, knee: 80, spines: true }, legMat))

  const anchors: Record<string, THREE.Vector3> = {
    clypeus: new THREE.Vector3(2.36, 0.32, 0),
    foreleg: forelegTip.clone(),
    elytra: new THREE.Vector3(-0.5, 0.9, 0.46),
    horn: new THREE.Vector3(1.18, 1.08, 0),
    eye: new THREE.Vector3(1.68, 0.36, 0.4),
    pronotum: new THREE.Vector3(1.0, 0.86, 0),
  }

  return finalize(g, anchors)
}
