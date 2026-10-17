/**
 * 日本吉丁 · 末龄扁头蛀虫，蛀木 2–3 年（数据文案）。
 * 成虫躯干约 4.1 cm；幼虫体长取 4.5 cm（40–50 mm 推算，非本种实测）。
 * 前胸宽 1.2 cm、约占全长 1/5；腹部宽 .60–.68、厚 .23–.26 cm。
 * 截面比例是按同科扁头蛀虫照片推算的造型控制量，并非实测。
 * 小头缩进前胸，只有短褐口器露出；无足。前胸背腹均有浅黄褐骨化板与下凹Y沟。
 * 单位 cm，+X 前、+Y 上、+Z 右。不做遮挡身体的木质虫道。
 */
import * as T from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

const GROOVE = .12
const PROFILE = [
  [-2.25, 0], [-2.18, .20], [-2.05, .28], [-1.8, .30], [-1.2, .32],
  [-.4, .34], [.5, .34], [1.05, .34], [1.32, .30], [1.45, .54],
  [1.65, .60], [1.94, .56], [2.10, .33], [2.18, .04],
] as const
function width(x: number): number {
  // 椭圆球冠：尾尖切线垂直于体轴，避免 smoothstep 从零起步产生针尖。
  if (x < -2.18) return .20 * Math.sqrt(Math.max(0, 1 - ((x + 2.18) / .07) ** 2))
  for (let i = 1; i < PROFILE.length; i++) if (x <= PROFILE[i][0]) {
    const [a, w] = PROFILE[i-1], [b, v] = PROFILE[i]
    const t = T.MathUtils.smoothstep(x, a, b)
    return T.MathUtils.lerp(w, v, t)
  }
  return .04
}
function flat(x: number): number {
  return T.MathUtils.lerp(.38, .235, T.MathUtils.smoothstep(x, 1.30, 1.45))
}
/** Y形凹沟是体壁和骨化板共同下陷，不用细管/深色贴线冒充。 */
function grooveDepth(x: number, z: number): number {
  const distance = (ax: number, az: number, bx: number, bz: number) => {
    const t = T.MathUtils.clamp(((x-ax)*(bx-ax)+(z-az)*(bz-az))/((bx-ax)**2+(bz-az)**2),0,1)
    return Math.hypot(x-ax-t*(bx-ax),z-az-t*(bz-az))
  }
  const arms = [-1, 1].map(side => distance(1.62,0,1.95,side*.33))
  const d = Math.min(distance(1.43,0,1.62,0), ...arms)
  return .021 * Math.exp(-((d / .020) ** 2))
}
function plateGeometry(sign: number): T.BufferGeometry {
  const positions: number[] = [], indices: number[] = []
  for(let i=0;i<=48;i++)for(let j=0;j<=32;j++) {
    const u=i/48, x=1.41+.67*u, half=.43*Math.pow(Math.sin(Math.PI*u),.35)
    const z=half*(2*j/32-1), w=width(x)
    const y=flat(x)*Math.sqrt(Math.max(0,w*w-z*z))-grooveDepth(x,z)+.003
    positions.push(x,sign*y,z)
  }
  for(let i=0;i<48;i++)for(let j=0;j<32;j++) {
    const a=i*33+j,b=a+33
    if(sign>0) indices.push(a,a+1,b,b,a+1,b+1)
    else indices.push(a,b,a+1,b,b+1,a+1)
  }
  const geo=new T.BufferGeometry()
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals()
  return geo
}
/** 只修本文件 loft 的绕向，不动 kit。重算端部法线，使尾端圆润受光。 */
function outward(geo: T.BufferGeometry): T.BufferGeometry {
  const idx = geo.index!
  // loft 两端盖本已朝外，只翻转侧面（两端各 64 个三角形）。
  for (let i = 0; i < idx.count - 64 * 6; i += 3) {
    const b = idx.getX(i+1); idx.setX(i+1, idx.getX(i+2)); idx.setX(i+2, b)
  }
  geo.computeVertexNormals()
  return geo
}
export function buildJewelBeetleLarva(): InsectModel {
  const g = new T.Group()
  const bodyMat = chitin({ color: '#eee5cc', gloss: .22, clearcoat: .02 })
  const secs: Section[] = []
  for (let i = 0; i <= 280; i++) {
    const x = -2.25 + 4.43 * i / 280
    const groove = x < 1.30 ? 1 - GROOVE * Math.pow(Math.abs(Math.cos((x + 2.05) / .32 * Math.PI)), 10) : 1
    const w = Math.max(.0001, width(x) * groove)
    // 前胸厚度不随横向膨大而同倍增加：扁锤头与圆头天牛幼虫的区别。
    secs.push({ at: [x, 0, 0], ry: w * flat(x), rz: w })
  }
  const geometry = outward(loft(secs, 64)), pos=geometry.getAttribute('position')
  // 体壁在板沟下稍宽地退让，避免体壁跨过凹沟把它盖住。
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i)
    if(x>1.4 && x<2.1)pos.setY(i,y-Math.sign(y)*Math.max(grooveDepth(x,z-.022),grooveDepth(x,z),grooveDepth(x,z+.022)) * 1.7)
  }
  geometry.computeVertexNormals()
  const body = new T.Mesh(geometry, bodyMat)
  body.name = 'larva-body'; g.add(body)
  const plateMat=chitin({color:'#d9c59c',gloss:.23,clearcoat:.02})
  for(const sign of [1,-1]) {
    const plate=new T.Mesh(plateGeometry(sign),plateMat)
    plate.name=sign>0?'larva-dorsal-plate':'larva-ventral-plate';g.add(plate)
  }
  const head = new T.Mesh(new T.SphereGeometry(1, 24, 16), chitin({ color: '#c3a06d', gloss: .28, clearcoat: .02 }))
  head.name = 'larva-head'; head.scale.set(.12, .057, .115); head.position.set(2.08, -.012, 0); g.add(head)
  for (const side of [-1, 1]) {
    const jaw = new T.Mesh(new T.SphereGeometry(1, 20, 12), chitin({ color: '#674b32', gloss: .3, clearcoat: .03 }))
    jaw.name = 'larva-mouth'; jaw.scale.set(.065, .035, .034)
    jaw.position.set(2.21, -.008, side * .047); jaw.rotation.y = side * .2; g.add(jaw)
  }
  return finalize(g, {
    flatProthorax: new T.Vector3(1.65, .144, 0),
    larvalMouth: new T.Vector3(2.25, .01, .047),
    abdominalSegments: new T.Vector3(-.5, .125, 0),
  })
}
