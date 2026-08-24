/**
 * postdeploy：把全站页面地址通过 IndexNow 主动推给搜索引擎。
 *
 * 为什么要这个：上线 5 天，搜索引擎 referrer 合计 4 次 —— 128 页壳页对
 * 搜索引擎还基本不存在。sitemap 只是「放在那等你来读」，IndexNow 是
 * 「改了什么当场告诉你」：Bing / Naver / Seznam / Yandex 共用一个入口，
 * 提交一次全网同步。**Google 不参与该协议**，Google 侧仍靠
 * robots.txt 里的 Sitemap 行 + Search Console（后者卡在用户提交）。
 *
 * 协议就三件事：站根放一个 `<key>.txt`（内容是 key 本身，证明「提交者
 * 管得了这个站」）、POST 一份 urlList、看响应码。key 是随机生成后写死在
 * 这里的，不是秘密 —— 它只护「谁能替这个站提交」，泄露了最坏也就是
 * 别人替我们提交自己的页面。
 *
 * 挂在 postdeploy：`npm run deploy` 成功返回后自动跑，此时新产物已经在线，
 * 引擎回头抓 key 文件与页面都抓得到。重复提交同一批 URL 无害（引擎自己去重），
 * 部署本来就低频，不做增量判断。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SITE = 'https://insect-world.pages.dev'
const HOST = 'insect-world.pages.dev'
const KEY = '540008b085758f2c3f98bcf1a1980993'

function fail(msg) {
  console.error(`✗ IndexNow 提交失败：${msg}`)
  process.exit(1)
}

// ---------- 取 URL 清单：sitemap 是唯一真源，别再维护第二份 ----------

const sitemapFile = path.join(ROOT, 'dist/sitemap.xml')
let sitemap
try {
  sitemap = readFileSync(sitemapFile, 'utf8')
} catch {
  fail(`读不到 ${sitemapFile} —— 该脚本必须在 build 之后跑（它是 postdeploy）`)
}
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
if (urls.length < 4) fail(`sitemap 里只解析出 ${urls.length} 条 URL，格式变了？`)
const alien = urls.filter((u) => !u.startsWith(SITE))
if (alien.length) fail(`sitemap 里有非本站地址：${alien[0]}`)

// ---------- 先核对线上 key 文件，再提交 ----------
//
// ⚠️ 本站在 Cloudflare Pages 上踩过两次「.html 被 308 走、SPA 回落把任何
// 路径都答成 200 首页」的坑（见 scripts/make-species-pages.mjs 的部署备忘）。
// 所以不能只看状态码 —— 必须核对**内容**就是 key 本身，否则引擎验证失败，
// 整批提交静默作废。

const keyUrl = `${SITE}/${KEY}.txt`
const probe = await fetch(keyUrl)
if (probe.status !== 200) fail(`${keyUrl} 返回 ${probe.status} —— key 文件没部署上去`)
const body = (await probe.text()).trim()
if (body !== KEY) fail(`${keyUrl} 的内容不是 key（拿到 ${body.length} 字符）—— 八成是 SPA 回落页顶包了`)

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: keyUrl, urlList: urls }),
})
// 协议约定：200 提交成功，202 收到待验 key —— 都算成功
if (res.status !== 200 && res.status !== 202) {
  fail(`api.indexnow.org 返回 ${res.status}：${(await res.text()).slice(0, 200)}`)
}
console.log(`✓ IndexNow 已提交 ${urls.length} 条 URL（HTTP ${res.status}）`)
