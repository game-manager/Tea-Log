import { ArrowRight, BookOpenCheck, CheckCircle2, ShieldCheck } from 'lucide-react'
import type { User } from '../types'

export function LoginPage({ users, onLogin }: { users: User[]; onLogin: (user: User) => void }) {
  const students = users.filter((user) => user.role === 'student')
  const parents = users.filter((user) => user.role === 'parent')
  return (
    <main className="login-page">
      <section className="login-intro">
        <div className="login-brand"><BookOpenCheck size={27} /><strong>TeachersLog</strong></div>
        <div className="intro-copy">
          <span className="eyebrow">学校連絡を、もっと確かに。</span>
          <h1>聞いた連絡を<br />みんなで確かめる。</h1>
          <p>クラス内の複数の生徒で内容を確認し、確認できた学校連絡だけを保護者にも共有します。</p>
          <div className="intro-points">
            <span><CheckCircle2 />複数人で内容を確認</span>
            <span><ShieldCheck />確認済みだけを保護者へ</span>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <span className="demo-label">DEMO LOGIN</span>
          <h2>デモユーザーを選択</h2>
          <p>役割やユーザーを切り替えて、確認状況の変化を試せます。</p>
          <div className="login-group">
            <label>生徒として利用</label>
            {students.map((user) => (
              <button key={user.id} onClick={() => onLogin(user)} type="button">
                <span className="user-avatar" style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
                <span><strong>{user.name}</strong><small>{user.className}</small></span>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
          <div className="login-group parent-group">
            <label>保護者として利用</label>
            {parents.map((user) => (
              <button key={user.id} onClick={() => onLogin(user)} type="button">
                <span className="user-avatar" style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
                <span><strong>{user.name}</strong><small>{user.childName}さんの保護者</small></span>
                <ArrowRight size={19} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
