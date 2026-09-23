/**
 * 中华大锹甲 · 卵 Dorcus hopei（完全变态第 1 阶段）
 *
 * ## 招牌不在卵上，在「朽木里啃出来的小坑」
 *
 * 锹甲的卵本身跟犀金龟的卵一样没什么可看：乳白、椭圆、三毫米出头。
 * 两者真正的分别在**产在哪里**：犀金龟把卵产进腐殖土（`rhinoceros-beetle-egg.ts`
 * 做的是一圈土粒），锹甲雌虫则是用上颚在**半腐朽的阔叶树木材**上啃出一个
 * 小坑，把卵产进去，再用啃下的木屑把坑口松松地填回去。
 * 所以这一件的主体是一小块朽木：顺着木纹的纤维束 + 一个浅坑 + 坑沿一撮木屑。
 * 同为「半埋着的乳白椭球」，一个在土粒里、一个在木纤维里，并排看才分得出
 * 这是两种虫的卵 —— 这正是生活史里「锹甲吃朽木、独角仙吃腐殖土」那条线的起点。
 *
 * ## 招牌结构
 *
 * 1. **卵：乳白、椭圆，3.3 × 2.6 毫米**（模型 0.33 × 0.26）。刚产下时是长椭圆，
 *    孵化前吸水胀成近圆球、直径 4 毫米上下。取「产下不久」这一档：轴比 1.27，
 *    比独角仙那颗（1.13）明显更长 —— 「刚产时椭圆」要读得出来。
 * 2. **朽木块，顺纹纤维。** 木头的辨识特征是**顺纹的纤维**，不是颗粒（颗粒是土）。
 *    做成一整块实体（高度场顶面 + 侧壁），顶面沿木纹按条起伏、条条高低深浅
 *    不同（种子化，见 `rng`），两端按条参差缩进 —— 朽木被掰开时的撕裂茬口。
 * 3. **啃出来的坑。** 纤维束的顶面在卵周围按高斯形往下凹（`pitDepth`），
 *    卵的下半陷在坑里、上半完全露出来。坑沿以外的木面才是平的。
 *    ⚠️ 坑不能挖深：展台默认机位仰角只有约 16°，坑沿高过卵的赤道，默认那一眼
 *    就只看得见一圈木头（测试卡「至少三成卵面高过木面最高处」）。
 * 4. **坑沿一撮木屑。** 比木面浅一档的细碎卷曲短屑 —— 刚被上颚啃出来、还没氧化
 *    变深的新鲜木质。这一小撮是「坑是啃出来的」的直接证据；只铺在坑沿，
 *    绝不盖到卵的上半。
 *
 * ## 颜色与材质纪律
 *
 * - 卵壳 `#efe6d0` 乳白不压，`gloss 0.42` / `clearcoat 0.05`，**不开 `translucent`**：
 *   独角仙那颗卵做过开/关对照，transmission 会在 `loft()` 接缝上折射出一道
 *   贯穿卵身的亮线，读成「卵壳裂了」。
 * - 朽木基色 `#7b5a36`（明度 0.35），顶点色在 ×0.5~×1.7 之间浮动：白腐朽的木材
 *   本身偏浅，但它是背景，得比卵深一大截才衬得出那一粒白；坑里提亮一档，
 *   是被啃开后露出的新鲜木质。再压到近黑就不像朽木而像炭。
 *
 * 尺度按真实比例：卵只有毫米级，`finalize()` 的 radius 归一化会让它在画面里
 * 撑满，真实大小交给界面文字说。
 *
 * 局部坐标系与成虫一致：+X 向前、+Y 向上、+Z 向右。卵的长轴与木纹同向，摆在 X 上
 * （雌虫顺着木纹啃坑，坑本来就是顺纹拉长的）。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度

/** 卵的长径（沿 X）与短径 */
const EGG_LENGTH = 0.33
const EGG_WIDTH = 0.26

