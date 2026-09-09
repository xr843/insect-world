#!/usr/bin/env node
/**
 * 把 `src/data/photos.json` 里列的照片抓进 `dist/photos/`。
 *
 * 挂在 `prebuild` 上（见 package.json）—— 先落盘，Vite 再把 public/ 拷进 dist。
 *
 * ── 为什么自己托管，不直接热链 iNat 的 S3 ────────────────────────────
 * 照片在 `inaturalist-open-data.s3.amazonaws.com`，热链本身是允许的
 * （AWS Open Data 计划），但这个站的访客主要来自中文站点（近 30 天 referrer
 * 前几名全是中文社区与导航站），而那个域名对大陆访客大概率慢或打不开。
 * 这跟当初把 Google Fonts 从渲染阻塞路径上砍掉是同一个问题：**别把首屏
 * 押在一个访客可能连不上的域名上**。自己托管就走 Cloudflare 边缘。
 *
 * 顺带还省掉一处 CSP 改动 —— `img-src 'self' data:` 不用为它开口子。
 *
 * ── 缓存与失败 ───────────────────────────────────────────────────────
 * 下载到 `.photo-cache/`（已 gitignore），命中就不再打网络。所以只有第一次
 * 构建慢，之后是拷贝。
 *
 * 抓不到的**跳过，不让构建失败**：断网、S3 抽风、某张图被作者删了 —— 这些
 * 都不该拦住一次部署。少一张照片的代价是那只虫暂时不显示实拍图，
 * 而前端对「没有照片」本来就有分支（photos.json 里没有的物种同样走那条路）。
 */
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = path.join(ROOT, 'src/data/photos.json')
const CACHE = path.join(ROOT, '.photo-cache')
const OUT = path.join(ROOT, 'public/photos')

/*
 * CI 里不下载。
 *
 * prebuild 挂在 `npm run build` 上，而 CI 每次 push 都跑一次构建 —— 那等于
 * 每次都去 iNat 的 S3 拉 60 张图（实测让 CI 从 1m20s 涨到 1m41s），既慢又是
 * 白白骚扰人家。CI 只是把构建当检查跑，产物扔掉，有没有图无所谓；
 * **真正部署的产物是本地 `npm run deploy` 构建的**，本地有 .photo-cache。
 *
 * 这跟 make-species-pages.mjs 里 lastmod 那条注释是同一个前提：
 * 部署在本地，不在 CI。哪天把部署搬进 CI，这一行要一起改。
 */
if (process.env.CI) {
  console.log('CI 环境，跳过实拍图下载（部署在本地进行）')
  process.exit(0)
}

if (!existsSync(MANIFEST)) {
  console.log('photos.json 不存在，跳过实拍图（先跑 npm run photos）')
  process.exit(0)
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
mkdirSync(CACHE, { recursive: true })
mkdirSync(OUT, { recursive: true })

/*
 * 先清掉清单里已经没有的旧图。
 *
 * 不清的话，一个物种被移出清单（比如黑翅土白蚁 —— 候选全是繁殖蚁、没有兵蚁，
 * 判定为不配图）之后，它上一次下载的那张**仍然躺在 public/photos/ 里并被部署**。
 * 页面不会渲染它（photoOf 返回 null），所以看不出问题 —— 但产物里就多了一张
 * 与清单自相矛盾的孤儿文件，日后核对「线上到底在用哪张」时会被它误导。
 * 线上实测撞到过：termite-soldier.jpg 排除之后仍然 200。
 */
const wanted = new Set(
  Object.entries(manifest).map(([id, e]) => `${id}.${e.ext === 'png' ? 'png' : 'jpg'}`),
)
for (const f of readdirSync(OUT)) {
  if (f === 'checksums.json' || wanted.has(f)) continue
  unlinkSync(path.join(OUT, f))
  console.log(`  清掉不在清单里的旧图：${f}`)
}

let fromCache = 0
let downloaded = 0
let failed = 0
let bytes = 0

for (const [id, entry] of Object.entries(manifest)) {
  // 缓存键带上 photoId：清单换了图，缓存自然失效，不会拿着旧图不放
  const ext = entry.ext === 'png' ? 'png' : 'jpg'
  const key = `${id}-${entry.photoId}.${ext}`
  const cached = path.join(CACHE, key)
  const dest = path.join(OUT, `${id}.${ext}`)

  try {
    if (!existsSync(cached)) {
      const res = await fetch(entry.url, {
        headers: { 'User-Agent': 'insect-world/0.1 (https://github.com/xr843/insect-world)' },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      // 小于 1KB 基本是错误页而不是照片 —— 存进去会变成一个坏掉的 <img>，
      // 而坏掉的图在页面上比没有图难看得多
      if (buf.length < 1024) throw new Error(`响应太小（${buf.length} 字节），像是错误页`)
      /*
       * 体积上限。抓取阶段已经筛掉了 GIF（那次是一张 26MB 的动图把 dist
       * 从 6MB 撑到 33MB），这里是第二道闸：即便日后筛选放宽，也不该有
       * 单张 3MB 以上的图进产物 —— 那对手机访客是灾难。
       */
      if (buf.length > 3 * 1024 * 1024)
        throw new Error(`太大（${(buf.length / 1024 / 1024).toFixed(1)}MB），跳过`)
      writeFileSync(cached, buf)
      downloaded++
    } else {
      fromCache++
    }
    copyFileSync(cached, dest)
    bytes += statSync(dest).size
  } catch (err) {
    failed++
    console.log(`  ${id}：${err.message}`)
  }
}

const mb = (bytes / 1024 / 1024).toFixed(1)
console.log(
  `✓ 实拍图 ${fromCache + downloaded}/${Object.keys(manifest).length} 张（缓存 ${fromCache}、新下 ${downloaded}` +
    `${failed ? `、失败 ${failed}` : ''}），共 ${mb} MB`,
)

// 校验和写进 public/：日后想确认"线上那张图跟清单里说的是不是同一张"，
// 靠肉眼比对是比不了的
const sums = {}
for (const [id, e] of Object.entries(manifest)) {
  const f = path.join(OUT, `${id}.${e.ext === 'png' ? 'png' : 'jpg'}`)
  if (existsSync(f)) sums[id] = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16)
}
writeFileSync(path.join(OUT, 'checksums.json'), JSON.stringify(sums, null, 2) + '\n', 'utf8')
