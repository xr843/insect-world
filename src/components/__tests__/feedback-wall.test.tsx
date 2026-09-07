/**
 * @vitest-environment jsdom
 *
 * 点播墙与反馈表单。
 *
 * 这几条各守一个「坏了也不会报错、只会静静地少收反馈」的点：
 *
 * 1. **后端不存在时前端要完好** —— D1 绑定要人去 Cloudflare 面板手动点一次，
 *    在那之前 `/api/*` 全是 404。这不是异常路径，是上线头几天的正常状态。
 *    墙必须显示一行说明而不是白屏或抛异常。
 * 2. **蜜罐不能被真人碰到** —— 它一旦对键盘用户可达，认真填表的人就会被
 *    静默丢弃，而且没有任何报错、没人会发现。
 * 3. **纠错必须带上物种与部位** —— 少了它反馈落不了地。前端本来握着这两个
 *    上下文，漏传不会报错，只会让每条纠错都变成「网站有个地方不对」。
 * 4. **限流与校验各说各的话** —— 全都提示「发送失败」的话，被限流的人会
 *    一直重试。
 */
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { WishWall } from '../WishWall'
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

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('后端不存在时墙要安静降级', () => {
  it('/api/wall 返回 404 时显示一行说明，不抛异常', async () => {
    stubFetch(() => new Response('not found', { status: 404 }))
    renderZh(<WishWall onClose={() => {}} />)
    expect(await screen.findByText(/墙暂时看不了/)).toBeTruthy()
  })

  it('fetch 直接抛（断网）时也一样', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    renderZh(<WishWall onClose={() => {}} />)
    expect(await screen.findByText(/墙暂时看不了/)).toBeTruthy()
  })

  it('响应体缺字段时按空墙处理，不因为 undefined.map 崩掉', async () => {
    stubFetch(() => json({}))
    renderZh(<WishWall onClose={() => {}} />)
    // 没崩、走到了 ready 态：「我也想看…」那块出现了
    expect(await screen.findByText('我也想看…')).toBeTruthy()
  })
})

describe('投票', () => {
  const wallData = {
    wishes: [
      { id: 'lifecycle-cockroach', kind: 'lifecycle', title: '德国小蠊的生活史', votes: 3 },
      { id: 'feature-photos', kind: 'feature', title: '配上实拍对照图', votes: 7 },
    ],
    featured: [],
  }

  it('点整行就投票，票数立刻涨、按钮变成不可再点', async () => {
    const calls = stubFetch((url) =>
      url.startsWith('/api/wish/vote') ? json({ ok: true, votes: 4, counted: true }) : json(wallData),
    )
    renderZh(<WishWall onClose={() => {}} />)

    const row = await screen.findByRole('button', { name: /德国小蠊的生活史/ })
    await userEvent.click(row)

    await waitFor(() => expect(screen.getByRole('button', { name: /德国小蠊/ }).hasAttribute('disabled')).toBe(true))
    expect(calls.some((c) => c.url === '/api/wish/vote')).toBe(true)
    expect(calls.find((c) => c.url === '/api/wish/vote')?.body).toEqual({ id: 'lifecycle-cockroach' })
  })

  it('投票请求失败也不把按钮弹回可点 —— 弹回会让人以为自己点错了', async () => {
    stubFetch((url) =>
      url.startsWith('/api/wish/vote') ? new Response('boom', { status: 500 }) : json(wallData),
    )
    renderZh(<WishWall onClose={() => {}} />)
    const row = await screen.findByRole('button', { name: /德国小蠊的生活史/ })
    await userEvent.click(row)
    await waitFor(() => expect(row.hasAttribute('disabled')).toBe(true))
  })

  it('票数为 0 时不因为除以零而画出畸形条形', async () => {
    stubFetch(() => json({ wishes: [{ id: 'a', kind: 'feature', title: '零票项', votes: 0 }], featured: [] }))
    renderZh(<WishWall onClose={() => {}} />)
    const row = await screen.findByRole('button', { name: /零票项/ })
    const bar = row.querySelector('span[style]') as HTMLElement
    expect(bar.style.width).toBe('0%')
  })
})

describe('精选留言', () => {
  it('一条都没有时整块不出现 —— 空着的「编辑选了几句」比没有更难看', async () => {
    stubFetch(() => json({ wishes: [], featured: [] }))
    renderZh(<WishWall onClose={() => {}} />)
    await screen.findByText('我也想看…')
    expect(screen.queryByText('编辑选了几句')).toBeNull()
  })

  it('有精选时原样显示', async () => {
    stubFetch(() => json({ wishes: [], featured: [{ body: '带二年级孩子看了一下午。', at: 1 }] }))
    renderZh(<WishWall onClose={() => {}} />)
    expect(await screen.findByText('带二年级孩子看了一下午。')).toBeTruthy()
  })
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
