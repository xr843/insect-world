/**
 * 双叉犀金龟 · 卵 Trypoxylus dichotomus（完全变态第 1 阶段）
 *
 * 造型要点：
 * - **乳白、近球形、直径约 3 毫米**（模型 0.3）。雌虫钻进腐殖土 10~20 厘米深处
 *   产卵，刚产下的卵是长约 3 毫米的短椭球，孵化前吸水膨大到接近正圆球、
 *   直径 4 毫米上下。这里取「产下若干天后」的中间态：长径 0.34、短径 0.30，
 *   略呈卵形而不是标准球——完全的正圆球会读成一颗珍珠，留一点长短轴差
 *   才有「这是个卵」的感觉。
 * - **表面光滑略有弹性感**。卵壳是薄而软的绒膜，不是几丁质硬壳，所以
 *   `gloss` 只给 0.4（roughness≈0.63）、**clearcoat 几乎为零**：
 *   这一条是本文件最重要的材质纪律。乳白色 + `elytra()` 那档清漆高光在
 *   ACES 下会整片过曝成白铬（七星瓢虫、甘薯腊龟甲都栽过），而卵的固有色
 *   本来就贴近画面最亮端，一旦上清漆就只剩一团白。`translucent: true`
 *   （transmission 0.35）补的是次表面透光——真实的卵对着光是半透的，
 *   这比任何高光都更像「卵」。
 * - 颜色 `#ecdfc2` 直接对齐 termite-soldier.ts 那身目视验收过的「苍白柔软」
 *   体色。这一档是有来由的：再压深就成脏灰（第 5 轮 10 只里 7 只返工的
 *   那个坑），再提亮就顶到 ACES 的高光肩部、连体积感一起吃掉。
 * - **土室**：卵不是悬在空中的，雌虫会在腐殖土里做一个小土室把卵放进去。
 *   一颗孤零零的乳白椭球，人看了会说「一颗珍珠 / 一粒米」；把它半埋进一圈
 *   腐殖土颗粒里，才会说「一粒虫卵」。所以这里做的不是「装饰」，而是让
 *   招牌读得出来的必要语境。分寸：土粒只兜住下半，卵的上半（含赤道以上
 *   整整一圈）完全露出来——埋过头就成了「一堆土」。
 *
 * 尺度按真实比例：卵只有毫米级，`finalize()` 的 radius 归一化会让它在画面里
 * 撑满，真实大小交给界面文字说。这跟成虫之间竹节虫 10cm 与瓢虫 0.7cm 差
 * 20 倍是同一套处理。
 *
 * 局部坐标系与成虫完全一致：+X 向前、+Y 向上、+Z 向右。卵没有前后之分，
 * 长轴按约定摆在 X 上。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

/** 卵的长径（沿 X）与短径。3.4mm × 3.0mm —— 产下数日后的中间态 */
const EGG_LENGTH = 0.34
const EGG_WIDTH = 0.3

/**
 * 土粒数量与半径区间。上限 0.038 ≈ 卵短径的 1/4 —— 再大就读成「一圈石块」
 * 而不是腐殖土（第一版给到 0.062，出图是一圈咖啡豆）。
 */
const GRAIN_COUNT = 96
const GRAIN_MIN = 0.016
const GRAIN_MAX = 0.038

/**
 * 种子化 PRNG（mulberry32）。土粒必须是**确定性**的随机：
 * 同一份代码在任何机器、任何一次构建里都要长成同一颗卵，
 * 否则目视验收过的那张图跟用户看到的不是同一个东西。
 * 这条纪律与 surface.ts 的程序贴图一致（那里也是种子化噪声）。
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

/**
 * 卵体：沿 X 放样的椭球。
 *
 * 不用 `spindle()` —— 它的半径包络是 `sin(k·π/2)`，两端收成尖，做出来是个
 * 柠檬不是卵。这里直接喂 `loft()` 一条真正的椭圆母线
 * `r = R·√(1-u²)`，两极是光滑的球冠。
 *
 * `ovoid` 是那点不对称：钝端（后极）略粗于尖端，卵才不像一颗珠子。
 */
function eggBody(): THREE.BufferGeometry {
  const steps = 30
  const half = EGG_LENGTH / 2
  const sections: Section[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const u = 2 * t - 1
    const ovoid = 1 + 0.07 * u // 后极（u<0，−X 侧）略粗
    const r = Math.max((EGG_WIDTH / 2) * Math.sqrt(Math.max(0, 1 - u * u)) * ovoid, 1e-4)
    sections.push({ at: new THREE.Vector3(u * half, 0, 0), ry: r, rz: r })
  }
  return loft(sections, 32)
}

