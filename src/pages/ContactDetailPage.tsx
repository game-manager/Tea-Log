import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, FileText, Trash2, UserRound, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { SafetyNotice } from '../components/SafetyNotice'
import { StatusBadge } from '../components/StatusBadge'
import type { Contact, User } from '../types'
import { formatDate, formatDateTime } from '../utils/date'
import { getStatus } from '../utils/status'

interface Props {
  contact: Contact
  user: User
  profiles: User[]
  onBack: () => void
  onConfirm: () => boolean
  onRead: () => void
  onDelete: () => void
}

export function ContactDetailPage({ contact, user, profiles, onBack, onConfirm, onRead, onDelete }: Props) {
  const status = getStatus(contact)
  const isParent = user.role === 'parent'
  const hasConfirmed = contact.confirmations.some((item) => item.studentId === user.id)
  const isRead = Boolean(contact.parentReadBy[user.id])
  const [message, setMessage] = useState('')
  const confirmedStudents = contact.confirmations.map((confirmation) => ({
    ...confirmation,
    name: confirmation.studentName ?? profiles.find((profile) => profile.id === confirmation.studentId)?.name ?? '生徒',
  }))

  const handleConfirm = () => {
    const completed = onConfirm()
    setMessage(completed ? '確認が集まり、クラス確認済みになりました。' : '確認を記録しました。ご協力ありがとうございます。')
  }

  const handleDelete = () => {
    if (window.confirm('この連絡を削除しますか？削除した連絡は元に戻せません。')) onDelete()
  }

  return (
    <div className="page-shell detail-page">
      <button className="text-back" onClick={onBack}><ArrowLeft size={18} />一覧に戻る</button>
      <article className={`detail-card ${isParent ? 'parent' : ''}`}>
        <div className="detail-topline">
          <div className="badge-row"><StatusBadge status={status} parent={isParent} /><span className="category-badge">{contact.category}</span></div>
          {!isParent && contact.authorId === user.id && <button className="delete-button" onClick={handleDelete} aria-label="連絡を削除"><Trash2 size={18} />削除</button>}
        </div>
        <h1>{contact.title}</h1>
        <p className="detail-content">{contact.content}</p>
        {contact.memo && <div className="memo-box"><FileText size={18} /><div><strong>メモ</strong><p>{contact.memo}</p></div></div>}
        <dl className="detail-meta-grid">
          <div><dt><CalendarDays />対象日</dt><dd>{formatDate(contact.targetDate, true)}</dd></div>
          <div><dt><Clock3 />投稿日時</dt><dd>{formatDateTime(contact.postedAt)}</dd></div>
          <div><dt><UserRound />入力した生徒</dt><dd>{contact.authorName}</dd></div>
          <div><dt><UsersRound />確認人数</dt><dd>{contact.confirmations.length}/{contact.totalStudents}人</dd></div>
        </dl>

        <section className="verification-panel">
          <div className="verification-heading">
            <div><span>クラスの確認状況</span><strong>{contact.confirmations.length}<small> / {contact.totalStudents}人</small></strong></div>
            <div className="progress-ring" style={{ '--progress': `${Math.min(100, (contact.confirmations.length / contact.requiredConfirmations) * 100)}%` } as React.CSSProperties}><span>{Math.min(contact.confirmations.length, contact.requiredConfirmations)}/{contact.requiredConfirmations}</span></div>
          </div>
          <div className="progress-track"><i style={{ width: `${Math.min(100, (contact.confirmations.length / contact.requiredConfirmations) * 100)}%` }} /></div>
          <p>{status === 'confirmed' ? `必要な${contact.requiredConfirmations}人の確認が集まりました` : `確認済みまであと${Math.max(0, contact.requiredConfirmations - contact.confirmations.length)}人です`}</p>
          {!isParent && (
            <div className="student-confirmations">
              {confirmedStudents.map((student) => (
                <div key={student.studentId}><span className="mini-avatar">{student.name.slice(0, 1)}</span><span><strong>{student.name}</strong><small>{formatDateTime(student.confirmedAt)} 確認</small></span><CheckCircle2 size={18} /></div>
              ))}
              <div className="remaining-row"><UsersRound size={18} />まだ確認していない生徒：{Math.max(0, contact.totalStudents - contact.confirmations.length)}人</div>
            </div>
          )}
        </section>
        <SafetyNotice />
      </article>

      {message && <div className="success-toast" role="status"><CheckCircle2 size={19} />{message}</div>}
      {!isParent && status !== 'confirmed' && (
        <div className="sticky-action">
          <button className="primary-button" disabled={hasConfirmed} onClick={handleConfirm}><Check size={20} />{hasConfirmed ? '確認済みです' : '内容を確認した'}</button>
          <small>{hasConfirmed ? '同じ連絡を複数回確認することはできません' : '先生から聞いた内容と同じ場合に押してください'}</small>
        </div>
      )}
      {isParent && (
        <div className="sticky-action parent-action">
          <button className="primary-button" disabled={isRead} onClick={() => { onRead(); setMessage('閲覧済みにしました。') }}><Check size={20} />{isRead ? '閲覧済みです' : '閲覧済みにする'}</button>
        </div>
      )}
    </div>
  )
}
