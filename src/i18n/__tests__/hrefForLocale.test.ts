import { describe, expect, it } from 'vitest'
import { hrefForLocale, speciesFromSearch } from '../hrefForLocale'

describe('语言切换的目标地址', () => {
  it('切到英文时带上当前物种', () => {
    expect(hrefForLocale('en', 'rhinoceros-beetle')).toBe('/en/?s=rhinoceros-beetle')
  })

  it('切回中文时带上当前物种', () => {
    expect(hrefForLocale('zh', 'monarch-butterfly')).toBe('/?s=monarch-butterfly')
  })

  it('物种 id 里的特殊字符要转义', () => {
    expect(hrefForLocale('en', 'a b&c')).toBe('/en/?s=a%20b%26c')
  })
})

describe('从地址里读初始物种', () => {
  const known = ['rhinoceros-beetle', 'caddisfly']

  it('命中已知物种就用它', () => {
    expect(speciesFromSearch('?s=caddisfly', known)).toBe('caddisfly')
  })

  it('没有 s 参数返回 null', () => {
    expect(speciesFromSearch('', known)).toBeNull()
  })

  /** 陌生 id 不报错也不清空，静默回落 —— 别人转发的旧链接不该把页面搞坏 */
  it('未知物种返回 null 而不是抛错', () => {
    expect(speciesFromSearch('?s=nonexistent', known)).toBeNull()
  })

  it('转义过的 id 能正确解回来', () => {
    expect(speciesFromSearch('?s=rhinoceros%2Dbeetle', known)).toBe('rhinoceros-beetle')
  })
})
