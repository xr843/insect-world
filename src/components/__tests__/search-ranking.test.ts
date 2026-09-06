/**
 * 搜索的匹配与排序 —— 直接对着 `searchInsects()`，不经组件。
 *
 * 用真实数据（`data/insects`）而不是造假数据：造的数据只能证明代码按我以为的
 * 方式跑，用真数据才能证明**「搜独角仙真的搜得到双叉犀金龟」**。这一条沿用
 * search.test.tsx 的立场，那边测的是组件行为，这边测的是排序本身。
 *
 * 这批用例的来历：2026-08-26 读埋点，292 次搜索里 147 次零结果（50.3%）。
 * 把搜索逻辑离线复现、拿常见叫法跑一遍，下面「本该搜得到」那一组当时全是 0 条。
 */
import { describe, expect, it } from 'vitest'
import { searchInsects, tierOf, MAX_HITS } from '../searchInsects'
import { INSECTS as ZH } from '../../data/insects.zh'
import { INSECTS as EN } from '../../data/insects.en'
import { ORDER_LABEL } from '../../i18n/orders'

const zhOrder = (i: { order: keyof typeof ORDER_LABEL.zh }) => ORDER_LABEL.zh[i.order]
const enOrder = (i: { order: keyof typeof ORDER_LABEL.en }) => ORDER_LABEL.en[i.order]

/** 中文版搜一次，返回结果的中文名 */
const zh = (q: string) => searchInsects(ZH, q.toLowerCase(), 'zh', zhOrder).map((h) => h.insect.name)
/** 英文版搜一次，返回结果的英文名 */
const en = (q: string) => searchInsects(EN, q.toLowerCase(), 'en', enOrder).map((h) => h.insect.name)

describe('本该搜得到的俗名 —— 这一组改动之前全是 0 条', () => {
  it.each([
    ['独角仙', '双叉犀金龟'],
    ['苍蝇', '家蝇'],
    ['知了', '黑蚱蝉'],
    ['屎壳郎', '神农洁蜣螂'],
    ['蚱蜢', '东亚飞蝗'],
    ['黄蜂', '金环胡蜂'],
    ['马蜂', '金环胡蜂'],
    ['萤火虫', '山窗萤'],
    ['竹节虫', '棒䗛'],
    ['蛐蛐', '迷卡斗蟋'],
    ['剪刀虫', '海滨蠼螋'],
    ['象鼻虫', '竹象'],
    ['放屁虫', '屁步甲'],
    ['花大姐', '七星瓢虫'],
    ['蜂鸟蛾', '小豆长喙天蛾'],
    ['石蚕', '石蛾'],
  ])('搜「%s」第一条就是「%s」', (q, expected) => {
    expect(zh(q)[0]).toBe(expected)
  })
})

describe('排序 —— 「就是这个名字」排在「名字里有这几个字」前面', () => {
  /**
   * 改动之前搜「蟑螂」先列出黑翅土白蚁（正文里提到蟑螂），德国小蠊排在后面 ——
   * 而德国小蠊正是那只蟑螂。
   */
  it('蟑螂 → 德国小蠊，不是白蚁', () => {
    const hits = zh('蟑螂')
    expect(hits[0]).toBe('德国小蠊')
    expect(hits.indexOf('德国小蠊')).toBeLessThan(hits.indexOf('黑翅土白蚁（兵蚁）'))
  })

  /**
   * 「螳螂」是俗名意义上的中华大刀螳；兰花螳螂的**名字**里恰好含这两个字，
   * 但人搜「螳螂」通常不是在找那只兰花螳螂。exact 级压过 name 级正是为此。
   */
  it('螳螂 → 中华大刀螳排在兰花螳螂前面', () => {
    const hits = zh('螳螂')
    expect(hits[0]).toBe('中华大刀螳')
    expect(hits).toContain('兰花螳螂')
  })

  it('蜻蜓 → 碧伟蜓排第一（豆娘、食虫虻都只是正文里提到）', () => {
    expect(zh('蜻蜓')[0]).toBe('碧伟蜓')
  })

  it('通称同时命中同一目的几只：蝴蝶 → 三只蝶都在', () => {
    const hits = zh('蝴蝶')
    for (const n of ['帝王蝶', '玉带凤蝶', '枯叶蛱蝶']) expect(hits).toContain(n)
  })
})

describe('级别 —— 埋点上报的就是它', () => {
  const tier = (q: string, id: string) => {
    const i = ZH.find((x) => x.id === id)!
    return tierOf(i, q.toLowerCase(), 'zh', zhOrder(i))
  }

  it('俗名正中 → exact', () => expect(tier('独角仙', 'rhinoceros-beetle')).toBe('exact'))
  it('正式名正中 → exact', () => expect(tier('七星瓢虫', 'ladybird')).toBe('exact'))
  it('名字里含 → name', () => expect(tier('瓢虫', 'ladybird')).toBe('name'))
  it('俗名的一截 → alias', () => expect(tier('独角', 'rhinoceros-beetle')).toBe('alias'))
  it('拼音 → alias', () => expect(tier('shuimin', 'water-strider')).toBe('alias'))
  it('学名 → meta', () => expect(tier('coccinella', 'ladybird')).toBe('meta'))
  // 「血淋巴」只出现在七星瓢虫的冷知识正文里，名称/学名/目/雅称都没有它
  it('正文 → text', () => expect(tier('血淋巴', 'ladybird')).toBe('text'))
  it('不沾边 → null', () => expect(tier('霸王龙', 'ladybird')).toBeNull())
})

