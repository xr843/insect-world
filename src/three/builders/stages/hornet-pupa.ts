/** 金环胡蜂·工蜂离蛹。长30 mm、头宽9 mm（按本种照片/房宽推算）。
 * 取眼区开始变褐的乳白期，不用成虫橙黑环纹。仰卧腹面朝剖口；
 * 六条粗足鞘、两膝状触角鞘沿各自半侧，四片扁翅鞘贴侧腹，不交叉。
 * 33×11 mm纸巢房口朝下；纸壁剖去近侧两面，丝盖保留远侧半幅以露出蛹。
 * 1=1 cm；+X前/+Y上/+Z右。 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const PAPER = '#a39276'
const POSE = -65 * Math.PI / 180

/** 独立面顶点保留六角折角；按实体外向量校正绕序，再计算外法线。 */
function triangle(vertices: number[], a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, outward: THREE.Vector3) {
  const cross = b.clone().sub(a).cross(c.clone().sub(a))
  const ordered = cross.dot(outward) > 0 ? [a,b,c] : [a,c,b]
  for (const p of ordered) vertices.push(p.x,p.y,p.z)
}

function paperGeometry(vertices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))
  geometry.computeVertexNormals()
  return geometry
}

/** 正六角纸房，宽11mm；只去掉朝home的两面（0/1），保留四面。
 * 所有角点的角度固定，每一层仍是正六边形；细微横纹不扭动房口。
 * 纸层顶点色只给无彩色明暗系数，不再与纸基色重复相乘。
 * +X为开口；旋转后向下。纸底是同一六角轮廓的实体薄板，不是压扁球体。 */
function paperCell(from: number, to: number): THREE.Group {
  const g = new THREE.Group()
  const positions: number[] = [], colors: number[] = []
  const rc = 0.55 / Math.cos(Math.PI/6)
  const rows = 32, subdivisions = 6
  const at = (k: number, j: number, u: number, shell: number) => {
    const a=k*Math.PI/3, b=(k+1)*Math.PI/3
    const ripple=0.0012*Math.sin(j*1.73)
    const radius=rc+ripple+shell*0.008
    return V(THREE.MathUtils.lerp(from,to,j/rows),
      THREE.MathUtils.lerp(Math.cos(a),Math.cos(b),u)*radius,
      THREE.MathUtils.lerp(Math.sin(a),Math.sin(b),u)*radius)
  }
  const quad = (a: THREE.Vector3,b: THREE.Vector3,c: THREE.Vector3,d: THREE.Vector3,outward: THREE.Vector3,shade: number) => {
    const before=positions.length
    triangle(positions,a,b,c,outward); triangle(positions,a,c,d,outward)
    for(let i=before;i<positions.length;i+=3) colors.push(shade,shade,shade)
  }
  for(let k=2;k<6;k++) {
    const mid=(k+0.5)*Math.PI/3, outward=V(0,Math.cos(mid),Math.sin(mid))
    for(let j=0;j<rows;j++) for(let i=0;i<subdivisions;i++) {
      const u=i/subdivisions, v=(i+1)/subdivisions
      const shade=0.94+0.035*Math.sin(j*1.73+k*0.21)
      for(const shell of [-1,1]) quad(at(k,j,u,shell),at(k,j+1,u,shell),at(k,j+1,v,shell),at(k,j,v,shell),outward.clone().multiplyScalar(shell),shade)
    }
    for(const j of [0,rows]) for(let i=0;i<subdivisions;i++) {
      const u=i/subdivisions, v=(i+1)/subdivisions
      quad(at(k,j,u,-1),at(k,j,u,1),at(k,j,v,1),at(k,j,v,-1),V(j===0?-1:1,0,0),0.96)
    }
    for(const [i,sign] of [[0,-1],[subdivisions,1]]) {
      if(!((k===2 && i===0)||(k===5 && i===subdivisions))) continue
      for(let j=0;j<rows;j++) {
        const u=i/subdivisions
        quad(at(k,j,u,-1),at(k,j+1,u,-1),at(k,j+1,u,1),at(k,j,u,1),V(0,-Math.sin(mid)*sign,Math.cos(mid)*sign),0.96)
      }
    }
  }
  const geometry=paperGeometry(positions)
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  const paper=chitin({color:PAPER,gloss:0.03})
  paper.vertexColors=true
  const wall=new THREE.Mesh(geometry,paper); wall.name='paper-wall'; g.add(wall)

  const bottom: number[]=[]
  const front=from+0.02, back=from-0.02
  for(let k=0;k<6;k++) {
    const a=k*Math.PI/3, b=(k+1)*Math.PI/3, mid=(a+b)/2
    const corner=(x:number,t:number)=>V(x,rc*Math.cos(t),rc*Math.sin(t))
    triangle(bottom,V(front,0,0),corner(front,a),corner(front,b),V(1,0,0))
    triangle(bottom,V(back,0,0),corner(back,b),corner(back,a),V(-1,0,0))
    const normal=V(0,Math.cos(mid),Math.sin(mid))
    triangle(bottom,corner(front,a),corner(back,a),corner(back,b),normal)
    triangle(bottom,corner(front,a),corner(back,b),corner(front,b),normal)
  }
  // 底面单独用不启用vertexColors的纸材质，避免无颜色属性时读成黑盘。
  const base=new THREE.Mesh(paperGeometry(bottom),chitin({color:PAPER,gloss:0.03}))
  base.name='paper-base'; g.add(base)
  return g
}

