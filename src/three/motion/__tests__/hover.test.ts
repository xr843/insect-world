/**
 * 悬停振翅。
 *
 * 这份测试里最要紧的不是「翅动了没有」，是**两片翅是不是一起上下**。
 * 左翅整组带 `scale.z = -1`、rest.x 也取过负，`side` 因子写错的话
 * 一片抬起另一片压下 —— 变成剪刀而不是扑翅。几何全合法、动画也在跑、
 * 没有任何断言会红，只有人眼能看出不对。所以这里直接量**世界坐标下
 * 左右翅尖的高度差**，那正是眼睛看的那个量。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { HOVERERS, animatedSpecies, makeHover, motionFor, visualWingbeat } from '..'

describe('visualWingbeat：真实频率压到屏幕能显示的范围', () => {
  it('保住物种之间的相对次序', () => {
    const ids = Object.keys(HOVERERS)
    const real = ids.map((id) => HOVERERS[id].realHz)
    const vis = real.map(visualWingbeat)
    for (let i = 0; i < ids.length; i++) {
      for (let j = 0; j < ids.length; j++) {
        if (real[i] < real[j]) expect(vis[i]).toBeLessThan(vis[j])
      }
    }
  })

  it('全部落在 4~12Hz —— 低于 4 像慢动作，高于 12 则 60fps 下一个周期不足 5 帧', () => {
    for (const [id, spec] of Object.entries(HOVERERS)) {
      const v = visualWingbeat(spec.realHz)
      expect(v, `${id} 压出 ${v.toFixed(1)}Hz`).toBeGreaterThanOrEqual(4)
      expect(v, `${id} 压出 ${v.toFixed(1)}Hz`).toBeLessThan(12)
    }
  })

  it('低于基准的不再往下压 —— 免得出现比 4Hz 还慢的「一秒才扇一下」', () => {
    expect(visualWingbeat(5)).toBe(visualWingbeat(16))
  })
})

// ---------------------------------------------------------------- 行为

/** 用真模型跑，不用手搓的假 rig —— 假 rig 验不出 side 与 scale.z 的相互作用 */
async function loadRig(id: string) {
  const { loadInsectModel } = await import('../../registry')
  const model = await loadInsectModel(id)
  return model
}

/** 一片翅的翅尖在世界坐标里的位置：取该 pivot 子树里离 pivot 最远的顶点 */
function wingTip(root: THREE.Object3D, pivot: THREE.Object3D): THREE.Vector3 {
  root.updateMatrixWorld(true)
  const origin = pivot.getWorldPosition(new THREE.Vector3())
  const v = new THREE.Vector3()
  let best = new THREE.Vector3()
  let far = -1
  pivot.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    const pos = m.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld)
      const d = v.distanceTo(origin)
      if (d > far) {
        far = d
        best = v.clone()
      }
    }
  })
  return best
}

describe('扑翅是上下扇动，不是剪刀', () => {
  it.each(['dragonfly', 'honeybee', 'hoverfly'])('%s：左右翅尖始终等高', async (id) => {
    const model = await loadRig(id)
    const motion = motionFor(id)!
    expect(motion).toBeTruthy()
    const wings = model.rig!.wings!
    // 按 role 分组后再配左右，四翅物种不能把前翅和后翅配成一对
    const groups = new Map<string, typeof wings>()
    for (const w of wings) {
      const key = w.role ?? 'fore'
      groups.set(key, [...(groups.get(key) ?? []), w])
    }
    let checked = 0
    for (let step = 0; step < 8; step++) {
      const t = step * 0.037
      motion(model.rig!, t)
      for (const [role, pair] of groups) {
        const R = pair.find((w) => w.side === 1)
        const L = pair.find((w) => w.side === -1)
        if (!R || !L) continue
        const yR = wingTip(model.group, R.pivot).y
        const yL = wingTip(model.group, L.pivot).y
        const span = model.radius
        expect(
          Math.abs(yR - yL),
          `${id} 的 ${role} 翅在 t=${t.toFixed(3)} 高度差 ${(yR - yL).toFixed(3)}（体半径 ${span.toFixed(2)}）—— 左右不同步就成剪刀了`,
        ).toBeLessThan(span * 0.06)
        checked++
      }
    }
    expect(checked, '一对翅都没配上，这条测试等于没跑').toBeGreaterThan(0)
  })

  it('蜻蜓的前后翅反相 —— 这是它能悬停的原因，也是一眼认出蜻蜓的动态特征', async () => {
    const model = await loadRig('dragonfly')
    const motion = motionFor('dragonfly')!
    const wings = model.rig!.wings!
    const fore = wings.find((w) => w.side === 1 && w.role === 'fore')!
    const hind = wings.find((w) => w.side === 1 && w.role === 'hind')!
    expect(fore && hind).toBeTruthy()
    // 前翅在最高点的那一刻，后翅应在最低点附近
    const freq = visualWingbeat(HOVERERS.dragonfly.realHz)
    const tPeak = 1 / (4 * freq) // sin 达到 +1
    motion(model.rig!, tPeak)
    const foreOffset = fore.pivot.rotation.x - fore.rest.x
    const hindOffset = hind.pivot.rotation.x - hind.rest.x
    expect(foreOffset).toBeGreaterThan(0)
    expect(hindOffset).toBeLessThan(0)
    expect(Math.abs(foreOffset + hindOffset)).toBeLessThan(1e-6)
  })
})

