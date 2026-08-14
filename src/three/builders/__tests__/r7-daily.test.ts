/**
 * 第 7 轮「日常昆虫」三个新物种的 builder 验证（家蝇、淡色库蚊、德国小蠊）。
 *
 * 通规：能构建不抛异常；顶点无 NaN/Infinity；包围球半径 > 0；anchors 恰好是
 * 数据层要求的 key 集合；三角面数 ≤ 15 万；触角挂了微动钩子。
 *
 * 招牌断言全部量「看得见的量」（网格包围盒 / mesh 计数 / 材质明度差），
 * 不复述 builder 参数；「长」的特征上下限齐给（天蛾喙只给下限长成标枪的教训）：
 *
 * 家蝇：胸背纵纹恰好 4 条且沿体轴拉长（X 跨度 ≥ 2.5 倍 Z 跨度），纹与底色的
 * HSL 明度差 ≥ 0.3（第 5 轮「深灰叠深灰」的教训——对比要量出来）；舐吸喙短粗
 * 下垂：喙 + 唇瓣的 Y 向下探 / 体长 ∈ [0.14, 0.4]（下限保证真有喙，上限防标枪），
 * 唇瓣恰好 2 枚；翅面恰好 2 片且停歇后收（翅前缘不越过胸前端、翅尖抵达尾区）；
 * 爪垫 12 枚（6 足 × 2）且为浅色。
 *
 * 淡色库蚊：刺吸喙长 / (头 + 胸) ∈ [0.85, 1.35]——「约等于头胸之和」的上下限；
 * 体轴与停面平行：腹部包围盒中心与胸中心的 Y 差 ≤ 0.15 倍腹长（按蚊式翘尾会砸掉
 * 这条）；腹节淡色横带 ≥ 6 环且带色与主节明度差 ≥ 0.2；六条 'mosquitoLeg'，
 * 每条包围盒对角线 / 体长 ∈ [0.95, 1.9]；触角轮毛 ≥ 16 根；翅面恰好 2 片后收。
 *
 * 德国小蠊：前胸背板纹恰好 2 条、沿体轴拉长、与背板底色明度差 ≥ 0.3；体扁平：
 * 躯干（背板 + 覆翅 + 腹 + 头）Y 跨度 ≤ 0.26 倍 X 跨度；头藏于背板：头顶低于
 * 背板顶 且头的 X 范围与背板投影重叠 ≥ 40%；触角包围盒对角线 ∈ [0.65, 1.4] 倍
 * 体长且伸出头前、侧向铺开 ≥ 0.35 倍体长（弧线全长 1.7 超过体长，包围盒量的是
 * 可见的横扫幅度）；尾须恰好 2 根且伸出覆翅尾端之外；覆翅盖过腹端。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildHouseFly } from '../house-fly'
import { buildMosquito } from '../mosquito'
import { buildCockroach } from '../cockroach'
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
        break
      }
    }
    triangles += geo.index ? geo.index.count / 3 : pos.count / 3
  })
  return { nanFound, triangles }
}

function checkAnchorsExact(model: InsectModel, requiredKeys: string[]) {
  const actualKeys = Object.keys(model.anchors).sort()
  const expectedKeys = [...requiredKeys].sort()
  expect(actualKeys, `anchors 应恰好是 [${expectedKeys.join(', ')}]`).toEqual(expectedKeys)
  for (const key of requiredKeys) {
    const v = model.anchors[key]
    expect(v).toBeInstanceOf(THREE.Vector3)
    expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${key} 坐标非有限`).toBe(true)
  }
}

/** 按 mesh.name 收集世界坐标并集包围盒 */
function unionBoxByName(group: THREE.Group, ...names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  group.updateMatrixWorld(true)
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && names.includes(mesh.name)) box.union(new THREE.Box3().setFromObject(mesh))
  })
  return box
}

function countMeshByName(group: THREE.Group, name: string): number {
  let n = 0
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) n++
  })
  return n
}

function meshesByName(group: THREE.Group, name: string): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && mesh.name === name) out.push(mesh)
  })
  return out
}

