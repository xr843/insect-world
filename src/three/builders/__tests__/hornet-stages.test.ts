/**
 * 金环胡蜂（Vespa mandarinia）生活史，1 单位 = 1 cm。
 * 参考（2026-10-17 查询；不把属级概述冒充本种实测）：
 * https://animaldiversity.org/accounts/Vespa_mandarinia/ —— 乳白、柔软、无足幼虫。
 * https://ask.ifas.ufl.edu/publication/IN1281/pdf —— 木纤维纸巢；工蜂房宽约11 mm、深33 mm；封盖化蛹。
 * https://research.entomology.tamu.edu/wp-content/uploads/sites/29/2020/05/Vespa-mandarinia-NPRG-10Feb2020.pdf
 *   USDA 图3-2：幼虫与白色离蛹、头部眼区、折叠附肢。
 * https://www.mdpi.com/2075-4450/16/12/1231 —— 图1本种卵/五龄幼虫/蛹；
 *   属/科级文字：长椭圆白卵、无足白幼虫7–35 mm。模型末龄取31 mm。
 * 卵5.0×1.4 mm、幼虫宽9.2 mm/头宽4.8 mm、工蜂蛹长30 mm/头宽9 mm
 * 均为依据图像比例与11 mm房宽的「推算」，不是本种尺寸实测。
 * 巢房开口朝下；近侧两面纸壁及半封盖人为剖除，保留纸层，不能据剖口判断自然房深。
 * 每个 it 的 M 编号对应 audit-out/hornet/mutations.json 中已实际跑过的实现退化；
 * R编号为巢房目视反馈后的新增退化，记录于audit-out/hornet/review-mutations.json。
 * 同项中上下限/结构/可见性分别用独立退化验证。临时日志不提交。
 */
import * as THREE from 'three'
import { describe, it, expect } from 'vitest'
import { buildHornetEgg } from '../stages/hornet-egg'
import { buildHornetLarva } from '../stages/hornet-larva'
import { buildHornetPupa } from '../stages/hornet-pupa'
import type { InsectModel } from '../kit'

const models = [buildHornetEgg(), buildHornetLarva(), buildHornetPupa()]
const home = new THREE.Vector3(0.86, 0.44, 1.25).normalize()
function meshes(m: InsectModel, name?: string): THREE.Mesh[] {
  m.group.updateMatrixWorld(true)
  const out: THREE.Mesh[] = []
  m.group.traverse(o => { if (o instanceof THREE.Mesh && (!name || o.name === name)) out.push(o) })
  return out
}
function part(m: InsectModel, name: string) { const a = meshes(m, name); expect(a.length).toBeGreaterThan(0); return a[0] }
function points(o: THREE.Mesh, world = false): THREE.Vector3[] {
  const p = o.geometry.getAttribute('position')
  return Array.from({ length: p.count }, (_, i) => {
    const v = new THREE.Vector3().fromBufferAttribute(p, i)
    return world ? v.applyMatrix4(o.matrixWorld) : v.applyMatrix4(o.matrix)
  })
}
function box(o: THREE.Mesh) { return new THREE.Box3().setFromPoints(points(o)) }
function size(o: THREE.Mesh) { return box(o).getSize(new THREE.Vector3()) }
function mat(o: THREE.Mesh) { return o.material as THREE.MeshPhysicalMaterial }
function hsl(o: THREE.Mesh) { return mat(o).color.getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace) }
function surfaceColors(o: THREE.Mesh): THREE.Color[] {
  const material=mat(o), color=o.geometry.getAttribute('color')
  if(material.vertexColors) expect(color).toBeDefined()
  return material.vertexColors && color ? Array.from({length:color.count},(_,k) =>
    material.color.clone().multiply(new THREE.Color(color.getX(k),color.getY(k),color.getZ(k)))) : [material.color]
}
function exposed(m: InsectModel, o: THREE.Mesh): number {
  const visible = (obj: THREE.Object3D) => {
    for (let at: THREE.Object3D | null = obj; at; at = at.parent) if (!at.visible) return false
    return true
  }
  if (!visible(o)) return 0
  const targets = meshes(m).filter(visible)
  const ps = points(o, true)
  const ray = new THREE.Raycaster()
  let seen = 0
  for (let i = 0; i < ps.length; i += 7) {
    ray.set(ps[i].clone().addScaledVector(home, 12), home.clone().negate())
    if (ray.intersectObjects(targets, false)[0]?.object === o) seen++
  }
  return seen / Math.ceil(ps.length / 7)
}
/** 按home成像平面等面积采样：分母为移除道具后的幼体投影，分子为仍未遮住的像素。
 * 不按顶点计数，避免球体极点/密集细分把可见性比值抬高。 */
