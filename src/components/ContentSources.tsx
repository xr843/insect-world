import { useId } from 'react'
import { CONTENT_SOURCES, type ContentClaim, type ContentSource } from '../data/contentSources'
import { useT } from '../i18n/useT'
import s from './ContentSources.module.css'

const claimKeys = {
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
