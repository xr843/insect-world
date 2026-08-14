/**
 * postbuild：为每个物种生成带独立 meta 的静态壳页 + sitemap.xml。
 *
 * 为什么要壳页：SPA 只有两张入口 HTML，60 个物种在搜索引擎与社交分享里
 * 被折叠成一页 —— 根页 canonical 指根，爬虫读到的意思是「?s= 的每一页都
 * 是首页」；分享哪只虫出的都是同一张卡。构建期把 dist/index.html 复制成
 * /s/<id>/、/en/s/<id>/ 两套壳页，每页换掉 title / description / canonical /
 * hreflang / og:*，正文仍是同一个 SPA（路径识别由前端负责）。
 *
 * 为什么转换**构建产物**而不是源 index.html：产物里 script/css 已经是带
 * 哈希的绝对路径（/assets/xx-哈希.js），照抄即正确；改源文件反而要自己
 * 追哈希。前提是引用必须是绝对路径，下面有断言把关（vite 改过 base 或
 * 开了相对路径构建时，这里会当场喊停而不是生成 120 页坏链接）。
 *
 * 物种数据直接 import src/data/insects.*.ts —— Node 22.18+ 默认剥离类型，
 * 两份数据文件恰好只有 type-only import，不需要 tsx/中间 JSON。
 * 若换了旧 Node 跑不动，报错信息会指向这里：升级 Node 或改用
 * `node --experimental-strip-types`。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://insect-world.pages.dev'

const { INSECTS: ZH } = await import('../src/data/insects.zh.ts')
const { INSECTS: EN } = await import('../src/data/insects.en.ts')

// ---------- 小工具 ----------

/** 断言：假了就带着现场信息停下，绝不带病生成 120 页 */
function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ 物种壳页生成失败：${msg}`)
    process.exit(1)
  }
}

/** 塞进 HTML 属性/文本前转义（summary 里有花引号没关系，直角引号也没关系，防的是 & < > "） */
function esc(s) {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

/**
 * 把模板里**恰好出现一次**的片段换掉。匹配 0 次说明模板被改了、2 次说明
 * 正则太松 —— 两种都意味着生成的页面不可信，直接失败比悄悄出错页好。
 */
function replaceOnce(html, pattern, replacement, label) {
  const matches = html.match(new RegExp(pattern.source, pattern.flags + 'g')) ?? []
  assert(matches.length === 1, `模板里「${label}」出现 ${matches.length} 次（应恰好 1 次），先核对 dist 模板`)
  // 用函数形式，免得 summary 里万一出现 $& 之类被 replace 当特殊变量展开
  return html.replace(pattern, () => replacement)
}

/**
 * 截到句边界：整句累加不超过 limit；一句都装不下时退到词/字边界硬截加省略号。
 * 英文 summary 275–320 字符，塞进 description 会被搜索结果截得破碎，
 * ~200 字符收在句号处最稳。中文 summary 目前 73–100 字，天然在 50–140 内，
 * 这里只是防未来有人写长（超限时同样按句截）。
 */
function clampAtSentence(text, limit) {
  if (text.length <= limit) return text
  // 句末判定：中文句号后可以直接跟下一句；西文 .!? 必须跟空白或结尾，
  // 否则「0.5 g」里的小数点会被当成句号，description 截成半个数字
  const re = /[。！？]|[.!?](?=['’”"]?(\s|$))/g
  let cut = 0
  for (let m; (m = re.exec(text)); ) {
    let end = m.index + 1
    while (end < text.length && /['’”"]/.test(text[end])) end++ // 收尾引号跟着句子走
    if (end > limit) break
    cut = end
  }
  if (cut > 0) return text.slice(0, cut).trim()
  // 首句就超限：硬截，尽量收在空格（西文词边界）
  const hard = text.slice(0, limit - 1)
  const sp = hard.lastIndexOf(' ')
  return (sp > limit * 0.6 ? hard.slice(0, sp) : hard).trim() + '…'
}

// ---------- 数据校验 ----------

assert(ZH.length > 0 && ZH.length === EN.length, `中英物种数不一致（zh ${ZH.length} / en ${EN.length}）`)
for (let i = 0; i < ZH.length; i++) {
  const [z, e] = [ZH[i], EN[i]]
  assert(z.id === e.id, `第 ${i} 位中英 id 不对应（${z.id} / ${e.id}）——壳页会把两种虫互挂 hreflang`)
  assert(/^[a-z0-9-]+$/.test(z.id), `id「${z.id}」含 URL 不安全字符`)
  assert(z.name && e.name, `${z.id} 缺 name`)
  assert(z.summary && e.summary, `${z.id} 缺 summary`)
}

// ---------- 读模板 ----------

const templates = {
  zh: { file: path.join(DIST, 'index.html'), suffix: '昆虫世界' },
  en: { file: path.join(DIST, 'en/index.html'), suffix: 'Insect World' },
}
for (const t of Object.values(templates)) {
  assert(existsSync(t.file), `${t.file} 不存在 —— 该脚本必须在 vite build 之后跑（postbuild）`)
  t.html = readFileSync(t.file, 'utf8')
  // 产物必须用绝对路径引资源，壳页在 /s/<id>/ 两层深处，相对路径会全断
  assert(/(src|href)="\/assets\//.test(t.html), `${t.file} 里的资源引用不是 /assets/ 绝对路径`)
}

// ---------- 生成壳页 ----------

/** og:image：有逐物种分享卡就用它（中英共用一套），没有回落到全站卡 */
function ogImageFor(id, locale) {
  if (existsSync(path.join(ROOT, 'public/og/species', `${id}.png`)))
    return `${SITE}/og/species/${id}.png`
  return locale === 'zh' ? `${SITE}/og.png` : `${SITE}/og-en.png`
}

function buildPage(locale, insect) {
  const t = templates[locale]
  const zhUrl = `${SITE}/s/${insect.id}/`
  const enUrl = `${SITE}/en/s/${insect.id}/`
  const self = locale === 'zh' ? zhUrl : enUrl
  const title = `${insect.name} — ${t.suffix}`
  const desc = clampAtSentence(insect.summary, locale === 'zh' ? 140 : 200)

  let html = t.html
  html = replaceOnce(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`, 'title')
  html = replaceOnce(
    html,
    /<meta name="description" content="[^"]*"\s*\/>/,
    `<meta name="description" content="${esc(desc)}" />`,
    'description',
  )
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${self}" />`,
    'canonical',
  )
  html = replaceOnce(
    html,
    /<link rel="alternate" hreflang="zh-Hans" href="[^"]*"\s*\/>/,
    `<link rel="alternate" hreflang="zh-Hans" href="${zhUrl}" />`,
    'hreflang zh-Hans',
  )
  html = replaceOnce(
    html,
    /<link rel="alternate" hreflang="en" href="[^"]*"\s*\/>/,
    `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
    'hreflang en',
  )
  html = replaceOnce(
    html,
    /<link rel="alternate" hreflang="x-default" href="[^"]*"\s*\/>/,
    `<link rel="alternate" hreflang="x-default" href="${zhUrl}" />`,
    'hreflang x-default',
  )
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${esc(title)}" />`,
    'og:title',
  )
  html = replaceOnce(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${esc(desc)}" />`,
    'og:description',
  )
  html = replaceOnce(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${self}" />`,
    'og:url',
  )
  html = replaceOnce(
    html,
    /<meta property="og:image" content="[^"]*"\s*\/>/,
    `<meta property="og:image" content="${ogImageFor(insect.id, locale)}" />`,
    'og:image',
  )

  const dir =
    locale === 'zh' ? path.join(DIST, 's', insect.id) : path.join(DIST, 'en/s', insect.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'index.html'), html)
  return { title, canonical: self }
}

