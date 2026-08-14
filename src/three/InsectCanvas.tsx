/**
 * 3D 展台
 *
 * 观感目标：博物馆标本盒里的一盏柔光 —— 暖调主光压出体积，
 * 冷调补光救回暗部，背后一道轮廓光把虫体从米色背景里剥离出来。
 * 甲虫的鞘翅靠 Environment 里的几片 lightformer 出高光，没有它们
 * clearcoat 材质会显得像塑料。
 */
import { Suspense, lazy, memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Insect } from '../data/types'
import type { InsectModel } from './builders/kit'
import { loadInsectModel } from './registry'
import { bindContextLoss } from './webgl'

/** 后期管线懒加载：+103KB gzip 的 postprocessing 只让真正会用它的桌面端下载（详见 PostFX.tsx 头注释） */
const PostFX = lazy(() => import('./PostFX'))

/**
 * 触屏设备一次性判定，用于渲染降配。
 * 手机 GPU 扛不住桌面档的阴影贴图与像素密度 —— 用户实测「不够流畅」。
 * pointer: coarse 比 UA 嗅探可靠：带鼠标的平板会取到 fine，按桌面走。
 */
const COARSE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
/** ?pdb=1 开 preserveDrawingBuffer（截图/出图链路专用，默认关省显存） */
const PDB = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pdb')
/** 系统「减少动态效果」：CSS 那侧有全局规则兜底，JS 驱动的触角微动在这里问一次 */
const REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** 标注四色经 CSS token 解析（var(--coral) 等），自动跟随明暗主题 */
const TONE_VAR: Record<string, string> = {
  coral: 'var(--coral)',
  lavender: 'var(--lavender)',
  sage: 'var(--sage)',
  amber: 'var(--amber)',
}

export type ViewMode = 'normal' | 'isolate' | 'section' | 'layers'

// ---------------------------------------------------------------- 模型

/**
 * 虫体本身 + 挂在它身上的一切。
 *
 * ⚠️ 标注点必须作为 children 放进**这个** group，而不是当兄弟节点摆在
 * 场景里。anchors 是模型的**局部坐标**，只有跟着同一个 group 一起被
 * 旋转和缩放，圆点才会钉在虫身上；放在外面就会出现「虫在转、点不动」。
 */
