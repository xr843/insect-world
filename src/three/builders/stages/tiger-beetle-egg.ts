/**
 * 中华虎甲 · 卵 Cicindela chinensis（完全变态第 1 阶段）
 *
 * 单位与坐标系与成虫（../tiger-beetle.ts）完全一致：1 = 1 厘米真实体长，
 * +X 向前、+Y 向上、+Z 向右。沙面摊在 XZ 平面上，远处的平沙面 y≈0。
 *
 * ## 招牌是「单独一粒、埋在沙里」，不是一簇
 *
 * 瓢虫、萤火虫的卵靠「成簇」认得出；虎甲恰好相反 —— 雌虫在向阳的裸露沙土上
 * 用腹末**挖一个小坑、只产一粒**，产完拿沙把坑填平，一次一坑、一坑一粒。
 * 所以本文件只放一粒卵，语境交给沙：
 *
 * - **一个刚挖开的小坑**：卵横卧在坑底的一道浅槽里，下半截陷在沙中。
 *   真实的坑产完卵会被填平，卵埋在几毫米深处 —— 这里做成「坑还没填」的那一刻，
 *   理由与 `ladybird-egg.ts` 把叶背的卵翻到叶面上是同一条：**埋起来的卵在任何
 *   机位都看不见**，等于把主角挡掉。这是为可见性做的取舍，不是形态错误。
 * - **坑边一小堆挖出来的沙**：堆在坑的一侧，读得出「这坑是刚挖的」。
 * - **沙粒按真实粒径散布**：细沙 0.1~0.25 毫米、中沙到 0.5 毫米（模型 0.01~0.05）。
 *   沙粒本身就是尺度参照 —— 卵只比最粗的几颗沙大四五倍，这才是「2 毫米」的真实观感。
 *
 * ## 形态依据
 *
 * - **长约 1.9 毫米、径约 0.85 毫米**（模型 0.19 × 0.085）：白色长椭圆，
 *   两端圆钝、略不对称（一端稍粗）。Cicindela 属的卵普遍在 1.5~2 毫米。
 * - **乳白**（`#f4eedd`，明度 0.91）。ACES 会提亮去饱和，但乳白反过来最怕「压深」——
 *   压一档就成脏灰（第 5 轮那个坑）。防过曝交给哑光材质（gloss 0.35、清漆 0.08），
 *   不交给颜色。沙取暖灰黄（明度 0.62），与卵差 0.29 —— 白卵靠这个差从沙里跳出来。
 * - 卵壳光滑，无脊无纹（与瓢虫卵的纵脊、蝶卵的网纹不同），所以本文件不做表面纹饰；
 *   可指认的东西全在「单粒 + 沙坑」这层语境上。
 *
 * ## 基座尺寸
 *
 * 沙面半径压到 0.24，只比卵长多出一截：帝王蝶那颗卵的教训 —— 基座一大，
 * 取景被它撑开，卵反而缩成一个点。卵长占画面直径约三分之一。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

// ---------------------------------------------------------------- 尺度

/** 卵长：真实约 1.9 毫米 */
const EGG_LEN = 0.19
/** 卵最宽处半径：径约 0.85 毫米 */
const EGG_R = 0.0425
/** 卵轴在 XZ 平面上的方位（度）。斜着放，四个机位都不会正对它的端头 */
const EGG_YAW_DEG = 28
/** 坑心 */
const PIT_CENTER = new THREE.Vector3(0.02, 0, -0.01)
/** 坑的半长（沿卵轴）与半宽、深度 */
const PIT_A = 0.15
const PIT_B = 0.1
const PIT_DEPTH = 0.014
/**
 * 卵陷进坑底的深度。只陷一小截：第一版陷到接近一半，出图里卵与沙的交线是
 * 一道硬边、露在外面的部分又没有侧影，读成沙面上的一个白洞而不是一粒卵
 */
const EGG_SINK = 0.008
/** 沙面半径与厚度 */
const PATCH_R = 0.24
const PATCH_T = 0.06
/** 坑边那堆挖出来的沙：堆心、半径、高 */
const SPOIL_CENTER = new THREE.Vector3(-0.1, 0, 0.13)
const SPOIL_R = 0.1
const SPOIL_H = 0.035

