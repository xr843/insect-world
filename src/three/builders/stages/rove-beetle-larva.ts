/**
 * 梭毒隐翅虫 · 二龄蛃型幼虫。体长 4.0、宽 0.7 mm（不含颚、触角和尾突）。
 * 头黄褐，胸部背板暗褐，腹部黄褐底色带暗背板；不是成虫橙黑警戒配色。
 * 三对胸足、短触角、捕食性小颚、成对向后的尾突；局部尺寸按论文图推算。
 * cm；+X 头、+Y 背、+Z 右。无衬底，适于观察六足和尾突。
 */
import * as T from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

const BODY_LENGTH = .32
const HIND_FULLNESS = 1

export function buildRoveBeetleLarva(): InsectModel {
  const g=new T.Group()
  const bodyMat=chitin({color:'#ac925f',gloss:.24,clearcoat:.02})
  const headMat=chitin({color:'#ab864b',gloss:.33,clearcoat:.06})
  const shieldMat=chitin({color:'#554a35',gloss:.28,clearcoat:.02})
  const limbMat=chitin({color:'#8b7044',gloss:.26,clearcoat:.02})
  const jawMat=chitin({color:'#685034',gloss:.32,clearcoat:.02})
  function ellipsoid(name:string,at:[number,number,number],scale:[number,number,number],mat:T.Material) {
    const m=new T.Mesh(new T.SphereGeometry(1,12,8),mat)
    m.name=name;m.position.set(...at);m.scale.set(...scale);g.add(m);return m
  }
  function tube(name:string,coords:number[][],r:number,mat:T.Material) {
    const curve=new T.CatmullRomCurve3(coords.map(p=>new T.Vector3(p[0],p[1],p[2])))
    const geo=new T.TubeGeometry(curve,16,r,8,false)
    // 用半径缓收的管体 + 球头，避免张开的硬切端盖。
    const pos=geo.getAttribute('position')
    for(let i=0;i<=16;i++)for(let j=0;j<=8;j++){
      const k=i*9+j,c=curve.getPointAt(i/16)
      const p=new T.Vector3().fromBufferAttribute(pos,k).sub(c).multiplyScalar(1-.70*(i/16)**2).add(c)
      pos.setXYZ(k,p.x,p.y,p.z)
    }
    geo.computeVertexNormals()
    const m=new T.Mesh(geo,mat);m.name=name;g.add(m)
    const end=coords[coords.length-1]
    ellipsoid('appendage-tip',[end[0],end[1],end[2]],[r*.30,r*.30,r*.30],mat)
    return m
  }
  // 尾端圆收，主体后半段保持近等宽，到最后两节才明显变细。
  const sections:Section[]=[]
  for(let i=0;i<=160;i++) {
    const t=i/160,x=-.20+BODY_LENGTH*t
    const envelope=t<.10?.021*Math.sqrt(Math.max(.0001,1-((t-.10)/.10)**2)):
      t<.25?T.MathUtils.lerp(.021,.032,T.MathUtils.smoothstep(t,.10,.25)):
      t<.60?.032+.003*Math.sin((t-.25)/.35*Math.PI):.033
    const groove=1-.12*Math.pow(Math.abs(Math.cos(t*Math.PI*12)),10)
    const r=Math.max(.00015,envelope*groove*(t<.45?HIND_FULLNESS:1))
    sections.push({at:[x,0,0],ry:r*.70,rz:r})
  }
  const geo=loft(sections,24)
  const index=geo.index!
  // 只交换侧面三角形；两端盖原本朝外。保留 kit 的平滑外法线。
  for(let i=0;i<160*24*6;i+=3){const b=index.getX(i+1);index.setX(i+1,index.getX(i+2));index.setX(i+2,b)}
  const trunk=new T.Mesh(geo,bodyMat);trunk.name='larval-trunk';g.add(trunk)
  ellipsoid('larval-neck',[.124,0,0],[.017,.014,.018],bodyMat)
  ellipsoid('larval-head',[.16,.002,0],[.04,.023,.034],headMat)
  // 三块胸背板贴近体壁；背腹扁，不使用大圆关节或亮色贴片。
  for(const x of [.096,.053,.010])ellipsoid('thoracic-shield',[x,.014,0],[.025,.012,.034],shieldMat)
  for(let i=0;i<7;i++) {
    const x=-.034-i*.023
    ellipsoid('abdominal-tergite',[x,.013,0],[.014,.010,.030*(1-.035*i)],shieldMat)
  }
  for(const side of [-1,1]) {
    for(let i=0;i<3;i++) {
      const x=.096-i*.043
      tube('larval-leg',[[x,-.009,side*.025],[x+.010,-.015,side*.053],[x-.010,-.010,side*.078],[x+.004,-.006,side*.105]],.0055,limbMat)
    }
    tube('urogomphus',[[-.187,0,side*.022],[-.211,.003,side*.030],[-.245,.006,side*.038]],.004,limbMat)
    tube('larval-jaw',[[.188,.002,side*.019],[.208,.003,side*.018],[.222,.001,side*.008]],.0045,jawMat)
    tube('larval-antenna',[[.181,.007,side*.027],[.203,.010,side*.043],[.226,.010,side*.047]],.0035,limbMat)
    for(let i=0;i<4;i++)ellipsoid('larval-stemma',[.165+(i%2)*.009,.014-Math.floor(i/2)*.005,side*.029],[.0022,.0022,.0022],jawMat)
    // 少量不等长、贴近轮廓的简单刚毛，不做整齐白色缝线。
    for(let i=0;i<9;i++) {
      const x=-.157+i*.032,z=side*(.025+(i%3)*.002)
      tube('larval-seta',[[x,.012,z],[x-.004,.016,z+side*(.008+(i%3)*.002)]],.00055,limbMat)
    }
  }
  return finalize(g,{
    larvalHead:new T.Vector3(.16,.025,0),
    thoracicFeet:new T.Vector3(.106,-.015,.053),
    pairedTails:new T.Vector3(-.211,.003,.022),
  })
}
