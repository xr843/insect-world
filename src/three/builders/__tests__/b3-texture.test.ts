/**
 * B 轮·刻点/纵沟组验证：本文件独占的 10 个物种（ladybird / ground-beetle /
 * bombardier-beetle / darkling-beetle / hister-beetle / burying-beetle /
 * diving-beetle / longhorn-beetle / stag-beetle / hercules-beetle）按
 * docs/polish-plan.md「刻点组」表挂上了 surface:'punctate'|'striate'
 * （少数手动传参绕开 elytra()/chitin() 的枚举，直接调 surface.ts 的
 * punctateMaps()/striateMaps() 自定密度/条数/深度）。
 *
 * 两层断言：
 * 1. 材质标量不变——node 没有 Canvas 2D，surface.ts 的每个贴图生成器
 *    入口都先查 `typeof document` 再返回 null（见 surface.ts 头注释），
 *    所以 chitin()/elytra() 的 surface 选项在 node 下只会把 normalMap/
 *    roughnessMap 设成 null，绝不触碰 roughness/metalness/clearcoat 等
 *    标量——这里把改动前（本文件新增前）实际跑出来的材质快照原样写死
 *    做 toEqual，标量被 surface 选项误改会直接测出来。darkling-beetle
 *    与 hercules-beetle 各多出一份材质对象（甲壳/头胸角单独开一份材质，
 *    避免 punctate 纹理漏到 abdomen/pronotum/head 或触角上），因此比
 *    改动前的快照多一条数值相同、对象不同的条目，已在下面注明。
 * 2. 贴图真的挂上了——用 surface.test.ts 同款的假 document 桩，构建一次
 *    真实材质，确认 normalMap/roughnessMap 落在预期的那份材质上、没漏
 *    到不该动的材质（burying-beetle 的 band、longhorn-beetle 的白斑、
 *    hercules-beetle 的触角、darkling-beetle 的 abdomen/pronotum/head）。
 *
 * 只新增本文件，不改任何既有测试（多 agent 并发改共享测试会互相覆盖）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { striateMaps } from '../surface'
import { buildLadybird } from '../ladybird'
import { buildGroundBeetle } from '../ground-beetle'
import { buildBombardierBeetle } from '../bombardier-beetle'
import { buildDarklingBeetle } from '../darkling-beetle'
import { buildHisterBeetle } from '../hister-beetle'
import { buildBuryingBeetle } from '../burying-beetle'
import { buildDivingBeetle } from '../diving-beetle'
import { buildLonghornBeetle } from '../longhorn-beetle'
import { buildStagBeetle } from '../stag-beetle'
import { buildHerculesBeetle } from '../hercules-beetle'
import type { InsectModel } from '../kit'

// ---------------------------------------------------------------- 材质标量快照

interface ScalarSnap {
  color: string
  roughness: number
  metalness: number
  clearcoat: number
  clearcoatRoughness: number
  iridescence: number
  sheen: number
  transparent: boolean
  opacity: number
  transmission: number
  normalMap: THREE.Texture | null
  roughnessMap: THREE.Texture | null
}

/** [color, roughness, metalness, clearcoat, clearcoatRoughness, iridescence, sheen, transparent, opacity, transmission] */
type Tuple = [string, number, number, number, number, number, number, boolean, number, number]

function expand(tuples: Tuple[]): ScalarSnap[] {
  return tuples.map(([color, roughness, metalness, clearcoat, clearcoatRoughness, iridescence, sheen, transparent, opacity, transmission]) => ({
    color,
    roughness,
    metalness,
    clearcoat,
    clearcoatRoughness,
    iridescence,
    sheen,
    transparent,
    opacity,
    transmission,
    normalMap: null,
    roughnessMap: null,
  }))
}

