/**
 * 星天牛 · 卵 Anoplophora chinensis（完全变态第 1 阶段）
 *
 * ## 这一阶段的招牌不是卵本身，是「刻槽」
 *
 * 星天牛的卵是一枚 5~6 毫米的乳白长椭球，**单看它跟任何一种甲虫的卵都没区别**。
 * 真正认得出来的是它待的地方：雌虫先用上颚在树皮上咬出一个「人」字形（也有做成
 * 「T」形的）刻槽，把产卵管插进槽里，一槽一卵，再用分泌物把槽口封住。
 * 所以本文件的主体其实是**一小块带刻槽的树皮**，卵嵌在槽里。
 *
 * 这条判断跟 `rhinoceros-beetle-egg.ts` 的土室是同一个理由（那边写得很清楚）：
 * 一颗孤零零的乳白椭球，人看了会说「一粒米」；把它放回它该在的地方，
 * 人才会说「这是虫卵」。而对本种，语境还多担一件事 —— 图鉴里这条生活史的
 * 主线是**蛀干**（卵在树皮里、幼虫在木质部里、蛹在木质部的蛹室里），
 * 第一阶段就得把「树」交代出来，后两阶段才好接着讲。
 *
 * ## 招牌结构（做不出就等于没做）
 *
 * 1. **「人」字形刻槽。** 顶点朝前（+X）、两臂向后外侧分开，夹角约 70°。
 *    实现上不是「在一整块皮上挖一道沟」（没有 CSG），而是**把树皮脊逐条截断**：
 *    每一条纵向的树皮脊在与刻槽相交处断开一段，断口两侧的脊还各自压低一档
 *    （见 `GROOVE_END_TAPER`）—— 那是被上颚啃出来的斜坡，不是刀切的直壁。
 *    断开处露出下面一层浅色的**内皮**（`groove-floor`），这正是新鲜刻槽的样子：
 *    外层深褐的栓皮被咬掉，露出黄白的韧皮部。
 *    ⚠️ 断开量沿臂长按 `√(1−t²)` 收到零，两臂末端因此是圆钝的尖 ——
 *    等宽的槽两端会留下两个方头，读成「铣出来的」而不是「啃出来的」。
 * 2. **卵嵌在槽里，不是摆在皮上。** 卵心比脊冠低 0.02、比槽底高 0.05，
 *    左右各留出 0.03 的净空 —— 半陷在槽里、上半截完全露出来。
 *    再沉一点就看不见了（那才是真实的：产完卵雌虫会把槽口封住），
 *    这里取「刚产下、尚未封口」的那一瞬，否则这个阶段没有任何可看的东西。
 * 3. **树皮要真的像树皮。** 一块光板配一道槽，读起来是「木头上刻了个记号」。
 *    所以外层做成 24 条**纵向脊**：宽窄、高矮、色深浅逐条随机（种子化，
 *    见 `rng`），沿轴还带缓慢起伏。真实树皮的辨识特征就是这种纵向的、
 *    参差不齐的裂纹，跟腐殖土靠颗粒、木材靠年轮是一回事。
 * 4. **啃下来的碎屑。** 槽边散着十几片深浅不一的皮屑，其中几片是浅色的内皮渣。
 *    这一小把碎屑是「这个槽是啃出来的」的唯一直接证据。
 *
 * ## 姿态：为什么整块皮要绕 X 轴转 60°
 *
 * 树皮面若朝正上方（局部 +Y），展台默认机位（相机在 [2,1,3]，仰角只有 16°）
 * 看过去几乎是掠射的，刻槽会被压成一条细缝 —— 招牌结构在默认那一眼里等于没有。
 * 绕 X 轴转 60° 之后表面法线变成 (0, 0.5, 0.87)，与默认机位视线的夹角约 34°，
 * 顶/侧/前斜三个验收机位也都能看到槽面（只有后斜机位看到的是背面，
 * 那是任何一块平板都躲不掉的）。真实的产卵刻槽本来就多在主干侧面，
 * 也就是说这个角度不是为了好看编出来的。
 *
 * ## 颜色纪律
 *
 * 乳白色的东西在 ACES 下是**反过来最危险**的一档：压深就是脏灰。
 * 所以卵壳 `#f3e9cf`（明度 0.88）不压、不上清漆（`clearcoat 0.05`），
 * 也**不开 `translucent`** —— 后者会在放样接缝上折射出一道贯穿卵身的亮线，
 * 读成「卵壳裂了」（`rhinoceros-beetle-egg.ts` 做过开/关对照，那道线当场消失）。
 * 树皮反过来可以放心压深（明度 0.15~0.28）：它是背景，深底才把乳白的卵衬出来。
 * 槽底的内皮取中间档（0.51），既跟深树皮分得开，也不会跟卵抢亮。
 *
 * 局部坐标系与成虫一致：+X 向前、+Y 向上、+Z 向右（姿态旋转前）。
 * 卵没有前后之分，长轴顺着刻槽的臂摆。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度

/** 整块树皮绕 X 轴的姿态角（度）。理由见文件头「姿态」 */
const TILT_DEG = 60

