import { ArrowLeft, CalendarDays, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Category } from '../types'
import type { NewContactInput } from '../hooks/useTeachersLog'
import { toDateInput } from '../utils/date'

const categories: Category[] = ['持ち物', '宿題', '提出物', '時間割変更', '行事', '部活動', 'その他']

export function CreatePostPage({ onBack, onSubmit }: { onBack: () => void; onSubmit: (input: NewContactInput) => void }) {
  const [form, setForm] = useState<NewContactInput>({ category: '持ち物', title: '', content: '', targetDate: toDateInput(), memo: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (name: keyof NewContactInput, value: string) => setForm((current) => ({ ...current, [name]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.title.trim()) nextErrors.title = 'タイトルを入力してください'
    if (!form.content.trim()) nextErrors.content = '連絡内容を入力してください'
    if (!form.targetDate) nextErrors.targetDate = '対象日を選択してください'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length === 0) onSubmit(form)
  }

  return (
    <div className="page-shell narrow-page">
      <section className="page-heading with-back">
        <button className="back-button" onClick={onBack} aria-label="戻る"><ArrowLeft /></button>
        <div><span className="eyebrow">NEW MESSAGE</span><h1>新しい連絡を作成</h1><p>先生から聞いた内容を、できるだけ具体的に入力してください。</p></div>
      </section>
      <form className="form-card" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="category">カテゴリ <b>必須</b></label>
          <select id="category" value={form.category} onChange={(e) => update('category', e.target.value)}>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="title">タイトル <b>必須</b></label>
          <input id="title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="例：明日の体育の持ち物" maxLength={60} aria-invalid={Boolean(errors.title)} />
          <div className="field-footer"><span className="error-text">{errors.title}</span><small>{form.title.length}/60</small></div>
        </div>
        <div className="field">
          <label htmlFor="content">連絡内容 <b>必須</b></label>
          <textarea id="content" value={form.content} onChange={(e) => update('content', e.target.value)} placeholder="聞いた内容を入力してください" rows={6} maxLength={500} aria-invalid={Boolean(errors.content)} />
          <div className="field-footer"><span className="error-text">{errors.content}</span><small>{form.content.length}/500</small></div>
        </div>
        <div className="field date-field">
          <label htmlFor="targetDate">対象日 <b>必須</b></label>
          <div><CalendarDays size={18} /><input id="targetDate" type="date" value={form.targetDate} onChange={(e) => update('targetDate', e.target.value)} aria-invalid={Boolean(errors.targetDate)} /></div>
          {errors.targetDate && <span className="error-text">{errors.targetDate}</span>}
        </div>
        <div className="field">
          <label htmlFor="memo">メモ <em>任意</em></label>
          <textarea id="memo" value={form.memo} onChange={(e) => update('memo', e.target.value)} placeholder="補足があれば入力してください" rows={3} maxLength={200} />
        </div>
        <div className="form-note"><strong>投稿後は「未確認」になります</strong><p>クラスメイト3人以上が確認すると、自動で確認済みになり保護者に共有されます。</p></div>
        <button className="primary-button submit-button" type="submit"><Send size={18} />連絡を投稿する</button>
      </form>
    </div>
  )
}
