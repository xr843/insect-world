import { useId } from 'react'
import { CONTENT_SOURCES, type ContentClaim, type ContentSource } from '../data/contentSources'
import { useT } from '../i18n/useT'
import s from './ContentSources.module.css'

const claimKeys = {
  'locust-asian-subspecies-traits': 'sources.locustAsianTraits',
  'locust-chinese-development': 'sources.locustDevelopment',
  'locust-neurotransmitter-phase-change': 'sources.locustPhaseChange',
  'tiger-japanese-taxon-biology': 'sources.tigerJapaneseBiology',
  'tiger-korean-life-history': 'sources.tigerKoreanLife',
  'tiger-other-species-visual-pursuit': 'sources.tigerOtherVision',
  'swallowtail-traits-and-behavior': 'sources.swallowtailTraits',
  'swallowtail-host-development': 'sources.swallowtailHosts',
  'swallowtail-mimicry-genetics': 'sources.swallowtailMimicry',
  'stag-japanese-subspecies-traits': 'sources.stagJapaneseTraits',
  'stag-korean-rearing': 'sources.stagKoreanRearing',
  'stag-chinese-morphology-genome': 'sources.stagChineseGenome',
  'stag-other-species-jaw-growth': 'sources.stagOtherJawGrowth',
  'mole-japanese-seasonal-wings': 'sources.moleSeasonalWings',
  'mole-digging-vibrations': 'sources.moleDiggingVibrations',
  'mole-burrow-functions': 'sources.moleBurrows',
  'mole-diet-and-crop-damage': 'sources.moleDiet',
  'japanese-subspecies-length': 'sources.length',
  'diet-and-range': 'sources.dietRange',
  'male-combat': 'sources.combat',
  'aphid-predation': 'sources.aphidPredation',
  'adult-length-cornell': 'sources.cornellLength',
  'us-season-and-introduction': 'sources.usSeasonIntroduction',
  'larval-stages-and-native-range': 'sources.larvalStagesRange',
  'reflex-bleeding': 'sources.reflexBleeding',
  'bee-stinging': 'sources.beeStinging',
  'waggle-run-coding': 'sources.waggleCoding',
  'winter-clustering': 'sources.winterClustering',
  'mantis-forelegs-and-eggs': 'sources.mantisForelegsEggs',
  'mantis-us-bird-records': 'sources.mantisBirdRecords',
  'longhorn-beetle-adult-morphology': 'sources.longhornMorphology',
  'longhorn-beetle-life-cycle-and-boring': 'sources.longhornLifeCycle',
  'longhorn-beetle-hosts-and-damage': 'sources.longhornHostsDamage',
  'longhorn-beetle-distribution-and-pathways': 'sources.longhornDistribution',
  'cicada-sound-production': 'sources.cicadaSoundProduction',
  'cicada-life-history': 'sources.cicadaLifeHistory',
  'cicada-distribution-pest-uses': 'sources.cicadaDistributionPestUses',
  'cicada-periodical-contrast': 'sources.cicadaPeriodicalContrast',
  'ant-worker-subcastes-and-head-color': 'sources.antWorkerSubcastes',
  'ant-nestmate-recognition': 'sources.antNestmateRecognition',
  'ant-size-nest-and-range': 'sources.antSizeNestRange',
  'ant-claustral-founding': 'sources.antClaustralFounding',
  'ant-aphid-tending': 'sources.antAphidTending',
  'monarch-milkweed-toxins-and-warning': 'sources.monarchMilkweedToxins',
  'monarch-morphology-and-life-cycle': 'sources.monarchLifeCycle',
  'monarch-migration-and-navigation': 'sources.monarchMigrationNavigation',
  'monarch-iucn-status': 'sources.monarchIucnStatus',
  'dragonfly-east-asian-taxon-traits': 'sources.dragonflyEastAsianTaxonTraits',
  'dragonfly-capture-trials-other-genus': 'sources.dragonflyCaptureTrialsOtherGenus',
  'dragonfly-predictive-interception-other-genera': 'sources.dragonflyPredictiveInterception',
  'dragonfly-odonate-eye-polarization': 'sources.dragonflyOdonateEyePolarization',
} as const satisfies Record<ContentClaim, string>

const accessKeys = {
  'full-text': 'sources.fullText',
  'official-page': 'sources.officialPage',
  abstract: 'sources.abstract',
} as const satisfies Record<ContentSource['access'], string>

export function ContentSources({ insectId }: { insectId: string }) {
  const t = useT()
  const headingId = useId()
  const sources = CONTENT_SOURCES[insectId]
  return (
    <section className={s.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={s.title}>{t('sources.title')}</h2>
      {sources?.length ? (
        <>
          <p className={s.notice}>{t('sources.limits')}</p>
          <ul className={s.list}>
            {sources.map(source => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">{t(source.titleKey)}</a>
                <p className={s.scope}>
                  {t('sources.supports', { facts: source.supports.map(claim => t(claimKeys[claim])).join(t('sources.separator')) })}
                </p>
                <p className={s.checked}>
                  {t(accessKeys[source.access])}
                  {' · '}{t('sources.checkedAt', { date: source.checkedAt })}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : <p className={s.notice}>{t('sources.pending')}</p>}
    </section>
  )
}
