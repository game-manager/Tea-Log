import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { isAdminEmail } from '../config/admins'
import { firestore } from '../lib/firebase'
import type { ModerationResult } from '../services/contentModeration'
import type { AppData, AppNotification, Contact, ModerationReview, User } from '../types'
import type { NewContactInput } from './useTeachersLog'

const emptyClassData = (): AppData => ({ contacts: [], notifications: [] })

function classData(value: unknown): AppData {
  if (!value || typeof value !== 'object') return emptyClassData()
  const candidate = value as Partial<AppData>
  return {
    contacts: Array.isArray(candidate.contacts) ? candidate.contacts : [],
    notifications: Array.isArray(candidate.notifications) ? candidate.notifications : [],
  }
}

function reviewFromSnapshot(id: string, value: unknown): ModerationReview | null {
  if (!value || typeof value !== 'object') return null
  const review = value as Partial<ModerationReview>
  if (review.id !== id || typeof review.title !== 'string' || typeof review.submittedAt !== 'string') return null
  if (review.status !== 'pending' && review.status !== 'approved' && review.status !== 'rejected') return null
  return review as ModerationReview
}

export function useModerationQueue(currentUser: User | null, profiles: User[]) {
  const isAdmin = Boolean(currentUser?.role === 'admin' && isAdminEmail(currentUser.email))
  const [reviews, setReviews] = useState<ModerationReview[]>([])
  const [loaded, setLoaded] = useState(false)
  const [processingId, setProcessingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    return onSnapshot(collection(firestore, 'teacherslogModerationQueue'), (snapshot) => {
      const next = snapshot.docs
        .map((item) => reviewFromSnapshot(item.id, item.data()))
        .filter((item): item is ModerationReview => Boolean(item))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      setReviews(next)
      setLoaded(true)
      setError('')
    }, () => {
      setLoaded(true)
      setError('管理者審査キューを読み込めませんでした。Firestoreの権限をご確認ください。')
    })
  }, [isAdmin])

  const submitForReview = useCallback(async (input: NewContactInput, user: User, moderation: ModerationResult) => {
    const id = crypto.randomUUID()
    const review: ModerationReview = {
      id,
      className: user.className,
      category: input.category,
      title: input.title.trim(),
      content: input.content.trim(),
      targetDate: input.targetDate,
      memo: input.memo.trim(),
      submittedAt: new Date().toISOString(),
      authorId: user.id,
      authorName: user.name,
      authorEmail: user.email,
      aiCategory: moderation.category,
      aiReason: moderation.reason,
      status: 'pending',
    }
    await setDoc(doc(firestore, 'teacherslogModerationQueue', id), review)
    return id
  }, [])

  const approve = useCallback(async (reviewId: string, admin: User) => {
    if (!isAdmin) throw new Error('admin required')
    setProcessingId(reviewId)
    setError('')
    const now = new Date().toISOString()
    const contactId = crypto.randomUUID()
    const studentProfiles = profiles.filter((profile) => profile.role === 'student')
    try {
      await runTransaction(firestore, async (transaction) => {
        const reviewRef = doc(firestore, 'teacherslogModerationQueue', reviewId)
        const reviewSnapshot = await transaction.get(reviewRef)
        const review = reviewSnapshot.exists() ? reviewFromSnapshot(reviewSnapshot.id, reviewSnapshot.data()) : null
        if (!review || review.status !== 'pending') throw new Error('review is no longer pending')

        const classRef = doc(firestore, 'teacherslogClasses', review.className)
        const classSnapshot = await transaction.get(classRef)
        const current = classSnapshot.exists() ? classData(classSnapshot.data()) : emptyClassData()
        const contact: Contact = {
          id: contactId,
          className: review.className,
          category: review.category,
          title: review.title,
          content: review.content,
          targetDate: review.targetDate,
          memo: review.memo,
          postedAt: review.submittedAt,
          authorId: review.authorId,
          authorName: review.authorName,
          confirmations: [],
          requiredConfirmations: 3,
          totalStudents: Math.max(5, studentProfiles.filter((profile) => profile.className === review.className).length),
          parentReadBy: {},
        }
        const notifications: AppNotification[] = [
          {
            id: crypto.randomUUID(),
            userId: review.authorId,
            title: '管理者が発言を承認しました',
            body: `「${review.title}」は未確認の発言として公開されました。`,
            createdAt: now,
            read: false,
            contactId,
          },
          ...studentProfiles
            .filter((profile) => profile.className === review.className && profile.id !== review.authorId)
            .map((profile) => ({
              id: crypto.randomUUID(),
              userId: profile.id,
              title: '新しい確認待ちの発言があります',
              body: `管理者が承認した「${review.title}」の内容を確認してください。`,
              createdAt: now,
              read: false,
              contactId,
            })),
        ]
        transaction.set(classRef, {
          contacts: [contact, ...current.contacts],
          notifications: [...notifications, ...current.notifications],
        })
        transaction.update(reviewRef, {
          status: 'approved',
          reviewedAt: now,
          reviewedBy: admin.id,
          reviewedByName: admin.name,
          decisionReason: '管理者が内容を確認し、公開を承認しました。',
          contactId,
        })
      })
    } catch (reason) {
      setError('発言を承認できませんでした。最新の状態を確認して、もう一度お試しください。')
      throw reason
    } finally {
      setProcessingId('')
    }
  }, [isAdmin, profiles])

  const reject = useCallback(async (reviewId: string, admin: User, decisionReason: string) => {
    if (!isAdmin || !decisionReason.trim()) throw new Error('admin and reason required')
    setProcessingId(reviewId)
    setError('')
    const now = new Date().toISOString()
    try {
      await runTransaction(firestore, async (transaction) => {
        const reviewRef = doc(firestore, 'teacherslogModerationQueue', reviewId)
        const reviewSnapshot = await transaction.get(reviewRef)
        const review = reviewSnapshot.exists() ? reviewFromSnapshot(reviewSnapshot.id, reviewSnapshot.data()) : null
        if (!review || review.status !== 'pending') throw new Error('review is no longer pending')

        const classRef = doc(firestore, 'teacherslogClasses', review.className)
        const classSnapshot = await transaction.get(classRef)
        const current = classSnapshot.exists() ? classData(classSnapshot.data()) : emptyClassData()
        const notification: AppNotification = {
          id: crypto.randomUUID(),
          userId: review.authorId,
          title: '管理者審査で発言が却下されました',
          body: `「${review.title}」：${decisionReason.trim()}`,
          createdAt: now,
          read: false,
        }
        transaction.set(classRef, {
          ...current,
          notifications: [notification, ...current.notifications],
        })
        transaction.update(reviewRef, {
          status: 'rejected',
          reviewedAt: now,
          reviewedBy: admin.id,
          reviewedByName: admin.name,
          decisionReason: decisionReason.trim(),
        })
      })
    } catch (reason) {
      setError('発言を却下できませんでした。最新の状態を確認して、もう一度お試しください。')
      throw reason
    } finally {
      setProcessingId('')
    }
  }, [isAdmin])

  const pendingCount = useMemo(() => reviews.filter((review) => review.status === 'pending').length, [reviews])

  return { reviews, pendingCount, loading: isAdmin && !loaded, processingId, error, submitForReview, approve, reject }
}
