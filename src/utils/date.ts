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
