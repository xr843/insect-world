/**
 * 俗名词表 —— 人嘴里的叫法 → 图鉴里的正式名。
 *
 * ## 为什么需要它
 *
 * 2026-08-26 读埋点：**292 次站内搜索里 147 次零结果（50.3%）**。把搜索逻辑
 * 离线复现、拿常见叫法跑一遍，发现失败的多数并不是「图鉴里没有」，而是
 * **「图鉴里的名字不是人叫的那个」**：
 *
 * | 人搜的 | 图鉴里叫 | 原来的结果 |
 * | --- | --- | --- |
 * | 独角仙 | 双叉犀金龟 | 0 条 |
 * | 苍蝇 | 家蝇 | 0 条 |
 * | 知了 | 黑蚱蝉 | 0 条 |
 * | 屎壳郎 | 神农洁蜣螂 | 0 条 |
 * | 蚱蜢 | 东亚飞蝗 | 0 条 |
 * | 黄蜂 / 马蜂 | 金环胡蜂 | 0 条 |
 *
 * 正式名是图鉴该有的样子，不改；缺的是一层从俗名到它的索引。
 *
 * ## 收录标准
 *
 * 只收**确有其用、且指向明确**的叫法。三类不收：
 *
 * 1. **会指错的**。「大黄蜂」民间指胡蜂，不能挂到熊蜂上；「金花虫」指叶甲，
 *    不能挂到花金龟上。宁可少收一条，也不能把人送到另一只虫跟前 ——
 *    这与 `external.ts` 里「链粗不链错」是同一条规矩。
 * 2. **只在一地说的**。方言词收得越多，越像在替某一个省的人写图鉴。
 * 3. **正式名已经包含的**。「天牛」在「星天牛」里，不必再列一遍 ——
 *    列了不会错，但这张表是给**搜不到的**词准备的，不是名字的复读机。
 *
 * 幼虫的俗名收（知了猴、石蚕、爬沙虫）：搜的人想找的就是这只虫，
 * 只是他认识的是它小时候。
 *
 * ## 与 pinyin.ts 的关系
 *
 * 同一类东西：**给搜索用的、按 locale 分的索引层**，都不进 `Insect` 类型
 * （那份数据要中英逐字段对齐，见 parity.test.ts；而俗名两种语言各有各的，
 * 强行对齐只会逼出一批硬凑的译名）。
 */
import type { Locale } from '../i18n/types'

/**
 * 中文俗名。逐条都是「人会打进搜索框、而正式名里没有」的词。
 * 行尾注释只写**为什么这条容易搞错**，显而易见的不写。
 */
const ZH: Record<string, readonly string[]> = {
  'rhinoceros-beetle': ['独角仙', '兜虫'],
  'monarch-butterfly': ['君主斑蝶', '黑脉金斑蝶', '大桦斑蝶', '蝴蝶'],
  'dragonfly': ['蜻蜓'], // 正式名「碧伟蜓」只有「蜓」字
  'mantis': ['螳螂', '刀螂'], // 「中华大刀螳」缺「螂」字，搜螳螂反而先撞上兰花螳螂
  'ladybird': ['花大姐'],
  'ant': ['蚂蚁', '大黑蚁'],
  'cicada': ['知了', '知了猴', '金蝉'], // 后两个是若虫的叫法，找的仍是这只虫
  'locust': ['蝗虫', '蚱蜢', '蚂蚱'],
  'firefly': ['萤火虫', '流萤'], // 正式名「山窗萤」
  'longhorn-beetle': ['锯树郎'],
  'stick-insect': ['竹节虫'], // 正式名「棒䗛」，「䗛」字多数人打不出来
  'swallowtail': ['燕尾蝶', '蝴蝶'],
  'silk-moth': ['天蚕', '飞蛾', '蛾子'],
  'hornet': ['黄蜂', '马蜂', '大黄蜂', '虎头蜂'], // 民间的「大黄蜂」指的是胡蜂，不是熊蜂
  'tiger-beetle': ['拦路虎', '引路虫'],
  'stag-beetle': ['锹形虫', '鹿角虫'],
  'jewel-beetle': ['吉丁虫', '爆皮虫'],
  'katydid': ['蝈蝈', '螽斯'],
  'mole-cricket': ['拉拉蛄', '土狗'],
  'water-strider': ['水蜘蛛', '卖油郎', '水马'], // 水黾不是蜘蛛，但民间就这么叫
  'hoverfly': ['花虻'],
  'lacewing': ['蚜狮'], // 幼虫的叫法
  'earwig': ['剪刀虫', '夹板虫'],
  'dung-beetle': ['屎壳郎', '粪金龟'],
  'weevil': ['象鼻虫', '象甲'],
  'click-beetle': ['磕头虫'],
  'rove-beetle': ['青腰虫'],
  'flower-chafer': ['金龟子', '白星金龟'],
  'burying-beetle': ['葬甲', '覆葬甲'],
  'tortoise-beetle': ['龟甲虫'],
  'hercules-beetle': ['赫拉克勒斯大兜'],
  'whirligig-beetle': ['豉虫'],
  'ground-beetle': ['步行虫'],
  'blister-beetle': ['斑蝥'], // 民间对芫菁科的通称，指向同一类虫
  'hister-beetle': ['阎魔虫'],
  'treehopper': ['刺虫'],
  'ichneumon-wasp': ['寄生蜂'],
  'dobsonfly': ['爬沙虫', '水蜈蚣'], // 都是幼虫的叫法；它不是蜈蚣
  'goliath-beetle': ['歌利亚大花金龟'],
  'bombardier-beetle': ['放屁虫', '炮甲', '气步甲'],
  'darkling-beetle': ['拟步甲', '沙漠甲虫'],
  'net-winged-beetle': ['网翅甲'],
  'leaf-beetle': ['金花虫'], // 指叶甲科；别挂到花金龟上去
  'damselfly': ['蟌'],
  'dead-leaf-butterfly': ['枯叶蝶', '蝴蝶'],
  'hawk-moth': ['蜂鸟蛾', '蜂鸟鹰蛾', '飞蛾', '蛾子'],
  'water-scavenger': ['牙甲'],
  'checkered-beetle': ['郭公甲'],
  'shining-chafer': ['金龟子', '铜绿金龟'],
  'assassin-bug': ['刺蝽'],
  'cricket': ['蟋蟀', '蛐蛐', '促织'], // 正式名「迷卡斗蟋」
  'robber-fly': ['盗虻'],
  'crane-fly': ['长脚蚊'],
  'caddisfly': ['石蚕'], // 幼虫的叫法（拿沙粒盖房子的那个）
  'house-fly': ['苍蝇'],
  'mosquito': ['蚊子', '家蚊'],
  'cockroach': ['蟑螂', '小强', '蜚蠊'],
}

