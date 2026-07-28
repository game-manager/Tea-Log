import { CheckCircle2, Clock3, PenLine } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContactCard } from '../components/ContactCard'
import { EmptyState } from '../components/EmptyState'
import type { Contact, User } from '../types'

type StudentHistoryTab = 'posted' | 'checked' | 'completed'

export function HistoryPage({ user, contacts, onOpen }: { user: User; contacts: Contact[]; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<StudentHistoryTab>('posted')
  const isParent = user.role === 'parent'
  const tabs = [
    { value: 'posted' as const, label: '投稿した', icon: PenLine },
    { value: 'checked' as const, label: '確認した', icon: CheckCircle2 },
    { value: 'completed' as const, label: '確認済み', icon: Clock3 },
  ]
  const filtered = useMemo(() => {
    if (isParent) return contacts.filter((contact) => contact.confirmedAt)
    if (tab === 'posted') return contacts.filter((contact) => contact.authorId === user.id)
    if (tab === 'checked') return contacts.filter((contact) => contact.confirmations.some((item) => item.studentId === user.id))
    return contacts.filter((contact) => contact.confirmedAt)
  }, [contacts, isParent, tab, user.id])

  return (
    <div className="page-shell">
      <section className="page-heading"><div><span className="eyebrow">ARCHIVE</span><h1>{isParent ? '過去の学校連絡' : '連絡の履歴'}</h1><p>{isParent ? 'クラス確認済みになった連絡を振り返れます。' : '投稿・確認した連絡と、その日時を確認できます。'}</p></div></section>
      {!isParent && <div className="tabs history-tabs" role="tablist">
        {tabs.map(({ value, label, icon: Icon }) => <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}><Icon size={16} />{label}</button>)}
      </div>}
      <section className="card-list">
        {filtered.length ? filtered.map((contact) => {
          const confirmation = contact.confirmations.find((item) => item.studentId === user.id)
          return <div className="history-item" key={contact.id}>
            <ContactCard contact={contact} onClick={() => onOpen(contact.id)} parent={isParent} read={isParent ? Boolean(contact.parentReadBy[user.id]) : undefined} />
            {!isParent && confirmation && <span className="history-time"><CheckCircle2 size={14} />あなたの確認日時：{new Date(confirmation.confirmedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        }) : <EmptyState title="履歴はまだありません" description="該当する連絡ができると、ここに表示されます。" />}
      </section>
    </div>
  )
}
