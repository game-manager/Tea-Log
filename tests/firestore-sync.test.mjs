import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, onSnapshot, runTransaction, setDoc, updateDoc } from 'firebase/firestore'

const projectId = 'teacherslog-sync-test'
const className = '2年3組'
let testEnvironment

const profile = (id, email, name) => ({
  id,
  email,
  name,
  role: 'student',
  className,
  avatarColor: '#d7f5e5',
  createdAt: '2026-07-28T00:00:00.000Z',
  updatedAt: '2026-07-28T00:00:00.000Z',
})

const authToken = (email) => ({
  email,
  email_verified: true,
  firebase: { sign_in_provider: 'google.com' },
})

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore Emulator以外では同期テストを実行できません。')
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile('firestore.rules', 'utf8') },
  })
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore()
    await Promise.all([
      setDoc(doc(database, 'teacherslogProfiles', 'student-device-a'), profile('student-device-a', 'device-a@ryugasaki1-h.ibk.ed.jp', '端末A')),
      setDoc(doc(database, 'teacherslogProfiles', 'student-device-b'), profile('student-device-b', 'device-b@ryugasaki1-h.ibk.ed.jp', '端末B')),
      setDoc(doc(database, 'teacherslogProfiles', 'student-device-c'), profile('student-device-c', 'device-c@ryugasaki1-h.ibk.ed.jp', '再読込端末')),
    ])
  })
})

after(async () => {
  if (testEnvironment) {
    await testEnvironment.clearFirestore()
    await testEnvironment.cleanup()
  }
})

test('端末Aの投稿が保存され、端末Bへリアルタイム反映され、別端末で再取得できる', async () => {
  const writer = testEnvironment.authenticatedContext('student-device-a', authToken('device-a@ryugasaki1-h.ibk.ed.jp')).firestore()
  const listener = testEnvironment.authenticatedContext('student-device-b', authToken('device-b@ryugasaki1-h.ibk.ed.jp')).firestore()
  const reloadedDevice = testEnvironment.authenticatedContext('student-device-c', authToken('device-c@ryugasaki1-h.ibk.ed.jp')).firestore()
  const writerDocument = doc(writer, 'teacherslogClasses', className)
  const listenerDocument = doc(listener, 'teacherslogClasses', className)

  await setDoc(writerDocument, { contacts: [], notifications: [] })
  const baseline = await getDoc(listenerDocument)
  assert.equal(baseline.exists(), true, '端末Aで保存したクラスデータを端末Bが取得できる')
  assert.deepEqual(baseline.data().contacts, [])

  const contactId = 'sync-contact-001'
  const postedAt = '2026-07-28T12:34:56.000Z'
  let baselineReceived = false
  let stopListening = () => undefined
  let readyResolve
  const listenerReady = new Promise((resolve) => { readyResolve = resolve })
  const propagated = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('端末Bへのリアルタイム反映がタイムアウトしました。')), 5000)
    stopListening = onSnapshot(listenerDocument, (snapshot) => {
      const contacts = snapshot.data()?.contacts ?? []
      if (!baselineReceived && contacts.length === 0) {
        baselineReceived = true
        readyResolve()
      }
      if (baselineReceived && contacts.some((contact) => contact.id === contactId)) {
        clearTimeout(timeout)
        resolve(snapshot.data())
      }
    }, (error) => {
      clearTimeout(timeout)
      reject(error)
    })
  })

  await listenerReady
  await setDoc(writerDocument, {
    contacts: [{
      id: contactId,
      className,
      category: 'その他',
      title: '同期テストの発言',
      content: '端末Aから保存した投稿内容です。',
      targetDate: '2026-07-29',
      postedAt,
      authorId: 'student-device-a',
      authorName: '端末A',
      confirmations: [],
      requiredConfirmations: 3,
      totalStudents: 5,
      parentReadBy: {},
    }],
    notifications: [],
  })

  const listenerData = await propagated
  stopListening()
  assert.equal(listenerData.contacts[0].content, '端末Aから保存した投稿内容です。')
  assert.equal(listenerData.contacts[0].postedAt, postedAt, '投稿日時も他端末へ保持される')

  const persisted = await getDoc(doc(reloadedDevice, 'teacherslogClasses', className))
  assert.equal(persisted.exists(), true)
  assert.equal(persisted.data().contacts[0].id, contactId)
  assert.equal(persisted.data().contacts[0].title, '同期テストの発言')
  assert.equal(persisted.data().contacts[0].content, '端末Aから保存した投稿内容です。')

  const appendConcurrently = (database, id, title) => runTransaction(database, async (transaction) => {
    const reference = doc(database, 'teacherslogClasses', className)
    const snapshot = await transaction.get(reference)
    const current = snapshot.data()
    transaction.set(reference, {
      ...current,
      contacts: [{ ...current.contacts[0], id, title, postedAt: new Date().toISOString() }, ...current.contacts],
    })
  })

  await Promise.all([
    appendConcurrently(writer, 'concurrent-a', '端末Aの同時投稿'),
    appendConcurrently(listener, 'concurrent-b', '端末Bの同時投稿'),
  ])
  const afterConcurrentPosts = await getDoc(doc(reloadedDevice, 'teacherslogClasses', className))
  const savedIds = afterConcurrentPosts.data().contacts.map((contact) => contact.id)
  assert.ok(savedIds.includes('concurrent-a'), '端末Aの同時投稿が保存される')
  assert.ok(savedIds.includes('concurrent-b'), '端末Bの同時投稿が保存される')
})

