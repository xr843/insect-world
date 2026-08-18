/**
 * 骨架层（rig）的契约。
 *
 * 动作层要驱动的是**句柄**，不是几何 —— 这份测试钉住句柄从哪来、带什么、
 * 以及「谁没有句柄」这件事必须是显式声明的。
 *
 * 为什么普查这么重要：D 轮触角微动上线后，用户实测抓出 9 只自写触角的物种
 * 静默哑掉（星天牛为首，触角恰是它的招牌）—— 几何合法、测试全绿、页面不报错，
 * 触角只是安静地不动。骨架层覆盖面比触角大得多，同一个坑不能再踩第二次。
 */
import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { chitin, finalize, registerPart, wing, wingPair, type WingSpec } from '../kit'

const mat = chitin({ color: '#333' })
const SPEC: WingSpec = { base: [0.4, 0.3, 0.12], length: 1.6, width: 0.7, spread: 170, tilt: 12 }

/** 把一个部件塞进 group 走一遍 finalize，拿到收集后的 rig */
function rigOf(build: (g: THREE.Group) => void) {
  const g = new THREE.Group()
  build(g)
  return finalize(g, { body: new THREE.Vector3() }).rig
}

describe('wing() 的骨架标记', () => {
  it('pivot 带上了 wing 标记，side 与传入一致', () => {
    const rig = rigOf((g) => g.add(wing(SPEC, mat, undefined, 1)))
    expect(rig?.wings).toHaveLength(1)
    expect(rig!.wings![0].side).toBe(1)
  })

  it('rest 是姿态摆完之后的快照，不是零位', () => {
    // spread 170 / tilt 12 都不为零，rest 必须记住它们 ——
    // 记成零位的话，动作层一驱动就把逐只调出来的展角抹平。
    const rig = rigOf((g) => g.add(wing(SPEC, mat, undefined, 1)))
    const rest = rig!.wings![0].rest
    expect(rest.y).not.toBeCloseTo(0, 3)
    expect(rest.x).toBeCloseTo(THREE.MathUtils.degToRad(12), 5)
  })

  it('rest 是快照不是活引用：转动 pivot 之后 rest 不变', () => {
    const rig = rigOf((g) => g.add(wing(SPEC, mat, undefined, 1)))
    const { pivot, rest } = rig!.wings![0]
    const before = rest.x
    pivot.rotation.x += 1.23
    expect(rest.x).toBe(before)
  })

  it('role 原样透传，不填就是 undefined（kit 不猜前后翅）', () => {
    const withRole = rigOf((g) => g.add(wing({ ...SPEC, role: 'hind' }, mat, undefined, 1)))
    expect(withRole!.wings![0].role).toBe('hind')
    const without = rigOf((g) => g.add(wing(SPEC, mat, undefined, 1)))
    expect(without!.wings![0].role).toBeUndefined()
  })

  it('wingPair() 两片都带标记，且 side 相反', () => {
    const rig = rigOf((g) => g.add(wingPair(SPEC, mat)))
    expect(rig?.wings).toHaveLength(2)
    expect(rig!.wings!.map((w) => w.side).sort()).toEqual([-1, 1])
  })

  it('打标记不改几何：同参数两次构建顶点数一致且非零', () => {
    const count = (o: THREE.Object3D) => {
      let n = 0
      o.traverse((c) => {
        const m = c as THREE.Mesh
        if (m.isMesh) n += m.geometry.getAttribute('position').count
      })
      return n
    }
    const a = wing(SPEC, mat, undefined, 1)
    const b = wing(SPEC, mat, undefined, 1)
    expect(count(a)).toBeGreaterThan(0)
    expect(count(a)).toBe(count(b))
  })

  it('hornet / ichneumon-wasp 依赖的 pivot.children[0] = 翅面这层结构没被破坏', () => {
    // 这两个物种文件里是 `foreWings.children[0].children[0]` 这样硬取的，
    // 骨架标记只能挂 userData，不许往 pivot 里插节点。
    const pivot = wing(SPEC, mat, undefined, 1)
    expect(pivot.children).toHaveLength(1)
    expect(pivot.children[0].type).toBe('Group')
  })
})

