import { hashIp, isRateLimited, validateSubmission } from '../../src/feedback/rules'
import { clientIp, guard, json, readJson, type EdgeContext } from '../../src/feedback/edge'
import type { RawSubmission } from '../../src/feedback/types'

/**
 * `POST /api/feedback` —— 收一条提交（纠错 / 自由心愿 / 随便说一句）。
 *
 * 一律写成 status='new'。这个文件里**没有**任何能写出 'featured' 的路径 ——
 * 「只有作者精选的才上墙」这条产品决策，靠的就是这里的缺席，而不是某个 if。
 */
export const onRequestPost = async ({ request, env }: EdgeContext): Promise<Response> =>
  guard(async () => {
    const db = env.DB
    const salt = env.FEEDBACK_SALT
    // 盐缺席时必须拒收：没有盐的哈希等于把 IP 明文存进库，比不收这条反馈严重得多
    if (!db || !salt) return json({ ok: false, error: 'unconfigured' }, 503)

    const raw = await readJson<RawSubmission>(request)
    if (raw === null) return json({ ok: false, error: 'bad-json' }, 400)

    const verdict = validateSubmission(raw)
    if (!verdict.ok) {
      // 蜜罐命中：对外报成功再默默丢弃。让机器人以为得手了、不去换招 ——
      // 回 400 等于告诉它「这条路走不通」，它下次就换一条
      if (verdict.reason === 'honeypot') return json({ ok: true })
      return json({ ok: false, error: 'invalid', field: verdict.field }, 400)
    }

    const now = new Date()
    const ipHash = await hashIp(salt, clientIp(request), now)

    // ip_hash 里已经拌进了日期（见 rules.ts 的 ipHashInput），所以「这个哈希
    // 一共出现过几次」就精确等于「这个 IP 今天提交过几次」—— 不需要再按时间戳
    // 划窗口，也就不会有窗口边界的差一错误
    const seen = await db
      .prepare('SELECT COUNT(*) AS n FROM messages WHERE ip_hash = ?')
      .bind(ipHash)
      .first<{ n: number }>()
    if (isRateLimited(seen?.n ?? 0)) return json({ ok: false, error: 'rate-limited' }, 429)

    const v = verdict.value
    await db
      .prepare(
        `INSERT INTO messages (created_at, kind, species, part, body, email, locale, ip_hash, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
      )
      .bind(now.getTime(), v.kind, v.species, v.part, v.body, v.email, v.locale, ipHash)
      .run()

    return json({ ok: true })
  })
