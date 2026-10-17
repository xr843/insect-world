/**
 * 日本吉丁 · 初中期离蛹，乳白色，躯干长 3.8 cm（按 30–41 mm 成虫推算）。
 * 在木质蛹室中化蛹；这里省去室壁作形态特写，仰卧，腹面正朝 +Y 展示。
 * 头、前胸、肩部与长腹部组成近成虫轮廓，末端圆钝；三对足折叠贴腹，
 * 触角从头侧向后贴伏，翅芽贴两侧。无大颚、无头角，无成虫虹彩。
 * 单位 cm，+X 前、+Y 上、+Z 右。附肢对称在本体坐标中，整体滚转同一角度。
 */
import * as T from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

const ROLL = Math.PI
const GROOVE = .085
/** 头端宽于末端，但腹部保持饱满，到最后一节才圆收，不做线性尖锥。 */
const PROFILE = [[-1.95, .001], [-1.86, .13], [-1.65, .23], [-1.25, .33], [-.65, .41], [.1, .47], [.55, .48], [.8, .42], [1.1, .37], [1.4, .30], [1.5, .21], [1.72, .23], [1.85, .001]] as const
function radius(x: number): number {
  if (x < -1.86) return Math.max(.001, .13 * Math.sqrt(Math.max(0, 1 - ((x + 1.86) / .09) ** 2)))
  if (x > 1.72) return Math.max(.001, .23 * Math.sqrt(Math.max(0, 1 - ((x - 1.72) / .13) ** 2)))
  for (let i = 1; i < PROFILE.length; i++) if (x <= PROFILE[i][0]) {
    const [a, w] = PROFILE[i-1], [b, v] = PROFILE[i]
    return T.MathUtils.lerp(w, v, T.MathUtils.smoothstep(x, a, b))
  }
  return .001
}
function outward(geo: T.BufferGeometry): T.BufferGeometry {
  const idx = geo.index!
  // loft 两端盖本已朝外，只翻转侧面（两端各 48 个三角形）。
  for (let i = 0; i < idx.count - 48 * 6; i += 3) {
    const b = idx.getX(i+1); idx.setX(i+1, idx.getX(i+2)); idx.setX(i+2, b)
  }
  geo.computeVertexNormals()
  return geo
}
function surfaceRadius(x: number): number {
  return radius(x) * (x < .6 ? 1 - GROOVE * Math.pow(Math.abs(Math.cos((x + 1.75) / .30 * Math.PI)), 8) : 1)
}
/** 腹面贴体位置。angle 从腹中线向左右侧量，offset 是管心高出体壁的距离。 */
function ventral(x: number, angle: number, side: number, offset = .023): T.Vector3 {
  const r = surfaceRadius(x)
  return new T.Vector3(x, -(r * .67 + offset) * Math.cos(angle), side * (r + offset) * Math.sin(angle))
}
export function buildJewelBeetlePupa(): InsectModel {
  const root = new T.Group(), g = new T.Group(); g.name='pupa-anatomy'; root.add(g); g.rotation.x = ROLL
  const bodyMat = chitin({ color: '#ede3ce', gloss: .27, clearcoat: .03 })
  const limbMat = chitin({ color: '#e9dfcb', gloss: .25, clearcoat: .02 })
  // 薄足鞘只给少量透射，保留乳白体积，避免玻璃管观感。
  limbMat.transmission=.12; limbMat.thickness=.03; limbMat.ior=1.38
  const padMat = chitin({ color: '#e1d2b5', gloss: .24, clearcoat: .02 })
  const secs: Section[] = []
  for (let i = 0; i <= 260; i++) {
    const x = -1.95 + 3.8 * i / 260
    const fold = x < .6 ? 1 - GROOVE * Math.pow(Math.abs(Math.cos((x + 1.75) / .30 * Math.PI)), 8) : 1
    const r = radius(x) * fold
    secs.push({ at: [x, 0, 0], ry: r * .67, rz: r })
  }
  const body = new T.Mesh(outward(loft(secs, 48)), bodyMat); body.name = 'pupa-body'; g.add(body)
  function tube(name: string, points: T.Vector3[], r: number, parent: T.Object3D = g): T.Mesh {
    const curve = new T.CatmullRomCurve3(points)
    const geo=new T.TubeGeometry(curve,20,r,10,false)
    if(name==='pupa-femur'||name==='pupa-tibia') {
      const p=geo.getAttribute('position')
      for(let i=0;i<=20;i++) {
        const t=i/20,center=curve.getPointAt(t),fullness=.78+.30*Math.pow(Math.sin(Math.PI*t),.6)
        for(let j=0;j<=10;j++) {
          const index=i*11+j,v=new T.Vector3().fromBufferAttribute(p,index).sub(center).multiplyScalar(fullness).add(center)
          v.y-=.003*Math.sin(Math.PI*t)
          p.setXYZ(index,v.x,v.y,v.z)
        }
      }
      geo.computeVertexNormals()
    }
    const m = new T.Mesh(geo, limbMat)
    m.name = name; parent.add(m); return m
  }
  /** 沿椭圆体壁铺鞘翅芽：由背侧绕过肩部至体侧，不用腹面椭球贴片。 */
  function wingPad(side:number): T.Mesh {
    const positions:number[]=[],indices:number[]=[]
    for(let i=0;i<=40;i++)for(let j=0;j<=16;j++) {
      const u=i/40, x=.87-2.02*u, spread=.77*Math.pow(Math.sin(Math.PI*u),.45)
      const theta=1.28+(2*j/16-1)*spread, r=radius(x)+.045*Math.sin(Math.PI*u)
      positions.push(x,r*.67*Math.cos(theta),side*r*Math.sin(theta))
    }
    for(let i=0;i<40;i++)for(let j=0;j<16;j++) {
      const a=i*17+j,b=a+17
      if(side>0)indices.push(a,b,a+1,b,b+1,a+1)
      else indices.push(a,a+1,b,b,a+1,b+1)
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals()
    const pad=new T.Mesh(geo,padMat);pad.name='pupa-wing-pad';return pad
  }
  /** 在身体表面插值而非在空间中拉直线，长足也不会悬空跨过弯曲的体壁。 */
  function along(a:[number,number],b:[number,number],side:number,offset=.010):T.Vector3[] {
    return Array.from({length:17},(_,i)=>ventral(T.MathUtils.lerp(a[0],b[0],i/16),T.MathUtils.lerp(a[1],b[1],i/16),side,offset))
  }
  for (const side of [-1, 1]) {
    g.add(wingPad(side))
    tube('pupa-antenna',along([1.62,1.42],[.83,1.43],side,.022),.024)
    // 真正的腿节/胫节长度约 .55–.70 cm；三条足分别占腹面的内、中、外侧窄带。
    // 同侧足允许纵向交叠，以横向错开防穿越，不能为了互不重叠缩成三个小V。
    const legs = [
      {hip:1.10,reach:.56,angle:.17,scale:1},
      {hip:.73,reach:.62,angle:.61,scale:1.0625},
      {hip:.40,reach:.68,angle:1.06,scale:1.0625},
    ]
    for (const spec of legs) {
      const leg = new T.Group(); leg.name = 'pupa-leg'; g.add(leg)
      const hip:[number,number]=[spec.hip,spec.angle]
      const knee:[number,number]=[spec.hip-spec.reach,spec.angle+.09]
      const ankle:[number,number]=[spec.hip-.08,spec.angle+.26]
      const tip:[number,number]=[spec.hip-.22,spec.angle+.26]
      tube('pupa-femur',along(hip,knee,side),.055*spec.scale,leg)
      tube('pupa-tibia',along(knee,ankle,side),.037*spec.scale,leg)
      tube('pupa-tarsus',along(ankle,tip,side),.017,leg)
      const joint=new T.Mesh(new T.SphereGeometry(.050*spec.scale,16,12),limbMat)
      joint.name='pupa-knee';joint.position.copy(ventral(knee[0],knee[1],side,.010));leg.add(joint)
    }
    const eye = new T.Mesh(new T.SphereGeometry(1, 20, 12), chitin({ color: '#b5a58e', gloss: .28, clearcoat: .02 }))
    eye.name = 'pupa-eye'; eye.scale.set(.10, .07, .055); eye.position.set(1.65, -.07, side * .21); g.add(eye)
  }
  const anchor = (v: T.Vector3) => v.applyAxisAngle(new T.Vector3(1, 0, 0), ROLL)
  return finalize(root, {
    pupalAbdomen: anchor(new T.Vector3(-.6, -.28, 0)),
    foldedLeg: anchor(ventral(.11, .70, 1)),
    antennaSheath: anchor(ventral(1.13, 1.43, 1)),
    wingBud: anchor(new T.Vector3(-.25, .14, .44)),
  })
}
