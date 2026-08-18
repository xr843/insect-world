/**
 * 静息微动。
 *
 * 这份测试要守的边界只有一条，而且它是**产品判断不是技术判断**：
 * 微动与「原地走路」之间隔着一个幅度阈值。展台是转台、虫子居中，
 * 腿迈得稍微大一点，读出来立刻从「这只虫是活的」变成「这只虫在踏步机上」。
 * 所以下面有一条断言直接量**足尖在一个完整周期里跑了多远**，
 * 那正是眼睛判断「它是在调整姿势还是在走路」的依据。
 *
 * 另一条守的是：六条腿不许同相位。同相位摆动读成「整只虫在抖」，比不动更糟。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { IDLE_DEFAULTS, applyBlended, makeIdle, motionFor, stepBlend } from '..'

const idle = makeIdle()

async function load(id: string) {
  const { loadInsectModel } = await import('../../registry')
  return loadInsectModel(id)
}

/** 足尖（tarsus 子树里离 tarsus 原点最远的顶点）的世界坐标 */
function footTip(root: THREE.Object3D, tarsus: THREE.Object3D): THREE.Vector3 {
  root.updateMatrixWorld(true)
  const origin = tarsus.getWorldPosition(new THREE.Vector3())
  const v = new THREE.Vector3()
  let best = new THREE.Vector3()
  let far = -1
  tarsus.traverse((o) => {
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

describe('幅度守在「活着」这一侧，不许滑向「走路」', () => {
  it.each(['rhinoceros-beetle', 'ladybird', 'longhorn-beetle', 'ground-beetle'])(
    '%s：足尖一个完整周期内的行程 < 体半径的 6%%',
    async (id) => {
      const model = await load(id)
      const legs = model.rig!.legs!
      expect(legs.length).toBeGreaterThan(0)
      // 慢的那个频率是 0.31Hz，周期约 3.2 秒；取 4 秒覆盖一整轮
      const samples: THREE.Vector3[][] = []
      for (let k = 0; k <= 24; k++) {
        idle(model.rig!, (k / 24) * 4)
        samples.push(legs.map((l) => footTip(model.group, l.tarsus)))
      }
      let worst = 0
      for (let li = 0; li < legs.length; li++) {
        const pts = samples.map((s) => s[li])
        for (const a of pts) for (const b of pts) worst = Math.max(worst, a.distanceTo(b))
      }
      expect(
        worst,
        `足尖行程 ${worst.toFixed(3)}，体半径 ${model.radius.toFixed(2)} —— ` +
          '超过这个量就开始读成原地踏步了，调 IDLE_DEFAULTS.amplitude 之前先想清楚',
      ).toBeLessThan(model.radius * 0.06)
      // 也不能小到等于没动
      expect(worst, '足尖完全没动，微动等于没做').toBeGreaterThan(model.radius * 0.002)
    },
    30000,
  )
})

describe('六条腿不许同相位', () => {
  it('同一时刻各腿的偏移互不相同 —— 同相位会读成整只虫在抖', async () => {
    const model = await load('ground-beetle')
    const legs = model.rig!.legs!
    idle(model.rig!, 0.77)
    const offsets = legs.map((l) => +(l.coxa.rotation.y - l.rest.coxa.y).toFixed(5))
    expect(new Set(offsets).size, `六条腿只有 ${new Set(offsets).size} 种偏移：${offsets}`).toBeGreaterThan(3)
  }, 30000)

  it('相位由着生位置决定，与 collectRig 的遍历顺序无关', () => {
    // 两条 base.x 相同、侧别相反的腿必须错相位；
    // 用下标定相位的写法在这里会给出相同值。
    const mk = (x: number, side: 1 | -1) => ({
      coxa: new THREE.Object3D(),
      femur: new THREE.Object3D(),
      tibia: new THREE.Object3D(),
      tarsus: new THREE.Object3D(),
      rest: {
        coxa: new THREE.Euler(),
        femur: new THREE.Euler(),
        tibia: new THREE.Euler(),
        tarsus: new THREE.Euler(),
      },
      side,
      base: new THREE.Vector3(x, 0, side * 0.5),
    })
    const a = mk(0.6, 1)
    const b = mk(0.6, -1)
    idle({ legs: [a, b] }, 0.4)
    // 侧别因子会让符号相反，比绝对值才看得出相位是否真的错开
    expect(Math.abs(a.coxa.rotation.y)).not.toBeCloseTo(Math.abs(b.coxa.rotation.y), 4)
  })
})

describe('确定性与纯度', () => {
  it('无随机数：同一个 t 两次结果完全一致', async () => {
    const model = await load('ladybird')
    idle(model.rig!, 2.5)
    const a = model.rig!.legs!.map((l) => l.coxa.rotation.y)
    idle(model.rig!, 7.1)
    idle(model.rig!, 2.5)
    expect(model.rig!.legs!.map((l) => l.coxa.rotation.y)).toEqual(a)
  }, 30000)

  it('没有腿骨架时空转，不抛异常', () => {
    expect(() => idle({}, 1)).not.toThrow()
    expect(() => idle({ wings: [] }, 1)).not.toThrow()
  })
})

describe('收拢也要把腿放回 rest', () => {
  it('权重归零那一帧，四个关节全部精确回到 rest', async () => {
    const model = await load('ladybird')
    const motion = motionFor('ladybird')
    let blend = 1
    applyBlended(model.rig!, motion, 1.3, blend)
    const legs = model.rig!.legs!
    expect(legs.some((l) => l.coxa.rotation.y !== l.rest.coxa.y), '先得真的动起来').toBe(true)

    // 一帧超大 dt（按需渲染从暂停里醒来就是这个量级），权重直接掉到 0
    blend = stepBlend(blend, 0, 0.4)
    expect(blend).toBe(0)
    applyBlended(model.rig!, motion, 2.9, blend)
    for (const l of legs) {
      for (const [joint, rest] of [
        [l.coxa, l.rest.coxa],
        [l.femur, l.rest.femur],
        [l.tibia, l.rest.tibia],
        [l.tarsus, l.rest.tarsus],
      ] as const) {
        /*
         * 断言差值为零，不用 toBe(rest.x)：Object.is 会把 -0 与 +0 判成不等，
         * 而 `-0 + (x - -0) * 0` 在 IEEE754 下必然得到 +0。两者数值相同、
         * 渲染也相同，这里要的是「精确回到 rest」而不是「连符号位都一样」。
         */
        expect(joint.rotation.x - rest.x).toBe(0)
        expect(joint.rotation.y - rest.y).toBe(0)
        expect(joint.rotation.z - rest.z).toBe(0)
      }
    }
  }, 30000)
})

describe('默认参数', () => {
  it('两个频率不可通约 —— 比值是无理数量级，合成波不会周期性归位', () => {
    const { freqA, freqB } = IDLE_DEFAULTS
    const ratio = freqA / freqB
    // 不能是简单整数比（1:1、2:1、3:2 之类都会让合成波很快重复）
    for (const [p, q] of [[1, 1], [2, 1], [3, 1], [3, 2], [4, 3], [5, 3], [5, 4]]) {
      expect(Math.abs(ratio - p / q), `频率比 ${ratio.toFixed(3)} 太接近 ${p}:${q}`).toBeGreaterThan(0.04)
    }
  })

  it('幅度不超过 2.5° —— 这是微动与踏步的分界线', () => {
    expect(IDLE_DEFAULTS.amplitude).toBeLessThanOrEqual((2.5 * Math.PI) / 180)
  })
})
