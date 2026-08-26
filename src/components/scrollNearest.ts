/**
 * 把容器滚到刚好能看见某个子项 —— `scrollIntoView({ block: 'nearest' })` 的
 * 同语义替代，唯一的区别是：**只动这一个容器，绝不动页面**。
 *
 * ## 为什么不能再用 scrollIntoView
 *
 * `scrollIntoView` 会沿着 DOM 往上走，把**每一个**可滚动祖先都调一遍，
 * 最外层那个就是页面本身。桌面上看不出来（名录整栏都在视野里，页面不需要动），
 * 手机上却是灾难：名录被 CSS 改成贴在展台下面的横向滑条，落在首屏之外，于是
 * 「让选中项可见」被执行成「把整页往下拽」。
 *
 * 2026-08-26 无头 iPhone 13 实测，首页与物种页**一加载就自动滚到 scrollY=179**，
 * 且四秒内不回来 —— 135px 高的页头（站名、导航、搜索、语言、主题）整个滚出屏外，
 * 而 179 这个数正好是「把横滑条里的选中卡片下沿顶到视口底边」所需的距离。
 * 页面每换一次物种就再拽一次。手机占 26% 的访问，跳出率 38.4%、停留 59s，
 * 而笔记本是 25.5% / 141s。
 *
 * ⚠️ 这类缺陷的共同特征：**功能全对、测试全绿**。原来的测试盯的是「有没有调
 * scrollIntoView、参数是不是 nearest」—— 那是**机制**；真正要守的是**结果**：
 * 选中项进入名录的可视范围，而页面纹丝不动。机制对了，结果可以是错的。
 *
 * ## 语义
 *
 * 与 `nearest` 逐条对齐：已经完整可见就一动不动；在上边缘之外就把上沿对齐，
 * 在下边缘之外就把下沿对齐（取更近的那一侧，所以叫 nearest）；子项比容器还大时
 * 对齐起始边。两个轴各自独立判断 —— 桌面竖着滚，手机横着滚，同一份代码都要管。
 */

/** 一个轴上的滚动增量；已经可见时返回 0 */
function delta(itemStart: number, itemEnd: number, boxStart: number, boxEnd: number): number {
  // 先判起始边：子项比容器还高（宽）时两个条件同时成立，此时该对齐起始边，
  // 与浏览器的 nearest 一致 —— 所以这里必须是 if / else if，不能拆成两个 if
  if (itemStart < boxStart) return itemStart - boxStart
  if (itemEnd > boxEnd) return itemEnd - boxEnd
  return 0
}

/**
 * 把 `item` 滚进 `container` 的可视范围。
 *
 * 两个轴的增量都从**同一份**矩形快照算出来：改 scrollTop 不影响水平方向的差值，
 * 反之亦然，所以不需要读第二次布局（也就不会触发第二次强制重排）。
 *
 * 某个轴上容器不可滚动时（比如桌面名录只开了 overflow-y），赋值会被浏览器夹到
 * 合法区间、等于无操作，不必先判方向。
 */
export function scrollNearestWithin(container: Element, item: Element): void {
  const box = container.getBoundingClientRect()
  const el = item.getBoundingClientRect()

  const dy = delta(el.top, el.bottom, box.top, box.bottom)
  const dx = delta(el.left, el.right, box.left, box.right)

  if (dy !== 0) container.scrollTop += dy
  if (dx !== 0) container.scrollLeft += dx
}
