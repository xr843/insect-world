/**
 * 中华大刀螳 Tenodera sinensis · 卵鞘（ootheca）—— 不完全变态的第 1 阶段，越冬形态
 *
 * 单位与坐标系同成虫（../mantis.ts）：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上（背）、+Z 向右。
 *
 * ## 这个阶段要做的不是「一颗卵」，是卵鞘这个整体
 *
 * 图鉴里这一格的文案是「卵鞘（越冬）」（`data/insects.zh.ts` 的 `lifecycle`）。
 * 螳螂的卵**从来不是单独出现的**：雌虫产卵时从腹端喷出蛋白质泡沫，一边后退
 * 一边把卵一层层埋进泡沫里，泡沫在空气中硬化成一枚海绵质的壳 —— 卵鞘。
 * 冬天你在灌木上看到的那个褐色小面包就是它，里面裹着一二百粒卵。
 * 做一颗孤零零的卵，既不是人能在野外见到的东西，也讲不出「越冬」这件事。
 *
 * ## 形态依据
 *
 * - **体量**：中华大刀螳的卵鞘长 2.5~4 厘米（本模型 3.2）、高约 1.7、宽约 1.55。
 *   这是**真实尺寸**，不许为了好看放大 —— 卵鞘 3.2 厘米、若虫 3.5 厘米、
 *   成虫 7~9 厘米，这三个数之间的关系本身就是生活史要讲的内容
 *   （`stages.ts` 的头注释把这条写成了硬约束）。
 * - **形状**：前端（雌虫先产的一端）钝圆，向后逐渐收细，末端拖出一条短尾 ——
 *   那是产完最后一口泡沫、腹端离开时抽出来的。所以卵鞘是**前后不对称**的，
 *   做成一个左右对称的橄榄就丢掉了「它是一边后退一边堆出来的」这个信息。
 * - **招牌一：中央那条纵向的孵化带（emergence zone）。** 沿卵鞘背脊有一条
 *   颜色更浅、质地更细的窄带，若虫全部从这条带里钻出来 —— 它是卵鞘唯一的门。
 *   带上覆着一列**横向叠瓦状的小盖片**，每片盖住一处出口。
 *   这条带是「这是螳螂卵鞘」与「这是一块烂木头」的分界线，做丢了就白做了。
 * - **招牌二：两侧横向层叠的弧形纹。** 雌虫后退时分泌是**一阵一阵**的，
 *   于是壳壁由十几层前后叠压的泡沫层堆成，每层的前缘压在前一层的后缘上，
 *   在体侧形成一道道横向的弧棱。因为她后退时腹端还在左右摆动，
 *   层界不是笔直的横环，而是**从背脊向腹面向后偏斜**的弧（见 `LAYER_SKEW`）。
 *   本文件把这件事做成了**壳体本身的叠瓦包络**（`shingle()`），而不是贴在
 *   光管子上的几条纹 —— 叠瓦的那道坎是真的坎，会自己投影。
 * - **表面**：泡沫硬化后是海绵质的，不是光壳。零贴图资产的仓库里只能靠
 *   材质参数表达：`surface: 'punctate'`（随机圆坑法线）+ 极低 gloss，
 *   读出来就是「多孔、哑光」。
 * - **附着在枝条上**：卵鞘是糊在灌木细枝上过冬的，枝条从卵鞘两端穿出。
 *   有了这段枝，「挂在枝上越冬」这件事不用文案也读得出来；
 *   没有它，这东西悬在半空，谁也说不清它有多大、长在哪。
 *
 * ## 配色
 *
 * ACES 色调映射会提亮去饱和，于是本仓库有过「颜色压深一档」的经验 ——
 * 但它一度被误解成「越深越保险」，结果招牌图案在画面上直接消失（10 只里 7 只返工）。
 * 卵鞘全身都是褐色系，最容易糊成一团泥，所以这里把**明度排成四档**：
 *
 *   孵化带 0.87（近白的暖米色） > 盖片 0.79 > 壳体 0.59（米黄褐） > 层界 0.34 > 树皮 0.22（近黑褐）
 *
 * 也就是说：招牌那条带是全画面最亮的东西，层界是壳上最暗的线，
 * 两者夹着中间调的壳面。测试逐对钉住这四档。
 *
 * **但材质的明度差不等于出图上的明度差**，这只虫第一版正栽在这里：
 * 孵化带即使给成**纯白**，顶视实测亮度也只有 0.658，而米黄褐的壳体是 0.662 ——
 * 招牌那条浅带在画面上等于不存在，怎么调颜色都救不回来。根因不在颜色，
 * 在法线（见 `oothecaShell()` 末尾那段注释）。修好之后同一组颜色量出来是：
 * 带 0.640 / 盖片 0.566 / 壳 0.429，浅带这才真的浅。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 体量与体轴

/** 卵鞘前端 X（雌虫先产的一端，钝圆） */
const OOTH_FRONT_X = 1.6
/** 卵鞘末端 X（收尾的一端，抽出一条短尾）—— 全长 3.2 厘米 */
const OOTH_REAR_X = -1.6

