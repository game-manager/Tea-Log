import { BellRing, CheckCheck, ChevronRight } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import type { AppNotification } from '../types'
import { formatDateTime } from '../utils/date'

export function NotificationsPage({ notifications, onOpen, onRead, onReadAll }: {
  notifications: AppNotification[]
  onOpen: (contactId: string) => void
  onRead: (id: string) => void
  onReadAll: () => void
}) {
  return (
    <div className="page-shell narrow-page">
      <section className="page-heading notification-heading">
        <div><span className="eyebrow">NOTIFICATIONS</span><h1>通知</h1><p>確認や共有に関するお知らせです。</p></div>
        {notifications.some((item) => !item.read) && <button className="ghost-button" onClick={onReadAll}><CheckCheck size={17} />すべて既読</button>}
      </section>
      <section className="notification-list">
        {notifications.length ? notifications.map((item) => (
          <button key={item.id} className={`notification-item ${item.read ? 'read' : ''}`} onClick={() => { onRead(item.id); if (item.contactId) onOpen(item.contactId) }}>
            <span className="notification-icon"><BellRing size={20} /></span>
            <span className="notification-copy"><strong>{item.title}</strong><span>{item.body}</span><time>{formatDateTime(item.createdAt)}</time></span>
            {!item.read && <i className="unread-marker" />}
            <ChevronRight size={18} />
          </button>
        )) : <EmptyState title="通知はありません" description="新しいお知らせが届くと、ここに表示されます。" />}
      </section>
    </div>
  )
}
