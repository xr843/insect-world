import type { Locale } from '../i18n/types'
import type {
  CleanSubmission,
  FeedbackKind,
  RawSubmission,
  ValidationResult,
  WallWish,
  WishRow,
} from './types'

/**
 * 反馈系统的全部判定逻辑 —— 纯函数，不碰 Request/Response、不碰 D1。
 *
 * 跟 `src/i18n/edgeLocale.ts` 同一个路子，理由也一样：Pages Function 要真起
 * 一个 `wrangler pages dev` 才验得了，判定抽到这里就能被 `npm test` 直接覆盖，
 * 边缘那三个文件只剩「读 Request → 调这里 → 拼 Response」的薄胶水。
 *
 * 这份文件是同构的：不引用 `window`、`document`、`crypto` 之外的任何运行时
 * API（`crypto.subtle` 在浏览器与 Workers 里都有，且只在 `hashIp` 一处用到），
 * 所以浏览器端的表单也能引它做提交前的本地校验，两边规则不会各写一份。
 */

/** 正文长度上下限，按**码点**算而不是 UTF-16 长度（见 `codePointLength`）。 */
export const BODY_MIN = 2
export const BODY_MAX = 500

/** 邮箱长度上限。选填字段，宽松放行、只挡明显异常。 */
export const EMAIL_MAX = 120

/** 物种 id / 部位 key 的长度上限。这两个值由前端从自己的数据里取，正常远小于此。 */
export const SLUG_MAX = 64

/** 每个 ip_hash 每天允许的提交数。ip_hash 按天轮换，所以「每天」是天然窗口。 */
export const DAILY_SUBMISSION_LIMIT = 5

const KINDS: readonly FeedbackKind[] = ['correction', 'wish', 'note']
const LOCALES: readonly Locale[] = ['zh', 'en']

/**
 * 码点长度。
 *
 * `'𝕒'.length === 2`、`'👍'.length === 2` —— 用 `.length` 卡上限，中文没事，
 * 但表情符号和生僻字会按两个字符算，用户数着自己写了 300 字却被告知超了 500。
 * 展开成数组按码点数才是人眼看到的「几个字」。
 */
export function codePointLength(s: string): number {
  return [...s].length
}

/**
 * 清洗正文。
 *
 * 存进去的是纯文本、渲染时走 React 的文本节点（自动转义），所以**不需要**
 * 做 HTML 消毒 —— 这里只处理两件会让存档变脏的事：
 *
 * 1. C0 控制字符：粘贴自 Word / 终端的内容常带 \x00-\x08 这类不可见字节，
 *    留着会让日后 `npm run inbox` 的终端输出错乱。保留 \n（换行是有意义的）
 *    与 \t（当空格处理）。
 * 2. 连续空行：三行以上压成两行，避免一条留言在墙上占掉整屏。
 */
