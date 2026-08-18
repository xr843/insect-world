/**
 * 腿的骨架化：`leg()` 从「一堆绝对坐标的线段」改成 `coxa → femur → tibia → tarsus`
 * 的嵌套关节。
 *
 * 这份测试要钉住两件不同的事：
 *
 * 1. **静止姿态逐顶点不变。** 63 只虫的形态是逐只目视调出来的，一次悄悄的整体
 *    漂移会让所有形态断言照样全绿（断言量的是数字，人看的是长相 —— 这个跟头
 *    本项目栽过多次）。这里带着改前那版的**参考实现**做逐顶点比对，不依赖
 *    外部快照文件，改坏了当场红。
 * 2. **关节真的能转。** 只验「有句柄」是不够的：句柄拿错了节点、或者层级挂反了，
 *    测试一样绿，而虫子转起来会整条腿绕模型原点抡圈。所以要验运动学 ——
 *    转膝盖，膝盖以上不许动、以下必须动。
 *
 * 全库层面的不变性另有实测记录：改动前后逐轴最大偏差 6.4e-7 cm（竹节虫，体长
 * 10cm），量级正好是 float32 顶点存储在该尺度上的 ULP（≈9.5e-7）。新版存的是
 * 关节局部的小坐标、平移在 float64 的矩阵里做，精度反而比改前更高。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { chitin, finalize, leg, legPair, loft, mirrorZ, type LegSpec, type Section } from '../kit'

const mat = chitin({ color: '#333' })

const SPECS: LegSpec[] = [
  { base: [0.5, 0, 0.6], femur: 1.2, tibia: 1.4, splay: 30, sweep: -20 },
  { base: [-0.8, 0.2, 0.35], femur: 0.6, tibia: 0.9, tarsus: 0.4, splay: 55, sweep: 35, knee: 95, ankle: 30 },
  { base: [0.1, -0.1, 0.9], femur: 2.4, tibia: 3.1, splay: 12, sweep: 0, thickness: 0.11, spines: true },
  { base: [1.4, 0.5, 0.2], femur: 0.35, tibia: 0.42, splay: 78, sweep: -55, spines: true },
]

// ---------------------------------------------------------------- 参考实现

/**
 * 骨架化**之前**那版 `leg()` 的等价重写：所有几何直接生成在绝对坐标上，
 * 一个扁平 group，没有关节。逐字照搬原实现的数学，别「顺手改进」——
 * 它存在的唯一意义就是当那份不该变的基准。
 */
function legBeforeSkeleton(spec: LegSpec, material: THREE.Material): THREE.Group {
  const g = new THREE.Group()
  const th = spec.thickness ?? 0.055
  const tarsusLen = spec.tarsus ?? spec.femur * 0.35
  const splay = THREE.MathUtils.degToRad(spec.splay)
  const sweep = THREE.MathUtils.degToRad(spec.sweep)
  const knee = THREE.MathUtils.degToRad(spec.knee ?? 70)
  const ankle = THREE.MathUtils.degToRad(spec.ankle ?? 55)

  const base = new THREE.Vector3(...spec.base)
  const dirFemur = new THREE.Vector3(
    Math.sin(sweep) * Math.cos(splay) * -1,
    Math.sin(splay) * 0.35 + 0.25,
    Math.cos(sweep) * Math.cos(splay),
  ).normalize()
  const kneePt = base.clone().addScaledVector(dirFemur, spec.femur)
  const down = new THREE.Vector3(0, -1, 0)
  const dirTibia = dirFemur.clone().lerp(down, Math.sin(knee) * 0.85).normalize()
  const anklePt = kneePt.clone().addScaledVector(dirTibia, spec.tibia)
  const dirTarsus = dirTibia
    .clone()
    .lerp(new THREE.Vector3(-Math.sin(sweep), -0.35, Math.cos(sweep) * 0.3).normalize(), Math.sin(ankle) * 0.9)
    .normalize()
  const tipPt = anklePt.clone().addScaledVector(dirTarsus, tarsusLen)

  const seg = (a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number) => {
    const steps = 8
    const sections: Section[] = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const r = THREE.MathUtils.lerp(r0, r1, t)
      sections.push({ at: new THREE.Vector3().lerpVectors(a, b, t), ry: r, rz: r })
    }
    return new THREE.Mesh(loft(sections, 12), material)
  }

  g.add(seg(base, kneePt, th * 1.45, th * 0.92))
  g.add(seg(kneePt, anklePt, th * 0.9, th * 0.6))
  g.add(seg(anklePt, tipPt, th * 0.55, th * 0.28))

  for (const [p, r] of [
    [base, th * 1.5],
    [kneePt, th * 1.0],
    [anklePt, th * 0.62],
  ] as const) {
    const j = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), material)
    j.position.copy(p)
    g.add(j)
  }

  if (spec.spines) {
    const dir = new THREE.Vector3().subVectors(anklePt, kneePt)
    const len = dir.length()
    dir.normalize()
    const side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize()
    for (let i = 1; i <= 4; i++) {
      const t = i / 5
      const p = kneePt.clone().addScaledVector(dir, len * t)
      const tip = p.clone().addScaledVector(side, th * 1.8).addScaledVector(dir, th * 0.6)
      g.add(
        new THREE.Mesh(
          loft([{ at: p, ry: th * 0.3, rz: th * 0.3 }, { at: tip, ry: 0.004, rz: 0.004 }], 8),
          material,
        ),
      )
    }
  }
  return g
}

