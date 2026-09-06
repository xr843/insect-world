/**
 * 取景计算：全身取景距离，以及「聚焦到某个标注点」时相机该停在多远。
 *
 * ## 为什么聚焦距离不能是包围半径的固定倍数
 *
 * 原来的规则是 `dist = radius * 0.62`，`radius` 是**整只虫的包围球半径**。
 * 它对细长的虫（螳螂、蜻蜓、独角仙）取景很好，对紧实的圆虫（蜜蜂、七星瓢虫、
 * 东亚飞蝗、水黾）会把相机怼到一面光滑大曲面上 —— 满屏一片单色，认不出是什么虫。
 *
 * 原因是这条规则拿全局尺度去定**局部**取景。决定「看不看得出形状」的是
 * 标注点附近那块结构相对视场有多大：螳螂的包围半径由 9cm 的体长撑起来，
 * 而头部只有 0.8cm 粗，相机退到 0.62×radius 时头部只占画面的小半；七星瓢虫
 * 本身就是个球，包围半径≈鞘翅的曲率半径，同一条规则下虫体张角超过 77°，
 * 而视场只有 34° —— 必然铺满。
 *
 * ## 改成按画面占比反解距离
 *
 * 直接对准要控制的那个量：**虫体铺满了画面的多大比例**。把模型表面按面积
 * 均匀采样成点云，投影到视口的粗网格上数格子，就得到占比；占比随距离单调下降，
 * 二分即可反解出「占到 TARGET_COVERAGE」的距离。
 *
 * 这样细长虫与圆虫走的是同一条判据，不需要为体型分类；`aspect` 变化（手机竖屏
 * 视场更窄）也自动跟着变。代价是每次聚焦做一次 ~12 步的纯数学搜索（点云缓存在
 * 模型上），实测远小于一帧。
 */
import * as THREE from 'three'
import type { InsectModel } from './builders/kit'

/** 展台的默认机位方向（与 InsectCanvas 的 home 同一个值） */
export const HOME_DIR = new THREE.Vector3(0.86, 0.44, 1.25).normalize()

/**
 * 全身取景距离。
 *
 * ⚠️ 不能只按垂直 fov 算。竖屏（aspect < 1）时水平视场角比垂直的**窄**，
 * 按垂直算出来的距离会让虫左右出画。取两者的小值。
 */
export function fitDistance(camera: THREE.PerspectiveCamera, r: number, margin = 1.12): number {
  const vFov = (camera.fov * Math.PI) / 180
  const aspect = camera.aspect || 1
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  return (r / Math.sin(Math.min(vFov, hFov) / 2)) * margin
}

/** 占比网格的边长（格数）。24×24 = 576 格，分辨率 0.17%，够分开「铺满」与「留白」。 */
const GRID = 24
/** 采样点数。9000 点摊到 576 格，平均每格 15 点，实心轮廓不会采出窟窿。 */
const SAMPLES = 9000

/**
 * 聚焦后虫体该占画面的比例。
 *
 * **0.28 是照着旧规则下取景本来就好的那批虫量出来的**，不是拍的：
 * 螳螂 0.29、蜻蜓 0.29、竹节虫 0.21、姬蜂 0.17、水黾 0.15 —— 这些细长物种
 * 在旧规则（`radius * 0.62`）下取景一直很好，实测全部落在 0.15~0.30。
 * 糊成一片的那批则在 0.45 以上：阎甲 0.62、甘薯腊龟甲 0.62、白星花金龟 0.60、
 * 七星瓢虫的鞘翅那一个点约 0.7。两批之间隔着一道很宽的空档。
 *
 * ⚠️ 第一版按**全体中位数**取了 0.55，一渲染还是一堵红墙 —— 中位数里混着
 * 一半糊掉的样本，拿它当目标等于把「好」定义成了平均水平。判据必须只从
 * 好的那批里取。（这个错是靠看渲染图发现的，占比数字本身当时全在「合理范围」。）
 */
