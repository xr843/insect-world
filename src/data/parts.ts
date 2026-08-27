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
 * `sound`（发声与听器）是「只按同源分」这条规矩本身的例外，留在这里记一笔：
 * `tymbal`（鸣器）、`stridulator`（音锉）是发声构造，`tympanum`（鼓膜听器）
 * 只管接收，三者并不同源。按同源拆开的话，发声一组只有蝉、蟋蟀两种，
 * 听器一组只有蝗虫、螽斯两种，两组都够不到上面「至少 4 个物种」的门槛。
 * 四者说的其实是同一件事 —— 昆虫怎么用声音彼此交流，组名也老实写成
 * 「发声与听器」，没有假装成一个同源结构。
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
  const start = at
  for (let step = 1; step <= n; step++) {
    // start 是 -1 时（当前物种不在列表里，比如被筛掉了），
    // step = 1 这一步 (start + step + n) % n 正好等于 0 —— 从头找起。
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