// ---------------------------------------------------------------- 颜色

/** 卵：乳白，不压深 */
const EGG_COLOR = '#f4eedd'
/** 沙面：向阳裸沙的暖灰黄 */
const SAND_COLOR = '#c2a878'
/** 沙粒：几档石英/长石/暗色矿物，逐颗不同，别让整片沙读成一张均匀的布 */
const GRAIN_COLORS = ['#d6c197', '#b89a68', '#c9b184', '#a88c5f', '#e2d4b3', '#8c7a5e', '#cfae7c'] as const

// ---------------------------------------------------------------- 随机数

/**
 * 种子化 PRNG（mulberry32）。沙粒位置必须是确定性的：同一份代码在任何机器上
 * 都要长成同一片沙，否则目视验收过的那张图跟用户看到的不是同一个东西。
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

// ---------------------------------------------------------------- 沙面

const yaw = THREE.MathUtils.degToRad(EGG_YAW_DEG)
/** 卵轴方向（水平） */
const EGG_AXIS = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
/** 水平面内垂直于卵轴的方向 */
const EGG_SIDE = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))

/** 沙面边界随角度起伏：一片抓起来的沙不是正圆 */
function patchEdge(ang: number): number {
  return PATCH_R * (1 + 0.07 * Math.sin(ang * 3 + 0.9) + 0.05 * Math.sin(ang * 5 - 0.4))
}

/**
 * 沙面高度。三项：
 * 1. 坑：沿卵轴拉长的椭圆凹，底部是一道承托卵的浅槽；坑沿不起棱（真实的坑沿
 *    是塌下去的松沙，一圈凸起的唇会读成火山口）。
 * 2. 挖出来的沙堆在坑的一侧。
 * 3. 细碎起伏：几组正弦叠加，光滑的圆盘读成饼干。
 */
function sandHeight(x: number, z: number): number {
  const d = new THREE.Vector3(x - PIT_CENTER.x, 0, z - PIT_CENTER.z)
  const a = d.dot(EGG_AXIS) / PIT_A
  const b = d.dot(EGG_SIDE) / PIT_B
  const q = Math.sqrt(a * a + b * b)
  const pit = q < 1 ? -PIT_DEPTH * Math.pow(Math.cos((q * Math.PI) / 2), 1.4) : 0
  const s = Math.hypot(x - SPOIL_CENTER.x, z - SPOIL_CENTER.z) / SPOIL_R
  const spoil = s < 1 ? SPOIL_H * Math.pow(Math.cos((s * Math.PI) / 2), 1.6) : 0
  const ripple =
    0.004 * Math.sin(x * 41 + z * 13) + 0.003 * Math.sin(z * 57 - x * 21 + 1.3) + 0.002 * Math.sin(x * 97 + 0.4)
  // 坑底不叠起伏：卵要稳稳卧在槽里，一道波纹就能让它悬空一角
  return pit + spoil + ripple * THREE.MathUtils.smoothstep(q, 0.5, 1.1)
}

