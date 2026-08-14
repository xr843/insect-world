import type { CSSProperties } from 'react'

const HAN = /[\u3400-\u9fff]/

/**
 * 虫名单行排版。
 *
 * 汉字的宽度就是一个字号（1em），所以「刚好排满一行的字号 = 可用宽度 ÷ 字数」。
 * 这里只把字数交给 css，除以多少由各处自己的可用宽度决定（见各 module 里的 data-fit 规则），
 * 再与设计稿字号取 min —— 短名字维持原样，只有长名字被收窄到放得下为止。
 *
 * 只对含汉字的名字生效：西文名是词组（最长「Giant Black Water Scavenger Beetle」34 个字母），
 * 同一套算法会把标题压到 14px，那还不如照常折行。
 */
export function fitName(name: string) {
  if (!HAN.test(name)) return {}
  return {
    'data-fit': true as const,
    style: { '--name-chars': name.length } as CSSProperties,
  }
}
