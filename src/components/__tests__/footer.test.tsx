/**
 * @vitest-environment jsdom
 *
 * 页脚的源码链接。
 *
 * 这三条断言各自守一个「坏了也没人会发现」的点：
 *
 * 1. 仓库地址不写死在两处 —— 与 package.json 的 repository.url 对答案。
 *    页脚是全站唯一指向源码的出口，指错了不会报错、不会崩，只是静静地
 *    把访客送到 404；而改仓库名/账号时，没人会想起来还有个页脚要跟着改。
 * 2. target="_blank" 必须配 rel="noreferrer" —— 少了这个是 tabnabbing
 *    （新页面能用 window.opener 把原页面导走），肉眼与截图都看不出来。
 * 3. 年份取当前年，不是写死的常量 —— 写死的那种要等到跨年才露馅，
 *    而跨年那天没人在看页脚。
 */
import { screen, cleanup } from '@testing-library/react'
import { renderZh } from '../../i18n/testing'
import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SiteFooter } from '../SiteFooter'

afterEach(cleanup)

/** vitest 从仓库根跑，用工作目录定位（jsdom 下 import.meta.url 不是 file:） */
const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'))

/** "git+https://github.com/xr843/insect-world.git" → "https://github.com/xr843/insect-world" */
const repoUrl = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '')

describe('页脚', () => {
  it('GitHub 链接与 package.json 里的仓库地址一致', () => {
    renderZh(<SiteFooter />)
    expect(screen.getByRole('link', { name: /github/i }).getAttribute('href')).toBe(repoUrl)
  })

  it('外链带 rel="noreferrer"（防 tabnabbing）', () => {
    renderZh(<SiteFooter />)
    const link = screen.getByRole('link', { name: /github/i })
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noreferrer')
  })

  it('版权年份是当前年份，不是写死的', () => {
    renderZh(<SiteFooter />)
    expect(screen.getByText(new RegExp(`© *${new Date().getFullYear()}`))).toBeTruthy()
  })
})