describe('两条不许改掉的老行为', () => {
  /**
   * 「它」在 44 份正文里都有，却不在任何名称/学名/目/雅称里 —— 拿它能干净地
   * 量出正文档的开关。（search.test.tsx 里同一条注释记着：首版挑「的」，
   * 而「的」出现在雅称里，量的其实是另一档。）
   */
  it('单字不启动正文档', () => {
    expect(zh('它')).toHaveLength(0)
    expect(zh('它的').length).toBeGreaterThan(0)
  })

  it('总数截断到 12 条', () => {
    expect(zh('虫').length).toBeLessThanOrEqual(MAX_HITS)
    expect(zh('甲').length).toBeLessThanOrEqual(MAX_HITS)
  })

  it('空查询什么都不返回', () => {
    expect(zh('')).toHaveLength(0)
    expect(zh('   ')).toHaveLength(0)
  })

  it('结果不重复', () => {
    const hits = zh('虫')
    expect(new Set(hits).size).toBe(hits.length)
  })
})

describe('英文版', () => {
  it.each([
    ['ladybug', 'Seven-spot Ladybird'], // 美式叫法，图鉴用的是英式名
    ['lightning bug', 'Mountain Firefly'],
    ['swallowtail', 'Common Mormon'], // 正式名里 swallowtail / butterfly 一个都没有
    ['honeybee', 'Western Honey Bee'], // 名字里是分写的 Honey Bee
    ['praying mantis', 'Chinese Mantis'],
    ['walking stick', 'Asian Stick Insect'],
    ['scarab', 'Dung Beetle'],
    ['grasshopper', 'Migratory Locust'],
    ['hummingbird moth', 'Hummingbird Hawk-moth'],
  ])('搜「%s」第一条就是「%s」', (q, expected) => {
    expect(en(q)[0]).toBe(expected)
  })

  it('英文版不接拼音 —— 英文读者面对的本来就是英文名', () => {
    expect(en('shuimin')).toHaveLength(0)
  })

  it('英文正文与雅称大小写不敏感 —— 地名与专有名词（如 Mexico）在小写查询下也能搜到', () => {
    // Mexico 只出现在 Monarch Butterfly 的 summary 里，名称/学名/目都没有它
    expect(en('mexico')).toContain('Monarch Butterfly')
    expect(en('Mexico')).toContain('Monarch Butterfly')
    // North America 同样在 Monarch Butterfly 的 summary 里
    expect(en('north')).toContain('Monarch Butterfly')
    // nocturnal 在 German Cockroach 的 epithet 里
    expect(en('nocturnal')).toContain('German Cockroach')
  })
})

/**
 * 2026-09-06 那一轮：离线跑 140 个常见叫法，零结果的 47 个里**有 13 个是英文词**
 * （mosquito / bee / butterfly / beetle / roach / dragonfly / cicada …）——
 * 中文页搜英文一律零结果。而这个站的流量大头正是 GitHub / HN / Reddit 来的
 * 英文读者，落地页默认就是中文页。
 *
 * 补法是拿**物种 id 当英文索引**（id 本来就是英文俗名，中文包里已经有它），
 * 外加查一遍另一种语言的俗名表（两张表本来就在同一个模块里）。
 */
describe('中文页搜英文 —— 这一组改动之前全是 0 条', () => {
  it.each([
    ['mosquito', '淡色库蚊'],
    ['dragonfly', '碧伟蜓'],
    ['cicada', '黑蚱蝉'],
    ['cockroach', '德国小蠊'],
    ['ladybug', '七星瓢虫'],
    ['grasshopper', '东亚飞蝗'],
  ])('中文页搜 %s 能搜到 %s', (q, name) => {
    expect(zh(q)).toContain(name)
  })

  it('泛称也接得住：beetle 一次搜出一批甲虫，butterfly 搜出蝶', () => {
    expect(zh('beetle').length).toBeGreaterThan(3)
    expect(zh('butterfly')).toContain('帝王蝶')
  })

  /**
   * 「ant」这三个字母同时藏在 mantis、mantidfly 里。整个 id 就是查询词时算
   * name 一级、只是含有算 meta 一级，蚂蚁才排得到前面 —— 少了这一层分级，
   * 搜 ant 第一条会是螳螂。
   */
  it('整个 id 相等的排在只是含有的前面', () => {
    expect(zh('ant')[0]).toBe('日本弓背蚁')
  })

  it('英文页搜中文俗名同样接得住 —— 两张俗名表本来就在一个模块里', () => {
    expect(en('独角仙')).toContain('Japanese Rhinoceros Beetle')
  })
})

/**
 * 反过来的一条：**图鉴真没有的东西，就该真的搜不到。**
 * 这条不是凑数——「spider 搜不到」正是 data/absent.ts 那套解释文案与未命中
 * 上报能成立的前提。若哪天某个物种的正文里写进了「蜘蛛」，这条会红，
 * 提醒去看 absent.ts 里那条还成不成立。
 */
describe('图鉴没有的就该搜不到', () => {
  it.each(['鼠妇', '跳蚤', '马陆', '蝎子'])('%s 一条都搜不到', (q) => {
    expect(zh(q)).toHaveLength(0)
  })
})
