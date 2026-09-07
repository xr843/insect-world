# 点播墙与反馈入口 — 设计

2026-09-07

## 为什么不是「留言板」

原始需求是「加个留言板块」。查完站上的实际数据后改了形状，理由是可量的：

- 近 30 天 6885 访客 / 40368 浏览，近 7 天 1184 访客（对比上一个 7 天 1079，稳住了）
- 站上三个「让访客产出点什么」的功能全是死的：`note_write` 30 天 **14 次**、
  `share_click` 69 次、`quiz_answer` 71 次
- GitHub 698 star / 59 fork，**历史总共 1 个 issue**

`note_write` = 14 是决定性的一条：笔记是**私密**的、只给自己看、零社交成本，
6885 个访客里也只有约 0.2% 动过手。公开留言要暴露、要构思、要担心说错，门槛
严格高于笔记。按这个量级推，一面公开留言墙大概率是月个位数留言。

而空的留言墙不是中性的，是负资产 —— 它替你向每个访客宣布「这儿没人」。

**破局点：投票不会空。** 点一下按钮和写一句话的门槛差两个数量级。所以「想看
哪只虫」做成一键投票，墙上永远有内容（「37 人想看蜻蜓的生活史」），人气感来自
聚合数字而不是等人写作文。

同时有个真缺口值得补：6885 人/月，想跟作者说句话的唯一通道是 footer 那个
GitHub 图标 —— 老师、家长、小孩不会开 issue。历史上唯一说上话的那个人
（issue #3，老师要实拍图）一句话就改了路线图。

## 目标

四项，用一套后端覆盖：

1. **纠错与补充** — 访客指出内容/模型的错处（对着 README 里「AI 撰写未核校」
   这个课堂采用的硬门槛）
2. **点播** — 想看哪只虫、想要什么功能
3. **公开的人气感** — 墙上有东西看
4. **一对一联系** — 能回信的通道

## 关键决策：只公开聚合数 + 人工精选

墙上默认只有投票榜；留言要作者亲手 pick 才上墙。

这条决定了审核是「可选的挑好的」而不是「必须的拦坏的」：

- 不管它也不会出事（默认不公开），没有「几天没审 → 用户以为没发出去」的债
- 垃圾只脏收件箱、不脏站
- 公开的每个字都是作者亲手放的 —— 未备案站做公开 UGC 的内容责任降到接近零

## 架构

### 选型

**Cloudflare D1 + Pages Functions + 命令行审核台。**

被否掉的：

| 方案 | 否掉的原因 |
|---|---|
| Giscus / GitHub Discussions | 访客要有 GitHub 账号；受众是老师/家长/小孩，直接出局 |
| Waline / Twikoo | 要另起托管+数据库+外部依赖；通用评论框做不了点播投票；样式对不上 |
| GitHub Issues 当后端 | 审核熟，但**投票计不了数** —— 还得另挂 KV，两套系统 |

既然投票必须有计数器，后端躲不掉，那就一次做对。

### 数据（D1，三张表）

比最初说的两张多一张：投票去重需要自己的表，塞进 `wishes` 会破坏它「一行一个
候选项」的形状。

```sql
-- 候选项：可投票的心愿，完全由作者控制
CREATE TABLE wishes (
  id         TEXT PRIMARY KEY,          -- slug，如 'lifecycle-swallowtail'
  kind       TEXT NOT NULL,             -- 'lifecycle' | 'species' | 'feature'
  title_zh   TEXT NOT NULL,
  title_en   TEXT NOT NULL,
  votes      INTEGER NOT NULL DEFAULT 0,
  listed     INTEGER NOT NULL DEFAULT 1,-- 0 = 下架，不上墙
  created_at INTEGER NOT NULL
);

-- 提交：纠错 / 自由心愿 / 随便说一句
CREATE TABLE messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  kind       TEXT NOT NULL,             -- 'correction' | 'wish' | 'note'
  species    TEXT,                      -- 物种 id（纠错必带）
  part       TEXT,                      -- 部位 key（可空）
  body       TEXT NOT NULL,
  email      TEXT,                      -- 选填
  locale     TEXT NOT NULL,             -- 'zh' | 'en'
  ip_hash    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new'-- 'new' | 'featured' | 'hidden'
);

-- 投票去重（当日粒度，见下）
CREATE TABLE votes (
  wish_id    TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (wish_id, ip_hash)
);
```