/** 朽木块沿木纹（X）与横纹（Z）的半幅 */
const WOOD_HALF_X = 0.48
const WOOD_HALF_Z = 0.4
/** 顶面上的纤维条数（横纹方向）。每条宽 0.8/22 ≈ 0.036 */
const FIBER_COUNT = 22
/** 平处木面的高度（卵心在 y=0）。比卵的赤道略低：坑沿不高过卵的腰 */
const WOOD_TOP = -0.035
/** 坑深与坑的两个半轴（高斯形）。坑顺纹拉长，与卵同向 */
const PIT_DEPTH = 0.1
const PIT_AX = 0.25
const PIT_AZ = 0.19
/** 木屑数量 */
const CHIP_COUNT = 26

// ---------------------------------------------------------------- 工具

/**
 * 种子化 PRNG（mulberry32）。纤维与木屑都必须是**确定性**的随机：
 * 同一份代码在任何机器、任何一次构建里都要长成同一块木头，
 * 否则目视验收过的那张图跟用户看到的不是同一个东西。
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

/** 木面在 (x, z) 处的顶面高度：平处 WOOD_TOP，卵周围按高斯下凹，两侧边缘略塌 */
function woodTop(x: number, z: number): number {
  const pit = PIT_DEPTH * Math.exp(-((x / PIT_AX) ** 2 + (z / PIT_AZ) ** 2))
  // 朽木块的两个侧缘往下塌一点，整块读成「掰下来的一块」而不是一块板
  const edge = 0.07 * Math.pow(Math.abs(z) / WOOD_HALF_Z, 3)
  return WOOD_TOP - pit - edge
}

// ---------------------------------------------------------------- 部件

/**
 * 卵体：椭球 + 一端略粗。
 *
 * 用经纬球缩放，**不用 `loft()`**：loft 的极点封口沿用截面椭圆的径向法线，
 * 长轴端头会出现一个会聚的明暗尖点 —— 前斜机位正对卵的一极，出图上是一枚
 * 清清楚楚的「锥尖」，卵读成一颗子弹头。经纬球的极点法线是对的。
 * `ovoid` 让 −X 端略粗 —— 卵才不像一粒标准的胶囊。
 */
function eggBody(): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(1, 40, 28)
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i)
    const ovoid = 1 - 0.06 * u
    pos.setXYZ(i, u * (EGG_LENGTH / 2), pos.getY(i) * (EGG_WIDTH / 2) * ovoid, pos.getZ(i) * (EGG_WIDTH / 2) * ovoid)
  }
  geo.computeVertexNormals()
  return geo
}

/**
 * 朽木块：一整块实体，顶面是顺纹的纤维起伏 + 卵周围的坑，四周是撕裂的侧壁。
 *
 * ⚠️ 第一版是两层各自放样的纤维束，出图读成**一摞木条 / 一捆柴**：
 * 每条纤维都是独立的圆棍，侧视时一层层的边缘清清楚楚，跟「一块朽木」
 * 毫无关系。木头是一整块，纤维只是它表面的纹理 —— 所以这一版改成一张
 * 高度场：顶面沿 Z 按纤维间距起伏（窄而深的裂缝 + 宽而平的纤维脊），
 * 每条纤维各自高低不同；侧壁直接从顶面边缘垂到底。
 * 沿 X 的两端按条随机缩进，茬口是参差的撕裂面而不是锯平的。
 *
 * 颜色走顶点色（逐条纤维深浅不一 + 坑里露出浅色的新鲜木质），材质基色
 * 仍是那一档朽木黄褐 —— 测试量材质色即可知道「木头够不够深」。
 */
