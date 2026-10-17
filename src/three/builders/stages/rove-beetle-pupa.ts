/**
 * 梭毒隐翅虫 · 初期离蛹，体长 4.2、宽 1.0 mm（Ritanti & Haryadi 2021）。
 * cm；+X 头、+Y 上、+Z 右。仰卧腹面朝上，省去会挡住附肢的土室。
 * 三对足鞘短而粗，折叠贴体；触角往后贴头胸两侧；短翅芽不覆盖长腹。
 * 附肢局部尺寸按图推算，颜色仅比主体略深，无成人蓝黑鞘翅与橙红体色。
 */
import * as T from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

const SCALE = 1
const TAIL_R = .0002
const LEG_RADIUS = .007
const VENTRAL = 1
const SIDE_OFFSET = 1

/** 饱满梭形腹部，只有尾端圆收，胸部保留肩部而不是胡萝卜尖。 */
function radius(x:number):number {
  const knots=[[-.22,TAIL_R],[-.20,.020],[-.17,.033],[-.13,.042],[-.08,.048],[-.02,.050],[.04,.047],[.08,.043],[.12,.036],[.145,.028]]
  for(let i=1;i<knots.length;i++)if(x<=knots[i][0]) {
    const [a,r]=knots[i-1],[b,s]=knots[i]
    // 椭圆剖面圆端，避免硬切端面。
    if(i===1)return Math.max(TAIL_R,.020*Math.sqrt(Math.max(0,1-((x+.20)/.02)**2)))
    return T.MathUtils.lerp(r,s,T.MathUtils.smoothstep(x,a,b))
  }
  return .028
}
export function buildRoveBeetlePupa(): InsectModel {
  const g=new T.Group()
  const bodyMat=chitin({color:'#dbc991',gloss:.27,clearcoat:.03})
  const limbMat=chitin({color:'#cfbc83',gloss:.25,clearcoat:.02})
  const wingMat=chitin({color:'#d2bf87',gloss:.25,clearcoat:.02})
  const eyeMat=chitin({color:'#b09b6b',gloss:.23,clearcoat:.02})
  const sections:Section[]=[]
  for(let i=0;i<=210;i++) {
    const x=-.22+.365*i/210
    const groove=x<.035?1-.10*Math.pow(Math.abs(Math.cos((x+.20)/.032*Math.PI)),12):1
    const r=radius(x)*groove
    sections.push({at:[x,0,0],ry:r*.68,rz:r})
  }
  const geo=loft(sections,32),idx=geo.index!
  for(let i=0;i<210*32*6;i+=3){const b=idx.getX(i+1);idx.setX(i+1,idx.getX(i+2));idx.setX(i+2,b)}
  const trunk=new T.Mesh(geo,bodyMat);trunk.name='pupal-trunk';g.add(trunk)
  function ellipsoid(name:string,at:[number,number,number],scale:[number,number,number],mat:T.Material) {
    const m=new T.Mesh(new T.SphereGeometry(1,24,16),mat)
    m.name=name;m.position.set(...at);m.scale.set(...scale);g.add(m);return m
  }
  ellipsoid('pupal-head',[.162,.003,0],[.038,.024,.036],bodyMat)
  function tube(name:string,coords:number[][],r:number) {
    const curve=new T.CatmullRomCurve3(coords.map(p=>new T.Vector3(...p as [number,number,number])))
    const geo=new T.TubeGeometry(curve,24,r,10,false)
    // 两端圆收、内部微鼓；不用明亮球关节，足鞘自己连续转折。
    const p=geo.getAttribute('position')
    for(let i=0;i<=24;i++)for(let j=0;j<=10;j++) {
      const k=i*11+j,t=i/24,c=curve.getPointAt(t)
      const factor=.18+.88*Math.pow(Math.sin(Math.PI*t),.35)
      const v=new T.Vector3().fromBufferAttribute(p,k).sub(c).multiplyScalar(factor).add(c)
      p.setXYZ(k,v.x,v.y,v.z)
    }
    geo.computeVertexNormals()
    const m=new T.Mesh(geo,limbMat);m.name=name;g.add(m)
  }
  for(const side of [-1,1]) {
    for(let i=0;i<3;i++) {
      const x=.119-i*.041,z=side*(.014+i*.009)*SIDE_OFFSET
      const y=(.027+i*.003)*VENTRAL
      tube('pupal-leg',[[x,y,z],[x-.023,y+.006,z+side*.008],[x-.068,y+.003,z+side*.009],[x-.042,y+.009,z+side*.002]],LEG_RADIUS)
    }
    tube('pupal-antenna',[[.177,.022,side*.030],[.151,.030,side*.037],[.116,.033,side*.040],[.079,.033,side*.045]],.004)
    const wing=ellipsoid('pupal-wing-pad',[.039,.026,side*.045],[.048,.014,.010],wingMat)
    wing.rotation.y=side*.12
    ellipsoid('pupal-eye',[.173,.015,side*.029],[.010,.008,.006],eyeMat)
    // 蛹末端短的成对突起，与幼虫长尾突区分。
    tube('pupal-terminal-process',[[-.201,0,side*.012],[-.221,.004,side*.016],[-.233,.005,side*.017]],.0025)
  }
  g.scale.setScalar(SCALE)
  return finalize(g,{
    pupalHead:new T.Vector3(.162,.027,0).multiplyScalar(SCALE),
    foldedFeet:new T.Vector3(.055,.039,.024).multiplyScalar(SCALE),
    antennaSheath:new T.Vector3(.116,.037,.040).multiplyScalar(SCALE),
    wingBud:new T.Vector3(.039,.040,.045).multiplyScalar(SCALE),
  })
}