test('AI判定後の投稿は本人だけが登録でき、管理者だけが審査結果を更新できる', async () => {
  const student = testEnvironment.authenticatedContext('student-device-a', authToken('device-a@ryugasaki1-h.ibk.ed.jp')).firestore()
  const classmate = testEnvironment.authenticatedContext('student-device-b', authToken('device-b@ryugasaki1-h.ibk.ed.jp')).firestore()
  const admin = testEnvironment.authenticatedContext('admin-user', authToken('saito.nozomu@ryugasaki1-h.ibk.ed.jp')).firestore()
  const reviewId = 'moderation-review-001'
  const review = {
    id: reviewId,
    className,
    category: 'その他',
    title: '管理者審査用の発言',
    content: 'Geminiが管理者確認を必要と判定した内容です。',
    targetDate: '2026-07-29',
    memo: '',
    submittedAt: '2026-07-28T13:00:00.000Z',
    authorId: 'student-device-a',
    authorName: '端末A',
    authorEmail: 'device-a@ryugasaki1-h.ibk.ed.jp',
    aiCategory: 'other',
    aiReason: '管理者による確認が必要です。',
    status: 'pending',
  }

  const studentRef = doc(student, 'teacherslogModerationQueue', reviewId)
  await assertSucceeds(setDoc(studentRef, review))
  await assertFails(getDoc(doc(classmate, 'teacherslogModerationQueue', reviewId)))
  await assertFails(updateDoc(studentRef, { status: 'approved' }))

  const adminRef = doc(admin, 'teacherslogModerationQueue', reviewId)
  await assertSucceeds(getDoc(adminRef))
  await assertSucceeds(updateDoc(adminRef, {
    status: 'approved',
    reviewedAt: '2026-07-28T13:05:00.000Z',
    reviewedBy: 'admin-user',
    reviewedByName: '管理者',
    decisionReason: '内容を確認し公開を承認しました。',
    contactId: 'approved-contact-001',
  }))
})

test('訂正依頼は報告者と管理者だけが閲覧でき、管理者だけが監査記録付きで処理できる', async () => {
  const reporter = testEnvironment.authenticatedContext('student-device-a', authToken('device-a@ryugasaki1-h.ibk.ed.jp')).firestore()
  const classmate = testEnvironment.authenticatedContext('student-device-b', authToken('device-b@ryugasaki1-h.ibk.ed.jp')).firestore()
  const admin = testEnvironment.authenticatedContext('admin-user', authToken('saito.nozomu@ryugasaki1-h.ibk.ed.jp')).firestore()
  const reportId = 'correction-report-001'
  const contact = {
    title: '体育の集合場所',
    content: '体育館へ集合してください。',
    targetDate: '2026-07-30',
    memo: '',
  }
  const report = {
    id: reportId,
    className,
    contactId: 'sync-contact-001',
    contactTitle: contact.title,
    contactRevision: 1,
    reportedContact: contact,
    reporterId: 'student-device-a',
    reporterName: '端末A',
    reporterEmail: 'device-a@ryugasaki1-h.ibk.ed.jp',
    reporterRole: 'student',
    reason: '持ち物・場所が違う',
    details: 'グラウンドと聞きました。',
    submittedAt: '2026-07-30T01:00:00.000Z',
    status: 'pending',
  }

  const reporterRef = doc(reporter, 'teacherslogCorrectionReports', reportId)
  await assertSucceeds(setDoc(reporterRef, report))
  await assertSucceeds(getDoc(reporterRef))
  await assertFails(getDoc(doc(classmate, 'teacherslogCorrectionReports', reportId)))
  await assertFails(updateDoc(reporterRef, { status: 'dismissed' }))

  const correctedContact = {
    ...contact,
    content: 'グラウンドへ集合してください。',
  }
  const adminRef = doc(admin, 'teacherslogCorrectionReports', reportId)
  await assertSucceeds(getDoc(adminRef))
  await assertSucceeds(updateDoc(adminRef, {
    status: 'corrected',
    resolvedAt: '2026-07-30T01:05:00.000Z',
    resolvedBy: 'admin-user',
    resolvedByName: '管理者',
    decisionNote: '報告内容を確認して集合場所を訂正しました。',
    previousContact: contact,
    correctedContact,
  }))

  const resolved = await getDoc(adminRef)
  assert.equal(resolved.data().status, 'corrected')
  assert.equal(resolved.data().correctedContact.content, 'グラウンドへ集合してください。')
  await assertFails(updateDoc(adminRef, { decisionNote: '監査履歴の書き換え' }))
})
