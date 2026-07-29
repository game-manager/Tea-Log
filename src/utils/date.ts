export const formatDate = (value: string, withYear = false) => {
  const date = new Date(value)
  return new Intl.DateTimeFormat('ja-JP', {
    ...(withYear ? { year: 'numeric' } : {}),
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export const toDateInput = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export const daysUntil = (value: string, now = new Date()) => {
  const [year, month, day] = value.split('-').map(Number)
  const target = new Date(year, month - 1, day)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export const deadlineInfo = (value: string) => {
  const days = daysUntil(value)
  if (days < -7 || days > 7) return null
  if (days < 0) return { label: `期限超過 ${Math.abs(days)}日`, tone: 'overdue' as const }
  if (days === 0) return { label: '今日', tone: 'today' as const }
  if (days === 1) return { label: '明日', tone: 'tomorrow' as const }
  return { label: `あと${days}日`, tone: 'soon' as const }
}
