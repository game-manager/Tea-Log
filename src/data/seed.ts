import type { AppData } from '../types'

const sampleStudentNames: Record<string, string> = {
  s1: '山田花子', s2: '佐藤健太', s3: '田中一郎', s4: '鈴木美咲', s5: '高橋悠真',
}

const confirmed = (studentId: string, day: number, hour: number) => ({
  studentId,
  studentName: sampleStudentNames[studentId],
  confirmedAt: `2026-05-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:10:00+09:00`,
})

export const seedData: AppData = {
  contacts: [
    {
      id: 'contact-1',
      className: '2年3組',
      category: '持ち物',
      title: '明日の体育の持ち物',
      content: '明日の体育はグラウンドで行います。体育着、タオル、水筒を持ってきてください。',
      targetDate: '2026-05-16',
      postedAt: '2026-05-15T15:20:00+09:00',
      authorId: 's1',
      authorName: '山田花子',
      memo: '雨天時は体育館の予定です。',
      confirmations: ['s1', 's2', 's3', 's4', 's5'].map((id, i) => confirmed(id, 15, 15 + Math.floor(i / 2))),
      requiredConfirmations: 3,
      totalStudents: 5,
      confirmedAt: '2026-05-15T15:42:00+09:00',
      parentReadBy: { p2: '2026-05-15T18:12:00+09:00' },
    },
    {
      id: 'contact-2',
      className: '2年3組',
      category: '行事',
      title: '校外学習の集合時間',
      content: '午前7時45分に昇降口前へ集合してください。時間に余裕をもって登校しましょう。',
      targetDate: '2026-05-20',
      postedAt: '2026-05-14T13:05:00+09:00',
      authorId: 's2',
      authorName: '佐藤健太',
      confirmations: ['s1', 's2', 's3', 's4', 's5'].map((id, i) => confirmed(id, 14, 13 + Math.floor(i / 2))),
      requiredConfirmations: 3,
      totalStudents: 5,
      confirmedAt: '2026-05-14T13:22:00+09:00',
      parentReadBy: { p1: '2026-05-14T19:30:00+09:00', p2: '2026-05-14T20:11:00+09:00' },
    },
    {
      id: 'contact-3',
      className: '2年3組',
      category: '部活動',
      title: '明日の部活動について',
      content: '明日の部活動は午後4時30分までです。帰宅時間に注意してください。',
      targetDate: '2026-05-17',
      postedAt: '2026-05-16T14:10:00+09:00',
      authorId: 's3',
      authorName: '田中一郎',
      confirmations: ['s1', 's2', 's3'].map((id, i) => confirmed(id, 16, 14 + i)),
      requiredConfirmations: 4,
      totalStudents: 5,
      parentReadBy: {},
    },
    {
      id: 'contact-4',
      className: '2年3組',
      category: '時間割変更',
      title: '来週月曜日の時間割変更',
      content: '3時間目の数学が理科に変更されます。理科の教科書とノートを準備してください。',
      targetDate: '2026-05-19',
      postedAt: '2026-05-16T11:35:00+09:00',
      authorId: 's4',
      authorName: '鈴木美咲',
      confirmations: [],
      requiredConfirmations: 3,
      totalStudents: 5,
      parentReadBy: {},
    },
  ],
  notifications: [
    {
      id: 'n1', userId: 's1', title: '新しい確認待ちの発言があります',
      body: '「来週月曜日の時間割変更」の内容を確認してください。', createdAt: '2026-05-16T11:36:00+09:00', read: false, contactId: 'contact-4',
    },
    {
      id: 'n2', userId: 's1', title: '投稿した発言が確認済みになりました',
      body: '「明日の体育の持ち物」がクラス確認済みになりました。', createdAt: '2026-05-15T15:42:00+09:00', read: true, contactId: 'contact-1',
    },
    {
      id: 'n3', userId: 'p1', title: '確認済みの発言が届きました',
      body: '「明日の体育の持ち物」が共有されました。', createdAt: '2026-05-15T15:43:00+09:00', read: false, contactId: 'contact-1',
    },
    {
      id: 'n4', userId: 'p1', title: '明日が対象日の発言があります',
      body: '持ち物をお子さまと一緒に確認してください。', createdAt: '2026-05-15T18:00:00+09:00', read: true, contactId: 'contact-1',
    },
  ],
}
