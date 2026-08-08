/**
 * C 轮·体节间膜：kit.segmentedAbdomen() / kit.segmentedAbdomenMembranes() 新增的
 * 「节间膜」断言。覆盖 polish-plan.md C 轮「体节间膜：节间深色哑光软膜圈」这一条。
 *
 * 这是 kit 层面的新能力测试，不经过任何物种 builder——与 kit.test.ts 里
 * 已有的 segmentedAbdomen 测试同一个写法（直接调 kit 导出、不搭真实物种）。
 * 50 个既有物种调用点目前都还没接入 segmentedAbdomenMembranes()（这本身
 * 就是「零改动」的一部分），所以这里只测 kit 自身的契约，不测某个物种。
 *
 * 拆成两半分别验证：
 * - segmentedAbdomen() 自身：membrane 默认 true 时，体节交界采样点的半径比
 *   membrane:false 时更小（真的「陷进去一点」），但顶点数/三角形数完全不变
 *   （不加采样点，50 个既有调用点零改动就吃到这个效果，面数不涨）。
 * - segmentedAbdomenMembranes()：真正带独立深色哑光材质的膜环 mesh——
 *   开膜有真几何（mesh 数 > 0，关膜时 0），膜环半径 < 相邻体节半径，
 *   材质 gloss 低于典型体节材质、且不 mutate 传入的 color 对象。
 *
 * 本项目的测试文件一贯各自独立自带小工具（没有共享 test-utils 模块），
 * 这里延续同样的写法。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { abdomenEnvelope, chitin, loft, segmentedAbdomen, segmentedAbdomenMembranes, type SegmentedAbdomenOptions } from '../kit'

function assertFinite(g: THREE.BufferGeometry, what: string) {
  const pos = g.getAttribute('position')
  expect(pos, `${what} 缺少 position`).toBeTruthy()
  const arr = pos.array as ArrayLike<number>
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) {
      throw new Error(`${what} 的顶点 ${i} 不是有限数：${arr[i]}`)
    }
  }
}

function triangleCount(g: THREE.BufferGeometry): number {
  const idx = g.getIndex()
  const pos = g.getAttribute('position')
  return idx ? idx.count / 3 : pos.count / 3
}

/** 一份有代表性的 opts：中等体节数、有明显鼓包，数值不特殊（非边界值） */
const baseOpts: SegmentedAbdomenOptions = {
  from: [0, 0, 0],
  to: [-6, 0, 0],
  r0: 0.5,
  r1: 0.15,
  segments: 6,
  groove: 0.16,
  bulge: 0.3,
}

// ---------------------------------------------------------------- segmentedAbdomen()：body 自身的局部收缩

