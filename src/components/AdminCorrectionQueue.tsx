import { CheckCircle2, Clock3, FilePenLine, LoaderCircle, MessageSquareWarning, XCircle } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CorrectionDecisionInput } from '../hooks/useCorrectionReports'
import type { CorrectionReport, CorrectionReportStatus } from '../types'
import { formatDateTime } from '../utils/date'

type ReportFilter = 'pending' | 'all' | 'corrected' | 'dismissed'

interface Props {
  reports: CorrectionReport[]
  loading: boolean
  processingId: string
  error: string
  onCorrect: (reportId: string, input: CorrectionDecisionInput) => Promise<void>
  onDismiss: (reportId: string, note: string) => Promise<void>
}

const statusLabel: Record<CorrectionReportStatus, string> = {
  pending: '対応待ち',
  corrected: '訂正済み',
  dismissed: '変更なし',
}

function ReportCard({ report, processing, onCorrect, onDismiss }: {
  report: CorrectionReport
  processing: boolean
  onCorrect: Props['onCorrect']
  onDismiss: Props['onDismiss']
}) {
  const [form, setForm] = useState<CorrectionDecisionInput>({
    ...report.reportedContact,
    decisionNote: '',
  })
  const update = (name: keyof CorrectionDecisionInput, value: string) => setForm((current) => ({ ...current, [name]: value }))

  const correct = async () => {
    if (!window.confirm(`「${report.contactTitle}」を訂正し、クラス全員へ通知しますか？`)) return
    try { await onCorrect(report.id, form) } catch { /* the section-level error is displayed */ }
  }

  const dismiss = async () => {
    if (!form.decisionNote.trim() || !window.confirm('内容を変更せず、この訂正依頼を完了しますか？')) return
    try { await onDismiss(report.id, form.decisionNote) } catch { /* the section-level error is displayed */ }
  }

  return (
    <article className={`admin-correction-card ${report.status}`}>
      <div className="admin-review-card-head">
        <div className="admin-review-flags">
          <span className={`admin-correction-status ${report.status}`}>{statusLabel[report.status]}</span>
          <span>{report.className}</span><span>第{report.contactRevision}版</span>
        </div>
        <time>{formatDateTime(report.submittedAt)}</time>
      </div>
      <h3>{report.contactTitle}</h3>
      <div className="correction-request-copy">
        <MessageSquareWarning size={18} />
        <div><strong>{report.reason}</strong><p>{report.details || '補足はありません。'}</p><small>{report.reporterName}（{report.reporterRole === 'parent' ? '保護者' : '生徒'}）</small></div>
      </div>
      {report.status === 'pending' ? (
        <div className="correction-editor">
          <div className="correction-fields">
            <label>タイトル<input value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={60} disabled={processing} /></label>
            <label>対象日<input type="date" value={form.targetDate} onChange={(event) => update('targetDate', event.target.value)} disabled={processing} /></label>
            <label className="wide">発言内容<textarea value={form.content} onChange={(event) => update('content', event.target.value)} maxLength={500} rows={4} disabled={processing} /></label>
            <label className="wide">メモ<textarea value={form.memo} onChange={(event) => update('memo', event.target.value)} maxLength={200} rows={2} disabled={processing} /></label>
            <label className="wide">対応理由<input value={form.decisionNote} onChange={(event) => update('decisionNote', event.target.value)} maxLength={300} placeholder="訂正内容または変更しない理由" disabled={processing} /></label>
          </div>
          <div className="correction-actions">
            <button className="admin-reject-button" type="button" onClick={dismiss} disabled={processing || !form.decisionNote.trim()}><XCircle size={16} />変更せず完了</button>
            <button className="admin-approve-button" type="button" onClick={correct} disabled={processing || !form.title.trim() || !form.content.trim() || !form.targetDate || !form.decisionNote.trim()}>{processing ? <LoaderCircle className="spin" size={16} /> : <FilePenLine size={16} />}訂正して通知</button>
          </div>
        </div>
      ) : (
        <div className={`admin-review-decision ${report.status === 'corrected' ? 'approved' : 'rejected'}`}>
          {report.status === 'corrected' ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
          <div><strong>{report.resolvedByName ?? '管理者'}が{statusLabel[report.status]}</strong><p>{report.decisionNote}</p>{report.resolvedAt && <time>{formatDateTime(report.resolvedAt)}</time>}</div>
        </div>
      )}
      {report.status === 'corrected' && report.previousContact && report.correctedContact && (
        <details className="correction-audit"><summary>変更前後の記録を表示</summary><dl><div><dt>変更前</dt><dd>{report.previousContact.title}<small>{report.previousContact.content}</small></dd></div><div><dt>変更後</dt><dd>{report.correctedContact.title}<small>{report.correctedContact.content}</small></dd></div></dl></details>
      )}
    </article>
  )
}

export function AdminCorrectionQueue({ reports, loading, processingId, error, onCorrect, onDismiss }: Props) {
  const [filter, setFilter] = useState<ReportFilter>('pending')
  const counts = useMemo(() => ({
    all: reports.length,
    pending: reports.filter((report) => report.status === 'pending').length,
    corrected: reports.filter((report) => report.status === 'corrected').length,
    dismissed: reports.filter((report) => report.status === 'dismissed').length,
  }), [reports])
  const visible = filter === 'all' ? reports : reports.filter((report) => report.status === filter)

  return (
    <section className="admin-review-section admin-correction-section">
      <div className="admin-section-heading"><div><h2>内容の訂正依頼</h2><p>生徒・保護者から届いた相違報告を確認し、訂正履歴を残してクラスへ通知できます。</p></div><span>{counts.pending}件待ち</span></div>
      <div className="admin-review-tabs" role="tablist" aria-label="訂正依頼の状態">
        {([['pending', '対応待ち'], ['all', 'すべて'], ['corrected', '訂正済み'], ['dismissed', '変更なし']] as const).map(([value, label]) => <button key={value} type="button" className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} role="tab" aria-selected={filter === value}>{label}<b>{counts[value]}</b></button>)}
      </div>
      {error && <div className="admin-error" role="alert">{error}</div>}
      {loading ? <div className="admin-review-empty"><LoaderCircle className="spin" size={20} />訂正依頼を読み込んでいます…</div> : <div className="admin-review-list">
        {visible.map((report) => <ReportCard key={report.id} report={report} processing={processingId === report.id} onCorrect={onCorrect} onDismiss={onDismiss} />)}
        {!visible.length && <div className="admin-review-empty">{filter === 'pending' ? <><CheckCircle2 size={20} />未対応の訂正依頼はありません。</> : <><Clock3 size={20} />この状態の履歴はありません。</>}</div>}
      </div>}
    </section>
  )
}
