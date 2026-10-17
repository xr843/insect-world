/** Evidence is tracked per claim, never as whole-species verification. */
export type ContentClaim =
  | 'japanese-subspecies-length'
  | 'diet-and-range'
  | 'male-combat'
  | 'aphid-predation'
  | 'adult-length-cornell'
  | 'us-season-and-introduction'
  | 'larval-stages-and-native-range'
  | 'reflex-bleeding'
  | 'bee-stinging'
  | 'waggle-run-coding'
  | 'winter-clustering'
  | 'mantis-forelegs-and-eggs'
  | 'mantis-us-bird-records'
  | 'longhorn-beetle-adult-morphology'
  | 'longhorn-beetle-life-cycle-and-boring'
  | 'longhorn-beetle-hosts-and-damage'
  | 'longhorn-beetle-distribution-and-pathways'

export interface ContentSource {
  id: string
  url: string
  titleKey: 'sources.envTitle' | 'sources.zooTitle' | 'sources.combatTitle'
    | 'sources.ncLadybirdTitle' | 'sources.cornellLadybirdTitle' | 'sources.adwLadybirdTitle' | 'sources.bleedingTitle'
    | 'sources.ufBeeTitle' | 'sources.waggleTitle' | 'sources.psuWinterTitle'
    | 'sources.ncMantisTitle' | 'sources.mantisBirdTitle'
    | 'sources.eppoAnoplophoraDatasheetTitle' | 'sources.eppoAnoplophoraDistributionTitle' | 'sources.eppoAnoplophoraReportingTitle' | 'sources.efsaAnoplophoraSurveyCardTitle' | 'sources.haackAnoplophoraReviewTitle'
  supports: readonly ContentClaim[]
  access: 'full-text' | 'official-page' | 'abstract'
  checkedAt: string
}

