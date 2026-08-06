/**
 * 验证本批三个"爬行/伏击型"物种（螳螂、瓢虫、蚂蚁）的 builder：
 * - 能正常构建，不抛异常
 * - 所有几何体顶点无 NaN（loft 最容易在路径点重合/半径为 0 时产生 NaN）
 * - 包围球半径 > 0，且包围盒长宽高比例符合物种的体型特征
 * - anchors 覆盖题目要求的全部 key，且坐标本身无 NaN
 * - 全物种三角面数落在 15 万预算内（打印出来）
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildAnt } from '../ant'
import { buildLadybird } from '../ladybird'
import { buildMantis } from '../mantis'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

/** 遍历 group 里的所有 Mesh，检查几何体 position 属性是否含 NaN，并统计三角面数 */
function inspectGeometry(group: THREE.Group): { nanFound: string[]; triangles: number } {
  const nanFound: string[] = []
  let triangles = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      if (Number.isNaN(pos.getX(i)) || Number.isNaN(pos.getY(i)) || Number.isNaN(pos.getZ(i))) {
        nanFound.push(`${mesh.name || mesh.type}#${i}`)
        break // 一个 mesh 只需报一次
      }
    }
    triangles += geo.index ? geo.index.count / 3 : pos.count / 3
  })
  return { nanFound, triangles }
}

function checkAnchors(model: InsectModel, requiredKeys: string[]) {
  for (const key of requiredKeys) {
    expect(model.anchors, `缺少 anchor: ${key}`).toHaveProperty(key)
    const v = model.anchors[key]
    expect(v, `anchor ${key} 应为 Vector3`).toBeInstanceOf(THREE.Vector3)
    expect(Number.isNaN(v.x) || Number.isNaN(v.y) || Number.isNaN(v.z), `anchor ${key} 坐标含 NaN: ${v.toArray()}`).toBe(false)
  }
}

function boundingBoxSize(group: THREE.Group): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(group)
  const size = new THREE.Vector3()
  box.getSize(size)
  return size
}

describe('螳螂 buildMantis', () => {
  const model = buildMantis()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
  })

  it('包围球半径 > 0', () => {
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('包围盒体型应细长（体长方向明显大于另外两个方向）', () => {
    const size = boundingBoxSize(model.group)
    const longest = Math.max(size.x, size.y, size.z)
    const others = [size.x, size.y, size.z].filter((v) => v !== longest)
    for (const o of others) {
      expect(longest / o, `螳螂体型不够细长: size=${size.toArray()}`).toBeGreaterThan(1.8)
    }
  })

  it('anchors 覆盖 raptorialLeg/head/eye/wing/abdomen/prothorax，且无 NaN', () => {
    checkAnchors(model, ['raptorialLeg', 'head', 'eye', 'wing', 'abdomen', 'prothorax'])
  })

  // 下面三条是 2026-08 姿态修复补的回归断言：旧版身体整条趴平
  // （包围盒 10.5 × 2.2 × 6.6，高度只有长度的约 0.21 倍），螳螂标志性的
  // "立起来"体态完全看不出来。自检：把 size.y 换回旧版的约 2.23、
  // 把 head/abdomen 锚点换回旧版的 0.31/0.01，这三条会全部失败。
  it('身体立起来：包围盒高度显著大于旧版趴平姿态（≥ 长度的 0.35 倍）', () => {
    const size = boundingBoxSize(model.group)
    expect(size.y, `螳螂应立起、而非趴平：size=${size.toArray()}`).toBeGreaterThanOrEqual(size.x * 0.35)
  })

  it('前高后低：头部锚点的 y 明显高于腹部锚点', () => {
    const size = boundingBoxSize(model.group)
    expect(
      model.anchors.head.y,
      `head.y=${model.anchors.head.y} 应明显高于 abdomen.y=${model.anchors.abdomen.y}`,
    ).toBeGreaterThan(model.anchors.abdomen.y + size.x * 0.15)
  })

  it('捕捉足折叠在身体前部（靠近头部一侧），而非悬在中段', () => {
    const box = new THREE.Box3().setFromObject(model.group)
    const frontThreshold = box.min.x + (box.max.x - box.min.x) * 0.6
    expect(
      model.anchors.raptorialLeg.x,
      `raptorialLeg.x=${model.anchors.raptorialLeg.x} 应位于身体前 40% 区域（阈值 ${frontThreshold}）`,
    ).toBeGreaterThan(frontThreshold)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[mantis] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('七星瓢虫 buildLadybird', () => {
  const model = buildLadybird()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
  })

  it('包围球半径 > 0', () => {
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('包围盒体型应接近等比的圆润体（三轴尺寸相差不大）', () => {
    const size = boundingBoxSize(model.group)
    const longest = Math.max(size.x, size.y, size.z)
    const shortest = Math.min(size.x, size.y, size.z)
    expect(longest / shortest, `瓢虫体型不够圆润: size=${size.toArray()}`).toBeLessThan(2.2)
  })

  it('anchors 覆盖 elytra/spot/head/leg/antenna/pronotum，且无 NaN', () => {
    checkAnchors(model, ['elytra', 'spot', 'head', 'leg', 'antenna', 'pronotum'])
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[ladybird] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('日本弓背蚁 buildAnt', () => {
  const model = buildAnt()

  it('成功构建且无异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
  })

  it('包围球半径 > 0', () => {
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const { nanFound } = inspectGeometry(model.group)
    expect(nanFound, `发现 NaN 顶点: ${nanFound.join(', ')}`).toEqual([])
  })

  it('包围盒体型应呈三段式的细长体（长度方向明显大于宽高）', () => {
    const size = boundingBoxSize(model.group)
    const longest = Math.max(size.x, size.y, size.z)
    const others = [size.x, size.y, size.z].filter((v) => v !== longest)
    for (const o of others) {
      expect(longest / o, `蚂蚁体型不够细长: size=${size.toArray()}`).toBeGreaterThan(1.3)
    }
  })

  it('anchors 覆盖 mandible/petiole/gaster/antenna/eye/leg，且无 NaN', () => {
    checkAnchors(model, ['mandible', 'petiole', 'gaster', 'antenna', 'eye', 'leg'])
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[ant] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
