#!/usr/bin/env node
/**
 * 从 iNaturalist 抓一张实拍照片的**元数据**，落到 `src/data/photos.json`。
 *
 *   node scripts/fetch-photos.mjs          # 全量刷新
 *   node scripts/fetch-photos.mjs --check  # 只核对现有清单，不写文件
 *
 * ── 为什么只存元数据、不把图片提交进仓库 ─────────────────────────────
 * 本仓库是 MIT —— 任何人都能拿去商用。而可用照片里大部分是 CC-BY-**NC**
 * （禁商用），把这些字节提交进来，仓库的 MIT 声明就是骗人的：拿走的人
 * 以为自己拿到的全是 MIT，实际怀里揣着一堆禁商用的图。
 *
 * 所以分成两步：清单（纯元数据，可以安心 MIT）进仓库；图片字节由
 * `scripts/download-photos.mjs` 在构建期抓进 dist，从不进 git。
 *
 * ── 为什么抓取和下载是两个脚本 ───────────────────────────────────────
 * 抓元数据要打 61 次 API、有速率限制、结果需要人过一眼（尤其是许可证分布）；
 * 下载图片则是每次构建都要确保 dist 里有货的机械活。混在一起会让每次
 * `npm run build` 都去骚扰 iNat 的 API。
 *
 * ── ⚠ 为什么用「观察记录」而不是 taxon_photos ────────────────────────
 * 第一版用的是 `/v1/taxa/{id}` 的 `taxon_photos`，跑出来第一张图就是错的：
 * **帝王蝶给了一条毛毛虫**。taxon_photos 混着卵、幼虫、蛹、成虫，而这个站的
 * 3D 模型是成虫 —— 把幼虫摆在成虫模型旁边，对一本图鉴来说是内容错误，
 * 比任何版面问题都严重。而且它不报错、页面照常好看，只有真去看图才发现。
 *
 * 改用 `/v1/observations` 并加两个筛选：
 *   term_id=1 & term_value_id=2   iNat 的受控标注「生活史阶段 = 成虫」
 *   quality_grade=research        鉴定已被社区确认
 * 再按 `order_by=votes` 排 —— 那是社区点赞数，比「最新」更接近「拍得好」。
 *
 * ── ⚠ 自动挑选到此为止，剩下的必须靠眼睛 ─────────────────────────────
 * 加了成虫标注之后仍然翻车了几张（61 张联系表看出来的）：
 *   迷卡斗蟋 → 一张**声谱图**（来自录音观察，不是照片）
 *   中华齿蛉 → 主体是**一张人脸**
 *   西方蜜蜂 → 一整团蜂群趴在招牌上，认不出单只
 *   黑翅土白蚁 → 图里是**有翅繁殖蚁**，跟本站建模的兵蚁不是同一个品级
 *
 * 第一条能自动修（带 sounds 的观察一律跳过），后三条不能 —— 没有任何字段
 * 能告诉你「这张照片的主体是人不是虫」。所以脚本只负责给出候选，
 * 最终选择记在 `src/data/photoOverrides.json` 里，那是一份**人看过的**清单。
 * 对一本以准确为卖点的图鉴，这道人工闸不能省。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src/data/photos.json')

const { INAT_TAXA } = await import('../src/data/external.ts')
const { pickPhoto, photographerOf, isCommercialOk } = await import('../src/data/photoPolicy.ts')

/**
 * 人工覆盖表：物种 id → 指定的 iNat photo id。
 *
 * 自动挑选只能保证「许可证合规、是成虫、社区评价高」，保证不了「这张图
 * 看得清这只虫」。这份表就是人看过联系表之后的修正，每一条都该在
 * photoOverrides.json 里带一句为什么。
 */
const OVERRIDES_PATH = path.join(ROOT, 'src/data/photoOverrides.json')
const overrides = existsSync(OVERRIDES_PATH)
  ? JSON.parse(readFileSync(OVERRIDES_PATH, 'utf8'))
  : {}

const checkOnly = process.argv.includes('--check')

/** iNat 没有公开的硬性速率限制文档，社区惯例是 ≤1 次/秒。别把人家打挂。 */
const DELAY_MS = 1100
const UA = 'insect-world/0.1 (https://github.com/xr843/insect-world)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 只问许可证合适的图，省得把一堆保留所有权利的记录取回来再筛掉 */
const LICENSE_PARAM = ['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa'].join(',')

/**
 * 取一个 taxon 下的候选照片。
 *
 * `adultOnly=false` 是回退档：冷门物种（本站有不少）可能一条带成虫标注的
 * 观察都没有。那时宁可要一张没标注的研究级照片，也不要整个物种没图 ——
 * 但回退过的物种会被单独列出来，那份清单就是「需要人去看一眼是不是成虫」的
 * 待办，不是悄悄蒙混过去。
 */
