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
    'discovery.lifecycle.title': '{name}的一生',
    'discovery.lifecycle.stepOf': '第 {cur} / {total} 个阶段 · {type}',
    'discovery.lifecycle.onStage': '◎ 展台已换成这一阶段的立体标本',
    'discovery.lifecycle.noModel': '这一阶段还没有立体标本，展台先留着成虫',
    'discovery.stage.egg': '卵',
    'discovery.stage.larva': '幼虫',
    'discovery.stage.pupa': '蛹',
    'discovery.stage.nymph': '若虫',
    'discovery.stage.adult': '成虫',
    'discovery.lifecycle.holoNote':
      '完全变态：幼虫与成虫长得完全不同，中间要经过一个不吃不动的蛹期。',
    'discovery.lifecycle.hemiNote':
      '不完全变态：若虫就是缩小版的成虫，翅还停在「芽」的阶段，逐次蜕皮长大，没有蛹期。',

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
    'discovery.lifecycle.title': 'The life of the {name}',
    'discovery.lifecycle.stepOf': 'Stage {cur} of {total} · {type}',
    'discovery.lifecycle.onStage': '◎ The specimen on the stand is now this stage',
    'discovery.lifecycle.noModel': 'No 3D specimen for this stage yet — the adult stays on the stand',
    'discovery.stage.egg': 'Egg',
    'discovery.stage.larva': 'Larva',
    'discovery.stage.pupa': 'Pupa',
    'discovery.stage.nymph': 'Nymph',
    'discovery.stage.adult': 'Adult',
    'discovery.lifecycle.holoNote':
      'Complete metamorphosis: the larva looks nothing like the adult, and a motionless pupal stage sits between them.',
    'discovery.lifecycle.hemiNote':
      'Incomplete metamorphosis: the nymph is a small version of the adult with wings still at the "pad" stage. It moults its way up — there is no pupa.',

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
