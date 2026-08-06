/**
 * 蝉 / 飞蝗 / 萤火虫三个物种 builder 的健全性测试。
 *
 * 这里不追求「像不像」的美术评审（那得用眼睛看），只守三条程序化建模
 * 最容易踩的坑：
 *   1. loft() 出 NaN —— 通常是某个截面半径为 0 或首尾截面重合导致切线
 *      退化，一旦出现就是全模型崩坏，必须逐个 geometry 检查 position。
 *   2. 包围盒比例是否至少不违反物种最基本的体型特征（宽窄高矮的相对
 *      关系），能挡住"轴用反了"这类低级错误。
 *   3. anchors 是否齐全、坐标是否有限——hotspot 系统直接读这些坐标。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildCicada } from '../cicada'
import { buildLocust } from '../locust'
import { buildFirefly } from '../firefly'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

interface Scan {
  meshCount: number
  triangles: number
  nanMeshNames: string[]
  emissiveMats: { emissiveIntensity: number; emissiveHex: string }[]
}

/** 遍历模型的所有 mesh：查 NaN、数三角面、收集自发光材质信息 */
function scan(model: InsectModel): Scan {
  const result: Scan = { meshCount: 0, triangles: 0, nanMeshNames: [], emissiveMats: [] }
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!(mesh as THREE.Mesh).isMesh) return
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

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      const phys = m as THREE.MeshPhysicalMaterial
      if (phys && typeof phys.emissiveIntensity === 'number' && phys.emissiveIntensity > 1) {
        result.emissiveMats.push({
          emissiveIntensity: phys.emissiveIntensity,
          emissiveHex: phys.emissive ? `#${phys.emissive.getHexString()}` : '#000000',
        })
      }
    }
  })
  return result
}

function expectFiniteVector(v: THREE.Vector3, label: string) {
  expect(Number.isFinite(v.x), `${label}.x`).toBe(true)
  expect(Number.isFinite(v.y), `${label}.y`).toBe(true)
  expect(Number.isFinite(v.z), `${label}.z`).toBe(true)
}

function expectAnchors(model: InsectModel, required: string[]) {
  for (const key of required) {
    expect(model.anchors, `缺少 anchor: ${key}`).toHaveProperty(key)
    expectFiniteVector(model.anchors[key], `anchors.${key}`)
  }
}

/** 收集 group 中所有指定 name 的 mesh，合并出它们的世界包围盒 */
function unionBoxByNames(model: InsectModel, names: string[]): THREE.Box3 {
  const box = new THREE.Box3()
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh && names.includes(mesh.name)) {
      box.union(new THREE.Box3().setFromObject(mesh))
    }
  })
  return box
}

/** 找到第一个匹配 name 的 mesh，取不到则抛错（测试里用来定位关键部件） */
function findMeshByName(model: InsectModel, name: string): THREE.Mesh {
  let found: THREE.Mesh | undefined
  model.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (!found && mesh.isMesh && mesh.name === name) found = mesh
  })
  if (!found) throw new Error(`找不到 name="${name}" 的 mesh`)
  return found
}

/** 顶点到一条线段所在直线的垂直距离的最大值——用来从真实几何体量取"最粗处半径" */
function maxPerpDistanceToLine(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): number {
  const axis = new THREE.Vector3().subVectors(b, a).normalize()
  const pos = mesh.geometry.getAttribute('position')
  let maxDist = 0
  const v = new THREE.Vector3()
  const rel = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    rel.subVectors(v, a)
    const along = rel.dot(axis)
    const perp = rel.clone().addScaledVector(axis, -along)
    maxDist = Math.max(maxDist, perp.length())
  }
  return maxDist
}

/**
 * 只统计沿轴向投影落在 [tTarget-tol, tTarget+tol]*len 窗口内的顶点，
 * 取其最大垂距——用来量"腿节靠近某一端的粗细"，不受内部 loft 分段数
 * 细节影响（不依赖具体 ring 索引，只按沿轴位置筛选）。
 */
