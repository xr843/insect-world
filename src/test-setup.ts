/**
 * 兜底的内存版 localStorage。
 *
 * 由来：Node 22.4+ / 25 内置了实验性的 Web Storage，在部分 Node 配置下它会**盖住**
 * jsdom 提供的那个，测试里一调 `getItem` 就炸（外部贡献者 PR #41 在自己机器上撞到的）。
 *
 * 两条写法上的讲究，都不是洁癖：
 *
 * 1. **探测要真的读写一遍，并且包在 try/catch 里。** 只判 `typeof localStorage`
 *    或者 `typeof localStorage.getItem` 都探不到这个故障 —— 盖住 jsdom 的那个
 *    `Storage` 方法齐全，看着完全正常，是**用**的时候才抛（启用了 webstorage 却没有
 *    可用的 `--localstorage-file` 时，连读属性本身都可能抛）。探测本身会抛的话，
 *    setupFiles 在 100 多个测试文件之前跑，整套测试会以一个毫不相干的错误全灭。
 *
 * 2. **只在有 DOM 的环境里装。** node 环境的测试本来就没有 localStorage，凭空给它
 *    加一个会悄悄废掉「服务端渲染时不该碰浏览器 API」那类断言
 *    （analytics.test.ts 里就有一条靠 `typeof window === 'undefined'` 把关的）。
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length() {
    return this.store.size
  }
  clear() {
    this.store.clear()
  }
  getItem(key: string) {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }
}

/** 走一遍真实读写；任何一步不对就算这个 localStorage 不能用 */
function usable(): boolean {
  try {
    const probe = '__insect_world_probe__'
    globalThis.localStorage.setItem(probe, '1')
    const ok = globalThis.localStorage.getItem(probe) === '1'
    globalThis.localStorage.removeItem(probe)
    return ok
  } catch {
    return false
  }
}

if (typeof window !== 'undefined' && !usable()) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  })
}
