/**
 * InsectGlyph 自检：不引入 @testing-library / happy-dom，
 * 直接把组件当纯函数调用，检查返回的 React 元素树结构。
 */
import { describe, it, expect } from 'vitest'
import { Children, type ReactElement, type ReactNode } from 'react'
import { InsectGlyph } from '../InsectGlyph'

const IDS = [
  'rhinoceros-beetle',
  'monarch-butterfly',
  'honeybee',
  'dragonfly',
  'mantis',
  'ladybird',
  'ant',
  'cicada',
  'locust',
  'firefly',
  'longhorn-beetle',
  'stick-insect',
] as const

type AnyElement = ReactElement<Record<string, unknown>>

/** 取出某个 id 渲染出的 <svg> 顶层部件数组（每个部件对应一处身体结构/一对肢体）。 */
function svgOf(id: string): AnyElement {
  return InsectGlyph({ id }) as AnyElement
}

function partsOf(id: string) {
  const svg = svgOf(id)
  const inner = svg.props.children as AnyElement
  return Children.toArray(inner.props.children as ReactNode)
}

describe('InsectGlyph', () => {
  it.each(IDS)('renders a non-null <svg viewBox="0 0 24 24"> for "%s"', (id) => {
    const svg = svgOf(id)
    expect(svg).not.toBeNull()
    expect(svg.type).toBe('svg')
    expect(svg.props.viewBox).toBe('0 0 24 24')
  })

  it.each(IDS)('draws at least 4 body parts for "%s"', (id) => {
    const parts = partsOf(id)
    expect(parts.length).toBeGreaterThanOrEqual(4)
  })

  it('falls back to a generic (non-null) hexapod silhouette for an unknown id', () => {
    const svg = svgOf('this-insect-does-not-exist')
    expect(svg).not.toBeNull()
    expect(svg.type).toBe('svg')
    expect(svg.props.viewBox).toBe('0 0 24 24')
    const parts = partsOf('this-insect-does-not-exist')
    expect(parts.length).toBeGreaterThanOrEqual(4)
  })

  it('applies size to width/height and defaults to 24', () => {
    const defaultSize = svgOf('ant')
    expect(defaultSize.props.width).toBe(24)
    expect(defaultSize.props.height).toBe(24)

    const customSize = InsectGlyph({ id: 'ant', size: 48 }) as AnyElement
    expect(customSize.props.width).toBe(48)
    expect(customSize.props.height).toBe(48)
  })

  it('applies color to fill and defaults to currentColor', () => {
    const defaultColor = svgOf('ant')
    expect(defaultColor.props.fill).toBe('currentColor')

    const customColor = InsectGlyph({ id: 'ant', color: '#ff6600' }) as AnyElement
    expect(customColor.props.fill).toBe('#ff6600')
  })
})
