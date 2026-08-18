# 首帧性能：分段计时与两处改动

> 2026-08-18。起因是线上实测「从导航到虫子出现在展台上 >5 秒」。
> 本文先给结论，再给可复现的方法，最后把**排除掉的方向**逐条留下 ——
> 否定性结论比正面结论更值钱，下次别再去那几个地方找。
> 方法上的规矩沿用 [docs/model-audit-notes.md](model-audit-notes.md)：
> **每轮实验自带证伪手段，先怀疑量具**。

## 结论先行

**没有一处「5 秒的元凶」。** 首帧是一条十来段的流水线，最大的一段也只占四分之一。
在**用户自己那台机器、那块 GPU、那条网络**上分段量到的账（热缓存、桌面 1920）：

| # | 段 | ms | 数据来源 |
| --- | --- | ---: | --- |
| ① | HTML 响应（TCP 握手 459 + TTFB） | ~700 | 真机 · 线上站 Navigation Timing |
| ② | `theme-boot.js`（`<head>` 里的**同步阻塞**脚本，被迫回源校验） | ~210 | 真机 · 线上站 Resource Timing |
| ③ | 应用产物从磁盘缓存读入（transferSize=0） | ~75 | 真机 · 线上站 |
| ④ | JS 解析 + 求值（1.5 MB） | ~90 | 真机 · 本地冷 origin |
| ⑤ | React 首次挂载 → WebGL 上下文就绪 | ~300 | 无头（CPU 同机） |
| ⑥ | 物种 chunk 下载 + 求值 | ~55 | 真机 |
| ⑦ | **builder 构建几何 + 运行时贴图** | **~500** | 真机（230~731，见下） |
| ⑧ | 环境立方体 + PMREM + 首次 render（着色器编译） | ~250 | 真机 |
| **∑** | **导航 → 虫子出现** | **~2.2 s** | 分段合成 |

冷缓存（首访者，也就是本站绝大多数访客）再加上 vendor chunk 的下载：
`global-*.js` 1030 KB 实测重下 **1266 ms**，合计约 **3.7 s**。

**其中 ~0.9 s（①②）在任何应用代码跑起来之前就已经花掉了**，而 ①（700 ms）
是这台机器到 Cloudflare 的握手与首字节延迟（TCP 握手一次 459 ms —— 本机走代理），
**代码改不动，如实说**。②（210 ms）能改，见下面「改动二」。

> ⚠️ 用户报的 **>5 秒我没能在他自己的机器上复现**：热缓存合成 ~2.2 s、冷缓存 ~3.7 s。
> 最可能的解释是那一次是冷缓存（vendor chunk 1266 ms）叠上 Chrome 的 **GPU 程序缓存**
> 也是冷的（首次编 8 个着色器程序实测可达 621 ms，暖了之后 190 ms）。
> 另一个不可忽略的干扰项：`analytics.fojin.app/script.js` 实测要 **1980 ms**、
> `/api/send` 要 1335~3853 ms —— 它是 `defer` 且排在应用入口之后，**不挡 3D**，
> 但会把 DOMContentLoaded 拖到 2.3~2.8 s，任何拿 DCL 当「加载完成」的读数都会被它骗到。

## 改了两处

### 改动一：首屏物种的下载与构建，提前到 React 挂载期（`src/components/Stage.tsx`）

原先 `loadInsectModel()` 挂在 `Scene` 的 effect 上，也就是排在
「React 挂载完 → r3f 量到容器尺寸 → 建 WebGL 上下文 → onCreated」**之后**。
改成 Stage 第一次渲染时就发起（`useState` 惰性初始化 + registry 自带按 id 去重）。

几何构建本身是同步的主线程活儿，提前只是换了个位置、省不掉；**省下的是 chunk 的网络
等待，外加填上了等 WebGL 上下文时的那点主线程空转**。分段表上最直观的是
「GL 就绪 → 模型就绪」这一段：