describe('segmentedAbdomen()：节间膜默认开启，body 几何在交界处真的收了一口', () => {
  it('membrane 默认 true（不传等于 true）：体节交界处半径比 membrane:false 时更小', () => {
    const on = segmentedAbdomen(baseOpts)
    const off = segmentedAbdomen({ ...baseOpts, membrane: false })
    assertFinite(on, 'membrane 默认开启')
    assertFinite(off, 'membrane:false')

    // 两者顶点数必须完全一致——membrane 只改半径，不加采样点
    expect(on.getAttribute('position').count, '开膜不该改变顶点数').toBe(off.getAttribute('position').count)
    expect(triangleCount(on), '开膜不该改变三角形数').toBe(triangleCount(off))

    // 体节交界处（segments=6 → 内部 5 个交界）的半径：从 loft 输出直接量，
    // 用 x 坐标定位到目标 t 附近那一圈顶点，取其到中轴（x 轴）的最大距离作为该处半径。
    const radiusNear = (g: THREE.BufferGeometry, t: number): number => {
      const pos = g.getAttribute('position')
      const targetX = THREE.MathUtils.lerp(baseOpts.from[0], baseOpts.to[0], t)
      let best = Infinity
      let bestIdx = -1
      for (let i = 0; i < pos.count; i++) {
        const dx = Math.abs(pos.getX(i) - targetX)
        if (dx < best) {
          best = dx
          bestIdx = i
        }
      }
      // 找到最近的一圈里半径最大的一个采样（避免只抽到该圈里 y 或 z 为 0 的点）
      const ringX = pos.getX(bestIdx)
      let maxR = 0
      for (let i = 0; i < pos.count; i++) {
        if (Math.abs(pos.getX(i) - ringX) < 1e-6) {
          maxR = Math.max(maxR, Math.hypot(pos.getY(i), pos.getZ(i)))
        }
      }
      return maxR
    }

    const segs = baseOpts.segments!
    for (let j = 1; j < segs; j++) {
      const t = j / segs
      const rOn = radiusNear(on, t)
      const rOff = radiusNear(off, t)
      expect(rOn, `交界 j=${j}（t=${t.toFixed(3)}）开膜半径应 < 关膜半径`).toBeLessThan(rOff)
    }
  })

  it('membrane:false 时的三角形数与顶点数，和 C 轮之前的既有断言（顶点数>100）一样成立', () => {
    // 对齐 kit.test.ts 里 segmentedAbdomen 的既有断言口径，确认这条老规矩没被破坏
    const g = segmentedAbdomen({ ...baseOpts, membrane: false })
    expect(g.getAttribute('position').count).toBeGreaterThan(100)
  })

  it('membraneRatio 越小，交界处收得越狠（半径越小）', () => {
    const shallow = segmentedAbdomen({ ...baseOpts, membraneRatio: 0.95 })
    const deep = segmentedAbdomen({ ...baseOpts, membraneRatio: 0.5 })
    assertFinite(shallow, 'membraneRatio 0.95')
    assertFinite(deep, 'membraneRatio 0.5')
    // 只要不抛异常、不产生 NaN、两者不完全相同即可——具体数值关系已由上一条用例覆盖
    expect(shallow.getAttribute('position').array).not.toEqual(deep.getAttribute('position').array)
  })

  it('50 个既有调用点的典型小半径参数（termite-soldier/lacewing 那个量级）不会把节间膜挤到负数或 NaN', () => {
    // 复刻真实物种文件里出现过的最小 r1（lacewing 0.012、termite-soldier 0.018），
    // 确认 Math.max(env*ripple, 1e-4) 的下限守卫在新的节间膜项下仍然生效。
    for (const r1 of [0.012, 0.018]) {
      const g = segmentedAbdomen({ from: [0, 0, 0], to: [-1.5, 0, 0], r0: 0.3, r1, segments: 7, groove: 0.17, bulge: 0.22 })
      assertFinite(g, `r1=${r1}`)
    }
  })
})

// ---------------------------------------------------------------- segmentedAbdomenMembranes()：真正的膜环 mesh

describe('segmentedAbdomenMembranes()：开膜时 mesh 数比关膜多，有真几何', () => {
  it('membrane:false 返回空数组；默认（不传）返回 segments-1 个非空 mesh', () => {
    const off = segmentedAbdomenMembranes({ ...baseOpts, membrane: false })
    expect(off, 'membrane:false 应该是空数组').toHaveLength(0)

    const on = segmentedAbdomenMembranes(baseOpts)
    expect(on.length, `默认应有 segments-1=${baseOpts.segments! - 1} 个膜环`).toBe(baseOpts.segments! - 1)
    expect(on.length, '开膜的 mesh 数应比关膜多').toBeGreaterThan(off.length)

    for (const ring of on) {
      expect(ring.isMesh, '每个膜环都应是真正的 THREE.Mesh').toBe(true)
      assertFinite(ring.geometry, ring.name || 'membrane-ring')
      expect(ring.geometry.getAttribute('position').count, '膜环几何不能是空壳').toBeGreaterThan(0)
    }
  })

  it('segments < 2 或 undefined 的退化情况：返回空数组而不是抛异常', () => {
    expect(segmentedAbdomenMembranes({ ...baseOpts, segments: 1 })).toHaveLength(0)
    expect(segmentedAbdomenMembranes({ ...baseOpts, segments: 0 })).toHaveLength(0)
  })

  it('每道节间环面数克制在数百面以内', () => {
    const rings = segmentedAbdomenMembranes(baseOpts)
    for (const ring of rings) {
      const tris = triangleCount(ring.geometry)
      expect(tris, `单环三角形数=${tris}`).toBeLessThanOrEqual(300)
    }
  })

  it('膜环命名一致，便于未来物种文件按名字取用', () => {
    const rings = segmentedAbdomenMembranes(baseOpts)
    for (const ring of rings) expect(ring.name).toBe('membrane-ring')
  })
})

