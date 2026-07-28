import { useCallback, useEffect, useState } from 'react'
import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { seedData } from '../data/seed'
import { firestore } from '../lib/firebase'
import type { AppData, Category, Contact, User } from '../types'

const EMPTY_DATA: AppData = { contacts: [], notifications: [] }

const normalizeLegacyTerms = (data: AppData): AppData => ({
  ...data,
  notifications: data.notifications.map((notification) => ({
    ...notification,
    title: notification.title.split('\u9023\u7d61').join('発言'),
  })),
})

const storageKey = (className: string) => `teacherslog:data:v2:${className}`

const initialDataForClass = (className: string): AppData => ({
  contacts: seedData.contacts.map((contact) => ({ ...contact, className, parentReadBy: {} })),
  notifications: [],
})

const loadData = (className: string): AppData => {
  try {
    const stored = localStorage.getItem(storageKey(className))
    return stored ? JSON.parse(stored) as AppData : initialDataForClass(className)
  } catch {
    return initialDataForClass(className)
  }
}

export interface NewContactInput {
  category: Category
  title: string
  content: string
  targetDate: string
  memo: string
}

export const useTeachersLog = (user: User | null, classProfiles: User[]) => {
  const [data, setData] = useState<AppData>(EMPTY_DATA)
  const [storageError, setStorageError] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [connection, setConnection] = useState({ className: '', ready: false, error: '' })
  const cloudReady = Boolean(user && connection.className === user.className && connection.ready)
  const cloudError = user && connection.className === user.className ? connection.error : ''

  useEffect(() => {
    if (!user) return
    const appDataRef = doc(firestore, 'teacherslogClasses', user.className)
    return onSnapshot(appDataRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(normalizeLegacyTerms(snapshot.data() as AppData))
        setConnection({ className: user.className, ready: true, error: '' })
        setSyncError('')
      } else {
        const initialData = loadData(user.className)
        setData(initialData)
        setDoc(appDataRef, initialData)
          .then(() => setConnection({ className: user.className, ready: true, error: '' }))
          .catch(() => setConnection({ className: user.className, ready: false, error: 'クラウドデータの初期化に失敗しました。' }))
      }
    }, () => {
      setConnection({ className: user.className, ready: false, error: 'Firestoreに接続できません。権限またはネットワークをご確認ください。' })
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(storageKey(user.className), JSON.stringify(data))
        setStorageError(false)
      } catch {
        setStorageError(true)
        console.warn('TeachersLog could not persist data to localStorage.')
      }
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [data, user])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (user && event.key === storageKey(user.className) && event.newValue) {
        try { setData(JSON.parse(event.newValue) as AppData) } catch { /* keep current state */ }
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [user])

  const commitMutation = useCallback((mutation: (current: AppData) => AppData) => {
    if (!user) return
    setSyncError('')
    const appDataRef = doc(firestore, 'teacherslogClasses', user.className)
    void runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(appDataRef)
      const current = snapshot.exists() ? normalizeLegacyTerms(snapshot.data() as AppData) : initialDataForClass(user.className)
      transaction.set(appDataRef, mutation(current))
    }).catch(() => setSyncError('発言をクラウドへ保存できませんでした。通信環境を確認して、もう一度操作してください。'))
  }, [user])

  const createContact = useCallback((input: NewContactInput, user: User) => {
    const now = new Date().toISOString()
    const contact: Contact = {
      id: crypto.randomUUID(),
      ...input,
      className: user.className,
      title: input.title.trim(),
      content: input.content.trim(),
      memo: input.memo.trim(),
      postedAt: now,
      authorId: user.id,
      authorName: user.name,
      confirmations: [],
      requiredConfirmations: 3,
      totalStudents: Math.max(5, classProfiles.filter((profile) => profile.role === 'student').length),
      parentReadBy: {},
    }
    const notifications = classProfiles.filter((profile) => profile.role === 'student' && profile.id !== user.id).map((profile) => ({
      id: crypto.randomUUID(), userId: profile.id, title: '新しい確認待ちの発言があります',
      body: `「${contact.title}」の内容を確認してください。`, createdAt: now, read: false, contactId: contact.id,
    }))
    const applyCreate = (current: AppData): AppData => ({
      contacts: [contact, ...current.contacts],
      notifications: [...current.notifications, ...notifications],
    })
    setData(applyCreate)
    commitMutation(applyCreate)
    return contact.id
  }, [classProfiles, commitMutation])

  const confirmContact = useCallback((contactId: string, user: User) => {
    const now = new Date().toISOString()
    const notificationIds = [crypto.randomUUID(), ...classProfiles.filter((profile) => profile.role === 'parent').map(() => crypto.randomUUID())]
    const applyConfirmation = (current: AppData): AppData => {
      const target = current.contacts.find((contact) => contact.id === contactId)
      if (!target || target.confirmations.some((item) => item.studentId === user.id) || target.confirmedAt) return current
      const confirmations = [...target.confirmations, { studentId: user.id, studentName: user.name, confirmedAt: now }]
      const becameConfirmed = confirmations.length >= target.requiredConfirmations
      const contacts = current.contacts.map((contact) => contact.id === contactId
        ? { ...contact, confirmations, ...(becameConfirmed ? { confirmedAt: now } : {}) }
        : contact)
      const newNotifications = becameConfirmed ? [
        {
          id: notificationIds[0], userId: target.authorId, title: '投稿した発言が確認済みになりました',
          body: `「${target.title}」がクラス確認済みになりました。`, createdAt: now, read: false, contactId,
        },
        ...classProfiles.filter((profile) => profile.role === 'parent').map((parent, index) => ({
          id: notificationIds[index + 1], userId: parent.id, title: '確認済みの発言が届きました',
          body: `「${target.title}」が共有されました。`, createdAt: now, read: false, contactId,
        })),
      ] : []
      return { contacts, notifications: [...newNotifications, ...current.notifications] }
    }
    const target = data.contacts.find((contact) => contact.id === contactId)
    const willComplete = Boolean(target && !target.confirmedAt && !target.confirmations.some((item) => item.studentId === user.id) && target.confirmations.length + 1 >= target.requiredConfirmations)
    setData(applyConfirmation)
    commitMutation(applyConfirmation)
    return willComplete
  }, [classProfiles, commitMutation, data.contacts])

  const markParentRead = useCallback((contactId: string, userId: string) => {
    const now = new Date().toISOString()
    const applyRead = (current: AppData): AppData => ({
      ...current,
      contacts: current.contacts.map((contact) => contact.id === contactId
        ? { ...contact, parentReadBy: { ...contact.parentReadBy, [userId]: now } }
        : contact),
    })
    setData(applyRead)
    commitMutation(applyRead)
  }, [commitMutation])

  const markNotificationRead = useCallback((notificationId: string) => {
    const applyRead = (current: AppData): AppData => ({
      ...current,
      notifications: current.notifications.map((item) => item.id === notificationId ? { ...item, read: true } : item),
    })
    setData(applyRead)
    commitMutation(applyRead)
  }, [commitMutation])

  const markAllNotificationsRead = useCallback((userId: string) => {
    const applyReadAll = (current: AppData): AppData => ({
      ...current,
      notifications: current.notifications.map((item) => item.userId === userId ? { ...item, read: true } : item),
    })
    setData(applyReadAll)
    commitMutation(applyReadAll)
  }, [commitMutation])

  const deleteContact = useCallback((contactId: string, user: User, adminOverride = false) => {
    const applyDelete = (current: AppData): AppData => ({
      contacts: current.contacts.filter((contact) => !(contact.id === contactId && (adminOverride || contact.authorId === user.id))),
      notifications: current.notifications.filter((notification) => notification.contactId !== contactId),
    })
    setData(applyDelete)
    commitMutation(applyDelete)
  }, [commitMutation])

  return {
    contacts: data.contacts,
    notifications: data.notifications,
    storageError,
    cloudReady,
    cloudError,
    syncError,
    createContact,
    confirmContact,
    markParentRead,
    markNotificationRead,
    markAllNotificationsRead,
    deleteContact,
  }
}
