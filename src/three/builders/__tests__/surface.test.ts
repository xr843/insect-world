/**
 * 表面微观贴图层（surface.ts + kit 材质函数升级）的测试。
 *
 * 最重要的一条约定：vitest 跑在 node，没有 Canvas 2D——全部生成器必须
 * 返回 null 且不抛。kit 被 50 个物种引用，这条破了就是全项目测试一起炸。
 *
 * 贴图生成与缓存路径用一个最小的假 document 来跑：假 canvas 只需
 * createImageData / putImageData（surface.ts 刻意只用这两个 API 画图，
 * 全部像素都在 ImageData 缓冲里算好再放上去），这让 Sobel、噪声、挖坑
 * 这些真正的生成代码也能在 node 里被执行与断言，而不是只测降级分支。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { MICRO_ROUGHNESS_VARIATION, microRoughnessMap, punctateMaps, striateMaps } from '../surface'
import { chitin, elytra, membrane } from '../kit'

interface DrawnImage {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** 最小假 DOM：够 surface.ts 走完整个生成路径，并把画出的像素捕获下来 */
function fakeDom() {
  const drawn: DrawnImage[] = []
  const doc = {
    createElement(tag: string) {
      if (tag !== 'canvas') throw new Error(`意料之外的 createElement(${tag})`)
      return {
        width: 0,
        height: 0,
        getContext(kind: string) {
          if (kind !== '2d') return null
          return {
            createImageData(w: number, h: number): DrawnImage {
              return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
            },
            putImageData(img: DrawnImage) {
              drawn.push(img)
            },
          }
        },
      }
    },
  }
  return { doc, drawn }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------- node 降级

describe('node 降级路径（没有 Canvas 2D）', () => {
  it('microRoughnessMap 返回 null 且不抛（重复调用同样）', () => {
    expect(microRoughnessMap()).toBeNull()
    expect(microRoughnessMap(2)).toBeNull()
    expect(microRoughnessMap()).toBeNull()
  })

  it('punctateMaps 返回 null 且不抛', () => {
    expect(punctateMaps()).toBeNull()
    expect(punctateMaps(120, 0.03)).toBeNull()
  })

  it('striateMaps 返回 null 且不抛', () => {
    expect(striateMaps()).toBeNull()
    expect(striateMaps(11, 2)).toBeNull()
  })

  it('chitin 拿不到贴图时不挂 map，标量参数照常', () => {
    const m = chitin({ color: '#c00', gloss: 0.9, clearcoat: 0.8 })
    expect(m.roughnessMap).toBeNull()
    expect(m.normalMap).toBeNull()
    expect(m.roughness).toBeLessThan(0.25) // 既有观感数值不动
  })

  it('surface 四个档位在 node 下都能构建且不挂贴图', () => {
    for (const surface of ['smooth', 'punctate', 'striate', 'velvet'] as const) {
      const m = chitin({ color: '#4f5f27', surface })
      expect(m.roughnessMap, surface).toBeNull()
      expect(m.normalMap, surface).toBeNull()
    }
  })
})

// ---------------------------------------------------------------- 材质参数落位

describe('材质参数落位（与贴图无关，node 下即可断言）', () => {
  it('velvet：sheen 开启、粗糙绒面、sheenColor 比基色亮一档', () => {
    const m = chitin({ color: '#6d4025', surface: 'velvet' })
    expect(m.sheen).toBeGreaterThan(0)
    expect(m.sheenRoughness).toBeCloseTo(0.55, 5)
    const base = { h: 0, s: 0, l: 0 }
    const sheen = { h: 0, s: 0, l: 0 }
    m.color.getHSL(base)
    m.sheenColor.getHSL(sheen)
    expect(sheen.l).toBeGreaterThan(base.l)
  })

  it('velvet 不改已验收的基础 roughness', () => {
    const plain = chitin({ color: '#6d4025', gloss: 0.3 })
    const velvet = chitin({ color: '#6d4025', gloss: 0.3, surface: 'velvet' })
    expect(velvet.roughness).toBe(plain.roughness)
  })

  it('translucent：有透射，且 depthWrite 保持 true（不透明度未降时）', () => {
    const m = chitin({ color: '#e8dcc0', translucent: true })
    expect(m.transmission).toBeGreaterThan(0)
    expect(m.transparent).toBe(false)
    expect(m.depthWrite).toBe(true)
  })

  it('translucent + opacity<1 仍走透明排序（龟甲裙边既有行为）', () => {
    const m = chitin({ color: '#dce6ab', opacity: 0.42, translucent: true })
    expect(m.transparent).toBe(true)
    expect(m.depthWrite).toBe(false)
  })

  it('elytra 虹彩：iridescence 拉满、清漆压到 ≤0.35', () => {
    const m = elytra('#333', 0.4, { iridescent: true })
    expect(m.iridescence).toBe(1)
    expect(m.iridescenceIOR).toBeCloseTo(1.3, 5)
    expect(m.clearcoat).toBeLessThanOrEqual(0.35)
    const [lo, hi] = m.iridescenceThicknessRange
    expect(lo).toBeGreaterThan(0)
    expect(hi).toBeGreaterThan(lo)
  })

  it('elytra 默认档完全不变：清漆 0.55、无虹彩（50 个物种的既有观感）', () => {
    const m = elytra('#e2382a', 0.12)
    expect(m.clearcoat).toBeCloseTo(0.55, 5)
    expect(m.iridescence).toBe(0)
    expect(m.metalness).toBeCloseTo(0.12, 5)
    expect(m.roughness).toBeCloseTo(1 - 0.74 * 0.92, 5)
  })

  it('虹彩厚度区间不共享引用：改一份材质不牵连另一份', () => {
    const a = elytra('#333', 0.2, { iridescent: true })
    const b = elytra('#333', 0.2, { iridescent: true })
    expect(a.iridescenceThicknessRange).not.toBe(b.iridescenceThicknessRange)
  })

  it('membrane 虹彩：强度为「极轻」档（0 < i < 1），透明约定不变', () => {
    const m = membrane('#cfe0e8', 0.22, { iridescent: true })
    expect(m.iridescence).toBeGreaterThan(0)
    expect(m.iridescence).toBeLessThan(1)
    expect(m.transparent).toBe(true)
    expect(m.depthWrite).toBe(false)
  })

  it('membrane 默认档不带虹彩', () => {
    expect(membrane().iridescence).toBe(0)
  })
})

// ---------------------------------------------------------------- 生成与缓存

describe('贴图生成与缓存（假 document 跑完整生成路径）', () => {
  it('同参数两次调用返回同一 Texture 实例；不同参数各归各', () => {
    const { doc } = fakeDom()
    vi.stubGlobal('document', doc)
    const a = microRoughnessMap()
    const b = microRoughnessMap()
    expect(a).toBeInstanceOf(THREE.CanvasTexture)
    expect(b).toBe(a)

    const p1 = punctateMaps()
    const p2 = punctateMaps()
    expect(p1!.normal).toBe(p2!.normal)
    expect(p1!.roughness).toBe(p2!.roughness)

    const s1 = striateMaps()
    const s2 = striateMaps(11, 1.5)
    expect(s2).not.toBe(s1)
    expect(s2!.normal).not.toBe(s1!.normal)
  })

  it('贴图统一设置：RepeatWrapping + anisotropy 4 + 线性色彩空间', () => {
    const { doc } = fakeDom()
    vi.stubGlobal('document', doc)
    const maps = striateMaps(13, 1.2)!
    for (const t of [maps.normal, maps.roughness]) {
      expect(t.wrapS).toBe(THREE.RepeatWrapping)
      expect(t.wrapT).toBe(THREE.RepeatWrapping)
      expect(t.anisotropy).toBe(4)
      expect(t.colorSpace).toBe(THREE.NoColorSpace) // 数据图必须线性，sRGB 会把法线掰弯
    }
  })

  it('chitin 各档位挂对贴图：默认只有粗糙度，punctate/striate 有法线+粗糙度，smooth 全无', () => {
    const { doc } = fakeDom()
    vi.stubGlobal('document', doc)
    const plain = chitin({ color: '#333' })
    expect(plain.roughnessMap).toBeTruthy()
    expect(plain.normalMap).toBeNull()

    const punctate = chitin({ color: '#333', surface: 'punctate' })
    expect(punctate.normalMap).toBeTruthy()
    expect(punctate.roughnessMap).toBeTruthy()

    const striate = chitin({ color: '#333', surface: 'striate' })
    expect(striate.normalMap).toBeTruthy()
    expect(striate.roughnessMap).toBeTruthy()

    const smooth = chitin({ color: '#333', surface: 'smooth' })
    expect(smooth.roughnessMap).toBeNull()
    expect(smooth.normalMap).toBeNull()

    const velvet = chitin({ color: '#333', surface: 'velvet' })
    expect(velvet.roughnessMap).toBeTruthy() // 绒面同样不该有均匀高光
  })

  it('elytra 的 surface 选项透传到贴图，虹彩与纹理可同开', () => {
    const { doc } = fakeDom()
    vi.stubGlobal('document', doc)
    const m = elytra('#146b3f', 0.6, { surface: 'striate', iridescent: true })
    expect(m.normalMap).toBeTruthy()
    expect(m.roughnessMap).toBeTruthy()
    expect(m.iridescence).toBe(1)
    expect(m.clearcoat).toBeLessThanOrEqual(0.35)
  })

  it('微颗粒图是「极轻」乘法图：值域贴着 1，永不整体变糙', () => {
    const { doc, drawn } = fakeDom()
    vi.stubGlobal('document', doc)
    microRoughnessMap(1.31) // 独占参数，避开其它测试的缓存
    expect(drawn).toHaveLength(1)
    const { data } = drawn[0]
    const floor = Math.floor((1 - MICRO_ROUGHNESS_VARIATION) * 255) - 1
    let sum = 0
    let count = 0
    let bad = 0 // 逐像素断言太慢（26 万像素），聚合成违规计数一次断言
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < floor || data[i + 3] !== 255) bad++
      sum += data[i]
      count++
    }
    expect(bad).toBe(0)
    expect(sum / count).toBeGreaterThan(230) // 均值 ≈ (1 − 幅度/2)·255 ≈ 240
  })

  it('刻点法线图像素合法：法线全部朝外半球、有真实起伏、alpha 不透明', () => {
    const { doc, drawn } = fakeDom()
    vi.stubGlobal('document', doc)
    punctateMaps(212, 0.02) // 独占参数
    expect(drawn).toHaveLength(2) // 先法线后粗糙度
    const normal = drawn[0].data
    let minR = 255
    let maxR = 0
    let sumB = 0
    let bad = 0 // 逐像素断言太慢，聚合成违规计数一次断言
    for (let i = 0; i < normal.length; i += 4) {
      minR = Math.min(minR, normal[i])
      maxR = Math.max(maxR, normal[i])
      if (normal[i + 2] <= 90 || normal[i + 3] !== 255) bad++ // nz 恒为正：切线空间法线不是垃圾数据
      sumB += normal[i + 2]
    }
    expect(bad).toBe(0)
    expect(sumB / (normal.length / 4)).toBeGreaterThan(200) // 大面积平坦，坑只是点缀
    expect(minR).toBeLessThan(120) // 坑的两侧梯度符号相反，
    expect(maxR).toBeGreaterThan(136) // 红通道必须双向偏离 128

    const rough = drawn[1].data
    let roughBad = 0
    for (let i = 0; i < rough.length; i += 4) {
      if (rough[i] < 224) roughBad++ // 基面抛光 ≤10%，坑内拉回 1
    }
    expect(roughBad).toBe(0)
  })

  it('纵沟法线图沿 u 方向起伏、沿沟槽方向连续', () => {
    const { doc, drawn } = fakeDom()
    vi.stubGlobal('document', doc)
    striateMaps(7, 1.8) // 独占参数
    expect(drawn).toHaveLength(2)
    const { data, width } = drawn[0]
    // 任取一行：红通道（u 向梯度）必须有双向摆动 —— 沟槽存在的直接证据
    const row = 64
    let minR = 255
    let maxR = 0
    for (let x = 0; x < width; x++) {
      const r = data[(row * width + x) * 4]
      minR = Math.min(minR, r)
      maxR = Math.max(maxR, r)
    }
    expect(minR).toBeLessThan(118)
    expect(maxR).toBeGreaterThan(138)
  })

  it('共享贴图不随材质 dispose 走：LRU 逐出材质后缓存里仍是同一份', () => {
    const { doc } = fakeDom()
    vi.stubGlobal('document', doc)
    const m = chitin({ color: '#333' })
    const tex = m.roughnessMap
    expect(tex).toBeTruthy()
    m.dispose() // registry.ts 的 LRU 逐出正是这么做的；three 不会连带 dispose 贴图
    const again = chitin({ color: '#555' })
    expect(again.roughnessMap).toBe(tex) // 同一份共享缓存，这是设计不是漏
  })

  it('守卫先于缓存：回到无 document 的 node 后照样返回 null，不吐缓存里的旧图', () => {
    // 前面的测试已经往缓存里放了 micro:1 等条目；unstub 后必须仍然拿到 null
    vi.unstubAllGlobals()
    expect(microRoughnessMap()).toBeNull()
    expect(punctateMaps()).toBeNull()
    expect(striateMaps()).toBeNull()
  })
})
