/**
 * B 轮·半透与翅膜组：7 个物种（termite-soldier/firefly/lacewing/dragonfly/
 * damselfly/hoverfly/ichneumon-wasp）新增的 translucent / membrane iridescent
 * 材质选项断言。覆盖 polish-plan.md「半透组」「翅膜虹彩组」两张表。
 *
 * - 半透定标 termite-soldier：胸腹软体 transmission>0，深褐头 transmission
 *   仍为 0（头部材质不动——这是本种"全部看点"的对比，最该钉住）。
 * - firefly：发光器 transmission>0 且 emissive 保持不动；腹部其余材质不动。
 * - lacewing：翅膜虹彩 iridescence>0，翅脉（vein 命名）不受影响。
 * - 翅膜虹彩定标 dragonfly：翅膜 iridescence>0，翅痣/翅脉/机体材质全部
 *   iridescence===0（防误挂——iridescent 选项和翅脉材质定义只隔几行，
 *   最容易手滑点错变量的地方）。
 * - damselfly：同上，翅面积小仍用 kit 默认强度；用文件自带的 wingFace/
 *   wingVein 命名精确区分翅膜与翅脉，不靠几何类型猜测。
 * - hoverfly / ichneumon-wasp：翅膜虹彩极轻档（hoverfly 无法比 kit 默认
 *   强度更轻——见下方说明），产卵器（姬蜂）等其余部件不动。
 *
 * 本项目的测试文件一贯各自独立自带小工具（没有共享 test-utils 模块），
 * 这里延续同样的写法，不去改动任何既有测试文件。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildTermiteSoldier } from '../termite-soldier'
import { buildFirefly } from '../firefly'
import { buildLacewing } from '../lacewing'
import { buildDragonfly } from '../dragonfly'
import { buildDamselfly } from '../damselfly'
import { buildHoverfly } from '../hoverfly'
import { buildIchneumonWasp } from '../ichneumon-wasp'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

interface Scan {
  meshCount: number
  triangles: number
  nanMeshNames: string[]
}

/** 遍历模型的所有 mesh：逐个 geometry 查 position 里的 NaN/Infinity，并数三角面（同 flyers.test.ts 的写法）。 */
function scan(model: InsectModel): Scan {
  const result: Scan = { meshCount: 0, triangles: 0, nanMeshNames: [] }
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    result.meshCount++
    const geo = mesh.geometry as THREE.BufferGeometry
    const pos = geo.getAttribute('position')
    if (pos) {
      const arr = pos.array as ArrayLike<number>
      for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) {
          result.nanMeshNames.push(`${mesh.name || mesh.uuid} [${geo.type}]`)
          break
        }
      }
      const idx = geo.getIndex()
      result.triangles += idx ? idx.count / 3 : pos.count / 3
    }
  })
  return result
}

function meshesByName(model: InsectModel, name: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = []
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.name === name) found.push(m)
  })
  return found
}

/** 按 geometry.type 找 mesh——翅面用 kit.wingGeometry()（ExtrudeGeometry），
 * 翅脉/机体几乎全走 loft()（裸 BufferGeometry），两者类型天然不同，
 * 在没有显式命名翅面/翅脉的物种文件里（dragonfly/ichneumon-wasp）用它精确区分。 */
function meshesByGeometryType(model: InsectModel, type: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = []
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry?.type === type) found.push(m)
  })
  return found
}

function mats(meshes: THREE.Mesh[]): THREE.MeshPhysicalMaterial[] {
  return meshes.map((m) => m.material as THREE.MeshPhysicalMaterial)
}

// ---------------------------------------------------------------- 7 物种：构建健全性

