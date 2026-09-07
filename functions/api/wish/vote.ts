import { hashIp } from '../../../src/feedback/rules'
import { clientIp, guard, json, readJson, type EdgeContext } from '../../../src/feedback/edge'

/**
 * `POST /api/wish/vote` —— 给一个候选项投一票。
 *
 * 去重靠 `votes` 表的复合主键，而不是先查后插：先查后插在并发下会双写，
 * 而主键冲突是数据库自己保证的。用 `INSERT OR IGNORE` 再看 `meta.changes`
 * 是否为 0，就能在**一次**往返里既占位又知道结果，还不用捕获约束异常。
 */
export const onRequestPost = async ({ request, env }: EdgeContext): Promise<Response> =>
  guard(async () => {
    const db = env.DB
    const salt = env.FEEDBACK_SALT
    if (!db || !salt) return json({ ok: false, error: 'unconfigured' }, 503)

    const body = await readJson<{ id?: unknown }>(request)
    const id = typeof body?.id === 'string' ? body.id : null
    // 形状检查跟 rules.ts 的 isSlug 一致。候选项 id 是自家 slug，不接受别的东西
    if (id === null || !/^[a-z0-9-]{1,64}$/.test(id)) return json({ ok: false, error: 'bad-id' }, 400)

    // 先确认候选项真的存在且在架上 —— 少了这一步，往一个不存在的 id 投票会在
    // votes 表里留下永远对不上任何候选项的孤儿行
    const wish = await db
      .prepare('SELECT votes FROM wishes WHERE id = ? AND listed = 1')
      .bind(id)
      .first<{ votes: number }>()
    if (!wish) return json({ ok: false, error: 'unknown-wish' }, 404)

    const now = new Date()
    const ipHash = await hashIp(salt, clientIp(request), now)

    const ins = await db
      .prepare('INSERT OR IGNORE INTO votes (wish_id, ip_hash, created_at) VALUES (?, ?, ?)')
      .bind(id, ipHash, now.getTime())
      .run()

    // changes=0 说明这个 ip_hash 今天已经投过这一项。回 200 而不是 4xx：
    // 重复投票不是错误，前端只要把按钮显示成「已投」就行
    if ((ins.meta?.changes ?? 0) === 0) {
      return json({ ok: true, votes: wish.votes, counted: false })
    }

    await db.prepare('UPDATE wishes SET votes = votes + 1 WHERE id = ?').bind(id).run()

    // 返回本地算出的 votes+1 而不是再查一次库：并发下这个数可能比真值小一两票，
    // 但它只用于让投票者立刻看到自己那一票落下了。真值下次开墙时自然对齐，
    // 为此多一次边缘往返不值得
    return json({ ok: true, votes: wish.votes + 1, counted: true })
  })