function rottenWood(mat: THREE.MeshPhysicalMaterial): THREE.Mesh {
  const rand = rng(0x57a9b1)
  const NZ = FIBER_COUNT * 6
  const NX = 40
  const BOTTOM = WOOD_TOP - 0.26

  // 每条纤维的高低、深浅、两端缩进
  const fibers = Array.from({ length: FIBER_COUNT }, () => ({
    lift: (rand() - 0.5) * 0.022,
    shade: 0.78 + rand() * 0.34,
    front: WOOD_HALF_X - rand() * 0.1,
    back: -WOOD_HALF_X + rand() * 0.1,
    phase: rand() * Math.PI * 2,
  }))
  const fiberAt = (v: number) => fibers[Math.min(FIBER_COUNT - 1, Math.floor(v * FIBER_COUNT))]

  const topPos: THREE.Vector3[] = []
  const topCol: number[] = []
  for (let j = 0; j <= NZ; j++) {
    const v = j / NZ
    const z = THREE.MathUtils.lerp(-WOOD_HALF_Z, WOOD_HALF_Z, v)
    const f = fiberAt(v)
    // 纤维之间的裂缝：|sin| 的尖谷 —— 窄而深，脊宽而平
    const local = v * FIBER_COUNT
    const crack = 1 - Math.pow(Math.abs(Math.sin(local * Math.PI)), 0.35)
    for (let i = 0; i <= NX; i++) {
      const u = i / NX
      const x = THREE.MathUtils.lerp(f.back, f.front, u)
      const pit = Math.exp(-((x / PIT_AX) ** 2 + (z / PIT_AZ) ** 2))
      // 坑里是啃平的：纤维起伏按坑的深浅淡出
      const relief = (1 - pit * 0.85) * (f.lift - crack * 0.028 + 0.004 * Math.sin(x * 19 + f.phase))
      topPos.push(new THREE.Vector3(x, woodTop(x, z) + relief, z))
      // 顶点色：纤维自身深浅 × 裂缝更暗 × 坑里提亮（新鲜木质）
      const c = f.shade * (1 - crack * 0.35) * (1 + pit * 0.55)
      topCol.push(c)
    }
  }

  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const push = (p: THREE.Vector3, c: number) => {
    positions.push(p.x, p.y, p.z)
    colors.push(c, c, c)
    return positions.length / 3 - 1
  }

  // 顶面
  const W = NX + 1
  for (let k = 0; k < topPos.length; k++) push(topPos[k], topCol[k])
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) {
      const a = j * W + i
      indices.push(a, a + W, a + 1, a + 1, a + W, a + W + 1)
    }
  }

  /*
   * 侧壁：沿顶面边界一圈，分 WALL_ROWS 层垂到底。
   * 每一层各自外凸/内缩一点、深浅不同 —— 断面上横向的一道道纤维层理；
   * 一整片平的侧壁读成「一块塑料托盘」（第二版实撞）。
   * 侧壁取该条纤维自身的深浅，**不带**顶面的「裂缝压暗」：±Z 两条边恰好
   * 落在裂缝谷底（crack = 1），带上它整面侧壁会被压到近黑。
   */
  const WALL_ROWS = 7
  const ring: number[] = []
  for (let i = 0; i <= NX; i++) ring.push(i) // z = −HALF 那条边
  for (let j = 1; j <= NZ; j++) ring.push(j * W + NX) // 前端
  for (let i = NX - 1; i >= 0; i--) ring.push(NZ * W + i) // z = +HALF 那条边
  for (let j = NZ - 1; j >= 1; j--) ring.push(j * W) // 后端
  const rows = Array.from({ length: WALL_ROWS + 1 }, (_, r) => ({
    bulge: r === 0 ? 0 : (rand() - 0.5) * 0.028,
    shade: r === 0 ? 1 : 0.8 + rand() * 0.3,
  }))
  const wall: number[][] = []
  for (let r = 0; r <= WALL_ROWS; r++) {
    const s = r / WALL_ROWS
    wall.push(
      ring.map((k) => {
        const p = topPos[k]
        // 越往下越内收（断面不是一堵垂直的墙），再叠上本层的凸凹
        const inset = 1 - 0.06 * s + rows[r].bulge
        const y = THREE.MathUtils.lerp(p.y, BOTTOM, s)
        const c = fiberAt(Math.floor(k / W) / NZ).shade * 0.9 * rows[r].shade * (1 - 0.22 * s)
        return push(new THREE.Vector3(p.x * inset, y, p.z * inset), c)
      }),
    )
  }
  for (let r = 0; r < WALL_ROWS; r++) {
    const up = wall[r]
    const lo = wall[r + 1]
    for (let k = 0; k < ring.length; k++) {
      const n = (k + 1) % ring.length
      // 绕向与顶面一致（外法线朝外）。第一版绕反了：computeVertexNormals 给出
      // 内法线，整面侧壁近乎全黑 —— finalize() 的双面材质也救不回来（实撞）
      indices.push(up[k], up[n], lo[k], up[n], lo[n], lo[k])
    }
  }
  // 底面：扇形封口，另起一套顶点 —— 与侧壁共用的话侧壁底部法线会被拉向下方
  const lower = wall[WALL_ROWS]
  const center = push(new THREE.Vector3(0, BOTTOM, 0), 0.5)
  const floor = lower.map((k) => push(new THREE.Vector3(positions[k * 3], positions[k * 3 + 1], positions[k * 3 + 2]), 0.5))
  for (let k = 0; k < ring.length; k++) indices.push(center, floor[k], floor[(k + 1) % ring.length])

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  // uv 给测试与贴图留个位（全零即可，这块木头不挂贴图）
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((positions.length / 3) * 2).fill(0), 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()

  mat.vertexColors = true
  const mesh = new THREE.Mesh(geo, mat)
  mesh.name = 'rotten-wood'
  return mesh
}

