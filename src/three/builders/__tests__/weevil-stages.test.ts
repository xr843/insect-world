/**
 * 竹象 Cyrtotrachelus buquetii 生活史形态。
 * 参考：https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5491049/
 * https://rupp.edu.kh/cjnh/journal/CJNH-2022-1/CJNH%2021-25%20Sin%20et%20al.pdf
 * 卵 3–4 mm、幼虫展开约 34 mm、蛹体约 28 mm 均为示意推算，不冒充本种实测。
 * 每项的退化实验见就近注释；原轮日志在 audit-out/weevil/mutations.json；返工变异日志在 audit-out/weevil/rework/mutations.json。
 */
import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { buildWeevilEgg } from '../stages/weevil-egg'
import { buildWeevilLarva } from '../stages/weevil-larva'
import { buildWeevilPupa } from '../stages/weevil-pupa'
import { buildWeevil } from '../weevil'
import type { InsectModel } from '../kit'
import { builtStagesOf } from '../../stages'

const egg = buildWeevilEgg(), larva = buildWeevilLarva(), pupa = buildWeevilPupa()
function meshes(m: InsectModel, name?: string): THREE.Mesh[] {
  m.group.updateMatrixWorld(true)
  const a: THREE.Mesh[] = []
  m.group.traverse(o => { if ((o as THREE.Mesh).isMesh && (!name || o.name === name)) a.push(o as THREE.Mesh) })
  return a
}
function box(m: InsectModel, name: string) {
  const b = new THREE.Box3()
  for (const o of meshes(m, name)) b.union(new THREE.Box3().setFromObject(o))
  return b
}
function size(m: InsectModel, name: string) { return box(m, name).getSize(new THREE.Vector3()) }
function mat(m: InsectModel, name: string) { return meshes(m, name)[0].material as THREE.MeshPhysicalMaterial }
function light(m: InsectModel, name: string) {
  const material=mat(m,name),color=material.color.clone()
  const vc=meshes(m,name)[0].geometry.getAttribute('color')
  if(material.vertexColors && vc) {
    const mean=new THREE.Color(0,0,0)
    for(let i=0;i<vc.count;i++) {mean.r+=vc.getX(i);mean.g+=vc.getY(i);mean.b+=vc.getZ(i)}
    color.multiply(mean.multiplyScalar(1/vc.count))
  }
  return color.getHSL({h:0,s:0,l:0},THREE.SRGBColorSpace).l
}
function vertices(o: THREE.Mesh, local = false) {
  const p = o.geometry.getAttribute('position'), out: THREE.Vector3[] = []
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld)
    if (local) o.parent!.worldToLocal(v)
    out.push(v)
  }
  return out
}
// Recover loft rings from geometry, never from userData or builder constants.
function rings(o: THREE.Mesh) {
  const p = o.geometry.getAttribute('position'), uv = o.geometry.getAttribute('uv')
  const groups = new Map<number, THREE.Vector3[]>()
  for (let i = 0; i < p.count; i++) {
    if (uv.getX(i) >= 0.99999) continue
    const key = Math.round(uv.getY(i) * 1e6)
    const a = groups.get(key) ?? []
    a.push(new THREE.Vector3().fromBufferAttribute(p, i)); groups.set(key, a)
  }
  return [...groups.entries()].sort((a,b) => a[0]-b[0]).map(([,a]) => {
    const c = a.reduce((v,p) => v.add(p), new THREE.Vector3()).divideScalar(a.length)
    return { c, r: a.reduce((s,v) => s + v.distanceTo(c), 0) / a.length }
  })
}
function appendages() {
  return meshes(pupa).filter(m=>['pupa-rostrum','pupa-antenna-pad','pupa-wing-pad','pupa-femur','pupa-tibia','pupa-tarsus'].includes(m.name))
}
function bodySurfaceDistance() {
  const cells=new Map<string,THREE.Triangle[]>(),step=.12,pad=.065
  const key=(x:number,y:number,z:number)=>`${x},${y},${z}`
  for(const name of ['pupa-abdomen','pupa-thorax','pupa-head']) for(const m of meshes(pupa,name)) {
    const vs=vertices(m,true),idx=m.geometry.index
    const n=idx?.count??vs.length
    for(let i=0;i<n;i+=3) {
      const at=(j:number)=>vs[idx?idx.getX(j):j]
      const tri=new THREE.Triangle(at(i),at(i+1),at(i+2))
      const b=new THREE.Box3().setFromPoints([tri.a,tri.b,tri.c]).expandByScalar(pad)
      for(let x=Math.floor(b.min.x/step);x<=Math.floor(b.max.x/step);x++)
        for(let y=Math.floor(b.min.y/step);y<=Math.floor(b.max.y/step);y++)
          for(let z=Math.floor(b.min.z/step);z<=Math.floor(b.max.z/step);z++) {
            const k=key(x,y,z),a=cells.get(k)??[];a.push(tri);cells.set(k,a)
          }
    }
  }
  const point=new THREE.Vector3()
  return (v:THREE.Vector3)=>{
    let distance=Infinity
    for(const tri of cells.get(key(Math.floor(v.x/step),Math.floor(v.y/step),Math.floor(v.z/step)))??[]) {
      tri.closestPointToPoint(v,point); distance=Math.min(distance,v.distanceTo(point))
    }
    return distance
  }
}
function between(v: number, lo: number, hi: number) { expect(v).toBeGreaterThanOrEqual(lo); expect(v).toBeLessThanOrEqual(hi) }
const adultKeys = ['rostrum','antenna','elytra','eye','leg','pronotum']

