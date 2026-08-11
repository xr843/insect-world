import type { Locale, Metamorphosis, OrderKey } from './types'

/**
 * 目的显示名。
 *
 * 英文按「常用词 (学名)」双标 —— 全站的英文体例是博物馆导览风：
 * 普通访客看得懂 Beetles，想查学名也查得到 Coleoptera。
 */
export const ORDER_LABEL: Record<Locale, Record<OrderKey, string>> = {
  zh: {
    coleoptera: '鞘翅目',
    lepidoptera: '鳞翅目',
    hymenoptera: '膜翅目',
    odonata: '蜻蜓目',
    mantodea: '螳螂目',
    orthoptera: '直翅目',
    hemiptera: '半翅目',
    diptera: '双翅目',
    neuroptera: '脉翅目',
    dermaptera: '革翅目',
    megaloptera: '广翅目',
    blattodea: '蜚蠊目',
    trichoptera: '毛翅目',
    phasmatodea: '䗛目',
  },
  en: {
    coleoptera: 'Beetles (Coleoptera)',
    lepidoptera: 'Butterflies & Moths (Lepidoptera)',
    hymenoptera: 'Bees, Wasps & Ants (Hymenoptera)',
    odonata: 'Dragonflies & Damselflies (Odonata)',
    mantodea: 'Mantises (Mantodea)',
    orthoptera: 'Grasshoppers & Crickets (Orthoptera)',
    hemiptera: 'True Bugs (Hemiptera)',
    diptera: 'Flies (Diptera)',
    neuroptera: 'Lacewings (Neuroptera)',
    dermaptera: 'Earwigs (Dermaptera)',
    megaloptera: 'Dobsonflies & Alderflies (Megaloptera)',
    blattodea: 'Cockroaches & Termites (Blattodea)',
    trichoptera: 'Caddisflies (Trichoptera)',
    phasmatodea: 'Stick & Leaf Insects (Phasmatodea)',
  },
}

/** 变态类型的显示名。英文同样双标：常用说法在前，术语在括号里。 */
export const METAMORPHOSIS_LABEL: Record<Locale, Record<Metamorphosis, string>> = {
  zh: { complete: '完全变态', incomplete: '不完全变态' },
  en: {
    complete: 'Complete metamorphosis (holometabolous)',
    incomplete: 'Incomplete metamorphosis (hemimetabolous)',
  },
}
