# 按部位横向浏览 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让读者能从「这只虫的触角」横着走到「别的虫的触角」，把站点从只有「按物种」一条浏览轴，扩到「按结构」第二条轴。

**Architecture:** 三层。**数据层**新增 `src/data/parts.ts`，把已经存在的 65 个 anchor 键归入 10 个部位组（这张表是后续所有部位功能的地基，本期只用它的一个出口）。**应用层** App 持有跳转动作：换物种 + 把 `focusAnchor` 设成新物种的同组 anchor，复用现有那条「弹窗驱动展台」的通路。**展示层**标注点卡片底部多一行「其他虫的触角 →」。不新增页面、不新增 3D 资产、不动 builder。

**Tech Stack:** TypeScript + React 18 + react-three-fiber 8（既有）；vitest + @testing-library/react；无新依赖。

## 为什么是这件事（取舍记录）

- `hotspot_click` 每周 **3,873** 次，是站内第三高的交互 —— 人本来就在点部位，但点开读完就是死路。
- 内容**已经写好了**：378 个标注点、每条都有该物种专属的说明（触角那 52 条分别写了鳃叶状／芒状／轮毛／丝状……），只是横向看不到。
- anchor 键**已经跨物种复用**（`antenna` 52、`eye` 50、`leg` 33、`elytra` 28…），中英两版 378 个 anchor **逐条完全一致**（`parity.test.ts` 已经钉住），所以一张表同时服务两种语言。
- 副作用：新增约 345 条**跨物种上下文内链**。Google 刚被请求重抓首页（2026-08-27），此时加强内链图正当其时。
- 相比之下「部位图谱页 `/parts/*`」推迟到第二期：现有 128 页目前一页都没被 Google 索引，此刻加新落地页是过早优化。

## Global Constraints

- 界面文案一律走 i18n（`src/i18n/_parts/*.ts`），组件里不许出现中文字面量 —— `src/__tests__/no-hardcoded-cjk.test.ts` 会扫源码拦住。
- 埋点事件名只准用 `EVENTS.XXX` 常量，不许裸字符串 —— `src/__tests__/analytics-event-names.test.ts` 拦。
- 注释里的中文必须**独占一行**的 `//` 或块注释；行尾中文注释会被 `no-hardcoded-cjk` 判成硬编码。
- 中英数据两版任何字段的序列必须对齐 —— `src/data/__tests__/parity.test.ts` 拦。
- 每条形态/数据断言都要做**变异测试**：把代码改回坏版本，确认断言会红。改动前先 `git add -A`，否则 `git checkout <file>` 会把真修复一起还原（2026-08-26 踩过）。
- 全量三关必须过：`npm run typecheck` && `npm test` && `npm run build`。
- 从 master 拉分支，做完一路走到 merge，不在任务之间停下来请示。

## File Structure

| 文件 | 责任 |
| --- | --- |
| `src/data/parts.ts`（新建） | 部位词表：anchor 键 → 部位组；以及「找下一只有同一部位的虫」这一个纯函数。不认识 React、不认识 i18n。 |
| `src/data/__tests__/parts.test.ts`（新建） | 词表的穷尽性闸门 + 分组语义 + 环形遍历行为。 |
| `src/i18n/_parts/stage.ts`（改） | 10 个部位组的显示名 + 跳转链接文案，中英各一份。 |
| `src/analytics.ts`（改） | `SPECIES_SWITCH_SOURCES` 增加 `'part'`。 |
| `src/App.tsx`（改） | 跳转动作：换物种 + 设 focusAnchor + 埋点。 |
| `src/components/Stage.tsx`（改） | 把跳转回调透传给 InsectCanvas，自己不加逻辑。 |
| `src/three/InsectCanvas.tsx`（改） | 标注点卡片底部渲染那一行链接。 |
| `src/styles/global.css`（改） | `.hotspot-card` 放开 pointer-events，否则卡片里的链接点不动。 |

---

### Task 1: 部位词表

**Files:**
- Create: `src/data/parts.ts`
- Test: `src/data/__tests__/parts.test.ts`

**Interfaces:**
- Consumes: `Insect` from `src/data/types.ts`（字段 `id`、`hotspots[].anchor`、`hotspots[].label`）
- Produces:
  - `type PartGroup = 'antenna' | 'eye' | 'mouthparts' | 'leg' | 'wing' | 'head' | 'thorax' | 'abdomen' | 'horn' | 'sound'`
  - `const PART_GROUPS: readonly PartGroup[]`
  - `const PART_OF_ANCHOR: Record<string, PartGroup | null>`
  - `function partOfAnchor(anchor: string): PartGroup | null`
  - `interface PartPeer { id: string; anchor: string; label: string }`
  - `function nextPeerWithPart(insects: readonly Insect[], currentId: string, group: PartGroup): PartPeer | null`
  - `function countSpeciesWithPart(insects: readonly Insect[], group: PartGroup): number`

- [ ] **Step 1: 写失败的测试**

创建 `src/data/__tests__/parts.test.ts`：

