import { MailCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContactCard } from '../components/ContactCard'
import { EmptyState } from '../components/EmptyState'
import type { Contact, User } from '../types'

type ParentTab = 'all' | 'unread' | 'read'

export function ParentHomePage({ user, contacts, onOpen }: { user: User; contacts: Contact[]; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<ParentTab>('all')
  const confirmed = useMemo(() => contacts.filter((contact) => Boolean(contact.confirmedAt)), [contacts])
  const filtered = useMemo(() => confirmed.filter((contact) => {
    if (tab === 'unread') return !contact.parentReadBy[user.id]
    if (tab === 'read') return Boolean(contact.parentReadBy[user.id])
    return true
  }), [confirmed, tab, user.id])
  const unreadCount = confirmed.filter((contact) => !contact.parentReadBy[user.id]).length

  return (
    <div className="page-shell parent-shell">
      <section className="page-heading home-heading">
        <div><span className="eyebrow">{user.className}</span><h1>学校からの連絡</h1><p>{user.childName}さんのクラスで確認された連絡です。</p></div>
      </section>
      {unreadCount > 0 && <section className="summary-strip parent-summary"><MailCheck size={20} /><div><strong>未読の連絡が{unreadCount}件あります</strong><span>内容を確認して閲覧済みにしましょう</span></div></section>}
      <div className="tabs parent-tabs" role="tablist">
        {([['all', 'すべて'], ['unread', '未読'], ['read', '確認済み']] as const).map(([value, label]) => (
          <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}<span>{value === 'all' ? confirmed.length : value === 'unread' ? unreadCount : confirmed.length - unreadCount}</span></button>
        ))}
      </div>
      <p className="parent-status-note">「確認済み」は、保護者の方が閲覧済みという意味です。</p>
      <section className="card-list">
        {filtered.length ? filtered.map((contact) => <ContactCard key={contact.id} contact={contact} parent read={Boolean(contact.parentReadBy[user.id])} onClick={() => onOpen(contact.id)} />)
          : <EmptyState title="該当する連絡はありません" description="クラス確認済みの連絡だけがここに表示されます。" />}
      </section>
    </div>
  )
}
