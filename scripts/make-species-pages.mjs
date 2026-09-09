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
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'dist')
const SITE = 'https://insect-world.pages.dev'

const { INSECTS: ZH } = await import('../src/data/insects.zh.ts')
const { INSECTS: EN } = await import('../src/data/insects.en.ts')
const { ORDER_LABEL } = await import('../src/i18n/orders.ts')
const { licenseUrl, licenseLabel } = await import('../src/data/photoPolicy.ts')
/**
 * 实拍图清单。壳页要带图有两个理由：
 *
 * 1. **图片搜索** —— 这个站近 30 天自然搜索 0/2872，常规 SEO 代码侧已经做完
 *    只能等。而 60 张实拍图在此之前**对爬虫完全不存在**（壳页里一个 <img>
 *    都没有，图只在 React 挂载后才出现）。图片搜索是它唯一还没试过的入口。
 * 2. **首屏** —— 图不必等主包下载完才显示。
 *
 * 清单缺失时整段跳过，构建照常 —— 跟前端 photoOf 返回 null 是同一条降级路径。
 */
const PHOTOS = (() => {
  const f = path.join(ROOT, 'src/data/photos.json')
  return existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {}
})()

const LISTS = { zh: ZH, en: EN }

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

// ---------- JSON-LD 结构化数据 ----------

/**
 * 为什么要 JSON-LD：title/description 只是字符串，结构化数据才把「这一页
 * 讲的是一种昆虫、学名是什么、属于哪个目、首页在哪」变成搜索引擎能直接
 * 消费的事实。BreadcrumbList 还能换来搜索结果里的面包屑展示。
 * 物种实体用 schema.org 的 Taxon 类型（bioschemas 并入的，iNaturalist/GBIF
 * 都在用），比硬套 Article/Product 诚实。
 *
 * ⚠️ 序列化时必须把 `<` 转成 \u003c：summary 是人写的文本，哪天出现
 * `</script>` 这样的片段，整个 head 会被从中间截断。\u003c 在 JSON 里是
 * 合法转义，解析回来还是同一个字符，页面上不损失任何内容。
 */
function jsonLdScript(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replaceAll('<', '\\u003c')}</script>`
}

const LANG = { zh: 'zh-Hans', en: 'en' }
const SITE_NAME = { zh: '昆虫世界', en: 'Insect World' }
const homeOf = (locale) => (locale === 'zh' ? `${SITE}/` : `${SITE}/en/`)

function websiteNode(locale) {
  return {
    '@type': 'WebSite',
    '@id': `${homeOf(locale)}#website`,
    url: homeOf(locale),
    name: SITE_NAME[locale],
    inLanguage: LANG[locale],
  }
}

/**
 * 实拍图的结构化数据。
 *
 * `license` + `acquireLicensePage` 两个字段齐了，Google Images 才会给
 * **「可授权（Licensable）」标记** —— 这既是曝光，也是把 CC 署名做成
 * 机器可读的一份。`creditText` / `creator` 对应 BY 的署名要求。
 *
 * 没有实拍图的物种返回 null，调用方回落到那张生成的分享卡。
 */
function photoImageObject(insect) {
  const p = PHOTOS[insect.id]
  if (!p) return null
  const ext = p.ext === 'png' ? 'png' : 'jpg'
  const lic = licenseUrl(p.license)
  return {
    '@type': 'ImageObject',
    contentUrl: `${SITE}/photos/${insect.id}.${ext}`,
    creditText: p.photographer,
    creator: { '@type': 'Person', name: p.photographer },
    copyrightNotice: p.attribution,
    ...(lic ? { license: lic } : {}),
    // 「去哪儿拿授权」指向 iNat 的观察页 —— 那儿有摄影者本人与原始授权声明
    acquireLicensePage: p.inatUrl,
  }
}