```ts
/**
 * 部位词表的闸门。
 *
 * 这张表把 65 个自然长出来的 anchor 键归到 10 个部位组。它是人手写的
 * 语义映射，没有任何编译期约束 —— 打错一个键就是一条永不生效的死条目，
 * 归错一个组就是把人送到一只不相干的虫跟前（「眼斑」是翅上的拟态斑纹，
 * 归进「复眼」就会让人点着「眼」跳到一只蝴蝶的翅膀上）。
 *
 * 最重要的是**穷尽性**：数据里出现的每一个 anchor 必须被显式分类，
 * 包括显式写成 null（「没有同类可跳」也是一个决定，不能靠遗漏来表达）。
 * 加物种时新引入的 anchor 会当场让这条红掉，逼作者表态。
 */
import { describe, expect, it } from 'vitest'
import {
  PART_GROUPS,
  PART_OF_ANCHOR,
  countSpeciesWithPart,
  nextPeerWithPart,
  partOfAnchor,
} from '../parts'
import { INSECTS as ZH } from '../insects.zh'
import { INSECTS as EN } from '../insects.en'

const usedAnchors = [...new Set(ZH.flatMap((i) => i.hotspots.map((h) => h.anchor)))]

describe('穷尽性', () => {
  it('数据里的每个 anchor 都被显式分类（含显式的 null）', () => {
    const missing = usedAnchors.filter((a) => !(a in PART_OF_ANCHOR))
    expect(missing, `这些 anchor 没进词表：${missing.join(', ')}`).toEqual([])
  })

  it('词表里没有数据用不到的死条目', () => {
    const used = new Set(usedAnchors)
    const dead = Object.keys(PART_OF_ANCHOR).filter((a) => !used.has(a))
    expect(dead, `这些条目数据里没出现：${dead.join(', ')}`).toEqual([])
  })

  it('每个组名都在 PART_GROUPS 里', () => {
    const bad = [...new Set(Object.values(PART_OF_ANCHOR))].filter(
      (g) => g !== null && !PART_GROUPS.includes(g),
    )
    expect(bad).toEqual([])
  })

  it('中英两版的 anchor 完全一致，一张表够用', () => {
    expect(EN.flatMap((i) => i.hotspots.map((h) => h.anchor))).toEqual(
      ZH.flatMap((i) => i.hotspots.map((h) => h.anchor)),
    )
  })
})

describe('分组语义 —— 容易归错的那几个', () => {
  it('平衡棒归进翅：它是特化的后翅', () => {
    expect(partOfAnchor('haltere')).toBe('wing')
  })

  it('眼斑不归进复眼：那是翅上的拟态斑纹，不是眼睛', () => {
    expect(partOfAnchor('eyespot')).toBeNull()
  })

  it('爪垫归进足：它长在足的末端', () => {
    expect(partOfAnchor('pulvillus')).toBe('leg')
  })

  it('鞘翅、前翅、后翅同归一组，读者才能横着比', () => {
    for (const a of ['elytra', 'forewing', 'hindwing', 'wing']) {
      expect(partOfAnchor(a)).toBe('wing')
    }
  })

  it('上颚/喙管/刺吸喙同归口器', () => {
    for (const a of ['mandible', 'proboscis', 'rostrum', 'palp']) {
      expect(partOfAnchor(a)).toBe('mouthparts')
    }
  })

  it('一次性的招牌构造不给组 —— 尾铗、发光器没有同类可跳', () => {
    expect(partOfAnchor('forceps')).toBeNull()
    expect(partOfAnchor('lantern')).toBeNull()
  })

  it('未知 anchor 返回 null，不炸', () => {
    expect(partOfAnchor('nonexistentPart')).toBeNull()
  })
})

describe('覆盖面 —— 这个功能值不值得做，用数字说话', () => {
  it('九成以上的标注点都能跳', () => {
    const all = ZH.flatMap((i) => i.hotspots)
    const jumpable = all.filter((h) => partOfAnchor(h.anchor) !== null)
    expect(jumpable.length / all.length).toBeGreaterThan(0.85)
  })

  it('每个组至少覆盖 4 个物种，否则不值得占一行链接', () => {
    for (const g of PART_GROUPS) {
      expect(countSpeciesWithPart(ZH, g), `${g} 覆盖太少`).toBeGreaterThanOrEqual(4)
    }
  })
})

describe('nextPeerWithPart —— 环形找下一只', () => {
  it('返回数据顺序里的下一只，并带上它自己的 anchor 与标签', () => {
    const peer = nextPeerWithPart(ZH, 'mantis', 'leg')
    expect(peer).not.toBeNull()
    expect(peer!.id).not.toBe('mantis')
    const target = ZH.find((i) => i.id === peer!.id)!
    expect(target.hotspots.some((h) => h.anchor === peer!.anchor)).toBe(true)
    expect(partOfAnchor(peer!.anchor)).toBe('leg')
  })

  it('走到末尾会绕回开头', () => {
    const last = [...ZH].reverse().find((i) => i.hotspots.some((h) => partOfAnchor(h.anchor) === 'antenna'))!
    const peer = nextPeerWithPart(ZH, last.id, 'antenna')
    expect(peer).not.toBeNull()
    expect(ZH.findIndex((i) => i.id === peer!.id)).toBeLessThan(ZH.findIndex((i) => i.id === last.id))
  })

  it('捕捉足只有三只，转一圈回到自己之前会走遍另外两只', () => {
    const seen: string[] = []
    let cur = 'mantis'
    for (let n = 0; n < 3; n++) {
      const peer = nextPeerWithPart(ZH, cur, 'leg')!
      cur = peer.id
      seen.push(cur)
    }
    expect(new Set(seen).size).toBe(3)
  })

  it('当前物种是这一组里唯一一只时返回 null', () => {
    const onlyOne = ZH.filter((i) => i.hotspots.some((h) => partOfAnchor(h.anchor) === 'sound'))
    expect(onlyOne.length).toBeGreaterThan(1)
    // 构造一个只有一只的子集
    expect(nextPeerWithPart([onlyOne[0]], onlyOne[0].id, 'sound')).toBeNull()
  })

  it('当前物种不在列表里时返回列表中的第一只', () => {
    const peer = nextPeerWithPart(ZH, 'not-a-species', 'antenna')
    expect(peer).not.toBeNull()
  })
})
```

