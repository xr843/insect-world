/**
 * @vitest-environment jsdom
 *
 * 反馈表单与纠错对话框。
 *
 * 这几条各守一个「坏了也不会报错、只会静静地少收反馈」的点：
 *
 * 1. **蜜罐不能被真人碰到** —— 它一旦对键盘用户可达，认真填表的人就会被
 *    静默丢弃，而且没有任何报错、没人会发现。
 * 2. **纠错必须带上物种与部位** —— 少了它反馈落不了地。前端本来握着这两个
 *    上下文，漏传不会报错，只会让每条纠错都变成「网站有个地方不对」。
 * 3. **限流与校验各说各的话** —— 全都提示「发送失败」的话，被限流的人会
 *    一直重试。
 */
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { FeedbackDialog } from '../FeedbackDialog'
import { FeedbackForm } from '../FeedbackForm'

afterEach(cleanup)

const insect = INSECTS.find((i) => i.id === 'monarch-butterfly')!

/** 把 fetch 换成可编排的假实现，返回记录下来的调用列表 */
function stubFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; body: unknown }[] = []
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null })
    return handler(String(input), init)
  })
  return calls
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('蜜罐', () => {
  it('真人 tab 不到它 —— 否则认真填表的人会被静默丢弃', () => {
    renderZh(<FeedbackForm kind="note" placeholder="说点什么" />)
    const hp = document.querySelector('input[name="website"]') as HTMLInputElement
    expect(hp).toBeTruthy()
    expect(hp.tabIndex).toBe(-1)
    expect(hp.getAttribute('aria-hidden')).toBe('true')
  })

  it('不用 display:none 隐藏 —— 爬虫会跳过明显被隐藏的字段', () => {
    renderZh(<FeedbackForm kind="note" placeholder="说点什么" />)
    const hp = document.querySelector('input[name="website"]') as HTMLInputElement
    expect(hp.hasAttribute('hidden')).toBe(false)
    expect(hp.style.display).not.toBe('none')
  })
})

describe('提交', () => {
  it('太短的正文发不出去', async () => {
    renderZh(<FeedbackForm kind="note" placeholder="说点什么" />)
    expect(screen.getByRole('button', { name: '发送' }).hasAttribute('disabled')).toBe(true)
  })

  it('成功后显示致谢，且草稿被清空', async () => {
    stubFetch(() => json({ ok: true }))
    renderZh(<FeedbackForm kind="note" placeholder="说点什么" />)
    await userEvent.type(screen.getByPlaceholderText('说点什么'), '这个站很好')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))
    expect(await screen.findByText('收到了，谢谢。')).toBeTruthy()
  })

  it('429 说的是「今天发得多了」，不是笼统的失败 —— 否则会一直重试', async () => {
    stubFetch(() => json({ ok: false, error: 'rate-limited' }, 429))
    renderZh(<FeedbackForm kind="note" placeholder="说点什么" />)
    await userEvent.type(screen.getByPlaceholderText('说点什么'), '再来一条')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))
    expect(await screen.findByText(/今天发得有点多/)).toBeTruthy()
  })

  it('400 说的是「填得不对」', async () => {
    stubFetch(() => json({ ok: false, error: 'invalid' }, 400))
    renderZh(<FeedbackForm kind="note" placeholder="说点什么" />)
    await userEvent.type(screen.getByPlaceholderText('说点什么'), '内容')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))
    expect(await screen.findByText(/填得不对/)).toBeTruthy()
  })
})

describe('纠错对话框带上下文', () => {
  it('聚焦在某个标注点时，把物种与该点所属的部位组一起发出去', async () => {
    const calls = stubFetch(() => json({ ok: true }))
    renderZh(<FeedbackDialog insect={insect} focusAnchor="hindwing" onClose={() => {}} />)
    await userEvent.type(screen.getByRole('textbox', { name: '' }), '尾突太短了')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(calls.some((c) => c.url === '/api/feedback')).toBe(true))
    const body = calls.find((c) => c.url === '/api/feedback')?.body as Record<string, unknown>
    expect(body.kind).toBe('correction')
    expect(body.species).toBe('monarch-butterfly')
    // hindwing 归「翅」组 —— 发的是部位组而不是 anchor 原键，因为组才有中英显示名
    expect(body.part).toBe('wing')
  })

  it('没有聚焦点时物种照样带上，只是没有部位', async () => {
    const calls = stubFetch(() => json({ ok: true }))
    renderZh(<FeedbackDialog insect={insect} focusAnchor={null} onClose={() => {}} />)
    await userEvent.type(screen.getByRole('textbox', { name: '' }), '总述里有个错字')
    await userEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => expect(calls.some((c) => c.url === '/api/feedback')).toBe(true))
    const body = calls.find((c) => c.url === '/api/feedback')?.body as Record<string, unknown>
    expect(body.species).toBe('monarch-butterfly')
    expect(body.part).toBe(null)
  })
})
