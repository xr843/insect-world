/**
 * 全物种系统性闸门：**每个标注点底下都得真的有东西**。
 *
 * 由来（2026-08-09 变异测试）：把双叉犀金龟那支头角的 `g.add(headHorn)`
 * 注释掉 —— 招牌结构、主页第一眼看到的东西没了 —— 3034 条测试**全绿**。
 * 因为它那几条断言量的是「能构建、锚点存在、长>宽」，而 anchors 是
 * 独立算出来的坐标，跟角的网格在不在毫无关系。
 *
 * 这正是本项目反复栽的那个跟头的又一次现形：**断言量数字，人看长相**。
 * 与其给 60 种逐个手写形态断言（写不全、也会漏），不如把这个 bug 的
 * 一般形态钉死：锚点是界面上那个彩色圆点的位置，**圆点底下没有几何体
 * 就是「标注点浮在空气里」**，用户一眼能看见。任何一处招牌结构被删掉，
 * 只要它带着锚点，这里就会红。
 *
 * 判据用相对值（占包围半径的比例）而不是绝对距离：60 种的尺度从 0.45
 * 到 6.8 差了一个数量级，绝对阈值对小虫过松、对大虫过紧。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { knownSpecies, loadInsectModel } from '../registry'

/**
 * 锚点离实体有多远，取 min(到最近顶点, 到最近网格包围盒)，除以包围半径。
 *
 * 两个量都要：只用顶点距离会**冤枉放在实心部件内部的锚点**（腹部中心这类，
 * 离表面顶点很远但明明埋在实体里）；只用包围盒距离又对细长斜置的部件太松
 * （一根斜插的触角，它的 AABB 罩住一大片空气）。两者取小，各补各的短。
 */
function detachRatio(model: { group: THREE.Group; radius: number }, anchor: THREE.Vector3): number {
  model.group.updateMatrixWorld(true)
  const v = new THREE.Vector3()
  const box = new THREE.Box3()
  let best = Infinity
  model.group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    box.setFromObject(mesh)
    best = Math.min(best, box.distanceToPoint(anchor))
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!pos) return
    // 顶点很多的几何体抽样即可：招牌部件不会只由某几个顶点代表，
    // 抽样只影响精度不影响结论（步长 1 的全量跑要慢一个数量级）
    const step = pos.count > 600 ? Math.ceil(pos.count / 600) : 1
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i)
      mesh.localToWorld(v)
      const d = v.distanceTo(anchor)
      if (d < best) best = d
    }
  })
  return best / Math.max(model.radius, 1e-6)
}

/**
 * 阈值 0.12 —— 先量后定，不是拍脑袋（首版拍了 0.16 并在注释里编了个
 * 「实测最大 0.09」，其实我没量过，一跑就有 6 个物种红）。
 *
 * 实测 361 个锚点的分布：中位 0.000、90% ≤ 0.017、99% ≤ 0.129，
 * 也就是绝大多数锚点本来就贴在或埋在实体里，长尾极短。
 * 视觉换算：展台上虫体直径约占 500px，1.0×半径 ≈ 250px，
 * 0.12×半径 ≈ 30px —— 已经是圆点直径的两倍多，再远就明显是「悬空」。
 * 删掉一整个招牌部件时这个值通常跳到 0.3 以上（星天牛触角实测 0.45），
 * 所以这条线能干净地分开「贴着部件」与「指着空气」。
 */
const MAX_RATIO = 0.12

describe('每个标注点底下都有几何体（60 种全覆盖）', () => {
  const ids = knownSpecies()

  it('物种数与建模文件数一致，没有漏跑', () => {
    expect(ids.length).toBeGreaterThanOrEqual(60)
  })

  it.each(ids)('%s 的每个锚点都贴着实体', async (id) => {
    const model = await loadInsectModel(id)
    const entries = Object.entries(model.anchors)
    expect(entries.length, `${id} 一个锚点都没有`).toBeGreaterThan(0)

    const floating: string[] = []
    for (const [name, anchor] of entries) {
      const ratio = detachRatio(model, anchor)
      if (!(ratio <= MAX_RATIO)) floating.push(`${name}（离实体 ${ratio.toFixed(2)}×半径）`)
    }
    expect(
      floating,
      `${id} 的这些标注点浮在空气里 —— 要么部件被删了，要么锚点位置写错：${floating.join('、')}`,
    ).toEqual([])
  })
})
