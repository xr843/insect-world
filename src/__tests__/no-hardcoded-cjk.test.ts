import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 界面层不得残留硬编码中文。
 *
 * 这道闸门的价值不在「防止有人故意写中文」，而在**完整性**：
 * 靠正则去数该外提多少条串是数不准的（JSX 里跨行的文本节点、
 * 模板字符串、aria-label 都会漏），这里直接把漏网的行报出来当清单用。
 *
 * 注释不算 —— 源码注释保持中文是本项目的既定选择。
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const CJK = /[一-鿿]/

const FILES = [
  ...readdirSync('src/components')
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join('src/components', f)),
  'src/App.tsx',
  'src/i18n/en.ts',
]

describe('界面层不得残留硬编码中文', () => {
  it.each(FILES)('%s', (file) => {
    const offenders = stripComments(readFileSync(file, 'utf8'))
      .split('\n')
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(({ line }) => CJK.test(line))
      .map(({ line, no }) => `${no}: ${line}`)
    expect(offenders).toEqual([])
  })
})
