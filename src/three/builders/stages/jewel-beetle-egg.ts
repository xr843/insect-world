/**
 * 日本吉丁 · 卵。1 单位 = 1 cm，+X 前、+Y 上、+Z 右。
 * 白色扁盘卵 0.10 × 0.10 × 0.025 cm（同科资料推算，非本种实测）。
 * 一块撕裂边缘的树皮厚片：纵向深褐脊沟、撕裂分层内皮断面、宽浅裂缝。
 * 卵落在裂缝底，上半白盘高于裂沟边缘；不用尖头椭球拼木条。
 */
import * as T from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

function barkGeometry(): T.BufferGeometry {
  const NX=64,NZ=48,row=NZ+1,layer=(NX+1)*row
  const positions:number[]=[],colors:number[]=[],uvs:number[]=[],outer:number[]=[],inner:number[]=[]
  for(const bottom of [false,true])for(let i=0;i<=NX;i++)for(let j=0;j<=NZ;j++) {
    const u=i/NX,v=2*j/NZ-1
    let x=(u-.5)*.29*(1-.09*v*v)+.006*Math.sin(v*6.1)
    let z=v*(.108+.007*Math.sin(u*12+.8)+.004*Math.cos(u*23))
    // 沿X延伸的脊：横向变化快，纵向只缓慢偏转，不叠加圆鼓包噪声。
    const across=z+.0015*Math.sin(x*18)
    const ridge=.0048*(.72*Math.cos(across*280)+.28*Math.cos(across*510))
    const fibers=.0008*Math.sin(across*880+x*5)
    const crack=z-.003*Math.sin(x*24)
    const main=.012*Math.exp(-Math.pow(crack/.050,8))
    const channel=.006*Math.exp(-Math.pow((z-.079-.002*Math.sin(x*16))/.004,2))
      +.007*Math.exp(-Math.pow((z+.080-.002*Math.sin(x*19))/.004,2))
    const crackFade=1-Math.exp(-Math.pow(crack/.052,8))
    const top=.0025+(ridge+fibers)*crackFade-main-channel
    const depth=.015+.005*(.5+.5*Math.sin(x*39+z*23))+.004*Math.sin(z*117+x*31)
    let y=top
    if(bottom) {
      // 薄片底面向内缩，且厚度沿断口变化；避免蛋糕式竖直直墙。
      x=x*.90+.002*Math.sin(z*63)
      z=z*.90+.0015*Math.sin(x*41)
      y=-depth
    }
    positions.push(x,y,z);uvs.push(u,j/NZ)
    const tint=.88+.16*Math.cos(across*280)+.10*Math.sin(across*880+x*5)-main*3
    colors.push(tint,tint,tint)
  }
  for(let i=0;i<NX;i++)for(let j=0;j<NZ;j++) {
    const a=i*row+j,b=a+row
    outer.push(a,a+1,b,b,a+1,b+1)
    inner.push(a+layer,b+layer,a+1+layer,b+layer,b+1+layer,a+1+layer)
  }
  const border:number[]=[]
  for(let j=0;j<=NZ;j++)border.push(j)
  for(let i=1;i<=NX;i++)border.push(i*row+NZ)
  for(let j=NZ-1;j>=0;j--)border.push(NX*row+j)
  for(let i=NX-1;i>0;i--)border.push(i*row)
  const rings:number[][]=[border]
  // 撕裂断面有几层不齐的纤维薄层，每层都错开并起毛边；颜色也沿纤维变化。
  for(let k=1;k<=3;k++) {
    const ring:number[]=[]
    for(let i=0;i<border.length;i++) {
      const a=border[i],b=a+layer
      const t=k/4+.055*Math.sin(i*.31+k)
      const x=T.MathUtils.lerp(positions[a*3],positions[b*3],t)
      const z=T.MathUtils.lerp(positions[a*3+2],positions[b*3+2],t)
      const tear=.003*Math.sin(i*1.73+k*2.1)*Math.sin(Math.PI*t)
      const y=T.MathUtils.lerp(positions[a*3+1],positions[b*3+1],t)+.0015*Math.sin(i*.67+k)
      ring.push(positions.length/3)
      positions.push(x+Math.sign(x)*tear,y,z+Math.sign(z)*tear)
      const tint=.84+.15*Math.sin(i*.73+k*.4)+.10*Math.cos(i*2.7-k)
      colors.push(tint,tint,tint);uvs.push(i/border.length,t)
    }
    rings.push(ring)
  }
  rings.push(border.map(i=>i+layer))
  for(let k=0;k<rings.length-1;k++)for(let i=0;i<border.length;i++) {
    const j=(i+1)%border.length,a=rings[k][i],b=rings[k][j],c=rings[k+1][i],d=rings[k+1][j]
    const target=k===0?outer:inner
    target.push(a,c,b,b,c,d)
  }
  const geo=new T.BufferGeometry()
  geo.setAttribute('position',new T.Float32BufferAttribute(positions,3))
  geo.setAttribute('color',new T.Float32BufferAttribute(colors,3))
  geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2))
  geo.setIndex([...outer,...inner]);geo.addGroup(0,outer.length,0);geo.addGroup(outer.length,inner.length,1)
  geo.computeVertexNormals();return geo
}
export function buildJewelBeetleEgg(): InsectModel {
  const g = new T.Group()
  const outer = chitin({ color: '#705039', gloss: .12, clearcoat: 0, surface: 'striate' })
  // 顶点色只调明暗，保留外皮与浅色内皮断面的材质差。
  outer.vertexColors = true
  const inner = chitin({ color: '#bea276', gloss: .13, clearcoat: 0 }); inner.vertexColors = true
  const fragment = new T.Mesh(barkGeometry(), [outer, inner]); fragment.name = 'bark-fragment'; g.add(fragment)
  const shell = new T.Mesh(new T.SphereGeometry(1, 40, 24), chitin({ color: '#f1ecde', gloss: .3, clearcoat: .04 }))
  shell.name = 'egg-shell'; shell.scale.set(.05, .0125, .05); shell.position.y = .002; g.add(shell)
  return finalize(g, { eggSurface: new T.Vector3(0, .0145, 0), barkCrevice: new T.Vector3(.08, -.0095, 0) })
}