/**
 * 英文俗名。重点是三类：
 * 1. **美式与英式叫法不同** —— ladybird / ladybug、firefly / lightning bug。
 *    实测美国来的访问有 830 次，是第二大来源，而图鉴用的是英式名。
 * 2. **正式名压根不含那个词** —— 玉带凤蝶的英文名是 Common Mormon，
 *    既没有 swallowtail 也没有 butterfly，搜 swallowtail 一条都出不来。
 * 3. **连写与分写** —— 名字里是 Honey Bee，而人打的是 honeybee。
 */
const EN: Record<string, readonly string[]> = {
  'rhinoceros-beetle': ['rhino beetle', 'kabutomushi'],
  'monarch-butterfly': ['milkweed butterfly'],
  'honeybee': ['honeybee'], // 名字里是分写的 Honey Bee
  'mantis': ['praying mantis'],
  'ladybird': ['ladybug', 'lady beetle'], // ladybug 是美式叫法
  'locust': ['grasshopper'],
  'firefly': ['lightning bug', 'glowworm'], // lightning bug 是美式叫法
  'longhorn-beetle': ['starry sky beetle'],
  'stick-insect': ['walking stick', 'stick bug'],
  'swallowtail': ['swallowtail', 'swallowtail butterfly'], // 正式名 Common Mormon 里一个字都没有
  'silk-moth': ['silkworm moth', 'tussah moth'],
  'hornet': ['murder hornet'], // 2020 年之后的通行叫法
  'stag-beetle': ['pinching bug'],
  'jewel-beetle': ['buprestid', 'metallic wood-boring beetle'],
  'katydid': ['bush cricket'],
  'water-strider': ['pond skater', 'water skater', 'jesus bug'],
  'hoverfly': ['flower fly', 'syrphid'],
  'lacewing': ['aphid lion'], // 幼虫的叫法
  'earwig': ['pincher bug'],
  'dung-beetle': ['scarab', 'tumblebug'],
  'weevil': ['snout beetle'],
  'click-beetle': ['elater', 'skipjack'],
  'diving-beetle': ['predaceous diving beetle'],
  'burying-beetle': ['sexton beetle', 'carrion beetle'],
  'ground-beetle': ['carabid'],
  'blister-beetle': ['oil beetle'],
  'hister-beetle': ['clown beetle'],
  'treehopper': ['thorn bug'],
  'ichneumon-wasp': ['parasitic wasp'],
  'dobsonfly': ['hellgrammite'], // 幼虫的叫法
  'dead-leaf-butterfly': ['oakleaf butterfly', 'orange oakleaf'],
  'hawk-moth': ['hummingbird moth', 'sphinx moth'],
  'termite-soldier': ['white ant'],
  'bumblebee': ['bumble bee'],
  'cricket': ['field cricket'],
  'robber-fly': ['assassin fly'],
  'crane-fly': ['daddy longlegs', 'mosquito hawk'], // daddy longlegs 也被用来指盲蛛，但英美口语里大蚊就是这个叫法
  'mantidfly': ['mantisfly', 'mantis fly'],
  'caddisfly': ['caddis fly', 'sedge fly'],
  'house-fly': ['housefly'],
  'mosquito': ['culex', 'common house mosquito'],
}

const BY_LOCALE: Record<Locale, Record<string, readonly string[]>> = { zh: ZH, en: EN }

const NONE: readonly string[] = []

/** 某个物种在某种语言下的全部俗名；没有就是空数组 */
export function aliasesOf(locale: Locale, id: string): readonly string[] {
  return BY_LOCALE[locale][id] ?? NONE
}

/**
 * 查询词是否命中某个物种的俗名。
 *
 * 双向包含：打「独角仙」要命中，打「独角」也要命中（前缀）；反过来
 * 打「德国小蠊蟑螂」这种粘一起的不管 —— 那不是人会打的东西。
 */
export function matchesAlias(locale: Locale, id: string, q: string): boolean {
  if (!q) return false
  return aliasesOf(locale, id).some((a) => a.toLowerCase().includes(q))
}

/** 全部俗名条目，供测试做全表体检（比如查有没有一个词挂到了两只互斥的虫上） */
export function allAliasEntries(locale: Locale): [string, readonly string[]][] {
  return Object.entries(BY_LOCALE[locale])
}
