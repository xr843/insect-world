/**
 * @vitest-environment jsdom
 *
 * 讲解弹窗底部的 AI 声明。
 *
 * 为什么值得一条测试守：这是一句**诚信声明**，不是装饰文案。
 * 60 种昆虫的讲解、生活史与冷知识都是 AI 写的、没经文献核校，README 里
 * 是加粗警示，站上却一度一个字都没有。它一旦在某个分支上漏掉，页面照样
 * 好看、测试照样绿、没有任何报错 —— 只是那一屏的读者不知道自己在读什么。
 *
 * 四个变体（讲解/动态/小测/栖境）共用 Discovery 的 shell()，所以现在是
 * 一处插入、四处生效。但共用不等于永远共用 —— 哪天有人给某个变体单独
 * 写一个返回分支绕开 shell()，这里就会红。这正是要守的东西。
 */
import { screen, cleanup } from '@testing-library/react'
import { renderZh } from '../../i18n/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Discovery, type DiscoveryKind } from '../Discovery'
import { INSECTS } from '../../data/insects.zh'
import { getGuide } from '../../data/guides.zh'

afterEach(cleanup)

/** 用真有讲解内容的物种，别造假数据 —— 造的数据只能证明代码按我以为的方式跑 */
const insect = INSECTS.find((i) => getGuide(i.id))!
const guide = getGuide(insect.id)

function mount(kind: DiscoveryKind, g = guide) {
  renderZh(
    <Discovery
      kind={kind}
      insect={insect}
      guide={g}
      onClose={vi.fn()}
      onFocusAnchor={vi.fn()}
      source="card"
      onLifeStage={vi.fn()}
    />,
  )
}

describe('讲解弹窗的 AI 声明', () => {
  it.each<DiscoveryKind>(['lesson', 'motion', 'quiz', 'habitat'])(
    '「%s」变体上有声明',
    (kind) => {
      mount(kind)
      expect(screen.getByText(/由 AI 撰写/)).toBeTruthy()
    },
  )

  it('讲解内容缺失的兜底分支上也有 —— 那一屏同样是 AI 写的壳', () => {
    mount('lesson', undefined)
    expect(screen.getByText(/由 AI 撰写/)).toBeTruthy()
  })

  it('声明里点明了「未经核校」，不能软化成一句无信息的免责套话', () => {
    mount('lesson')
    expect(screen.getByText(/未经.*核校/)).toBeTruthy()
  })
})
