import { BookOpenCheck, Chrome, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react'
import { ALLOWED_EMAIL_DOMAIN } from '../lib/firebase'

export function FirebaseLoginPage({ onLogin, signingIn, error }: {
  onLogin: () => void
  signingIn: boolean
  error: string
}) {
  return (
    <main className="firebase-login-page">
      <section className="firebase-login-card">
        <div className="login-brand firebase-brand"><BookOpenCheck size={27} /><strong>TeachersLog</strong></div>
        <span className="secure-icon"><ShieldCheck size={31} /></span>
        <span className="eyebrow">SCHOOL ACCOUNT</span>
        <h1>学校アカウントで<br />ログイン</h1>
        <p>TeachersLogは学校関係者専用です。学校から発行されたGoogleアカウントを使用してください。</p>
        <div className="allowed-domain"><LockKeyhole size={18} /><span><small>利用できるメールアドレス</small><strong>@{ALLOWED_EMAIL_DOMAIN}</strong></span></div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="google-login-button" onClick={onLogin} disabled={signingIn} type="button">
          {signingIn ? <LoaderCircle className="spin" size={21} /> : <Chrome size={21} />}
          {signingIn ? 'ログインしています…' : 'Googleアカウントでログイン'}
        </button>
        <small className="auth-policy">上記ドメイン以外のアカウントでは、ログインおよび学校連絡の閲覧はできません。</small>
      </section>
    </main>
  )
}

export function FirebaseLoadingPage({ message = '学校データを読み込んでいます…' }: { message?: string }) {
  return (
    <main className="firebase-loading-page">
      <BookOpenCheck size={33} />
      <strong>TeachersLog</strong>
      <LoaderCircle className="spin" size={23} />
      <span>{message}</span>
    </main>
  )
}
