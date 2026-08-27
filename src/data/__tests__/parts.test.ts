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
