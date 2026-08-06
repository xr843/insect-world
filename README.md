# 昆虫世界

可交互的 3D 昆虫图鉴 —— 旋转、缩放、点击标注点，认识 12 种昆虫的身体构造、生活史与生态角色。

界面与交互复刻自 [Anatomy Atelier](https://anatomy-livid.vercel.app/)：奶油纸背景、衬线标题、三栏工作台（图鉴列表 / 3D 展台 / 详情面板）、模型上的彩色标注点、底部扩展卡片。

## 跑起来

```bash
npm install
npm run dev          # 主站 http://localhost:5178
                     # 模型调试台 http://localhost:5178/preview.html
npm test             # 333 个测试
npm run build        # tsc --noEmit + vite build
```

主站上：左栏或 `↑` `↓` 换一种昆虫，拖动转动虫体，滚轮拉近，点彩色圆点看部位说明。
左侧工具条里「聚焦」会把镜头凑到当前标注的部位上，「剖切」沿矢状面切开，「分层」让外骨骼半透明。

## 一个必须先讲清楚的决定：模型是代码生成的

参考站每个器官是一份约 3.2 MB 的 GLB 资产（`/models/heart.glb` 等），属于采购或扫描来的素材。昆虫没有对应的现成资产，所以这里换了条路：**每个物种的几何体由 TypeScript 在浏览器里实时生成**，一行外部模型文件都没有。

这不只是妥协。昆虫的形态比内脏规律得多 —— 体分头/胸/腹三段，胸部生三对足、两对翅，附肢是分节的锥管，翅面由放射状翅脉支撑。这些结构参数化以后，加一个物种只需要写一份尺寸与配色的描述，而不是再买一个模型。代价是写实度不如三维扫描，换来的是零资产依赖、任意可扩展，以及每处形态都能在代码里追溯到形态学依据。

单个物种约 1.5 万~2.9 万三角面，在浏览器里构建耗时 30~60 毫秒。

## 结构

```
src/
  three/
    builders/
      kit.ts              建模工具箱 —— 所有物种的地基
      <species>.ts        每个物种一个文件，导出 build<Species>(): InsectModel
    registry.ts           按 id 动态加载物种模块（Vite 代码分割）
    InsectCanvas.tsx      3D 展台：工作室光照、接触阴影、轨道控制、标注点
  components/             三栏布局、顶栏、扩展卡、弹层、图标与剪影
  data/
    types.ts              图鉴数据契约
    insects.ts            12 种昆虫的全部文案与数据
  preview.tsx             模型调试台（/preview.html）
```

### kit.ts 提供什么

| 类别 | API |
| --- | --- |
| 放样核心 | `loft` `spindle` `segmentedAbdomen` |
| 附肢 | `leg` `legPair` `antenna` `antennaPair` |
| 翅 | `wing` `wingPair` `wingGeometry` `wingVeins` |
| 头部器官 | `compoundEye` `compoundEyePair` `ocelli` `mandibles` `rostrum` |
| 材质 | `chitin` `elytra` `membrane` |
| 收尾 | `finalize` `boundingRadius` |

`loft` 是全部几何的地基：给一串椭圆截面，沿路径放样成封闭实体。它对退化输入（重合点、零半径、竖直路径）有专门的测试，因为这些情况一旦产生 NaN，整个模型会静默变成空白。

物种文件只依赖 kit，彼此不依赖 —— 12 个物种是并行写出来的。

### 坐标与数据的约定

模型局部坐标：`+X` 向前（头部方向），`+Y` 向上（背方），`+Z` 向右，单位 1 = 1 厘米真实体长。

`finalize()` 把模型居中并同步平移锚点，返回 `{ group, anchors, radius }`。`radius` 供相机自动取景 —— 竹节虫 10 cm 和瓢虫 0.7 cm 差着 20 倍，靠它归一化。

`anchors` 的 key 是建模层与数据层之间唯一的耦合点：`insects.ts` 里每个 `hotspot.anchor` 必须能在对应物种的 `anchors` 里找到，否则那个标注点会静默消失。`src/data/__tests__/insects.test.ts` 用逐物种的白名单钉住了这层对应关系。

## 踩过的坑

几个只有实际跑起来才会撞上、且都不会被类型检查或 NaN 检查抓到的问题：

**`<Environment>` 会挂起整棵子树。** drei 的 `Environment` 即使只用内联 `Lightformer`（不加载外部 HDR）也可能 suspend。它和模型、灯光共处一个 Suspense 边界时，表现是：canvas 尺寸正常、WebGL 上下文正常、控制台无报错、画面全空。必须给它自己的 `<Suspense>`。

**内联回调会造成无限重载。** `onLoaded` 这类回调若是父组件每次渲染新建的闭包，又进了加载 effect 的依赖数组，就会形成「加载完 → 通知父组件 → 父组件重渲染 → 新回调 → 重新加载」的死循环，同样表现为 3D 区永远空白。回调要放进 ref 再用。

**`legPair` 曾经不是镜像。** 原写法是「把 `base.z` 取负，再翻 `scale.z`」。但 `leg()` 内部算出的腿节方向 z 分量恒为正、不随 `base.z` 变号，于是左腿的基节被翻回右侧，整条腿从右侧根部斜穿过身体中线。两个物种作者独立报告了这个现象。几何完全合法、没有 NaN，只是长错了地方 —— 这类问题只能靠专门的对称性断言抓住（`__tests__/mirror.test.ts`）。

**`wing()` 的 `spread` 语义与直觉相反。** 实际是 `0` = 完全侧展、`90` = 沿体轴向前。全部物种文件都是按这个实测行为标定的姿态，测试里钉住了它，别顺手「修正」。

**测试全绿不等于长得像。** 几何合法性、包围盒比例、面数预算都能自动验，但「这只虫看起来像不像萤火虫」只能用眼睛看。`/preview.html` 就是为此存在的：单物种放大、线框、网格地面、面数与锚点统计。萤火虫的前胸盾片一度被做成两个大椭球（像两只虫黏在一起），所有测试都是绿的。

## 测试

```bash
npm test
```

333 个测试，分五类：

- `builders/__tests__/kit.test.ts` —— 放样地基与退化输入（重合点、零半径、竖直路径），30 项
- `builders/__tests__/mirror.test.ts` —— 成对附肢的对称性、`wing` 的 `spread` 语义
- `builders/__tests__/{flyers,crawlers,hoppers,longbodies}.test.ts` —— 各物种的几何合法性、形态比例、面数预算、锚点完整性
- `three/__tests__/integration.test.ts` —— 建模层 × 数据层的接缝：每个 hotspot 的 anchor 都能在模型上找到落点，且落在虫体附近
- `data/__tests__/insects.test.ts` —— 数据契约与 anchor 白名单，173 项断言

形态类断言写的时候有个自检标准：**把代码改回出问题的版本，这条断言会失败吗？** 不会就等于没写。
「后足腿节最粗处 ≥ 腿节长的 1/3」这类边界值断言尤其容易写成恰好擦边通过而实际无效，
所以蝗虫那条改成了量取真实网格的最大半径，外加一条「两端不许收细到 28% 以下」。

## 已知不足

- 模型的写实度距离三维扫描仍有明显差距，尤其在体表纹理与细部绒毛上 —— 当前只有几何与材质，没有贴图。
- 顶栏的「分类 / 课程 / 图鉴库 / 笔记」是布局占位，只有「探索」是实的。
- 剖切与分层两个视图模式是通用实现（裁剪平面 / 降低外骨骼不透明度），没有按物种定制解剖层次。