/**
 * 某个命名 mesh 材质的 HSL 明度（多材质取第一份）。
 * 显式按 sRGB 量取：three 的颜色管理把 hex 转进线性工作空间，缺省 getHSL
 * 返回线性明度，深色被压扁（#211d1a 线性 L≈0.015），阈值会失真。
 */
function lightnessOf(group: THREE.Group, name: string): number {
  const mesh = meshesByName(group, name)[0]
  expect(mesh, `找不到名为 ${name} 的 mesh`).toBeDefined()
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
  const hsl = { h: 0, s: 0, l: 0 }
  mat.color.getHSL(hsl, THREE.SRGBColorSpace)
  return hsl.l
}

function antennaHooks(group: THREE.Group): number {
  let hooks = 0
  group.traverse((o) => {
    if (o.name === 'antenna' && Array.isArray(o.userData?.base)) hooks++
  })
  return hooks
}

// ---------------------------------------------------------------- 家蝇

describe('家蝇 buildHouseFly', () => {
  const model = buildHouseFly()
  const g = model.group

  it('通规：几何合法、面数在预算内、anchors 恰好匹配', () => {
    const { nanFound, triangles } = inspectGeometry(g)
    expect(nanFound).toEqual([])
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0)
    checkAnchorsExact(model, ['stripe', 'eye', 'proboscis', 'antenna', 'wing', 'pulvillus'])
    expect(antennaHooks(g)).toBeGreaterThanOrEqual(2)
  })

  it('招牌：胸背恰好 4 条纵纹，沿体轴拉长，与灰底真的拉开明度差', () => {
    expect(countMeshByName(g, 'thorax-stripe')).toBe(4)
    for (const stripe of meshesByName(g, 'thorax-stripe')) {
      const box = new THREE.Box3().setFromObject(stripe)
      const size = new THREE.Vector3()
      box.getSize(size)
      expect(size.x, '纹应沿体轴（X）拉长').toBeGreaterThanOrEqual(size.z * 2.5)
    }
    const diff = lightnessOf(g, 'thorax') - lightnessOf(g, 'thorax-stripe')
    expect(diff, '纹与底色的明度差被压没了（第 5 轮的深灰叠深灰）').toBeGreaterThanOrEqual(0.3)
  })

  it('舐吸式口器：短粗下垂 + 恰好一对唇瓣，绝不是刺吸针', () => {
    expect(countMeshByName(g, 'labella')).toBe(2)
    const probBox = unionBoxByName(g, 'proboscis', 'labella')
    const bodyBox = unionBoxByName(g, 'thorax', 'abdomen', 'head')
    const bodyLen = bodyBox.max.x - bodyBox.min.x
    const drop = probBox.max.y - probBox.min.y
    expect(drop / bodyLen, '喙的下垂量下限（真有一支喙）').toBeGreaterThanOrEqual(0.14)
    expect(drop / bodyLen, '喙的下垂量上限（防长成标枪/吸管）').toBeLessThanOrEqual(0.4)
  })

  it('双翅目底线：恰好 2 片翅面，停歇时后收（前缘不越胸前端、翅尖抵尾区）', () => {
    expect(countMeshByName(g, 'wing-membrane')).toBe(2)
    const wingBox = unionBoxByName(g, 'wing-membrane')
    const thoraxBox = unionBoxByName(g, 'thorax')
    const abdomenBox = unionBoxByName(g, 'abdomen')
    expect(wingBox.max.x, '翅前缘不应伸到胸前端之前（那是飞行姿态）').toBeLessThanOrEqual(thoraxBox.max.x + 0.02)
    expect(wingBox.min.x, '翅尖应抵达腹部尾区').toBeLessThanOrEqual(abdomenBox.min.x + 0.12)
  })

  it('爪垫：6 足各一对浅色小垫（倒走天花板的本钱）', () => {
    expect(countMeshByName(g, 'pulvillus')).toBe(12)
    expect(lightnessOf(g, 'pulvillus')).toBeGreaterThanOrEqual(0.6)
  })
})

// ---------------------------------------------------------------- 淡色库蚊

