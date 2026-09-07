#!/usr/bin/env node
/**
 * 反馈收件箱 —— 点播墙的全部后台功能。
 *
 * ── 为什么是命令行而不是一个后台页面 ─────────────────────────────────
 * 「留言默认不公开、只有精选的才上墙」这条产品决策，最大的红利就在这儿：
 * 审核不是必须天天干的活（不干也不会有脏东西公开），所以它不值得一个要
 * 维护、要登录、要防护的后台页面。一个读 wrangler 的脚本就够了，而且
 * 它天然只有作者本人跑得动 —— 鉴权就是那台机器上的 wrangler 凭证。
 *
 * 用法：
 *   npm run inbox                       列出待处理的提交
 *   npm run inbox -- wishes             列出候选项与当前票数
 *   npm run inbox -- pick <id>          精选上墙
 *   npm run inbox -- hide <id>          收起（垃圾、或已处理完的纠错）
 *   npm run inbox -- promote <id> <slug> <kind> <中文标题> <English title>
 *                                       把一条自由填的心愿升格成候选项
 *
 * 加 `--local` 打本地开发库（wrangler pages dev 用的那份），默认打线上。
 */
import { execFileSync } from 'node:child_process'

const DB = process.env.IW_D1 || 'insect-world'

const argv = process.argv.slice(2)
const local = argv.includes('--local')
const args = argv.filter((a) => a !== '--local')
const cmd = args[0] ?? 'list'

/**
 * SQL 字符串字面量转义。
 *
 * 这些值有两个来源：命令行参数（作者自己敲的）和数据库里的 id。都不是
 * 来自网络，但**照样要转义** —— 一个标题里的撇号（"Darwin's beetle"）
 * 就足以让语句语法错误，而那种失败看起来像是脚本坏了，不像是引号问题。
 */
const q = (v) => `'${String(v).replace(/'/g, "''")}'`

function d1(sql) {
  const out = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', DB, local ? '--local' : '--remote', '--json', '--command', sql],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
  // wrangler 会在 JSON 前面吐若干行横幅，从第一个 '[' 起才是结果
  const start = out.indexOf('[')
  if (start < 0) return []
  return JSON.parse(out.slice(start))[0]?.results ?? []
}

const stamp = (ms) => new Date(Number(ms)).toISOString().slice(0, 16).replace('T', ' ')

function list() {
  const rows = d1(
    `SELECT id, created_at, kind, species, part, body, email, locale
     FROM messages WHERE status = 'new' ORDER BY created_at DESC LIMIT 50`,
  )
  if (rows.length === 0) {
    console.log('收件箱是空的。')
    return
  }
  for (const r of rows) {
    const where = [r.species, r.part].filter(Boolean).join(' · ')
    console.log(`\n#${r.id}  ${stamp(r.created_at)}  [${r.kind}]${where ? '  ' + where : ''}`)
    // 正文缩进两格显示：多行留言不缩进的话，跟下一条的抬头会糊在一起
    console.log(
      r.body
        .split('\n')
        .map((l) => '  ' + l)
        .join('\n'),
    )
    if (r.email) console.log(`  ↩ ${r.email}`)
  }
  console.log(`\n共 ${rows.length} 条。pick 上墙 / hide 收起 / promote 升格成候选项。`)
}

function wishes() {
  const rows = d1('SELECT id, kind, title_zh, votes, listed FROM wishes ORDER BY votes DESC, created_at ASC')
  if (rows.length === 0) {
    console.log('还没有候选项。先跑 db/seed.sql。')
    return
  }
  for (const r of rows) {
    const mark = r.listed ? ' ' : '×'
    console.log(`${mark} ${String(r.votes).padStart(4)}  ${r.title_zh}  (${r.id}, ${r.kind})`)
  }
}

function setStatus(id, status) {
  if (!id) throw new Error('要给一个提交 id')
  d1(`UPDATE messages SET status = ${q(status)} WHERE id = ${q(id)}`)
  console.log(`#${id} → ${status}`)
}

function promote([id, slug, kind, titleZh, titleEn]) {
  if (!id || !slug || !kind || !titleZh || !titleEn) {
    throw new Error('用法：promote <提交 id> <slug> <lifecycle|species|feature> <中文标题> <English title>')
  }
  if (!['lifecycle', 'species', 'feature'].includes(kind)) {
    throw new Error(`kind 只能是 lifecycle / species / feature，收到 ${kind}`)
  }
  // created_at 用当前毫秒：新候选项排在同票的老项后面（sortWishes 的第二关键字），
  // 这符合「它才刚上架，还没等过」
  d1(
    `INSERT OR IGNORE INTO wishes (id, kind, title_zh, title_en, votes, listed, created_at)
     VALUES (${q(slug)}, ${q(kind)}, ${q(titleZh)}, ${q(titleEn)}, 0, 1, ${Date.now()})`,
  )
  // 这条提交已经变成候选项了，从收件箱里收起来，免得下次又看见它
  d1(`UPDATE messages SET status = 'hidden' WHERE id = ${q(id)}`)
  console.log(`#${id} → 候选项 ${slug}（${titleZh}）`)
}

try {
  if (cmd === 'list') list()
  else if (cmd === 'wishes') wishes()
  else if (cmd === 'pick') setStatus(args[1], 'featured')
  else if (cmd === 'hide') setStatus(args[1], 'hidden')
  else if (cmd === 'promote') promote(args.slice(1))
  else throw new Error(`不认识的命令：${cmd}`)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
