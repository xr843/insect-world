import { describe, expect, it } from 'vitest'
import {
  LOCALE_COOKIE_NAME,
  acceptLanguageExcludesChinese,
  decideLocaleRedirect,
  isChineseTag,
  isKnownBot,
  parseAcceptLanguage,
  readLocaleCookie,
} from '../edgeLocale'

describe('parseAcceptLanguage', () => {
  it('缺头 / 空字符串解析成空数组', () => {
    expect(parseAcceptLanguage(null)).toEqual([])
    expect(parseAcceptLanguage(undefined)).toEqual([])
    expect(parseAcceptLanguage('')).toEqual([])
  })

  it('单个标签没写 q 时默认 1', () => {
    expect(parseAcceptLanguage('en')).toEqual([{ tag: 'en', q: 1 }])
  })

  it('真实浏览器发出的头（Chrome，多标签带 q）', () => {
    expect(parseAcceptLanguage('zh-CN,zh;q=0.9,en;q=0.8')).toEqual([
      { tag: 'zh-CN', q: 1 },
      { tag: 'zh', q: 0.9 },
      { tag: 'en', q: 0.8 },
    ])
  })

  it('容忍标签与 q 值前后的空白', () => {
    expect(parseAcceptLanguage(' en-US ; q=0.9 , fr ')).toEqual([
      { tag: 'en-US', q: 0.9 },
      { tag: 'fr', q: 1 },
    ])
  })

  it('畸形 q（非数字、越界）按缺省 1 处理，不整条丢弃', () => {
    expect(parseAcceptLanguage('en;q=abc')).toEqual([{ tag: 'en', q: 1 }])
    expect(parseAcceptLanguage('en;q=5')).toEqual([{ tag: 'en', q: 1 }])
  })

  it('q=0 原样保留（由调用方决定要不要当作被拒绝）', () => {
    expect(parseAcceptLanguage('en,zh;q=0')).toEqual([
      { tag: 'en', q: 1 },
      { tag: 'zh', q: 0 },
    ])
  })

  it('多余逗号 / 空段不产生垃圾条目', () => {
    expect(parseAcceptLanguage('en,,  ,fr')).toEqual([
      { tag: 'en', q: 1 },
      { tag: 'fr', q: 1 },
    ])
  })
})

describe('isChineseTag', () => {
  it('中文各变体的主子标签都认得', () => {
    expect(isChineseTag('zh')).toBe(true)
    expect(isChineseTag('zh-CN')).toBe(true)
    expect(isChineseTag('zh-TW')).toBe(true)
    expect(isChineseTag('zh-Hans')).toBe(true)
    expect(isChineseTag('zh-Hant-TW')).toBe(true)
    expect(isChineseTag('ZH-cn')).toBe(true) // 大小写不敏感
  })

  it('不是子串匹配 —— azh 这类不该被 zh 误伤', () => {
    expect(isChineseTag('azh')).toBe(false)
  })

  it('非中文标签', () => {
    expect(isChineseTag('en')).toBe(false)
    expect(isChineseTag('en-US')).toBe(false)
    expect(isChineseTag('fr')).toBe(false)
    expect(isChineseTag('ja')).toBe(false)
  })
})

describe('acceptLanguageExcludesChinese —— 是否"确凿地"没有中文偏好', () => {
  it('头缺失或解析不出任何标签：不能断定，返回 false（留在中文版）', () => {
    expect(acceptLanguageExcludesChinese(null)).toBe(false)
    expect(acceptLanguageExcludesChinese(undefined)).toBe(false)
    expect(acceptLanguageExcludesChinese('')).toBe(false)
    expect(acceptLanguageExcludesChinese(',,,')).toBe(false)
  })

  it('纯非中文标签：确凿排除', () => {
    expect(acceptLanguageExcludesChinese('en-US,en;q=0.9')).toBe(true)
    expect(acceptLanguageExcludesChinese('fr-FR,de;q=0.8')).toBe(true)
    expect(acceptLanguageExcludesChinese('ja')).toBe(true)
  })

  it('带中文标签（不论排第几位）：不排除', () => {
    expect(acceptLanguageExcludesChinese('zh-CN,zh;q=0.9,en;q=0.8')).toBe(false)
    expect(acceptLanguageExcludesChinese('en-US,en;q=0.9,zh;q=0.1')).toBe(false)
  })

  it('中文标签被显式 q=0 拒绝时，等同于没有中文偏好', () => {
    expect(acceptLanguageExcludesChinese('en,zh;q=0')).toBe(true)
    expect(acceptLanguageExcludesChinese('zh;q=0,en;q=0.9')).toBe(true)
  })

  it('通配符 * 不算中文标签', () => {
    expect(acceptLanguageExcludesChinese('*')).toBe(true)
  })

  it('azh 这种含 zh 子串但不是中文的标签不会被误判为中文偏好', () => {
    expect(acceptLanguageExcludesChinese('en,azh')).toBe(true)
  })
})