/** 树皮外表面的曲率半径：这块皮取自直径约 5 厘米的枝干，弧度很缓但绝不是平板 */
const R_CURVE = 2.4
/** 沿干轴（局部 X）的半长 */
const PATCH_HALF_X = 0.66
/** 横向（局部 Z）上树皮脊铺开的半宽 */
const PATCH_HALF_Z = 0.56

/** 纵向树皮脊的条数。24 条时相邻脊心间距 0.047、脊半宽 0.034 —— 必然互相压叠，不会漏出底板 */
const RIDGE_COUNT = 24
/** 脊的半高（脊冠高出树皮基准面这么多） */
const RIDGE_HALF_H = 0.075
/** 脊的半宽（横向）。必须大于间距的一半，否则脊与脊之间会开天窗 */
const RIDGE_HALF_W = 0.034

/** 底板（树皮的深层，永远不露出来，只负责堵住脊与脊之间的缝） */
const BASE_RY = 0.2
const BASE_RZ = 0.62
/** 底板中心的 Y。取值让底板顶面在任何 z 处都低于脊的底面（算过：最紧处仍留 0.035） */
const BASE_Y = -0.34

// ---------------------------------------------------------------- 刻槽

/** 「人」字的顶点在干轴上的位置 */
const APEX_X = 0.28
/** 两臂沿 −X 退开的距离 */
const ARM_DX = 0.58
/** 两臂末端离中线的横向距离。臂与干轴夹角 = atan(0.40/0.58) ≈ 35°，两臂张角约 70° */
const ARM_Z = 0.4
/**
 * 脊被截断的半长（沿 X 量）。臂与 X 轴成 35°，所以槽的**垂直宽度**
 * 只有 0.245×2×sin35° ≈ 0.28 —— 刚好比卵宽一点点，卵才嵌得进去又不至于晃荡。
 */
const GAP_HALF_X = 0.245
/** 槽底比树皮基准面低多少（= 槽深，脊冠到槽底共 0.15） */
const GROOVE_DEPTH = 0.075
/** 槽底那层内皮的半厚 */
const FLOOR_HALF_T = 0.05
/** 断口处脊高压低到原值的这个比例：啃出来的斜坡，不是切出来的直壁 */
const GROOVE_END_TAPER = 0.3

// ---------------------------------------------------------------- 卵

/** 卵长 5.5 毫米（真实 5~6） */
const EGG_LEN = 0.55
/** 卵的半径 0.78 毫米（真实短径 1.5~1.8 毫米） */
const EGG_R = 0.078
/** 卵身的弯曲量（弓高）。长椭圆「略弯」是本种卵的描述，做直了就是一粒米 */
const EGG_BEND = 0.042
/** 卵心落在哪条臂的哪个位置（0 = 顶点，1 = 臂末端） */
const EGG_AT = 0.42
/** 卵放在 −Z 那条臂上 */
const EGG_SIDE = -1
/** 卵心高出槽底的量。0.052 = 半陷（卵半径 0.078） */
const EGG_LIFT = 0.052