/** 沙面：极坐标网格的上表面 + 下表面 + 外缘侧壁（有厚度的一片沙） */
function sandGeometry(): THREE.BufferGeometry {
  const NA = 72
  const NR = 26
  const pos: number[] = []
  const idx: number[] = []
  const push = (x: number, y: number, z: number) => {
    pos.push(x, y, z)
    return pos.length / 3 - 1
  }
  const top: number[][] = []
  const bottom: number[][] = []
  for (let i = 0; i <= NR; i++) {
    const rowT: number[] = []
    const rowB: number[] = []
    for (let j = 0; j < NA; j++) {
      const ang = (j / NA) * Math.PI * 2
      const rad = (i / NR) * patchEdge(ang)
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad
      const y = sandHeight(x, z)
      rowT.push(push(x, y, z))
      // 外缘收薄：掰下来的一片沙，边上本来就薄（等厚的侧壁读成蛋糕切面）
      const t = PATCH_T * (1 - 0.7 * THREE.MathUtils.smoothstep(i / NR, 0.5, 1))
      rowB.push(push(x, Math.min(y, 0) - t, z))
    }
    top.push(rowT)
    bottom.push(rowB)
  }
  for (let i = 0; i < NR; i++) {
    for (let j = 0; j < NA; j++) {
      const j2 = (j + 1) % NA
      idx.push(top[i][j], top[i + 1][j2], top[i + 1][j])
      idx.push(top[i][j], top[i][j2], top[i + 1][j2])
      idx.push(bottom[i][j], bottom[i + 1][j], bottom[i + 1][j2])
      idx.push(bottom[i][j], bottom[i + 1][j2], bottom[i][j2])
    }
  }
  for (let j = 0; j < NA; j++) {
    const j2 = (j + 1) % NA
    idx.push(top[NR][j], bottom[NR][j2], bottom[NR][j])
    idx.push(top[NR][j], top[NR][j2], bottom[NR][j2])
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// ---------------------------------------------------------------- 卵

/**
 * 卵壳半径剖面（t=0 → 1 沿卵轴）。两端圆钝、最粗处略偏后（0.45）：
 * 完全对称的椭球读成一粒米，微微一头粗才是卵。
 */
function eggRadius(t: number): number {
  // 椭圆剖面（sqrt）给出圆钝的端头；再乘一条缓坡让后端比前端粗一点。
  // 第一版用 sin^0.62，两端收成尖，顶视读成一片柳叶
  const e = Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2)))
  return EGG_R * e * (1.05 - 0.1 * t)
}

/** 卵心：坑心往下 PIT_DEPTH，再抬起一个卵半径、减去陷进沙里的那截 */
const EGG_CENTER = new THREE.Vector3(PIT_CENTER.x, -PIT_DEPTH + EGG_R - EGG_SINK, PIT_CENTER.z)

function eggMesh(material: THREE.Material): THREE.Mesh {
  const steps = 26
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const r = Math.max(eggRadius(t), 1e-4)
    const at = EGG_CENTER.clone().addScaledVector(EGG_AXIS, (t - 0.5) * EGG_LEN)
    // roll = π 把放样的接缝转到卵的下侧（埋在沙里）：接缝处法线不连续，
    // 朝上时后斜机位读出一道纵贯卵背的亮线
    sections.push({ at, ry: r, rz: r, roll: Math.PI })
  }
  const mesh = new THREE.Mesh(loft(sections, 24), material)
  mesh.name = 'egg-shell'
  return mesh
}

// ---------------------------------------------------------------- 沙粒

/**
 * 沙粒：粒径按幂律取样（细粒极多、粗粒很少），每粒各轴独立压扁再随机滚转，
 * 平面多面体（Icosahedron 不细分）—— 石英砂是有棱角的，滚圆的小球读成珠子。
 * 坑里与卵的周围留空：沙粒压在卵上会把主角切碎。
 */
function grains(mats: THREE.Material[]): THREE.Group {
  const g = new THREE.Group()
  const rnd = rng(0x71c3a9)
  let placed = 0
  let guard = 0
  while (placed < 130 && guard++ < 2000) {
    const ang = rnd() * Math.PI * 2
    const rad = Math.sqrt(rnd()) * patchEdge(ang) * 0.94
    const x = Math.cos(ang) * rad
    const z = Math.sin(ang) * rad
    const d = new THREE.Vector3(x - PIT_CENTER.x, 0, z - PIT_CENTER.z)
    const q = Math.hypot(d.dot(EGG_AXIS) / (PIT_A * 1.05), d.dot(EGG_SIDE) / (PIT_B * 1.05))
    if (q < 0.9) continue
    const size = 0.005 + 0.016 * Math.pow(rnd(), 2.6)
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), mats[placed % mats.length])
    m.name = 'sand-grain'
    m.position.set(x, sandHeight(x, z) + size * 0.3, z)
    m.scale.set(1, 0.55 + rnd() * 0.4, 0.7 + rnd() * 0.5)
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3)
    g.add(m)
    placed++
  }
  return g
}

