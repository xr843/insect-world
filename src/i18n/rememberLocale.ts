/**
 * 记住用户对语言的**明确选择**，供边缘分流尊重。
 *
 * 为什么单独一个文件：`edgeLocale.ts` 里的都是纯函数，要在 Cloudflare Worker
 * 里跑（没有 `document`）；这一支是浏览器侧写 cookie 的，两边不能混。
 *
 * 为什么必须写 cookie 而不是 localStorage：`functions/index.ts` 在边缘决定
 * 「落在 `/` 的访客进中文还是英文」，那里读不到 localStorage，只能读 cookie。
 *
 * ⚠️ **站内每一处切换语言的入口都要调它。** 漏一处的症状很隐蔽：用户切过去、
 * 当次也确实看到了目标语言（跳转是 `<a href>` 干的，不依赖这个 cookie），
 * 只有等他下次重新落地 `/` 时才会被边缘按浏览器语言弹回去 —— 表现为
 * 「我明明选过中文，它怎么又变英文了」，而当时那次点击看上去完全正常。
 * `__tests__/remember-locale.test.tsx` 里有一条普查，钉住顶栏与提示条两处。
 */
import { LOCALE_COOKIE_NAME } from './edgeLocale'
import type { Locale } from './types'

/**
 * max-age 一年；SameSite=Lax 足够（同站顶层导航场景）；不设 Secure ——
 * `wrangler pages dev` 本地用 http 起服务时也要能写进去。
 */
export function rememberLocaleChoice(locale: Locale): void {
  try {
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; SameSite=Lax`
  } catch {
    // 隐私模式等极端情况下写 cookie 可能抛错。记不住只是下次可能被重新分流，
    // 绝不能因此挡住这次跳转 —— 点击的主体动作是 <a href> 的导航。
  }
}
