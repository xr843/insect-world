/**
 * D 轮触角微动的 kit 侧钩子。
 *
 * 摆动本体在 InsectCanvas 里（r3f 运行时，node 测不了），这里钉住它赖以工作的
 * 两个前提：触角组有名字可寻、基点坐标可用 —— 任一断掉，展台那边不会报错，
 * 触角只是安静地不动（静默降级，正是最难发现的那种）。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { antenna, antennaPair, chitin } from '../kit'

const mat = chitin({ color: '#333' })

describe('触角组的微动钩子', () => {
  it('antenna() 的组名为 antenna，userData.base 是三元数组', () => {
    const a = antenna({ base: [1, 0.2, 0.15], length: 1, kind: 'filiform', yaw: 25 }, mat)
    expect(a.name).toBe('antenna')
    expect(a.userData.base).toEqual([1, 0.2, 0.15])
  })

  it('antennaPair() 两侧都带钩子，且基点 z 符号相反（相位错开的依据）', () => {
    const pair = antennaPair({ base: [1, 0.2, 0.15], length: 1, kind: 'filiform', yaw: 25 }, mat)
    const bases = pair.children.map((c) => c.userData.base as [number, number, number])
    expect(pair.children.every((c) => c.name === 'antenna')).toBe(true)
    expect(Math.sign(bases[0][2])).toBe(-Math.sign(bases[1][2]))
  })

  it('钩子不改几何：挂名前后顶点数一致（与历史快照对比的替代——同参数两次构建一致）', () => {
    const count = (g: THREE.Group) => {
      let n = 0
      g.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) n += m.geometry.getAttribute('position').count
      })
      return n
    }
    const a = antenna({ base: [0.5, 0.1, 0.1], length: 0.8, kind: 'lamellate' }, mat)
    const b = antenna({ base: [0.5, 0.1, 0.1], length: 0.8, kind: 'lamellate' }, mat)
    expect(count(a)).toBeGreaterThan(0)
    expect(count(a)).toBe(count(b))
  })
})

describe('每个物种的触角都接上了微动钩子', () => {
  /**
   * 这条是用户实测抓出来的返工：当年 9 只自写触角的物种（星天牛为首——触角恰是
   * 它的招牌）没有钩子，触角安静地不动，而我在验收单里没验证就点名
   * 「天牛最明显」。静默降级 + 未验证的承诺，两个错叠在一起。
   * 现在全量普查：除显式豁免（真的没有触角的物种）外，每只虫的模型里
   * 必须至少有一个带 base 的 antenna 组。
   */
  const EXEMPT = new Set([
    'tortoise-beetle', // 甘薯腊龟甲：头缩在前胸下，本就无外露触角（连 antenna anchor 都没有）
  ])

  it('除豁免名单外，全部物种都有可摆动的触角组（随图鉴总数自动伸缩）', async () => {
    const { INSECTS } = await import('../../../data/insects.zh')
    const { loadInsectModel } = await import('../../registry')
    const dead: string[] = []
    for (const insect of INSECTS) {
      if (EXEMPT.has(insect.id)) continue
      const model = await loadInsectModel(insect.id)
      let hooks = 0
      model.group.traverse((o) => {
        if (o.name === 'antenna' && Array.isArray(o.userData?.base)) hooks++
      })
      if (hooks === 0) dead.push(`${insect.name}(${insect.id})`)
    }
    expect(
      dead,
      `这些物种的触角没有微动钩子，展台上会安静地不动（自写触角函数记得设 name='antenna' 与 userData.base）：\n${dead.join('、')}`,
    ).toEqual([])
    // 第 7 轮到 63 种后本测试空载已 3.3s，默认 5s 超时在并行/CI 负载下会被吃穿——
    // 它是全量普查，慢是本分，放宽到 20s（同规格的 registry-lru 一并放宽）
  }, 20_000)
})
