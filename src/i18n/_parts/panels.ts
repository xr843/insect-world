import { definePart } from './part'

/**
 * CompareBar / NotesPanel / LibraryPanel 三个面板的文案。
 *
 * 三者各自独立弹出、互不重叠，所以合成一片而不是三片 —— 拆更细没有
 * 防重复收益，反而多三个文件要维护。
 */
export const PART = definePart(
  {
    'compare.current': '当前',
    'compare.comparison': '对照',
    'compare.length': '体长',
    'compare.metamorphosis': '变态',
    'compare.diet': '食性',
    'compare.switchTitle': '换一个对照物种',
    'compare.closeLabel': '关闭对比',

    'notes.title': '观察笔记',
    'notes.recordedCount': '已记录 {n} 种',
    'notes.subtitleEmpty': '记下你自己看到的东西',
    'notes.placeholder': '记下{name}的观察：什么时候、在哪儿、看到了什么',
    'notes.hint': '清空内容即删除这条笔记',
    'notes.save': '保存',
    'notes.emptyList': '还没有任何笔记。在上面写下第一条，它会一直留在这台设备上。',

    'library.title': '昆虫图鉴',
    'library.showAllTitle': '显示全部物种',
    'library.notedOnlyTitle': '只看记过笔记的（{n} 种）',
    'library.clearFilterTitle': '清除筛选',
    'library.emptyNoted': '还没有记过笔记的物种',
    'library.emptyFiltered': '这个筛选下没有物种',
    'library.viewAll': '查看全部 {n} 种',
  },
  {
    'compare.current': 'Current',
    'compare.comparison': 'Comparison',
    'compare.length': 'Length',
    'compare.metamorphosis': 'Metamorphosis',
    'compare.diet': 'Diet',
    'compare.switchTitle': 'Switch the comparison species',
    'compare.closeLabel': 'Close comparison',

    'notes.title': 'Field notes',
    'notes.recordedCount': '{n} species recorded',
    'notes.subtitleEmpty': 'Note what you observe',
    'notes.placeholder': 'Note your observations of {name}: when, where, what you saw',
    'notes.hint': 'Clearing the text deletes this note',
    'notes.save': 'Save',
    'notes.emptyList': 'No notes yet. Write the first one above — it stays on this device.',

    'library.title': 'Library',
    'library.showAllTitle': 'Show all species',
    'library.notedOnlyTitle': 'Show only noted species ({n})',
    'library.clearFilterTitle': 'Clear filter',
    'library.emptyNoted': 'No noted species yet',
    'library.emptyFiltered': 'No species match this filter',
    'library.viewAll': 'View all {n} species',
  },
)
