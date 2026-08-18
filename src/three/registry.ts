/**
 * 物种模型注册表
 *
 * 每个物种的几何生成代码有数百行，全部静态引入会让首屏白等。
 * 这里按 id 动态 import，Vite 会为每个物种切出独立 chunk，
 * 只在用户点到它时才下载并构建。构建结果按 id 缓存，切回来时瞬时。
 */
import type * as THREE from 'three'
import type { InsectModel } from './builders/kit'
import { pspan, ptrack } from '../perf'

type Loader = () => Promise<Record<string, unknown>>

/**
 * 用 glob 而不是逐条写 import()：物种文件按 id 命名，放进目录就自动注册。
 * 逐条写的话，任何一个文件缺失都会让 Vite 在转换期整站报错，
 * 而这里缺失只表现为「该物种未注册」，不牵连其余 11 种。
 */
const MODULES = import.meta.glob('./builders/*.ts') as Record<string, Loader>

/**
 * 工具模块：与物种文件同住 builders/ 目录，但不是物种。
 * glob 分不出这两类，全靠这份名单 —— 新增工具文件必须在此登记，
 * 否则它会被当成「幽灵物种」注册进来，layers.test.ts 的孤儿检查会立刻抓住
 * （surface.ts / eyes.ts 落地当天就被抓过一次）。
 *
 * ⚠️ 导出是为了让那条孤儿检查 import 这一份，而不是自己再抄一份。
 * 抄一份的后果实测过（2026-08-09 变异测试）：从这里删掉 'venation' 后
 * venation.ts 被当成物种注册，而测试因为自己那份名单里也有 'venation'
 * 照样全绿 —— 守卫被它要守的东西的副本挡住了。
 */
export const UTILITY_MODULES = new Set(['kit', 'surface', 'eyes', 'venation'])

const LOADERS: Record<string, Loader> = Object.fromEntries(
  Object.entries(MODULES)
    .map(([path, load]) => [path.replace('./builders/', '').replace(/\.ts$/, ''), load] as const)
    // __tests__ 不会被上面的 glob 匹配到
    .filter(([id]) => !UTILITY_MODULES.has(id)),
)

/**
 * 已构建模型的 LRU 缓存。
 *
 * 原先只进不出：逐只翻完 50 种（方向键就是这么用的），50 套几何体全部
 * 留在显存里，每套约 2~3MB —— 桌面机无所谓，手机上是白占一百多兆。
 * 上限取 12：当前那只、对比对象、hover 预热的邻居都稳稳落在「最近用过」里，
 * 正在渲染的模型绝不会被清（它必然是最新触碰的）。
 * 逐出时要手动 dispose —— three.js 的几何体与材质握着 GPU 资源，
 * 不 dispose 只断引用，显存照样占着。
 */
const MAX_LIVE = 12
const cache = new Map<string, InsectModel>()
const inflight = new Map<string, Promise<InsectModel>>()

/** Map 按插入序遍历；重新插入 = 挪到队尾（最近使用） */
function touch(id: string, model: InsectModel): void {
  cache.delete(id)
  cache.set(id, model)
}

function evictStale(): void {
  while (cache.size > MAX_LIVE) {
    const oldest = cache.entries().next().value
    if (!oldest) return
    const [id, model] = oldest
    cache.delete(id)
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) mat.dispose()
    })
  }
}

/** 仅供测试观察缓存规模 */
export function cacheStats(): { size: number; ids: string[] } {
  return { size: cache.size, ids: [...cache.keys()] }
}

/** 从模块里挑出那个 buildXxx 函数 —— 各文件导出名不同，按前缀找 */
function pickBuilder(mod: Record<string, unknown>): () => InsectModel {
  for (const [key, val] of Object.entries(mod)) {
    if (key.startsWith('build') && typeof val === 'function') {
      return val as () => InsectModel
    }
  }
  throw new Error('模块中没有找到 build* 导出')
}

/**
 * 该物种的建模文件是否真的被打包进来了。
 *
 * import.meta.glob 在**构建期**解析，所以这个判断反映的是产物里到底有没有
 * 这个模型。界面据此过滤，避免列出一个点开只会转圈的物种 —— 数据层和建模层
 * 分别由不同的人/agent 推进，两边进度不同步是常态，不能指望它们永远一致。
 */
export function isKnownSpecies(id: string): boolean {
  return id in LOADERS
}

/**
 * 产物里全部已注册的物种 id（按字母序）。
 *
 * 给模型调试台用：它要列出的是**所有存在的建模文件**，而不是图鉴数据里的物种。
 * 两者不一样 —— 新物种总是先有模型后有数据，调试台若跟着数据走，
 * 新做的模型反而看不到，而目视验收恰恰是新模型最需要的一关。
 */
export function knownSpecies(): string[] {
  return Object.keys(LOADERS).sort()
}

/** 取得某物种的模型；重复调用返回同一个实例 */
export async function loadInsectModel(id: string): Promise<InsectModel> {
  const hit = cache.get(id)
  if (hit) {
    touch(id, hit)
    return hit
  }

  const pending = inflight.get(id)
  if (pending) return pending

  const loader = LOADERS[id]
  if (!loader) throw new Error(`未注册的物种：${id}`)

  // 两段分开计时：chunk 下载+求值 vs builder 真正构建几何（默认关闭，见 src/perf.ts）
  const task = ptrack(`chunk:${id}`, loader())
    .then((mod) => {
      const model = pspan(`build:${id}`, () => pickBuilder(mod)())
      cache.set(id, model)
      evictStale()
      inflight.delete(id)
      return model
    })
    .catch((err) => {
      inflight.delete(id)
      throw err
    })

  inflight.set(id, task)
  return task
}

/** 预热：鼠标悬停在图鉴列表项上时提前把 chunk 拉下来 */
export function prefetchInsectModel(id: string): void {
  if (cache.has(id) || inflight.has(id) || !LOADERS[id]) return
  void loadInsectModel(id).catch(() => {
    /* 预热失败无所谓，真正选中时会再试一次并显示错误 */
  })
}
