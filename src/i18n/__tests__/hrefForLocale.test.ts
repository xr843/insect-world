import { describe, expect, it } from 'vitest'
import { canonicalPath, hrefForLocale, isLegacySpeciesUrl, speciesFromUrl } from '../hrefForLocale'

describe('物种深链的规范路径', () => {
  it('中文是 /s/<id>/', () => {
    expect(canonicalPath('zh', 'ladybird')).toBe('/s/ladybird/')
  })

  it('英文带 /en 前缀', () => {
    expect(canonicalPath('en', 'ladybird')).toBe('/en/s/ladybird/')
  })

  it('物种 id 里的特殊字符要转义', () => {
    expect(canonicalPath('en', 'a b&c')).toBe('/en/s/a%20b%26c/')
  })
})

describe('语言切换的目标地址', () => {
  it('切到英文时带上当前物种（路径形式，落在静态壳页上）', () => {
    expect(hrefForLocale('en', 'rhinoceros-beetle')).toBe('/en/s/rhinoceros-beetle/')
  })

  it('切回中文时带上当前物种', () => {
    expect(hrefForLocale('zh', 'monarch-butterfly')).toBe('/s/monarch-butterfly/')
  })
})

describe('从地址里读初始物种', () => {
  const known = ['rhinoceros-beetle', 'caddisfly']

  it('规范路径命中已知物种就用它', () => {
    expect(speciesFromUrl('/s/caddisfly/', '', known)).toBe('caddisfly')
  })

  it('英文路径同样认得', () => {
    expect(speciesFromUrl('/en/s/caddisfly/', '', known)).toBe('caddisfly')
  })

  /** 手敲地址常掉结尾斜杠，不该因此丢上下文 */
  it('没有结尾斜杠也认', () => {
    expect(speciesFromUrl('/s/caddisfly', '', known)).toBe('caddisfly')
  })

  it('路径里转义过的 id 能正确解回来', () => {
    expect(speciesFromUrl('/s/rhinoceros%2Dbeetle/', '', known)).toBe('rhinoceros-beetle')
  })

  /** 改成路径形式之前转发出去的 ?s= 旧链接必须继续可用 */
  it('旧格式 ?s= 继续兼容', () => {
    expect(speciesFromUrl('/', '?s=caddisfly', known)).toBe('caddisfly')
    expect(speciesFromUrl('/en/', '?s=rhinoceros%2Dbeetle', known)).toBe('rhinoceros-beetle')
  })

  it('路径优先于 ?s=（两者都在时听路径的）', () => {
    expect(speciesFromUrl('/s/caddisfly/', '?s=rhinoceros-beetle', known)).toBe('caddisfly')
  })

  it('首页没有物种信息返回 null', () => {
    expect(speciesFromUrl('/', '', known)).toBeNull()
    expect(speciesFromUrl('/en/', '', known)).toBeNull()
  })

  /** 陌生 id 不报错也不清空，静默回落 —— 别人转发的旧链接不该把页面搞坏 */
  it('未知物种返回 null 而不是抛错', () => {
    expect(speciesFromUrl('/s/nonexistent/', '', known)).toBeNull()
    expect(speciesFromUrl('/', '?s=nonexistent', known)).toBeNull()
  })

  /** 路径上是烂 id、?s= 上是好 id：路径认不出时还能靠 ?s= 救回来 */
  it('路径认不出时退回 ?s=', () => {
    expect(speciesFromUrl('/s/nonexistent/', '?s=caddisfly', known)).toBe('caddisfly')
  })

  it('畸形转义（裸 %）不抛错', () => {
    expect(speciesFromUrl('/s/%zz/', '', known)).toBeNull()
  })

  it('多余的路径层级不算物种链接（如 /s/x/y/）', () => {
    expect(speciesFromUrl('/s/caddisfly/extra/', '', known)).toBeNull()
  })
})

/**
 * 首帧要不要动地址栏。
 *
 * 这道判断存在的唯一理由是统计口径：首帧把 "/" 改写成 /s/<默认物种>/，
 * 会让统计把入口页记成那只虫（2026-08-15 实测 307 次会话中 205 次如此），
 * 首页的真实落地量就此消失，每次落地还多算一条 pageview。
 * 所以只有旧格式 ?s= 值得在首帧归一，其余一律保持原样。
 */
describe('旧格式识别', () => {
  it('只有带 ?s= 的旧链接才需要首帧归一', () => {
    expect(isLegacySpeciesUrl('?s=firefly')).toBe(true)
    expect(isLegacySpeciesUrl('?pdb=1&s=firefly')).toBe(true)
  })

  it('首页与规范路径都不该在首帧被改写', () => {
    expect(isLegacySpeciesUrl('')).toBe(false)
    expect(isLegacySpeciesUrl('?pdb=1')).toBe(false)
    // 名字里带 s 的别的参数不算数
    expect(isLegacySpeciesUrl('?species=firefly')).toBe(false)
  })
})
