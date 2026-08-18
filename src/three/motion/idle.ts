/**
 * 静息微动 —— 让站着的虫有活气，而不是让它走路。
 *
 * ## 为什么不做完整步态
 *
 * 展台是个缓慢自转的转台、虫子居中。腿在迈而身体不位移，读出来不是「走路」
 * 是**踏步机**。悬停振翅没有这个问题，因为悬停本来就是原地不动的真实行为；
 * 步态没有这个豁免。真要做会走路的虫，得让身体真位移、镜头跟随，那是另一件事。
 *
 * 所以这里做的是真实存在、且**本来就发生在原地**的那种动作：活着的昆虫站定时
 * 从不是石头，它一直在做极小幅度的姿势微调 —— 重心在六足之间来回挪一点点，
 * 关节松紧交替。幅度小到说不出它在动，但一眼能看出「这只是活的」。
 *
 * ## 手法沿用触角微动那条已验证的经验
 *
 * 两个**不可通约**的频率叠加，避免读出机械钟摆感（D 轮触角摆定下的做法）。
 * 每条腿再按它的着生位置错开相位 —— 六条腿同相位摆动会读成「整只虫在抖」，
 * 那比不动还糟。
 *
 * ## 幅度为什么这么小
 *
 * 足尖离基节约 2~3（单位 1 = 1 厘米），基节转 0.03 弧度足尖就挪 0.07~0.09 厘米，
 * 在一只 3 厘米的虫身上已经是看得见的位移。再大就开始像踏步了 ——
 * **这个上限是这个动作与「原地走路」的分界线，调大之前先想清楚。**
 */
import type { Motion } from './types'

export interface IdleOptions {
  /** 基节摆幅（弧度）。0.03 ≈ 1.7°，再大就开始读成踏步 */
  amplitude: number
  /** 两个不可通约的频率（Hz 量级的角频率系数） */
  freqA: number
  freqB: number
}

export const IDLE_DEFAULTS: IdleOptions = { amplitude: 0.03, freqA: 0.53, freqB: 0.31 }

/**
 * 每条腿的相位：由**着生位置**决定，不用随机数。
 *
 * 用位置而不是数组下标，是因为下标依赖 `collectRig()` 的遍历顺序 —— 那是实现
 * 细节，哪天场景图结构一变，相位分配就整体洗牌。位置是形态事实，稳定得多。
 * 乘上互质感的系数是为了让前中后 × 左右六条腿的相位尽量散开。
 */
function phaseOf(baseX: number, side: 1 | -1): number {
  return baseX * 2.7 + (side === 1 ? 0 : 1.9)
}

export function makeIdle(opts: IdleOptions = IDLE_DEFAULTS): Motion {
  const { amplitude, freqA, freqB } = opts
  return (rig, t) => {
    const legs = rig.legs
    if (!legs?.length) return
    for (const leg of legs) {
      const p = phaseOf(leg.base.x, leg.side)
      // 主摆 + 次摆：两个频率不可通约，合成波不会周期性地「归位」
      const s = Math.sin(t * freqA * 2 * Math.PI + p) * 0.72 + Math.sin(t * freqB * 2 * Math.PI + p * 1.7) * 0.28
      // 基节前后摆是主运动；越往远端幅度越小，模拟关节逐级松弛
      leg.coxa.rotation.y = leg.rest.coxa.y + leg.side * amplitude * s
      leg.femur.rotation.z = leg.rest.femur.z + amplitude * 0.55 * Math.sin(t * freqA * 2 * Math.PI + p + 1.1)
      leg.tibia.rotation.z = leg.rest.tibia.z + amplitude * 0.34 * Math.sin(t * freqB * 2 * Math.PI + p * 0.6)
    }
  }
}
