/**
 * 全站埋点的统一出口 —— 任何组件想上报 Umami 自定义事件，只准调这里的 track()，
 * 不许直接摸 window.umami。
 *
 * 为什么要包这么严：
 * - Umami 脚本故意 defer 挂在 body 末尾（见 index.html 的注释）：统计域名
 *   analytics.fojin.app 对大陆访客可能完全失联，script 标签既不能挡应用启动，
 *   也随时可能因为广告拦截器、隐私模式、未来 CSP 调整而根本不存在。
 *   `window.umami` 因此是「可能永远不出现」的可选全局，不是「加载慢一点」。
 * - 埋点是锦上添花，交互是主体：任何一次上报失败都绝不能表现为按钮不响应、
 *   控制台报错或页面白屏。try/catch 包死、吞掉一切异常，不重试、不排队、
 *   不做离线兜底 —— 那是另一个复杂度量级，第一批不需要。
 * - vitest 默认环境是 node（见 vite.config.ts 与各测试文件头的
 *   `@vitest-environment jsdom` 声明），大多数测试文件里根本没有 window；
 *   先判一次 `typeof window` 再碰它，这批测试才不会红。
 *
 * 事件名与每个事件带的字段名都在下面集中声明 —— 组件里只准写
 * `track(EVENTS.XXX, {...})`，不许拿裸字符串当事件名（
 * `src/__tests__/analytics-event-names.test.ts` 会扫源码拦住）。改名字
 * 只用改这一个文件，调用方全部原样编译通过或者原样报错，不会有半个漏改的。
 */

/** Umami 自定义事件只吃这几种值类型；对象/数组会被它自己的上报层丢弃或报错 */
export type AnalyticsValue = string | number | boolean

declare global {
  interface Window {
    /** 脚本没加载到（大陆网络 / 广告拦截 / CSP 变化）时，这个属性压根不存在 */
    umami?: {
      track: (eventName: string, data?: Record<string, AnalyticsValue>) => void
    }
  }
}

export function track(name: string, data?: Record<string, AnalyticsValue>): void {
  try {
    if (typeof window === 'undefined') return
    window.umami?.track(name, data)
  } catch {
    // 见文件头：埋点绝不能反过来影响交互，吞掉一切、不上抛
  }
}

/**
 * 事件名常量 —— 值本身也是稳定的英文小写下划线，因为 Umami 后台按这个字符串
 * 分组展示，改名字等于在仪表盘里另开一个新事件、旧数据全部对不上，不是小事。
 */
export const EVENTS = {
  /** 展台/左栏/搜索/图鉴库/键盘/深链/对比条 —— 任何让「当前看的是哪只虫」变化的动作 */
  SPECIES_SWITCH: 'species_switch',
  /** 展台工具条：旋转/放大/聚焦/剖切/分层/复位 */
  STAGE_TOOL: 'stage_tool',
  /** 3D 模型上的标注点被点开 */
  HOTSPOT_CLICK: 'hotspot_click',
  /** 讲解弹窗打开（四个变体共用同一个壳，见 Discovery.tsx） */
  DISCOVERY_OPEN: 'discovery_open',
  /** 分步讲解翻页（含前进与后退，两者都是「翻到了第几步」） */
  LESSON_STEP: 'lesson_step',
  /** 分步讲解走完最后一步（点了「完成」，不是中途关掉） */
  LESSON_COMPLETE: 'lesson_complete',
  /** 小测选了一个选项 */
  QUIZ_ANSWER: 'quiz_answer',
  /** 小测全部题目答完时的最终得分 */
  QUIZ_SCORE: 'quiz_score',
  /** 观察笔记写入（对正文做了实际改动才算，单纯失焦不算） */
  NOTE_WRITE: 'note_write',
  /** 明暗主题切换 */
  THEME_TOGGLE: 'theme_toggle',
  /** 分享按钮点击（走系统面板还是复制链接） */
  SHARE_CLICK: 'share_click',
  /** 切换中英文版 */
  LANGUAGE_SWITCH: 'language_switch',
  /** 顶栏搜索：输入停顿后算发起一次，不追每个按键 */
  SEARCH: 'search',
  /** 左栏名录滚动深度 —— 首页①号问题（63 种里人均只翻到 5~6 种）直接量的就是这条 */
  LIBRARY_SCROLL_DEPTH: 'library_scroll_depth',
} as const

/**
 * species_switch 事件的来源枚举。
 *
 * 六个值对应六处真实会切换「当前看的虫」的入口：左栏列表、顶栏搜索结果、
 * 图鉴库总览、↑↓ 键翻页、落地页地址栏自带物种、展台底部对比条换对照。
 *
 * 故意不含的两处：顶栏「惊喜」骰子按钮与笔记面板里点笔记跳转 ——
 * 第一批只覆盖需求里明确列出的这六个来源，不擅自替边缘入口发明分类；
 * 将来要补，加一个新值、在对应组件里传一处，不用动这份契约。
 */
export const SPECIES_SWITCH_SOURCES = [
  'list',
  'search',
  'gallery',
  'keyboard',
  'deeplink',
  'compare',
] as const
export type SpeciesSwitchSource = (typeof SPECIES_SWITCH_SOURCES)[number]

/** 展台工具条六个按钮；「对比」不在这里 —— 它换的是物种，走 species_switch(source:'compare') */
export const STAGE_TOOLS = ['rotate', 'zoom', 'focus', 'section', 'layers', 'reset'] as const
export type StageTool = (typeof STAGE_TOOLS)[number]
