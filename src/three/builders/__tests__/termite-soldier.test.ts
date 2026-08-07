/**
 * 白蚁兵蚁头部/大颚返工验证。
 *
 * 上一版测试全绿但渲染实拍不像：头部是没有倒角的 BoxGeometry（平面着色），
 * 大颚是两片扁平的黑色三角片。返工到这一版又经历了一轮协调者用真实
 * 默认机位（InsectCanvas.tsx 的 home=(0.86,0.44,1.25)）实拍复核：头部
 * 通过，但大颚即使已经做出了厚度/弯曲/末端交叉，从这个机位投影后仍然
 * 完全糊成一支圆锥状的喙，看不出"两支"——根本原因是"世界坐标里分得
 * 够开"不等于"看着分得开"，该机位 Z 分量最大，会把大颚主要发生在世界
 * Z 轴上的左右分离大幅压扁。
 *
 * 这次的断言专门盯这两处几何缺陷本身（而不是重复 round5b.test.ts 已经
 * 覆盖的构建成功/anchors/无 NaN/无复眼/面数预算——那些交给
 * round5b.test.ts，这里不重复造轮子）：
 *
 * - 头部不是裸 BoxGeometry：顶点数应明显多于立方体的 24 个
 *   （倒角/放样必然带来更多顶点，这是最直接、不依赖具体实现细节的判据）。
 * - 大颚是弯的、有交叠：不依赖任何内部实现公式，直接读取名为 'mandible'
 *   的两个 mesh 的**真实几何顶点**——按局部 X（沿颚长方向）切出「基部/
 *   中段/末端」薄片，检验中点相对"基-尖"弦有明显横向偏移（不共线）；
 *   末端交叉改用"该 mesh 是否存在明显越过中线（z 符号与整体相反）的
 *   顶点"判断，不依赖固定比例的采样窗口——大颚现在中前段刻意留出大段
 *   间隙、只在很接近末梢处才收拢交叉，窗口式质心平均容易把"越过之前"
 *   和"越过之后"的顶点混在一起、稀释掉信号，改成扫全部顶点找存在性
 *   更稳。
 * - **重点新增**：大颚在默认机位投影下确实分得开，不是只在世界坐标系
 *   里分得开——这是协调者反馈里唯一要求"真正管用"的断言，也是这次返工
 *   最终要守住的判据。做法：把左右两颚的全部顶点投影到 home 方向对应
 *   的成像平面（右=xAxis、上=yAxis，与相机 lookAt 同一套基向量），按
 *   颚长（世界 X）切成若干片，每片分别取投影后的 2D 包围盒，判断左右
 *   两片的包围盒是否相交；断言存在一段足够长的连续区间两者互不相交
 *   （即真的有看得见的空隙），而不只是端点/质心这类稀疏采样点凑巧分开。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildTermiteSoldier } from '../termite-soldier'

describe('白蚁兵蚁 buildTermiteSoldier（返工验证）', () => {
  const model = buildTermiteSoldier()

  it('成功构建，不抛异常', () => {
    expect(model.group).toBeInstanceOf(THREE.Group)
  })

  it('包围球半径 > 0', () => {
    expect(model.radius).toBeGreaterThan(0)
  })

  it('所有几何体顶点无 NaN', () => {
    const bad: string[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const pos = mesh.geometry.getAttribute('position')
      for (let i = 0; i < pos.count; i++) {
        if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i)) || !Number.isFinite(pos.getZ(i))) {
          bad.push(`${mesh.name || mesh.type}#${i}`)
          break
        }
      }
    })
    expect(bad, `发现 NaN/Infinity 顶点: ${bad.join(', ')}`).toEqual([])
  })

  it('anchors 恰好是 head/mandible/abdomen/antenna/thorax/leg，且坐标有限', () => {
    const expected = ['head', 'mandible', 'abdomen', 'antenna', 'thorax', 'leg'].sort()
    const actual = Object.keys(model.anchors).sort()
    expect(actual).toEqual(expected)
    for (const key of expected) {
      const v = model.anchors[key]
      expect(v).toBeInstanceOf(THREE.Vector3)
      expect(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z), `anchor ${key} 含 NaN: ${v.toArray()}`).toBe(true)
    }
  })

  it('radius > 0 且总面数打印出来（预算把关交给 round5b.test.ts）', () => {
    let triangles = 0
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const geo = mesh.geometry
      triangles += geo.index ? geo.index.count / 3 : geo.getAttribute('position').count / 3
    })
    // eslint-disable-next-line no-console
    console.log(`[termite-soldier 返工] triangles = ${Math.round(triangles)}`)
    expect(model.radius).toBeGreaterThan(0)
  })

  it('头部包围盒体积 ≥ 胸+腹体积之和（"大头拖着一小截软身子"，返工后仍要保住这条）', () => {
    model.group.updateMatrixWorld(true)
    const headBox = new THREE.Box3()
    const thoraxBox = new THREE.Box3()
    const abdomenBox = new THREE.Box3()
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      if (mesh.name === 'head') headBox.union(new THREE.Box3().setFromObject(mesh))
      if (mesh.name === 'thorax') thoraxBox.union(new THREE.Box3().setFromObject(mesh))
      if (mesh.name === 'abdomen') abdomenBox.union(new THREE.Box3().setFromObject(mesh))
    })
    expect(headBox.isEmpty(), '找不到 head 命名的 mesh').toBe(false)
    expect(thoraxBox.isEmpty(), '找不到 thorax 命名的 mesh').toBe(false)
    expect(abdomenBox.isEmpty(), '找不到 abdomen 命名的 mesh').toBe(false)

    const headSize = new THREE.Vector3()
    headBox.getSize(headSize)
    const thoraxSize = new THREE.Vector3()
    thoraxBox.getSize(thoraxSize)
    const abdomenSize = new THREE.Vector3()
    abdomenBox.getSize(abdomenSize)

    const headVolume = headSize.x * headSize.y * headSize.z
    const restVolume = thoraxSize.x * thoraxSize.y * thoraxSize.z + abdomenSize.x * abdomenSize.y * abdomenSize.z
    // eslint-disable-next-line no-console
    console.log(`[termite-soldier 返工] headBox=${headSize.toArray().map((n) => n.toFixed(3))} ratio=${(headVolume / restVolume).toFixed(2)}`)
    expect(headVolume).toBeGreaterThanOrEqual(restVolume)
  })

  it('不存在任何复眼 mesh（兵蚁是盲的，返工不应引入 eye 命名）', () => {
    const eyeLike: string[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && /eye/i.test(mesh.name)) eyeLike.push(mesh.name)
    })
    expect(eyeLike, `发现疑似复眼命名的 mesh: ${eyeLike.join(', ')}`).toEqual([])
  })

  it('头部不是裸 BoxGeometry：顶点数应明显多于立方体的 24 个（证明是放样/倒角出来的）', () => {
    const headMeshes: THREE.Mesh[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.name === 'head') headMeshes.push(mesh)
    })
    expect(headMeshes.length, '找不到 head 命名的 mesh').toBeGreaterThan(0)

    const totalVerts = headMeshes.reduce((sum, m) => sum + m.geometry.getAttribute('position').count, 0)
    // eslint-disable-next-line no-console
    console.log(`[termite-soldier 返工] head 顶点数 = ${totalVerts}（裸 BoxGeometry 是 24）`)
    // 门槛给到 24 的好几倍，避免一个刚好卡在 24 附近的低模箱子蒙混过关
    expect(totalVerts, `head 顶点数 ${totalVerts} 应明显多于 BoxGeometry 的 24 个`).toBeGreaterThan(100)

    // 顺带确认不是 BoxGeometry 类型本身（双保险，防止有人换一种方式仍然用 Box）
    for (const m of headMeshes) {
      expect(m.geometry.type, 'head 的几何体不应是 BoxGeometry').not.toBe('BoxGeometry')
    }
  })

  it('头部表面法线连续变化（真的是平滑放样，不是逐面平光）', () => {
    const headMeshes: THREE.Mesh[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.name === 'head') headMeshes.push(mesh)
    })
    expect(headMeshes.length).toBeGreaterThan(0)
    for (const mesh of headMeshes) {
      const normal = mesh.geometry.getAttribute('normal')
      expect(normal, 'head 几何体应带 normal 属性').toBeDefined()
      // 统计法线方向的不同取值个数（四舍五入到 2 位小数去重）——
      // 逐面平面着色的箱子每个面只有 1 个法线方向，6 个面最多 6 种；
      // 平滑放样的圆角体应该有几十种连续变化的方向。
      const seen = new Set<string>()
      for (let i = 0; i < normal.count; i++) {
        const key = `${normal.getX(i).toFixed(2)},${normal.getY(i).toFixed(2)},${normal.getZ(i).toFixed(2)}`
        seen.add(key)
      }
      // eslint-disable-next-line no-console
      console.log(`[termite-soldier 返工] head 法线方向种类 = ${seen.size}`)
      expect(seen.size, `head 法线方向种类只有 ${seen.size} 种，读起来会像平面着色的箱子`).toBeGreaterThan(20)
    }
  })

  describe('大颚：有厚度、明显弯曲、末端交叉', () => {
    const mandibleMeshes: THREE.Mesh[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.name === 'mandible') mandibleMeshes.push(mesh)
    })

    it('恰好有两个 mandible 命名的 mesh（左右各一）', () => {
      expect(mandibleMeshes.length).toBe(2)
    })

    /** 按局部 X 落在 [lo,hi]（相对该 mesh 自身 X 范围的比例）内的顶点质心。 */
    function sliceCentroid(mesh: THREE.Mesh, loFrac: number, hiFrac: number): THREE.Vector3 {
      const pos = mesh.geometry.getAttribute('position')
      mesh.geometry.computeBoundingBox()
      const bb = mesh.geometry.boundingBox!
      const span = bb.max.x - bb.min.x
      const lo = bb.min.x + span * loFrac
      const hi = bb.min.x + span * hiFrac
      const sum = new THREE.Vector3()
      let n = 0
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        if (x >= lo && x <= hi) {
          sum.x += x
          sum.y += pos.getY(i)
          sum.z += pos.getZ(i)
          n++
        }
      }
      expect(n, `切片 [${loFrac},${hiFrac}] 内找不到顶点（span=${span.toFixed(4)}）`).toBeGreaterThan(0)
      return sum.divideScalar(n)
    }

    it('沿颚长方向采样的点不共线：中点相对"基-尖"弦有明显横向偏移（证明真的是弯的镰刀，不是直杆）', () => {
      for (const mesh of mandibleMeshes) {
        // 基部/末端切片窗口取窄一点（5%）：大颚现在学 ant.ts 的样子，中前段
        // 故意留出大段间隙、只在接近末端（约 80% 长度后）才收拢越过中线，
        // 窗口太宽会把"越过之前"和"越过之后"的顶点混进同一个质心，稀释掉
        // 交叉的信号。
        const base = sliceCentroid(mesh, 0, 0.05)
        const mid = sliceCentroid(mesh, 0.45, 0.55)
        const tip = sliceCentroid(mesh, 0.95, 1.0)

        const chord = new THREE.Vector3().subVectors(tip, base)
        const chordLen = chord.length()
        expect(chordLen, `${mesh.name} 基-尖弦长 ${chordLen} 太短，测不出弯曲`).toBeGreaterThan(0.05)

        const toMid = new THREE.Vector3().subVectors(mid, base)
        const proj = chord.clone().normalize().multiplyScalar(toMid.dot(chord) / chordLen)
        const lateralOffset = new THREE.Vector3().subVectors(toMid, proj).length()

        // eslint-disable-next-line no-console
        console.log(
          `[termite-soldier 返工] mandible base=${base.toArray().map((n) => n.toFixed(4))} mid=${mid
            .toArray()
            .map((n) => n.toFixed(4))} tip=${tip.toArray().map((n) => n.toFixed(4))} lateralOffset=${lateralOffset.toFixed(4)} (chordLen=${chordLen.toFixed(4)})`,
        )
        expect(
          lateralOffset,
          `${mesh.name} 中点到基-尖弦的横向偏移 ${lateralOffset.toFixed(4)} 太小（弦长 ${chordLen.toFixed(4)}），读起来会像直杆而非弯钩`,
        ).toBeGreaterThan(chordLen * 0.08)
      }
    })

    it('有明显厚度：基部截面的 ry/rz 都不是"薄片"量级（跟弦长比，不应小到读成剪纸）', () => {
      for (const mesh of mandibleMeshes) {
        mesh.geometry.computeBoundingBox()
        const bb = mesh.geometry.boundingBox!
        const size = new THREE.Vector3()
        bb.getSize(size)
        // 用整只大颚包围盒的 Y/Z 跨度做厚度的下界代理：只要有一个方向的
        // 跨度太小（比如 < 长度的 3%），渲染出来大概率就是一条扁带。
        const minSpan = Math.min(size.y, size.z)
        // eslint-disable-next-line no-console
        console.log(`[termite-soldier 返工] ${mesh.name} bbox=${size.toArray().map((n) => n.toFixed(4))}`)
        expect(minSpan, `${mesh.name} 包围盒最窄方向 ${minSpan.toFixed(4)} 相对长度 ${size.x.toFixed(4)} 太薄`).toBeGreaterThan(size.x * 0.06)
      }
    })

    it('末端越过中线：每支大颚都存在明显偏到对侧的顶点（不依赖固定采样窗口，扫全部顶点找存在性）', () => {
      // 大颚现在中前段刻意留出大段间隙、只在很接近末梢处才收拢交叉——
      // 交叉点在 t 上非常靠后，固定比例的采样窗口（哪怕只有 5%）平均下来
      // 也可能把"越过之前"和"刚越过"的顶点混在一起、拉平掉信号。改成
      // 直接扫这支 mesh 的全部顶点：先用平均 z 判断这支大颚整体在中线
      // 哪一侧（基部主导多数顶点），再断言存在明显偏到中线对侧、且偏移
      // 幅度不是"贴着 0 的浮点噪声"的顶点（末梢内钩+截面半径，会让越过
      // 中线的部分不只是数学上的一个点，而是有一小片真实体积）。
      for (const mesh of mandibleMeshes) {
        const pos = mesh.geometry.getAttribute('position')
        let sumZ = 0
        let minZ = Infinity
        let maxZ = -Infinity
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i)
          sumZ += z
          if (z < minZ) minZ = z
          if (z > maxZ) maxZ = z
        }
        const meanZ = sumZ / pos.count
        // eslint-disable-next-line no-console
        console.log(`[termite-soldier 返工] ${mesh.name} meanZ=${meanZ.toFixed(4)} minZ=${minZ.toFixed(4)} maxZ=${maxZ.toFixed(4)}`)
        if (meanZ > 0) {
          expect(minZ, `右颚（meanZ=${meanZ.toFixed(4)}）应存在明显越过中线（z<-0.003）的顶点，实际 minZ=${minZ.toFixed(4)}`).toBeLessThan(-0.003)
        } else {
          expect(maxZ, `左颚（meanZ=${meanZ.toFixed(4)}）应存在明显越过中线（z>0.003）的顶点，实际 maxZ=${maxZ.toFixed(4)}`).toBeGreaterThan(0.003)
        }
      }
    })

    it('内缘光滑：mandible mesh 数量恰好是 2（没有像 ant.ts 那样另加碎齿 mesh）', () => {
      // 兵蚁的颚用于夹断而非咀嚼，内缘应保持光滑。若以后有人手滑加了牙齿，
      // 这里会先报错提醒重新审视是否符合物种设定（而不是默默通过）。
      expect(mandibleMeshes.length).toBe(2)
    })
  })

  describe('大颚在默认机位投影下的可辨识度（协调者实拍反馈的核心要求）', () => {
    const mandibleMeshes: THREE.Mesh[] = []
    model.group.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.isMesh && mesh.name === 'mandible') mandibleMeshes.push(mesh)
    })

    // 与 InsectCanvas.tsx（主站）/ preview.tsx（调试台）的默认机位保持
    // 一致——这是用户实际打开图鉴看到的角度，不是随手挑的验证角度。
    // 复刻标准 lookAt 基向量（相机位于 home*dist 处看向原点）：
    // zAxis 指向"从目标看向相机"（观众方向），xAxis=画面右，yAxis=画面上。
    const home = new THREE.Vector3(0.86, 0.44, 1.25).normalize()
    const worldUp = new THREE.Vector3(0, 1, 0)
    const zAxis = home.clone()
    const xAxis = new THREE.Vector3().crossVectors(worldUp, zAxis).normalize()
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis)

    function project(p: THREE.Vector3): { sx: number; sy: number } {
      return { sx: p.dot(xAxis), sy: p.dot(yAxis) }
    }

    function allVertices(mesh: THREE.Mesh): THREE.Vector3[] {
      const pos = mesh.geometry.getAttribute('position')
      const pts: THREE.Vector3[] = []
      for (let i = 0; i < pos.count; i++) pts.push(new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)))
      return pts
    }

    interface Box2 {
      minSx: number
      maxSx: number
      minSy: number
      maxSy: number
    }
    function bbox2D(pts: THREE.Vector3[]): Box2 | null {
      if (pts.length === 0) return null
      let minSx = Infinity
      let maxSx = -Infinity
      let minSy = Infinity
      let maxSy = -Infinity
      for (const p of pts) {
        const { sx, sy } = project(p)
        if (sx < minSx) minSx = sx
        if (sx > maxSx) maxSx = sx
        if (sy < minSy) minSy = sy
        if (sy > maxSy) maxSy = sy
      }
      return { minSx, maxSx, minSy, maxSy }
    }
    function boxesDisjoint(a: Box2 | null, b: Box2 | null): boolean {
      if (!a || !b) return false // 该切片某一侧没有顶点，不算"看得见的空隙"
      const overlapX = a.minSx <= b.maxSx && b.minSx <= a.maxSx
      const overlapY = a.minSy <= b.maxSy && b.minSy <= a.maxSy
      return !(overlapX && overlapY)
    }

    it('按颚长切片，左右两颚在默认机位投影下的 2D 包围盒存在一段足够长的连续区间互不相交（真的看得出是两支，不是一坨）', () => {
      expect(mandibleMeshes.length).toBe(2)
      const [meshA, meshB] = mandibleMeshes
      const vertsA = allVertices(meshA)
      const vertsB = allVertices(meshB)
      const meanZ = (pts: THREE.Vector3[]) => pts.reduce((s, p) => s + p.z, 0) / pts.length
      const [right, left] = meanZ(vertsA) >= meanZ(vertsB) ? [vertsA, vertsB] : [vertsB, vertsA]

      const allX = [...right, ...left].map((p) => p.x)
      const xMin = Math.min(...allX)
      const xMax = Math.max(...allX)
      expect(xMax - xMin, '大颚整体沿 X 的跨度太小，切不出有意义的分段').toBeGreaterThan(0.05)

      const BINS = 20
      const flags: boolean[] = []
      for (let i = 0; i < BINS; i++) {
        const lo = xMin + ((xMax - xMin) * i) / BINS
        const hi = xMin + ((xMax - xMin) * (i + 1)) / BINS
        const rightBin = right.filter((p) => p.x >= lo && p.x <= hi)
        const leftBin = left.filter((p) => p.x >= lo && p.x <= hi)
        flags.push(boxesDisjoint(bbox2D(rightBin), bbox2D(leftBin)))
      }

      let curRun = 0
      let maxRun = 0
      for (const f of flags) {
        curRun = f ? curRun + 1 : 0
        if (curRun > maxRun) maxRun = curRun
      }
      // eslint-disable-next-line no-console
      console.log(`[termite-soldier 返工] 默认机位投影空隙 bins(共${BINS}): ${flags.map((f) => (f ? '○空隙' : '●重叠')).join(' ')}`)
      const required = Math.floor(BINS * 0.5)
      // eslint-disable-next-line no-console
      console.log(`[termite-soldier 返工] 最长连续空隙区间 = ${maxRun}/${BINS} 段（要求 ≥ ${required}）`)
      expect(
        maxRun,
        `默认机位（home=(0.86,0.44,1.25)）投影下，两颚最长连续"投影不重叠"区间只有 ${maxRun}/${BINS} 段（要求 ≥ ${required}），读起来会像一支糊在一起的喙而不是两支分开的镰刀`,
      ).toBeGreaterThanOrEqual(required)
    })
  })
})