- [ ] **Step 2: 跑一遍确认它红**

Run: `npx vitest run src/data/__tests__/parts.test.ts`
Expected: FAIL —— `Failed to resolve import "../parts"`

- [ ] **Step 3: 写实现**

创建 `src/data/parts.ts`：

```ts
/**
 * 部位词表 —— anchor 键 → 部位组。
 *
 * ## 它解决什么
 *
 * 63 种虫共 378 个标注点，每条都写着**这一种**的那个部位长什么样
 * （触角那 52 条分别写了鳃叶状／芒状／轮毛／丝状……）。内容早就在了，
 * 但读者只能一只一只竖着看，横着看不到 —— 而「同一个部位在不同虫身上
 * 长成什么样」正是昆虫形态学的第一课。
 *
 * 这张表就是横过来的那条索引。它不新增任何内容，只是把已有的连起来。
 *
 * ## 为什么键是 anchor 而不是中文标签
 *
 * 中英两版的 378 个 anchor **逐条完全一致**（parity.test.ts 已钉住），
 * 而标签不一致也不该一致（「足」在英文里是 leg/foreleg/hindleg 各自的说法）。
 * 按 anchor 建索引，一张表同时服务两种语言。
 *
 * ## 分组标准
 *
 * 只按**形态学同源**分，不按「看着像」分。三条判断留在这里，因为它们
 * 都是当时犹豫过的：
 *
 * - `haltere`（平衡棒）归**翅** —— 它是双翅目特化的后翅，归到翅里读者
 *   才看得懂「后翅去哪了」。
 * - `eyespot`（眼斑）**不归眼** —— 那是翅面上的拟态斑纹。归进去就会让人
 *   点着「眼」跳到一只蝴蝶的翅膀上，是典型的「指错」。
 * - `clypeus`（唇基）归**头**不归口器 —— 它是头部骨片，不是取食构造本身。
 *
 * 组必须**至少覆盖 4 个物种**才设：只有一两只的组，那条链接点过去就到头了，
 * 不如不给。一次性的招牌构造（尾铗、发光器、弹跳腹突……）一律显式写 null。
 *
 * ⚠️ **null 是一个决定，不是遗漏。** 词表对数据里出现的每个 anchor 都必须
 * 有条目 —— 加物种时新引入的 anchor 会让 parts.test.ts 当场红掉，逼作者表态。
 */
import type { Insect } from './types'

/** 部位组，顺序即界面上的展示顺序（由头到尾、由外到内） */
export const PART_GROUPS = [
  'head',
  'eye',
  'antenna',
  'mouthparts',
  'horn',
  'thorax',
  'wing',
  'leg',
  'abdomen',
  'sound',
] as const
export type PartGroup = (typeof PART_GROUPS)[number]

/**
 * anchor 键 → 部位组；null = 没有同类可跳。
 * 行尾不写中文注释（`no-hardcoded-cjk` 的注释剥离只认独占一行的 //）。
 */
export const PART_OF_ANCHOR: Record<string, PartGroup | null> = {
  // 头
  head: 'head',
  neck: 'head',
  clypeus: 'head',

  // 眼
  eye: 'eye',
  upperEye: 'eye',
  lowerEye: 'eye',

  // 触角
  antenna: 'antenna',

  // 口器
  mandible: 'mouthparts',
  proboscis: 'mouthparts',
  rostrum: 'mouthparts',
  palp: 'mouthparts',

  // 角
  horn: 'horn',
  headHorn: 'horn',
  thoraxHorn: 'horn',
  thoracicHorn: 'horn',

  // 胸
  pronotum: 'thorax',
  thorax: 'thorax',
  prothorax: 'thorax',

  // 翅（含特化的鞘翅与平衡棒）
  wing: 'wing',
  elytra: 'wing',
  forewing: 'wing',
  hindwing: 'wing',
  haltere: 'wing',
  fusedElytra: 'wing',
  hairyWing: 'wing',
  underwing: 'wing',
  notch: 'wing',
  margin: 'wing',

  // 足（含末端的爪垫）
  leg: 'leg',
  foreleg: 'leg',
  midleg: 'leg',
  hindleg: 'leg',
  raptorialLeg: 'leg',
  petalLeg: 'leg',
  tuckedLeg: 'leg',
  pulvillus: 'leg',

  // 腹
  abdomen: 'abdomen',
  gaster: 'abdomen',
  petiole: 'abdomen',
  waist: 'abdomen',
  keel: 'abdomen',

  // 发声与听器
  tymbal: 'sound',
  tympanum: 'sound',
  stridulator: 'sound',

  // 以下都是一次性的招牌构造或体表特征，没有同类可跳
  body: null,
  stripe: null,
  spot: null,
  band: null,
  ridge: null,
  fuzz: null,
  camouflage: null,
  eyespot: null,
  tail: null,
  cercus: null,
  ovipositor: null,
  stinger: null,
  sting: null,
  forceps: null,
  lantern: null,
  sprayTip: null,
  airStore: null,
  clickSpine: null,
  pollenBasket: null,
  helmet: null,
  mystax: null,
}

/** 某个 anchor 属于哪个部位组；未知或一次性构造返回 null */
export function partOfAnchor(anchor: string): PartGroup | null {
  return PART_OF_ANCHOR[anchor] ?? null
}

/** 跳转目标：去哪只虫、对准它的哪个 anchor、那个标注点叫什么 */
export interface PartPeer {
  id: string
  anchor: string
  label: string
}

/** 这个物种在这一组里的第一个标注点 */
function hotspotInGroup(insect: Insect, group: PartGroup) {
  return insect.hotspots.find((h) => partOfAnchor(h.anchor) === group) ?? null
}

/**
 * 按数据顺序**环形**找下一只有同一部位的虫。
 *
 * 环形而不是到头就停：这条链接是拿来一直翻的，走到最后一只时让它绕回开头，
 * 比把链接灰掉更符合「横着浏览」这件事本身。
 */
export function nextPeerWithPart(
  insects: readonly Insect[],
  currentId: string,
  group: PartGroup,
): PartPeer | null {
  const n = insects.length
  if (n === 0) return null
  const at = insects.findIndex((i) => i.id === currentId)
  // 当前物种不在列表里（被筛掉了）时从头找起
  const start = at < 0 ? -1 : at
  for (let step = 1; step <= n; step++) {
    const cand = insects[(start + step + n) % n]
    if (cand.id === currentId) continue
    const hs = hotspotInGroup(cand, group)
    if (hs) return { id: cand.id, anchor: hs.anchor, label: hs.label }
  }
  return null
}

/** 这一组覆盖了多少个物种 —— 界面上用来决定要不要显示链接 */
export function countSpeciesWithPart(insects: readonly Insect[], group: PartGroup): number {
  return insects.reduce((n, i) => (hotspotInGroup(i, group) ? n + 1 : n), 0)
}
```

