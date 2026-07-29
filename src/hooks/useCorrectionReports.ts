import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore'
import { isAdminEmail } from '../config/admins'
import { firestore } from '../lib/firebase'
import type {
  AppData,
  AppNotification,
  Contact,
  CorrectableContactFields,
  CorrectionReport,
  User,
} from '../types'

export interface CorrectionDecisionInput extends CorrectableContactFields {
  decisionNote: string
}

const emptyClassData = (): AppData => ({ contacts: [], notifications: [] })

function classData(value: unknown): AppData {
  if (!value || typeof value !== 'object') return emptyClassData()
  const candidate = value as Partial<AppData>
  return {
    contacts: Array.isArray(candidate.contacts) ? candidate.contacts : [],
    notifications: Array.isArray(candidate.notifications) ? candidate.notifications : [],
  }
}

function reportFromSnapshot(id: string, value: unknown): CorrectionReport | null {
  if (!value || typeof value !== 'object') return null
  const report = value as Partial<CorrectionReport>
  if (report.id !== id || typeof report.contactId !== 'string' || typeof report.submittedAt !== 'string') return null
  if (report.status !== 'pending' && report.status !== 'corrected' && report.status !== 'dismissed') return null
  return report as CorrectionReport
}

const contactFields = (contact: Contact): CorrectableContactFields => ({
  title: contact.title,
  content: contact.content,
  targetDate: contact.targetDate,
  memo: contact.memo ?? '',
})

export function useCorrectionReports(currentUser: User | null, profiles: User[]) {
  const isAdmin = Boolean(currentUser?.role === 'admin' && isAdminEmail(currentUser.email))
  const [reports, setReports] = useState<CorrectionReport[]>([])
  const [loaded, setLoaded] = useState(false)
  const [processingId, setProcessingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAdmin) return
    return onSnapshot(collection(firestore, 'teacherslogCorrectionReports'), (snapshot) => {
      setReports(snapshot.docs
        .map((item) => reportFromSnapshot(item.id, item.data()))
        .filter((item): item is CorrectionReport => Boolean(item))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)))
      setLoaded(true)
      setError('')
    }, () => {
      setLoaded(true)
      setError('訂正依頼を読み込めませんでした。Firestoreの権限をご確認ください。')
    })
  }, [isAdmin])

  const submit = useCallback(async (contact: Contact, user: User, reason: string, details: string) => {
    const revision = contact.revision ?? 1
    const id = `${contact.id}_${user.id}_r${revision}`
    const report: CorrectionReport = {
      id,
      className: contact.className,
      contactId: contact.id,
      contactTitle: contact.title,
      contactRevision: revision,
      reportedContact: contactFields(contact),
      reporterId: user.id,
      reporterName: user.name,
      reporterEmail: user.email,
      reporterRole: user.role,
      reason,
      details: details.trim(),
      submittedAt: new Date().toISOString(),
      status: 'pending',
    }
    await setDoc(doc(firestore, 'teacherslogCorrectionReports', id), report)
    return id
  }, [])

  const correct = useCallback(async (reportId: string, admin: User, input: CorrectionDecisionInput) => {
    if (!isAdmin || !input.title.trim() || !input.content.trim() || !input.targetDate || !input.decisionNote.trim()) {
      throw new Error('invalid correction')
    }
    setProcessingId(reportId)
    setError('')
    const now = new Date().toISOString()
    try {
      await runTransaction(firestore, async (transaction) => {
        const reportRef = doc(firestore, 'teacherslogCorrectionReports', reportId)
        const reportSnapshot = await transaction.get(reportRef)
        const report = reportSnapshot.exists() ? reportFromSnapshot(reportSnapshot.id, reportSnapshot.data()) : null
        if (!report || report.status !== 'pending') throw new Error('report is no longer pending')

        const classRef = doc(firestore, 'teacherslogClasses', report.className)
        const classSnapshot = await transaction.get(classRef)
        const current = classSnapshot.exists() ? classData(classSnapshot.data()) : emptyClassData()
        const target = current.contacts.find((contact) => contact.id === report.contactId)
        if (!target) throw new Error('contact not found')
        if ((target.revision ?? 1) !== report.contactRevision) throw new Error('stale correction report')

        const corrected: CorrectableContactFields = {
          title: input.title.trim(),
          content: input.content.trim(),
          targetDate: input.targetDate,
          memo: input.memo.trim(),
        }
        const contacts = current.contacts.map((contact) => contact.id === target.id ? {
          ...contact,
          ...corrected,
          revision: (contact.revision ?? 1) + 1,
          correctedAt: now,
          correctedByName: admin.name,
          correctionNote: input.decisionNote.trim(),
        } : contact)
        const notifications: AppNotification[] = profiles
          .filter((profile) => profile.className === report.className)
          .map((profile) => ({
            id: crypto.randomUUID(),
            userId: profile.id,
            title: '発言内容が訂正されました',
            body: `「${target.title}」が管理者によって訂正されました。変更内容を確認してください。`,
            createdAt: now,
            read: false,
            contactId: target.id,
          }))
        transaction.set(classRef, { contacts, notifications: [...notifications, ...current.notifications] })
        transaction.update(reportRef, {
          status: 'corrected',
          resolvedAt: now,
          resolvedBy: admin.id,
          resolvedByName: admin.name,
          decisionNote: input.decisionNote.trim(),
          previousContact: contactFields(target),
          correctedContact: corrected,
        })
      })
    } catch (reason) {
      setError('発言を訂正できませんでした。最新の状態を確認して、もう一度お試しください。')
      throw reason
    } finally {
      setProcessingId('')
    }
  }, [isAdmin, profiles])

  const dismiss = useCallback(async (reportId: string, admin: User, decisionNote: string) => {
    if (!isAdmin || !decisionNote.trim()) throw new Error('invalid dismissal')
    setProcessingId(reportId)
    setError('')
    const now = new Date().toISOString()
    try {
      await runTransaction(firestore, async (transaction) => {
        const reportRef = doc(firestore, 'teacherslogCorrectionReports', reportId)
        const reportSnapshot = await transaction.get(reportRef)
        const report = reportSnapshot.exists() ? reportFromSnapshot(reportSnapshot.id, reportSnapshot.data()) : null
        if (!report || report.status !== 'pending') throw new Error('report is no longer pending')

        const classRef = doc(firestore, 'teacherslogClasses', report.className)
        const classSnapshot = await transaction.get(classRef)
        const current = classSnapshot.exists() ? classData(classSnapshot.data()) : emptyClassData()
        const notification: AppNotification = {
          id: crypto.randomUUID(),
          userId: report.reporterId,
          title: '訂正依頼の確認が完了しました',
          body: `「${report.contactTitle}」：${decisionNote.trim()}`,
          createdAt: now,
          read: false,
          contactId: report.contactId,
        }
        transaction.set(classRef, { ...current, notifications: [notification, ...current.notifications] })
        transaction.update(reportRef, {
          status: 'dismissed',
          resolvedAt: now,
          resolvedBy: admin.id,
          resolvedByName: admin.name,
          decisionNote: decisionNote.trim(),
        })
      })
    } catch (reason) {
      setError('訂正依頼を完了できませんでした。最新の状態を確認して、もう一度お試しください。')
      throw reason
    } finally {
      setProcessingId('')
    }
  }, [isAdmin])

  const pendingCount = useMemo(() => reports.filter((report) => report.status === 'pending').length, [reports])

  return { reports, pendingCount, loading: isAdmin && !loaded, processingId, error, submit, correct, dismiss }
}
