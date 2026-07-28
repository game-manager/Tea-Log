import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { seedData } from '../data/seed'
import { firestore } from '../lib/firebase'
import type { AppData, Category, Contact, User } from '../types'

const EMPTY_DATA: AppData = { contacts: [], notifications: [] }

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
  const storageError = false
  const [connection, setConnection] = useState({ className: '', ready: false, error: '' })
  const remoteUpdate = useRef(false)
  const cloudReady = Boolean(user && connection.className === user.className && connection.ready)
  const cloudError = user && connection.className === user.className ? connection.error : ''

  useEffect(() => {
    if (!user) return
    const appDataRef = doc(firestore, 'teacherslogClasses', user.className)
    return onSnapshot(appDataRef, (snapshot) => {
      if (snapshot.exists()) {
        remoteUpdate.current = true
        setData(snapshot.data() as AppData)
        setConnection({ className: user.className, ready: true, error: '' })
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
    try {
      localStorage.setItem(storageKey(user.className), JSON.stringify(data))
    } catch {
      console.warn('TeachersLog could not persist data to localStorage.')
    }
  }, [data, user])

  useEffect(() => {
    if (!user || !cloudReady) return
    if (remoteUpdate.current) {
      remoteUpdate.current = false
      return
    }
    setDoc(doc(firestore, 'teacherslogClasses', user.className), data)
      .catch(() => console.warn('TeachersLog could not sync data to Firestore.'))
  }, [cloudReady, data, user])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (user && event.key === storageKey(user.className) && event.newValue) {
        try { setData(JSON.parse(event.newValue) as AppData) } catch { /* keep current state */ }
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
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
    setData((current) => ({
      contacts: [contact, ...current.contacts],
      notifications: [
        ...current.notifications,
        ...classProfiles.filter((profile) => profile.role === 'student' && profile.id !== user.id).map((profile) => ({
          id: crypto.randomUUID(), userId: profile.id, title: '新しい確認待ちの連絡があります',
          body: `「${contact.title}」の内容を確認してください。`, createdAt: now, read: false, contactId: contact.id,
        })),
      ],
    }))
    return contact.id
  }, [classProfiles])

  const confirmContact = useCallback((contactId: string, user: User) => {
    const now = new Date().toISOString()
    let becameConfirmed = false
    setData((current) => {
      const target = current.contacts.find((contact) => contact.id === contactId)
      if (!target || target.confirmations.some((item) => item.studentId === user.id) || target.confirmedAt) return current
      const confirmations = [...target.confirmations, { studentId: user.id, studentName: user.name, confirmedAt: now }]
      becameConfirmed = confirmations.length >= target.requiredConfirmations
      const contacts = current.contacts.map((contact) => contact.id === contactId
        ? { ...contact, confirmations, ...(becameConfirmed ? { confirmedAt: now } : {}) }
        : contact)
      const newNotifications = becameConfirmed ? [
        {
          id: crypto.randomUUID(), userId: target.authorId, title: '投稿した連絡が確認済みになりました',
          body: `「${target.title}」がクラス確認済みになりました。`, createdAt: now, read: false, contactId,
        },
        ...classProfiles.filter((profile) => profile.role === 'parent').map((parent) => ({
          id: crypto.randomUUID(), userId: parent.id, title: '確認済みの学校連絡が届きました',
          body: `「${target.title}」が共有されました。`, createdAt: now, read: false, contactId,
        })),
      ] : []
      return { contacts, notifications: [...newNotifications, ...current.notifications] }
    })
    return becameConfirmed
  }, [classProfiles])

  const markParentRead = useCallback((contactId: string, userId: string) => {
    const now = new Date().toISOString()
    setData((current) => ({
      ...current,
      contacts: current.contacts.map((contact) => contact.id === contactId
        ? { ...contact, parentReadBy: { ...contact.parentReadBy, [userId]: now } }
        : contact),
    }))
  }, [])

  const markNotificationRead = useCallback((notificationId: string) => {
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((item) => item.id === notificationId ? { ...item, read: true } : item),
    }))
  }, [])

  const markAllNotificationsRead = useCallback((userId: string) => {
    setData((current) => ({
      ...current,
      notifications: current.notifications.map((item) => item.userId === userId ? { ...item, read: true } : item),
    }))
  }, [])

  const deleteContact = useCallback((contactId: string, user: User) => {
    setData((current) => ({
      contacts: current.contacts.filter((contact) => !(contact.id === contactId && contact.authorId === user.id)),
      notifications: current.notifications.filter((notification) => notification.contactId !== contactId),
    }))
  }, [])

  return {
    contacts: data.contacts,
    notifications: data.notifications,
    storageError,
    cloudReady,
    cloudError,
    createContact,
    confirmContact,
    markParentRead,
    markNotificationRead,
    markAllNotificationsRead,
    deleteContact,
  }
}
