/**
 * 东亚飞蝗 Locusta migratoria manilensis · 卵（卵块 / 卵囊 egg pod）
 *
 * ## 为什么做的是「一根棒」而不是「一粒卵」
 *
 * 蝗虫**不散产**。雌虫把腹部末端插进土里钻出一个 5~7 厘米深的斜孔，一边退一边
 * 往孔里下卵，同时从附腺分泌大量泡沫；泡沫把卵粒粘成一束，又在孔口硬化成一截
 * 海绵状的塞，整团东西就这样在**土壤里越冬**（图鉴文案第一句写的正是这件事）。
 * 所以这一阶段真正要讲的对象不是那 7 毫米的一粒，而是**一整个卵囊**：
 * 卵集中在下段，上段是泡沫塞。
 *
 * 单做一粒卵会重蹈本目录第一批四颗卵的覆辙（教训写在
 * `docs/superpowers/specs/2026-08-18-motion-design.md`）：**卵必须有可指认的
 * 表面结构，或有一个不是「一圈小球」的语境**。蝗虫卵表面是光的，
 * 所以只能走「语境」这条路——而它的语境恰好是蝗灾防治里最要紧的一件事：
 * 挖卵块。灭蝗从来不是抓虫，是在河滩地里把这种土色的棒一根根翻出来。
 *
 * ## 第二版目视验收打回的三条，与这一版是怎么改的
 *
 * 第一版在真实展台上「读成一块竖着的巧克力威化」：卵糊成一片均匀的奶油色。
 * 三条一起改才修好——**只改其中一条都不够**，这是这个文件最贵的一条经验：
 *
 * 1. **卵与卵之间要有真的能投影的缝，缝里还得有更暗的东西，而且横竖两个
 *    方向都要有。** 第一版 56 枚卵挤成 8 枚一层的六边形束（相邻只隔 0.018），
 *    背后又是另一枚同色的卵——所有边界都是「浅色贴浅色」的一道软折，
 *    ACES 一提亮就没了，四机位一致读成一根玉米棒。
 *    中间还错过一版：改成 5 根纵列、列间留 0.09 的宽缝，竖缝有了，
 *    可同一列里层距只有卵长的一半，每列自己糊成一根长条，读成几根「芦笋」。
 *    现在两个方向一起留：**8 根纵列 × 每列 7 枚 = 56 枚**，列间隙 0.045、
 *    层距 0.55 对卵长 0.66（只叠 17%），**两道缝的缝底都垫着一根深色的卵间
 *    基质柱**（`egg-matrix`，33% 明度对卵的 80%）。于是整束是「亮卵 + 暗缝」
 *    的网格，数得出来。基质不是编出来的：卵之间本来就填着泡沫分泌物，
 *    而深在缝里的那一层本来就是背光的。
 * 2. **单枚要做到真实尺寸的上沿**：6.6 × 1.5 毫米（文献 6~7 × 1.4~1.6），
 *    比第一版的 1.12 毫米粗 34%。第一版把卵做到文献下沿，屏幕上只有十来像素。
 * 3. **整根连土柱一起绕 Z 倾 30°**，并给 `frameRadius`。
 *    展台是横的、卵囊是竖的，按包围球取景时左右两大片全空，卵被压到几像素。
 *    倾斜后卵囊走对角线，同时把取景半径从包围盒球（3.6+，为斜棒预留了一大圈
 *    空气）换成**逐顶点量出来的真实包围半径**——两者一起把卵放大了约三成。
 *    倾斜也更真实：雌虫是斜插腹部产卵的，卵囊在土里本来就是斜的。
 *
 * 顺带把土柱收细收短（外径 0.55 对第一版的 0.66）：语境有必要，但它不该是主角。
 *
 * ## 招牌结构（三样，缺一样这个模型就白做了）
 *
 * 1. **纵向剖开的卵囊**：整根棒朝向机位的那 156° 被揭掉，露出里面竖排的卵。
 *    不剖开的话画面上只剩一根土色的棒，与一段树枝无从分辨。
 *    剖开的东西最容易砸在**剖口留一个平面的黑洞**上（蜣螂粪梨、柞蚕蛾茧都栽过）：
 *    所以这里外壁与腔壁是两张各自封闭的回转面（两端半径都收到近乎一点，
 *    不留开口环），两端再各补一片「外轮廓上行 + 腔轮廓下行」围成的**剖面多边形**
 *    （`pod-cut`）——囊壁的厚度在剖口上是实打实的一圈，不是一张纸的边。
 *    腔壁另配一档更亮的材质（51% 对外壁 37%）：剖开处读到的是「深色的囊壁包着
 *    浅色的腔」，不是一个发黑的洞。
 * 2. **56 枚竖排的卵 + 卵间的深色基质**：8 根纵列，每列 7 枚，列与列之间
 *    再错开 1/8 格高度（螺旋排布，各列的腰不至于连成一道整齐的横线）。
 *    单枚 6.6 × 1.5 毫米、长径比 4.4，几乎与囊轴平行（只微微向外倒 2~5°）。
 *    **为什么必须近乎竖直**：腔内径只有 6.9 毫米，而卵长 6.6 毫米，
 *    横过来根本塞不进去。所以「竖排」不是画法上的选择，是被腔径逼出来的事实。
 * 3. **泡沫塞（foam plug）**：上段 1.2 厘米（占全长 20%）。它是这一件里最容易
 *    被做丢的东西——做成一根光滑的柱子就读成「卵囊上半截是空的」。
 *    所以泡沫是 48 枚互相咬合的气泡球叠出来的一团，轮廓凹凸；芯柱只占腔径的
 *    58%，气泡骑在它外面，气泡之间的缝里看得见更深的腔壁，
 *    「上段疏松、下段密实」这句话就落在这道对比上。
 *
 * ## 明度阶梯（ACES 会提亮去饱和，深叠深会糊成一团）
 *
 * 卵 80% > 泡沫塞 65% > 腔壁 51% > 土面的土块 44% > 剖面 42% > 囊壁 37% >
 * 卵间基质 33% > 土壤 29%。
 *
 * 最初一版把土压到 22%、囊壁压到 31%，实拍出来整根棒是一块**黑巧克力板**：
 * 土、囊壁、剖面三档在 ACES 下全糊成同一个近黑。现在整体抬了一档半，
 * 土仍是最暗的那一档（29%），但它是**土色**，不是黑。
 * 只有**土面上**那 14 粒土块用了更亮的一档（44%）：它们躺在一张平的圆环上，
 * 不给一点色差就完全看不出来。外壁上那 9 块土疙瘩反而用土自己的材质——
 * 理由见文件末尾那段注释（用颜色去区分同一种材料，出图是「巧克力上的糖豆」）。
 *
 * 这一栏是照着榆蓝叶甲那次事故写的：「颜色压深一档」被误解成「越深越保险」，
 * 结果金属蓝绿被 ACES 压成近黑，招牌图案在画面上直接消失。这里最要紧的两对是
 * **卵与卵间基质**（0.80 / 0.33，靠它把每一枚的轮廓切出来）与
 * **卵与泡沫塞**：后者都是浅色，只拉明度差（0.80 / 0.65）还不够稳，
 * 所以另外拉开**饱和度**——卵是饱和的淡黄（s = 0.80），泡沫塞是几乎中性的
 * 灰米色（s = 0.15）。一亮一灰、一光滑一起泡，两条路都断不了。
 *
 * ## 语境：一小块土壤剖面
 *
 * 卵囊嵌在一段同样被纵剖的土柱里（`soil` / `soil-cut`），土面上散着几粒土块。
 * 土柱与卵囊**共用同一个剖切方位角**，两片剖面落在同一个平面上、接成一整张断面——
 * 这正是土壤剖面图的画法，「土壤中越冬」不用文字也读得出来。
 * 土是全画面最暗的一档，绝不会把卵囊吃掉。
 *
 * ## 摆位
 *
 * 建模帧里卵囊沿 +Y 竖立、略弯（`bendX`，正弦弓形，中段偏 0.24），
 * 然后 `rotation.set(0, YAW, TILT)`：先绕 Z 倾 30°（顶端倒向 +X），
 * 再绕 Y 转 34°，把剖口中心从建模帧的 +Z（方位角 90°）转到 56°，
 * 也就是展台默认机位 (2, 1, 3) 的方位。
 * 绕 Z 的倾斜**不改变剖口的朝向**（绕 Z 转，Z 轴本身不动），所以两件事互不干扰：
 * 倾斜只管画面利用率，偏航只管剖口对不对着人。
 * 不偏航的话机位偏在剖口边缘 34° 上，近侧那条切边会挡掉右半边的卵
 * （蜻蜓卵第一版实拍栽过同一个跟头）。
 *
 * 本文件不使用任何随机数：表面起伏是三支不可通约的正弦叠加（`wobble`），
 * 气泡与土块的位置是定点哈希（`hash`），两者都是构建期常量，不会有种子漂移。
 *
 * 单位与坐标系同成虫：1 = 1 厘米真实体长，+X 向前、+Y 向上、+Z 向右。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from './../kit'

// ---------------------------------------------------------------- 尺寸常量

/** 卵囊全长 5.98 厘米（文献 4~7 厘米） */
export const POD_H = 5.98

