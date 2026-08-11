/**
 * 星天牛 / 竹节虫两个 builder 的结构性验证。
 *
 * 这里不检查"好不好看"（那要靠人眼在场景里看），只检查几件
 * 建模最容易踩坑、且能用代码自动判断的事：
 * - 构建不抛异常、几何体没有 NaN 顶点（loft 最容易出这种 bug）
 * - 半径恒正、锚点齐全且坐标有限
 * - 两个物种各自的"标志性比例"确实做出来了
 *   （竹节虫要细长、天牛触角要长过身体）
 * - 构建具有确定性（没有偷用 Math.random）
 * - 总面数在预算内
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildLonghornBeetle } from '../longhorn-beetle'
import { buildStickInsect } from '../stick-insect'
import type { InsectModel } from '../kit'

const TRI_BUDGET = 150_000

function countTriangles(model: InsectModel): number {
  let tris = 0
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry
    if (geo.index) tris += geo.index.count / 3
    else tris += geo.getAttribute('position').count / 3
  })
  return tris
}

function assertNoNaNGeometry(model: InsectModel): void {
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const pos = mesh.geometry.getAttribute('position')
    expect(pos).toBeTruthy()
    for (let i = 0; i < pos.count; i++) {
      expect(Number.isFinite(pos.getX(i))).toBe(true)
      expect(Number.isFinite(pos.getY(i))).toBe(true)
      expect(Number.isFinite(pos.getZ(i))).toBe(true)
    }
  })
}

function boundingBoxSize(model: InsectModel): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(model.group)
  const size = new THREE.Vector3()
  box.getSize(size)
  return size
}

describe('buildLonghornBeetle (星天牛)', () => {
  it('构建不抛异常，radius > 0', () => {
    const model = buildLonghornBeetle()
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体的顶点坐标都是有限数（无 NaN/Infinity）', () => {
    const model = buildLonghornBeetle()
    assertNoNaNGeometry(model)
  })

  it('触角明显比躯干长——整体包围盒的 X 或 Z 跨度要显著大于单纯体长', () => {
    const model = buildLonghornBeetle()
    const size = boundingBoxSize(model)
    // 体长本身约 3.5~3.7cm；触角向后外侧甩出一大截后，
    // 整体包围盒的最长水平跨度应明显超出体长本身，
    // 留足安全边际，只要求 > 5cm（体长的 ~1.35 倍以上）。
    const horizontalSpan = Math.max(size.x, size.z)
    expect(horizontalSpan).toBeGreaterThan(5)
  })

  it('anchors 齐全且坐标有限', () => {
    const model = buildLonghornBeetle()
    const required = ['antenna', 'elytra', 'mandible', 'eye', 'pronotum', 'leg']
    for (const key of required) {
      expect(model.anchors[key]).toBeTruthy()
      const p = model.anchors[key]
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
      expect(Number.isFinite(p.z)).toBe(true)
    }
  })

  it('构建两次结果一致（未使用 Math.random）', () => {
    const a = buildLonghornBeetle()
    const b = buildLonghornBeetle()
    expect(b.radius).toBe(a.radius)
  })

  it('总三角面数在预算内', () => {
    const model = buildLonghornBeetle()
    const tris = countTriangles(model)
    // eslint-disable-next-line no-console
    console.log(`[longhorn-beetle] triangles = ${tris}`)
    expect(tris).toBeLessThanOrEqual(TRI_BUDGET)
  })
})

describe('buildStickInsect (棒䗛)', () => {
  it('构建不抛异常，radius > 0', () => {
    const model = buildStickInsect()
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体的顶点坐标都是有限数（无 NaN/Infinity）', () => {
    const model = buildStickInsect()
    assertNoNaNGeometry(model)
  })

  it('包围盒极度细长：最长边 / 次长边 > 3', () => {
    const model = buildStickInsect()
    const size = boundingBoxSize(model)
    const dims = [size.x, size.y, size.z].sort((a, b) => b - a)
    const ratio = dims[0] / dims[1]
    // eslint-disable-next-line no-console
    console.log(`[stick-insect] bbox = ${dims.map((d) => d.toFixed(3)).join(' x ')}, longest/second = ${ratio.toFixed(2)}`)
    expect(ratio).toBeGreaterThan(3)
  })

  it('体径不再是一根发丝：体径/体长落在 25:1~35:1 对应的 1/35~1/22 区间内', () => {
    // 2026-08 修复：旧版 R_THORAX=0.115（最粗处直径约 0.23cm）对约
    // 10cm 体长已到 ~43:1，正常取景距离下几乎看不见。这里直接量取
    // 'trunk-segment'（11 节躯干）+ 'head-capsule'（头部）的真实合并
    // 包围盒——只包含身体本身，不含腿/触角——防止有人把身体改回细丝
    // 又用加粗的腿把包围盒撑大来蒙混过关。
    const model = buildStickInsect()
    const box = new THREE.Box3()
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && (mesh.name === 'trunk-segment' || mesh.name === 'head-capsule')) {
        box.union(new THREE.Box3().setFromObject(mesh))
      }
    })
    expect(box.isEmpty(), '找不到 trunk-segment/head-capsule 命名的 mesh').toBe(false)

    const size = new THREE.Vector3()
    box.getSize(size)
    const length = size.x
    const diameter = (size.y + size.z) / 2
    const ratio = diameter / length
    // eslint-disable-next-line no-console
    console.log(`[stick-insect] body-only length=${length.toFixed(3)} diameter=${diameter.toFixed(3)} length/diameter=${(length / diameter).toFixed(1)}`)
    expect(ratio).toBeGreaterThan(1 / 35)
    expect(ratio).toBeLessThan(1 / 22)
  })

  it('anchors 齐全且坐标有限', () => {
    const model = buildStickInsect()
    const required = ['body', 'leg', 'antenna', 'head', 'thorax', 'camouflage']
    for (const key of required) {
      expect(model.anchors[key]).toBeTruthy()
      const p = model.anchors[key]
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
      expect(Number.isFinite(p.z)).toBe(true)
    }
  })

  it('构建两次结果一致（未使用 Math.random）', () => {
    const a = buildStickInsect()
    const b = buildStickInsect()
    expect(b.radius).toBe(a.radius)
  })

  it('总三角面数在预算内', () => {
    const model = buildStickInsect()
    const tris = countTriangles(model)
    // eslint-disable-next-line no-console
    console.log(`[stick-insect] triangles = ${tris}`)
    expect(tris).toBeLessThanOrEqual(TRI_BUDGET)
  })
})