describe('动作是纯的', () => {
  it('无状态：同一个 t 调两次结果一样', async () => {
    const model = await loadRig('honeybee')
    const motion = motionFor('honeybee')!
    motion(model.rig!, 1.234)
    const a = model.rig!.wings!.map((w) => w.pivot.rotation.x)
    motion(model.rig!, 9.9) // 中间插一帧别的时刻
    motion(model.rig!, 1.234)
    expect(model.rig!.wings!.map((w) => w.pivot.rotation.x)).toEqual(a)
  })

  it('只写 rotation，不碰几何：顶点总数与包围半径不变', async () => {
    const model = await loadRig('honeybee')
    const count = () => {
      let n = 0
      model.group.traverse((o) => {
        const m = o as THREE.Mesh
        if (m.isMesh) n += m.geometry.getAttribute('position').count
      })
      return n
    }
    const before = count()
    const r = model.radius
    for (let i = 0; i < 5; i++) motionFor('honeybee')!(model.rig!, i * 0.1)
    expect(count()).toBe(before)
    expect(model.radius).toBe(r)
  })

  it('始终以 rest 为基准做偏移 —— 不许把逐只调出来的展角抹平', () => {
    const rest = new THREE.Euler(0.21, 1.37, -0.4)
    const pivot = new THREE.Object3D()
    pivot.rotation.copy(rest)
    const rig = { wings: [{ pivot, rest: rest.clone(), side: 1 as const, base: new THREE.Vector3() }] }
    const motion = makeHover({ freq: 8, amplitude: 0.5, hindPhase: 0 })
    motion(rig, 0) // sin(0)=0，此刻应正好回到 rest
    expect(pivot.rotation.x).toBeCloseTo(rest.x, 10)
    // 另外两轴永远不动 —— 扑翅只走 X
    motion(rig, 0.031)
    expect(pivot.rotation.y).toBe(rest.y)
    expect(pivot.rotation.z).toBe(rest.z)
  })
})

describe('注册表', () => {
  it('没配动作的物种返回 null —— 没有默认动作，凭空让步甲悬停会毁掉可信度', () => {
    expect(motionFor('rhinoceros-beetle')).toBeNull()
    expect(motionFor('ladybird')).toBeNull()
    expect(motionFor('不存在的虫')).toBeNull()
  })

  it('配了动作的物种必须真有翅骨架 —— 否则动作静默空转', async () => {
    const { loadInsectModel } = await import('../../registry')
    const dead: string[] = []
    for (const id of animatedSpecies()) {
      const model = await loadInsectModel(id)
      if (!model.rig?.wings?.length) dead.push(id)
    }
    expect(dead, `这些物种配了悬停动作却没有翅骨架，动画会安静地什么都不做：${dead.join('、')}`).toEqual([])
  }, 30000)

  it('注册表里没有已经不存在的物种 —— 名单会腐烂，让它自己报警', async () => {
    const { INSECTS } = await import('../../../data/insects.zh')
    const ids = new Set(INSECTS.map((i) => i.id))
    const stale = animatedSpecies().filter((id) => !ids.has(id))
    expect(stale, `注册表里这些 id 已不在图鉴中：${stale.join('、')}`).toEqual([])
  })
})