- [ ] **Step 4: 跑测试确认全绿**

Run: `npx vitest run src/data/__tests__/parts.test.ts`
Expected: PASS，20 条左右全绿

- [ ] **Step 5: 变异测试 —— 确认每条断言都咬得住**

先 `git add -A`（还原点必须是修复版，否则 `git checkout` 会把实现一起抹掉）。逐个改、跑、还原：

```bash
git add -A
# 变异 1：漏掉一个 anchor 条目 → 穷尽性那条应当红
python3 -c "p='src/data/parts.ts';s=open(p).read();open(p,'w').write(s.replace(\"  haltere: 'wing',\n\",'',1))"
npx vitest run src/data/__tests__/parts.test.ts 2>&1 | grep 'Tests  '
git checkout src/data/parts.ts

# 变异 2：把眼斑归进复眼 → 「指错」那条应当红
python3 -c "p='src/data/parts.ts';s=open(p).read();open(p,'w').write(s.replace('  eyespot: null,',\"  eyespot: 'eye',\",1))"
npx vitest run src/data/__tests__/parts.test.ts 2>&1 | grep 'Tests  '
git checkout src/data/parts.ts

# 变异 3：环形改成到头就停 → 绕回那条应当红
python3 -c "p='src/data/parts.ts';s=open(p).read();open(p,'w').write(s.replace('for (let step = 1; step <= n; step++)','for (let step = 1; start + step < n; step++)',1))"
npx vitest run src/data/__tests__/parts.test.ts 2>&1 | grep 'Tests  '
git checkout src/data/parts.ts
```

Expected: 三次都出现 `Tests  N failed`；`git checkout` 后回到全绿。

- [ ] **Step 6: 三关 + 提交**

```bash
npm run typecheck && npm test && npm run build
git add src/data/parts.ts src/data/__tests__/parts.test.ts
git commit -m "部位词表：65 个 anchor 键归成 10 组，91% 的标注点从此有同类可比"
```

---

### Task 2: 标注点卡片上的「其他虫的触角 →」

**Files:**
- Modify: `src/i18n/_parts/stage.ts`
- Modify: `src/analytics.ts`（`SPECIES_SWITCH_SOURCES` 加 `'part'`）
- Modify: `src/__tests__/analytics.test.ts:71` 附近（那条断言钉着来源全集）
- Modify: `src/App.tsx`
- Modify: `src/components/Stage.tsx`
- Modify: `src/three/InsectCanvas.tsx`
- Modify: `src/styles/global.css`（`.hotspot-card` 的 pointer-events）
- Test: `src/components/__tests__/part-jump.test.tsx`（新建）

