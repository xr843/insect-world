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
 *
 * ⚠️ 2026-09-09：这个入口从「外链小胶囊」变成了**站内实拍图**本身
 * （photo_link 30 天 660 次，是站上量最大的未满足需求，值得直接把图放进来）。
 * 承载它的元素换了，但下面这三条位置约束**一条都没变** —— 它们钉的是
 * 「回答『它真长什么样』的那个东西必须在身份区」，跟那东西是链接还是图无关。
 * 所以这里改的是选择器，不是断言。
 */
import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { DetailPanel } from '../DetailPanel'
import { INSECTS } from '../../data/insects.zh'
import { photoUrl } from '../../data/external'
import { photoOf } from '../../data/photos'

afterEach(cleanup)

const withPhoto = INSECTS.find((i) => photoOf(i.id))!
/** 有 iNat taxon 记录、但一张授权合适的照片都没有 —— 这类退回外链胶囊 */
const chipOnly = INSECTS.find((i) => photoUrl(i.id) && !photoOf(i.id))
/** 连 taxon 记录都没有的（63 种里 2 只）—— 两样都不该出现 */
const withoutAny = INSECTS.find((i) => !photoUrl(i.id))!

function mount(insect = withPhoto) {
  renderZh(<DetailPanel insect={insect} onCompare={vi.fn()} onDiscover={vi.fn()} onReportError={() => {}} />)
}

/** 身份区里回答「它真长什么样」的那个块：有站内图时是 figure，没有时是外链胶囊 */
function realityBlock(): HTMLElement {
  return (
    document.querySelector('figure') ??
    (screen.getByRole('link', { name: /实物图/ }) as HTMLElement)
  )
}

