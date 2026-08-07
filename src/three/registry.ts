/**
 * 物种模型注册表
 *
 * 每个物种的几何生成代码有数百行，全部静态引入会让首屏白等。
 * 这里按 id 动态 import，Vite 会为每个物种切出独立 chunk，
 * 只在用户点到它时才下载并构建。构建结果按 id 缓存，切回来时瞬时。
 */
import type { InsectModel } from './builders/kit'

type Loader = () => Promise<Record<string, unknown>>

/**
 * 用 glob 而不是逐条写 import()：物种文件按 id 命名，放进目录就自动注册。
 * 逐条写的话，任何一个文件缺失都会让 Vite 在转换期整站报错，
 * 而这里缺失只表现为「该物种未注册」，不牵连其余 11 种。
 */
const MODULES = import.meta.glob('./builders/*.ts') as Record<string, Loader>

const LOADERS: Record<string, Loader> = Object.fromEntries(
  Object.entries(MODULES)
    .map(([path, load]) => [path.replace('./builders/', '').replace(/\.ts$/, ''), load] as const)
    // kit 是工具箱不是物种；__tests__ 不会被上面的 glob 匹配到
    .filter(([id]) => id !== 'kit'),
)

const cache = new Map<string, InsectModel>()
const inflight = new Map<string, Promise<InsectModel>>()

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

/** 取得某物种的模型；重复调用返回同一个实例 */
export async function loadInsectModel(id: string): Promise<InsectModel> {
  const hit = cache.get(id)
  if (hit) return hit

  const pending = inflight.get(id)
  if (pending) return pending

  const loader = LOADERS[id]
  if (!loader) throw new Error(`未注册的物种：${id}`)

  const task = loader()
    .then((mod) => {
      const model = pickBuilder(mod)()
      cache.set(id, model)
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
