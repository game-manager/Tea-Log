import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { parents, seedData } from '../data/seed'
import { firestore } from '../lib/firebase'
import type { AppData, Category, Contact, User } from '../types'

const STORAGE_KEY = 'teacherslog:data:v1'

const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) as AppData : seedData
  } catch {
    return seedData
  }
}

export interface NewContactInput {
  category: Category
  title: string
  content: string
  targetDate: string
  memo: string
}

export const useTeachersLog = (cloudEnabled: boolean) => {
  const [data, setData] = useState<AppData>(loadData)
  const storageError = false
  const [cloudReady, setCloudReady] = useState(false)
  const [cloudError, setCloudError] = useState('')
  const remoteUpdate = useRef(false)

  useEffect(() => {
    if (!cloudEnabled) return
    const appDataRef = doc(firestore, 'teacherslog', 'appData')
    return onSnapshot(appDataRef, (snapshot) => {
      if (snapshot.exists()) {
        remoteUpdate.current = true
        setData(snapshot.data() as AppData)
        setCloudReady(true)
        setCloudError('')
      } else {
        setDoc(appDataRef, seedData)
          .then(() => setCloudReady(true))
          .catch(() => setCloudError('クラウドデータの初期化に失敗しました。'))
      }
    }, () => {
      setCloudError('Firestoreに接続できません。権限またはネットワークをご確認ください。')
    })
  }, [cloudEnabled])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      console.warn('TeachersLog could not persist data to localStorage.')
    }
  }, [data])

  useEffect(() => {
    if (!cloudEnabled || !cloudReady) return
    if (remoteUpdate.current) {
      remoteUpdate.current = false
      return
    }
    setDoc(doc(firestore, 'teacherslog', 'appData'), data)
      .catch(() => console.warn('TeachersLog could not sync data to Firestore.'))
  }, [cloudEnabled, cloudReady, data])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try { setData(JSON.parse(event.newValue) as AppData) } catch { /* keep current state */ }
      }
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const createContact = useCallback((input: NewContactInput, user: User) => {
    const now = new Date().toISOString()
    const contact: Contact = {
      id: crypto.randomUUID(),
      ...input,
      title: input.title.trim(),
      content: input.content.trim(),
      memo: input.memo.trim(),
      postedAt: now,
      authorId: user.id,
      authorName: user.name,
      confirmations: [],
      requiredConfirmations: 3,
      totalStudents: 5,
      parentReadBy: {},
    }
    setData((current) => ({
      contacts: [contact, ...current.contacts],
      notifications: [
        ...current.notifications,
        ...['s1', 's2', 's3', 's4', 's5'].filter((id) => id !== user.id).map((userId) => ({
          id: crypto.randomUUID(), userId, title: '新しい確認待ちの連絡があります',
          body: `「${contact.title}」の内容を確認してください。`, createdAt: now, read: false, contactId: contact.id,
        })),
      ],
    }))
    return contact.id
  }, [])

  const confirmContact = useCallback((contactId: string, user: User) => {
    const now = new Date().toISOString()
    let becameConfirmed = false
    setData((current) => {
      const target = current.contacts.find((contact) => contact.id === contactId)
      if (!target || target.confirmations.some((item) => item.studentId === user.id) || target.confirmedAt) return current
      const confirmations = [...target.confirmations, { studentId: user.id, confirmedAt: now }]
      becameConfirmed = confirmations.length >= target.requiredConfirmations
      const contacts = current.contacts.map((contact) => contact.id === contactId
        ? { ...contact, confirmations, ...(becameConfirmed ? { confirmedAt: now } : {}) }
        : contact)
      const newNotifications = becameConfirmed ? [
        {
          id: crypto.randomUUID(), userId: target.authorId, title: '投稿した連絡が確認済みになりました',
          body: `「${target.title}」がクラス確認済みになりました。`, createdAt: now, read: false, contactId,
        },
        ...parents.map((parent) => ({
          id: crypto.randomUUID(), userId: parent.id, title: '確認済みの学校連絡が届きました',
          body: `「${target.title}」が共有されました。`, createdAt: now, read: false, contactId,
        })),
      ] : []
      return { contacts, notifications: [...newNotifications, ...current.notifications] }
    })
    return becameConfirmed
  }, [])

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

  const resetDemo = useCallback(() => setData(seedData), [])

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
    resetDemo,
  }
}