function InsectMesh({
  model,
  mode,
  spin,
  pauseUntil,
  onReady,
  children,
  groupRef,
}: {
  children?: React.ReactNode
  /** 由 Scene 持有，Framing 需要用它把局部锚点换算成世界坐标 */
  groupRef: React.MutableRefObject<THREE.Group | null>
  model: InsectModel
  mode: ViewMode
  spin: boolean
  /** 交互后的「让转」截止时刻（performance.now() 基准） */
  pauseUntil: React.MutableRefObject<number>
  onReady: (box: THREE.Box3) => void
}) {
  const ref = groupRef
  const born = useRef(0)
  /** 触角枢轴列表（D 轮微动）；随模型重建 */
  const antennae = useRef<THREE.Group[]>([])
  const swayT = useRef(0)

  // 切换物种时从略小的尺度弹入，避免生硬替换
  useLayoutEffect(() => {
    born.current = 0
    if (ref.current) ref.current.scale.setScalar(0.001)

    /**
     * 触角微动的一次性重锚（幂等，模型是 LRU 共享实例）。
     *
     * kit 的触角几何在组内是**绝对坐标**、组原点在模型原点——直接转组会绕
     * 模型中心抡大圈。按 userData.base 立一个枢轴组，再用 attach()（保世界
     * 变换）把触角挂过去，旋转就落在基部了。左右天线用基点 z 的符号错开
     * 相位，摆起来才像活物不像钟摆。
     */
    const pivots: THREE.Group[] = []
    model.group.traverse((o) => {
      if (o.name === 'antenna-pivot') pivots.push(o as THREE.Group)
    })
    if (pivots.length === 0) {
      const raw: THREE.Group[] = []
      model.group.traverse((o) => {
        if (o.name === 'antenna' && Array.isArray(o.userData.base)) raw.push(o as THREE.Group)
      })
      for (const node of raw) {
        const base = node.userData.base as [number, number, number]
        const pivot = new THREE.Group()
        pivot.name = 'antenna-pivot'
        pivot.position.set(base[0], base[1], base[2])
        // 自写触角常左右共用同一 base（如食蚜蝇），z 符号分不出边——钩子可自带 phase 覆写
        pivot.userData.phase =
          (node.userData.phase as number | undefined) ?? (base[2] >= 0 ? 0 : Math.PI * 0.62)
        node.parent?.add(pivot)
        pivot.attach(node)
        pivots.push(pivot)
      }
    }
    antennae.current = pivots

    const box = new THREE.Box3().setFromObject(model.group)
    onReady(box)
  }, [model, onReady])

  // 剖切：用裁剪平面把虫体从矢状面切开，看内部结构关系
  useEffect(() => {
    const planes = mode === 'section' ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)] : []
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) {
        mat.clippingPlanes = planes
        mat.clipShadows = true
        // 分层模式：外骨骼半透明，露出内部的附肢与体节
        const isShell = mat.name === 'shell'
        mat.transparent = mode === 'layers' ? true : mat.userData.wasTransparent ?? mat.transparent
        if (mode === 'layers') {
          mat.userData.baseOpacity ??= mat.opacity
          mat.opacity = isShell ? 0.28 : Math.min(mat.userData.baseOpacity ?? 1, 0.55)
        } else if (mat.userData.baseOpacity !== undefined) {
          mat.opacity = mat.userData.baseOpacity
        }
        mat.needsUpdate = true
      }
    })
  }, [model, mode])

  useFrame(({ invalidate }, dt) => {
    const g = ref.current
    if (!g) return
    born.current = Math.min(1, born.current + dt * 2.6)
    // back.out：末尾轻微过冲 ~3% 再落回，标本「放上台面」的弹性（参考站的入场手感）
    const u = born.current - 1
    const t = 1 + 2.2 * u * u * u + 1.2 * u * u
    g.scale.setScalar(0.8 + 0.2 * t)
    /**
     * 三种情况让自转停一停（都来自参考实现的相处之道）：
     * 用户正在拖 —— 转台跟人抢方向盘；松手后 3 秒内 —— 刚摆好的视角马上被带走；
     * 有说明卡开着 —— 读着读着字跟着虫跑了。
     */
    const paused = performance.now() < pauseUntil.current
    const live = spin && !paused
    // 0.14 rad/s ≈ 45 秒一圈。第三次应用户要求调慢（0.28→0.20→0.14）：
    // 有了「拖动让转 + 背面圆点淡出」之后，转速不再承担「快点转到正面」的职责，
    // 可以慢到纯粹当展柜的节奏
    if (live) g.rotation.y += dt * 0.14
    /**
     * 触角微动（D 轮）：两个不可通约频率叠加，避免读出机械钟摆感；
     * 幅度 ~2.5°。跟随 live 同一开关——自转让位（拖动/读卡/关自转）时
     * 触角也静止，按需渲染才有真正歇着的时刻；系统声明减少动效时不动。
     */
    if (live && !REDUCED_MOTION && antennae.current.length > 0) {
      swayT.current += dt
      const t = swayT.current
      for (const pivot of antennae.current) {
        const phase = (pivot.userData.phase as number) ?? 0
        const s = Math.sin(t * 1.9 + phase) * 0.032 + Math.sin(t * 3.3 + phase * 1.7) * 0.012
        pivot.rotation.y = s
        pivot.rotation.x = s * 0.45
      }
    }
    // 按需渲染下自己续帧：还在转、还没长完，都得有下一帧
    if (live || born.current < 1) invalidate()
  })

  return (
    <group ref={ref}>
      <primitive object={model.group} />
      {children}
    </group>
  )
}

// ---------------------------------------------------------------- 热点

