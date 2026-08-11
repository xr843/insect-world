# 中英双语 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 insect-world 同时提供完整的中文版（`/`）与英文版（`/en/`），界面与全部 60 个物种的图鉴、讲解、测验内容全量双语。

**Architecture:** 平行数据文件（`*.zh.ts` / `*.en.ts`，共用一套类型）+ 对等性机器闸门。两个语言各是一个 Vite HTML 入口，各自静态 import 自己那份数据与字典，Rollup 自动分包；组件通过 `LocaleProvider` 取数据与文案，对语言无感知。

**Tech Stack:** React 18 + TypeScript 5.7 + Vite 6 + vitest 3 + three.js（不新增任何运行时依赖）

## Global Constraints

以下约束适用于**每一个任务**，不再逐条重复。

### 工程约束

- 不新增任何 npm 依赖。i18n 用一个自写的 Context，不引入 i18next 之类的库。
- 中文版的界面呈现在整个计划中必须**零变化**，任何一步都不许改中文文案。
- 每个任务结束时 `npm test` 必须全绿（写闸门的 Task 7 例外，它的新增用例故意为红，见该任务说明）。
- 提交信息用中文，说清「为什么」，不加任何 Claude 署名尾注。
- 源码注释不翻译，保持中文。

### 翻译体例契约（Task 8–19 的输入契约）

**语域**：博物馆导览风，术语双标。面向普通访客的平实英语，关键学术术语在该物种内**首次出现**时用「常用词 (术语)」形式标注，同一物种内不重复标注。不用感叹号，不用第二人称口号式表达。

**绝对不可变的字段**（从中文记录原样复制，一个字符都不许动）：
`id`、`latin`、`order`、`metamorphosis`、`accent`、`hotspots[].id`、
`hotspots[].anchor`、`hotspots[].tone`、`facts[].icon`、`quiz[].answer`、
`lesson[].anchor`。

**必须保真的内容**：所有数字、数值范围（用 `–` 连接号，不是 `-`）、单位（mm / cm / g）原样保留。`quiz[].options` 的顺序不许调换（`answer` 是下标）。

**英文常用名（`name` 字段）**：有公认俗名的用俗名（`Japanese Rhinoceros Beetle`）；没有公认俗名的用「描述性名称」，绝不生造看似正式的名字。拿不准时以 `latin` 为准，描述性名称从属名/科名的通用叫法派生。

**不许扩写**：不得加入中文原文没有的事实、数字或断言。这是翻译，不是重写。

### 术语表

| 中文 | English |
| --- | --- |
| 复眼 | compound eye |
| 触角 | antenna（复数 antennae） |
| 鳃叶状触角 | lamellate antenna |
| 鞘翅 | elytra（单数 elytron） |
| 前翅 / 后翅 | forewing / hindwing |
| 前胸背板 | pronotum |
| 小盾片 | scutellum |
| 头角 / 胸角 | head horn (cephalic horn) / thoracic horn |
| 上颚 | mandibles |
| 唇基 | clypeus |
| 下颚须 | maxillary palp |
| 喙（蝶蛾） | proboscis |
| 喙（半翅、象甲） | rostrum |
| 胸部 / 腹部 | thorax / abdomen |
| 前足 / 中足 / 后足 | foreleg / midleg / hindleg |
| 捕捉足 | raptorial foreleg |
| 产卵器 | ovipositor |
| 螫针 | sting（蜜蜂用 stinger） |
| 花粉篮 | pollen basket (corbicula) |
| 鼓膜听器 | tympanum |
| 发音器（蝉） | tymbal |
| 平衡棒 | haltere |
| 尾铗 | forceps |
| 腹柄 / 后腹部（蚁） | petiole / gaster |
| 发光器 | lantern (light organ) |
| 翅脉 / 翅室 | wing vein / wing cell |
| 卵 / 幼虫 / 若虫 / 蛹 / 成虫 | Egg / Larva / Nymph / Pupa / Adult |
| 幼虫（甲虫） | grub |
| 幼虫（鳞翅） | caterpillar |
| 完全变态 | Complete metamorphosis (holometabolous) |
| 不完全变态 | Incomplete metamorphosis (hemimetabolous) |

`facts[].key` 按 `icon` 定译名：`size` → `Length` / `Wingspan`；`weight` → `Weight` / `Load`；`time` → `Life cycle` / `Lifespan`；`place` → `Habitat` / `Range`；`food` → `Diet`；`ability` → 按内容取（`Flight`、`Vision`、`Speed` 等）。

### 14 个目的显示名

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

### 英文长度阈值（初值）

中文阈值按字数，英文按字符数。短标题不能套用倍率（中文 6 字的标题译成英文常有 24 字符），故标题类单独给值。**Task 20 会按第一批实际分布收紧这些值。**

| 字段 | zh 阈值 | en 初值 |
| --- | --- | --- |
| `summary` | 50–140 | 85–320 |
| `trivia` | 30–90 | 50–210 |
| `lesson[].title` | 4–10 | 10–48 |
| `lesson[].body` | 50–90 | 80–210 |
| `motion.title` | 4–10 | 10–48 |
| `motion.body` | 60–100 | 100–230 |
| `habitat.title` | 4–10 | 10–48 |
| `habitat.body` | 60–100 | 100–230 |
| `quiz[].question` | 6–80 | 15–190 |
| `quiz[].option` | 1–60 | 1–140 |
| `quiz[].explain` | 30–60 | 50–150 |

---

## File Structure

**新建**

| 路径 | 职责 |
| --- | --- |
| `src/i18n/types.ts` | `Locale`、`OrderKey`、字典的类型契约 |
| `src/i18n/orders.ts` | 14 个目的双语显示名 |
| `src/i18n/zh.ts` | 中文界面字典 |
| `src/i18n/en.ts` | 英文界面字典，类型受 `zh` 约束 |
| `src/i18n/LocaleProvider.tsx` | Context：注入 locale、字典、物种数据、`getGuide` |
| `src/i18n/useT.ts` | `useT()` / `useLocale()` / `useSpecies()` 三个消费钩子 |
| `src/data/insects.en.ts` | 60 个物种的英文数据 |
| `src/data/guides.en.ts` | 60 套英文讲解与测验 |
| `src/main.en.tsx` | 英文入口 |
| `en/index.html` | 英文 HTML 入口 |
| `src/data/__tests__/parity.test.ts` | 对等性 + 数字保真闸门 |
| `src/__tests__/no-hardcoded-cjk.test.ts` | 无中文残留闸门 |
| `src/i18n/__tests__/dictionary.test.ts` | 字典完整性闸门 |

