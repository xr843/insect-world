/**
 * 复眼小眼面材质模块的测试。
 *
 * 关键约束：vitest 跑在 node，没有 canvas 2d。facetNormalMap() 必须在这种
 * 环境下老老实实返回 null 而不是抛错，facetedEyeMaterial() 必须在拿到 null
 * 贴图时仍然产出一个合法材质——这两条是全项目其它测试不炸的前提，本文件
 * 第一组测试专门钉住它们。
 *
 * facetHeightField() 是纯数值实现（不摸 canvas），额外单独测——它是
 * facetNormalMap() 实际画出蜂窝形状的核心算法，node 下虽然看不到贴图本身，
 * 但至少能确认这套「三角格 Voronoi = 正六边形」的数学没有算出 NaN、
 * 且中心凸起/棱线凹陷的方向是对的。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { facetedEyeMaterial, facetHeightField, facetNormalMap } from '../eyes'

describe('facetNormalMap（node 环境守卫）', () => {
  it('默认参数调用时返回 null，不抛错', () => {
    expect(() => facetNormalMap()).not.toThrow()
    expect(facetNormalMap()).toBeNull()
  })

  it('显式传 cells 时也返回 null，不抛错', () => {
    for (const cells of [1, 6, 24, 48, 100]) {
      expect(() => facetNormalMap(cells)).not.toThrow()
      expect(facetNormalMap(cells)).toBeNull()
    }
  })
})

describe('facetHeightField（纯数值蜂窝高度场，不依赖 canvas）', () => {
  it('输出长度等于 width×height，且全部是有限数', () => {
    const w = 48
    const h = 48
    const field = facetHeightField(w, h, 6)
    expect(field.length).toBe(w * h)
    for (let i = 0; i < field.length; i++) {
      expect(Number.isFinite(field[i]), `第 ${i} 个高度值不是有限数：${field[i]}`).toBe(true)
    }
  })

  it('小眼面中心明显凸起（存在接近 1 的正峰值），格间棱线明显凹陷（存在负值）', () => {
    const field = facetHeightField(64, 64, 8)
    let max = -Infinity
    let min = Infinity
    for (const v of field) {
      if (v > max) max = v
      if (v < min) min = v
    }
    expect(max, '应存在明显凸起的小眼面中心').toBeGreaterThan(0.5)
    expect(min, '应存在明显凹陷的格间细缝').toBeLessThan(0)
  })

  it('cells 至少 clamp 到 3，不会因为传 0/负数产生退化网格或 NaN', () => {
    for (const cells of [0, -5, 1.6]) {
      const field = facetHeightField(32, 32, cells)
      expect(field.length).toBe(32 * 32)
      for (const v of field) expect(Number.isFinite(v)).toBe(true)
    }
  })
})

describe('facetedEyeMaterial', () => {
  it('无贴图（node 环境）时仍返回合法的 MeshPhysicalMaterial，不抛错', () => {
    let m: THREE.MeshPhysicalMaterial | undefined
    expect(() => {
      m = facetedEyeMaterial('#2b2320')
    }).not.toThrow()
    expect(m).toBeInstanceOf(THREE.MeshPhysicalMaterial)
    expect(m!.normalMap).toBeFalsy()
  })

  it('不传 opts 也能调用（全部走默认值）', () => {
    expect(() => facetedEyeMaterial('#333333')).not.toThrow()
  })

  it('默认（wet）清漆层明显：clearcoat > 0.8', () => {
    const m = facetedEyeMaterial('#402a1c')
    expect(m.clearcoat).toBeGreaterThan(0.8)
  })

  it('wet:false 时清漆层明显收敛，比默认低出一大截', () => {
    const wet = facetedEyeMaterial('#402a1c', { wet: true })
    const dry = facetedEyeMaterial('#402a1c', { wet: false })
    expect(dry.clearcoat).toBeLessThan(wet.clearcoat - 0.5)
    expect(dry.clearcoatRoughness).toBeGreaterThan(wet.clearcoatRoughness)
  })

  it('基色确实被压深：材质色的 HSL 亮度低于传入色', () => {
    const input = '#5a7a4a' // 选一个远离黑/白极值的中间色，避免亮度被 clamp 到 0 掩盖压深幅度
    const inputHsl = { h: 0, s: 0, l: 0 }
    new THREE.Color(input).getHSL(inputHsl)

    const m = facetedEyeMaterial(input)
    const materialHsl = { h: 0, s: 0, l: 0 }
    m.color.getHSL(materialHsl)

    expect(materialHsl.l).toBeLessThan(inputHsl.l - 0.05)
  })

  it('roughness/metalness 贴着 kit.compoundEye() 的观感，量级一致不跑风格', () => {
    const m = facetedEyeMaterial('#2b2320')
    // kit.ts compoundEye() 用的是 roughness 0.12 / metalness 0.1；
    // 这里只钉住同一数量级，不钉死具体小数，避免过度耦合实现细节。
    expect(m.roughness).toBeGreaterThan(0.05)
    expect(m.roughness).toBeLessThan(0.3)
    expect(m.metalness).toBeGreaterThan(0)
    expect(m.metalness).toBeLessThan(0.3)
  })

  it('cells 参数被透传，不同取值都能正常构建材质', () => {
    for (const cells of [6, 24, 60]) {
      expect(() => facetedEyeMaterial('#2b2320', { cells })).not.toThrow()
    }
  })
})
