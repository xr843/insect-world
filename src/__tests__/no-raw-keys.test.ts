import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 中立字段不许直接当文本渲染。
 *
 * 这道闸门补的是 no-hardcoded-cjk 抓不到的那一类漏：`{insect.order}`
 * 源码里没有任何中文字面量，扫描器一片干净，可页面上明晃晃写着
 * `coleoptera`。真机上一次就撞出三处（Stage 的徽章、CompareBar 的两栏），
 * 全是 Order 中立化之后忘了套显示名 —— 类型也拦不住，因为 OrderKey
 * 本身就是 string 的子类型，塞进 JSX 完全合法。
 *
 * 只禁「当子节点渲染」，不禁「当 prop 传递」：`order={insect.order}` 是
 * 正当用法（BottomCards 的 HabitatFigure 就靠它按目挑剪影），判据是
 * 花括号前面有没有等号。
 */
const RAW_RENDER = /(^|[^=])\{\s*[A-Za-z_$][\w$]*\.(order|metamorphosis)\s*\}/g
/** 模板串里同样算漏：`${insect.order} 的栖境` */
const RAW_TEMPLATE = /\$\{\s*[A-Za-z_$][\w$]*\.(order|metamorphosis)\s*\}/g

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const FILES = [
  ...readdirSync('src/components')
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join('src/components', f)),
  'src/App.tsx',
]

describe('order / metamorphosis 不得裸渲染', () => {
  it.each(FILES)('%s', (file) => {
    const src = stripComments(readFileSync(file, 'utf8'))
    const offenders = src
      .split('\n')
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(({ line }) => {
        RAW_RENDER.lastIndex = 0
        RAW_TEMPLATE.lastIndex = 0
        return RAW_RENDER.test(line) || RAW_TEMPLATE.test(line)
      })
      .map(({ line, no }) => `${no}: ${line} —— 要走 useLabels()`)
    expect(offenders).toEqual([])
  })
})