**改名**

`src/data/insects.ts` → `insects.zh.ts`；`src/data/guides.ts` → `guides.zh.ts`

**修改**

`src/data/types.ts`、`src/App.tsx`、`src/main.tsx`、`index.html`、`vite.config.ts`、`scripts/make-og.sh`、`README.md`、`src/components/` 全部 11 个有文案的组件、`src/data/__tests__/{insects,guides}.test.ts`

---

## Task 1: 把 Order 从中文字面量改成中立键

**Files:**
- Modify: `src/data/types.ts`（`Order` 类型定义）
- Create: `src/i18n/types.ts`
- Create: `src/i18n/orders.ts`
- Modify: `src/data/insects.ts`（60 条记录的 `order` 字段）
- Modify: `src/App.tsx`、`src/components/TopBar.tsx`、`src/components/Gallery.tsx`
- Test: `src/data/__tests__/insects.test.ts`

**Interfaces:**
- Produces: `OrderKey`（14 个字面量联合）、`Locale = 'zh' | 'en'`、`ORDER_LABEL: Record<Locale, Record<OrderKey, string>>`

- [ ] **Step 1: 先看清现状**

Run: `grep -n "order" src/components/TopBar.tsx src/components/Gallery.tsx src/App.tsx | grep -v renderOrder`
记下每一处 `i.order` 是当**显示**用还是当**键**用。TopBar 的 `orderCounts` 用它当 Map 键并直接渲染；Gallery 的分组同理；搜索的 `i.order.includes(q)` 是匹配。

- [ ] **Step 2: 写下会失败的断言**

改 `src/data/__tests__/insects.test.ts` 里两处直接写中文目名的用例：

```ts
it('order 覆盖了全部 14 个目', () => {
  const seen = new Set(INSECTS.map(i => i.order))
  expect(seen.size).toBe(14)
  expect([...seen].every(o => o in ORDER_LABEL.zh)).toBe(true)
})

it('鞘翅目物种数为 28', () => {
  expect(INSECTS.filter(i => i.order === 'coleoptera')).toHaveLength(28)
})
```

顶部加 `import { ORDER_LABEL } from '../../i18n/orders'`。

- [ ] **Step 3: 跑一次确认它红**

Run: `npx vitest run src/data/__tests__/insects.test.ts`
Expected: FAIL —— 找不到 `../../i18n/orders`。

- [ ] **Step 4: 建立类型与显示名**

`src/i18n/types.ts`：

```ts
/** 站点支持的语言。新增语言时这里加一个，字典与数据文件跟着加。 */
export type Locale = 'zh' | 'en'

/**
 * 分类目的中立键（拉丁目名小写）。
 *
 * 原先这里是中文字面量联合，同时充当 Map 键、筛选值和显示文本 ——
 * 三重身份混在一起，英文版一来筛选就会崩。键与显示名从此分开。
 */
export type OrderKey =
  | 'coleoptera'
  | 'lepidoptera'
  | 'hymenoptera'
  | 'odonata'
  | 'mantodea'
  | 'orthoptera'
  | 'hemiptera'
  | 'diptera'
  | 'neuroptera'
  | 'dermaptera'
  | 'megaloptera'
  | 'blattodea'
  | 'trichoptera'
  | 'phasmatodea'
```

`src/i18n/orders.ts`：

```ts
import type { Locale, OrderKey } from './types'

/** 目的显示名。英文按「常用词 (学名)」双标，与全站体例一致。 */
export const ORDER_LABEL: Record<Locale, Record<OrderKey, string>> = {
  zh: {
    coleoptera: '鞘翅目',
    lepidoptera: '鳞翅目',
    hymenoptera: '膜翅目',
    odonata: '蜻蜓目',
    mantodea: '螳螂目',
    orthoptera: '直翅目',
    hemiptera: '半翅目',
    diptera: '双翅目',
    neuroptera: '脉翅目',
    dermaptera: '革翅目',
    megaloptera: '广翅目',
    blattodea: '蜚蠊目',
    trichoptera: '毛翅目',
    phasmatodea: '䗛目',
  },
  en: {
    coleoptera: 'Beetles (Coleoptera)',
    lepidoptera: 'Butterflies & Moths (Lepidoptera)',
    hymenoptera: 'Bees, Wasps & Ants (Hymenoptera)',
    odonata: 'Dragonflies & Damselflies (Odonata)',
    mantodea: 'Mantises (Mantodea)',
    orthoptera: 'Grasshoppers & Crickets (Orthoptera)',
    hemiptera: 'True Bugs (Hemiptera)',
    diptera: 'Flies (Diptera)',
    neuroptera: 'Lacewings (Neuroptera)',
    dermaptera: 'Earwigs (Dermaptera)',
    megaloptera: 'Dobsonflies & Alderflies (Megaloptera)',
    blattodea: 'Cockroaches & Termites (Blattodea)',
    trichoptera: 'Caddisflies (Trichoptera)',
    phasmatodea: 'Stick & Leaf Insects (Phasmatodea)',
  },
}
```

- [ ] **Step 5: 换掉 types.ts 里的 Order**

删掉 `src/data/types.ts` 顶部整个 `export type Order = ...` 块，改成：

```ts
import type { OrderKey } from '../i18n/types'
export type { OrderKey }
```

`Insect.order` 的类型从 `Order` 改成 `OrderKey`。

- [ ] **Step 6: 批量替换 60 条记录的 order 值**

Run:

```bash
cd /home/lqsxi/projects/insect-world
sed -i \
  -e "s/order: '鞘翅目'/order: 'coleoptera'/g" \
  -e "s/order: '鳞翅目'/order: 'lepidoptera'/g" \
  -e "s/order: '膜翅目'/order: 'hymenoptera'/g" \
  -e "s/order: '蜻蜓目'/order: 'odonata'/g" \
  -e "s/order: '螳螂目'/order: 'mantodea'/g" \
  -e "s/order: '直翅目'/order: 'orthoptera'/g" \
  -e "s/order: '半翅目'/order: 'hemiptera'/g" \
  -e "s/order: '双翅目'/order: 'diptera'/g" \
  -e "s/order: '脉翅目'/order: 'neuroptera'/g" \
  -e "s/order: '革翅目'/order: 'dermaptera'/g" \
  -e "s/order: '广翅目'/order: 'megaloptera'/g" \
  -e "s/order: '蜚蠊目'/order: 'blattodea'/g" \
  -e "s/order: '毛翅目'/order: 'trichoptera'/g" \
  -e "s/order: '䗛目'/order: 'phasmatodea'/g" \
  src/data/insects.ts
grep -c "order: '" src/data/insects.ts
```

