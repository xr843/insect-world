/**
 * 碧伟蜓 Anax parthenope · 卵
 *
 * 不完全变态（卵 → 若虫 → 成虫）的第一步。**没有蛹，也不叫幼虫** ——
 * 同一物种的下一阶段文件是 `dragonfly-nymph.ts`，不是 larva/pupa
 * （见 `stages.ts` 里 `LifeStage` 的注释：把两个词混用等于把本功能要讲的
 * 知识点讲反）。
 *
 * ## 卵本身没有结构，所以语境就是内容
 *
 * 第一批四颗卵的教训写在 `docs/superpowers/specs/2026-08-18-motion-design.md` 里：
 * **卵必须有可指认的表面结构，或有一个不是「一圈小球」的语境。**
 * 蜻蜓卵表面是光的（无棱无刻纹），所以这一颗只能走「语境」这条路 ——
 * 而它的语境恰好是蜻蜓目最值得讲的一件事：
 *
 * **碧伟蜓是内产卵（endophytic）**：雌虫把腹端插进水生植物的**茎组织**里，
 * 用产卵器划开一道缝、把卵一粒粒送进去，沿茎排成一列刻痕。
 * 所以这里做的不是一粒孤零零的卵，而是**一小段斜立的水草茎**：
 * 中段纵剖开，露出浅色的通气组织（aerenchyma，水生植物茎里那层海绵状的
 * 白色薄壁组织）与躺在里面的三粒卵；两端完好的茎皮上留着**一列产卵刻痕**，
 * 把「一根茎上产一列」这件事一并交代掉。
 *
 * 与蝉卵（`cicada-egg.ts`，同样是内产卵）刻意做出区别，免得两颗卵成了一张图：
 * 蝉产在**木质的枝条**里、卵室横着；蜻蜓产在**软的水草茎**里、茎是**斜立**的，
 * 剖面里是浅绿的通气组织而不是黄褐的木质，刻痕成**一列**而不是两处。
 *
 * ## 尺寸
 *
 * 卵长约 1.2 毫米（模型 0.12）、粗约 0.29 毫米，长径比 ≈ 4.1 —— 细长梭形，
 * 因为要塞进产卵器划开的一道窄缝。淡黄、半透。
 * 茎直径 1.8 毫米（模型 0.18），卵长有茎粗的三分之二 —— 这个比例本身
 * 就在说「卵有多小」。绝不为了好看把卵放大（`stages.ts` 顶部的硬约定）。
 *
 * ## 明度阶梯（ACES 会提亮去饱和，深叠深会糊成一团）
 *
 * 卵 86% > 断面 77% > 卵床 71% > 通气组织 66% > 撕开的皮缘 55% > 茎皮 36% > 刻痕 12%。
 * 卵是全画面最亮的东西，绝不会被基座吃掉。
 *
 * ## 为什么整段茎要斜着放
 *
 * 四个目视验收机位里 front(1, 0.32, 0.4) 与 rear(−0.85, 0.42, −0.7) 几乎正对 ±X，
 * side(0.12, 0.28, 1) 正对 +Z。茎若沿任一坐标轴平放，总有机位是**顺着茎轴
 * 看过去**的，卵室被自己挡光（蝉卵第一版实拍就是这样，那次靠绕 Y 转 40° 解决）。
 * 这里让茎先仰 35°（水草是立着长的）、再绕 Y 转 55°，四个机位与茎轴的夹角
 * 分别是 56° / 64° / 70° / 75° —— 没有一个是顺着茎轴看的；
 * 剖开的窗口与四个机位的夹角则是 36° / 51° / 84° / 75°。
 * 偏航角从 25° 改到 55° 是第二轮实拍逼出来的：25° 时 front 机位与茎轴只差 46°、
 * 与窗口法线差 98°（窗口整个背过去），那一张读成「一根光溜溜的绿管」。
 * 旋转加在内层 group 上，不加在根 group：`finalize()` 只平移 anchors、不旋转它们。
 *
 * 单位与坐标系同成虫：1 = 1 厘米，+X 向前、+Y 向上、+Z 向右。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, spindle, type InsectModel, type Section } from './../kit'

/** 茎半径：水草嫩茎直径 1.8 毫米 */
export const STEM_R = 0.09
/** 茎两端 x（建模帧里茎沿 +X），总长 0.86 厘米，只是一小段样品 */
const STEM_X0 = -0.43
const STEM_X1 = 0.43
/** 剖开窗口的两端 x —— 中段剖开，两头保持完整，才能同时看到「里」与「外」 */
const WIN_X0 = -0.18
const WIN_X1 = 0.18

/** 茎的仰角与偏航（理由见文件头「为什么整段茎要斜着放」） */
const STEM_PITCH = THREE.MathUtils.degToRad(35)
const STEM_YAW = THREE.MathUtils.degToRad(55)