// ---------------------------------------------------------------- 颜色

/** 卵壳：真正的乳白偏黄，不压深（明度 0.88） */
const EGG_COLOR = '#f3e9cf'
/** 树皮脊的四档深浅。最深的一档压住背光面，最浅的做被光照到的棱 */
const BARK_COLORS = ['#4a3d31', '#3b3128', '#57493a', '#2f271f'] as const
/** 底板：比最深的脊还深一档，它本来就该沉在裂纹底下 */
const BASE_COLOR = '#2a231c'
/** 槽底的内皮（韧皮部）：新鲜咬开时是黄白的，明度 0.51，跟深树皮和乳白卵都分得开 */
const FLOOR_COLOR = '#b08d55'
/** 内皮碎屑：比槽底再浅一点，读成刚啃下来的新茬 */
const CHIP_PALE_COLOR = '#c7a877'

// ---------------------------------------------------------------- 工具

/**
 * 种子化 PRNG（mulberry32）。树皮的随机必须是**确定性**的：
 * 同一份代码在任何机器上都要长成同一块皮，否则目视验收过的那张图
 * 跟用户看到的不是同一个东西。
 */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 树皮基准面（脊心所在的那条弧）在横向 z 处的高度 */
function surfaceY(z: number): number {
  return Math.sqrt(Math.max(R_CURVE * R_CURVE - z * z, 0)) - R_CURVE
}

/** 「人」字在横向 z 处截断脊的中心位置（帐篷函数：z=0 最靠前，往两侧退） */
function grooveCenterX(z: number): number {
  return APEX_X - ARM_DX * Math.min(Math.abs(z) / ARM_Z, 1)
}

/** 该处截断的半长。按 √(1−t²) 收到零 —— 两臂末端才是圆钝的尖而不是方头 */
function grooveHalfX(z: number): number {
  const t = Math.abs(z) / ARM_Z
  return t >= 1 ? 0 : GAP_HALF_X * Math.sqrt(1 - t * t)
}

// ---------------------------------------------------------------- 树皮

/**
 * 一段纵向树皮脊。
 *
 * 沿 X 放样（`loft` 对直路径的标架恰好是 ry→Y、rz→Z，所以截面椭圆天然是
 * 「立着的」），两端把高度与宽度一起收掉：外端收到 0.12（皮块的边缘），
 * 槽边那端收到 `GROOVE_END_TAPER`（被啃出来的斜坡）。
 *
 * 沿轴的高度起伏用两条不同频率的正弦叠加，而不是逐点随机 —— 逐点随机
 * 在这个采样密度下会读成噪点，缓慢起伏才读成木头。
 */
function barkRidge(
  z0: number,
  x0: number,
  x1: number,
  halfH: number,
  halfW: number,
  yOffset: number,
  endIn: number,
  endOut: number,
  seed: number,
  material: THREE.Material,
): THREE.Mesh {
  const steps = 14
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(x0, x1, t)
    // 两端的收束：0.18 的过渡带内从端点值平滑抬到 1
    const inF = THREE.MathUtils.lerp(endIn, 1, THREE.MathUtils.smoothstep(t, 0, 0.18))
    const outF = THREE.MathUtils.lerp(endOut, 1, THREE.MathUtils.smoothstep(1 - t, 0, 0.18))
    const taper = inF * outF
    const wave = 0.82 + 0.11 * Math.sin(x * 4.3 + seed) + 0.07 * Math.sin(x * 9.7 + seed * 2.7)
    const z = z0 + 0.01 * Math.sin(x * 5.9 + seed * 1.3)
    sections.push({
      at: new THREE.Vector3(x, surfaceY(z) + yOffset, z),
      ry: Math.max(halfH * wave * taper, 1e-3),
      // 宽度只在最外 8% 收，中间保持满宽 —— 收早了脊与脊之间会开缝
      rz: Math.max(halfW * THREE.MathUtils.clamp(Math.min(t, 1 - t) / 0.08, 0.3, 1), 1e-3),
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 10), material)
  mesh.name = 'bark-ridge'
  return mesh
}