Expected: `60`。再 `grep "order: '[^a-z]" src/data/insects.ts` 应当无输出（没有漏网的中文值）。

- [ ] **Step 7: 三个消费点改成走显示名**

`src/components/TopBar.tsx`：`orderCounts` 的 Map 键类型改 `OrderKey`；渲染处从 `{order}` 改成 `{ORDER_LABEL.zh[order]}`（Task 3 会再改成走当前 locale）；搜索的匹配改成：

```ts
ORDER_LABEL.zh[i.order].toLowerCase().includes(q)
```

`src/components/Gallery.tsx` 的分组标题同理。`src/App.tsx` 只是类型引用，把 `Order` 换成 `OrderKey`。

- [ ] **Step 8: 全量测试**

Run: `npm test`
Expected: 全绿。**除 Step 2 改的那两个用例外，不得有任何其他测试文件被改动** —— 改了别的说明行为变了，停下来查。

Run: `git diff --stat -- '*__tests__*'` 确认只有 `insects.test.ts` 一个文件。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "Order 从中文字面量改成中立键

'鞘翅目' 这类中文串同时在当 Map 键、筛选值和显示文本用，三重身份混在
一起，英文版一来筛选必崩。改成 OrderKey（拉丁目名小写），显示名移到
i18n/orders.ts 按语言查表。

中文界面呈现零变化：只有 insects.test.ts 里两处直接断言中文目名的用例
跟着换成断言 key，其余 3129 个测试一字未动。"
```

---

## Task 2: 把 metamorphosis 改成中立枚举

**Files:**
- Modify: `src/data/types.ts`、`src/data/insects.ts`
- Modify: `src/i18n/orders.ts`（追加 `METAMORPHOSIS_LABEL`）
- Modify: 渲染它的组件（先 `grep -rn "metamorphosis" src/components src/App.tsx` 定位）
- Test: `src/data/__tests__/insects.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `Locale`
- Produces: `Metamorphosis = 'complete' | 'incomplete'`、`METAMORPHOSIS_LABEL: Record<Locale, Record<Metamorphosis, string>>`

- [ ] **Step 1: 写下会失败的断言**

`src/data/__tests__/insects.test.ts` 里的 `'metamorphosis 是合法枚举值'` 改成：

```ts
it('metamorphosis 是合法枚举值', () => {
  expect(['complete', 'incomplete']).toContain(insect.metamorphosis)
})
```

- [ ] **Step 2: 跑一次确认它红**

Run: `npx vitest run src/data/__tests__/insects.test.ts -t metamorphosis`
Expected: FAIL —— 实际值是 `'完全变态'`。

- [ ] **Step 3: 加类型与显示名**

`src/i18n/types.ts` 追加：

```ts
export type Metamorphosis = 'complete' | 'incomplete'
```

`src/i18n/orders.ts` 追加：

```ts
import type { Metamorphosis } from './types'

export const METAMORPHOSIS_LABEL: Record<Locale, Record<Metamorphosis, string>> = {
  zh: { complete: '完全变态', incomplete: '不完全变态' },
  en: {
    complete: 'Complete metamorphosis (holometabolous)',
    incomplete: 'Incomplete metamorphosis (hemimetabolous)',
  },
}
```

- [ ] **Step 4: 换数据与类型**

`src/data/types.ts` 的 `metamorphosis: '完全变态' | '不完全变态'` 改成 `metamorphosis: Metamorphosis`。

Run（注意顺序：先替换长串，否则 `'完全变态'` 会先把 `'不完全变态'` 的后半段吃掉）：

```bash
sed -i \
  -e "s/metamorphosis: '不完全变态'/metamorphosis: 'incomplete'/g" \
  -e "s/metamorphosis: '完全变态'/metamorphosis: 'complete'/g" \
  src/data/insects.ts
grep -c "metamorphosis: '" src/data/insects.ts
grep "metamorphosis: '[^ci]" src/data/insects.ts
```

Expected: 第一条输出 `60`，第二条无输出。

- [ ] **Step 5: 渲染处查表**

把组件里直接渲染 `insect.metamorphosis` 的地方改成 `METAMORPHOSIS_LABEL.zh[insect.metamorphosis]`。

- [ ] **Step 6: 全量测试**

Run: `npm test`
Expected: 全绿。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "metamorphosis 改成中立枚举 complete/incomplete

与 Order 同一个毛病：中文串当枚举值用。显示名进 i18n 查表。

sed 的两条替换必须先长后短 —— 先替 '不完全变态'，否则 '完全变态'
的规则会把它的后半段先吃掉，留下一个 '不complete'。"
```

---

## Task 3: i18n 骨架 + 中文字典 + 组件字符串外提

这是界面层最大的一次改动：11 个组件里约 81 处中文字面量全部外提到字典。中文版呈现必须零变化。

**Files:**
- Create: `src/i18n/zh.ts`、`src/i18n/LocaleProvider.tsx`、`src/i18n/useT.ts`
- Modify: `src/main.tsx`、`src/App.tsx`、`src/components/` 下 11 个有文案的组件
- Test: 现有 `search.test.tsx`、`footer.test.tsx`、`discovery-disclaimer.test.tsx`、`library-scroll.test.tsx`、`glyph.test.tsx` 需要被 Provider 包裹

**Interfaces:**
- Consumes: Task 1–2 的 `Locale`、`ORDER_LABEL`、`METAMORPHOSIS_LABEL`
- Produces: `Dict`（`typeof zh`）、`LocaleProvider`、`useT(): (key: keyof Dict, vars?: Record<string, string | number>) => string`、`useLocale(): Locale`

- [ ] **Step 1: 把全部界面串抓出来**

Run:

```bash
for f in src/components/*.tsx src/App.tsx; do
  echo "--- $f"
  grep -noP "'[^']*[\x{4e00}-\x{9fff}][^']*'|\"[^\"]*[\x{4e00}-\x{9fff}][^\"]*\"|(?<=>)[^<>{}]*[\x{4e00}-\x{9fff}][^<>{}]*(?=<)" "$f"
done
```

逐行过一遍，注释里的不要（`grep` 会把 `/** ... */` 里的也抓出来）。约 81 条。

- [ ] **Step 2: 写字典**

`src/i18n/zh.ts`，键用 `模块.用途` 的点分命名，值就是现在组件里那个串**一字不改**：

```ts
/**
 * 中文界面字典 —— 全站文案的单一出处。
 *
 * 这份是基准：en.ts 的类型被声明为 Record<keyof typeof zh, string>，
 * 这里加一个键而 en 没跟上就编译不过。
 *
 * 带 {n} 之类占位符的串由 useT 的第二个参数替换。
 */
