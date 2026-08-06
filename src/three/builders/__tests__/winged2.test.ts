/**
 * 玉带凤蝶 / 柞蚕蛾 / 金环胡蜂 / 中华草蛉 四个新物种 builder 的健全性测试。
 *
 * 和 flyers.test.ts 一样，这里不做"像不像"的美术评审，只守程序化建模最
 * 容易踩的坑：
 *   1. loft() 出 NaN —— 一旦出现就是全模型崩坏。
 *   2. anchors 是否恰好等于题目指定的 key 集合（多一个少一个都要失败）、
 *      坐标是否有限。
 *   3. 面数是否在预算内。
 *   4. 每个物种一条"形态特征"断言——专门钉住那条最容易被偷工减料
 *      跳过的招牌特征（尾突、栉齿触角、腹部环带、网状翅脉+金属复眼），
 *      自检标准是"把这条特征删掉/退化成默认值，这条断言就必须失败"。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildSwallowtail } from '../swallowtail'
import { buildSilkMoth } from '../silk-moth'
import { buildHornet } from '../hornet'
import { buildLacewing } from '../lacewing'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

interface Scan {
  meshCount: number
  triangles: number
  nanMeshNames: string[]
}

/** 遍历模型的所有 mesh：逐个 geometry 查 position 里的 NaN/Infinity，并数三角面。 */
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

function expectFiniteVector(v: THREE.Vector3, label: string) {
  expect(v, label).toBeTruthy()
  expect(Number.isFinite(v.x), `${label}.x`).toBe(true)
  expect(Number.isFinite(v.y), `${label}.y`).toBe(true)
  expect(Number.isFinite(v.z), `${label}.z`).toBe(true)
}

/** anchors 必须恰好等于 required 这个 key 集合：多一个、少一个都要失败。 */
function expectExactAnchors(model: InsectModel, required: string[]) {
  const actual = Object.keys(model.anchors).sort()
  const expected = [...required].sort()
  expect(actual, `anchors key 集合不匹配：实际=[${actual.join(',')}] 期望=[${expected.join(',')}]`).toEqual(expected)
  for (const key of required) {
    expectFiniteVector(model.anchors[key], `anchors.${key}`)
  }
}

/** 收集模型里所有 name === targetName 的 mesh。 */
function collectNamed(model: InsectModel, targetName: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === targetName) out.push(mesh)
  })
  return out
}

/** 递归统计某个命名分组（如触角）内部的 mesh 数量。 */
function countMeshesIn(root: THREE.Object3D): number {
  let count = 0
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) count++
  })
  return count
}