| 档位 | 改前 | 改后 |
| --- | ---: | ---: |
| 桌面热缓存 · GL 就绪→模型就绪 | 186 ms | **5 ms** |
| 移动 slow-4G 冷缓存 · 同上 | 1066 ms | **42 ms** |

### 改动二：`theme-boot.js` 给缓存（`public/_headers`）

它是 `<head>` 里的同步脚本（防主题闪变，CSP 禁内联所以必须是同源小文件），
而 Cloudflare Pages 对没被 `_headers` 命中的文件默认发
`Cache-Control: public, max-age=0, must-revalidate` —— 于是**每次访问**都要为这个
1 KB 文件付一次完整往返，真机实测 **209~216 ms**。热缓存下这一段是纯白等，
因为其余产物全在磁盘缓存里免费拿（实测 701→774 ms 全部 transferSize=0，
而 theme-boot 是 701→910）。加一条 `max-age=86400` 即可。

冷访问时它与其它资源并行，本来就不占关键路径 —— 所以这一改**只对回访者有效**，
但用户报问题的那次正是热缓存。

### 顺带：加载态从纯文字换成该物种剪影（`Stage.tsx` + `Stage.module.css`）

真实耗时压不进一秒（①②两段就 0.9 s），那就别让展台在这一秒多里**完全空着**。
用的是 `InsectGlyph.tsx` 里现成的 24×24 剪影，零新增资产，淡到 0.13~0.3 并做呼吸，
读作「标本正在显影」。首屏这一次同时取消了原来 180 ms 的延迟出场
（那 180 ms 是为「切回看过的物种是瞬时的」准备的，首屏必然要等一秒以上，不适用）。

## 改前 / 改后（无头 Chromium，同一台机器，5 轮 / 3 轮中位数）

| 档位 | 改前 | 改后 | 差 |
| --- | ---: | ---: | ---: |
| 桌面 1920 · 热缓存 | 1592 / 1669 ms | **1080 / 1342 ms** | −330 ~ −510 ms |
| 桌面 1920 · 冷缓存 | 1468 ms | **983 ms** | −485 ms |
| 移动 390 · slow-4G 冷缓存 · CPU ×4 | 5587 ms | **4848 ms** | −739 ms |

「展台上第一次出现这只虫的形状」（剪影占位）：

| 档位 | 改前（= 立体标本出现） | 改后（= 剪影出现） |
| --- | ---: | ---: |
| 桌面热缓存 | 1592 ms | **220 ms** |
| 桌面冷缓存 | 1468 ms | **155 ms** |
| 移动 slow-4G 冷缓存 | 5587 ms | **2623 ms** |

真机（用户的 Windows Chrome）上占位落在 **542 ms**（本地服务；线上站再加 ①②的
~900 ms，约 1.1 s），而立体标本此前要到 1.8~2.2 s。

## 方法（可复现）

### 应用内的分段打点：`?perf=1`

`src/perf.ts` 是一条**默认关闭**的调试通道（不带 `?perf=1` 时所有函数直接 return，
`window.__perf` 都不建，实测产物字节数不变）。打点位置：

| 打点 | 在哪 |
| --- | --- |
| `js-evaluated` / `react-render` | `src/main.tsx`（ESM 深度优先求值，走到这行说明依赖模块代码已全执行完） |
| `stage-placeholder` | `Stage.tsx`（剪影占位露面） |
| `gl-created` | `InsectCanvas.tsx` 的 `onCreated`（WebGL 上下文就绪） |
| `chunk:<id>` / `build:<id>` | `registry.ts`（chunk 下载求值 vs builder 真正构建几何，分开计时） |
| `model-ready` / `model-committed` | `InsectCanvas.tsx` |
| `postfx-import-start` / `-module-loaded` / `-render` / `-effect` | 懒加载后期管线的四个生命周期点 |
| `env-cube-render` / `pmrem-from-cubemap` | 打在 `THREE.CubeCamera.prototype.update` / `PMREMGenerator.prototype.fromCubemap` 上的补丁 |
| 每次 `gl.render` | 耗时 + **累计着色器程序数** + draw calls + 三角面 |

