import type { Locale } from './types'

/**
 * 根路径 `/` 的语言分流逻辑 —— 纯函数集合，不碰 Request/Response。
 *
 * 唯一的调用方是 `functions/index.ts`（Cloudflare Pages Function，边缘执行），
 * 但特意不把逻辑写在那个文件里：Pages Function 要真起一个 `wrangler pages dev`
 * 才能验证，纯函数抽出来放这里就能被 `npm test` 直接覆盖，边缘那边只剩"读头 /
 * 拼 Response"的薄胶水。
 *
 * 这份文件本身是"同构"的：不引用 `document`、`window`、Cloudflare 的
 * Request/Response 之外的任何运行时 API，所以既能被浏览器端的
 * `LanguageHint.tsx` 引用（读同一个 cookie 名字），也能被 Workers 运行时的
 * `functions/index.ts` 引用（跑完整判定），互不冲突。
 */

/** 前端与边缘共用同一个 cookie 名字 —— 名字若两边各写一份、日后改名漏改一处，
 *  功能会静默失效且没有任何报错，所以只在这一处定义，两边都从这里导入。 */
export const LOCALE_COOKIE_NAME = 'iw-locale'

export interface WeightedLanguageTag {
  /** 原始标签，如 "zh-CN"、"en-US"；大小写按浏览器原样送来的，不在这里归一化 */
  tag: string
  /** 0~1，HTTP 语义里缺省是 1 */
  q: number
}

/**
 * 解析 Accept-Language 头。
 *
 * 不能用 `header.includes('zh')` 糊弄：那是对整条头字符串做子串匹配，
 * 会把出现在别处的 "zh" 子串也算进去（如 "azh" 这种虚构但可能出现的标签）。
 * 更现实的坑是 q=0 —— `en,zh;q=0` 的意思是"明确不要中文"，子串匹配会误判成
 * "有 zh"。这里只负责把头拆成 { tag, q } 的列表，q=0 要不要算"有该语言"
 * 留给调用方（见 acceptLanguageExcludesChinese）。
 */
export function parseAcceptLanguage(header: string | null | undefined): WeightedLanguageTag[] {
  if (!header) return []
  const out: WeightedLanguageTag[] = []
  for (const part of header.split(',')) {
    const seg = part.trim()
    if (!seg) continue
    const [rawTag, ...params] = seg.split(';').map((s) => s.trim())
    if (!rawTag) continue
    let q = 1
    for (const param of params) {
      const m = /^q=([\d.]+)$/i.exec(param)
      if (!m) continue
      const parsed = Number(m[1])
      if (Number.isFinite(parsed)) q = parsed
    }
    if (!Number.isFinite(q)) q = 1
    // 畸形/越界 q（非数字、q=5…）按缺省 1 处理，不因为一个参数写错就丢整条标签
    out.push({ tag: rawTag, q: Math.min(1, Math.max(0, q)) })
  }
  return out
}

/** 主子标签是不是 zh —— 只看 "-" 前那一段，不做整串子串匹配（理由见上）。 */
export function isChineseTag(tag: string): boolean {
  return tag.split('-')[0]?.toLowerCase() === 'zh'
}

/**
 * Accept-Language 是否"确凿地"没有中文偏好。
 *
 * 三态判断，不是简单取反：
 * - 解析不出任何标签（头缺失、空字符串、纯垃圾）→ false，即"不能断定没有
 *   中文偏好"。这不等价于"有中文偏好"，只是证据不足，交由调用方套用安全
 *   默认值（留在中文版）。
 * - 解析出至少一个 q>0 的标签，且其中没有一个是 zh 系 → true，确凿排除。
 * - 只要有一个 zh 系标签且 q>0（不论排第几位），→ false，不排除。
 *
 * q=0 的标签视为"明确拒绝"，不计入"有该语言"—— 所以 `en,zh;q=0` 判定为
 * "确凿没有中文偏好"，这也是不能用子串匹配的原因之一。
 */
export function acceptLanguageExcludesChinese(header: string | null | undefined): boolean {
  const acceptable = parseAcceptLanguage(header).filter((t) => t.q > 0)
  if (acceptable.length === 0) return false
  return !acceptable.some((t) => isChineseTag(t.tag))
}

