# 点播墙的线上配置

**2026-09-08 已全部配好，这份文档留作记录与排障。** 设计与取舍见
`superpowers/specs/2026-09-07-feedback-wall-design.md`。

## 现状

| 项 | 值 |
| --- | --- |
| D1 库 | `insect-world`（APAC，`ae238cb7-429a-469c-8b78-fb0f937278c5`） |
| 绑定 | `DB` → 上面那个库，**写在仓库的 `wrangler.toml` 里**，生产与预览各一份 |
| 密钥 | `FEEDBACK_SALT`，生产与预览各一个不同的随机值 |
| 表 | `wishes` / `messages` / `votes`，已建 |
| 候选项 | 9 条，票数全 0（`db/seed.sql`） |

## 三个只有实操才撞得出来的坑

### 1. `pages_build_output_dir` 不写，`wrangler.toml` 里的绑定会被**静默忽略**

只写 `[[env.production.d1_databases]]` 而不写 `pages_build_output_dir`，
`wrangler pages deploy` **不报任何错**，照常部署成功 —— 但部署出来的
`env.DB` 是 `undefined`，端点一律回 503 `unconfigured`。

wrangler 是靠这一行判断"这份配置是给 Pages 项目的"；缺了它整个文件被当作
Workers 配置处理，`env.production` 那一段就没人读。

排障线索：端点返回 `{"error":"unconfigured"}` 而不是 HTML —— 说明 Function
部署成功、路由正常，**只是拿不到绑定**。

### 2. 密钥是**部署时**注入的，设完必须重新部署

`wrangler pages secret put` 成功之后，**已经在线上的那个部署仍然读不到它**。
实测：设完 preview 的 `FEEDBACK_SALT`，直接打预览 URL 仍是 `unconfigured`，
重新 `pages deploy` 一次才好。

所以顺序必须是**先设密钥、后部署**。反过来就要多部署一次。

### 3. `npm run deploy` 不用改

`wrangler.toml` 里已有 `pages_build_output_dir = "dist"`，而 deploy 脚本又在
命令行传了位置参数 `dist` —— 实测**不冲突**，原命令原样可用，绑定照样带上。
（验的办法：部署到 `--branch=wall-binding-test` 这种预览分支，curl 它的
`/api/wall` 看返回的是候选项还是 `unconfigured`。预览分支不碰生产。）

## 重建 / 迁移时的完整步骤

```bash
npx wrangler d1 create insect-world          # 记下 database_id 填进 wrangler.toml
npm run db:schema                            # 建表，可重复执行
npm run db:seed                              # 播种，可重复执行且不清零已有票数
openssl rand -hex 32 | npx wrangler pages secret put FEEDBACK_SALT --project-name=insect-world
openssl rand -hex 32 | npx wrangler pages secret put FEEDBACK_SALT --project-name=insect-world --env preview
npm run deploy                               # 密钥要这一步之后才生效
```

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
