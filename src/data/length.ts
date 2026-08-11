import type { Insect } from './types'

/**
 * 从「体长 30–55 毫米」「Length 30–55 mm」这类描述里取出毫米数，取上限值。
 *
 * 放在 data 层而不是组件里：它解析的是**数据**不是界面文案，两种语言的
 * facts 都要过它。也因此必须同时认中英文单位 —— 英文数据写的是 mm / cm。
 *
 * 厘米优先于毫米，这是从中文版原样继承的顺序，别调 —— 一条描述里两种
 * 单位并存时（「约 3 厘米，最大个体 45 毫米」），先匹配到哪个决定取值。
 */
export function parseLengthMm(text: string): number | null {
  const cm = /([\d.]+)\s*(?:[–\-~至])?\s*([\d.]+)?\s*(?:厘米|cm)/i.exec(text)
  const mm = /([\d.]+)\s*(?:[–\-~至])?\s*([\d.]+)?\s*(?:毫米|mm)/i.exec(text)
  const pick = (m: RegExpExecArray, scale: number) => {
    const hi = m[2] ? parseFloat(m[2]) : parseFloat(m[1])
    return Number.isFinite(hi) ? hi * scale : null
  }
  if (cm) return pick(cm, 10)
  if (mm) return pick(mm, 1)
  return null
}

export function lengthOf(insect: Insect): number | null {
  const f = insect.facts.find((x) => x.icon === 'size')
  return f ? parseLengthMm(f.value) : null
}