function Hotspot({
  position,
  label,
  note,
  tone,
  open,
  onToggle,
  groupRef,
}: {
  position: THREE.Vector3
  label: string
  note: string
  tone: string
  open: boolean
  onToggle: () => void
  groupRef: React.MutableRefObject<THREE.Group | null>
}) {
  const color = TONE_VAR[tone] ?? TONE_VAR.coral
  const wrap = useRef<HTMLDivElement>(null)
  const fade = useRef(1)
  const scratch = useRef({ world: new THREE.Vector3(), center: new THREE.Vector3(), toCam: new THREE.Vector3() })

  /**
   * 转到背面的标注点要淡出（参考实现的 facing 测试，搬到 DOM 上）。
   *
   * 圆点是 DOM 元素，深度缓冲管不到它 —— 虫转过去后圆点仍浮在轮廓上，
   * 看起来像贴在玻璃罩外面。按「锚点相对虫心的朝向 · 视线方向」的点积
   * 平滑淡出，指数趋近避免闪烁；展开着的那颗压到最低 0.85，
   * 正在读的说明不能因为一点余转就消失。淡出后同时收掉点击。
   */
  useFrame(({ camera, invalidate }, dt) => {
    const el = wrap.current
    const g = groupRef.current
    if (!el || !g) return
    const { world, center, toCam } = scratch.current
    world.copy(position).applyMatrix4(g.matrixWorld)
    g.getWorldPosition(center)
    toCam.copy(camera.position).sub(world).normalize()
    world.sub(center)
    const r = world.length()
    const facing = r > 1e-4 ? world.divideScalar(r).dot(toCam) : 1
    let target = THREE.MathUtils.smoothstep(facing, -0.05, 0.3)
    if (open) target = Math.max(target, 0.85)
    const eased = fade.current + (target - fade.current) * (1 - Math.exp(-dt * 12))
    if (Math.abs(eased - fade.current) > 0.002) {
      fade.current = eased
      el.style.opacity = eased.toFixed(3)
      el.dataset.behind = eased < 0.35 ? 'true' : 'false'
    }
    if (Math.abs(target - fade.current) > 0.004) invalidate()
  })

  return (
    <Html position={position} center zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
      <div className="hotspot" data-open={open} ref={wrap}>
        <button
          className="hotspot-dot"
          style={{ '--tone': color } as React.CSSProperties}
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          aria-label={label}
        >
          <span className="hotspot-ring" />
        </button>
        {open && (
          <div className="hotspot-card">
            <div className="hotspot-title">
              <span className="hotspot-swatch" style={{ background: color }} />
              {label}
            </div>
            <div className="hotspot-note">{note}</div>
          </div>
        )}
      </div>
    </Html>
  )
}

// ---------------------------------------------------------------- 取景

/**
 * 每种虫的绝对尺寸差 20 倍（竹节虫 10cm vs 瓢虫 0.7cm），
 * 必须按包围球把相机推到合适距离，否则不是撑爆画面就是小成一点。
 */
