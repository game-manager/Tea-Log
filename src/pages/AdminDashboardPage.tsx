import { ArrowRight, Eye, GraduationCap, Save, Search, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AdminModerationQueue } from '../components/AdminModerationQueue'
import { isAdminEmail } from '../config/admins'
import { SCHOOL_CLASSES } from '../config/classes'
import type { AdminProfileUpdate } from '../hooks/useUserProfile'
import type { ModerationReview, User } from '../types'

type FilterRole = 'all' | 'student' | 'parent' | 'admin'

interface Props {
  currentUser: User
  profiles: User[]
  savingId: string
  error: string
  moderationReviews: ModerationReview[]
  moderationLoading: boolean
  moderationProcessingId: string
  moderationError: string
  onUpdate: (userId: string, input: AdminProfileUpdate) => Promise<void>
  onOpenClass: (mode: 'student' | 'parent', className: string) => void
  onApproveReview: (reviewId: string) => Promise<void>
  onRejectReview: (reviewId: string, reason: string) => Promise<void>
}

function roleLabel(role: User['role']) {
  if (role === 'student') return '生徒'
  if (role === 'parent') return '保護者'
  return '管理者'
}

function UserEditor({ profile, saving, onUpdate }: {
  profile: User
  saving: boolean
  onUpdate: (userId: string, input: AdminProfileUpdate) => Promise<void>
}) {
  const configuredAdmin = isAdminEmail(profile.email)
  const [role, setRole] = useState<'student' | 'parent'>(profile.role === 'parent' ? 'parent' : 'student')
  const [className, setClassName] = useState(SCHOOL_CLASSES.includes(profile.className) ? profile.className : '2年3組')
  const [childName, setChildName] = useState(profile.childName ?? '')
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (role === 'parent' && !childName.trim()) return
    setSaved(false)
    try {
      await onUpdate(profile.id, { role, className, childName })
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }

  return (
    <article className={`admin-user-card ${configuredAdmin ? 'configured-admin' : ''}`}>
      <div className="admin-user-identity">
        <span className="user-avatar" style={{ background: profile.avatarColor }}>{profile.name.slice(0, 1)}</span>
        <div><strong>{profile.name}</strong><span>{profile.email}</span></div>
        <span className={`admin-role-badge ${profile.role}`}>{configuredAdmin && <ShieldCheck size={12} />}{roleLabel(profile.role)}</span>
      </div>
      {configuredAdmin ? (
        <p className="configured-admin-note">このアカウントは設定ファイルとSecurity Rulesで管理者に固定されています。</p>
      ) : (
        <div className="admin-user-controls">
          <label>利用区分<select value={role} onChange={(event) => { setRole(event.target.value as 'student' | 'parent'); setSaved(false) }} disabled={saving}><option value="student">生徒</option><option value="parent">保護者</option></select></label>
          <label>所属クラス<select value={className} onChange={(event) => { setClassName(event.target.value); setSaved(false) }} disabled={saving}>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          {role === 'parent' && <label>お子さまの氏名<input value={childName} onChange={(event) => { setChildName(event.target.value); setSaved(false) }} maxLength={40} disabled={saving} placeholder="氏名を入力" /></label>}
          <button className="admin-save-button" type="button" onClick={save} disabled={saving || (role === 'parent' && !childName.trim())}><Save size={15} />{saving ? '保存中…' : saved ? '保存しました' : '変更を保存'}</button>
        </div>
      )}
      <time>登録：{new Date(profile.createdAt).toLocaleString('ja-JP')}</time>
    </article>
  )
}

