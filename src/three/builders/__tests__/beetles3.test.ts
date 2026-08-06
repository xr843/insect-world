/**
 * 验证本批三个新物种的 builder（神农洁蜣螂、竹象、沟叩头虫）：
 * - 能正常构建，不抛异常；所有几何体顶点无 NaN/Infinity
 * - 包围球半径 > 0；anchors 恰好是题目要求的 key 集合，且坐标有限
 * - 总三角面数落在 15 万预算内（打印出来）
 * - 各物种的招牌形态特征——用命名 mesh 的并集包围盒/计数量取真实
 *   渲染出来的尺寸（同 beetles2.test.ts 的手法），而不是复述 builder
 *   里的数字，这样删掉/削弱那个形态特征时断言真的会失败。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildDungBeetle } from '../dung-beetle'
import { buildWeevil } from '../weevil'
import { buildClickBeetle } from '../click-beetle'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

function inspectGeometry(group: THREE.Group): { nanFound: string[]; triangles: number } {
  const nanFound: string[] = []
  let triangles = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const geo = mesh.geometry
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) {
        nanFound.push(`${mesh.name || mesh.type}#${i}`)
        break // 一个 mesh 只需报一次
      }
    }
    triangles += geo.index ? geo.index.count / 3 : pos.count / 3
  })
  return { nanFound, triangles }
}

/** anchors 必须恰好是 requiredKeys 这个 key 集合（不多不少），且坐标有限 */
function checkAnchorsExact(model: InsectModel, requiredKeys: string[]) {
  const actualKeys = Object.keys(model.anchors).sort()
  const expectedKeys = [...requiredKeys].sort()
  expect(actualKeys, `anchors key 集合应恰好是 [${expectedKeys.join(', ')}]，实际是 [${actualKeys.join(', ')}]`).toEqual(expectedKeys)
  for (const key of requiredKeys) {
    const v = model.anchors[key]
    expect(v, `anchor ${key} 应为 Vector3`).toBeInstanceOf(THREE.Vector3)
    expect(
      Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z),
      `anchor ${key} 坐标含 NaN/Infinity: ${v.toArray()}`,
    ).toBe(true)
  }
}

/** 按 mesh.name 收集并集包围盒——量的是真实渲染几何体，不是 builder 里的常量 */
function unionBoxByName(group: THREE.Group, name: string): THREE.Box3 {
  const box = new THREE.Box3()
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

/** 按 mesh.name 计数——用于「至少 N 枚齿突」这类形态断言 */
function countMeshesByName(group: THREE.Group, name: string): number {
  let count = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) count++
  })
  return count
}

