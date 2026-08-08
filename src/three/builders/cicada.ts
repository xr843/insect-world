/**
 * 黑蚱蝉 Cryptotympana atrata
 *
 * 造型要点：
 * - 头胸部宽阔粗壮、腹部短锥形收细 —— 蝉的体重心在前半身，
 *   整体轮廓呈「楔形」（头胸最宽，向腹端迅速收窄）。
 * - 两对膜翅呈屋脊状（tectiform）覆盖在背上：这是蝉停栖的标准姿态，
 *   区别于平展的展翅姿态。用 kit.wing() 的 spread/tilt 组合可以精确
 *   算出翅尖相对翅基的偏移方向（推导见下方 wing 参数注释），
 *   让翅从近背中线的翅基向后、向下、向外扫出，形成两坡屋顶。
 * - 刺吸式口器（喙，rostrum）贴腹面向后伸——半翅目区别于咀嚼式口器
 *   昆虫的关键特征。
 * - 鸣器（tymbal）：雄蝉发声器，位于腹基两侧，是一对椭圆形鼓膜盖片。
 * - 复眼左右分得很开、头顶三枚红色单眼——蝉头部的典型识别特征。
 * - 体色黑底带金属绿光泽，边缘带金黄绒毛感斑纹。
 */
import * as THREE from 'three'
import {
  antennaPair,
  chitin,
  compoundEyePair,
  finalize,
  legPair,
  membrane,
  ocelli,
  rostrum,
  segmentedAbdomen,
  segmentedAbdomenMembranes,
  type SegmentedAbdomenOptions,
  spindle,
  wingPair,
  type InsectModel,
  type WingSpec,
} from './kit'

/**
 * wing() 的姿态推导（对着 kit.ts 源码逆向验证过，写在这里避免下次重新推）：
 *
 * pivot.rotation.y = side*(90°-spread) + sweep =: θy
 * pivot.rotation.x = side*tilt =: θx
 * 翅尖（局部 (length,0,0)）在世界坐标下相对翅基的偏移 = length * (
 *   cosθy,                      // 前后：>0 朝头，<0 朝尾
 *   sinθx·sinθy,                // 上下
 *   -cosθx·sinθy                // 左右：>0 远离体中线（右翅）
 * )
 *
 * 屋脊状（tectiform）姿态需要：偏移「大幅朝尾」+「向下」+「向外」，
 * 取 θy 落在 180°~270°（第三象限，sinθy<0 使左右项变号为正）：
 * spread=-110, sweep=0 → θy=200°（sin=-0.342, cos=-0.940）
 * 配合 tilt=40（θx=40°，sin=0.643, cos=0.766）得到
 * 偏移 ≈ length*(-0.94, -0.22, +0.26) —— 朝尾为主、略下沉、略外扬，
 * 正是"从近中线翅基向后下方外扫"的屋顶坡面。
 */