/**
 * 土室：一圈半埋住卵的腐殖土颗粒。
 *
 * 用一堆不规则小球而不是一只「碗」：碗形放样出来是个规整的基座，
 * 读成「摆件的托盘」；腐殖土的辨识特征恰恰是**颗粒**与不规则。
 * 每粒都沿自己的随机轴向压扁一点，避免整圈都是标准小球。
 *
 * 只铺在赤道以下（俯角 8°~80°），且颗粒中心落在卵面外侧，
 * 保证卵的上半始终完全暴露：最高的一圈土粒顶端也只到卵高的 ~26% 处。
 */
function soilChamber(material: readonly THREE.Material[]): THREE.Group {
  const g = new THREE.Group()
  const rand = rng(0x5eed1a)
  for (let i = 0; i < GRAIN_COUNT; i++) {
    // 黄金角螺旋：比纯随机均匀，不会「一边堆满一边空」；
    // 俯角随 i 从 8° 铺到 80°，于是这条螺旋从土室口沿一路盘到室底。
    const azimuth = i * 2.399963
    const dip = THREE.MathUtils.degToRad(8 + Math.pow(i / GRAIN_COUNT, 0.8) * 72 + (rand() - 0.5) * 9)
    const size = GRAIN_MIN + rand() * (GRAIN_MAX - GRAIN_MIN)
    // 贴着卵面外侧一点，微微嵌入（0.9）读成「土压着卵」而不是「土浮在旁边」
    const a = EGG_LENGTH / 2 + size * 0.9
    const b = EGG_WIDTH / 2 + size * 0.9
    const p = new THREE.Vector3(
      Math.cos(dip) * Math.cos(azimuth) * a,
      -Math.sin(dip) * b,
      Math.cos(dip) * Math.sin(azimuth) * b,
    )

    // 两档土色轮换：一色到底的土粒会读成一圈规整的巧克力豆，
    // 腐殖土的辨识特征本来就有一半在「颜色不匀」上
    const grain = new THREE.Mesh(new THREE.SphereGeometry(size, 9, 7), material[i % material.length])
    grain.name = 'soil-grain'
    grain.position.copy(p)
    grain.scale.set(1 - rand() * 0.35, 1 - rand() * 0.35, 1 - rand() * 0.35)
    grain.rotation.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI)
    g.add(grain)
  }
  return g
}

export function buildRhinocerosBeetleEgg(): InsectModel {
  const g = new THREE.Group()

  /*
   * 卵壳材质。三个数都是「防白铬」的：
   * gloss 0.4 → roughness ≈ 0.63（宽而软的高光，不是镜面点）；
   * clearcoat 0.05 → 几乎没有第二层角度高光（elytra 的 0.55 在这个亮度上必炸）；
   * translucent → transmission 0.35，光从卵背面透过来，这才是「卵」的质感来源。
   */
  const shellMat = chitin({
    color: '#ecdfc2',
    gloss: 0.4,
    clearcoat: 0.05,
    translucent: true,
    surface: 'smooth',
  })
  /*
   * 腐殖土：哑光、无清漆，两档深浅轮换。
   * 这里可以放心压深 —— 它是背景不是主体（「宁深勿浅」只对背景成立），
   * 深土色正好把乳白的卵衬出来。但也别压到近黑：第一版 #3f3226 在
   * ACES 下读成一圈巧克力，抬到 #4b3b2b / #5a4632 才像土。
   */
  const soilMats = [
    chitin({ color: '#4b3b2b', gloss: 0.12, clearcoat: 0 }),
    chitin({ color: '#5a4632', gloss: 0.1, clearcoat: 0 }),
  ]

  const egg = new THREE.Mesh(eggBody(), shellMat)
  egg.name = 'egg-shell'
  g.add(egg)
  g.add(soilChamber(soilMats))

  const anchors: Record<string, THREE.Vector3> = {
    egg: new THREE.Vector3(0, EGG_WIDTH * 0.42, 0),
    chamber: new THREE.Vector3(0, -EGG_WIDTH * 0.62, EGG_WIDTH * 0.5),
  }

  return finalize(g, anchors)
}