// ---------------------------------------------------------------- 绕向

/**
 * 让每个三角面的绕向与它的顶点法线一致。
 *
 * `kit.loft()` 的侧面绕向与它自己算的外法线相反，`finalize()` 又统一开了
 * DoubleSide —— 朝相机那面被判成背面、着色法线被翻一次，全仓库的 loft 件
 * 都是按**朝内**的法线受光的（见记忆 loft-winding-inverted，没修是故意的：
 * 改 kit 会改变 63 只成虫的观感）。有纹理、有斑、有深色的虫体上看不太出来；
 * 可一粒光溜溜的乳白卵上，它就是全部 —— 第一、二版出图里这粒卵读成
 * **沙面上的一个凹坑**（亮面在背光侧、暗月牙在受光侧，正是凹面的光影）。
 *
 * 所以本文件在 finalize 之前逐面校正：面法线与三个顶点法线之和反向就交换两个
 * 顶点。只动本文件自己的几何，kit 与其它物种一个字不碰；球、多面体、手写的
 * 沙面本来就一致，这里对它们是空操作。
 */
function orientFaces(root: THREE.Object3D): void {
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const n = new THREE.Vector3()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry
    const idx = geo.index
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    if (!idx || !nor) return
    for (let i = 0; i < idx.count; i += 3) {
      const i0 = idx.getX(i)
      const i1 = idx.getX(i + 1)
      const i2 = idx.getX(i + 2)
      a.fromBufferAttribute(pos, i0)
      b.fromBufferAttribute(pos, i1).sub(a)
      c.fromBufferAttribute(pos, i2).sub(a)
      const face = b.cross(c)
      n.fromBufferAttribute(nor, i0)
        .add(a.fromBufferAttribute(nor, i1))
        .add(a.fromBufferAttribute(nor, i2))
      if (face.dot(n) < 0) {
        idx.setX(i + 1, i2)
        idx.setX(i + 2, i1)
      }
    }
    idx.needsUpdate = true
  })
}

// ---------------------------------------------------------------- 装配

export function buildTigerBeetleEgg(): InsectModel {
  const g = new THREE.Group()

  const sandMat = chitin({ color: SAND_COLOR, gloss: 0.12, clearcoat: 0, surface: 'punctate' })
  const grainMats = GRAIN_COLORS.map((c) => chitin({ color: c, gloss: 0.3, clearcoat: 0 }))
  // 卵：乳白 + 哑光。不开 translucent（单粒长椭球开了透射会读成一颗玻璃珠），
  // 也绝不用 elytra()：乳白配满档清漆会整片过曝成白铬
  const eggMat = chitin({ color: EGG_COLOR, gloss: 0.55, clearcoat: 0.22, surface: 'smooth' })

  const sand = new THREE.Mesh(sandGeometry(), sandMat)
  sand.name = 'sand'
  g.add(sand)
  g.add(grains(grainMats))
  g.add(eggMesh(eggMat))
  orientFaces(g)

  /*
   * 锚点：卵顶（壳面上的一点）、坑沿（沙面上）、挖出的沙堆顶。
   * 名字全部避开成虫 hotspot 表里的 mandible/elytra/eye/leg/antenna/pronotum ——
   * 展台按锚点名去配成虫卡片，同名会把「镰刀状上颚」那张卡贴到一粒卵上。
   */
  const pitRim = PIT_CENTER.clone().addScaledVector(EGG_SIDE, -PIT_B * 1.1)
  pitRim.y = sandHeight(pitRim.x, pitRim.z)
  const anchors: Record<string, THREE.Vector3> = {
    egg: EGG_CENTER.clone().add(new THREE.Vector3(0, EGG_R, 0)),
    eggPit: pitRim,
    sandSpoil: new THREE.Vector3(SPOIL_CENTER.x, sandHeight(SPOIL_CENTER.x, SPOIL_CENTER.z), SPOIL_CENTER.z),
  }

  return finalize(g, anchors)
}