const pages = []
for (const insect of ZH) pages.push(buildPage('zh', insect))
for (const insect of EN) pages.push(buildPage('en', insect))

// 全数生成 + title/canonical 全站唯一（重复意味着两页在搜索引擎眼里还是一页）
assert(pages.length === ZH.length * 2, `应生成 ${ZH.length * 2} 页，实际 ${pages.length}`)
assert(new Set(pages.map((p) => p.title)).size === pages.length, 'title 有重复')
const rootCanonicals = [`${SITE}/`, `${SITE}/en/`]
const canonicals = pages.map((p) => p.canonical).concat(rootCanonicals)
assert(new Set(canonicals).size === canonicals.length, 'canonical 有重复（或撞上根页面）')

// ---------- sitemap.xml ----------

/** 一个 <url> 条目；物种页带 hreflang 交替引用，根页对同样适用 */
function urlEntry(loc, zhHref, enHref) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="zh-Hans" href="${zhHref}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${enHref}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${zhHref}"/>`,
    '  </url>',
  ].join('\n')
}

const entries = [
  urlEntry(`${SITE}/`, `${SITE}/`, `${SITE}/en/`),
  urlEntry(`${SITE}/en/`, `${SITE}/`, `${SITE}/en/`),
]
for (const { id } of ZH) {
  entries.push(urlEntry(`${SITE}/s/${id}/`, `${SITE}/s/${id}/`, `${SITE}/en/s/${id}/`))
  entries.push(urlEntry(`${SITE}/en/s/${id}/`, `${SITE}/s/${id}/`, `${SITE}/en/s/${id}/`))
}
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
  '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ...entries,
  '</urlset>',
  '',
].join('\n')
writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap)

const speciesOg = ZH.filter(({ id }) =>
  existsSync(path.join(ROOT, 'public/og/species', `${id}.png`)),
).length
console.log(
  `✓ 物种壳页 ${pages.length} 页（${ZH.length} 种 × 中英）+ sitemap.xml ${entries.length} 条；` +
    `逐物种 og 图 ${speciesOg}/${ZH.length}${speciesOg < ZH.length ? '（缺的回落全站卡）' : ''}`,
)
