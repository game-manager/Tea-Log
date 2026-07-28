export const ADMIN_EMAILS = [
  'saito.nozomu@ryugasaki1-h.ibk.ed.jp',
  'horikoshi.kenta@ryugasaki1-h.ibk.ed.jp',
  'kobayashi.takuto@ryugasaki1-h.ibk.ed.jp',
] as const

export const isAdminEmail = (email: string | null | undefined) =>
  Boolean(email && ADMIN_EMAILS.includes(email.toLowerCase() as typeof ADMIN_EMAILS[number]))
