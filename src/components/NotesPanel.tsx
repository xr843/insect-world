import { useEffect, useMemo, useState } from 'react'
import type { Insect } from '../data/types'
import type { FieldNotes } from '../hooks/useFieldNotes'
import { InsectGlyph } from './InsectGlyph'
import s from './NotesPanel.module.css'
import { useT } from '../i18n/useT'
import { EVENTS, track } from '../analytics'

/** 关掉弹层的通用行为：Esc 键 + 打开时锁住背景滚动 */
function useDismiss(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
}

/**
 * 观察笔记面板。
 *
 * 顶部直接给当前这只虫留一块空白，是为了让「笔记」这个入口自己就能用完整流程 ——
 * 不必先去别处点一个「加入笔记」再回来写。清空正文即删除该条，
 * 所以列表里不再单设删除按钮。
 */
export function NotesPanel({
  insect,
  insects,
  notes,
  onWrite,
  onSelect,
  onClose,
}: {
  insect: Insect
  insects: Insect[]
  notes: FieldNotes
  onWrite: (id: string, text: string) => void
  onSelect: (id: string) => void
  onClose: () => void
}) {
  useDismiss(onClose)
  const t = useT()

  const [draft, setDraft] = useState(notes[insect.id]?.text ?? '')
  // 换物种时把草稿换成那只虫的笔记，避免把甲的观察写到乙名下
  useEffect(() => {
    setDraft(notes[insect.id]?.text ?? '')
    // notes 变化不该冲掉正在输入的内容，所以只跟着 insect.id 走
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insect.id])

  const byId = useMemo(() => new Map(insects.map((i) => [i.id, i])), [insects])
  const rows = useMemo(
    () =>
      Object.entries(notes)
        .filter(([id]) => byId.has(id))
        .sort((a, b) => b[1].at - a[1].at),
    [notes, byId],
  )

  /**
   * commit 也挂在 textarea 的 onBlur 上 —— 单纯点一下别处失焦、正文没改
   * 不该算一次「写入」，所以先跟上一次存的文本比一下，真有变化才报。
   * 只报是不是清空了（cleared），不报正文本身：笔记内容是用户写的自由
   * 文本，属于隐私要求里明确不能上报的那一类。
   */
  const commit = () => {
    const prevText = notes[insect.id]?.text ?? ''
    if (draft !== prevText) track(EVENTS.NOTE_WRITE, { cleared: draft.trim().length === 0 })
    onWrite(insect.id, draft)
  }

  return (
    <div className={s.backdrop} onMouseDown={onClose}>
      <div className={`card ${s.sheet}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <div className={s.title}>{t('notes.title')}</div>
            <div className={s.sub}>
              {rows.length > 0
                ? t('notes.recordedCount', { n: rows.length })
                : t('notes.subtitleEmpty')}
            </div>
          </div>
          <button className={s.close} onClick={onClose} aria-label={t('common.close')}>
            ×
          </button>
        </div>

        <div className={s.editor}>
          <div className={s.editorHead}>
            <span className={s.thumb} style={{ background: `${insect.accent}1f` }}>
              <InsectGlyph id={insect.id} size={20} color={insect.accent} />
            </span>
            <span className={s.editorName}>{insect.name}</span>
          </div>
          <textarea
            className={s.textarea}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            rows={3}
            placeholder={t('notes.placeholder', { name: insect.name })}
          />
          <div className={s.editorFoot}>
            <span className={s.hint}>{t('notes.hint')}</span>
            <button className={s.save} onClick={commit}>
              {t('notes.save')}
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={s.empty}>{t('notes.emptyList')}</div>
        ) : (
          <div className={s.list}>
            {rows.map(([id, note]) => {
              const i = byId.get(id)!
              return (
                <button
                  key={id}
                  className={s.row}
                  data-current={id === insect.id}
                  onClick={() => {
                    onSelect(id)
                    onClose()
                  }}
                >
                  <span className={s.thumb} style={{ background: `${i.accent}1f` }}>
                    <InsectGlyph id={id} size={20} color={i.accent} />
                  </span>
                  <span className={s.rowBody}>
                    <span className={s.rowName}>{i.name}</span>
                    <span className={s.rowText}>{note.text}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