/** 24 条纵向脊，其中 18 条被「人」字刻槽截成两段（臂长之外的那些不截） */
function barkRidges(materials: readonly THREE.Material[]): THREE.Group {
  const g = new THREE.Group()
  const rand = rng(0x7a2b19)
  const step = (2 * PATCH_HALF_Z) / RIDGE_COUNT
  for (let i = 0; i < RIDGE_COUNT; i++) {
    const z0 = -PATCH_HALF_Z + (i + 0.5) * step
    const halfH = RIDGE_HALF_H * (0.72 + rand() * 0.5)
    const halfW = RIDGE_HALF_W * (0.9 + rand() * 0.3)
    const yOff = -rand() * 0.028
    const mat = materials[Math.floor(rand() * materials.length)]
    const seed = rand() * 40

    const cut = grooveHalfX(z0)
    if (cut <= 0.001) {
      g.add(barkRidge(z0, -PATCH_HALF_X, PATCH_HALF_X, halfH, halfW, yOff, 0.12, 0.12, seed, mat))
      continue
    }
    const cx = grooveCenterX(z0)
    // 后段（槽的 −X 侧）：太短就不做，免得在皮块边缘留一枚孤零零的小疙瘩
    if (cx - cut - -PATCH_HALF_X > 0.09) {
      g.add(barkRidge(z0, -PATCH_HALF_X, cx - cut, halfH, halfW, yOff, 0.12, GROOVE_END_TAPER, seed, mat))
    }
    if (PATCH_HALF_X - (cx + cut) > 0.09) {
      g.add(barkRidge(z0, cx + cut, PATCH_HALF_X, halfH, halfW, yOff, GROOVE_END_TAPER, 0.12, seed, mat))
    }
  }
  return g
}

/** 底板：一条沿 X 的扁放样体，只负责在脊与脊的缝隙底下堵住背景，永远不该被单独看见 */
function barkBase(material: THREE.Material): THREE.Mesh {
  const steps = 12
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const x = THREE.MathUtils.lerp(-PATCH_HALF_X, PATCH_HALF_X, i / steps)
    sections.push({ at: new THREE.Vector3(x, BASE_Y, 0), ry: BASE_RY, rz: BASE_RZ })
  }
  const mesh = new THREE.Mesh(loft(sections, 24), material)
  mesh.name = 'bark-base'
  return mesh
}

/**
 * 刻槽的槽底：一臂一条浅色扁带，沿臂放样。
 *
 * 半宽（0.18 起、往臂端收）刻意比脊的断口还宽 —— 多出来的部分塞进脊底下，
 * 断口边缘因此不会漏出黑洞。这条「宽出去一点、藏进去」的做法跟
 * `rhinoceros-beetle-larva.ts` 的腹端深色外壳是同一个套路。
 */
function grooveFloor(side: 1 | -1, material: THREE.Material): THREE.Mesh {
  const steps = 16
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = APEX_X - ARM_DX * t
    const z = side * ARM_Z * t
    sections.push({
      at: new THREE.Vector3(x, surfaceY(z) - GROOVE_DEPTH - FLOOR_HALF_T, z),
      ry: FLOOR_HALF_T,
      rz: 0.16 * Math.sqrt(Math.max(0, 1 - t * t)) + 0.02,
    })
  }
  const mesh = new THREE.Mesh(loft(sections, 14), material)
  mesh.name = 'groove-floor'
  return mesh
}

// ---------------------------------------------------------------- 卵

