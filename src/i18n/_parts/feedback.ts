import { definePart } from './part'

/**
 * 点播墙与反馈表单的文案。
 *
 * 两个组件合成一片：它们共用同一个提交表单（FeedbackForm），文案上也大量
 * 互相引用（错误提示、隐私说明两处都要），拆成两片只会让改一句话要开两个文件。
 */
export const PART = definePart(
  {
    'wall.open': '大家想看什么',
    'wall.title': '大家想看什么',
    'wall.sub': '投一票，或者说点什么',
    'wall.vote': '投一票',
    'wall.voted': '已投',
    'wall.votes': '{n} 票',
    'wall.wishOwn': '我也想看…',
    'wall.featuredTitle': '编辑选了几句',
    'wall.loading': '正在取…',
    'wall.offline': '墙暂时看不了，稍后再来。',
    'wall.retry': '重试',

    'feedback.correction.open': '这里画得不对？',
    'feedback.correction.title': '这里画得不对？',
    'feedback.correction.sub': '说说哪儿不对，我去核',
    'feedback.correction.about': '关于{name}',
    'feedback.correction.placeholder': '哪儿不对？越具体越好，比如「后翅的尾突太短了」',
    'feedback.wish.title': '我也想看…',
    'feedback.wish.placeholder': '想看哪只虫，或者想要什么功能',

    'feedback.email': '邮箱',
    'feedback.emailPlaceholder': '选填，想收到回信就留一个',
    'feedback.emailHint': '只用来回信，不公开。',
    'feedback.privacy': '留言不会自动公开 —— 除非我挑出来放上墙。',
    'feedback.submit': '发送',
    'feedback.sending': '发送中…',
    'feedback.cancel': '取消',
    'feedback.thanks': '收到了，谢谢。',
    'feedback.thanksAgain': '再说一条',
    'feedback.err.invalid': '有个地方填得不对，检查一下再发。',
    'feedback.err.rate': '今天发得有点多了，明天再来吧。',
    'feedback.err.net': '没发出去。回头再试一次。',
  },
  {
    'wall.open': 'Wish wall',
    'wall.title': 'What people want to see',
    'wall.sub': 'Cast a vote, or say something',
    'wall.vote': 'Vote',
    'wall.voted': 'Voted',
    'wall.votes': '{n}',
    'wall.wishOwn': 'Something else…',
    'wall.featuredTitle': 'A few we picked',
    'wall.loading': 'Loading…',
    'wall.offline': 'The wall is unavailable right now.',
    'wall.retry': 'Retry',

    'feedback.correction.open': 'Something wrong here?',
    'feedback.correction.title': 'Something wrong here?',
    'feedback.correction.sub': "Tell us what's off and we'll check it",
    'feedback.correction.about': 'About {name}',
    'feedback.correction.placeholder':
      "What's wrong? The more specific the better — e.g. “the hindwing tail is too short”.",
    'feedback.wish.title': 'Something else…',
    'feedback.wish.placeholder': 'Which insect, or what feature, would you like to see?',

    'feedback.email': 'Email',
    'feedback.emailPlaceholder': 'Optional — leave one if you want a reply',
    'feedback.emailHint': 'Only used to reply. Never shown.',
    'feedback.privacy': "Messages aren't published automatically — only if we pick one for the wall.",
    'feedback.submit': 'Send',
    'feedback.sending': 'Sending…',
    'feedback.cancel': 'Cancel',
    'feedback.thanks': 'Got it — thank you.',
    'feedback.thanksAgain': 'Say something else',
    'feedback.err.invalid': 'Something in the form looks off. Check it and try again.',
    'feedback.err.rate': "You've sent a few already today. Try again tomorrow.",
    'feedback.err.net': "Couldn't send it. Try again later.",
  },
)