/** 弓形弯曲的中段偏移量。0 = 一根直管（读成塑料吸管），0.24 = 一眼看出是产出来的 */
const BEND = 0.24

/** 剖口：材料保留的方位角区间。窗口中心正对建模帧 +Z、半宽 78°，即揭掉 156° */
const WINDOW_HALF = THREE.MathUtils.degToRad(78)
const PHI_START = Math.PI / 2 + WINDOW_HALF
const PHI_SPAN = Math.PI * 2 - 2 * WINDOW_HALF
/** 回转面的方位分段数。这 72 段只铺在保留下来的 204° 上，密度约 2.8°/段 */
const AZIMUTH = 72

/** 整组绕 Y 的偏航：把剖口中心从 +Z（方位角 90°）转到展台默认机位的 56° */
export const YAW = THREE.MathUtils.degToRad(34)
/**
 * 整组绕 Z 的倾斜（负 = 顶端倒向 +X）。
 *
 * 展台是横的、卵囊是竖的：按包围球取景时相机只能按高度退开，左右两大片全空，
 * 卵粒被压到只有几个像素。倾 30° 之后卵囊走对角线，长边同时吃到画幅的宽和高。
 * 也更真实——雌虫是斜插腹部产卵的，卵囊在土里本来就是斜的。
 */
