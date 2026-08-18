/**
 * 羽化展翅 —— 生活史里唯一一段**真正连续**的形变。
 *
 * ## 为什么只做这一段
 *
 * 设计定的是「离散阶段 + 设计过的转场」：毛虫变蝴蝶在生物学上本来就不是连续
 * 形变（组织解离 + 成虫盘发育），硬 morph 出来好看但错，与本项目「每处形态
 * 都能追溯到形态学依据」的立场冲突。
 *
 * 但**蜕皮与羽化是真实事件**，而羽化里的「翅从皱缩展开」是**真连续**的：
 * 刚出蛹的成虫翅是一小团皱缩的软组织，靠血淋巴泵入在几十分钟里撑开、
 * 再硬化定形。这一段可以放心做成连续动画，因为它本来就是连续的。
 *
 * ## 怎么做
 *
 * 缩放**枢轴**而不是翅面网格：枢轴的原点就在翅基，缩放它等于让整片翅朝翅基
 * 收拢 —— 那正是皱缩的样子，而且翅基始终钉在体侧不动。
 *
 * ⚠️ 缩放必须以 `restScale` 为基准做**乘法**，不能 `setScalar()`：
 * `wing()` 用 `scale.z = ±1` 做左右镜像，直接 setScalar 会把那个负号抹掉，
 * 左翅当场翻到对侧去。`WingRig.restScale` 就是为这件事存在的。
 *
 * 展开的同时翅是**下垂**的（还没硬化，撑不住自重），随展开逐渐抬回静止姿态。
 * 这一下让它从「一片在变大的膜」变成「一只刚爬出来的虫」。
 */
import type { InsectRig } from './types'

export interface EmergeOptions {
  /** 起始尺度：刚出蛹时翅只有成形后的这么大 */
  startScale: number
  /** 起始下垂角（弧度）：翅还软，撑不住自重 */
  droop: number
}

/**
 * 默认值。
 *
 * `startScale` 0.16：真实刚羽化的翅约为展开后的 1/6~1/5，这个比例本身就是
 * 「它居然能撑那么大」的看点，不要为了过渡平顺而调高。
 *
 * `droop` 0.42 弧度 ≈ 24°：再大就读成「翅断了」，再小看不出软。
 */
export const EMERGE_DEFAULTS: EmergeOptions = { startScale: 0.16, droop: 0.42 }

/**
 * 展开曲线：先快后慢。
 *
 * 真实的翅展开就是这个节奏 —— 血淋巴一开始压力最大、撑得最快，接近满幅时
 * 阻力上升而变慢。用 `1-(1-u)³` 而不是线性或 smoothstep：smoothstep 两头都慢，
 * 开头那一下的爆发感就没了，而那一下正是这个镜头最好看的部分。
 */
function expand(u: number): number {
  const k = 1 - Math.min(1, Math.max(0, u))
  return 1 - k * k * k
}

/**
 * 把 rig 的翅摆到羽化进程 `u`（0 = 刚出蛹，1 = 完全展开并回到静止姿态）。
 *
 * 与 `Motion` 的区别：它吃的是**进度**不是时间 —— 羽化是一次性事件不是循环，
 * 由调用方按经过时间归一化后传进来。签名因此不同，故意不塞进 `Motion` 里。
 */
export function makeEmerge(opts: EmergeOptions = EMERGE_DEFAULTS) {
  const { startScale, droop } = opts
  return (rig: InsectRig, u: number): void => {
    const wings = rig.wings
    if (!wings?.length) return
    const e = expand(u)
    const k = startScale + (1 - startScale) * e
    for (const w of wings) {
      // 乘法而不是赋值：restScale.z 带着左右镜像的符号
      w.pivot.scale.set(w.restScale.x * k, w.restScale.y * k, w.restScale.z * k)
      // 下垂随展开退去；side 让左右翅同向下垂而不是一上一下
      w.pivot.rotation.x = w.rest.x - w.side * droop * (1 - e)
    }
  }
}

/** 把翅恢复到完全展开的静止态（羽化结束、或根本没在羽化时调用） */
export function resetEmerge(rig: InsectRig): void {
  for (const w of rig.wings ?? []) {
    w.pivot.scale.copy(w.restScale)
    w.pivot.rotation.x = w.rest.x
  }
}
