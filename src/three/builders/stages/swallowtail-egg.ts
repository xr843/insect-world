/**
 * 玉带凤蝶 · 卵 Papilio polytes（生活史第 1 阶段）
 *
 * 单位与坐标系与成虫（../swallowtail.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。卵黏在叶面上，叶尖朝 +X。
 *
 * 形态依据：
 * - **尺寸**：近球形，直径约 1.2 毫米（新加坡蝴蝶圈 Butterfly Circle 的饲养记录量得
 *   1.2 mm），模型即直径 0.12。成虫前翅就有 4~5 厘米，差着四十倍 —— 不放大。
 * - **近球形、表面光滑**（细看有极细的粗糙颗粒，肉眼读作光滑的釉面）。
 *   这正是要与帝王蝶卵讲清的差别：帝王蝶卵是**高大于宽的炮弹形、带 23 条纵棱**；
 *   凤蝶科的卵是**一粒圆珠，没有棱**。所以这里刻意不做任何棱、纹、精孔凸起，
 *   只让底部因黏着而略压扁（高宽比约 0.92）—— 一粒完整的球放在叶面上
 *   读起来像滚上去的露珠，压一点扁才是「黏住的」。
 * - **淡乳黄色**（pale creamy yellow）。将孵化时会变暗、透出幼虫，本模型取新产状态。
 * - **单产于柑橘类嫩叶**，常在叶尖或嫩叶背面、嫩梢上，一处一粒（雌蝶一次只落一粒卵
 *   就飞走 —— 这与瓢虫、螳螂那种成块产卵是两种策略）。所以基座是一小片
 *   **柑橘叶的叶尖**：革质、有光泽的深绿，卵落在离尖端不远处。叶片是尺度参照件，
 *   尺寸压到与卵同量级，免得取景被叶片撑开、卵缩成一个点。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

/** 卵的赤道半径：真实直径约 1.2 毫米 */
const R_EGG = 0.06
/** 高 / 宽：底部黏着处略压扁。1 是正球，帝王蝶卵是 1.33 */
const SQUASH = 0.92
/** 卵基埋进叶面的深度（胶质黏着处），避免卵与叶片之间露出一条缝 */
const EMBED = 0.005
/** 卵心在叶面上的位置：叶尖在 +X，卵落在叶尖一段、中脉一侧（卵心离尖端约 2.3 毫米） */
const EGG_X = -0.02
const EGG_Z = 0.06

/** 叶片半长 / 半宽（只取叶尖一段） */
const LEAF_BACK = -0.17
const LEAF_TIP = 0.21
const LEAF_HALF_WIDE = 0.15
/**
 * 叶面上表面的 y。挤出体的倒角会让上表面比挤出起点再高出 bevelThickness，
 * 第一版把中脉放在 y=0.0006，整条埋进了倒角里 —— 出图上根本没有中脉。
 */
const LEAF_BEVEL = 0.0015
const LEAF_TOP = LEAF_BEVEL

/**
 * 柑橘叶的叶尖：一段从宽处收到尖端的叶片。
 *
 * 柑橘叶是卵形叶、先端渐尖，比帝王蝶那片马利筋叶的两头对称尖卵形更「一头宽一头尖」
 * —— 读起来就是一片叶子的尖端，而不是一整片小叶。
 * 与 monarch-butterfly-egg 同一套挤出 + rotateX 摊平的做法，叶面上表面在 y=LEAF_TOP。
 */
