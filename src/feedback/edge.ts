import type { Locale } from '../i18n/types'

/**
 * Pages Functions 那侧要用的类型与小胶水。
 *
 * 放在 `src/` 而不是 `functions/` 下，是因为 **`functions/` 里的每个文件都会
 * 变成一条路由** —— 往那儿放一个 `_shared.ts` 就得赌 wrangler 对下划线前缀
 * 的处理，而 `functions/index.ts` 顶部那段长注释已经说明白：这个项目对路由
 * 范围的态度是"能窄就窄，不靠约定赌"。`src/` 是既有先例（`edgeLocale.ts` 就
 * 被 `functions/index.ts` 引着），且 Vite 不会把没有客户端引用的模块打进产物。
 */

/**
 * D1 的最小接口。
 *
 * 手写而不是装 `@cloudflare/workers-types`：这个项目只用到 prepare/bind/
 * first/all/run 五个方法，为它们引一整套运行时类型（还得跟 DOM 的
 * Request/Response 打架）不划算 —— `functions/index.ts` 里那个手写的
 * `PagesFunctionContext` 是同一个判断。
 */
export interface D1Meta {
  /** 本次写入实际改动的行数。`INSERT OR IGNORE` 撞上唯一约束时是 0。 */
  changes?: number
}

export interface D1RunResult {
  meta?: D1Meta
}

export interface D1Result<T> {
  results?: T[]
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<D1RunResult>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
}

/**
 * 反馈端点需要的绑定。
 *
 * 两个都是**可选**的，这不是偷懒：D1 绑定要人去 Cloudflare 面板点一次
 * （Settings → Functions → D1 bindings），在那之前这两个字段就是
 * `undefined`。类型上诚实地标成可选，才逼着每个端点显式处理"还没配好"
 * 这个真实存在的状态，而不是在边缘上抛一个 500。
 */
export interface FeedbackEnv {
  DB?: D1Database
  /** ip_hash 的盐。缺了就不该收任何提交 —— 没有盐的哈希等于明文存 IP。 */
  FEEDBACK_SALT?: string
}

export interface EdgeContext {
  request: Request
  env: FeedbackEnv
}

/** 统一的 JSON 响应。所有端点都不缓存，除非显式给 headers 覆盖。 */
export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

/**
 * 取访客 IP。
 *
 * `CF-Connecting-IP` 是 Cloudflare 自己填的、访客改不了；`X-Forwarded-For`
 * 是客户端可伪造的头，只在本地 `wrangler pages dev` 下当兜底用（那时前者不
 * 存在）。取不到就返回一个固定串 —— 那种情况下限流会把所有匿名请求算作
 * 同一个人，宁可**严**也不能变成人人无限提交。
 */
export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/** 查询串里的语言。认不出一律中文，跟 `validateSubmission` 的处理保持一致。 */
export function localeFromQuery(raw: string | null): Locale {
  return raw === 'en' ? 'en' : 'zh'
}

/**
 * 兜住端点里任何没预料到的异常。
 *
 * 本地 `wrangler pages dev` 实测出来的：绑了 D1 但还没跑 schema 时，
 * `no such table: wishes` 会一路冒到 Pages 运行时，返回 **500 并把完整堆栈
 * 连同 `/home/…/functions/api/wall.ts` 这样的文件路径一起吐给客户端**。
 * 两个问题：泄露内部结构，以及前端分不清"后端没配好"与"后端坏了"。
 *
 * 统一收成 503：对访客来说这两种情况本来就是同一件事 —— 这块暂时用不了，
 * 墙显示一行说明就好。真正的原因留在服务端日志里。
 */
export async function guard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (err) {
    console.error('[feedback]', err)
    return json({ ok: false, error: 'unavailable' }, 503)
  }
}

/** 安全地读 JSON 体。畸形体不该让边缘抛异常，返回 null 由调用方回 400。 */
export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
