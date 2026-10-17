/** @vitest-environment jsdom */
import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderEn, renderZh } from '../../i18n/testing'
import { INSECTS as zhInsects } from '../../data/insects.zh'
import { INSECTS as enInsects } from '../../data/insects.en'
import { CONTENT_SOURCES } from '../../data/contentSources'
import { DetailPanel } from '../DetailPanel'

const props = { onCompare: () => {}, onDiscover: () => {}, onReportError: () => {} }
afterEach(cleanup)

describe('detail source evidence', () => {
  for (const id of ['monarch-butterfly', 'dragonfly', 'ant', 'cicada', 'longhorn-beetle'] as const) {
    it(`lists every scoped ${id} source in both languages without whole-species verification`, () => {
      const urls = CONTENT_SOURCES[id].map(source => source.url)
      expect(urls.length).toBeGreaterThanOrEqual(3)
      renderZh(<DetailPanel insect={zhInsects.find(insect => insect.id === id)!} {...props} />)
      const zh = screen.getByRole('region', { name: '来源与核校' })
      expect(within(zh).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(urls)
      expect(zh.textContent).toContain('非专家复审')
      expect(zh.textContent).toContain('2026-10-17')
      cleanup()
      renderEn(<DetailPanel insect={enInsects.find(insect => insect.id === id)!} {...props} />)
      const en = screen.getByRole('region', { name: 'Sources and checks' })
      expect(within(en).getAllByRole('link')).toHaveLength(urls.length)
      expect(en.textContent).toContain('No expert review')
      expect(en.textContent).not.toMatch(/[一-鿿]/)
    })
  }
  it('shows mantis evidence with named claim scopes instead of whole-species verification', () => {
    renderZh(<DetailPanel insect={zhInsects.find(insect => insect.id === 'mantis')!} {...props} />)
    const section = screen.getByRole('region', { name: '来源与核校' })
    expect(within(section).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      'https://content.ces.ncsu.edu/chinese-mantid',
      'https://www.unibas.ch/dam/jcr:8c1649d3-ba69-4907-b84b-e7f84d765a4c/Artikel%20Wilson%20Journal%20of%20Ornithology.pdf',
    ])
    expect(section.textContent).toContain('捕捉前足与卵鞘越冬')
    expect(section.textContent).toContain('美国东部引入种群与捕鸟记录')
    expect(section.textContent).toContain('非专家复审')
  })
  it('localizes the mantis scopes and preserves the incomplete-check notice', () => {
    renderEn(<DetailPanel insect={enInsects.find(insect => insect.id === 'mantis')!} {...props} />)
    const section = screen.getByRole('region', { name: 'Sources and checks' })
    expect(within(section).getAllByRole('link')).toHaveLength(2)
    expect(section.textContent).toContain('Grasping forelegs and overwintering eggs in oothecae')
    expect(section.textContent).toContain('Introduced eastern US populations and bird-capture records')
    expect(section.textContent).toContain('No expert review')
    expect(section.textContent).not.toMatch(/[一-鿿]/)
  })
  it('shows scoped honeybee evidence for stinging, dance coding and winter clustering', () => {
    renderZh(<DetailPanel insect={zhInsects.find(insect => insect.id === 'honeybee')!} {...props} />)
    const section = screen.getByRole('region', { name: '来源与核校' })
    expect(within(section).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      'https://ask.ifas.ufl.edu/publication/IN1005',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC6835826/',
      'https://www.psu.edu/news/research/story/summer-weather-conditions-influence-winter-survival-honey-bees',
    ])
    expect(section.textContent).toContain('螫针倒钩与厚皮肤中的脱落')
    expect(section.textContent).toContain('摆尾直跑的方向与时长')
    expect(section.textContent).toContain('寒冷地区蜂群抱团产热与储粮')
    expect(section.textContent).toContain('非专家复审')
  })
  it('localizes honeybee evidence and keeps the remaining checks explicit', () => {
    renderEn(<DetailPanel insect={enInsects.find(insect => insect.id === 'honeybee')!} {...props} />)
    const section = screen.getByRole('region', { name: 'Sources and checks' })
    expect(within(section).getAllByRole('link')).toHaveLength(3)
    expect(section.textContent).toContain('Waggle run direction and duration')
    expect(section.textContent).toContain('Cold-climate winter clustering and food stores')
    expect(section.textContent).toContain('No expert review')
    expect(section.textContent).not.toMatch(/[一-鿿]/)
  })
  it('shows ladybird evidence and identifies the paywalled research as abstract-only', () => {
    renderZh(<DetailPanel insect={zhInsects.find(insect => insect.id === 'ladybird')!} {...props} />)
    const section = screen.getByRole('region', { name: '来源与核校' })
    const links = within(section).getAllByRole('link')
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      'https://entomology.ces.ncsu.edu/biological-control-information-center/beneficial-predators/c-7-ladybeetle/',
      'https://biocontrol.entomology.cornell.edu/predators/Coccinella.php',
      'https://animaldiversity.org/accounts/Coccinella_septempunctata/',
      'https://link.springer.com/article/10.1007/BF01240660',
    ])
    const study = links[3].closest('li')!
    expect(study.textContent).toContain('已读摘要（未读全文）')
    expect(study.textContent).not.toContain('已读全文')
    expect(study.textContent).toContain('腿关节反射性出血')
    expect(section.textContent).toContain('美国东北部世代与北美引入')
    expect(section.textContent).toContain('2026-10-01')
    expect(section.textContent).toContain('非专家复审')
  })
  it('localizes the ladybird source scopes and abstract access in English', () => {
    renderEn(<DetailPanel insect={enInsects.find(insect => insect.id === 'ladybird')!} {...props} />)
    const section = screen.getByRole('region', { name: 'Sources and checks' })
    expect(within(section).getAllByRole('link')).toHaveLength(4)
    expect(section.textContent).toContain('Abstract read; full text not read')
    expect(section.textContent).toContain('Northeastern US generations and North American introduction')
    expect(section.textContent).not.toMatch(/[一-鿿]/)
  })
  it('shows three real evidence links with specific scope and keeps the correction action after them', () => {
    renderZh(<DetailPanel insect={zhInsects[0]} {...props} />)
    const section = screen.getByRole('region', { name: '来源与核校' })
    const links = within(section).getAllByRole('link')
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      'https://www.env.go.jp/content/000283612.pdf',
      'https://www.tokyo-zoo.net/tama/encyclopedia/japanese-rhinoceros-beetle/index.html',
      'https://pmc.ncbi.nlm.nih.gov/articles/PMC6835817/',
    ])
    expect(section.textContent).toContain('日本亚种体长（不含角）')
    expect(section.textContent).toContain('食性与分布')
    expect(section.textContent).toContain('雄虫角斗')
    expect(section.textContent).toContain('仅以下事实')
    expect(section.textContent).toContain('热点、课程和测验仍未全面核校')
    expect(section.textContent).toContain('非专家复审')
    expect(section.textContent).toContain('2026-09-30')
    const correction = screen.getByRole('button', { name: /纠错|有误|报告|画得|更正/ })
    expect(section.compareDocumentPosition(correction) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('localizes evidence and its limits in English', () => {
    renderEn(<DetailPanel insect={enInsects[0]} {...props} />)
    const section = screen.getByRole('region', { name: 'Sources and checks' })
    expect(within(section).getAllByRole('link')).toHaveLength(3)
    expect(section.textContent).toContain('Japanese subspecies length (excluding horns)')
    expect(section.textContent).toContain('Hotspots, lessons and quizzes have not been fully checked')
    expect(section.textContent).toContain('No expert review')
    expect(section.textContent).not.toMatch(/[一-鿿]/)
  })

  it('presents scoped measurements and life stages without unverified strength or fixed lifespan claims', () => {
    renderEn(<DetailPanel insect={enInsects[0]} {...props} />)
    const detail = screen.getByRole('complementary')
    expect(detail.textContent).toContain('Japanese subspecies')
    expect(detail.textContent).toContain('excluding the horn')
    expect(detail.textContent).toContain('overwinters in Japan')
    expect(detail.textContent).not.toContain('dozens of times')
    expect(detail.textContent).not.toContain('1–2 months')
    expect(detail.textContent).not.toContain('8–10 months')
    expect(detail.textContent).not.toContain('bark crevices')
  })

  it('does not manufacture evidence links for a species awaiting checks', () => {
    renderZh(<DetailPanel insect={zhInsects.find(insect => insect.id === 'locust')!} {...props} />)
    const section = screen.getByRole('region', { name: '来源与核校' })
    expect(section.textContent).toContain('尚未逐条核校')
    expect(within(section).queryAllByRole('link')).toHaveLength(0)
  })
})
