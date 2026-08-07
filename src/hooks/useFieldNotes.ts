/**
 * 观察笔记 —— 顶栏「笔记」背后的数据。
 *
 * 存在 localStorage 里而不是内存里：博物学的笔记本，关掉页面就没了就没有意义。
 * 结构刻意扁平（id → 文本），这样将来要导出、要同步都不用先迁移一次数据。
 *
 * 读写都包了 try/catch —— 隐私模式下 localStorage 会直接抛异常，
 * 笔记记不下来是小事，整个应用白屏是大事。
 */
import { useCallback, useEffect, useState } from 'react'

const KEY = 'insect-world.field-notes.v1'

export interface FieldNote {
  /** 笔记正文 */
  text: string
  /** 最后修改时间，用于「最近记的」排序 */
  at: number
}

export type FieldNotes = Record<string, FieldNote>

/**
 * 把 localStorage 里的原始字符串解析成笔记。
 *
 * 逐条校验而不是直接 `JSON.parse` 后当成对象用 —— localStorage 是用户能随手改的，
 * 版本换代后残留的旧结构也会留在那里。一条坏数据不该让整个图鉴白屏，
 * 所以坏的那条丢掉、好的那些留下。
 */
export function parseNotes(raw: string | null): FieldNotes {
  if (!raw) return {}
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
  const out: FieldNotes = {}
  for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue
    const { text, at } = v as { text?: unknown; at?: unknown }
    if (typeof text !== 'string' || !text.trim()) continue
    out[id] = { text, at: typeof at === 'number' && Number.isFinite(at) ? at : 0 }
  }
  return out
}

function read(): FieldNotes {
  try {
    return parseNotes(localStorage.getItem(KEY))
  } catch {
    // 隐私模式下连 getItem 都会抛
    return {}
  }
}

export function useFieldNotes() {
  const [notes, setNotes] = useState<FieldNotes>(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(notes))
    } catch {
      /* 存不下就算了，本次会话内仍然可用 */
    }
  }, [notes])

  /** 写入一条；正文清空即视为删除，省得再给一个删除按钮 */
  const write = useCallback((id: string, text: string, now = Date.now()) => {
    setNotes((cur) => {
      const trimmed = text.trim()
      if (!trimmed) {
        if (!(id in cur)) return cur
        const next = { ...cur }
        delete next[id]
        return next
      }
      return { ...cur, [id]: { text: trimmed, at: now } }
    })
  }, [])

  const clear = useCallback(() => setNotes({}), [])

  return { notes, write, clear }
}

/** 导出成 Markdown —— 「复制笔记」用的就是它，纯函数方便测 */
export function notesToMarkdown(
  notes: FieldNotes,
  nameOf: (id: string) => string | undefined,
): string {
  const rows = Object.entries(notes).sort((a, b) => b[1].at - a[1].at)
  if (rows.length === 0) return '# 昆虫世界 · 观察笔记\n\n（还没有记录）\n'
  const lines = ['# 昆虫世界 · 观察笔记', '']
  for (const [id, note] of rows) {
    lines.push(`## ${nameOf(id) ?? id}`, '', note.text, '')
  }
  return lines.join('\n')
}