/**
 * 纵剖面：u ∈ [0,1] 自前向后，给出该处的上下半径 ry 与左右半径 rz。
 *
 * 峰值 ry 0.85 / rz 0.75 → 高 1.70、宽 1.50，与中华大刀螳卵鞘的实测比例一致
 * （高略大于宽，横截面是竖着的椭圆，不是圆管）。
 * 两端都收到 0：前端在 6% 体长内收完（钝圆的鼻头），
 * 后端从 70% 开始一路收细、最后 3% 抽成尖尾。
 */
const PROFILE: readonly (readonly [number, number, number])[] = [
  [0.0, 0.0, 0.0],
  [0.02, 0.26, 0.24],
  [0.05, 0.42, 0.38],
  [0.1, 0.58, 0.52],
  [0.18, 0.72, 0.64],
  [0.3, 0.81, 0.72],
  [0.44, 0.85, 0.75],
  [0.58, 0.845, 0.745],
  [0.7, 0.78, 0.69],
  [0.8, 0.64, 0.56],
  [0.87, 0.48, 0.41],
  [0.93, 0.31, 0.26],
  [0.97, 0.16, 0.13],
  [1.0, 0.0, 0.0],
]

function profileAt(u: number): { ry: number; rz: number } {
  const t = THREE.MathUtils.clamp(u, 0, 1)
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const a = PROFILE[i]
    const b = PROFILE[i + 1]
    if (t >= a[0] && t <= b[0]) {
      const k = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0])
      return { ry: THREE.MathUtils.lerp(a[1], b[1], k), rz: THREE.MathUtils.lerp(a[2], b[2], k) }
    }
  }
  return { ry: 0, rz: 0 }
}

const bodyX = (u: number) => THREE.MathUtils.lerp(OOTH_FRONT_X, OOTH_REAR_X, u)

// ---------------------------------------------------------------- 叠瓦层

/** 泡沫层数。真实卵鞘上数得出十几到二十几道层界，取 16 */
const LAYERS = 16
/**
 * 层界的偏斜量（单位：层）。0 = 笔直的横环，0.6 = 从背脊走到腹面时层界向后错开
 * 0.6 层。真实卵鞘的层界是**弧**不是环，就因为雌虫后退时腹端还在左右摆。
 * 这一项归零，两侧就成了一圈圈套在管子上的橡皮筋。
 */
const LAYER_SKEW = 0.6
/**
 * 叠瓦幅度（占该处半径的比例）。每层从层界处最鼓，向后缓缓收薄，
 * 到下一道层界再猛地鼓起来 —— 于是每层的**前缘**是一道朝向 +X 的坎。
 *
 * 坎朝前是有意的：默认机位在前上方（`framing.ts` 的 HOME_DIR ≈ (0.86,0.44,1.25)），
 * 坎朝后的话，第一眼看到的全是平滑的坡面，十几层叠瓦一层都看不见。
 * 0.085 × 0.85 ≈ 0.072 厘米的坎，占画面直径 1.5%，在 720 像素上约 10 像素 —— 数得出来。
 */