function oval(name: string, at: THREE.Vector3, radii: THREE.Vector3, material: THREE.Material): THREE.Mesh {
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material)
  mesh.name=name; mesh.position.copy(at); mesh.scale.copy(radii)
  return mesh
}

/** kit.loft的绕序反向，局部翻三角形使浅色凸壳的正面光照与球体一致。
 * 不动kit；不靠transmission掩饰内凹。 */
function solid(sections: Section[], radial=32): THREE.BufferGeometry {
  const geo=loft(sections,radial)
  const index=geo.index!
  for(let i=0;i<index.count;i+=3) {
    const b=index.getX(i+1); index.setX(i+1,index.getX(i+2)); index.setX(i+2,b)
  }
  return geo
}

function finish(pose: THREE.Group, anchors: Record<string, THREE.Vector3>): InsectModel {
  const g=new THREE.Group(); pose.rotation.z=POSE; g.add(pose)
  for(const a of Object.values(anchors)) a.applyAxisAngle(V(0,0,1),POSE)
  return finalize(g,anchors)
}

function sheath(name: string, pts: THREE.Vector3[], radius: number, material: THREE.Material): THREE.Mesh {
  const curve=new THREE.CatmullRomCurve3(pts,false,'centripetal')
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,radius,12,false),material)
  mesh.name=name; return mesh
}

