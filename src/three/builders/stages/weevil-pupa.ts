/** 竹象离蛹，推算体长约 2.8 cm。单位 cm。
 * 解剖坐标：+X 头、+Y 背、+Z 右。标本绕 X 翻转 180° 仰卧，腹面朝上。
 * 中线喙回折到后足基部，触角紧随喙两侧；三对窄 V 足各占独立的前后区间。
 * 附肢是顺着实际体壁的扁鞘，厚 0.2–0.46 mm，下半面嵌入体壁，绝不悬空。
 * 翅芽从背侧包向体侧，留在足的外侧；不盖住腹面中线长喙。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

const ROLL = Math.PI
const BODY = [
  [-.47,.92,.48,.53],
  [.52,.57,.43,.43],
  [1.06,.3,.29,.3],
] as const
function abdomenRipple(x:number) {
  return 1-.045*Math.cos(2*Math.PI*8*(x+1.39)/1.84)
}
function wallRadius(x:number,phi:number):number {
  const a=THREE.MathUtils.degToRad(phi)
  let r=0
  BODY.forEach(([cx,rx,ry,rz],i)=>{
    const k=1-((x-cx)/rx)**2
    if(k>0) {
      const ripple=i===0?abdomenRipple(x):1
      r=Math.max(r,Math.sqrt(k)*ripple/Math.hypot(Math.cos(a)/ry,Math.sin(a)/rz))
    }
  })
  return r
}
function wall(x:number,phi:number,side:number,lift=0):THREE.Vector3 {
  const a=THREE.MathUtils.degToRad(phi),r=wallRadius(x,phi)+lift
  return new THREE.Vector3(x,-Math.cos(a)*r,side*Math.sin(a)*r)
}
type Joint = readonly [x:number,phi:number]
/**
 * 在体壁的 (x, φ) 参数平面画附肢。每个横截面的横向偏移也重新投回体壁，
 * 避免用三维直线连关节时跨过弧面、悬空或穿体。下半面略埋、上半面低低隆起。
 * 左右直接在坐标上镜像，三角绕序分别按外法线校验。
 */
