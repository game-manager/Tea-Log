import { BookOpenCheck, CheckCircle2, ShieldCheck, UserRoundCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import { isAdminEmail } from '../config/admins'
import { SCHOOL_CLASSES } from '../config/classes'
import type { ProfileInput } from '../hooks/useUserProfile'
import type { UserRole } from '../types'

interface Props {
  account: FirebaseUser
  saving: boolean
  error: string
  onSave: (input: ProfileInput) => Promise<void>
  onLogout: () => void
}

export function ProfileSetupPage({ account, saving, error, onSave, onLogout }: Props) {
  const adminAccount = isAdminEmail(account.email)
  const [name, setName] = useState(account.displayName ?? '')
  const [role, setRole] = useState<UserRole>(adminAccount ? 'admin' : 'student')
  const [className, setClassName] = useState(adminAccount ? '管理者' : '2年3組')
  const [childName, setChildName] = useState('')
  const [validationError, setValidationError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return setValidationError('表示名を入力してください。')
    if (role === 'parent' && !childName.trim()) return setValidationError('お子さまの氏名を入力してください。')
    setValidationError('')
    await onSave({ name, role, className, childName }).catch(() => undefined)
  }

  return (
    <main className="login-page profile-setup-page">
      <section className="login-intro">
        <div className="login-brand"><BookOpenCheck size={27} /><strong>TeachersLog</strong></div>
        <div className="intro-copy">
          <span className="eyebrow">WELCOME</span>
          <h1>あなたの情報を<br />登録してください。</h1>
          <p>登録内容はFirebase Authenticationのアカウントに紐づき、次回から同じ画面が自動的に開きます。</p>
          <div className="intro-points"><span><CheckCircle2 />Firebase UIDで本人を識別</span><span><ShieldCheck />同じクラスの発言だけを共有</span></div>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card profile-form" onSubmit={submit} noValidate>
          <span className="demo-label">FIRST TIME SETUP</span>
          <h2>初回プロフィール登録</h2>
          <p className="signed-in-account"><UserRoundCheck size={17} />{account.email}</p>
          <div className="field">
            <label htmlFor="profile-name">表示名 <b>必須</b></label>
            <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} disabled={saving} />
          </div>
          {adminAccount ? <div className="admin-account-notice"><ShieldCheck size={18} /><div><strong>管理者アカウント</strong><small>指定された管理者メールアドレスとして登録します。</small></div></div> : <fieldset className="role-selector" disabled={saving}>
            <legend>利用区分</legend>
            <label className={role === 'student' ? 'selected' : ''}><input type="radio" name="role" value="student" checked={role === 'student'} onChange={() => setRole('student')} /><strong>生徒</strong><small>投稿と確認に参加します</small></label>
            <label className={role === 'parent' ? 'selected parent-role' : 'parent-role'}><input type="radio" name="role" value="parent" checked={role === 'parent'} onChange={() => setRole('parent')} /><strong>保護者</strong><small>確認済み発言を閲覧します</small></label>
          </fieldset>}
          {!adminAccount && <div className="field">
            <label htmlFor="profile-class">所属クラス <b>必須</b></label>
            <select id="profile-class" value={className} onChange={(event) => setClassName(event.target.value)} disabled={saving}>{SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}</select>
          </div>}
          {role === 'parent' && <div className="field"><label htmlFor="child-name">お子さまの氏名 <b>必須</b></label><input id="child-name" value={childName} onChange={(event) => setChildName(event.target.value)} maxLength={40} disabled={saving} /></div>}
          {(validationError || error) && <div className="auth-error" role="alert">{validationError || error}</div>}
          <button className="primary-button profile-submit" type="submit" disabled={saving}>{saving ? '登録しています…' : 'プロフィールを登録して始める'}</button>
          <button className="profile-logout" type="button" onClick={onLogout} disabled={saving}>別のGoogleアカウントでログイン</button>
        </form>
      </section>
    </main>
  )
}
