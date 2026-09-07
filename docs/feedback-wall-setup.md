# 点播墙上线手册

代码合并之后，还有三步只能在 Cloudflare 面板 / 命令行手动做一次。**做完之前
前端是完好的**（墙会显示「墙暂时看不了」，纠错入口照常显示、提交时提示重试），
所以这三步不急，但没做完就一条反馈也收不到。

设计与取舍见 `superpowers/specs/2026-09-07-feedback-wall-design.md`。

## 1. 建库并绑定

```bash
npx wrangler d1 create insect-world
```

记下输出里的 `database_id`，然后去
**Cloudflare 面板 → Workers & Pages → insect-world → Settings → Functions →
D1 database bindings**，加一条：

| 变量名 | 绑定到 |
| --- | --- |
| `DB` | 刚建的 `insect-world` |

变量名必须是 `DB` —— `functions/api/*` 里读的就是 `env.DB`。

## 2. 设一个盐

同一页的 **Environment variables**，加密类型（Secret）：

| 变量名 | 值 |
| --- | --- |
| `FEEDBACK_SALT` | 随便一串长随机字符 |

`openssl rand -hex 32` 就够了。

这个盐拌进 ip_hash（`src/feedback/rules.ts` 的 `ipHashInput`）。**缺了它端点会
直接拒收**，这是故意的：没有盐的哈希等于把访客 IP 明文存进库，比少收几条反馈
严重得多。

盐可以随时换，代价只是当天的限流与投票去重重新计数。

## 3. 建表并播种

```bash
npm run db:schema   # 建三张表，可重复执行
npm run db:seed     # 九个初始候选项，可重复执行且不会清零已有票数
```

种子候选项是按 2026-09-07 的真实流量挑的（还没有 3D 生活史、但浏览量最高的
六个物种，加上三项已知诉求），理由写在 `db/seed.sql` 的注释里。

## 日常：审收件箱

```bash
npm run inbox                    # 待处理的提交
npm run inbox -- wishes          # 候选项与当前票数
npm run inbox -- pick 12         # 第 12 条精选上墙
npm run inbox -- hide 13         # 收起（垃圾，或纠错已处理完）
npm run inbox -- promote 14 lifecycle-hornet lifecycle 胡蜂的生活史 "Hornet life cycle"
```

**不审也不会出事** —— 留言默认不公开，垃圾只脏收件箱不脏站。这正是「只精选
上墙」这个决策买来的东西：审核是想干才干的活，不是每天的债。

## 两周后要回来看的三个数

Umami 里新增了 `wish_vote` / `feedback_open` / `feedback_submit`。拿它们跟站上
已有的参与类事件比：

| 事件 | 30 天量（2026-09-07 基准） |
| --- | --- |
| `note_write`（观察笔记） | 14 |
| `quiz_answer`（小测） | 71 |
| `share_click`（分享） | 69 |

`wish_vote` 如果落到 `note_write` 那个量级，说明「投票门槛远低于写字」这个前提
在这个站上不成立，该考虑撤掉而不是继续加功能 —— 跟笔记、小测同一套验收标准，
不给它开例外。
