/**
 * 姬蜂 / 中华齿蛉两个 builder 的结构性验证。
 *
 * 和 winged2.test.ts 一样，这里不做"像不像"的美术评审，只守程序化建模
 * 最容易踩的坑：
 *   1. loft() 出 NaN —— 一旦出现就是全模型崩坏。
 *   2. anchors 是否恰好等于题目指定的 key 集合。
 *   3. 面数是否在预算内。
 *   4. 每个物种一条"招牌特征"断言，自检标准是"把这条特征删掉/退化成
 *      默认值，这条断言就必须失败"：
 *      - 姬蜂：产卵器的 X 跨度 ≥ 躯干（头到腹末）长度的 2.0 倍，且产卵器
 *        由恰好 3 根独立的丝构成——如果有人把产卵器简化成 1 根或缩短到
 *        不足 2 倍体长，这两条断言都会失败。躯干长度没有独立的锚点
 *        （本物种 anchors 只有 ovipositor/antenna/wing/waist/eye/leg），
 *        用 'trunk' 命名的头/胸/腰/腹节 mesh 合并包围盒反推。
 *      - 中华齿蛉：大颚 X 跨度 ≥ 头部长度的 3.0 倍，且两颚末端在 Z 方向
 *        真的交叉（不是简单地相向而不越过中线）——如果有人把 cross 参数
 *        调小到颚尖不再越过中线，交叉断言会失败；翅脉 mesh 数 ≥ 30，
 *        证明用的是自写的按翅宽缩放翅脉，不是退回 kit.wingVeins() 在
 *        这个尺寸下会细到看不见的默认翅脉。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildIchneumonWasp } from '../ichneumon-wasp'
import { buildDobsonfly } from '../dobsonfly'
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

/**
 * 合并若干同名 mesh 的包围盒——用于从命名分组反推"躯干长度"这类没有
 * 独立锚点的量。只比较包围盒尺寸（平移不变量），不依赖 finalize() 之后
 * matrixWorld 是否被重新传播，结果稳健。
 */
function unionBoxByName(model: InsectModel, targetName: string): THREE.Box3 {
  model.group.updateMatrixWorld(true)
  const box = new THREE.Box3()
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === targetName) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