describe('registerPart()', () => {
  it('登记过的自写部件按名字进 rig.parts', () => {
    const rig = rigOf((g) => {
      const elytra = new THREE.Group()
      elytra.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat))
      g.add(registerPart(elytra, 'elytra-right'))
    })
    expect(Object.keys(rig?.parts ?? {})).toEqual(['elytra-right'])
  })

  it('返回传入的对象本身，方便串写', () => {
    const o = new THREE.Group()
    expect(registerPart(o, 'x')).toBe(o)
  })
})

describe('finalize() 的收集行为', () => {
  it('没有任何标记时 rig 是 undefined —— 静态物种不该凭空多出一个空 rig', () => {
    const rig = rigOf((g) => g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat)))
    expect(rig).toBeUndefined()
  })

  it('base 与 anchors 在同一套坐标里（都随居中平移过）', () => {
    // 把翅摆在一个偏离原点很远的位置，finalize 会把整体居中；
    // 若 base 在居中前取，它会与 anchors 差整整一个 center。
    const g = new THREE.Group()
    g.add(wing({ ...SPEC, base: [8, 0, 0] }, mat, undefined, 1))
    const model = finalize(g, { tip: new THREE.Vector3(8, 0, 0) })
    const base = model.rig!.wings![0].base
    expect(base.x).toBeCloseTo(model.anchors.tip.x, 4)
    expect(base.y).toBeCloseTo(model.anchors.tip.y, 4)
    expect(base.z).toBeCloseTo(model.anchors.tip.z, 4)
  })
})

describe('全物种普查：翅的骨架覆盖', () => {
  /**
   * 豁免名单必须逐条给理由。名单本身就是技术债的账本 ——
   * 「这只虫为什么不会扑翅」在这里能一眼查到，而不是等用户报「它怎么不动」。
   */
  const EXEMPT: Record<string, string> = {
    // —— 真的没有（外露的）翅 ——
    ant: '日本弓背蚁：图鉴取的是工蚁，无翅型',
    'termite-soldier': '黑翅土白蚁兵蚁：兵蚁品级无翅',
    'stick-insect': '竹节虫：本种翅退化，拟态枯枝是它的招牌',
    'water-strider': '水黾：常见的无翅型，六足划水才是看点',

    // —— 前翅骨化/革质，形态是逐只自写的，kit 的膜翅 wing() 造不出 ——
    // 鞘翅目 28 种：鞘翅是硬壳、后翅折叠收纳在鞘翅之下，
    // wing() 的「一片展开的膜」模型根本不是这个形态。
    // 这批要动起来走的是 registerPart('elytra-*') + 物种专属动作（掀鞘翅起飞），
    // 不是通用扑翅。
    'rhinoceros-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    ladybird: '鞘翅目：鞘翅与折叠后翅自写',
    firefly: '鞘翅目：鞘翅与折叠后翅自写',
    'longhorn-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'tiger-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'stag-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'jewel-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'dung-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    weevil: '鞘翅目：鞘翅与折叠后翅自写',
    'click-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'diving-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'rove-beetle': '鞘翅目：鞘翅极短，后翅折叠自写',
    'flower-chafer': '鞘翅目：鞘翅与折叠后翅自写',
    'burying-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'tortoise-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'hercules-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'whirligig-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'ground-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'blister-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'hister-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'goliath-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'bombardier-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'darkling-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'net-winged-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'leaf-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'water-scavenger': '鞘翅目：鞘翅与折叠后翅自写',
    'checkered-beetle': '鞘翅目：鞘翅与折叠后翅自写',
    'shining-chafer': '鞘翅目：鞘翅与折叠后翅自写',

    cockroach: '德国小蠊：革质覆翅自写',
    earwig: '海滨蠼螋：革翅目，极短的革质前翅自写',
  }

  it('除豁免名单外，全部物种都能拿到翅的骨架句柄（随图鉴总数自动伸缩）', async () => {
    const { INSECTS } = await import('../../../data/insects.zh')
    const { loadInsectModel } = await import('../../registry')
    const dead: string[] = []
    for (const insect of INSECTS) {
      if (insect.id in EXEMPT) continue
      const model = await loadInsectModel(insect.id)
      if (!model.rig?.wings?.length) dead.push(`${insect.name}(${insect.id})`)
    }
    expect(
      dead,
      `这些物种拿不到翅的骨架句柄，扑翅会静默哑掉：${dead.join('、')}\n` +
        '要么让它用 kit 的 wing()/wingPair()，要么加进 EXEMPT 并写明理由。',
    ).toEqual([])
  }, 30000)

  it('豁免名单里没有已经不存在的物种 —— 名单会腐烂，让它自己报警', async () => {
    const { INSECTS } = await import('../../../data/insects.zh')
    const ids = new Set(INSECTS.map((i) => i.id))
    const stale = Object.keys(EXEMPT).filter((id) => !ids.has(id))
    expect(stale, `豁免名单里这些 id 已不在图鉴中：${stale.join('、')}`).toEqual([])
  })
})

