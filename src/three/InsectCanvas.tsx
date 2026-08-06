/**
 * 3D 展台
 *
 * 观感目标：博物馆标本盒里的一盏柔光 —— 暖调主光压出体积，
 * 冷调补光救回暗部，背后一道轮廓光把虫体从米色背景里剥离出来。
 * 甲虫的鞘翅靠 Environment 里的几片 lightformer 出高光，没有它们
 * clearcoat 材质会显得像塑料。
 */
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Insect } from '../data/types'
import type { InsectModel } from './builders/kit'
import { loadInsectModel } from './registry'

const TONE_HEX: Record<string, string> = {
  coral: '#eb7c6b',
  lavender: '#8d6bcc',
  sage: '#769d74',
  amber: '#c8944a',
}

export type ViewMode = 'normal' | 'isolate' | 'section' | 'layers'

// ---------------------------------------------------------------- 模型

function InsectMesh({
  model,
  mode,
  spin,
  onReady,
}: {
  model: InsectModel
  mode: ViewMode
  spin: boolean
  onReady: (box: THREE.Box3) => void
}) {
  const ref = useRef<THREE.Group>(null)
  const born = useRef(0)

  // 切换物种时从略小的尺度弹入，避免生硬替换
  useLayoutEffect(() => {
    born.current = 0
    if (ref.current) ref.current.scale.setScalar(0.001)
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

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    born.current = Math.min(1, born.current + dt * 2.6)
    const t = 1 - Math.pow(1 - born.current, 3) // easeOutCubic
    g.scale.setScalar(0.82 + 0.18 * t)
    if (spin) g.rotation.y += dt * 0.28
  })

  return (
    <group ref={ref}>
      <primitive object={model.group} />
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
}: {
  position: THREE.Vector3
  label: string
  note: string
  tone: string
  open: boolean
  onToggle: () => void
}) {
  const color = TONE_HEX[tone] ?? TONE_HEX.coral
  return (
    <Html position={position} center zIndexRange={[30, 10]} style={{ pointerEvents: 'none' }}>
      <div className="hotspot" data-open={open}>
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
}: {
  radius: number
  controls: React.RefObject<OrbitControlsImpl>
  zoomNonce: number
  resetNonce: number
  /** 聚焦模式要凑近看的那个部位；null 表示回到全身取景 */
  focus: THREE.Vector3 | null
}) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3())
  const home = useMemo(() => new THREE.Vector3(0.86, 0.44, 1.25).normalize(), [])

  useEffect(() => {
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
    const dist = (radius / Math.sin(fov / 2)) * 1.12
    target.current.copy(home).multiplyScalar(dist)
    camera.position.copy(target.current)
    camera.near = dist * 0.02
    camera.far = dist * 12
    camera.updateProjectionMatrix()
    controls.current?.target.set(0, 0, 0)
    controls.current?.update()
  }, [radius, camera, home, controls, resetNonce])

  /**
   * 聚焦：把旋转中心挪到目标部位并凑近，退出时回到全身。
   * 位移做逐帧插值而非瞬移 —— 镜头突然跳走会让人丢失方位感。
   */
  const goal = useRef<{ target: THREE.Vector3; dist: number } | null>(null)
  useEffect(() => {
    const c = controls.current
    if (!c) return
    if (focus) {
      goal.current = { target: focus.clone(), dist: radius * 0.62 }
      c.minDistance = radius * 0.18
    } else {
      // 退出聚焦要回到与初次取景相同的距离，否则镜头会一直停在偏近的位置
      const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
      goal.current = {
        target: new THREE.Vector3(0, 0, 0),
        dist: (radius / Math.sin(fov / 2)) * 1.12,
      }
      c.minDistance = radius * 1.15
    }
  }, [focus, controls, radius, camera])

  useFrame((_, dt) => {
    const c = controls.current
    const g = goal.current
    if (!c || !g) return
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

function StudioLights({ radius }: { radius: number }) {
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
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      >
        <orthographicCamera
          attach="shadow-camera"
          args={[-d * 2, d * 2, d * 2, -d * 2, 0.1, d * 12]}
        />
      </directionalLight>
      {/* 冷补光：把暗部从死黑救回来，模拟环境天光 */}
      <directionalLight position={[-d * 3, d * 1.2, -d * 1.5]} intensity={0.85} color="#d6e2ff" />
      {/* 轮廓光：从背后勾边，让虫体脱离背景 */}
      <directionalLight position={[-d * 0.5, d * 1.8, -d * 3.2]} intensity={1.15} color="#ffe6c8" />

      {/* 反射环境：甲壳与膜翅的高光全靠这几片面光源。
          必须包在自己的 Suspense 里 —— 它挂起时会连带同一边界内的
          模型和灯光一起不渲染，表现为「canvas 正常、无报错、画面全空」。 */}
      <Suspense fallback={null}>
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.6} color="#fffaf2" position={[0, 4, 2]} scale={[8, 3, 1]} rotation={[-Math.PI / 3, 0, 0]} />
          <Lightformer form="rect" intensity={1.5} color="#e8f0ff" position={[-4, 1, -2]} scale={[5, 4, 1]} rotation={[0, Math.PI / 2.4, 0]} />
          <Lightformer form="rect" intensity={1.1} color="#ffeeda" position={[4, 0.5, -1.5]} scale={[4, 3, 1]} rotation={[0, -Math.PI / 2.6, 0]} />
          <Lightformer form="ring" intensity={0.8} color="#fff" position={[0, -3, 0]} scale={6} rotation={[Math.PI / 2, 0, 0]} />
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
  onLoaded: () => void
  onError: (msg: string) => void
}) {
  const [model, setModel] = useState<InsectModel | null>(null)
  const [box, setBox] = useState<THREE.Box3 | null>(null)
  const { gl } = useThree()

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
    setModel(null)
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

  const radius = model?.radius ?? 1
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
      <StudioLights radius={radius} />
      <Framing
        radius={radius}
        controls={controls}
        zoomNonce={zoomNonce}
        resetNonce={resetNonce}
        focus={focus}
      />

      {model && (
        <>
          <InsectMesh model={model} mode={mode} spin={spin} onReady={setBox} />

          {mode !== 'section' &&
            insect.hotspots.map((h) => {
              const p = model.anchors[h.anchor]
              if (!p) return null
              return (
                <Hotspot
                  key={h.id}
                  position={p}
                  label={h.label}
                  note={h.note}
                  tone={h.tone}
                  open={openHotspot === h.id}
                  onToggle={() => onToggleHotspot(openHotspot === h.id ? null : h.id)}
                />
              )
            })}

          <ContactShadows
            position={[0, floorY, 0]}
            scale={radius * 4.2}
            opacity={0.44}
            blur={2.6}
            far={radius * 2.4}
            resolution={512}
            color="#5c4630"
          />
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

export function InsectCanvas({
  insect,
  mode,
  spin,
  openHotspot,
  onToggleHotspot,
  zoomNonce,
  resetNonce,
  focusAnchor = null,
  onStatus,
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
  onStatus: (s: { loading: boolean; error: string | null }) => void
}) {
  const controls = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    onStatus({ loading: true, error: null })
  }, [insect.id, onStatus])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: false }}
      camera={{ fov: 34, position: [2, 1, 3] }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.02
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
          onLoaded={() => onStatus({ loading: false, error: null })}
          onError={(msg) => onStatus({ loading: false, error: msg })}
        />
      </Suspense>
    </Canvas>
  )
}
