import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * 埋点调用不许拿裸字符串当事件名，必须走 analytics.ts 里的 EVENTS 常量。
 *
 * 这是 analytics.ts 文件头承诺的「改名字只用改一个文件」能不能兑现的
 * 唯一守门员 —— TypeScript 拦不住 `track('speciess_witch', {...})` 这种
 * 手滑：裸字符串照样是合法的 `string`，编译器认不出这是打错的事件名。
 * 只能像 no-raw-keys / no-direct-data-import 那两条闸门一样，从源码文本
 * 里把「track( 后面跟的不是 EVENTS.」这一类调用点全部找出来拦住。
 *
 * 不扫 src/analytics.ts 自己：那是 track() 的**定义**处，
 * `window.umami?.track(name, data)` 里的 name 就是形参，不是事件名字面量。
 * 也不扫测试文件：测试里探测 track() 本身的防御性时需要传裸字符串
 * （见 analytics.test.ts），那不是「业务调用点」。
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const FILES = [
  ...readdirSync('src/components')
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join('src/components', f)),
  ...readdirSync('src/i18n')
    .filter((f) => f.endsWith('.tsx'))
    .map((f) => join('src/i18n', f)),
  'src/App.tsx',
]

/** 抓 `track(` 后面紧跟的第一个实参，直到下一个逗号或右括号为止 */
const CALL = /\btrack\(\s*([^,)]*)/g

describe('track() 调用点只准传 EVENTS.XXX，不许传裸字符串事件名', () => {
  it.each(FILES)('%s', (file) => {
    const src = stripComments(readFileSync(file, 'utf8'))
    const offenders: string[] = []
    const lines = src.split('\n')
    lines.forEach((line, i) => {
      CALL.lastIndex = 0
      let m: RegExpExecArray | null
      while ((m = CALL.exec(line))) {
        const firstArg = m[1].trim()
        if (firstArg && !/^EVENTS\.[A-Z0-9_]+$/.test(firstArg)) {
          offenders.push(`${i + 1}: ${line.trim()} —— 首参是「${firstArg}」，不是 EVENTS.XXX`)
        }
      }
    })
    expect(offenders).toEqual([])
  })
})
