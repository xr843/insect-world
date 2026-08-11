# 中英双语设计（insect-world）

日期：2026-08-11
状态：已批准，待实施

## 目标

让海外访客能完整使用这个站。当前全站只有中文：界面 2 千字、图鉴内容 7.2 万字
（`insects.ts` 31,291 汉字 + `guides.ts` 40,937 汉字，60 个物种 × 14 个字段，
外加每种一套讲解 3–4 步、动态演示、2 道测验、栖境）。

## 已定的四个决策

| 决策 | 选择 |
| --- | --- |
| 范围 | **全站全量**——界面 + 全部 60 种的图鉴文案、讲解、测验 |
| 形态 | **切换制**，一次只显一种语言（不做中英并置） |
| URL | **路径前缀 `/en/`**，且是构建期产出的独立 HTML |
| 语域 | **博物馆导览风、术语双标**——`Beetles (Coleoptera)`、`head horn (cephalic horn)` |
| 根地址行为 | **不自动跳转**，非中文浏览器显一条可关闭的 `View in English →` |

## 架构：平行数据文件 + 对等性闸门

两份内容形状完全一致的数据文件，共用一套类型；结构一致性由测试保证，
而不是由类型嵌套保证。

选它而不是「字段内嵌 `{zh, en}`」：后者虽然编译期就能防漏译，但要重写
全部 60 条记录的结构，diff 覆盖 34 万字符，所有消费点跟着改；而它的收益
用对等性测试同样能拿到。

选它而不是「英文覆盖层 + 回退中文」：既然是全量翻译，渐进上线的优点用不上；
而「回退」会把漏译伪装成正常页面，反而削弱闸门。

## 一、语言中立化（前置重构）

三处中文字面量正在当逻辑键用，必须先解耦。这一步**中文版的界面呈现零变化**，
单独成一个提交。

验收标准要说准确：不是「3129 个测试原样通过」——少数用例直接断言了中文目名
（`insects.test.ts` 的「order 覆盖了全部 14 个目」「鞘翅目物种数为 28」等），
它们必须同步改成断言 key。**除这类断言外，不得有任何测试因这次重构而改动**；
改了别的就说明行为变了，要停下来查。

| 现在 | 改成 |
| --- | --- |
| `Order = '鞘翅目' \| …`（14 个） | `OrderKey = 'coleoptera' \| …` |
| `metamorphosis: '完全变态' \| '不完全变态'` | `'complete' \| 'incomplete'` |
| `TopBar` 搜索里 `i.order.includes(q)` | 改为匹配当前语言的目显示名 |

`Fact.icon`、`Hotspot.tone`、`Hotspot.anchor` 已是中立枚举，不动。

14 个目的英文显示名（术语双标）：

| key | zh | en |
| --- | --- | --- |
| `coleoptera` | 鞘翅目 | Beetles (Coleoptera) |
| `lepidoptera` | 鳞翅目 | Butterflies & Moths (Lepidoptera) |
| `hymenoptera` | 膜翅目 | Bees, Wasps & Ants (Hymenoptera) |
| `odonata` | 蜻蜓目 | Dragonflies & Damselflies (Odonata) |
| `mantodea` | 螳螂目 | Mantises (Mantodea) |
| `orthoptera` | 直翅目 | Grasshoppers & Crickets (Orthoptera) |
| `hemiptera` | 半翅目 | True Bugs (Hemiptera) |
| `diptera` | 双翅目 | Flies (Diptera) |
| `neuroptera` | 脉翅目 | Lacewings (Neuroptera) |
| `dermaptera` | 革翅目 | Earwigs (Dermaptera) |
| `megaloptera` | 广翅目 | Dobsonflies & Alderflies (Megaloptera) |
| `blattodea` | 蜚蠊目 | Cockroaches & Termites (Blattodea) |
| `trichoptera` | 毛翅目 | Caddisflies (Trichoptera) |
| `phasmatodea` | 䗛目 | Stick & Leaf Insects (Phasmatodea) |

## 二、数据层

```
src/data/
  types.ts          类型，两语言共用（单一份）
  insects.zh.ts     ← 现 insects.ts 改名，内容除中立化外不变
  insects.en.ts     新增
  guides.zh.ts      ← 现 guides.ts 改名，内容不变
  guides.en.ts      新增
```

`order`、`metamorphosis`、`accent`、`latin`、`hotspot.anchor/tone/id`、
`fact.icon`、`quiz.answer` 这些中立字段在两份里取值必须相同，由闸门 1 保证。

## 三、界面层

`src/i18n/{zh,en}.ts` 两份扁平字典。`en` 的类型声明为
`Record<keyof typeof zh, string>`——漏一个键编译不过。

12 个组件与 `App.tsx` 不再持有任何中文字面量，全部通过 `useT()` 取串。
带数量的串用 `{n}` 占位符做简单插值。

数据与字典的注入走 `LocaleProvider`：`main.tsx`（中）与 `main.en.tsx`（英）
各自静态 import 自己那份 locale 的数据与字典，渲染同一个 `<App/>`。
App 与所有组件对语言无感知。