function sheath(path:readonly Joint[],width:number,height:number,side:number,material:THREE.Material,name:string):THREE.Mesh {
  const rows=40,cols=16,positions:number[]=[],uvs:number[]=[],indices:number[]=[]
  for(let i=0;i<=rows;i++) {
    const t=i/rows,segment=Math.min(path.length-2,Math.floor(t*(path.length-1)))
    const f=t*(path.length-1)-segment
    const [ax,ap]=path[segment],[bx,bp]=path[segment+1]
    const x=THREE.MathUtils.lerp(ax,bx,f),phi=THREE.MathUtils.lerp(ap,bp,f)
    const r=wallRadius(x,phi),dx=bx-ax,ds=THREE.MathUtils.degToRad(bp-ap)*r
    const length=Math.hypot(dx,ds),nx=-ds/length,ns=dx/length
    const taper=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.28)
    for(let j=0;j<=cols;j++) {
      const a=j/cols*Math.PI*2,cross=Math.sin(a)*width*taper
      const px=x+nx*cross,angle=phi+THREE.MathUtils.radToDeg(ns*cross/Math.max(r,.1))
      const lift=(.5+.5*Math.cos(a))*height*taper-.004
      const v=wall(px,angle,side,lift)
      positions.push(v.x,v.y,v.z); uvs.push(j/cols,t)
    }
  }
  for(let i=0;i<rows;i++) for(let j=0;j<cols;j++) {
    const a=i*(cols+1)+j,b=a+cols+1
    if(side>0) indices.push(a,a+1,b,b,a+1,b+1)
    else indices.push(a,b,a+1,b,b+1,a+1)
  }
  const geo=new THREE.BufferGeometry()
  geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2)); geo.setIndex(indices)
  geo.computeVertexNormals()
  // 从一枚非退化截面校验朝外方向，不依赖路径是向前还是向后。
  const index=geo.index!,p=geo.getAttribute('position'),n=geo.getAttribute('normal')
  const middle=Math.floor(rows/2)*(cols+1)
  const v=new THREE.Vector3().fromBufferAttribute(p,middle)
  const radial=new THREE.Vector3(0,v.y,v.z).normalize()
  if(new THREE.Vector3().fromBufferAttribute(n,middle).dot(radial)<0) {
    for(let i=0;i<index.count;i+=3) {
      const a=index.getX(i);index.setX(i,index.getX(i+1));index.setX(i+1,a)
    }
    geo.computeVertexNormals()
  }
  // 合并 UV 缝两侧法线。
  for(let i=0;i<=rows;i++) {
    const a=i*(cols+1),b=a+cols
    const normal=new THREE.Vector3().fromBufferAttribute(n,a).add(new THREE.Vector3().fromBufferAttribute(n,b)).normalize()
    n.setXYZ(a,normal.x,normal.y,normal.z);n.setXYZ(b,normal.x,normal.y,normal.z)
  }
  const mesh=new THREE.Mesh(geo,material);mesh.name=name;return mesh
}
export function buildWeevilPupa():InsectModel {
  const g=new THREE.Group(),pose=new THREE.Group()
  pose.name='pupa-pose';pose.rotation.x=ROLL;g.add(pose)
  const bodyMat=chitin({color:'#efe5ce',gloss:.32,clearcoat:.06})
  const padMat=chitin({color:'#e1d2b5',gloss:.3,clearcoat:.06})
  const legMat=chitin({color:'#dfcfaf',gloss:.32,clearcoat:.06})
  const snoutMat=chitin({color:'#d3bc93',gloss:.34,clearcoat:.08})
  const sections:Section[]=Array.from({length:113},(_,i)=>{
    const x=-1.39+1.84*i/112,round=Math.sqrt(Math.max(.000001,1-((x+.47)/.92)**2)),ripple=abdomenRipple(x)
    return {at:new THREE.Vector3(x,0,0),ry:.48*round*ripple,rz:.53*round*ripple}
  })
  const abdomenGeometry=loft(sections,32),idx=abdomenGeometry.index!
  for(let i=0;i<idx.count;i+=3) {const a=idx.getX(i);idx.setX(i,idx.getX(i+1));idx.setX(i+1,a)}
  abdomenGeometry.computeVertexNormals()
  const abdomen=new THREE.Mesh(abdomenGeometry,bodyMat);abdomen.name='pupa-abdomen';pose.add(abdomen)
  for(const [i,name] of [[1,'pupa-thorax'],[2,'pupa-head']] as const) {
    const [x,rx,ry,rz]=BODY[i],mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),bodyMat)
    mesh.name=name;mesh.position.x=x;mesh.scale.set(rx,ry,rz);pose.add(mesh)
  }
  const rostrum=sheath([[1.31,0],[.9,0],[.49,0],[.08,0],[-.33,0]],.07,.046,1,snoutMat,'pupa-rostrum')
  pose.add(rostrum)
  for(const side of [-1,1]) {
    pose.add(sheath([[.58,105],[-.05,102],[-.72,108]],.145,.026,side,padMat,'pupa-wing-pad'))
    pose.add(sheath([[.85,17],[.65,22],[.29,20],[-.1,19]],.029,.026,side,padMat,'pupa-antenna-pad'))
    for(let pair=0;pair<3;pair++) {
      const x=.85-pair*.5
      const joints:Joint[]=[[x,43],[x+.16,75],[x-.09,58],[x-.24,64]]
      const widths=[.06,.044,.027],heights=[.043,.034,.023]
      const names=['pupa-femur','pupa-tibia','pupa-tarsus']
      for(let j=0;j<3;j++) {
        const m=sheath([joints[j],joints[j+1]],widths[j],heights[j],side,legMat,names[j])
        m.userData.pair=pair;pose.add(m)
      }
    }
  }
  const roll=new THREE.Euler(ROLL,0,0)
  return finalize(g,{
    pupalRostrum:wall(.1,0,1,.035).applyEuler(roll),
    foldedLeg:wall(.43,60,1,.025).applyEuler(roll),
    wingPad:wall(-.2,102,1,.02).applyEuler(roll),
  })
}
