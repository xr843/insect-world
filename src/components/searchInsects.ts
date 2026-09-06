/**
 * 站内搜索的匹配与排序。
 *
 * ## 为什么要单独抽出来
 *
 * 2026-08-26 读埋点：**292 次搜索里 147 次零结果（50.3%）**。原来的实现是
 * 两档过滤 —— 第一档看名称/学名/目/雅称/拼音，第二档在总述与冷知识全文里找，
 * 两档各自保持数据顺序、拼起来截断到 12 条。它有两个毛病：
 *
 * 1. **搜不到。** 人打的是「独角仙」「苍蝇」「知了」「屎壳郎」「蚱蜢」
 *    「黄蜂」，图鉴里写的是「双叉犀金龟」「家蝇」「黑蚱蝉」「神农洁蜣螂」
 *    「东亚飞蝗」「金环胡蜂」，这些词一条都出不来 —— 虫明明就在图鉴里。
 *    补法是一层俗名索引，见 `data/aliases.ts`。
 * 2. **顺序不对。** 「档」只分了两级，档内一律按数据顺序，于是搜「蟑螂」
 *    先列出黑翅土白蚁（正文里提到蟑螂）、德国小蠊排在它后面 —— 而德国小蠊
 *    正是那只蟑螂。
 *
 * ## 五级
 *
 * | 级 | 命中什么 | 例 |
 * | --- | --- | --- |
 * | `exact` | 正式名或俗名**就是**这个词 | 蟑螂 → 德国小蠊 |
 * | `name` | 正式名里**含**这个词 | 瓢虫 → 七星瓢虫 |
 * | `alias` | 俗名里含这个词；拼音命中 | 独角 → 独角仙；shuimin → 水黾 |
 * | `meta` | 学名 / 目 / 雅称 | Coccinella、蜻蜓目 |
 * | `text` | 总述或冷知识的正文 | 需要两个字才启动 |
 *
 * 级内保持数据顺序（`Array.prototype.sort` 是稳定的）。于是搜「螳螂」
 * 得到的是：中华大刀螳（俗名正是螳螂）→ 兰花螳螂（名字里含螳螂）→ 螳蛉，
 * 而不是反过来。
 *
 * ## 两条不许改掉的老行为
 *
 * - **单字不启动正文档**：「虫」「的」这种字在几十份正文里都有，正文档一开
 *   列表就爆了。老实现用 `q.length >= 2` 卡住，这里照旧。
 * - **总数截断到 12**。
 */
import type { Insect } from '../data/types'
import type { Locale } from '../i18n/types'
import { matchesAlias, aliasesOf } from '../data/aliases'
import { matchesPinyin } from '../data/pinyin'

/** 命中的级别，顺序即优先级 */
export const TIERS = ['exact', 'name', 'alias', 'meta', 'text'] as const
export type MatchTier = (typeof TIERS)[number]

/** 下拉最多列这么多条 */
export const MAX_HITS = 12

/** 正文档的启动门槛：短于这个长度不去正文里找 */
const TEXT_TIER_MIN_LEN = 2

/**
 * 物种自己那几段可搜文本的小写副本，按物种缓存一次。
 *
 * 为什么要缓存：`tierOf` 是**每个物种、每次按键**各跑一遍的（63 次 × 每个按键，
 * 双语数据下是 126 条）。`summary`/`trivia` 是整段正文，在这里现场 `toLowerCase()`
 * 等于每敲一个字就重新拷一遍全站正文 —— 手机上按住退格连删时最明显。
 * 数据是模块级常量、这辈子不会变，小写副本算一次就够。
 */
const lowered = new WeakMap<Insect, { latin: string; epithet: string; summary: string; trivia: string }>()

function lower(insect: Insect) {
  let v = lowered.get(insect)
  if (!v) {
    v = {
      latin: insect.latin.toLowerCase(),
      epithet: insect.epithet.toLowerCase(),
      summary: insect.summary.toLowerCase(),
      trivia: insect.trivia.toLowerCase(),
    }
    lowered.set(insect, v)
  }
  return v
}