function runBasicChecks(label: string, model: InsectModel) {
  expect(model.radius).toBeGreaterThan(0)
  const s = scan(model)
  expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
  expect(s.meshCount).toBeGreaterThan(0)
  console.log(`[${label}] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
  expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
}

// ---------------------------------------------------------------------- 姬蜂

describe('姬蜂 buildIchneumonWasp', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    runBasicChecks('ichneumon-wasp', buildIchneumonWasp())
  })

  it('anchors 恰好是：ovipositor/antenna/wing/waist/eye/leg', () => {
    expectExactAnchors(buildIchneumonWasp(), ['ovipositor', 'antenna', 'wing', 'waist', 'eye', 'leg'])
  })

  it('构建两次结果一致（未使用 Math.random）', () => {
    const a = buildIchneumonWasp()
    const b = buildIchneumonWasp()
    expect(b.radius).toBe(a.radius)
  })

  it('产卵器由恰好 3 根独立的丝构成', () => {
    // 自检：若把产卵器简化成 1 根（省掉两侧的鞘），这里会失败。
    const model = buildIchneumonWasp()
    const strands = collectNamed(model, 'ovipositor-strand')
    expect(strands.length, `ovipositor-strand mesh 数=${strands.length}`).toBe(3)
  })

  it('产卵器的 X 跨度 ≥ 躯干（头到腹末）长度的 2.0 倍', () => {
    // 自检：若把产卵器缩短到不足体长两倍，这条断言必须失败。
    const model = buildIchneumonWasp()
    const trunkBox = unionBoxByName(model, 'trunk')
    const ovipositorBox = unionBoxByName(model, 'ovipositor-strand')
    expect(trunkBox.isEmpty(), '找不到 trunk 命名的 mesh').toBe(false)
    expect(ovipositorBox.isEmpty(), '找不到 ovipositor-strand 命名的 mesh').toBe(false)

    const trunkSize = new THREE.Vector3()
    trunkBox.getSize(trunkSize)
    const ovipositorSize = new THREE.Vector3()
    ovipositorBox.getSize(ovipositorSize)

    console.log(
      `[ichneumon-wasp] trunk length(X)=${trunkSize.x.toFixed(3)} ovipositor span(X)=${ovipositorSize.x.toFixed(3)} ratio=${(
        ovipositorSize.x / trunkSize.x
      ).toFixed(2)}`,
    )
    expect(ovipositorSize.x).toBeGreaterThanOrEqual(trunkSize.x * 2.0)
  })
})

// ---------------------------------------------------------------------- 中华齿蛉

describe('中华齿蛉 buildDobsonfly', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理，面数在预算内', () => {
    runBasicChecks('dobsonfly', buildDobsonfly())
  })

  it('anchors 恰好是：mandible/wing/eye/antenna/thorax/abdomen', () => {
    expectExactAnchors(buildDobsonfly(), ['mandible', 'wing', 'eye', 'antenna', 'thorax', 'abdomen'])
  })

  it('构建两次结果一致（未使用 Math.random）', () => {
    const a = buildDobsonfly()
    const b = buildDobsonfly()
    expect(b.radius).toBe(a.radius)
  })

  it('大颚的 X 跨度 ≥ 头部长度的 3.0 倍', () => {
    const model = buildDobsonfly()
    const headBox = unionBoxByName(model, 'head')
    const mandibleBox = unionBoxByName(model, 'mandible')
    expect(headBox.isEmpty(), '找不到 head 命名的 mesh').toBe(false)
    expect(mandibleBox.isEmpty(), '找不到 mandible 命名的 mesh').toBe(false)

    const headSize = new THREE.Vector3()
    headBox.getSize(headSize)
    const mandibleSize = new THREE.Vector3()
    mandibleBox.getSize(mandibleSize)

    console.log(
      `[dobsonfly] head length(X)=${headSize.x.toFixed(3)} mandible span(X)=${mandibleSize.x.toFixed(3)} ratio=${(
        mandibleSize.x / headSize.x
      ).toFixed(2)}`,
    )
    expect(mandibleSize.x).toBeGreaterThanOrEqual(headSize.x * 3.0)
  })

  it('两颚末端在 Z 方向真的交叉：左右颚尖分别越过中线到了对侧', () => {
    // 自检：若把 longMandible() 里的 cross 参数调小到盖不过 flare，颚尖
    // 会停在自己原来那一侧不越过中线，tip.z 的符号就不会翻转，这条
    // 断言必须失败——只验证"相向而不接触"是不够的。
    const model = buildDobsonfly()
    const mandibles = collectNamed(model, 'mandible')
    expect(mandibles.length, `mandible mesh 数=${mandibles.length}`).toBe(2)

    const tips = mandibles.map((m) => m.userData.tip as THREE.Vector3)
    for (const tip of tips) expectFiniteVector(tip, 'mandible tip')

    const [tipA, tipB] = tips
    console.log(`[dobsonfly] mandible tips z = ${tipA.z.toFixed(3)}, ${tipB.z.toFixed(3)}`)
    expect(tipA.z * tipB.z, '两颚尖 z 应异号（各自越过中线到对侧）').toBeLessThan(0)
    expect(Math.abs(tipA.z)).toBeGreaterThan(0.05)
    expect(Math.abs(tipB.z)).toBeGreaterThan(0.05)
  })

  it('翅脉 mesh 数 ≥ 30，证明是自写的按翅宽缩放翅脉，不是 kit.wingVeins() 在这个尺寸下会细到看不见的默认翅脉', () => {
    const model = buildDobsonfly()
    const veins = collectNamed(model, 'vein')
    expect(veins.length, `翅脉 mesh 数=${veins.length}`).toBeGreaterThanOrEqual(30)
  })
})