const SHINGLE = 0.085
/** 每层沿轴向的细分站位数 */
const SUB = 10
/** 层界前那一站与层界的距离：把坎做成近乎垂直的一堵墙，而不是一段缓坡 */
const SEAM_EPS = 0.004
/** 环向分段数 */
const RADIAL = 60
/** 腹面压扁量：卵鞘糊在枝上，贴枝的一面被压平了一点，不是一个正椭球 */
const BELLY_FLAT = 0.12

/** 层内进度 f∈[0,1) → 半径乘数。f=0（层界处）最鼓，向后收薄 */
function shingle(f: number): number {
  return 1 + SHINGLE * (0.5 - Math.pow(f, 0.55))
}

/** 层界处（f=0）的乘数，孵化带与锚点都以它为基准 */
const SHINGLE_TOP = shingle(0)

/**
 * 壳面上的一点。
 *
 * 参数用**层坐标 L** 而不是 u：网格线因此与层界严格重合，
 * 每一道坎都落在一条整齐的网格线上，不会出现锯齿状的阶梯
 * （用均匀 u 网格时，偏斜会让同一道层界在不同 φ 处落到不同的网格格子里，
 * 出图是一排细碎的台阶）。
 *
 * φ=0 在背脊（+Y），绕向 +Z。w=(1−cosφ)/2 是「离背脊有多远」，
 * 腹面 w=1 —— 层界向后偏斜就靠它。
 */
function shellPoint(L: number, phi: number): THREE.Vector3 {
  const c = Math.cos(phi)
  const s = Math.sin(phi)
  const w = (1 - c) / 2
  const u = THREE.MathUtils.clamp((L + LAYER_SKEW * w) / LAYERS, 0, 1)
  const p = profileAt(u)
  const k = shingle(L - Math.floor(L))
  const flat = c < 0 ? 1 - BELLY_FLAT * Math.pow(-c, 1.6) : 1
  return new THREE.Vector3(bodyX(u), p.ry * c * k * flat, p.rz * s * k)
}

/**
 * 层坐标的站位表。
 *
 * 起点取 −LAYER_SKEW 而不是 0：偏斜让腹面比背脊「晚」0.6 层才到达 u=0，
 * 从 0 起算的话第一圈会是「背脊已经收到鼻尖、腹面还在半腰」的一圈开口，
 * 卵鞘前端会破一个洞。终点取 LAYERS 同理（那一端是背脊晚到）。
 */
function layerStations(): number[] {
  const start = -LAYER_SKEW
  const n = Math.round((LAYERS - start) * SUB)
  const out: number[] = []
  for (let i = 0; i <= n; i++) {
    const L = start + i / SUB
    out.push(L)
    const next = start + (i + 1) / SUB
    if (i < n && Math.abs(next - Math.round(next)) < 1e-9) out.push(next - SEAM_EPS)
  }
  return out
}

/** 卵鞘壳体：按（层坐标 × 环向）铺一张网格，法线交给 computeVertexNormals 算 */
function oothecaShell(): THREE.BufferGeometry {
  const Ls = layerStations()
  const rows = Ls.length
  const cols = RADIAL + 1
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const p = shellPoint(Ls[i], (j / RADIAL) * Math.PI * 2)
      positions.push(p.x, p.y, p.z)
      uvs.push(j / RADIAL, i / (rows - 1))
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < RADIAL; j++) {
      const a = i * cols + j
      const b = a + cols
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setIndex(indices)
  /*
   * 法线要取反 —— 这是为了跟 kit 的 `loft()` **对齐**，不是随手翻的。
   *
   * `loft()` 给的是朝外的法线，而它三角面的绕向是朝内的（`finalize()` 里那段
   * 「壳裂开露白」的注释说的就是这处不一致，也是全仓库不透明材质一律开
   * DoubleSide 的由来）。开了 DoubleSide 之后，着色器会按 `gl_FrontFacing`
   * 把法线再翻一次，于是**所有 loft 件**实际是按「翻过一次」的法线着色的。
   *
   * 自建网格用 `computeVertexNormals()` 时，法线跟着绕向走、翻过之后正好朝外，
   * 着色方式与全仓库的 loft 件**相反**。一个模型里两套着色并存的后果是实测出来的：
   * 孵化带（loft）即使给成**纯白**，顶视亮度也只有 0.658，而米黄褐的壳体
   * （自建网格）是 0.662 —— 招牌那条浅带在画面上等于不存在，怎么调颜色都救不回来。
   * 取反之后壳体 0.429、带 0.690，浅带这才真的浅。
   */
  g.computeVertexNormals()
  const normals = g.getAttribute('normal').array as Float32Array
  for (let i = 0; i < normals.length; i++) normals[i] *= -1
  return g
}

