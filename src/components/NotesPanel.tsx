import { useEffect, useMemo, useState } from 'react'
import type { Insect } from '../data/types'
import type { FieldNotes } from '../hooks/useFieldNotes'
import { InsectGlyph } from './InsectGlyph'
import s from './NotesPanel.module.css'

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

  const commit = () => onWrite(insect.id, draft)

  return (
    <div className={s.backdrop} onMouseDown={onClose}>
      <div className={`card ${s.sheet}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div>
            <div className={s.title}>观察笔记</div>
            <div className={s.sub}>
              {rows.length > 0 ? `已记录 ${rows.length} 种` : '记下你自己看到的东西'}
            </div>
          </div>
          <button className={s.close} onClick={onClose} aria-label="关闭">
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
            placeholder={`记下${insect.name}的观察：什么时候、在哪儿、看到了什么`}
          />
          <div className={s.editorFoot}>
            <span className={s.hint}>清空内容即删除这条笔记</span>
            <button className={s.save} onClick={commit}>
              保存
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className={s.empty}>
            还没有任何笔记。在上面写下第一条，它会一直留在这台设备上。
          </div>
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