/**
 * 已知搜索引擎 / 链接预览抓取器的 User-Agent 特征。
 *
 * 两层判据都留着，缺一不可：
 * - 具名列表兜住不含 bot/spider/crawl 词根的抓取器 —— 典型是
 *   facebookexternalhit、WhatsApp 这类分享预览抓取器：分享一条中文链接到
 *   群里，抓取器若被当成普通英文访客弹去 /en/，取到的 og:title/og:description
 *   就会是英文版的，跟发链接的人所在的中文语境对不上。
 * - 通用正则（bot/spider/crawl）兜住长尾 SEO、监控、AI 训练抓取器——
 *   这类名字几乎总落在这三个词根里（GPTBot、ClaudeBot、AhrefsBot、
 *   SemrushBot、Bytespider……），没必要每个都手动列全。
 *
 * 判断宁可漏（把少数没见过名字的爬虫当真人，最坏后果是它被分流一次，
 * 无害）也不错杀真人 UA。
 */
const KNOWN_BOT_SUBSTRINGS = [
  'googlebot',
  'bingbot',
  'baiduspider',
  'yandexbot',
  'duckduckbot',
  'sogou',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'telegrambot',
  'whatsapp',
  'discordbot',
  'applebot',
  'petalbot',
  'bytespider',
  'semrushbot',
  'ahrefsbot',
  'mj12bot',
  'seznambot',
  'exabot',
  'ia_archiver',
  'archive.org_bot',
  'gptbot',
  'ccbot',
  'amazonbot',
  'perplexitybot',
  'claudebot',
  'anthropic-ai',
]

export function isKnownBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  if (KNOWN_BOT_SUBSTRINGS.some((needle) => ua.includes(needle))) return true
  return /bot|spider|crawl/i.test(ua)
}

/**
 * 从原始 Cookie 头（或 `document.cookie`，两者格式相同：分号分隔的
 * `name=value` 列表）里取出语言选择。
 *
 * 边缘（Request 的 Cookie 头）与前端（document.cookie）共用这一个解析器 ——
 * 字符串格式完全一致，没有理由各写一份、各自可能各错各的。
 */
export function readLocaleCookie(cookieHeader: string | null | undefined): Locale | null {
  if (!cookieHeader) return null
  for (const part of cookieHeader.split(';')) {
    const seg = part.trim()
    const eq = seg.indexOf('=')
    if (eq === -1) continue
    const name = seg.slice(0, eq).trim()
    if (name !== LOCALE_COOKIE_NAME) continue
    const value = seg.slice(eq + 1).trim()
    return value === 'zh' || value === 'en' ? value : null
  }
  return null
}

export type LocaleRedirectDecision = 'redirect-en' | 'stay'

export interface LocaleRedirectInput {
  acceptLanguage: string | null | undefined
  userAgent: string | null | undefined
  cookie: string | null | undefined
}

/**
 * 根路径 `/` 的分流判定 —— `functions/index.ts` 的核心逻辑，抽成纯函数以便
 * 单元测试直接覆盖每条判据，不必真的起一个 wrangler dev 才能验证对不对。
 *
 * 判定顺序，命中一条就短路，后面不再看：
 * 1. 爬虫 —— 永不分流。让搜索引擎各自抓 `/` 与 `/en/`，两份各自的
 *    hreflang/canonical（见两份 index.html）才是给爬虫看的机制，抢在
 *    它前面强行跳转反而会让中文版从索引里消失。
 * 2. 已有语言选择 cookie —— 用户点过 `LanguageHint` 的明确选择就要认账，
 *    不能因为浏览器 Accept-Language 又把人送回去（这正是加 cookie 这层的
 *    唯一理由：边缘读不到 localStorage，读得到 cookie）。
 * 3. Accept-Language 确凿没有中文标签 —— 分流到 /en/。
 * 4. 其余（含头缺失、解析不出、cookie 值非法）—— 留在中文版，默认不动
 *    是安全的。
 */
export function decideLocaleRedirect(input: LocaleRedirectInput): LocaleRedirectDecision {
  if (isKnownBot(input.userAgent)) return 'stay'

  const cookieLocale = readLocaleCookie(input.cookie)
  if (cookieLocale === 'en') return 'redirect-en'
  if (cookieLocale === 'zh') return 'stay'

  return acceptLanguageExcludesChinese(input.acceptLanguage) ? 'redirect-en' : 'stay'
}
