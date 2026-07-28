import { Bot, CheckCircle2, Clock3, LoaderCircle, ShieldAlert, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ModerationReview, ModerationReviewStatus } from '../types'
import { formatDate, formatDateTime } from '../utils/date'

type ReviewFilter = 'pending' | 'all' | 'approved' | 'rejected'

interface Props {
  reviews: ModerationReview[]
  loading: boolean
  processingId: string
  error: string
  onApprove: (reviewId: string) => Promise<void>
  onReject: (reviewId: string, reason: string) => Promise<void>
}

const statusLabel: Record<ModerationReviewStatus, string> = {
  pending: '審査待ち',
  approved: '承認済み',
  rejected: '却下済み',
}

function ReviewCard({ review, processing, onApprove, onReject }: {
  review: ModerationReview
  processing: boolean
  onApprove: (reviewId: string) => Promise<void>
  onReject: (reviewId: string, reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')

  const approve = async () => {
    if (!window.confirm(`「${review.title}」を未確認の発言として公開しますか？`)) return
    try { await onApprove(review.id) } catch { /* the queue-level error message is displayed */ }
  }

  const reject = async () => {
    if (!reason.trim() || !window.confirm(`「${review.title}」を却下しますか？`)) return
    try { await onReject(review.id, reason) } catch { /* the queue-level error message is displayed */ }
  }

  return (
    <article className={`admin-review-card ${review.status}`}>
      <div className="admin-review-card-head">
        <div className="admin-review-flags">
          <span className={`admin-review-status ${review.status}`}>{statusLabel[review.status]}</span>
          <span>{review.className}</span>
          <span>{review.category}</span>
        </div>
        <time>{formatDateTime(review.submittedAt)}</time>
      </div>
      <h3>{review.title}</h3>
      <p className="admin-review-content">{review.content}</p>
      {review.memo && <p className="admin-review-memo"><strong>メモ：</strong>{review.memo}</p>}
      <dl className="admin-review-meta">
        <div><dt>入力者</dt><dd>{review.authorName}<small>{review.authorEmail}</small></dd></div>
        <div><dt>対象日</dt><dd>{formatDate(review.targetDate, true)}</dd></div>
      </dl>
      <div className="admin-ai-judgement">
        <Bot size={17} />
        <div><strong>Gemini判定：{review.aiCategory}</strong><p>{review.aiReason}</p></div>
      </div>
      {review.status === 'pending' ? (
        <div className="admin-review-actions">
          <label>却下理由<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} rows={2} placeholder="投稿者に通知する理由を入力" disabled={processing} /></label>
          <div>
            <button className="admin-reject-button" type="button" onClick={reject} disabled={processing || !reason.trim()}><XCircle size={16} />却下</button>
            <button className="admin-approve-button" type="button" onClick={approve} disabled={processing}>{processing ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}承認して公開</button>
          </div>
        </div>
      ) : (
        <div className={`admin-review-decision ${review.status}`}>
          {review.status === 'approved' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
          <div><strong>{review.reviewedByName ?? '管理者'}が{statusLabel[review.status]}</strong><p>{review.decisionReason}</p>{review.reviewedAt && <time>{formatDateTime(review.reviewedAt)}</time>}</div>
        </div>
      )}
    </article>
  )
}

export function AdminModerationQueue({ reviews, loading, processingId, error, onApprove, onReject }: Props) {
  const [filter, setFilter] = useState<ReviewFilter>('pending')
  const counts = useMemo(() => ({
    all: reviews.length,
    pending: reviews.filter((review) => review.status === 'pending').length,
    approved: reviews.filter((review) => review.status === 'approved').length,
    rejected: reviews.filter((review) => review.status === 'rejected').length,
  }), [reviews])
  const visible = filter === 'all' ? reviews : reviews.filter((review) => review.status === filter)

  return (
    <section className="admin-review-section">
      <div className="admin-section-heading">
        <div><h2>AI判定後の管理者審査</h2><p>Geminiが投稿不可と判定した内容です。人の目で確認し、公開または却下してください。</p></div>
        <span>{counts.pending}件待ち</span>
      </div>
      <div className="admin-review-tabs" role="tablist" aria-label="審査状態">
        {([
          ['pending', '審査待ち'], ['all', 'すべて'], ['approved', '承認済み'], ['rejected', '却下済み'],
        ] as const).map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} role="tab" aria-selected={filter === value}>{label}<b>{counts[value]}</b></button>)}
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {loading ? <div className="admin-review-empty"><LoaderCircle className="spin" size={20} />審査キューを読み込んでいます…</div> : (
        <div className="admin-review-list">
          {visible.map((review) => <ReviewCard key={review.id} review={review} processing={processingId === review.id} onApprove={onApprove} onReject={onReject} />)}
          {!visible.length && <div className="admin-review-empty">{filter === 'pending' ? <><ShieldAlert size={20} />現在、審査待ちの発言はありません。</> : <><Clock3 size={20} />この状態の審査履歴はありません。</>}</div>}
        </div>
      )}
    </section>
  )
}