async function fetchPhotos(taxonId, adultOnly) {
  const q = new URLSearchParams({
    taxon_id: String(taxonId),
    photo_license: LICENSE_PARAM,
    quality_grade: 'research',
    order_by: 'votes',
    order: 'desc',
    per_page: '12',
  })
  if (adultOnly) {
    q.set('term_id', '1') // 受控词表：生活史阶段
    q.set('term_value_id', '2') // 成虫
  }
  const res = await fetch(`https://api.inaturalist.org/v1/observations?${q}`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const body = await res.json()
  const out = []
  for (const obs of body.results ?? []) {
    // 带录音的观察跳过：iNat 会为声音记录生成**声谱图**并当作照片返回，
    // 于是「迷卡斗蟋」拿到的是一张蓝绿色的频谱方图。这是唯一能自动识别的
    // 那类翻车 —— 抓住它，别让它进候选
    if ((obs.sounds ?? []).length > 0) continue
    for (const ph of obs.photos ?? []) {
      const url = String(ph.url ?? '').replace('/square.', '/medium.')
      /*
       * 只收 jpg / png。
       *
       * iNat 也存 GIF —— 而「海滨蠼螋」自动挑中的那张是**26MB 的动图**。
       * 下载脚本原先不管格式一律存成 .jpg，于是一张图就把整个 dist 从 6MB
       * 撑到 33MB，而且扩展名还是错的。图鉴要的是一张能看清形态的静态照片，
       * 动图在这儿没有任何价值，直接在候选阶段筛掉。
       */
      if (!/\.(jpe?g|png)$/i.test(url)) continue
      out.push({
        id: ph.id,
        license_code: ph.license_code,
        // 接口给的是 square 缩略图，换成 medium 才是能看的尺寸
        medium_url: url,
        attribution: ph.attribution,
        original_dimensions: ph.original_dimensions,
        observationUrl: `https://www.inaturalist.org/observations/${obs.id}`,
      })
    }
  }
  return out
}

const entries = Object.entries(INAT_TAXA)
const out = {}
const nonCommercial = []
const missing = []
/** 没有成虫标注、退回「任意研究级」的物种 —— 需要人去看一眼图对不对 */
const unannotated = []
/** 人工指定的那张图这次没在候选里 —— 必须让人看见，不能静默 */
const overrideMisses = []

console.log(`抓 ${entries.length} 种的照片元数据（每次间隔 ${DELAY_MS}ms）…\n`)

for (const [id, taxonId] of entries) {
  try {
    let photos = await fetchPhotos(taxonId, true)
    let fellBack = false
    if (photos.length === 0) {
      await sleep(DELAY_MS)
      photos = await fetchPhotos(taxonId, false)
      fellBack = photos.length > 0
    }
    // 人工指定优先。三种情况：
    //   photoId 是数字 → 用那张（找不到要**大声报错**，不能静默回落到自动挑选，
    //                    否则人工修正会在某次刷新后悄悄失效）
    //   photoId 是 null → 这个物种明确不配图
    //   没有条目       → 走自动挑选
    const ov = overrides[id]
    const hasOverride = ov && Object.prototype.hasOwnProperty.call(ov, 'photoId')
    if (hasOverride && ov.photoId === null) {
      missing.push(id)
      console.log(`  ${id.padEnd(24)} 人工指定不配图：${ov.why ?? ''}`)
      await sleep(DELAY_MS)
      continue
    }
    const wantId = hasOverride ? ov.photoId : null
    let picked
    if (wantId) {
      picked = photos.find((p) => p.id === wantId)
      if (!picked) {
        overrideMisses.push(`${id}(#${wantId})`)
        picked = pickPhoto(photos)
      }
    } else {
      picked = pickPhoto(photos)
    }
    if (picked && fellBack) unannotated.push(id)

    if (!picked) {
      // 一张可用的都没有 —— 这个物种就不显示照片。绝不退而求其次去用
      // 保留所有权利的图（见 photoPolicy.ts 的 pickPhoto）
      missing.push(id)
      console.log(`  ${id.padEnd(24)} 无可用授权照片（共 ${photos.length} 张）`)
      continue
    }

    const commercial = isCommercialOk(picked.license_code)
    if (!commercial) nonCommercial.push(id)

    out[id] = {
      photoId: picked.id,
      url: picked.medium_url,
      license: picked.license_code,
      photographer: photographerOf(picked.attribution),
      // 原始署名整串也留着：日后要核对「我们有没有署对」时，
      // 靠解析后的姓名是核不了的，得看 iNat 当时给的原文
      attribution: picked.attribution ?? '',
      // 链观察页而不是 /photos/<id>：观察页能看到拍摄者、日期、地点，
      // 是更完整的署名落点
      inatUrl: picked.observationUrl,
      /** 实际图片格式。存下来是因为文件名要用它 —— 把 png 存成 .jpg 会让
       *  Cloudflare 按扩展名发错 Content-Type。 */
      ext: /\.png$/i.test(picked.medium_url) ? 'png' : 'jpg',
      /** 是否退回了「无成虫标注」的档 —— 这些需要人工过目 */
      unverifiedStage: fellBack || undefined,
      /** 这张是不是人工指定的 */
      curated: wantId === picked.id || undefined,
      /**
       * 其余候选（最多 5 个），供人工挑选时看。
       * 存在清单里而不是每次重抓：换图时不必再打一次 API，
       * 而且 diff 里能看出「当时可选的是哪几张」。
       */
      candidates: photos
        .filter((p) => p.id !== picked.id)
        .slice(0, 5)
        .map((p) => ({ photoId: p.id, url: p.medium_url, license: p.license_code })),
      width: picked.original_dimensions?.width ?? null,
      height: picked.original_dimensions?.height ?? null,
    }
    console.log(
      `  ${id.padEnd(24)} ${String(picked.license_code).padEnd(12)}` +
        `${commercial ? '' : ' 禁商用'}${fellBack ? ' ⚠无成虫标注' : ''}`,
    )
  } catch (err) {
    missing.push(id)
    console.log(`  ${id.padEnd(24)} 取失败：${err.message}`)
  }
  await sleep(DELAY_MS)
}

console.log(`\n拿到 ${Object.keys(out).length} / ${entries.length} 种`)
console.log(`其中禁商用（CC-*-NC-*）${nonCommercial.length} 种`)
if (missing.length) console.log(`没有可用授权照片：${missing.join(' ')}`)
if (overrideMisses.length) {
  console.log(
    `\n✘ 人工指定的图没找到，已回落到自动挑选 —— 这些修正**已经失效**，去 photoOverrides.json 重挑：\n  ${overrideMisses.join(' ')}`,
  )
}
if (unannotated.length) {
  console.log(
    `\n⚠ 这 ${unannotated.length} 种没有带成虫标注的观察，退回了「任意研究级」——\n` +
      `  需要人去看一眼图里是不是成虫（第一版就是在这儿把毛毛虫当成了帝王蝶）：\n  ${unannotated.join(' ')}`,
  )
}

if (nonCommercial.length) {
  console.log(
    `\n⚠ 这 ${nonCommercial.length} 种用的是禁商用照片。本仓库是 MIT，两者有张力 ——\n` +
      `  这份清单就是「这个站一旦要商用，必须先换掉的图」，不是糊涂账：\n  ${nonCommercial.join(' ')}`,
  )
}

if (checkOnly) {
  if (!existsSync(OUT)) {
    console.error('\n✘ --check：清单还不存在，先跑一次全量。')
    process.exit(1)
  }
  const old = JSON.parse(readFileSync(OUT, 'utf8'))
  const changed = Object.keys(out).filter((k) => JSON.stringify(old[k]) !== JSON.stringify(out[k]))
  console.log(changed.length ? `\n有 ${changed.length} 种变了：${changed.join(' ')}` : '\n清单与线上一致。')
  process.exit(0)
}

// 键按物种 id 排序：不排的话每次抓取的顺序都可能不同，diff 里全是噪声
const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]))
writeFileSync(OUT, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
console.log(`\n✓ 写入 ${path.relative(ROOT, OUT)}`)

/**
 * 仓库级署名清单。
 *
 * 页面上每张图旁边已经逐条署名了（那才是 CC 的 BY 义务真正落地的地方），
 * 这份是给**核对**用的：一眼看完 59 条分别是谁拍的、什么许可证，
 * 以及哪些是禁商用的。逐页翻网站核不了这个。
 */
const NOTICE = path.join(ROOT, 'NOTICE-photos.md')
const lines = [
  '# 实拍照片署名',
  '',
  '本文件由 `npm run photos` 生成，请勿手改。',
  '',
  '站上每只虫的实拍图都来自 [iNaturalist](https://www.inaturalist.org/)，',
  '全部为 Creative Commons 授权。图片旁已逐张署名，这份清单是为了能一次核对完。',
  '',
  '**图片字节不在本仓库内** —— 仓库是 MIT，而下表中带 `NC` 的照片禁止商用，',
  '把它们提交进来会让 MIT 声明变成骗人的。图片由 `scripts/download-photos.mjs`',
  '在构建期抓进 `public/photos/`（已 gitignore）。',
  '',
  `共 ${Object.keys(sorted).length} 张，其中禁商用 ${nonCommercial.length} 张。`,
  '',
  '| 物种 | 摄影 | 许可证 | 原图 |',
  '| --- | --- | --- | --- |',
]
for (const [id, e] of Object.entries(sorted)) {
  const nc = String(e.license).includes('-nc') ? ' ⚠' : ''
  lines.push(`| \`${id}\` | ${e.photographer} | ${e.license}${nc} | [${e.photoId}](${e.inatUrl}) |`)
}
lines.push('', '⚠ = 禁商用（CC-*-NC-*）。这个站一旦要商用，必须先换掉这些图。', '')
writeFileSync(NOTICE, lines.join('\n'), 'utf8')
console.log(`✓ 写入 ${path.relative(ROOT, NOTICE)}`)