describe('isKnownBot', () => {
  it('主流搜索引擎爬虫', () => {
    expect(isKnownBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
    expect(isKnownBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true)
    expect(isKnownBot('Baiduspider+(+http://www.baidu.com/search/spider.htm)')).toBe(true)
    expect(isKnownBot('Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)')).toBe(true)
  })

  it('不含 bot/spider 字样的链接预览抓取器也认得（具名单）', () => {
    expect(isKnownBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true)
    expect(isKnownBot('WhatsApp/2.23.20.0')).toBe(true)
  })

  it('长尾 SEO / AI 抓取器靠通用正则兜住', () => {
    expect(isKnownBot('SomeRandomCrawler/1.0')).toBe(true)
    expect(isKnownBot('CustomSpiderThing/9.9')).toBe(true)
  })

  it('真实浏览器 UA 不会被误判', () => {
    expect(
      isKnownBot(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      ),
    ).toBe(false)
    expect(
      isKnownBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'),
    ).toBe(false)
  })

  it('缺失 UA 不当作爬虫（没有证据不代表是爬虫）', () => {
    expect(isKnownBot(null)).toBe(false)
    expect(isKnownBot(undefined)).toBe(false)
    expect(isKnownBot('')).toBe(false)
  })
})

describe('readLocaleCookie', () => {
  it('缺失 Cookie 头返回 null', () => {
    expect(readLocaleCookie(null)).toBeNull()
    expect(readLocaleCookie(undefined)).toBeNull()
    expect(readLocaleCookie('')).toBeNull()
  })

  it('读出合法值', () => {
    expect(readLocaleCookie(`${LOCALE_COOKIE_NAME}=en`)).toBe('en')
    expect(readLocaleCookie(`${LOCALE_COOKIE_NAME}=zh`)).toBe('zh')
  })

  it('混在其它 cookie 中间也能找到', () => {
    expect(readLocaleCookie(`foo=bar; ${LOCALE_COOKIE_NAME}=en; other=1`)).toBe('en')
    expect(readLocaleCookie(`  ${LOCALE_COOKIE_NAME}=en ;foo=bar`)).toBe('en')
  })

  it('值不合法（既不是 zh 也不是 en）当作没有', () => {
    expect(readLocaleCookie(`${LOCALE_COOKIE_NAME}=fr`)).toBeNull()
  })

  it('没有这个 cookie 名字返回 null', () => {
    expect(readLocaleCookie('foo=bar; other=1')).toBeNull()
  })
})

describe('decideLocaleRedirect —— 根路径分流的完整判定', () => {
  const UA_CHROME =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
  const UA_GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

  it('无 cookie、非中文 Accept-Language、非爬虫 → 分流', () => {
    expect(
      decideLocaleRedirect({ acceptLanguage: 'en-US,en;q=0.9', userAgent: UA_CHROME, cookie: null }),
    ).toBe('redirect-en')
  })

  it('无 cookie、中文 Accept-Language → 留在中文版', () => {
    expect(
      decideLocaleRedirect({ acceptLanguage: 'zh-CN,zh;q=0.9,en;q=0.8', userAgent: UA_CHROME, cookie: null }),
    ).toBe('stay')
  })

  it('头缺失 / 解析不出 → 安全默认留在中文版', () => {
    expect(decideLocaleRedirect({ acceptLanguage: null, userAgent: UA_CHROME, cookie: null })).toBe('stay')
    expect(decideLocaleRedirect({ acceptLanguage: '', userAgent: UA_CHROME, cookie: null })).toBe('stay')
  })

  it('爬虫永不分流，即使 Accept-Language 是纯英文', () => {
    expect(
      decideLocaleRedirect({ acceptLanguage: 'en-US,en;q=0.9', userAgent: UA_GOOGLEBOT, cookie: null }),
    ).toBe('stay')
  })

  it('爬虫优先于一切，哪怕 cookie 写着 en', () => {
    expect(
      decideLocaleRedirect({
        acceptLanguage: 'en-US,en;q=0.9',
        userAgent: UA_GOOGLEBOT,
        cookie: `${LOCALE_COOKIE_NAME}=en`,
      }),
    ).toBe('stay')
  })

  it('cookie=en 覆盖中文 Accept-Language —— 用户点过"看英文"要认账', () => {
    expect(
      decideLocaleRedirect({
        acceptLanguage: 'zh-CN,zh;q=0.9',
        userAgent: UA_CHROME,
        cookie: `${LOCALE_COOKIE_NAME}=en`,
      }),
    ).toBe('redirect-en')
  })

  it('cookie=zh 覆盖非中文 Accept-Language —— 用户点过"看中文"不能被弹回去', () => {
    expect(
      decideLocaleRedirect({
        acceptLanguage: 'en-US,en;q=0.9',
        userAgent: UA_CHROME,
        cookie: `${LOCALE_COOKIE_NAME}=zh`,
      }),
    ).toBe('stay')
  })

  it('非法 cookie 值退回按 Accept-Language 判定', () => {
    expect(
      decideLocaleRedirect({
        acceptLanguage: 'en-US,en;q=0.9',
        userAgent: UA_CHROME,
        cookie: `${LOCALE_COOKIE_NAME}=fr`,
      }),
    ).toBe('redirect-en')
  })
})
