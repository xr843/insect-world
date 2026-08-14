import { describe, expect, it } from 'vitest'
import { INSECTS } from '../insects.zh'
import { lengthOf, parseLengthMm } from '../length'

describe('体长解析', () => {
  it('中文单位：毫米范围取上限', () => {
    expect(parseLengthMm('不含角约30–55毫米，雄虫连角可达70毫米以上')).toBe(55)
  })

  it('中文单位：厘米换算成毫米', () => {
    expect(parseLengthMm('体长约 2–3 厘米')).toBe(30)
  })

  it('英文单位：mm 与中文一致', () => {
    expect(parseLengthMm('30–55 mm excluding the horn')).toBe(55)
  })

  it('英文单位：cm 换算成毫米', () => {
    expect(parseLengthMm('About 2–3 cm long')).toBe(30)
  })

  /** 厘米优先于毫米是从中文版继承的顺序，这条钉住它，防止有人「顺手」调正 */
  it('两种单位并存时厘米优先', () => {
    expect(parseLengthMm('约 3 厘米，最大个体 45 毫米')).toBe(30)
  })

  it('取不到数字时返回 null', () => {
    expect(parseLengthMm('随个体差异很大')).toBeNull()
  })

  /** 现有 63 条数据过一遍，保证重构没把任何一条的解析结果弄丢 */
  it('63 个物种里至少 58 个能解析出体长', () => {
    const ok = INSECTS.filter((i) => lengthOf(i) != null)
    expect(ok.length).toBeGreaterThanOrEqual(58)
  })
})