// ---------------------------------------------------------------- 孵化带

/** 孵化带覆盖的 u 区间：两端各留一小截光壳，带才有起止，不是从头包到尾的一条脊 */
const BAND_U0 = 0.085
const BAND_U1 = 0.905
/** 带的半高与半宽。宽 0.37 厘米 ≈ 画面直径的 7.4%，一眼看得见 */
const BAND_RY = 0.095
const BAND_RZ = 0.185
/** 带心沉入壳体的深度：沉得太浅会浮成一根架空的管，太深就整根埋没 */
const BAND_SINK = 0.035
/** 层界处的背脊高度。带是光滑的，不跟着叠瓦起伏 —— 它是后来才「熨平」的一条门缝 */
const crestY = (u: number) => profileAt(u).ry * SHINGLE_TOP
/** 带宽沿长度的收放：两端收到 30%，中段最宽 */
const bandTaper = (t: number) => 0.3 + 0.7 * Math.pow(Math.sin(Math.PI * THREE.MathUtils.clamp(t, 0, 1)), 0.45)
const bandCenterY = (u: number) => crestY(u) - BAND_SINK
const bandTopY = (u: number, t: number) => bandCenterY(u) + BAND_RY * bandTaper(t)

function hatchBand(material: THREE.Material): THREE.Mesh {
  const steps = 30
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = THREE.MathUtils.lerp(BAND_U0, BAND_U1, t)
    const k = bandTaper(t)
    sections.push({ at: new THREE.Vector3(bodyX(u), bandCenterY(u), 0), ry: BAND_RY * k, rz: BAND_RZ * k })
  }
  const mesh = new THREE.Mesh(loft(sections, 22), material)
  mesh.name = 'hatch-band'
  return mesh
}

/** 孵化口盖片数 */
const FLAPS = 13
/** 一枚盖片沿轴向的长度。与间距（约 0.184）相比略长，故互相叠压约四分之一 */
const FLAP_LEN = 0.24
/** 盖片沉入带面的深度：片根埋进去，只露出中后段那道弧 */
const FLAP_SINK = 0.026
/**
 * 盖片断面：[沿片长的进度, 半厚, 半宽, 后缘抬起量]。
 *
 * 抬起量 0.038：盖片是**贴着带面的一列瓦**，不是一排立起来的鳞。
 * 抬一点能投出分片的阴影缝，让人数得出片数；抬过头，每片都在给后面一片
 * 投大片阴影，整条带的亮度会被自己的阴影吃掉。片色与带色只差 0.08，
 * **分片一律交给形**，亮度就还给了带本身。
 */
const FLAP_PROFILE: readonly (readonly [number, number, number, number])[] = [
  [0.0, 0.009, 0.08, 0.0],
  [0.3, 0.029, 0.152, 0.005],
  [0.62, 0.034, 0.16, 0.018],
  [0.85, 0.029, 0.134, 0.03],
  [1.0, 0.009, 0.068, 0.038],
]

/**
 * 一枚孵化口盖片：横跨孵化带的一小片瓦，前端薄、压在前一片下面，后缘抬起。
 *
 * 后缘必须抬起来。一片完全贴死在带面上的薄片，四个机位下都只会读成
 * 「带上画的一道横线」—— 黑蚱蝉若虫的翅芽在这件事上栽过一次，
 * 根因就是「末端与体表之间没有缝，一条阴影缝都投不出来」。
 * 抬起 0.045 之后每片自己投一道影，一列瓦才数得出片数。
 */