function speciesJsonLd(locale, insect, self, title, desc) {
  const image = ogImageFor(insect.id, locale)
  const photo = photoImageObject(insect)
  // 62 只是双名（种），淡色库蚊是三名（亚种）——按词数分，别把亚种标成种
  const rank = insect.latin.trim().split(/\s+/).length >= 3 ? 'subspecies' : 'species'
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(locale),
      {
        '@type': 'ItemPage',
        '@id': `${self}#webpage`,
        url: self,
        name: title,
        description: desc,
        inLanguage: LANG[locale],
        isPartOf: { '@id': `${homeOf(locale)}#website` },
        primaryImageOfPage: image,
        breadcrumb: { '@id': `${self}#breadcrumb` },
        mainEntity: { '@id': `${self}#taxon` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${self}#breadcrumb`,
        itemListElement: [
          // 末位是本页自身，Google 明说可以不带 item；首位必须带
          { '@type': 'ListItem', position: 1, name: SITE_NAME[locale], item: homeOf(locale) },
          { '@type': 'ListItem', position: 2, name: insect.name },
        ],
      },
      {
        '@type': 'Taxon',
        '@id': `${self}#taxon`,
        name: insect.name,
        scientificName: insect.latin,
        taxonRank: rank,
        description: insect.summary,
        // 真实照片排在前面：分享卡是自制插画卡，图片搜索要的是实拍
        image: photo ? [photo, image] : image,
        parentTaxon: {
          '@type': 'Taxon',
          name: ORDER_LABEL[locale][insect.order],
          scientificName: insect.order[0].toUpperCase() + insect.order.slice(1),
          taxonRank: 'order',
        },
      },
    ],
  }
}

function homeJsonLd(locale) {
  const list = LISTS[locale]
  const home = homeOf(locale)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteNode(locale),
      {
        '@type': 'CollectionPage',
        '@id': `${home}#webpage`,
        url: home,
        name: SITE_NAME[locale],
        inLanguage: LANG[locale],
        isPartOf: { '@id': `${home}#website` },
        mainEntity: { '@id': `${home}#list` },
      },
      {
        '@type': 'ItemList',
        '@id': `${home}#list`,
        numberOfItems: list.length,
        itemListElement: list.map((x, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: x.name,
          item: `${SITE}${href(locale, x.id)}`,
        })),
      },
    ],
  }
}

/**
 * 回读断言：从成品页里把 JSON-LD 抠出来重新 parse。任何转义或注入 bug
 * （比如 summary 里的引号把 JSON 截断）都会在这里当场爆，而不是部署后
 * 让搜索引擎静默丢弃整块数据。
 */
function assertJsonLd(html, pageLabel) {
  const m = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)
  assert(m, `${pageLabel} 里没有 JSON-LD`)
  let data
  try {
    data = JSON.parse(m[1])
  } catch (e) {
    assert(false, `${pageLabel} 的 JSON-LD 不是合法 JSON：${e.message}`)
  }
  assert(Array.isArray(data['@graph']) && data['@graph'].length >= 2, `${pageLabel} 的 JSON-LD 缺 @graph`)
  return data
}

// ---------- 静态正文（SEO） ----------

/**
 * 壳页要不要带可爬的正文？要，而且这是这套壳页真正的价值所在。
 *
 * 之前的壳页只有 title / description / og，`<body>` 里的可见文字长度是 **0** ——
 * 正文要等 JS 跑完才有。Google 能渲染 JS 但优先级低、延迟大，**百度基本不行**，
 * 而中文访客是第一大来源。结果是 126 个本该带来长尾流量的入口全部空转：
 * 实测只有首页被收录，`/s/<id>/` 一张都没进。
 *
 * ## 为什么放进 `#root` 里面
 *
 * `createRoot(el).render()` 在首次渲染时会清空容器，所以这段静态正文
 * **会被应用接管**，用户最终看到的还是那个 SPA。这不是「给爬虫看一套、
 * 给用户看另一套」—— 内容与应用里显示的是同一份数据，只是先用纯 HTML 呈一遍。
 *
 * 顺带修掉一件事：在这之前，从落地到应用挂载之间 `#root` 是空的，
 * 移动端 4G 冷缓存那 2.6 秒是纯白等；现在那 2.6 秒里已经可以读这只虫了。
 * 所以这段的排版要**当成正式内容排**，不能是一坨裸文字。
 *
 * ⚠️ 内联样式里的字体名必须用**单引号**：整段样式是塞进 `style="…"` 的双引号
 * 属性里的，字体名再用双引号会把属性提前截断 —— 浏览器容错所以肉眼看不出来，
 * 但属性后半截（颜色、行高）实际被丢掉了，而且生成的是畸形 HTML，
 * 爬虫的解析器未必同样宽容。这正是这段代码存在的理由所反对的。
 *
 * ⚠️ 用内联样式而不是类名：`global.css` 里的类是带内容哈希的 CSS Module，
 * 名字每次构建都变，脚本追不上；而颜色走 CSS 变量并带回退值，
 * 明暗两套主题都能看（`theme-boot.js` 在首帧前就设好了 data-theme）。
 */