function radiusNearT(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, tTarget: number, tol = 0.04): number {
  const full = new THREE.Vector3().subVectors(b, a)
  const len = full.length()
  const axis = full.clone().normalize()
  const pos = mesh.geometry.getAttribute('position')
  let maxDist = 0
  const v = new THREE.Vector3()
  const rel = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    rel.subVectors(v, a)
    const along = rel.dot(axis)
    const t = along / len
    if (Math.abs(t - tTarget) > tol) continue
    const perp = rel.clone().addScaledVector(axis, -along)
    maxDist = Math.max(maxDist, perp.length())
  }
  return maxDist
}

describe('黑蚱蝉 buildCicada', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildCicada()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[cicada] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('包围盒比例符合"宽阔头胸+屋脊状翅覆盖"体型：翅展横向宽度 > 体高', () => {
    const model = buildCicada()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)

    // 体长（前后，X）应在 3~6cm 量级，对应"体长约 4.5cm"再加喙/翅稍许外扩
    expect(size.x).toBeGreaterThan(3)
    expect(size.x).toBeLessThan(6.5)
    // 屋脊状双翅从翅基向两侧下斜覆盖，横向宽度应明显大于体高（不是竖直耸立的虫）
    expect(size.z).toBeGreaterThan(size.y)
  })

  it('anchors 齐全：tymbal/wing/eye/rostrum/head/abdomen', () => {
    expectAnchors(buildCicada(), ['tymbal', 'wing', 'eye', 'rostrum', 'head', 'abdomen'])
  })
})

describe('东亚飞蝗 buildLocust', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildLocust()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[locust] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('包围盒比例符合"折叠跳跃腿"体型：因后足膝部高高翘起，体高不能太扁', () => {
    const model = buildLocust()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)

    // 体长约 5cm，含头/腹/前伸的触角与后蹬的腿，整体量级应在 4~7cm
    expect(size.x).toBeGreaterThan(4)
    expect(size.x).toBeLessThan(7.5)
    // Λ 形折叠的后足膝部比身体本身还高，体高/体长比值不应过小
    expect(size.y / size.x).toBeGreaterThan(0.25)
  })

  it('后足腿节最粗处直径 ≥ 全长的 1/3（跳跃肌比例，一眼可辨），远比前中足粗', () => {
    // 2026-08 修复：旧版 maxR=len/6（直径恰好=1/3）且两端用纯 sin 收尖到
    // 接近 0，导致"最粗处"只是中段一小段鼓包，视觉上读不出粗壮股节。
    // 新版 maxR=len/5.2（直径≈len/2.6），且 28%~74% 保持满宽的平台包络。
    // 这里不再只是重算公式常数（那样改了公式却忘改测试也会"测试永远绿"），
    // 而是直接从 jumpingFemur 生成的真实几何体量取最粗处到腿轴的垂距，
    // 这样如果有人把包络改回"两端收尖到 0"、或把 maxR 缩回 1/3 以下，
    // 这条断言能真正抓到。
    const model = buildLocust()
    const femurMesh = findMeshByName(model, 'jumping-femur')

    const hip = new THREE.Vector3(0.62, -0.06, 0.34)
    const femurDir = new THREE.Vector3(-0.82, 0.46, 0.15).normalize()
    const femurLen = 2.05
    const knee = hip.clone().addScaledVector(femurDir, femurLen)

    const maxRadius = maxPerpDistanceToLine(femurMesh, hip, knee)
    const maxDiameter = maxRadius * 2
    console.log(`[locust] femur maxDiameter=${maxDiameter.toFixed(3)} len=${femurLen} ratio=${(maxDiameter / femurLen).toFixed(3)}`)
    expect(maxDiameter / femurLen).toBeGreaterThanOrEqual(1 / 3)

    // 只看"全长最粗处"不够：旧版恰好卡在 1/3 边界，且两端迅速收尖到
    // 近似 0——单看峰值达标，靠近两端时腿节骤然变细成"点"，视觉上仍是
    // "细腿中间鼓一坨"。这里额外量取靠近基节(5%处)与膝关节(95%处)的
    // 局部半径，要求不低于峰值的 28%，直接抓住"两端不能收尖"这件事。
    const nearHip = radiusNearT(femurMesh, hip, knee, 0.05)
    const nearKnee = radiusNearT(femurMesh, hip, knee, 0.95)
    expect(nearHip / maxRadius).toBeGreaterThan(0.28)
    expect(nearKnee / maxRadius).toBeGreaterThan(0.28)

    // 前中足用 kit.legPair 的默认比例（thickness*1.45 为腿节最粗处半径），
    // 明显比跳跃腿细，形成"一眼看出后腿特别粗"的对比。
    const midFemurRadius = 0.048 * 1.45
    expect(maxRadius).toBeGreaterThan(midFemurRadius * 2)
  })

  it('后足膝关节明显高过身体背线（前胸背板/头顶）——Λ 形折叠清晰可辨', () => {
    // 2026-08 修复：旧版 tibiaDir 与 femurDir 接近反向（夹角~155°），
    // 折叠后内夹角只有~25°，胫节几乎贴着股节折回去，从外观上更像一条
    // 弯曲的细线而非清晰的"Λ"。这里检查膝盖高度明显高于身体背线，
    // 是本物种"折叠跳跃腿"最基本的姿态断言，防止后续回归。
    const model = buildLocust()
    const bodyTop = unionBoxByNames(model, ['pronotum-saddle', 'head-capsule'])
    expect(bodyTop.isEmpty()).toBe(false)
    expect(model.anchors.hindleg.y).toBeGreaterThan(bodyTop.max.y)
  })

  it('anchors 齐全：hindleg/wing/tympanum/eye/antenna/pronotum', () => {
    expectAnchors(buildLocust(), ['hindleg', 'wing', 'tympanum', 'eye', 'antenna', 'pronotum'])
  })
})

