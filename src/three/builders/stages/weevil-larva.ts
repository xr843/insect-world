/** 竹象老熟幼虫：无足、乳白肥硕、深黄褐硬头壳。
 * cm，+X 前、+Y 上、+Z 右。成虫 trunk 约 2.6 cm（含喙 4.1 cm），
 * 本模型躯干展开 3.05 cm + 头壳约 .4 cm；是比例推算，非本种实测。
 * 直径约 .85 cm / 展开全长约 3.4 cm ≈ 1:4，作粗胖示意，非实测断面。
 * 220° 矢状面 C 弯，后段维持饱满，只在最后半个体径内圆钝收尾。
 */
import * as THREE from 'three'
import { chitin, finalize, loft, type InsectModel, type Section } from '../kit'

const ARC = 3.05
const SPAN = THREE.MathUtils.degToRad(220)
const R = ARC / SPAN
const WRINKLE = .045
function point(t: number) {
  const a = THREE.MathUtils.degToRad(55) + SPAN*t
  return new THREE.Vector3(R*Math.cos(a),R*Math.sin(a),0)
}
function radius(t: number) {
  const broad = .27 + .16*Math.sin(Math.PI*Math.min(t/.65,1)/2)
  const tail = t>.85 ? Math.sqrt(Math.max(.000001,1-((t-.85)/.15)**2)) : 1
  return Math.max(.001,broad*tail*(1-WRINKLE*Math.cos(2*Math.PI*13*t)-.012*Math.cos(4*Math.PI*13*t)))
}
export function buildWeevilLarva(): InsectModel {
  const g = new THREE.Group()
  const bodyMat = chitin({ color:'#eee5cb',gloss:.3,clearcoat:.06 })
  const sections: Section[] = Array.from({length:209},(_,i)=>{
    const t=i/208,r=radius(t)
    return {at:point(t),ry:r,rz:r*.94}
  })
  const geo = loft(sections,32)
  // loft 绕序反向；在本件局部翻绕序并重算法线，不动公共 kit。
  const index = geo.index!
  for(let i=0;i<index.count;i+=3) { const a=index.getX(i); index.setX(i,index.getX(i+1)); index.setX(i+1,a) }
  geo.computeVertexNormals()
  // UV 重合缝两边合并法线，避免一道亮缝。
  const normals = geo.getAttribute('normal')
  for(let i=0;i<sections.length;i++) {
    const a=i*33,b=a+32
    const n=new THREE.Vector3().fromBufferAttribute(normals,a).add(new THREE.Vector3().fromBufferAttribute(normals,b)).normalize()
    normals.setXYZ(a,n.x,n.y,n.z); normals.setXYZ(b,n.x,n.y,n.z)
  }
  const body = new THREE.Mesh(geo,bodyMat); body.name='larva-body'; g.add(body)
  const headCenter=point(0).add(new THREE.Vector3(.16,-.09,0))
  const head=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),chitin({color:'#986331',gloss:.48,clearcoat:.16}))
  head.name='larva-head'; head.scale.set(.24,.27,.275); head.position.copy(headCenter); g.add(head)
  const jawMat=chitin({color:'#302016',gloss:.42,clearcoat:.08})
  for(const side of [-1,1]) {
    const jaw=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),jawMat)
    jaw.name='larva-mandible'; jaw.scale.set(.085,.055,.047)
    jaw.position.copy(headCenter).add(new THREE.Vector3(.2,-.15,side*.085)); jaw.rotation.z=-.45; g.add(jaw)
  }
  const poreMat=chitin({color:'#92744b',gloss:.2,clearcoat:0})
  for(let i=0;i<9;i++) {
    const t=.09+i*.083,p=point(t),r=radius(t)
    for(const side of [-1,1]) {
      const pore=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),poreMat)
      pore.name='larva-spiracle'; pore.scale.set(.025,.017,.008)
      pore.position.copy(p).add(new THREE.Vector3(0,0,side*(r*.94-.002))); g.add(pore)
    }
  }
  return finalize(g,{ larvalHead:headCenter.clone().add(new THREE.Vector3(.12,.15,.13)),softAbdomen:point(.5).add(new THREE.Vector3(0,.4,0)) })
}