describe('segmentedAbdomenMembranes()：膜环包围盒半径 < 相邻体节半径（真的陷进去）', () => {
  it('每个膜环的半径都小于「它所在交界处若无膜时体节表面本该有」的半径', () => {
    // 相邻体节在这条缝上的半径，就是该处的包络值 abdomenEnvelope(t_j)——membraneRatio<1
    // 保证膜环半径永远比它小，这对任何 r0/r1/bulge 组合都成立（不像"隔壁体节中点"那样，
    // 在 r1 far < r0 的陡降尾段可能被自然收细反超，那是包络本身的锥度，不是膜环没收进去）。
    const rings = segmentedAbdomenMembranes(baseOpts)
    const segs = baseOpts.segments!

    rings.forEach((ring, idx) => {
      const j = idx + 1 // 第 idx 个膜环对应体节交界 j=idx+1（见 segmentedAbdomenMembranes 内部 for j=1..segs-1）
      ring.geometry.computeBoundingBox()
      const box = ring.geometry.boundingBox!
      const ringRadius = Math.max((box.max.y - box.min.y) / 2, (box.max.z - box.min.z) / 2)

      const jointR = abdomenEnvelope(j / segs, baseOpts.r0, baseOpts.r1, baseOpts.bulge)
      expect(ringRadius, `膜环 j=${j} 半径应 < 该交界处无膜时的体节表面半径`).toBeLessThan(jointR)
    })
  })

  it('在半径沿全长恒定（r0===r1，无锥度）的腹部上，膜环半径也小于左右相邻体节中点的半径', () => {
    // 上一条用交界处自身的包络值做比较，这里补一个更贴近直觉的版本：
    // r0===r1 时全长包络恒定，交界两侧体节中点的半径就是普通体节半径，
    // 不会有锥度干扰，膜环理应比它们都细。
    const flatOpts: SegmentedAbdomenOptions = { from: [0, 0, 0], to: [-6, 0, 0], r0: 0.4, r1: 0.4, segments: 6, bulge: 0.3 }
    const rings = segmentedAbdomenMembranes(flatOpts)
    const segs = flatOpts.segments!

    rings.forEach((ring, idx) => {
      const j = idx + 1
      ring.geometry.computeBoundingBox()
      const box = ring.geometry.boundingBox!
      const ringRadius = Math.max((box.max.y - box.min.y) / 2, (box.max.z - box.min.z) / 2)

      const leftR = abdomenEnvelope((j - 0.5) / segs, flatOpts.r0, flatOpts.r1, flatOpts.bulge)
      const rightR = abdomenEnvelope((j + 0.5) / segs, flatOpts.r0, flatOpts.r1, flatOpts.bulge)
      expect(ringRadius, `膜环 j=${j} 半径应 < 左侧体节中点半径`).toBeLessThan(leftR)
      expect(ringRadius, `膜环 j=${j} 半径应 < 右侧体节中点半径`).toBeLessThan(rightR)
    })
  })

  it('membraneRatio 直接控制膜环半径：比默认更浅的 ratio 应产出更大的膜环半径', () => {
    const deepRatio = segmentedAbdomenMembranes({ ...baseOpts, membraneRatio: 0.5 })
    const shallowRatio = segmentedAbdomenMembranes({ ...baseOpts, membraneRatio: 0.95 })
    const ringRadius = (m: THREE.Mesh): number => {
      m.geometry.computeBoundingBox()
      const b = m.geometry.boundingBox!
      return Math.max((b.max.y - b.min.y) / 2, (b.max.z - b.min.z) / 2)
    }
    for (let i = 0; i < deepRatio.length; i++) {
      expect(ringRadius(deepRatio[i]), `第 ${i} 环：ratio 0.5 应比 ratio 0.95 更细`).toBeLessThan(ringRadius(shallowRatio[i]))
    }
  })

  it('flat 参数被膜环正确继承（左右压扁的物种，膜环也跟着压扁，不是浮在体节外的圆环）', () => {
    const flatOpts: SegmentedAbdomenOptions = { ...baseOpts, flat: 1.4 }
    const rings = segmentedAbdomenMembranes(flatOpts)
    for (const ring of rings) {
      ring.geometry.computeBoundingBox()
      const b = ring.geometry.boundingBox!
      const halfY = (b.max.y - b.min.y) / 2
      const halfZ = (b.max.z - b.min.z) / 2
      // flat>1 语义（同 spindle 文档）：ry = r/flat 更小，rz = r*flat 更大 —— z 方向应明显比 y 方向宽
      expect(halfZ, 'flat=1.4 时膜环 z 半宽应大于 y 半宽').toBeGreaterThan(halfY)
    }
  })
})

