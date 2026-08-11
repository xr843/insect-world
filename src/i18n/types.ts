/** 站点支持的语言。新增语言时这里加一个，字典与数据文件跟着加。 */
export type Locale = 'zh' | 'en'

/**
 * 分类目的中立键（拉丁目名小写）。
 *
 * 原先这里是中文字面量联合（'鞘翅目' | …），同时充当 Map 键、筛选值和
 * 显示文本 —— 三重身份混在一起，英文界面一来筛选就会崩。键与显示名
 * 从此分开：键进数据，显示名进 orders.ts 按语言查表。
 */
export type OrderKey =
  | 'coleoptera'
  | 'lepidoptera'
  | 'hymenoptera'
  | 'odonata'
  | 'mantodea'
  | 'orthoptera'
  | 'hemiptera'
  | 'diptera'
  | 'neuroptera'
  | 'dermaptera'
  | 'megaloptera'
  | 'blattodea'
  | 'trichoptera'
  | 'phasmatodea'

/** 变态类型。同样是原先的中文字面量当枚举值，一并中立化。 */
export type Metamorphosis = 'complete' | 'incomplete'
