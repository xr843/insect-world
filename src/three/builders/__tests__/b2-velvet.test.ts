/**
 * B 轮打磨·绒面组：9 个物种的 surface:'velvet'（或 dung-beetle 的 'punctate'
 * 低配变体）落地验证。只测本轮新加的东西，不复述各物种既有的形态/anchor
 * 测试（那些在别的 __tests__ 文件里）。
 *
 * 材质拿不到具名导出（builder 内部 const，不对外暴露），因此统一走
 * 「traverse 收集 group 里出现过的材质 → 按基色 hex 筛」的路子，而不是
 * 靠 mesh.name（很多物种的 head/thorax/abdomen 压根没起名字，给它们
 * 硬加名字超出了本轮「只加 surface/membrane opts」的改动范围）。
 *
 * 这条筛法在「一份材质多处复用」时依然成立、且天然验证了拆分是否正确：
 * honeybee 的 thoraxMat 是从 cuticleMat 拆出来的一份新材质，两者颜色
 * 故意留成相同的 #241a0e——如果测试量到「这个颜色下同时存在 sheen=1 和
 * sheen=0 两种实例」，就证明绒面只落在拆出来的那一份上，没有连带把
 * cuticleMat（头部/单眼仍在用）一起套上；反过来，如果哪次改动图省事直接
 * 在共享的 cuticleMat 上加了 velvet，这里就会测出「同色只剩 sheen=1，没有
 * sheen=0 的了」，从而失败。
 *
 * node（vitest）下没有 Canvas 2D，surface.ts 的贴图生成器返回 null——
 * sheen/sheenRoughness/sheenColor/iridescence 都是标量参数，不依赖贴图，
 * 可以直接断言（同 surface.test.ts 的既有做法）。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildGoliathBeetle } from '../goliath-beetle'
import { buildSilkMoth } from '../silk-moth'
import { buildHawkMoth } from '../hawk-moth'
import { buildMonarchButterfly } from '../monarch-butterfly'
import { buildSwallowtail } from '../swallowtail'
import { buildHoneybee } from '../honeybee'
import { buildHornet } from '../hornet'
import { buildMoleCricket } from '../mole-cricket'
import { buildDungBeetle } from '../dung-beetle'
import type { InsectModel } from '../kit'

/** 收集 group 里出现过的所有材质，按引用去重（同一份材质多处复用只算一次）。 */
function collectMaterials(group: THREE.Group): THREE.MeshPhysicalMaterial[] {
  const seen = new Set<THREE.Material>()
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) if (m) seen.add(m)
  })
  return [...seen] as THREE.MeshPhysicalMaterial[]
}

/** 按基色 hex（不含#，小写）筛材质——同色号下可能有多份不同实例，全部返回不去重。 */
function byColorHex(materials: THREE.MeshPhysicalMaterial[], hex: string): THREE.MeshPhysicalMaterial[] {
  return materials.filter((m) => m.color.getHexString() === hex)
}

function expectBuildOk(model: InsectModel) {
  expect(model.group).toBeInstanceOf(THREE.Group)
  expect(model.radius).toBeGreaterThan(0)
}

// ---------------------------------------------------------------- 大王花金龟（本组定标）