/**
 * 把建模帧（茎沿 +X）里的一点转到最终模型坐标。
 * 与 `g.rotation.set(0, STEM_YAW, STEM_PITCH)` 等价（three 的默认 XYZ 序下
 * v' = Ry·Rz·v），测试要用它算「某点到茎轴的垂距」，所以导出。
 */
export function toModel(x: number, y: number, z: number): THREE.Vector3 {
  const cp = Math.cos(STEM_PITCH)
  const sp = Math.sin(STEM_PITCH)
  const rx = x * cp - y * sp
  const ry = x * sp + y * cp
  const cy = Math.cos(STEM_YAW)
  const sy = Math.sin(STEM_YAW)
  return new THREE.Vector3(rx * cy + z * sy, ry, -rx * sy + z * cy)
}

/** 茎轴在模型坐标里的单位方向（纯旋转，与 finalize 的平移无关） */
export const STEM_DIR: THREE.Vector3 = toModel(1, 0, 0).normalize()

/** 卵长 1.2 毫米、最粗处半径 0.0145（直径 0.29 毫米），长径比 ≈ 4.1 */
const EGG_LEN = 0.12
const EGG_R = 0.0145
/** 三粒卵沿茎轴的中心位置与横向错位（一列刻痕，一粒一缝） */
const EGG_SLOTS: readonly (readonly [number, number])[] = [
  [-0.115, -0.022],
  [0.0, 0.022],
  [0.115, -0.022],
]
/** 卵在茎里的倾角：产卵器是斜插进去的，卵跟着斜躺，不与茎轴平行 */
const EGG_TILT = THREE.MathUtils.degToRad(18)

/**
 * 完好茎皮上的产卵刻痕：沿茎轴排成**一列**，绕着茎左右交错（真实的产卵痕
 * 常是这样一条之字形的列 —— 雌虫沿茎退着产，一粒一缝）。
 * 交错幅度刻意给到 ±0.95 弧度而不是贴着顶线走：四个目视验收机位里，
 * 剖开的窗口只有三个看得进去，剩下那个（front）正对茎的另一侧 ——
 * 把刻痕绕开一圈，那个机位至少还看得见三道缝，不至于只剩一根光溜溜的绿管。
 * [沿茎轴的位置, 方位角(弧度)]
 */
const SCARS: readonly (readonly [number, number])[] = [
  [-0.38, -0.95],
  [-0.3, 0.45],
  [-0.22, -0.5],
  [0.22, 0.5],
  [0.3, -0.45],
  [0.38, 0.95],
]