describe('竹象卵', () => {
  // M01: 卵放大十倍 / 缩小十倍 / 改成球均应失败。
  it('E1 真实毫米尺度的单粒长椭圆', () => {
    expect(meshes(egg,'egg')).toHaveLength(1)
    const s = size(egg,'egg'); between(s.x, .3,.4); between(s.y,.14,.23); between(s.x/s.z,1.5,2.5)
  })
  // M02: 卵染灰、透射、清漆过亮分别退化。
  it('E2 光滑乳白实心壳', () => {
    between(light(egg,'egg'),.85,.98)
    expect(mat(egg,'egg').transmission).toBe(0)
    expect(mat(egg,'egg').clearcoat).toBeLessThan(.2)
    expect(meshes(egg,'egg')[0].geometry.type).toBe('SphereGeometry')
  })
  // R-E3: 卵或孔单独平移、卵悬空/沉底都会变红。
  it('E3 卵部分嵌入圆孔，与孔口和孔底共位', () => {
    const e=box(egg,'egg'),hole=box(egg,'bamboo-hole'),rim=box(egg,'bamboo-bite-rim')
    const ec=e.getCenter(new THREE.Vector3()),hc=hole.getCenter(new THREE.Vector3())
    expect(Math.hypot(ec.x-hc.x,ec.z-hc.z)).toBeLessThan(.02)
    expect(ec.distanceTo(rim.getCenter(new THREE.Vector3()))).toBeLessThan(.07)
    between(e.min.y-hole.max.y,-.02,.005)
    between(e.max.y-rim.max.y,.07,.15)
    between(hole.getSize(new THREE.Vector3()).x/hole.getSize(new THREE.Vector3()).z,.85,1.15)
    between(size(egg,'egg').x/(egg.radius*2),.3,.65)
  })
  // R-E4: 直接把圆柱壳压平；整块笋肉压成薄纸，都会变红。
  it('E4 笋壁是真实弧形厚切片，有浅色断面与纵纹', () => {
    const vs=vertices(meshes(egg,'bamboo-wall')[0])
    const inner=vs.filter(v=>Math.abs(v.z)<.15),outer=vs.filter(v=>Math.abs(v.z)>.24)
    expect(inner.length).toBeGreaterThan(4); expect(outer.length).toBeGreaterThan(4)
    const mean=(a:THREE.Vector3[])=>a.reduce((s,v)=>s+v.y,0)/a.length
    expect(mean(inner)-mean(outer)).toBeGreaterThan(.035)
    const cut=box(egg,'bamboo-pith')
    expect(cut.getSize(new THREE.Vector3()).y).toBeGreaterThan(.12)
    expect(light(egg,'bamboo-pith')-light(egg,'bamboo-wall')).toBeGreaterThan(.13)
    expect(meshes(egg,'bamboo-fiber').length).toBeGreaterThan(10)
  })
  // R-E5: 咬口改成规整圆变红；狭长槽另由 E3 的轴比拦住。
  it('E5 咬孔圆而不规整，孔缘有克制的缺刻', () => {
    const vs=vertices(meshes(egg,'bamboo-hole')[0]),center=box(egg,'bamboo-hole').getCenter(new THREE.Vector3())
    const rs=vs.map(v=>Math.hypot(v.x-center.x,v.z-center.z)),mean=rs.reduce((a,b)=>a+b,0)/rs.length
    between(mean,.115,.145)
    const b=box(egg,'bamboo-hole').getSize(new THREE.Vector3())
    const normalized=vs.map(v=>Math.hypot((v.x-center.x)/(b.x/2),(v.z-center.z)/(b.z/2)))
    between(Math.max(...normalized)-Math.min(...normalized),.045,.24)
  })
})
describe('竹象无足幼虫', () => {
  // M04: 弧长减半/翻倍，或做成成虫一样只有一两毫米。
  it('L1 展开体长约 3.4 cm，与成虫躯干相当或稍长', () => {
    const rs = rings(meshes(larva,'larva-body')[0])
    const arc = rs.slice(1).reduce((s,r,i)=>s+r.c.distanceTo(rs[i].c),0)
    between(arc,2.8,3.3)
    const adult = size(buildWeevil(),'trunk').x
    between((arc+size(larva,'larva-head').x)/adult,1.05,1.55)
  })
  // M05: 拉直中心线；与体长断言分开，弧长不变也拦得住。
  it('L2 粗胖 C 形，弧弦比与体径均合理', () => {
    const rs = rings(meshes(larva,'larva-body')[0])
    const arc = rs.slice(1).reduce((s,r,i)=>s+r.c.distanceTo(rs[i].c),0)
    between(rs[0].c.distanceTo(rs.at(-1)!.c)/arc,.3,.65)
    between(Math.max(...rs.map(r=>r.r))*2,.75,1.05)
  })
  // M06: 加一条可见的足（不依赖是否叫 leg）。
  it('L3 身上无足、无腹足，只有体壁、头、短颚与贴壁气门', () => {
    const allowed = ['larva-body','larva-head','larva-mandible','larva-spiracle']
    expect(meshes(larva).every(m=>allowed.includes(m.name))).toBe(true)
    expect(larva.rig?.legs?.length ?? 0).toBe(0)
  })
  // M07: 去掉褶皱 / 改线性收尖冰淇淋筒 / 平切尾端。
  // 第一轮只数极值漏掉了去褶皱：浮点噪声也造峰；补最小起伏深度后拦住。
  it('L4 多皱褶，后半段依旧饱满，末端圆滑收口', () => {
    const rs = rings(meshes(larva,'larva-body')[0])
    const radii = rs.map(r=>r.r)
    const peaks = radii.filter((r,i)=>i>10&&i<radii.length-12&&r>radii[i-1]&&r>radii[i+1]&&r-radii[i-4]>.0015&&r-radii[i+4]>.0015)
    expect(peaks.length).toBeGreaterThanOrEqual(11)
    between(rs[Math.round(rs.length*.78)].r/rs[Math.round(rs.length*.4)].r,.8,1.2)
    expect(rs.at(-1)!.r).toBeLessThan(.006)
    expect(rs.at(-5)!.r).toBeGreaterThan(.08)
  })
  // M08: 头染乳白 / 颚染黄 / 缩头 / 颚外伸成铁丝。
  it('L5 深黄褐硬头壳与黑褐短上颚', () => {
    between(light(larva,'larva-body'),.83,.96)
    between(light(larva,'larva-head'),.27,.55)
    expect(light(larva,'larva-body')-light(larva,'larva-head')).toBeGreaterThan(.35)
    expect(light(larva,'larva-mandible')).toBeLessThan(.18)
    between(size(larva,'larva-head').z,.45,.7)
    expect(meshes(larva,'larva-mandible')).toHaveLength(2)
    for (const m of meshes(larva,'larva-mandible')) between(new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).length(),.11,.3)
    expect(mat(larva,'larva-body').transmission).toBe(0)
  })
})
describe('竹象离蛹', () => {
  // M09: 蛹整体放大/缩小；漏做一侧翅芽。
  it('P1 蛹体约 2.8 cm，乳白、两侧翅芽成形', () => {
    const b = new THREE.Box3()
    for (const n of ['pupa-abdomen','pupa-thorax','pupa-head']) b.union(box(pupa,n))
    between(b.getSize(new THREE.Vector3()).x,2.5,3.1)
    between(light(pupa,'pupa-abdomen'),.82,.96)
    expect(meshes(pupa,'pupa-wing-pad')).toHaveLength(2)
    for (const m of meshes(pupa,'pupa-wing-pad')) between(new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).x,1.1,1.6)
  })
  // R-P2: 喙缩短/延长、偏离中线、其他单件拉长均变红。
  it('P2 长喙沿腹面中线向后，且是最长的单件附肢', () => {
    const m = meshes(pupa,'pupa-rostrum')[0]
    expect(m).toBeDefined(); expect(m.visible).toBe(true)
    const vs = vertices(m,true), b = new THREE.Box3().setFromPoints(vs)
    const body = new THREE.Box3()
    for (const name of ['pupa-abdomen','pupa-thorax','pupa-head']) {
      for (const mesh of meshes(pupa,name)) body.expandByPoint(new THREE.Box3().setFromPoints(vertices(mesh,true)).min).expandByPoint(new THREE.Box3().setFromPoints(vertices(mesh,true)).max)
    }
    between(b.getSize(new THREE.Vector3()).x/body.getSize(new THREE.Vector3()).x,.55,.69)
    between(b.min.x,-.44,-.2)
    expect(b.max.x).toBeGreaterThan(1.2)
    for (const v of vs) expect(Math.abs(v.z)).toBeLessThan(.08)
    const centerline = rings(m)
    for (const r of centerline) expect(Math.abs(r.c.z)).toBeLessThan(.003)
    expect(centerline[0].c.x-centerline.at(-1)!.c.x).toBeGreaterThan(1.5)
    for (const other of appendages()) {
      if (other===m) continue
      expect(new THREE.Box3().setFromPoints(vertices(other,true)).getSize(new THREE.Vector3()).x).toBeLessThan(b.getSize(new THREE.Vector3()).x*.9)
    }
  })
  // R-P3: 一侧触角删除、缩成丝、移过中线或远离喙。
  it('P3 触角分别沿喙两侧紧凑贴伏', () => {
    const a = meshes(pupa,'pupa-antenna-pad'); expect(a).toHaveLength(2)
    for (const m of a) {
      expect(m.visible).toBe(true)
      const vs = vertices(m,true), b = new THREE.Box3().setFromPoints(vs)
      between(b.getSize(new THREE.Vector3()).x,.8,1.15)
      between(b.getSize(new THREE.Vector3()).z,.04,.18)
      // 首轮缩细触角漏网：整体 Z 跨度来自弯曲路径，须另量截面厚宽。
      between(Math.max(...rings(m).map(r=>r.r)),.015,.035)
      for (const v of vs) between(Math.abs(v.z),.075,.27)
    }
  })
  // R-P4: 少一对足、相邻足纵向叠在一起、腿节与胫节不再折成窄V。
  it('P4 三对窄V折叠足分区排列，不相交或横穿中线', () => {
    for (const name of ['pupa-femur','pupa-tibia','pupa-tarsus']) expect(meshes(pupa,name)).toHaveLength(6)
    for (const side of [-1,1]) {
      const boxes: THREE.Box3[] = []
      for (let pair=0;pair<3;pair++) {
        const parts = appendages().filter(m=>m.name.startsWith('pupa-')&&['pupa-femur','pupa-tibia','pupa-tarsus'].includes(m.name)&&m.userData.pair===pair&&vertices(m,true)[0].z*side>0)
        expect(parts).toHaveLength(3)
        const b = new THREE.Box3()
        for (const m of parts) {
          const vs = vertices(m,true)
          for (const v of vs) { expect(v.z*side).toBeGreaterThan(.13); b.expandByPoint(v) }
          const rs = rings(m), from=rs[0].c, to=rs.at(-1)!.c
          if (m.name==='pupa-femur') between(to.x-from.x,.12,.2)
          if (m.name==='pupa-tibia') between(from.x-to.x,.2,.3)
          // Width normal to each centerline must stay broad enough to read as a leg sheath.
          between(Math.max(...rs.map(r=>r.r)),m.name==='pupa-tarsus'?.012:.025,.065)
        }
        boxes.push(b)
      }
      for (let i=1;i<3;i++) expect(boxes[i-1].min.x-boxes[i].max.x).toBeGreaterThan(.025)
    }
  })
  // R-P5: 沿任意轴抬离主体、把中间一段拱起，最大表面距离都超限。
  it('P5 所有附肢每个顶点距实际主体三角面不超过 0.06 cm', () => {
    const distance = bodySurfaceDistance()
    for (const m of appendages()) {
      let max=0
      for (const v of vertices(m,true)) max=Math.max(max,distance(v))
      expect(max,m.name).toBeLessThan(.06)
    }
  })
  // R-P6: 把整侧移到同侧、只移动某一网格或某个顶点均拦住；只比重心不够。
  it('P6 成对附肢逐顶点镜像且不越过中线', () => {
    for (const name of ['pupa-antenna-pad','pupa-wing-pad','pupa-femur','pupa-tibia','pupa-tarsus']) {
      const a=meshes(pupa,name)
      const key=(v:THREE.Vector3)=>[v.x,v.y,Math.abs(v.z)].map(x=>Math.round(x*1e5)).join(',')
      const left=a.filter(m=>vertices(m,true)[0].z<0),right=a.filter(m=>vertices(m,true)[0].z>0)
      expect(left.length).toBe(a.length/2); expect(right.length).toBe(a.length/2)
      const leftKeys=left.flatMap(m=>vertices(m,true)).map(key).sort()
      expect(right.flatMap(m=>vertices(m,true)).map(key).sort()).toEqual(leftKeys)
      for (const m of a) {
        const vs=vertices(m,true),sign=Math.sign(vs[0].z)
        for (const v of vs) expect(v.z*sign).toBeGreaterThan(.06)
      }
    }
  })
  // R-P7: 仰卧角改0°/90°或把腹面附肢翻到背面，会变红。
  it('P7 钉住仰卧展示，喙触角足均在解剖腹面', () => {
    const pose=pupa.group.getObjectByName('pupa-pose')!
    const origin=pose.localToWorld(new THREE.Vector3())
    const dorsal=pose.localToWorld(new THREE.Vector3(0,1,0)).sub(origin)
    expect(dorsal.y).toBeLessThan(-.98)
    expect(pose.localToWorld(new THREE.Vector3(1,0,0)).sub(origin).x).toBeGreaterThan(.99)
    for (const m of appendages().filter(m=>m.name!=='pupa-wing-pad')) {
      for (const v of vertices(m,true)) expect(v.y).toBeLessThan(-.05)
    }
  })
  // R-P8: 翅芽移到腹中线、移进足的内侧会变红。
  it('P8 翅芽位于中后足外侧，从体侧延伸向背侧', () => {
    for (const m of meshes(pupa,'pupa-wing-pad')) {
      const vs=vertices(m,true),c=new THREE.Box3().setFromPoints(vs).getCenter(new THREE.Vector3())
      expect(Math.abs(c.z)).toBeGreaterThan(.35)
      expect(c.y).toBeGreaterThan(.02)
      expect(vs.some(v=>v.y<.03)).toBe(true)
    }
  })
  // R-P9: 隐藏喙或在腹面遮挡会变红；仅遮中段时总可见率仍合格，但连续长度独立变红。
  it('P9 home机位能看见中线喙的连续长段', () => {
    const m=meshes(pupa,'pupa-rostrum')[0]
    expect(m.visible).toBe(true)
    const ray=new THREE.Raycaster(),view=new THREE.Vector3(.86,.44,1.25).normalize()
    const pos=m.geometry.getAttribute('position'),uv=m.geometry.getAttribute('uv')
    const candidates:THREE.Vector3[]=[]
    // u=0 is the outward crest; sample every longitudinal ring, not hidden bottom vertices.
    for (let i=0;i<pos.count;i++) if(Math.abs(uv.getX(i))<1e-6) candidates.push(new THREE.Vector3().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld))
    let visible=0,streak=0,longest=0
    for(const v of candidates) {
      ray.set(v.clone().addScaledVector(view,5),view.clone().negate())
      if(ray.intersectObjects(meshes(pupa),false)[0]?.object===m) {visible++;streak++;longest=Math.max(longest,streak)}
      else streak=0
    }
    expect(candidates.length).toBeGreaterThan(20)
    expect(visible/candidates.length).toBeGreaterThan(.65)
    expect(longest/candidates.length).toBeGreaterThan(.55)
  })
  // R-P10: 足芽/触角只贴近主体但埋在皮下，最近距离虽小，外侧射线仍会拦住。
  it('P10 每件附肢的隆起均露在体表外侧', () => {
    const ray=new THREE.Raycaster(),all=meshes(pupa),pose=pupa.group.getObjectByName('pupa-pose')!
    for(const m of appendages()) {
      expect(m.visible).toBe(true)
      const pos=m.geometry.getAttribute('position'),uv=m.geometry.getAttribute('uv')
      let visible=0,total=0
      for(let i=0;i<pos.count;i++) {
        if(Math.abs(uv.getX(i))>1e-6 || Math.round(uv.getY(i)*40)%4!==0) continue
        const p=new THREE.Vector3().fromBufferAttribute(pos,i)
        const normal=new THREE.Vector3(0,p.y,p.z).normalize().transformDirection(pose.matrixWorld)
        p.applyMatrix4(m.matrixWorld)
        ray.set(p.clone().addScaledVector(normal,3),normal.negate())
        if(ray.intersectObjects(all,false)[0]?.object===m) visible++
        total++
      }
      expect(visible/total,m.name).toBeGreaterThan(.45)
    }
  })
})
// M13–M15: 各阶段增加超预算网格、NaN 顶点、清空/偏移锚点。
// 第一轮只看第一个头壳锚点，移动幼虫体壁漏网；改为逐锚点核对相应结构。
for (const [label,model,target] of [['egg',egg,'egg'],['larva',larva,'larva-head'],['pupa',pupa,'pupa-rostrum']] as const) {
  it(`Q ${label} 有限几何、预算、居中与阶段专属锚点`, () => {
    let triangles = 0
    for (const m of meshes(model)) {
      const p = m.geometry.getAttribute('position')
      expect(Array.from(p.array).every(Number.isFinite)).toBe(true)
      triangles += (m.geometry.index?.count ?? p.count)/3
    }
    between(triangles,300,45000)
    expect(new THREE.Box3().setFromObject(model.group).getCenter(new THREE.Vector3()).length()).toBeLessThan(.001)
    expect(model.radius).toBeGreaterThan(.1)
    expect(Object.keys(model.anchors).length).toBeGreaterThan(0)
    expect(Object.keys(model.anchors).some(k=>adultKeys.includes(k))).toBe(false)
    const targets: Record<string,string> = { eggShell:target,larvalHead:target,softAbdomen:'larva-body',pupalRostrum:target,foldedLeg:'pupa-femur',wingPad:'pupa-wing-pad' }
    for (const [key,anchor] of Object.entries(model.anchors)) {
      expect(targets[key]).toBeDefined()
      expect(box(model,targets[key]).expandByScalar(.04).containsPoint(anchor)).toBe(true)
    }
  })
}
// M16: 将蛹文件暂改为非阶段后缀，同时保持直接导入可用，确认 glob 注册断言变红。
it('R 三阶段自动注册', () => { expect(builtStagesOf('weevil')).toEqual(['egg','larva','pupa']) })