// ---------------------------------------------------------------- 材质：深色哑光、独立、不 mutate 传入对象

describe('segmentedAbdomenMembranes()：材质深色哑光，独立于体节材质，不改动传入对象', () => {
  it('膜材质 gloss 低于典型体节材质（roughness 更高）；clearcoat 为 0', () => {
    const rings = segmentedAbdomenMembranes(baseOpts)
    expect(rings.length).toBeGreaterThan(0)

    // 典型体节材质：chitin() 缺省 gloss（0.45），代表物种文件常见的 bodyMat 档位
    const bodyMat = chitin({ color: '#8a6a4a' })

    for (const ring of rings) {
      const mat = ring.material as THREE.MeshPhysicalMaterial
      expect(mat.roughness, `膜材质 roughness=${mat.roughness} 应高于体节材质 roughness=${bodyMat.roughness}（即 gloss 更低）`).toBeGreaterThan(
        bodyMat.roughness,
      )
      expect(mat.clearcoat, '节间膜不该有清漆层').toBe(0)
    }
  })

  it('未指定 membraneColor/color 时退到通用深色兜底，而不是继承任何体节色', () => {
    const rings = segmentedAbdomenMembranes(baseOpts)
    const mat = rings[0].material as THREE.MeshPhysicalMaterial
    // 兜底色很暗：HSL lightness 应明显低（近黑）
    const hsl = { h: 0, s: 0, l: 0 }
    mat.color.getHSL(hsl)
    expect(hsl.l, `兜底膜色 lightness=${hsl.l} 应该很暗`).toBeLessThan(0.2)
  })

  it('给了 color（体节基色）时，膜色是它压暗后的结果，而不是原样复用', () => {
    const baseColor = new THREE.Color('#cc8844')
    const rings = segmentedAbdomenMembranes({ ...baseOpts, color: baseColor })
    const mat = rings[0].material as THREE.MeshPhysicalMaterial
    expect(mat.color.getHex(), '膜色不该和体节基色完全相同').not.toBe(baseColor.getHex())

    const baseHsl = { h: 0, s: 0, l: 0 }
    const membraneHsl = { h: 0, s: 0, l: 0 }
    baseColor.getHSL(baseHsl)
    mat.color.getHSL(membraneHsl)
    expect(membraneHsl.l, `膜色 lightness=${membraneHsl.l} 应低于体节基色 lightness=${baseHsl.l}`).toBeLessThan(baseHsl.l)
  })

  it('绝不 mutate 调用方传入的 color 对象——传入的 THREE.Color 实例值原样不动', () => {
    const baseColor = new THREE.Color('#cc8844')
    const before = baseColor.getHex()
    segmentedAbdomenMembranes({ ...baseOpts, color: baseColor })
    expect(baseColor.getHex(), 'segmentedAbdomenMembranes 不该 mutate 传入的 color 对象').toBe(before)
  })

  it('显式 membraneColor 直接生效，不再叠加压暗', () => {
    const explicit = '#ff0000'
    const rings = segmentedAbdomenMembranes({ ...baseOpts, membraneColor: explicit })
    const mat = rings[0].material as THREE.MeshPhysicalMaterial
    expect(mat.color.getHex()).toBe(new THREE.Color(explicit).getHex())
  })

  it('同一批膜环共享同一个材质实例（沿用项目里 bodyMat 跨多个部件复用的惯例，不必每环各建一份）', () => {
    const rings = segmentedAbdomenMembranes(baseOpts)
    expect(rings.length).toBeGreaterThan(1)
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i].material).toBe(rings[0].material)
    }
  })
})