/** 遍历 group，按对象引用去重收集全部材质标量（同 b1-iridescent.test.ts collectMaterials 的手法，多存几个字段）。 */
function collectScalars(model: InsectModel): ScalarSnap[] {
  const seen = new Set<THREE.Material>()
  const out: ScalarSnap[] = []
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      const m = mat as THREE.MeshPhysicalMaterial
      if (!m || seen.has(m)) continue
      seen.add(m)
      out.push({
        color: m.color.getHexString(),
        roughness: m.roughness,
        metalness: m.metalness,
        clearcoat: m.clearcoat,
        clearcoatRoughness: m.clearcoatRoughness,
        iridescence: m.iridescence,
        sheen: m.sheen,
        transparent: m.transparent,
        opacity: m.opacity,
        transmission: m.transmission,
        normalMap: m.normalMap,
        roughnessMap: m.roughnessMap,
      })
    }
  })
  return out
}

/** 按基色（十六进制，不含 #）收集去重后的材质对象——本轮改动的目标材质在各自
 * 文件里颜色值唯一（hister-beetle/darkling-beetle/hercules-beetle 例外，
 * 三个文件里分别有多份材质共享同一色值，是本组故意的设计，各自的测试里说明）。 */
function materialsByColor(model: InsectModel, hex: string): THREE.MeshPhysicalMaterial[] {
  const seen = new Set<THREE.Material>()
  const out: THREE.MeshPhysicalMaterial[] = []
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      const m = mat as THREE.MeshPhysicalMaterial
      if (!m || seen.has(m) || m.color.getHexString() !== hex) continue
      seen.add(m)
      out.push(m)
    }
  })
  return out
}

// ---------------------------------------------------------------- 假 document（同 surface.test.ts）

function fakeDom() {
  const doc = {
    createElement(tag: string) {
      if (tag !== 'canvas') throw new Error(`意料之外的 createElement(${tag})`)
      return {
        width: 0,
        height: 0,
        getContext(kind: string) {
          if (kind !== '2d') return null
          return {
            createImageData(w: number, h: number) {
              return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h }
            },
            putImageData() {
              /* 像素内容本文件不关心，只关心贴图有没有挂上 */
            },
          }
        },
      }
    },
  }
  return doc
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------- 逐物种