export const TILT = THREE.MathUtils.degToRad(-30)

/**
 * 卵囊外壁轮廓 [高度 y, 半径 r]。上粗（泡沫塞段 φ9.2 毫米）下细（卵段 φ8.5 毫米）。
 * 首尾两点的半径都收到 0.006：回转面在这两处自己封成一点，
 * 不留一圈开口环——那圈开口在剖开的模型上就是一个看得见的黑豁口。
 */
const OUTER: readonly (readonly [number, number])[] = [
  [0.0, 0.006],
  [0.05, 0.11],
  [0.16, 0.245],
  [0.36, 0.355],
  [0.65, 0.405],
  [1.3, 0.418],
  [2.4, 0.424],
  [3.5, 0.43],
  [4.1, 0.436],
  [4.5, 0.452],
  [5.1, 0.458],
  [5.4, 0.444],
  [5.66, 0.36],
  [5.84, 0.22],
  [5.94, 0.12],
  [5.98, 0.006],
]

/** 卵腔轮廓。壁厚 0.075~0.09——泡沫硬化的土壳，厚了就成了一截竹筒 */
const CAVITY: readonly (readonly [number, number])[] = [
  [0.26, 0.006],
  [0.34, 0.125],
  [0.5, 0.24],
  [0.75, 0.32],
  [1.3, 0.337],
  [2.4, 0.343],
  [3.5, 0.349],
  [4.1, 0.355],
  [4.5, 0.368],
  [5.1, 0.374],
  [5.38, 0.358],
  [5.62, 0.26],
  [5.82, 0.115],
  [5.9, 0.006],
]

/** 卵：长 6.6 毫米、最粗处半径 0.75 毫米（直径 1.5 毫米），长径比 4.4 */
const EGG_LEN = 0.66
const EGG_R = 0.075
/**
 * 卵的排布：**8 根纵列 × 每列 7 枚 = 56 枚**，两个方向上都留缝。
 *
 * 这一处返工了两轮，两轮各错在一个方向上：
 *
 * - 第一版把 56 枚挤成 8 枚一层的六边形束（相邻只隔 0.018），四机位一致
 *   读成一根**玉米棒**——横竖都没有缝。
 * - 第二版改成 5 根纵列、列间留 0.09 的宽缝，但同一列里层距只有卵长的一半，
 *   于是每一列自己糊成一根连续的**长条**：竖缝有了，横缝没有，
 *   真实展台上读成几根「芦笋」。
 *
 * 这一版两个方向一起留：**列间隙 0.045**（0.7% 画面直径）来自 8 列排在
 * 半径 0.255 上（弦长 0.195 − 卵径 0.15）；**层距 0.55 对卵长 0.66**，
 * 只叠 17%，每一枚露出八成、上下之间有一道看得见的腰。
 * 两道缝的缝底都是深色的卵间基质（`egg-matrix`），所以是「亮卵 + 暗缝」的
 * 网格，不是一片均匀的奶油色。
 *
 * 数量仍在文献的 50~80 内。窗口开 156°，正对机位的是其中 3~4 列。
 */
const EGG_COLUMNS = 8
const EGG_PER_COLUMN = 7
/** 列所在的轴心距。0.255 + 卵半径 0.075 = 0.33 < 该处腔半径 0.345，塞得进去 */
const EGG_RING_R = 0.255
/** 同一列里上下相邻两枚的间距。0.55 对卵长 0.66 = 只叠 17%，腰看得见 */
const EGG_PITCH = 0.55
const EGG_Y0 = 0.85
/**
 * 每一列在纵向再错开 1/8 格（螺旋排布）。
 * 八列的腰若都落在同一个高度，整束会读成一摞横着的圆环。
 */
const EGG_HELIX = EGG_PITCH / EGG_COLUMNS

/** 卵间基质（卵与卵之间的泡沫，深在缝里那一层本来就背光）所占的高度区间与半径 */
const MATRIX_Y0 = 0.44
const MATRIX_Y1 = 4.62
const MATRIX_R = 0.205

/** 泡沫塞占据的高度区间。1.2 厘米 = 全长的 20% */
const FOAM_Y0 = 4.6
const FOAM_Y1 = 5.8
/** 气泡数。少于 40 枚时缝太大，整团读成「一串葡萄」而不是一团泡沫 */
const BUBBLE_COUNT = 48
/** `foamPlug` 锚点所在的高度。测试靠它反解 finalize 的居中平移量，故与锚点共用一个常量 */
export const FOAM_ANCHOR_Y = 5.2

/** 土柱：内壁贴着卵囊、外径 0.55、上表面 5.92（卵囊顶端露出一点，正是产卵孔的位置） */
const SOIL_TOP = 5.92
const SOIL_BOT = -0.18
const SOIL_OUT = 0.55
/** 土壁与囊壁之间留的空隙。真实卵囊是被泥裹紧的，留太多就成了「插在管子里」 */
const SOCKET_GAP = 0.018

// ---------------------------------------------------------------- 配色