`window.__perf.info` 里还有一份**实际生效的渲染参数快照**（COARSE / dpr / 阴影贴图边长 /
环境贴图边长 / 首帧三角面数与程序数）—— 这是 model-audit-notes 那条「打印实际写入的
参数」的落实：拿它核对「我改的东西真的进了渲染」。

`window.__perf.debug` 是调试出口（`three` / `loadInsectModel` / `advance` / `gl` /
`scene` / `camera`），仿 `src/preview.tsx` 的 `window.__preview`。它的真正用途是
**在有真 GPU 的浏览器里做微基准**（见下一节）。

### 无头跑分段表

```bash
npm run build
npx vite preview --port 4179 --strictPort &
npm i --no-save playwright        # 不进 dependencies，同 scripts/make-og.sh 的先例
node scripts/perf-firstframe.mjs                                  # 桌面热缓存
node scripts/perf-firstframe.mjs --cold                            # 冷缓存
node scripts/perf-firstframe.mjs --mobile --net=slow4g --cpu=4     # 移动端 slow-4G
node scripts/perf-firstframe.mjs --repeat=5 --json                 # 机读
```

### ⚠️ WSL 的无头 Chromium 没有 GPU

实测四种 backend（`--use-angle=swiftshader / gl / vulkan / 默认`）拿到的全是
SwiftShader 或 llvmpipe，**都是软件渲染**。后果不是「慢一点」，是**结论会反过来**：

- `@react-three/postprocessing` 在 `useMemo` 里调 `isWebGL2Available()`（它会新建一个
  WebGL2 上下文探测），SwiftShader 下 **1650 ms**，真 GPU 上 **11 ms** ——
  第一版 CPU profile 里它是最大的一项，纯属幻觉。
- 着色器编译、PMREM、首次 draw 同理，绝对值只能当上界看。

所以 GPU 那几段的数字**全部取自真机**：把本地构建产物用
`npx vite preview --host` 起在 0.0.0.0，让 Windows 侧的 Chrome 打开
`http://localhost:<port>/?perf=1`，再从 `window.__perf` 读。
CPU 与网络那几段无头与真机可比，用无头做 A/B（轮次多、可复现）。

### ⚠️ 后台标签页里 r3f 根本不挂载

README「踩过的坑」那条在这里又撞了一次，而且更隐蔽：隐藏标签页没有
requestAnimationFrame，**ResizeObserver 的回调也不来**（它属于「更新渲染」这一步），
于是 r3f 量不到容器尺寸、永不建上下文 —— 表现是 `gl-created` 打点在 18 秒后才出现
（被节流到 1 Hz 的定时器兜住的），或者干脆不出现。
绕过办法：`window.dispatchEvent(new Event('resize'))` 手动唤醒，
再用 `window.__perf.debug.advance(performance.now())`（r3f 的 `advance`）手动顶帧。
注意这样得到的**绝对时刻没有意义**，只有「gl-created 之后各段的相对耗时」可用。

## 排除掉的方向（否定性结论，别再去这几处找）

**① `<Environment resolution={512}>` 的 PMREM 不是大头。** 真 GPU 实测：
六面立方体渲染 512² 首次 38.5 ms（含着色器编译）、之后 6.7 ms；256² 首次 15.1 ms、
之后 6.4 ms。PMREM 生成 40~94 ms。**降到 256 只省 ~23 ms**，而代价是金属鞘翅与
薄膜虹彩的反射细节 —— 不值。手机端维持 256 的现状是对的。

**② 2048 阴影贴图不是大头。** 512/2048 与 256/1024 两档在同一场景上稳态帧
11 ms vs 15 ms，差在噪声里；首次 render 621 vs 574 ms，同样是编译主导、与贴图边长无关。

