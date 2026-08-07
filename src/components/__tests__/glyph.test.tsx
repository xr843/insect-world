/**
 * InsectGlyph 自检：不引入 @testing-library / happy-dom，
 * 直接把组件当纯函数调用，检查返回的 React 元素树结构。
 */
import { describe, it, expect } from 'vitest'
import { Children, type ReactElement, type ReactNode } from 'react'
import { InsectGlyph, insectBody } from '../InsectGlyph'

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
  'swallowtail',
  'silk-moth',
  'hornet',
  'tiger-beetle',
  'stag-beetle',
  'jewel-beetle',
  'katydid',
  'mole-cricket',
  'water-strider',
  'hoverfly',
  'lacewing',
  'earwig',
  'dung-beetle',
  'weevil',
  'click-beetle',
  'diving-beetle',
  'rove-beetle',
  'flower-chafer',
  'burying-beetle',
  'tortoise-beetle',
  'hercules-beetle',
  'whirligig-beetle',
  'ground-beetle',
  'blister-beetle',
  'hister-beetle',
  'treehopper',
  'ichneumon-wasp',
  'dobsonfly',
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

// ---------------------------------------------------------------------------
// 坐标边界断言：自动抓住「坐标越界会被视窗裁掉」这个已知坑
// ---------------------------------------------------------------------------

function isElement(node: unknown): node is AnyElement {
  return typeof node === 'object' && node !== null && 'type' in node && 'props' in node
}

/**
 * 最小化地"渲染"一棵元素树：InsectGlyph 里的大部分几何图形都藏在 Pair /
 * Limb / BentLimb 这类自定义组件产出的 <g>/<rect>/<circle> 里 —— 而这些
 * 组件节点在没有真正 render 之前，type 还是函数本身、没有被展开。
 * 所以这里跟 partsOf() 不同：遇到函数类型的 type 就直接调用它、拿到它的
 * 真实输出再继续往下走，这样才能收集到每一条腿/触角最终画出的数值，
 * 而不只是最外层的 <Pair> 壳子。
 */
function collectGeometry(node: unknown, numbers: number[], dStrings: string[]): void {
  if (node == null || typeof node === 'boolean') return
  if (Array.isArray(node)) {
    node.forEach((child) => collectGeometry(child, numbers, dStrings))
    return
  }
  if (!isElement(node)) return

  const { type, props } = node

  if (typeof type === 'function') {
    collectGeometry((type as (p: Record<string, unknown>) => ReactNode)(props), numbers, dStrings)
    return
  }

  if (type === 'circle') {
    for (const key of ['cx', 'cy', 'r']) {
      const v = props[key]
      if (typeof v === 'number') numbers.push(v)
    }
  } else if (type === 'ellipse') {
    for (const key of ['cx', 'cy', 'rx', 'ry']) {
      const v = props[key]
      if (typeof v === 'number') numbers.push(v)
    }
  } else if (type === 'rect') {
    const x = props.x, y = props.y, w = props.width, h = props.height
    for (const v of [x, y, w, h]) {
      if (typeof v === 'number') numbers.push(v)
    }
    // 顺带查一下矩形右下角，抓住"宽/高把它推出边界"的情况
    if (typeof x === 'number' && typeof w === 'number') numbers.push(x + w)
    if (typeof y === 'number' && typeof h === 'number') numbers.push(y + h)
  } else if (type === 'path' && typeof props.d === 'string') {
    dStrings.push(props.d)
  }

  if (props.children != null) collectGeometry(props.children, numbers, dStrings)
}

describe('coordinate bounds', () => {
  // circle/ellipse/rect 的数值有不少其实是 Limb/BentLimb 自己的局部坐标
  // （相对锚点 translate+rotate 之后才是画布坐标），例如 Limb 内部的
  // <rect x={-width/2}> 天然带一个小负数。给 2 个单位的容差，
  // 既能盖住这类局部坐标的正常偏移，又能抓住真正离谱的越界数值
  // （比如长度多打一个 0、坐标写到视窗外面）。
  const TOLERANCE = 2
  const LO = 0 - TOLERANCE
  const HI = 24 + TOLERANCE
  const NUMBER_RE = /-?\d+\.?\d*/g

  it.each(IDS)('keeps every circle/ellipse/rect/path coordinate within canvas bounds for "%s"', (id) => {
    const numbers: number[] = []
    const dStrings: string[] = []
    collectGeometry(insectBody(id), numbers, dStrings)

    for (const d of dStrings) {
      const found = d.match(NUMBER_RE) ?? []
      numbers.push(...found.map(Number))
    }

    // 保证抽取本身没有悄悄失效（否则下面的断言会永远"通过"但什么也没查）
    expect(numbers.length).toBeGreaterThan(0)

    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(LO)
      expect(n).toBeLessThanOrEqual(HI)
    }
  })
})