describe('ladybird 七星瓢虫（本组定标，鞘翅细密刻点）', () => {
  const model = buildLadybird()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（10 份材质，顺序不变）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        // roughness 由 elytra() 默认的 0.3192 抬到 0.56：这是有意改动，不是材质漂移。
        // 原值下面光源在这只大圆顶上打出一大片**过曝到纯白**的高光（占可见鞘翅 8.8%），
        // 被用户读成「壳裂开、穿模」。定位过程与取值依据见 ladybird.ts 里的注释。
        ['e2382a', 0.56, 0.12, 0.55, 0.18, 0, 0, false, 1, 0],
        ['231a17', 0.54, 0, 0.4, 0.18, 0, 0, false, 1, 0],
        ['15110f', 0.3376, 0, 0.65, 0.18, 0, 0, false, 1, 0],
        ['181410', 0.37439999999999996, 0, 0.5, 0.18, 0, 0, false, 1, 0],
        ['f2ede0', 0.54, 0, 0.28, 0.18, 0, 0, false, 1, 0],
        ['151110', 0.46640000000000004, 0, 0.38, 0.18, 0, 0, false, 1, 0],
        ['0b0908', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['0b0908', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['3a2f28', 0.6779999999999999, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['241d1a', 0.6319999999999999, 0, 0.18, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，鞘翅材质挂上手调密度的刻点贴图（normalMap + roughnessMap）', () => {
    vi.stubGlobal('document', fakeDom())
    const mats = materialsByColor(buildLadybird(), 'e2382a')
    expect(mats.length, '鞘翅材质应恰好 1 份').toBe(1)
    expect(mats[0].normalMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(mats[0].roughnessMap).toBeInstanceOf(THREE.CanvasTexture)
  })
})

describe('ground-beetle 中华金星步甲（鞘翅纵沟，虹彩不动）', () => {
  const model = buildGroundBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（11 份材质，顺序不变）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        ['10130d', 0.3927999999999999, 0.48, 0.4, 0.18, 0, 0, false, 1, 0],
        ['12160f', 0.3376, 0.58, 0.52, 0.18, 0.4, 0, false, 1, 0],
        ['2c2013', 0.15359999999999996, 0.8, 0.55, 0.18, 0.3, 0, false, 1, 0],
        ['181c12', 0.4939999999999999, 0.42, 0.4, 0.18, 0, 0, false, 1, 0],
        ['0a0c08', 0.54, 0.35, 0.35, 0.18, 0, 0, false, 1, 0],
        ['0c0c0b', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['494946', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['0c0c0b', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['494946', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['14100a', 0.356, 0.42, 0.44, 0.18, 0, 0, false, 1, 0],
        ['0e120c', 0.46640000000000004, 0.44, 0.36, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，鞘翅材质（金色星点虹彩不变）挂上纵沟贴图，且 iridescence 仍是 0.4', () => {
    vi.stubGlobal('document', fakeDom())
    const mats = materialsByColor(buildGroundBeetle(), '12160f')
    expect(mats.length).toBe(1)
    expect(mats[0].normalMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(mats[0].roughnessMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(mats[0].iridescence).toBeCloseTo(0.4, 5)
  })
})

describe('bombardier-beetle 屁步甲（鞘翅纵沟，默认档）', () => {
  const model = buildBombardierBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（13 份材质，顺序不变）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        ['7a3c05', 0.5584, 0.04, 0.26, 0.18, 0, 0, false, 1, 0],
        ['080a12', 0.31919999999999993, 0.3, 0.55, 0.18, 0, 0, false, 1, 0],
        ['03040a', 0.2639999999999999, 0.22, 0.5, 0.18, 0, 0, false, 1, 0],
        ['6e4c04', 0.6872, 0, 0.12, 0.18, 0, 0, false, 1, 0],
        ['0b0908', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4c4541', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['0b0908', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4c4541', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['0e0d0b', 0.4939999999999999, 0.1, 0.3, 0.18, 0, 0, false, 1, 0],
        ['2c2013', 0.6319999999999999, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['100f0d', 0.5768, 0.08, 0.24, 0.18, 0, 0, false, 1, 0],
        ['100e0c', 0.6688000000000001, 0, 0.14, 0.18, 0, 0, false, 1, 0],
        ['2a0f06', 0.6319999999999999, 0, 0.2, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，鞘翅材质挂上纵沟贴图', () => {
    vi.stubGlobal('document', fakeDom())
    const mats = materialsByColor(buildBombardierBeetle(), '080a12')
    expect(mats.length).toBe(1)
    expect(mats[0].normalMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(mats[0].roughnessMap).toBeInstanceOf(THREE.CanvasTexture)
  })
})

describe('darkling-beetle 甘肃鳖甲（甲壳刻点，哑光维持）', () => {
  const model = buildDarklingBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前只多一条数值相同的新对象（甲壳单独一份材质，5 份）', () => {
    // 改动前 matteBlack 一份材质通吃 abdomen/fusedElytra/棱/pronotum/head，
    // 4 份材质、共 4 条快照；本轮把甲壳（fusedElytra + 3 条棱）拆到独立
    // 的 shellMat，gloss/metal/clearcoat 与 matteBlack 完全相同，只多
    // 一条数值重复、对象不同的条目（顺序上排在 matteBlack 后面，因为
    // g.add(abdomen) 先于 g.add(fusedElytra)）。
    expect(collectScalars(model)).toEqual(
      expand([
        ['111110', 0.8712, 0.02, 0.03, 0.18, 0, 0, false, 1, 0], // matteBlack（abdomen/pronotum/head）
        ['111110', 0.8712, 0.02, 0.03, 0.18, 0, 0, false, 1, 0], // shellMat（fusedElytra + 棱），新增
        ['08070a', 0.724, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['131211', 0.862, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['0d0c0b', 0.8528, 0.02, 0.04, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，甲壳（111110 两份材质中的一份）挂刻点贴图，另一份（abdomen/pronotum/head 用的 matteBlack）不挂', () => {
    vi.stubGlobal('document', fakeDom())
    const mats = materialsByColor(buildDarklingBeetle(), '111110')
    expect(mats.length, '111110 色值应恰好两份材质对象（matteBlack + shellMat）').toBe(2)
    const withNormal = mats.filter((m) => m.normalMap !== null)
    const withoutNormal = mats.filter((m) => m.normalMap === null)
    expect(withNormal.length, '应恰好一份挂了法线贴图（shellMat）').toBe(1)
    expect(withoutNormal.length, '应恰好一份没挂法线贴图（matteBlack，不该被甲壳的刻点牵动）').toBe(1)
  })
})

describe('hister-beetle 阎甲（稀疏大刻点，高光泽维持）', () => {
  const model = buildHisterBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（8 份材质，顺序不变）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        ['0a0908', 0.1904, 0, 0.5, 0.18, 0, 0, false, 1, 0],
        ['0a0908', 0.17199999999999993, 0, 0.55, 0.18, 0, 0, false, 1, 0],
        ['0a0908', 0.17199999999999993, 0, 0.55, 0.18, 0, 0, false, 1, 0],
        ['0a0908', 0.20879999999999999, 0, 0.48, 0.18, 0, 0, false, 1, 0],
        ['050403', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['050403', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['0a0908', 0.2639999999999999, 0, 0.4, 0.18, 0, 0, false, 1, 0],
        ['100e0c', 0.356, 0, 0.4, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，头/前胸/鞘翅/腹末（0a0908 里的 4 份改动目标）都挂了同一张稀疏大刻点贴图，触角（同色但不在改动范围）不挂', () => {
    vi.stubGlobal('document', fakeDom())
    // ⚠️ antennaMat 与 head/pronotum/elytra/abdomen 四份材质凑巧用了同一个
    // 十六进制色值 0a0908（gloss/clearcoat 不同），materialsByColor 按色值
    // 筛选会连它一起命中——5 份而非 4 份，用 normalMap 有无分组才是准的。
    const mats = materialsByColor(buildHisterBeetle(), '0a0908')
    expect(mats.length, '0a0908 色值应命中 5 份材质（4 份改动目标 + antennaMat）').toBe(5)
    const withNormal = mats.filter((m) => m.normalMap !== null)
    const withoutNormal = mats.filter((m) => m.normalMap === null)
    expect(withNormal.length, 'head/pronotum/elytra/abdomen 四份都应挂刻点贴图').toBe(4)
    expect(withoutNormal.length, 'antennaMat 不在本轮改动范围内，不该挂').toBe(1)
    for (const m of withNormal) {
      expect(m.roughnessMap).toBeInstanceOf(THREE.CanvasTexture)
    }
    // 全局缓存：四份改动目标共享同一张贴图实例，不是各挂各的
    expect(withNormal[1].normalMap).toBe(withNormal[0].normalMap)
    expect(withNormal[2].normalMap).toBe(withNormal[0].normalMap)
    expect(withNormal[3].normalMap).toBe(withNormal[0].normalMap)
    // 腿材质（不同色值 100e0c）也不该被牵动
    const legMats = materialsByColor(buildHisterBeetle(), '100e0c')
    expect(legMats[0].normalMap).toBeNull()
  })
})

describe('burying-beetle 日本埋葬虫（鞘翅刻点，橙红横带绝对不动）', () => {
  const model = buildBuryingBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（11 份材质，顺序不变；band 色值/标量分毫未动）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        ['141110', 0.44799999999999995, 0.15, 0.35, 0.18, 0, 0, false, 1, 0],
        ['100d0c', 0.31919999999999993, 0.15, 0.55, 0.18, 0, 0, false, 1, 0],
        ['a83208', 0.6504, 0, 0.1, 0.18, 0, 0, false, 1, 0], // band：色值/标量与改前逐位相同
        ['0b0908', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4c4541', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['0b0908', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4c4541', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['0f0c0a', 0.37439999999999996, 0.2, 0.4, 0.18, 0, 0, false, 1, 0],
        ['362419', 0.586, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['e97a24', 0.4939999999999999, 0, 0.28, 0.18, 0, 0, false, 1, 0],
        ['1c1512', 0.6135999999999999, 0.12, 0.25, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，鞘翅材质挂刻点贴图，橙红横带材质完全不挂（未被牵动）', () => {
    vi.stubGlobal('document', fakeDom())
    const fresh = buildBuryingBeetle()
    const elytraMats = materialsByColor(fresh, '100d0c')
    expect(elytraMats.length).toBe(1)
    expect(elytraMats[0].normalMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(elytraMats[0].roughnessMap).toBeInstanceOf(THREE.CanvasTexture)

    const bandMats = materialsByColor(fresh, 'a83208')
    expect(bandMats.length).toBe(1)
    expect(bandMats[0].normalMap, 'band 材质不该挂任何法线贴图').toBeNull()
  })
})

describe('diving-beetle 黄缘龙虱（鞘翅刻点极轻，流线光泽保持）', () => {
  const model = buildDivingBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（10 份材质，顺序不变）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        ['22301a', 0.54, 0, 0.3, 0.18, 0, 0, false, 1, 0],
        ['283c20', 0.31919999999999993, 0.14, 0.55, 0.18, 0, 0, false, 1, 0],
        ['e2b93a', 0.4296, 0, 0.35, 0.18, 0, 0, false, 1, 0],
        ['100d0b', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4f463f', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['100d0b', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4f463f', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['28361d', 0.6135999999999999, 0, 0.22, 0.18, 0, 0, false, 1, 0],
        ['3c4a2a', 0.724, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['dcefe8', 0.22, 0, 0, 0.18, 0, 0, true, 0.26, 0.55],
      ]),
    )
  })

  it('有 document 时，鞘翅材质挂上极轻刻点贴图（本组风险最高的一只，仍确认贴图真的落了地）', () => {
    vi.stubGlobal('document', fakeDom())
    const mats = materialsByColor(buildDivingBeetle(), '283c20')
    expect(mats.length).toBe(1)
    expect(mats[0].normalMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(mats[0].roughnessMap).toBeInstanceOf(THREE.CanvasTexture)
  })
})

describe('longhorn-beetle 星天牛（鞘翅刻点，白星斑不动）', () => {
  const model = buildLonghornBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（12 份材质，顺序不变；白斑色值/标量分毫未动）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        ['0d0d0f', 0.54, 0, 0.35, 0.18, 0, 0, false, 1, 0],
        ['08080a', 0.31919999999999993, 0.12, 0.55, 0.18, 0, 0, false, 1, 0],
        ['f0f1ec', 0.724, 0, 0, 0.18, 0, 0, false, 1, 0], // 白斑：色值/标量与改前逐位相同
        ['151517', 0.586, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['050506', 0.3376, 0, 0.5, 0.18, 0, 0, false, 1, 0],
        ['141013', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['141013', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['141013', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['141013', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['0c0c0e', 0.44799999999999995, 0, 0.4, 0.18, 0, 0, false, 1, 0],
        ['c9d3d8', 0.7424, 0, 0, 0.18, 0, 0, false, 1, 0],
        ['111113', 0.4939999999999999, 0, 0.3, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，鞘翅材质挂刻点贴图，白斑材质完全不挂', () => {
    vi.stubGlobal('document', fakeDom())
    const fresh = buildLonghornBeetle()
    const shellMats = materialsByColor(fresh, '08080a')
    expect(shellMats.length).toBe(1)
    expect(shellMats[0].normalMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(shellMats[0].roughnessMap).toBeInstanceOf(THREE.CanvasTexture)

    const spotMats = materialsByColor(fresh, 'f0f1ec')
    expect(spotMats.length).toBe(1)
    expect(spotMats[0].normalMap, '白斑材质不该挂任何法线贴图').toBeNull()
  })
})

describe('stag-beetle 中华大锹甲（鞘翅纵沟轻档）', () => {
  const model = buildStagBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前完全一致（4 份材质，顺序不变）', () => {
    expect(collectScalars(model)).toEqual(
      expand([
        ['0c0c0d', 0.4296, 0.08, 0.4, 0.18, 0, 0, false, 1, 0],
        ['050506', 0.1904, 0.12, 0.55, 0.18, 0, 0, false, 1, 0],
        ['08080a', 0.3376, 0.16, 0.44, 0.18, 0, 0, false, 1, 0],
        ['0a0a0b', 0.46640000000000004, 0.1, 0.36, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，鞘翅材质挂上纵沟贴图，且轻档深度参数确实生效（贴图与默认深度档不是同一份缓存）', () => {
    vi.stubGlobal('document', fakeDom())
    const mats = materialsByColor(buildStagBeetle(), '050506')
    expect(mats.length).toBe(1)
    expect(mats[0].normalMap).toBeInstanceOf(THREE.CanvasTexture)
    expect(mats[0].roughnessMap).toBeInstanceOf(THREE.CanvasTexture)

    // 轻档用的是 depth=0.85，与 kit.ts 默认走 surface:'striate' 枚举时
    // 用的 depth=1.5（STRIATE_DEPTH）不是同一个缓存键，两张贴图应是不同
    // 的 Texture 实例——证明"轻档"参数真的传下去了，不是悄悄用了默认值。
    const defaultDepthMaps = striateMaps(9, 1.5)
    expect(defaultDepthMaps).not.toBeNull()
    expect(mats[0].normalMap).not.toBe(defaultDepthMaps!.normal)
  })
})

describe('hercules-beetle 长戟大兜虫（鞘翅显式 smooth，头胸角刻点）', () => {
  const model = buildHerculesBeetle()

  it('构建不抛异常，包围球半径 > 0', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('node 下材质标量与改动前只多一条数值相同的新对象（头胸角单独一份材质，10 份）', () => {
    // 改动前 hornMat 一份材质通吃 thoracicHorn/头角/绒毛/触角，1 份材质、
    // 1 条快照；本轮把 thoracicHorn/headHorn 拆到独立的 hornSurfaceMat，
    // gloss/clearcoat 与 hornMat 完全相同，只多一条数值重复、对象不同的
    // 条目（顺序排在原 hornMat 前面，因为 g.add(thoracicRaw.mesh) 先于
    // g.add(thoracicHornBristles(...))，后者仍用旧的 hornMat）。鞘翅
    // shellMat 从 elytra() 换成手动摊开的 chitin(...,surface:'smooth')，
    // 但 gloss/metal/clearcoat 数值与改前逐位相同，快照不变。
    expect(collectScalars(model)).toEqual(
      expand([
        ['111010', 0.4296, 0, 0.42, 0.18, 0, 0, false, 1, 0],
        ['93a247', 0.31919999999999993, 0.15, 0.55, 0.18, 0, 0, false, 1, 0], // shellMat：显式 smooth，标量不变
        ['171512', 0.6135999999999999, 0, 0.3, 0.18, 0, 0, false, 1, 0],
        ['0c0b0a', 0.3376, 0, 0.5, 0.18, 0, 0, false, 1, 0], // hornSurfaceMat（thoracicHorn/headHorn），新增
        ['0c0b0a', 0.3376, 0, 0.5, 0.18, 0, 0, false, 1, 0], // hornMat（绒毛/触角）
        ['141010', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4e4343', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['141010', 0.12, 0.1, 1, 0.05, 0, 0, false, 1, 0],
        ['4e4343', 0.22, 0.05, 0.9, 0, 0, 0, true, 0.4, 0],
        ['121110', 0.4847999999999999, 0, 0.36, 0.18, 0, 0, false, 1, 0],
      ]),
    )
  })

  it('有 document 时，鞘翅显式 smooth 连默认微颗粒都不挂；头胸角（0c0b0a 两份材质中的一份）挂刻点、另一份（绒毛/触角用的 hornMat）不挂', () => {
    vi.stubGlobal('document', fakeDom())
    const fresh = buildHerculesBeetle()

    const shellMats = materialsByColor(fresh, '93a247')
    expect(shellMats.length).toBe(1)
    expect(shellMats[0].normalMap, "surface:'smooth' 不该挂法线贴图").toBeNull()
    expect(shellMats[0].roughnessMap, "surface:'smooth' 连默认微颗粒粗糙度图都不挂").toBeNull()

    const hornColorMats = materialsByColor(fresh, '0c0b0a')
    expect(hornColorMats.length, '0c0b0a 色值应恰好两份材质对象（hornSurfaceMat + hornMat）').toBe(2)
    const withNormal = hornColorMats.filter((m) => m.normalMap !== null)
    const withoutNormal = hornColorMats.filter((m) => m.normalMap === null)
    expect(withNormal.length, '应恰好一份挂了刻点法线贴图（头胸角用的 hornSurfaceMat）').toBe(1)
    expect(withoutNormal.length, '应恰好一份没挂（绒毛/触角仍用的 hornMat，不该被头胸角的刻点牵动）').toBe(1)
  })
})