describe('实物照片入口的位置', () => {
  it('排在「关键数据」之前 —— 也就是在身份区，不在底部动作清单里', () => {
    mount()
    const block = realityBlock()
    const facts = screen.getByText('关键数据')
    /*
     * compareDocumentPosition 的 FOLLOWING 位在「block 之后是 facts」时置位。
     * 用它而不是比 y 坐标：jsdom 没有真实布局，所有元素的 y 都是 0，
     * 拿坐标断言在这里永远是绿的 —— 那正是这条测试要防的那种假绿。
     */
    expect(
      block.compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING,
      '实拍图跑到「关键数据」后面去了 —— 右栏一次只看得到一半，' +
        '它一旦落到下半截就等于不存在（issue #3 就是这么来的）',
    ).toBeTruthy()
  })

  /**
   * ⚠️ 这条断言原先是**反的**（要求排在总述之后，理由是「不该插在名字和描述中间」）。
   * 方向听着有道理，但只在中文站验过 —— 实测推翻了它：
   *
   *   中文 1280×720   这一行 y=321，可视 518   ✓
   *   英文 1280×720   这一行 y=481，可视 518   ✗ 被切
   *
   * 英文总述比中文长 148px，把整块推出了折叠线。也就是说「贴着总述放」等于
   * **让位置跟着正文长度走**，那是个会随内容漂移的锚点。改成放在总述之前，
   * 位置就只取决于标题区，两种语言、任何视口高度下都钉在同一格。
   *
   * 换成实拍图之后这条只增不减：图比一行胶囊高得多，掉到折叠线下的损失更大。
   */
  it('排在总述之前 —— 位置不能跟着正文长度走，否则换个语言就掉出折叠线', () => {
    mount()
    const block = realityBlock()
    const summary = screen.getByText(withPhoto.summary)
    expect(
      block.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING,
      '实拍图跑到总述后面去了 —— 英文站上这会把它推出折叠线',
    ).toBeTruthy()
  })

  it('图注里带署名与回原页的外链 —— CC 的 BY 是许可条件，漏了是违约', () => {
    mount()
    const link = screen.getByRole('link', { name: /更多实拍图/ })
    // 链的是**观察页**而不是 /photos/<id>：观察页带拍摄者、日期、地点，
    // 是更完整的署名落点
    expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.inaturalist\.org\/observations\/\d+$/)
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  /**
   * 有 taxon 但没有授权照片的物种（robber-fly / shining-chafer）必须退回外链胶囊。
   * 换成站内图时如果顺手把胶囊删了，这两只就彻底失去实物图入口 —— 纯粹的回归，
   * 而且不会有任何报错。
   */
  it('拿不到授权照片时退回 iNaturalist 外链，而不是什么都不给', () => {
    if (!chipOnly) return
    mount(chipOnly)
    const link = screen.getByRole('link', { name: /实物图/ })
    expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.inaturalist\.org\/taxa\/\d+$/)
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('连 taxon 记录都没有时两样都不渲染 —— 宁可不给，也不把人送到错的物种页', () => {
    expect(withoutAny, '需要一个没有 iNat 链接的物种来测这条').toBeTruthy()
    mount(withoutAny)
    expect(screen.queryByRole('link', { name: /实物图/ })).toBeNull()
    expect(document.querySelector('figure')).toBeNull()
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

  it('动作组里剩下的三个仍在 —— 挪走主按钮与分享不等于删掉别的', () => {
    mount()
    for (const name of [/动态演示/, /小测/, /与其他昆虫对比/]) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
  })
})

/**
 * 三、分享同样必须待在身份区。
 *
 * 这是同一个根因的第四次，也是量得最狠的一次：分享按钮原先是动作组的最后一项、
 * y≈1134，而右栏一次只看得到 688px —— **1527 次访问里被点了 4 次（0.26%）**。
 *
 * 功能本身没问题：手机上调系统分享面板（能直达微信），桌面上复制规范链接并
 * 亮 2 秒「已复制」。坏的只有位置。
 *
 * 同组里的「对比」是天然的对照：它同样躺在折叠线以下，却因为展台工具条上还有
 * 一个入口而拿到 156 次。**同一个功能、同一个深度，差别只在有没有第二个入口。**
 *
 * 与生活史那次不同，这次是**搬**不是复制 —— 旧位置在折叠线下本来就没量，
 * 留着只会让归因变浑：改动后 share_click 涨了就只可能是新位置的功劳。
 */
describe('分享入口的位置', () => {
  const shareBtn = () => screen.getByRole('button', { name: /复制本页链接|分享这只虫|已复制/ })

  it('排在「关键数据」之前 —— 在身份区，不在底部动作清单里', () => {
    mount()
    const facts = screen.getByText('关键数据')
    expect(
      shareBtn().compareDocumentPosition(facts) & Node.DOCUMENT_POSITION_FOLLOWING,
      '分享又滑到「关键数据」后面去了 —— 那一段整块在折叠线以下',
    ).toBeTruthy()
  })

  it('排在总述之前 —— 位置不跟正文长度走', () => {
    mount()
    const summary = screen.getByText(withPhoto.summary)
    expect(shareBtn().compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /**
   * ⚠️ 2026-09-09：这条原先要求分享与实物照片外链同处一个容器（「两个是一组
   * 次要动作，不该被拆散」）。实拍图搬进站内之后那个前提没了 —— 回原页的链接
   * 现在在图注里，是**署名的一部分**（CC 的 BY 要求），不再是一个并列的动作。
   *
   * 所以改成钉真正还成立的那条：分享这一行**必须能只放一个**。原注释里已经
   * 写过这个要求（那时是为了 taxon 缺失的两只），现在它成了常态 —— 59 种都
   * 只剩分享一个。假设「永远是两个并排」的布局代码会在这里红。
   */
  it('实拍图搬进站内之后，这一行只剩分享一个 —— 布局不能假设永远是两个并排', () => {
    mount()
    const row = shareBtn().parentElement!
    expect(row.children.length).toBe(1)
    expect(screen.queryByRole('link', { name: /实物图/ })).toBeNull()
  })

  it('退回外链胶囊的物种，两个仍并排在同一容器里', () => {
    if (!chipOnly) return
    mount(chipOnly)
    const link = screen.getByRole('link', { name: /实物图/ })
    expect(shareBtn().parentElement).toBe(link.parentElement)
  })

  it('没有实物照片外链的物种照样有分享 —— 那一行不能假设永远是两个并排', () => {
    mount(withoutAny)
    expect(screen.queryByRole('link', { name: /实物图/ })).toBeNull()
    expect(shareBtn()).toBeTruthy()
  })

  it('不在动作组里 —— 与「对比」不同父，否则说明又被塞回去了', () => {
    mount()
    const compare = screen.getByRole('button', { name: /与其他昆虫对比/ })
    expect(shareBtn().parentElement).not.toBe(compare.parentElement)
  })
})
