/**
 * 物种名的拼音注音 —— 给还不认字的小读者用。
 *
 * 起因是 linux.do 上一条反馈：「有拼音的话小孩子就可以自己看了」。同一个帖子里
 * 还有人说要拿给女儿玩，两条独立信号指向同一批用户。
 *
 * **只注物种名，不注正文。** 正文 7.2 万字，多音字自动判读必错——实测「北美洲最
 * 著名的长距离迁飞」里的「长」就被判成了 zhǎng。名字只有 229 字，可以逐条核。
 *
 * 生成用 pypinyin，但**不能直接采信**：60 个里核出 3 个错，且全在多音字上——
 * 长戟(cháng 非 zhǎng)、长喙(cháng)、豉甲(chǐ 非 shì)。三条已人工改正并在下方标注。
 * 以后加物种时同理：可以用工具生成，但必须有人念一遍。
 *
 * 落成静态数据而不是运行时算，一是不给首屏加依赖（本项目以零外部资产为原则），
 * 二是错了能改、能被 review，运行时生成的东西没人看得见。
 */

/** 物种 id → 名称拼音（声调符号形式） */
export const NAME_PINYIN: Record<string, string> = {
  'rhinoceros-beetle': 'shuāng chā xī jīn guī', // 双叉犀金龟
  'monarch-butterfly': 'dì wáng dié', // 帝王蝶
  'honeybee': 'xī fāng mì fēng', // 西方蜜蜂
  'dragonfly': 'bì wěi tíng', // 碧伟蜓
  'mantis': 'zhōng huá dà dāo táng', // 中华大刀螳
  'ladybird': 'qī xīng piáo chóng', // 七星瓢虫
  'ant': 'rì běn gōng bèi yǐ', // 日本弓背蚁
  'cicada': 'hēi zhà chán', // 黑蚱蝉
  'locust': 'dōng yà fēi huáng', // 东亚飞蝗
  'firefly': 'shān chuāng yíng', // 山窗萤
  'longhorn-beetle': 'xīng tiān niú', // 星天牛
  'stick-insect': 'bàng xiū', // 棒䗛
  'swallowtail': 'yù dài fèng dié', // 玉带凤蝶
  'silk-moth': 'zuò cán é', // 柞蚕蛾
  'hornet': 'jīn huán hú fēng', // 金环胡蜂
  'tiger-beetle': 'zhōng huá hǔ jiǎ', // 中华虎甲
  'stag-beetle': 'zhōng huá dà qiāo jiǎ', // 中华大锹甲
  'jewel-beetle': 'rì běn jí dīng', // 日本吉丁
  'katydid': 'yōu yǎ guō zhōng', // 优雅蝈螽
  'mole-cricket': 'dōng fāng lóu gū', // 东方蝼蛄
  'water-strider': 'shuǐ mǐn', // 水黾
  'hoverfly': 'hēi dài shí yá yíng', // 黑带食蚜蝇
  'lacewing': 'zhōng huá cǎo líng', // 中华草蛉
  'earwig': 'hǎi bīn qú sōu', // 海滨蠼螋
  'dung-beetle': 'shén nóng jié qiāng láng', // 神农洁蜣螂
  'weevil': 'zhú xiàng', // 竹象
  'click-beetle': 'gōu kòu tóu chóng', // 沟叩头虫
  'diving-beetle': 'huáng yuán lóng shī', // 黄缘龙虱
  'rove-beetle': 'suō dú yǐn chì chóng', // 梭毒隐翅虫
  'flower-chafer': 'bái xīng huā jīn guī', // 白星花金龟
  'burying-beetle': 'rì běn mái zàng chóng', // 日本埋葬虫
  'tortoise-beetle': 'gān shǔ là guī jiǎ', // 甘薯腊龟甲
  'hercules-beetle': 'cháng jǐ dà dōu chóng', // 人工修正：长戟大兜虫
  'whirligig-beetle': 'chǐ jiǎ', // 人工修正：豉甲
  'ground-beetle': 'zhōng huá jīn xīng bù jiǎ', // 中华金星步甲
  'blister-beetle': 'zhōng huá dòu yán jīng', // 中华豆芫菁
  'hister-beetle': 'yán jiǎ', // 阎甲
  'treehopper': 'jiǎo chán', // 角蝉
  'ichneumon-wasp': 'jī fēng', // 姬蜂
  'dobsonfly': 'zhōng huá chǐ líng', // 中华齿蛉
  'goliath-beetle': 'dà wáng huā jīn guī', // 大王花金龟
  'bombardier-beetle': 'pì bù jiǎ', // 屁步甲
  'darkling-beetle': 'gān sù biē jiǎ', // 甘肃鳖甲
  'net-winged-beetle': 'hóng yíng', // 红萤
  'leaf-beetle': 'yú lán yè jiǎ', // 榆蓝叶甲
  'damselfly': 'dòu niáng', // 豆娘
  'orchid-mantis': 'lán huā táng láng', // 兰花螳螂
  'dead-leaf-butterfly': 'kū yè jiá dié', // 枯叶蛱蝶
  'hawk-moth': 'xiǎo dòu cháng huì tiān é', // 人工修正：小豆长喙天蛾
  'termite-soldier': 'hēi chì tǔ bái yǐ（bīng yǐ）', // 黑翅土白蚁（兵蚁）
  'water-scavenger': 'dà hēi shuǐ guī chóng', // 大黑水龟虫
  'checkered-beetle': 'zhōng huá guō gōng chóng', // 中华郭公虫
  'shining-chafer': 'tóng lǜ lì jīn guī', // 铜绿丽金龟
  'assassin-bug': 'liè chūn', // 猎蝽
  'bumblebee': 'xióng fēng', // 熊蜂
  'cricket': 'mí kǎ dòu xī', // 迷卡斗蟋
  'robber-fly': 'shí chóng méng', // 食虫虻
  'crane-fly': 'dà wén', // 大蚊
  'mantidfly': 'táng líng', // 螳蛉
  'caddisfly': 'shí é', // 石蛾
}