export function buildDragonflyEgg(): InsectModel {
  const g = new THREE.Group()

  // ---- 材质：明度排成七档（见文件头），靠明度差把结构分开，不靠色相
  const skinMat = chitin({ color: '#4f7343', gloss: 0.14, surface: 'striate' }) // 纵向细棱 = 水草茎表皮
  const coreMat = chitin({ color: '#adba82', gloss: 0.14 }) // 通气组织：海绵状薄壁组织
  const faceMat = chitin({ color: '#c6d199', gloss: 0.16 }) // 剖口断面：最新鲜、最浅
  const bedMat = chitin({ color: '#b6c088', gloss: 0.16 }) // 卵床：托住卵的那一层组织
  const eggMat = chitin({ color: '#fbf3d4', gloss: 0.62, clearcoat: 0.4, translucent: true }) // 淡黄半透
  const scarMat = chitin({ color: '#1d2b12', gloss: 0.24 }) // 刻痕内的阴影
  const lipMat = chitin({ color: '#8fae6a', gloss: 0.2 }) // 被产卵器顶开的皮缘，比茎皮亮一档
  const slotMat = chitin({ color: '#8c9a63', gloss: 0.14 }) // 卵槽：每粒卵自己那一道凹坑的阴影面

  // ---- 完好的两段茎：略带锥度，看起来是从一根长茎上截下来的一节
  for (const [x0, x1, r0, r1] of [
    [STEM_X0, WIN_X0, STEM_R * 0.96, STEM_R],
    [WIN_X1, STEM_X1, STEM_R, STEM_R * 0.86],
  ] as const) {
    const sections: Section[] = []
    const steps = 6
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3(THREE.MathUtils.lerp(x0, x1, t), 0, 0), ry: r, rz: r })
    }
    const piece = new THREE.Mesh(loft(sections, 24), skinMat)
    piece.name = 'stem-skin'
    g.add(piece)
  }

  /*
   * 一道茎节（node）：水草茎每隔一段有一个节，节上生叶。
   * 只做一道很浅的环脊 —— 它是「这是一根植物的茎，不是一段木棍/一根管子」
   * 的最省的一笔。做在完好的那一端上，不跟刻痕抢位置。
   */
  {
    const node = new THREE.Mesh(new THREE.TorusGeometry(STEM_R * 0.98, 0.0075, 8, 22), skinMat)
    node.rotation.y = Math.PI / 2 // 环面法线转到 +X，套在茎上
    node.position.x = STEM_X1 - 0.07
    node.name = 'stem-node'
    g.add(node)
  }

  /*
   * 剖开的中段：把上面 210° 整个揭掉，只剩下面 150° 的一条「摇篮」。
   *
   * CylinderGeometry 的顶点是 x = r·sinθ、z = r·cosθ，轴沿 +Y；把整个 mesh 绕 Z
   * 转 −90° 后 (x,y,z) → (y, −x, z)，于是角 θ 落在 (y,z) = (−r·sinθ, r·cosθ)。
   * 缺口要正对上方（+Y），中心须取 θ=270°，故壳体从 θ=30° 起、跨 120°。
   *
   * 为什么揭掉 240°（比蝉卵那一颗还多 30°）：四个验收机位里 front 的仰角只有
   * 17°、且正对茎的另一侧，第一版留 150° 壳时两条切边落在 y=−0.26R，
   * 刚好高过卵，那个机位里整段读成「一根光溜溜的绿管」。揭到 120° 后
   * 切边掉到 y=−0.5R，三粒卵整个立在边墙之上，任何高于边墙的视线都看得见。
   * `finalize()` 会给不透明材质统一开双面，所以摇篮内壁不会被背面剔除吃掉。
   */
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(STEM_R, STEM_R, WIN_X1 - WIN_X0, 28, 1, true, Math.PI / 6, (2 * Math.PI) / 3),
    skinMat,
  )
  shell.rotation.z = -Math.PI / 2
  shell.position.x = (WIN_X0 + WIN_X1) / 2
  shell.name = 'stem-skin'
  g.add(shell)

  // 通气组织内衬：同一段筒、半径小一圈、角度窄一点。有了它，剖开处读到的是
  // 「深绿的皮包着浅色的髓」，而不是一个发黑的空腔；茎皮只在切边露出一圈厚度。
  const lining = new THREE.Mesh(
    new THREE.CylinderGeometry(
      STEM_R * 0.86,
      STEM_R * 0.86,
      WIN_X1 - WIN_X0 - 0.006,
      28,
      1,
      true,
      (7 * Math.PI) / 36,
      (11 * Math.PI) / 18,
    ),
    coreMat,
  )
  lining.rotation.z = -Math.PI / 2
  lining.position.x = (WIN_X0 + WIN_X1) / 2
  lining.name = 'stem-core'
  g.add(lining)

  // ---- 窗口两端的断面：一整片浅色圆盘，露在开口里就是「茎被剖开」的直接证据
  for (const [x, sign] of [
    [WIN_X0 + 0.005, 1],
    [WIN_X1 - 0.005, -1],
  ] as const) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(STEM_R * 0.96, 22), faceMat)
    face.rotation.y = (sign * Math.PI) / 2
    face.position.x = x
    face.name = 'stem-face'
    g.add(face)
  }

  /*
   * 卵床：一层浅色组织，横向**撑满**摇篮在这个高度上的弦长。
   * 不撑满的话下方会露出一条黑缝，整段读成「一条船」（蝉卵第一版的病）。
   */
  {
    const bedY = -0.055
    const halfChord = Math.sqrt(STEM_R * STEM_R - bedY * bedY) - 0.002
    const sections: Section[] = []
    const steps = 10
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const taper = t < 0.08 ? 0.55 + (t / 0.08) * 0.45 : t > 0.92 ? 0.55 + ((1 - t) / 0.08) * 0.45 : 1
      sections.push({
        at: new THREE.Vector3(THREE.MathUtils.lerp(WIN_X0 + 0.004, WIN_X1 - 0.004, t), bedY, 0),
        ry: 0.03,
        rz: halfChord * taper,
      })
    }
    const bed = new THREE.Mesh(loft(sections, 20), bedMat)
    bed.name = 'egg-bed'
    g.add(bed)
  }

  /*
   * 卵：3 粒，沿茎轴排成一列、左右微微交错，各躺在自己的一道斜缝里。
   *
   * 几何沿 +X 建一次、三个 mesh 共用 —— 除了省面数，更要紧的是让局部包围盒
   * 恰好等于 (卵长, 直径, 直径)，测试量长径比时不会被摆放姿态污染
   * （若把卵直接放样在最终位置上，斜置会让 x 跨度里混进侧向分量，
   *   量出来的「长径比」和人看到的细长程度就不是同一件事了）。
   */
  const eggGeo = spindle([0, 0, 0], [EGG_LEN, 0, 0], EGG_R, {
    bulge: 0.46,
    steps: 14,
    taperStart: 0.16, // 后端钝圆
    taperEnd: 0.06, // 前端略尖
  })
  for (const [cx, cz] of EGG_SLOTS) {
    /*
     * 先在卵床上压出**这一粒卵自己的凹槽**，再把卵放进去。
     * 没有凹槽时三粒卵是躺在一块平板上的三粒米（第一版实拍就是这样）；
     * 有了槽，读到的才是「一粒一缝、逐粒送进组织里」——
     * 内产卵这件事的全部意思就在这一道缝上。
     */
    const slot = new THREE.Mesh(
      spindle(
        [cx - EGG_LEN * 0.62 * Math.cos(EGG_TILT), -0.028 + EGG_LEN * 0.62 * Math.sin(EGG_TILT), cz],
        [cx + EGG_LEN * 0.62 * Math.cos(EGG_TILT), -0.028 - EGG_LEN * 0.62 * Math.sin(EGG_TILT), cz],
        EGG_R * 1.75,
        { bulge: 0.5, steps: 10, flat: 1.35, taperStart: 0.2, taperEnd: 0.2 },
      ),
      slotMat,
    )
    slot.name = 'egg-slot'
    g.add(slot)

    const egg = new THREE.Mesh(eggGeo, eggMat)
    egg.name = 'egg'
    // rotation 绕的是几何原点（卵的后端），所以位置要按卵长的一半补偿回中心
    egg.rotation.z = -EGG_TILT
    egg.position.set(
      cx - Math.cos(EGG_TILT) * EGG_LEN * 0.5,
      -0.004 + Math.sin(EGG_TILT) * EGG_LEN * 0.5,
      cz,
    )
    g.add(egg)
  }

  /*
   * 完好茎皮上的产卵刻痕：一列短缝，左右微微交错。
   * 真实的产卵痕就是这样一列 —— 雌虫沿茎一路向下退着产，一粒一缝。
   * 缝本身近黑（12%），两侧各一条被顶开、翘起的浅色皮缘（55%）：
   * 深/浅两档并置才看得出是「裂开的」，只做一条暗线会读成一道划痕。
   */
  for (const [sx, az] of SCARS) {
    const half = 0.055
    const ny = Math.cos(az)
    const nz = Math.sin(az)
    /*
     * 缝做成一根**细而圆**的短棒，不做扁片。
     * 第一版按「缝是扁的」把断面压扁（flat 2.0）——但压扁的方向是固定的 Y，
     * 而刻痕绕着茎排在不同方位角上，于是只有正上方那一道是扁的，
     * 其余几道被压成了横躺的叶片形，四机位实拍一致读成「贴了几片深色叶子」。
     * 细圆棒在任何方位角上都是一条等宽的线，这才是「一道缝」的样子。
     */
    const slit = new THREE.Mesh(
      spindle(
        [sx - half, STEM_R * 0.99 * ny, STEM_R * 0.99 * nz],
        [sx + half, STEM_R * 0.99 * ny, STEM_R * 0.99 * nz],
        0.0085,
        { bulge: 0.5, steps: 8, taperStart: 0.05, taperEnd: 0.05 },
      ),
      scarMat,
    )
    slit.name = 'scar'
    g.add(slit)

    // 皮缘：沿缝的切向法线让开一点，做成两条细长的翘边
    for (const lz of [1, -1]) {
      const off = 0.017 * lz
      const oy = -nz * off
      const oz = ny * off
      const lip = new THREE.Mesh(
        spindle(
          [sx - half * 0.85, STEM_R * 1.01 * ny + oy, STEM_R * 1.01 * nz + oz],
          [sx + half * 0.85, STEM_R * 1.01 * ny + oy, STEM_R * 1.01 * nz + oz],
          0.0065,
          { bulge: 0.5, steps: 8, taperStart: 0.1, taperEnd: 0.1 },
        ),
        lipMat,
      )
      lip.name = 'scar-lip'
      g.add(lip)
    }
  }

  // ---- 整体转向（理由见文件头）
  const root = new THREE.Group()
  g.rotation.set(0, STEM_YAW, STEM_PITCH)
  root.add(g)

  const anchors: Record<string, THREE.Vector3> = {
    // 茎轴上的原点：测试拿它 + STEM_DIR 复原茎轴，量「卵到茎轴的垂距」
    stem: toModel(0, 0, 0),
    egg: toModel(0, 0.02, 0.022),
    scar: toModel(SCARS[3][0], STEM_R * Math.cos(SCARS[3][1]), STEM_R * Math.sin(SCARS[3][1])),
    core: toModel(WIN_X0 + 0.02, -0.02, 0),
  }

  return finalize(root, anchors)
}
