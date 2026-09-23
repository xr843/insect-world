/**
 * 棒䗛生活史两阶段（卵 / 若虫）的形态验证。
 *
 * 写每一条之前的自检只有一句：**把实现改坏，这条会不会红？**
 * 每条断言旁注了它拦的是哪一种改坏法 —— 那是逐条做过变异测试的记录
 * （改坏 → 跑 → 确认红 → 还原），不是修辞。
 *
 * 本仓库买来的两条教训，这份测试通篇按它们写：
 *
 * 1. **断言量的是数字，人看的是长相。** 所以「大小」类断言一律上下限齐给，
 *    「看得见」类断言换算成**占画面的比例**（取景按 radius 归一化）。
 * 2. **有向的断言比「差多少」值钱。** 「A 比 B 亮」一律写成有向的。
 *
 * 跨阶段的对照（若虫 vs 成虫）直接构建 `buildStickInsect()` 来量，不写死常数：
 * 「若虫是缩小版成虫」「若虫头相对更大」这些话本来就是关于两者**关系**的。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildStickInsectEgg } from '../stages/stick-insect-egg'
import { buildStickInsectNymph } from '../stages/stick-insect-nymph'
import { buildStickInsect } from '../stick-insect'
import type { InsectModel } from '../kit'

const TRIANGLE_BUDGET = 150_000

const egg = buildStickInsectEgg()
const nymph = buildStickInsectNymph()
const adult = buildStickInsect()

/** 成虫图鉴 hotspot 用的锚点名。展台按名字把成虫的卡片贴到当前模型上 */
const ADULT_ANCHORS = ['body', 'leg', 'antenna', 'head', 'thorax', 'camouflage']

// ---------------------------------------------------------------- 测量工具

function meshesByName(model: InsectModel, ...names: string[]): THREE.Mesh[] {
  const out: THREE.Mesh[] = []
  model.group.updateMatrixWorld(true)
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && names.includes(m.name)) out.push(m)
  })
  return out
}

function boxOf(objs: THREE.Object3D[]): THREE.Box3 {
  const box = new THREE.Box3()
  for (const o of objs) box.union(new THREE.Box3().setFromObject(o))
  return box
}

function sizeOf(objs: THREE.Object3D[]): THREE.Vector3 {
  return boxOf(objs).getSize(new THREE.Vector3())
}

/** 几何自己的局部顶点（不乘任何变换） */
function localVerts(mesh: THREE.Mesh): THREE.Vector3[] {
  const pos = mesh.geometry.getAttribute('position')
  const out: THREE.Vector3[] = []
  for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i))
  return out
}

function localBox(mesh: THREE.Mesh): THREE.Box3 {
  return new THREE.Box3().setFromPoints(localVerts(mesh))
}

/** 材质基色的 HSL，显式 sRGB（缺省 getHSL 给的是线性明度，深色会被压扁） */
function hslOfColor(c: THREE.Color): { h: number; s: number; l: number } {
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl, THREE.SRGBColorSpace)
  return { h: hsl.h * 360, s: hsl.s, l: hsl.l }
}

function matColor(mesh: THREE.Mesh): THREE.Color {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshPhysicalMaterial
  return mat.color
}

function hslByName(model: InsectModel, name: string) {
  const m = meshesByName(model, name)[0]
  expect(m, `找不到名为 ${name} 的网格`).toBeDefined()
  return hslOfColor(matColor(m))
}

function inspect(model: InsectModel): { triangles: number; nan: number; meshes: number } {
  let triangles = 0
  let nan = 0
  let meshes = 0
  model.group.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    meshes++
    const pos = m.geometry.getAttribute('position')
    triangles += m.geometry.index ? m.geometry.index.count / 3 : pos.count / 3
    const arr = pos.array
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) nan++
  })
  return { triangles, nan, meshes }
}