const PANEL = {
  zh: { facts: '关键数据', ecology: '生态角色', trivia: '你知道吗', life: '生活史', range: '分布', status: '状态', more: '打开可交互的 3D 标本' },
  en: { facts: 'Key figures', ecology: 'Ecological role', trivia: 'Did you know', life: 'Life cycle', range: 'Range', status: 'Status', more: 'Open the interactive 3D specimen' },
}

const S = {
  figure: 'margin:1.25rem 0',
  img: 'display:block;width:100%;height:auto;border-radius:.5rem',
  figcaption: 'font-size:.8rem;opacity:.7;margin-top:.35rem',
  wrap: 'max-width:46rem;margin:0 auto;padding:3rem 1.25rem 4rem;font-family:\'Noto Serif SC\',Georgia,serif;color:var(--ink,#2b2622);line-height:1.75',
  name: 'font-family:\'Playfair Display\',Georgia,serif;font-size:2rem;margin:0 0 .25rem',
  latin: 'font-style:italic;opacity:.72;margin:0 0 .1rem',
  epithet: 'color:var(--brass,#7d6128);margin:0 0 1.25rem',
  h2: 'font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin:1.6rem 0 .5rem;font-family:system-ui,sans-serif',
  dl: 'display:grid;grid-template-columns:auto 1fr;gap:.35rem 1rem;margin:0',
  dt: 'opacity:.62',
  dd: 'margin:0',
  p: 'margin:0',
  ul: 'margin:0;padding-left:1.1rem',
  li: 'margin:.2rem 0',
  a: 'color:var(--brass,#7d6128)',
  latinInline: 'font-style:italic;opacity:.6',
  nav: 'margin-top:2.75rem;padding-top:1.25rem;border-top:1px solid var(--line,#ded8cc)',
}

/**
 * ⚠️ 静态正文的**最外层必须是 `<article>`、且是 `#root` 的直接子元素**。
 *
 * `public/theme-boot.js` 靠 `#root > article` 这条选择器把它藏到应用挂载之后
 * （否则真人会看见一整屏文字闪一下就没了，线上实测热缓存 87ms）。换个标签名、
 * 或者外面再包一层 div，选择器就静默失配 —— 页面照常能用、正文照常可爬、
 * 测试照常全绿，**只有真人打开时会看见那一闪**。下面有断言钉死这件事。
 */
const SEO_ROOT_TAG = 'article'

/**
 * 静态正文里的实拍图。
 *
 * ⚠️ **图注不能省。** 这些图全是 CC 授权的，BY 就是署名要求 —— 摄影者、
 * 许可证、回原页的链接三样缺一不可。应用里那份图注在爬虫看来不存在
 * （它要等 JS），所以静态这份必须自带完整署名，不能指望前端补。
 *
 * alt 里带上学名：图片搜索匹配的是 alt 与周边文字，而学名是这类查询里
 * 最具区分度的词。
 */
function staticPhoto(locale, insect) {
  const p = PHOTOS[insect.id]
  if (!p) return ''
  const ext = p.ext === 'png' ? 'png' : 'jpg'
  const alt =
    locale === 'zh'
      ? `${insect.name}（${insect.latin}）的实拍照片`
      : `Photograph of ${insect.name} (${insect.latin})`
  const by = locale === 'zh' ? '摄影' : 'Photo by'
  const lic = licenseUrl(p.license)
  const licHtml = lic
    ? `<a href="${esc(lic)}" rel="license noopener" target="_blank">${esc(licenseLabel(p.license))}</a>`
    : esc(licenseLabel(p.license))
  return (
    `<figure style="${S.figure}">` +
    `<img src="/photos/${insect.id}.${ext}" alt="${esc(alt)}" width="500" height="313" ` +
    `loading="lazy" decoding="async" style="${S.img}" />` +
    `<figcaption style="${S.figcaption}">${by} ${esc(p.photographer)} · ${licHtml} · ` +
    `<a href="${esc(p.inatUrl)}" rel="noopener" target="_blank">iNaturalist</a></figcaption>` +
    `</figure>`
  )
}

