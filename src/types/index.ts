export type UserRole = 'student' | 'parent' | 'admin'
export type ContactStatus = 'unconfirmed' | 'confirming' | 'confirmed'
export type Category = '持ち物' | '宿題' | '提出物' | '時間割変更' | '行事' | '部活動' | 'その他'
export type Page = 'home' | 'create' | 'history' | 'notifications' | 'detail'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  className: string
  avatarColor: string
  childName?: string
  photoUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Confirmation {
  studentId: string
  confirmedAt: string
  studentName?: string
}

export interface Contact {
  id: string
  className: string
  category: Category
  title: string
  content: string
  targetDate: string
  postedAt: string
  authorId: string
  authorName: string
  memo?: string
  confirmations: Confirmation[]
  requiredConfirmations: number
  totalStudents: number
  confirmedAt?: string
  parentReadBy: Record<string, string>
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  body: string
  createdAt: string
  read: boolean
  contactId?: string
}

export interface AppData {
  contacts: Contact[]
  notifications: AppNotification[]
}

export type ModerationReviewStatus = 'pending' | 'approved' | 'rejected'

export interface ModerationReview {
  id: string
  className: string
  category: Category
  title: string
  content: string
  targetDate: string
  memo: string
  submittedAt: string
  authorId: string
  authorName: string
  authorEmail: string
  aiCategory: string
  aiReason: string
  status: ModerationReviewStatus
  reviewedAt?: string
  reviewedBy?: string
  reviewedByName?: string
  decisionReason?: string
  contactId?: string
}