### ip_hash：按天轮换的盐

`ip_hash = sha256(SALT + CF-Connecting-IP + YYYY-MM-DD)`，SALT 来自环境变量。

按天轮换有三个好处，是刻意选的不是省事：

- **不是持久标识符** —— 隔天同一个人算出的哈希就变了，存下来也追不回人
- **限流天然按天** —— 「今天这个哈希提交过几次」就是「今天这个 IP 提交过几次」，
  不用额外存时间窗
- **投票去重也按天** —— 隔天能再投一次。这是**可接受的**：这不是选举，是排优先级
  的软信号，多一票少一票不影响判断，而换来的是不用长期保存可关联的标识

### API（三个端点）

```
GET  /api/wall?locale=zh   → { wishes: [{id,kind,title,votes}], featured: [{body,at}] }
POST /api/wish/vote        → { id }                       → { ok, votes }
POST /api/feedback         → { kind, species?, part?, body, email?, locale, website? }
                                                          → { ok }
```

`GET /api/wall` 一次取全（榜单 + 精选），不拆成两个请求 —— 墙是一次性打开的，
两个 round trip 没有收益。响应带 `Cache-Control: s-maxage=60`，让边缘扛住突发。

### 防刷（从轻，留位）

因为留言默认不公开，垃圾只脏收件箱、不脏站，所以第一版用最轻的一套：

- **蜜罐字段** `website`：非空就返回 200「成功」但丢弃（绝不告诉机器人它被识破了）
- **ip_hash 限流**：提交 5 条/天，每个候选项 1 票/天
- **长度上限**：正文 2–500 字，邮箱 ≤ 120 字

**不上 Turnstile** —— 省一个脚本、一处 CSP 改动、一个 site key。校验集中在
`src/feedback/rules.ts`，真被灌了再在那儿加一道，不用重构。

### 代码组织

逻辑全在纯函数层，Function 只做「读 Request → 调判定 → 拼 Response」的薄胶水 ——
照搬 `src/i18n/edgeLocale.ts` 与 `functions/index.ts` 已经确立的分工。

```
src/feedback/types.ts     共享类型（提交、候选项、墙数据）
src/feedback/rules.ts     纯函数：校验、限流判定、榜单排序、蜜罐识别
src/feedback/__tests__/   上面这些的单测
functions/api/wall.ts     GET 榜单+精选
functions/api/feedback.ts POST 提交
functions/api/wish/vote.ts POST 投票
```

`src/` 里放服务端代码是既有先例（`edgeLocale.ts` 就被 `functions/index.ts`
引用），Vite 不会把没人从客户端 import 的模块打进产物。

### 路由影响（必须实测）

`functions/index.ts` 里那段长注释对路由范围很在意：目前 `functions/` 下只有一个
精确匹配 `/` 的 module 路由，自动生成的 `_routes.json` 是 `{"include":["/"]}`。
加了 `functions/api/**` 之后会变成 `["/", "/api/*"]` 一类。

**这是预期的**，但必须本地 `wrangler pages dev dist` 实测确认语言分流没被影响
（带不同 `Accept-Language` curl `/`，仍要看到 302 与直出两种响应）。

### 前端

单视图 SPA，没有路由 —— Gallery / NotesPanel / Discovery 都是浮层。墙跟它们同构，
不需要新页面。