describe('淡色库蚊 buildMosquito', () => {
  const model = buildMosquito()
  const g = model.group

  it('通规：几何合法、面数在预算内、anchors 恰好匹配', () => {
    const { nanFound, triangles } = inspectGeometry(g)
    expect(nanFound).toEqual([])
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0)
    checkAnchorsExact(model, ['proboscis', 'antenna', 'band', 'wing', 'leg', 'haltere'])
    expect(antennaHooks(g)).toBeGreaterThanOrEqual(2)
  })

  it('招牌：刺吸喙长约等于头 + 胸——上下限都钉住，不做标枪', () => {
    const probBox = unionBoxByName(g, 'proboscis')
    const headThoraxBox = unionBoxByName(g, 'head', 'thorax')
    const probLen = probBox.max.x - probBox.min.x
    const htLen = headThoraxBox.max.x - headThoraxBox.min.x
    expect(probLen / htLen, '喙长下限：至少 0.85 倍头胸之和').toBeGreaterThanOrEqual(0.85)
    expect(probLen / htLen, '喙长上限：不超过 1.35 倍头胸之和（天蛾标枪的教训）').toBeLessThanOrEqual(1.35)
  })

  it('停歇姿态：体轴与停面大致平行（库蚊属特征，按蚊式翘尾会砸掉这条）', () => {
    const abdomenBox = unionBoxByName(g, 'abdomen-seg', 'pale-band')
    const thoraxBox = unionBoxByName(g, 'thorax')
    const abdomenLen = abdomenBox.max.x - abdomenBox.min.x
    const abdomenCenterY = (abdomenBox.max.y + abdomenBox.min.y) / 2
    const thoraxCenterY = (thoraxBox.max.y + thoraxBox.min.y) / 2
    expect(Math.abs(abdomenCenterY - thoraxCenterY) / abdomenLen).toBeLessThanOrEqual(0.15)
  })

  it('招牌：腹节基部淡色横带 ≥ 6 环，带色与主节明度差 ≥ 0.2', () => {
    expect(countMeshByName(g, 'pale-band')).toBeGreaterThanOrEqual(6)
    const diff = lightnessOf(g, 'pale-band') - lightnessOf(g, 'abdomen-seg')
    expect(diff, '「淡色」横带的明度差被压没了').toBeGreaterThanOrEqual(0.2)
  })

  it('六足极细长：每条伸展对角线 ∈ [0.95, 1.9] 倍体长', () => {
    const legs: THREE.Group[] = []
    g.traverse((o) => {
      if (o.name === 'mosquitoLeg') legs.push(o as THREE.Group)
    })
    expect(legs.length).toBe(6)
    const bodyBox = unionBoxByName(g, 'head', 'thorax', 'abdomen-seg', 'pale-band')
    const bodyLen = bodyBox.max.x - bodyBox.min.x
    for (const leg of legs) {
      const box = new THREE.Box3().setFromObject(leg)
      const size = new THREE.Vector3()
      box.getSize(size)
      const diag = size.length()
      expect(diag / bodyLen, '细长足下限').toBeGreaterThanOrEqual(0.95)
      expect(diag / bodyLen, '细长足上限（防长成蜘蛛）').toBeLessThanOrEqual(1.9)
    }
  })

  it('雌虫触角具稀疏轮毛（≥ 16 根短毛）；一对翅面停歇后收', () => {
    expect(countMeshByName(g, 'whorl-hair')).toBeGreaterThanOrEqual(16)
    expect(countMeshByName(g, 'wing-membrane')).toBe(2)
    const wingBox = unionBoxByName(g, 'wing-membrane')
    const thoraxBox = unionBoxByName(g, 'thorax')
    expect(wingBox.max.x, '翅前缘不越胸前端（后收停歇位）').toBeLessThanOrEqual(thoraxBox.max.x + 0.05)
  })
})

// ---------------------------------------------------------------- 德国小蠊

