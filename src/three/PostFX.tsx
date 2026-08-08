/**
 * 桌面专属后期管线：SSAO 在腿根/鞘翅缝/口器交叠处压出接触阴影，
 * 极轻 Bloom 只舔一口金属高光与萤火虫发光器（emissiveIntensity 3.2，
 * 稳过下面的 luminanceThreshold）。手机端整个组件都不挂载，见 Scene
 * 里的 `!COARSE &&` 门控 —— 不是挂载后 enabled=false。
 *
 * 单独成文件 + React.lazy：postprocessing 这套库压缩后 +103KB gzip，
 * 塞进 main 会让手机为一段永不执行的代码白付 124% 的主包体积。
 * 懒加载让它成为独立 chunk —— 手机一个字节都不下载，
 * 桌面在首屏之后异步补挂（补挂前画面就是没有 AO 的旧观感，无害）。
 *
 * ⚠️ EffectComposer 接管渲染后会把 gl.toneMapping 强制设成 NoToneMapping
 * （postprocessing 认为色调映射只该在链尾做一次，不该在中间的 HDR 渲染目标上做），
 * 直到它卸载才还原。不在链尾补一个 ToneMapping 效果的话，桌面画面会跳出
 * onCreated 里调好的 ACES Filmic 观感，全场变灰白、高光炸掉。
 */
import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

export default function PostFX({ radius }: { radius: number }) {
  const d = Math.max(radius, 0.001)
  // AO 半径取包围半径的三成：大了会把整只虫糊成一片灰阴影，起不到局部接触阴影的效果；
  // distanceFalloff 跟着同比例收，否则景深剔除会松到把半个虫身都当成"贴着"的遮挡物
  const aoRadius = d * 0.3
  return (
    <EffectComposer multisampling={8}>
      <N8AO halfRes aoRadius={aoRadius} distanceFalloff={aoRadius} intensity={2} />
      <Bloom luminanceThreshold={0.9} intensity={0.2} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