function Framing({
  radius,
  controls,
  zoomNonce,
  resetNonce,
  focus,
  groupRef,
}: {
  radius: number
  controls: React.RefObject<OrbitControlsImpl>
  zoomNonce: number
  resetNonce: number
  /** 聚焦模式要凑近看的那个部位（模型**局部**坐标）；null 表示回到全身取景 */
  focus: THREE.Vector3 | null
  /** 会旋转的那个 group —— 局部锚点必须经它换算才是真实位置 */
  groupRef: React.MutableRefObject<THREE.Group | null>
}) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3())
  const home = useMemo(() => new THREE.Vector3(0.86, 0.44, 1.25).normalize(), [])

  /**
   * 聚焦：把旋转中心挪到目标部位并凑近，退出时回到全身。
   * 位移做逐帧插值而非瞬移 —— 镜头突然跳走会让人丢失方位感。
   */
  const goal = useRef<{ target: THREE.Vector3; dist: number } | null>(null)

  useEffect(() => {
    const dist = fitDistance(camera as THREE.PerspectiveCamera, radius)
    target.current.copy(home).multiplyScalar(dist)
    camera.position.copy(target.current)
    camera.near = dist * 0.02
    camera.far = dist * 12
    camera.updateProjectionMatrix()
    const c = controls.current
    if (c) {
      c.target.set(0, 0, 0)
      /**
       * 硬同步：阻尼开启时 update() 是**插值步**——把相机往控件内部记录的
       * 旧球坐标拉一小段。always 模式下后续帧会持续收敛无感；demand 模式
       * 停帧后就停在中间态（实拍：虫偏右下、方位错）。关掉阻尼做一次
       * update() 变成**同步步**，内部球坐标与刚赋的相机姿态即刻一致，再开回。
       */
      const damp = c.enableDamping
      c.enableDamping = false
      c.update()
      c.enableDamping = damp
    }
    /**
     * 初始/复位取景同时压进 goal-lerp 通道收尾。
     *
     * 上面的直接赋值在 frameloop='demand' 下不保证被渲染出来——effect 触发的
     * 那一两帧里 OrbitControls 的 update 顺序与稀疏帧时序在部分机器上会把
     * 相机留在 Canvas 的初始 position（虫偏右下、过近；生产构建实拍抓到）。
     * goal 通道的 useFrame 每帧 invalidate 自续帧直到收敛（聚焦流程同一条路，
     * 已验证），等于给取景上了一道「必达」保险；always 模式下它一帧就收敛，
     * 无感。
     */
    goal.current = { target: new THREE.Vector3(0, 0, 0), dist }
  }, [radius, camera, home, controls, resetNonce])


  useEffect(() => {
    const c = controls.current
    if (!c) return
    if (focus) {
      // 自转角度是累加的，锚点是局部坐标 —— 不套世界矩阵就会对到空处
      const g = groupRef.current
      const target = focus.clone()
      if (g) {
        g.updateMatrixWorld(true)
        target.applyMatrix4(g.matrixWorld)
      }
      goal.current = { target, dist: radius * 0.62 }
      /*
       * 聚焦态的最近距离 —— 2026-08-12 从 0.18 抬到 0.5。
       *
       * 0.18×radius 允许相机进到包围球深处。聚焦时 target 是标注点（贴在体表），
       * 再往里滚轮就会穿进虫体：近裁剪面把鞘翅切开、露出背面与内部结构、附肢
       * 被拦腰截断。用户实测七星瓢虫时撞到，反馈「比较吓人，是不是穿模了」——
       * 几何本身没问题，是镜头被放进了身体里。
       *
       * 0.5 仍比初始取景的 0.62 近，聚焦细看的余量还在，但相机停在体表之外。
       */
      c.minDistance = radius * 0.5
    } else {
      // 退出聚焦要回到与初次取景相同的距离，否则镜头会一直停在偏近的位置
      goal.current = {
        target: new THREE.Vector3(0, 0, 0),
        dist: fitDistance(camera as THREE.PerspectiveCamera, radius),
      }
      c.minDistance = radius * 1.15
    }
  }, [focus, controls, radius, camera, groupRef])

  useFrame(({ invalidate }, dt) => {
    const c = controls.current
    const g = goal.current
    if (!c || !g) return
    invalidate()
    const k = 1 - Math.pow(0.0015, dt) // 与帧率无关的指数趋近
    c.target.lerp(g.target, k)
    const dir = new THREE.Vector3().subVectors(camera.position, c.target)
    const len = dir.length()
    if (Math.abs(len - g.dist) > radius * 0.02) {
      dir.setLength(THREE.MathUtils.lerp(len, g.dist, k))
      camera.position.copy(c.target).add(dir)
    }
    if (c.target.distanceTo(g.target) < radius * 0.004) goal.current = null
    c.update()
  })

  // 「放大」工具：把相机沿视线拉近一档
  useEffect(() => {
    if (zoomNonce === 0) return
    const c = controls.current
    if (!c) return
    const dir = new THREE.Vector3().subVectors(camera.position, c.target)
    const min = radius * 1.15
    if (dir.length() > min) {
      dir.multiplyScalar(0.72)
      camera.position.copy(c.target).add(dir)
      c.update()
    }
  }, [zoomNonce, camera, controls, radius])

  return null
}

// ---------------------------------------------------------------- 光照