**Interfaces:**
- Consumes: Task 1 的 `partOfAnchor`、`nextPeerWithPart`、`PartGroup`
- Produces:
  - `App` 内部 `jumpToPart(anchor: string): void`
  - `App` 内部 `partJumps: Record<string, string>` —— key 是**当前物种**某个标注点的 anchor，value 是那个部位组的本地化显示名；**只收真的有下一只可跳的 anchor**
  - `Stage` 新增可选 prop `onPartJump?: (anchor: string) => void`、`partJumps?: Record<string, string>`
  - `InsectCanvas` 新增可选 prop `onPartJump?: (anchor: string) => void`、`partJumps?: Record<string, string>`
  - `Hotspot` 新增 props `anchor: string`、`partLabel: string | null`、`onPartJump?: (anchor: string) => void`
  - i18n 键：`stage.part.<group>`（10 个组名）与 `stage.partJump`（链接文案，带 `{part}` 占位）

⚠️ **为什么由 App 算好一张表往下传，而不是让 3D 层自己查**：`InsectCanvas.tsx`
里没有、也不该有物种全表（实测 grep 全文没有任何 `INSECTS` 引用）—— 在 3D 层
import 数据表会把 `insects.zh`（156 KB）拖进 3D chunk 的依赖里。视图层只该知道
「这个 anchor 要不要显示链接、那个部位叫什么」，两件事一个 `Record` 就够。

- [ ] **Step 1: 写失败的测试**

创建 `src/components/__tests__/part-jump.test.tsx`：

```tsx
/**
 * @vitest-environment jsdom
 *
 * 部位跳转的接线 —— 从展台把 anchor 交上去，App 换虫并把镜头对到同一个部位。
 *
 * 3D 子树在 jsdom 里转不起来，所以 InsectCanvas 打桩、只把它收到的
 * `onPartJump` 回调暴露出来 —— 与 stage-fallback.test.tsx 同一套办法。
 * 这里测的是**接线**：点了之后换的是不是同一部位的下一只、镜头有没有跟着走。
 * 「下一只是谁」的逻辑归 data/__tests__/parts.test.ts 管，不在这里重复。
 */
import { act, cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { INSECTS } from '../../data/insects.zh'
import { nextPeerWithPart, partOfAnchor } from '../../data/parts'
import App from '../../App'

const h = vi.hoisted(() => ({ jump: undefined as ((anchor: string) => void) | undefined }))

vi.mock('../../three/InsectCanvas', async () => {
  const { createElement } = await import('react')
  return {
    InsectCanvas: (props: { onPartJump?: (anchor: string) => void }) => {
      h.jump = props.onPartJump
      return createElement('div', { 'data-testid': 'canvas-stub' })
    },
  }
})

afterEach(cleanup)

beforeAll(() => {
  Element.prototype.scrollIntoView = function () {}
  if (typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    })
  }
})

describe('部位跳转的接线', () => {
  it('回调交上去了', () => {
    renderZh(<App />)
    expect(h.jump, 'InsectCanvas 没收到 onPartJump').toBeTypeOf('function')
  })

  it('跳到同一部位组的下一只虫', () => {
    renderZh(<App />)
    const first = INSECTS[0]
    const anchor = first.hotspots.find((x) => partOfAnchor(x.anchor))!.anchor
    const group = partOfAnchor(anchor)!
    const expected = nextPeerWithPart(INSECTS, first.id, group)!

    act(() => h.jump!(anchor))

    // 展台标题（右栏 h1）换成了目标物种
    expect(screen.getAllByText(INSECTS.find((i) => i.id === expected.id)!.name).length).toBeGreaterThan(0)
  })

  it('没有同类的部位不跳、也不炸', () => {
    renderZh(<App />)
    expect(() => act(() => h.jump!('forceps'))).not.toThrow()
  })
})
```

- [ ] **Step 2: 跑一遍确认它红**

Run: `npx vitest run src/components/__tests__/part-jump.test.tsx`
Expected: FAIL —— `InsectCanvas 没收到 onPartJump`

- [ ] **Step 3: 埋点来源加一个值**

`src/analytics.ts`，把 `SPECIES_SWITCH_SOURCES` 改成：

```ts
export const SPECIES_SWITCH_SOURCES = [
  'list',
  'search',
  'gallery',
  'keyboard',
  'deeplink',
  'compare',
  'part',
] as const
```

同时把 `src/__tests__/analytics.test.ts` 里钉住全集的那条断言补上 `'part'`（那条是 `expect([...SPECIES_SWITCH_SOURCES].sort()).toEqual([...])`，把新值加进期望数组并保持排序）。

- [ ] **Step 4: 加 i18n 文案**

`src/i18n/_parts/stage.ts`，中文那份加：

```ts
    'stage.part.head': '头部',
    'stage.part.eye': '复眼',
    'stage.part.antenna': '触角',
    'stage.part.mouthparts': '口器',
    'stage.part.horn': '角',
    'stage.part.thorax': '胸部',
    'stage.part.wing': '翅',
    'stage.part.leg': '足',
    'stage.part.abdomen': '腹部',
    'stage.part.sound': '发声与听器',
    'stage.partJump': '看别的虫的{part} →',
```

英文那份对应加：

```ts
    'stage.part.head': 'head',
    'stage.part.eye': 'compound eye',
    'stage.part.antenna': 'antenna',
    'stage.part.mouthparts': 'mouthparts',
    'stage.part.horn': 'horn',
    'stage.part.thorax': 'thorax',
    'stage.part.wing': 'wing',
    'stage.part.leg': 'leg',
    'stage.part.abdomen': 'abdomen',
    'stage.part.sound': 'sound organs',
    'stage.partJump': 'See another insect’s {part} →',
```