// ---------------------------------------------------------------- 工具

/**
 * 取一棵子树里全部顶点的世界坐标。
 *
 * ⚠️ `root` 必须传整棵树的根。`updateMatrixWorld()` 从中间节点调起，用的是
 * **父节点那份可能已经过期的 matrixWorld** —— 转了膝盖只更新跗节，量出来的
 * 位移会是 0，看着像「关节不起作用」，其实是量错了。
 */
function worldVerts(obj: THREE.Object3D, root: THREE.Object3D = obj): number[][] {
  root.updateMatrixWorld(true)
  const out: number[][] = []
  const v = new THREE.Vector3()
  obj.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    const pos = m.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      out.push([v.x, v.y, v.z])
    }
  })
  return out
}

/**
 * 两团点云的最大偏差，按**逐轴边缘分布**比。
 *
 * ⚠️ 不要改成「整体按 (x,y,z) 排序后逐点比」—— 试过，不成立：同一个放样截面上
 * 的顶点 x 几乎相等，1e-16 的浮点噪声就会让排序交换两个相距整个体宽的点，
 * 量出 6.7cm 的假位移。标量各自排序则对这种噪声免疫。
 */
function maxAxisDeviation(a: number[][], b: number[][]): number {
  expect(a).toHaveLength(b.length)
  let worst = 0
  for (let axis = 0; axis < 3; axis++) {
    const p = a.map((q) => q[axis]).sort((m, n) => m - n)
    const q = b.map((r) => r[axis]).sort((m, n) => m - n)
    for (let i = 0; i < p.length; i++) worst = Math.max(worst, Math.abs(p[i] - q[i]))
  }
  return worst
}

// ---------------------------------------------------------------- 测试

describe('骨架化不改静止姿态', () => {
  it.each(SPECS.map((s, i) => [i, s] as const))('第 %i 组参数：与改前的参考实现逐顶点一致', (_i, spec) => {
    const before = worldVerts(legBeforeSkeleton(spec, mat))
    const after = worldVerts(leg(spec, mat))
    // 1e-5 的容差远大于实测偏差（float32 顶点存储的 ULP 量级），
    // 又远小于任何肉眼可见的改变 —— 最小的虫体长 0.45cm。
    expect(maxAxisDeviation(before, after)).toBeLessThan(1e-5)
  })

  it('四个关节的静止旋转都是零位 —— 姿态烘在几何里，动作层从零位起偏移', () => {
    const g = new THREE.Group()
    g.add(leg(SPECS[0], mat))
    const [legRig] = finalize(g, {}).rig!.legs!
    for (const j of [legRig.coxa, legRig.femur, legRig.tibia, legRig.tarsus]) {
      expect(j.rotation.x).toBe(0)
      expect(j.rotation.y).toBe(0)
      expect(j.rotation.z).toBe(0)
    }
  })

  it('userData.tip / knee 仍是绝对坐标 —— 13 个物种按它取锚点', () => {
    const l = leg(SPECS[0], mat)
    const tip = l.userData.tip as THREE.Vector3
    const knee = l.userData.knee as THREE.Vector3
    expect(tip).toBeInstanceOf(THREE.Vector3)
    expect(knee).toBeInstanceOf(THREE.Vector3)
    // 膝在基节与足尖之间，且都远离原点（绝对坐标而非局部）
    expect(knee.distanceTo(new THREE.Vector3(...SPECS[0].base))).toBeCloseTo(SPECS[0].femur, 5)
  })

  it('legPair().children[0] 仍是右腿的那个 group（13 个物种硬取这个下标）', () => {
    const pair = legPair(SPECS[0], mat)
    expect(pair.children).toHaveLength(2)
    expect((pair.children[0] as THREE.Group).userData.tip).toBeInstanceOf(THREE.Vector3)
    expect(pair.children[0].scale.z).toBe(1)
    expect(pair.children[1].scale.z).toBe(-1)
  })
})

