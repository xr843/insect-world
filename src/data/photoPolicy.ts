/**
 * 实拍照片的许可证策略 —— 纯函数，不碰网络、不碰文件。
 *
 * 单独成文件的理由跟 `src/i18n/edgeLocale.ts` 一样：抓取脚本要真连 iNaturalist
 * 才跑得起来，判定抽出来就能被 `npm test` 直接覆盖。`scripts/fetch-photos.mjs`
 * 与测试引的是同一份，不会各写一套然后慢慢漂。
 *
 * ── 为什么许可证判定要有测试 ─────────────────────────────────────────
 * 挑错一张图不会报错、不会崩、页面照常好看 —— 直到有人来发律师函。
 * 这是典型的「静默错误」，只能靠测试钉死。
 */

/**
 * 允许使用的许可证。
 *
 * 排除两类：
 *
 * - **保留所有权利（license_code 为 null）** —— 不言自明。
 * - **任何带 `nd`（NoDerivatives，禁演绎）的** —— 我们要按版面缩放、裁切成
 *   统一比例，这在 ND 下是灰区。灰区不值得为一张图去踩：iNat 上同一个物种
 *   通常有十来张，换一张就是了。
 *
 * `sa`（ShareAlike）留着：把别人的图**并排放在**自己的内容旁边属于「汇编」
 * 不是「演绎」，SA 不会传染到本站代码 —— 这是 Wikipedia 一直在用的做法。
 */
export const ALLOWED_LICENSES = ['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa'] as const

/**
 * 其中允许**商用**的几种。
 *
 * 这个区分不是学究气，是给这个项目留后路：本仓库是 MIT，任何人都能拿去
 * 商用，而 `-nc` 的图跟这条许可是冲突的。所以挑图时优先挑商用可用的，
 * 实在没有才退到 NC —— 退到 NC 的那些物种会被脚本单独列出来，
 * 是一份「这个站一旦商用就要先换掉的图」的清单，而不是一笔糊涂账。
 */
export const COMMERCIAL_OK_LICENSES = ['cc0', 'cc-by', 'cc-by-sa'] as const

export type AllowedLicense = (typeof ALLOWED_LICENSES)[number]

/** iNaturalist `taxon_photos[].photo` 里我们用得上的那几个字段。 */
export interface RawPhoto {
  id?: number
  license_code?: string | null
  medium_url?: string | null
  attribution?: string | null
  original_dimensions?: { width?: number; height?: number } | null
}

/** 归一化：iNat 偶尔返回大写或带空格的 license_code。 */
function normalize(license: string | null | undefined): string {
  return (license ?? '').trim().toLowerCase()
}

export function isAllowed(license: string | null | undefined): boolean {
  return (ALLOWED_LICENSES as readonly string[]).includes(normalize(license))
}

export function isCommercialOk(license: string | null | undefined): boolean {
  return (COMMERCIAL_OK_LICENSES as readonly string[]).includes(normalize(license))
}

/**
 * 从一个物种的照片列表里挑一张。
 *
 * 排序有两级，顺序是想清楚的：
 *
 * 1. **先挑商用可用的**（理由见 COMMERCIAL_OK_LICENSES）。
 * 2. **同级之内按 iNat 自己的顺序** —— 那个顺序是有人工策展的质量代理，
 *    第一张通常就是最能看清这只虫的那张。图鉴里一张糊的、只拍到半个身子的
 *    照片，比没有照片更糟。
 *
 * 没有可用的就返回 null，调用方据此**整块不显示** —— 绝不退而求其次去用
 * 保留所有权利的图。
 */
export function pickPhoto(photos: readonly RawPhoto[]): RawPhoto | null {
  const usable = photos.filter((p) => isAllowed(p.license_code) && !!p.medium_url)
  if (usable.length === 0) return null
  const commercial = usable.filter((p) => isCommercialOk(p.license_code))
  return (commercial.length > 0 ? commercial : usable)[0]
}

/**
 * 从 iNat 的 attribution 串里取出摄影者姓名。
 *
 * 原串长这样：
 *   `(c) Alejandro Lopez, some rights reserved (CC BY-NC-SA), uploaded by Alejandro Lopez`
 *
 * 整串照抄到界面上又长又重复（名字出现两次），但**不能不署名** —— CC 的
 * BY 就是署名要求，漏了等于违约。所以取出姓名单独显示，许可证另起一格。
 * 取不出来时原样返回整串：宁可难看，不可无署名。
 */
export function photographerOf(attribution: string | null | undefined): string {
  const raw = (attribution ?? '').trim()
  if (!raw) return ''
  const m = /^\(c\)\s*(.+?),\s*(?:some|all)\s+rights\s+reserved/i.exec(raw)
  return m ? m[1].trim() : raw
}

/** `cc-by-nc-sa` → `CC BY-NC-SA`，界面上按 Creative Commons 的写法显示。 */
export function licenseLabel(license: string): string {
  const n = normalize(license)
  return n === 'cc0' ? 'CC0' : n.toUpperCase().replace(/^CC-/, 'CC ')
}
