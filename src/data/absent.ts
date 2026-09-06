/**
 * 「图鉴里确实没有」的词表 —— 用来给零结果一个说法，也用来让零结果可被统计。
 *
 * ## 为什么需要它
 *
 * 2026-09-06 读埋点：**129 次搜索里 82 次零结果（63.6%）**。而俗名层
 * （[[aliases]]）刚上线那三天零结果只有 28.3% —— 也就是说现在这批未命中
 * **不是俗名缺失**，是别的东西。别的什么？看不出来，因为搜索埋点故意不报
 * 查询词（自由文本，隐私上不能报，见 TopBar 里那段注释）。
 *
 * 于是就卡住了：**知道有一大批人搜不到，但不知道他们在搜什么。**
 *
 * 这张表是那个死结的解法：预先列出「人会打、而图鉴确实没有」的词，
 * 零结果时只上报**命中了这张封闭词表里的哪一个 token**（或者 `unknown`）。
 * 上报的值全部来自本文件，一个字符的用户输入都不出去。`unknown` 的占比
 * 反过来告诉我们这张表覆盖得够不够。
 *
 * ## 词表怎么来的
 *
 * 不是拍脑袋列的：把真实搜索逻辑离线跑 140 个常见叫法，取其中零结果的那批，
 * 再逐个判断「这是图鉴该有而漏了的（→ 补进 aliases.ts）」还是「图鉴本来就没有
 * （→ 收进这里）」。补别名那一半已经补掉了（英文 id 索引 + 跨语言俗名 +
 * 蛆/孑孓/瓢甲/蝉蜕），剩下的才进这张表。
 *
 * ## 两类，因为要说的话不一样
 *
 * - `not-insect`：**根本不是昆虫**。鼠妇、马陆、蚯蚓、蝎子 —— 这是本站最常
 *   被误当成昆虫的一类，说清楚「昆虫是六足三段体」本身就是科普，比一句
 *   「没找到」有用得多。
 * - `absent-insect`：**是昆虫，但图鉴没收**。跳蚤、虱子、椿象 —— 这类是
 *   真正的选题线索：哪个 token 被搜得多，哪个就该排进下一轮建模。
 */
import type { Locale } from '../i18n/types'

export type MissKind = 'not-insect' | 'absent-insect'

/** 零结果时上报的兜底值：这次未命中没落进词表 */
export const MISS_UNKNOWN = 'unknown'

interface Entry {
  /** 上报用的稳定标识。**只有它会离开浏览器**，所以必须是这里写死的字符串 */
  token: string
  kind: MissKind
  zh: readonly string[]
  en: readonly string[]
}

/**
 * 收录标准与 `aliases.ts` 反过来：那张表收「图鉴有、但名字对不上」的词，
 * 这张表收「图鉴真没有」的词。
 *
 * ⚠️ **有几个「明明该在」的词故意不在表里**：蜘蛛、蜈蚣、蜗牛、蛞蝓、蜉蝣、
 * 石蝇、spider、mite、tick、worm…… 它们**搜得到** —— 不是有对应物种，而是
 * 命中了某只虫正文里提到它们的那一句（text 是最低一级）。既然有结果，
 * 就走不到零结果这条路上；收进来只会让界面说假话、让统计报错数。
 *
 * absent.test.ts 拿**真实搜索逻辑**把每个词逐条跑一遍，就是为这个：靠肉眼
 * 对着 63 个物种的正文判断哪个词搜得到，不可能可靠 —— 第一版我凭印象写，
 * 那条闸门当场抓出 13 个。
 */
