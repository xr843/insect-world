/** 金环胡蜂·卵。真实尺度：5.0×1.4 mm（按图像与房宽推算）。
 * 单产于纸房底部、长轴向房内。只展示底端5.5 mm的剖片，房口在更下方，
 * 不是把33 mm深巢房缩成浅杯。卵不放大，使用球体外法线避免白卵读成凹坑。
 * 1=1 cm；+X前/+Y上/+Z右，整个巢房为展示旋转，开口方向朝下。 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

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

function finish(pose: THREE.Group, anchors: Record<string, THREE.Vector3>): InsectModel {
  const g=new THREE.Group(); pose.rotation.z=POSE; g.add(pose)
  for(const a of Object.values(anchors)) a.applyAxisAngle(V(0,0,1),POSE)
  return finalize(g,anchors)
}

export function buildHornetEgg(): InsectModel {
  const pose=new THREE.Group(); pose.name='hornet-stage-pose'
  pose.add(paperCell(-0.28,0.27))
  const shell=chitin({ color:'#e7dfcc', gloss:0.25, clearcoat:0.04 })
  const egg=oval('egg',V(-0.01,0,0),V(0.25,0.07,0.07),shell)
  pose.add(egg)
  return finish(pose, { egg: V(0.04,0.06,0) })
}