/**
 * 接触阴影：预烘的径向渐变血斑，替换 drei 的 ContactShadows。
 *
 * 换掉它不是审美问题而是事故复盘：CS 的 frames=Infinity 逐帧深度烘焙与
 * frameloop='demand' 的稀疏帧存在时序竞态——深度 RT 呈全遮挡，整片
 * 4.2×半径的平面按 0.44 不透明度显示成一块灰色地板。只在**生产构建**
 * 显形（dev 的 StrictMode 双挂载正好掩盖了它），且机器相关（验收机上
 * 从未出现，另一台一开就是）。参考项目用的正是静态血斑，其注释原话：
 * shadow mapping 每帧要把模型画两遍，烘好的接触阴影免费给出同样观感。
 * 附带收益：省掉每帧一次深度渲染 + 两次模糊 pass，手机尤其受益。
 */
const _blobCache: Record<string, THREE.CanvasTexture> = {}
function blobShadowTexture(dark: boolean): THREE.CanvasTexture | null {
  const key = dark ? 'dark' : 'light'
  if (_blobCache[key]) return _blobCache[key]
  if (typeof document === 'undefined') return null
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const c = size / 2
  // 暗主题（博物馆之夜）：纯黑落影投在光池上；浅主题（纸感）：v1 的暖棕
  const rgb = dark ? '0, 0, 0' : '92, 70, 48'
  const grad = ctx.createRadialGradient(c, c, size * 0.05, c, c, size * 0.5)
  grad.addColorStop(0, `rgba(${rgb}, ${dark ? 0.6 : 0.62})`)
  grad.addColorStop(0.45, `rgba(${rgb}, ${dark ? 0.25 : 0.26})`)
  grad.addColorStop(1, `rgba(${rgb}, 0)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  _blobCache[key] = tex
  return tex
}

/**
 * 把半径为 r 的包围球恰好装进画面所需的相机距离。
 *
 * ⚠️ 不能只按垂直 fov 算。竖屏（aspect < 1）时水平视场角比垂直的**窄**，
 * 宽物体会从左右两侧出画 —— 手机上实测犀金龟的腹部被裁掉一截
 * （2026-08-09 用无头浏览器按 iPhone 13 视口验出来的，桌面宽屏永远不显形）。
 * 取水平与垂直里更紧的那个来定距离。
 */
function fitDistance(camera: THREE.PerspectiveCamera, r: number, margin = 1.12): number {
  const vFov = (camera.fov * Math.PI) / 180
  const aspect = camera.aspect || 1
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
  return (r / Math.sin(Math.min(vFov, hFov) / 2)) * margin
}

function BlobShadow({ floorY, radius, dark }: { floorY: number; radius: number; dark: boolean }) {
  const tex = useMemo(() => blobShadowTexture(dark), [dark])
  const mat = useMemo(() => {
    if (!tex) return null
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  }, [tex])
  if (!mat) return null
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, floorY, 0]} scale={radius * 3} material={mat} renderOrder={1}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  )
}

function StudioLights({ radius, dark }: { radius: number; dark: boolean }) {
  const d = Math.max(radius, 0.001)
  return (
    <>
      <ambientLight intensity={0.72} color="#fff3e4" />
      {/* 主光：左上前方，唯一投影的灯 */}
      <directionalLight
        position={[d * 2.2, d * 3.4, d * 2.6]}
        intensity={2.35}
        color="#fff6ea"
        castShadow
        shadow-mapSize={COARSE ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-d * 2, d * 2, d * 2, -d * 2, 0.1, d * 12]}
        />
      </directionalLight>
      {/* 冷补光：把暗部从死黑救回来，模拟环境天光 */}
      <directionalLight position={[-d * 3, d * 1.2, -d * 1.5]} intensity={dark ? 0.95 : 0.85} color="#d6e2ff" />
      {/* 轮廓光：暗主题（博物馆之夜）用加强档双色勾边 —— 深色展厅里暗部会
          融进背景，靠背后暖主勾+冷副勾把标本剥出来；浅主题回 v1 单勾。
          只动灯不动材质：材质是逐只目检定过版的。 */}
      <directionalLight position={[-d * 0.5, d * 1.8, -d * 3.2]} intensity={dark ? 1.9 : 1.15} color="#ffe6c8" />
      {dark && <directionalLight position={[d * 2.6, d * 0.9, -d * 2.6]} intensity={0.9} color="#cfe0ff" />}

      {/* 反射环境：甲壳与膜翅的高光全靠这几片面光源。
          必须包在自己的 Suspense 里 —— 它挂起时会连带同一边界内的
          模型和灯光一起不渲染，表现为「canvas 正常、无报错、画面全空」。
          resolution 只在桌面提到 512：这张 cubemap 只烘一次（frames={1}），
          手机维持 256 别多花那份烘图开销。 */}
      <Suspense fallback={null}>
        <Environment resolution={COARSE ? 256 : 512} frames={1}>
          <Lightformer form="rect" intensity={2.6} color="#fffaf2" position={[0, 4, 2]} scale={[8, 3, 1]} rotation={[-Math.PI / 3, 0, 0]} />
          <Lightformer form="rect" intensity={1.5} color="#e8f0ff" position={[-4, 1, -2]} scale={[5, 4, 1]} rotation={[0, Math.PI / 2.4, 0]} />
          <Lightformer form="rect" intensity={1.1} color="#ffeeda" position={[4, 0.5, -1.5]} scale={[4, 3, 1]} rotation={[0, -Math.PI / 2.6, 0]} />
          <Lightformer form="ring" intensity={0.8} color="#fff" position={[0, -3, 0]} scale={6} rotation={[Math.PI / 2, 0, 0]} />
          {/* 地面反弹：暖色、低强度、从台面往上返一点光，专治鞘翅下缘/腹面死黑 ——
              前 4 片全在侧上方，虫体朝下的那些面没有任何一片够得着。 */}
          <Lightformer form="rect" intensity={0.6} color="#e8b483" position={[0, -2.4, 0.6]} scale={[7, 7, 1]} rotation={[Math.PI / 2, 0, 0]} />
        </Environment>
      </Suspense>
    </>
  )
}

// ---------------------------------------------------------------- 场景

function Scene({
  insect,
  mode,
  spin,
  openHotspot,
  onToggleHotspot,
  controls,
  zoomNonce,
  resetNonce,
  focusAnchor,
  onLoaded,
  onError,
  dark,
}: {
  insect: Insect
  mode: ViewMode
  spin: boolean
  openHotspot: string | null
  onToggleHotspot: (id: string | null) => void
  controls: React.RefObject<OrbitControlsImpl>
  zoomNonce: number
  resetNonce: number
  focusAnchor: string | null
  dark: boolean
  onLoaded: () => void
  onError: (msg: string) => void
}) {
  const [model, setModel] = useState<InsectModel | null>(null)
  const [box, setBox] = useState<THREE.Box3 | null>(null)
  /** 上一只虫的离场动画：0.24s 缩小后卸下（参考站换器官的手感） */
  const [leaving, setLeaving] = useState<InsectModel | null>(null)
  const leavingGroup = useRef<THREE.Group | null>(null)
  const leavingT = useRef(0)
  const spinGroup = useRef<THREE.Group | null>(null)
  /** 拖动后 3 秒内自转让位；由 OrbitControls 的 start 事件续期 */
  const pauseUntil = useRef(0)
  const { gl, invalidate } = useThree()

  // 用户一碰相机就让转 3 秒，松手后再自然接管
  useEffect(() => {
    const c = controls.current
    if (!c) return
    const onStart = () => {
      pauseUntil.current = performance.now() + 3000
    }
    c.addEventListener('start', onStart)
    return () => c.removeEventListener('start', onStart)
  }, [controls, model])

  // 离场缩小：模型对象是 LRU 缓存里的共享实例，动完必须把 scale 归位
  useFrame((_, dt) => {
    if (!leaving) return
    leavingT.current += dt
    const k = Math.min(1, leavingT.current / 0.24)
    leavingGroup.current?.scale.setScalar(1 - 0.34 * k * k)
    if (k >= 1) {
      leavingGroup.current?.scale.setScalar(1)
      setLeaving(null)
    }
    invalidate()
  })

  // 剖切要求渲染器开启局部裁剪
  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])

  /**
   * 回调放进 ref 再用：它们是父组件每次渲染新建的闭包，
   * 若直接进依赖数组，「加载完 → 通知父组件 → 父组件重渲染 → 新回调 →
   * 重新加载」会变成死循环，表现为 3D 区永远空白。
   */
  const notify = useRef({ onLoaded, onError })
  notify.current = { onLoaded, onError }

  useEffect(() => {
    let alive = true
    setModel((cur) => {
      if (cur) {
        leavingT.current = 0
        setLeaving(cur)
      }
      return null
    })
    loadInsectModel(insect.id)
      .then((m) => {
        if (!alive) return
        setModel(m)
        notify.current.onLoaded()
      })
      .catch((e) => {
        if (!alive) return
        notify.current.onError(e instanceof Error ? e.message : String(e))
      })
    return () => {
      alive = false
    }
  }, [insect.id])

  // 取景/落影/光场一律用 frameRadius（缺省=包围半径）：大蚊这类「一团腿」
  // 物种按腿尖包围球取景会把虫体缩成一个点，按 frameRadius 则腿尖出画。
  const radius = model ? model.frameRadius ?? model.radius : 1
  const floorY = box ? box.min.y * 0.86 - radius * 0.06 : -radius * 0.7

  /**
   * 镜头凑近看的部位，两个来源：
   * 讲解弹窗逐步下发的 focusAnchor 优先（读到哪、看到哪），
   * 其次才是工具条的「聚焦」模式（取当前展开的标注点）。
   */
  const focus = useMemo(() => {
    if (!model) return null
    if (focusAnchor) return model.anchors[focusAnchor] ?? null
    if (mode !== 'isolate') return null
    const spot =
      insect.hotspots.find((h) => h.id === openHotspot) ?? insect.hotspots[0]
    return spot ? model.anchors[spot.anchor] ?? null : null
  }, [mode, model, insect.hotspots, openHotspot, focusAnchor])

  return (
    <>
      <StudioLights radius={radius} dark={dark} />
      <Framing
        radius={radius}
        controls={controls}
        zoomNonce={zoomNonce}
        resetNonce={resetNonce}
        focus={focus}
        groupRef={spinGroup}
      />
      {/* 手机端整段不挂载（不是挂载后禁用）：连这个 chunk 都不会去下载 */}
      {!COARSE && (
        <Suspense fallback={null}>
          <PostFX radius={radius} />
        </Suspense>
      )}

      {leaving && leaving !== model && (
        <group ref={leavingGroup}>
          <primitive object={leaving.group} />
        </group>
      )}

      {model && (
        <>
          {/* 聚焦某个部位时停转：镜头锁在一点上而虫还在转，那个部位会自己溜走 */}
          <InsectMesh
            model={model}
            mode={mode}
            spin={spin && !focus}
            pauseUntil={pauseUntil}
            onReady={setBox}
            groupRef={spinGroup}
          >
            {mode !== 'section' &&
              insect.hotspots.map((h) => {
                const p = model.anchors[h.anchor]
                if (!p) return null
                return (
                  <Hotspot
                    key={h.id}
                    position={p}
                    groupRef={spinGroup}
                    label={h.label}
                    note={h.note}
                    tone={h.tone}
                    open={openHotspot === h.id}
                    onToggle={() => onToggleHotspot(openHotspot === h.id ? null : h.id)}
                  />
                )
              })}
          </InsectMesh>

          <BlobShadow floorY={floorY} radius={radius} dark={dark} />
        </>
      )}

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={radius * 1.15}
        maxDistance={radius * 6}
        minPolarAngle={0.18}
        maxPolarAngle={Math.PI - 0.18}
        rotateSpeed={0.85}
        zoomSpeed={0.8}
      />
    </>
  )
}

/**
 * ⚠️ 必须 memo（真机模拟丢上下文撞出来的）：上下文丢失后 Stage 会 set 一个
 * 状态来盖提示层，这次重渲染若穿透进 Canvas 子树，postprocessing 的
 * EffectComposer.addPass 会去读 getContextAttributes() —— 规范规定丢失态下
 * 它返回 null，于是 TypeError，r3f 内部重建两次仍炸，最终被外层错误边界
 * 当成「WebGL 不可用」降级掉，恢复通道就此报废。memo 之下提示层的开/撤
 * 不再触碰 Canvas 子树，canvas 原地等浏览器的恢复事件。
 */
export const InsectCanvas = memo(function InsectCanvas({
  insect,
  mode,
  spin,
  openHotspot,
  onToggleHotspot,
  zoomNonce,
  resetNonce,
  focusAnchor = null,
  active = true,
  theme = 'dark',
  onStatus,
  onContextLoss,
}: {
  insect: Insect
  mode: ViewMode
  spin: boolean
  openHotspot: string | null
  onToggleHotspot: (id: string | null) => void
  zoomNonce: number
  resetNonce: number
  /** 由讲解弹窗下发的镜头指令，优先于工具条的聚焦模式 */
  focusAnchor?: string | null
  /** 展台滚出视口时置 false，整个渲染循环停摆 —— 手机上省下的是真电量 */
  active?: boolean
  /** 明暗主题：决定轮廓光档位与落影颜色（材质与环境贴图不随主题动） */
  theme?: 'dark' | 'light'
  onStatus: (s: { loading: boolean; error: string | null }) => void
  /** WebGL 上下文丢失(true)/恢复(false)的上报，Stage 据此盖/撤提示层 */
  onContextLoss?: (lost: boolean) => void
}) {
  const controls = useRef<OrbitControlsImpl>(null)
  /** onCreated 只跑一次，回调进 ref 才能一直拿到最新的那个（同 Scene 的 notify） */
  const lossNotify = useRef(onContextLoss)
  lossNotify.current = onContextLoss

  useEffect(() => {
    onStatus({ loading: true, error: null })
  }, [insect.id, onStatus])

  return (
    <Canvas
      shadows
      dpr={[1, COARSE ? 1.5 : 2]}
      /**
       * demand：没有动静就不出帧（参考站 dirty-flag 循环的 r3f 等价物）。
       * 自转/触角微动/进出场/镜头趋近/圆点淡出各自在 useFrame 里自续帧；
       * React 提交与 OrbitControls 的 change（含阻尼余摆）由 r3f/drei 补帧。
       * 「停转读说明」这个最常见的静止场景，GPU 从此真正歇着。
       * （D 轮启用；验收点=拖动松手余摆顺滑、切物种动画完整、静止画面不冻帧）
       */
      frameloop={active ? 'demand' : 'never'}
      // antialias 只在手机开：桌面走 EffectComposer 后，画面经由它的离屏渲染目标
      // 合成，canvas 自己的 MSAA 缓冲已经用不上（抗锯齿改由 PostFX 的
      // multisampling={8} 负责），留 true 只是白占一份显存。
      // preserveDrawingBuffer 仅 ?pdb=1 时开：截图/出图链路要从 canvas
      // toDataURL 取帧，默认关着省一份缓冲拷贝（未来照片模式同走此门）。
      gl={{ antialias: COARSE, alpha: true, preserveDrawingBuffer: PDB, powerPreference: 'high-performance' }}
      camera={{ fov: 34, position: [2, 1, 3] }}
      onCreated={({ gl, invalidate }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.02
        /**
         * 上下文丢失/恢复上报出去（GPU 重置、驱动崩溃、移动端后台挤占都会触发）。
         * 恢复后补一帧：three 会自己重建资源，但 demand 模式下没人 invalidate
         * 的话，重建好的画面要等到下一次交互才出现。
         * 不必解绑 —— 监听挂在 canvas 元素自己身上，随 Canvas 卸载一起回收。
         */
        bindContextLoss(gl.domElement, (lost) => {
          lossNotify.current?.(lost)
          if (!lost) invalidate()
        })
      }}
      onPointerMissed={() => onToggleHotspot(null)}
    >
      <Suspense fallback={null}>
        <Scene
          insect={insect}
          mode={mode}
          spin={spin}
          openHotspot={openHotspot}
          onToggleHotspot={onToggleHotspot}
          controls={controls}
          zoomNonce={zoomNonce}
          resetNonce={resetNonce}
          focusAnchor={focusAnchor}
          dark={theme !== 'light'}
          onLoaded={() => onStatus({ loading: false, error: null })}
          onError={(msg) => onStatus({ loading: false, error: msg })}
        />
      </Suspense>
    </Canvas>
  )
})