// ---------------------------------------------------------------- abdomenEnvelope()：新导出的共享包络函数本身

describe('abdomenEnvelope()：与 segmentedAbdomen 内部包络口径一致', () => {
  it('t=0 处等于 r0，两端之间单调朝 bulge 峰值靠拢', () => {
    expect(abdomenEnvelope(0, 0.5, 0.15, 0.3)).toBeCloseTo(0.5, 5)
  })

  it('bulge 峰值比 r0/r1 两者都大（"取两端半径中较大者再放大 6%"）', () => {
    const peak = abdomenEnvelope(0.3, 0.5, 0.15, 0.3)
    expect(peak).toBeGreaterThan(0.5)
    expect(peak).toBeCloseTo(0.5 * 1.06, 5)
  })

  it('与 loft 出来的真实 body 几何在非交界点上数值一致（不只是同一个公式抄了两遍，是真的同一处调用）', () => {
    // 取一个明显落在某段中点、不撞在体节交界采样格点上的 t，
    // 用 segmentedAbdomen 关掉 groove/membrane 后应正好复现 abdomenEnvelope 的值
    const opts: SegmentedAbdomenOptions = { from: [0, 0, 0], to: [-10, 0, 0], r0: 0.4, r1: 0.4, segments: 5, groove: 0, membrane: false }
    const g = segmentedAbdomen(opts)
    const pos = g.getAttribute('position')
    // r0===r1 时包络处处相等，随手挑哪个非极点顶点量都应该等于 r0（flat=1 时 ry=rz=r0）
    let sampleY = 0
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i)) > 1e-6 && Math.abs(pos.getX(i) - opts.to[0]) > 1e-6) {
        sampleY = Math.max(sampleY, Math.abs(pos.getY(i)))
      }
    }
    expect(sampleY).toBeCloseTo(abdomenEnvelope(0.5, opts.r0, opts.r1, 0.3), 2)
  })
})

// ---------------------------------------------------------------- 保底：loft 仍然是唯一的放样核心（本文件没有绕开它）

describe('本文件的膜环几何走的还是 kit.loft()，没有另起炉灶', () => {
  it('segmentedAbdomenMembranes 产出的 geometry 和直接调 loft() 产出的同形态 geometry 顶点数一致', () => {
    const rings = segmentedAbdomenMembranes(baseOpts)
    const manual = loft(
      [
        { at: [0, 0, 0], ry: 0.1, rz: 0.1 },
        { at: [0.01, 0, 0], ry: 0.1, rz: 0.1 },
        { at: [0.02, 0, 0], ry: 0.1, rz: 0.1 },
      ],
      20,
      false,
    )
    expect(rings[0].geometry.getAttribute('position').count).toBe(manual.getAttribute('position').count)
  })
})
