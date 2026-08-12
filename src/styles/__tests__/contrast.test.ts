/**
 * 配色对比度闸门 —— 直接读 global.css 的 token 值算 WCAG 比值。
 *
 * 为什么要有这道机器闸门：这个项目在颜色上栽过两次，两次都是「凭眼睛定、
 * 写句注释提醒自己」然后照样漂移（第 5 轮榆蓝叶甲压成近黑、第 6 轮铜绿丽
 * 金龟原样重演）。界面色同理 —— 2026-08-09 补算才发现 v1 传下来的选中态
 * 文字只有 3.46:1，一直没人发现，因为「看起来还行」。
 *
 * 所以断言的是数字不是印象。改 token 时若这里红了，先看是不是真的压线，
 * 别顺手把期望值调低。
 *
 * 覆盖范围：两套主题里**小字**（<18px，AA 需 4.5:1）与**非文字指示物**
 * （焦点环，AA 需 3:1）落在其真实背景上的最坏情况。半透明背景按实际叠加
 * 算出实色再比 —— 直接拿 token 原值比会得出偏乐观的结论。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * ⚠️ 先剥注释再解析，且选择器必须连着 `{` 一起匹配。
 * 头注释里就写着 `:root[data-theme='light']` 这串字 —— 首版用 indexOf 找它，
 * 命中的是注释而非选择器，于是「浅色主题」那一半断言量的全是暗色 token，
 * 对着已知的坏值也一路绿灯。这道闸门差点自己就是个摆设。
 */
const css = readFileSync(fileURLToPath(new URL('../global.css', import.meta.url)), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

const BLOCK: Record<'dark' | 'light', RegExp> = {
  dark: /:root\s*\{([^}]*)\}/,
  light: /:root\[data-theme='light'\]\s*\{([^}]*)\}/,
}

/** 取某个主题块里的 token 值 */
function token(name: string, theme: 'dark' | 'light'): string {
  const block = BLOCK[theme].exec(css)
  if (!block) throw new Error(`${theme} 主题的 :root 块没解析到`)
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(block[1])
  if (!m) throw new Error(`token --${name} 在 ${theme} 主题里找不到`)
  return m[1].trim()
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

/** 8 位十六进制（#rrggbbaa）的 alpha 通道，无 alpha 段则为 1 */
function alpha(hex: string): number {
  const h = hex.replace('#', '')
  return h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
}

/** 把半透明前景叠到实色底上，得到用户真正看到的那个颜色 */
function flatten(fg: string, bg: string): string {
  const a = alpha(fg)
  const [fr, fg_, fb] = rgb(fg)
  const [br, bg_, bb] = rgb(bg)
  const mix = (f: number, b: number) => Math.round(a * f + (1 - a) * b)
  return `#${[mix(fr, br), mix(fg_, bg_), mix(fb, bb)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

function luminance(hex: string): number {
  return rgb(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + [0.2126, 0.7152, 0.0722][i] * v, 0)
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)]
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

interface Case {
  what: string
  fg: string
  /** 背景自下而上：第一个是实色底，其后逐层叠加（半透明层写 token 名） */
  layers: string[]
  min: number
}

function cases(theme: 'dark' | 'light'): Case[] {
  const t = (n: string) => token(n, theme)
  const canvas = t('canvas')
  const paper = flatten(t('paper'), canvas)
  return [
    { what: '正文 --ink / 卡片面', fg: t('ink'), layers: [paper], min: 4.5 },
    { what: '正文 --ink / 页面底', fg: t('ink'), layers: [canvas], min: 4.5 },
    { what: '次级字 --muted / 卡片面', fg: t('muted'), layers: [paper], min: 4.5 },
    { what: '次级字 --muted / 页面底', fg: t('muted'), layers: [canvas], min: 4.5 },
    { what: '展签小字 --brass / 卡片面', fg: t('brass'), layers: [paper], min: 4.5 },
    { what: '展签小字 --brass / 页面底', fg: t('brass'), layers: [canvas], min: 4.5 },
    // 实物照片外链是黄铜实底按钮，靠 --on-primary 在两套主题里反向取值来保证可读；
    // 这条断言就是钉住那个「反向」——哪天有人把 --on-primary 调成中间灰就会红。
    { what: '外链按钮字 --on-primary / --brass 实底', fg: t('on-primary'), layers: [t('brass')], min: 4.5 },
    // 选中态：--active-bg 是半透明的，必须先叠到底色上再比
    {
      what: '选中字 --active-fg / 页面上的选中底',
      fg: t('active-fg'),
      layers: [canvas, t('active-bg')],
      min: 4.5,
    },
    {
      what: '选中字 --active-fg / 卡片上的选中底',
      fg: t('active-fg'),
      layers: [paper, t('active-bg')],
      min: 4.5,
    },
    { what: '危险项 --danger / 卡片面', fg: t('danger'), layers: [paper], min: 4.5 },
    /**
     * 四色标注体系里只有 --lavender 当正文用（顶栏标语 15px、卡片小标题
     * 9.5px），所以只有它按文字档 4.5:1 断言。
     * coral / sage / amber 全部是**图标与色点**（.factIcon、.noteBullet、
     * 生活史圆点、3D 热点圆点），旁边永远跟着说明文字、信息不靠颜色单独承载，
     * WCAG 对这类装饰性冗余图形不设门槛 —— 首版在这里一律断 4.5:1 是量错了
     * 对象 —— 图标与色点旁边永远有文字说明，颜色不单独承载信息。
     * ⚠️ 若哪天把这三个色用作正文，必须回到这里补断言。
     */
    { what: '标注色 --lavender / 卡片面（唯一当正文用的）', fg: t('lavender'), layers: [paper], min: 4.5 },
    // 焦点环是非文字指示物，AA 门槛 3:1（1.4.11），不是 4.5
    { what: '焦点环 --focus / 页面底', fg: t('focus'), layers: [canvas], min: 3 },
    { what: '焦点环 --focus / 卡片面', fg: t('focus'), layers: [paper], min: 3 },
  ]
}

/**
 * 元断言：先证明两套 token 真的解析成了两套。
 * 少了这条，解析一旦塌成同一个块（首版就是），下面 30 条断言会变成
 * 「把暗色量两遍」而全绿 —— 那才是最坏的情况：闸门在，但不设防。
 */
describe('主题块解析本身', () => {
  it.each(['canvas', 'ink', 'active-fg', 'brass'])('--%s 在两套主题里取到不同的值', (name) => {
    expect(token(name, 'dark')).not.toBe(token(name, 'light'))
  })
})

describe.each(['dark', 'light'] as const)('%s 主题的对比度', (theme) => {
  /**
   * --disabled 有意不在列：WCAG 1.4.3 明确豁免禁用控件，它就该看着是灰的。
   * --on-primary / --on-tone 落在动态色上，由各自组件保证，不在 token 层断言。
   */
  it.each(cases(theme))('$what ≥ $min:1', ({ fg, layers, min, what }) => {
    // token 可能写成 var(--x) 的引用（如暗色 --active-fg: var(--brass-bright)）
    const resolve = (v: string): string => {
      const ref = /var\(--([\w-]+)\)/.exec(v)
      return ref ? resolve(token(ref[1], theme)) : v
    }
    const bg = layers.map(resolve).reduce((acc, layer) => flatten(layer, acc))
    const ratio = contrast(resolve(fg), bg)
    expect(
      Number(ratio.toFixed(2)),
      `${what}：${resolve(fg)} 压在 ${bg} 上只有 ${ratio.toFixed(2)}:1，低于 ${min}:1`,
    ).toBeGreaterThanOrEqual(min)
  })
})