export const CONTENT_SOURCES: Readonly<Record<string, readonly ContentSource[]>> = {
  'longhorn-beetle': [
    {
      id: 'eppo-anoplophora-chinensis-datasheet',
      url: 'https://gd.eppo.int/taxon/ANOLCN/datasheet',
      titleKey: 'sources.eppoAnoplophoraDatasheetTitle',
      supports: ['longhorn-beetle-adult-morphology', 'longhorn-beetle-life-cycle-and-boring', 'longhorn-beetle-hosts-and-damage', 'longhorn-beetle-distribution-and-pathways'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'eppo-anoplophora-chinensis-distribution',
      url: 'https://gd.eppo.int/taxon/ANOLCN/distribution',
      titleKey: 'sources.eppoAnoplophoraDistributionTitle',
      supports: ['longhorn-beetle-distribution-and-pathways'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'eppo-reporting-anoplophora-chinensis',
      url: 'https://gd.eppo.int/taxon/ANOLCN/reporting',
      titleKey: 'sources.eppoAnoplophoraReportingTitle',
      supports: ['longhorn-beetle-distribution-and-pathways', 'longhorn-beetle-hosts-and-damage'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'efsa-anoplophora-chinensis-survey-card',
      url: 'https://wapi.gov.me/download/8cb1a239-729e-4de2-a2b6-82321c6d43f6?version=1.0',
      titleKey: 'sources.efsaAnoplophoraSurveyCardTitle',
      supports: ['longhorn-beetle-adult-morphology', 'longhorn-beetle-life-cycle-and-boring', 'longhorn-beetle-hosts-and-damage', 'longhorn-beetle-distribution-and-pathways'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'haack-2010-anoplophora-review',
      url: 'https://research.fs.usda.gov/download/treesearch/34395.pdf',
      titleKey: 'sources.haackAnoplophoraReviewTitle',
      supports: ['longhorn-beetle-adult-morphology', 'longhorn-beetle-life-cycle-and-boring', 'longhorn-beetle-hosts-and-damage', 'longhorn-beetle-distribution-and-pathways'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
  ],
  mantis: [
    {
      id: 'nc-state-chinese-mantid',
      url: 'https://content.ces.ncsu.edu/chinese-mantid',
      titleKey: 'sources.ncMantisTitle',
      supports: ['mantis-forelegs-and-eggs'],
      access: 'official-page',
      checkedAt: '2026-10-01',
    },
    {
      id: 'nyffeler-2017-bird-predation',
      url: 'https://www.unibas.ch/dam/jcr:8c1649d3-ba69-4907-b84b-e7f84d765a4c/Artikel%20Wilson%20Journal%20of%20Ornithology.pdf',
      titleKey: 'sources.mantisBirdTitle',
      supports: ['mantis-us-bird-records'],
      access: 'full-text',
      checkedAt: '2026-10-01',
    },
  ],
  honeybee: [
    {
      id: 'uf-ifas-bee-stinger',
      url: 'https://ask.ifas.ufl.edu/publication/IN1005',
      titleKey: 'sources.ufBeeTitle',
      supports: ['bee-stinging'],
      access: 'official-page',
      checkedAt: '2026-10-01',
    },
    {
      id: 'ai-2019-waggle-review',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6835826/',
      titleKey: 'sources.waggleTitle',
      supports: ['waggle-run-coding'],
      access: 'full-text',
      checkedAt: '2026-10-01',
    },
    {
      id: 'psu-2021-winter-clustering',
      url: 'https://www.psu.edu/news/research/story/summer-weather-conditions-influence-winter-survival-honey-bees',
      titleKey: 'sources.psuWinterTitle',
      supports: ['winter-clustering'],
      access: 'official-page',
      checkedAt: '2026-10-01',
    },
  ],
  ladybird: [
    {
      id: 'nc-state-c7-predation',
      url: 'https://entomology.ces.ncsu.edu/biological-control-information-center/beneficial-predators/c-7-ladybeetle/',
      titleKey: 'sources.ncLadybirdTitle',
      supports: ['aphid-predation'],
      access: 'official-page',
      checkedAt: '2026-10-01',
    },
    {
      id: 'cornell-c7-species-profile',
      url: 'https://biocontrol.entomology.cornell.edu/predators/Coccinella.php',
      titleKey: 'sources.cornellLadybirdTitle',
      supports: ['adult-length-cornell', 'us-season-and-introduction'],
      access: 'official-page',
      checkedAt: '2026-10-01',
    },
    {
      id: 'adw-c7-development-range',
      url: 'https://animaldiversity.org/accounts/Coccinella_septempunctata/',
      titleKey: 'sources.adwLadybirdTitle',
      supports: ['larval-stages-and-native-range'],
      access: 'official-page',
      checkedAt: '2026-10-01',
    },
    {
      id: 'holloway-1991-reflex-bleeding',
      url: 'https://link.springer.com/article/10.1007/BF01240660',
      titleKey: 'sources.bleedingTitle',
      supports: ['reflex-bleeding'],
      access: 'abstract',
      checkedAt: '2026-10-01',
    },
  ],
  'rhinoceros-beetle': [
    {
      id: 'env-japanese-subspecies-table',
      url: 'https://www.env.go.jp/content/000283612.pdf',
      titleKey: 'sources.envTitle',
      supports: ['japanese-subspecies-length'],
      access: 'full-text',
      checkedAt: '2026-09-30',
    },
    {
      id: 'tama-zoo-species-page',
      url: 'https://www.tokyo-zoo.net/tama/encyclopedia/japanese-rhinoceros-beetle/index.html',
      titleKey: 'sources.zooTitle',
      supports: ['diet-and-range'],
      access: 'official-page',
      checkedAt: '2026-09-30',
    },
    {
      id: 'buchalski-2019-horn-performance',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6835817/',
      titleKey: 'sources.combatTitle',
      supports: ['male-combat'],
      access: 'full-text',
      checkedAt: '2026-09-30',
    },
  ],
}
