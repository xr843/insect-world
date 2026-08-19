# 英文侧投放手册（2026-08-19）

## 为什么现在做这件事

426 颗星里 **80% 落在北京时间 08–23 时**，引荐来源全是中文渠道（阮一峰 1120、
v2ex 88、linux.do 32、豆瓣 8）。**英语世界基本没发现这个项目。**

而转化率不是问题：14 天 2146 个独立访客 → 426 颗星，约 20%（开源项目常见 2~5%）。
看见的人愿意点，缺的只是被看见。

## 落地面已经查过，没有拦路的

| | |
| --- | --- |
| 英文访客访问根路径 | 边缘函数 302 → `/en/`，实测过 |
| `/en/` 标题 | `Insect World — an interactive 3D field guide` |
| 仓库 description | 已是英文 |
| README 顶部 | 第 3 行就有 `[English](README.en.md)` |
| 生活史入口（英文） | `See its 4 stages`，y=105 首屏可见，零页面错误 |

**链接一律指向 `https://insect-world.pages.dev`**（不要直接指 `/en/`，让边缘函数自己判；
也不要指仓库——先让人玩到东西，再让人去点星）。

---

## 排期：别同一天全投出去

同一个项目一天之内出现在四个地方，看起来就是刷。按这个节奏：

| 时间 | 动作 |
| --- | --- |
| 第 1 天 | **r/proceduralgeneration**（最贴的一枪，先打这个） |
| 第 1 天晚 | Show HN 重发（稿在 `show-hn-draft.md`，美东上午 8–10 点） |
| 第 3 天 | three.js 论坛老帖发一条更新回复 |
| 第 5 天 | r/threejs |
| 之后看情况 | r/webgl、X/Bluesky 图形圈 |

**每一发之后都要在线一小时接评论。** 这是唯一你能控制且真正影响结果的变量。

---

## 一、r/proceduralgeneration（首选）

这个社区就是干这个的，而「63 种昆虫、一个模型文件都没有、连蛴螬和蛹都是同一套
代码画的」正是它们会顶的东西。

**发帖方式：直接上传 GIF**（`docs/promo/emerge-monarch-butterfly.gif`，601 KB /
3.5 秒 / 400×667）。Reddit 里图片/视频帖的曝光远高于纯链接帖，链接放正文和首评。

**标题**

```
63 insects, every mesh generated from code at runtime — including their eggs, larvae and pupae
```

**正文**

```
I've been building an interactive 3D insect field guide where nothing is a
scanned or purchased model — every mesh is generated in TypeScript at load time.
There is not a single .glb, .gltf or texture file in the repository.

That started as a constraint (there's no off-the-shelf asset library for 63
insect species) and turned into the interesting part. Insect morphology is
regular enough to parameterize: head / thorax / abdomen, three pairs of legs off
the thorax, limbs as tapered segmented tubes, wing membranes stretched over
radial veins. Adding a species means writing a description of proportions and
colors, not modelling one.

The payoff is the clip above. Because the geometry is parametric, the same code
that draws the adult also draws the egg, the grub and the pupa — eight species
have full life-cycle models, and the wing expansion at eclosion is a real
continuous deformation. The caterpillar-to-butterfly transition is *not*
continuous in biology (tissue histolysis plus imaginal discs), so I deliberately
left that as discrete stages rather than morphing it.

One problem I didn't expect: a honeybee beats its wings at ~230 Hz and a 60 fps
display tops out at 30 Hz by Nyquist. Driving the real number doesn't look fast,
it aliases — the wings appear to rotate slowly backwards, or freeze. I compress
logarithmically into 4–12 Hz so the ordering between species survives
(damselfly 18 Hz → 4.3, dragonfly 35 → 6.3, honeybee 230 → 11.7). Real
frequencies stay in the data table; the compression is one function, labelled as
the visual compromise it is.

Live (63 species, rotate/zoom/cross-section/exploded view):
https://insect-world.pages.dev
Source, MIT: https://github.com/xr843/insect-world

Fair warning: the geometry is derived from morphology and pinned by ~4,800
tests, but the descriptive text for each species is AI-drafted and hasn't been
checked against entomological literature line by line. It's labelled as such in
the app.

Happy to go into the builder API or the rig layer if anyone's interested.
```

**首评补一张生活史长图**（`docs/promo/lifecycle-rhinoceros-beetle.png`），配一句：

```
Same species, four stages, one camera and one crop box — so the size difference
between the egg cluster and the third-instar grub is the models' own, not a
layout trick.
```

---

## 二、three.js 论坛老帖：发一条更新回复

帖子是 `discourse.threejs.org/t/93516`，08-15 发的，**已放行、公开可见，74 浏览 2 赞
0 回复**（我查过，之前记的「卡在审核」已经过期）。

顶它是诚实的：生活史和羽化是 08-18 才做出来的，发帖时还不存在。

```
Update: the guide now animates.

Eight species have full life-cycle models — egg, larva, pupa (or nymph) — built
from the same parametric code as the adult, and eclosion is animated as a real
continuous deformation:

[贴 GIF]

The rig layer turned out to be the cheap part: legs became coxa → femur → tibia
→ tarsus nested joints inside one builder function, which covered 62 of 63
species without touching any species file. Wing beat frequencies are compressed
log-scale into 4–12 Hz because 60 fps aliases anything above 30 Hz.

https://insect-world.pages.dev
```

---

## 三、r/threejs（第 5 天，别和上面撞）

侧重点换成 three.js 那一侧的工程，而不是重复讲程序化几何：

**标题**

```
Show: procedural insect field guide — 63 species, ~424 KB gzip first load, no model files
```

正文讲：按需分包（点到谁才下载谁）、`frameloop='demand'` 下按 dt 推进动画的坑
（醒来第一帧 dt 可能是几百毫秒，整段动画会被一帧吃掉）、以及 rig 层怎么在不碰
物种文件的前提下给 62/63 加上关节。

---

## 四、可以但要谨慎的

- **r/InternetIsBeautiful**（体量大，规则严，自荐容易被删）——想投就先读满规则
- **X / Bluesky 图形圈**——羽化 GIF 就是为这种场景做的，配一句「no model files」
- **Lobste.rs**——要邀请码

## 明确不建议

- 同一天多个 subreddit 齐发
- 只贴链接不上传媒体（Reddit 的算法不喜欢）
- 发完就走（没有评论的帖子会沉，而首评讲技术故事是唯一的抓手）
