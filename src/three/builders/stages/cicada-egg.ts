/**
 * 黑蚱蝉 Cryptotympana atrata · 卵
 *
 * 不完全变态（卵 → 若虫 → 成虫）的第一步。**没有蛹，也不叫幼虫** ——
 * 同一物种的下一阶段文件是 `cicada-nymph.ts`，不是 larva/pupa（见 `stages.ts`
 * 里 `LifeStage` 的注释：把两个词混用等于把本功能要讲的知识点讲反）。
 *
 * 造型要点：
 * - **卵本身是细长梭形**，长约 2.5 毫米（模型 0.25）、粗约 0.4 毫米，
 *   长径比 5 左右 —— 这是蝉卵区别于多数昆虫「球/桶形卵」的第一眼特征，
 *   它长成这样是因为要塞进产卵器划开的一道窄缝里。乳白微透。
 * - **卵不在叶面、不在土里，在树枝的木质部里。** 雌蝉用产卵器在当年生
 *   嫩枝上划一列斜口，每个口里产数粒卵，成排斜插。所以这里不做一枚孤零零
 *   的白粒（那看不出是什么），而是做一小段**纵剖开的嫩枝**当基座：
 *   树皮外壳 + 剖面露出的浅色木质 + 卵室里斜列的卵，
 *   另在完好的树皮上留两处未剖开的**产卵孔**（隆起的裂口 + 撕开的浅色皮缘），
 *   把「一根枝上产一串」这件事一并交代掉。
 * - 明度阶梯是刻意排的（ACES 会提亮去饱和，深叠深会糊成一团）：
 *   卵 91% > 端面木质 68% > 皮缘 56% > 卵室木质 48% > 树皮 30% > 产卵孔 12%。
 *   卵是全画面最亮的东西，绝不会被基座吃掉。
 *
 * 单位与坐标系同成虫：1 = 1 厘米，+X 向前、+Y 向上、+Z 向右。
 * 剖开的窗口一律朝上（+Y）；枝条本身斜放（见下方 TWIG_YAW），
 * 那是四机位目视验收逼出来的一个决定，不是随手摆的。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, spindle, type InsectModel, type Section } from './../kit'

/** 枝条半径：蝉选当年生嫩枝，直径 3~5 毫米最常见，取 3.6 毫米 —— 枝越细，卵在画面里越大 */
const TWIG_R = 0.18
/** 枝条两端 x（总长 1.04 厘米，只是一小段样品） */
const TWIG_X0 = -0.52
const TWIG_X1 = 0.52
/** 剖开窗口的两端 x —— 中段剖开，两头保持完整，才能同时看到「里」与「外」 */
const WIN_X0 = -0.26
const WIN_X1 = 0.26

/*
 * 整段枝条最后要绕 Y 轴转 40°。
 *
 * 四个目视验收机位里，front(1, 0.32, 0.4) 与 rear(−0.85, 0.42, −0.7) 几乎正对
 * ±X —— 枝条若沿 X 平放，这两个机位就是**顺着枝轴看过去**，卵室被自己挡得
 * 一干二净，画面上只剩一根木头（第一版实拍就是这样）。转 40° 之后，四个机位
 * 与枝轴的夹角分别是 87° / 58° / 63° / 80°，每个机位都看得进卵室。
 * 旋转加在内层 group 上，不加在根 group：finalize() 只平移 anchors、不旋转它们，
 * 根 group 带旋转会让标注点与几何整体错开。
 */
const TWIG_YAW = THREE.MathUtils.degToRad(40)

/** 把建模坐标（枝条沿 X）里的一个点转到最终坐标，供 anchors 用 */
function yawed(x: number, y: number, z: number): THREE.Vector3 {
  const c = Math.cos(TWIG_YAW)
  const sn = Math.sin(TWIG_YAW)
  return new THREE.Vector3(x * c + z * sn, y, -x * sn + z * c)
}

/** 卵长 2.5 毫米、最粗处半径 0.024（直径 0.48 毫米），长径比 ≈ 5.2 */
const EGG_LEN = 0.25
const EGG_R = 0.024

