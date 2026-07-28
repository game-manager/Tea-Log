import { CalendarDays, ChevronRight, UserRound } from 'lucide-react'
import type { Contact } from '../types'
import { formatDate, formatDateTime } from '../utils/date'
import { getStatus } from '../utils/status'
import { StatusBadge } from './StatusBadge'

interface Props {
  contact: Contact
  onClick: () => void
  parent?: boolean
  read?: boolean
}

export function ContactCard({ contact, onClick, parent = false, read }: Props) {
  const status = getStatus(contact)
  return (
    <button className="contact-card" onClick={onClick} type="button">
      <div className="card-topline">
        <div className="badge-row">
          <StatusBadge status={status} parent={parent} />
          <span className="category-badge">{contact.category}</span>
          {parent && read !== undefined && <span className={`read-badge ${read ? 'is-read' : ''}`}>{read ? '閲覧済み' : '未読'}</span>}
        </div>
        <ChevronRight className="card-chevron" size={20} aria-hidden="true" />
      </div>
      <h3>{contact.title}</h3>
      <p className="card-excerpt">{contact.content}</p>
      <div className="card-meta">
        <span><CalendarDays size={15} />対象 {formatDate(contact.targetDate)}</span>
        <span><UserRound size={15} />{contact.authorName}</span>
      </div>
      <div className="confirmation-line">
        <div className="avatar-stack" aria-hidden="true">
          {contact.confirmations.slice(0, 3).map((item, index) => <i key={item.studentId} style={{ zIndex: 3 - index }}>{index + 1}</i>)}
        </div>
        <strong>{contact.confirmations.length}/{contact.totalStudents}人が確認</strong>
        <time>{formatDateTime(contact.postedAt)} 投稿</time>
      </div>
    </button>
  )
}