**③ three vendor 再切没有路。** sourcemap 归属：1023 KB 里 three 占 **671 KB**、
react-dom + react-reconciler 占 239 KB。three 摇不动树 —— r3f 的 `extend(THREE)`
要把整个命名空间对象传进去，rollup 无从静态分析。唯一的死重是 drei 的 `Environment`
顺带拖进来的 `EXRLoader` / `RGBELoader` / `@monogrid/gainmap-js` / `fflate` /
`GroundProjectedEnv` 共 **~45 KB（4%）**（我们只用内联 Lightformer，一个都用不上）。
要拿掉就得自己写 cube-camera 版的 Environment，收益 4% —— 记在这里，不在本轮做。

**④ 延后挂 PostFX 换不来首帧。** 直觉是「后期管线拖慢了首帧」，实测不成立：
首帧本来就只编 8 个程序（`info.firstFramePrograms=8`），composer 的 9 个特效程序
是在首帧**之后**才编的（实测 ~70 ms）。把 PostFX 推后只省掉 composer 的 3 次
setup pass（~34 ms），代价是那 8 个材质程序要按「直出」与「HDR 离屏目标」两种
输出各编一遍 —— 总编译量反而变大，还多一次画面跳变。

**⑤ 拆 `insects.zh`（156 KB）救不了首帧。** 它与其它 chunk 并行下载，热缓存下
transferSize=0；关键路径上它只占约 10% 的字节，而字节从来不是热缓存那 2.2 s 的主项。

**⑥ builder 的「30~90 ms」只对第二只之后成立。** 真机实测：第一只
（双叉犀金龟）**230~731 ms**，之后每只 33~103 ms（星天牛 57 / 七星瓢虫 103 /
帝王蝶 50 / 西方蜜蜂 33）。差额是一次性的：`surface.ts` / `eyes.ts` 那批全局共享的
程序化 CanvasTexture 首次生成 + kit 的 JIT 冷启动。所以首帧看到的是最贵的那一只，
而 README 里的 30~90 ms 是稳态值 —— 两个数都对，别拿稳态值去估首帧。

## 量具自己的两个 bug（都被证伪手段抓住了）

`docs/model-audit-notes.md` 说「诊断脚本自己的 bug 会生产一堆假数据」，这轮又中两次：

1. **同一个 page 反复 `goto`**，上一页的 SwiftShader 线程还没退场就开下一轮，
   把新页面的主线程饿着 —— `js-evaluated` 在三轮里读出 **63 / 4570 / 7154 ms**。
   同一份产物同一台机器差 100 倍，一眼是量具坏了。改成每轮开新 context 并留 1.5 s
   退场时间后，稳定在 39~75 ms。另外 `vite preview` 对每个 chunk 的**首次**请求要现做
   压缩，会把物种 chunk 读成 800~8800 ms —— 加了一轮不计数的预热（`--warmup`）。
2. **首帧判据用「模型就绪后的下一次 render」**，而环境立方体那六面各算一次 render
   （只有 134 个三角面），于是算出「首帧早于模型就绪」的**负数段**。
   改成「模型就绪后第一次画到 >2000 三角面的那次 render」（最小的淡色库蚊也有 13,308 面），
   并把命中那帧的三角面数与程序数写进 `info` 自证。

第三个坑不属于量具但同样致命：**限速档位下静态服务器必须压缩**。
不压的话 slow-4G 上量到的是 1.5 MB 而不是 430 KB，`② JS 网络+解析+求值`
读成 7728 ms（真值 2124 ms），整条结论会跟着跑偏。

## 还剩什么可做（按收益排）

1. **冷访问的 1030 KB vendor**（实测重下 1266 ms，slow-4G 上 2.1 s）。没有干净的切法，
   除非换掉 r3f 或接受 4% 的 drei 死重清理。
2. **React 首次挂载 ~300 ms**（63 条名录 + 63 个 SVG 剪影一次性进 DOM）。
   要动 `LibraryPanel` / `App`，本轮不在范围内。
3. **builder 首只 230~731 ms**。真正的大头在 `kit.ts` / `surface.ts` / `eyes.ts`
   的一次性贴图生成，等骨架化那轮手术之后再看。
4. `theme-boot.js` 若改成带内容哈希的产物名，可以直接上 `immutable`，省掉那一天一次的校验。