describe('关节真的能转（运动学）', () => {
  /** 拿到一条腿的四个关节句柄，连同整棵树的根 */
  function rigOf(spec: LegSpec) {
    const root = new THREE.Group()
    root.add(leg(spec, mat))
    return { rig: finalize(root, {}).rig!.legs![0], root }
  }

  /** 该节点自己那层的网格（不含子关节），用来验「这一节动没动」 */
  const ownMesh = (j: THREE.Object3D) => j.children.filter((c) => (c as THREE.Mesh).isMesh)[0]

  it('转 coxa：整条腿绕基节摆动 —— 贴着关节的顶点几乎不动，远端大幅移动', () => {
    const { rig: r, root } = rigOf(SPECS[0])
    const before = worldVerts(root)
    r.coxa.rotation.y = 0.5
    const after = worldVerts(root)
    const moved = before.map((p, i) => Math.hypot(p[0] - after[i][0], p[1] - after[i][1], p[2] - after[i][2]))
    // 基节球贴着枢轴（半径 th*1.5≈0.08），转 0.5 弧度最多挪 0.04；
    // 足尖离枢轴约 2.4，同样的转角要挪 1 以上。差一个数量级以上才叫「绕基节转」，
    // 只验「有东西动了」是不够的 —— 整条腿绕模型原点抡圈也会让顶点动起来。
    const near = Math.min(...moved)
    const far = Math.max(...moved)
    expect(near).toBeLessThan(0.1)
    expect(far).toBeGreaterThan(0.5)
    expect(far / Math.max(near, 1e-6)).toBeGreaterThan(10)
  })

  it('转 tibia（膝）：膝以上纹丝不动，膝以下必须动', () => {
    const { rig: r, root } = rigOf(SPECS[0])
    const femurBefore = worldVerts(ownMesh(r.femur), root)
    const tarsusBefore = worldVerts(r.tarsus, root)
    r.tibia.rotation.z = 0.6
    expect(maxAxisDeviation(femurBefore, worldVerts(ownMesh(r.femur), root))).toBeLessThan(1e-9)
    expect(maxAxisDeviation(tarsusBefore, worldVerts(r.tarsus, root))).toBeGreaterThan(0.1)
  })

  it('转 tarsus：只有跗节动，胫节不动', () => {
    const { rig: r, root } = rigOf(SPECS[2])
    const tibiaBefore = worldVerts(ownMesh(r.tibia), root)
    const tarsusBefore = worldVerts(ownMesh(r.tarsus), root)
    r.tarsus.rotation.x = 0.4
    expect(maxAxisDeviation(tibiaBefore, worldVerts(ownMesh(r.tibia), root))).toBeLessThan(1e-9)
    expect(maxAxisDeviation(tarsusBefore, worldVerts(ownMesh(r.tarsus), root))).toBeGreaterThan(0.05)
  })

  it('关节层级是 coxa → femur → tibia → tarsus', () => {
    const { rig: r } = rigOf(SPECS[2])
    expect(r.femur.parent).toBe(r.coxa)
    expect(r.tibia.parent).toBe(r.femur)
    expect(r.tarsus.parent).toBe(r.tibia)
  })
})

