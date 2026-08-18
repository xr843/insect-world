/**
 * 帝王蝶 · 卵 Danaus plexippus（生活史第 1 阶段）
 *
 * 单位与坐标系与成虫（../monarch-butterfly.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。卵直立于叶面，长轴沿 +Y。
 *
 * 形态依据：
 * - **尺寸**：高约 1.2 毫米、最宽处约 0.9 毫米，模型即 0.12 × 0.09。成虫单片前翅
 *   就有 4.3 长，两者差着几十倍 —— 这个量级差本身就是生活史要讲的内容，
 *   绝不为了「好看」把卵放大（stages.ts 顶部把这条写成了硬约定）。
 * - **招牌 = 纵向棱脊**。卵壳表面有 20 余条自基部辐辏向顶端精孔的纵棱，
 *   棱间还有更细密的横纹。没有这组棱脊，一粒乳白椭球就是任何一种昆虫的卵；
 *   有了它才认得出是鳞翅目的卵。文献常见记载 20~25 条，本文件取 23。
 * - **炮弹形/米粒形**，不是球：基部平（靠胶质黏在叶面），最宽处在下 1/3，
 *   向上收成钝尖，顶端一圈精孔（micropyle，精子入卵之处，也是纵棱的辐辏点）。
 * - **乳白略带黄**。将孵化时会透出幼虫的黑色头壳，本模型取新产状态。
 * - **产在马利筋叶背**，一叶一粒（雌蝶靠前足跗节的味觉毛认寄主）。基座那一小片
 *   叶面是尺度参照：单独一粒卵放大到满屏时，人读不出它只有一毫米。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

/** 卵高：真实 1.2 毫米 */
const HEIGHT = 0.12
/** 最宽处半径：真实直径约 0.9 毫米 */
const R_MAX = 0.045
/** 纵棱条数，文献记载 20~25 条 */
const RIDGE_COUNT = 23
/** 棱脊冠面高出卵壳的量：约壳半径的 13%，读得出「有棱」又不至于长成一圈刺 */
const RIDGE_RISE = 0.006
/** 卵基埋进叶面的深度（胶质黏着处），避免卵与叶片之间露出一条缝 */
const EMBED = 0.004

/**
 * 卵壳轮廓：t=0 在基部（黏在叶面那一端），t=1 在顶端精孔。
 *
 * 不用 kit.spindle() 而自己写一条曲线，是因为棱脊与横纹都要**贴着壳面**放，
 * 必须能在任意 t 上问出半径来 —— 壳与附着物共用同一条曲线，才不会出现棱脊
 * 一段陷进壳里、一段浮在空中。
 */
function shellRadius(t: number): number {
  // 基部收窄（黏着面），到 t≈0.30 长到最宽
  const base = 0.62 + 0.38 * THREE.MathUtils.smoothstep(t, 0, 0.3)
  // 过了最宽处以余弦收顶：指数 0.62 让肩部饱满、顶端才收尖，
  // 这是「炮弹形」而非「圆锥」的关键
  const shoulder = Math.cos(THREE.MathUtils.clamp((t - 0.3) / 0.72, 0, 1) * Math.PI * 0.5)
  return R_MAX * base * Math.pow(shoulder, 0.62)
}

/** 卵壳高度：基部埋进叶面 EMBED，露出叶面的部分仍是真实的 1.2 毫米 */
function shellY(t: number): number {
  return -EMBED + t * HEIGHT
}

