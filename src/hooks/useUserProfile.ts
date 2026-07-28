import { useCallback, useEffect, useState } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore'
import { firestore } from '../lib/firebase'
import type { User, UserRole } from '../types'

export interface ProfileInput {
  name: string
  role: UserRole
  className: string
  childName: string
}

const avatarColors = ['#d7f5e5', '#dcecff', '#fff0c9', '#f2ddff', '#ffe0e0']

function colorForUid(uid: string) {
  const index = [...uid].reduce((total, character) => total + character.charCodeAt(0), 0) % avatarColors.length
  return avatarColors[index]
}

export function useUserProfile(account: FirebaseUser | null) {
  const [profile, setProfile] = useState<User | null>(null)
  const [profiles, setProfiles] = useState<User[]>([])
  const [loadedUid, setLoadedUid] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!account) return

    const profileRef = doc(firestore, 'teacherslogProfiles', account.uid)
    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      setProfile(snapshot.exists() ? snapshot.data() as User : null)
      setLoadedUid(account.uid)
      setError('')
    }, () => {
      setLoadedUid(account.uid)
      setError('プロフィールを読み込めませんでした。Firestoreの設定をご確認ください。')
    })
    return unsubscribeProfile
  }, [account])

  const currentProfile = account && profile?.id === account.uid ? profile : null

  useEffect(() => {
    if (!currentProfile) return
    const classProfilesQuery = query(
      collection(firestore, 'teacherslogProfiles'),
      where('className', '==', currentProfile.className),
    )
    return onSnapshot(classProfilesQuery, (snapshot) => {
      setProfiles(snapshot.docs.map((profileDocument) => profileDocument.data() as User))
      setError('')
    }, () => setError('クラスの利用者情報を読み込めませんでした。'))
  }, [currentProfile])

  const saveProfile = useCallback(async (input: ProfileInput) => {
    if (!account?.email) throw new Error('authenticated account required')
    setSaving(true)
    setError('')
    const now = new Date().toISOString()
    const nextProfile: User = {
      id: account.uid,
      email: account.email.toLowerCase(),
      name: input.name.trim(),
      role: input.role,
      className: input.className,
      avatarColor: colorForUid(account.uid),
      ...(input.role === 'parent' ? { childName: input.childName.trim() } : {}),
      ...(account.photoURL ? { photoUrl: account.photoURL } : {}),
      createdAt: now,
      updatedAt: now,
    }
    try {
      await setDoc(doc(firestore, 'teacherslogProfiles', account.uid), nextProfile)
      setProfile(nextProfile)
      setLoadedUid(account.uid)
    } catch (reason) {
      setError('プロフィールを保存できませんでした。入力内容と通信環境をご確認ください。')
      throw reason
    } finally {
      setSaving(false)
    }
  }, [account])

  const loading = Boolean(account && loadedUid !== account.uid)

  return { profile: currentProfile, profiles, loading, saving, error, saveProfile }
}
