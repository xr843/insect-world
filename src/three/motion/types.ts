/**
 * 动作层的契约。
 *
 * **动作只写姿态，绝不碰几何。** 几何是构建期的产物（`builders/`），
 * 姿态是渲染期的状态；混在一起就会退回到「想动一下得整只虫重建」的老路，
 * 那正是骨架化要解决的问题。
 *
 * 所以这一层的每个函数都是纯的：给它一个 `InsectRig` 和一个时间，
 * 它只往关节的 `rotation` 上写数。不需要 WebGL、不需要 r3f，
 * node 里就能逐帧断言 —— 这也是它能被测住的原因。
 */
import type * as THREE from 'three'
import type { InsectRig } from '../builders/kit'

/**
 * 一个动作：把 rig 的姿态推到时刻 t（秒）应有的样子。
 *
 * 必须是**幂等且无状态**的：同一个 t 调两次结果一样，不依赖上一帧。
 * 按需渲染（`frameloop='demand'`）下掉帧是常态，靠增量累加的写法会漂。
 */
export type Motion = (rig: InsectRig, t: number) => void

/**
 * 真实拍翅频率 → 屏幕上看得出来的频率。
 *
 * 为什么必须压：蜜蜂 230Hz、食蚜蝇 200Hz，而屏幕 60fps 的奈奎斯特上限是 30Hz。
 * 照实数驱动的结果不是「快」，是**混叠** —— 翅膀会看起来在慢慢倒着扇，
 * 或者干脆定住不动（车轮效应）。这是采样定理，不是性能问题，
 * 换再高的刷新率也只是把界限往上挪。
 *
 * 压法用对数而不是线性截断，为的是**保住物种之间的相对次序**：
 * 豆娘确实比蜻蜓慢、蜻蜓确实比蜜蜂慢，压完还是这个次序。
 * 落点 4~12Hz。上限卡在 12 是按帧数算的：60fps 下 12Hz 还有 5 帧走完一个周期，
 * 勉强能看出「扇」；再往上帧数不够，快的和更快的看起来一样，压上去没有收益
 * 只有走样。下限 4Hz 是「还看得清每一次扇动」。
 *
 * 真实频率本身留在 `HOVERERS` 表里，那是可核对的数据；
 * 这个函数是明摆着的视觉妥协，不藏。
 */
export function visualWingbeat(realHz: number): number {
  const BASE = 16 // 最慢的豆娘，映射到下面的 FLOOR
  const FLOOR = 4
  const SCALE = 2.0
  return FLOOR + SCALE * Math.log2(Math.max(realHz, BASE) / BASE)
}

/** 把一个动作限制在「有该部件才跑」，省得每个动作自己判空 */
export function needsWings(fn: Motion): Motion {
  return (rig, t) => {
    if (rig.wings?.length) fn(rig, t)
  }
}

/** 同上，腿 */
export function needsLegs(fn: Motion): Motion {
  return (rig, t) => {
    if (rig.legs?.length) fn(rig, t)
  }
}

export type { InsectRig }

// ---------------------------------------------------------------- 进出场

/** 幅度权重每秒变化多少（1/0.25s）—— 进出各 0.25 秒 */
export const BLEND_RATE = 4

/**
 * 把幅度权重朝目标推一帧。
 *
 * 单独抽出来是因为它和下面的 `applyBlended` 一起出过一个只有实测才撞得出的 bug，
 * 见那边的注释。留在这里能被 node 直接测。
 */
export function stepBlend(current: number, target: number, dt: number, rate = BLEND_RATE): number {
  const delta = target - current
  return current + Math.sign(delta) * Math.min(Math.abs(delta), dt * rate)
}

/**
 * 按幅度权重施加一个动作。
 *
 * ⚠️ **收拢那一步无论 blend 是多少都要走**，blend 为 0 时它正好把部件按回 rest。
 *
 * 第一版写成了「blend > 0 才写」，实测当场翻车：`dt * rate` 一旦 ≥ 1，
 * blend 会**一帧从 1 直接掉到 0**，那一帧就整个跳过了写入，上一帧的全幅姿态
 * 于是永久留在模型上 —— 翅僵在冲程中间，而且再也不会有下一帧来纠正它
 * （blend 到 0 之后调用方就不再续帧了）。
 *
 * dt ≥ 0.25s 听着离谱，但按需渲染（`frameloop='demand'`）下**从暂停里醒来的
 * 第一帧就是这么大的 dt**；慢设备、后台标签页切回来同理。
 */
export function applyBlended(rig: InsectRig, motion: Motion, t: number, blend: number): void {
  if (blend > 0) motion(rig, t)
  for (const w of rig.wings ?? []) blendToward(w.pivot.rotation, w.rest, blend)
  for (const l of rig.legs ?? []) {
    blendToward(l.coxa.rotation, l.rest.coxa, blend)
    blendToward(l.femur.rotation, l.rest.femur, blend)
    blendToward(l.tibia.rotation, l.rest.tibia, blend)
    blendToward(l.tarsus.rotation, l.rest.tarsus, blend)
  }
}

/**
 * 把一个 Euler 按权重朝 rest 收。三轴都收，不只收动作实际写过的那一轴 ——
 * 「哪些轴被写过」是各个动作的私事，收拢这一层不该知道，也不该每加一个新动作
 * 就回来补一轴。blend=1 时是恒等，blend=0 时精确落回 rest。
 */
function blendToward(cur: THREE.Euler, rest: THREE.Euler, blend: number): void {
  cur.x = rest.x + (cur.x - rest.x) * blend
  cur.y = rest.y + (cur.y - rest.y) * blend
  cur.z = rest.z + (cur.z - rest.z) * blend
}
