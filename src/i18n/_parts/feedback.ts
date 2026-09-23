import { definePart } from './part'

/**
 * 实拍图署名与纠错表单的文案。
 *
 * 点播墙（wall.*、feedback.wish.*）2026-09-23 撤掉，文案一并删了。
 */
export const PART = definePart(
  {
    'photo.credit': '摄影 {name}',
    'photo.alt': '{name}的实拍照片',
    'photo.more': '更多实拍图',


    'feedback.correction.open': '这里画得不对？',
    'feedback.correction.title': '这里画得不对？',
    'feedback.correction.sub': '说说哪儿不对，我去核',
    'feedback.correction.about': '关于{name}',
    'feedback.correction.placeholder': '哪儿不对？越具体越好，比如「后翅的尾突太短了」',

    'feedback.email': '邮箱',
    'feedback.emailPlaceholder': '选填，留了我会回信（可能隔几天）',
    'feedback.emailHint': '只用来回信，不公开。',
    'feedback.privacy': '只有我看得到，不会公开。',
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
    'photo.credit': 'Photo by {name}',
    'photo.alt': 'Photograph of {name}',
    'photo.more': 'More photos',


    'feedback.correction.open': 'Something wrong here?',
    'feedback.correction.title': 'Something wrong here?',
    'feedback.correction.sub': "Tell us what's off and we'll check it",
    'feedback.correction.about': 'About {name}',
    'feedback.correction.placeholder':
      "What's wrong? The more specific the better — e.g. “the hindwing tail is too short”.",

    'feedback.email': 'Email',
    'feedback.emailPlaceholder': "Optional — leave one and I'll reply (may take a few days)",
    'feedback.emailHint': 'Only used to reply. Never shown.',
    'feedback.privacy': 'Only I will see this. It is never published.',
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
