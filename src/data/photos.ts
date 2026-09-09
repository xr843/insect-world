import manifest from './photos.json'

/**
 * 实拍照片清单 —— 由 `scripts/fetch-photos.mjs` 从 iNaturalist 生成。
 *
 * 这里**只有元数据**。图片字节由 `scripts/download-photos.mjs` 在构建期抓进
 * `public/photos/`，从不进 git —— 本仓库是 MIT，而 59 张里有 22 张是禁商用的
 * CC-BY-NC-*，把那些字节提交进来会让仓库的 MIT 声明变成骗人的
 * （理由写在 fetch-photos.mjs 的文件头，那 22 种也在那儿逐一列了名）。
 */

export interface SpeciesPhoto {
  photoId: number
  /** iNat 原始地址。留着是为了能追溯，界面上不用它 —— 见 localPhotoSrc。 */
  url: string
  license: string
  photographer: string
  /** iNat 给的原始署名整串。核对「有没有署对」时靠它，不靠解析后的姓名。 */
  attribution: string
  inatUrl: string
  width: number | null
  height: number | null
  /** 实际格式。png 存成 .jpg 会让 Cloudflare 按扩展名发错 Content-Type。 */
  ext?: string
}

const PHOTOS = manifest as Record<string, SpeciesPhoto>

/**
 * 这只虫有没有实拍照片。
 *
 * 61 种有 iNat taxon 记录，其中 59 种能挑出一张授权合适的
 * （robber-fly 与 shining-chafer 各只有 2 张、全是保留所有权利）。
 * 拿不到就返回 null，界面整块不显示 —— 绝不退而求其次去用没授权的图。
 */
export function photoOf(insectId: string): SpeciesPhoto | null {
  return PHOTOS[insectId] ?? null
}

/**
 * 站内图片地址。
 *
 * 走自己的域名而不是 iNat 的 S3：访客主要来自中文社区，而
 * `inaturalist-open-data.s3.amazonaws.com` 对大陆访客大概率慢或打不开
 * （跟当初把 Google Fonts 移出渲染阻塞路径是同一个判断）。
 */
export function localPhotoSrc(insectId: string): string {
  const ext = PHOTOS[insectId]?.ext === 'png' ? 'png' : 'jpg'
  return `/photos/${insectId}.${ext}`
}
