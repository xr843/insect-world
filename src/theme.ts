/**
 * 主题判定的单一出处。
 *
 * 为什么要单独一个文件：明暗主题的默认值同时写在**两个地方** ——
 * React 侧的 App.tsx，和首帧前跑的 public/theme-boot.js。两边一旦不一致，
 * 症状是首屏闪一下另一个主题再跳回来：肉眼一闪而过、测试全绿、
 * 生产上每个访客每次打开都会遇到。这类跨文件契约必须钉住。
 *
 * theme-boot.js 是 <head> 里同步执行的裸脚本（CSP 定的是 script-src 'self'
 * 且全站无内联脚本），它没法 import 这个模块，所以只能靠
 * `src/__tests__/theme-contract.test.ts` 真跑一遍那个脚本、
 * 拿结果和这里的 resolveTheme 对答案。改任何一边都要让那条测试过。
 */
export type Theme = 'dark' | 'light'

/** localStorage 键名 —— theme-boot.js 里硬写着同一个字符串，契约测试会核对 */
export const THEME_KEY = 'iw-theme'

/** 主题色跟随主题（浏览器地址栏 / 安卓任务卡） */
export const THEME_COLOR: Record<Theme, string> = { dark: '#131110', light: '#faf3e7' }

/**
 * 把 localStorage 里的原始值解析成主题。
 * 默认浅色（纸感图鉴）：只有明确存过 'dark' 才走暗色，
 * 空值、脏值、旧版本残留一律落回默认，不猜。
 */
export function resolveTheme(saved: string | null | undefined): Theme {
  return saved === 'dark' ? 'dark' : 'light'
}