describe('神农洁蜣螂 buildDungBeetle', () => {
  const model = buildDungBeetle()

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

  it('anchors 恰好是 clypeus/foreleg/elytra/horn/eye/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['clypeus', 'foreleg', 'elytra', 'horn', 'eye', 'pronotum'])
  })

  it('唇基（铲）的 Z 向宽度 ≥ 头部其余部分宽度（证明铲真的比头更宽）', () => {
    const clypeusBox = unionBoxByName(model.group, 'clypeus')
    const headBox = unionBoxByName(model.group, 'head')
    expect(clypeusBox.isEmpty(), '找不到 clypeus 命名的 mesh').toBe(false)
    expect(headBox.isEmpty(), '找不到 head 命名的 mesh').toBe(false)

    const clypeusSize = new THREE.Vector3()
    clypeusBox.getSize(clypeusSize)
    const headSize = new THREE.Vector3()
    headBox.getSize(headSize)

    // eslint-disable-next-line no-console
    console.log(`[dung-beetle] clypeusWidthZ=${clypeusSize.z.toFixed(3)} headWidthZ=${headSize.z.toFixed(3)}`)
    expect(
      clypeusSize.z,
      `唇基 Z 宽 ${clypeusSize.z.toFixed(3)} 应 ≥ 头部 Z 宽 ${headSize.z.toFixed(3)}`,
    ).toBeGreaterThanOrEqual(headSize.z)
  })

  it('前足胫节上的齿突 mesh 数 ≥ 3', () => {
    const count = countMeshesByName(model.group, 'foreleg-tooth')
    // eslint-disable-next-line no-console
    console.log(`[dung-beetle] foreleg-tooth count=${count}`)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[dung-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('竹象 buildWeevil', () => {
  const model = buildWeevil()

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

  it('anchors 恰好是 rostrum/antenna/elytra/eye/leg/pronotum，且无 NaN', () => {
    checkAnchorsExact(model, ['rostrum', 'antenna', 'elytra', 'eye', 'leg', 'pronotum'])
  })

  it('喙的 X 向跨度 ≥ 躯干长度的 0.25（证明喙真的很长）', () => {
    const rostrumBox = unionBoxByName(model.group, 'rostrum')
    const trunkBox = unionBoxByName(model.group, 'trunk')
    expect(rostrumBox.isEmpty(), '找不到 rostrum 命名的 mesh').toBe(false)
    expect(trunkBox.isEmpty(), '找不到 trunk 命名的 mesh').toBe(false)

    const rostrumSize = new THREE.Vector3()
    rostrumBox.getSize(rostrumSize)
    const trunkSize = new THREE.Vector3()
    trunkBox.getSize(trunkSize)

    // eslint-disable-next-line no-console
    console.log(
      `[weevil] rostrumSpanX=${rostrumSize.x.toFixed(3)} trunkLenX=${trunkSize.x.toFixed(3)} ratio=${(rostrumSize.x / trunkSize.x).toFixed(2)}`,
    )
    expect(
      rostrumSize.x,
      `喙 X 跨度 ${rostrumSize.x.toFixed(3)} 应 ≥ 躯干长度 ${trunkSize.x.toFixed(3)} 的 0.25 倍`,
    ).toBeGreaterThanOrEqual(trunkSize.x * 0.25)
  })

  it('触角基部的 X 坐标落在喙的范围内，而非头部（证明触角长在喙上）', () => {
    const antennaBox = unionBoxByName(model.group, 'antenna')
    const rostrumBox = unionBoxByName(model.group, 'rostrum')
    const trunkBox = unionBoxByName(model.group, 'trunk')
    expect(antennaBox.isEmpty(), '找不到 antenna 命名的 mesh').toBe(false)
    expect(rostrumBox.isEmpty(), '找不到 rostrum 命名的 mesh').toBe(false)

    // 触角基部＝触角网格里 X 最小的一端（触角从基部单调向 +X/末梢伸展）
    const antennaBaseX = antennaBox.min.x

    // eslint-disable-next-line no-console
    console.log(
      `[weevil] antennaBaseX=${antennaBaseX.toFixed(3)} rostrumRange=[${rostrumBox.min.x.toFixed(3)}, ${rostrumBox.max.x.toFixed(3)}] trunkRange=[${trunkBox.min.x.toFixed(3)}, ${trunkBox.max.x.toFixed(3)}]`,
    )
    expect(
      antennaBaseX,
      `触角基部 x=${antennaBaseX.toFixed(3)} 应落在喙范围 [${rostrumBox.min.x.toFixed(3)}, ${rostrumBox.max.x.toFixed(3)}] 内`,
    ).toBeGreaterThanOrEqual(rostrumBox.min.x)
    expect(antennaBaseX).toBeLessThanOrEqual(rostrumBox.max.x)
    // 而非落在头部/躯干范围内——头部是 trunk 的一部分，trunk 与 rostrum
    // 只在头部前端一点相接，触角基部不应落进 trunk 的躯干主体区间
    expect(
      antennaBaseX,
      `触角基部 x=${antennaBaseX.toFixed(3)} 不应落在头部（trunk）范围 [${trunkBox.min.x.toFixed(3)}, ${trunkBox.max.x.toFixed(3)}] 内`,
    ).toBeGreaterThan(trunkBox.max.x)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[weevil] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})

describe('沟叩头虫 buildClickBeetle', () => {
  const model = buildClickBeetle()

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

  it('anchors 恰好是 pronotum/clickSpine/elytra/antenna/eye/leg，且无 NaN', () => {
    checkAnchorsExact(model, ['pronotum', 'clickSpine', 'elytra', 'antenna', 'eye', 'leg'])
  })

  it('整体包围盒长宽比 ≥ 2.5（细长舟形）', () => {
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)
    const ratio = size.x / size.z
    // eslint-disable-next-line no-console
    console.log(`[click-beetle] lengthX=${size.x.toFixed(3)} widthZ=${size.z.toFixed(3)} ratio=${ratio.toFixed(2)}`)
    expect(ratio, `长宽比 ${ratio.toFixed(2)} 应 ≥ 2.5`).toBeGreaterThanOrEqual(2.5)
  })

  it('前胸后角刺突的最后端 X 坐标 < 鞘翅基部 X 坐标（证明刺突真的向后超出鞘翅基部）', () => {
    const spineBox = unionBoxByName(model.group, 'pronotum-spine')
    const elytraBox = unionBoxByName(model.group, 'elytra')
    expect(spineBox.isEmpty(), '找不到 pronotum-spine 命名的 mesh').toBe(false)
    expect(elytraBox.isEmpty(), '找不到 elytra 命名的 mesh').toBe(false)

    const spineTipX = spineBox.min.x // 刺突向后（−X）伸出，最后端是 min.x
    const elytraBaseX = elytraBox.max.x // 鞘翅基部（前缘）是 max.x

    // eslint-disable-next-line no-console
    console.log(`[click-beetle] spineTipX=${spineTipX.toFixed(3)} elytraBaseX=${elytraBaseX.toFixed(3)}`)
    expect(
      spineTipX,
      `刺突最后端 x=${spineTipX.toFixed(3)} 应 < 鞘翅基部 x=${elytraBaseX.toFixed(3)}`,
    ).toBeLessThan(elytraBaseX)
  })

  it('三角面数在预算内', () => {
    const { triangles } = inspectGeometry(model.group)
    // eslint-disable-next-line no-console
    console.log(`[click-beetle] triangles = ${Math.round(triangles)}`)
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })
})