function projectedVisibility(model: InsectModel, body: THREE.Mesh[]) {
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),home).normalize()
  const up = new THREE.Vector3().crossVectors(home,right).normalize()
  const ps = body.flatMap(o => points(o,true))
  const xs = ps.map(p => p.dot(right)), ys = ps.map(p => p.dot(up))
  const x0=Math.min(...xs), x1=Math.max(...xs), y0=Math.min(...ys), y1=Math.max(...ys)
  const targets=meshes(model).filter(o => {
    for(let at: THREE.Object3D|null=o;at;at=at.parent) if(!at.visible) return false
    return true
  })
  const ray=new THREE.Raycaster()
  let total=0, visible=0
  const n=32
  for(let i=0;i<n;i++) for(let j=0;j<n;j++) {
    const origin=right.clone().multiplyScalar(x0+(x1-x0)*(i+0.5)/n)
      .addScaledVector(up,y0+(y1-y0)*(j+0.5)/n).addScaledVector(home,12)
    ray.set(origin,home.clone().negate())
    if(!ray.intersectObjects(body,false).length) continue
    total++
    const first=ray.intersectObjects(targets,false)[0]?.object
    if(first && body.includes(first as THREE.Mesh)) visible++
  }
  return { fraction: visible/total, area: visible/n**2*(x1-x0)*(y1-y0)/model.radius**2 }
}

/** 三角形中心与法线都转换到物体的父坐标；绕序也必须同向。 */
function faces(mesh: THREE.Mesh) {
  const geo=mesh.geometry, pos=geo.getAttribute('position'), normal=geo.getAttribute('normal')
  const idx=geo.index
  const nm=new THREE.Matrix3().getNormalMatrix(mesh.matrix)
  const out: { center: THREE.Vector3; normal: THREE.Vector3; winding: THREE.Vector3 }[]=[]
  for(let i=0;i<(idx?.count ?? pos.count);i+=3) {
    const ids=[0,1,2].map(k => idx ? idx.getX(i+k) : i+k)
    const vs=ids.map(k => new THREE.Vector3().fromBufferAttribute(pos,k).applyMatrix4(mesh.matrix))
    const winding=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]))
    if(winding.lengthSq()<1e-16) continue
    const n=ids.reduce((a,k) => a.add(new THREE.Vector3().fromBufferAttribute(normal,k).applyMatrix3(nm)),new THREE.Vector3()).normalize()
    out.push({center:vs.reduce((a,p) => a.add(p),new THREE.Vector3()).divideScalar(3),normal:n,winding:winding.normalize()})
  }
  return out
}

const [egg, larva, pupa] = models

