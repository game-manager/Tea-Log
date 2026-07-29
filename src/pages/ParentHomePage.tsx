import { MailCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContactCard } from '../components/ContactCard'
import { ContactListToolbar, type CategoryFilter, type ContactSort } from '../components/ContactListToolbar'
import { EmptyState } from '../components/EmptyState'
import type { Contact, User } from '../types'

type ParentTab = 'all' | 'unread' | 'read'

export function ParentHomePage({ user, contacts, onOpen }: { user: User; contacts: Contact[]; onOpen: (id: string) => void }) {
  const [tab, setTab] = useState<ParentTab>('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<ContactSort>('newest')
  const confirmed = useMemo(() => contacts.filter((contact) => Boolean(contact.confirmedAt)), [contacts])
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return confirmed.filter((contact) => {
      if (tab === 'unread') return !contact.parentReadBy[user.id]
      if (tab === 'read') return Boolean(contact.parentReadBy[user.id])
      return true
    }).filter((contact) => category === 'all' || contact.category === category)
      .filter((contact) => !normalized || `${contact.title} ${contact.content} ${contact.authorName}`.toLowerCase().includes(normalized))
      .sort((a, b) => sort === 'targetDate' ? a.targetDate.localeCompare(b.targetDate) : b.postedAt.localeCompare(a.postedAt))
  }, [category, confirmed, query, sort, tab, user.id])
  const unreadCount = confirmed.filter((contact) => !contact.parentReadBy[user.id]).length

  return (
    <div className="page-shell parent-shell">
      <section className="page-heading home-heading">
        <div><span className="eyebrow">{user.className}</span><h1>先生の発言</h1><p>{user.childName ? `${user.childName}さんの` : ''}クラスで確認された発言です。</p></div>
      </section>
      {unreadCount > 0 && <section className="summary-strip parent-summary"><MailCheck size={20} /><div><strong>未読の発言が{unreadCount}件あります</strong><span>内容を確認して閲覧済みにしましょう</span></div></section>}
      <div className="tabs parent-tabs" role="tablist">
        {([['all', 'すべて'], ['unread', '未読'], ['read', '確認済み']] as const).map(([value, label]) => (
          <button key={value} className={tab === value ? 'active' : ''} onClick={() => setTab(value)}>{label}<span>{value === 'all' ? confirmed.length : value === 'unread' ? unreadCount : confirmed.length - unreadCount}</span></button>
        ))}
      </div>
      <p className="parent-status-note">「確認済み」は、保護者の方が閲覧済みという意味です。</p>
      <ContactListToolbar query={query} category={category} sort={sort} onQueryChange={setQuery} onCategoryChange={setCategory} onSortChange={setSort} />
      <section className="card-list">
        {filtered.length ? filtered.map((contact) => <ContactCard key={contact.id} contact={contact} parent read={Boolean(contact.parentReadBy[user.id])} onClick={() => onOpen(contact.id)} />)
          : <EmptyState title="該当する発言はありません" description="クラス確認済みの発言だけがここに表示されます。" />}
      </section>
    </div>
  )
}