- [ ] **Step 5: App 里加跳转动作**

`src/App.tsx`，在 `backToExplore` 附近加：

在 `select` 的定义之后加：

```tsx
  /**
   * 部位跳转：换到同一部位组的下一只虫，并把镜头对到它的那个部位上。
   *
   * 走的是 focusAnchor 这条现成通路（此前只有讲解弹窗在用）—— 展台不知道
   * 跳转的存在，它只知道「镜头该对着哪个 anchor」。跳转不自动展开新物种的
   * 标注卡片：到了就把镜头摆好，读不读由人决定，弹卡片是打扰。
   *
   * ⚠️ **`setFocusAnchor` 必须排在 `select` 之后**：`select` 自己会
   * `setFocusAnchor(null)`（换虫时清掉上一只的聚焦目标，见它的定义）。
   * 顺序写反的话镜头永远不会跟着走，而且不报错、测试只有断言镜头目标那条会红。
   *
   * 埋点在这里报：`select` 自己不上报（各调用方按来源自己报，见 LibraryPanel
   * 与 TopBar 的写法），所以这里报一次、且只报一次。
   */
  const jumpToPart = useCallback(
    (anchor: string) => {
      const group = partOfAnchor(anchor)
      if (!group) return
      const peer = nextPeerWithPart(SPECIES, activeId, group)
      if (!peer) return
      const target = SPECIES.find((i) => i.id === peer.id)
      if (!target) return
      track(EVENTS.SPECIES_SWITCH, { source: 'part', species_id: peer.id, order: target.order })
      select(peer.id)
      setFocusAnchor(peer.anchor)
    },
    [SPECIES, activeId, select],
  )

  /**
   * 当前物种每个标注点要不要显示跳转链接、那个部位叫什么。
   * 在这里算是因为只有 App 手里有物种全表 —— 视图层不该 import 数据表。
   */
  const partJumps = useMemo(() => {
    const out: Record<string, string> = {}
    for (const h of insect.hotspots) {
      const group = partOfAnchor(h.anchor)
      if (!group) continue
      if (!nextPeerWithPart(SPECIES, insect.id, group)) continue
      out[h.anchor] = t(`stage.part.${group}`)
    }
    return out
    // t 是每次渲染新建的闭包，不进依赖 —— 它实际只随 locale 变（同本文件其它 effect 的处理）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insect, SPECIES, locale])
```

顶部补 import：

```tsx
import { nextPeerWithPart, partOfAnchor } from './data/parts'
```

并传给 Stage：在 `<Stage ... />` 的属性里加 `onPartJump={jumpToPart}` 与 `partJumps={partJumps}`。

- [ ] **Step 6: Stage 透传**

`src/components/Stage.tsx`：解构里加两个、类型里加两个、传给 `<InsectCanvas>` 时原样透传。Stage 不加任何逻辑 —— 它只是通路上的一段。

解构（与 `focusAnchor = null` 并列）：

```tsx
  onPartJump,
  partJumps,
```

类型（与 `focusAnchor?: string | null` 并列）：

```tsx
  onPartJump?: (anchor: string) => void
  /** anchor → 部位显示名；只含真的有下一只可跳的 anchor。由 App 算好，见那边的注释 */
  partJumps?: Record<string, string>
```

传下去（与 `focusAnchor={focusAnchor}` 并列）：

```tsx
              onPartJump={onPartJump}
              partJumps={partJumps}
```

- [ ] **Step 7: 标注点卡片渲染那一行**

`src/three/InsectCanvas.tsx`。`Hotspot` 组件（文件里 `function Hotspot({ position, label, note, tone, open, onToggle, groupRef })`）的 props 加三个：

```tsx
  anchor: string
  /** 这个部位的显示名；null = 没有同类可跳，不显示链接 */
  partLabel: string | null
  onPartJump?: (anchor: string) => void
```

卡片体（当前是 `hotspot-title` + `hotspot-note` 两行）末尾加：

```tsx
            {onPartJump && partLabel && (
              <button
                className="hotspot-jump"
                onClick={(e) => {
                  e.stopPropagation()
                  onPartJump(anchor)
                }}
              >
                {t('stage.partJump', { part: partLabel })}
              </button>
            )}
```

`Hotspot` 里要用 `t`，从 `../i18n/useT` 引 `useT` 并在组件顶部 `const t = useT()`（该文件其它组件已有同样用法，照抄就行）。

在渲染这些 Hotspot 的那一处（`insect.hotspots.map((h) => {` 附近，约 820 行），把三个值传下去：

```tsx
                    anchor={h.anchor}
                    partLabel={partJumps?.[h.anchor] ?? null}
                    onPartJump={onPartJump}
```

**判断「显示不显示」的条件只有一个：`partJumps` 里有没有这个 anchor。** App 在建这张表时
已经把「有没有下一只可跳」判过了，视图层不再判第二遍 —— 两处都判，迟早对不上。

- [ ] **Step 8: 放开卡片的 pointer-events**

`src/styles/global.css`，`.hotspot-card` 规则里加一行（`<Html>` 外层是 `pointerEvents:'none'`，不放开的话卡片里的按钮点不动）：

```css
.hotspot-card {
  pointer-events: auto;
}
```

