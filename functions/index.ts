import { decideLocaleRedirect } from '../src/i18n/edgeLocale'

/**
 * Cloudflare Pages Function —— 只挂在根路径 `/` 上，按 Accept-Language 把
 * 明显非中文的访客送去 `/en/`。判定逻辑全部在 `../src/i18n/edgeLocale.ts`
 * （纯函数、有单测），这里只是"读 Request 头 → 调判定 → 拼 Response"的
 * 薄胶水，故意不在这个文件里加逻辑分支。
 *
 * ————————————————————————————————————————————————————————————————
 * 为什么是 functions/index.ts 而不是 functions/_middleware.ts
 * ————————————————————————————————————————————————————————————————
 * Pages Functions 用文件路径直接映射路由（读过 wrangler 4.51.0 的源码
 * src/pages/functions/filepath-routing.ts 编译产物确认，而不是猜官方文档）：
 *
 *   - `index.ts` 导出 onRequestGet → 生成一条 method=GET、routePath="/" 的
 *     **module** 路由，只精确匹配 "/" 这一个路径；
 *   - `_middleware.ts` 会生成同样 mountPath="/" 但类型是 **middleware** 的
 *     路由 —— middleware 路由在转成 _routes.json 的 include 规则时会被强制
 *     拼上 "/*"（见 convertRoutesToGlobPatterns：只有 middleware 才补
 *     "/*"，module 路由原样保留 routePath），也就是会拦下**每一个**请求，
 *     包括每个 JS/CSS/图片资源。
 *
 * 也就是说 index.ts 天生只匹配 "/"，根本不需要在函数里手写
 * `if (pathname !== '/') return next()` 兜底 —— 别的路径压根不会调用到
 * 这个函数（Cloudflare 在边缘路由层就按自动生成的 _routes.json 短路掉了，
 * 不是"进了函数再判断早退"，是"根本不派发"）。这是本任务里"路由范围要
 * 最窄"这条要求的最优解，比 _middleware.ts 开头 return next() 更彻底。
 *
 * 没有手写 public/_routes.json 覆盖它：_routes.json 是每次部署时从
 * functions/ 的文件树重新生成的（deploy2() 里只有当 dist/_routes.json
 * 已存在时才会跳过自动生成、改用现成的那份），只要 functions/ 下只有这一个
 * 精确匹配 "/" 的路由，自动生成的结果就始终是 {"include": ["/"]}，手写一份
 * 反而多一处要跟着改的地方。
 *
 * ————————————————————————————————————————————————————————————————
 * 为什么 `npm run deploy`（wrangler pages deploy dist ...）不用改
 * ————————————————————————————————————————————————————————————————
 * 部署命令上传的是 dist/，functions/ 在仓库根、不在 dist/ 里 —— 这一点
 * 曾让人怀疑 functions 会不会根本没被打包上去。实测 + 读源码结论：**不用
 * 改**。wrangler 的 pages deploy 命令（src/pages/deploy.ts 编译产物,
 * wrangler-dist/cli.js 里 deploy2() 函数）里这一行是关键：
 *
 *   const functionsDirectory = customFunctionsDirectory
 *     || path.join(process.cwd(), "functions")
 *
 * functionsDirectory 默认值是 `process.cwd() + "/functions"`，是相对于
 * **执行 wrangler 命令时的当前工作目录**，跟被部署的目录参数（这里是
 * "dist"）完全无关。`npm run deploy` 是在仓库根跑的，process.cwd() 就是
 * 仓库根，`functions/` 正好在那儿，会被自动发现、用 esbuild 打包进
 * _worker.js 一起上传 —— 全程不需要 `--functions-directory`、不需要挪
 * 目录、不需要改 package.json 的 deploy 脚本。
 *
 * 本地用 `npx wrangler pages dev dist` 复验过这条链路（起服务后 curl `/`
 * 带不同 Accept-Language，能看到 302 与直出两种响应），过程见 PR 描述。
 */

interface PagesFunctionContext {
  request: Request
  next: () => Promise<Response>
}

export const onRequestGet = async ({ request, next }: PagesFunctionContext): Promise<Response> => {
  const decision = decideLocaleRedirect({
    acceptLanguage: request.headers.get('Accept-Language'),
    userAgent: request.headers.get('User-Agent'),
    cookie: request.headers.get('Cookie'),
  })

  if (decision === 'redirect-en') {
    // 302 不是 301：语言偏好这东西会变（换浏览器、加拿大用户想看中文版…），
    // 用永久重定向会被浏览器/中间代理缓存死，之后改判定也救不回来。
    return new Response(null, {
      status: 302,
      headers: {
        Location: '/en/',
        // 响应内容随 Accept-Language 变化，必须声明 Vary，否则 CDN /
        // 中间代理可能把某一种语言的响应缓存下来发给所有人。
        Vary: 'Accept-Language',
      },
    })
  }

  // 不分流：把请求交回静态资源管线（会经过 public/_headers 里的安全头、
  // 缓存策略），只在返回前补一个 Vary —— 这份 "/" 的 200 响应同样是按
  // Accept-Language 算出来的（只是算出的结果是"不跳转"），下游缓存如果
  // 不知道这一点，可能把这份中文响应缓给下一个本该被分流的英文访客。
  const resp = await next()
  const withVary = new Response(resp.body, resp)
  withVary.headers.set('Vary', 'Accept-Language')
  return withVary
}
