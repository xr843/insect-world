/**
 * 解决 Node 22.4+ / Node 25+ 内置实验性 globalThis.localStorage
 * 缺少具体方法导致 jsdom 测试无法调用 getItem/setItem/clear 的问题。
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

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const mem = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', {
    value: mem,
    configurable: true,
    writable: true,
  })
}