export const TARGET_COVERAGE = 0.28

const sampleCache = new WeakMap<THREE.Group, Float32Array>()

/**
 * 把模型表面按三角形面积均匀采样成点云（模型局部坐标，与 `anchors` 同一套空间）。
 *
 * 按**面积**而不是按顶点采样是必需的：程序化几何的顶点密度跟着细分参数走，
 * 一个 32 段的光滑穹顶和一条细分密集的腿顶点数可以差十倍，按顶点采样会把
 * 点云的重心拽到腿上，占比就量歪了。
 */
export function surfaceSamples(model: InsectModel): Float32Array {
  const hit = sampleCache.get(model.group)
  if (hit) return hit

  model.group.updateMatrixWorld(true)
  // 三角形顶点摊平进定长数组（每个三角形 9 个浮点）而不是存对象：
  // 一个物种上万面，按 {a,b,c} 存等于凭空造出几十万个 Vector3。
  const verts: number[] = []
  const areas: number[] = []
  let total = 0

  const va = new THREE.Vector3()
  const vb = new THREE.Vector3()
  const vc = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()

  model.group.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry) return
    const geo = mesh.geometry
    const pos = geo.getAttribute('position') as THREE.BufferAttribute | undefined
    if (!pos) return
    const index = geo.getIndex()
    const count = index ? index.count : pos.count
    for (let i = 0; i + 2 < count; i += 3) {
      const i0 = index ? index.getX(i) : i
      const i1 = index ? index.getX(i + 1) : i + 1
      const i2 = index ? index.getX(i + 2) : i + 2
      va.fromBufferAttribute(pos, i0).applyMatrix4(mesh.matrixWorld)
      vb.fromBufferAttribute(pos, i1).applyMatrix4(mesh.matrixWorld)
      vc.fromBufferAttribute(pos, i2).applyMatrix4(mesh.matrixWorld)
      const area = ab.subVectors(vb, va).cross(ac.subVectors(vc, va)).length() * 0.5
      if (!(area > 0)) continue
      verts.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z)
      total += area
      areas.push(total)
    }
  })

  const out = new Float32Array(SAMPLES * 3)
  if (areas.length === 0) {
    sampleCache.set(model.group, out)
    return out
  }

  // 固定序列而不是 Math.random()：同一个模型每次量到的占比必须一致，
  // 否则闸门会随机红绿、也没法拿两次读数比较改动前后。
  let seed = 0x9e3779b9
  const rnd = () => {
    seed ^= seed << 13
    seed ^= seed >>> 17
    seed ^= seed << 5
    return ((seed >>> 0) % 0xffffff) / 0xffffff
  }

  for (let s = 0; s < SAMPLES; s++) {
    const t = rnd() * total
    // 面积前缀和上二分，落到哪个三角形
    let lo = 0
    let hi = areas.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (areas[mid] < t) lo = mid + 1
      else hi = mid
    }
    const t9 = lo * 9
    let u = rnd()
    let v = rnd()
    if (u + v > 1) {
      u = 1 - u
      v = 1 - v
    }
    const w = 1 - u - v
    for (let k = 0; k < 3; k++) {
      out[s * 3 + k] = verts[t9 + k] * w + verts[t9 + 3 + k] * u + verts[t9 + 6 + k] * v
    }
  }

  sampleCache.set(model.group, out)
  return out
}

/**
 * 点云在这台相机下铺满了视口的多大比例。
 *
 * 相机背后的点直接丢弃 —— `Vector3.project()` 对 z 在近裁剪面之后的点会算出
 * 翻转的坐标，不剔掉的话相机埋进虫体时占比反而会掉下来，二分就会收敛到错的一侧。
 */