/** 生成一页的静态正文。内容与应用里显示的是同一份数据。 */
function staticBody(locale, insect) {
  const L = PANEL[locale]
  const li = (x) => `<li>${esc(x)}</li>`
  return [
    `<article style="${S.wrap}">`,
    `<h1 style="${S.name}">${esc(insect.name)}</h1>`,
    `<p style="${S.latin}">${esc(insect.latin)}</p>`,
    `<p style="${S.epithet}">${esc(insect.epithet)}</p>`,
    staticPhoto(locale, insect),
    `<p style="${S.p}">${esc(insect.summary)}</p>`,
    `<h2 style="${S.h2}">${esc(L.facts)}</h2>`,
    `<dl style="${S.dl}">`,
    ...insect.facts.map((f) => `<dt style="${S.dt}">${esc(f.key)}</dt><dd style="${S.dd}">${esc(f.value)}</dd>`),
    `</dl>`,
    `<h2 style="${S.h2}">${esc(L.life)}</h2>`,
    `<p style="${S.p}">${insect.lifecycle.map(esc).join(' → ')}</p>`,
    `<h2 style="${S.h2}">${esc(L.ecology)}</h2>`,
    `<p style="${S.p}">${esc(insect.ecology)}</p>`,
    `<h2 style="${S.h2}">${esc(L.trivia)}</h2>`,
    `<p style="${S.p}">${esc(insect.trivia)}</p>`,
    `<h2 style="${S.h2}">${esc(L.range)}</h2>`,
    `<p style="${S.p}">${esc(insect.range)}</p>`,
    `<h2 style="${S.h2}">${esc(L.status)}</h2>`,
    `<p style="${S.p}">${esc(insect.status)}</p>`,
    insect.hotspots?.length
      ? `<h2 style="${S.h2}">${locale === 'zh' ? '身体构造' : 'Anatomy'}</h2><ul style="${S.ul}">${insect.hotspots.map((h) => li(`${h.label}${locale === 'zh' ? '：' : ' — '}${h.note}`)).join('')}</ul>`
      : '',
    `<p style="${S.h2};margin-top:2rem">${esc(L.more)}</p>`,
    siblingNav(locale, insect),
    `</article>`,
  ].join('')
}

/**
 * ## 内链：不执行 JS 的爬虫走到这些页面的唯一通路
 *
 * 在这之前，这批页面对百度这类不跑 JS 的爬虫是**一座座孤岛**：首页的
 * `<body>` 可见文字长度是 0、指向物种页的链接 0 条；126 张壳页彼此不链接，
 * 只有指向自己的 canonical 与 hreflang。上面那段静态正文让每页**有内容**了，
 * 但没有任何一条路能**走到**它。
 *
 * 剩下的唯一通路是 sitemap，而 sitemap 最可靠的送达方式是站长平台提交 ——
 * 那要账号（百度还要手机号实名）。`robots.txt` 里那行 `Sitemap:`
 * Google 与 Bing 确定会读，百度没有明确说法，不能指望。
 *
 * 所以补两条不依赖任何账号的通路：
 *
 * 1. **首页列出全部物种**（按目分组）—— 任何一页都在首页一跳之内；
 * 2. **每张壳页列出同目的其他物种 + 回首页** —— 横向能爬，链接权重也不再
 *    只是单向汇入首页。
 *
 * 顺带对真实用户也是收益：落地到应用挂载之间那段白屏，现在是一份能读、
 * 能点的名录 —— 移动端冷缓存下那两秒不再是纯等待。
 */

/** 站内物种页地址。英文站整站挂在 /en/ 下，链接必须跟着换前缀，否则跨语言互链 */
const href = (locale, id) => (locale === 'zh' ? `/s/${id}/` : `/en/s/${id}/`)

/**
 * 每页最多列几只同目的。鞘翅目有 28 只，全列会让 28 张甲虫页各背上一大段
 * 重复链接（爬虫看重复模板，人也没法读）。截断不丢页：首页列的是全部。
 */
const SIBLINGS = 12

