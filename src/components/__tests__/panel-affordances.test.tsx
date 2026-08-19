/**
 * @vitest-environment jsdom
 *
 * 右栏两个**入口位置**的回归闸门。
 *
 * 共同的根因是一个量出来的事实：右栏是独立滚动容器，**可视 688px / 内容 1350px
 * —— 一次只看得到 51%**。任何落在下半截的东西，等于对多数人不存在。
 *
 * 一、「看实物照片」必须待在身份区（名字/别称/总述那一块），不能滑回底部的动作清单。
 *
 * 由来是一次真实的失败：功能一直都在，但它作为按钮组的最后一项落在右栏
 * y≈1306 处 —— 而右栏是独立滚动容器，实测可视 688px、内容 1358px，
 * **一次只看得到一半**。结果 issue #3 里一位专门来找实拍图的老师说
 * 「如果顺便支持实拍图片就更好了」。他没找到，不是他的问题，是入口的问题。
 *
 * 位置这种东西最容易在重构里被顺手挪走，而挪走之后**任何常规断言都不会红**
 * （链接还在、href 还对、点了还能跳）。所以这里直接钉 DOM 顺序：
 * 它必须出现在「关键数据」之前。
 */
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { DetailPanel } from '../DetailPanel'
import { INSECTS } from '../../data/insects.zh'
import { photoUrl } from '../../data/external'

afterEach(cleanup)

const withPhoto = INSECTS.find((i) => photoUrl(i.id))!
const withoutPhoto = INSECTS.find((i) => !photoUrl(i.id))!

function mount(insect = withPhoto) {
  renderZh(<DetailPanel insect={insect} onCompare={vi.fn()} onDiscover={vi.fn()} />)
}

describe('实物照片入口的位置', () => {
  it('排在「关键数据」之前 —— 也就是在身份区，不在底部动作清单里', () => {
    mount()
    const link = screen.getByRole('link', { name: /实物图/ })
    const facts = screen.getByText('关键数据')
    /*
     * compareDocumentPosition 的 FOLLOWING 位在「link 之后是 facts」时置位。
     * 用它而不是比 y 坐标：jsdom 没有真实布局，所有元素的 y 都是 0，
     * 拿坐标断言在这里永远是绿的 —— 那正是这条测试要防的那种假绿。
     */
    expect(
      link.compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING,
      '「看实物照片」跑到「关键数据」后面去了 —— 右栏一次只看得到一半，' +
        '它一旦落到下半截就等于不存在（issue #3 就是这么来的）',
    ).toBeTruthy()
  })

  it('也排在总述之后 —— 它是「认这只虫」的一部分，不该插在名字和描述中间', () => {
    mount()
    const link = screen.getByRole('link', { name: /实物图/ })
    const summary = screen.getByText(withPhoto.summary)
    expect(summary.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('是外链，且带 noopener', () => {
    mount()
    const link = screen.getByRole('link', { name: /实物图/ })
    expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.inaturalist\.org\/taxa\/\d+$/)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('没有核对过的 taxon 记录时整个不渲染 —— 宁可不给，也不把人送到错的物种页', () => {
    expect(withoutPhoto, '需要一个没有 iNat 链接的物种来测这条').toBeTruthy()
    mount(withoutPhoto)
    expect(screen.queryByRole('link', { name: /实物图/ })).toBeNull()
  })
})

describe('主按钮「读它的图鉴详解」的位置', () => {
  /*
   * 二、主按钮必须待在吸底条里，不能回到底部的动作组。
   *
   * 它原先在动作组第一项，落在栏内 y=1031 —— 折叠线以下 343px，
   * 被上面那 285px 的阅读性内容（生态角色 + 你知道吗 + 生活史）推下去的。
   * 也就是说这个站最主要的引导入口，多数人可能从没看见过。
   *
   * 同样只能钉 DOM 结构：按钮回到动作组之后，它还在、还能点、事件照发，
   * 没有任何常规断言会红。
   */
  it('在吸底容器里，且排在 meta（分布/状态/近缘）之后 —— 也就是栏的最末', () => {
    mount()
    const btn = screen.getByRole('button', { name: /读它的图鉴详解/ })
    const relatives = screen.getByText(withPhoto.relatives.join(' · '))
    expect(
      relatives.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING,
      '主按钮跑回内容中间了 —— 它要么吸底、要么就会掉进折叠线以下那一半',
    ).toBeTruthy()
  })

  it('不在动作组里 —— 那一组整块在折叠线以下', () => {
    mount()
    const btn = screen.getByRole('button', { name: /读它的图鉴详解/ })
    const compare = screen.getByRole('button', { name: /与其他昆虫对比/ })
    expect(
      btn.parentElement,
      '主按钮与「对比」同处一个容器，说明它又被塞回动作组了',
    ).not.toBe(compare.parentElement)
  })

  it('动作组里剩下的四个仍在 —— 挪走主按钮不等于删掉别的', () => {
    mount()
    for (const name of [/动态演示/, /小测/, /与其他昆虫对比/]) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })
})
