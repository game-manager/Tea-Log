import { useMemo, useState } from 'react'
import { AdminWorkspaceBar, type AdminWorkspaceMode } from './components/AdminWorkspaceBar'
import { BottomNav } from './components/BottomNav'
import { Header } from './components/Header'
import { isAdminEmail } from './config/admins'
import { SCHOOL_CLASSES } from './config/classes'
import { useFirebaseAuth } from './hooks/useFirebaseAuth'
import { useModerationQueue } from './hooks/useModerationQueue'
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
import type { Page, User } from './types'

const ADMIN_CLASS_STORAGE_KEY = 'teacherslog:admin:selected-class'

function initialAdminClass() {
  try {
    const stored = localStorage.getItem(ADMIN_CLASS_STORAGE_KEY)
    return stored && SCHOOL_CLASSES.includes(stored) ? stored : '2年3組'
  } catch {
    return '2年3組'
  }
}

export default function App() {
  const firebaseSession = useFirebaseAuth()
  const profileSession = useUserProfile(firebaseSession.account)
  const user = profileSession.profile
  const [adminMode, setAdminMode] = useState<AdminWorkspaceMode>('dashboard')
  const [adminClassName, setAdminClassName] = useState(initialAdminClass)
  const [page, setPage] = useState<Page>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isAdmin = Boolean(user?.role === 'admin' && isAdminEmail(user.email))
  const activeUser = useMemo<User | null>(() => {
    if (!user) return null
    if (!isAdmin) return user
    if (adminMode === 'dashboard') return null
    return {
      ...user,
      role: adminMode,
      className: adminClassName,
      ...(adminMode === 'parent' ? { childName: `${adminClassName}の保護者表示` } : { childName: undefined }),
    }
  }, [adminClassName, adminMode, isAdmin, user])
  const classProfiles = useMemo(() => activeUser
    ? profileSession.profiles.filter((profile) => profile.className === activeUser.className)
    : [], [activeUser, profileSession.profiles])
  const store = useTeachersLog(activeUser, classProfiles)
  const reviewQueue = useModerationQueue(user, profileSession.profiles)
  const currentContact = store.contacts.find((contact) => contact.id === selectedId)
  const userNotifications = useMemo(() => activeUser ? store.notifications.filter((item) => item.userId === activeUser.id) : [], [activeUser, store.notifications])
  const unreadCount = userNotifications.filter((item) => !item.read).length

  const navigate = (nextPage: Page) => { setPage(nextPage); if (nextPage !== 'detail') setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const openContact = (id: string) => { setSelectedId(id); setPage('detail'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const changeAdminMode = (mode: AdminWorkspaceMode) => { setAdminMode(mode); setPage('home'); setSelectedId(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const changeAdminClass = (className: string) => {
    setAdminClassName(className)
    try { localStorage.setItem(ADMIN_CLASS_STORAGE_KEY, className) } catch { /* keep the in-memory selection */ }
    setPage('home')
    setSelectedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const openAdminClass = (mode: Exclude<AdminWorkspaceMode, 'dashboard'>, className: string) => { changeAdminClass(className); setAdminMode(mode) }

  if (firebaseSession.loading) return <FirebaseLoadingPage message="ログイン状態を確認しています…" />
  if (!firebaseSession.account) return <FirebaseLoginPage onLogin={firebaseSession.login} signingIn={firebaseSession.signingIn} error={firebaseSession.error} />
  if (profileSession.loading) return <FirebaseLoadingPage message="プロフィールを読み込んでいます…" />
  if (!user) return <ProfileSetupPage account={firebaseSession.account} saving={profileSession.saving} error={profileSession.error} onSave={profileSession.saveProfile} onLogout={firebaseSession.logout} />

  if (isAdmin && adminMode === 'dashboard') return (
    <div className="app admin">
      <Header user={user} unreadCount={0} onNotifications={() => undefined} onLogout={firebaseSession.logout} hideNotifications />
      <AdminWorkspaceBar mode={adminMode} className={adminClassName} onModeChange={changeAdminMode} onClassChange={changeAdminClass} />
      <AdminDashboardPage
        currentUser={user}
        profiles={profileSession.profiles}
        savingId={profileSession.adminSavingId}
        error={profileSession.error}
        moderationReviews={reviewQueue.reviews}
        moderationLoading={reviewQueue.loading}
        moderationProcessingId={reviewQueue.processingId}
        moderationError={reviewQueue.error}
        onUpdate={profileSession.updateProfileAsAdmin}
        onOpenClass={openAdminClass}
        onApproveReview={(reviewId) => reviewQueue.approve(reviewId, user)}
        onRejectReview={(reviewId, reason) => reviewQueue.reject(reviewId, user, reason)}
      />
      <footer className="app-footer"><span>TeachersLog Admin · {firebaseSession.account.email}</span></footer>
    </div>
  )

  if (!activeUser) return <FirebaseLoadingPage />
  if (store.cloudError && !store.cloudReady) return (
    <main className="cloud-error-page">
      <h1>TeachersLog</h1>
      <h2>学校データに接続できません</h2>
      <p>{store.cloudError}</p>
      <button onClick={firebaseSession.logout}>ログアウト</button>
    </main>
  )
  if (!store.cloudReady) return <FirebaseLoadingPage message={`${activeUser.className}の発言を読み込んでいます…`} />

  const renderPage = () => {
    if (page === 'detail' && currentContact) {
      if (activeUser.role === 'parent' && !currentContact.confirmedAt) { navigate('home'); return null }
      const willComplete = !currentContact.confirmedAt && currentContact.confirmations.length + 1 >= currentContact.requiredConfirmations
      return <ContactDetailPage
        contact={currentContact}
        user={activeUser}
        profiles={classProfiles}
        onBack={() => navigate('home')}
        onConfirm={() => { store.confirmContact(currentContact.id, activeUser); return willComplete }}
        onRead={() => store.markParentRead(currentContact.id, activeUser.id)}
        onDelete={() => { store.deleteContact(currentContact.id, activeUser, isAdmin); navigate('home') }}
        canModerate={isAdmin}
      />
    }
    if (page === 'create' && activeUser.role === 'student') return <CreatePostPage
      onBack={() => navigate('home')}
      onSubmit={(input) => { const id = store.createContact(input, activeUser); openContact(id) }}
      onReviewRequired={async (input, result) => { await reviewQueue.submitForReview(input, activeUser, result) }}
    />
    if (page === 'history') return <HistoryPage user={activeUser} contacts={store.contacts} onOpen={openContact} />
    if (page === 'notifications') return <NotificationsPage notifications={userNotifications} onOpen={openContact} onRead={store.markNotificationRead} onReadAll={() => store.markAllNotificationsRead(activeUser.id)} />
    if (activeUser.role === 'parent') return <ParentHomePage user={activeUser} contacts={store.contacts} onOpen={openContact} />
    return <StudentHomePage user={activeUser} contacts={store.contacts} onOpen={openContact} onCreate={() => navigate('create')} />
  }

  return (
    <div className={`app ${activeUser.role} ${isAdmin ? 'admin-session' : ''}`}>
      <Header user={activeUser} unreadCount={unreadCount} onNotifications={() => navigate('notifications')} onLogout={firebaseSession.logout} adminAccess={isAdmin} />
      {isAdmin && <AdminWorkspaceBar mode={adminMode} className={adminClassName} onModeChange={changeAdminMode} onClassChange={changeAdminClass} />}
      {store.storageError && <div className="storage-warning" role="alert">端末への保存に失敗しました。空き容量やブラウザー設定をご確認ください。</div>}
      {store.syncError && <div className="storage-warning" role="alert">{store.syncError}</div>}
      <main>{renderPage()}</main>
      <BottomNav role={activeUser.role} currentPage={page} onNavigate={navigate} unreadCount={unreadCount} />
      <footer className="app-footer">
        <span>TeachersLog · {firebaseSession.account.email} · {activeUser.className} · {isAdmin ? `管理者（${activeUser.role === 'student' ? '生徒画面' : '保護者画面'}）` : activeUser.role === 'student' ? '生徒' : '保護者'}</span>
      </footer>
    </div>
  )
}