function leafTip(bladeMat: THREE.Material, veinMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const N = 28
  /*
   * 叶缘：自后缘到最宽处（x=−0.06）近乎平行，其后按 (1−s²)^0.8 收成渐尖的叶尖。
   * 第一版用 (1−s)^0.8，两条叶缘几乎是直线，叶片成了一枚「吉他拨片」；
   * (1−s²) 让叶缘是外凸的弧、只在最后一段才收尖，才是柑橘叶的渐尖先端。
   */
  const X_WIDE = -0.06
  const edge = (x: number) => {
    if (x <= X_WIDE) return LEAF_HALF_WIDE * (1 - 0.06 * ((X_WIDE - x) / (X_WIDE - LEAF_BACK)))
    const s = (x - X_WIDE) / (LEAF_TIP - X_WIDE)
    return LEAF_HALF_WIDE * Math.pow(Math.max(1 - s * s, 0), 0.8)
  }
  // 后缘（叶片被「裁」下来的那一边）做成一条弧而不是直线：直边会读成一张绿色卡片
  const backW = edge(LEAF_BACK)
  const backArc = (z: number) => LEAF_BACK - 0.03 * (1 - (z / backW) ** 2)
  const pts: THREE.Vector2[] = []
  // 右缘：后 → 尖
  for (let i = 0; i <= N; i++) {
    const x = THREE.MathUtils.lerp(LEAF_BACK, LEAF_TIP, i / N)
    pts.push(new THREE.Vector2(x, edge(x)))
  }
  // 左缘：尖 → 后（跳过尖端，免得重复点）
  for (let i = N - 1; i >= 0; i--) {
    const x = THREE.MathUtils.lerp(LEAF_BACK, LEAF_TIP, i / N)
    pts.push(new THREE.Vector2(x, -edge(x)))
  }
  // 后缘弧：左 → 右，回到起点（首尾两点不重复）
  for (let i = 1; i < 8; i++) {
    const z = THREE.MathUtils.lerp(-backW, backW, i / 8)
    pts.push(new THREE.Vector2(backArc(z), z))
  }
  const shape = new THREE.Shape(pts)
  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.006,
    bevelEnabled: true,
    bevelSize: 0.0025,
    bevelThickness: LEAF_BEVEL,
    bevelSegments: 2,
    curveSegments: 12,
  })
  // 形状在 XY 平面，Y 当 Z 用：rotateX(π/2) 把它摊到 XZ，厚度落到 -Y
  blade.rotateX(Math.PI / 2)
  const bladeMesh = new THREE.Mesh(blade, bladeMat)
  bladeMesh.name = 'leaf'
  g.add(bladeMesh)

  /*
   * 中脉：做成**颜色**而不是凸起的脊（帝王蝶那片叶上凸起的中脉在沿 X 的机位里
   * 缩成一根深色短楔，读成裂痕，最后删掉了）。这里是一条几乎贴平叶面的浅色细带，
   * 只高出叶面 0.0006 防闪烁 —— 柑橘叶的中脉本来就是浅黄绿的一条线，它让这片绿
   * 一眼读作「叶」。自后缘一直走到叶尖、逐渐收细（第一版是一条等宽短条、止于卵后方，
   * 俯视读成叶上搁着一根小棍）；卵因此挪到中脉一侧，不压在脉上。
   */
  const veinEnd = LEAF_TIP - 0.012
  const veinShape = new THREE.Shape([
    new THREE.Vector2(LEAF_BACK - 0.02, 0.0035),
    new THREE.Vector2(veinEnd, 0.0008),
    new THREE.Vector2(veinEnd, -0.0008),
    new THREE.Vector2(LEAF_BACK - 0.02, -0.0035),
  ])
  const veinGeo = new THREE.ShapeGeometry(veinShape)
  // 取 −π/2 让法线朝上（+π/2 会朝下）；形状的 y 因此落到 −z，中脉关于中线对称，无所谓
  veinGeo.rotateX(-Math.PI / 2)
  const vein = new THREE.Mesh(veinGeo, veinMat)
  vein.position.y = LEAF_TOP + 0.0006
  vein.name = 'leaf-midrib'
  g.add(vein)
  return g
}

export function buildSwallowtailEgg(): InsectModel {
  const g = new THREE.Group()

  // 淡乳黄：hue≈50°、L≈0.8。比帝王蝶卵（#e6d29b）更黄更亮一点 —— 凤蝶卵新产时是
  // 淡柠檬黄的，ACES 会再提亮，所以不能更白，否则在绿叶上成了一粒白珠
  const shellMat = chitin({ color: '#f0dc86', gloss: 0.62, clearcoat: 0.45 })
  // 柑橘叶是革质、有蜡光的深绿，比帝王蝶那片马利筋叶（绒面）亮得多
  const leafMat = chitin({ color: '#3c7a2e', gloss: 0.42, clearcoat: 0.12 })
  const veinMat = chitin({ color: '#8fb553', gloss: 0.35 })

  // ---- 卵：一粒底部略扁的圆珠
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R_EGG, 40, 28), shellMat)
  shell.scale.set(1, SQUASH, 1)
  shell.position.set(EGG_X, LEAF_TOP + R_EGG * SQUASH - EMBED, EGG_Z)
  shell.name = 'egg-shell'
  g.add(shell)

  // ---- 基座：柑橘叶叶尖
  g.add(leafTip(leafMat, veinMat))

  const eggMidY = LEAF_TOP + R_EGG * SQUASH - EMBED
  const anchors: Record<string, THREE.Vector3> = {
    // 卵壳赤道上朝前的一点：标注点落在真有几何的位置上
    eggShell: new THREE.Vector3(EGG_X + R_EGG, eggMidY, EGG_Z),
    eggTop: new THREE.Vector3(EGG_X, eggMidY + R_EGG * SQUASH, EGG_Z),
    leaf: new THREE.Vector3(-0.1, LEAF_TOP, -0.05),
  }

  return finalize(g, anchors)
}