describe('萤火虫 buildFirefly', () => {
  it('构建不抛异常，几何体无 NaN，radius 合理', () => {
    const model = buildFirefly()
    expect(model.radius).toBeGreaterThan(0)

    const s = scan(model)
    expect(s.nanMeshNames, `含 NaN 的 mesh: ${s.nanMeshNames.join(', ')}`).toHaveLength(0)
    expect(s.meshCount).toBeGreaterThan(0)
    console.log(`[firefly] mesh=${s.meshCount} triangles=${Math.round(s.triangles)}`)
    expect(s.triangles).toBeLessThanOrEqual(TRIANGLE_BUDGET)
  })

  it('身体明显背腹压扁：体高 < 体宽', () => {
    const model = buildFirefly()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)

    // 体长约 1.5cm 量级
    expect(size.x).toBeGreaterThan(1)
    expect(size.x).toBeLessThan(2.5)
    // flat>1 的压扁效果：上下方向（Y）应明显小于左右方向（Z）
    expect(size.y).toBeLessThan(size.z)
  })

  it('发光器真的在发光：至少一个材质 emissiveIntensity > 1 且 emissive 非黑', () => {
    const s = scan(buildFirefly())
    expect(s.emissiveMats.length, '没有找到任何强自发光材质——发光器没做出来').toBeGreaterThan(0)
    for (const m of s.emissiveMats) {
      expect(m.emissiveIntensity).toBeGreaterThan(1)
      expect(m.emissiveHex).not.toBe('#000000')
    }
  })

  it('anchors 齐全：lantern/elytra/eye/antenna/thorax/leg', () => {
    expectAnchors(buildFirefly(), ['lantern', 'elytra', 'eye', 'antenna', 'thorax', 'leg'])
  })

  it('前胸盾片是扁平薄盾，不是两个并排大椭球：宽度不超过鞘翅、厚度远小于宽度', () => {
    // 2026-08 修复：旧版盾片用 flat=1.62 的 spindle，宽度(0.972)已经
    // 逼近/超过鞘翅最宽处(~0.95)，厚度(0.37)也达到宽度的 38%——不是
    // "薄盾"该有的比例，看起来像两团圆滚滚的粉色球体贴在一起。
    const model = buildFirefly()
    const shieldBox = unionBoxByNames(model, ['pronotum-shield'])
    const elytraBox = unionBoxByNames(model, ['elytron-shell'])
    expect(shieldBox.isEmpty()).toBe(false)
    expect(elytraBox.isEmpty()).toBe(false)

    const shieldSize = new THREE.Vector3()
    shieldBox.getSize(shieldSize)
    const elytraSize = new THREE.Vector3()
    elytraBox.getSize(elytraSize)

    console.log(`[firefly] shield width=${shieldSize.z.toFixed(3)} thickness=${shieldSize.y.toFixed(3)} elytra width=${elytraSize.z.toFixed(3)}`)
    // 宽度（左右，Z）不超过鞘翅最宽处
    expect(shieldSize.z).toBeLessThanOrEqual(elytraSize.z)
    // 很薄：厚度（上下，Y）明显小于宽度——扁平 loft 截面的核心判据
    expect(shieldSize.y).toBeLessThan(shieldSize.z / 3)
  })

  it('发光器在腹面末端：几何中心低于腹部中轴，且底缘凸出在局部腹面之下', () => {
    // 2026-08 修复：确认发光器确实凸出在腹部下方（而不是被腹部包住、
    // 从侧面看不见）。用腹部这一节自身的包围盒中心 y 作为"背腹中轴"
    // 参照——发光器中心应明显低于它。
    //
    // "凸出"要跟发光器所在 X 位置的局部腹面比，而不是跟腹部全长的
    // 最低点比——腹部越往后越细，若拿前段最粗处的底缘当基准，后段
    // 一个真正凸出的发光器也可能"够不到"那么低，误判为没凸出。这里
    // 直接照抄 firefly.ts 里 abdomen() 的包络公式重算局部半径（与
    // locust 后足腿节测试同样的做法：改公式常数要同时改这里）。
    const model = buildFirefly()
    const abdomenBox = unionBoxByNames(model, ['abdomen-body'])
    expect(abdomenBox.isEmpty()).toBe(false)
    const abdomenCenter = new THREE.Vector3()
    abdomenBox.getCenter(abdomenCenter)

    const abdomenFrom = new THREE.Vector3(0.02, -0.02, 0)
    const abdomenTo = new THREE.Vector3(-0.86, 0.02, 0)
    function abdomenLocalBottomY(x: number): number {
      const t = (x - abdomenFrom.x) / (abdomenTo.x - abdomenFrom.x)
      const env = t < 0.22 ? THREE.MathUtils.lerp(0.19, 0.24, t / 0.22) : THREE.MathUtils.lerp(0.24, 0.03, (t - 0.22) / 0.78)
      const ry = env / 1.55
      const backboneY = THREE.MathUtils.lerp(abdomenFrom.y, abdomenTo.y, t)
      return backboneY - ry
    }

    let lanternCount = 0
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || mesh.name !== 'lantern') return
      lanternCount++
      const b = new THREE.Box3().setFromObject(mesh)
      const c = new THREE.Vector3()
      b.getCenter(c)
      expect(c.y, '发光器几何中心应低于腹部中轴（在身体下半部/腹面）').toBeLessThan(abdomenCenter.y)
      const localBottom = abdomenLocalBottomY(c.x)
      expect(b.min.y, '发光器应凸出所在位置的局部腹面之下，从侧面才看得见').toBeLessThan(localBottom)
    })
    expect(lanternCount, '没有找到 name="lantern" 的发光器 mesh').toBeGreaterThan(0)
  })
})
