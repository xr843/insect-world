/** 竹象卵。cm，+X 前、+Y 上、+Z 右。
 * 卵 3.5 × 1.8 mm 为推算。笋的纵轴沿 X；取圆柱壳的一小块弧形切片，
 * 外表保留淡黄绿至褐色笋箨细纹，断边露出浅色笋肉。
 * 咬孔只剖到卵下方，卵部分嵌入孔壁；孔径约 2.6 mm，孔沿是不规则圆形。
 */
import * as THREE from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

const BEND_RADIUS = .62
const WALL_THICKNESS = .105
const HOLE_DEPTH = .064
function surface(s: number, depth = 0): THREE.Vector3 {
  const r=BEND_RADIUS-depth
  return new THREE.Vector3(0,r*Math.cos(s/BEND_RADIUS)-BEND_RADIUS,r*Math.sin(s/BEND_RADIUS))
}
function biteRadius(a: number): number {
  return .13 * (1 + .055 * Math.sin(7*a+.3) + .03 * Math.cos(11*a))
}
function bend(geometry: THREE.BufferGeometry, baseDepth=0): THREE.BufferGeometry {
  const p = geometry.getAttribute('position')
  for (let i=0;i<p.count;i++) {
    const at=surface(p.getY(i),p.getZ(i)+baseDepth)
    p.setXYZ(i,p.getX(i),at.y,at.z)
  }
  if(geometry.type==='ShapeGeometry' && geometry.index) {
    const idx=geometry.index
    for(let i=0;i<idx.count;i+=3) {const a=idx.getX(i);idx.setX(i,idx.getX(i+1));idx.setX(i+1,a)}
  }
  geometry.computeVertexNormals()
  return geometry
}
export function buildWeevilEgg(): InsectModel {
  const g=new THREE.Group()
  const egg=new THREE.Mesh(new THREE.SphereGeometry(1,40,28),chitin({color:'#f2eddd',gloss:.32,clearcoat:.08}))
  egg.name='egg'; egg.scale.set(.175,.09,.09); egg.position.y=.025; g.add(egg)

  const outline=new THREE.Shape()
  for(let i=0;i<64;i++) {
    const a=i/64*Math.PI*2,ragged=1+.025*Math.sin(9*a)+.018*Math.cos(13*a)
    const x=.4*Math.cos(a)*ragged,s=.31*Math.sin(a)*ragged
    if(i===0) outline.moveTo(x,s); else outline.lineTo(x,s)
  }
  outline.closePath()
  const hole=new THREE.Path(),floorShape=new THREE.Shape()
  const rimPoints:THREE.Vector3[]=[]
  for(let i=0;i<=80;i++) {
    const a=-i/80*Math.PI*2,r=biteRadius(a),x=r*Math.cos(a),s=r*Math.sin(a)
    if(i===0) { hole.moveTo(x,s); floorShape.moveTo(x,s) }
    else { hole.lineTo(x,s); floorShape.lineTo(x,s) }
    const at=surface(s); at.x=x; rimPoints.push(at)
  }
  outline.holes.push(hole)
  const pithMat=chitin({color:'#e1d2a6',gloss:.22,clearcoat:0})
  const pith=new THREE.Mesh(bend(new THREE.ExtrudeGeometry(outline,{depth:WALL_THICKNESS,bevelEnabled:false,curveSegments:32})),pithMat)
  pith.name='bamboo-pith'; g.add(pith)
  const skinGeometry=bend(new THREE.ShapeGeometry(outline,32))
  const positions=skinGeometry.getAttribute('position'),colors:number[]=[]
  const green=new THREE.Color('#a5a16b'),brown=new THREE.Color('#948263')
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),z=positions.getZ(i)
    const t=THREE.MathUtils.clamp(.35+.6*x+.08*Math.sin(x*41+z*17),0,1)
    const c=green.clone().lerp(brown,t); colors.push(c.r,c.g,c.b)
  }
  skinGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  const skinMat=chitin({color:'#a5a16b',gloss:.24,clearcoat:0})
  // 顶点色已含基色，材质设白避免二次压暗。
  skinMat.color.set('#ffffff'); skinMat.vertexColors=true
  const skin=new THREE.Mesh(skinGeometry,skinMat); skin.name='bamboo-wall'; skin.position.y=.0007; g.add(skin)
  const floorGeometry=bend(new THREE.ShapeGeometry(floorShape,32),HOLE_DEPTH)
  const floor=new THREE.Mesh(floorGeometry,pithMat); floor.name='bamboo-hole'; g.add(floor)
  // 咬口是一圈细小、同笋肉色的破口，不做粗白描边。
  const rim=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPoints,true),80,.0022,6,true),pithMat)
  rim.name='bamboo-bite-rim'; g.add(rim)

  const fiberMat=chitin({color:'#8d8f5e',gloss:.2,clearcoat:0})
  for(let i=0;i<19;i++) {
    const s=-.275+i*.0305
    const edge=.385*Math.sqrt(Math.max(0,1-(s/.31)**2))
    const gap=Math.abs(s)<.15?Math.sqrt(.15**2-s**2):0
    const spans=gap>0?[[-edge,-gap],[gap,edge]]:[[-edge,edge]]
    for(const [from,to] of spans) {
      if(to-from<.025) continue
      const points=Array.from({length:9},(_,k)=>{
        const x=THREE.MathUtils.lerp(from,to,k/8),at=surface(s+.001*Math.sin(x*27+i))
        at.x=x; at.y+=.0012; return at
      })
      const fiber=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),10,.0011+(i%3)*.0002,5,false),fiberMat)
      fiber.name='bamboo-fiber'; g.add(fiber)
    }
  }
  return finalize(g,{eggShell:new THREE.Vector3(0,.115,0)})
}
