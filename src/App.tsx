import { useMemo, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { Header } from './components/Header'
import { users } from './data/seed'
import { useTeachersLog } from './hooks/useTeachersLog'
import { ContactDetailPage } from './pages/ContactDetailPage'
import { CreatePostPage } from './pages/CreatePostPage'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ParentHomePage } from './pages/ParentHomePage'
import { StudentHomePage } from './pages/StudentHomePage'
import type { Page, User } from './types'

const USER_KEY = 'teacherslog:current-user:v1'

const loadUser = () => {
  try {
    const id = localStorage.getItem(USER_KEY)
    return users.find((user) => user.id === id) ?? null
  } catch { return null }
}

export default function App() {
  const store = useTeachersLog()
  const [user, setUser] = useState<User | null>(loadUser)
  const [page, setPage] = useState<Page>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const currentContact = store.contacts.find((contact) => contact.id === selectedId)
  const userNotifications = useMemo(() => user ? store.notifications.filter((item) => item.userId === user.id) : [], [store.notifications, user])
  const unreadCount = userNotifications.filter((item) => !item.read).length

  const chooseUser = (nextUser: User) => {
    setUser(nextUser)
    setPage('home')
    setSelectedId(null)
    try { localStorage.setItem(USER_KEY, nextUser.id) } catch { /* continue without persistence */ }
  }
  const navigate = (nextPage: Page) => { setPage(nextPage); if (nextPage !== 'detail') setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openContact = (id: string) => { setSelectedId(id); setPage('detail'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (!user) return <LoginPage users={users} onLogin={chooseUser} />

  const renderPage = () => {
    if (page === 'detail' && currentContact) {
      if (user.role === 'parent' && !currentContact.confirmedAt) { navigate('home'); return null }
      const willComplete = !currentContact.confirmedAt && currentContact.confirmations.length + 1 >= currentContact.requiredConfirmations
      return <ContactDetailPage
        contact={currentContact}
        user={user}
        onBack={() => navigate('home')}
        onConfirm={() => { store.confirmContact(currentContact.id, user); return willComplete }}
        onRead={() => store.markParentRead(currentContact.id, user.id)}
        onDelete={() => { store.deleteContact(currentContact.id, user); navigate('home') }}
      />
    }
    if (page === 'create' && user.role === 'student') return <CreatePostPage onBack={() => navigate('home')} onSubmit={(input) => { const id = store.createContact(input, user); openContact(id) }} />
    if (page === 'history') return <HistoryPage user={user} contacts={store.contacts} onOpen={openContact} />
    if (page === 'notifications') return <NotificationsPage notifications={userNotifications} onOpen={openContact} onRead={store.markNotificationRead} onReadAll={() => store.markAllNotificationsRead(user.id)} />
    if (user.role === 'parent') return <ParentHomePage user={user} contacts={store.contacts} onOpen={openContact} />
    return <StudentHomePage user={user} contacts={store.contacts} onOpen={openContact} onCreate={() => navigate('create')} />
  }

  return (
    <div className={`app ${user.role}`}>
      <Header user={user} users={users} unreadCount={unreadCount} onUserChange={chooseUser} onNotifications={() => navigate('notifications')} />
      {store.storageError && <div className="storage-warning" role="alert">端末への保存に失敗しました。空き容量やブラウザー設定をご確認ください。</div>}
      <main>{renderPage()}</main>
      <BottomNav role={user.role} currentPage={page} onNavigate={navigate} unreadCount={unreadCount} />
      <footer className="app-footer">
        <span>TeachersLog demo · {user.className}</span>
        <button onClick={() => { if (window.confirm('投稿や確認状況を初期状態に戻しますか？')) { store.resetDemo(); navigate('home') } }}>デモデータを初期化</button>
      </footer>
    </div>
  )
}
