/**
 * 字典分片的定义器。
 *
 * 全站文案按「哪几个组件用」切成若干片，各片一个文件 —— 这样多路并行
 * 外提文案时不会所有人都去改同一个 zh.ts。zh.ts / en.ts 只负责把分片
 * 拼起来。
 *
 * 用函数而不是裸对象，是为了拿到**编译期**的对齐保证：en 少一个键、
 * 多一个键、拼错一个键，都会在这里报错，不用等运行时闸门。
 */
export function definePart<Z extends Record<string, string>>(
  zh: Z,
  en: Record<keyof Z, string>,
): { zh: Z; en: Record<keyof Z, string> } {
  return { zh, en }
}
