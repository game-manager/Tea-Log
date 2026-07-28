import { Bell, ClipboardCheck, Home, Plus, type LucideIcon } from 'lucide-react'
import type { Page, UserRole } from '../types'

interface NavItem { page: Page; label: string; icon: LucideIcon }

const studentItems: NavItem[] = [
  { page: 'home', label: 'ホーム', icon: Home },
  { page: 'create', label: '発言を作成', icon: Plus },
  { page: 'history', label: '履歴', icon: ClipboardCheck },
  { page: 'notifications', label: '通知', icon: Bell },
]

const parentItems: NavItem[] = [
  { page: 'home', label: 'ホーム', icon: Home },
  { page: 'history', label: '過去の発言', icon: ClipboardCheck },
  { page: 'notifications', label: '通知', icon: Bell },
]

export function BottomNav({ role, currentPage, onNavigate, unreadCount }: {
  role: UserRole
  currentPage: Page
  onNavigate: (page: Page) => void
  unreadCount: number
}) {
  const items = role === 'student' ? studentItems : parentItems
  return (
    <nav className={`bottom-nav ${role}`} aria-label="メインナビゲーション">
      {items.map(({ page, label, icon: Icon }) => (
        <button key={page} className={currentPage === page ? 'active' : ''} onClick={() => onNavigate(page)} type="button">
          <span className="nav-icon"><Icon size={21} />{page === 'notifications' && unreadCount > 0 && <i />}</span>
          {label}
        </button>
      ))}
    </nav>
  )
}
