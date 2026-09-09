/**
 * @vitest-environment jsdom
 *
 * 实拍对照图。
 *
 * 这几条守的都是「坏了也不报错」的点，其中前两条是**许可证义务**——
 * 漏了署名不是难看，是违约，而且页面照常好看，没人会发现。
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { SpeciesPhoto } from '../SpeciesPhoto'
import { DetailPanel } from '../DetailPanel'
import { photoOf } from '../../data/photos'
import { INAT_TAXA } from '../../data/external'
import { isAllowed } from '../../data/photoPolicy'
import photos from '../../data/photos.json'

afterEach(cleanup)

const byId = (id: string) => INSECTS.find((i) => i.id === id)!

describe('署名（CC 的 BY 是许可条件，不是装饰）', () => {
  it('摄影者、许可证、回原页的链接三样都在', () => {
    const p = photoOf('monarch-butterfly')!
    renderZh(<SpeciesPhoto insectId="monarch-butterfly" name="帝王蝶" />)

    expect(screen.getByText(new RegExp(p.photographer))).toBeTruthy()
    expect(screen.getByText(/CC/)).toBeTruthy()
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe(p.inatUrl)
  })

  it('署名常驻，不是 hover 才出现 —— 那等于对不用鼠标的人隐藏许可信息', () => {
    const p = photoOf('monarch-butterfly')!
    const { container } = renderZh(<SpeciesPhoto insectId="monarch-butterfly" name="帝王蝶" />)
    const cap = container.querySelector('figcaption') as HTMLElement
    expect(cap).toBeTruthy()
    expect(cap.textContent).toContain(p.photographer)
    // 没有任何把它藏起来的内联样式
    expect(cap.hasAttribute('hidden')).toBe(false)
  })
})

describe('清单本身', () => {
  it('每一条的许可证都在白名单里 —— 挑错一张图是静默错误，只能靠这条钉死', () => {
    const bad = Object.entries(photos as Record<string, { license: string }>)
      .filter(([, v]) => !isAllowed(v.license))
      .map(([k, v]) => `${k}:${v.license}`)
    expect(bad).toEqual([])
  })

  it('每一条都有非空的摄影者与回原页链接', () => {
    const bad = Object.entries(photos as Record<string, { photographer: string; inatUrl: string }>)
      .filter(([, v]) => !v.photographer?.trim() || !v.inatUrl?.startsWith('https://'))
      .map(([k]) => k)
    expect(bad).toEqual([])
  })

  it('不含 INAT_TAXA 之外的物种 —— 清单只该覆盖核对过 taxon 的那些', () => {
    const extra = Object.keys(photos).filter((id) => !(id in INAT_TAXA))
    expect(extra).toEqual([])
  })
})

describe('没有照片时', () => {
  it('整块不渲染 —— 一个空框比没有框难看得多', () => {
    const { container } = renderZh(<SpeciesPhoto insectId="not-a-species" name="不存在" />)
    expect(container.querySelector('figure')).toBeNull()
  })

  /**
   * robber-fly 与 shining-chafer 有 iNat taxon 记录，但一张授权合适的照片都没有。
   * 直接把原来那个外链小胶囊删掉，这两只就彻底失去实物图入口了 —— 纯粹的回归。
   */
  it('有 taxon 但没授权照片的物种，保留原来的 iNaturalist 外链胶囊', () => {
    const noPhoto = Object.keys(INAT_TAXA).filter((id) => photoOf(id) === null)
    expect(noPhoto.length).toBeGreaterThan(0)

    const id = noPhoto[0]
    const insect = byId(id)
    if (!insect) return

    renderZh(
      <DetailPanel insect={insect} onCompare={() => {}} onDiscover={() => {}} onReportError={() => {}} />,
    )
    expect(screen.getByRole('link', { name: /iNaturalist/ })).toBeTruthy()
  })

  it('有站内照片的物种不再显示那个胶囊 —— 同一个动作不给两个入口，否则归因变浑', () => {
    renderZh(
      <DetailPanel
        insect={byId('monarch-butterfly')}
        onCompare={() => {}}
        onDiscover={() => {}}
        onReportError={() => {}}
      />,
    )
    expect(screen.queryByRole('link', { name: /iNaturalist/ })).toBeNull()
  })
})

describe('版面与埋点', () => {
  it('img 上写死了宽高 —— 不写的话图加载完会把下面的正文整体推下去', () => {
    const { container } = renderZh(<SpeciesPhoto insectId="monarch-butterfly" name="帝王蝶" />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img.getAttribute('width')).toBeTruthy()
    expect(img.getAttribute('height')).toBeTruthy()
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('图片走站内地址，不热链 iNat 的 S3（大陆访客连不上那个域名）', () => {
    const { container } = renderZh(<SpeciesPhoto insectId="monarch-butterfly" name="帝王蝶" />)
    const src = (container.querySelector('img') as HTMLImageElement).getAttribute('src')!
    expect(src.startsWith('/photos/')).toBe(true)
    expect(src).not.toContain('amazonaws')
  })

  /**
   * 这条防的是分析上的坑：搬进图注之前 photo_link 的意思是「我想看真虫长什么样」，
   * 现在图就在上面，点它的意思变成「我还想看更多」。跨这次改动直接比总量会
   * 得出错误结论，所以必须带一个能把两个时期分开的维度。
   */
  it('图注里的链接上报 photo_link 时带 from: caption', async () => {
    const mod = await import('../../analytics')
    const spy = vi.spyOn(mod, 'track').mockImplementation(() => {})
    render(<></>)
    cleanup()
    renderZh(<SpeciesPhoto insectId="monarch-butterfly" name="帝王蝶" />)
    await userEvent.click(screen.getByRole('link'))
    expect(spy).toHaveBeenCalledWith('photo_link', { species_id: 'monarch-butterfly', from: 'caption' })
    spy.mockRestore()
  })
})
