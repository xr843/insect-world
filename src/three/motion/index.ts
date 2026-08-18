/**
 * 动作注册表：哪只虫配哪个动作。
 *
 * 保持「查不到就是不动」——**没有默认动作**。给一只不该动的虫配上动作，
 * 比它安静地站着糟得多：图鉴的可信度建立在「每处形态都有依据」上，
 * 凭空让步甲原地悬停会当场毁掉这一点。
 *
 * 动作的挂载与门控在 `InsectCanvas` 里（按需渲染的自续帧、
 * `prefers-reduced-motion`、拖动/读卡时让位），这里只管映射。
 */
import { HOVERERS, makeHover } from './hover'
import { makeIdle } from './idle'
import { visualWingbeat, type Motion } from './types'

/** 把几个动作按顺序施加到同一个 rig 上（各管各的关节，互不覆盖） */
export function combine(...motions: Motion[]): Motion {
  return (rig, t) => {
    for (const m of motions) m(rig, t)
  }
}

/**
 * 静息微动**对所有虫都成立** —— 活着的昆虫站定时从不是石头，
 * 姿势微调是普遍行为，不是某几个物种的特技。它自己会在没有腿骨架时空转，
 * 所以不必按物种登记。
 */
const IDLE = makeIdle()

/** 悬停振翅是**行为**，只给本来就会悬停的那几只；查不到就没有。 */
const HOVER: Record<string, Motion> = Object.fromEntries(
  Object.entries(HOVERERS).map(([id, spec]) => [
    id,
    makeHover({
      freq: visualWingbeat(spec.realHz),
      amplitude: spec.amplitude,
      hindPhase: spec.hindPhase,
    }),
  ]),
)

const REGISTRY: Record<string, Motion> = Object.fromEntries(
  Object.entries(HOVER).map(([id, hover]) => [id, combine(IDLE, hover)]),
)

/**
 * 取这只虫该跑的动作。
 *
 * **永远不为 null**：静息微动是普遍的，没有腿骨架的虫它自己空转。
 * 「不给虫配它没有的行为」这条原则管的是 hover 那一层 —— 让步甲原地悬停
 * 会毁掉「每处形态都有依据」，而让它站着时轻微调整重心不会。
 */
export function motionFor(speciesId: string): Motion {
  return REGISTRY[speciesId] ?? IDLE
}

/** 配了悬停振翅的物种（测试与文档用；静息微动是全体，不在此列） */
export function animatedSpecies(): string[] {
  return Object.keys(HOVER).sort()
}

export { HOVERERS, makeHover } from './hover'
export { IDLE_DEFAULTS, makeIdle } from './idle'
export { EMERGE_DEFAULTS, makeEmerge, resetEmerge } from './emerge'
export { BLEND_RATE, applyBlended, stepBlend, visualWingbeat, type Motion } from './types'