/** 锚点离实体多远（占包围半径的比例），判据同全站闸门 anchors-have-geometry.test.ts */
function detachRatio(model: InsectModel, anchor: THREE.Vector3): number {
  model.group.updateMatrixWorld(true)
  const v = new THREE.Vector3()
  const box = new THREE.Box3()
  let best = Infinity
  model.group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    box.setFromObject(mesh)
    best = Math.min(best, box.distanceToPoint(anchor))
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i)
      mesh.localToWorld(v)
      best = Math.min(best, v.distanceTo(anchor))
    }
  })
  return best / Math.max(model.radius, 1e-6)
}

// ---------------------------------------------------------------- 通规

describe('两个阶段的通用契约', () => {
  const all: [string, InsectModel][] = [
    ['卵', egg],
    ['若虫', nymph],
  ]

  it.each(all)('%s：有实体、无 NaN、面数在预算内', (_name, model) => {
    const { triangles, nan, meshes } = inspect(model)
    expect(meshes).toBeGreaterThan(0)
    expect(nan, 'NaN/Inf 顶点会让整个模型静默变成空白').toBe(0)
    expect(triangles).toBeGreaterThan(0)
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET)
  })

  it.each(all)('%s：每个标注点底下都真的有几何体', (_name, model) => {
    const keys = Object.keys(model.anchors)
    expect(keys.length, '一个锚点都没有').toBeGreaterThan(0)
    const floating: string[] = []
    for (const k of keys) {
      const ratio = detachRatio(model, model.anchors[k])
      if (!(ratio <= 0.12)) floating.push(`${k}（离实体 ${ratio.toFixed(2)}×半径）`)
    }
    expect(floating, `这些标注点浮在空气里：${floating.join('、')}`).toEqual([])
  })
})

// ---------------------------------------------------------------- 卵

