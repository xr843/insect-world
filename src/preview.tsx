/**
 * 模型调试台（开发用，不进主站导航）
 *
 * 程序化建模最大的风险是「测试全绿但看着不像那只虫」。
 * 这个页面把每个物种单独放大、可切换线框/坐标轴，
 * 用来肉眼验收几何，是主站之外必须有的一道关。
 */
import { StrictMode, Suspense, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Environment, Grid, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { InsectModel } from './three/builders/kit'
import { knownSpecies, loadInsectModel } from './three/registry'
import { INSECTS } from './data/insects'
import './styles/global.css'

/**
 * 名单不写死，直接问注册表要 —— 只要 builder 文件在目录里就会出现在这里。
 *
 * 这里曾是一份手抄的清单，而漏抄一行的后果是：那个物种从没被人放大看过，
 * 恰恰新做的模型才最需要这一关。顺序沿用图鉴数据的编排；
 * 有模型但还没有图鉴数据的排在最后，用 id 原样显示，一眼能看出还缺内容。
 */
const SPECIES: [string, string][] = (() => {
  const built = new Set(knownSpecies())
  const listed = INSECTS.filter((i) => built.has(i.id)).map((i) => [i.id, i.name] as [string, string])
  const orphans = knownSpecies()
    .filter((id) => !INSECTS.some((i) => i.id === id))
    .map((id) => [id, `${id}（无图鉴数据）`] as [string, string])
  return [...listed, ...orphans]
})()

function countTriangles(obj: THREE.Object3D): number {
  let n = 0
  obj.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.geometry) return
    const idx = m.geometry.getIndex()
    n += idx ? idx.count / 3 : m.geometry.getAttribute('position').count / 3
  })
  return Math.round(n)
}

function Rig({ model, wire }: { model: InsectModel; wire: boolean }) {
  const { camera } = useThree()
  const controls = useThree((s) => s.controls)

  useEffect(() => {
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
    const d = (model.radius / Math.sin(fov / 2)) * 1.1
    camera.position.set(d * 0.8, d * 0.42, d * 1.15)
    camera.near = d * 0.02
    camera.far = d * 12
    camera.updateProjectionMatrix()

    /**
     * OrbitControls 自己记着一套球坐标，开了阻尼后每帧都据此把相机放回去，
     * 会盖掉上面这几行。只要手动转过一次视角，之后切物种就还用着上一只虫的
     * 取景距离 —— 从 4.7 半径的犀金龟切到 0.45 半径的白蚁兵蚁，虫小到不足一个
     * 像素，屏幕全空。那不是模型坏了，是台子没重新取景，
     * 而「一片空白」恰恰是建模真出问题时的样子，最容易据此误判、把好模型打回去。
     */
    const orbit = controls as { target: THREE.Vector3; update: () => void } | null
    if (orbit) {
      orbit.target.set(0, 0, 0)
      orbit.update()
    }
  }, [model, camera, controls])

  useEffect(() => {
    model.group.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats) (mat as THREE.MeshStandardMaterial).wireframe = wire
    })
  }, [model, wire])

  const box = useMemo(() => new THREE.Box3().setFromObject(model.group), [model])

  return (
    <>
      <primitive object={model.group} />
      <ContactShadows
        position={[0, box.min.y - model.radius * 0.02, 0]}
        scale={model.radius * 4}
        opacity={0.4}
        blur={2.4}
        far={model.radius * 2}
        color="#5c4630"
      />
    </>
  )
}