function runBasicChecks(label: string, model: InsectModel) {
  expect(model.radius).toBeGreaterThan(0)
  const s = scan(model)
  expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
  expect(s.meshCount).toBeGreaterThan(0)
  console.log(`[${label}] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
  expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
}

// ---------------------------------------------------------------------- 玉带凤蝶

describe('玉带凤蝶 buildSwallowtail', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    runBasicChecks('swallowtail', buildSwallowtail())
  })

  it('anchors 恰好是：forewing/hindwing/tail/antenna/eye/abdomen', () => {
    expectExactAnchors(buildSwallowtail(), ['forewing', 'hindwing', 'tail', 'antenna', 'eye', 'abdomen'])
  })

  it('翅展横向宽度明显大于体长，符合半展翅停栖的蝶类体型', () => {
    const model = buildSwallowtail()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)
    expect(size.z).toBeGreaterThan(size.y)
    expect(size.z).toBeGreaterThan(3)
  })

  it('后翅尾突：尾尖与后翅本体翅尖（不含尾突）之间有明显距离，证明真的多出一段指状突起', () => {
    // 自检：若把 tail anchor 错误地设成和 hindwing 相同的点（即"删掉"尾突这个
    // 独立特征），reach 会变成 0，这条断言必须失败。
    // HIND_LENGTH 对应 swallowtail.ts 内 hindSpec.length（后翅长度常量）。
    const HIND_LENGTH = 2.5
    const model = buildSwallowtail()
    const reach = model.anchors.tail.distanceTo(model.anchors.hindwing)
    expect(reach, `tail 与 hindwing 锚点间距=${reach.toFixed(3)}，应 > 后翅长×0.15=${(HIND_LENGTH * 0.15).toFixed(3)}`).toBeGreaterThan(
      HIND_LENGTH * 0.15,
    )
  })
})

// ---------------------------------------------------------------------- 柞蚕蛾

describe('柞蚕蛾 buildSilkMoth', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    runBasicChecks('silk-moth', buildSilkMoth())
  })

  it('anchors 恰好是：eyespot/antenna/forewing/hindwing/thorax/abdomen', () => {
    expectExactAnchors(buildSilkMoth(), ['eyespot', 'antenna', 'forewing', 'hindwing', 'thorax', 'abdomen'])
  })

  it('大型蛾类体型：翅展（Z）远超体长（X）的量级', () => {
    const model = buildSilkMoth()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)
    expect(size.z).toBeGreaterThan(size.x)
  })

  it('翅平摊而非蝶类上举：翅面最高点相对胸部锚点的抬升幅度远小于翅长，不构成"V"姿', () => {
    const model = buildSilkMoth()
    const box = new THREE.Box3().setFromObject(model.group)
    const thoraxY = model.anchors.thorax.y
    // forewing.length = 5.8（见 silk-moth.ts 内 foreSpec），若像蝶类那样上举成 V，
    // box.max.y - thoraxY 会达到翅长的 30% 以上（参照 monarch 的回归断言）；
    // 本种应远低于这个比例，证明是"平摊 + 屋顶略下垂"而非"上举"。
    expect(box.max.y - thoraxY).toBeLessThan(5.8 * 0.3)
  })

  it('羽状（栉齿状）触角的几何体数量显著多于丝状/棒状触角：触角分组内 mesh 数 > 30', () => {
    // 自检：若把 kind 从 'pectinate' 误改回 'filiform'/'clavate'，触角只剩主干
    // 这一个 mesh（每侧 1 个，双侧 2 个），这条断言必须失败。
    const model = buildSilkMoth()
    const node = model.group.getObjectByName('antennae')
    expect(node, '未找到名为 antennae 的触角分组').toBeTruthy()
    const count = countMeshesIn(node!)
    expect(count, `触角分组内 mesh 数=${count}`).toBeGreaterThan(30)
  })
})

// ---------------------------------------------------------------------- 金环胡蜂

describe('金环胡蜂 buildHornet', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    runBasicChecks('hornet', buildHornet())
  })

  it('anchors 恰好是：mandible/sting/wing/eye/antenna/waist', () => {
    expectExactAnchors(buildHornet(), ['mandible', 'sting', 'wing', 'eye', 'antenna', 'waist'])
  })

  it('细腰：waist 锚点到 sting 锚点、到 mandible 锚点都保持着体长量级的距离（不是退化成同一点）', () => {
    const model = buildHornet()
    expect(model.anchors.waist.distanceTo(model.anchors.mandible)).toBeGreaterThan(0.5)
    expect(model.anchors.waist.distanceTo(model.anchors.sting)).toBeGreaterThan(0.5)
  })

  it('腹部分节 mesh 数 ≥ 4 且至少两种不同材质颜色，证明环带是真的分段上色而非单一材质', () => {
    // 自检：若把 bandedAbdomen 换回单一材质的 segmentedAbdomen()，
    // 要么找不到任何 abdomen-segment 命名的 mesh（0 < 4 失败），
    // 要么所有材质颜色相同（颜色种类 1 < 2 失败）。
    const model = buildHornet()
    const segs = collectNamed(model, 'abdomen-segment')
    expect(segs.length, `abdomen-segment mesh 数=${segs.length}`).toBeGreaterThanOrEqual(4)

    const colors = new Set(
      segs.map((m) => {
        const mat = m.material as THREE.MeshPhysicalMaterial
        return mat.color.getHexString()
      }),
    )
    expect(colors.size, `腹部材质颜色种类=${colors.size}（颜色：${[...colors].join(',')}）`).toBeGreaterThanOrEqual(2)
  })
})

// ---------------------------------------------------------------------- 中华草蛉

describe('中华草蛉 buildLacewing', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    runBasicChecks('lacewing', buildLacewing())
  })

  it('anchors 恰好是：wing/eye/antenna/thorax/abdomen/leg', () => {
    expectExactAnchors(buildLacewing(), ['wing', 'eye', 'antenna', 'thorax', 'abdomen', 'leg'])
  })

  it('翅脉网格数量 ≥ 100，证明翅脉是密集成网而非几根扇形纵脉', () => {
    // 阈值刻意定得比"单翅 25 条"高得多、按四片翅整体计算：kit.wingVeins()
    // 的默认密度（约 7 纵脉 + 12 横脉 = 19 条/单翅实例）就算不改命名、
    // 直接把四片翅的数量加总也只有 19×4=76，够不到 100——这样即使
    // 不依赖"是否还留着 vein 这个命名标记"，单凭数量本身也能把"退回
    // kit 默认稀疏翅脉"这类回归挡住，而不是只靠命名标记的有无取巧过关。
    // 本文件实际密度是 9 纵脉+40 横脉=49 条/单翅实例，四片共 196 条。
    const model = buildLacewing()
    const veins = collectNamed(model, 'vein')
    expect(veins.length, `翅脉 mesh 数=${veins.length}`).toBeGreaterThanOrEqual(100)
  })

  it('复眼材质 metalness > 0.5，证明是自建的金属感材质而非 kit.compoundEye() 写死的 0.1', () => {
    const model = buildLacewing()
    const eyes = collectNamed(model, 'compound-eye')
    expect(eyes.length, '未找到 compound-eye 命名的复眼 mesh').toBeGreaterThan(0)
    for (const e of eyes) {
      const mat = e.material as THREE.MeshPhysicalMaterial
      expect(mat.metalness, `metalness=${mat.metalness}`).toBeGreaterThan(0.5)
    }
  })

  it('屋脊状停栖姿：翅收拢贴腹但仍有可辨的侧向展幅（不是完全收缩成一条线）', () => {
    // 不卡 X 跨度的上限：草蛉的长丝状触角向前伸出（见文件顶部注释，长度
    // 刻意超过体长本身，是本科的真实特征），会让整体包围盒的 X 跨度显著
    // 超过单纯的体长，卡 X 上限反而会惩罚"触角足够长"这个正确实现。
    // 也不能照搬"翅展≈3cm"去卡 Z 下限——那是翅完全展平时的量法，屋脊状
    // 停栖姿的翅贴腹收拢，侧向跨度本就远小于展平全宽（同理见
    // monarch-butterfly.ts 里"半展开姿态达不到完全展平全长"的说明）。
    // 这里只验证"侧向确有展幅"：Z 跨度需明显超过纤细腹部本身的直径
    // （abdomen r0=0.075，直径 0.15），证明翅真的探出了身体轮廓之外。
    const model = buildLacewing()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)
    expect(size.z).toBeGreaterThan(0.8)
  })
})