const VOCAB: readonly Entry[] = [
  // ---- 不是昆虫（蛛形纲 / 多足亚门 / 甲壳亚门 / 环节动物 / 软体动物 / 爬行纲）
  { token: 'centipede', kind: 'not-insect', zh: ['百足虫'], en: ['centipede'] },
  { token: 'millipede', kind: 'not-insect', zh: ['马陆', '千足虫'], en: ['millipede'] },
  { token: 'earthworm', kind: 'not-insect', zh: ['蚯蚓', '曲蟮'], en: ['earthworm'] },
  { token: 'woodlouse', kind: 'not-insect', zh: ['鼠妇', '潮虫', '西瓜虫', '团子虫'], en: ['woodlouse', 'pill bug', 'roly poly'] },
  { token: 'scorpion', kind: 'not-insect', zh: ['蝎子', '全蝎'], en: ['scorpion'] },
  { token: 'leech', kind: 'not-insect', zh: ['水蛭', '蚂蟥'], en: ['leech'] },
  { token: 'mite', kind: 'not-insect', zh: ['螨虫', '尘螨', '蜱虫', '壁虱'], en: [] },
  { token: 'snail', kind: 'not-insect', zh: ['鼻涕虫'], en: [] },
  { token: 'gecko', kind: 'not-insect', zh: ['壁虎', '蜥蜴'], en: ['gecko', 'lizard'] },
  { token: 'arthropod', kind: 'not-insect', zh: ['节肢动物', '甲壳类'], en: ['arthropod', 'crustacean'] },

  // ---- 是昆虫，但图鉴没收。搜得多的就是下一轮建模的选题线索。
  { token: 'flea', kind: 'absent-insect', zh: ['跳蚤'], en: ['flea'] },
  { token: 'louse', kind: 'absent-insect', zh: ['虱子', '头虱'], en: ['louse', 'lice'] },
  { token: 'bedbug', kind: 'absent-insect', zh: ['臭虫', '床虱'], en: ['bed bug', 'bedbug'] },
  { token: 'stinkbug', kind: 'absent-insect', zh: ['椿象', '臭大姐', '臭屁虫'], en: ['stink bug', 'shield bug'] },
  { token: 'thrips', kind: 'absent-insect', zh: ['蓟马'], en: ['thrips'] },
  { token: 'sandfly', kind: 'absent-insect', zh: ['白蛉'], en: ['sand fly', 'sandfly'] },
  { token: 'horsefly', kind: 'absent-insect', zh: ['牛虻', '瞎虻'], en: ['horse fly', 'horsefly', 'gadfly'] },
  { token: 'stonefly', kind: 'absent-insect', zh: ['襀翅目'], en: [] },
  { token: 'cutworm', kind: 'absent-insect', zh: ['地老虎', '菜青虫'], en: ['cutworm', 'cabbage worm'] },
  { token: 'alderfly', kind: 'absent-insect', zh: ['泥蛉'], en: ['alderfly'] },
  { token: 'other-cricket', kind: 'absent-insect', zh: ['纺织娘', '油葫芦', '蟪蛄'], en: [] },
]

/**
 * 这次零结果落进词表的哪一条；没落进就返回 null（调用方上报 `unknown`）。
 *
 * 两种语言的词一起查，不按当前 locale 分：中文页上打 `spider` 的人和英文页上
 * 打「蜘蛛」的人要的是同一句解释。
 */
export function classifyMiss(query: string): Entry | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  for (const e of VOCAB) {
    for (const w of [...e.zh, ...e.en]) {
      // 双向包含：打「鼠妇」要中，打「潮虫是什么」这种带尾巴的也要中
      const lw = w.toLowerCase()
      if (lw.includes(q) || q.includes(lw)) return e
    }
  }
  return null
}

/** 这条词表里这个 token 在当前语言下的显示名，用于给用户的那句解释 */
export function missLabel(entry: Entry, locale: Locale): string {
  const list = locale === 'zh' ? entry.zh : entry.en
  return list[0] ?? entry.zh[0] ?? entry.token
}

/** 全表，供测试逐条体检（每个词都必须真的搜不到，否则它属于 aliases.ts） */
export function allAbsentEntries(): readonly Entry[] {
  return VOCAB
}
