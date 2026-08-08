/**
 * 铜绿丽金龟 Anomala corpulenta（丽金龟科）体长 ~2cm
 *
 * 形态学依据与造型要点：
 * - 招牌①均匀的铜绿金属反光：丽金龟科的辨识核心不是斑纹而是「整只一色」的
 *   金属结构色——鞘翅 elytra('#0f3a19', 0.5, {iridescent:true})：铜绿底 +
 *   强虹彩（薄膜干涉随视角在绿-金-紫间流转），与吉丁定标的同类效果；
 *   iridescent 开启时 kit 自动把清漆压到 0.35，铁律不越界。前胸背板/头/
 *   唇基走同色系的高金属 chitin（clearcoat 0.4 < 0.55），腹面与足是铜褐色
 *   （真实铜绿丽金龟腹面即古铜褐）。ACES 铁律：底色 #0f3a19 已压深一档，
 *   金属+虹彩的高光负责把它抬回「铜绿发亮」。
 * - 招牌②阔卵形圆隆轮廓：corpulenta（肥胖之名）——体宽卵圆、背面圆隆，
 *   长宽比控制在 ~1.45（测试钉 1.3~1.6，上下限一起给）：鞘翅宽穹
 *   （halfWidth 0.33 + rz 0.36）、前胸背板横宽（宽 1.22），从背面看
 *   头-前胸-鞘翅连成一个连续的宽卵形，无收腰。
 * - 招牌③鳃叶状触角：金龟总科共有特征，直接用 kit 内建 'lamellate'
 *   （末端 3~4 片可开合的薄片，嗅觉板），kit 自带微动钩子。
 * - 唇基（clypeus）：丽金龟头前缘有一块边缘上翘的扁平半圆板，盖住口器，
 *   是「金龟脸」的关键——用强背腹压扁的 spindle（flat 2.4）做成薄板。
 * - 前足胫节外缘两齿：成虫由土中羽化钻出，前足胫节保留掘土齿。kit.leg()
 *   没有胫节齿参数，故自建：沿右前足 knee→tip 轴取两点、向外前下方伸出
 *   两枚锥齿（加在右腿上、随 mirrorZ 一起镜像）。
 * - 小盾片：鞘翅基部间的三角小片（鞘翅目通用识别点，flower-chafer 先例）。
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
  mirrorZ,
  spindle,
  type InsectModel,
  type LegSpec,
  type Section,
} from './kit'

// ---------------------------------------------------------------- 局部辅助

/**
 * 前足胫节外缘的两枚掘土齿：沿 knee→tip 轴在 f 处取点，向外(+Z)前(-X)
 * 下(-Y)方伸出锥齿。加在右腿组内，mirrorZ 后左腿自动带齿。
 */
function tibialTeeth(legGroup: THREE.Group, material: THREE.Material): void {
  const knee = legGroup.userData.knee as THREE.Vector3 | undefined
  const tip = legGroup.userData.tip as THREE.Vector3 | undefined
  if (!knee || !tip) return
  const axis = new THREE.Vector3().subVectors(tip, knee)
  const segLen = axis.length()
  axis.normalize()
  const outDir = new THREE.Vector3(-0.45, -0.2, 0.85).normalize()
  for (const [f, toothLen] of [
    [0.38, 0.095],
    [0.58, 0.085],
  ] as const) {
    const root = knee.clone().addScaledVector(axis, segLen * f).addScaledVector(outDir, -0.012)
    const toothTip = root.clone().addScaledVector(outDir, toothLen)
    const tooth = new THREE.Mesh(
      loft([{ at: root, ry: 0.03, rz: 0.03 }, { at: toothTip, ry: 0.004, rz: 0.004 }], 8),
      material,
    )
    tooth.name = 'tibia-tooth'
    legGroup.add(tooth)
  }
}

// ---------------------------------------------------------------- 主体