/**
 * 单个物种对某个查询词的命中级别；没命中返回 null。
 *
 * `q` 必须是**已经 trim + toLowerCase 过**的查询词 —— 大小写归一化放在调用方
 * 做一次，这里每个物种都做一遍纯属浪费（63 次 × 每个按键）。物种这一侧的文本
 * 同理，走上面的 `lower()` 缓存。
 *
 * ⚠️ 两侧都必须小写。少一侧就是**只有大小写完全撞上才搜得到**：英文版的
 * `Mexico`、`North America` 这类专有名词此前在小写查询下一条都搜不出来（PR #41）。
 */
export function tierOf(
  insect: Insect,
  q: string,
  locale: Locale,
  orderLabel: string,
): MatchTier | null {
  if (!q) return null
  const name = insect.name.toLowerCase()

  if (name === q || aliasesOf(locale, insect.id).some((a) => a.toLowerCase() === q)) return 'exact'
  if (name.includes(q)) return 'name'
  if (matchesAlias(locale, insect.id, q)) return 'alias'
  // 拼音只对中文版开：英文读者面对的本来就是英文名（老实现的判断，照旧）
  if (locale === 'zh' && matchesPinyin(insect.id, q)) return 'alias'
  /**
   * **物种 id 当英文索引用。**
   *
   * 2026-09-06 离线跑 140 个常见词，零结果的 47 个里有 13 个是英文词
   * （mosquito / bee / butterfly / beetle / roach / dragonfly / cicada …）——
   * 中文页搜英文一律零结果。而这个站的流量大头正是 GitHub / HN / Reddit 来的
   * 英文读者，落地页默认是中文页，搜索框里打英文再自然不过。
   *
   * 用 id 而不是另建一张英文名表：id 本来就是英文俗名（`ladybird`、`mosquito`、
   * `stag-beetle`），中文包里**已经有它**，不多占一个字节；另建一张表则要把
   * 218KB 的英文数据拖进中文包，或者手抄一份 63 条的名字副本，然后等着它跟
   * 数据漂移。
   *
   * 连字符换成空格再比，`stag-beetle` 才接得住「stag beetle」这种打法。
   * 整个 id 就是查询词时算 name 一级，只是含有则算 meta —— 否则搜「ant」时
   * 「mantis」「mantidfly」（都含 ant 这三个字母）会排在蚂蚁前面。
   */
  const idWords = insect.id.replace(/-/g, ' ')
  if (idWords === q) return 'name'

  /**
   * 另一种语言的俗名也查一遍（低一级）。两张表本来就在同一个模块里，
   * 白拿的：中文页搜 `ladybug`、`grasshopper` 这类只写在英文表里的叫法，
   * 以及英文页搜「独角仙」，都能接住。
   */
  if (matchesAlias(locale === 'zh' ? 'en' : 'zh', insect.id, q)) return 'meta'

  const text = lower(insect)
  if (text.latin.includes(q)) return 'meta'
  if (idWords.includes(q)) return 'meta'
  if (orderLabel.toLowerCase().includes(q)) return 'meta'
  if (text.epithet.includes(q)) return 'meta'
  if (q.length >= TEXT_TIER_MIN_LEN && (text.summary.includes(q) || text.trivia.includes(q))) {
    return 'text'
  }
  return null
}

export interface SearchHit {
  insect: Insect
  tier: MatchTier
}

/**
 * 按级别排好序的搜索结果，最多 `MAX_HITS` 条。
 *
 * `orderLabelOf` 由调用方给 —— 目名的显示文本住在 i18n 层，数据层不认识它。
 */
export function searchInsects(
  insects: readonly Insect[],
  rawQuery: string,
  locale: Locale,
  orderLabelOf: (insect: Insect) => string,
): SearchHit[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return []

  const hits: SearchHit[] = []
  for (const insect of insects) {
    const tier = tierOf(insect, q, locale, orderLabelOf(insect))
    if (tier) hits.push({ insect, tier })
  }
  // 稳定排序：同级内保持数据顺序（ES2019 起 sort 保证稳定）
  hits.sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
  return hits.slice(0, MAX_HITS)
}
