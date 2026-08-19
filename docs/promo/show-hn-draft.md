# Show HN 重发稿（2026-08-19）

上一次：2026-08-12，3 分 0 评论沉了。这次算合规重发的依据是**项目确实变了**——
上次没有骨架层、没有动作层、没有生活史阶段模型。HN 允许没获得关注的帖子重发一次，
但同一项目反复发不行，所以**这是最后一次**。

## 时间

**周三或周四，美东上午 8–10 点 = 北京时间 20:00–22:00。**
发完请在线一小时接评论 —— 上次 0 评论，这是唯一你能控制且真正影响结果的变量。

## 标题（二选一）

推荐：

```
Show HN: A 3D insect field guide where every specimen is generated from code
```

备选（更直给生活史那条线）：

```
Show HN: 63 insects rendered from code, including their eggs, grubs and pupae
```

URL 填 `https://insect-world.pages.dev`
（英文访客会被边缘函数按 Accept-Language 302 到 `/en/`，已实测。）

## 首评（发完立刻自己贴上去）

Author here.

Everything you see is generated in TypeScript at load time — there is not a
single .glb or .gltf in the repo. That began as a constraint (there is no
off-the-shelf asset library for 63 insect species) and turned into the
interesting part: insect morphology is regular enough to parameterize. Head,
thorax, abdomen; three pairs of legs off the thorax; limbs as tapered segmented
tubes; wing membranes stretched over radial veins. Adding a species means
writing a description of proportions and colors, not buying a model.

The payoff arrived this month. Because the geometry is parametric, the same code
that draws the adult draws the egg, the grub and the pupa — eight species have
full life-cycle models now. You can watch a monarch's wings inflate out of the
chrysalis:

https://raw.githubusercontent.com/xr843/insect-world/master/docs/promo/emerge-monarch-butterfly.gif

That one is animated as a continuous deformation because it really is one. The
caterpillar-to-butterfly transition is not (tissue histolysis plus imaginal
discs), so I deliberately did not morph it — the stages are discrete models with
designed transitions.

One problem I did not expect to have to solve: a honeybee beats its wings at
about 230 Hz, and a 60 fps display tops out at 30 Hz by Nyquist. Driving the real
number does not look fast, it aliases — the wings appear to rotate slowly
backwards, or freeze. So I compress logarithmically into 4–12 Hz, which keeps the
ordering between species intact (damselfly 18 Hz becomes 4.3, dragonfly 35 becomes
6.3, honeybee 230 becomes 11.7). The real frequencies stay in the data table; the
compression lives in one function and is labeled as the visual compromise it is.

A caveat I would rather state than have discovered: the geometry is derived from
morphological features and pinned by ~4,800 tests, but the descriptive text for
each species is AI-drafted and has not been checked line by line against
entomological literature. It is labeled as such in the app. Corrections are very
welcome.

Curious what looks wrong to anyone who actually knows these animals.

## 如果被问到「为什么不用扫描模型」

真实回答，别绕：昆虫没有现成的资产库，而且扫描件做不了变态——
一份成虫扫描件推不出蛴螬。参数化几何的代价是写实度不如扫描，
换来的是零资产依赖、任意可扩展，以及每处形态都能在代码里追溯到形态学依据。

## 如果 AI 文本被拎出来批

不辩解。已经在首评主动交代了，再补一句就够：
标注在应用里、README 里、以及 HOVERERS 那张频率表的注释里；
欢迎开 issue 报错处。**别承诺「会全部核校」——那是做不到的承诺。**
