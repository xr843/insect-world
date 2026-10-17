/**
 * 梭毒隐翅虫 Paederus fuscipes。1 单位 = 1 cm，尺寸不随取景放大。
 * 参考：Ritanti & Haryadi 2021，Table 5、Fig. 3（本种实测）：
 * https://jurnalhpt.ub.ac.id/index.php/jhpt/article/download/300/319
 * 作者存档全文（出版站偶有 403）：
 * https://www.researchgate.net/publication/354576889
 * 卵 0.6×0.6 mm，二龄幼虫 4.0×0.7 mm，蛹 4.2×1.0 mm。
 * 卵黄色；二龄头黄带褐，胸与腹暗褐和黄；蛹取初期淡黄。
 * https://doi.org/10.1603/me13145 本种成熟具壳卵泡球形，直径 0.64±0.01 mm。
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC5634048/
 * 同属幼虫：蛃型、三对分节胸足、成对上颚与触角、簇生单眼、简单刚毛。
 * 尾突、足节、附肢鞘的局部尺寸为按图与整体比例推算，不声称本种实测。
 * M 注释对应 audit-out/rove-beetle/mutations.json 中逐项运行的退化实现。
 */
import * as T from 'three'
import { describe, expect, it } from 'vitest'
import { buildRoveBeetleEgg } from '../stages/rove-beetle-egg'
import { buildRoveBeetleLarva } from '../stages/rove-beetle-larva'
import { buildRoveBeetlePupa } from '../stages/rove-beetle-pupa'
import { buildRoveBeetle } from '../rove-beetle'
import { builtStagesOf, loadStageModel } from '../../stages'
import type { InsectModel } from '../kit'

const models = { egg: buildRoveBeetleEgg(), larva: buildRoveBeetleLarva(), pupa: buildRoveBeetlePupa() }
function meshes(m: InsectModel, name?: string): T.Mesh[] {
  m.group.updateMatrixWorld(true)
  const out: T.Mesh[] = []
  m.group.traverse(o => { if (o instanceof T.Mesh && (!name || o.name === name)) out.push(o) })
  return out
}
function box(m: InsectModel, name: string) {
  const b = new T.Box3()
  for (const o of meshes(m, name)) b.union(new T.Box3().setFromObject(o))
  return b
}
function size(m: InsectModel, name: string) { return box(m, name).getSize(new T.Vector3()) }
function hsl(m: InsectModel, name: string) {
  return (meshes(m, name)[0].material as T.MeshPhysicalMaterial).color.getHSL({h:0,s:0,l:0}, T.SRGBColorSpace)
}
function points(o: T.Mesh) {
  const p = o.geometry.getAttribute('position')
  return Array.from({length:p.count}, (_, i) => new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld))
}
/** 从真实顶点朝 home 发射线，要求第一交点回到该顶点附近；排除藏在身体里的同名件。 */
function visibleSamples(m: InsectModel, o: T.Mesh) {
  const dir = new T.Vector3(.86,.44,1.25).normalize(), ray = new T.Raycaster()
  const ps = points(o), scene = meshes(m)
  let count = 0
  for(let i=0;i<ps.length;i+=Math.max(1,Math.floor(ps.length/90))) {
    ray.set(ps[i].clone().addScaledVector(dir,2),dir.clone().negate())
    const hit=ray.intersectObjects(scene,false)[0]
    if(hit && hit.point.distanceTo(ps[i])<.001) count++
  }
  return count
}
function projectedGap(a:T.Mesh,b:T.Mesh) {
  const view=new T.Vector3(.86,.44,1.25).normalize()
  const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),view).normalize()
  const up=new T.Vector3().crossVectors(view,right).normalize()
  const pa=points(a).map(p=>new T.Vector2(p.dot(right),p.dot(up)))
  const pb=points(b).map(p=>new T.Vector2(p.dot(right),p.dot(up)))
  return Math.min(...pa.map(p=>Math.min(...pb.map(q=>q.distanceTo(p)))))
}
function between(v:number,lo:number,hi:number) { expect(v).toBeGreaterThan(lo); expect(v).toBeLessThan(hi) }

