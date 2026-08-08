# 打磨计划：P0–P3 落地作业单

> 定位：**精致的博物馆标本**，不是照片级。程序化拼不过扫描 GLB 的微观混沌，
> 拼的是一致的艺术方向 × 细节密度；50 种风格统一恰恰是扫描模型给不了的。
> 全部表面效果由运行时程序生成（CanvasTexture），仓库保持零贴图文件。

## A 轮（✅ 已上线）：基础设施

1. `surface.ts` + kit 材质升级：刻点/沟纹/绒面预设、虹彩、半透、默认微粗糙
2. `eyes.ts`：六边形小眼面复眼（另行接入 kit）
3. 环境 512 + 地面反弹光；桌面 N8AO + 轻 Bloom

## B 轮（✅ 已上线）：逐物种表面预设分配

> 原则：每只虫只挑 1~2 个主效果，宁少勿滥；数值先取保守档，
> 目视定标的 5 只基准虫（⭐）先行验收，过了再铺开同组。

### 虹彩组（iridescent elytra）
| 物种 | 方案 |
| --- | --- |
| ⭐ jewel-beetle 日本吉丁 | 强虹彩（金属绿底 + 宽厚度域），本组定标 |
| tiger-beetle 中华虎甲 | 强虹彩（红绿撞色是它的招牌） |
| flower-chafer 白星花金龟 | 中虹彩铜绿底 + 白斑保持哑光 |
| leaf-beetle 榆蓝叶甲 | 中虹彩蓝绿底（现有金属底色之上） |
| whirligig-beetle 豉甲 | 弱虹彩黑亮 |
| rove-beetle 梭毒隐翅虫 | 鞘翅弱蓝黑虹彩 |

### 绒面组（velvet / sheen）
| 物种 | 方案 |
| --- | --- |
| ⭐ goliath-beetle 大王花金龟 | 前胸+鞘翅绒面（黑白条纹对比不能丢），本组定标 |
| silk-moth 柞蚕蛾 | 全身绒 + 触角保持 |
| hawk-moth 小豆长喙天蛾 | 躯干绒（纺锤身的毛感） |
| monarch / swallowtail | 躯干绒（翅面不动） |
| honeybee / hornet | 胸部绒 |
| mole-cricket 东方蝼蛄 | 通体天鹅绒（本种在真实世界就以绒面著称） |
| dung-beetle 神农洁蜣螂 | 哑光 + 粗刻点（绒面档的低配变体） |

### 刻点组（punctate）
| 物种 | 方案 |
| --- | --- |
| ⭐ ladybird 七星瓢虫 | 细密刻点（鞘翅光泽保持），本组定标 |
| ground-beetle 中华金星步甲 | 纵沟 striate 为主 + 星点金坑 |
| bombardier-beetle 屁步甲 | 纵沟 + 细刻点 |
| darkling-beetle 甘肃鳖甲 | 粗刻点哑光 |
| hister-beetle 阎甲 | 稀疏大刻点 + 高光泽 |
| burying-beetle 日本埋葬虫 | 中刻点 |
| diving-beetle 黄缘龙虱 | 极细刻点（流线光泽保持） |
| longhorn / stag / hercules | 轻纵沟或轻刻点，宁轻勿重 |

### 半透组（translucent）
| 物种 | 方案 |
| --- | --- |
| ⭐ termite-soldier 白蚁兵蚁 | 胸腹半透（硬头对比是本种看点），本组定标 |
| firefly 中华黄萤 | 发光器区半透 + emissive 保持 |
| lacewing 中华草蛉 | 腹部轻半透 |

### 翅膜虹彩组（membrane iridescent）
| 物种 | 方案 |
| --- | --- |
| ⭐ dragonfly 碧伟蜓 | 掠射角轻虹彩，本组定标 |
| damselfly 豆娘 | 同上（翅面积小，可略强） |
| lacewing / hoverfly / honeybee / hornet / ichneumon-wasp | 极轻档 |

### 不动组
stick-insect、水黾、蝗/螽/蟋类、蝉、角蝉、蠼螋、齿蛉、螳螂两种、枯叶蛱蝶
（拟态与哑光是它们的本色，现有观感已对——**不加效果也是一种分配**）。

## C 轮（✅ 已上线）：焦点部位
- kit.compoundEye 接入 eyes.ts（全员受益）
- 翅脉 2.0：真翅室划分（蜻蜓/豆娘/草蛉/齿蛉优先）
- 体节间膜：节间深色哑光软膜圈（甲虫腹面、蜂腰）

## D 轮（✅ 已上线）：让它活（P3）
- ✅ 触角低幅摆：双频叠加防钟摆感，attach() 重锚到基部，随「让转」同停，reduced-motion 不动
  （用户实测抓出 9 只自写触角物种静默哑掉——钩子已补齐并固化为全量普查测试）
- 入场六足 settle：暂缓（收益/风险比不如触角，待有真需求再做）
- ✅ frameloop='demand' 启用（验收点：拖动余摆顺滑、切物种完整、静止不冻帧）

## 验收规程（每轮必做）
1. 全量 vitest + tsc
2. `/preview.html` 目视：本轮动过的每只虫 + 5 只基准虫（吉丁/大王花金龟/瓢虫/白蚁/蜻蜓）
3. 手机路径回归：COARSE 门控确认后期管线未挂载
4. 帧率抽查：转动时不掉帧再合入
