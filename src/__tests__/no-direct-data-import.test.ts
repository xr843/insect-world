import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 界面层不许直连数据模块，必须走 LocaleProvider。
 *
 * 真机上撞出来的：App.tsx 在模块顶层写着
 * `import { INSECTS } from './data/insects.zh'`，于是英文入口界面全英文、
 * 标本却还叫「双叉犀金龟」—— Provider 明明把英文数据传进去了，没人读。
 *
 * 类型拦不住（两份数据同一个类型），parity 闸门也拦不住（它核的是数据
 * 本身，不管谁在用）。只能从「谁有权拿数据」这一层堵。
 *
 * 只有两个入口（main.tsx / main.en.tsx）与模型调试台 preview.tsx 例外，
 * 它们本来就是负责把数据喂进去的那一端。
 */
const FILES = [
  ...readdirSync('src/components')
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .map((f) => join('src/components', f)),
  'src/App.tsx',
]

const DIRECT = /from\s+'[^']*data\/(insects|guides)(\.zh|\.en)?'/

describe('界面层不得直连数据模块', () => {
  it.each(FILES)('%s', (file) => {
    const offenders = readFileSync(file, 'utf8')
      .split('\n')
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(({ line }) => DIRECT.test(line))
      .map(({ line, no }) => `${no}: ${line} —— 要走 useSpecies()`)
    expect(offenders).toEqual([])
  })
})