/**
 * 明度按档排开（sRGB，见文件头）。括号里的数值是拿
 * `getHSL(…, THREE.SRGBColorSpace)` 量过的，不是估的——three 的颜色管理把 hex
 * 转进线性工作空间，缺省 getHSL 返回的是线性明度，深色会被压扁一大截。
 */
/**
 * 卵：淡黄褐、饱和（h 46° / s 0.80 / l 0.80）。
 *
 * 给**三档**而不是一档：56 枚同色的卵挤在一起时，相邻两枚之间只剩一条靠明暗
 * 过渡的接缝。三档只差 ±4% 明度——远看仍是一束淡黄，近看每一枚的边界自己就出来了。
 * 这也有依据：同一卵囊里的卵产出有先后，胚胎发育程度不同，色深浅本来就不匀。
 * 差得再大就成了「奶牛纹」（柞蚕蛾卵实撞过的坑），所以只给 4%。
 */
const EGG_COLORS = ['#f5e2a3', '#eddb98', '#f9e9b0'] // 实测 l = 0.800 / 0.763 / 0.833，h 全在 46~48°
const FOAM_COLOR = '#b3a898' // 泡沫塞：灰米色、近中性（h 36° / s 0.15 / l 0.65）
const CAVITY_COLOR = '#a08a63' // 腔壁：泡沫糊过的内衬（l 0.51）
const CUT_COLOR = '#8b6f4a' // 剖面：切开的那一面本来就背着光（l 0.42）
const WALL_COLOR = '#7d6140' // 囊壁：泡沫粘住的土壳（l 0.37）
const MATRIX_COLOR = '#6b5a3e' // 卵间基质：深在缝里、常年背光的那一层（l 0.33）
const SOIL_COLOR = '#5f4a33' // 土：全画面最暗一档（l 0.29）
const GRAIN_COLOR = '#8a7358' // 土面的土块：比土面亮一档半，否则土面是一片塑料（l 0.44）

// ---------------------------------------------------------------- 确定性起伏

/**
 * 三支不可通约的正弦叠加，值域约 [−1, 1]。
 *
 * 用它而不是随机数：随机数一换种子模型就变，测试跟着闪。三支正弦的频率
 * （3.7 / 5.3 / 9.1+7.7）刻意不成整数比，叠出来在人眼尺度上读不出周期，
 * 但每次构建的结果逐位相同。
 */
function wobble(a: number, b: number, seed: number): number {
  return (
    Math.sin(a * 3.7 + seed * 1.3) * 0.5 +
    Math.sin(b * 5.3 + seed * 2.1) * 0.32 +
    Math.sin(a * 9.1 + b * 7.7 + seed * 3.7) * 0.18
  )
}

/** 定点哈希：同一个 i 永远给同一个 [0,1) 的数。用于气泡与土块的摆位 */
function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** 关键帧表的平滑插值（smoothstep，避免轮廓上出现折角） */
function keyframe(table: readonly (readonly [number, number])[], x: number): number {
  if (x <= table[0][0]) return table[0][1]
  const last = table[table.length - 1]
  if (x >= last[0]) return last[1]
  for (let i = 0; i < table.length - 1; i++) {
    const [x0, v0] = table[i]
    const [x1, v1] = table[i + 1]
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0)
      return THREE.MathUtils.lerp(v0, v1, t * t * (3 - 2 * t))
    }
  }
  return last[1]
}

/**
 * 卵囊轴心在高度 y 处的横向偏移——正弦弓形，中段最偏。
 *
 * 全部部件（卵、泡沫、囊壁、土柱）都按各自的 y 吃这一份偏移，所以整根棒
 * 连同它周围的土是**一起弯**的。只弯卵囊而不弯土的话，土壁与囊壁之间
 * 一侧压穿、另一侧裂开 0.24 的缝——那道缝正落在剖口当中，一眼就看见。
 */
export function bendX(y: number): number {
  return BEND * Math.sin(Math.PI * THREE.MathUtils.clamp(y / POD_H, 0, 1))
}

/**
 * 建模帧 → 最终模型坐标：先绕 Z 倾斜、再绕 Y 偏航。
 * 与 `g.rotation.set(0, YAW, TILT)` 等价（three 的默认 XYZ 序下 v' = Ry·Rz·v）。
 * 测试要拿它复原卵囊的轴线，故导出。
 */
export function toModel(x: number, y: number, z: number): THREE.Vector3 {
  const ct = Math.cos(TILT)
  const st = Math.sin(TILT)
  const tx = x * ct - y * st
  const ty = x * st + y * ct
  const cy = Math.cos(YAW)
  const sy = Math.sin(YAW)
  return new THREE.Vector3(tx * cy + z * sy, ty, -tx * sy + z * cy)
}

/** 卵囊轴线在高度 y 处的点（已含倾斜与偏航，**未含** finalize 的居中平移） */
export function axisAt(y: number): THREE.Vector3 {
  return toModel(bendX(y), y, 0)
}

/**
 * `finalize()` 那一次居中平移的量，由锚点反解。
 *
 * 测试要把建模帧里的轴线搬进模型坐标（量「卵有没有捅出腔外」「剖口开在哪一侧」），
 * 而 `finalize()` 把整个模型平移了一个只有它自己知道的量。
 * `foamPlug` 锚点恰好就落在轴线上（`axisAt(FOAM_ANCHOR_Y)`），两者一减就是那个量。
 */
