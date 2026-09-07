import type { Locale } from '../i18n/types'

/**
 * 反馈系统的共享类型 —— 浏览器端（表单、墙）与边缘端（Pages Functions）
 * 都从这里取，两边对同一个 JSON 形状的理解不会各写一份然后慢慢漂移。
 */

/** 一次提交的意图。三者共用同一张表、同一个端点，只有这个字段不同。 */
export type FeedbackKind =
  /** 纠错：指出内容或模型的错处。必带物种，通常还带部位。 */
  | 'correction'
  /** 心愿：候选项里没有的自由填「我也想看…」。 */
  | 'wish'
  /** 随便说一句：既不是纠错也不是点播的话。 */
  | 'note'

/** 候选项的类别 —— 只用来在墙上分组显示，不参与任何逻辑判断。 */
export type WishKind = 'lifecycle' | 'species' | 'feature'

/**
 * 提交的处理状态。
 *
 * `new` 是唯一由机器写入的值；另外两个只能由 `scripts/inbox.mjs` 人工改写 ——
 * 「精选才上墙」这条产品决策在数据层的落点就是它：没有任何代码路径能把一条
 * 提交自动变成 `featured`。
 */
export type MessageStatus = 'new' | 'featured' | 'hidden'

/** 客户端 POST 上来的原始体。全是 unknown —— 网络那头送什么都可能。 */
export interface RawSubmission {
  kind?: unknown
  species?: unknown
  part?: unknown
  body?: unknown
  email?: unknown
  locale?: unknown
  /** 蜜罐字段。真人看不见它，填了的一律是机器人。 */
  website?: unknown
}

/** 校验并归一化之后的提交，可以直接写库。 */
export interface CleanSubmission {
  kind: FeedbackKind
  species: string | null
  part: string | null
  body: string
  email: string | null
  locale: Locale
}

/**
 * 校验结果。
 *
 * `honeypot` 之所以单独成一档而不是并进 `invalid`，是因为调用方对这两者的
 * 反应必须不同：蜜罐命中要**对外报成功**（200 + ok:true）再默默丢弃，
 * 让机器人以为得手了、不去换招；`invalid` 才回 400。
 */
export type ValidationResult =
  | { ok: true; value: CleanSubmission }
  | { ok: false; reason: 'honeypot' }
  | { ok: false; reason: 'invalid'; field: string }

/** `wishes` 表的一行。 */
export interface WishRow {
  id: string
  kind: WishKind
  title_zh: string
  title_en: string
  votes: number
  created_at: number
}

/** 墙上的一个候选项（已按语言挑好标题）。 */
export interface WallWish {
  id: string
  kind: WishKind
  title: string
  votes: number
}

/** 墙上的一条精选留言。故意不带作者、不带邮箱 —— 这两样永不公开。 */
export interface WallMessage {
  body: string
  at: number
}

/** `GET /api/wall` 的响应体。 */
export interface WallData {
  wishes: WallWish[]
  featured: WallMessage[]
}