const NAV = {
  zh: {
    h1: '昆虫世界',
    intro: (n) =>
      `${n} 种昆虫的可交互 3D 标本馆。每一只都不是扫描来的模型，而是按形态学特征用代码逐段生成的 —— 可以旋转、可以点开身体各处的标注、可以看它振翅与蜕变。下面是全部名录。`,
    same: (order) => `${order}的其他物种`,
    home: (n) => `返回全部 ${n} 种昆虫`,
    sep: '、',
  },
  en: {
    h1: 'Insect World',
    intro: (n) =>
      `An interactive 3D cabinet of ${n} insects. Not one of them is a scan: each is generated from code, segment by segment, following its real morphology — rotate it, tap the annotated parts, watch it beat its wings and change shape. The full list follows.`,
    same: (order) => `More from ${order}`,
    home: (n) => `Back to all ${n} insects`,
    sep: ' · ',
  },
}

/** 壳页底部：同目的其他物种 + 回首页 */
function siblingNav(locale, insect) {
  const L = NAV[locale]
  const list = LISTS[locale]
  const sibs = list.filter((x) => x.order === insect.order && x.id !== insect.id).slice(0, SIBLINGS)
  const links = sibs
    .map((x) => `<a href="${href(locale, x.id)}" style="${S.a}">${esc(x.name)}</a>`)
    .join(L.sep)
  // 独占一目的（䗛目、革翅目、广翅目、毛翅目各只有一只）没有同伴，只留回首页那条
  const same = sibs.length
    ? `<h2 style="${S.h2}">${esc(L.same(ORDER_LABEL[locale][insect.order]))}</h2><p style="${S.p}">${links}</p>`
    : ''
  return (
    `<nav style="${S.nav}">${same}` +
    `<p style="${S.p};margin-top:1rem"><a href="${locale === 'zh' ? '/' : '/en/'}" style="${S.a}">${esc(L.home(list.length))}</a></p>` +
    `</nav>`
  )
}

/** 首页正文：站点一句话 + 按目分组的全部物种，每种一条链接 */
function staticIndex(locale) {
  const list = LISTS[locale]
  const L = NAV[locale]
  const groups = new Map()
  for (const i of list) {
    if (!groups.has(i.order)) groups.set(i.order, [])
    groups.get(i.order).push(i)
  }
  const sections = [...groups]
    .map(
      ([key, items]) =>
        `<h2 style="${S.h2}">${esc(ORDER_LABEL[locale][key])}</h2><ul style="${S.ul}">` +
        items
          .map(
            (i) =>
              `<li style="${S.li}"><a href="${href(locale, i.id)}" style="${S.a}">${esc(i.name)}</a>` +
              ` <i style="${S.latinInline}">${esc(i.latin)}</i> — ${esc(i.epithet)}</li>`,
          )
          .join('') +
        `</ul>`,
    )
    .join('')
  return (
    `<article style="${S.wrap}"><h1 style="${S.name}">${esc(L.h1)}</h1>` +
    `<p style="${S.p}">${esc(L.intro(list.length))}</p>${sections}</article>`
  )
}