export function centerShift(anchors: Record<string, THREE.Vector3>): THREE.Vector3 {
  return anchors.foamPlug.clone().sub(axisAt(FOAM_ANCHOR_Y))
}

// ---------------------------------------------------------------- 轮廓与回转

/** 一条 (r, y) 轮廓：点、外法线、以及方位角相关的表面起伏 */
interface Profile {
  pts: THREE.Vector2[]
  closed: boolean
  /** 第 i 个点在方位角 phi 处**位移后**的 (r, y) */
  at(i: number, phi: number): THREE.Vector2
}

/**
 * 由采样点构造轮廓。
 *
 * 起伏一律沿轮廓的**面法线**加，不是单纯改半径：土柱的上表面是一段水平轮廓，
 * 只改半径的话点只在自己的面内滑动，一点都不起伏；沿法线加才是「土面高低不平」。
 * 这一条同样保证剖面多边形与回转面用的是同一批位移后的点——各算各的会让
 * 剖口边缘与外表面差出一整个起伏量，出图上是一道贯穿的裂缝（蜣螂粪梨记过这一笔）。
 *
 * 振幅可以逐点给（`amps` 传数组）：土柱的外壁与土面要粗粝，**贴着卵囊的
 * 那一段内壁却必须老实**——内壁一起伏，土与囊之间就会时开时合，
 * 剖面上是一道忽宽忽窄的黑缝。
 *
 * 振幅另外在近轴处按 r 淡出：半径趋于 0 的那几圈方位采样间距已小到几分之一
 * 毫米，在那里加径向位移只会采成一圈放射状的锯齿（蜣螂粪梨的 poleFade 同理）。
 */
function profile(
  pts: THREE.Vector2[],
  closed: boolean,
  amps: number | readonly number[],
  grain: number,
  seed: number,
): Profile {
  const n = pts.length
  const nrm: THREE.Vector2[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)]
    const b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)]
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y)
    if (t.lengthSq() < 1e-12) t.set(0, 1)
    t.normalize()
    nrm.push(new THREE.Vector2(t.y, -t.x))
  }
  return {
    pts,
    closed,
    at(i: number, phi: number) {
      const p = pts[i]
      const amp = typeof amps === 'number' ? amps : amps[i]
      const fade = THREE.MathUtils.clamp(p.x / 0.14, 0, 1)
      const d = amp * fade * wobble(p.y / grain, (phi * 0.42) / grain, seed)
      return new THREE.Vector2(p.x + nrm[i].x * d, p.y + nrm[i].y * d)
    },
  }
}

/** 把关键帧表在 [y0, y1] 上采成一条轮廓 */
function sample(
  table: readonly (readonly [number, number])[],
  y0: number,
  y1: number,
  steps: number,
): THREE.Vector2[] {
  const out: THREE.Vector2[] = []
  for (let i = 0; i <= steps; i++) {
    const y = THREE.MathUtils.lerp(y0, y1, i / steps)
    out.push(new THREE.Vector2(keyframe(table, y), y))
  }
  return out
}

/**
 * 部分回转面：轮廓绕 Y 轴扫过 [PHI_START, PHI_START + PHI_SPAN]，
 * 轴心随 `bendX` 横移。闭合轮廓多铺一圈把首尾接上，否则土柱会沿一条母线裂开。
 */
function revolve(prof: Profile, material: THREE.Material, name: string): THREE.Mesh {
  const n = prof.pts.length
  const rows = prof.closed ? n + 1 : n
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j <= AZIMUTH; j++) {
      const phi = PHI_START + (PHI_SPAN * j) / AZIMUTH
      const p = prof.at(i % n, phi)
      pos.push(bendX(p.y) + p.x * Math.cos(phi), p.y, p.x * Math.sin(phi))
      uv.push(j / AZIMUTH, i / (rows - 1))
    }
  }
  const row = AZIMUTH + 1
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < AZIMUTH; j++) {
      const a = i * row + j
      idx.push(a, a + row, a + 1, a + row, a + row + 1, a + 1)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  const mesh = new THREE.Mesh(g, material)
  mesh.name = name
  return mesh
}

/** 剖面多边形的一段：某条轮廓，正序或倒序 */
interface CutPart {
  prof: Profile
  reverse?: boolean
}

/**
 * 剖面：把若干段轮廓首尾接成一个闭合多边形，填成一片，摆在方位角 phi 的
 * 那个半平面上。ShapeGeometry 走的是 earcut，不会插入新顶点，所以之后
 * 逐顶点按自己的 y 补上 `bendX` 仍然把每个点留在轮廓上。
 */
function cutFace(parts: readonly CutPart[], phi: number, material: THREE.Material, name: string): THREE.Mesh {
  const poly: THREE.Vector2[] = []
  for (const { prof, reverse } of parts) {
    const n = prof.pts.length
    for (let k = 0; k < n; k++) poly.push(prof.at(reverse ? n - 1 - k : k, phi))
  }
  const geo = new THREE.ShapeGeometry(new THREE.Shape(poly))
  const pos = geo.getAttribute('position')
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  for (let i = 0; i < pos.count; i++) {
    const r = pos.getX(i)
    const y = pos.getY(i)
    pos.setXYZ(i, bendX(y) + r * cos, y, r * sin)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, material)
  mesh.name = name
  return mesh
}