/** 臂上参数 t 处的点（槽底面上） */
function armPoint(side: 1 | -1, t: number): THREE.Vector3 {
  const x = APEX_X - ARM_DX * t
  const z = side * ARM_Z * t
  return new THREE.Vector3(x, surfaceY(z) - GROOVE_DEPTH, z)
}

/**
 * 卵体：沿刻槽那条臂放样的长椭球，中段略弯。
 *
 * 不用 `spindle()` —— 它的半径包络两端收成尖，做出来是个柠檬。
 * 这里直接喂 `loft()` 一条真正的椭圆母线 `r = R·√(1−u²)`，两极是光滑球冠；
 * 钝端（后极）再略粗 7%，卵才不像一颗对称的胶囊。
 */
function eggBody(material: THREE.Material): THREE.Mesh {
  const armLen = Math.hypot(ARM_DX, ARM_Z)
  const dir = new THREE.Vector3(-ARM_DX / armLen, 0, (EGG_SIDE * ARM_Z) / armLen)
  // 弯曲方向：贴着树皮面、垂直于臂（往槽外一侧鼓）
  const bendDir = new THREE.Vector3(-dir.z, 0, dir.x)
  const mid = armPoint(EGG_SIDE, EGG_AT).addScaledVector(new THREE.Vector3(0, 1, 0), EGG_LIFT)

  const steps = 26
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const u = (i / steps) * 2 - 1
    const ovoid = 1 + 0.07 * u
    const r = Math.max(EGG_R * Math.sqrt(Math.max(0, 1 - u * u)) * ovoid, 1e-4)
    const at = mid
      .clone()
      .addScaledVector(dir, (u * EGG_LEN) / 2)
      .addScaledVector(bendDir, EGG_BEND * (1 - u * u))
    sections.push({ at, ry: r, rz: r })
  }
  const mesh = new THREE.Mesh(loft(sections, 20), material)
  mesh.name = 'egg-shell'
  return mesh
}

// ---------------------------------------------------------------- 碎屑

/**
 * 槽边的皮屑：雌虫啃槽时崩下来的碎片。
 * 尺寸拉到 3 倍差、三轴各自压扁再随机滚转 —— 一堆同样大小的滚圆珠子读成装饰，
 * 大小悬殊、棱角朝向各异才读成碎屑（`rhinoceros-beetle-egg.ts` 的土粒同理）。
 */