### 语言切换

顶栏 `[中|EN]`，直接跳 `/` ↔ `/en/`，并带上当前物种：`/en/?s=rhinoceros-beetle`。
**两个入口都读 `?s=`**（不只英文版）：命中已知物种则作为初始选中项，
否则忽略并保持默认首个物种，不报错、不清空地址栏。
理由：读到第 40 种切语言回到第一种体验很差；顺带让物种链接可分享。

### 语言提示条

浏览器 `navigator.language` 非 `zh*` 且当前在 `/`，顶部显示可关闭的
`View in English →`；在 `/en/` 且浏览器语言是 `zh*` 时反向显示「查看中文版 →」。
关闭状态存 localStorage，不再打扰。不做任何自动跳转。

## 四、构建与 SEO

- 新增 `en/index.html`：`lang="en"`、英文 title/description/og、
  `og:image` 指向 `/og-en.png`
- 两份 HTML 互挂 `hreflang`（`zh-Hans`、`en`、`x-default` 指中文版）
  与各自的 `canonical`
- `vite.config.ts` 入口加 `en: 'en/index.html'`；Rollup 自动分包，
  中文访客不下载任何英文数据
- `/en/` 只请求 Playfair Display，不请求 Noto Serif SC（少一个字体请求）
- `make-og.sh` 加英文变体产出 `og-en.png`；英文卡不需要中文字体，
  绕开脚本对 `/mnt/c/Windows/Fonts` 的依赖
- `public/_redirects` **不需要**——本站没有客户端路由，真实路径只有 `/`
  和 `/en/`，Pages 直接把 `en/index.html` 服务在 `/en/`
- `robots.txt` 不动（`Allow: /` 已覆盖 `/en/`）
- `_headers` 的 CSP 不动（不引入任何新外部源）

## 五、闸门与测试

现有 `src/data/__tests__/` 那套闸门（60 条记录、facts 恰好 6 条、hotspot
anchor 必须在该物种允许集合内、summary 50–140 字、trivia 与 summary 最长
公共子串 < 12 字、quiz 选项互不重复……）**参数化到两个 locale 各跑一遍**，
英文的长度阈值单独标定：按英文字符数，初值取中文阈值 ×1.7
（summary 50–140 汉字 → 85–240 字符；trivia 30–90 → 50–155），
第一批翻译产出后按实际分布收紧，不沿用汉字阈值。

新增四道闸门：

1. **对等性**：两份数据的 id 列表逐位相同；每物种的 hotspot anchor 集合、
   facts 的 icon 序列、quiz 正确答案下标、`accent`、`latin`、`order`、
   `metamorphosis`、`lifecycle` 阶段数——全部逐项相等。
2. **数字保真**：从中文 `facts`、`summary`、`trivia` 抽出所有数字串
   （`30–55`、`8–10`、`70` 等），必须在英文对应字段中原样出现。
   这是 AI 翻译最容易出错的地方。
3. **无中文残留**：扫描 `src/components/*.tsx`、`src/App.tsx`、
   `src/i18n/en.ts`，除注释外不得出现 CJK 字面量。防漏改。
4. **字典完整性**：`en` 覆盖 `zh` 全部键（编译期已保证，再补一道运行时
   测试，防止有人用 `as` 绕过）。

### AI 声明

英文版声明要说两件事：文案由 AI 撰写、且由 AI 从中文翻译。
现有 `discovery-disclaimer.test.tsx` 复制一份跑英文版。
`SiteFooter`、README 同步。

## 六、实施顺序

翻译天然可并行，但**术语表必须先定**，否则各 agent 各译各的
（`elytra` / `wing cases` 混用）。

1. **中立化重构**（串行）：`OrderKey`、`metamorphosis` 枚举、搜索改造。
   验收：3129 个现有测试原样通过。
2. **i18n 骨架 + 闸门**（串行）：`LocaleProvider`、`useT()`、两份字典、
   `en` 入口与 HTML、数据文件改名。四道新闸门先写，此时应当是红的。
   同时产出**术语表**（部位名、生活史阶段、变态类型、6 类 fact 键名、
   常用句式），作为下一阶段 agent 的输入契约。
3. **内容翻译**（并行 agent）：60 个物种切批，每批一个 agent，
   输入 = 中文数据片段 + 术语表 + 体例约束，输出 = `insects.en.ts` /
   `guides.en.ts` 的对应片段。验收靠闸门，不靠逐条人读。
4. **合并与收敛**（串行）：拼合、跑全部闸门、修红。
5. **界面与外围**（串行）：12 个组件的字符串外提、提示条、`og-en.png`、
   README 英文段。
6. **真机核验**：在真实 Chrome 里打开 `/` 与 `/en/` 两版实际点一遍，
   不只跑测试。

## 不做的事

- 不做中英并置显示
- 不做自动语言跳转
- 不做第三种语言的预留抽象（YAGNI，需要时再抽）
- 不给英文版单独设计视觉主题，两版共用现有的「博物馆之夜」/「标本台」
- 不翻译源码注释
