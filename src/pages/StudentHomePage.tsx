import { Plus, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ContactCard } from '../components/ContactCard'
import { EmptyState } from '../components/EmptyState'
import type { Contact, ContactStatus, User } from '../types'
import { getStatus } from '../utils/status'

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
  const filtered = useMemo(() => contacts.filter((contact) => getStatus(contact) === tab), [contacts, tab])
  const counts = useMemo(() => Object.fromEntries(tabs.map(({ value }) => [value, contacts.filter((contact) => getStatus(contact) === value).length])), [contacts])

  return (
    <div className="page-shell">
      <section className="page-heading home-heading">
        <div><span className="eyebrow">{user.className}</span><h1>こんにちは、{user.name.split(/\s/)[0]}さん</h1><p>今日もクラスの連絡を確認しましょう。</p></div>
        <button className="primary-button desktop-create" onClick={onCreate}><Plus size={18} />新しい連絡</button>
      </section>

      <section className="summary-strip">
        <Sparkles size={19} />
        <div><strong>{counts.confirming}件の連絡が確認中です</strong><span>聞いた内容と同じか確認してください</span></div>
      </section>

      <div className="tabs" role="tablist" aria-label="連絡の状態">
        {tabs.map((item) => (
          <button key={item.value} className={tab === item.value ? 'active' : ''} onClick={() => setTab(item.value)} role="tab" aria-selected={tab === item.value}>
            {item.label}<span>{counts[item.value]}</span>
          </button>
        ))}
      </div>

      <section className="card-list" aria-live="polite">
        {filtered.length > 0 ? filtered.map((contact) => <ContactCard key={contact.id} contact={contact} onClick={() => onOpen(contact.id)} />)
          : <EmptyState title="該当する連絡はありません" description="新しい連絡が届くと、ここに表示されます。" />}
      </section>
      <button className="floating-create" onClick={onCreate} aria-label="新しい連絡を作成"><Plus size={24} /></button>
    </div>
  )
}
