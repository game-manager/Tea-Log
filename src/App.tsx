import { useMemo, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { Header } from './components/Header'
import { useFirebaseAuth } from './hooks/useFirebaseAuth'
import { useTeachersLog } from './hooks/useTeachersLog'
import { useUserProfile } from './hooks/useUserProfile'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { ContactDetailPage } from './pages/ContactDetailPage'
import { CreatePostPage } from './pages/CreatePostPage'
import { FirebaseLoadingPage, FirebaseLoginPage } from './pages/FirebaseLoginPage'
import { HistoryPage } from './pages/HistoryPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ParentHomePage } from './pages/ParentHomePage'
import { ProfileSetupPage } from './pages/ProfileSetupPage'
import { StudentHomePage } from './pages/StudentHomePage'
import type { Page } from './types'

export default function App() {
  const firebaseSession = useFirebaseAuth()
  const profileSession = useUserProfile(firebaseSession.account)
  const user = profileSession.profile
  const classProfiles = useMemo(() => user
    ? profileSession.profiles.filter((profile) => profile.className === user.className)
    : [], [profileSession.profiles, user])
  const store = useTeachersLog(user?.role === 'admin' ? null : user, classProfiles)
  const [page, setPage] = useState<Page>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const currentContact = store.contacts.find((contact) => contact.id === selectedId)
  const userNotifications = useMemo(() => user ? store.notifications.filter((item) => item.userId === user.id) : [], [store.notifications, user])
  const unreadCount = userNotifications.filter((item) => !item.read).length

  const navigate = (nextPage: Page) => { setPage(nextPage); if (nextPage !== 'detail') setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openContact = (id: string) => { setSelectedId(id); setPage('detail'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  if (firebaseSession.loading) return <FirebaseLoadingPage message="ログイン状態を確認しています…" />
  if (!firebaseSession.account) return <FirebaseLoginPage onLogin={firebaseSession.login} signingIn={firebaseSession.signingIn} error={firebaseSession.error} />
  if (profileSession.loading) return <FirebaseLoadingPage message="プロフィールを読み込んでいます…" />
  if (!user) return <ProfileSetupPage account={firebaseSession.account} saving={profileSession.saving} error={profileSession.error} onSave={profileSession.saveProfile} onLogout={firebaseSession.logout} />
  if (user.role === 'admin') return (
    <div className="app admin">
      <Header user={user} unreadCount={0} onNotifications={() => undefined} onLogout={firebaseSession.logout} hideNotifications />
      <AdminDashboardPage currentUser={user} profiles={profileSession.profiles} savingId={profileSession.adminSavingId} error={profileSession.error} onUpdate={profileSession.updateProfileAsAdmin} />
      <footer className="app-footer"><span>TeachersLog Admin · {firebaseSession.account.email}</span></footer>
    </div>
  )
  if (store.cloudError && !store.cloudReady) return (
    <main className="cloud-error-page">
      <h1>TeachersLog</h1>
      <h2>学校データに接続できません</h2>
      <p>{store.cloudError}</p>
      <button onClick={firebaseSession.logout}>ログアウト</button>
    </main>
  )
  if (!store.cloudReady) return <FirebaseLoadingPage />

  const renderPage = () => {
    if (page === 'detail' && currentContact) {
      if (user.role === 'parent' && !currentContact.confirmedAt) { navigate('home'); return null }
      const willComplete = !currentContact.confirmedAt && currentContact.confirmations.length + 1 >= currentContact.requiredConfirmations
      return <ContactDetailPage
        contact={currentContact}
        user={user}
        profiles={classProfiles}
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
      <Header user={user} unreadCount={unreadCount} onNotifications={() => navigate('notifications')} onLogout={firebaseSession.logout} />
      {store.storageError && <div className="storage-warning" role="alert">端末への保存に失敗しました。空き容量やブラウザー設定をご確認ください。</div>}
      <main>{renderPage()}</main>
      <BottomNav role={user.role} currentPage={page} onNavigate={navigate} unreadCount={unreadCount} />
      <footer className="app-footer">
        <span>TeachersLog · {firebaseSession.account.email} · {user.className} · {user.role === 'student' ? '生徒' : '保護者'}</span>
      </footer>
    </div>
  )
}
