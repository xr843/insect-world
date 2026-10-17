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
  | 'cicada-sound-production'
  | 'cicada-life-history'
  | 'cicada-distribution-pest-uses'
  | 'cicada-periodical-contrast'
  | 'ant-worker-subcastes-and-head-color'
  | 'ant-nestmate-recognition'
  | 'ant-size-nest-and-range'
  | 'ant-claustral-founding'
  | 'ant-aphid-tending'
  | 'monarch-milkweed-toxins-and-warning'
  | 'monarch-morphology-and-life-cycle'
  | 'monarch-migration-and-navigation'
  | 'monarch-iucn-status'
  | 'dragonfly-east-asian-taxon-traits'
  | 'dragonfly-capture-trials-other-genus'
  | 'dragonfly-predictive-interception-other-genera'
  | 'dragonfly-odonate-eye-polarization'
  | 'locust-asian-subspecies-traits'
  | 'locust-chinese-development'
  | 'locust-neurotransmitter-phase-change'
  | 'tiger-japanese-taxon-biology'
  | 'tiger-korean-life-history'
  | 'tiger-other-species-visual-pursuit'
  | 'swallowtail-traits-and-behavior'
  | 'swallowtail-host-development'
  | 'swallowtail-mimicry-genetics'
  | 'stag-japanese-subspecies-traits'
  | 'stag-korean-rearing'
  | 'stag-chinese-morphology-genome'
  | 'stag-other-species-jaw-growth'
  | 'mole-japanese-seasonal-wings'
  | 'mole-digging-vibrations'
  | 'mole-burrow-functions'
  | 'mole-diet-and-crop-damage'

export interface ContentSource {
  id: string
  url: string
  titleKey: 'sources.envTitle' | 'sources.zooTitle' | 'sources.combatTitle'
    | 'sources.ncLadybirdTitle' | 'sources.cornellLadybirdTitle' | 'sources.adwLadybirdTitle' | 'sources.bleedingTitle'
    | 'sources.ufBeeTitle' | 'sources.waggleTitle' | 'sources.psuWinterTitle'
    | 'sources.ncMantisTitle' | 'sources.mantisBirdTitle'
    | 'sources.eppoAnoplophoraDatasheetTitle' | 'sources.eppoAnoplophoraDistributionTitle' | 'sources.eppoAnoplophoraReportingTitle' | 'sources.efsaAnoplophoraSurveyCardTitle' | 'sources.haackAnoplophoraReviewTitle'
    | 'sources.nutrientsCicadaReviewTitle' | 'sources.jacSoundApparatusTitle' | 'sources.jinhuaOutbreakTitle' | 'sources.zookeysNymphTitle' | 'sources.mitogenomeTitle' | 'sources.actaEntomologicaDevelopmentTitle' | 'sources.illinoisCicadasTitle'
    | 'sources.jantJaponicusTitle' | 'sources.watanabeChcReceptionTitle' | 'sources.maHeadPhenotypesTitle' | 'sources.hasegawaFirstWorkersTitle'
    | 'sources.frontiersHoneydewAntLactobacillusTitle'
    | 'sources.fwsMonarchTitle' | 'sources.monarchWatchBiologyTitle' | 'sources.guerraMagneticCompassTitle' | 'sources.iucnSpcRulingTitle' | 'sources.iucnRedListMonarchTitle'
    | 'sources.kotobankGinyanmaTitle' | 'sources.hkWetlandParkAnaxJuliusTitle' | 'sources.combesDragonflyPredationTitle' | 'sources.wiedermanPredictiveFocusTitle' | 'sources.mischiatiInternalModelsTitle' | 'sources.cezarioOdonataPolarizedVisionTitle'
    | 'sources.faoAsianLocustTitle'
    | 'sources.locustDegreeDayTitle'
    | 'sources.locustSerotoninTitle'
    | 'sources.locustDopamineTitle'
    | 'sources.horiTigerTitle'
    | 'sources.chaTigerTitle'
    | 'sources.zurekAntennaeTitle'
    | 'sources.zurekJawsTitle'
    | 'sources.adwPolytesTitle'
    | 'sources.suwarnoPolytesTitle'
    | 'sources.komataPolytesTitle'
    | 'sources.koreanHopeiTitle'
    | 'sources.kyotoHopeiTitle'
    | 'sources.liHopeiTitle'
    | 'sources.gotohMandiblesTitle'
    | 'sources.endoWingsTitle'
    | 'sources.hayashiVibrationsTitle'
    | 'sources.endoBurrowsTitle'
    | 'sources.moleGutDietTitle'
  supports: readonly ContentClaim[]
  access: 'full-text' | 'official-page' | 'abstract'
  checkedAt: string
}

