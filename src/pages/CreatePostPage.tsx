import { ArrowLeft, CalendarDays, LoaderCircle, Send, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Category } from '../types'
import type { NewContactInput } from '../hooks/useTeachersLog'
import { toDateInput } from '../utils/date'

const categories: Category[] = ['持ち物', '宿題', '提出物', '時間割変更', '行事', '部活動', 'その他']

type ModerationNotice = { tone: 'blocked' | 'error'; message: string } | null

export function CreatePostPage({ onBack, onSubmit }: { onBack: () => void; onSubmit: (input: NewContactInput) => void | Promise<void> }) {
  const [form, setForm] = useState<NewContactInput>({ category: '持ち物', title: '', content: '', targetDate: toDateInput(), memo: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isChecking, setIsChecking] = useState(false)
  const [moderationNotice, setModerationNotice] = useState<ModerationNotice>(null)

  const update = (name: keyof NewContactInput, value: string) => {
    setForm((current) => ({ ...current, [name]: value }))
    setModerationNotice(null)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.title.trim()) nextErrors.title = 'タイトルを入力してください'
    if (!form.content.trim()) nextErrors.content = '連絡内容を入力してください'
    if (!form.targetDate) nextErrors.targetDate = '対象日を選択してください'
    setErrors(nextErrors)
    setModerationNotice(null)
    if (Object.keys(nextErrors).length > 0) return

    setIsChecking(true)
    try {
      const { moderateContact } = await import('../services/contentModeration')
      const result = await moderateContact(form)
      if (!result.allowed) {
        setModerationNotice({ tone: 'blocked', message: result.reason })
        return
      }
      await onSubmit(form)
    } catch {
      setModerationNotice({
        tone: 'error',
        message: 'Geminiによる内容確認を完了できませんでした。通信環境を確認して、もう一度お試しください。',
      })
    } finally {
      setIsChecking(false)
    }
  }

  return (
    <div className="page-shell narrow-page">
      <section className="page-heading with-back">
        <button className="back-button" onClick={onBack} aria-label="戻る" disabled={isChecking}><ArrowLeft /></button>
        <div><span className="eyebrow">NEW MESSAGE</span><h1>新しい連絡を作成</h1><p>先生から聞いた内容を、できるだけ具体的に入力してください。</p></div>
      </section>
      <form className="form-card" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="category">カテゴリ <b>必須</b></label>
          <select id="category" value={form.category} onChange={(e) => update('category', e.target.value)} disabled={isChecking}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">タイトル <b>必須</b></label>
          <input id="title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="例：明日の体育の持ち物" maxLength={60} aria-invalid={Boolean(errors.title)} disabled={isChecking} />
          <div className="field-footer"><span className="error-text">{errors.title}</span><small>{form.title.length}/60</small></div>
        </div>
        <div className="field">
          <label htmlFor="content">連絡内容 <b>必須</b></label>
          <textarea id="content" value={form.content} onChange={(e) => update('content', e.target.value)} placeholder="聞いた内容を入力してください" rows={6} maxLength={500} aria-invalid={Boolean(errors.content)} disabled={isChecking} />
          <div className="field-footer"><span className="error-text">{errors.content}</span><small>{form.content.length}/500</small></div>
        </div>
        <div className="field date-field">
          <label htmlFor="targetDate">対象日 <b>必須</b></label>
          <div><CalendarDays size={18} /><input id="targetDate" type="date" value={form.targetDate} onChange={(e) => update('targetDate', e.target.value)} aria-invalid={Boolean(errors.targetDate)} disabled={isChecking} /></div>
          {errors.targetDate && <span className="error-text">{errors.targetDate}</span>}
        </div>
        <div className="field">
          <label htmlFor="memo">メモ <em>任意</em></label>
          <textarea id="memo" value={form.memo} onChange={(e) => update('memo', e.target.value)} placeholder="補足があれば入力してください" rows={3} maxLength={200} disabled={isChecking} />
        </div>
        <div className="ai-moderation-note">
          <ShieldCheck size={18} />
          <div><strong>Geminiで投稿内容を確認します</strong><p>投稿前に学校連絡として不適切な表現がないかを自動判定します。AIの判定は、内容の正確性を保証するものではありません。</p></div>
        </div>
        {moderationNotice && (
          <div className={`moderation-result ${moderationNotice.tone}`} role="alert">
            <ShieldAlert size={19} />
            <div><strong>{moderationNotice.tone === 'blocked' ? 'この内容は投稿できません' : '内容を確認できませんでした'}</strong><p>{moderationNotice.message}</p></div>
          </div>
        )}
        <div className="form-note"><strong>投稿後は「未確認」になります</strong><p>クラスメイト3人以上が確認すると、自動で確認済みになり保護者に共有されます。</p></div>
        <button className="primary-button submit-button" type="submit" disabled={isChecking}>
          {isChecking ? <><LoaderCircle className="spin" size={18} />Geminiが内容を確認中…</> : <><Send size={18} />確認して連絡を投稿する</>}
        </button>
      </form>
    </div>
  )
}
