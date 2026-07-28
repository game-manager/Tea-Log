import { GraduationCap, LayoutDashboard, UsersRound } from 'lucide-react'
import { SCHOOL_CLASSES } from '../config/classes'

export type AdminWorkspaceMode = 'dashboard' | 'student' | 'parent'

export function AdminWorkspaceBar({ mode, className, onModeChange, onClassChange }: {
  mode: AdminWorkspaceMode
  className: string
  onModeChange: (mode: AdminWorkspaceMode) => void
  onClassChange: (className: string) => void
}) {
  return (
    <aside className="admin-workspace-bar" aria-label="管理者ワークスペース">
      <div className="admin-workspace-inner">
        <span className="admin-workspace-label">管理者モード</span>
        <nav aria-label="管理者表示切り替え">
          <button className={mode === 'dashboard' ? 'active' : ''} onClick={() => onModeChange('dashboard')} type="button"><LayoutDashboard size={16} />管理</button>
          <button className={mode === 'student' ? 'active' : ''} onClick={() => onModeChange('student')} type="button"><GraduationCap size={16} />生徒画面</button>
          <button className={mode === 'parent' ? 'active' : ''} onClick={() => onModeChange('parent')} type="button"><UsersRound size={16} />保護者画面</button>
        </nav>
        <label className="admin-class-switcher">
          <span>対象クラス</span>
          <select value={className} onChange={(event) => onClassChange(event.target.value)}>
            {SCHOOL_CLASSES.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
    </aside>
  )
}