export const zh = {
  'nav.explore': '探索',
  'nav.orders': '分类',
  'nav.lessons': '课程',
  'nav.library': '图鉴库',
  'nav.notes': '笔记',
  'brand.name': '昆虫世界',
  'brand.tagline': '像博物学家一样观察',
  'order.all': '全部',
  'theme.toLight': '切换到浅色主题',
  'theme.toDark': '切换到深色主题',
  'theme.light': '浅色 · 纸感图鉴',
  'theme.dark': '深色 · 博物馆之夜',
  'search.placeholder': '搜索昆虫、目、特征…',
  'notes.title': '观察记录',
  'notes.empty': '还没有观察笔记',
  'notes.open': '打开笔记',
  'notes.copyMarkdown': '复制为 Markdown',
  'notes.clear': '清空笔记',
  'detail.facts': '关键数据',
  'detail.ecology': '生态角色',
  'detail.trivia': '你知道吗',
  'detail.range': '分布',
  'detail.status': '现状',
  'detail.relatives': '近缘',
  'app.shuffle': '换一只看看',
  // …其余按 Step 1 的清单补全
} as const
```

- [ ] **Step 3: Provider 与钩子**

`src/i18n/LocaleProvider.tsx`：

```tsx
import { createContext, useContext, type ReactNode } from 'react'
import type { Locale } from './types'
import type { zh } from './zh'
import type { Insect, Guide } from '../data/types'

export type Dict = Record<keyof typeof zh, string>

export interface LocaleBundle {
  locale: Locale
  dict: Dict
  insects: Insect[]
  getGuide: (id: string) => Guide | undefined
}

const Ctx = createContext<LocaleBundle | null>(null)

