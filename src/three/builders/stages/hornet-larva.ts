/** 金环胡蜂·末龄幼虫。长约31 mm，最粗9.2 mm、头宽4.8 mm（推算）。
 * 无足、乳白软体，小麦黄头和短褐颚，腹部饱满，末端圆收，非尖锥。
 * 房宽11 mm/深33 mm；近侧两面壁剖去，头朝下靠近房口，尾固定房底。
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

export function buildHornetLarva(): InsectModel {
  const pose=new THREE.Group(); pose.name='hornet-stage-pose'
  pose.add(paperCell(-1.55,1.75))
  const skin=chitin({ color:'#dfd5bc', gloss:0.22, clearcoat:0.03 })
  const headMat=chitin({ color:'#bdaa7f', gloss:0.26 })
  const jawMat=chitin({ color:'#685137', gloss:0.3 })
  // 饱满腹部中段保持粗径；两端用半椭圆平滑收圆，节间浅沟而非串珠。
  const sections: Section[]=[]
  for(let i=0;i<=180;i++) {
    const t=i/180, x=-1.5+2.82*t
    const end=t<0.17 ? Math.sqrt(Math.max(0,1-((t-0.17)/0.17)**2)) : t>0.80 ? Math.sqrt(Math.max(0,1-((t-0.80)/0.20)**2)) : 1
    const radius=Math.max(0.002,0.46*end*(1-0.12*t)*(1-0.065*Math.cos(t*12*Math.PI*2)))
    sections.push({ at:V(x,-0.045*Math.sin(t*Math.PI),0),ry:radius*0.95,rz:radius })
  }
  const body=new THREE.Mesh(solid(sections),skin); body.name='larva-body'; pose.add(body)
  pose.add(oval('larva-head',V(1.35,0.04,0),V(0.25,0.22,0.24),headMat))
  for(const s of [-1,1]) {
    const jaw=oval('larva-jaw',V(1.56,0.105,s*0.065),V(0.075,0.055,0.04),jawMat)
    jaw.rotation.y=s*0.2; pose.add(jaw)
  }
  // 稀少低对比气门，不在腹面做成白色缝线。
  for(const s of [-1,1]) for(let i=0;i<9;i++) {
    const x=-1.0+i*0.23
    pose.add(oval('larva-spiracle',V(x,-0.06,s*(0.437-0.015*i)),V(0.018,0.024,0.008),headMat))
  }
  return finish(pose, { 'larva-head':V(1.4,0.17,0), 'larva-body':V(-0.35,0.36,0) })
}