describe('大王花金龟 buildGoliathBeetle：前胸+鞘翅绒面，纵条对比不动', () => {
  const model = buildGoliathBeetle()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('前胸背板深色底（pronotumMat，与 bodyMat 同色 #1a1512）sheen=1，且同色号下仍有 sheen=0 的实例（belly/scutellum/head 沿用的 bodyMat 未被连带套上绒面，证明是拆开的两份材质）', () => {
    const mats = byColorHex(collectMaterials(model.group), '1a1512')
    const sheenOn = mats.filter((m) => m.sheen === 1)
    const sheenOff = mats.filter((m) => m.sheen === 0)
    expect(sheenOn.length, '应至少有一份 #1a1512 材质开了绒面（pronotumMat）').toBeGreaterThan(0)
    expect(sheenOff.length, '应仍有 #1a1512 材质保持 sheen=0（bodyMat 不该被连带套上绒面）').toBeGreaterThan(0)
  })

  it('鞘翅深色底（shellMat, #4a2415）sheen=1', () => {
    const mats = byColorHex(collectMaterials(model.group), '4a2415')
    expect(mats.length, '未找到 #4a2415 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(1)
  })

  it('白条纹材质（stripeMat）clearcoat/gloss 与改前一致，且未被顺带套上绒面', () => {
    const stripe = model.group.getObjectByName('stripe') as THREE.Mesh | null
    expect(stripe, '找不到 name="stripe" 的 mesh').toBeTruthy()
    const mat = stripe!.material as THREE.MeshPhysicalMaterial
    // 改前值：chitin({ color: '#f0e6d2', gloss: 0.5, clearcoat: 0.3 })（B轮改动前读到、写死在此）
    expect(mat.clearcoat, 'clearcoat 应仍是改前的 0.3').toBeCloseTo(0.3, 5)
    expect(mat.roughness, 'roughness 应仍对应改前 gloss=0.5（1-0.5*0.92=0.54）').toBeCloseTo(1 - 0.5 * 0.92, 5)
    expect(mat.sheen, '白条纹绝对不动，sheen 应仍为 0').toBe(0)
  })
})

// ---------------------------------------------------------------- 柞蚕蛾

describe('柞蚕蛾 buildSilkMoth：躯干+翅面底材质绒面', () => {
  const model = buildSilkMoth()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('躯干材质（bodyMat, #5c3d22）sheen=1', () => {
    const mats = byColorHex(collectMaterials(model.group), '5c3d22')
    expect(mats.length, '未找到 #5c3d22 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(1)
  })

  it('翅面底材质（wingMats.face, #b8843f）sheen=1', () => {
    const mats = byColorHex(collectMaterials(model.group), 'b8843f')
    expect(mats.length, '未找到 #b8843f 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(1)
  })
})

// ---------------------------------------------------------------- 小豆长喙天蛾

describe('小豆长喙天蛾 buildHawkMoth：躯干绒面，翅不动', () => {
  const model = buildHawkMoth()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('纺锤身躯干材质（bodyMat, #4c443a）sheen=1', () => {
    const mats = byColorHex(collectMaterials(model.group), '4c443a')
    expect(mats.length, '未找到 #4c443a 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(1)
  })

  it('翅不动：翅面材质（wingMats.face, #524a3d）sheen 仍为 0', () => {
    const mats = byColorHex(collectMaterials(model.group), '524a3d')
    expect(mats.length, '未找到 #524a3d 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(0)
  })
})

// ---------------------------------------------------------------- 帝王蝶

describe('帝王蝶 buildMonarchButterfly：只躯干绒面，翅面不碰', () => {
  const model = buildMonarchButterfly()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('躯干材质（bodyMat, #171210）sheen=1', () => {
    const mats = byColorHex(collectMaterials(model.group), '171210')
    expect(mats.length, '未找到 #171210 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(1)
  })

  it('翅面一根手指都不碰：翅面材质（wingMats.face, #e8801f）sheen 仍为 0', () => {
    const mats = byColorHex(collectMaterials(model.group), 'e8801f')
    expect(mats.length, '未找到 #e8801f 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(0)
  })
})

// ---------------------------------------------------------------- 玉带凤蝶

describe('玉带凤蝶 buildSwallowtail：只躯干绒面，翅面不碰', () => {
  const model = buildSwallowtail()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('躯干材质（bodyMat, #0e0c0c）sheen=1', () => {
    const mats = byColorHex(collectMaterials(model.group), '0e0c0c')
    expect(mats.length, '未找到 #0e0c0c 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(1)
  })

  it('翅面一根手指都不碰：翅面材质（wingMats.face, #0b0a0c）sheen 仍为 0', () => {
    const mats = byColorHex(collectMaterials(model.group), '0b0a0c')
    expect(mats.length, '未找到 #0b0a0c 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(0)
  })
})

// ---------------------------------------------------------------- 西方蜜蜂

describe('西方蜜蜂 buildHoneybee：胸部绒毛区绒面 + 翅膜虹彩（顺带）', () => {
  const model = buildHoneybee()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('胸部绒毛区材质（thoraxMat，与 cuticleMat 同色 #241a0e）sheen=1，且同色号下仍有 sheen=0 的实例（头部/单眼沿用的 cuticleMat 未被连带套上绒面，证明是拆开的两份材质）', () => {
    const mats = byColorHex(collectMaterials(model.group), '241a0e')
    const sheenOn = mats.filter((m) => m.sheen === 1)
    const sheenOff = mats.filter((m) => m.sheen === 0)
    expect(sheenOn.length, '应至少有一份 #241a0e 材质开了绒面（thoraxMat）').toBeGreaterThan(0)
    expect(sheenOff.length, '应仍有 #241a0e 材质保持 sheen=0（cuticleMat 不该被连带套上绒面）').toBeGreaterThan(0)
  })

  it('两对翅的 membrane 都加了 iridescent:true（翅膜虹彩顺带处理）', () => {
    const mats = byColorHex(collectMaterials(model.group), 'eef1ee')
    expect(mats.length, '应能找到前后翅各一份翅膜材质').toBeGreaterThanOrEqual(2)
    for (const m of mats) expect(m.iridescence).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------- 金环胡蜂

describe('金环胡蜂 buildHornet：胸部绒毛区绒面 + 翅膜虹彩（顺带）', () => {
  const model = buildHornet()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('胸部绒毛区材质（thoraxMat, #2a1c12）sheen=1', () => {
    const mats = byColorHex(collectMaterials(model.group), '2a1c12')
    expect(mats.length, '未找到 #2a1c12 材质').toBeGreaterThan(0)
    for (const m of mats) expect(m.sheen).toBe(1)
  })

  it('两对翅的 membrane 都加了 iridescent:true（翅膜虹彩顺带处理）', () => {
    const mats = byColorHex(collectMaterials(model.group), 'e0b878')
    expect(mats.length, '应能找到前后翅各一份翅膜材质').toBeGreaterThanOrEqual(2)
    for (const m of mats) expect(m.iridescence).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------- 东方蝼蛄

describe('东方蝼蛄 buildMoleCricket：通体天鹅绒', () => {
  const model = buildMoleCricket()

  it('构建成功', () => {
    expectBuildOk(model)
  })

  it('通体绒面：bodyMat/darkMat/legMat/wingMat 四份材质 sheen=1', () => {
    const all = collectMaterials(model.group)
    for (const hex of ['8a6a3c', '4a3620', '7a5c34', '5c4526']) {
      const mats = byColorHex(all, hex)
      expect(mats.length, `未找到色号 #${hex} 的材质`).toBeGreaterThan(0)
      for (const m of mats) expect(m.sheen, `#${hex} 应 sheen=1`).toBe(1)
    }
  })

  it('刻意不动的两份材质（toothMat 挖掘齿突 / fuzzMat 绒毛几何本身）仍是 sheen=0', () => {
    const all = collectMaterials(model.group)
    for (const hex of ['3f2d1a', 'a4835a']) {
      const mats = byColorHex(all, hex)
      expect(mats.length, `未找到色号 #${hex} 的材质`).toBeGreaterThan(0)
      for (const m of mats) expect(m.sheen, `#${hex} 应保持 sheen=0`).toBe(0)
    }
  })
})

// ---------------------------------------------------------------- 神农洁蜣螂

describe('神农洁蜣螂 buildDungBeetle：不用 velvet，甲壳换粗刻点+保持哑光', () => {
  const model = buildDungBeetle()

  it('构建成功（node 下贴图生成器返回 null，只断言构建成功与 sheen，normalMap 非空只在浏览器环境才成立）', () => {
    expectBuildOk(model)
  })

  it('甲壳材质（bodyMat #0b0b0c / shellMat #111113）sheen 仍为 0——本物种用 punctate 不用 velvet', () => {
    const all = collectMaterials(model.group)
    for (const hex of ['0b0b0c', '111113']) {
      const mats = byColorHex(all, hex)
      expect(mats.length, `未找到色号 #${hex} 的材质`).toBeGreaterThan(0)
      for (const m of mats) expect(m.sheen, `#${hex} 应 sheen=0`).toBe(0)
    }
  })
})