/**
 * 坑沿的木屑：细碎、略卷的短屑，比木面浅一档（新鲜啃出的木质）。
 *
 * ⚠️ 第一版按金角螺旋均匀排成一圈，出图是整整齐齐的一个「光环」，读成装饰。
 * 雌虫是把屑往坑里**推**回去的，屑是**一堆**：这里改成纯随机方位 + 偏向后方
 * （−X）扎堆，离卵心按椭圆半径 0.8~1.6 倍 —— 最近的几片斜靠在卵的下半截上。
 * 高度贴着木面，于是它们只兜住卵的下半，卵的上半始终露在外面。
 */
function chewedChips(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const rand = rng(0xc41b5)
  for (let i = 0; i < CHIP_COUNT; i++) {
    // 方位角集中在后方 ±110° 内（i 的前三分之二），其余零星散在别处
    const az = i < CHIP_COUNT * 0.65 ? Math.PI + (rand() - 0.5) * 3.8 : rand() * Math.PI * 2
    const k = 0.8 + Math.pow(rand(), 1.6) * 0.8
    const x = Math.cos(az) * PIT_AX * k
    const z = Math.sin(az) * PIT_AZ * k
    const len = 0.035 + rand() * 0.06
    const r = 0.006 + rand() * 0.007
    const heading = rand() * Math.PI
    const curl = (rand() - 0.5) * 0.5
    const sections: Section[] = []
    for (let s = 0; s <= 5; s++) {
      const t = s / 5 - 0.5
      const a = heading + curl * t
      const px = x + Math.cos(a) * len * t
      const pz = z + Math.sin(a) * len * t
      sections.push({
        at: new THREE.Vector3(px, woodTop(px, pz) + r * 0.6 + 0.012 * (1 - 4 * t * t), pz),
        // 刨花是薄片：上下扁、左右宽
        ry: r * 0.45,
        rz: r * 1.2,
      })
    }
    const chip = new THREE.Mesh(loft(sections, 7), mat)
    chip.name = 'wood-chip'
    g.add(chip)
  }
  return g
}

// ---------------------------------------------------------------- 装配

export function buildStagBeetleEgg(): InsectModel {
  const g = new THREE.Group()

  // 卵壳：乳白、哑光、无清漆、不透射（理由见文件头「颜色与材质纪律」）
  const shellMat = chitin({ color: '#efe6d0', gloss: 0.42, clearcoat: 0.05, surface: 'smooth' })
  // 朽木：哑光黄褐。逐条纤维的深浅差交给顶点色（见 rottenWood），基色只定档
  const woodMat = chitin({ color: '#7b5a36', gloss: 0.1, clearcoat: 0 })
  // 新鲜木屑：比木面浅一档，但仍比卵深得多（明度约 0.6 对 0.88）
  const chipMat = chitin({ color: '#b8935e', gloss: 0.14, clearcoat: 0 })

  const egg = new THREE.Mesh(eggBody(), shellMat)
  egg.name = 'egg-shell'
  g.add(egg)
  g.add(rottenWood(woodMat))
  g.add(chewedChips(chipMat))

  const anchors: Record<string, THREE.Vector3> = {
    egg: new THREE.Vector3(0, EGG_WIDTH * 0.45, 0),
    woodPit: new THREE.Vector3(WOOD_HALF_X * 0.7, WOOD_TOP, WOOD_HALF_Z * 0.6),
  }

  return finalize(g, anchors)
}
