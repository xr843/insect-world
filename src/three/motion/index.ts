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
import { visualWingbeat, type Motion } from './types'

/** 物种 id → 动作。构建期一次性算好，运行时只查表。 */
const REGISTRY: Record<string, Motion> = Object.fromEntries(
  Object.entries(HOVERERS).map(([id, spec]) => [
    id,
    makeHover({
      freq: visualWingbeat(spec.realHz),
      amplitude: spec.amplitude,
      hindPhase: spec.hindPhase,
    }),
  ]),
)

/** 查不到返回 null —— 调用方据此决定要不要每帧续帧 */
export function motionFor(speciesId: string): Motion | null {
  return REGISTRY[speciesId] ?? null
}

/** 目前配了动作的全部物种（测试与文档用） */
export function animatedSpecies(): string[] {
  return Object.keys(REGISTRY).sort()
}

export { HOVERERS, makeHover } from './hover'
export { BLEND_RATE, applyBlended, stepBlend, visualWingbeat, type Motion } from './types'