function App() {
  const [id, setId] = useState<string>(SPECIES[0]?.[0] ?? '')
  const [model, setModel] = useState<InsectModel | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [wire, setWire] = useState(false)
  const [grid, setGrid] = useState(false)

  useEffect(() => {
    let alive = true
    setModel(null)
    setErr(null)
    loadInsectModel(id)
      .then((m) => alive && setModel(m))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : String(e)))
    return () => {
      alive = false
    }
  }, [id])

  const stats = model
    ? {
        tris: countTriangles(model.group),
        radius: model.radius.toFixed(2),
        anchors: Object.keys(model.anchors),
        size: (() => {
          const b = new THREE.Box3().setFromObject(model.group)
          const v = new THREE.Vector3()
          b.getSize(v)
          return `${v.x.toFixed(1)} × ${v.y.toFixed(1)} × ${v.z.toFixed(1)}`
        })(),
      }
    : null

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div style={{ width: 210, padding: 14, borderRight: '1px solid var(--line)', overflowY: 'auto', flexShrink: 0 }}>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          模型调试台 · {SPECIES.length}
        </div>
        {SPECIES.map(([sid, name]) => (
          <button
            key={sid}
            onClick={() => setId(sid)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 10px',
              borderRadius: 9,
              fontSize: 13,
              marginBottom: 2,
              background: id === sid ? '#eb7c6b1f' : 'transparent',
              color: id === sid ? '#c25a49' : 'var(--ink)',
            }}
          >
            {name}
          </button>
        ))}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, display: 'flex', gap: 7, alignItems: 'center' }}>
            <input type="checkbox" checked={wire} onChange={(e) => setWire(e.target.checked)} />
            线框
          </label>
          <label style={{ fontSize: 12, display: 'flex', gap: 7, alignItems: 'center' }}>
            <input type="checkbox" checked={grid} onChange={(e) => setGrid(e.target.checked)} />
            网格地面
          </label>
        </div>
        {stats && (
          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', lineHeight: 1.8 }}>
            <div>三角面 {stats.tris.toLocaleString()}</div>
            <div>包围半径 {stats.radius}</div>
            <div>尺寸 {stats.size}</div>
            <div style={{ marginTop: 6 }}>锚点 {stats.anchors.length}：</div>
            <div style={{ color: '#8d847c' }}>{stats.anchors.join(', ')}</div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative', background: 'radial-gradient(120% 80% at 50% 10%, #fffdfa, #ece1d2)' }}>
        {err && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#b4523f', fontSize: 13, zIndex: 5, padding: 30, textAlign: 'center' }}>
            {err}
          </div>
        )}
        {!model && !err && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13, zIndex: 5 }}>
            构建中…
          </div>
        )}
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 34 }} gl={{ antialias: true, alpha: true }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = 1.02
          }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.72} color="#fff3e4" />
            <directionalLight position={[6, 9, 7]} intensity={2.35} color="#fff6ea" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0006} shadow-normalBias={0.02} />
            <directionalLight position={[-8, 3, -4]} intensity={0.85} color="#d6e2ff" />
            <directionalLight position={[-1, 5, -9]} intensity={1.15} color="#ffe6c8" />
            {/* Environment 自带一层 Suspense：它若挂起，不能连累模型和灯光一起不渲染 */}
            <Suspense fallback={null}>
              <Environment resolution={256} frames={1}>
                <Lightformer form="rect" intensity={2.6} color="#fffaf2" position={[0, 4, 2]} scale={[8, 3, 1]} rotation={[-Math.PI / 3, 0, 0]} />
                <Lightformer form="rect" intensity={1.5} color="#e8f0ff" position={[-4, 1, -2]} scale={[5, 4, 1]} rotation={[0, Math.PI / 2.4, 0]} />
                <Lightformer form="rect" intensity={1.1} color="#ffeeda" position={[4, 0.5, -1.5]} scale={[4, 3, 1]} rotation={[0, -Math.PI / 2.6, 0]} />
              </Environment>
            </Suspense>
            {model && <Rig model={model} wire={wire} />}
            {grid && model && (
              <Grid
                args={[model.radius * 6, model.radius * 6]}
                cellSize={model.radius * 0.2}
                sectionSize={model.radius}
                cellColor="#bfae99"
                sectionColor="#8d7a63"
                fadeDistance={model.radius * 10}
                position={[0, -model.radius * 0.7, 0]}
                infiniteGrid={false}
              />
            )}
            <OrbitControls makeDefault enableDamping dampingFactor={0.06} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  )
}

/**
 * root 存在 window 上复用。
 *
 * 每次热更新都会重新执行本模块，若每次都 createRoot 同一个容器，
 * React 会警告「容器已经 createRoot 过」，并留下两个 root 抢同一个 canvas ——
 * 表现是改完代码画面一片空白，而控制台只有一句看着无害的警告。
 * 调试台本来就是拿来分辨「模型有没有问题」的，它自己先花屏，结论就全不可信了。
 */
const el = document.getElementById('root')!
const store = window as unknown as { __previewRoot?: ReturnType<typeof createRoot> }
store.__previewRoot ??= createRoot(el)
store.__previewRoot.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