export function coverage(samples: Float32Array, camera: THREE.PerspectiveCamera): number {
  const cells = new Uint8Array(GRID * GRID)
  const p = new THREE.Vector3()
  const inv = camera.matrixWorldInverse
  const proj = camera.projectionMatrix
  let filled = 0
  for (let i = 0; i < samples.length; i += 3) {
    p.set(samples[i], samples[i + 1], samples[i + 2]).applyMatrix4(inv)
    if (p.z > -camera.near) continue
    p.applyMatrix4(proj)
    if (p.x < -1 || p.x > 1 || p.y < -1 || p.y > 1) continue
    const gx = Math.min(GRID - 1, Math.floor(((p.x + 1) / 2) * GRID))
    const gy = Math.min(GRID - 1, Math.floor(((p.y + 1) / 2) * GRID))
    const k = gy * GRID + gx
    if (cells[k] === 0) {
      cells[k] = 1
      filled++
    }
  }
  return filled / (GRID * GRID)
}

/**
 * 聚焦到 `anchor` 时相机该停的距离（与 anchor 同一套局部坐标，返回值是纯距离，
 * 旋转无关，可以直接交给世界坐标下的镜头插值用）。
 *
 * `dir` 是从 anchor 指向相机的方向（局部坐标，单位向量）—— 用当前机位的方向，
 * 这样聚焦只是「凑近」，不会把用户转好的角度抢走。
 */
export function focusDistance(
  camera: THREE.PerspectiveCamera,
  model: InsectModel,
  anchor: THREE.Vector3,
  dir: THREE.Vector3,
  radius: number,
): number {
  const samples = surfaceSamples(model)
  /**
   * 下界＝聚焦态的 minDistance，相机不许进到体表以内（2026-08-12 的「穿模」修复）。
   *
   * 上界给到全身取景距离的 2.2 倍，**不是**全身取景距离本身 —— 后者看着更合理，
   * 但对「锚点长在末梢」的物种不够用：镜头对的是锚点、不是虫体中心，姬蜂的产卵器
   * 尖端离虫体约两个半径，在全身取景距离上虫体还落在视锥之外，画面里只剩一根线
   * （实拍确认）。要把虫体收进画面得退到约 6.5 倍半径，才够得着目标占比。
   *
   * 放开上界对别的物种没有影响：扫描取的是**最接近目标占比**的那一档，正常锚点
   * 在全身取景距离之内就够到目标了，多出来的这段根本不会被选中。
   */
  let lo = radius * 0.5
  let hi = fitDistance(camera, radius) * 2.2
  if (!(hi > lo)) return lo

  const probe = new THREE.PerspectiveCamera(camera.fov, camera.aspect, camera.near, camera.far)
  const covAt = (d: number) => {
    probe.position.copy(anchor).addScaledVector(dir, d)
    probe.lookAt(anchor)
    probe.updateMatrixWorld(true)
    probe.updateProjectionMatrix()
    probe.matrixWorldInverse.copy(probe.matrixWorld).invert()
    return coverage(samples, probe)
  }

  /**
   * 扫描而不是二分 —— **占比对距离不单调**。
   *
   * 贴着大曲面（七星瓢虫的鞘翅）时占比随距离单调下降，二分成立；但锚点落在
   * 细长凸出物的尖端时（蜜蜂的喙、水黾的足）相反：凑得越近画面里越只剩一根针，
   * 占比反而随距离**上升**，要退到整只虫进画才见顶。二分在后一种上会一路收敛到
   * 最近端，把「虫体出画」的取景判成最优 —— 蜜蜂那张实拍就是这么来的。
   *
   * 24 档线性扫描取最接近目标的一档，两种形态走同一条路，不必先给虫分类。
   * 同分时取更近的一档：聚焦本来就是「凑近看」，两个距离一样好就该选近的那个。
   */
  const STEPS = 24
  let best = lo
  let bestErr = Infinity
  for (let i = 0; i <= STEPS; i++) {
    const d = lo + ((hi - lo) * i) / STEPS
    const err = Math.abs(covAt(d) - TARGET_COVERAGE)
    if (err < bestErr - 1e-6) {
      bestErr = err
      best = d
    }
  }
  return best
}
