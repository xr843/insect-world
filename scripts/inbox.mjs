#!/usr/bin/env node
/**
 * 反馈收件箱 —— 纠错提交的全部后台功能。
 *
 * 点播墙 2026-09-23 撤掉后，pick / promote / wishes 三个命令随之删除；
 * 库里的 wishes / votes 两张表与已有票数原样留着，没有删数据。
 *
 * ── 为什么是命令行而不是一个后台页面 ─────────────────────────────────
 * 提交默认不公开，审核不是必须天天干的活（不干也不会有脏东西公开），
 * 所以它不值得一个要
 * 维护、要登录、要防护的后台页面。一个读 wrangler 的脚本就够了，而且
 * 它天然只有作者本人跑得动 —— 鉴权就是那台机器上的 wrangler 凭证。
 *
 * 用法：
 *   npm run inbox                       列出待处理的提交
 *   npm run inbox -- summary            一行摘要（挂在 postdeploy 上，见下）
 *   npm run inbox -- hide <id>          收起（垃圾、或已处理完的纠错）
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
  console.log(`\n共 ${rows.length} 条。处理完用 hide 收起。`)
}

/**
 * 一行摘要 —— `npm run deploy` 的 postdeploy 会调它。
 *
 * 为什么挂在部署上：这套东西**没有任何推送**，留言进库之后只有主动查才看得见。
 * 而"记得每周查一次"是最容易断的那种习惯。部署是你本来就会做、且必然在这台
 * 机器上（凭证都在这儿）的动作，把摘要贴在它后面，等于零成本地借了一个既有触发点。
 *
 * 两条硬约束：
 *
 * 1. **绝不能让部署失败。** 网络抖一下、库还没建好、凭证过期 —— 任何一种都
 *    只该让这一行摘要消失，不该让 `npm run deploy` 非零退出。所以整个函数吞掉
 *    一切异常，连报错都不打（部署日志里多一段红字，比少一行摘要糟得多）。
 * 2. **没有新留言时一个字都不说。** 每次部署都打一行"收件箱：0 条"，两周之后
 *    你就不看它了 —— 那这个提醒等于不存在。
 */
function summary() {
  let n = 0
  try {
    const rows = d1("SELECT COUNT(*) AS n FROM messages WHERE status = 'new'")
    n = rows[0]?.n ?? 0
  } catch {
    return
  }
  if (n > 0) console.log(`\n📬 收件箱 ${n} 条待处理 —— npm run inbox`)
}

function setStatus(id, status) {
  if (!id) throw new Error('要给一个提交 id')
  d1(`UPDATE messages SET status = ${q(status)} WHERE id = ${q(id)}`)
  console.log(`#${id} → ${status}`)
}

try {
  if (cmd === 'list') list()
  else if (cmd === 'summary') summary()
  else if (cmd === 'hide') setStatus(args[1], 'hidden')
  else throw new Error(`不认识的命令：${cmd}`)
} catch (err) {
  console.error(err.message)
  process.exit(1)
}