export function buildCicada(): InsectModel {
  const g = new THREE.Group()

  // ---- 材质：通体黑色带金属绿光泽，几处金黄绒毛斑与琥珀色翅基分层
  const bodyMat = chitin({ color: '#12160f', gloss: 0.58, metal: 0.24, clearcoat: 0.4 })
  const legMat = chitin({ color: '#181d15', gloss: 0.5, metal: 0.18, clearcoat: 0.3 })
  const goldMat = chitin({ color: '#c9a23c', gloss: 0.3, metal: 0.05 })
  const tymbalMat = chitin({ color: '#d8c79c', gloss: 0.55, clearcoat: 0.2 })
  const eyeColor = '#4a1c14'
  const ocelliMat = chitin({ color: '#c0392b', gloss: 0.85, clearcoat: 0.6 })
  const wingMat = membrane('#e8e4d6', 0.24)
  const veinMat = chitin({ color: '#241d15', gloss: 0.35 })
  const amberMat = chitin({ color: '#b5793a', gloss: 0.55, opacity: 0.55 })

  // ---- 头部：宽而钝，左右宽于前后（flat>1），这样复眼才能"分得很开"
  const head = new THREE.Mesh(
    spindle([1.05, 0.14, 0], [1.95, 0.2, 0], 0.44, { bulge: 0.35, flat: 1.35, taperStart: 0.12, taperEnd: 0.4 }),
    bodyMat,
  )
  g.add(head)

  // ---- 前胸背板：窄小的一圈衣领，连接头与中胸
  const pronotum = new THREE.Mesh(
    spindle([0.85, 0.12, 0], [1.05, 0.16, 0], 0.5, { bulge: 0.5, flat: 1.22, taperStart: 0.82, taperEnd: 0.9 }),
    bodyMat,
  )
  g.add(pronotum)

  // ---- 中胸背板：全身最粗壮的一段，两对翅与足的基座都在这里
  const mesonotum = new THREE.Mesh(
    spindle([0.0, 0.04, 0], [0.85, 0.14, 0], 0.64, { bulge: 0.55, flat: 1.16, taperStart: 0.34, taperEnd: 0.85 }),
    bodyMat,
  )
  g.add(mesonotum)

  // ---- 金色装饰环：中后胸交界处一圈细金环，模拟蝉体边缘的金黄绒毛带
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.028, 8, 28), goldMat)
  collar.rotation.y = Math.PI / 2
  collar.position.set(0.95, 0.14, 0)
  g.add(collar)

  // ---- 腹部：短锥形，前粗后尖（bulge 很靠前），是"楔形"轮廓的收尾
  const cicadaAbdomenOpts: SegmentedAbdomenOptions = {
  from: [0.0, -0.02, 0],
  to: [-2.6, 0.05, 0],
  r0: 0.5,
  r1: 0.05,
  segments: 6,
  groove: 0.15,
  flat: 1.05,
  bulge: 0.1,
  }
  const abdomen = new THREE.Mesh(segmentedAbdomen(cicadaAbdomenOpts), bodyMat)
  abdomen.add(...segmentedAbdomenMembranes(cicadaAbdomenOpts))
  g.add(abdomen)

  // ---- 鸣器（tymbal）：雄蝉发声器，腹基两侧一对椭圆鼓膜盖片，颜色浅于体色
  for (const side of [1, -1]) {
    const tymbal = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), tymbalMat)
    tymbal.scale.set(1.25, 0.42, 0.85)
    tymbal.position.set(-0.1, -0.08, side * 0.5)
    tymbal.rotation.y = side * 0.25
    g.add(tymbal)
  }

  // ---- 刺吸式口器：从头胸腹面向后下方贴腹伸出，半翅目的关键特征
  g.add(rostrum({ at: [1.05, -0.06, 0], length: 1.3, thickness: 0.045, angle: 64 }, bodyMat))

  // ---- 复眼：左右分得很开，位于头部两侧最宽处
  g.add(
    compoundEyePair({
      at: [1.78, 0.22, 0.42],
      radius: 0.22,
      color: eyeColor,
      flatten: 0.86,
      stretch: 1.05,
      facets: true,
    }),
  )

  // ---- 单眼：头顶三枚，红色，蝉类典型的三角排列
  g.add(ocelli([1.55, 0.42, 0], 0.035, 0.13, ocelliMat))

  // ---- 触角：蝉的触角是刚毛状（setaceous），短小到几乎看不见
  g.add(
    antennaPair(
      { base: [1.85, 0.2, 0.28], length: 0.18, kind: 'setaceous', pitch: 12, yaw: 48, thickness: 0.02 },
      bodyMat,
    ),
  )

  // ---- 六足：粗短。前足腿节带刺，用于若虫掘土、成虫攀附树皮
  g.add(
    legPair(
      { base: [0.72, -0.16, 0.5], femur: 0.42, tibia: 0.4, tarsus: 0.16, splay: 36, sweep: -30, knee: 76, thickness: 0.06, spines: true },
      legMat,
    ),
  )
  g.add(
    legPair(
      { base: [0.32, -0.19, 0.55], femur: 0.46, tibia: 0.46, tarsus: 0.18, splay: 32, sweep: 6, knee: 78, thickness: 0.062 },
      legMat,
    ),
  )
  g.add(
    legPair(
      { base: [-0.02, -0.19, 0.52], femur: 0.5, tibia: 0.56, tarsus: 0.2, splay: 30, sweep: 36, knee: 80, thickness: 0.065 },
      legMat,
    ),
  )

  // ---- 前翅：大而狭长，翅脉清晰（9~11 条），屋脊状覆盖腹部
  const foreOutline: [number, number][] = [
    [0, 0.12],
    [0.12, 0.55],
    [0.3, 0.85],
    [0.5, 1.0],
    [0.72, 0.86],
    [0.9, 0.5],
    [1, 0.06],
  ]
  const foreSpec: WingSpec = {
    base: [0.55, 0.3, 0.22],
    length: 2.75,
    width: 0.95,
    outline: foreOutline,
    spread: -110,
    tilt: 40,
    sweep: 0,
  }
  g.add(wingPair(foreSpec, wingMat, veinMat, 10))
  // 翅基琥珀色斑：复用同一姿态但只取翅根 18% 的长度，叠在主翅膜上
  g.add(wingPair({ ...foreSpec, length: foreSpec.length * 0.18 }, amberMat))

  // ---- 后翅：略短略宽，藏在前翅之下（同一屋顶姿态，基点更靠内更低）
  const hindOutline: [number, number][] = [
    [0, 0.15],
    [0.15, 0.6],
    [0.4, 0.95],
    [0.62, 1.0],
    [0.82, 0.7],
    [1, 0.1],
  ]
  const hindSpec: WingSpec = {
    base: [0.34, 0.2, 0.16],
    length: 2.05,
    width: 1.05,
    outline: hindOutline,
    spread: -108,
    tilt: 42,
    sweep: -6,
  }
  g.add(wingPair(hindSpec, wingMat, veinMat, 9))

  const anchors: Record<string, THREE.Vector3> = {
    head: new THREE.Vector3(1.55, 0.3, 0),
    eye: new THREE.Vector3(1.95, 0.24, 0.6),
    rostrum: new THREE.Vector3(0.5, -0.65, 0),
    tymbal: new THREE.Vector3(-0.1, -0.1, 0.62),
    abdomen: new THREE.Vector3(-1.3, 0.15, 0),
    wing: new THREE.Vector3(-0.6, 0.75, 0.65),
  }

  return finalize(g, anchors)
}
