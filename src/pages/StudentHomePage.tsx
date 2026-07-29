import { Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContactCard } from '../components/ContactCard'
import { ContactListToolbar, type CategoryFilter, type ContactSort } from '../components/ContactListToolbar'
import { EmptyState } from '../components/EmptyState'
import type { Contact, ContactStatus, User } from '../types'
import { getStatus } from '../utils/status'
import { daysUntil } from '../utils/date'

const tabs: { value: ContactStatus; label: string }[] = [
  { value: 'unconfirmed', label: '未確認' },
  { value: 'confirming', label: '確認中' },
  { value: 'confirmed', label: '確認済み' },
]

export function StudentHomePage({ user, contacts, onOpen, onCreate }: {
  user: User
  contacts: Contact[]
  onOpen: (id: string) => void
  onCreate: () => void
}) {
  const [tab, setTab] = useState<ContactStatus>('confirming')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<ContactSort>('newest')
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return contacts
      .filter((contact) => getStatus(contact) === tab)
      .filter((contact) => category === 'all' || contact.category === category)
      .filter((contact) => !normalized || `${contact.title} ${contact.content} ${contact.authorName}`.toLowerCase().includes(normalized))
      .sort((a, b) => sort === 'targetDate' ? a.targetDate.localeCompare(b.targetDate) : b.postedAt.localeCompare(a.postedAt))
  }, [category, contacts, query, sort, tab])
  const counts = useMemo(() => Object.fromEntries(tabs.map(({ value }) => [value, contacts.filter((contact) => getStatus(contact) === value).length])), [contacts])
  const upcomingCount = useMemo(() => contacts.filter((contact) => { const days = daysUntil(contact.targetDate); return days >= 0 && days <= 2 }).length, [contacts])

  return (
    <div className="page-shell">
      <section className="page-heading home-heading">
        <div><span className="eyebrow">{user.className}</span><h1>こんにちは、{user.name.split(/\s/)[0]}さん</h1><p>今日も先生の発言を確認しましょう。</p></div>
        <button className="primary-button desktop-create" onClick={onCreate}><Plus size={18} />新しい発言</button>
      </section>

      <section className="summary-strip">
        <Sparkles size={19} />
        <div><strong>{counts.confirming}件の発言が確認中です</strong><span>聞いた内容と同じか確認してください{upcomingCount > 0 ? `・2日以内の予定 ${upcomingCount}件` : ''}</span></div>
      </section>

      <div className="tabs" role="tablist" aria-label="発言の状態">
        {tabs.map((item) => (
          <button key={item.value} className={tab === item.value ? 'active' : ''} onClick={() => setTab(item.value)} role="tab" aria-selected={tab === item.value}>
            {item.label}<span>{counts[item.value]}</span>
          </button>
        ))}
      </div>

      <ContactListToolbar query={query} category={category} sort={sort} onQueryChange={setQuery} onCategoryChange={setCategory} onSortChange={setSort} />

      <section className="card-list" aria-live="polite">
        {filtered.length > 0 ? filtered.map((contact) => <ContactCard key={contact.id} contact={contact} onClick={() => onOpen(contact.id)} />)
          : <EmptyState title="該当する発言はありません" description="新しい発言が届くと、ここに表示されます。" />}
      </section>
      <button className="floating-create" onClick={onCreate} aria-label="新しい発言を作成"><Plus size={24} /></button>
    </div>
  )
}
