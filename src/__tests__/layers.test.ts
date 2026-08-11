/**
 * 三个内容层的齐备性 —— 图鉴数据、建模文件、剪影图标。
 *
 * 每一层都有自己的测试，但每一层的测试都只看自己：
 * `insects.test.ts` 数自己的条数，`glyph.test.tsx` 检自己列出的 id。
 * 于是「数据里有、模型没有」「数据里有、剪影没有」这类**跨层漏项**
 * 谁都不负责，而它们的表现全是静默降级，不是报错：
 *
 * - 缺建模文件 → 界面把这个物种过滤掉，用户根本看不见它
 * - 缺剪影 → `GLYPHS[id] ?? GenericBug` 悄悄换成通用虫形，
 *   页面照常渲染，只是列表里多了一只谁也不是的虫
 *
 * 这两条缝各自坑过一次（数据到 40 而模型停在 32，上线后 8 个物种点开只转圈），
 * 所以在这里统一钉死：数据层列出的每一个物种，另外两层都必须有真东西。
 */
import { describe, expect, it } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { INSECTS } from '../data/insects.zh'
import { GUIDES } from '../data/guides.zh'
import { insectBody } from '../components/InsectGlyph'
import { UTILITY_MODULES, isKnownSpecies, knownSpecies } from '../three/registry'

/**
 * 把剪影的元素树压成一个字符串。
 *
 * 不能只数 path 数量 —— 兜底的通用虫形也有若干条 path，数量对得上照样是错的。
 * 这里把每个节点的标签名与全部几何属性都收进来，两个剪影只要有一处坐标不同
 * 指纹就不同；反过来，指纹相同就意味着它们真的是同一张图。
 */
function fingerprint(node: ReactNode): string {
  const parts: string[] = []

  const walk = (n: ReactNode): void => {
    if (n === null || n === undefined || typeof n === 'boolean') return
    if (typeof n === 'string' || typeof n === 'number') {
      parts.push(String(n))
      return
    }
    if (Array.isArray(n)) {
      for (const child of n) walk(child)
      return
    }
    const el = n as ReactElement<Record<string, unknown>>
    if (typeof el !== 'object' || !('props' in el)) return

    // 宿主元素记标签名；函数组件（Pair、Limb 之类）记函数名，其 props 同样有区分度
    const tag =
      typeof el.type === 'string' ? el.type : ((el.type as { name?: string })?.name ?? 'fn')
    const props = (el.props ?? {}) as Record<string, unknown>
    const attrs = Object.entries(props)
      .filter(([k]) => k !== 'children')
      .map(([k, v]) => `${k}=${String(v)}`)
      .sort()
      .join(',')

    parts.push(`${tag}{${attrs}}`)
    walk(props.children as ReactNode)
  }

  walk(node)
  return parts.join('|')
}

/** 未注册 id 走的兜底图形，用来识别「其实没画」的物种 */
const GENERIC = fingerprint(insectBody('__这个 id 一定不存在__'))

describe('图鉴里的每个物种，建模层都有对应文件', () => {
  it('没有只有数据、点开却只会转圈的物种', () => {
    const missing = INSECTS.filter((i) => !isKnownSpecies(i.id)).map((i) => `${i.name}(${i.id})`)
    expect(
      missing,
      `这些物种在 src/three/builders/ 下没有建模文件，界面会把它们整个过滤掉：\n${missing.join('\n')}`,
    ).toEqual([])
  })
})

describe('图鉴里的每个物种，都有专属剪影', () => {
  it.each(INSECTS.map((i) => [i.id, i.name] as const))('%s（%s）', (id, name) => {
    expect(
      fingerprint(insectBody(id)) === GENERIC,
      `${name} 没有自己的剪影，正在用通用虫形兜底 —— 页面不会报错，只是列表里多一只谁也不是的虫`,
    ).toBe(false)
  })

  it('任意两个物种的剪影都不相同', () => {
    const seen = new Map<string, string>()
    const dupes: string[] = []
    for (const insect of INSECTS) {
      const fp = fingerprint(insectBody(insect.id))
      const first = seen.get(fp)
      if (first) dupes.push(`${first} 与 ${insect.name} 的剪影完全一样`)
      else seen.set(fp, insect.name)
    }
    expect(dupes, dupes.join('\n')).toEqual([])
  })
})

describe('展示文案里没有混进异文字', () => {
  /**
   * 大批量生成中文文案时，偶尔会漏进一两个西里尔字母或别的外文字符 ——
   * 「е」和「e」、「а」和「a」在页面上几乎看不出差别，靠肉眼校对指望不上，
   * 但它们会让搜索匹配不到、字体回退成另一套字形。曾在一条栖境描述里
   * 抓到过一小段西里尔文，所以这里把允许出现的字符范围固定下来。
   */
  const ALLOWED = /[一-鿿㐀-䶿　-〿＀-￯ -~–—°]/

  const texts: { where: string; text: string }[] = []
  const collect = (where: string, value: unknown): void => {
    if (typeof value === 'string') texts.push({ where, text: value })
    else if (Array.isArray(value)) value.forEach((v, i) => collect(`${where}[${i}]`, v))
    else if (value && typeof value === 'object')
      for (const [k, v] of Object.entries(value)) collect(`${where}.${k}`, v)
  }
  collect('INSECTS', INSECTS)
  collect('GUIDES', GUIDES)

  it('全部展示文案只由中文、常用标点与半角字符组成', () => {
    const bad: string[] = []
    for (const { where, text } of texts) {
      for (const ch of text) {
        if (ALLOWED.test(ch)) continue
        const code = `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`
        bad.push(`${where} 里的「${ch}」（${code}）：${text}`)
      }
    }
    expect(bad, `混进了不该出现的字符：\n${bad.join('\n')}`).toEqual([])
  })

  it('确实扫到了东西 —— 免得断言因为收集不到文案而空过', () => {
    expect(texts.length).toBeGreaterThan(2000)
  })
})

describe('建模层不该有孤儿', () => {
  /**
   * 非物种的工具模块名单 —— **直接用 registry 的那一份，不再抄**。
   *
   * 原先这里抄了一份平行名单，结果守卫被自己挡住了：变异测试把
   * registry 的 UTILITY_MODULES 里的 'venation' 删掉（模拟「新增工具文件
   * 忘了登记」），venation.ts 于是被当成物种注册，而本测试因为自己那份
   * 名单里还留着 'venation'，照样全绿。抄名单等于把要检查的东西
   * 复制一份来当答案。
   */
  const TOOLBOX_MODULES = UTILITY_MODULES

  /**
   * 反方向：模型做好了，图鉴数据却没跟上。线上不会出错（界面按数据渲染），
   * 但那个模型谁也看不到，等于白做 —— 一轮里同时加十种时最容易漏掉一条。
   */
  it('没有有模型却没有图鉴数据的物种', () => {
    const dataIds = new Set(INSECTS.map((i) => i.id))
    const orphans = knownSpecies().filter((id) => !dataIds.has(id) && !TOOLBOX_MODULES.has(id))
    expect(
      orphans,
      `这些建模文件没有对应的图鉴数据，做了也没人看得到：${orphans.join('、')}`,
    ).toEqual([])
  })
})