export function cleanBody(raw: string): string {
  return raw
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * 宽松的邮箱形状检查。
 *
 * 故意不用那些号称 RFC 5322 完备的巨型正则：邮箱是**选填**字段，它唯一的用途
 * 是「作者想回信时有个地址」。误挡一个真实地址（奇怪但合法的域名、加号别名）
 * 的代价，远大于放过一个假地址 —— 假地址的后果只是回信退回来，而误挡会让一个
 * 真想被联系的人永远联系不上。所以只要求：有且只有一个 @、两侧非空、无空白。
 */
export function looksLikeEmail(s: string): boolean {
  if (/\s/.test(s)) return false
  const at = s.indexOf('@')
  if (at <= 0 || at !== s.lastIndexOf('@')) return false
  const domain = s.slice(at + 1)
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
}

/** 物种 id / 部位 key 的形状：小写字母、数字、连字符。前端传的都是自家 slug。 */
function isSlug(s: string): boolean {
  return /^[a-z0-9-]+$/.test(s) && codePointLength(s) <= SLUG_MAX
}

function asString(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}

/**
 * 校验并归一化一次提交。
 *
 * 顺序有讲究：**蜜罐第一个查**。后面那些字段校验对机器人毫无意义，早退既省
 * 边缘 CPU，也避免「机器人把 body 填对了就被当成 invalid 回 400」这种给对方
 * 送调试信息的行为 —— 蜜罐命中一律走「对外报成功」那条路（见 ValidationResult）。
 */
export function validateSubmission(raw: RawSubmission): ValidationResult {
  const honeypot = asString(raw.website)
  if (honeypot !== null && honeypot.trim() !== '') return { ok: false, reason: 'honeypot' }

  const kind = asString(raw.kind)
  if (kind === null || !KINDS.includes(kind as FeedbackKind)) {
    return { ok: false, reason: 'invalid', field: 'kind' }
  }

  const rawBody = asString(raw.body)
  if (rawBody === null) return { ok: false, reason: 'invalid', field: 'body' }
  const body = cleanBody(rawBody)
  const len = codePointLength(body)
  if (len < BODY_MIN || len > BODY_MAX) return { ok: false, reason: 'invalid', field: 'body' }

  const localeRaw = asString(raw.locale)
  // 语言认不出就当中文：这个字段只影响日后读收件箱时的上下文，不值得为它退回一次提交
  const locale: Locale = LOCALES.includes(localeRaw as Locale) ? (localeRaw as Locale) : 'zh'

  let species: string | null = null
  const speciesRaw = asString(raw.species)
  if (speciesRaw !== null && speciesRaw !== '') {
    if (!isSlug(speciesRaw)) return { ok: false, reason: 'invalid', field: 'species' }
    species = speciesRaw
  }
  // 纠错必须知道说的是哪只虫 —— 少了它这条反馈落不了地，收了也没用
  if (kind === 'correction' && species === null) {
    return { ok: false, reason: 'invalid', field: 'species' }
  }

  let part: string | null = null
  const partRaw = asString(raw.part)
  if (partRaw !== null && partRaw !== '') {
    if (!isSlug(partRaw)) return { ok: false, reason: 'invalid', field: 'part' }
    part = partRaw
  }

  let email: string | null = null
  const emailRaw = asString(raw.email)
  if (emailRaw !== null && emailRaw.trim() !== '') {
    const trimmed = emailRaw.trim()
    if (codePointLength(trimmed) > EMAIL_MAX || !looksLikeEmail(trimmed)) {
      return { ok: false, reason: 'invalid', field: 'email' }
    }
    email = trimmed
  }

  const value: CleanSubmission = { kind: kind as FeedbackKind, species, part, body, email, locale }
  return { ok: true, value }
}

/** 今天这个 ip_hash 是否已经用光了额度。 */
export function isRateLimited(todayCount: number, limit: number = DAILY_SUBMISSION_LIMIT): boolean {
  return todayCount >= limit
}

/**
 * UTC 日期键 `YYYY-MM-DD`。
 *
 * 用 UTC 而不是东八区：这个值只用来轮换哈希盐与划限流窗口，不面向用户显示，
 * 关键要求是**边缘的每个节点算出同一个值**。Workers 各地节点的本地时区不可控，
 * UTC 是唯一稳定的共识。
 */
export function dayKey(now: Date): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 构造 ip_hash 的原文。
 *
 * 拼进日期键是刻意的：哈希每天换一次，存下来的值隔天就再也对应不回任何人 ——
 * 它不是持久标识符，追不了人。代价是投票去重也只在当天有效（隔天能再投一票），
 * 这是**接受的**：票是给「下一个做什么」排优先级的软信号，不是选举，多一票
 * 少一票不影响判断，而换来的是不用长期保存可关联的访客标识。
 *
 * 分隔符用 `\n` 而不是 `:` —— IPv6 地址里满是冒号，用冒号拼接会让
 * `salt="a:b"` + `ip="c"` 和 `salt="a"` + `ip="b:c"` 撞出同一个原文。
 */
export function ipHashInput(salt: string, ip: string, now: Date): string {
  return `${salt}\n${ip}\n${dayKey(now)}`
}

/** 把 `ipHashInput` 的原文算成十六进制摘要。`crypto.subtle` 在浏览器与 Workers 里都有。 */
export async function hashIp(salt: string, ip: string, now: Date): Promise<string> {
  const bytes = new TextEncoder().encode(ipHashInput(salt, ip, now))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 榜单排序：票数降序，同票按上架时间升序。
 *
 * 同票必须有个稳定的第二关键字，否则 D1 返回的行序一变，墙上同票的几项每次
 * 刷新都在互相换位置 —— 看起来像有人在投票，其实什么都没发生。用 created_at
 * 而不是 id：先上架的排前面，符合「它已经在这儿等了更久」的直觉。
 */
export function sortWishes(rows: readonly WishRow[]): WishRow[] {
  return [...rows].sort((a, b) => b.votes - a.votes || a.created_at - b.created_at)
}

/** 按语言挑标题，落成墙上的候选项。缺译文时回落到中文，不显示空标题。 */
export function toWallWish(row: WishRow, locale: Locale): WallWish {
  const title = (locale === 'en' ? row.title_en : row.title_zh) || row.title_zh
  return { id: row.id, kind: row.kind, title, votes: row.votes }
}