function barkChips(materials: readonly THREE.Material[]): THREE.Group {
  const g = new THREE.Group()
  const rand = rng(0x33c1f5)
  for (let i = 0; i < 22; i++) {
    const t = rand()
    const side: 1 | -1 = rand() < 0.5 ? 1 : -1
    const along = armPoint(side, t)
    /*
     * 散在槽两侧 0.06~0.22 的地方，不落进槽里。
     * ⚠️ 落点必须**夹回脊铺开的范围内**：不夹的话最外侧的碎屑会落到 z=0.62，
     * 那里已经没有树皮脊了，只有低 0.30 的底板 —— 碎屑就悬在半空。
     * 这类「几何合法、断言也绿、只有出图才看得见」的毛病，本仓库栽过好几次
     * （蛴螬那排全埋进体壁的气门是同一类）。
     */
    const off = (0.06 + rand() * 0.16) * (rand() < 0.5 ? 1 : -1)
    const z = THREE.MathUtils.clamp(along.z + off, -PATCH_HALF_Z + 0.1, PATCH_HALF_Z - 0.1)
    const size = 0.016 * Math.pow(3.2, rand())
    /*
     * 落点还得**推出刻槽本身**：槽里没有脊，碎屑落进去就悬在槽口上方 0.16。
     * 直接按 z 偏移躲不开 —— 槽是斜的，沿 z 挪 0.06 只等于离槽心 0.049，
     * 而槽的垂直半宽有 0.14。这里拿画槽用的同一对函数把 x 推到槽沿之外，
     * 改槽的形状时碎屑跟着走。
     */
    let x = along.x + (rand() - 0.5) * 0.12
    const gc = grooveCenterX(z)
    const gh = grooveHalfX(z) + size + 0.04
    if (Math.abs(x - gc) < gh) x = gc + (x >= gc ? gh : -gh)
    x = THREE.MathUtils.clamp(x, -PATCH_HALF_X + 0.08, PATCH_HALF_X - 0.08)
    const chip = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), materials[Math.floor(rand() * materials.length)])
    chip.name = 'bark-chip'
    chip.position.set(x, surfaceY(z) + RIDGE_HALF_H * 0.5 + size * 0.4, z)
    chip.scale.set(0.4 + rand() * 0.7, 0.35 + rand() * 0.45, 0.4 + rand() * 0.7)
    chip.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    g.add(chip)
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildLonghornBeetleEgg(): InsectModel {
  const g = new THREE.Group()
  /*
   * 姿态层：整块皮绕 X 轴转 TILT_DEG（理由见文件头）。放在内层而不是根 group 上，
   * 是为了让 finalize() 的居中与包围球照旧在根上算；锚点则手工套同一个旋转，
   * 两者共用同一个角度常量，不会各改各的。
   */
  const pose = new THREE.Group()
  pose.name = 'bark-pose'
  pose.rotation.x = THREE.MathUtils.degToRad(TILT_DEG)
  g.add(pose)

  /*
   * 卵壳：gloss 0.4（宽而软的高光，不是镜面点）+ clearcoat 0.05（几乎没有第二层
   * 角度高光）。`elytra()` 那档 0.55 的清漆套在这个亮度的基色上必过曝成白铬，
   * 七星瓢虫与甘薯腊龟甲都栽过。也不开 translucent（见文件头「颜色纪律」）。
   */
  const eggMat = chitin({ color: EGG_COLOR, gloss: 0.4, clearcoat: 0.05, surface: 'smooth' })
  // 树皮：哑光、无清漆、挂刻点法线（栓皮本来就是坑坑洼洼的）
  const barkMats = BARK_COLORS.map((c) => chitin({ color: c, gloss: 0.12, clearcoat: 0, surface: 'punctate' }))
  const baseMat = chitin({ color: BASE_COLOR, gloss: 0.1, clearcoat: 0 })
  // 槽底的内皮：新鲜创面略带湿润感，所以 gloss 比外层树皮高一档，但仍不上清漆
  const floorMat = chitin({ color: FLOOR_COLOR, gloss: 0.26, clearcoat: 0.04, surface: 'punctate' })
  const chipMats = [...barkMats, chitin({ color: CHIP_PALE_COLOR, gloss: 0.2, clearcoat: 0 })]

  pose.add(barkBase(baseMat))
  // 槽底先加：脊后加才能把槽底多出来的那点宽度盖住
  pose.add(grooveFloor(1, floorMat))
  pose.add(grooveFloor(-1, floorMat))
  pose.add(barkRidges(barkMats))
  pose.add(barkChips(chipMats))
  pose.add(eggBody(eggMat))

  const eggCenter = armPoint(EGG_SIDE, EGG_AT).add(new THREE.Vector3(0, EGG_LIFT, 0))
  const grooveAt = armPoint(1, 0.5)
  const barkAt = new THREE.Vector3(-0.42, surfaceY(0.55) + RIDGE_HALF_H * 0.35, 0.55)

  const anchors: Record<string, THREE.Vector3> = {
    egg: eggCenter.clone(),
    // 槽底锚点落在**另一条臂**上：跟卵挤在同一条臂上时两个圆点会叠在一起
    groove: grooveAt.clone().add(new THREE.Vector3(0, 0.02, 0)),
    bark: barkAt,
  }
  const roll = new THREE.Euler(THREE.MathUtils.degToRad(TILT_DEG), 0, 0)
  for (const v of Object.values(anchors)) v.applyEuler(roll)

  return finalize(g, anchors)
}
