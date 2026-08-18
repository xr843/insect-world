/**
 * @vitest-environment jsdom
 *
 * 笔记写入埋点：正文真的改了才报（单纯失焦、内容没变不算一次写入），
 * 且只报「是不是清空了」这个布尔，绝不上报正文本身。
 */
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderZh } from '../../i18n/testing'
import { NotesPanel } from '../NotesPanel'
import { INSECTS } from '../../data/insects.zh'
import type { FieldNotes } from '../../hooks/useFieldNotes'

vi.mock('../../analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../analytics')>()
  return { ...actual, track: vi.fn() }
})

import { EVENTS, track } from '../../analytics'

const trackMock = vi.mocked(track)
const ladybird = INSECTS.find((i) => i.id === 'ladybird')!

afterEach(() => {
  cleanup()
  trackMock.mockClear()
})

function mount(notes: FieldNotes = {}) {
  const onWrite = vi.fn()
  renderZh(
    <NotesPanel
      insect={ladybird}
      insects={INSECTS}
      notes={notes}
      onWrite={onWrite}
      onSelect={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  return { onWrite }
}

const PRIVATE_TEXT = '这是一条不能被上报的私密观察笔记'

describe('笔记写入 —— note_write(cleared)', () => {
  it('正文真的改了，保存时上报 cleared: false', () => {
    const { onWrite } = mount()
    const textarea = screen.getByPlaceholderText(/记下/)
    fireEvent.change(textarea, { target: { value: '腹部有七个黑点' } })
    fireEvent.click(screen.getByText('保存'))
    expect(onWrite).toHaveBeenCalledWith('ladybird', '腹部有七个黑点')
    expect(trackMock).toHaveBeenCalledWith(EVENTS.NOTE_WRITE, { cleared: false })
  })

  it('清空既有正文后保存，上报 cleared: true', () => {
    const { onWrite } = mount({ ladybird: { text: '旧笔记', at: 1 } })
    const textarea = screen.getByDisplayValue('旧笔记')
    fireEvent.change(textarea, { target: { value: '' } })
    fireEvent.click(screen.getByText('保存'))
    expect(onWrite).toHaveBeenCalledWith('ladybird', '')
    expect(trackMock).toHaveBeenCalledWith(EVENTS.NOTE_WRITE, { cleared: true })
  })

  it('单纯失焦、没有改动正文，不上报（onBlur 也走 commit，不能见空就报）', () => {
    mount({ ladybird: { text: '旧笔记', at: 1 } })
    const textarea = screen.getByDisplayValue('旧笔记')
    fireEvent.blur(textarea)
    expect(trackMock).not.toHaveBeenCalled()
  })

  it('不上报笔记正文本身 —— 隐私要求，只报布尔值', () => {
    mount()
    const textarea = screen.getByPlaceholderText(/记下/)
    fireEvent.change(textarea, { target: { value: PRIVATE_TEXT } })
    fireEvent.click(screen.getByText('保存'))
    expect(trackMock).toHaveBeenCalled()
    for (const call of trackMock.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(PRIVATE_TEXT)
    }
  })
})
