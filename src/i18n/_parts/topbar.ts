import { definePart } from './part'

/** TopBar 组件（顶栏：品牌、主导航、分类下拉、搜索、主题切换、观察记录菜单）的文案 */
export const PART = definePart(
  {
    'nav.explore': '探索',
    'nav.orders': '分类',
    'nav.lessons': '课程',
    'nav.library': '图鉴库',
    'nav.notes': '笔记',

    'brand.tagline': '像博物学家一样观察',

    'orders.all': '全部',

    'theme.toLight': '切换到浅色主题',
    'theme.toDark': '切换到深色主题',
    'theme.light': '浅色 · 纸感图鉴',
    'theme.dark': '深色 · 博物馆之夜',

    'search.placeholder': '搜索昆虫、目、特征…',
    'search.noResults': '没有找到「{query}」',

    'account.observationLog': '观察记录',

    'notes.recorded': '已记录 {n} 种',
    'notes.empty': '还没有观察笔记',
    'notes.open': '打开笔记',
    'notes.copyMarkdown': '复制为 Markdown',
    'notes.clear': '清空笔记',

    'library.allCount': '全部 {n} 种',
    'rail.surprise': '换一只看看',
  },
  {
    'nav.explore': 'Explore',
    'nav.orders': 'Orders',
    'nav.lessons': 'Lessons',
    'nav.library': 'Library',
    'nav.notes': 'Notes',

    'brand.tagline': 'Observe like a naturalist',

    'orders.all': 'All',

    'theme.toLight': 'Switch to the light theme',
    'theme.toDark': 'Switch to the dark theme',
    'theme.light': 'Light · Specimen Tray',
    'theme.dark': 'Dark · Museum at Night',

    'search.placeholder': 'Search species, orders, features…',
    'search.noResults': 'No results for "{query}"',

    'account.observationLog': 'Observation log',

    'notes.recorded': 'Recorded {n} species',
    'notes.empty': 'No field notes yet',
    'notes.open': 'Open field notes',
    'notes.copyMarkdown': 'Copy as Markdown',
    'notes.clear': 'Clear notes',

    'library.allCount': 'All {n} species',
    'rail.surprise': 'Surprise me',
  },
)
