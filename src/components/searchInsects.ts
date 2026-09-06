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
 * 单个物种对某个查询词的命中级别；没命中返回 null。
 *
 * `q` 必须是**已经 trim + toLowerCase 过**的查询词 —— 大小写归一化放在调用方
 * 做一次，这里每个物种都做一遍纯属浪费（63 次 × 每个按键）。
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
  if (insect.latin.toLowerCase().includes(q)) return 'meta'
  if (orderLabel.toLowerCase().includes(q)) return 'meta'
  if (insect.epithet.toLowerCase().includes(q)) return 'meta'
  if (
    q.length >= TEXT_TIER_MIN_LEN &&
    (insect.summary.toLowerCase().includes(q) || insect.trivia.toLowerCase().includes(q))
  ) {
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