```
src/components/WishWall.tsx       浮层：榜单+投票+「我也想看…」+精选留言
src/components/FeedbackForm.tsx   复用表单：正文+选填邮箱+蜜罐+提交态
src/components/FeedbackDialog.tsx 轻量对话框，包 FeedbackForm，用于纠错
src/hooks/useWall.ts              取数/投票/提交的状态机
```

入口：

| 入口 | 位置 | 携带上下文 | 公开 |
|---|---|---|---|
| 投票点播 | WishWall，从 SiteFooter 打开 | — | 票数公开 |
| 我也想看… | WishWall 内嵌表单 | — | 默认不公开 |
| 这里画得不对？ | DetailPanel 底部一行 | 当前物种 + 当前聚焦部位 | 不公开 |
| 选填邮箱 | 两处表单共用 | — | 永不公开 |

纠错入口自动带上 `focusAnchor` / `partOfAnchor` 算出的部位 —— 「凤蝶的后翅画错了」
比「你们网站有个地方不对」有用得多，而这个上下文前端本来就握在手里。

### 降级：API 不存在时站必须完好

**这是硬约束。** D1 绑定要作者去 Cloudflare 面板点一次（Settings → Functions →
D1 bindings），在那之前 `/api/*` 全是 404。所以：

- `GET /api/wall` 失败 → 墙显示一行安静的「暂时看不了」，不报错、不白屏
- 提交失败 → 表单显示可重试的提示，不吞掉用户写的字
- 入口按钮**照常显示** —— 它们不依赖 API 可用性

这条约束也让前端可以先于绑定合并上线。

### 埋点

`src/analytics.ts` 的 `EVENTS` 加三个：

- `wish_vote`（带 `id`）
- `feedback_open`（带 `kind` = wish|correction，`source` = footer|panel）
- `feedback_submit`（带 `kind`）

两周后拿这三条跟 `note_write`(14) / `quiz_answer`(71) 对比，直接判定这块该不该留 ——
跟笔记、小测同一套验收标准，不搞例外。

### 审核台 = 命令行，没有后台页面

```
npm run inbox              列出 status='new' 的提交
npm run inbox:pick <id>    → status='featured'，上墙
npm run inbox:hide <id>    → status='hidden'
npm run inbox:promote <id> 把一条自由填的心愿升格成 wishes 候选项
```

`scripts/inbox.mjs` 底层是 `wrangler d1 execute`。没有后台页面要维护、要登录、
要防护 —— 这是「只精选上墙」这个决策换来的最大红利。

### 种子候选项

墙第一天就不能空。用现有数据填：

- 63 种里只有 **13 种**有 3D 生活史（ant / cicada / dragonfly / dung-beetle /
  firefly / honeybee / ladybird / locust / longhorn-beetle / mantis /
  monarch-butterfly / rhinoceros-beetle / silk-moth）
- 而流量前 7（帝王蝶 3156、蜜蜂 1796、螳螂 1606、瓢虫 1478、蜻蜓 1288、
  独角仙 987、蚂蚁 928）**全都已经有了** —— 高价值的生活史工作已经做完，
  「下一个补谁」现在确实是盲的，正好交给票
- 种子取「还没有 3D 生活史的次高流量物种」若干，加上「实拍对照图」（issue #3
  那个老师的诉求）、「补个新物种」、「英文版补全」

### 双语

新文案走 `src/i18n/_parts/` 的 `definePart`，zh/en 键在编译期对齐（en 少一个键
就编译不过）。候选项标题在 D1 里存 `title_zh` / `title_en` 两列，`GET /api/wall`
按 `locale` 参数挑。

## 明确不做（YAGNI）

回复盖楼、留言点赞、用户账号、富文本、头像、邮件通知、后台管理页、Turnstile。

## 验收

- 单测覆盖 `rules.ts` 全部纯函数（校验、限流、排序、蜜罐）
- `wrangler pages dev` 实测：语言分流未受影响；三个端点通
- 无 D1 绑定时前端完好（这是可测的：断掉 `/api/*` 跑一遍）
- 目视：墙在中英两版、明暗两主题、手机与桌面下都对
