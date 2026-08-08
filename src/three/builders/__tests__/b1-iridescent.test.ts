/**
 * B 轮·虹彩组验证：本文件独占的 6 个物种（jewel-beetle / tiger-beetle /
 * flower-chafer / leaf-beetle / whirligig-beetle / rove-beetle）鞘翅
 * 材质都补上了 iridescence，且都遵守 kit.ts 的铁律——虹彩本身已是一层
 * 强角度高光，与清漆叠满必过曝，clearcoat 必须压到 ≤0.35。
 *
 * 断言的是渲染实际用到的材质对象（遍历 group 找 iridescence>0 的
 * MeshPhysicalMaterial），不是复述 builder 源码里的字面量——这样谁不
 * 小心又把某个物种的 clearcoat 调回 0.5+，或漏了 iridescent:true，会
 * 直接测出来。不按 mesh.name==='elytra' 查找：jewel-beetle/tiger-beetle
 * 两个手搓材质的文件没有给鞘翅 mesh 打这个名字，按 iridescence>0 筛选
 * 对全部 6 个物种都成立，也更贴近本轮真正关心的东西。
 *
 * 只新增本文件，不改任何既有测试（多 agent 并发改共享测试会互相覆盖）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildJewelBeetle } from '../jewel-beetle'
import { buildTigerBeetle } from '../tiger-beetle'
import { buildFlowerChafer } from '../flower-chafer'
import { buildLeafBeetle } from '../leaf-beetle'
import { buildWhirligigBeetle } from '../whirligig-beetle'
import { buildRoveBeetle } from '../rove-beetle'
import type { InsectModel } from '../kit'

/** 遍历 group，收集全部去重后的 MeshPhysicalMaterial（同 beetles2/4.test.ts 的手法）。 */
function collectMaterials(model: InsectModel): THREE.MeshPhysicalMaterial[] {
  const seen = new Set<THREE.Material>()
  const out: THREE.MeshPhysicalMaterial[] = []
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      const m = mat as THREE.MeshPhysicalMaterial
      if (!m || seen.has(m)) continue
      seen.add(m)
      out.push(m)
    }
  })
  return out
}

/** 找出这个物种「鞘翅虹彩材质」：本组约定每个物种恰好一份材质对象挂了
 * iridescence（左右鞘翅共享同一个材质引用），不依赖 mesh 命名。 */
function findIridescentMaterial(model: InsectModel): THREE.MeshPhysicalMaterial {
  const mats = collectMaterials(model)
  const hits = mats.filter((m) => (m.iridescence ?? 0) > 0)
  expect(
    hits.length,
    `应恰好一份材质带 iridescence，实际 ${hits.length} 份：${JSON.stringify(
      mats.map((m) => ({ color: m.color.getHexString(), iridescence: m.iridescence })),
    )}`,
  ).toBe(1)
  return hits[0]
}

/** 三个共享断言：构建不抛 + iridescence 命中期望值 + clearcoat 守住铁律上限。 */
function checkIridescentElytra(model: InsectModel, expectedIridescence: number) {
  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it(`鞘翅虹彩材质 iridescence === ${expectedIridescence}`, () => {
    const mat = findIridescentMaterial(model)
    expect(mat.iridescence).toBe(expectedIridescence)
  })

  it('鞘翅虹彩材质 clearcoat ≤ 0.35（虹彩+清漆两层角度高光叠满必过曝的铁律）', () => {
    const mat = findIridescentMaterial(model)
    expect(mat.clearcoat, `clearcoat=${mat.clearcoat} 超过铁律上限 0.35`).toBeLessThanOrEqual(0.35)
  })
}

describe('jewel-beetle 日本吉丁（本组定标，强虹彩）', () => {
  const model = buildJewelBeetle()
  checkIridescentElytra(model, 0.75)
})

describe('tiger-beetle 中华虎甲（强虹彩，红绿撞色基色不动）', () => {
  const model = buildTigerBeetle()
  checkIridescentElytra(model, 1)
})

describe('flower-chafer 白星花金龟（中虹彩铜绿底，白斑保持哑光不动）', () => {
  const model = buildFlowerChafer()
  checkIridescentElytra(model, 0.5)

  it('白斑材质不受虹彩影响（仍不带 iridescence）', () => {
    const spotMeshes: THREE.Mesh[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.name === 'white-spot') spotMeshes.push(mesh)
    })
    expect(spotMeshes.length, '找不到 white-spot 命名的 mesh').toBeGreaterThan(0)
    for (const m of spotMeshes) {
      const mat = m.material as THREE.MeshPhysicalMaterial
      expect(mat.iridescence ?? 0).toBe(0)
    }
  })
})

describe('leaf-beetle 榆蓝叶甲（中虹彩蓝绿底，叠在已有金属底色之上）', () => {
  const model = buildLeafBeetle()
  checkIridescentElytra(model, 0.5)
})

describe('whirligig-beetle 豉甲（弱虹彩黑亮，厚度域收窄到 [150,300]）', () => {
  const model = buildWhirligigBeetle()
  checkIridescentElytra(model, 0.28)

  it('iridescenceThicknessRange 收窄到 [150,300]', () => {
    const mat = findIridescentMaterial(model)
    expect(mat.iridescenceThicknessRange).toEqual([150, 300])
  })
})

describe('rove-beetle 梭毒隐翅虫（鞘翅弱蓝黑虹彩，只动鞘翅这一小截）', () => {
  const model = buildRoveBeetle()
  checkIridescentElytra(model, 0.3)
})