/** 一条纵棱：沿某个方位角贴着壳面走的一根细管，近顶端渐细并向精孔辐辏 */
function ridgeRib(azimuth: number, material: THREE.Material): THREE.Mesh {
  const sections: Section[] = []
  const steps = 16
  for (let i = 0; i <= steps; i++) {
    const t = THREE.MathUtils.lerp(0.02, 0.97, i / steps)
    // 管心比壳面外移一点点，管的内侧因此埋进壳里，不会在棱与壳之间露缝
    const r = shellRadius(t) + RIDGE_RISE * 0.25
    // 管径：基部略细（棱自基部才隆起），近顶端收细并辐辏于精孔
    const thick =
      RIDGE_RISE *
      0.66 *
      (0.55 + 0.45 * THREE.MathUtils.smoothstep(t, 0.02, 0.16)) *
      (1 - 0.75 * THREE.MathUtils.smoothstep(t, 0.72, 0.99))
    sections.push({
      at: new THREE.Vector3(r * Math.cos(azimuth), shellY(t), r * Math.sin(azimuth)),
      ry: Math.max(thick, 1e-4),
      rz: Math.max(thick, 1e-4),
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 7), material)
  mesh.name = 'egg-ridge'
  return mesh
}

/**
 * 一小片马利筋叶面：尖卵形轮廓的薄叶片。只作尺度参照，尺寸刻意压到与卵同量级，
 * 免得取景被叶片撑开、卵反而缩成一个点。
 */
function leafPatch(bladeMat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const halfLen = 0.082
  const halfWide = 0.052
  const pts: THREE.Vector2[] = []
  const N = 16
  // sin^0.7 让两端收成叶尖而不是圆头
  const edge = (s: number) => halfWide * Math.pow(Math.sin(Math.PI * s), 0.7)
  for (let i = 0; i <= N; i++) {
    const s = i / N
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(-halfLen, halfLen, s), edge(s)))
  }
  for (let i = N; i >= 0; i--) {
    const s = i / N
    pts.push(new THREE.Vector2(THREE.MathUtils.lerp(-halfLen, halfLen, s), -edge(s)))
  }
  const shape = new THREE.Shape(pts)
  // 与 kit.wingGeometry 同一套约定：形状在 XY 平面挤出后 rotateX(π/2) 摊平到 XZ，
  // 厚度落到 -Y，于是叶面的上表面正好是 y=0，卵基埋进去 EMBED 深
  // 倒一点角：不倒角的挤出体侧壁是一圈笔直的立面，渲染出来像一枚绿色筹码
  const blade = new THREE.ExtrudeGeometry(shape, {
    depth: 0.004,
    bevelEnabled: true,
    bevelSize: 0.0018,
    bevelThickness: 0.0012,
    bevelSegments: 2,
    curveSegments: 12,
  })
  blade.rotateX(Math.PI / 2)
  const bladeMesh = new THREE.Mesh(blade, bladeMat)
  bladeMesh.name = 'leaf'
  g.add(bladeMesh)

  /*
   * 这里一度还有一条中脉。删掉它是目视验收的结论：中脉沿 X 走，而四个机位里有两个
   * 是沿 X 看过去的，一条 0.15 长的脊在那两个机位下缩成一根深色短楔，紧挨着卵基，
   * 读起来像叶面上的一道裂痕。叶片是尺度参照件，不值得为它冒这个险 ——
   * 尖卵形的外轮廓已经足够说明「这是一片叶」。
   */
  return g
}

export function buildMonarchButterflyEgg(): InsectModel {
  const g = new THREE.Group()

  // 乳白略带黄（hue≈45°）。卵壳是蜡质的，靠 clearcoat 出那层薄釉光；
  // 不开 translucent —— 新产的卵还不透明，透光是将孵化时的事。
  const shellMat = chitin({ color: '#e6d29b', gloss: 0.5, clearcoat: 0.3 })
  // 棱脊冠面比壳面亮一档：真实卵的棱是受光的凸起，压成同色就白做了几何
  const ridgeMat = chitin({ color: '#fbf4de', gloss: 0.55, clearcoat: 0.3 })
  // 横纹压暗一档，读作棱间的细凹线
  const striaMat = chitin({ color: '#cdb478', gloss: 0.3 })
  const micropyleMat = chitin({ color: '#c9a86a', gloss: 0.35 })
  const leafMat = chitin({ color: '#4e7d38', gloss: 0.4, surface: 'velvet' })

  // ---- 卵壳
  const shellSections: Section[] = []
  const steps = 30
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(shellRadius(t), 1e-4)
    shellSections.push({ at: new THREE.Vector3(0, shellY(t), 0), ry: r, rz: r })
  }
  const shell = new THREE.Mesh(loft(shellSections, 30), shellMat)
  shell.name = 'egg-shell'
  g.add(shell)

  // ---- 纵棱：招牌结构，绕体轴均布一圈
  for (let i = 0; i < RIDGE_COUNT; i++) {
    g.add(ridgeRib((i / RIDGE_COUNT) * Math.PI * 2, ridgeMat))
  }

  // ---- 横向细纹：棱与棱之间的细环纹，半埋在壳里，只在棱沟中露出细线
  for (const t of [0.16, 0.28, 0.4, 0.52, 0.63, 0.73, 0.82, 0.89]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(shellRadius(t) + 0.0008, 0.0013, 6, 30), striaMat)
    ring.rotation.x = Math.PI / 2 // TorusGeometry 默认躺在 XY 平面，转到 XZ 才是绕体轴的环
    ring.position.y = shellY(t)
    ring.name = 'egg-stria'
    g.add(ring)
  }

  // ---- 精孔：顶端一小片略深的圆盘，纵棱在此辐辏
  const micropyle = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 12, 8), micropyleMat)
  micropyle.scale.set(1, 0.45, 1)
  micropyle.position.set(0, shellY(0.995), 0)
  micropyle.name = 'egg-micropyle'
  g.add(micropyle)

  // ---- 基座叶面
  g.add(leafPatch(leafMat))

  const anchors: Record<string, THREE.Vector3> = {
    // 棱脊冠面上的一点（方位角 0 = +X 侧）：标注点要落在真有几何的位置上
    ridge: new THREE.Vector3(shellRadius(0.45) + RIDGE_RISE, shellY(0.45), 0),
    micropyle: new THREE.Vector3(0, shellY(1), 0),
    leaf: new THREE.Vector3(-0.055, 0, 0),
  }

  return finalize(g, anchors)
}
