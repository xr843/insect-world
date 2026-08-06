/**
 * 建模工具箱的地基测试。
 * 所有物种都建在 loft 之上，这里出问题就是全线崩，
 * 所以对退化输入（重合点、零半径、共线路径）要逐个钉死。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import {
  antenna,
  boundingRadius,
  chitin,
  compoundEye,
  finalize,
  leg,
  legPair,
  loft,
  mandibles,
  membrane,
  rostrum,
  segmentedAbdomen,
  spindle,
  wing,
  wingGeometry,
  wingVeins,
  type Section,
} from '../kit'

function assertFinite(g: THREE.BufferGeometry, what: string) {
  const pos = g.getAttribute('position')
  expect(pos, `${what} 缺少 position`).toBeTruthy()
  const arr = pos.array as ArrayLike<number>
  for (let i = 0; i < arr.length; i++) {
    if (!Number.isFinite(arr[i])) {
      throw new Error(`${what} 的顶点 ${i} 不是有限数：${arr[i]}`)
    }
  }
  const nrm = g.getAttribute('normal')
  if (nrm) {
    const na = nrm.array as ArrayLike<number>
    for (let i = 0; i < na.length; i++) {
      if (!Number.isFinite(na[i])) throw new Error(`${what} 的法线 ${i} 不是有限数`)
    }
  }
}

function collectGeometries(obj: THREE.Object3D): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = []
  obj.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && m.geometry) out.push(m.geometry)
  })
  return out
}

describe('loft', () => {
  it('生成的顶点数与索引数符合截面数 × 环分段', () => {
    const sections: Section[] = [
      { at: [0, 0, 0], ry: 0.5, rz: 0.5 },
      { at: [1, 0, 0], ry: 0.8, rz: 0.6 },
      { at: [2, 0, 0], ry: 0.3, rz: 0.3 },
    ]
    const g = loft(sections, 12, false)
    expect(g.getAttribute('position').count).toBe(3 * 13)
    // 2 段 × 12 个四边形 × 2 三角形 × 3 顶点
    expect(g.getIndex()!.count).toBe(2 * 12 * 2 * 3)
    assertFinite(g, 'loft 基本用例')
  })

  it('封口后多出两个极点顶点', () => {
    const sections: Section[] = [
      { at: [0, 0, 0], ry: 0.4, rz: 0.4 },
      { at: [1, 0, 0], ry: 0.4, rz: 0.4 },
    ]
    const open = loft(sections, 8, false)
    const capped = loft(sections, 8, true)
    expect(capped.getAttribute('position').count).toBe(open.getAttribute('position').count + 2)
  })

  it('路径首尾重合时不产生 NaN —— 切线退化是最容易炸的地方', () => {
    const sections: Section[] = [
      { at: [0, 0, 0], ry: 0.3, rz: 0.3 },
      { at: [0, 0, 0], ry: 0.3, rz: 0.3 },
      { at: [1, 0, 0], ry: 0.3, rz: 0.3 },
    ]
    assertFinite(loft(sections, 8), '重合点路径')
  })

  it('半径为 0 的截面（尖端）不产生 NaN', () => {
    const sections: Section[] = [
      { at: [0, 0, 0], ry: 0.3, rz: 0.3 },
      { at: [1, 0, 0], ry: 0, rz: 0 },
    ]
    assertFinite(loft(sections, 8), '零半径尖端')
  })

  it('沿 Y 轴的竖直路径不产生 NaN —— 参考向量与切线平行时必须换轴', () => {
    const sections: Section[] = [
      { at: [0, 0, 0], ry: 0.2, rz: 0.2 },
      { at: [0, 1, 0], ry: 0.2, rz: 0.2 },
      { at: [0, 2, 0], ry: 0.2, rz: 0.2 },
    ]
    assertFinite(loft(sections, 10), '竖直路径')
  })

  it('少于两个截面时报错而不是静默产出坏几何', () => {
    expect(() => loft([{ at: [0, 0, 0], ry: 1, rz: 1 }], 8)).toThrow()
  })

  it('扁截面的法线仍是单位向量', () => {
    const g = loft(
      [
        { at: [0, 0, 0], ry: 0.05, rz: 1.2 },
        { at: [1, 0, 0], ry: 0.05, rz: 1.2 },
      ],
      16,
      false,
    )
    const n = g.getAttribute('normal')
    for (let i = 0; i < n.count; i++) {
      const len = Math.hypot(n.getX(i), n.getY(i), n.getZ(i))
      expect(len).toBeCloseTo(1, 4)
    }
  })
})

describe('身体部件', () => {
  it('spindle 两端收尖、中间最粗', () => {
    const g = spindle([0, 0, 0], [4, 0, 0], 1)
    assertFinite(g, 'spindle')
    g.computeBoundingBox()
    const b = g.boundingBox!
    expect(b.max.x - b.min.x).toBeCloseTo(4, 1)
    expect(b.max.y - b.min.y).toBeLessThanOrEqual(2.05)
  })

  it('spindle 的 flat 参数真的压扁了截面', () => {
    const round = spindle([0, 0, 0], [3, 0, 0], 1, { flat: 1 })
    const flat = spindle([0, 0, 0], [3, 0, 0], 1, { flat: 2 })
    round.computeBoundingBox()
    flat.computeBoundingBox()
    const rh = round.boundingBox!.max.y - round.boundingBox!.min.y
    const fh = flat.boundingBox!.max.y - flat.boundingBox!.min.y
    const fw = flat.boundingBox!.max.z - flat.boundingBox!.min.z
    expect(fh).toBeLessThan(rh) // 上下变矮
    expect(fw).toBeGreaterThan(fh) // 左右变宽
  })

  it('segmentedAbdomen 沿体轴产生周期性起伏（环沟）', () => {
    const g = segmentedAbdomen({ from: [0, 0, 0], to: [-4, 0, 0], r0: 0.6, r1: 0.2, segments: 7, groove: 0.2 })
    assertFinite(g, 'segmentedAbdomen')
    expect(g.getAttribute('position').count).toBeGreaterThan(100)
  })

  it('segmentedAbdomen 的体节数影响几何密度', () => {
    const few = segmentedAbdomen({ from: [0, 0, 0], to: [-3, 0, 0], r0: 0.5, r1: 0.2, segments: 4 })
    const many = segmentedAbdomen({ from: [0, 0, 0], to: [-3, 0, 0], r0: 0.5, r1: 0.2, segments: 10 })
    expect(many.getAttribute('position').count).toBeGreaterThan(few.getAttribute('position').count)
  })
})

describe('附肢', () => {
  const mat = chitin({ color: '#333' })

  it('leg 由四段构成且末端在起点下方（有支撑感）', () => {
    const l = leg({ base: [0, 0, 0.5], femur: 1, tibia: 1.2, splay: 30, sweep: 0 }, mat)
    const tip = l.userData.tip as THREE.Vector3
    expect(tip.y).toBeLessThan(0) // 跗节必须落到体下方，否则虫会「浮空」
    for (const g of collectGeometries(l)) assertFinite(g, 'leg')
  })

  it('legPair 左右对称', () => {
    const p = legPair({ base: [0, 0, 0.5], femur: 1, tibia: 1, splay: 30, sweep: 0 }, mat)
    expect(p.children).toHaveLength(2)
    for (const g of collectGeometries(p)) assertFinite(g, 'legPair')
  })

  it('带刺的腿比不带刺的多出几何体', () => {
    const plain = leg({ base: [0, 0, 0.5], femur: 1, tibia: 1, splay: 30, sweep: 0 }, mat)
    const spiny = leg({ base: [0, 0, 0.5], femur: 1, tibia: 1, splay: 30, sweep: 0, spines: true }, mat)
    expect(collectGeometries(spiny).length).toBeGreaterThan(collectGeometries(plain).length)
  })

  it('六种触角类型都能构建且无 NaN', () => {
    for (const kind of ['filiform', 'clavate', 'geniculate', 'lamellate', 'pectinate', 'setaceous'] as const) {
      const a = antenna({ base: [0, 0, 0.2], length: 1, kind }, mat)
      const geos = collectGeometries(a)
      expect(geos.length, `${kind} 应产生几何体`).toBeGreaterThan(0)
      for (const g of geos) assertFinite(g, `antenna:${kind}`)
    }
  })

  it('羽状触角比丝状触角复杂得多', () => {
    const fil = antenna({ base: [0, 0, 0.2], length: 1, kind: 'filiform' }, mat)
    const pec = antenna({ base: [0, 0, 0.2], length: 1, kind: 'pectinate' }, mat)
    expect(collectGeometries(pec).length).toBeGreaterThan(collectGeometries(fil).length * 3)
  })
})

describe('翅', () => {
  const spec = { base: [0, 0.3, 0.2] as [number, number, number], length: 3, width: 1.4, spread: 60 }

  it('翅面几何合法', () => {
    assertFinite(wingGeometry(spec), 'wingGeometry')
  })

  it('翅脉数量可控且都无 NaN', () => {
    const few = wingVeins(spec, chitin({ color: '#222' }), 5)
    const many = wingVeins(spec, chitin({ color: '#222' }), 12)
    expect(collectGeometries(many).length).toBeGreaterThan(collectGeometries(few).length)
    for (const g of collectGeometries(many)) assertFinite(g, 'wingVeins')
  })

  it('左右翅沿 Z 轴镜像', () => {
    const r = wing(spec, membrane(), undefined, 1)
    const l = wing(spec, membrane(), undefined, -1)
    expect(Math.sign(r.position.z)).toBe(-Math.sign(l.position.z))
    expect(Math.sign(r.scale.z)).toBe(-Math.sign(l.scale.z))
  })
})

describe('头部器官', () => {
  it('复眼开启小眼面后有两层几何', () => {
    const plain = compoundEye({ at: [0, 0, 0.3], radius: 0.2 })
    const faceted = compoundEye({ at: [0, 0, 0.3], radius: 0.2, facets: true })
    expect(collectGeometries(faceted).length).toBe(collectGeometries(plain).length + 1)
  })

  it('大颚成对且左右分开', () => {
    const m = mandibles({ at: [1, 0, 0.1], length: 0.5 }, chitin({ color: '#222' }))
    expect(m.children).toHaveLength(2)
    for (const g of collectGeometries(m)) assertFinite(g, 'mandibles')
  })

  it('刺吸式口器向下后方伸出', () => {
    const r = rostrum({ at: [1, 0, 0], length: 1, angle: 60 }, chitin({ color: '#222' }))
    assertFinite(r.geometry, 'rostrum')
    r.geometry.computeBoundingBox()
    expect(r.geometry.boundingBox!.min.y).toBeLessThan(0) // 必须朝下
  })
})

describe('材质', () => {
  it('半透明材质会关掉深度写入，避免翅膀互相遮挡出黑边', () => {
    const m = membrane('#eee', 0.3)
    expect(m.transparent).toBe(true)
    expect(m.depthWrite).toBe(false)
  })

  it('鞘翅材质有清漆层和低粗糙度', () => {
    const m = chitin({ color: '#c00', gloss: 0.9, clearcoat: 0.8 })
    expect(m.clearcoat).toBeGreaterThan(0.5)
    expect(m.roughness).toBeLessThan(0.25)
  })
})

describe('finalize', () => {
  it('把模型居中，并同步平移锚点', () => {
    const g = new THREE.Group()
    const box = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), chitin({ color: '#fff' }))
    box.position.set(10, 0, 0)
    g.add(box)

    const anchorWorld = new THREE.Vector3(11, 0, 0) // 盒子右面上的一点
    const model = finalize(g, { probe: anchorWorld })

    const centered = new THREE.Box3().setFromObject(model.group)
    const c = new THREE.Vector3()
    centered.getCenter(c)
    expect(c.x).toBeCloseTo(0, 5)

    // 锚点相对几何体的位置必须保持不变：仍在盒子右面
    expect(model.anchors.probe.x).toBeCloseTo(1, 5)
  })

  it('给所有 mesh 打开投影', () => {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), chitin({ color: '#fff' })))
    const model = finalize(g, {})
    let checked = 0
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        expect(m.castShadow).toBe(true)
        checked++
      }
    })
    expect(checked).toBeGreaterThan(0)
  })

  it('包围半径为正', () => {
    const g = new THREE.Group()
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1.5), chitin({ color: '#fff' })))
    expect(boundingRadius(g)).toBeGreaterThan(1)
  })
})

describe('已完成的物种：双叉犀金龟', () => {
  it('能构建，且全身几何无 NaN', async () => {
    const { buildRhinocerosBeetle } = await import('../rhinoceros-beetle')
    const model = buildRhinocerosBeetle()
    const geos = collectGeometries(model.group)
    expect(geos.length).toBeGreaterThan(20)
    for (const g of geos) assertFinite(g, '独角仙')
    expect(model.radius).toBeGreaterThan(0)
  })

  it('锚点齐全且坐标有限', async () => {
    const { buildRhinocerosBeetle } = await import('../rhinoceros-beetle')
    const { anchors } = buildRhinocerosBeetle()
    for (const key of ['horn', 'thoraxHorn', 'elytra', 'eye', 'antenna', 'foreleg']) {
      expect(anchors[key], `缺少锚点 ${key}`).toBeTruthy()
      const v = anchors[key]
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z)).toBe(true)
    }
  })

  it('体型比例符合甲虫：长 > 宽 > 高', async () => {
    const { buildRhinocerosBeetle } = await import('../rhinoceros-beetle')
    const model = buildRhinocerosBeetle()
    const box = new THREE.Box3().setFromObject(model.group)
    const size = new THREE.Vector3()
    box.getSize(size)
    expect(size.x).toBeGreaterThan(size.z) // 体长最大
  })
})
