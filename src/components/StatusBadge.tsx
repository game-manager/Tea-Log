import { CheckCheck, Clock3, CircleDashed } from 'lucide-react'
import type { ContactStatus } from '../types'
import { statusLabel } from '../utils/status'

const icons = { unconfirmed: CircleDashed, confirming: Clock3, confirmed: CheckCheck }

export function StatusBadge({ status, parent = false }: { status: ContactStatus; parent?: boolean }) {
  const Icon = icons[status]
  const label = parent && status === 'confirmed' ? 'クラス確認済み' : statusLabel[status]
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  )
}
