import type { Contact, ContactStatus } from '../types'

export const getStatus = (contact: Contact): ContactStatus => {
  if (contact.confirmedAt) return 'confirmed'
  return contact.confirmations.length > 0 ? 'confirming' : 'unconfirmed'
}

export const statusLabel: Record<ContactStatus, string> = {
  unconfirmed: '未確認',
  confirming: '確認中',
  confirmed: '確認済み',
}
