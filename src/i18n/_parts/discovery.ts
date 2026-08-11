import { definePart } from './part'

/**
 * 讲解弹窗（Discovery）与图鉴总览（Gallery）的界面文案。
 *
 * 两者合成一片是因为体量都小、没有互相冲突的键 —— `discovery.*` 是
 * 弹窗四个变体（讲解/动态/小测/栖境）共用的壳与讲解步文案，`quiz.*`
 * 是小测题面专属，`gallery.*` 是图鉴总览弹层。
 *
 * `discovery.disclaimer` 是诚信声明，不是普通文案：讲解内容由 AI 撰写
 * 且从中文译出，未经昆虫学文献核校。中文原文与 discovery-disclaimer.test.tsx
 * 绑定，改动前先看那份测试在守什么。
 */
export const PART = definePart(
  {
    'discovery.kicker': '跟着看',
    'discovery.disclaimer':
      '讲解由 AI 撰写，未经昆虫学文献逐条核校 —— 认个形态可以，别当资料引用',
    'discovery.noContent': '这一种的讲解内容还在整理中。',
    'discovery.stepOf': '第 {cur} / {total} 步 · {name}',
    'discovery.anchorHint': '◎ 镜头已移到「{label}」',
    'discovery.back': '上一步',
    'discovery.next': '下一步',
    'discovery.done': '看完了',

    'quiz.title': '{name}小测',
    'quiz.noContent': '这一种的题目还在出。',
    'quiz.stepOf': '第 {cur} / {total} 题',
    'quiz.score': '答对 {score} / {total}',
    'quiz.back': '上一题',
    'quiz.next': '下一题',
    'quiz.finish': '结束',

    'gallery.title': '全部 {n} 种',
    'gallery.subtitle': '按目排列 · 共 {n} 个目',
  },
  {
    'discovery.kicker': 'Guided tour',
    'discovery.disclaimer':
      'Written by AI and translated from Chinese by AI; not checked against entomological literature. Fine for getting a feel for the anatomy, not a citable source.',
    'discovery.noContent': 'The write-up for this species is still being prepared.',
    'discovery.stepOf': 'Step {cur} of {total} · {name}',
    'discovery.anchorHint': '◎ Camera focused on "{label}"',
    'discovery.back': 'Back',
    'discovery.next': 'Next',
    'discovery.done': 'Done',

    'quiz.title': '{name} quiz',
    'quiz.noContent': 'Questions for this species are still being written.',
    'quiz.stepOf': 'Question {cur} of {total}',
    'quiz.score': '{score} of {total} correct',
    'quiz.back': 'Back',
    'quiz.next': 'Next',
    'quiz.finish': 'Finish',

    'gallery.title': 'All {n} species',
    'gallery.subtitle': 'Sorted by order · {n} orders total',
  },
)