function hatchFlap(u: number, material: THREE.Material): THREE.Mesh {
  const span = OOTH_FRONT_X - OOTH_REAR_X
  const sections: Section[] = FLAP_PROFILE.map(([s, ry, rz, lift]) => {
    // 片身要**跟着带脊走**，不能沿一条水平线拉出去：卵鞘后段的背脊一路下沉，
    // 拉直的片尾会一根根探出体外，侧视读成一排刺出来的刀片（第一版实拍如此）。
    const uu = Math.min(u + (s * FLAP_LEN) / span, 1)
    const t = (uu - BAND_U0) / (BAND_U1 - BAND_U0)
    return { at: new THREE.Vector3(bodyX(u) - s * FLAP_LEN, bandTopY(uu, t) - FLAP_SINK + lift, 0), ry, rz }
  })
  const mesh = new THREE.Mesh(loft(sections, 14), material)
  mesh.name = 'hatch-flap'
  return mesh
}

// ---------------------------------------------------------------- 层界弧棱

/** 层界弧棱避开孵化带的方位角（弧度）。0.28 处壳面 |z|≈0.22，正好在带缘 0.17 之外 */
const BAND_PHI = 0.28
/** 弧棱管半径 */
const SEAM_R = 0.026
/** 弧棱落在层界**之前**一点：那里是叠瓦坎的坡脚，深色的一道正该嵌在这个内凹角里 */
const SEAM_BACKOFF = 0.03

/**
 * 一道层界弧棱：贴着壳面从背脊一侧绕到另一侧的深色细棱。
 *
 * 为什么壳体已经有叠瓦包络了还要加这一圈：叠瓦靠的是自投影，
 * 而正对光源的那几个角度里投影会被冲淡。深色的弧棱不依赖光照方向，
 * 任何机位都读得出「一层压一层」。两者是形与色的双保险，缺一个都可能在
 * 某个机位上失效 —— 这正是本仓库反复栽的那个跟头（断言量数字、人看长相）的解法。
 */
function layerSeam(k: number, material: THREE.Material): THREE.Mesh {
  const L = k - SEAM_BACKOFF
  const steps = 30
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const phi = THREE.MathUtils.lerp(BAND_PHI, Math.PI * 2 - BAND_PHI, i / steps)
    const p = shellPoint(L, phi)
    // 沿 YZ 平面的径向把棱推出壳面一点点，让它成为一道凸起的棱而不是埋进去的线
    const radial = new THREE.Vector3(0, p.y, p.z)
    if (radial.lengthSq() > 1e-9) p.addScaledVector(radial.normalize(), 0.004)
    // 两端收细：弧棱钻进孵化带底下，不该在带缘留两个圆头
    const taper = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * (i / steps)), 0.4)
    sections.push({ at: p, ry: SEAM_R * taper, rz: SEAM_R * taper })
  }
  const mesh = new THREE.Mesh(loft(sections, 8), material)
  mesh.name = 'layer-seam'
  return mesh
}

// ---------------------------------------------------------------- 依托的枝条

/** 枝条中轴高度：让枝顶插进泡沫、枝腹露在卵鞘之下，「糊在枝上」才读得出来 */
const TWIG_Y = -0.8
const TWIG_R = 0.175
const TWIG_X0 = 2.15
const TWIG_X1 = -2.15

function taperedTube(points: THREE.Vector3[], radii: number[], material: THREE.Material, radial = 16): THREE.Mesh {
  const sections: Section[] = points.map((at, i) => ({ at, ry: radii[i], rz: radii[i] }))
  return new THREE.Mesh(loft(sections, radial), material)
}

// ---------------------------------------------------------------- 主体