describe('hornet stages', () => {
  // M01/M02: 放大/缩小卵；M03: 短轴膨胀成球。
  it('卵是毫米级长椭圆而非白球', () => {
    const s = size(part(egg, 'egg'))
    expect(s.x).toBeGreaterThan(0.42); expect(s.x).toBeLessThan(0.58)
    expect(s.z).toBeGreaterThan(0.1); expect(s.z).toBeLessThan(0.18)
    expect(s.x / s.z).toBeGreaterThan(3)
  })
  // M04: 删卵；M05: 卵移入后壁遮住；防只有名字的空壳。
  it('单房单卵在home可见且不是道具里的白点', () => {
    expect(meshes(egg, 'egg')).toHaveLength(1)
    expect(exposed(egg, part(egg, 'egg'))).toBeGreaterThan(0.25)
    expect(size(part(egg, 'egg')).x / egg.radius).toBeGreaterThan(0.45)
  })
  // M06: 卵离开底部悬空；M07: 卵深陷房底。
  it('卵黏着纸房底部，游离端伸进房内', () => {
    const b = box(part(egg, 'egg')), f = box(part(egg, 'paper-base'))
    expect(b.min.x - f.max.x).toBeGreaterThan(-0.04)
    expect(b.min.x - f.max.x).toBeLessThan(0.02)
  })
  // M08/M09: 幼虫缩成蜜蜂尺度/拉成巨虫；M10: 胖成球。
  it('末龄幼虫约31mm，粗腹而非线性尖锥', () => {
    const s = size(part(larva, 'larva-body'))
    expect(s.x).toBeGreaterThan(2.5); expect(s.x).toBeLessThan(3.2)
    expect(s.z).toBeGreaterThan(0.8); expect(s.z).toBeLessThan(1.05)
    const ps = points(part(larva, 'larva-body'))
    const width = (x: number) => Math.max(...ps.filter(p => Math.abs(p.x - x) < 0.035).map(p => Math.abs(p.z)))
    expect(width(-0.6) / width(0.4)).toBeGreaterThan(0.85)
    expect(width(-1.47)).toBeLessThan(width(-0.6) * 0.6)
  })
  // M11: 删头；M12: 头膨胀如成虫；M13: 头移到尾端。
  it('幼虫小头朝下、头窄于腹、口器贴着头', () => {
    const head = part(larva, 'larva-head'), body = part(larva, 'larva-body')
    expect(size(head).z / size(body).z).toBeGreaterThan(0.4)
    expect(size(head).z / size(body).z).toBeLessThan(0.65)
    expect(box(head).getCenter(new THREE.Vector3()).x).toBeGreaterThan(box(body).max.x - 0.2)
    for (const jaw of meshes(larva, 'larva-jaw')) expect(box(head).distanceToPoint(box(jaw).getCenter(new THREE.Vector3()))).toBeLessThan(0.08)
    expect(meshes(larva, 'larva-jaw')).toHaveLength(2)
  })
  // M14: 插入成虫足；M15: 拉平腹节沟（几何半径的周期起伏）。
  it('幼虫无足且有软体分节', () => {
    expect(larva.rig?.legs ?? []).toHaveLength(0)
    expect(meshes(larva).filter(o => /leg|wing|proleg/.test(o.name))).toHaveLength(0)
    const ps = points(part(larva, 'larva-body'))
    // 首轮M15漏网：弯曲截面不能按世界X分桶，否则采样噪声也被当成节沟。
    const uv = part(larva, 'larva-body').geometry.getAttribute('uv')
    const rings = new Map<number, number>()
    ps.forEach((p,i) => {
      const t=uv.getY(i)
      if(t>0.22 && t<0.7) rings.set(t,Math.max(rings.get(t) ?? 0,Math.abs(p.z)))
    })
    const r = [...rings].sort((a,b) => a[0]-b[0]).map(a => a[1])
    expect(r.filter((v,i) => i > 0 && i < r.length - 1 && v < r[i-1] && v < r[i+1]).length).toBeGreaterThanOrEqual(5)
  })
  // M16: 恢复近侧房壁，遮住幼虫（首轮移到房外未必被遮挡，改用真实闭壁退化）。
  it('幼虫头腹在home均可见', () => {
    expect(exposed(larva, part(larva, 'larva-head'))).toBeGreaterThan(0.2)
    expect(exposed(larva, part(larva, 'larva-body'))).toBeGreaterThan(0.2)
  })
  // M17/M18: 蛹缩成蜂蛹/放大为蜂后；M19: 头做成窄胡萝卜。
  it('工蜂离蛹约30mm、头胸宽大且有细腰', () => {
    const abdomen = part(pupa, 'pupa-abdomen'), head = part(pupa, 'pupa-head')
    const length = box(head).max.x - box(abdomen).min.x
    expect(length).toBeGreaterThan(2.8); expect(length).toBeLessThan(3.3)
    expect(size(head).z).toBeGreaterThan(0.8); expect(size(head).z).toBeLessThan(1.0)
    expect(size(part(pupa, 'pupa-waist')).z).toBeLessThan(size(abdomen).z * 0.5)
  })
  // M20: 删足；M21: 足鞘变细火柴棍；M22: 足抬离腹面。
  it('六足鞘粗胖、贴腹且留在各自半侧', () => {
    const legs = meshes(pupa, 'pupa-leg')
    expect(legs).toHaveLength(6)
    for (const leg of legs) {
      const b = box(leg), s = size(leg)
      const ring = points(leg).slice(0,12)
      const center = ring.reduce((a,p) => a.add(p), new THREE.Vector3()).divideScalar(12)
      const radius = ring.reduce((a,p) => a+p.distanceTo(center),0)/12
      expect(radius).toBeGreaterThan(0.06); expect(radius).toBeLessThan(0.09)
      expect(s.y).toBeGreaterThan(0.12); expect(s.y).toBeLessThan(0.3)
      expect(b.max.y).toBeLessThan(0.59)
      expect(b.min.y).toBeGreaterThan(0.12)
      expect(b.min.z > 0.07 || b.max.z < -0.07).toBe(true)
    }
  })
  // M48: 足鞘整体抬高1.8mm；M49: 还原初版高悬足鞘；直接量足鞘中心到实际腹面，不能只限全局Y高度。
  it('足鞘大部分长度贴着实际腹面，不悬空架桥', () => {
    const body = ['pupa-thorax','pupa-waist','pupa-abdomen'].flatMap(n => meshes(pupa,n))
    const pose = part(pupa,'pupa-thorax').parent!
    const ventral = new THREE.Vector3(0,1,0).transformDirection(pose.matrixWorld)
    const ray = new THREE.Raycaster()
    for(const leg of meshes(pupa,'pupa-leg')) {
      const ps=points(leg,true)
      let close=0, count=0
      for(let k=0;k<ps.length;k+=13) {
        const center=ps.slice(k,k+12).reduce((a,p)=>a.add(p),new THREE.Vector3()).divideScalar(12)
        ray.set(center.clone().addScaledVector(ventral,2),ventral.clone().negate())
        const hit=ray.intersectObjects(body,false)[0]
        if(hit && hit.distance-2 < 0.13 && hit.distance-2 > -0.08) close++
        count++
      }
      expect(close/count).toBeGreaterThanOrEqual(0.6)
    }
  })
  // M23: 单侧所有足翻到另一侧；M24: 两侧足移到中线交叉。
  it('足鞘左右镜像，home投影仍分得开', () => {
    const legs = meshes(pupa, 'pupa-leg')
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), home).normalize()
    const up = new THREE.Vector3().crossVectors(home, right).normalize()
    for (let i=0;i<6;i+=2) {
      const a = box(legs[i]).getCenter(new THREE.Vector3()), b = box(legs[i+1]).getCenter(new THREE.Vector3())
      expect(a.z + b.z).toBeCloseTo(0, 4)
      expect(a.x).toBeCloseTo(b.x, 4)
      const d = legs[i].localToWorld(a).sub(legs[i+1].localToWorld(b))
      expect(Math.hypot(d.dot(right), d.dot(up)) / pupa.radius).toBeGreaterThan(0.12)
    }
  })
  // M25: 删触角；M26: 触角越过中线；M27: 抬起成两根面条。
  it('两触角鞘对称贴体、不越中线', () => {
    const ants = meshes(pupa, 'pupa-antenna')
    expect(ants).toHaveLength(2)
    const ca = box(ants[0]).getCenter(new THREE.Vector3()), cb = box(ants[1]).getCenter(new THREE.Vector3())
    expect(ca.z + cb.z).toBeCloseTo(0,4)
    expect(ca.x).toBeCloseTo(cb.x,4)
    for (const ant of ants) {
      const b = box(ant)
      expect(b.min.z > 0.1 || b.max.z < -0.1).toBe(true)
      expect(b.max.y).toBeLessThan(0.59)
      expect(size(ant).x).toBeGreaterThan(0.65); expect(size(ant).x).toBeLessThan(1.2)
      expect(exposed(pupa, ant)).toBeGreaterThan(0.12)
    }
  })
  // M28: 删翅鞘；M29: 翅鞘变圆棒；M30: 翅鞘伸成成虫展开翅。
  it('四片短而扁的翅鞘贴胸侧', () => {
    const wings = meshes(pupa, 'pupa-wing')
    expect(wings).toHaveLength(4)
    for (const w of wings) {
      const s = size(w)
      expect(s.x).toBeGreaterThan(0.6); expect(s.x).toBeLessThan(1.3)
      expect(s.z / s.y).toBeGreaterThan(2)
      expect(s.z).toBeLessThan(0.42)
    }
  })
  // M31: 删眼；M32: 眼涂成同色；M33: 隐藏腹面附肢（首轮射线仍命中隐藏物，补visible链）。
  it('蛹眼区比体壁深、足眼在home可见', () => {
    expect(meshes(pupa, 'pupa-eye')).toHaveLength(2)
    expect(hsl(part(pupa, 'pupa-eye')).l).toBeLessThan(hsl(part(pupa, 'pupa-head')).l - 0.15)
    for (const o of [...meshes(pupa, 'pupa-leg'), ...meshes(pupa, 'pupa-eye')]) expect(exposed(pupa, o)).toBeGreaterThan(0.08)
  })
  // M34: 删除封盖；M35: 封盖移到尾端；M36: 恢复近侧房壁遮住头。
  it('蛹房保留头端半幅丝质封盖，剖口可见头', () => {
    const cap = part(pupa, 'silk-cap')
    expect(box(cap).getCenter(new THREE.Vector3()).x).toBeGreaterThan(box(part(pupa, 'pupa-head')).max.x)
    expect(size(cap).z).toBeGreaterThan(0.5); expect(size(cap).z).toBeLessThan(0.75)
    expect(exposed(pupa, part(pupa, 'pupa-head'))).toBeGreaterThan(0.2)
  })
  // R13: 丝盖涂黑；R14: 丝盖法线反转；R15: 丝盖压成无厚平片；R16: 启用顶点色却漏颜色属性。
  it('丝质封盖浅灰、薄而外鼓且法线朝外', () => {
    const cap=part(pupa,'silk-cap'), material=mat(cap)
    for(const c of surfaceColors(cap)) {
      const h=c.getHSL({h:0,s:0,l:0},THREE.SRGBColorSpace)
      expect(h.l).toBeGreaterThan(0.7)
      expect(h.s).toBeLessThan(0.2)
    }
    expect(material.roughness).toBeGreaterThan(0.85)
    expect(size(cap).x).toBeGreaterThan(0.04); expect(size(cap).x).toBeLessThan(0.16)
    const center=box(cap).getCenter(new THREE.Vector3()), fs=faces(cap)
    expect(fs.filter(f => f.normal.dot(f.center.clone().sub(center))>0 && f.normal.dot(f.winding)>0.95).length/fs.length).toBeGreaterThan(0.98)
  })
  // M46: 撤掉loft绕序修正，使浅色凸体读成坑；M47: 反转球体法线。
  it('浅色凸体的三角形绕序与外法线一致', () => {
    for (const [i,m] of models.entries()) {
      const o = part(m,['egg','larva-body','pupa-abdomen'][i]), geo = o.geometry
      const pos=geo.getAttribute('position'), normal=geo.getAttribute('normal'), idx=geo.index!
      let good=0, count=0
      for(let k=0;k<idx.count;k+=3) {
        const a=idx.getX(k), b=idx.getX(k+1), c=idx.getX(k+2)
        const p=new THREE.Vector3().fromBufferAttribute(pos,a)
        const q=new THREE.Vector3().fromBufferAttribute(pos,b).sub(p)
        const r=new THREE.Vector3().fromBufferAttribute(pos,c).sub(p)
        const cross=q.cross(r)
        if(cross.lengthSq()<1e-15) continue
        count++
        if(cross.dot(new THREE.Vector3().fromBufferAttribute(normal,a))>0) good++
      }
      expect(good/count).toBeGreaterThan(0.95)
    }
  })
  for (const [i,m] of models.entries()) {
    // M37: 纸房改蜡黄/镜面；M38: 壁磨成圆筒；M39: 开口翻朝上。
    it(`阶段${i}灰褐纸房有六角折面、层纹、开口向下`, () => {
      const wall = part(m, 'paper-wall'), ps = points(wall)
      expect(hsl(wall).s).toBeLessThan(0.25)
      expect(hsl(wall).l).toBeGreaterThan(0.25); expect(hsl(wall).l).toBeLessThan(0.6)
      expect(mat(wall).roughness).toBeGreaterThan(0.85)
      const radial = ps.map(p => Math.hypot(p.y,p.z))
      expect(Math.max(...radial) / Math.min(...radial)).toBeGreaterThan(1.12)
      const outward = new THREE.Vector3(1,0,0).transformDirection(wall.parent!.matrixWorld)
      expect(outward.y).toBeLessThan(-0.8)
      const ys = new Set(ps.map(p => Math.round(Math.hypot(p.y,p.z)*10000)))
      expect(ys.size).toBeGreaterThan(25)
    })
    // R01: 六角底换圆盘/椭圆；R02: 只留三面或恢复近侧两面；R03: 把折角磨成圆筒。
    it(`阶段${i}纸房截面有六个60度角、保留四面直壁`, () => {
      const base=part(m,'paper-base'), wall=part(m,'paper-wall')
      const angles=[...new Set(points(base).filter(p => Math.hypot(p.y,p.z)>0.5)
        .map(p => Math.round(((Math.atan2(p.z,p.y)+Math.PI*2)%(Math.PI*2))*1e4)))].sort((a,b)=>a-b)
      expect(angles).toHaveLength(6)
      for(let k=0;k<6;k++) {
        const delta=((angles[(k+1)%6]-angles[k])/1e4+Math.PI*2)%(Math.PI*2)
        expect(delta).toBeCloseTo(Math.PI/3,2)
      }
      const outer=faces(wall).filter(f => {
        const angle=Math.atan2(f.center.z,f.center.y)
        const side=Math.round((angle-Math.PI/6)/(Math.PI/3))
        const n=new THREE.Vector3(0,Math.cos(Math.PI/6+side*Math.PI/3),Math.sin(Math.PI/6+side*Math.PI/3))
        return f.center.dot(n)>0.554 && Math.abs(f.winding.x)<0.2
      })
      const sides=new Set<number>()
      for(const f of outer) {
        const angle=Math.atan2(f.winding.z,f.winding.y)
        const side=Math.round((angle-Math.PI/6)/(Math.PI/3))
        const exact=Math.PI/6+side*Math.PI/3
        expect(Math.abs(Math.sin(angle-exact))).toBeLessThan(0.025)
        sides.add((side+6)%6)
      }
      expect(sides.size).toBe(4)
    })
    // R04: 纸涂黑；R05: 纸涂饱和黄；R06: 同色顶点色与基色相乘；R07: 底面漏颜色属性。
    it(`阶段${i}纸壁和房底实际着色足够亮且低饱和`, () => {
      for(const o of [part(m,'paper-wall'),part(m,'paper-base')]) {
        const material=mat(o)
        for(const c of surfaceColors(o)) {
          const h=c.getHSL({h:0,s:0,l:0},THREE.SRGBColorSpace)
          expect(h.l).toBeGreaterThan(0.46); expect(h.l).toBeLessThan(0.65)
          expect(h.s).toBeLessThan(0.28)
        }
        expect(material.roughness).toBeGreaterThan(0.9)
      }
    })
    // R08: 外壁法线朝内；R09: 房底法线朝内；R10: 只翻绕序不翻法线。
    it(`阶段${i}纸房外表面和房底的法线朝外且绕序一致`, () => {
      const wall=part(m,'paper-wall')
      const fs=faces(wall).filter(f => {
        const angle=Math.atan2(f.center.z,f.center.y)
        const side=Math.round((angle-Math.PI/6)/(Math.PI/3))
        const n=new THREE.Vector3(0,Math.cos(Math.PI/6+side*Math.PI/3),Math.sin(Math.PI/6+side*Math.PI/3))
        return f.center.dot(n)>0.554 && Math.abs(f.winding.x)<0.2
      })
      expect(fs.length).toBeGreaterThan(20)
      expect(fs.filter(f => f.normal.dot(new THREE.Vector3(0,f.center.y,f.center.z))>0 && f.normal.dot(f.winding)>0.95).length/fs.length).toBeGreaterThan(0.98)
      const base=part(m,'paper-base'), center=box(base).getCenter(new THREE.Vector3()), bs=faces(base)
      expect(bs.filter(f => f.normal.dot(f.center.clone().sub(center))>0 && f.normal.dot(f.winding)>0.9).length/bs.length).toBeGreaterThan(0.98)
    })
    // R11: 恢复home前方近侧壁；R12: 幼体缩成白点；按投影面积而非网格顶点数验收。
    it(`阶段${i}home方向幼体投影至少八成无遮挡`, () => {
      const body=meshes(m).filter(o => /^(egg$|larva-|pupa-)/.test(o.name))
      const seen=projectedVisibility(m,body)
      expect(seen.fraction).toBeGreaterThan(0.8)
      expect(seen.area).toBeGreaterThan(0.035)
    })
    // M40: 白色材质开透射/高光；M41: 涂饱和橙色。
    it(`阶段${i}浅色体壁哑光、不透射`, () => {
      const body = part(m, ['egg','larva-body','pupa-head'][i])
      expect(mat(body).transmission).toBe(0)
      expect(mat(body).roughness).toBeGreaterThan(0.55)
      expect(mat(body).clearcoat).toBeLessThan(0.15)
      expect(hsl(body).s).toBeLessThan(0.45)
      expect(hsl(body).l).toBeGreaterThan(0.65)
    })
    // M42: 重复几何超预算；M43: 写入NaN；M44: 锚点移走；M45: 用成虫锚点。
    it(`阶段${i}几何有限、预算内、锚点落在对应结构且无成虫动作`, () => {
      let tris = 0
      for (const o of meshes(m)) {
        tris += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count)/3
        for (const p of points(o,true)) expect(Number.isFinite(p.lengthSq())).toBe(true)
      }
      expect(tris).toBeGreaterThan(500); expect(tris).toBeLessThan(40000)
      expect(m.radius).toBeGreaterThan(0); expect(m.radius).toBeLessThan(3)
      expect(m.rig).toBeUndefined()
      expect(Object.keys(m.anchors).length).toBeGreaterThan(0)
      for (const [key,a] of Object.entries(m.anchors)) {
        expect(['mandible','sting','wing','eye','antenna','waist']).not.toContain(key)
        const o = part(m,key)
        expect(new THREE.Box3().setFromObject(o).distanceToPoint(a)).toBeLessThan(0.03)
      }
    })
  }
})
