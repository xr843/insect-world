/**
 * 日本吉丁生活史。参考（同科形态，不能冒充本种实测）：
 * https://ipm.ucanr.edu/PMG/GARDEN/FRUIT/PESTS/pacfltheadbor.html
 * https://ask.ifas.ufl.edu/topics/buprestidae
 * https://plantsciences.tennessee.edu/wp-content/uploads/sites/25/2021/10/SP503-I.pdf
 * 卵径 1 mm、成熟幼虫 40–50 mm 为推算；本种 2–3 年蛀木期依数据文案。
 * 每条测试的 M 注释记录实际运行的退化版本，结果另存 audit-out/jewel-beetle。
 */
import * as T from 'three'
import { describe, expect, it } from 'vitest'
import { buildJewelBeetleEgg } from '../stages/jewel-beetle-egg'
import { buildJewelBeetleLarva } from '../stages/jewel-beetle-larva'
import { buildJewelBeetlePupa } from '../stages/jewel-beetle-pupa'
import { buildJewelBeetle } from '../jewel-beetle'
import type { InsectModel } from '../kit'
import { builtStagesOf } from '../../stages'

const egg = buildJewelBeetleEgg(), larva = buildJewelBeetleLarva(), pupa = buildJewelBeetlePupa()
const home = new T.Vector3(.86, .44, 1.25).normalize()
function meshes(m: InsectModel, name?: string): T.Mesh[] {
  m.group.updateMatrixWorld(true)
  const out: T.Mesh[] = []
  m.group.traverse(o => { if ((o as T.Mesh).isMesh && (!name || o.name === name)) out.push(o as T.Mesh) })
  return out
}
function verts(ms: T.Mesh[]): T.Vector3[] {
  return ms.flatMap(m => {
    const p = m.geometry.getAttribute('position')
    return Array.from({ length: p.count }, (_, i) => new T.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld))
  })
}
function ringSize(m:T.Mesh): number {
  const p=m.geometry.getAttribute('position'), x=p.getX(0)
  let i=1;while(i<p.count && p.getX(i)===x)i++
  return i
}
const box = (ms: T.Mesh[]) => new T.Box3().setFromPoints(verts(ms))
const size = (ms: T.Mesh[]) => box(ms).getSize(new T.Vector3())
function light(m: T.Mesh): number {
  return (m.material as T.MeshPhysicalMaterial).color.getHSL({ h: 0, s: 0, l: 0 }, T.SRGBColorSpace).l
}
/** 朝 home 发射射线，命中第一层才算可见；名称/顶点存在不能证明附肢露在外面。 */
function visible(m: InsectModel, part: T.Mesh, view = home): number {
  const all = meshes(m), points = verts([part]), ray = new T.Raycaster()
  for (const mesh of all) if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
  let yes = 0, n = 0
  for (let i = 0; i < points.length; i += 16) {
    const v = points[i], origin = v.clone().addScaledVector(view, m.radius * 4)
    ray.set(origin, view.clone().negate())
    const hit = ray.intersectObjects(all, false)[0]
    if (hit?.object === part || (hit && hit.point.distanceTo(v) < .0001)) yes++
    n++
  }
  return yes / n
}

/** 均匀采样成像平面：分母是无遮挡卵的投影面积，分子是场景里实际露出的白卵面积。
 * 顶点采样会偏向球的极点，不能替代投影面积。
 */