describe('卵：散落在土面上的「种子」', () => {
  const shells = meshesByName(egg, 'egg-shell')
  const lids = meshesByName(egg, 'operculum')
  const seams = meshesByName(egg, 'operculum-seam')
  const plates = meshesByName(egg, 'micropylar-plate')
  const cups = meshesByName(egg, 'micropylar-cup')
  const soil = meshesByName(egg, 'soil')
  const frame = 2 * egg.radius

  it('三粒卵，每粒都有盖、盖缝、卵孔板、卵孔杯', () => {
    expect(shells).toHaveLength(3)
    expect(lids, '卵盖是这粒卵的门，缺了就只是一粒豆子').toHaveLength(3)
    expect(seams).toHaveLength(3)
    expect(plates, '卵孔板是竹节虫卵最好认的结构').toHaveLength(3)
    expect(cups).toHaveLength(3)
  })

  it('单粒是一枚 2.6 毫米的长桶，不是被放大的道具、也不是球或棍', () => {
    const s = localBox(shells[0]).union(localBox(lids[0])).getSize(new THREE.Vector3())
    // 棒䗛属卵长约 2~3 毫米。上下限齐给：放大到「好看」是 stages.ts 明令禁止的
    expect(s.x, '卵长').toBeGreaterThan(0.22)
    expect(s.x).toBeLessThan(0.32)
    const slender = s.x / Math.max(s.y, s.z)
    expect(slender, '长径比：再胖就是一粒球，再瘦就是一截棍').toBeGreaterThan(1.6)
    expect(slender).toBeLessThan(2.4)
    // 略侧扁：背腹高 > 左右宽（改成圆断面这条会红）
    expect(s.y / s.z, '卵壳应略侧扁').toBeGreaterThan(1.05)
    expect(s.y / s.z).toBeLessThan(1.3)
  })

  it('前端平截：壳口半径明显小于最粗处，却不收成尖（卵盖要有地方放）', () => {
    const verts = localVerts(shells[0])
    const len = localBox(shells[0]).max.x
    const maxR = Math.max(...verts.map((v) => Math.hypot(v.y, v.z)))
    const mouthR = Math.max(...verts.filter((v) => v.x > len * 0.985).map((v) => Math.hypot(v.y, v.z)))
    expect(mouthR / maxR, '壳口收成了尖 —— 那是纺锤不是桶').toBeGreaterThan(0.55)
    expect(mouthR / maxR, '壳口与最粗处一样粗 —— 读成一截罐头').toBeLessThan(0.85)
  })

  it('卵盖：在前端、盖住壳口，是一面浅穹 —— 棒䗛属的卵盖没有头冠', () => {
    const shellBox = localBox(shells[0])
    const lb = localBox(lids[0])
    const ls = lb.getSize(new THREE.Vector3())
    const ss = shellBox.getSize(new THREE.Vector3())
    // 在前端（+X）：挪到别处这条会红
    expect(lb.min.x, '卵盖不在壳口上').toBeGreaterThan(shellBox.max.x - 0.01)
    // 盖住壳口：盖宽占卵宽 0.6~0.95
    expect(ls.y / ss.y).toBeGreaterThan(0.6)
    expect(ls.y / ss.y).toBeLessThan(0.95)
    /*
     * 没有头冠：盖只凸出一面浅穹。给盖顶加一个 capitulum 疙瘩（很多竹节虫有，
     * 但分类文献把「卵盖无头冠」列为棒䗛这一支的鉴别特征）这条会红。
     */
    expect(ls.x / ss.x, '卵盖凸出太多 —— 是不是长出了头冠').toBeLessThan(0.12)
    expect(ls.x / ss.x, '卵盖薄成一张纸，侧面看不出它').toBeGreaterThan(0.04)
    expect(meshesByName(egg, 'capitulum')).toHaveLength(0)
  })

  it('卵盖比壳浅、盖缝比两者都深 —— 浅贴浅的分界必须垫深色缝（有向）', () => {
    const lid = hslByName(egg, 'operculum')
    const seam = hslByName(egg, 'operculum-seam')
    const ridge = hslOfColor(matColor(shells[0]))
    expect(lid.l, '卵盖要比壳亮，才读得出是一枚盖子').toBeGreaterThan(ridge.l)
    expect(seam.l, '盖缝要真的深').toBeLessThan(0.2)
    expect(lid.l - seam.l).toBeGreaterThan(0.35)
  })

  it('招牌：卵孔板是背面一条狭长的浅色区 —— 贴着壳走，不是一块凸出的实体', () => {
    const shellBox = localBox(shells[0])
    const ss = shellBox.getSize(new THREE.Vector3())
    for (const plate of plates) {
      const pb = localBox(plate)
      const ps = pb.getSize(new THREE.Vector3())
      // 在背面（+Y）：挪到腹面这条会红
      expect(pb.min.y, '卵孔板不在背面').toBeGreaterThan(0)
      // 狭长：沿卵长占 45%~70%，宽只占卵宽的一小条
      expect(ps.x / ss.x, '卵孔板的长度').toBeGreaterThan(0.45)
      expect(ps.x / ss.x).toBeLessThan(0.7)
      expect(ps.z / ss.z, '卵孔板太宽了，成了半粒卵的另一种颜色').toBeLessThan(0.5)
      expect(ps.z / ss.z, '卵孔板窄成一条线').toBeGreaterThan(0.2)
    }
    /*
     * 贴着壳面：每个顶点离基准壳面（椭圆断面）的径向距离不超过 0.005 ——
     * 也就是网脊高度加一层皮。把 PLATE_LIFT 抬到 0.01（一块凸出的浅色实体，
     * 「瓢虫幼虫的斑做成塑料环」那个病）这条会红。
     */
    const shellVerts = localVerts(shells[0]).map((v) => ({ x: v.x, a: Math.atan2(v.z, v.y), r: Math.hypot(v.y, v.z) }))
    let worst = -Infinity
    let best = Infinity
    for (const v of localVerts(plates[0])) {
      const a = Math.atan2(v.z, v.y)
      const r = Math.hypot(v.y, v.z)
      const near = shellVerts.filter((s) => Math.abs(s.x - v.x) < 0.0035 && Math.abs(s.a - a) < 0.06)
      if (!near.length) continue
      const shellR = Math.max(...near.map((s) => s.r))
      worst = Math.max(worst, r - shellR)
      best = Math.min(best, r - shellR)
    }
    expect(worst, `卵孔板高出壳面 ${worst.toFixed(4)}，成了贴上去的一块`).toBeLessThan(0.004)
    expect(best, '卵孔板陷进壳里了，网纹会从板上透出来').toBeGreaterThan(-0.0015)
  })

  it('卵孔板后端分两叶、前端圆：中线处的后缘比两侧叶尖更靠前（缺口）', () => {
    const verts = localVerts(plates[0])
    const halfW = Math.max(...verts.map((v) => Math.abs(v.z)))
    const center = verts.filter((v) => Math.abs(v.z) < halfW * 0.12)
    const lobes = verts.filter((v) => Math.abs(v.z) > halfW * 0.35 && Math.abs(v.z) < halfW * 0.75)
    const notchX = Math.min(...center.map((v) => v.x))
    const lobeX = Math.min(...lobes.map((v) => v.x))
    // 把 PLATE_NOTCH 归零（后缘成一条直边）这条会红
    expect(notchX - lobeX, '后端没有分叶').toBeGreaterThan(0.008)
    // 前端圆头：中线最靠前，两侧退后
    const frontC = Math.max(...center.map((v) => v.x))
    const frontEdge = Math.max(...verts.filter((v) => Math.abs(v.z) > halfW * 0.85).map((v) => v.x))
    expect(frontC - frontEdge, '前端是平的，不是圆头').toBeGreaterThan(0.005)
  })

  it('卵孔板是全粒卵最亮的一块，比壳亮一大截；卵孔杯是深色的', () => {
    const plate = hslByName(egg, 'micropylar-plate')
    const ridge = hslOfColor(matColor(shells[0]))
    const cup = hslByName(egg, 'micropylar-cup')
    expect(plate.l, '卵孔板要接近米白').toBeGreaterThan(0.7)
    expect(plate.l - ridge.l, '卵孔板与壳的明度差 —— 差没了，招牌就在画面上消失了').toBeGreaterThan(0.2)
    expect(plate.l - cup.l).toBeGreaterThan(0.4)
  })

  it('壳面网纹：几何上真的凸起，且格心暗、网脊亮', () => {
    const shell = shells[0]
    const pos = shell.geometry.getAttribute('position')
    const col = shell.geometry.getAttribute('color')
    expect(col, '壳没有顶点色 —— 网纹的明暗没做').toBeDefined()
    expect((shell.material as THREE.MeshPhysicalMaterial).vertexColors, '材质没开顶点色，网纹颜色不生效').toBe(true)

    /*
     * 几何：中段一圈上，顶点到轴的距离相对椭圆基准的起伏。
     * 把 NET_RISE 归零（光壳）这条红；抬到 0.01（一层刺）上限红。
     */
    // 一环 = SHELL_RADIAL(120) + 1 个顶点。拿顶点色当掩码：1 = 脊顶，最暗 = 格心
    const RING = 121
    const rings = Math.floor(pos.count / RING)
    const mid = Math.floor(rings / 2)
    const c = new THREE.Color()
    let minR = Infinity
    for (let i = 0; i < col.count; i++) minR = Math.min(minR, col.getX(i))
    // 脊 = 顶点色过了「格心 → 1」的 60%；格 = 不到 20%
    const RIDGE = minR + (1 - minR) * 0.6
    const CELL = minR + (1 - minR) * 0.2
    let ridgeCount = 0
    let cellCount = 0
    for (let j = 0; j < RING; j++) {
      c.fromBufferAttribute(col, mid * RING + j)
      if (c.r > RIDGE) ridgeCount++
      if (c.r < CELL) cellCount++
    }
    expect(ridgeCount, '中段一圈上一道网脊都没有').toBeGreaterThan(8)
    expect(cellCount, '中段一圈全是网脊，没有格').toBeGreaterThan(20)

    // 网脊的几何高度：脊顶顶点比相邻格心顶点离轴更远
    let rise = 0
    let n = 0
    for (let j = 1; j < RING - 1; j++) {
      const idx = mid * RING + j
      c.fromBufferAttribute(col, idx)
      if (c.r < RIDGE) continue
      // 找同一环上最近的格心顶点
      for (let d = 1; d < 12; d++) {
        const k = mid * RING + j + d
        if (j + d >= RING) break
        c.fromBufferAttribute(col, k)
        if (c.r < CELL) {
          const p = new THREE.Vector3().fromBufferAttribute(pos, idx)
          const q = new THREE.Vector3().fromBufferAttribute(pos, k)
          // 两点方位角很近，椭圆基准半径差可忽略：差值主要是网脊高度
          rise += Math.hypot(p.y, p.z) - Math.hypot(q.y, q.z)
          n++
          break
        }
      }
    }
    const meanRise = rise / Math.max(n, 1)
    expect(n, '找不到脊—格配对').toBeGreaterThan(4)
    expect(meanRise, `网脊只高 ${meanRise.toFixed(4)} —— 光壳，逆光机位网纹整片消失`).toBeGreaterThan(0.001)
    expect(meanRise, '网脊太高，成了一层刺').toBeLessThan(0.006)

    // 颜色：格心（材质色 × 顶点色）比网脊暗一档以上，但不压成黑
    const ridgeC = matColor(shell)
    let cellIdx = 0
    for (let i = 0; i < col.count; i++) if (col.getX(i) === minR) cellIdx = i
    const cellC = new THREE.Color(ridgeC.r * col.getX(cellIdx), ridgeC.g * col.getY(cellIdx), ridgeC.b * col.getZ(cellIdx))
    const cell = hslOfColor(cellC)
    const ridge = hslOfColor(ridgeC)
    expect(ridge.l - cell.l, '网脊与格心的明度差 —— 差没了网纹就只剩几何').toBeGreaterThan(0.1)
    expect(ridge.l - cell.l, '明暗差太大，读成印花罐头').toBeLessThan(0.28)
    expect(cell.l, '格心压得太深 —— 「越深越保险」害过 10 只里 7 只').toBeGreaterThan(0.25)
    // 暖褐：色相落在褐区
    expect(cell.h).toBeGreaterThan(15)
    expect(cell.h).toBeLessThan(45)
  })

  it('网格不是整齐的蜂巢：格心有抖动，网纹不按格距周期重复', () => {
    /*
     * 严格六角格沿周向以一格为周期重复。一圈 120 段、22 格，半圈（60 段）恰好 11 格，
     * 所以严格格子下第 j 个顶点与第 j+60 个顶点的网脊色**完全相同**。
     * 量中段几环上这两者的平均差：严格格子（NET_JITTER=0）实测为 0，这条会红。
     * 第一版就是严格格子，出图读成一截印着蜂窝花纹的罐头。
     */
    const col = shells[0].geometry.getAttribute('color')
    const RING = 121
    const rings = Math.floor(col.count / RING)
    let sum = 0
    let n = 0
    for (let ring = Math.floor(rings * 0.3); ring < Math.floor(rings * 0.7); ring++) {
      for (let j = 0; j < 60; j++) {
        sum += Math.abs(col.getX(ring * RING + j) - col.getX(ring * RING + j + 60))
        n++
      }
    }
    const diff = sum / n
    expect(diff, `半圈错位后网纹几乎重合（平均差 ${diff.toFixed(3)}）—— 格子整齐划一`).toBeGreaterThan(0.03)
  })

  it('躺在土面上：每粒最低点都贴着土面，各朝各的方向', () => {
    const soilTop = boxOf(soil).max.y
    const eggs: THREE.Object3D[] = []
    egg.group.traverse((o) => {
      if (o.name === 'egg') eggs.push(o)
    })
    expect(eggs).toHaveLength(3)
    for (const e of eggs) {
      const minY = new THREE.Box3().setFromObject(e).min.y
      // 悬空的卵一眼就假；埋太深就只剩半粒
      expect(minY - soilTop, '卵悬在土面上方').toBeLessThan(0.002)
      expect(minY - soilTop, '卵埋进土里太深').toBeGreaterThan(-0.015)
    }
    // 三粒的长轴两两夹角都 > 25°：同向排开读成「摆好的一排」，那是瓢虫的产卵方式
    const axes = eggs.map((e) => new THREE.Vector3(1, 0, 0).applyQuaternion(e.quaternion))
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) {
        const ang = THREE.MathUtils.radToDeg(Math.acos(Math.abs(axes[i].dot(axes[j]))))
        expect(ang, `第 ${i + 1}、${j + 1} 粒几乎同向`).toBeGreaterThan(25)
      }
    }
    // 三粒卵之间不互相穿插：两两包围盒中心距 > 一粒卵宽
    const centers = shells.map((s) => new THREE.Box3().setFromObject(s).getCenter(new THREE.Vector3()))
    for (let i = 0; i < 3; i++) {
      for (let j = i + 1; j < 3; j++) expect(centers[i].distanceTo(centers[j])).toBeGreaterThan(0.14)
    }
    // 卵孔板朝向各异：至少一粒朝天（俯视机位看得见），至少一粒转到侧面
    const ups = plates.map((p) => {
      const c = localBox(p).getCenter(new THREE.Vector3())
      const w = c.clone().applyMatrix4(p.matrixWorld)
      const o = new THREE.Vector3(c.x, 0, 0).applyMatrix4(p.matrixWorld)
      return w.sub(o).normalize().y
    })
    expect(Math.max(...ups), '没有一粒的卵孔板朝上').toBeGreaterThan(0.9)
    expect(Math.min(...ups), '三粒卵孔板全朝天 —— 侧面的网纹没有一粒露出来').toBeLessThan(0.3)
  })

  it('卵是主角：土面不把取景撑开，也比卵浅得多（深卵落在深土上会消失）', () => {
    const cluster = boxOf(shells).getSize(new THREE.Vector3())
    expect(Math.max(cluster.x, cluster.z) / frame, '卵群在画面上缩成了几个点').toBeGreaterThan(0.5)
    const soilSize = sizeOf(soil)
    expect(Math.max(soilSize.x, soilSize.z) / Math.max(cluster.x, cluster.z), '土面比卵群大太多').toBeLessThan(1.8)
    const soilL = hslByName(egg, 'soil').l
    const ridgeL = hslOfColor(matColor(shells[0])).l
    expect(soilL - ridgeL, '土面与卵壳的明度差（有向：土要浅）').toBeGreaterThan(0.15)
  })

  it('尺度：整体半径在一小撮卵的量级', () => {
    expect(egg.radius).toBeGreaterThan(0.2)
    expect(egg.radius).toBeLessThan(0.5)
  })

  it('卵上没有任何成虫的锚点名 —— 否则成虫的卡片会贴到卵上', () => {
    for (const k of ADULT_ANCHORS) expect(Object.keys(egg.anchors), `卵上出现了成虫锚点 ${k}`).not.toContain(k)
    expect(Object.keys(egg.anchors).sort()).toEqual(['chorion', 'micropylarPlate', 'operculum', 'soil'])
  })
})