describe('侧别与克隆', () => {
  it('legPair 左右两条的 side 相反', () => {
    const g = new THREE.Group()
    g.add(legPair(SPECS[0], mat))
    const legs = finalize(g, {}).rig!.legs!
    expect(legs).toHaveLength(2)
    expect(legs.map((l) => l.side).sort()).toEqual([-1, 1])
  })

  it('mirrorZ 一条腿不抛异常，且两份的 side 相反', () => {
    /*
     * 回归：第一版把四个关节的**对象引用**塞进了 userData 标记，而
     * Object3D.copy() 深拷 userData 用的是 JSON.parse(JSON.stringify(...))，
     * 于是成了循环结构，mirrorZ 一 clone 就抛
     * "Converting circular structure to JSON"，15 个测试文件一起红。
     * 标记从此只放纯数据，句柄在 collectRig() 里按层级重组。
     */
    const g = new THREE.Group()
    expect(() => g.add(mirrorZ(leg(SPECS[0], mat)))).not.toThrow()
    const legs = finalize(g, {}).rig!.legs!
    expect(legs).toHaveLength(2)
    expect(legs.map((l) => l.side).sort()).toEqual([-1, 1])
  })

  it('克隆出的那条腿句柄独立 —— 转原件不带动副本', () => {
    const g = new THREE.Group()
    g.add(mirrorZ(leg(SPECS[0], mat)))
    const legs = finalize(g, {}).rig!.legs!
    const before = worldVerts(legs[1].tarsus)
    legs[0].tibia.rotation.z = 0.7
    expect(maxAxisDeviation(before, worldVerts(legs[1].tarsus))).toBeLessThan(1e-9)
  })
})

describe('全物种普查：腿的骨架覆盖', () => {
  /** 完全没有 kit 腿骨架的物种，逐条给理由 —— 这份名单就是技术债的账本 */
  const NO_LEG_RIG: Record<string, string> = {
    mosquito: '淡色库蚊：六条极细长的腿连同停姿是自写的（唯一整套自写腿的物种）',
    'crane-fly': '大蚊：5cm 高跷腿自写，kit 的比例做不出那个夸张的细长',
    'hister-beetle': '阎甲：短粗的挖掘型足自写，全身是一条连续包络',
    'orchid-mantis': '兰花螳螂：花瓣状腿节自写（那正是它的招牌，也曾因几何过扁被目视打回重做）',
  }

  /** 只有部分腿走 kit 的物种：特化的那几条是自写的，将来要配物种专属动作 */
  const PARTIAL: Record<string, [number, string]> = {
    'whirligig-beetle': [2, '豉甲：中后足是桨状划水足，自写'],
    'assassin-bug': [4, '猎蝽：捕捉式前足自写'],
    cricket: [4, '迷卡斗蟋：弹跳后足自写'],
    'diving-beetle': [4, '黄缘龙虱：游泳后足自写'],
    katydid: [4, '优雅蝈螽：弹跳后足自写'],
    locust: [4, '东亚飞蝗：弹跳后足自写'],
    mantidfly: [4, '螳蛉：捕捉式前足自写（与螳螂趋同演化，是本种看点）'],
    mantis: [4, '中华大刀螳：捕捉式前足自写'],
    'mole-cricket': [4, '东方蝼蛄：开掘式前足自写'],
  }

  it('除名单外，全部物种都有六条可驱动的腿（随图鉴总数自动伸缩）', async () => {
    const { INSECTS } = await import('../../../data/insects.zh')
    const { loadInsectModel } = await import('../../registry')
    const wrong: string[] = []
    for (const insect of INSECTS) {
      if (insect.id in NO_LEG_RIG) continue
      const n = (await loadInsectModel(insect.id)).rig?.legs?.length ?? 0
      const want = PARTIAL[insect.id]?.[0] ?? 6
      if (n !== want) wrong.push(`${insect.name}(${insect.id}) 期望 ${want} 条，实得 ${n} 条`)
    }
    expect(
      wrong,
      `腿骨架数量与记录不符，步态会静默哑掉或只动一半：\n  ${wrong.join('\n  ')}\n` +
        '要么让它用 kit 的 leg()/legPair()，要么更新 NO_LEG_RIG / PARTIAL 并写明理由。',
    ).toEqual([])
  }, 60000)

  it('两份名单里都没有已经不存在的物种 —— 名单会腐烂，让它自己报警', async () => {
    const { INSECTS } = await import('../../../data/insects.zh')
    const ids = new Set(INSECTS.map((i) => i.id))
    const stale = [...Object.keys(NO_LEG_RIG), ...Object.keys(PARTIAL)].filter((id) => !ids.has(id))
    expect(stale, `名单里这些 id 已不在图鉴中：${stale.join('、')}`).toEqual([])
  })
})
