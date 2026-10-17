/** 梭毒隐翅虫 · 单粒黄卵，实测直径 0.6 mm（Ritanti & Haryadi 2021）。
 * cm；+X 前、+Y 上、+Z 右。省去土粒，以免 0.6 mm 主体被衬底掩盖。
 * 球面自带朝外绕向，不使用有内向绕向问题的 loft。
 */
import * as T from 'three'
import { chitin, finalize, type InsectModel } from '../kit'

const R = .03
export function buildRoveBeetleEgg(): InsectModel {
  const g = new T.Group()
  const shell = new T.Mesh(new T.SphereGeometry(R, 40, 28), chitin({color:'#d8c587',gloss:.27,clearcoat:.04}))
  shell.name = 'egg-shell'
  g.add(shell)
  return finalize(g, { eggSurface: new T.Vector3(0,R,0) })
}