export const CONTENT_SOURCES: Readonly<Record<string, readonly ContentSource[]>> = {
  locust: [
    {
      id: 'faoAsianLocust',
      url: 'https://www.fao.org/locusts-cca/bioecology/asian-migratory-locust-(lmi/en',
      titleKey: 'sources.faoAsianLocustTitle',
      supports: ['locust-asian-subspecies-traits'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'locustDegreeDay',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3943769/',
      titleKey: 'sources.locustDegreeDayTitle',
      supports: ['locust-chinese-development'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'locustSerotonin',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3791384/',
      titleKey: 'sources.locustSerotoninTitle',
      supports: ['locust-neurotransmitter-phase-change'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'locustDopamine',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3053982/',
      titleKey: 'sources.locustDopamineTitle',
      supports: ['locust-neurotransmitter-phase-change'],
      access: 'abstract',
      checkedAt: '2026-10-17',
    },
  ],
  'tiger-beetle': [
    {
      id: 'horiTiger',
      url: 'https://repository.kulib.kyoto-u.ac.jp/server/api/core/bitstreams/c648b94b-db6c-4000-a13d-34bf9ad3245f/content',
      titleKey: 'sources.horiTigerTitle',
      supports: ['tiger-japanese-taxon-biology'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'chaTiger',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12561995/',
      titleKey: 'sources.chaTigerTitle',
      supports: ['tiger-korean-life-history'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'zurekAntennae',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3924084/',
      titleKey: 'sources.zurekAntennaeTitle',
      supports: ['tiger-other-species-visual-pursuit'],
      access: 'abstract',
      checkedAt: '2026-10-17',
    },
    {
      id: 'zurekJaws',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4261868/',
      titleKey: 'sources.zurekJawsTitle',
      supports: ['tiger-other-species-visual-pursuit'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
  ],
  swallowtail: [
    {
      id: 'adwPolytes',
      url: 'https://animaldiversity.org/accounts/Papilio_polytes/',
      titleKey: 'sources.adwPolytesTitle',
      supports: ['swallowtail-traits-and-behavior', 'swallowtail-mimicry-genetics'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'suwarnoPolytes',
      url: 'https://ejournal.usm.my/tlsr/article/download/tlsr_vol18-no-1-2007_4/pdf/1028',
      titleKey: 'sources.suwarnoPolytesTitle',
      supports: ['swallowtail-host-development'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'komataPolytes',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7721872/',
      titleKey: 'sources.komataPolytesTitle',
      supports: ['swallowtail-mimicry-genetics'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
  ],
  'stag-beetle': [
    {
      id: 'koreanHopei',
      url: 'https://koreascience.kr/article/JAKO200411922366300.page',
      titleKey: 'sources.koreanHopeiTitle',
      supports: ['stag-korean-rearing'],
      access: 'abstract',
      checkedAt: '2026-10-17',
    },
    {
      id: 'kyotoHopei',
      url: 'https://www.pref.kyoto.jp/kankyo/rdb2002/bio/db/ins0053.html',
      titleKey: 'sources.kyotoHopeiTitle',
      supports: ['stag-japanese-subspecies-traits'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'liHopei',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11026507/',
      titleKey: 'sources.liHopeiTitle',
      supports: ['stag-chinese-morphology-genome'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'gotohMandibles',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC3120829/',
      titleKey: 'sources.gotohMandiblesTitle',
      supports: ['stag-other-species-jaw-growth'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
  ],
  'mole-cricket': [
    {
      id: 'endoWings',
      url: 'https://www.eje.cz/artkey/eje-200604-0004_seasonal_wing_dimorphism_and_life_cycle_of_the_mole_cricket_gryllotalpa_orientalis_orthoptera_gryllotalpidae.php',
      titleKey: 'sources.endoWingsTitle',
      supports: ['mole-japanese-seasonal-wings'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'hayashiVibrations',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6179226/',
      titleKey: 'sources.hayashiVibrationsTitle',
      supports: ['mole-digging-vibrations'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'endoBurrows',
      url: 'https://doi.org/10.1111/j.1469-7998.2007.00345.x',
      titleKey: 'sources.endoBurrowsTitle',
      supports: ['mole-burrow-functions'],
      access: 'abstract',
      checkedAt: '2026-10-17',
    },
    {
      id: 'moleGutDiet',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11354742/',
      titleKey: 'sources.moleGutDietTitle',
      supports: ['mole-diet-and-crop-damage'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
  ],
  dragonfly: [
    {
      id: 'kotobank-ginyanma',
      url: 'https://kotobank.jp/word/%E3%81%8E%E3%82%93%E3%82%84%E3%82%93%E3%81%BE-3149558',
      titleKey: 'sources.kotobankGinyanmaTitle',
      supports: ['dragonfly-east-asian-taxon-traits'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'hk-wetland-park-anax-julius',
      url: 'https://wetlandpark.gov.hk/en/biodiversity/beauty-of-wetlands/wildlife/anax-julius',
      titleKey: 'sources.hkWetlandParkAnaxJuliusTitle',
      supports: ['dragonfly-east-asian-taxon-traits'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'combes-2012-dragonfly-predation',
      url: 'https://dash.harvard.edu/server/api/core/bitstreams/7312037e-0433-6bd4-e053-0100007fdf3b/content',
      titleKey: 'sources.combesDragonflyPredationTitle',
      supports: ['dragonfly-capture-trials-other-genus'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'wiederman-2017-predictive-focus',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5526664/',
      titleKey: 'sources.wiedermanPredictiveFocusTitle',
      supports: ['dragonfly-predictive-interception-other-genera'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'mischiati-2015-internal-models',
      url: 'https://www.nature.com/articles/nature14045',
      titleKey: 'sources.mischiatiInternalModelsTitle',
      supports: ['dragonfly-predictive-interception-other-genera'],
      access: 'abstract',
      checkedAt: '2026-10-17',
    },
    {
      id: 'cezario-2025-odonata-polarized-vision',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11750933/',
      titleKey: 'sources.cezarioOdonataPolarizedVisionTitle',
      supports: ['dragonfly-odonate-eye-polarization'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
  ],
  'monarch-butterfly': [
    {
      id: 'fws-monarch-profile',
      url: 'https://www.fws.gov/species/monarch-danaus-plexippus',
      titleKey: 'sources.fwsMonarchTitle',
      supports: ['monarch-milkweed-toxins-and-warning', 'monarch-morphology-and-life-cycle', 'monarch-migration-and-navigation'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'monarch-watch-biology',
      url: 'https://monarchwatch.org/biology/',
      titleKey: 'sources.monarchWatchBiologyTitle',
      supports: ['monarch-milkweed-toxins-and-warning', 'monarch-morphology-and-life-cycle', 'monarch-migration-and-navigation'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'guerra-2014-magnetic-compass',
      url: 'https://www.nature.com/articles/ncomms5164',
      titleKey: 'sources.guerraMagneticCompassTitle',
      supports: ['monarch-migration-and-navigation'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'iucn-spc-ruling-2023',
      url: 'https://nc.iucnredlist.org/redlist/content/attachment_files/SPC-Ruling-Monarch_Butterfly-27Sept2023.pdf',
      titleKey: 'sources.iucnSpcRulingTitle',
      supports: ['monarch-iucn-status'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'iucn-red-list-migratory-monarch',
      url: 'https://www.iucnredlist.org/species/194052138/246096271',
      titleKey: 'sources.iucnRedListMonarchTitle',
      supports: ['monarch-iucn-status'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
  ],
  ant: [
    {
      id: 'jant-camponotus-japonicus',
      url: 'http://ant.miyakyo-u.ac.jp/E/Taxo/F80902.html',
      titleKey: 'sources.jantJaponicusTitle',
      supports: ['ant-size-nest-and-range'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
    {
      id: 'watanabe-2023-chc-reception',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9940637/',
      titleKey: 'sources.watanabeChcReceptionTitle',
      supports: ['ant-nestmate-recognition'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'ma-2025-head-phenotypes',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12336421/',
      titleKey: 'sources.maHeadPhenotypesTitle',
      supports: ['ant-worker-subcastes-and-head-color', 'ant-nestmate-recognition', 'ant-size-nest-and-range'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'hasegawa-imai-2012-first-workers',
      url: 'https://link.springer.com/article/10.1007/s10164-011-0298-5',
      titleKey: 'sources.hasegawaFirstWorkersTitle',
      supports: ['ant-claustral-founding'],
      access: 'abstract',
      checkedAt: '2026-10-17',
    },
    {
      id: 'frontiers-2021-honeydew-ant-lactobacillus',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8814368/',
      titleKey: 'sources.frontiersHoneydewAntLactobacillusTitle',
      supports: ['ant-aphid-tending'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
  ],
  cicada: [
    {
      id: 'nutrients-2023-cryptotympana-review',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10574283/',
      titleKey: 'sources.nutrientsCicadaReviewTitle',
      supports: ['cicada-life-history', 'cicada-distribution-pest-uses'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'acta-acustica-1987-sound-apparatus',
      url: 'https://www.jac.ac.cn/cn/article/pdf/preview/10.15949/j.cnki.0371-0025.1987.01.006.pdf',
      titleKey: 'sources.jacSoundApparatusTitle',
      supports: ['cicada-sound-production'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'forest-research-2000-jinhua-outbreak',
      url: 'https://www.aeeisp.com/lykxyj/cn/article/pdf/preview/78edff74-c3dd-4b71-8546-4db5ed9a245a.pdf',
      titleKey: 'sources.jinhuaOutbreakTitle',
      supports: ['cicada-life-history', 'cicada-distribution-pest-uses', 'cicada-periodical-contrast'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'zookeys-2014-final-instar-nymphs',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4137304/',
      titleKey: 'sources.zookeysNymphTitle',
      supports: ['cicada-life-history', 'cicada-distribution-pest-uses'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'mitochondrial-dna-b-2021-mitogenome',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8205032/',
      titleKey: 'sources.mitogenomeTitle',
      supports: ['cicada-distribution-pest-uses'],
      access: 'full-text',
      checkedAt: '2026-10-17',
    },
    {
      id: 'acta-entomologica-2024-development',
      url: 'https://www.insect.org.cn/CN/10.16380/j.kcxb.2024.02.012',
      titleKey: 'sources.actaEntomologicaDevelopmentTitle',
      supports: ['cicada-life-history'],
      access: 'abstract',
      checkedAt: '2026-10-17',
    },
    {
      id: 'illinois-extension-cicadas',
      url: 'https://extension.illinois.edu/insects/cicadas',
      titleKey: 'sources.illinoisCicadasTitle',
      supports: ['cicada-periodical-contrast'],
      access: 'official-page',
      checkedAt: '2026-10-17',
    },
  ],
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
