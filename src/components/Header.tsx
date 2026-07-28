import { Bell, BookOpenCheck, LogOut } from 'lucide-react'
import type { User } from '../types'

interface Props {
  user: User
  unreadCount: number
  onNotifications: () => void
  onLogout: () => void
  hideNotifications?: boolean
  adminAccess?: boolean
}

export function Header({ user, unreadCount, onNotifications, onLogout, hideNotifications = false, adminAccess = false }: Props) {
  return (
    <header className={`app-header ${user.role}`}>
      <div className="header-inner">
        <div className="brand" aria-label="TeachersLog ホーム">
          <span className="brand-icon"><BookOpenCheck size={22} /></span>
          <span><strong>TeachersLog</strong><small>みんなで確かめる先生の発言</small></span>
        </div>
        <div className="header-actions">
          {!hideNotifications && <button className="icon-button" onClick={onNotifications} aria-label={`通知 ${unreadCount}件`}>
            <Bell size={21} />
            {unreadCount > 0 && <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>}
          <button className="icon-button logout-button" onClick={onLogout} aria-label="Googleアカウントからログアウト" title="ログアウト">
            <LogOut size={19} />
          </button>
          <div className="user-switcher" aria-label={`${user.name}としてログイン中`}>
            <span className="user-avatar" style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
            <span className="user-name"><strong>{user.name}</strong><small>{adminAccess && user.role !== 'admin' ? `管理者 · ${user.role === 'student' ? '生徒表示' : '保護者表示'}` : user.role === 'student' ? '生徒' : user.role === 'parent' ? '保護者' : '管理者'}</small></span>
          </div>
        </div>
      </div>
    </header>
  )
}