export function buildCicadaEgg(): InsectModel {
  const g = new THREE.Group()

  // ---- 材质：明度从卵到产卵孔排成五档，靠明度差把结构分开，不靠色相
  const barkMat = chitin({ color: '#6b4a2c', gloss: 0.14, surface: 'striate' }) // 纵沟纹 = 嫩枝表皮
  const woodMat = chitin({ color: '#d5b684', gloss: 0.22 }) // 端面木质：断口新鲜，最浅
  const nestMat = chitin({ color: '#a8814d', gloss: 0.18 }) // 卵室底：比端面深一档，托住近白的卵
  const eggMat = chitin({ color: '#f3ecdd', gloss: 0.66, clearcoat: 0.45, translucent: true }) // 乳白微透，带一层珠光
  const scarMat = chitin({ color: '#2b1c10', gloss: 0.2 }) // 产卵孔内的阴影
  const lipMat = chitin({ color: '#b99667', gloss: 0.2 }) // 被产卵器撕开的皮缘，比树皮亮一档

  // ---- 完好的枝段（窗口两侧各一段）：略带锥度，看起来是从枝上截下来的一节
  for (const [x0, x1, r0, r1] of [
    [TWIG_X0, WIN_X0, TWIG_R * 0.98, TWIG_R],
    [WIN_X1, TWIG_X1, TWIG_R, TWIG_R * 0.94],
  ] as const) {
    const sections: Section[] = []
    const steps = 6
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3(THREE.MathUtils.lerp(x0, x1, t), 0, 0), ry: r, rz: r })
    }
    const piece = new THREE.Mesh(loft(sections, 24), barkMat)
    piece.name = 'twig-bark'
    g.add(piece)
  }

  /*
   * 剖开的中段：把上面 210° 整个揭掉，只剩下面 150° 的一条「摇篮」。
   *
   * CylinderGeometry 的顶点是 x = r·sinθ、z = r·cosθ，轴沿 +Y；把整个 mesh 绕 Z
   * 转 -90° 后 (x,y,z) → (y, -x, z)，于是角 θ 落在 (y,z) = (-r·sinθ, r·cosθ)。
   * 缺口要正对上方（+Y），中心须取 θ=270°（那里 y=+r），故壳体从 θ=15° 起、跨 150°。
   *
   * 为什么揭掉的是 210° 而不是第一版的 120°：120° 的开口两侧留着两道高过卵的
   * 边墙，而四个验收机位里 front/rear 的仰角只有 17° 与 21° —— 实拍出来是
   * 一根「中间开了道槽的木头」，卵被自己的边墙挡得一粒都看不见。
   * 揭到 150° 后两条切边落到轴线**以下**（y = −0.26r），卵整个露在边缘之上，
   * 任何一个高于水平的机位都看得见。
   * finalize() 会给不透明材质统一开双面，所以摇篮的内壁不会被背面剔除吃掉
   * （七星瓢虫「壳裂开露白」是同一个病）。
   */
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(TWIG_R, TWIG_R, WIN_X1 - WIN_X0, 30, 1, true, Math.PI / 12, (5 * Math.PI) / 6),
    barkMat,
  )
  shell.rotation.z = -Math.PI / 2
  shell.position.x = (WIN_X0 + WIN_X1) / 2
  shell.name = 'twig-bark'
  g.add(shell)

  // 摇篮内衬：同样的一段筒，半径小一圈、角度窄一点，浅色木质。
  // 有了它，剖开处读到的是「深色树皮包着浅色木质」，而不是一个发黑的空腔；
  // 树皮只在切边露出一圈厚度，正是真实剖面的样子。
  const lining = new THREE.Mesh(
    new THREE.CylinderGeometry(
      TWIG_R * 0.87,
      TWIG_R * 0.87,
      WIN_X1 - WIN_X0 - 0.008,
      30,
      1,
      true,
      Math.PI / 8,
      (7 * Math.PI) / 9,
    ),
    nestMat,
  )
  lining.rotation.z = -Math.PI / 2
  lining.position.x = (WIN_X0 + WIN_X1) / 2
  lining.name = 'nest-lining'
  g.add(lining)

  // ---- 窗口两端的木质断面：一整片浅色圆盘，露在开口里就是「枝被切开」的直接证据
  for (const [x, sign] of [
    [WIN_X0 + 0.006, 1],
    [WIN_X1 - 0.006, -1],
  ] as const) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(TWIG_R * 0.97, 24), woodMat)
    face.rotation.y = (sign * Math.PI) / 2
    face.position.x = x
    face.name = 'wood-face'
    g.add(face)
  }

  /*
   * 卵室的底：一层浅色木质，横向**撑满**摇篮在这个高度上的弦长。
   *
   * 高度取 −0.065，不是摇篮的最低处：真实卵室是产卵器在树皮下方划出的一道
   * 浅缝，本来就贴着表皮，不在枝条中心。第一版把它做成一条窄透镜浮在槽里，
   * 实拍下方露出一条黑缝，整段读成「一条船」；撑满弦长之后，底下的空腔
   * 被自己封住，剖面就是干净的「皮在外、木在内」。
   */
  {
    const floorY = -0.065
    const halfChord = Math.sqrt(TWIG_R * TWIG_R - floorY * floorY) - 0.002
    const sections: Section[] = []
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const taper = t < 0.08 ? 0.55 + (t / 0.08) * 0.45 : t > 0.92 ? 0.55 + ((1 - t) / 0.08) * 0.45 : 1
      sections.push({
        at: new THREE.Vector3(THREE.MathUtils.lerp(WIN_X0 + 0.004, WIN_X1 - 0.004, t), floorY, 0),
        ry: 0.032,
        rz: halfChord * taper,
      })
    }
    const floor = new THREE.Mesh(loft(sections, 20), nestMat)
    floor.name = 'nest-floor'
    g.add(floor)
  }

  /*
   * 卵：4 粒，两列斜插。
   *
   * 几何沿 +X 建一次、四个 mesh 共用 —— 除了省面数，更要紧的是让局部包围盒
   * 恰好等于 (卵长, 直径, 直径)，测试量长径比时不会被摆放姿态污染
   * （若把卵直接放样在最终位置上，斜置会让 x 跨度里混进侧向分量，
   *   量出来的「长径比」和人看到的细长程度就不是同一件事了）。
   * 倾角 18°：真实卵室里卵与枝轴斜交，两列交错像并排的米粒。
   */
  const eggGeo = spindle([0, 0, 0], [EGG_LEN, 0, 0], EGG_R, {
    bulge: 0.45,
    steps: 14,
    taperStart: 0.14, // 后端钝圆
    taperEnd: 0.05, // 前端略尖
  })
  const eggY = -0.016
  for (const side of [1, -1] as const) {
    for (const [i, cx] of [-0.13, 0.13].entries()) {
      const egg = new THREE.Mesh(eggGeo, eggMat)
      egg.name = 'egg'
      const tilt = THREE.MathUtils.degToRad(18) * side
      egg.rotation.y = tilt
      // rotation 绕的是几何原点（卵的后端），所以位置要按卵长的一半补偿回中心
      egg.position.set(
        cx - Math.cos(tilt) * EGG_LEN * 0.5,
        eggY + i * 0.004,
        side * 0.075 + Math.sin(tilt) * EGG_LEN * 0.5,
      )
      g.add(egg)
    }
  }

  /*
   * 未剖开的产卵孔：完好树皮上的两处「产卵痕」。
   * 真实的产卵痕是一道**斜**的短裂口（产卵器是斜插进去的），一根枝上一列十几道。
   * 所以这里不是横平竖直的一条缝，而是绕 Y 轴斜 26°；缝本身近黑，
   * 两侧各一条被顶开、翘起的浅色皮缘 —— 深/浅两档并置才看得出是「裂开的」。
   */
  for (const [sx, sign] of [
    [-0.42, 1],
    [0.42, -1],
  ] as const) {
    const yaw = THREE.MathUtils.degToRad(26) * sign
    const half = 0.115
    const dx = Math.cos(yaw) * half
    const dz = Math.sin(yaw) * half
    const slit = new THREE.Mesh(
      spindle([sx - dx, TWIG_R * 1.0, -dz], [sx + dx, TWIG_R * 1.0, dz], 0.02, {
        bulge: 0.5,
        flat: 2.2, // >1 = 上下压扁：缝是扁的
        steps: 8,
        taperStart: 0.06,
        taperEnd: 0.06,
      }),
      scarMat,
    )
    slit.name = 'scar'
    g.add(slit)

    // 皮缘：沿缝的法线方向各让开一点，做成两条细长的翘边
    const nx = -Math.sin(yaw)
    const nz = Math.cos(yaw)
    for (const lz of [1, -1]) {
      const off = 0.032 * lz
      const lip = new THREE.Mesh(
        spindle(
          [sx - dx * 0.85 + nx * off, TWIG_R * 1.03, -dz * 0.85 + nz * off],
          [sx + dx * 0.85 + nx * off, TWIG_R * 1.03, dz * 0.85 + nz * off],
          0.013,
          { bulge: 0.5, flat: 1.6, steps: 8, taperStart: 0.1, taperEnd: 0.1 },
        ),
        lipMat,
      )
      lip.name = 'scar-lip'
      g.add(lip)
    }
  }

  // ---- 整体转向（理由见 TWIG_YAW 的注释）
  const root = new THREE.Group()
  g.rotation.y = TWIG_YAW
  root.add(g)

  const anchors: Record<string, THREE.Vector3> = {
    egg: yawed(0.13, 0.02, 0.09),
    nest: yawed(0, 0.02, 0),
    twig: yawed(-0.42, TWIG_R * 0.8, 0),
    scar: yawed(0.42, TWIG_R * 1.05, 0),
  }

  return finalize(root, anchors)
}