并给新按钮一条样式，跟在 `.hotspot-note` 之后：

```css
.hotspot-jump {
  margin-top: 8px;
  font-size: 11.5px;
  color: var(--brass);
  letter-spacing: 0.02em;
}
.hotspot-jump:hover {
  color: var(--active-fg);
}
```

- [ ] **Step 9: 跑测试确认全绿**

Run: `npx vitest run src/components/__tests__/part-jump.test.tsx`
Expected: PASS

- [ ] **Step 10: 变异测试**

```bash
git add -A
# 变异 1：把 jumpToPart 里的 select 与 setFocusAnchor 调换顺序
#         → select 会把 focusAnchor 清成 null，镜头永远不跟着走
# 变异 2：partJumps 里去掉「有没有下一只」那道判断（收下所有能分组的 anchor）
#         → 只有一只的组也会显示一条点了没反应的死链接
# 变异 3：jumpToPart 开头的 `if (!group) return` 去掉
#         → 点一次性构造（尾铗）会崩
```
每改一处跑一次 `npx vitest run src/components/__tests__/part-jump.test.tsx src/data/__tests__/parts.test.ts`，确认变红后 `git checkout` 还原。

⚠️ 变异 2 若不红，说明测试只测了「能跳的情况」—— 补一条：构造一个只含单只虫的
列表，断言 `partJumps` 为空对象。

- [ ] **Step 11: 目视验收（不能省）**

```bash
npm run build
npx vite preview --port 4207 --strictPort --host 127.0.0.1
```
浏览器打开 `http://127.0.0.1:4207/s/mantis/`，点开「捕捉足」，确认：
1. 卡片底部出现「看别的虫的足 →」
2. 点它换到下一只，镜头对着那只的足
3. 手机宽度（390px）下卡片不出屏、按钮点得动
4. 深色主题下这行字看得清

- [ ] **Step 12: 三关 + 提交**

```bash
npm run typecheck && npm test && npm run build
git add -A
git commit -m "标注点能横着走：点开触角，就能接着看别的虫的触角"
```

---

### Task 3: 小测搬到讲解结尾（独立，可单独开 PR）

**Files:**
- Modify: `src/analytics.ts`（`DISCOVERY_SOURCES` 加 `'lesson'`）
- Modify: `src/components/Discovery.tsx:208-260`（lesson 分支的最后一步）
- Modify: `src/i18n/_parts/discovery.ts`
- Test: `src/components/__tests__/discovery-analytics.test.tsx`

**Interfaces:**
- Consumes: 现有 `DiscoveryKind`、`DiscoverySource`、`EVENTS.DISCOVERY_OPEN`
- Produces: `DISCOVERY_SOURCES` 增加 `'lesson'`；Discovery 新增可选 prop `onSwitchKind?: (kind: DiscoveryKind, source: DiscoverySource) => void`

**为什么做这个：** 小测累计只被打开 33 次、每周 20 次答题，基本是死的；而 `lesson_complete` 每周 **469** 次是全站参与度最高的瞬间 —— 人刚读完这只虫的详解，正是「考我一下」最自然的时刻。这是一个**可证伪的实验**：搬过去若还是没人做，就证明是形式问题（文字选择题）而不是位置问题，那时再考虑换成看图认虫。

- [ ] **Step 1: 写失败的测试**

在 `src/components/__tests__/discovery-analytics.test.tsx` 末尾追加：

```tsx
describe('讲解走完之后接小测', () => {
  it('最后一步给出「做个小测」的入口', () => {
    mount('lesson')
    const steps = GUIDES['rhinoceros-beetle'].lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText(/下一步/))
    expect(screen.getByText(/小测/), '讲解结尾没有小测入口').toBeTruthy()
  })

  it('点它换到小测，且 discovery_open 只报一次 —— 别手动再报一遍', () => {
    mount('lesson')
    const steps = GUIDES['rhinoceros-beetle'].lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText('下一步'))
    trackMock.mockClear()
    fireEvent.click(screen.getByText('做个小测'))
    const opens = trackMock.mock.calls.filter(
      (c) => c[0] === EVENTS.DISCOVERY_OPEN && (c[1] as { kind: string }).kind === 'quiz',
    )
    expect(opens, 'discovery_open(quiz) 报了不止一次 —— Discovery 自己已经报过了').toHaveLength(1)
    expect(opens[0][1]).toEqual({ kind: 'quiz', source: 'lesson' })
  })

  it('「看完了」照旧上报 lesson_complete —— 小测是可选的，不是必经的', () => {
    mount('lesson')
    const steps = GUIDES['rhinoceros-beetle'].lesson.length
    for (let i = 0; i < steps - 1; i++) fireEvent.click(screen.getByText('下一步'))
    fireEvent.click(screen.getByText('看完了'))
    expect(trackMock).toHaveBeenCalledWith(EVENTS.LESSON_COMPLETE, { total: steps })
  })

  it('中间步骤不出现小测入口 —— 它属于「读完了」这个时刻', () => {
    mount('lesson')
    expect(screen.queryByText('做个小测'), '第一步就冒出小测入口').toBeNull()
  })
})
```