/** 取某个物种名的拼音；没有记录时返回 null */
export function pinyinOf(insectId: string): string | null {
  return NAME_PINYIN[insectId] ?? null
}

// ---------------------------------------------------------------- 拼音搜索

/**
 * 搜索用的归一化键。上面的数据是注音用的（带声调、带空格），
 * 键盘上没人打得出 `shuǐ mǐn` —— 搜索要的是 `shuimin` 和 `sm` 这两种形态。
 */
interface PinyinKeys {
  /** 去声调、去空格的全拼；ü 的两种键盘写法（lu / lv）都收 */
  full: string[]
  /** 每个音节的首字母连写，如 shuāng chā xī jīn guī → scxjg */
  initials: string
}

const keysCache = new Map<string, PinyinKeys | null>()

function keysOf(insectId: string): PinyinKeys | null {
  const hit = keysCache.get(insectId)
  if (hit !== undefined) return hit
  const raw = NAME_PINYIN[insectId]
  let keys: PinyinKeys | null = null
  if (raw) {
    /**
     * NFD 把带调字母拆成基字母 + 组合符号（ǔ → u + U+030C），删掉组合符号区
     * （U+0300–U+036F）就是去声调。ü 一族要在删符号**之前**换成 v：NFD 后它是
     * u + 分音符（U+0308）+ 声调，直接删会塌成 u，而键盘上「绿」通常打 lv ——
     * 先记成 v，再补一份 v→u 的变体，两头都认。
     */
    const flat = raw
      .normalize('NFD')
      .replace(/u\u0308/g, 'v')
      .replace(/[\u0300-\u036f]/g, '')
    // 全角括号是「黑翅土白蚁（兵蚁）」这类备注的一部分，与空格同视为音节分隔
    const syllables = flat.split(/[\s（）()]+/).filter(Boolean)
    const joined = syllables.join('')
    keys = {
      full: joined.includes('v') ? [joined, joined.replace(/v/g, 'u')] : [joined],
      initials: syllables.map((s) => s[0]).join(''),
    }
  }
  keysCache.set(insectId, keys)
  return keys
}

/**
 * 物种名的拼音匹配：全拼与首字母缩写各做一路 contains。
 *
 * 为「棒䗛、水黾、海滨蠼螋」这类多数成年人打不出字的名字而设 ——
 * 打得出拼音就搜得到。query 里的空格与隔音号（shui min / xi'an 风格）
 * 一并去掉再比。
 *
 * 单个字母不启动：几乎每只虫的缩写里都有 s/c/j，一个字母会把列表填满，
 * 而没有人用一个字母表达「我在搜拼音」。
 */
export function matchesPinyin(insectId: string, query: string): boolean {
  const q = query.toLowerCase().replace(/[\s']/g, '')
  if (q.length < 2 || !/^[a-z]+$/.test(q)) return false
  const keys = keysOf(insectId)
  if (!keys) return false
  return keys.full.some((f) => f.includes(q)) || keys.initials.includes(q)
}
