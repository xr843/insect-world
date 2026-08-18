/**
 * 悬停振翅。
 *
 * 覆盖那些**本来就会在空中定住**的虫：蜻蜓、豆娘、蜜蜂、熊蜂、食蚜蝇、
 * 草蛉、天蛾、大蚊。选它们不是因为好做，是因为「原地扇翅」对这些物种是
 * 真实行为 —— 让一只步甲在展台上原地悬停会很怪。
 *
 * ## 扑动写在哪根轴上
 *
 * `wing()` 的姿态是这么摆的：先绕 Y 转出展角（把翅从 +X 甩到体侧 ±Z），
 * 再绕 X 抬起（`tilt`）。Euler 默认 'XYZ' 的合成顺序让 X 那一下作用在
 * **已经指向体侧的翅**上 —— 于是绕 X 就是上下扇动。所以扑翅就是在
 * `rotation.x` 上叠一个正弦，与 `tilt` 同一根轴。
 *
 * 左翅整组带 `scale.z = -1`，它的 rest.x 也是取过负的；要让两翅同起同落，
 * 增量得乘 `side`。`WingRig.side` 就是为这件事存在的。
 *
 * ## 前后翅的相位差是真的
 *
 * 蜻蜓目悬停时前后翅**反相**扑动（counterstroking，约差半个周期）——
 * 这是它们能悬停、能瞬间倒飞的原因之一，也是肉眼一看就能认出蜻蜓的动态特征。
 * 其余四翅类（鳞翅目、脉翅目）前后翅在飞行中基本是耦合的，只给一点点滞后。
 * 双翅目只有一对前翅（后翅特化成平衡棒，不登记进骨架），无所谓相位。
 */
import type { Motion } from './types'

export interface HoverOptions {
  /** 屏幕上的扑动频率（Hz）—— 由 `visualWingbeat()` 从真实频率压出来 */
  freq: number
  /** 上下扑动的半幅（弧度）。真实冲程 90~130° 全幅，这里按观感取 */
  amplitude: number
  /**
   * 后翅相对前翅的相位差（弧度）。
   * 蜻蜓目 ≈ π（反相扑动）；其余四翅类给一点滞后；只有前翅时无所谓。
   */
  hindPhase: number
}

/**
 * 造一个悬停振翅动作。
 *
 * 没有 `role` 的翅按前翅算 —— kit 不猜前后翅（膜翅目两对翅基几乎重合，
 * 按位置分不出来），没标注就是没标注，让它跟前翅同相位是最不出错的默认。
 */
export function makeHover(opts: HoverOptions): Motion {
  const { freq, amplitude, hindPhase } = opts
  return (rig, t) => {
    const wings = rig.wings
    if (!wings?.length) return
    const omega = 2 * Math.PI * freq * t
    for (const w of wings) {
      const phase = w.role === 'hind' ? hindPhase : 0
      w.pivot.rotation.x = w.rest.x + w.side * amplitude * Math.sin(omega + phase)
    }
  }
}

/**
 * 悬停物种的真实拍翅频率与冲程。
 *
 * 频率是**真实值**（Hz，成虫悬停/巡航时的常见区间取中位），驱动时才经
 * `visualWingbeat()` 压到屏幕能显示的范围 —— 数据与妥协分开放，
 * 将来换显示方案不用回头改数据。
 *
 * ⚠️ 这批数字与图鉴正文同源，同样**未经昆虫学文献逐条核校**
 * （见 README 的免责声明）。真要引用请回到原始文献。
 */
export const HOVERERS: Record<string, { realHz: number; amplitude: number; hindPhase: number }> = {
  // 蜻蜓目：反相扑动是它们的招牌，相位差给足半个周期
  dragonfly: { realHz: 35, amplitude: 0.52, hindPhase: Math.PI },
  damselfly: { realHz: 18, amplitude: 0.58, hindPhase: Math.PI },

  // 脉翅目：翅大而软，扇得慢、幅度大
  lacewing: { realHz: 28, amplitude: 0.62, hindPhase: Math.PI * 0.3 },

  // 鳞翅目里唯一会真悬停的：小豆长喙天蛾，悬停吸蜜是它的看点
  'hawk-moth': { realHz: 70, amplitude: 0.68, hindPhase: Math.PI * 0.15 },

  // 膜翅目：只有一对功能翅面（前后翅以翅钩相连，动起来是一体的）
  honeybee: { realHz: 230, amplitude: 0.72, hindPhase: 0 },
  bumblebee: { realHz: 180, amplitude: 0.7, hindPhase: 0 },

  // 双翅目：后翅特化成平衡棒，不在骨架里
  hoverfly: { realHz: 200, amplitude: 0.74, hindPhase: 0 },
  'crane-fly': { realHz: 50, amplitude: 0.5, hindPhase: 0 },
}