export function buildMantisEgg(): InsectModel {
  const g = new THREE.Group()

  /*
   * 四档明度（sRGB 的 HSL 明度，见文件头「配色」）：
   *   孵化带 0.874 > 盖片 0.794 > 壳体 0.590 > 层界 0.339 > 树皮 0.216
   * 每一档之间 ≥ 0.08，最亮与最暗之间 0.66。全褐色系最怕糊成一团泥，
   * 这里靠明度而不是色相把结构分开 —— 色相全都落在 30~45° 的黄褐区，
   * 换句话说：它看起来仍然是一整块泡沫，只是层次分得开。
   */
  const shellMat = chitin({ color: '#c2a06b', gloss: 0.12, surface: 'punctate' })
  /*
   * 孵化带**不上 punctate**，而且 gloss 高于壳面一档：卵鞘全身是多孔的泡沫，
   * 只有这条带是若虫顶开时压实的一层细密结构 —— 「质地不同」这件事在
   * 零贴图的仓库里只能靠这个差别表达，而且它顺手把带面的实测亮度抬了上来
   * 刻点法线还会让浅色面平白暗一档，招牌那条带没必要再被自己的材质吃掉一次。
   */
  const bandMat = chitin({ color: '#f8e9c6', gloss: 0.36, clearcoat: 0.12 })
  const flapMat = chitin({ color: '#e9d7ac', gloss: 0.3 })
  const seamMat = chitin({ color: '#7a5a33', gloss: 0.1 })
  const barkMat = chitin({ color: '#4a3624', gloss: 0.1, surface: 'striate' })

  // ---- 壳体
  const shell = new THREE.Mesh(oothecaShell(), shellMat)
  shell.name = 'ootheca-shell'
  g.add(shell)

  // ---- 层界弧棱：k=1..15。k=0 落在鼻尖上、k=16 落在尾尖上，那两处壳体已收到零
  for (let k = 1; k < LAYERS; k++) g.add(layerSeam(k, seamMat))

  // ---- 孵化带 + 一列孵化口盖片
  g.add(hatchBand(bandMat))
  for (let i = 0; i < FLAPS; i++) {
    const u = THREE.MathUtils.lerp(BAND_U0 + 0.03, BAND_U1 - 0.1, i / (FLAPS - 1))
    g.add(hatchFlap(u, flapMat))
  }

  /*
   * ---- 枝条：略带锥度、微微弯曲的一小段。
   * 直筒的圆柱会读成一根塑料管；真实枝条既有锥度也有弯，
   * 两端各伸出卵鞘 0.55 厘米 —— 够交代「它是长在枝上的」，又不至于把画面让给木头
   * （取景按 model.radius 归一化，枝越长，卵鞘在屏幕上就越小）。
   */
  const twigPts = [
    new THREE.Vector3(TWIG_X0, TWIG_Y + 0.03, 0.02),
    new THREE.Vector3(0.9, TWIG_Y - 0.01, -0.01),
    new THREE.Vector3(-0.6, TWIG_Y - 0.02, -0.02),
    new THREE.Vector3(TWIG_X1, TWIG_Y + 0.01, 0.03),
  ]
  const twig = taperedTube(twigPts, [TWIG_R * 1.06, TWIG_R, TWIG_R * 0.96, TWIG_R * 0.88], barkMat, 22)
  twig.name = 'twig-bark'
  g.add(twig)

  // 侧芽：一小截斜生的短枝。有它，那根木头才是「枝」而不是一段圆棍
  const budBase = new THREE.Vector3(1.72, TWIG_Y + 0.05, 0.09)
  const bud = taperedTube(
    [budBase, budBase.clone().add(new THREE.Vector3(0.12, 0.11, 0.16)), budBase.clone().add(new THREE.Vector3(0.19, 0.2, 0.29))],
    [0.075, 0.05, 0.016],
    barkMat,
    14,
  )
  bud.name = 'twig-bud'
  g.add(bud)

  /*
   * 锚点全部落在真实几何体上（本仓库有一条闸门专门抓「标注点浮在空气里」：
   * `src/three/__tests__/anchors-have-geometry.test.ts`，判据是锚点离最近实体
   * 不超过 0.12×包围半径）。这里每个点要么就在某个网格的表面上，要么埋在它体内。
   */
  const bandMidU = (BAND_U0 + BAND_U1) / 2
  const seamProbe = shellPoint(8 - SEAM_BACKOFF, Math.PI / 2)
  const anchors: Record<string, THREE.Vector3> = {
    hatchBand: new THREE.Vector3(bodyX(bandMidU), bandTopY(bandMidU, 0.5), 0),
    layerRidge: seamProbe,
    tail: shellPoint(LAYERS - 0.5, Math.PI / 2),
    twig: new THREE.Vector3(TWIG_X0 - 0.24, TWIG_Y + 0.02, 0),
  }

  return finalize(g, anchors)
}
