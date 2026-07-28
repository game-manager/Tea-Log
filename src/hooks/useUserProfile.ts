import { useCallback, useEffect, useState } from 'react'
import type { User as FirebaseUser } from 'firebase/auth'
import { collection, deleteField, doc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore'
import { isAdminEmail } from '../config/admins'
import { firestore } from '../lib/firebase'
import type { User, UserRole } from '../types'

export interface ProfileInput {
  name: string
  role: UserRole
  className: string
  childName: string
}

export interface AdminProfileUpdate {
  role: 'student' | 'parent'
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
  const [adminSavingId, setAdminSavingId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!account) return

    const profileRef = doc(firestore, 'teacherslogProfiles', account.uid)
    const unsubscribeProfile = onSnapshot(profileRef, (snapshot) => {
      if (!snapshot.exists() && isAdminEmail(account.email)) {
        const now = new Date().toISOString()
        const adminProfile: User = {
          id: account.uid,
          email: account.email!.toLowerCase(),
          name: account.displayName?.trim() || account.email!.split('@')[0],
          role: 'admin',
          className: '管理者',
          avatarColor: colorForUid(account.uid),
          ...(account.photoURL ? { photoUrl: account.photoURL } : {}),
          createdAt: now,
          updatedAt: now,
        }
        setDoc(profileRef, adminProfile).catch(() => {
          setProfile(null)
          setLoadedUid(account.uid)
          setError('管理者プロフィールを作成できませんでした。')
        })
        return
      }
      const nextProfile = snapshot.exists() ? snapshot.data() as User : null
      if (nextProfile && isAdminEmail(account.email) && nextProfile.role !== 'admin') {
        const promotedProfile: User = { ...nextProfile, role: 'admin', className: '管理者', updatedAt: new Date().toISOString() }
        delete promotedProfile.childName
        setDoc(profileRef, promotedProfile).catch(() => {
          setProfile(null)
          setLoadedUid(account.uid)
          setError('管理者プロフィールへ更新できませんでした。')
        })
        return
      }
      setProfile(nextProfile)
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
    const profilesQuery = currentProfile.role === 'admin'
      ? collection(firestore, 'teacherslogProfiles')
      : query(collection(firestore, 'teacherslogProfiles'), where('className', '==', currentProfile.className))
    return onSnapshot(profilesQuery, (snapshot) => {
      setProfiles(snapshot.docs.map((profileDocument) => profileDocument.data() as User))
      setError('')
    }, () => setError('クラスの利用者情報を読み込めませんでした。'))
  }, [currentProfile])

  const saveProfile = useCallback(async (input: ProfileInput) => {
    if (!account?.email) throw new Error('authenticated account required')
    setSaving(true)
    setError('')
    const now = new Date().toISOString()
    const adminAccount = isAdminEmail(account.email)
    const nextProfile: User = {
      id: account.uid,
      email: account.email.toLowerCase(),
      name: input.name.trim(),
      role: adminAccount ? 'admin' : input.role,
      className: adminAccount ? '管理者' : input.className,
      avatarColor: colorForUid(account.uid),
      ...(!adminAccount && input.role === 'parent' ? { childName: input.childName.trim() } : {}),
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

  const updateProfileAsAdmin = useCallback(async (userId: string, input: AdminProfileUpdate) => {
    if (!isAdminEmail(account?.email)) throw new Error('admin account required')
    const target = profiles.find((item) => item.id === userId)
    if (!target || isAdminEmail(target.email)) throw new Error('configured admin cannot be edited')
    setAdminSavingId(userId)
    setError('')
    try {
      await updateDoc(doc(firestore, 'teacherslogProfiles', userId), {
        role: input.role,
        className: input.className,
        childName: input.role === 'parent' ? input.childName.trim() : deleteField(),
        updatedAt: new Date().toISOString(),
      })
    } catch (reason) {
      setError('ユーザー情報を更新できませんでした。もう一度お試しください。')
      throw reason
    } finally {
      setAdminSavingId('')
    }
  }, [account, profiles])

  const loading = Boolean(account && loadedUid !== account.uid)

  return { profile: currentProfile, profiles, loading, saving, adminSavingId, error, saveProfile, updateProfileAsAdmin }
}
