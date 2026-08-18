/**
 * 羽化展翅。
 *
 * 这是生活史里唯一一段做成连续形变的东西 —— 因为它本来就是连续的：刚出蛹的
 * 翅是一小团皱缩的软组织，靠血淋巴撑开再硬化。其余阶段之间不做 morph
 * （毛虫变蝴蝶不是连续形变，硬 morph 好看但错）。
 *
 * 这里守的两条，都是「几何合法、动画在跑、没有断言会红，只有人眼看得出不对」
 * 的那一类：
 *
 * 1. **左翅不许翻到对侧。** `wing()` 用 `scale.z = ±1` 做左右镜像，缩放若走
 *    `setScalar()` 会把那个负号抹掉 —— 左翅当场镜像翻转，而尺寸、位置、
 *    旋转全都「正确」。
 * 2. **走完必须精确回到静止态。** 停在 0.99 倍的翅永远比别的虫小一点点，
 *    小到说不出哪里不对，但它就是不对。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { EMERGE_DEFAULTS, makeEmerge, resetEmerge } from '..'
import type { InsectRig } from '../types'

const emerge = makeEmerge()

async function load(id: string) {
  const { loadInsectModel } = await import('../../registry')
  return loadInsectModel(id)
}

describe('翅从皱缩撑开', () => {
  it('u=0 时只有静止尺寸的一小部分，u=1 时满幅', async () => {
    const model = await load('monarch-butterfly')
    const rig = model.rig!
    expect(rig.wings?.length, '帝王蝶应当有翅骨架').toBeGreaterThan(0)
    const w = rig.wings![0]
    emerge(rig, 0)
    expect(Math.abs(w.pivot.scale.x / w.restScale.x)).toBeCloseTo(EMERGE_DEFAULTS.startScale, 5)
    emerge(rig, 1)
    expect(Math.abs(w.pivot.scale.x / w.restScale.x)).toBeCloseTo(1, 5)
  }, 30000)

  it('单调撑开：进度越大翅越大，中途不回缩', async () => {
    const model = await load('monarch-butterfly')
    const rig = model.rig!
    const w = rig.wings![0]
    let prev = -1
    for (let i = 0; i <= 20; i++) {
      emerge(rig, i / 20)
      const k = Math.abs(w.pivot.scale.x)
      expect(k, `u=${(i / 20).toFixed(2)} 时回缩了`).toBeGreaterThanOrEqual(prev)
      prev = k
    }
  }, 30000)

  it('先快后慢：前四分之一就撑开一半以上', async () => {
    const model = await load('monarch-butterfly')
    const rig = model.rig!
    const w = rig.wings![0]
    const frac = (u: number) => {
      emerge(rig, u)
      const k = Math.abs(w.pivot.scale.x / w.restScale.x)
      return (k - EMERGE_DEFAULTS.startScale) / (1 - EMERGE_DEFAULTS.startScale)
    }
    // 1-(1-u)³ 在 u=0.25 处是 0.578；真实的翅展开就是这个节奏（一开始压力最大）
    expect(frac(0.25)).toBeGreaterThan(0.5)
    // 也别快到看不出过程：u=0.05 时还不到七成
    expect(frac(0.05)).toBeLessThan(0.7)
  }, 30000)
})

describe('左翅不许翻到对侧', () => {
  it('全程保持 restScale.z 的符号 —— setScalar 会把镜像的负号抹掉', async () => {
    const model = await load('monarch-butterfly')
    const rig = model.rig!
    const mirrored = rig.wings!.filter((w) => w.restScale.z < 0)
    expect(mirrored.length, '应当有一半的翅是靠负 scale.z 镜像出来的').toBeGreaterThan(0)
    for (const u of [0, 0.3, 0.7, 1]) {
      emerge(rig, u)
      for (const w of mirrored) {
        expect(
          Math.sign(w.pivot.scale.z),
          `u=${u} 时左翅的 scale.z 变正了，它会整片翻到对侧去`,
        ).toBe(Math.sign(w.restScale.z))
      }
    }
  }, 30000)

  it('左右翅同向下垂，不是一上一下', () => {
    const mk = (side: 1 | -1) => {
      const pivot = new THREE.Object3D()
      pivot.rotation.set(0.2, 0.4, 0)
      pivot.scale.set(1, 1, side)
      return { pivot, rest: pivot.rotation.clone(), restScale: pivot.scale.clone(), side, base: new THREE.Vector3() }
    }
    const R = mk(1)
    const L = mk(-1)
    const rig: InsectRig = { wings: [R, L] }
    emerge(rig, 0)
    // 与静止姿态的偏移应当**反号**（side 因子），那正是「同向下垂」在镜像下的写法
    const dR = R.pivot.rotation.x - R.rest.x
    const dL = L.pivot.rotation.x - L.rest.x
    expect(dR).not.toBe(0)
    expect(Math.sign(dR)).toBe(-Math.sign(dL))
    expect(Math.abs(dR)).toBeCloseTo(Math.abs(dL), 10)
  })
})

describe('收尾必须精确归位', () => {
  it('resetEmerge 把缩放与旋转都还原到静止态', async () => {
    const model = await load('monarch-butterfly')
    const rig = model.rig!
    emerge(rig, 0.4)
    resetEmerge(rig)
    for (const w of rig.wings!) {
      expect(w.pivot.scale.x - w.restScale.x).toBe(0)
      expect(w.pivot.scale.y - w.restScale.y).toBe(0)
      expect(w.pivot.scale.z - w.restScale.z).toBe(0)
      expect(w.pivot.rotation.x - w.rest.x).toBe(0)
    }
  }, 30000)

  it('只动 X 轴旋转，另外两轴不碰 —— 逐只调出来的展角/掠角不许被抹平', async () => {
    const model = await load('monarch-butterfly')
    const rig = model.rig!
    const w = rig.wings![0]
    const y = w.pivot.rotation.y
    const z = w.pivot.rotation.z
    emerge(rig, 0.37)
    expect(w.pivot.rotation.y).toBe(y)
    expect(w.pivot.rotation.z).toBe(z)
  }, 30000)
})

describe('没有翅骨架时空转', () => {
  it('甲虫（鞘翅自写、无翅骨架）不抛异常也不动', async () => {
    const model = await load('rhinoceros-beetle')
    expect(model.rig?.wings ?? []).toHaveLength(0)
    expect(() => emerge(model.rig!, 0.5)).not.toThrow()
    expect(() => resetEmerge(model.rig!)).not.toThrow()
  }, 30000)

  it('空 rig 也不抛', () => {
    expect(() => emerge({}, 0.5)).not.toThrow()
    expect(() => resetEmerge({})).not.toThrow()
  })
})