function projectedFraction(m:InsectModel, part:T.Mesh, view:T.Vector3):number {
  const all=meshes(m)
  for(const mesh of all)if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox()
  const right=new T.Vector3().crossVectors(new T.Vector3(0,0,1),view).normalize()
  const up=new T.Vector3().crossVectors(view,right).normalize()
  const points=verts([part]), us=points.map(p=>p.dot(right)), vs=points.map(p=>p.dot(up))
  const minU=Math.min(...us),maxU=Math.max(...us),minV=Math.min(...vs),maxV=Math.max(...vs)
  const ray=new T.Raycaster(),direction=view.clone().negate()
  let total=0,exposed=0
  for(let i=0;i<28;i++)for(let j=0;j<28;j++) {
    const origin=right.clone().multiplyScalar(minU+(maxU-minU)*(i+.5)/28).addScaledVector(up,minV+(maxV-minV)*(j+.5)/28).addScaledVector(view,m.radius*4)
    ray.set(origin,direction)
    if(!ray.intersectObject(part,false).length)continue
    total++
    if(ray.intersectObjects(all,false)[0]?.object===part)exposed++
  }
  return exposed/total
}
function meanDiameter(mesh:T.Mesh, ring:number, count:number):number {
  const p=mesh.geometry.getAttribute('position'), diameters:number[]=[]
  for(let i=0;i<count;i++) {
    const center=new T.Vector3(),points:T.Vector3[]=[]
    for(let j=0;j<ring-1;j++) {
      const v=new T.Vector3().fromBufferAttribute(p,i*ring+j);points.push(v);center.add(v)
    }
    center.divideScalar(points.length)
    diameters.push(2*points.reduce((sum,v)=>sum+v.distanceTo(center),0)/points.length)
  }
  return diameters.reduce((a,b)=>a+b,0)/diameters.length
}