export function LocaleProvider({ value, children }: { value: LocaleBundle; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** 没有 Provider 就是接线错了，直接抛而不是静默回退 —— 回退会让漏接线一路蒙混到线上 */
export function useBundle(): LocaleBundle {
  const v = useContext(Ctx)
  if (!v) throw new Error('缺少 LocaleProvider')
  return v
}
```

`src/i18n/useT.ts`：

```ts
import { useBundle, type Dict } from './LocaleProvider'

/**
 * 取一条界面文案。第二个参数替换 {name} 形式的占位符。
 *
 * 找不到键时返回键名本身而不是空串 —— 界面上出现 'notes.title' 这样的
 * 字样一眼就能看见，空白则会被当成排版问题查半天。
 */
export function useT() {
  const { dict } = useBundle()
  return (key: keyof Dict, vars?: Record<string, string | number>) => {
    let s: string = dict[key] ?? (key as string)
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}

export function useLocale() {
  return useBundle().locale
}
```

- [ ] **Step 4: main.tsx 接线**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LocaleProvider } from './i18n/LocaleProvider'
import { zh } from './i18n/zh'
import { INSECTS } from './data/insects'
import { getGuide } from './data/guides'
import './styles/global.css'

const el = document.getElementById('root')
if (!el) throw new Error('缺少 #root 挂载点')

createRoot(el).render(
  <StrictMode>
    <LocaleProvider value={{ locale: 'zh', dict: zh, insects: INSECTS, getGuide }}>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
```

- [ ] **Step 5: 逐个组件替换**

11 个组件挨个改：`const t = useT()`，把字面量换成 `t('nav.explore')`。`ORDER_LABEL.zh[...]` / `METAMORPHOSIS_LABEL.zh[...]` 改成 `ORDER_LABEL[useLocale()][...]`。

每改完一个跑一次该组件的测试。

- [ ] **Step 6: 现有测试补 Provider**

`src/components/__tests__/` 里直接 render 组件的用例现在会抛「缺少 LocaleProvider」。加一个测试工具 `src/i18n/__tests__/renderWithLocale.tsx`：

```tsx
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { LocaleProvider } from '../LocaleProvider'
import { zh } from '../zh'
import { INSECTS } from '../../data/insects'
import { getGuide } from '../../data/guides'

/** 组件测试统一用它 render，省得每个用例自己包 Provider */
export function renderZh(ui: ReactElement) {
  return render(
    <LocaleProvider value={{ locale: 'zh', dict: zh, insects: INSECTS, getGuide }}>{ui}</LocaleProvider>,
  )
}
```

把受影响的用例从 `render(...)` 改成 `renderZh(...)`。

- [ ] **Step 7: 全量测试 + 肉眼比对**

Run: `npm test`
Expected: 全绿。

Run: `npm run dev`，打开 `http://localhost:5178`，逐一点开顶栏五个入口、搜索、主题切换、笔记面板、讲解弹窗、对比条，确认**没有一处文案变化、没有一处显示成键名**。

- [ ] **Step 8: 提交**

```bash
git add -A
git commit -m "i18n 骨架：界面文案全部外提到字典

11 个组件里约 81 处中文字面量搬进 src/i18n/zh.ts，组件改走 useT()。
数据与字典由 LocaleProvider 注入，App 与组件从此对语言无感知。

useT 找不到键时返回键名而不是空串：界面上冒出 'notes.title' 一眼可见，
空白反而会被当成排版问题查半天。

useBundle 没有 Provider 直接抛，不做静默回退 —— 回退会让漏接线一路
蒙混到线上。"
```

---

## Task 4: 数据文件改名为 .zh.ts

**Files:**
- Rename: `src/data/insects.ts` → `src/data/insects.zh.ts`；`src/data/guides.ts` → `src/data/guides.zh.ts`
- Modify: 所有 import 这两个模块的文件

- [ ] **Step 1: 用 git mv 改名（保住文件历史）**

```bash
git mv src/data/insects.ts src/data/insects.zh.ts
git mv src/data/guides.ts src/data/guides.zh.ts
grep -rln "data/insects'\|data/guides'\|from '../insects'\|from '../guides'" src | sort
```

- [ ] **Step 2: 批量改 import 路径**

```bash
grep -rl "from '\(.*\)data/insects'" src | xargs sed -i "s#data/insects'#data/insects.zh'#g"
grep -rl "from '\(.*\)data/guides'" src | xargs sed -i "s#data/guides'#data/guides.zh'#g"
grep -rl "from '\.\./insects'" src | xargs sed -i "s#from '\.\./insects'#from '../insects.zh'#g"
grep -rl "from '\.\./guides'" src | xargs sed -i "s#from '\.\./guides'#from '../guides.zh'#g"
```

- [ ] **Step 3: 类型检查 + 全量测试**

Run: `npm run typecheck && npm test`
Expected: 全绿。有漏网的 import 会在 typecheck 阶段就报出来。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "数据文件改名为 insects.zh.ts / guides.zh.ts

为平行的 .en.ts 腾出命名位。用 git mv 保住文件历史 —— 这两个文件
各有 17 万字符，重建历史会让以后追某条文案的来历变得很难。"
```

---

## Task 5: 英文入口与 HTML

此后 `/en/` 可访问，界面是英文，数据暂时仍是中文（Task 8–19 填）。

**Files:**
- Create: `src/i18n/en.ts`、`src/main.en.tsx`、`en/index.html`
- Modify: `vite.config.ts`、`index.html`

**Interfaces:**
- Consumes: Task 3 的 `Dict`
- Produces: `en: Dict`

- [ ] **Step 1: 写英文字典**

`src/i18n/en.ts`，键与 `zh.ts` 完全一一对应：

```ts
import type { Dict } from './LocaleProvider'

/** 类型标成 Dict：zh 里加了键而这里没跟上，编译期就会报错 */
export const en: Dict = {
  'nav.explore': 'Explore',
  'nav.orders': 'Orders',
  'nav.lessons': 'Lessons',
  'nav.library': 'Library',
  'nav.notes': 'Notes',
  'brand.name': 'Insect World',
  'brand.tagline': 'Observe like a naturalist',
  'order.all': 'All',
  'theme.toLight': 'Switch to light theme',
  'theme.toDark': 'Switch to dark theme',
  'theme.light': 'Light · Specimen Tray',
  'theme.dark': 'Dark · Museum at Night',
  'search.placeholder': 'Search species, orders, features…',
  'notes.title': 'Field notes',
  'notes.empty': 'No field notes yet',
  'notes.open': 'Open notes',
  'notes.copyMarkdown': 'Copy as Markdown',
  'notes.clear': 'Clear notes',
  'detail.facts': 'Key facts',
  'detail.ecology': 'Ecological role',
  'detail.trivia': 'Did you know',
  'detail.range': 'Range',
  'detail.status': 'Status',
  'detail.relatives': 'Relatives',
  'app.shuffle': 'Show me another',
  // …其余按 zh.ts 的键逐条补全
}
```

- [ ] **Step 2: 英文入口模块**

`src/main.en.tsx`：与 `main.tsx` 同构，`locale: 'en'`、`dict: en`，数据先用 `INSECTS` / `getGuide`（中文），Task 20 收敛时换成 `.en`：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LocaleProvider } from './i18n/LocaleProvider'
import { en } from './i18n/en'
// TODO(Task 20)：Task 8–19 产出 insects.en / guides.en 后换成英文数据
import { INSECTS } from './data/insects.zh'
import { getGuide } from './data/guides.zh'
import './styles/global.css'

const el = document.getElementById('root')
if (!el) throw new Error('missing #root')

createRoot(el).render(
  <StrictMode>
    <LocaleProvider value={{ locale: 'en', dict: en, insects: INSECTS, getGuide }}>
      <App />
    </LocaleProvider>
  </StrictMode>,
)
```

- [ ] **Step 3: 英文 HTML**

`en/index.html`：以 `index.html` 为蓝本，改这几处 —— `lang="en"`、英文 title/description/og、`og:image` 指 `/og-en.png`、脚本路径 `/src/main.en.tsx`、字体只要 Playfair Display（不要 Noto Serif SC）、`theme-boot.js` 路径改绝对路径 `/theme-boot.js`（相对路径在 `/en/` 下会找错）。

两份 HTML 都加：

```html
<link rel="canonical" href="https://insect-world.pages.dev/" />
<link rel="alternate" hreflang="zh-Hans" href="https://insect-world.pages.dev/" />
<link rel="alternate" hreflang="en" href="https://insect-world.pages.dev/en/" />
<link rel="alternate" hreflang="x-default" href="https://insect-world.pages.dev/" />
```

英文那份的 `canonical` 指 `https://insect-world.pages.dev/en/`。

- [ ] **Step 4: 加构建入口**

`vite.config.ts`：

```ts
input: { main: 'index.html', en: 'en/index.html', preview: 'preview.html' },
```

- [ ] **Step 5: 构建并核验产物**

Run: `npm run build && ls dist/en/ && grep -c hreflang dist/index.html dist/en/index.html`
Expected: `dist/en/index.html` 存在，两份各有 3 个 hreflang。

Run: `npm run preview`，开 `http://localhost:4173/en/`，确认界面是英文、3D 展台正常、没有 404。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "英文入口 /en/：独立 HTML + 英文界面字典

走 Vite 多页入口而不是运行时切换：两个入口各自静态 import 自己那份
字典，Rollup 自动分包，中文访客不下载英文数据；英文版也因此能有自己的
lang / title / og，搜索引擎看得到真正的英文页。

theme-boot.js 在 /en/ 下必须写绝对路径 —— 相对路径会去找 /en/theme-boot.js。

数据层暂时仍指向中文，Task 20 收敛时换。"
```

---

## Task 6: 语言切换、`?s=` 深链、提示条

**Files:**
- Modify: `src/components/TopBar.tsx`、`src/App.tsx`
- Create: `src/i18n/LanguageHint.tsx`
- Test: `src/components/__tests__/language-switch.test.tsx`

**Interfaces:**
- Consumes: `useLocale()`
- Produces: `hrefForLocale(target: Locale, speciesId: string): string`

- [ ] **Step 1: 先写测试**

`src/components/__tests__/language-switch.test.tsx`：

```tsx
import { describe, expect, it } from 'vitest'
import { hrefForLocale } from '../../i18n/hrefForLocale'

describe('语言切换的目标地址', () => {
  it('切到英文时带上当前物种', () => {
    expect(hrefForLocale('en', 'rhinoceros-beetle')).toBe('/en/?s=rhinoceros-beetle')
  })
  it('切回中文时带上当前物种', () => {
    expect(hrefForLocale('zh', 'monarch-butterfly')).toBe('/?s=monarch-butterfly')
  })
})
```

- [ ] **Step 2: 跑一次确认它红**

Run: `npx vitest run src/components/__tests__/language-switch.test.tsx`
Expected: FAIL —— 找不到模块。

- [ ] **Step 3: 实现**

`src/i18n/hrefForLocale.ts`：

```ts
import type { Locale } from './types'

/** 切语言时带上当前物种：读到第 40 种切个语言回到第一种，体验很差 */
export function hrefForLocale(target: Locale, speciesId: string): string {
  const base = target === 'en' ? '/en/' : '/'
  return `${base}?s=${encodeURIComponent(speciesId)}`
}
```

- [ ] **Step 4: App 启动时读 `?s=`**

`src/App.tsx` 的初始 `activeId` 改成惰性初始化。**两个入口都读**，不只英文版：

```ts
const [activeId, setActiveId] = useState(() => {
  const want = new URLSearchParams(location.search).get('s')
  return want && SPECIES.some(i => i.id === want) ? want : SPECIES[0].id
})
```

命中不了就静默回落到首个物种，不报错也不清地址栏。

- [ ] **Step 5: 顶栏加切换按钮**

`TopBar` 里加 `中 | EN`，当前语言那侧不可点。`href={hrefForLocale(other, activeId)}` 用真 `<a>` 而不是 `onClick` —— 用户可以中键新开标签页。

- [ ] **Step 6: 提示条**

`src/i18n/LanguageHint.tsx`：浏览器语言与当前页语言不符时，顶部出一条可关闭的横幅（中文页显示 `View in English →`，英文页显示「查看中文版 →」）。关闭状态存 `localStorage` 键 `iw-lang-hint-dismissed`。**不做任何自动跳转。**

- [ ] **Step 7: 测试 + 提交**

Run: `npm test`

```bash
git add -A
git commit -m "语言切换、?s= 深链与提示条

切换带上当前物种：读到第 40 种切语言回到第一种体验很差；顺带让物种
链接可分享。两个入口都读 ?s=，命中不了静默回落首个物种。

切换用真 <a href> 不用 onClick，中键能新开标签页。

提示条只提示不跳转 —— 自动跳会让 Google 爬虫（多报 en-US）被带到
英文版，影响中文版收录，也让分享链接的行为变得不可预测。"
```

---

## Task 7: 四道闸门（先红）

此任务结束时新增用例**故意是红的**——英文数据还不存在。这是 TDD 的红灯，不是失败。

**Files:**
- Create: `src/data/__tests__/parity.test.ts`、`src/__tests__/no-hardcoded-cjk.test.ts`、`src/i18n/__tests__/dictionary.test.ts`
- Modify: `src/data/__tests__/insects.test.ts`、`guides.test.ts`（参数化到两个 locale）

- [ ] **Step 1: 对等性 + 数字保真**

`src/data/__tests__/parity.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { INSECTS as ZH } from '../insects.zh'
import { INSECTS as EN } from '../insects.en'
import { GUIDES as GZH } from '../guides.zh'
import { GUIDES as GEN } from '../guides.en'

/** 抽出一段文字里的全部数字串（含 30–55 这类范围），用于核对翻译没把数字改掉 */
function numbers(s: string): string[] {
  return s.match(/\d+(?:[.,]\d+)*(?:\s*[–—-]\s*\d+(?:[.,]\d+)*)?/g) ?? []
}

describe('中英数据对等', () => {
  it('id 列表逐位相同', () => {
    expect(EN.map(i => i.id)).toEqual(ZH.map(i => i.id))
  })

  for (const [idx, zh] of ZH.entries()) {
    describe(`物种：${zh.id}`, () => {
      const en = EN[idx]

      it('中立字段逐项相等', () => {
        expect(en.latin).toBe(zh.latin)
        expect(en.order).toBe(zh.order)
        expect(en.metamorphosis).toBe(zh.metamorphosis)
        expect(en.accent).toBe(zh.accent)
        expect(en.lifecycle).toHaveLength(zh.lifecycle.length)
        expect(en.relatives).toHaveLength(zh.relatives.length)
      })

      it('facts 的 icon 序列相同', () => {
        expect(en.facts.map(f => f.icon)).toEqual(zh.facts.map(f => f.icon))
      })

      it('hotspots 的 id/anchor/tone 序列相同', () => {
        expect(en.hotspots.map(h => h.id)).toEqual(zh.hotspots.map(h => h.id))
        expect(en.hotspots.map(h => h.anchor)).toEqual(zh.hotspots.map(h => h.anchor))
        expect(en.hotspots.map(h => h.tone)).toEqual(zh.hotspots.map(h => h.tone))
      })

      it('quiz 的正确答案下标相同', () => {
        expect(GEN[zh.id].quiz.map(q => q.answer)).toEqual(GZH[zh.id].quiz.map(q => q.answer))
      })

      it('lesson 的 anchor 序列相同', () => {
        expect(GEN[zh.id].lesson.map(s => s.anchor)).toEqual(GZH[zh.id].lesson.map(s => s.anchor))
      })

      it('facts 里的数字一个都没丢', () => {
        for (const [i, f] of zh.facts.entries()) {
          for (const n of numbers(f.value)) {
            expect(en.facts[i].value, `${zh.id} facts[${i}] 丢了数字 ${n}`).toContain(n)
          }
        }
      })
    })
  }
})
```

- [ ] **Step 2: 无中文残留**

`src/__tests__/no-hardcoded-cjk.test.ts`：

```ts
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/** 去掉块注释与行注释，只留会被渲染出去的代码 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

const CJK = /[一-鿿]/

const FILES = [
  ...readdirSync('src/components')
    .filter(f => f.endsWith('.tsx'))
    .map(f => join('src/components', f)),
  'src/App.tsx',
  'src/i18n/en.ts',
]

describe('界面层不得残留硬编码中文', () => {
  it.each(FILES)('%s', file => {
    const lines = stripComments(readFileSync(file, 'utf8')).split('\n')
    const bad = lines
      .map((line, i) => ({ line, no: i + 1 }))
      .filter(({ line }) => CJK.test(line))
    expect(bad.map(b => `${file}:${b.no} ${b.line.trim()}`)).toEqual([])
  })
})
```

- [ ] **Step 3: 字典完整性**

`src/i18n/__tests__/dictionary.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import { zh } from '../zh'
import { en } from '../en'

describe('两份字典对齐', () => {
  it('键集合完全相同', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(zh).sort())
  })

  it('英文值非空', () => {
    for (const [k, v] of Object.entries(en)) {
      expect(v.trim(), `en['${k}'] 是空的`).not.toBe('')
    }
  })

  /** 漏译时最常见的偷懒是把中文原样抄过去，这条专门抓它 */
  it('英文值不等于中文值', () => {
    const copied = Object.keys(zh).filter(k => en[k as keyof typeof en] === zh[k as keyof typeof zh])
    expect(copied).toEqual([])
  })
})
```

- [ ] **Step 4: 现有闸门参数化**

`insects.test.ts` / `guides.test.ts` 改成对 `['zh', 'en']` 两个 locale 各跑一遍，长度阈值按 locale 取（英文用 Global Constraints 里的初值表）。

- [ ] **Step 5: 确认红灯的位置正确**

Run: `npm test 2>&1 | tail -30`
Expected: 失败集中在「找不到 `../insects.en`」。**不得有任何原有用例转红** —— 有就是前面几个任务留下的伤，先修那个。

- [ ] **Step 6: 提交（红灯入库，说明白）**

```bash
git add -A
git commit -m "四道双语闸门（此刻为红，英文数据尚未产出）

7.2 万字的 AI 翻译靠人眼审不完，靠机器核结构对等：
- 对等性：id/latin/order/accent/hotspot anchor/quiz answer 下标逐项相等
- 数字保真：中文 facts 里的每个数字串必须在英文对应字段原样出现
- 无中文残留：组件源码除注释外不得有 CJK 字面量
- 字典完整性：en 覆盖 zh 全部键，且值不得直接抄中文

现有中文闸门参数化到两个 locale 各跑一遍，英文长度阈值单列。

红灯全部集中在「找不到 insects.en」，Task 8–19 填数据后转绿。"
```

---

## Task 8–13: `insects.en.ts` 六批（可并行）

每批 10 个物种。六个 agent 可并行，各自产出一个片段文件，Task 20 合并。

**批次划分**（顺序与 `insects.zh.ts` 一致，合并时必须保持这个全局顺序）：

| 任务 | 片段文件 | 物种 |
| --- | --- | --- |
| Task 8 | `src/data/_en-parts/insects-01.ts` | rhinoceros-beetle, monarch-butterfly, honeybee, dragonfly, mantis, ladybird, ant, cicada, locust, firefly |
| Task 9 | `insects-02.ts` | longhorn-beetle, stick-insect, swallowtail, silk-moth, hornet, tiger-beetle, stag-beetle, jewel-beetle, katydid, mole-cricket |
| Task 10 | `insects-03.ts` | water-strider, hoverfly, lacewing, earwig, dung-beetle, weevil, click-beetle, diving-beetle, rove-beetle, flower-chafer |
| Task 11 | `insects-04.ts` | burying-beetle, tortoise-beetle, hercules-beetle, whirligig-beetle, ground-beetle, blister-beetle, hister-beetle, treehopper, ichneumon-wasp, dobsonfly |
| Task 12 | `insects-05.ts` | goliath-beetle, bombardier-beetle, darkling-beetle, net-winged-beetle, leaf-beetle, damselfly, orchid-mantis, dead-leaf-butterfly, hawk-moth, termite-soldier |
| Task 13 | `insects-06.ts` | water-scavenger, checkered-beetle, shining-chafer, assassin-bug, bumblebee, cricket, robber-fly, crane-fly, mantidfly, caddisfly |

**给实施者**：你多半只拿到了其中一批。上表里找到你那一行，`片段文件` 是你要创建的文件、`物种` 是你负责的 10 个 id。下面的步骤对每一批都完整适用，不需要去看别批。翻译规则全部在本文档开头的 Global Constraints 里，那一节对每个任务都生效。

**每批的步骤：**

- [ ] **Step 1: 读中文原文**

Run: `grep -n "id: 'rhinoceros-beetle'" src/data/insects.zh.ts` 定位起点，读出这 10 个物种的完整记录。

- [ ] **Step 2: 逐条翻译**

严格按 Global Constraints 的术语表与体例契约。逐字段处理，`latin`/`order`/`metamorphosis`/`accent`/`hotspots[].id`/`hotspots[].anchor`/`hotspots[].tone`/`facts[].icon` 原样复制。

- [ ] **Step 3: 写片段文件**

```ts
import type { Insect } from '../types'

/** insects.en 第 1 批（rhinoceros-beetle … firefly）；合并顺序见 plans 文档 */
export const PART_01: Insect[] = [
  // …10 条
]
```

- [ ] **Step 4: 自查三件事**

- 每条 `facts` 恰好 6 项、`hotspots` 5–6 项、`relatives` 恰好 3 项
- 中文里的每个数字都还在
- `summary` 85–320 字符、`trivia` 50–210 字符

Run: `npx tsc --noEmit` 确认类型过。

- [ ] **Step 5: 提交**

```bash
git add src/data/_en-parts/insects-01.ts
git commit -m "insects.en 第 1 批：rhinoceros-beetle 起 10 种"
```

---

## Task 14–19: `guides.en.ts` 六批（可并行）

物种划分与 Task 8–13 完全一致，文件为 `src/data/_en-parts/guides-01.ts` … `guides-06.ts`，导出 `Record<string, Guide>`。

**每批的步骤：**

- [ ] **Step 1: 读中文原文**（`src/data/guides.zh.ts` 里对应的 10 条）

- [ ] **Step 2: 逐条翻译**

`lesson[].anchor` 与 `quiz[].answer` 原样复制，`quiz[].options` 顺序不许调换。

- [ ] **Step 3: 写片段文件**

```ts
import type { Guide } from '../types'

/** guides.en 第 1 批（rhinoceros-beetle … firefly） */
export const PART_01: Record<string, Guide> = {
  // …10 条
}
```

- [ ] **Step 4: 自查**

- `lesson` 3–4 步且至少 2 步带 `anchor`；步骤标题互不相同（组件拿 title 当 React key）
- `quiz` 恰好 2 题、每题 3 个互不相同的选项
- 长度落在 Global Constraints 的英文初值区间内

- [ ] **Step 5: 提交**

```bash
git add src/data/_en-parts/guides-01.ts
git commit -m "guides.en 第 1 批：rhinoceros-beetle 起 10 种"
```

---

## Task 20: 合并、校准阈值、闸门转绿

**Files:**
- Create: `src/data/insects.en.ts`、`src/data/guides.en.ts`
- Delete: `src/data/_en-parts/`
- Modify: `src/main.en.tsx`、`src/data/__tests__/{insects,guides}.test.ts`

- [ ] **Step 1: 合并片段**

`src/data/insects.en.ts`：

```ts
import type { Insect } from './types'
import { PART_01 } from './_en-parts/insects-01'
// … 02–06

export const INSECTS: Insect[] = [...PART_01, ...PART_02, ...PART_03, ...PART_04, ...PART_05, ...PART_06]
export const getInsect = (id: string) => INSECTS.find(i => i.id === id)
```

`guides.en.ts` 同理，用对象展开合并。

- [ ] **Step 2: 跑闸门，看还剩多少红**

Run: `npm test 2>&1 | tail -40`

- [ ] **Step 3: 校准长度阈值**

写一次性脚本量出英文各字段的实际分布：

```bash
npx tsx -e "
import { INSECTS } from './src/data/insects.en'
const lens = INSECTS.map(i => i.summary.length).sort((a,b)=>a-b)
console.log('summary', lens[0], lens[lens.length-1])
"
```

对每个字段做同样的事，把 Global Constraints 里的初值收紧到「实测最小值 −10%、最大值 +10%」。**只在译文本身合格时才放宽阈值**——阈值是用来抓离群译文的，不是用来迁就它们的。超出区间的先判断是不是译文太长/太短，是就改译文。

- [ ] **Step 4: 内联片段、删掉中转目录**

把六个片段的内容直接搬进 `insects.en.ts` / `guides.en.ts`，删掉 `_en-parts/`——中转目录是为并行准备的脚手架，留着会让人以为数据有两个出处。

- [ ] **Step 5: 英文入口换成英文数据**

`src/main.en.tsx` 的 import 从 `./data/insects.zh` 改成 `./data/insects.en`（`guides` 同），删掉 Task 5 留的 TODO 注释。

- [ ] **Step 6: 全量绿**

Run: `npm test && npm run build`
Expected: 全绿，构建通过。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "合并英文数据，四道闸门全部转绿

六批片段内联进 insects.en.ts / guides.en.ts，删掉 _en-parts 中转目录 ——
它是为并行准备的脚手架，留着会让人以为数据有两个出处。

长度阈值按实测分布收紧。收紧的原则是抓离群译文，不是迁就它们：
超区间的先判断译文本身是不是太长太短，是就改译文而不是放宽闸门。"
```

---

## Task 21: 分享卡、README、AI 声明

**Files:**
- Modify: `scripts/make-og.sh`、`README.md`
- Create: `public/og-en.png`
- Test: `src/components/__tests__/discovery-disclaimer.test.tsx`（补英文用例）

- [ ] **Step 1: 英文分享卡**

`make-og.sh` 顶部接一个语言参数，其余流程（圆盘、叶片、衬板底、描边）完全复用：

```bash
LANG_ARG="${1:-zh}"
if [ "$LANG_ARG" = "en" ]; then
  OUT=public/og-en.png
  TITLE='Insect World'
  SUBTITLE='An interactive 3D field guide to 60 insects'
  TAGLINE='Rotate · Dissect · Annotate'
  # 英文卡不需要中文字体，绕开对 /mnt/c/Windows/Fonts 的依赖
  SERIF=$(fc-match -f '%{file}' 'Playfair Display:style=Regular' 2>/dev/null || echo /mnt/c/Windows/Fonts/georgia.ttf)
  SANS=$(fc-match -f '%{file}' 'DejaVu Sans' 2>/dev/null)
else
  OUT=public/og.png
  TITLE='昆虫世界'
  SUBTITLE='60 种昆虫的可交互 3D 图鉴'
  TAGLINE='旋转 · 剖切 · 标注点 —— 像博物学家一样观察'
  SERIF=/mnt/c/Windows/Fonts/NotoSerifSC-VF.ttf
  SANS=/mnt/c/Windows/Fonts/NotoSansSC-VF.ttf
fi
```

底部三处 `public/og.png` 改成 `"$OUT"`。注意：只有 `zh` 分支才检查那两个 Windows 字体是否可读，英文分支不该因为缺中文字体而退出。

Run: `bash scripts/make-og.sh en && identify public/og-en.png`
Expected: `1200x630`。

- [ ] **Step 2: 英文 AI 声明**

英文版的声明要说**两件事**：文案由 AI 撰写，且由 AI 从中文翻译。字典里加：

```ts
'disclaimer.ai': 'Written by AI and translated from Chinese by AI; not reviewed against entomological literature. Fine for getting a feel for the anatomy, not a citable source.',
```

中文版对应键的值保持现有措辞不变。

- [ ] **Step 3: 声明测试补英文**

`discovery-disclaimer.test.tsx` 加一个用英文 Provider 渲染的用例，断言声明里同时出现 `AI` 与 `translated`。

- [ ] **Step 4: README 补英文段**

README 顶部加一行 `English version: https://insect-world.pages.dev/en/`，并在「已知不足」里补一条：英文内容是 AI 从中文翻译的，未经母语者校订。

- [ ] **Step 5: 测试 + 提交**

```bash
npm test
git add -A
git commit -m "英文分享卡、AI 声明与 README

英文声明比中文多说一件事：内容不只由 AI 撰写，还由 AI 翻译。两层
都得讲明白，少说一层就是把翻译误差藏起来。"
```

---

## Task 22: 真机核验

跑通测试不等于页面对。这一步必须用真浏览器。

- [ ] **Step 1: 起本地生产构建**

Run: `npm run build && npm run preview`

- [ ] **Step 2: 中文版逐项过**

打开 `http://localhost:4173/`，确认：顶栏五个入口、搜索（搜「甲虫」「Coleoptera」）、分类筛选、主题切换、3D 展台四个工具、讲解弹窗分步、小测作答、对比条、笔记面板、页脚——**与改造前完全一致**。

- [ ] **Step 3: 英文版逐项过**

打开 `http://localhost:4173/en/`，同样过一遍，另外确认：没有一处残留中文、没有一处显示成字典键名、目名显示为 `Beetles (Coleoptera)` 形式、术语双标只在首次出现时标注。

- [ ] **Step 4: 切换与深链**

在中文版点开第 40 个物种 → 切 EN → 确认落在同一物种的英文页且地址是 `/en/?s=<id>`。直接访问 `/en/?s=caddisfly` 与 `/en/?s=不存在的id`，后者应静默回落首个物种。

- [ ] **Step 5: 提示条**

把浏览器语言改成英文，访问 `/`，确认顶部出现 `View in English →`；关掉它，刷新，确认不再出现。

- [ ] **Step 6: 移动端**

DevTools 切到手机尺寸，两版各看一遍，确认英文较长的文案没有把三栏布局撑破。

- [ ] **Step 7: 记录并提交修复**

发现的问题逐条修，每修一条一个提交。

---

## 收尾

全部任务完成后：`npm test` 全绿、`npm run build` 通过、真机两版都核验过，然后 commit → PR → merge 一气呵成（这是本项目的既定约定）。