// ---------------------------------------------------------------- 若虫

describe('若虫：一截缩小的嫩枝 —— 与成虫一一对得上的部件', () => {
  const trunk = meshesByName(nymph, 'trunk-segment')
  const head = meshesByName(nymph, 'head-capsule')
  const aTrunk = meshesByName(adult, 'trunk-segment')
  const aHead = meshesByName(adult, 'head-capsule')
  const frame = 2 * nymph.radius

  const bodyLen = (t: THREE.Mesh[], h: THREE.Mesh[]) => boxOf(h).max.x - boxOf(t).min.x
  const maxDiam = (t: THREE.Mesh[]) => {
    const b = boxOf(t).getSize(new THREE.Vector3())
    return Math.max(b.y, b.z)
  }
  const nLen = bodyLen(trunk, head)
  const aLen = bodyLen(aTrunk, aHead)

  it('体长 4~5.2 厘米，明显小于成虫', () => {
    expect(nLen).toBeGreaterThan(4.0)
    expect(nLen).toBeLessThan(5.2)
    // 与成虫的量级差 —— 盯的是「按好看调尺度」
    expect(nLen / aLen, '若虫和成虫一样长了').toBeLessThan(0.6)
    expect(nLen / aLen, '小得像一龄，不是中龄').toBeGreaterThan(0.35)
    const rel = nymph.radius / adult.radius
    expect(rel).toBeGreaterThan(0.35)
    expect(rel).toBeLessThan(0.6)
  })

  it('缩小版成虫：同样 11 节躯干、6 条足、2 根丝状触角，且没有翅也没有翅芽', () => {
    expect(trunk.length, '躯干节数要与成虫一致').toBe(aTrunk.length)
    expect(nymph.rig?.legs?.length, '三对足（kit 分节足，有骨架）').toBe(6)
    // 棒䗛属成虫无翅，若虫也就无翅芽可长 —— 顺手给它加一对「翅芽」这条会红
    expect(nymph.rig?.wings).toBeUndefined()
    expect(meshesByName(nymph, 'wing-pad')).toHaveLength(0)
    const antennae = meshesByName(nymph, 'antenna')
    expect(antennae).toHaveLength(2)
    // 触角占体长比例与成虫同档（成虫 2.6 / 10）
    const antLen = Math.max(...antennae.map((a) => sizeOf([a]).length()))
    expect(antLen / nLen).toBeGreaterThan(0.17)
    expect(antLen / nLen).toBeLessThan(0.33)
  })

  it('拟态姿势与成虫相同：前足向前伸直、越过头部，与身体连成一线', () => {
    const legs = nymph.rig?.legs ?? []
    const front = legs.filter((l) => l.base.x > boxOf(trunk).max.x - 0.3)
    expect(front, '前足').toHaveLength(2)
    const headFront = boxOf(head).max.x
    for (const l of front) {
      const b = new THREE.Box3().setFromObject(l.coxa)
      // 前足伸过头前端（改成向侧面张开的普通步足这条会红）
      expect(b.max.x - headFront, '前足没有向前伸过头').toBeGreaterThan(nLen * 0.2)
      // 贴近体轴：横向只张开一点
      expect(Math.max(Math.abs(b.max.z), Math.abs(b.min.z)), '前足向两侧张开了').toBeLessThan(nLen * 0.12)
    }
  })

  it('幼体比例：头相对体长比成虫大，躯干相对短粗 —— 但仍是一根细枝', () => {
    const nHead = sizeOf(head)
    const aHeadS = sizeOf(aHead)
    // 头长、头宽相对体长都比成虫大（有向）。把头按成虫比例缩回去这条会红
    expect(nHead.x / nLen / (aHeadS.x / aLen), '头长相对成虫不够大').toBeGreaterThan(1.3)
    expect(nHead.z / nLen / (aHeadS.z / aLen), '头宽相对成虫不够大').toBeGreaterThan(1.3)
    expect(nHead.x / nLen / (aHeadS.x / aLen), '头大得像一只蝌蚪').toBeLessThan(2.2)

    // 长径比：若虫比成虫粗短（有向），但仍在「细枝」范围
    const nSlender = nLen / maxDiam(trunk)
    const aSlender = aLen / maxDiam(aTrunk)
    expect(nSlender, '若虫比成虫还细长，幼体比例反了').toBeLessThan(aSlender * 0.85)
    expect(nSlender, '粗成了一条毛虫').toBeGreaterThan(15)
    expect(nSlender).toBeLessThan(26)
  })

  it('在画面上看得清：躯干直径占画面的比例不低于成虫', () => {
    // 极细长的虫取景后很细。成虫 ≈ 2.6%，若虫要 ≥ 它（粗短的幼体比例正好帮了这件事）
    const nFrac = maxDiam(trunk) / frame
    const aFrac = maxDiam(aTrunk) / (2 * adult.radius)
    expect(nFrac, `躯干只占画面 ${(nFrac * 100).toFixed(1)}%`).toBeGreaterThan(aFrac)
    expect(nFrac, '720 像素的画面上不到 20 像素').toBeGreaterThan(0.03)
    expect(nFrac, '粗得不像竹节虫了').toBeLessThan(0.07)
  })

  it('竹节：每节起点有一圈比节身浅的节环，数得出节', () => {
    const rings = meshesByName(nymph, 'trunk-node')
    expect(rings.length, '节环').toBe(trunk.length - 1)
    const ring = hslByName(nymph, 'trunk-node')
    const seg = hslOfColor(matColor(trunk[3]))
    // 有向：节环比节身浅。做成深色描边会读成一串黑箍
    expect(ring.l - seg.l, '节环要比节身浅一档').toBeGreaterThan(0.04)
    expect(ring.l - seg.l, '节环太亮，成了一串白箍').toBeLessThan(0.2)
  })

  it('嫩枝绿：比成虫更绿更均匀，但不压深', () => {
    const cols = trunk.map((m) => hslOfColor(matColor(m)))
    for (const c of cols) {
      expect(c.h, '若虫躯干色相要落在绿区').toBeGreaterThan(70)
      expect(c.h).toBeLessThan(130)
      expect(c.s, '灰掉了就成了一根枯枝').toBeGreaterThan(0.25)
      expect(c.l, '压深一档不是压成墨绿').toBeGreaterThan(0.38)
      expect(c.l).toBeLessThan(0.6)
    }
    // 均匀：逐节色相的离散度远小于成虫（成虫是枯枝褐 ↔ 苔藓绿逐节斑驳）
    const spread = (xs: number[]) => Math.max(...xs) - Math.min(...xs)
    const aCols = aTrunk.map((m) => hslOfColor(matColor(m)))
    expect(spread(cols.map((c) => c.h)), '若虫逐节色相跳得太厉害').toBeLessThan(spread(aCols.map((c) => c.h)) * 0.5)
    // 成虫里至少有一节落在褐区 —— 这条盯的是基准本身没选错
    expect(Math.min(...aCols.map((c) => c.h))).toBeLessThan(60)
  })

  it('锚点与成虫同名，逐个落在若虫的对应部位上', () => {
    expect(Object.keys(nymph.anchors).sort()).toEqual([...ADULT_ANCHORS].sort())
    const a = nymph.anchors
    const hb = boxOf(head).expandByScalar(0.02)
    expect(hb.containsPoint(a.head), 'head 锚点不在头上').toBe(true)
    const tb = boxOf(trunk)
    // thorax 在躯干前段、body/camouflage 在中段
    expect(a.thorax.x).toBeGreaterThan(tb.max.x - nLen * 0.25)
    expect(a.body.x).toBeLessThan(a.thorax.x)
    expect(a.body.x).toBeGreaterThan(tb.min.x + nLen * 0.2)
    expect(a.camouflage.x).toBeLessThan(a.thorax.x)
    // antenna 在头前方，leg 在体侧下方
    expect(a.antenna.x).toBeGreaterThan(boxOf(head).max.x)
    expect(Math.abs(a.leg.z)).toBeGreaterThan(0.2)
  })
})
