/**
 * 观察笔记的存取。
 *
 * 这一层唯一的外部依赖是 localStorage —— 一个用户随手就能改、
 * 也会跨版本残留旧结构的地方。所以测的重点不是「正常数据能读回来」，
 * 而是「喂进去各种坏东西时不会把界面带崩」。
 */
import { describe, expect, it } from 'vitest'
import { notesToMarkdown, parseNotes, type FieldNotes } from '../useFieldNotes'

describe('parseNotes', () => {
  it('读回正常写入的笔记', () => {
    const raw = JSON.stringify({ mantis: { text: '在窗台上等了半小时', at: 1700000000000 } })
    expect(parseNotes(raw)).toEqual({ mantis: { text: '在窗台上等了半小时', at: 1700000000000 } })
  })

  it('没有存过时返回空对象，而不是 null', () => {
    expect(parseNotes(null)).toEqual({})
    expect(parseNotes('')).toEqual({})
  })

  it.each([
    ['不是 JSON', '{这不是 json'],
    ['顶层是数组', '[1,2,3]'],
    ['顶层是字符串', '"hello"'],
    ['顶层是 null', 'null'],
  ])('%s 时返回空对象而不抛异常', (_label, raw) => {
    expect(() => parseNotes(raw)).not.toThrow()
    expect(parseNotes(raw)).toEqual({})
  })

  it('丢掉坏掉的条目，保留好的 —— 一条坏数据不该连累其余', () => {
    const raw = JSON.stringify({
      good: { text: '正常', at: 5 },
      noText: { at: 5 },
      textIsNumber: { text: 42, at: 5 },
      isNull: null,
      isString: 'nope',
      blank: { text: '   ', at: 5 },
    })
    expect(parseNotes(raw)).toEqual({ good: { text: '正常', at: 5 } })
  })

  it('时间戳缺失或不是有限数时补 0，条目本身仍保留', () => {
    const raw = JSON.stringify({
      a: { text: '甲' },
      b: { text: '乙', at: 'yesterday' },
      c: { text: '丙', at: Number.POSITIVE_INFINITY },
    })
    const out = parseNotes(raw)
    expect(Object.keys(out).sort()).toEqual(['a', 'b', 'c'])
    expect(out.a.at).toBe(0)
    expect(out.b.at).toBe(0)
    expect(out.c.at).toBe(0)
  })
})

describe('notesToMarkdown', () => {
  const nameOf = (id: string) => ({ mantis: '中华大刀螳', ant: '日本弓背蚁' })[id]

  it('按最近修改排在前面', () => {
    const notes: FieldNotes = {
      mantis: { text: '旧的', at: 1 },
      ant: { text: '新的', at: 2 },
    }
    const md = notesToMarkdown(notes, nameOf)
    expect(md.indexOf('日本弓背蚁')).toBeLessThan(md.indexOf('中华大刀螳'))
  })

  it('用中文名而不是 id 作标题', () => {
    const md = notesToMarkdown({ mantis: { text: '记一笔', at: 1 } }, nameOf)
    expect(md).toContain('## 中华大刀螳')
    expect(md).not.toContain('## mantis')
    expect(md).toContain('记一笔')
  })

  it('查不到名字时退回 id，而不是渲染出 undefined', () => {
    const md = notesToMarkdown({ ghost: { text: '?', at: 1 } }, () => undefined)
    expect(md).toContain('## ghost')
    expect(md).not.toContain('undefined')
  })

  it('一条都没有时给出可读的空状态，而不是只有标题', () => {
    const md = notesToMarkdown({}, nameOf)
    expect(md).toContain('还没有记录')
  })
})
