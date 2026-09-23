import { useCallback } from 'react'
import type { Locale } from '../i18n/types'
import type { CleanSubmission } from '../feedback/types'
import { EVENTS, track } from '../analytics'

/**
 * 纠错表单的提交。
 *
 * 失败从不 throw，只返回一个错误码给表单显示 —— 后端缺席（D1 没绑好、
 * 断网）时前端照样完好，只是这一条没发出去。
 *
 * 这个文件原先叫 useWall.ts，还管着点播墙的取数与投票；墙在 2026-09-23
 * 按上线时定好的标准撤掉了（15 天 8 票，与观察笔记同一量级），只剩提交。
 */

/** 提交结果。`invalid` / `rate` / `net` 各对应一句不同的提示文案。 */
export type SubmitResult = 'ok' | 'invalid' | 'rate' | 'net'

export type SubmitInput = Omit<CleanSubmission, 'locale'> & {
  /** 蜜罐字段。表单里对真人隐藏，这里原样透传给服务端判定。 */
  website?: string
}

/** 提交一条反馈。 */
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
