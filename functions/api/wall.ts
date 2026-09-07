import { sortWishes, toWallWish } from '../../src/feedback/rules'
import { guard, json, localeFromQuery, type EdgeContext } from '../../src/feedback/edge'
import type { WallData, WishRow } from '../../src/feedback/types'

/**
 * `GET /api/wall` —— 墙的全部内容：候选项榜单 + 精选留言。
 *
 * 一次取全而不是拆成两个端点：墙是一次性打开的浮层，两个 round trip 换不来
 * 任何东西，而边缘上少一次往返是实打实的。
 */

/** 榜单最多显示几项。超出的候选项照常收票，只是不占屏。 */
const WISH_LIMIT = 12
/** 精选留言最多显示几条。 */
const FEATURED_LIMIT = 8

interface FeaturedRow {
  body: string
  created_at: number
}

export const onRequestGet = async ({ request, env }: EdgeContext): Promise<Response> =>
  guard(async () => {
    // 绑定还没配好时给一个明确的 503，而不是 500 —— 前端对「墙暂时看不了」
    // 与「墙坏了」的处理是一样的（都降级），但日志里这两者必须分得开
    const db = env.DB
    if (!db) return json({ error: 'unconfigured' }, 503)

    const locale = localeFromQuery(new URL(request.url).searchParams.get('locale'))

    const [wishRes, featuredRes] = await Promise.all([
      db
        .prepare('SELECT id, kind, title_zh, title_en, votes, created_at FROM wishes WHERE listed = 1')
        .all<WishRow>(),
      db
        .prepare(
          "SELECT body, created_at FROM messages WHERE status = 'featured' ORDER BY created_at DESC LIMIT ?",
        )
        .bind(FEATURED_LIMIT)
        .all<FeaturedRow>(),
    ])

    // 排序放在 JS 里而不是 SQL 的 ORDER BY：同票时的第二关键字（见 sortWishes）
    // 是有单测覆盖的产品规则，让它只活在一个地方。候选项是几十条量级，
    // 在边缘上排完全免费
    const wishes = sortWishes(wishRes.results ?? [])
      .slice(0, WISH_LIMIT)
      .map((row) => toWallWish(row, locale))

    const featured = (featuredRes.results ?? []).map((row) => ({ body: row.body, at: row.created_at }))

    const data: WallData = { wishes, featured }
    // 边缘缓存 60 秒：墙是只读的聚合视图，投票者本人靠投票接口的返回值即时更新，
    // 不依赖这份缓存。locale 在查询串里，天然进缓存键，不需要 Vary
    return json(data, 200, { 'Cache-Control': 'public, s-maxage=60' })
  })
