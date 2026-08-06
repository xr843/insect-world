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
import { loadInsectModel } from './three/registry'
import './styles/global.css'

const SPECIES = [
  ['rhinoceros-beetle', '双叉犀金龟'],
  ['monarch-butterfly', '帝王蝶'],
  ['honeybee', '西方蜜蜂'],
  ['dragonfly', '碧伟蜓'],
  ['mantis', '中华大刀螳'],
  ['ladybird', '七星瓢虫'],
  ['ant', '日本弓背蚁'],
  ['cicada', '黑蚱蝉'],
  ['locust', '东亚飞蝗'],
  ['firefly', '中华黄萤'],
  ['longhorn-beetle', '星天牛'],
  ['stick-insect', '中华修竹节虫'],
  ['swallowtail', '玉带凤蝶'],
  ['silk-moth', '柞蚕蛾'],
  ['hornet', '金环胡蜂'],
  ['lacewing', '中华草蛉'],
  ['tiger-beetle', '中华虎甲'],
  ['stag-beetle', '中华大锹甲'],
  ['jewel-beetle', '日本吉丁'],
  ['earwig', '海滨蠼螋'],
  ['katydid', '优雅蝈螽'],
  ['mole-cricket', '东方蝼蛄'],
  ['water-strider', '水黾'],
  ['hoverfly', '黑带食蚜蝇'],
] as const

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

  useEffect(() => {
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180
    const d = (model.radius / Math.sin(fov / 2)) * 1.1
    camera.position.set(d * 0.8, d * 0.42, d * 1.15)
    camera.near = d * 0.02
    camera.far = d * 12
    camera.updateProjectionMatrix()
  }, [model, camera])

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
  const [id, setId] = useState<string>(SPECIES[0][0])
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
          模型调试台
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

const el = document.getElementById('root')!
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
