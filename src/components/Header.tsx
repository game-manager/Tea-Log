import { Bell, BookOpenCheck, ChevronDown } from 'lucide-react'
import type { User } from '../types'

interface Props {
  user: User
  users: User[]
  unreadCount: number
  onUserChange: (user: User) => void
  onNotifications: () => void
}

export function Header({ user, users, unreadCount, onUserChange, onNotifications }: Props) {
  return (
    <header className={`app-header ${user.role}`}>
      <div className="header-inner">
        <div className="brand" aria-label="TeachersLog ホーム">
          <span className="brand-icon"><BookOpenCheck size={22} /></span>
          <span><strong>TeachersLog</strong><small>みんなで確かめる学校連絡</small></span>
        </div>
        <div className="header-actions">
          <button className="icon-button" onClick={onNotifications} aria-label={`通知 ${unreadCount}件`}>
            <Bell size={21} />
            {unreadCount > 0 && <span className="notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <label className="user-switcher">
            <span className="user-avatar" style={{ background: user.avatarColor }}>{user.name.slice(0, 1)}</span>
            <span className="user-name"><strong>{user.name}</strong><small>{user.role === 'student' ? '生徒' : '保護者'}</small></span>
            <select value={user.id} onChange={(event) => {
              const next = users.find((item) => item.id === event.target.value)
              if (next) onUserChange(next)
            }} aria-label="デモユーザーを切り替える">
              {users.map((item) => <option key={item.id} value={item.id}>{item.name}（{item.role === 'student' ? '生徒' : '保護者'}）</option>)}
            </select>
            <ChevronDown size={16} aria-hidden="true" />
          </label>
        </div>
      </div>
    </header>
  )
}