describe('B 轮半透/翅膜组：7 物种构建健全性', () => {
  const builders: [string, () => InsectModel][] = [
    ['termite-soldier', buildTermiteSoldier],
    ['firefly', buildFirefly],
    ['lacewing', buildLacewing],
    ['dragonfly', buildDragonfly],
    ['damselfly', buildDamselfly],
    ['hoverfly', buildHoverfly],
    ['ichneumon-wasp', buildIchneumonWasp],
  ]

  for (const [label, build] of builders) {
    it(`${label} 构建不抛异常，几何体无 NaN，radius>0，面数在预算内`, () => {
      let model: InsectModel | undefined
      expect(() => {
        model = build()
      }, `${label} 构建抛出异常`).not.toThrow()
      expect(model!.radius, `${label} radius`).toBeGreaterThan(0)
      const s = scan(model!)
      expect(s.nanMeshNames, `${label} 含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
      expect(s.triangles, `${label} triangles=${Math.round(s.triangles)}`).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    })
  }
})

// ---------------------------------------------------------------- 半透组

describe('半透定标 termite-soldier：胸腹软体 transmission>0，头部不动', () => {
  it('thorax/abdomen（softMat）transmission>0；head（headMat）transmission===0', () => {
    const model = buildTermiteSoldier()
    const soft = [...meshesByName(model, 'thorax'), ...meshesByName(model, 'abdomen')]
    expect(soft.length, '找不到 thorax/abdomen 命名的软体 mesh').toBeGreaterThan(0)
    for (const m of mats(soft)) {
      expect(m.transmission, `softMat transmission=${m.transmission}`).toBeGreaterThan(0)
    }
    const head = meshesByName(model, 'head')
    expect(head.length, '找不到 head 命名的 mesh').toBeGreaterThan(0)
    for (const m of mats(head)) {
      expect(m.transmission, `head 材质不该被这次改动动到——transmission=${m.transmission}`).toBe(0)
    }
  })
})

describe('firefly：发光器 transmission>0 且 emissive 保持不动；腹部其余材质不动', () => {
  it('lantern（lanternMat）transmission>0，emissive 仍然点亮', () => {
    const model = buildFirefly()
    const lanterns = meshesByName(model, 'lantern')
    expect(lanterns.length, '找不到 lantern 命名的 mesh').toBeGreaterThan(0)
    for (const m of mats(lanterns)) {
      expect(m.transmission, `lanternMat transmission=${m.transmission}`).toBeGreaterThan(0)
      expect(m.emissiveIntensity, 'emissiveIntensity 不该被这次改动动到').toBeGreaterThan(1)
      expect(m.emissive.getHexString(), 'emissive 颜色不该被这次改动动到').not.toBe('000000')
    }
  })

  it('abdomen-body（bodyMat）transmission===0——腹部其余部分不动', () => {
    const model = buildFirefly()
    const body = meshesByName(model, 'abdomen-body')
    expect(body.length, '找不到 abdomen-body 命名的 mesh').toBeGreaterThan(0)
    for (const m of mats(body)) {
      expect(m.transmission, `bodyMat 不该被这次改动动到——transmission=${m.transmission}`).toBe(0)
    }
  })
})

describe('lacewing：腹部轻半透，翅膜虹彩', () => {
  it('翅膜（ExtrudeGeometry）材质 iridescence>0；vein 命名的翅脉材质 iridescence===0（防误挂）', () => {
    const model = buildLacewing()
    const face = meshesByGeometryType(model, 'ExtrudeGeometry')
    expect(face.length, '找不到翅膜 ExtrudeGeometry mesh').toBeGreaterThan(0)
    for (const m of mats(face)) {
      expect(m.iridescence, `wingFaceMat iridescence=${m.iridescence}`).toBeGreaterThan(0)
    }
    const veins = meshesByName(model, 'vein')
    expect(veins.length, '找不到 vein 命名的翅脉 mesh').toBeGreaterThan(0)
    for (const m of mats(veins)) {
      expect(m.iridescence, `veinMat 不该被误挂——iridescence=${m.iridescence}`).toBe(0)
    }
  })
})

// ---------------------------------------------------------------- 翅膜虹彩组

describe('翅膜虹彩定标 dragonfly：翅膜 iridescence>0，翅痣/翅脉/机体材质===0（防误挂）', () => {
  it('ExtrudeGeometry（翅膜）iridescence>0；其余全部 mesh（含翅痣/翅脉/机体）iridescence===0', () => {
    const model = buildDragonfly()
    const face = meshesByGeometryType(model, 'ExtrudeGeometry')
    expect(face.length, '找不到翅膜 ExtrudeGeometry mesh').toBeGreaterThan(0)
    for (const m of mats(face)) {
      expect(m.iridescence, `wingFaceMat iridescence=${m.iridescence}`).toBeGreaterThan(0)
    }

    const all: THREE.Mesh[] = []
    model.group.traverse((o) => {
      const mm = o as THREE.Mesh
      if (mm.isMesh) all.push(mm)
    })
    const others = all.filter((m) => m.geometry.type !== 'ExtrudeGeometry')
    expect(others.length, '找不到翅膜以外的 mesh（翅痣/翅脉/机体等）').toBeGreaterThan(0)
    for (const m of others) {
      const mat = m.material as THREE.MeshPhysicalMaterial
      expect(
        mat.iridescence,
        `翅膜以外材质不该有虹彩——mesh geometry=${m.geometry.type} iridescence=${mat.iridescence}`,
      ).toBe(0)
    }
  })
})

describe('damselfly：wingFace 材质 iridescence>0，wingVein 材质 iridescence===0（防误挂）', () => {
  it('翅面积小仍用 kit 默认强度；文件自带 wingFace/wingVein 命名精确区分翅膜与翅脉', () => {
    const model = buildDamselfly()
    const face = meshesByName(model, 'wingFace')
    const vein = meshesByName(model, 'wingVein')
    expect(face.length, '找不到 wingFace 命名的翅膜 mesh').toBeGreaterThan(0)
    expect(vein.length, '找不到 wingVein 命名的翅脉 mesh').toBeGreaterThan(0)
    for (const m of mats(face)) {
      expect(m.iridescence, `wingFaceMat iridescence=${m.iridescence}`).toBeGreaterThan(0)
    }
    for (const m of mats(vein)) {
      expect(m.iridescence, `veinMat 不该被误挂——iridescence=${m.iridescence}`).toBe(0)
    }
  })
})

describe('hoverfly：翅膜虹彩极轻档', () => {
  it('wing-membrane 命名 mesh 材质 iridescence>0', () => {
    // 极轻档的"极轻"由 kit.MEMBRANE_IRIDESCENCE 常量统一控制，kit.ts 只读、
    // MembraneOptions 也没有暴露强度参数，本文件只能验证"开了"而非"比默认更轻"
    // ——若目视比预期显闹，需要回 kit.ts 加一个强度参数，这里先记下这个局限。
    const model = buildHoverfly()
    const wm = meshesByName(model, 'wing-membrane')
    expect(wm.length, '找不到 wing-membrane 命名的翅膜 mesh').toBeGreaterThan(0)
    for (const m of mats(wm)) {
      expect(m.iridescence, `wingFaceMat iridescence=${m.iridescence}`).toBeGreaterThan(0)
    }
  })
})

describe('ichneumon-wasp：翅膜虹彩，产卵器不动', () => {
  it('ExtrudeGeometry（翅膜）材质 iridescence>0；ovipositor-strand 材质 iridescence===0', () => {
    const model = buildIchneumonWasp()
    const face = meshesByGeometryType(model, 'ExtrudeGeometry')
    expect(face.length, '找不到翅膜 ExtrudeGeometry mesh').toBeGreaterThan(0)
    for (const m of mats(face)) {
      expect(m.iridescence, `wingFaceMat iridescence=${m.iridescence}`).toBeGreaterThan(0)
    }
    const strands = meshesByName(model, 'ovipositor-strand')
    expect(strands.length, 'ovipositor-strand mesh 数应恰好 3').toBe(3)
    for (const m of mats(strands)) {
      expect(m.iridescence, `产卵器材质不该被这次改动动到——iridescence=${m.iridescence}`).toBe(0)
    }
  })
})