describe('梭毒隐翅虫生活史',()=>{
  it('注册三阶段',async()=>{ // M01：卵文件增加第二个 build 导出，加载器应拒绝。
    expect(builtStagesOf('rove-beetle')).toEqual(['egg','larva','pupa'])
    for(const stage of ['egg','larva','pupa'] as const)expect((await loadStageModel('rove-beetle',stage)).radius).toBeGreaterThan(0)
  })
  for(const [stage,m] of Object.entries(models)) {
    it(`${stage} 有限几何与面数预算`,()=>{ // M02–04：各阶段球面细分膨胀。
      let triangles=0
      for(const o of meshes(m)) {
        expect(points(o).every(p=>Number.isFinite(p.x+p.y+p.z))).toBe(true)
        triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3
      }
      between(triangles,100,24000); between(m.radius,.02,.45)
    })
    it(`${stage} 锚点落在实物表面且不冒用成虫卡片`,()=>{ // M05–07：各阶段首锚点外移 1 cm。
      expect(Object.keys(m.anchors).length).toBeGreaterThan(0)
      for(const [name,p] of Object.entries(m.anchors)) {
        expect(['elytra','abdomen','mandible','antenna','eye','leg']).not.toContain(name)
        const distance=Math.min(...meshes(m).flatMap(points).map(q=>q.distanceTo(p)))
        expect(distance).toBeLessThan(.008)
      }
    })
  }
  it('卵是 0.6 mm 单粒球形黄卵且比幼虫小',()=>{ // M08：卵半径翻倍；M09：纵轴拉长；M10：壳改白。
    const m=models.egg,s=size(m,'egg-shell')
    expect(meshes(m,'egg-shell')).toHaveLength(1)
    between(s.x,.055,.065); between(s.y/s.x,.94,1.06); between(s.z/s.x,.94,1.06)
    between(hsl(m,'egg-shell').h,.10,.17); between(hsl(m,'egg-shell').s,.25,.65)
    expect(s.x).toBeLessThan(size(models.larva,'larval-trunk').x/4)
  })
  it('浅色表皮绕向朝外',()=>{ // M11：卵翻面；M12：取消蛹 loft 侧面绕向修正。
    for(const [m,name] of [[models.egg,'egg-shell'],[models.pupa,'pupal-trunk']] as const) {
      const mesh=meshes(m,name)[0],g=mesh.geometry,idx=g.index!,p=g.getAttribute('position'),n=g.getAttribute('normal')
      let bad=0,valid=0
      for(let i=0;i<idx.count;i+=3){
        const a=new T.Vector3().fromBufferAttribute(p,idx.getX(i)),b=new T.Vector3().fromBufferAttribute(p,idx.getX(i+1)),c=new T.Vector3().fromBufferAttribute(p,idx.getX(i+2))
        const face=b.sub(a).cross(c.sub(a))
        if(face.lengthSq()<1e-18)continue
        valid++; if(face.dot(new T.Vector3().fromBufferAttribute(n,idx.getX(i)))<0)bad++
      }
      expect(bad/valid).toBeLessThan(.01)
    }
  })
  it('幼虫体长宽比与饱满后腹，不是尖锥或蛴螬',()=>{ // M13：躯干缩短；M14：后腹压细。
    const m=models.larva,s=size(m,'larval-trunk'),head=box(m,'larval-head')
    const body=box(m,'larval-trunk')
    between(head.max.x-body.min.x,.385,.415); between(s.z,.064,.076)
    between(s.x/s.z,4.1,5.2)
    const ps=points(meshes(m,'larval-trunk')[0]),cut=body.min.x+.075
    const width=(x:number)=>new T.Box3().setFromPoints(ps.filter(p=>Math.abs(p.x-x)<.004)).getSize(new T.Vector3()).z
    between(width(cut)/s.z,.65,.95)
  })
  it('幼虫黄褐头与较暗背板，克制的黄褐腹节',()=>{ // M15：头改黑；M16：背板改成头色。
    between(hsl(models.larva,'larval-head').l,.35,.65)
    expect(hsl(models.larva,'larval-head').l-hsl(models.larva,'thoracic-shield').l).toBeGreaterThan(.12)
    between(hsl(models.larva,'larval-trunk').s,.25,.60)
  })
  it('三对胸足分节且可见，腹部无伪足',()=>{ // M17：少一对足；M18：足退缩藏入体内。
    const m=models.larva,legs=meshes(m,'larval-leg')
    expect(legs).toHaveLength(6)
    for(const leg of legs){
      const s=new T.Box3().setFromObject(leg).getSize(new T.Vector3())
      between(s.z,.05,.10);expect(visibleSamples(m,leg)).toBeGreaterThan(1)
      expect(new T.Box3().setFromObject(leg).getCenter(new T.Vector3()).x).toBeGreaterThan(box(m,'larval-trunk').max.x-.15)
    }
  })
  it('成对尾突向后伸，home 下保持分离',()=>{ // M19：尾突向前；M20：尾突合在中线。
    const m=models.larva,tails=meshes(m,'urogomphus')
    expect(tails).toHaveLength(2)
    expect(projectedGap(tails[0],tails[1])).toBeGreaterThan(.008)
    for(const t of tails){ const b=new T.Box3().setFromObject(t);expect(b.min.x).toBeLessThan(box(m,'larval-trunk').min.x-.035);between(b.getSize(new T.Vector3()).x,.04,.08);expect(visibleSamples(m,t)).toBeGreaterThan(2) }
  })
  it('幼虫短颚触角有体积、位于头前',()=>{ // M21：删除颚；M22：触角拉长成铁丝。
    const m=models.larva
    for(const name of ['larval-jaw','larval-antenna']){
      expect(meshes(m,name)).toHaveLength(2)
      between(size(m,name).x,.015,.065)
      expect(box(m,name).max.x).toBeGreaterThan(box(m,'larval-head').max.x)
      for(const o of meshes(m,name))expect(visibleSamples(m,o)).toBeGreaterThan(1)
    }
  })
  it('蛹真实 4.2×1.0 mm，比成虫短，腹部多节末端圆收',()=>{ // M23：躯干放大；M24：尾端截面不收圆。
    const m=models.pupa,b=box(m,'pupal-trunk'),s=b.getSize(new T.Vector3())
    between(box(m,'pupal-head').max.x-b.min.x,.41,.43);between(s.z,.095,.105)
    expect(s.x).toBeLessThan(new T.Box3().setFromObject(buildRoveBeetle().group).getSize(new T.Vector3()).x)
    const ps=points(meshes(m,'pupal-trunk')[0])
    const tip=ps.filter(p=>p.x<b.min.x+.002)
    expect(new T.Box3().setFromPoints(tip).getSize(new T.Vector3()).z).toBeLessThan(.020)
    const widths=Array.from({length:110},(_,i)=>{
      const x=b.min.x+.02+i*.002
      return new T.Box3().setFromPoints(ps.filter(p=>Math.abs(p.x-x)<.001)).getSize(new T.Vector3()).z
    }).filter(Number.isFinite)
    expect(widths.filter((v,i)=>i>0&&i<widths.length-1&&v<widths[i-1]&&v<widths[i+1]).length).toBeGreaterThan(4)
  })
  it('蛹三对粗足鞘贴腹、镜像、不穿中线、home 可见',()=>{ // M25：足鞘翻到背面；M26：缩成火柴；M27：左右跨中线。
    const m=models.pupa,legs=meshes(m,'pupal-leg'),body=box(m,'pupal-trunk')
    expect(legs).toHaveLength(6)
    for(const leg of legs){
      const b=new T.Box3().setFromObject(leg),s=b.getSize(new T.Vector3())
      between(s.x,.055,.105);between(s.y,.011,.038)
      expect(b.min.y).toBeGreaterThan(body.getCenter(new T.Vector3()).y+.010)
      expect(b.max.y).toBeLessThan(body.max.y+.025)
      expect(b.min.z*b.max.z).toBeGreaterThan(0)
      expect(visibleSamples(m,leg)).toBeGreaterThan(2)
    }
    for(let i=0;i<3;i++){
      const a=new T.Box3().setFromObject(legs[i]),b=new T.Box3().setFromObject(legs[i+3])
      expect(a.getSize(new T.Vector3()).distanceTo(b.getSize(new T.Vector3()))).toBeLessThan(.00001)
      const delta=a.getCenter(new T.Vector3()).sub(b.getCenter(new T.Vector3()))
      const view=new T.Vector3(.86,.44,1.25).normalize()
      expect(delta.addScaledVector(view,-delta.dot(view)).length()).toBeGreaterThan(.012)
    }
  })
  it('蛹触角与短翅芽左右贴伏，配色协调',()=>{ // M28：触角竖起；M29：翅芽覆盖长腹；M30：足鞘刷白。
    const m=models.pupa
    for(const name of ['pupal-antenna','pupal-wing-pad']){
      expect(meshes(m,name)).toHaveLength(2)
      for(const o of meshes(m,name))expect(visibleSamples(m,o)).toBeGreaterThan(1)
    }
    between(size(m,'pupal-antenna').y,.005,.035)
    between(size(m,'pupal-wing-pad').x,.07,.12)
    expect(Math.abs(hsl(m,'pupal-leg').l-hsl(m,'pupal-trunk').l)).toBeLessThan(.13)
    between(hsl(m,'pupal-trunk').l,.65,.85)
  })
})