/** 统计一段 HTML 里指向站内物种页的链接数（head 里的 canonical/hreflang 是绝对地址，不会被算进来） */
function countSpeciesLinks(html) {
  return (html.match(/href="\/(?:en\/)?s\/[a-z0-9-]+\/"/g) ?? []).length
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
  html = replaceOnce(
    html,
    /<\/head>/,
    `${jsonLdScript(speciesJsonLd(locale, insect, self, title, desc))}</head>`,
    'head 收尾（JSON-LD 注入点）',
  )
  const ld = assertJsonLd(html, `${insect.id}（${locale}）`)
  assert(
    ld['@graph'].some((n) => n['@type'] === 'Taxon' && n.scientificName === insect.latin),
    `${insect.id} 的 JSON-LD 回读不到学名「${insect.latin}」—— 转义环节把数据弄丢了`,
  )
  /*
   * 实拍图的两道回读断言。
   *
   * 这两件事失守都是**静默**的：页面照常渲染、图照常显示、构建照常绿。
   * 第一件是许可证义务（CC 的 BY 要求署名摄影者并指明许可证），
   * 漏了不是难看，是违约；第二件是这次做壳页图的**全部理由** ——
   * license + acquireLicensePage 齐了 Google Images 才给「可授权」标记，
   * 少一个就等于白做。
   */
  if (PHOTOS[insect.id]) {
    const img = ld['@graph'].find((n) => n['@type'] === 'Taxon')?.image
    const obj = Array.isArray(img) ? img.find((x) => x && x['@type'] === 'ImageObject') : null
    assert(obj, `${insect.id}（${locale}）有实拍图，但 JSON-LD 的 Taxon.image 里没有 ImageObject`)
    assert(
      obj.license && obj.acquireLicensePage,
      `${insect.id}（${locale}）的 ImageObject 缺 license 或 acquireLicensePage —— ` +
        `Google Images 的「可授权」标记要求两者齐备，缺一个这块就白做了`,
    )
    assert(
      obj.creditText,
      `${insect.id}（${locale}）的 ImageObject 没有 creditText —— CC 的 BY 是署名要求，不是可选项`,
    )
  }

  // 静态正文注入 #root —— 见 staticBody() 的注释
  const body = staticBody(locale, insect)
  if (PHOTOS[insect.id]) {
    const p = PHOTOS[insect.id]
    assert(
      body.includes(`/photos/${insect.id}.`),
      `${insect.id}（${locale}）的静态正文里没有实拍图 —— 爬虫看不见图，这次改动就白做了`,
    )
    assert(
      body.includes(p.photographer) && body.includes('creativecommons.org'),
      `${insect.id}（${locale}）的静态图注缺摄影者或许可证链接 —— ` +
        `应用里那份图注爬虫看不见（要等 JS），静态这份必须自带完整署名`,
    )
  } else {
    assert(
      !body.includes('<figure'),
      `${insect.id}（${locale}）没有实拍图，却渲染出了 figure —— 会变成一个坏掉的 <img>`,
    )
  }
  html = replaceOnce(
    html,
    /<div id="root"><\/div>/,
    `<div id="root">${body}</div>`,
    'root 容器',
  )
  assert(
    html.includes(esc(insect.summary.slice(0, 20))),
    `${insect.id} 的壳页里没有 summary —— 静态正文注入失败，这页对爬虫又变回空的了`,
  )
  assert(
    html.includes(`<div id="root"><${SEO_ROOT_TAG} `),
    `${insect.id} 的静态正文最外层不是 <${SEO_ROOT_TAG}>、或不是 #root 的直接子元素 —— ` +
      `theme-boot.js 的「#root > ${SEO_ROOT_TAG}」会失配，真人会看见正文闪一下`,
  )
  const sibs = LISTS[locale].filter((x) => x.order === insect.order && x.id !== insect.id)
  assert(
    countSpeciesLinks(html) === Math.min(SIBLINGS, sibs.length),
    `${insect.id} 的壳页没有横向内链 —— 没有内链的壳页对不跑 JS 的爬虫是孤岛`,
  )
  // 独占一目的那四只（䗛/革翅/广翅/毛翅）同目链接本来就是 0 条，上面那条断言
  // 对它们恒真。真正要守的是「每页至少走得出去」，所以单独钉回首页那条。
  assert(
    html.includes(esc(NAV[locale].home(LISTS[locale].length))),
    `${insect.id} 的壳页没有回首页的链接 —— 爬虫进来了就出不去`,
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

// ---------- 首页：可爬正文 + 通往全部物种的内链 ----------
// 必须排在壳页生成之后 —— templates[*].html 存的是**原始**模板，壳页都从它复制；
// 这里只改写落盘的 dist/index.html，内存里的模板不动。

for (const [locale, t] of Object.entries(templates)) {
  let html = replaceOnce(
    t.html,
    /<div id="root"><\/div>/,
    `<div id="root">${staticIndex(locale)}</div>`,
    `root 容器（${locale} 首页）`,
  )
  html = replaceOnce(
    html,
    /<\/head>/,
    `${jsonLdScript(homeJsonLd(locale))}</head>`,
    `head 收尾（${locale} 首页 JSON-LD）`,
  )
  const ld = assertJsonLd(html, `${locale} 首页`)
  assert(
    ld['@graph'].some(
      (n) => n['@type'] === 'ItemList' && n.numberOfItems === LISTS[locale].length,
    ),
    `${locale} 首页的 JSON-LD 名录不是 ${LISTS[locale].length} 条 —— 列表与实际物种数脱节`,
  )
  assert(
    html.includes(`<div id="root"><${SEO_ROOT_TAG} `),
    `${locale} 首页的静态正文最外层不是 <${SEO_ROOT_TAG}> —— 同上，真人会看见它闪一下`,
  )
  const n = countSpeciesLinks(html)
  assert(
    n === LISTS[locale].length,
    `${locale} 首页应列出全部 ${LISTS[locale].length} 种，实际 ${n} 条链接 —— 首页是爬虫走到物种页的入口，漏一条就少一页`,
  )
  writeFileSync(t.file, html)
}

// ---------- sitemap.xml ----------

// ---------- lastmod ----------

/**
 * sitemap 的 `lastmod`：搜索引擎靠它决定要不要重爬。
 *
 * **绝对不能用构建时间。** 那等于每次构建都声称「这页改过了」，而多数构建
 * 根本没动内容 —— Google 明说 lastmod 一旦被判定不可信就整个忽略，
 * 于是这个字段不但没用，还会连累真正改过的那次也不被当回事。
 *
 * 用真实信号：**决定这页可爬内容的那几个文件的最后提交时间**。
 * 物种数据（`insects.*.ts`）决定正文，生成器本身决定排版与结构，
 * 两者取较晚的一个。改了别的（比如某只虫的建模代码）不会让 lastmod 动，
 * 那是对的 —— 壳页的可爬内容确实没变。
 *
 * 拿不到 git（比如从 tarball 构建）就**整个省掉 lastmod**，
 * 而不是退回构建时间去凑一个。宁可没有，不要假的。
 *
 * ⚠️ CI 的 `actions/checkout@v4` 默认浅克隆（depth 1），`git log -- <file>`
 * 多半查不到东西，于是 CI 构建出来的 sitemap 没有 lastmod。目前无害 ——
 * CI 只跑构建当检查，真正部署的产物是本地 `npm run deploy` build 的，
 * 本地有完整历史。**若哪天把部署搬进 CI，记得给 checkout 加 `fetch-depth: 0`**，
 * 否则 lastmod 会静默消失。
 */
function lastmodFor(files) {
  try {
    const times = files.map((f) =>
      execFileSync('git', ['log', '-1', '--format=%cI', '--', f], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim(),
    )
    const valid = times.filter(Boolean).sort()
    return valid.length ? valid[valid.length - 1] : null
  } catch {
    return null
  }
}

const GENERATOR = 'scripts/make-species-pages.mjs'
const LASTMOD = {
  zh: lastmodFor(['src/data/insects.zh.ts', GENERATOR]),
  en: lastmodFor(['src/data/insects.en.ts', GENERATOR]),
}
/** 根页两版内容都涉及，取较晚的 */
const LASTMOD_ROOT = [LASTMOD.zh, LASTMOD.en].filter(Boolean).sort().pop() ?? null

/** 一个 <url> 条目；物种页带 hreflang 交替引用，根页对同样适用 */
function urlEntry(loc, zhHref, enHref, lastmod) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
    `    <xhtml:link rel="alternate" hreflang="zh-Hans" href="${zhHref}"/>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${enHref}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${zhHref}"/>`,
    '  </url>',
  ].join('\n')
}

const entries = [
  urlEntry(`${SITE}/`, `${SITE}/`, `${SITE}/en/`, LASTMOD_ROOT),
  urlEntry(`${SITE}/en/`, `${SITE}/`, `${SITE}/en/`, LASTMOD_ROOT),
]
for (const { id } of ZH) {
  entries.push(urlEntry(`${SITE}/s/${id}/`, `${SITE}/s/${id}/`, `${SITE}/en/s/${id}/`, LASTMOD.zh))
  entries.push(urlEntry(`${SITE}/en/s/${id}/`, `${SITE}/s/${id}/`, `${SITE}/en/s/${id}/`, LASTMOD.en))
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
  `✓ 物种壳页 ${pages.length} 页（${ZH.length} 种 × 中英）+ 首页名录 2 页 + sitemap.xml ${entries.length} 条；` +
    `逐物种 og 图 ${speciesOg}/${ZH.length}${speciesOg < ZH.length ? '（缺的回落全站卡）' : ''}`,
)