describe('德国小蠊 buildCockroach', () => {
  const model = buildCockroach()
  const g = model.group

  it('通规：几何合法、面数在预算内、anchors 恰好匹配', () => {
    const { nanFound, triangles } = inspectGeometry(g)
    expect(nanFound).toEqual([])
    expect(triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
    expect(model.radius).toBeGreaterThan(0)
    checkAnchorsExact(model, ['stripe', 'head', 'antenna', 'wing', 'cercus', 'leg'])
    expect(antennaHooks(g)).toBeGreaterThanOrEqual(2)
  })

  it('招牌：前胸背板恰好 2 条纵纹，沿体轴拉长，与琥珀底色真的拉开明度差', () => {
    expect(countMeshByName(g, 'pronotum-stripe')).toBe(2)
    for (const stripe of meshesByName(g, 'pronotum-stripe')) {
      const box = new THREE.Box3().setFromObject(stripe)
      const size = new THREE.Vector3()
      box.getSize(size)
      expect(size.x, '纹应沿体轴（X）拉长').toBeGreaterThanOrEqual(size.z * 2)
    }
    const diff = lightnessOf(g, 'pronotum') - lightnessOf(g, 'pronotum-stripe')
    expect(diff, '双纹与背板底色的明度差被压没了').toBeGreaterThanOrEqual(0.3)
  })

  it('体扁平：躯干高度 ≤ 0.26 倍体长（圆桶感在这里现形）', () => {
    const bodyBox = unionBoxByName(g, 'pronotum', 'tegmen', 'abdomen', 'head')
    const size = new THREE.Vector3()
    bodyBox.getSize(size)
    expect(size.y / size.x).toBeLessThanOrEqual(0.26)
  })

  it('头大部分被前胸背板盖住：头顶低于背板顶，且头的 X 范围与背板投影重叠 ≥ 40%', () => {
    const headBox = unionBoxByName(g, 'head')
    const pronotumBox = unionBoxByName(g, 'pronotum')
    expect(headBox.max.y, '头顶应低于背板最高点').toBeLessThanOrEqual(pronotumBox.max.y - 0.02)
    const overlap = Math.min(headBox.max.x, pronotumBox.max.x) - Math.max(headBox.min.x, pronotumBox.min.x)
    const headSpan = headBox.max.x - headBox.min.x
    expect(overlap / headSpan, '背视头应大半藏进背板投影').toBeGreaterThanOrEqual(0.4)
  })

  it('丝状长触角：两根，横扫幅度 ∈ [0.65, 1.4] 倍体长，伸出头前、侧向铺开', () => {
    const antennae: THREE.Group[] = []
    g.traverse((o) => {
      if (o.name === 'antenna' && Array.isArray(o.userData?.base)) antennae.push(o as THREE.Group)
    })
    expect(antennae.length).toBe(2)
    const bodyBox = unionBoxByName(g, 'pronotum', 'tegmen', 'abdomen', 'head')
    const bodyLen = bodyBox.max.x - bodyBox.min.x
    const headBox = unionBoxByName(g, 'head')
    for (const ant of antennae) {
      const box = new THREE.Box3().setFromObject(ant)
      const size = new THREE.Vector3()
      box.getSize(size)
      expect(size.length() / bodyLen, '触角横扫幅度下限').toBeGreaterThanOrEqual(0.65)
      expect(size.length() / bodyLen, '触角横扫幅度上限').toBeLessThanOrEqual(1.4)
      expect(box.max.x, '触角应伸出头前').toBeGreaterThanOrEqual(headBox.max.x)
      expect(size.z / bodyLen, '触角应侧向铺开').toBeGreaterThanOrEqual(0.35)
    }
  })

  it('一对尾须伸出覆翅尾端之外；覆翅盖过整个腹部', () => {
    expect(countMeshByName(g, 'cercus')).toBe(2)
    const cercusBox = unionBoxByName(g, 'cercus')
    const tegmenBox = unionBoxByName(g, 'tegmen')
    const abdomenBox = unionBoxByName(g, 'abdomen')
    expect(cercusBox.min.x, '尾须应伸出覆翅尾端').toBeLessThanOrEqual(tegmenBox.min.x - 0.03)
    expect(tegmenBox.min.x, '覆翅应盖过腹端').toBeLessThanOrEqual(abdomenBox.min.x)
  })
})