describe('日本吉丁生活史', () => {
  // M01：整体放大卵 10 倍；M02/M03：幼虫/蛹整体缩至一半。
  it.each([
    ['egg', egg, 'egg-shell', .09, .11],
    ['larva', larva, 'larva-body', 4.0, 5.0],
    ['pupa', pupa, 'pupa-body', 3.4, 4.2],
  ] as const)('%s 真实长度', (_, m, name, lo, hi) => {
    expect(size(meshes(m, name)).x).toBeGreaterThan(lo)
    expect(size(meshes(m, name)).x).toBeLessThan(hi)
  })
  // M04：卵球形化，厚度从 .025 改为 .1。
  it('卵是扁圆白盘，非球或长米粒', () => {
    const s = size(meshes(egg, 'egg-shell'))
    expect(s.x / s.z).toBeGreaterThan(.9); expect(s.x / s.z).toBeLessThan(1.15)
    expect(s.y / s.x).toBeGreaterThan(.15); expect(s.y / s.x).toBeLessThan(.35)
    expect(light(meshes(egg, 'egg-shell')[0])).toBeGreaterThan(.85)
  })
  // R01：恢复多根椭球木条；R02：填平裂缝；R03：卵浮在板上；R24：磨平外皮；R25：断面与外皮同色。
  it('卵嵌在一块有粗糙外皮、浅色断面的不规则树皮碎片中', () => {
    const bark = meshes(egg, 'bark-fragment')
    expect(bark).toHaveLength(1)
    expect(meshes(egg, 'bark-ridge')).toHaveLength(0)
    const s = size(bark)
    expect(s.y).toBeGreaterThan(.018); expect(s.y).toBeLessThan(.055)
    expect(s.x).toBeLessThan(.34)
    const materials = bark[0].material as T.MeshPhysicalMaterial[]
    expect(materials).toHaveLength(2)
    const hsl = (m: T.MeshPhysicalMaterial) => m.color.getHSL({h:0,s:0,l:0}, T.SRGBColorSpace).l
    expect(hsl(materials[1]) - hsl(materials[0])).toBeGreaterThan(.1)
    // 不规则轮廓与起伏来自实体表面，不能只换一张深色材质。
    const p = bark[0].geometry.getAttribute('position')
    const upper = Array.from({length: 65}, (_, i) => p.getZ(i * 49 + 48))
    expect(Math.max(...upper) - Math.min(...upper)).toBeGreaterThan(.01)
    const first = (z: number) => {
      const ray = new T.Raycaster(egg.group.localToWorld(new T.Vector3(0,.15,z)), new T.Vector3(0,-1,0))
      return ray.intersectObjects(meshes(egg),false)[0]?.object.name
    }
    expect(first(0), '卵中央被树皮完全盖住').toBe('egg-shell')
    expect(first(.058), '裂沟右侧缺少树皮壁').toBe('bark-fragment')
    expect(first(-.058), '裂沟左侧缺少树皮壁').toBe('bark-fragment')
    expect(visible(egg, meshes(egg, 'egg-shell')[0])).toBeGreaterThan(.12)
  })
  // S01：降低卵位；S02：卵悬空；S14：窄缝；S18：悬起的树皮翻边只遮顶视。
  it('白卵在home至少露出六成投影，上表面至少一半露出且仍落在沟底',()=> {
    const shell=meshes(egg,'egg-shell')[0]
    expect(projectedFraction(egg,shell,home),'home白卵投影被挡住').toBeGreaterThan(.60)
    expect(projectedFraction(egg,shell,new T.Vector3(0,1,0)),'卵上表面露出不足一半').toBeGreaterThan(.5)
    const ray=new T.Raycaster(egg.group.localToWorld(new T.Vector3(0,.15,0)),new T.Vector3(0,-1,0))
    const floor=ray.intersectObjects(meshes(egg,'bark-fragment'),false)[0].point.y
    const p=meshes(egg,'bark-fragment')[0].geometry.getAttribute('position')
    let left=24,right=24
    while(left>0 && p.getY(32*49+left-1)<-.003)left--
    while(right<48 && p.getY(32*49+right+1)<-.003)right++
    const opening=p.getZ(32*49+right)-p.getZ(32*49+left)
    expect(opening,'卵所在裂沟太窄').toBeGreaterThan(.08);expect(opening).toBeLessThan(.13)
    const gap=box([shell]).min.y-floor
    expect(gap).toBeGreaterThan(-.004);expect(gap).toBeLessThan(.003)
  })
  // S03：纵脊改回各向同性圆鼓包；S04：磨平脊沟。
  it('树皮脊沟沿X延伸，横向起伏显著强于纵向',()=> {
    const p=meshes(egg,'bark-fragment')[0].geometry.getAttribute('position')
    let along=0,across=0,n=0
    for(let i=4;i<60;i++)for(let j=3;j<45;j++) {
      if(j>13&&j<35)continue
      along+=Math.abs(p.getY((i+1)*49+j)-p.getY(i*49+j))
      across+=Math.abs(p.getY(i*49+j+1)-p.getY(i*49+j));n++
    }
    expect(across/n).toBeGreaterThan(.001)
    expect(across/along,'圆鼓包没有纵向延伸性').toBeGreaterThan(3)
  })
  // S05：直墙；S06：等厚；S07：断面均匀；S19：壁面全浅色；S21：关闭内皮顶点色。
  it('树皮断面厚薄不均、边缘撕裂倾斜，且有深外层和浅纤维内层',()=> {
    const g=meshes(egg,'bark-fragment')[0].geometry,p=g.getAttribute('position'),c=g.getAttribute('color')
    const thickness:number[]=[],slant:number[]=[]
    for(let i=0;i<65;i++)for(const j of [0,48]) {
      const a=i*49+j,b=a+65*49
      thickness.push(p.getY(a)-p.getY(b))
      slant.push(Math.hypot(p.getX(a)-p.getX(b),p.getZ(a)-p.getZ(b)))
    }
    expect(Math.max(...thickness)-Math.min(...thickness)).toBeGreaterThan(.008)
    expect(slant.reduce((a,b)=>a+b,0)/slant.length).toBeGreaterThan(.006)
    expect(p.count,'断面只有一段光滑直墙').toBeGreaterThan(65*49*2+400)
    const materials=meshes(egg,'bark-fragment')[0].material as T.MeshPhysicalMaterial[]
    expect(materials[1].vertexColors,'内皮纤维明暗未进入渲染').toBe(true)
    const index=g.index!
    for(const material of [0,1]) {
      let count=0
      for(const group of g.groups.filter(group=>group.materialIndex===material))for(let i=group.start;i<group.start+group.count;i+=3) {
        if([0,1,2].some(j=>index.getX(i+j)>=65*49*2))count++
      }
      expect(count,'断面缺少外皮/内皮分层').toBeGreaterThan(100)
    }
    const sideTints=Array.from({length:p.count-65*49*2},(_,i)=>c.getX(i+65*49*2))
    expect(Math.max(...sideTints)-Math.min(...sideTints),'内皮缺少纤维明暗').toBeGreaterThan(.15)
  })
  // R04/R05：腹部改窄/改粗；R06：腹部改成圆筒；R07：前胸占三分之一体长。
  it('幼虫前胸宽为腹部1.6至2.2倍，腹部扁而匀宽，前胸占约五至六分之一', () => {
    const b = box(meshes(larva, 'larva-body')), vs = verts(meshes(larva, 'larva-body'))
    const local = (a: number, z: number) => new T.Box3().setFromPoints(vs.filter(v => v.x > b.min.x + a && v.x < b.min.x + z)).getSize(new T.Vector3())
    const pro = local(3.6, 4.25), mid = local(1.1, 2.9), rear = local(.4, .9)
    expect(pro.z / mid.z).toBeGreaterThanOrEqual(1.6); expect(pro.z / mid.z).toBeLessThanOrEqual(2.2)
    expect(pro.y / pro.z).toBeGreaterThan(.15); expect(pro.y / pro.z).toBeLessThan(.32)
    expect(mid.z / mid.y).toBeGreaterThan(2.2); expect(mid.z / mid.y).toBeLessThan(3.3)
    expect(rear.z / mid.z).toBeGreaterThan(.75); expect(rear.z / mid.z).toBeLessThan(1.05)
    const p = meshes(larva, 'larva-body')[0].geometry.getAttribute('position')
    const ring=ringSize(meshes(larva,'larva-body')[0])
    const rows = Array.from({length:281},(_,i)=>({x:p.getX(i*ring), w:Math.abs(p.getZ(i*ring+(ring-1)/4))}))
    const start = rows.find(r=>r.w>mid.z/2*1.15)!
    const fraction = (b.max.x - (start.x + larva.group.position.x)) / (b.max.x-b.min.x)
    expect(fraction).toBeGreaterThan(.16); expect(fraction).toBeLessThan(.205)
  })
  // R08：删腹面骨化板；R09：骨化板压黑；R10：只画黄斑，去掉凹沟；R11：Y沟删一臂；R23：有沟的板埋在体壁下。
  it('前胸背腹两块温和黄褐骨化板，各有下凹的Y形沟', () => {
    const bodyLight = light(meshes(larva,'larva-body')[0])
    for (const [name, sign] of [['larva-dorsal-plate',1],['larva-ventral-plate',-1]] as const) {
      const parts = meshes(larva,name)
      expect(parts).toHaveLength(1)
      const plate = parts[0], p = plate.geometry.getAttribute('position')
      expect(bodyLight-light(plate)).toBeGreaterThan(.04); expect(bodyLight-light(plate)).toBeLessThan(.2)
      expect(size(parts).x).toBeGreaterThan(.55); expect(size(parts).z).toBeGreaterThan(.65)
      const points=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i))
      expect(points.every(v=>sign*v.y>0)).toBe(true)
      const yAt=(x:number,z:number)=> {
        const v=points.reduce((a,b)=>(a.x-x)**2+(a.z-z)**2<(b.x-x)**2+(b.z-z)**2?a:b)
        return sign*v.y
      }
      // 两条分叉与纵向短干各自下凹；不拿颜色深浅冒充凹沟。
      for (const [x,z] of [[1.82,-.20],[1.82,.20],[1.51,0]]) {
        const depth=(yAt(x,z-.05)+yAt(x,z+.05))/2-yAt(x,z)
        expect(depth, `${name} 沟不成Y或只是贴线`).toBeGreaterThan(.005)
        expect(depth).toBeLessThan(.04)
        const ray=new T.Raycaster(larva.group.localToWorld(new T.Vector3(x,sign*.4,z)),new T.Vector3(0,-sign,0))
        expect(ray.intersectObjects(meshes(larva),false)[0]?.object.name, '有沟的板被体壁盖住').toBe(name)
      }
    }
  })
  // M09：去掉腹节沟；M29：尾端圆面硬切；M30：圆尾改成细针尖。
  // 沿同一背中线测局部谷深，不能用网格数量替代分节。
  it('幼虫细长腹部至少八道可读节沟，尾端圆收', () => {
    const m = meshes(larva, 'larva-body')[0], p = m.geometry.getAttribute('position')
    const rows: number[] = []
    for (let i = 0; i < 281 * ringSize(m); i += ringSize(m)) rows.push(p.getY(i))
    let valleys = 0
    for (let i = 4; i < 190; i++) if (rows[i] < rows[i-1] && rows[i] < rows[i+1] && Math.max(...rows.slice(i-4, i+5)) - rows[i] > .006) valleys++
    expect(valleys).toBeGreaterThanOrEqual(8)
    expect(Math.abs(rows[0])).toBeLessThan(.005)
    expect(rows[1], '尾端要圆收，不能缓慢展宽成针尖').toBeGreaterThan(.02)
  })
  // M10：把头放到胸外；M11：删口器；M12：加胸足。
  it('幼虫无足，小头内缩，只露短褐口器', () => {
    const body = box(meshes(larva, 'larva-body')), head = box(meshes(larva, 'larva-head'))
    const jaws = meshes(larva, 'larva-mouth')
    expect(meshes(larva).filter(m => /leg|foot/.test(m.name))).toHaveLength(0)
    expect(head.max.x - body.max.x).toBeLessThan(.08)
    expect(jaws).toHaveLength(2)
    expect(size(jaws).x).toBeGreaterThan(.04); expect(size(jaws).x).toBeLessThan(.18)
    expect(light(jaws[0])).toBeLessThan(.4)
    expect(visible(larva, jaws[0]) + visible(larva, jaws[1])).toBeGreaterThan(.2)
  })
  // R12：把翅芽退回腹面小椭球；R13：翅芽离体漂浮。
  it('蛹翅芽从背侧绕向体侧，位于中后足外侧', () => {
    const pads=meshes(pupa,'pupa-wing-pad')
    expect(pads).toHaveLength(2)
    for(const pad of pads) {
      const local=verts([pad]).map(v=>pad.parent!.worldToLocal(v))
      const b=new T.Box3().setFromPoints(local), s=b.getSize(new T.Vector3())
      expect(s.x).toBeGreaterThan(1.7); expect(s.x).toBeLessThan(2.3)
      expect(b.max.y).toBeGreaterThan(.12); expect(b.min.y).toBeLessThan(-.07)
      expect(Math.max(...local.map(v=>Math.abs(v.z)))).toBeGreaterThan(.44)
      expect(Math.max(...local.map(v=>Math.abs(v.z)))).toBeLessThan(.55)
    }
  })
  const legGroups=()=> {
    const out:T.Object3D[]=[]
    pupa.group.traverse(o=>{if(o.name==='pupa-leg')out.push(o)})
    return out
  }
  const inBody=(ms:T.Mesh[])=>verts(ms).map(v=>ms[0].parent!.parent!.worldToLocal(v))
  const endpoint=(m:T.Mesh,last:boolean)=> {
    const p=m.geometry.getAttribute('position'), start=last?p.count-11:0, c=new T.Vector3()
    for(let i=0;i<10;i++)c.add(new T.Vector3().fromBufferAttribute(p,start+i))
    return c.divideScalar(10)
  }
  // R14：足缩为贴纸；R15：足放到背面；R16：取消仰卧；R17：胫节伸直；R26：把六足对称埋入体壁。
  it('蛹仰卧腹面朝上，六条成虫尺度的足在腹侧并拢回折',()=> {
    const groups=legGroups(), adult=buildJewelBeetle()
    expect(groups).toHaveLength(6)
    const adults=adult.rig!.legs!.filter(l=>l.side===1).sort((a,b)=>b.base.x-a.base.x)
    const body=meshes(pupa,'pupa-body')[0]
    const ventral=new T.Vector3(0,-1,0).transformDirection(body.parent!.matrixWorld)
    expect(ventral.dot(new T.Vector3(0,1,0)), '仰卧方向丢失').toBeGreaterThan(.98)
    for (const side of [1,-1]) {
      const mine=groups.filter(g=>Math.sign(inBody(g.children as T.Mesh[])[0].z)===side).sort((a,b)=>endpoint(a.children[0] as T.Mesh,false).x-endpoint(b.children[0] as T.Mesh,false).x).reverse()
      expect(mine).toHaveLength(3)
      mine.forEach((g,i)=> {
        const ms=g.children as T.Mesh[], vs=inBody(ms)
        expect(ms).toHaveLength(4)
        expect(Math.max(...vs.map(v=>v.y)), '足必须全部在腹侧半空间').toBeLessThan(-.005)
        expect(Math.min(...vs.map(v=>side*v.z)), '足越过腹中线').toBeGreaterThan(.015)
        const hip=endpoint(ms[0],false), knee=endpoint(ms[0],true), ankle=endpoint(ms[1],true)
        // 成虫真实骨架长度，不复制实现里的腿长常量作为期望。
        const femur=hip.distanceTo(knee), tibia=knee.distanceTo(ankle)
        expect(femur/adults[i].tibia.position.length(), '腿节缩成贴纸').toBeGreaterThan(.95)
        expect(femur/adults[i].tibia.position.length()).toBeLessThan(1.8)
        expect(tibia/adults[i].tarsus.position.length(), '胫节缩成贴纸').toBeGreaterThan(.9)
        expect(tibia/adults[i].tarsus.position.length()).toBeLessThan(1.8)
        const angle=hip.sub(knee).angleTo(ankle.sub(knee))*180/Math.PI
        expect(angle).toBeGreaterThan(3); expect(angle, '足应并拢成窄V').toBeLessThan(30)
        expect(Math.max(...ms.map(m=>visible(pupa,m,new T.Vector3(0,-1,0)))), '背面不该看到足').toBeLessThan(.03)
        expect(Math.max(...ms.slice(0,2).map(m=>visible(pupa,m,new T.Vector3(0,1,0)))), '腹面应看得出独立的长足').toBeGreaterThan(.15)
      })
    }
  })
  // S08/S09：腿节/胫节缩回火柴；S10：删圆膝；S11：取消鼓起；S15/S16：足节/膝过粗；S17：跗节过长；S22：蛹体变宽使足相对显细。
  it('蛹足鞘粗胖，节径相当于成虫1.3至1.6倍，有圆膝和短跗节',()=> {
    const adult=buildJewelBeetle(),adults=adult.rig!.legs!.filter(l=>l.side===1).sort((a,b)=>b.base.x-a.base.x)
    const width=size(meshes(pupa,'pupa-body')).z
    for(const side of [1,-1]) {
      const legs=legGroups().filter(g=>Math.sign(inBody(g.children as T.Mesh[])[0].z)===side).sort((a,b)=>endpoint(b.children[0] as T.Mesh,false).x-endpoint(a.children[0] as T.Mesh,false).x)
      legs.forEach((g,i)=> {
        const ms=g.children as T.Mesh[]
        for(const k of [0,1]) {
          const stage=meanDiameter(ms[k],11,21)
          const joint=k===0?adults[i].femur:adults[i].tibia
          const mesh=joint.children.find(o=>(o as T.Mesh).isMesh && (o as T.Mesh).geometry.type!=='SphereGeometry') as T.Mesh
          const mature=meanDiameter(mesh,13,9)
          expect(stage/mature).toBeGreaterThan(1.3);expect(stage/mature).toBeLessThan(1.6)
          expect(stage/width,'足节相对蛹体仍像火柴').toBeGreaterThan(k===0?.10:.067)
          const p=ms[k].geometry.getAttribute('position')
          const radius=(row:number)=> {
            const c=new T.Vector3(),v:T.Vector3[]=[]
            for(let j=0;j<10;j++){const q=new T.Vector3().fromBufferAttribute(p,row*11+j);v.push(q);c.add(q)}
            c.divideScalar(10);return v.reduce((sum,q)=>sum+q.distanceTo(c),0)/10
          }
          expect(radius(10)/radius(0),'足鞘缺少粗胖的中部').toBeGreaterThan(1.2)
        }
        const knee=ms.filter(m=>m.name==='pupa-knee')
        expect(knee).toHaveLength(1)
        expect(size(knee).x).toBeGreaterThan(.08);expect(size(knee).x).toBeLessThan(.14)
        expect(endpoint(ms[2],true).distanceTo(endpoint(ms[2],false))).toBeLessThan(.17)
      })
    }
  })
  // R27：翅芽遮足；S20：只埋长足而保留圆膝，圆膝不能代替长足的可见性。
  it('默认home机位下每对折足至少有一支可辨',()=> {
    const groups=legGroups()
    const xs=[...new Set(groups.map(g=>endpoint(g.children[0] as T.Mesh,false).x.toFixed(3)))]
    expect(xs).toHaveLength(3)
    for(const x of xs) {
      const pair=groups.filter(g=>endpoint(g.children[0] as T.Mesh,false).x.toFixed(3)===x)
      expect(pair).toHaveLength(2)
      expect(Math.max(...pair.flatMap(g=>(g.children as T.Mesh[]).filter(m=>m.name==='pupa-femur'||m.name==='pupa-tibia').map(m=>visible(pupa,m)))), 'home下一整对足都被遮住').toBeGreaterThan(.08)
    }
  })
  // R18：单侧足偏移；R19：足悬空；R20：触角悬空。
  it('蛹足左右镜像，附肢贴体且互不穿越',()=> {
    const groups=legGroups(), wall=verts(meshes(pupa,'pupa-body'))
    const halves=[1,-1].map(side=>groups.map(g=>inBody(g.children as T.Mesh[])).filter(vs=>Math.sign(vs[0].z)===side).sort((a,b)=>a[0].x-b[0].x))
    for(let i=0;i<3;i++)for(let j=0;j<halves[0][i].length;j+=20) {
      const v=halves[0][i][j].clone();v.z*=-1
      expect(Math.min(...halves[1][i].map(w=>w.distanceTo(v))),'左右足不对称').toBeLessThan(.01)
    }
    for(const name of ['pupa-femur','pupa-tibia','pupa-tarsus','pupa-antenna','pupa-wing-pad','pupa-knee']) for(const part of meshes(pupa,name)) {
      const vs=verts([part])
      for(let i=0;i<vs.length;i+=30)expect(Math.sqrt(Math.min(...wall.map(w=>w.distanceToSquared(vs[i])))), `${name}离体表太远`).toBeLessThan(name==='pupa-wing-pad'?.11:.085)
    }
    // 同侧不同足的管心不能相交；允许它们在X轴投影中重叠。
    for(const side of [1,-1]) {
      const mine=groups.filter(g=>Math.sign(inBody(g.children as T.Mesh[])[0].z)===side)
      for(let i=0;i<3;i++)for(let j=i+1;j<3;j++) {
        const centers=(g:T.Object3D)=> (g.children as T.Mesh[]).filter(m=>m.name!=='pupa-knee').flatMap(m=> {
          const p=m.geometry.getAttribute('position'), out:T.Vector3[]=[]
          for(let k=0;k<p.count;k+=11) {
            const v=new T.Vector3()
            for(let r=0;r<10;r++)v.add(new T.Vector3().fromBufferAttribute(p,k+r))
            out.push(v.divideScalar(10))
          }
          return out
        })
        expect(Math.min(...centers(mine[i]).flatMap(a=>centers(mine[j]).map(b=>a.distanceTo(b)))), '同侧足相互穿越').toBeGreaterThan(.055)
      }
    }
  })
  // R21：触角改向前；R22：触角止于头部，没到前中足之间。
  it('触角从头侧向后贴到前中足之间',()=> {
    const as=meshes(pupa,'pupa-antenna')
    expect(as).toHaveLength(2)
    for(const a of as) {
      const start=endpoint(a,false), end=endpoint(a,true)
      expect(start.x-end.x).toBeGreaterThan(.65);expect(start.x-end.x).toBeLessThan(1.05)
      expect(end.x).toBeGreaterThan(.73);expect(end.x).toBeLessThan(1.1)
      expect(Math.abs(start.z)).toBeGreaterThan(.17)
      expect(Math.abs(end.z)).toBeGreaterThan(.3)
    }
  })
  // M22：乳白改成深色；S12：足鞘恢复深黄；S13：去掉薄层透光。
  it('软体乳白，蛹附肢颜色与主体协调', () => {
    for (const [m, name] of [[larva, 'larva-body'], [pupa, 'pupa-body']] as const) expect(light(meshes(m, name)[0])).toBeGreaterThan(.8)
    const d = light(meshes(pupa, 'pupa-body')[0]) - light(meshes(pupa, 'pupa-femur')[0])
    expect(d).toBeGreaterThan(.005); expect(d).toBeLessThan(.075)
    const mat=meshes(pupa,'pupa-femur')[0].material as T.MeshPhysicalMaterial
    expect(light(meshes(pupa,'pupa-femur')[0])).toBeGreaterThan(.8)
    expect(mat.transmission).toBeGreaterThan(.05);expect(mat.transmission).toBeLessThan(.25)
  })
  // M24：球面翻面；M31：体壁翻面后重算法线，二者一致但都朝内；M34：只翻端盖。
  it('浅色表面三角绕向朝外', () => {
    for (const m of [meshes(egg, 'egg-shell')[0], meshes(larva, 'larva-body')[0], meshes(pupa, 'pupa-body')[0]]) {
      const g = m.geometry, p = g.getAttribute('position'), n = g.getAttribute('normal'), idx = g.index!
      g.computeBoundingBox()
      const minX = g.boundingBox!.min.x, maxX = g.boundingBox!.max.x
      let bad = 0, total = 0, volume = 0
      for (let i = 0; i < idx.count; i += 3) {
        const a = new T.Vector3().fromBufferAttribute(p, idx.getX(i)), b = new T.Vector3().fromBufferAttribute(p, idx.getX(i+1)), c = new T.Vector3().fromBufferAttribute(p, idx.getX(i+2))
        // 闭合曲面的有向体积独立于顶点法线；整体反向必为负。
        volume += a.dot(b.clone().cross(c)) / 6
        const face = b.sub(a).cross(c.sub(a))
        if (face.lengthSq() < 1e-18) continue
        if (m.name !== 'egg-shell' && Math.abs(b.x) < 1e-7 && Math.abs(c.x) < 1e-7) {
          if (Math.abs(a.x - minX) < 1e-7) expect(face.x, '尾端盖朝内').toBeLessThan(0)
          if (Math.abs(a.x - maxX) < 1e-7) expect(face.x, '头端盖朝内').toBeGreaterThan(0)
        }
        if (face.dot(new T.Vector3().fromBufferAttribute(n, idx.getX(i))) < 0) bad++
        total++
      }
      expect(bad / total).toBeLessThan(.02)
      expect(volume, '面与法线一同朝内，浅色凸面会读成凹坑').toBeGreaterThan(0)
    }
  })
  // M25：超密细分超过面数预算；M26：锚点挪出模型；M27：NaN 顶点。
  it('预算、有限坐标、锚点与自动注册契约', () => {
    expect(builtStagesOf('jewel-beetle')).toEqual(['egg', 'larva', 'pupa'])
    for (const m of [egg, larva, pupa]) {
      const ms = meshes(m), b = box(ms).expandByScalar(.015)
      const triangles = ms.reduce((s, mesh) => s + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3, 0)
      expect(triangles).toBeGreaterThan(500); expect(triangles).toBeLessThan(60000)
      expect(verts(ms).every(v => v.toArray().every(Number.isFinite))).toBe(true)
      expect(Object.keys(m.anchors).length).toBeGreaterThan(0)
      for (const a of Object.values(m.anchors)) expect(b.containsPoint(a)).toBe(true)
      expect(m.radius).toBeGreaterThan(0)
    }
  })
})
