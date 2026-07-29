import { AlertTriangle, ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, FilePenLine, FileText, LoaderCircle, Send, Trash2, UserRound, UsersRound, X } from 'lucide-react'
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
  onReportIssue: (reason: string, details: string) => Promise<void>
  canModerate?: boolean
}

const reportReasons = ['聞いた内容と違う', '日時・期限が違う', '持ち物・場所が違う', '内容が古くなった', 'その他']

export function ContactDetailPage({ contact, user, profiles, onBack, onConfirm, onRead, onDelete, onReportIssue, canModerate = false }: Props) {
  const status = getStatus(contact)
  const isParent = user.role === 'parent'
  const hasConfirmed = contact.confirmations.some((item) => item.studentId === user.id)
  const isRead = Boolean(contact.parentReadBy[user.id])
  const [message, setMessage] = useState('')
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState(reportReasons[0])
  const [reportDetails, setReportDetails] = useState('')
  const [reporting, setReporting] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportError, setReportError] = useState('')
  const confirmedStudents = contact.confirmations.map((confirmation) => ({
    ...confirmation,
    name: confirmation.studentName ?? profiles.find((profile) => profile.id === confirmation.studentId)?.name ?? '生徒',
  }))

  const handleConfirm = () => {
    const completed = onConfirm()
    setMessage(completed ? '確認が集まり、クラス確認済みになりました。' : '確認を記録しました。ご協力ありがとうございます。')
  }

  const handleDelete = () => {
    if (window.confirm('この発言を削除しますか？削除した発言は元に戻せません。')) onDelete()
  }

  const submitReport = async () => {
    setReporting(true)
    setReportError('')
    try {
      await onReportIssue(reportReason, reportDetails)
      setReportSent(true)
      setReportOpen(false)
      setMessage('訂正依頼を管理者へ送りました。対応結果は通知でお知らせします。')
    } catch {
      setReportError('訂正依頼を送信できませんでした。同じ内容をすでに報告している場合は、管理者の対応をお待ちください。')
    } finally {
      setReporting(false)
    }
  }

  return (
    <div className="page-shell detail-page">
      <button className="text-back" onClick={onBack}><ArrowLeft size={18} />一覧に戻る</button>
      <article className={`detail-card ${isParent ? 'parent' : ''}`}>
        <div className="detail-topline">
          <div className="badge-row"><StatusBadge status={status} parent={isParent} /><span className="category-badge">{contact.category}</span></div>
          {((!isParent && contact.authorId === user.id) || canModerate) && <button className="delete-button" onClick={handleDelete} aria-label="発言を削除"><Trash2 size={18} />{canModerate && contact.authorId !== user.id ? '管理者として削除' : '削除'}</button>}
        </div>
        <h1>{contact.title}</h1>
        {contact.correctedAt && <div className="correction-banner"><FilePenLine size={17} /><div><strong>管理者により訂正されています</strong><p>{contact.correctionNote}</p><small>第{contact.revision ?? 2}版・{formatDateTime(contact.correctedAt)}更新</small></div></div>}
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
        <section className="report-issue-panel">
          <div><AlertTriangle size={18} /><span><strong>聞いた内容と違いますか？</strong><small>相違がある場合は管理者へ訂正を依頼できます。</small></span></div>
          <button type="button" onClick={() => { setReportOpen(true); setReportError('') }} disabled={reportSent}>{reportSent ? '報告済み' : '内容の相違を報告'}</button>
        </section>
        <SafetyNotice />
      </article>

      {reportOpen && (
        <div className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title">
          <div className="report-dialog-card">
            <button className="report-dialog-close" type="button" onClick={() => setReportOpen(false)} aria-label="閉じる" disabled={reporting}><X size={19} /></button>
            <AlertTriangle size={24} />
            <h2 id="report-title">内容の相違を報告</h2>
            <p>この発言はすぐには変更されません。管理者が内容を確認し、対応結果を通知します。</p>
            <label>相違の種類<select value={reportReason} onChange={(event) => setReportReason(event.target.value)} disabled={reporting}>{reportReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></label>
            <label>詳しい内容<textarea value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} maxLength={300} rows={4} placeholder="正しいと思われる内容や、先生から聞いた内容を入力してください" disabled={reporting} /></label>
            {reportError && <div className="report-error" role="alert">{reportError}</div>}
            <button className="primary-button" type="button" onClick={submitReport} disabled={reporting}>{reporting ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}{reporting ? '送信中…' : '管理者へ送信'}</button>
          </div>
        </div>
      )}

      {message && <div className="success-toast" role="status"><CheckCircle2 size={19} />{message}</div>}
      {!isParent && status !== 'confirmed' && (
        <div className="sticky-action">
          <button className="primary-button" disabled={hasConfirmed} onClick={handleConfirm}><Check size={20} />{hasConfirmed ? '確認済みです' : '内容を確認した'}</button>
          <small>{hasConfirmed ? '同じ発言を複数回確認することはできません' : '先生から聞いた内容と同じ場合に押してください'}</small>
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