describe('翅骨架的 role：四翅物种前后有别，双翅目只有前翅', () => {
  /**
   * 只覆盖本轮接线的 17 只自写翅物种（见上面普查测试列出的名单）——
   * 其余物种（包括用 kit.wing() 自动打标记的那些）role 是否齐备不是
   * 本轮任务范围，不在这里断言，避免测试范围和任务范围脱节。
   */
  const FOUR_WING = [
    // 蜻蜓目 + 脉翅目近亲 + 广翅目 + 毛翅目：两对翅形态独立，扑翅要错相位
    'dragonfly',
    'damselfly',
    'lacewing',
    'dobsonfly',
    'caddisfly',
    'mantidfly',
    // 鳞翅目（蝶+蛾）：前后翅同样独立
    'monarch-butterfly',
    'swallowtail',
    'silk-moth',
    'hawk-moth',
    'dead-leaf-butterfly',
  ]
  const DIPTERA_FORE_ONLY = ['robber-fly', 'crane-fly', 'house-fly', 'mosquito']

  it('四翅物种（蜻蜓/豆娘/草蛉/齿蛉/石蛾/螳蛉/蝶蛾类）fore 与 hind 都要出现', async () => {
    const { loadInsectModel } = await import('../../registry')
    const missing: string[] = []
    for (const id of FOUR_WING) {
      const model = await loadInsectModel(id)
      const roles = new Set((model.rig?.wings ?? []).map((w) => w.role))
      if (!roles.has('fore') || !roles.has('hind')) missing.push(`${id}(${[...roles].join(',') || '空'})`)
    }
    expect(
      missing,
      `这些四翅物种的 fore/hind 没有同时出现，扑翅时后翅会跟前翅同相，不是真实的四翅昆虫飞行：${missing.join('、')}`,
    ).toEqual([])
  }, 30000)

  it('双翅目（家蝇/库蚊/大蚊/食虫虻）只登记了前翅，没有 hind（平衡棒不是翅，不登记）', async () => {
    const { loadInsectModel } = await import('../../registry')
    const bad: string[] = []
    for (const id of DIPTERA_FORE_ONLY) {
      const model = await loadInsectModel(id)
      const roles = (model.rig?.wings ?? []).map((w) => w.role)
      if (roles.length === 0 || roles.some((r) => r !== 'fore')) bad.push(`${id}(${roles.join(',') || '空'})`)
    }
    expect(bad, `这些双翅目物种的翅 role 不是纯 fore：${bad.join('、')}`).toEqual([])
  }, 30000)
})
