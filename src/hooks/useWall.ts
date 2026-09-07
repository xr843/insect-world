import { useCallback, useEffect, useState } from 'react'
import type { Locale } from '../i18n/types'
import type { CleanSubmission, WallData } from '../feedback/types'
import { EVENTS, track } from '../analytics'

/**
 * 点播墙的取数与写入。
 *
 * ── 为什么每个失败分支都只是「安静降级」 ─────────────────────────────
 * D1 绑定要作者去 Cloudflare 面板手动点一次，在那之前 `/api/*` 全是 404。
 * 也就是说「后端不存在」不是异常路径，是这个功能上线头几天的**正常状态**。
 * 所以这里没有任何 throw：取数失败就把 `state` 变成 'offline'，让墙显示一行
 * 说明；提交失败返回一个错误码给表单显示。前端任何时候都不因为后端缺席而白屏。
 */

export type WallState = 'loading' | 'ready' | 'offline'

/** 提交结果。`invalid` / `rate` / `net` 各对应一句不同的提示文案。 */
export type SubmitResult = 'ok' | 'invalid' | 'rate' | 'net'

export type SubmitInput = Omit<CleanSubmission, 'locale'> & {
  /** 蜜罐字段。表单里对真人隐藏，这里原样透传给服务端判定。 */
  website?: string
}

const EMPTY: WallData = { wishes: [], featured: [] }

/**
 * 已投过的候选项记在 localStorage。
 *
 * 服务端已经用 votes 表的主键做了真正的去重，这份只管**按钮长什么样**：
 * 没有它，投完票一刷新按钮就恢复成可点，用户会以为票没投上。刻意不把它
 * 当作权威 —— 清了浏览器数据只是按钮变回可点，再点一次服务端照样拦住。
 */
const VOTED_KEY = 'iw-voted'

function readVoted(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    // 隐私模式下 localStorage 会直接抛 —— 那就当作没投过，功能照常
    return new Set()
  }
}

function writeVoted(ids: Set<string>): void {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]))
  } catch {
    // 存不下不影响任何事，服务端才是去重的权威
  }
}

/**
 * 提交一条反馈。
 *
 * 独立于 `useWall`，因为两个调用方的生命周期完全不同：墙是个浮层（要取数、
 * 要投票状态），而 DetailPanel 的纠错对话框只需要「发一条出去」——把它绑在
 * useWall 上，纠错就得连带持有一份它根本不看的榜单状态。
 */
export function useFeedbackSubmit(locale: Locale) {
  return useCallback(
    async (input: SubmitInput): Promise<SubmitResult> => {
      try {
        const res = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, locale }),
        })
        if (res.ok) {
          track(EVENTS.FEEDBACK_SUBMIT, { kind: input.kind })
          return 'ok'
        }
        if (res.status === 429) return 'rate'
        if (res.status === 400) return 'invalid'
        return 'net'
      } catch {
        // 断网、被拦截、后端还没部署 —— 对用户都是同一件事：没发出去，回头再试
        return 'net'
      }
    },
    [locale],
  )
}

export function useWall(locale: Locale, enabled: boolean) {
  const [state, setState] = useState<WallState>('loading')
  const [data, setData] = useState<WallData>(EMPTY)
  const [voted, setVoted] = useState<Set<string>>(() => new Set())
  const [nonce, setNonce] = useState(0)

  // 只在墙真的打开时才取数：这是个浮层，站上绝大多数访客从不打开它，
  // 没有理由让每次访问都多打一个请求
  useEffect(() => {
    if (!enabled) return
    let alive = true
    setState('loading')
    fetch(`/api/wall?locale=${locale}`)
      .then((r) => (r.ok ? (r.json() as Promise<WallData>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return
        setData({ wishes: d.wishes ?? [], featured: d.featured ?? [] })
        setVoted(readVoted())
        setState('ready')
      })
      .catch(() => {
        if (alive) setState('offline')
      })
    return () => {
      alive = false
    }
  }, [enabled, locale, nonce])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  const vote = useCallback(
    async (id: string) => {
      // 乐观更新：点下去票数立刻涨。服务端若判定重复投票会返回真实票数，
      // 下面再按它校正 —— 让按钮先动，是这个交互唯一的爽感来源
      setData((d) => ({
        ...d,
        wishes: d.wishes.map((w) => (w.id === id ? { ...w, votes: w.votes + 1 } : w)),
      }))
      setVoted((prev) => {
        const next = new Set(prev).add(id)
        writeVoted(next)
        return next
      })
      track(EVENTS.WISH_VOTE, { id })

      try {
        const res = await fetch('/api/wish/vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        if (!res.ok) return
        const body = (await res.json()) as { votes?: number }
        if (typeof body.votes !== 'number') return
        setData((d) => ({
          ...d,
          wishes: d.wishes.map((w) => (w.id === id ? { ...w, votes: body.votes as number } : w)),
        }))
      } catch {
        // 网络失败不回滚：按钮已经显示成「已投」，回滚只会让用户以为自己点错了。
        // 票没落库的代价是一个软信号少了一票，比一次视觉抖动便宜
      }
    },
    [],
  )

  return { state, data, voted, vote, retry }
}