// ---------------------------------------------------------------- 卵

/**
 * 一枚卵的几何：沿 +Y 建、以原点为中心的细长纺锤，下端钝、上端略尖
 * （真实蝗卵含卵黄的那一端稍粗）。
 *
 * 几何只建一次、50 个 mesh 共用——除了省面数，更要紧的是让局部包围盒恰好
 * 等于 (直径, 卵长, 直径)，测试量长径比时不会被摆放姿态污染。
 */
function eggGeometry(): THREE.BufferGeometry {
  const steps = 14
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    // 两端收成钝圆而不是针尖：sin 包络的 0.62 次方把腰身撑满，只在最后一小段收
    const k = t < 0.42 ? t / 0.42 : (1 - t) / 0.58
    const r = EGG_R * Math.pow(Math.sin(THREE.MathUtils.clamp(k, 0, 1) * Math.PI * 0.5), 0.62)
    sections.push({
      at: new THREE.Vector3(0, (t - 0.5) * EGG_LEN, 0),
      ry: Math.max(r, 0.004),
      rz: Math.max(r, 0.004),
    })
  }
  return loft(sections, 16)
}

// ---------------------------------------------------------------- 主体

export function buildLocustEgg(): InsectModel {
  const g = new THREE.Group()

  const wallMat = chitin({ color: WALL_COLOR, gloss: 0.12, surface: 'punctate' })
  const cavityMat = chitin({ color: CAVITY_COLOR, gloss: 0.16 })
  const cutMat = chitin({ color: CUT_COLOR, gloss: 0.14 })
  const matrixMat = chitin({ color: MATRIX_COLOR, gloss: 0.1, surface: 'punctate' })
  const eggMats = EGG_COLORS.map((c) => chitin({ color: c, gloss: 0.58, clearcoat: 0.35, translucent: true }))
  const foamMat = chitin({ color: FOAM_COLOR, gloss: 0.2 })
  const soilMat = chitin({ color: SOIL_COLOR, gloss: 0.08, surface: 'punctate' })
  const grainMat = chitin({ color: GRAIN_COLOR, gloss: 0.14, surface: 'punctate' })

  // ---- 卵囊：外壁 + 腔壁 + 两片剖面
  /*
   * 采样区间必须**正好**是关键帧表自己的两端。`keyframe()` 在表外是钳位的，
   * 采过了头会得到一串半径恒等于末值的点——早先腔壁多采了 0.48，
   * 于是卵囊顶上支出一根半径 0.006、长 0.48 的**针**，出图里是一条竖线。
   */
  const outerProf = profile(sample(OUTER, OUTER[0][0], OUTER[OUTER.length - 1][0], 64), false, 0.014, 0.44, 3.1)
  const cavityProf = profile(sample(CAVITY, CAVITY[0][0], CAVITY[CAVITY.length - 1][0], 48), false, 0.009, 0.36, 7.4)
  g.add(revolve(outerProf, wallMat, 'pod-wall'))
  g.add(revolve(cavityProf, cavityMat, 'pod-cavity'))
  for (const phi of [PHI_START, PHI_START + PHI_SPAN]) {
    g.add(cutFace([{ prof: outerProf }, { prof: cavityProf, reverse: true }], phi, cutMat, 'pod-cut'))
  }

  /*
   * 卵间基质：一根深色的柱子，卵嵌在它上面。
   *
   * 这是第二版目视验收后加的那一件。没有它时 56 枚卵背后是另一枚同色的卵，
   * 所有边界都是「浅色贴浅色」的一道软折，ACES 一提亮就没了，整束读成
   * 一片均匀的奶油色。有了它，每一列卵的两侧都是一条 0.09 宽的**深色缝**，
   * 一列一列数得出来。
   *
   * 半径 0.205 比卵列的轴心距 0.255 小 0.05：卵有三分之一埋在基质里，
   * 不是浮在它表面的一圈珠子；缝底露出来的正是它。
   */
  {
    const steps = 20
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = THREE.MathUtils.lerp(MATRIX_Y0, MATRIX_Y1, t)
      const cap = t < 0.08 ? t / 0.08 : t > 0.92 ? (1 - t) / 0.08 : 1
      const r = MATRIX_R * (0.25 + 0.75 * Math.sin(THREE.MathUtils.clamp(cap, 0, 1) * Math.PI * 0.5))
      sections.push({ at: new THREE.Vector3(bendX(y), y, 0), ry: r, rz: r })
    }
    const matrix = new THREE.Mesh(loft(sections, 22), matrixMat)
    matrix.name = 'egg-matrix'
    g.add(matrix)
  }

  // ---- 卵：8 根纵列 × 每列 7 枚
  const eggGeo = eggGeometry()
  const up = new THREE.Vector3(0, 1, 0)
  for (let col = 0; col < EGG_COLUMNS; col++) {
    const az = (col * Math.PI * 2) / EGG_COLUMNS
    const outward = new THREE.Vector3(Math.cos(az), 0, Math.sin(az))
    const tangent = new THREE.Vector3(-Math.sin(az), 0, Math.cos(az))
    for (let k = 0; k < EGG_PER_COLUMN; k++) {
      const id = col * EGG_PER_COLUMN + k
      /*
       * 每枚卵向外倒 3~7°、再沿切向歪 ±4°：真实卵囊里的卵是斜着一层层码上去的，
       * 排得整整齐齐就读成「一管电池」。倒角上限被腔径卡死——卵长 0.66、
       * 腔内径 0.69，倒过 7° 卵尖就捅穿囊壁了（见文件头招牌结构第 2 条）。
       */
      const tiltOut = THREE.MathUtils.degToRad(2 + hash(id) * 3)
      const tiltTan = THREE.MathUtils.degToRad(-4 + hash(id + 300) * 8)
      const dir = up
        .clone()
        .addScaledVector(outward, Math.tan(tiltOut))
        .addScaledVector(tangent, Math.tan(tiltTan))
        .normalize()

      // 三档卵色沿列错开，同一列上下相邻的两枚必落在不同档上（腰才看得出来）
      const egg = new THREE.Mesh(eggGeo, eggMats[(k + col * 2) % eggMats.length])
      egg.name = 'egg'
      /*
       * 这里用 setFromUnitVectors 是安全的：卵是绕自身长轴的旋转体，绕长轴的
       * 滚转（那个函数自己随便挑的那个自由度）对它没有任何观感影响。
       * 兰花螳螂的花瓣状腿节栽在这个函数上，是因为**扁平面朝哪儿**就是那个
       * 部件的全部意义——扁的东西绝不能把滚转交出去，圆的可以。
       */
      egg.quaternion.setFromUnitVectors(up, dir)
      const yy = EGG_Y0 + k * EGG_PITCH + col * EGG_HELIX + (hash(id + 600) - 0.5) * 0.03
      egg.position.set(bendX(yy) + EGG_RING_R * Math.cos(az), yy, EGG_RING_R * Math.sin(az))
      g.add(egg)
    }
  }

  // ---- 泡沫塞：芯柱 + 48 枚互相咬合的气泡
  {
    const steps = 16
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const y = THREE.MathUtils.lerp(FOAM_Y0 - 0.06, FOAM_Y1 + 0.04, t)
      // 芯柱只占腔径的 58%：留出的那一圈正是气泡骑上去、并在缝里露出腔壁的地方
      const cap = t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1
      const r = keyframe(CAVITY, y) * 0.58 * (0.3 + 0.7 * cap)
      sections.push({ at: new THREE.Vector3(bendX(y), y, 0), ry: r, rz: r })
    }
    const core = new THREE.Mesh(loft(sections, 20), foamMat)
    core.name = 'foam-core'
    g.add(core)

    for (let i = 0; i < BUBBLE_COUNT; i++) {
      const t = (i + 0.5) / BUBBLE_COUNT
      const y = THREE.MathUtils.lerp(FOAM_Y0, FOAM_Y1, t) + (hash(i + 40) - 0.5) * 0.1
      const rad = 0.058 + hash(i + 80) * 0.078
      // 黄金角铺开方位，气泡不会在某一侧扎堆；半径上限保证气泡不捅穿囊壁
      const az = i * 2.399963 + hash(i + 120) * 0.6
      const cavR = keyframe(CAVITY, y)
      const r = Math.min(cavR * (0.2 + hash(i + 160) * 0.7), Math.max(cavR - rad - 0.012, 0))
      const b = new THREE.Mesh(new THREE.SphereGeometry(rad, 12, 9), foamMat)
      b.name = 'foam-bubble'
      b.position.set(bendX(y) + r * Math.cos(az), y, r * Math.sin(az))
      g.add(b)
    }
  }

  // ---- 土柱：内壁贴着卵囊，与卵囊共用同一个剖切方位角
  {
    const pts: THREE.Vector2[] = []
    const amps: number[] = []
    const push = (r: number, y: number, amp: number) => {
      pts.push(new THREE.Vector2(r, y))
      amps.push(amp)
    }
    // 底面：由轴向外
    for (let i = 0; i <= 4; i++) push(THREE.MathUtils.lerp(0.012, SOIL_OUT, i / 4), SOIL_BOT, 0.02)
    // 外壁：向上。土柱的外面是掰开的土块，最粗粝的一段——
    // 采样必须够密（40 段）才吃得住下面 0.4 的细格距，24 段时会把起伏采成一条条横棱
    for (let i = 1; i <= 40; i++) push(SOIL_OUT, THREE.MathUtils.lerp(SOIL_BOT, SOIL_TOP, i / 40), 0.1)
    // 土面：向内收到囊壁
    const rimR = keyframe(OUTER, SOIL_TOP) + SOCKET_GAP
    for (let i = 1; i <= 9; i++) push(THREE.MathUtils.lerp(SOIL_OUT, rimR, i / 9), SOIL_TOP, 0.05)
    // 内壁（土穴）：沿囊壁下行。这一段振幅压到 0.008——它一起伏，土与囊之间
    // 就会时开时合，剖面上是一道忽宽忽窄的黑缝
    for (let i = 1; i <= 30; i++) {
      const y = THREE.MathUtils.lerp(SOIL_TOP, 0, i / 30)
      push(keyframe(OUTER, y) + SOCKET_GAP, y, 0.008)
    }
    const soilProf = profile(pts, true, amps, 0.4, 11.9)
    g.add(revolve(soilProf, soilMat, 'soil'))
    for (const phi of [PHI_START, PHI_START + PHI_SPAN]) {
      g.add(cutFace([{ prof: soilProf }], phi, soilMat, 'soil-cut'))
    }

    /*
     * 土面上的土块：14 粒摊在土面上，用**更亮一档**的材质。
     * 没有它们，土柱的上表面是一张光滑的圆环，出图上读成「插在一个塑料底座里」。
     * 只撒在保留下来的那 204° 上——撒到剖口那一侧就成了浮在空中的小球。
     */
    for (let i = 0; i < 14; i++) {
      const az = PHI_START + PHI_SPAN * ((i + 0.5) / 14 + (hash(i + 700) - 0.5) * 0.05)
      const r = THREE.MathUtils.lerp(0.26, SOIL_OUT - 0.06, hash(i + 740))
      const rad = 0.04 + hash(i + 780) * 0.055
      const lump = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), grainMat)
      lump.scale.set(1, 0.62, 1.15)
      lump.position.set(bendX(SOIL_TOP) + r * Math.cos(az), SOIL_TOP - rad * 0.25, r * Math.sin(az))
      lump.name = 'soil-grain'
      g.add(lump)
    }
    /*
     * 外壁上的土疙瘩：9 块，深埋 65%，**用土自己的材质**。
     *
     * 后斜机位（四个里唯一看不见剖口的那个）第一版是一段光溜溜的深褐圆棍——
     * 「一根巧克力」。第二版往壁上贴了 12 粒**浅色**小球去救，结果更糟：
     * 均匀铺开、大小相仿、比底色亮一档，四机位一致读成**巧克力上的糖豆**。
     * 病根不是数量而是**用颜色去区分同一种材料**：土疙瘩和土是同一种东西，
     * 它该靠形（凸起 + 自阴影）被看见，不该靠色。所以这一版换回土的材质、
     * 埋深到 65%、大小差到两倍，靠明暗转折读成「掰开的土块上凸出来的一坨」。
     */
    for (let i = 0; i < 9; i++) {
      const az = PHI_START + PHI_SPAN * (0.1 + 0.8 * hash(i + 820))
      const y = THREE.MathUtils.lerp(SOIL_BOT + 0.3, SOIL_TOP - 0.3, (i + 0.5) / 9 + (hash(i + 900) - 0.5) * 0.08)
      const rad = 0.07 + hash(i + 860) * 0.09
      const r = SOIL_OUT - rad * 0.65
      const lump = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), soilMat)
      lump.scale.set(1, 0.85 + hash(i + 940) * 0.5, 1.25)
      lump.position.set(bendX(y) + r * Math.cos(az), y, r * Math.sin(az))
      lump.name = 'soil-clod'
      g.add(lump)
    }
  }

  // ---- 整体倾斜 + 偏航（理由见文件头「摆位」）
  const root = new THREE.Group()
  g.rotation.set(0, YAW, TILT)
  root.add(g)

  /*
   * 锚点全部落在实体内部或表面上：
   * eggMass 在卵间基质柱里（周围一圈就是卵），foamPlug 在泡沫芯柱里，
   * podWall / soil 取方位角 350°——那是剖口近侧的那条边，
   * 展台默认机位（方位角 56°）正对着它。
   */
  const wallAz = THREE.MathUtils.degToRad(350)
  const wallR = keyframe(OUTER, 2.4)
  const anchors: Record<string, THREE.Vector3> = {
    eggMass: axisAt(2.4),
    foamPlug: axisAt(FOAM_ANCHOR_Y),
    podWall: toModel(bendX(2.4) + wallR * Math.cos(wallAz), 2.4, wallR * Math.sin(wallAz)),
    soil: toModel(bendX(SOIL_TOP) + 0.42 * Math.cos(wallAz), SOIL_TOP - 0.03, 0.42 * Math.sin(wallAz)),
  }

  /*
   * 取景半径：**逐顶点量出来的真实包围半径**，不是 `finalize()` 那个由包围盒
   * 算的球（`boundingRadius()` 取的是盒对角线的一半）。
   *
   * 这一件是一根**斜置的细棒**：轴对齐包围盒把它外接成一个大方块，
   * 盒对角线比棒本身长出三成，于是相机白退开三成、卵粒跟着缩小三成。
   * 真实包围半径 = max|v − 中心|，对一根棒就是它自己的半长，一点空气都不多留。
   * `radius` 本身不动——它仍是「模型有多大」的事实，落影等仍按它算。
   */
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root)
  const center = box.getCenter(new THREE.Vector3())
  const v = new THREE.Vector3()
  let far = 0
  root.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    const pos = m.geometry.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      m.localToWorld(v)
      far = Math.max(far, v.distanceTo(center))
    }
  })

  return finalize(root, anchors, { frameRadius: far * 1.02 })
}
