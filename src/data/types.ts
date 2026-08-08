/** 昆虫图鉴的数据契约 */

/** 分类目 —— 决定左栏分组与配色 */
export type Order =
  | '鞘翅目'
  | '鳞翅目'
  | '膜翅目'
  | '蜻蜓目'
  | '螳螂目'
  | '直翅目'
  | '半翅目'
  | '双翅目'
  | '脉翅目'
  | '革翅目'
  | '广翅目'
  | '蜚蠊目'
  | '毛翅目'
  | '䗛目'

/** 3D 模型上的一个可点击标注点 */
export interface Hotspot {
  id: string
  /** 部位名，如「复眼」 */
  label: string
  /** 一句话说明，点击时显示 */
  note: string
  /** 对应 InsectModel.anchors 的 key */
  anchor: string
  /** 标注点颜色，取自设计系统三色 */
  tone: 'coral' | 'lavender' | 'sage' | 'amber'
}

/** 右栏 KEY FACTS 表的一行 */
export interface Fact {
  /** 字段名，如「体长」 */
  key: string
  /** 字段值，如「30–55 毫米」 */
  value: string
  /** 行首小图标标识 */
  icon: 'size' | 'weight' | 'time' | 'place' | 'food' | 'ability'
}

/**
 * 讲解弹窗的一步。带 anchor 时，3D 展台会把镜头移到那个部位上，
 * 让「读到哪里、看到哪里」对上 —— 参考站的讲解弹窗只是静态文字，
 * 这里让它和模型联动。
 */
export interface LessonStep {
  title: string
  body: string
  /** 对应 InsectModel.anchors 的 key，可省略 */
  anchor?: string
}

/** 一道单选题 */
export interface QuizQuestion {
  question: string
  /** 3 个选项 */
  options: string[]
  /** 正确选项的下标 */
  answer: number
  /** 作答后展示的解释，说明为什么 */
  explain: string
}

export interface Insect {
  id: string
  /** 中文名 */
  name: string
  /** 学名（拉丁文），显示在 3D 视图左下角 */
  latin: string
  /** 一句话别称，如「森林里的举重冠军」 */
  epithet: string
  order: Order
  /** 2~3 句总述，显示在右栏标题下 */
  summary: string
  /** 6 条关键数据 */
  facts: Fact[]
  /** 3~6 个 3D 标注点 */
  hotspots: Hotspot[]
  /** 「生态角色」栏：它在生态系统里做什么 */
  ecology: string
  /** 「你知道吗」栏：一条反直觉的冷知识 */
  trivia: string
  /** 变态类型 */
  metamorphosis: '完全变态' | '不完全变态'
  /** 生活史各阶段，用于底部卡片 */
  lifecycle: string[]
  /** 分布区域 */
  range: string
  /** 保护/常见度状态 */
  status: string
  /** 底部「近缘种」卡片列出的同目物种 */
  relatives: string[]
  /** 缩略图与主题色（十六进制） */
  accent: string
}

/** 讲解与测验内容，按物种 id 索引；与 Insect 分文件存放以免单个文件过大 */
export interface Guide {
  /** 3~4 步的分步讲解 */
  lesson: LessonStep[]
  /** 「动态演示」弹窗讲的是这个物种最值得看的一个动作 */
  motion: { title: string; body: string }
  /** 2 道单选题 */
  quiz: QuizQuestion[]
  /** 「它在哪里」：栖境与在生态系统中的位置 */
  habitat: { title: string; body: string }
}
