/**
 * @vitest-environment jsdom
 *
 * 观察笔记 —— 全站唯一会写用户数据的地方，也是唯一「坏了会丢东西」的地方。
 *
 * 之前这一层零测试，全靠手点验证：写一条、刷新、看看还在不在。
 * 手点验不到的恰恰是要命的那些分支：localStorage 里躺着上个版本的脏数据、
 * 隐私模式下 getItem 直接抛、正文清空到底算删除还是算空字符串。
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { notesToMarkdown, parseNotes, useFieldNotes } from '../useFieldNotes'

const KEY = 'insect-world.field-notes.v1'

afterEach(() => localStorage.clear())

describe('parseNotes：localStorage 是用户能随手改的，坏数据不许拖垮整个图鉴', () => {
  it('空值与非法 JSON 一律回空对象，不抛', () => {
    expect(parseNotes(null)).toEqual({})
    expect(parseNotes('')).toEqual({})
    expect(parseNotes('{ 这不是 json')).toEqual({})
  })

  it('顶层是数组或标量时不当成笔记（旧版本残留的常见形态）', () => {
    expect(parseNotes('[1,2,3]')).toEqual({})
    expect(parseNotes('"a string"')).toEqual({})
    expect(parseNotes('null')).toEqual({})
  })

  it('坏的那条丢掉、好的那些留下 —— 一条坏数据不该让所有笔记消失', () => {
    const raw = JSON.stringify({
      good: { text: '看到它在啃叶子', at: 1000 },
      noText: { at: 2000 },
      emptyText: { text: '   ', at: 3000 },
      notObject: 'oops',
      badAt: { text: '时间戳坏了但正文还在', at: 'yesterday' },
    })
    const out = parseNotes(raw)
    expect(Object.keys(out).sort()).toEqual(['badAt', 'good'])
    expect(out.good).toEqual({ text: '看到它在啃叶子', at: 1000 })
    // 时间戳坏了不丢正文，退回 0（排到最后）而不是 NaN —— NaN 会让排序整个乱掉
    expect(out.badAt.at).toBe(0)
  })

  it('Infinity / NaN 这类非有限数也退回 0', () => {
    expect(parseNotes(JSON.stringify({ a: { text: 'x', at: null } })).a.at).toBe(0)
  })
})

describe('useFieldNotes：写入与删除', () => {
  it('写一条会落到 localStorage（关掉页面还在，这是这个功能存在的理由）', () => {
    const { result } = renderHook(() => useFieldNotes())
    act(() => result.current.write('ladybird', '七个黑点数清楚了'))

    expect(result.current.notes.ladybird.text).toBe('七个黑点数清楚了')
    expect(parseNotes(localStorage.getItem(KEY)).ladybird.text).toBe('七个黑点数清楚了')
  })

  it('挂载时从 localStorage 恢复（模拟刷新页面）', () => {
    localStorage.setItem(KEY, JSON.stringify({ mantis: { text: '前足像镰刀', at: 42 } }))
    const { result } = renderHook(() => useFieldNotes())
    expect(result.current.notes.mantis).toEqual({ text: '前足像镰刀', at: 42 })
  })

  it('正文前后空白会被 trim（用户手抖打的空格不该存进去）', () => {
    const { result } = renderHook(() => useFieldNotes())
    act(() => result.current.write('ant', '  排成一列  '))
    expect(result.current.notes.ant.text).toBe('排成一列')
  })

  it('清空正文＝删除这条（界面上没有单独的删除按钮，全靠这条语义）', () => {
    const { result } = renderHook(() => useFieldNotes())
    act(() => result.current.write('bee', '在采蜜'))
    expect(result.current.notes.bee).toBeDefined()

    act(() => result.current.write('bee', '   '))
    expect(result.current.notes.bee).toBeUndefined()
    expect(parseNotes(localStorage.getItem(KEY)).bee).toBeUndefined()
  })

  it('删一条本来就不存在的笔记不产生新状态（避免无谓重渲染）', () => {
    const { result } = renderHook(() => useFieldNotes())
    act(() => result.current.write('ladybird', '有'))
    const before = result.current.notes
    act(() => result.current.write('never-noted', ''))
    expect(result.current.notes).toBe(before)
  })

  it('clear 清空全部', () => {
    const { result } = renderHook(() => useFieldNotes())
    act(() => result.current.write('a', '一'))
    act(() => result.current.write('b', '二'))
    act(() => result.current.clear())
    expect(result.current.notes).toEqual({})
    expect(parseNotes(localStorage.getItem(KEY))).toEqual({})
  })
})

describe('notesToMarkdown：「复制笔记」导出的就是它', () => {
  const nameOf = (id: string) => ({ ladybird: '七星瓢虫', mantis: '中华大刀螳' })[id]

  it('按最近修改排序（最新的在最前）', () => {
    const md = notesToMarkdown(
      { ladybird: { text: '旧的', at: 100 }, mantis: { text: '新的', at: 900 } },
      nameOf,
    )
    expect(md.indexOf('中华大刀螳')).toBeLessThan(md.indexOf('七星瓢虫'))
  })

  it('用中文名而非 id 作标题；查不到名字时退回 id 而不是 undefined', () => {
    const md = notesToMarkdown(
      { ladybird: { text: '甲', at: 2 }, 'unknown-bug': { text: '乙', at: 1 } },
      nameOf,
    )
    expect(md).toContain('## 七星瓢虫')
    expect(md).toContain('## unknown-bug')
    expect(md).not.toContain('undefined')
  })

  it('一条都没有时给一句人话，而不是空文件', () => {
    expect(notesToMarkdown({}, nameOf)).toContain('还没有记录')
  })
})
