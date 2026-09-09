import { describe, expect, it } from 'vitest'
import {
  isAllowed,
  isCommercialOk,
  licenseLabel,
  photographerOf,
  pickPhoto,
  type RawPhoto,
} from '../photoPolicy'

/**
 * 许可证判定必须有测试，因为挑错一张图是**静默错误**：不报错、不崩、
 * 页面照常好看，直到有人来发律师函。
 */

const photo = (over: Partial<RawPhoto>): RawPhoto => ({
  id: 1,
  license_code: 'cc-by',
  medium_url: 'https://example.test/a.jpg',
  attribution: '(c) Someone, some rights reserved (CC BY)',
  ...over,
})

describe('isAllowed', () => {
  it.each(['cc0', 'cc-by', 'cc-by-sa', 'cc-by-nc', 'cc-by-nc-sa'])('放行 %s', (l) => {
    expect(isAllowed(l)).toBe(true)
  })

  it('挡掉「保留所有权利」（license_code 是 null）', () => {
    expect(isAllowed(null)).toBe(false)
    expect(isAllowed(undefined)).toBe(false)
    expect(isAllowed('')).toBe(false)
  })

  it.each(['cc-by-nd', 'cc-by-nc-nd'])('挡掉带 nd 的 %s —— 我们要缩放裁切，ND 下是灰区', (l) => {
    expect(isAllowed(l)).toBe(false)
  })

  it('大小写与空白不影响判定 —— iNat 偶尔返回不规整的值', () => {
    expect(isAllowed(' CC-BY-NC ')).toBe(true)
  })

  it('认不出的许可证一律当作不可用，而不是放行', () => {
    expect(isAllowed('cc-by-nc-nd-4.0-something')).toBe(false)
    expect(isAllowed('public-domain')).toBe(false)
  })
})

describe('isCommercialOk —— 给「本仓库是 MIT」留后路的那条线', () => {
  it('cc0 / cc-by / cc-by-sa 可商用', () => {
    for (const l of ['cc0', 'cc-by', 'cc-by-sa']) expect(isCommercialOk(l)).toBe(true)
  })

  it('带 nc 的不可商用', () => {
    for (const l of ['cc-by-nc', 'cc-by-nc-sa']) expect(isCommercialOk(l)).toBe(false)
  })
})

describe('pickPhoto', () => {
  it('优先挑商用可用的，哪怕它在 iNat 的顺序里靠后', () => {
    const out = pickPhoto([
      photo({ id: 1, license_code: 'cc-by-nc' }),
      photo({ id: 2, license_code: 'cc-by-nc-sa' }),
      photo({ id: 3, license_code: 'cc-by' }),
    ])
    expect(out?.id).toBe(3)
  })

  it('同一档之内按 iNat 的顺序 —— 那是质量代理，糊图比没图更糟', () => {
    const out = pickPhoto([
      photo({ id: 1, license_code: 'cc-by-nc' }),
      photo({ id: 2, license_code: 'cc-by-nc-sa' }),
    ])
    expect(out?.id).toBe(1)
  })

  it('一张商用的都没有时退到 NC，而不是返回空', () => {
    const out = pickPhoto([photo({ id: 9, license_code: 'cc-by-nc-sa' })])
    expect(out?.id).toBe(9)
  })

  it('全是保留所有权利 / ND 时返回 null —— 整块不显示，绝不退而求其次', () => {
    expect(
      pickPhoto([photo({ license_code: null }), photo({ license_code: 'cc-by-nc-nd' })]),
    ).toBe(null)
  })

  it('许可证合格但没有图片地址的，也不算可用', () => {
    expect(pickPhoto([photo({ license_code: 'cc0', medium_url: null })])).toBe(null)
  })

  it('空列表返回 null，不抛', () => {
    expect(pickPhoto([])).toBe(null)
  })
})

describe('photographerOf', () => {
  it('从 iNat 那串里取出姓名（原串里名字出现两次，全抄进界面又长又重复）', () => {
    expect(
      photographerOf('(c) Alejandro Lopez, some rights reserved (CC BY-NC-SA), uploaded by Alejandro Lopez'),
    ).toBe('Alejandro Lopez')
  })

  it('all rights reserved 的写法也认', () => {
    expect(photographerOf('(c) Jane Doe, all rights reserved')).toBe('Jane Doe')
  })

  it('格式不认识时原样返回整串 —— 宁可难看，不可无署名（BY 是许可条件）', () => {
    expect(photographerOf('photo by someone, CC BY')).toBe('photo by someone, CC BY')
  })

  it('空串返回空串，不抛', () => {
    expect(photographerOf(null)).toBe('')
  })
})

describe('licenseLabel', () => {
  it.each([
    ['cc0', 'CC0'],
    ['cc-by', 'CC BY'],
    ['cc-by-nc-sa', 'CC BY-NC-SA'],
  ])('%s → %s', (input, want) => {
    expect(licenseLabel(input)).toBe(want)
  })
})

describe('licenseUrl', () => {
  it('每一个允许的许可证都有对应的条款页 —— 缺了就等于署名不完整', async () => {
    const { ALLOWED_LICENSES, licenseUrl } = await import('../photoPolicy')
    const missing = ALLOWED_LICENSES.filter((l) => !licenseUrl(l))
    expect(missing).toEqual([])
  })

  it('cc0 指向 public domain 而不是 licenses 路径', async () => {
    const { licenseUrl } = await import('../photoPolicy')
    expect(licenseUrl('cc0')).toContain('publicdomain/zero')
  })

  it('认不出的返回 null —— 宁可不给链接，也不给指错条款的链接', async () => {
    const { licenseUrl } = await import('../photoPolicy')
    expect(licenseUrl('cc-by-nd')).toBe(null)
    expect(licenseUrl(null)).toBe(null)
  })
})