export function AdminDashboardPage({
  currentUser, profiles, savingId, error, moderationReviews, moderationLoading,
  moderationProcessingId, moderationError, onUpdate, onOpenClass, onApproveReview, onRejectReview,
}: Props) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<FilterRole>('all')
  const [quickClass, setQuickClass] = useState('2年3組')
  const sortedProfiles = useMemo(() => [...profiles].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [profiles])
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return sortedProfiles.filter((profile) => {
      const matchesRole = roleFilter === 'all' || profile.role === roleFilter
      const matchesQuery = !normalizedQuery || `${profile.name} ${profile.email} ${profile.className}`.toLowerCase().includes(normalizedQuery)
      return matchesRole && matchesQuery
    })
  }, [query, roleFilter, sortedProfiles])
  const studentCount = profiles.filter((profile) => profile.role === 'student').length
  const parentCount = profiles.filter((profile) => profile.role === 'parent').length
  const adminCount = profiles.filter((profile) => isAdminEmail(profile.email)).length
  const classCount = new Set(profiles.filter((profile) => profile.role !== 'admin').map((profile) => profile.className)).size
  const classSummaries = useMemo(() => SCHOOL_CLASSES.map((className) => {
    const classUsers = profiles.filter((profile) => profile.className === className)
    return {
      className,
      students: classUsers.filter((profile) => profile.role === 'student').length,
      parents: classUsers.filter((profile) => profile.role === 'parent').length,
      total: classUsers.length,
    }
  }).filter((summary) => summary.total > 0), [profiles])

  return (
    <main className="admin-dashboard">
      <section className="admin-hero">
        <div><span className="eyebrow">ADMIN CONSOLE</span><h1>管理者ダッシュボード</h1><p>{currentUser.name}さん、TeachersLogに登録済みのユーザーを管理できます。</p></div>
        <span className="admin-security-label"><ShieldCheck size={17} />学校Googleアカウント認証済み</span>
      </section>
      <section className="admin-stats" aria-label="利用者集計">
        <div><UsersRound /><span>登録ユーザー<strong>{profiles.length}</strong></span></div>
        <div><GraduationCap /><span>生徒<strong>{studentCount}</strong></span></div>
        <div><UserRound /><span>保護者<strong>{parentCount}</strong></span></div>
        <div><ShieldCheck /><span>管理者 / クラス<strong>{adminCount} / {classCount}</strong></span></div>
      </section>
      <AdminModerationQueue
        reviews={moderationReviews}
        loading={moderationLoading}
        processingId={moderationProcessingId}
        error={moderationError}
        onApprove={onApproveReview}
        onReject={onRejectReview}
      />
      <section className="admin-class-section">
        <div className="admin-section-heading"><div><h2>クラス運用</h2><p>管理者のまま対象クラスの投稿・確認・履歴・保護者画面を利用できます。</p></div></div>
        <div className="admin-quick-launch">
          <label>対象クラス<select value={quickClass} onChange={(event) => setQuickClass(event.target.value)}>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="button" onClick={() => onOpenClass('student', quickClass)}><GraduationCap size={16} /><span><strong>生徒画面を開く</strong><small>投稿・確認・履歴・通知</small></span><ArrowRight size={16} /></button>
          <button type="button" onClick={() => onOpenClass('parent', quickClass)}><Eye size={16} /><span><strong>保護者画面を開く</strong><small>確認済み発言・閲覧管理</small></span><ArrowRight size={16} /></button>
        </div>
        {classSummaries.length > 0 ? <div className="admin-class-grid">
          {classSummaries.map((summary) => <article key={summary.className}>
            <div><strong>{summary.className}</strong><span>{summary.total}人登録</span></div>
            <dl><div><dt>生徒</dt><dd>{summary.students}</dd></div><div><dt>保護者</dt><dd>{summary.parents}</dd></div></dl>
            <button type="button" onClick={() => onOpenClass('student', summary.className)}>クラスを開く<ArrowRight size={14} /></button>
          </article>)}
        </div> : <p className="admin-class-empty">登録済みクラスはまだありません。上の対象クラスを選んで運用画面を開けます。</p>}
      </section>
      <section className="admin-users-section">
        <div className="admin-section-heading"><div><h2>ユーザー管理</h2><p>利用区分や所属クラスの変更は保存後すぐに反映されます。</p></div><span>{filtered.length}件</span></div>
        <div className="admin-filters">
          <label className="admin-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="氏名・メール・クラスで検索" /></label>
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as FilterRole)} aria-label="利用区分で絞り込む"><option value="all">すべて</option><option value="student">生徒</option><option value="parent">保護者</option><option value="admin">管理者</option></select>
        </div>
        {error && <div className="admin-error" role="alert">{error}</div>}
        <div className="admin-user-list">
          {filtered.map((profile) => <UserEditor key={profile.id} profile={profile} saving={savingId === profile.id} onUpdate={onUpdate} />)}
          {!filtered.length && <div className="admin-empty">条件に一致するユーザーはいません。</div>}
        </div>
      </section>
    </main>
  )
}