export function buildHornetPupa(): InsectModel {
  const pose=new THREE.Group(); pose.name='hornet-stage-pose'
  pose.add(paperCell(-1.62,1.68))
  const skin=chitin({ color:'#ded2b8', gloss:0.24, clearcoat:0.04 })
  const limb=chitin({ color:'#cdbfa2', gloss:0.25, clearcoat:0.03 })
  const eyes=chitin({ color:'#786253', gloss:0.3 })
  const silk=chitin({ color:'#d8d2c8', gloss:0.06 })
  const sections: Section[]=[]
  for(let i=0;i<=120;i++) {
    const t=i/120, x=-1.5+1.73*t
    const r=Math.max(0.001,0.43*Math.pow(Math.sin(Math.PI*t),0.6)*(1-0.065*Math.cos(t*7*Math.PI*2)))
    sections.push({at:V(x,0,0),ry:r*0.85,rz:r})
  }
  const abdomen=new THREE.Mesh(solid(sections),skin); abdomen.name='pupa-abdomen'; pose.add(abdomen)
  pose.add(oval('pupa-waist',V(0.22,0,0),V(0.16,0.14,0.15),skin))
  pose.add(oval('pupa-thorax',V(0.53,0,0),V(0.43,0.34,0.4),skin))
  pose.add(oval('pupa-head',V(1.12,0.015,0),V(0.38,0.29,0.45),skin))
  for(const s of [-1,1]) {
    pose.add(oval('pupa-eye',V(1.2,0.16,s*0.365),V(0.18,0.13,0.095),eyes))
    pose.add(oval('pupa-jaw',V(1.43,0.15,s*0.115),V(0.095,0.09,0.09),limb))
  }
  // 三对各沿半侧折向后，足鞘半径0.07–0.08，约成虫足节的1.4–1.5倍。
  for(let i=0;i<3;i++) for(const s of [-1,1]) {
    const x=0.8-i*0.12, z=0.22+i*0.025
    pose.add(sheath('pupa-leg',[
      V(x,0.25,s*z), V(x-0.22-i*0.12,0.26,s*(z+0.04)),
      V(x-0.62-i*0.12,0.25,s*(z+0.03)), V(x-0.95-i*0.2,0.22,s*z),
    ],0.07+i*0.005,limb))
  }
  for(const s of [-1,1]) {
    // 肘部在眼内侧，随后沿胸侧向后，外轮廓与足鞘分开。
    pose.add(sheath('pupa-antenna',[
      V(1.22,0.255,s*0.20),V(1.02,0.38,s*0.39),
      V(0.65,0.33,s*0.46),V(0.35,0.22,s*0.45),
    ],0.045,limb))
    for(let j=0;j<2;j++) {
      const wing=oval('pupa-wing',V(-0.02-j*0.16,0.08-j*0.07,s*(0.43-j*0.04)),V(0.55-j*0.16,0.043,0.15-j*0.025),limb)
      pose.add(wing)
    }
  }
  // 丝盖远侧半幅：同六角轮廓，近侧剖除。实体薄壳向房口外鼓0.6mm。
  const capVertices: number[]=[]
  const rc=0.55/Math.cos(Math.PI/6), center=V(0,0,-0.22)
  const rim=[Math.PI,4*Math.PI/3,5*Math.PI/3,2*Math.PI].map(a=>V(0,rc*Math.cos(a),rc*Math.sin(a)))
  const surface=(p:THREE.Vector3,r:number)=>V(1.70+0.06*(1-r*r),center.y+(p.y-center.y)*r,center.z+(p.z-center.z)*r)
  for(let k=0;k<rim.length;k++) {
    const a=rim[k], b=rim[(k+1)%rim.length]
    for(let j=0;j<8;j++) {
      const r0=j/8, r1=(j+1)/8
      triangle(capVertices,surface(a,r0),surface(a,r1),surface(b,r1),V(1,0,0))
      if(j>0) triangle(capVertices,surface(a,r0),surface(b,r1),surface(b,r0),V(1,0,0))
    }
    const back=(p:THREE.Vector3)=>V(1.68,p.y,p.z)
    triangle(capVertices,V(1.68,center.y,center.z),back(b),back(a),V(-1,0,0))
    const outward=V(0,(a.y+b.y)/2-center.y,(a.z+b.z)/2-center.z)
    triangle(capVertices,back(a),back(b),surface(b,1),outward)
    triangle(capVertices,back(a),surface(b,1),surface(a,1),outward)
  }
  const cap=new THREE.Mesh(paperGeometry(capVertices),silk)
  cap.name='silk-cap'; pose.add(cap)
  return finish(pose, { 'pupa-head':V(1.2,0.23,0), 'pupa-abdomen':V(-0.65,0.3,0), 'pupa-leg':V(0.39,0.25,-0.26) })
}