export function buildShiningChafer(): InsectModel {
  const g = new THREE.Group()

  // 招牌①：铜绿底强虹彩（吉丁定标的同类效果），清漆由 kit 自动压 0.35
  const shellMat = elytra('#0f3a19', 0.5, { iridescent: true })
  // 前胸/头/唇基：同色系高金属，微偏暖（真实个体前胸常比鞘翅更泛铜光）
  const noteumMat = chitin({ color: '#123a14', gloss: 0.72, metal: 0.5, clearcoat: 0.4 })
  const bellyMat = chitin({ color: '#241608', gloss: 0.55, metal: 0.3, clearcoat: 0.2 }) // 古铜褐腹面
  const legMat = chitin({ color: '#2a190a', gloss: 0.55, metal: 0.3, clearcoat: 0.2 })
  const antMat = chitin({ color: '#3a2410', gloss: 0.45 })

  const halfWidth = 0.33

  // ---- 腹面体躯：宽卵基底（收在鞘翅轮廓之内）
  g.add(
    new THREE.Mesh(
      spindle([-0.92, -0.02, 0], [0.6, 0.03, 0], 0.48, { bulge: 0.42, flat: 1.4, taperStart: 0.08, taperEnd: 0.6 }),
      bellyMat,
    ),
  )

  // ---- 鞘翅：宽穹圆隆（阔卵形的主体），尾端收圆不收尖
  const eFrom = 0.42
  const eTo = -0.98
  const eSteps = 26
  const elytronSections: Section[] = []
  for (let i = 0; i <= eSteps; i++) {
    const t = i / eSteps
    const w = Math.sin(Math.pow(t, 0.6) * Math.PI * 0.92)
    const c = new THREE.Vector3(THREE.MathUtils.lerp(eFrom, eTo, t), 0.16 - 0.06 * t * t, 0)
    elytronSections.push({ at: c, ry: Math.max(w * 0.38, 0.012), rz: Math.max(w * 0.36, 0.012) })
  }
  for (const side of [1, -1] as const) {
    const shell = new THREE.Mesh(loft(elytronSections, 28), shellMat)
    shell.position.z = side * halfWidth
    shell.name = 'elytra'
    g.add(shell)
  }

  // ---- 小盾片：鞘翅基部间的三角小片
  g.add(
    new THREE.Mesh(
      spindle([0.46, 0.3, 0], [0.32, 0.33, 0], 0.05, { bulge: 0.15, flat: 1.5, taperStart: 0.9, taperEnd: 0.05 }),
      noteumMat,
    ),
  )

  // ---- 前胸背板：横宽（宽 1.22 < 鞘翅 1.38），与鞘翅连成连续宽卵形
  const pronotum = new THREE.Mesh(
    spindle([0.38, 0.1, 0], [0.76, 0.12, 0], 0.42, { bulge: 0.45, flat: 1.45, taperStart: 0.72, taperEnd: 0.55 }),
    noteumMat,
  )
  pronotum.name = 'pronotum'
  g.add(pronotum)

  // ---- 头部：小，半藏于前胸前缘下
  const head = new THREE.Mesh(
    spindle([0.64, 0.1, 0], [0.9, 0.11, 0], 0.22, { bulge: 0.42, flat: 1.5, taperStart: 0.7, taperEnd: 0.5 }),
    noteumMat,
  )
  head.name = 'head'
  g.add(head)

  // ---- 唇基：头前缘的扁平薄板（flat 2.4 强背腹压扁），前缘钝圆
  const clypeus = new THREE.Mesh(
    spindle([0.86, 0.085, 0], [1.03, 0.08, 0], 0.072, { bulge: 0.4, flat: 2.4, taperStart: 0.85, taperEnd: 0.5 }),
    noteumMat,
  )
  clypeus.name = 'clypeus'
  g.add(clypeus)

  g.add(compoundEyePair({ at: [0.78, 0.13, 0.24], radius: 0.075, color: '#0e0c0a', flatten: 0.85, facets: true }))

  // ---- 鳃叶状触角：kit 内建 'lamellate'，自带微动钩子
  const antBase: [number, number, number] = [0.84, 0.03, 0.15]
  g.add(antennaPair({ base: antBase, length: 0.26, kind: 'lamellate', pitch: -10, yaw: 42, thickness: 0.028 }, antMat))

  // ---- 前足：胫节外缘两枚掘土齿（自建，随 mirrorZ 镜像）
  const foreSpec: LegSpec = {
    base: [0.5, -0.12, 0.3],
    femur: 0.34,
    tibia: 0.3,
    tarsus: 0.1,
    thickness: 0.05,
    splay: 38,
    sweep: -32,
    knee: 46,
    ankle: 42,
  }
  const foreRight = leg(foreSpec, legMat)
  tibialTeeth(foreRight, legMat)
  const foreTip = (foreRight.userData.tip as THREE.Vector3).clone()
  g.add(mirrorZ(foreRight))

  // ---- 中后足：常规步行足，胫节带刺
  const midHindSpecs: LegSpec[] = [
    { base: [0.05, -0.14, 0.36], femur: 0.36, tibia: 0.32, tarsus: 0.14, thickness: 0.048, splay: 34, sweep: 8, knee: 50, ankle: 44, spines: true },
    { base: [-0.42, -0.14, 0.34], femur: 0.4, tibia: 0.36, tarsus: 0.16, thickness: 0.05, splay: 40, sweep: 40, knee: 52, ankle: 46, spines: true },
  ]
  for (const spec of midHindSpecs) g.add(legPair(spec, legMat))

  const anchors: Record<string, THREE.Vector3> = {
    elytra: new THREE.Vector3(-0.2, 0.5, 0.45),
    pronotum: new THREE.Vector3(0.57, 0.4, 0),
    clypeus: new THREE.Vector3(1.0, 0.1, 0),
    antenna: new THREE.Vector3(1.03, 0, 0.33),
    leg: foreTip,
    eye: new THREE.Vector3(0.78, 0.16, 0.3),
  }

  return finalize(g, anchors)
}