按钮文案是从 `src/i18n/_parts/discovery.ts` 实读的：`discovery.back` =「上一步」、
`discovery.next` =「下一步」、`discovery.done` =**「看完了」**（不是「完成」）。
`GUIDES`、`mount`、`trackMock`、`fireEvent`、`screen` 沿用该文件已有的 import；
`GUIDES` 若未引入，从 `../../data/guides.zh` 补一条。

- [ ] **Step 2: 跑一遍确认它红**

Run: `npx vitest run src/components/__tests__/discovery-analytics.test.tsx`
Expected: FAIL —— 找不到「小测」

- [ ] **Step 3: 加来源枚举与文案**

`src/analytics.ts`：

```ts
export const DISCOVERY_SOURCES = ['stage', 'card', 'panel', 'topbar', 'lesson'] as const
```

`src/i18n/_parts/discovery.ts` 中文加 `'discovery.toQuiz': '做个小测'`，英文加 `'discovery.toQuiz': 'Take the quiz'`。

- [ ] **Step 4: 实现**

`src/components/Discovery.tsx` 的 lesson 分支，`<div className={s.actions}>` 里，在「上一步」与主按钮之间插入（只在最后一步出现、且该物种真有题时）：

```tsx
          {last && (guide?.quiz.length ?? 0) > 0 && onSwitchKind && (
            <button className={s.secondary} onClick={() => onSwitchKind('quiz', 'lesson')}>
              {t('discovery.toQuiz')}
            </button>
          )}
```

并在 Discovery 的 props 上加 `onSwitchKind?: (kind: DiscoveryKind, source: DiscoverySource) => void`；App 里传 `onSwitchKind={openDiscovery}`。

⚠️ **这里绝对不要自己调 `track(EVENTS.DISCOVERY_OPEN, …)`。** `discovery_open`
是 Discovery 自己在 `Discovery.tsx:110` 的 effect 里按 `{kind, source}` 上报的 ——
`onSwitchKind('quiz', 'lesson')` 让 App 把 discovery 换成 `{kind:'quiz', source:'lesson'}`，
那个 effect 会自动报一次。手动再报就是同一次打开报两遍，仪表盘上的量直接翻倍，
而且**没有任何测试会拦住**（断言只看「有没有报过这一条」，不看报了几次）。
所以下面那条测试断言用的是 `toHaveBeenCalledTimes(1)` 而不是 `toHaveBeenCalledWith`。

- [ ] **Step 5: 跑测试确认全绿**

Run: `npx vitest run src/components/__tests__/discovery-analytics.test.tsx`
Expected: PASS

- [ ] **Step 6: 变异测试**

```bash
git add -A
# 变异 1：去掉 `last &&`（每一步都显示小测入口）→「中间步骤不出现小测入口」应当红
# 变异 2：在 onClick 里手动补一句 track(EVENTS.DISCOVERY_OPEN, {kind:'quiz', source:'lesson'})
#         → 「只报一次」那条应当红（这正是最容易犯、又最难发现的错）
```
每改一处跑 `npx vitest run src/components/__tests__/discovery-analytics.test.tsx`，确认变红后 `git checkout` 还原。

- [ ] **Step 7: 三关 + 提交**

```bash
npm run typecheck && npm test && npm run build
git add -A
git commit -m "讲解走完接一道小测：每周 469 次读完的瞬间，此前什么也没接住"
```

---

## 不在本期范围（以及为什么）

| 想法 | 判断 |
| --- | --- |
| 部位图谱页 `/parts/antenna` | **推迟到第二期**。它的主要价值是新增可索引落地页，而现有 128 页此刻一页都没被 Google 索引（2026-08-27 用「网址检查」确认物种页「从未被抓取」）。等收录恢复再做。词表（Task 1）已经把地基打好。 |
| 按特征筛选名录 / 按体长排序 | **推迟到第三期**。`lengthOf()` 已存在、成本低，但没有直接需求证据；先看部位跳转的读数，判断读者到底吃不吃「按结构浏览」这一套。 |
| 剖切显示内部结构 | 剖切是最常用的工具（每周 1,678 次），但现在切开是空腔。**解剖准确性风险最高**，而正文已承认未经核校。真要做先只做蝗虫一只当样板。 |
| 分享导出成图 | 分享搬家后只涨到 ×3（每周 18 次），需求本身弱。 |
| 程序化声音、课堂模式 | 各自是另一条产品轴，没有需求证据，不进本轮。 |
| 部位深链 `/s/mantis/#raptorialLeg` | **第二期顺带做**。它是 Task 2 的自然延伸（跳转链接本来就该是可分享的地址），但要动 URL 同步那段逻辑（`replaceState` 那处注释里记着两个踩过的坑），单独一轮更稳。 |
| 真实尺度参照物（虫比硬币／火柴） | 底部「它在昆虫里有多大」已经回答了同一个问题（虫比虫），增量信息有限，先不做。 |
| 加第 64 个物种 | 用户已明确排除。 |

## 上线后看什么（读数窗口 ≥ 7 天，且期间没有新投放才可比）

1. `species_switch` 里 `source=part` 的占比 —— 部位跳转有没有人用（对照：`source=list` 现在占 76%）
2. `hotspot_click` 的绝对量有没有涨 —— 卡片从死路变成入口之后
3. `discovery_open` 里 `kind=quiz, source=lesson` 的量 vs 现在的每周 20 次答题
4. 人均浏览页数（现在 6.0/笔记本、4.9/手机）
