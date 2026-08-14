/**
 * 模型缓存的 LRU 行为。
 *
 * 缓存原先只进不出 —— 方向键逐只翻完 50 种后，50 套几何体全部留在显存里。
 * 这里钉住三件事：规模有上限、最近用过的不被清、被清掉的能重建。
 *
 * ⚠️ 本文件会真实触发逐出，会影响其他测试观察到的缓存内容，
 * 所以只在这一个文件里做，且断言不依赖进入本文件前的缓存状态。
 */
import { describe, expect, it } from 'vitest'
import { INSECTS } from '../../data/insects.zh'
import { cacheStats, loadInsectModel } from '../registry'

describe('模型缓存有上限', () => {
  it('连续加载 20 个物种后，缓存不超过 12 个', async () => {
    const ids = INSECTS.slice(0, 20).map((i) => i.id)
    for (const id of ids) await loadInsectModel(id)

    const { size, ids: kept } = cacheStats()
    expect(size).toBeLessThanOrEqual(12)
    // 留下的应当是最近加载的那一批 —— 最后一个必然在
    expect(kept).toContain(ids[ids.length - 1])
    // 最早加载的应当已被逐出
    expect(kept).not.toContain(ids[0])
    // 真建 20 个模型本来就重（空载 ~1.6s），并行/CI 负载下 5s 默认超时会偶发吃穿
  }, 20_000)

  it('重复访问会续命 —— 反复用的物种不被逐出', async () => {
    const ids = INSECTS.slice(0, 20).map((i) => i.id)
    const keep = ids[0]
    const kept0 = await loadInsectModel(keep)
    for (const id of ids.slice(1)) {
      await loadInsectModel(id)
      await loadInsectModel(keep) // 每次都回头摸一下
    }
    expect(cacheStats().ids).toContain(keep)
    // 而且一直是同一个实例，从没被重建过
    expect(await loadInsectModel(keep)).toBe(kept0)
  })

  it('被逐出的物种再次加载会重建出新实例，且几何完好', async () => {
    const ids = INSECTS.slice(0, 20).map((i) => i.id)
    const victim = ids[0]
    const first = await loadInsectModel(victim)
    for (const id of ids.slice(1)) await loadInsectModel(id) // 挤出去
    expect(cacheStats().ids).not.toContain(victim)

    const rebuilt = await loadInsectModel(victim)
    expect(rebuilt).not.toBe(first)
    expect(rebuilt.radius).toBeGreaterThan(0)
    let meshes = 0
    rebuilt.group.traverse((o) => {
      if ((o as { isMesh?: boolean }).isMesh) meshes++
    })
    expect(meshes).toBeGreaterThan(5)
  })
})
